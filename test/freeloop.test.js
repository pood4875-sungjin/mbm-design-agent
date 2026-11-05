// 자유 시안 평가 루프 라우트(11-05) — 저장(POST /api/freeprefs ratings → 파일) · 묶음 목록 · 미로그인 pending — 임시 폴더에서 mock
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { handleFreeLoop, pushBatch, readPrefs, nextBatch } from '../server/freeloop.js';

const tmp = mkdtempSync(path.join(tmpdir(), 'freeloop-'));
const PREFS = path.join(tmp, 'free-prefs.json');
const html = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="width:580px;height:400px;position:relative;background:#102B6A"><div data-object="1" style="position:absolute;right:0;top:0;width:260px;height:400px;background:url('x.png')"></div><div data-field="main" style="position:absolute;left:30px;top:100px;font-size:44px;color:#fff">A</div></div>`;
const mockReq = (method, body) => ({ method, _body: body });
const mockRes = () => { const r = { code: null, body: null }; return r; };
const json = (res, code, body) => { res.code = code; res.body = body; };
const readBody = req => Promise.resolve(Buffer.from(JSON.stringify(req._body ?? {})));
const u = p => ({ pathname: p });

test('묶음 밀어넣기 → 배치 목록 → 평가 저장(5점·범위·미평가) → 파일에 합쳐지고 통계가 돈다', async () => {
  const b = pushBatch([{ id: 'x-1', caseId: null, specId: 'google-gdn-580x400', html, kvType: 'cutout-object' }, { id: 'x-2', caseId: null, specId: 'google-gdn-580x400', html: html.replace('#102B6A', '#fff').replace('#fff">A', '#111">A'), kvType: 'cutout-object' }], { id: 'b-test', specId: 'google-gdn-580x400', dir: tmp });
  assert.equal(b.items.length, 2); assert.ok(existsSync(path.join(tmp, 'b-test/batch.json')));
  // 라우트는 기본 폴더를 보므로 여기서는 저장 로직을 직접 — readPrefs/addPrefs 경로 주입
  const { addPrefs, recordFromItem } = await import('../server/freeloop.js');
  const item = id => b.items.find(i => i.id === id);   // 묶음은 취향 점수로 다시 정렬되므로 순서가 아니라 id 로
  const recs = [recordFromItem(item('x-1'), b, { rating: 5, scope: 'all', note: '#레이아웃 좋다' }), recordFromItem(item('x-2'), b, { rating: null })];
  const merged = addPrefs(recs, PREFS);
  assert.equal(merged.length, 2); assert.equal(merged.find(r => r.itemId === 'x-1').rating, 5); assert.equal(merged.find(r => r.itemId === 'x-2').rating, 'unrated', '미평가는 보통이 아니라 unrated');
  assert.deepEqual(merged.find(r => r.itemId === 'x-1').tags, ['레이아웃']);
  const f = JSON.parse(readFileSync(PREFS, 'utf8')); assert.equal(f.stats.total, 1); assert.equal(f.stats.unrated, 1); assert.equal(f.stats.byType['cutout-object'].by[5], 1); assert.ok(f.prefs.every(p => !('png' in p)), '파일엔 썸네일 없음');
  // 옛 3단 값도 받는다
  addPrefs([recordFromItem(item('x-2'), b, { rating: 'bad', id: 'z' })], PREFS); assert.equal(readPrefs(PREFS).find(r => r.id === 'z').rating, 1);
  // 라우트: GET /api/freeloop/batches 는 배치·케이스·통계를 준다(기본 폴더 — 모양만)
  const res = mockRes(); const handled = await handleFreeLoop(mockReq('GET'), res, u('/api/freeloop/batches'), { json, readBody });
  assert.equal(handled, true); assert.equal(res.code, 200); assert.ok(Array.isArray(res.body.batches) && Array.isArray(res.body.cases) && res.body.stats);
  const res2 = mockRes(); assert.equal(await handleFreeLoop(mockReq('GET'), res2, u('/api/other'), { json, readBody }), false, '다른 경로는 안 건드림');
  const res3 = mockRes(); await handleFreeLoop(mockReq('POST', { ratings: [] }), res3, u('/api/freeprefs'), { json, readBody }); assert.equal(res3.code, 200); assert.equal(res3.body.saved, 0);
});

test('다음 묶음 — claude 미로그인이면 pending(사유) · mock 엔진이면 케이스마다 n 안을 만들어 묶음 폴더에 쓴다(prefs exemplars 가 프롬프트에 들어간다)', async () => {
  const p = await nextBatch({ kvCases: ['fig-28'], specId: 'google-gdn-580x400', n: 2 }, { dir: tmp, check: async () => ({ ok: true, loggedIn: false }) });
  assert.equal(p.pending, true); assert.ok(/로그인/.test(p.reason));
  const p2 = await nextBatch({ kvCases: ['fig-28'] }, { dir: tmp, check: async () => ({ ok: false }) }); assert.ok(p2.pending);
  if (!existsSync(path.resolve('ref/learned/cases/fig-28/meta.json'))) return;
  let prompts = [];
  const run = async prompt => { prompts.push(prompt); return { text: '```html\n' + html.replace("url('x.png')", "url('{{KV}}')").replace('>A<', '>한진정보통신<') + '\n```\nNOTES: mock', usage: null }; };
  const out = await nextBatch({ kvCases: ['fig-28'], specId: 'google-gdn-580x400', n: 1 }, { dir: tmp, run });
  assert.ok(out.batch && out.batch.items.length >= 1); assert.equal(out.batch.items[0].caseId, 'fig-28'); assert.ok(existsSync(path.join(tmp, out.batch.id, 'batch.json')));
  assert.ok(prompts.length >= 1 && /한진정보통신/.test(prompts[0]));
});

test.after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} });
