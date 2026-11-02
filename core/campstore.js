// 내 캠페인 저장소 — 그림(data URL)을 기록에서 떼어 따로 두고, 저장 장치(backend)는 갈아 끼운다. 브라우저·node 공용, DOM 없음.
//   왜(11-02 사용자 「데이터 5개 이상 안되던데?」): 예전엔 캠페인 전부를 localStorage 키 하나에 JSON 으로 넣어 브라우저 한도(약 5MB)에서 막혔다.
//   기록(가벼움): 메모리에 모두 두고 목록·검색이 곧바로 읽는다. 큰 그림 자리엔 'mbm-asset:<id>' 만 남는다.
//   그림(무거움): 내용 해시가 id — 같은 그림은 한 번만 저장한다(keyVisual=kvOrig, 자동 저장 반복, 캠페인 간 같은 로고).
//   backend: { kind, readAll(), write(rec, assets), getAssets(ids), sweep?() } — 실제 구현은 app/campdb.js

export const ASSET_MIN = 64 * 1024;   // 이보다 큰 data URL 만 뗀다. 목록 썸네일(96px PNG, base64 최대 약 49KB)은 기록에 남아 목록이 그림 저장소를 읽지 않는다
const REF_PREFIX = 'mbm-asset:';
const REF_RE = /^mbm-asset:[0-9a-z]+-[0-9a-z]+$/;

export const isAssetRef = v => typeof v === 'string' && REF_RE.test(v);

// 53비트 내용 해시(cyrb53) + 길이 — 그림 저장 때마다 돌므로 빨라야 한다. 비밀 용도 아님
export function hashText(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}
export const assetIdOf = dataUrl => `${hashText(dataUrl)}-${dataUrl.length.toString(36)}`;

// 전체 기록 → 가벼운 기록 + 뗀 그림. JSON 왕복이라 예전 localStorage 저장과 값 규칙이 같다(undefined·함수는 빠짐)
export function dehydrate(full) {
  const assets = {};
  const text = JSON.stringify(full, (_, v) => {
    if (typeof v !== 'string' || v.length < ASSET_MIN || !v.startsWith('data:')) return v;
    const id = assetIdOf(v);
    assets[id] = v;
    return REF_PREFIX + id;
  });
  return { rec: JSON.parse(text), assets };
}

function mapStrings(v, fn) {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map(x => mapStrings(x, fn));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = mapStrings(v[k], fn); return o; }
  return v;
}
// 기록이 쓰는 그림 id 전부
export function assetIdsOf(rec) {
  const ids = new Set();
  mapStrings(rec, s => { if (isAssetRef(s)) ids.add(s.slice(REF_PREFIX.length)); return s; });
  return [...ids];
}
// 가벼운 기록 + 그림 → 전체 기록(새 사본). 못 찾은 그림 자리는 null — 깨진 주소를 렌더러에 넘기지 않는다
export function rehydrate(rec, assets) {
  const missing = [];
  const out = mapStrings(rec, s => {
    if (!isAssetRef(s)) return s;
    const id = s.slice(REF_PREFIX.length), v = assets.get(id);
    if (v == null) { missing.push(id); return null; }
    return v;
  });
  return { rec: out, missing };
}
// 어떤 기록도 쓰지 않는 그림 id
export function orphanAssets(recs, assetKeys) {
  const used = new Set(recs.flatMap(assetIdsOf));
  return assetKeys.filter(k => !used.has(k));
}

export function isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
}

// 옛 localStorage 값 읽기. 망가졌으면 { bad: true } — 그때는 원본을 지우지 않는다
export function parseLegacy(raw) {
  if (raw == null) return { list: [] };
  try { const v = JSON.parse(raw); return Array.isArray(v) ? { list: v.filter(x => x && x.id != null) } : { bad: true, list: [] }; }
  catch { return { bad: true, list: [] }; }
}

/* 저장소 본체.
   open(): backend 를 주는 함수 / legacy: { read(), clear() } 옛 localStorage 값 — backend.kind 가 'local' 이면 옮기지 않는다(같은 곳이니까)
   put 은 절대 reject 하지 않는다 → { ok, error }. 실패해도 메모리 기록은 남겨 이 탭에서는 계속 보이고 다음 저장 때 다시 시도한다 */
export function createCampStore({ open, legacy = null, onChange = null, channel = null }) {
  const cache = new Map();          // id → 가벼운 기록(옮기지 못한 옛 기록은 data URL 을 그대로 품고 있을 수 있다)
  const failed = new Map();         // id → 쓰지 못한 그림. 기록은 참조만 들고 있으니 여기 두어야 이 탭에서 다시 열어도 그림이 있고, 다음 저장 때 같이 쓴다
  const notices = [];               // 시작 때 알릴 말 — { type, ... } 앱이 ready 뒤 읽는다
  let backend = null, isReady = false, pending = 0, tail = Promise.resolve();

  const enqueue = job => {          // 쓰기는 부른 순서대로 — 뒤 저장이 앞 저장을 앞지르지 않게
    pending++;
    const p = tail.then(job).finally(() => { pending--; });
    tail = p.catch(() => {});
    return p;
  };

  async function migrate() {
    const raw = legacy.read();
    if (raw == null) return;
    const { bad, list } = parseLegacy(raw);
    if (bad) { notices.push({ type: 'legacy-corrupt' }); return; }
    let lastError = null, moved = 0;
    for (const old of list) {       // 한 건씩 옮긴다 — 공간이 모자라도 들어간 만큼은 남는다
      const have = cache.get(old.id);
      if (have && (have.savedAt ?? 0) >= (old.savedAt ?? 0)) { moved++; continue; }
      const { rec, assets } = dehydrate(old);
      try { await backend.write(rec, assets); cache.set(old.id, rec); moved++; }
      catch (e) { lastError = e; cache.set(old.id, old); }   // 못 옮긴 건 원본째 보여 준다(다음 시작 때 다시 옮긴다)
    }
    if (lastError) { notices.push({ type: 'migrate-failed', error: lastError, moved, total: list.length }); return; }
    // 다시 읽어 전부 들어갔는지 확인한 뒤에만 옛 값을 지운다
    const back = new Map((await backend.readAll()).map(r => [r.id, r]));
    if (list.every(o => back.has(o.id) && (back.get(o.id).savedAt ?? 0) >= (o.savedAt ?? 0))) {
      legacy.clear();
      if (list.length) notices.push({ type: 'migrated', moved: list.length });
    } else notices.push({ type: 'migrate-failed', moved, total: list.length });
  }

  const ready = (async () => {
    backend = await open();
    if (backend.notice) notices.push(backend.notice);
    for (const r of await backend.readAll()) cache.set(r.id, r);
    if (legacy && backend.kind !== 'local') {
      try { await migrate(); } catch (e) { notices.push({ type: 'migrate-failed', error: e }); }
    }
    isReady = true;
    Promise.resolve().then(() => backend.sweep?.()).catch(() => {});   // 교체된 그림 청소 — 실패해도 공간만 더 쓸 뿐이다
  })();

  channel?.addEventListener?.('message', async () => {   // 다른 탭이 저장했다 — 목록을 새로 읽는다. 내 탭의 저장 실패분은 덮지 않는다
    if (!isReady) return;
    try {
      const rows = await backend.readAll();
      for (const r of rows) if (!failed.has(r.id)) cache.set(r.id, r);
      onChange?.();
    } catch {}
  });

  async function put(full) {
    const d = dehydrate(full);      // 부른 순간의 모습을 잡는다(작업 상태는 곧 또 바뀐다)
    if (!isReady) await ready;
    cache.set(d.rec.id, d.rec);
    const id = d.rec.id;
    try {
      await enqueue(() => backend.write(d.rec, { ...failed.get(id), ...d.assets }));
      failed.delete(id);
      channel?.postMessage?.({ id });
      return { ok: true };
    } catch (error) {
      failed.set(id, { ...failed.get(id), ...d.assets });
      return { ok: false, error };
    }
  }

  async function hydrate(id) {
    if (!isReady) await ready;
    const rec = cache.get(id);
    if (!rec) return null;
    const ids = assetIdsOf(rec);
    const assets = ids.length ? await backend.getAssets(ids) : new Map();
    for (const [k, v] of Object.entries(failed.get(id) ?? {})) assets.set(k, v);
    return rehydrate(rec, assets);
  }

  // 내보내기 — 그림까지 다 담은 JSON 배열을 조각으로(문자열 하나로 합치면 엔진 한도를 넘을 수 있다). 예전 내보내기 파일과 같은 형식
  async function exportParts() {
    if (!isReady) await ready;
    const parts = ['['];
    let count = 0;
    for (const id of cache.keys()) {
      const h = await hydrate(id);
      if (!h) continue;
      parts.push((count ? ',' : '') + JSON.stringify(h.rec));
      count++;
    }
    parts.push(']');
    return { parts, count };
  }

  return {
    ready,
    isReady: () => isReady,
    kind: () => backend?.kind ?? null,
    list: () => [...cache.values()],
    get: id => cache.get(id) ?? null,
    put, hydrate, exportParts,
    takeNotices: () => notices.splice(0),
    hasUnsaved: () => pending > 0 || failed.size > 0,
  };
}

// localStorage 저장 장치 — IndexedDB 를 못 쓰는 환경용 대체. 값 형식은 예전과 같다(그림까지 한 키에). 한도 약 5MB 는 그대로이고 넘치면 알린다
export function localBackend(ls, key, notice = null) {
  const recs = new Map(), assets = new Map();
  return {
    kind: 'local', notice,
    async readAll() {
      let raw = null;
      try { raw = ls?.getItem(key) ?? null; } catch {}
      for (const old of parseLegacy(raw).list) {
        const d = dehydrate(old);
        recs.set(old.id, d.rec);
        for (const [k, v] of Object.entries(d.assets)) assets.set(k, v);
      }
      return [...recs.values()];
    },
    async write(rec, newAssets) {
      recs.set(rec.id, rec);
      for (const [k, v] of Object.entries(newAssets)) assets.set(k, v);
      if (!ls) throw Object.assign(new Error('브라우저 저장소를 쓸 수 없어요'), { name: 'NoStorageError' });
      ls.setItem(key, JSON.stringify([...recs.values()].map(r => rehydrate(r, assets).rec)));
    },
    async getAssets(ids) { return new Map(ids.filter(i => assets.has(i)).map(i => [i, assets.get(i)])); },
  };
}
