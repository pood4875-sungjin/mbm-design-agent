import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ASSET_MIN, assetIdOf, assetIdsOf, createCampStore, dehydrate, hashText, isAssetRef, isQuotaError, localBackend, orphanAssets, parseLegacy, rehydrate } from '../core/campstore.js';

const big = (ch = 'A', n = ASSET_MIN + 10) => 'data:image/jpeg;base64,' + ch.repeat(n);
const camp = (id, extra = {}) => ({ id, savedAt: extra.savedAt ?? 1, context: { core: { name: id } }, style: { keyVisual: big('K' + id), kvOrig: big('K' + id), logo: 'data:image/png;base64,small', ...extra.style }, artifacts: [{ specId: 's', overrides: { img: big('O' + id) } }], ...(extra.more ?? {}) });

// 메모리로 IndexedDB 트랜잭션 의미(기록·그림 한꺼번에, 공간 한도)를 흉내 낸 저장 장치 — 실제 IndexedDB 는 scripts/campstore-e2e.mjs 가 Chrome 으로 시험한다
function memBackend({ limit = Infinity, kind = 'idb' } = {}) {
  const recs = new Map(), assets = new Map(), writes = [];
  const b = {
    kind, recs, assets, writes, limit,
    async readAll() { return [...recs.values()].map(r => structuredClone(r)); },
    async write(rec, a) {
      const fresh = Object.entries(a).filter(([k]) => !assets.has(k));
      const used = [...assets.values()].reduce((n, v) => n + v.length, 0) + fresh.reduce((n, [, v]) => n + v.length, 0);
      if (used > b.limit) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      for (const [k, v] of fresh) { assets.set(k, v); writes.push(k); }
      recs.set(rec.id, structuredClone(rec));
    },
    async getAssets(ids) { return new Map(ids.filter(i => assets.has(i)).map(i => [i, assets.get(i)])); },
    async sweep() { for (const k of orphanAssets([...recs.values()], [...assets.keys()])) assets.delete(k); },
  };
  return b;
}
const legacyOf = raw => { const box = { raw, cleared: 0, read: () => box.raw, clear: () => { box.raw = null; box.cleared++; } }; return box; };
function fakeLs(limit = Infinity) {
  const m = new Map();
  return { m, getItem: k => m.has(k) ? m.get(k) : null, removeItem: k => m.delete(k), setItem(k, v) { if (v.length > limit) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); m.set(k, v); } };
}

test('dehydrate: 큰 data URL 만 떼고 같은 그림은 하나로, 작은 건 기록에 남는다', () => {
  const c = camp('a');
  const { rec, assets } = dehydrate(c);
  assert.ok(isAssetRef(rec.style.keyVisual));
  assert.equal(rec.style.keyVisual, rec.style.kvOrig, 'keyVisual=kvOrig 는 같은 참조');
  assert.equal(Object.keys(assets).length, 2);
  assert.equal(rec.style.logo, c.style.logo);
  assert.ok(JSON.stringify(rec).length < 2000, '기록은 가볍다');
});

test('dehydrate → rehydrate 왕복은 원본과 같고 원본을 건드리지 않는다', () => {
  const c = camp('a'), copy = structuredClone(c);
  const { rec, assets } = dehydrate(c);
  assert.deepEqual(c, copy);
  const back = rehydrate(rec, new Map(Object.entries(assets)));
  assert.deepEqual(back.rec, copy);
  assert.deepEqual(back.missing, []);
});

test('dehydrate: JSON 규칙대로 — 함수·undefined 는 빠져 IndexedDB 복제 오류가 나지 않는다', () => {
  const { rec } = dehydrate({ id: 'x', f: () => 1, u: undefined, n: { g() {} } });
  assert.deepEqual(rec, { id: 'x', n: {} });
  structuredClone(rec);
});

test('rehydrate: 못 찾은 그림은 null + missing, 깨진 주소를 넘기지 않는다', () => {
  const { rec } = dehydrate(camp('a'));
  const out = rehydrate(rec, new Map());
  assert.equal(out.rec.style.keyVisual, null);
  assert.equal(out.missing.length, 3);
});

test('참조처럼 보이는 일반 글은 건드리지 않는다, 해시는 내용마다 다르다', () => {
  assert.equal(isAssetRef('mbm-asset: 안내문'), false);
  assert.equal(isAssetRef('data:image/png;base64,AAA'), false);
  assert.notEqual(hashText('a'.repeat(1000) + 'b'), hashText('a'.repeat(1000) + 'c'));
  assert.notEqual(assetIdOf(big('A')), assetIdOf(big('B')));
});

test('orphanAssets: 어떤 기록도 안 쓰는 그림만', () => {
  const { rec, assets } = dehydrate(camp('a'));
  assert.deepEqual(orphanAssets([rec], [...Object.keys(assets), 'old-1']), ['old-1']);
  assert.equal(assetIdsOf(rec).length, 2);
});

test('parseLegacy: 망가진 값은 bad', () => {
  assert.equal(parseLegacy('{oops').bad, true);
  assert.equal(parseLegacy('{"a":1}').bad, true);
  assert.deepEqual(parseLegacy(null).list, []);
  assert.equal(parseLegacy('[{"id":"a"},null]').list.length, 1);
});

test('저장소: 개수 제한 없이 저장되고 다시 열어도 그대로', async () => {
  const b = memBackend(), s = createCampStore({ open: async () => b });
  await s.ready;
  for (let i = 0; i < 300; i++) assert.equal((await s.put(camp('c' + i))).ok, true);
  assert.equal(s.list().length, 300);
  const s2 = createCampStore({ open: async () => b });
  await s2.ready;
  assert.equal(s2.list().length, 300);
  const h = await s2.hydrate('c299');
  assert.deepEqual(h.rec, camp('c299'));
});

test('자동 저장 반복: 그림은 처음 한 번만 쓴다', async () => {
  const b = memBackend(), s = createCampStore({ open: async () => b });
  await s.ready;
  const c = camp('a');
  for (let i = 0; i < 20; i++) { c.savedAt = i; await s.put(c); }
  assert.equal(b.writes.length, 2, '그림 2장 = 쓰기 2번');
  assert.equal(b.recs.get('a').savedAt, 19);
});

test('목록 기록을 고쳐 다시 저장해도(썸네일) 그림은 안 쓰고 복원도 된다', async () => {
  const b = memBackend(), s = createCampStore({ open: async () => b });
  await s.ready;
  await s.put(camp('a'));
  const n = b.writes.length;
  await s.put({ ...s.get('a'), logoThumb: { src: 'data:x', sig: '1' } });
  assert.equal(b.writes.length, n);
  assert.equal((await s.hydrate('a')).rec.style.keyVisual, camp('a').style.keyVisual);
});

test('이전: 옛 localStorage 전부 옮기고 확인한 뒤에야 지운다', async () => {
  const list = [camp('a', { savedAt: 5 }), camp('b', { savedAt: 6 })];
  const b = memBackend(), legacy = legacyOf(JSON.stringify(list));
  const s = createCampStore({ open: async () => b, legacy });
  await s.ready;
  assert.equal(legacy.cleared, 1);
  assert.equal(b.recs.size, 2);
  assert.deepEqual((await s.hydrate('b')).rec, list[1]);
  assert.equal(s.takeNotices()[0].type, 'migrated');
});

test('이전: 같은 id 는 더 새것을 남긴다(옛 탭이 나중에 쓴 경우 포함)', async () => {
  const b = memBackend();
  await b.write(dehydrate(camp('a', { savedAt: 10, more: { mark: 'db' } })).rec, dehydrate(camp('a')).assets);
  await b.write(dehydrate(camp('b', { savedAt: 1, more: { mark: 'db' } })).rec, dehydrate(camp('b')).assets);
  const legacy = legacyOf(JSON.stringify([camp('a', { savedAt: 9, more: { mark: 'ls' } }), camp('b', { savedAt: 2, more: { mark: 'ls' } })]));
  const s = createCampStore({ open: async () => b, legacy });
  await s.ready;
  assert.equal(s.get('a').mark, 'db');
  assert.equal(s.get('b').mark, 'ls');
  assert.equal(legacy.cleared, 1);
});

test('이전: 망가진 값은 지우지 않고 알린다', async () => {
  const b = memBackend(), legacy = legacyOf('{broken');
  const s = createCampStore({ open: async () => b, legacy });
  await s.ready;
  assert.equal(legacy.cleared, 0);
  assert.equal(legacy.raw, '{broken');
  assert.equal(s.takeNotices()[0].type, 'legacy-corrupt');
});

test('이전: 공간이 모자라면 원본을 지우지 않고, 못 옮긴 것도 목록에 보이고 열린다 · 공간이 나면 다음 실행 때 마저 옮긴다', async () => {
  const list = [camp('a', { savedAt: 1 }), camp('b', { savedAt: 2 })];
  const b = memBackend({ limit: ASSET_MIN * 4 + 500 }), legacy = legacyOf(JSON.stringify(list));
  const s = createCampStore({ open: async () => b, legacy });
  await s.ready;
  assert.equal(legacy.cleared, 0);
  assert.equal(b.recs.size, 1);
  assert.equal(s.list().length, 2);
  assert.deepEqual((await s.hydrate('b')).rec, list[1]);
  const n = s.takeNotices()[0];
  assert.equal(n.type, 'migrate-failed'); assert.equal(n.moved, 1); assert.equal(n.total, 2);
  b.limit = Infinity;
  const s2 = createCampStore({ open: async () => b, legacy });
  await s2.ready;
  assert.equal(legacy.cleared, 1);
  assert.equal(b.recs.size, 2);
});

test('저장 실패: reject 없이 { ok:false } + 메모리엔 남고 닫기 전 경고 상태, 다음 성공 때 풀린다', async () => {
  const b = memBackend({ limit: 10 }), s = createCampStore({ open: async () => b });
  await s.ready;
  const r = await s.put(camp('a'));
  assert.equal(r.ok, false);
  assert.ok(isQuotaError(r.error));
  assert.equal(s.list().length, 1);
  assert.equal(s.hasUnsaved(), true);
  b.limit = Infinity;
  assert.equal((await s.put(camp('a'))).ok, true);
  assert.equal(s.hasUnsaved(), false);
});

test('저장 실패한 캠페인: 이 탭에서 다시 열어도 그림이 있고, 기록만 고친 저장이 성공해도 그림이 함께 들어간다', async () => {
  const b = memBackend({ limit: 10 }), s = createCampStore({ open: async () => b });
  await s.ready;
  assert.equal((await s.put(camp('a'))).ok, false);
  const h = await s.hydrate('a');
  assert.deepEqual(h.missing, []);
  assert.deepEqual(h.rec, camp('a'));
  b.limit = Infinity;
  assert.equal((await s.put({ ...s.get('a'), logoThumb: { src: 'x' } })).ok, true);   // 참조만 든 저장
  assert.equal(b.assets.size, 2);
  const s2 = createCampStore({ open: async () => b });
  await s2.ready;
  assert.deepEqual((await s2.hydrate('a')).missing, []);
});

test('저장 순서: 앞 저장이 느려도 마지막 값이 남는다, 부른 순간의 모습을 저장한다', async () => {
  const b = memBackend(), orig = b.write, s = createCampStore({ open: async () => b });
  await s.ready;
  let first = true;
  b.write = async (...x) => { if (first) { first = false; await new Promise(r => setTimeout(r, 20)); } return orig(...x); };
  const c = { id: 'a', savedAt: 1 };
  const p1 = s.put(c);
  c.savedAt = 2;
  const p2 = s.put(c);
  c.savedAt = 3;
  await Promise.all([p1, p2]);
  assert.equal(b.recs.get('a').savedAt, 2);
});

test('sweep: 교체된 그림은 지워지고 쓰는 그림은 남는다', async () => {
  const b = memBackend(), s = createCampStore({ open: async () => b });
  await s.ready;
  await s.put(camp('a'));
  await s.put({ ...camp('a'), style: { keyVisual: big('NEW') }, artifacts: [] });
  assert.equal(b.assets.size, 3);
  await b.sweep();
  assert.equal(b.assets.size, 1);
  assert.equal((await s.hydrate('a')).rec.style.keyVisual, big('NEW'));
});

test('내보내기: 예전과 같은 형식(그림 포함 전체 기록 배열)', async () => {
  const s = createCampStore({ open: async () => memBackend() });
  await s.ready;
  await s.put(camp('a')); await s.put(camp('b'));
  const { parts, count } = await s.exportParts();
  assert.equal(count, 2);
  const arr = JSON.parse(parts.join(''));
  assert.deepEqual(arr[1], camp('b'));
});

test('대체 장치(localStorage): 예전 형식 그대로 읽고 쓰며, 넘치면 실패를 돌려주고 옛 값을 지우지 않는다', async () => {
  const ls = fakeLs(ASSET_MIN * 7);
  ls.setItem('k', JSON.stringify([camp('a')]));
  const legacy = { read: () => ls.getItem('k'), clear: () => ls.removeItem('k') };
  const s = createCampStore({ open: async () => localBackend(ls, 'k'), legacy });
  await s.ready;
  assert.equal(s.kind(), 'local');
  assert.deepEqual(JSON.parse(ls.getItem('k'))[0], camp('a'), '옮기는 대상이 아니다');
  assert.deepEqual((await s.hydrate('a')).rec, camp('a'));
  const r = await s.put(camp('b'));
  assert.equal(r.ok, false);
  assert.ok(isQuotaError(r.error));
  assert.equal(JSON.parse(ls.getItem('k')).length, 1);
  assert.equal(s.list().length, 2);
});

test('대체 장치: localStorage 도 못 쓰면 앱은 죽지 않고 저장 실패만 알린다', async () => {
  const s = createCampStore({ open: async () => localBackend(null, 'k', { type: 'no-idb' }) });
  await s.ready;
  assert.deepEqual(s.list(), []);
  assert.equal(s.takeNotices()[0].type, 'no-idb');
  const r = await s.put(camp('a'));
  assert.equal(r.ok, false);
  assert.equal(s.list().length, 1);
});

test('앱: 캠페인을 localStorage 에서 직접 읽거나 키비주얼을 몰래 빼는 코드가 없다', () => {
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.equal(/localStorage\.(get|set)Item\(STORE_LS/.test(app), false);
  assert.equal(/localStorage\.getItem\('mbm-campaigns'/.test(html), false);
  assert.equal(app.includes('keyVisual: null }'), false);
  assert.ok(html.includes('__mbmCampStore'));
});
