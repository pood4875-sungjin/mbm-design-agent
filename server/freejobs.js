// 「AI 추가 제안」 백그라운드 작업(11-06 사용자 결정) — 앱이 /api/freedesign 과 같은 계약으로 작업을 걸어 두고 다른 일을 하다가, 끝나면 노티를 받아 「다른 시안 보기」 맨 앞에서 고른다.
//   라우트(server/server.mjs 가 handleFreeJobs 한 줄로 위임):
//     POST /api/freedesign/jobs  body = /api/freedesign 과 같은 계약(+ styles 기본 ['typo','bright','dark'], review 기본 true, campaignId 선택)
//                                → 바로 { jobId, status:'queued'|'running', position }. 동시에 하나만 돌고 나머지는 FIFO 큐(최대 MAX_QUEUE, 넘치면 429).
//                                  같은 specId+campaignId 가 이미 queued/running 이면 그 jobId 를 돌려준다(중복 방지).
//     GET  /api/freedesign/jobs/:id → { id, status:'queued'|'running'|'done'|'failed', specId, campaignId, startedAt, finishedAt, elapsedMs, position, result?, error? }
//     GET  /api/freedesign/jobs     → { jobs:[…최근 50, result 제외], running, queued }
//   결과는 메모리 + _out/freedesign-jobs/<id>.json(서버 재시작 뒤에도 GET 가능, _out 은 git 제외). 본문(dataURL)은 파일에 쓰지 않는다.
//   엔진 호출은 freeDesign(body)(server/freedesign.js) 그대로 — 테스트는 stub 을 deps.freeDesign 으로 넣는다.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freeDesign as realFreeDesign, claudeCodeAvailable, DEFAULT_STYLES } from './freedesign.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const JOBS_DIR = path.join(ROOT, '_out/freedesign-jobs');
export const MAX_QUEUE = 5;
export const LIST_MAX = 50;

const JOBS = new Map();   // id → job(메모리: body·deps 포함. 공개 필드는 publicJob 으로)
const QUEUE = [];         // queued 작업 id, FIFO
let RUNNING = null;       // 지금 도는 작업 id
const log = (...a) => console.log('[freejobs]', ...a);

const newId = () => `fj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const dedupKey = b => b?.campaignId != null ? `${b.specId}::${b.campaignId}` : null;
export const positionOf = id => id === RUNNING ? 0 : QUEUE.indexOf(id) + 1;   // running 0 · 큐 1부터 · 끝났으면 0

export function publicJob(j, { withResult = false } = {}) {
  if (!j) return null;
  const out = { id: j.id, status: j.status, specId: j.specId, campaignId: j.campaignId ?? null, styles: j.styles, createdAt: j.createdAt, startedAt: j.startedAt ?? null, finishedAt: j.finishedAt ?? null, elapsedMs: j.startedAt ? (j.finishedAt ?? Date.now()) - j.startedAt : 0, position: j.status === 'queued' || j.status === 'running' ? positionOf(j.id) : 0, error: j.error ?? null };
  if (withResult && j.result) out.result = j.result;
  return out;
}

function jobFile(id, dir) { return path.join(dir, `${String(id).replace(/[^\w.-]/g, '_')}.json`); }
function persist(j, dir) {
  try {
    mkdirSync(dir, { recursive: true });
    const f = jobFile(j.id, dir), tmp = f + '.tmp';
    writeFileSync(tmp, JSON.stringify(publicJob(j, { withResult: true })));
    renameSync(tmp, f);
  } catch (e) { log('저장 실패', j.id, e.message); }
}
export function readJobFile(id, dir = JOBS_DIR) {
  const f = jobFile(id, dir); if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; }
}

// 작업 걸기 — 바로 돌려준다(생성은 백그라운드). 같은 specId+campaignId 가 살아 있으면 그것(dup:true)
export function enqueue(body, deps = {}) {
  if (!body?.specId) throw Object.assign(new Error('specId 가 없습니다'), { status: 400 });
  const key = dedupKey(body);
  if (key) { for (const j of JOBS.values()) if ((j.status === 'queued' || j.status === 'running') && j.dedupKey === key) return { job: j, dup: true }; }
  if (QUEUE.length >= (deps.maxQueue ?? MAX_QUEUE)) throw Object.assign(new Error(`대기열이 가득 찼습니다(최대 ${deps.maxQueue ?? MAX_QUEUE}) — 끝나면 다시 눌러 주세요`), { status: 429 });
  const styles = Array.isArray(body.styles) && body.styles.length ? body.styles : DEFAULT_STYLES;
  const j = { id: newId(), status: 'queued', specId: body.specId, campaignId: body.campaignId ?? null, dedupKey: key, styles, createdAt: Date.now(), body: { ...body, styles, review: body.review !== false }, deps: { freeDesign: deps.freeDesign ?? realFreeDesign, client: deps.client ?? null, dir: deps.dir ?? JOBS_DIR } };
  JOBS.set(j.id, j); QUEUE.push(j.id);
  log('접수', j.id, j.specId, j.campaignId ?? '', `대기 ${QUEUE.length}`);
  pump();
  return { job: j, dup: false };
}

// 큐 펌프 — 한 번에 하나만. 끝나면 다음 것
function pump() {
  if (RUNNING || !QUEUE.length) return;
  const id = QUEUE.shift(); const j = JOBS.get(id); if (!j) return pump();
  RUNNING = id; j.status = 'running'; j.startedAt = Date.now();
  log('시작', id, j.specId, `방향 ${j.styles.join(',')}`);
  const { freeDesign, client, dir } = j.deps;
  Promise.resolve().then(() => freeDesign(j.body, { client }))
    .then(out => { j.result = out; j.status = 'done'; j.finishedAt = Date.now(); log('완료', id, `${((j.finishedAt - j.startedAt) / 1000).toFixed(0)}s`, `안 ${out?.variants?.length ?? (out?.html ? 1 : 0)}`); })
    .catch(e => { j.error = e?.message ?? String(e); j.status = 'failed'; j.finishedAt = Date.now(); log('실패', id, j.error); })
    .finally(() => { delete j.body; persist(j, dir); j.done?.(); RUNNING = null; pump(); });
}

export function getJob(id, dir = JOBS_DIR) { return JOBS.get(id) ?? null; }
export function listJobs() { return [...JOBS.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, LIST_MAX).map(j => publicJob(j)); }
export const jobsState = () => ({ running: RUNNING ? publicJob(JOBS.get(RUNNING)) : null, queued: QUEUE.length });
// 테스트용 — 끝날 때까지 기다리기 · 비우기
export function waitJob(id) { const j = JOBS.get(id); if (!j) return Promise.resolve(null); if (j.status === 'done' || j.status === 'failed') return Promise.resolve(j); return new Promise(ok => { const prev = j.done; j.done = () => { prev?.(); ok(j); }; }); }
export function resetJobs() { JOBS.clear(); QUEUE.length = 0; RUNNING = null; }

// ── 라우트 ── 처리했으면 true. json(res, code, body)·readBody(req) 는 server.mjs 의 것. check 는 claude 로그인 확인(테스트는 stub)
export async function handleFreeJobs(req, res, u, { json, readBody, client = null, freeDesign = null, check = claudeCodeAvailable, dir = JOBS_DIR, maxQueue = MAX_QUEUE } = {}) {
  const p = u.pathname;
  if (!p.startsWith('/api/freedesign/jobs')) return false;
  const rest = p.slice('/api/freedesign/jobs'.length).replace(/^\//, '');
  if (req.method === 'POST' && !rest) {
    let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }), true; }
    if (body.engine === 'api' && !client) return json(res, 503, { error: 'API 키가 없습니다 — engine:"claude-code" 를 쓰거나 server/.env 에 ANTHROPIC_API_KEY=… 를 넣고 서버를 다시 켜 주세요' }), true;
    if (body.engine !== 'api') {
      const cc = await check();
      if (!cc.ok) return json(res, 503, { error: 'claude 명령을 찾지 못했습니다 — Claude Code 설치 후 서버를 다시 켜 주세요' }), true;
      if (cc.loggedIn === false) return json(res, 503, { error: 'Claude Code 가 로그인돼 있지 않습니다 — 터미널에서 `claude auth login` 한 번' }), true;
    }
    try {
      const { job, dup } = enqueue(body, { freeDesign: freeDesign ?? undefined, client, dir, maxQueue });
      return json(res, dup ? 200 : 202, { jobId: job.id, status: job.status, position: positionOf(job.id), dup, ...jobsState() }), true;
    } catch (e) { return json(res, e.status ?? 500, { error: e.message }), true; }
  }
  if (req.method === 'GET' && !rest) return json(res, 200, { jobs: listJobs(), ...jobsState() }), true;
  if (req.method === 'GET' && rest) {
    const id = decodeURIComponent(rest);
    const j = getJob(id); if (j) return json(res, 200, publicJob(j, { withResult: true })), true;
    const f = readJobFile(id, dir); if (f) return json(res, 200, { ...f, position: 0, fromFile: true }), true;
    return json(res, 404, { error: '작업 없음: ' + id }), true;
  }
  return json(res, 405, { error: 'method' }), true;
}
