// 내 캠페인 저장 장치(브라우저) — IndexedDB. 못 쓰면 localStorage 로 내려간다(core/campstore.js localBackend).
//   DB mbm-campaign-agent: campaigns(가벼운 기록, keyPath id) + assets(그림 data URL, key = 내용 해시)
//   기록과 그림은 한 트랜잭션에 쓴다 — 기록만 있고 그림이 없는 상태가 생기지 않는다.
import { localBackend, orphanAssets } from '../core/campstore.js';

const DB_NAME = 'mbm-campaign-agent', DB_VERSION = 1, RECS = 'campaigns', ASSETS = 'assets';
const OPEN_TIMEOUT = 4000;   // 일부 브라우저의 open 무응답 대비 — 앱 시작을 붙들지 않는다

const req = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const done = tx => new Promise((ok, no) => {
  tx.oncomplete = () => ok();
  tx.onabort = () => no(tx.error ?? new Error('저장이 취소됐어요'));
});

function openDb() {
  return new Promise((ok, no) => {
    const timer = setTimeout(() => no(new Error('IndexedDB 응답 없음')), OPEN_TIMEOUT);
    const r = indexedDB.open(DB_NAME, DB_VERSION);   // indexedDB 가 없으면 여기서 throw → reject
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(RECS)) db.createObjectStore(RECS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS);
    };
    r.onsuccess = () => { clearTimeout(timer); r.result.onversionchange = () => r.result.close(); ok(r.result); };
    r.onerror = () => { clearTimeout(timer); no(r.error); };
    r.onblocked = () => { clearTimeout(timer); no(new Error('IndexedDB 가 다른 탭에 막혀 있어요')); };
  });
}

export async function openIdbBackend() {
  const db = await openDb();
  await req(db.transaction(RECS).objectStore(RECS).count());   // 열리기만 하고 못 쓰는 환경을 여기서 거른다
  let asked = false;
  return {
    kind: 'idb',
    readAll: () => req(db.transaction(RECS).objectStore(RECS).getAll()),
    async write(rec, assets) {
      const tx = db.transaction([RECS, ASSETS], 'readwrite');
      const finished = done(tx), store = tx.objectStore(ASSETS);
      // 이미 있는 그림은 값을 다시 쓰지 않는다(getKey 는 값을 읽지 않는다) — 자동 저장이 무거운 그림을 매번 쓰지 않게
      for (const [id, url] of Object.entries(assets)) {
        const q = store.getKey(id);
        q.onsuccess = () => { if (q.result === undefined) store.put(url, id); };
      }
      tx.objectStore(RECS).put(rec);
      await finished;
      if (!asked) { asked = true; navigator.storage?.persist?.().catch(() => {}); }   // 브라우저가 공간 정리 때 지우지 않게 요청(거절돼도 저장은 된다)
    },
    async getAssets(ids) {
      const store = db.transaction(ASSETS).objectStore(ASSETS);
      const vals = await Promise.all(ids.map(id => req(store.get(id))));
      const m = new Map();
      ids.forEach((id, i) => { if (vals[i] != null) m.set(id, vals[i]); });
      return m;
    },
    async sweep() {   // 교체돼 아무도 안 쓰는 그림 지우기 — 기록과 같은 트랜잭션이라 사이에 낀 저장과 엇갈리지 않는다
      const tx = db.transaction([RECS, ASSETS], 'readwrite');
      const finished = done(tx), store = tx.objectStore(ASSETS);
      const [recs, keys] = await Promise.all([req(tx.objectStore(RECS).getAll()), req(store.getAllKeys())]);
      for (const k of orphanAssets(recs, keys)) store.delete(k);
      await finished;
    },
  };
}

function safeLocalStorage() { try { return window.localStorage; } catch { return null; } }

// IndexedDB → 안 되면 localStorage(둘 다 안 되면 이 탭 메모리뿐 — 저장할 때 실패를 알린다)
export async function openCampBackend(legacyKey) {
  try { return await openIdbBackend(); }
  catch (error) {
    console.warn('IndexedDB 를 쓸 수 없어 localStorage 로 저장합니다', error);
    return localBackend(safeLocalStorage(), legacyKey, { type: 'no-idb', error });
  }
}

// 옛 저장 값 — 옮긴 뒤 지운다
export function legacyStore(key) {
  return {
    read() { try { return safeLocalStorage()?.getItem(key) ?? null; } catch { return null; } },
    clear() { try { safeLocalStorage()?.removeItem(key); } catch {} },
  };
}
