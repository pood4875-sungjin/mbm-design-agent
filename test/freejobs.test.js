// 「AI 추가 제안」 백그라운드 작업(11-06, server/freejobs.js) — freeDesign 을 stub(지연 50ms, 안 3개)으로 넣어 큐·동시 1·중복 jobId·done 결과·실패·429 를 본다. 실제 claude 호출 없음.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { handleFreeJobs, waitJob, resetJobs, jobsState } from '../server/freejobs.js';

const tmp = mkdtempSync(path.join(tmpdir(), 'freejobs-'));
const mockReq = (method, body) => ({ method, _body: body });
const mockRes = () => ({ code: null, body: null });
const json = (res, code, body) => { res.code = code; res.body = body; };
const readBody = req => Promise.resolve(Buffer.from(JSON.stringify(req._body ?? {})));
const u = p => ({ pathname: p });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = async () => ({ ok: true, loggedIn: true });
let running = 0, maxRunning = 0, calls = [];
const stub = async (body) => {
  calls.push(body); running++; maxRunning = Math.max(maxRunning, running);
  await sleep(50); running--;
  if (body.brief?.client === 'FAIL') throw new Error('stub 실패');
  const v = (body.styles ?? ['typo', 'bright', 'dark']).map(id => ({ style: { id, name: id }, html: `<div data-ad="1">${id}</div>`, notes: id, ok: true, errors: [] }));
  return { html: v[0].html, notes: v[0].notes, engine: 'claude-code', model: 'stub', ms: 50, variants: v };
};
const deps = { json, readBody, freeDesign: stub, check: ok, dir: tmp };
const post = body => { const res = mockRes(); return handleFreeJobs(mockReq('POST', body), res, u('/api/freedesign/jobs'), deps).then(() => res); };
const get = id => { const res = mockRes(); return handleFreeJobs(mockReq('GET'), res, u('/api/freedesign/jobs' + (id ? '/' + id : '')), deps).then(() => res); };

test('접수는 바로 돌아오고(202·queued/running) → 한 번에 하나만 돌고 → done 에 variants 3 · 파일에도 남는다', async () => {
  resetJobs(); calls = []; maxRunning = 0;
  const a = await post({ specId: 'google-gdn-580x400', campaignId: 'c1', brief: { client: 'A' } });
  assert.equal(a.code, 202); assert.ok(a.body.jobId); assert.ok(['queued', 'running'].includes(a.body.status)); assert.equal(a.body.position, 0, '첫 작업은 바로 running');
  const b = await post({ specId: 'google-gdn-580x400', campaignId: 'c2', brief: { client: 'B' } });
  assert.equal(b.body.status, 'queued'); assert.equal(b.body.position, 1);
  const s = jobsState(); assert.equal(s.running.id, a.body.jobId); assert.equal(s.queued, 1);
  // 진행 중 GET — 결과 없음·position
  const g0 = await get(b.body.jobId); assert.equal(g0.code, 200); assert.equal(g0.body.status, 'queued'); assert.equal(g0.body.position, 1); assert.equal(g0.body.result, undefined);
  await waitJob(a.body.jobId); await waitJob(b.body.jobId);
  assert.equal(maxRunning, 1, '동시에 하나만');
  const ga = await get(a.body.jobId);
  assert.equal(ga.body.status, 'done'); assert.equal(ga.body.result.variants.length, 3); assert.ok(ga.body.elapsedMs >= 50); assert.ok(ga.body.finishedAt >= ga.body.startedAt); assert.equal(ga.body.position, 0);
  assert.deepEqual(calls[0].styles, ['typo', 'bright', 'dark'], 'styles 기본 3종'); assert.equal(calls[0].review, true, 'review 기본 켬');
  assert.ok(existsSync(path.join(tmp, a.body.jobId + '.json')), '결과 파일'); const f = JSON.parse(readFileSync(path.join(tmp, a.body.jobId + '.json'), 'utf8')); assert.equal(f.result.variants.length, 3); assert.equal(f.body, undefined, '본문은 파일에 안 쓴다');
  // 메모리에서 지워도 파일로 GET 된다
  resetJobs(); const gf = await get(a.body.jobId); assert.equal(gf.code, 200); assert.equal(gf.body.fromFile, true); assert.equal(gf.body.result.variants.length, 3);
  const g404 = await get('fj-none'); assert.equal(g404.code, 404);
});

test('같은 specId+campaignId 가 살아 있으면 같은 jobId(dup) · 다른 캠페인은 새 작업 · 목록엔 result 없음', async () => {
  resetJobs();
  const a = await post({ specId: 'google-gdn-580x400', campaignId: 'c1', styles: ['typo'] });
  const a2 = await post({ specId: 'google-gdn-580x400', campaignId: 'c1', styles: ['typo'] });
  assert.equal(a2.code, 200); assert.equal(a2.body.jobId, a.body.jobId); assert.equal(a2.body.dup, true);
  const b = await post({ specId: 'google-gdn-580x400', campaignId: 'c9', styles: ['typo'] }); assert.notEqual(b.body.jobId, a.body.jobId);
  const n = await post({ specId: 'google-gdn-580x400', styles: ['typo'] }); assert.notEqual(n.body.jobId, a.body.jobId, 'campaignId 없으면 중복 검사 안 함');
  const list = await get(); assert.equal(list.code, 200); assert.equal(list.body.jobs.length, 3); assert.ok(list.body.jobs.every(j => !('result' in j)));
  await waitJob(a.body.jobId); await waitJob(b.body.jobId); await waitJob(n.body.jobId);
  const a3 = await post({ specId: 'google-gdn-580x400', campaignId: 'c1', styles: ['typo'] }); assert.notEqual(a3.body.jobId, a.body.jobId, '끝난 뒤엔 새 작업');
  await waitJob(a3.body.jobId);
});

test('실패는 failed + error · 큐가 가득 차면 429 · specId 없으면 400 · 미로그인 503', async () => {
  resetJobs();
  const f = await post({ specId: 'google-gdn-580x400', brief: { client: 'FAIL' }, styles: ['typo'] });
  await waitJob(f.body.jobId); const gf = await get(f.body.jobId); assert.equal(gf.body.status, 'failed'); assert.match(gf.body.error, /stub 실패/);
  // 큐 상한: running 1 + queued 2(maxQueue 2) → 다음은 429
  const d2 = { ...deps, maxQueue: 2 }; const ids = [];
  for (let i = 0; i < 3; i++) { const res = mockRes(); await handleFreeJobs(mockReq('POST', { specId: 'google-gdn-580x400', styles: ['typo'] }), res, u('/api/freedesign/jobs'), d2); assert.ok([200, 202].includes(res.code), `${i}: ${res.code}`); ids.push(res.body.jobId); }
  const over = mockRes(); await handleFreeJobs(mockReq('POST', { specId: 'google-gdn-580x400', styles: ['typo'] }), over, u('/api/freedesign/jobs'), d2); assert.equal(over.code, 429);
  for (const id of ids) await waitJob(id);
  const bad = await post({}); assert.equal(bad.code, 400);
  const nl = mockRes(); await handleFreeJobs(mockReq('POST', { specId: 'x' }), nl, u('/api/freedesign/jobs'), { ...deps, check: async () => ({ ok: true, loggedIn: false }) }); assert.equal(nl.code, 503);
  const other = mockRes(); assert.equal(await handleFreeJobs(mockReq('GET'), other, u('/api/freedesign'), deps), false, '다른 경로는 안 건드림');
});

test.after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} });
