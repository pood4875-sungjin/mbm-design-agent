// 「AI 추가 제안」 백그라운드 작업(11-06 사용자 결정 · 11-09 AI 디자인 트랙 확장 — docs/ai-design-flow.md 「서버 계약」)
//   앱이 작업을 걸어 두고 다른 일을 하다가, 안이 끝나는 대로(partial) 카드를 채운다.
//   라우트(server/server.mjs 가 handleFreeJobs · handleFreeExtra 한 줄씩으로 위임):
//     POST /api/freedesign/jobs  body = /api/freedesign 계약 + mode('suggest'|'revise'|'spread') · prompt · prev · language · specIds · parallel · model · campaignId
//                                → 바로 { jobId, status:'queued'|'running', position }. 작업은 한 번에 하나(FIFO, 최대 MAX_QUEUE, 넘치면 429) — 작업 안에서는 안·규격마다 병렬(상한 PARALLEL).
//                                  같은 mode+specId+campaignId 가 이미 queued/running 이면 그 jobId(중복 방지).
//     GET  /api/freedesign/jobs/:id → { id, status, mode, specId, stage:'queued'|'kv'|'design'|'review'|'done'|'failed', progress:{done,total}, etaMs, partial:[variant…](끝난 순서), elapsedMs, position, result?, error? }
//     DELETE /api/freedesign/jobs/:id → 취소. queued 면 큐에서 빼고, running 이면 진행 중 claude 자식 프로세스를 끊는다(AbortSignal). → { id, status:'cancelled', partial 수 } — 이미 끝난 작업은 그대로(200, status 그대로)
//     GET  /api/freedesign/jobs     → { jobs:[…최근 50, result·partial 제외], running, queued }
//     POST /api/freedesign/quick   { html, instruction, specId, brand? } → { ok, html, applied } | { ok:false, reason } — LLM 없음(core/freequick.js)
//     GET  /api/freedesign/stats   → 최근 50 작업의 모드별 평균(전체·첫 안·호출 ms, 재요청 수, 모델) + 최근 행
//   결과는 메모리 + _out/freedesign-jobs/<id>.json(재시작 뒤에도 GET), 통계는 _out/freedesign-jobs/stats.jsonl. 본문(입력 dataURL)은 파일에 쓰지 않는다.
//   엔진: server/freedesign.js runMode(mode) — 테스트는 deps.freeDesign(suggest)·deps.freeRevise·deps.freeSpread stub 을 넣는다. stub 은 (body, hooks) 를 받고 hooks.onVariant/onStage/onCall 을 불러도 된다.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freeDesign as realFreeDesign, freeRevise as realFreeRevise, freeSpread as realFreeSpread, claudeCodeAvailable, DEFAULT_STYLES, API_ENGINE_ENABLED, rulesForSpec } from './freedesign.js';
import { applyQuick } from '../core/freequick.js';
import { SPECS } from '../core/contract.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const JOBS_DIR = path.join(ROOT, '_out/freedesign-jobs');
export const MAX_QUEUE = 5;
export const LIST_MAX = 50;
export const MODES = ['suggest', 'revise', 'spread'];
export const STAGES = ['queued', 'kv', 'design', 'review', 'done'];   // + 'failed'·'cancelled'(끝 상태)
const DEFAULT_ETA = { suggest: 180_000, revise: 45_000, spread: 120_000 };   // 통계가 없을 때 예상 시간

const JOBS = new Map();   // id → job(메모리: body·deps 포함. 공개 필드는 publicJob 으로)
const QUEUE = [];         // queued 작업 id, FIFO
let RUNNING = null;       // 지금 도는 작업 id
const STATS = [];         // 최근 통계 행(메모리) — 파일과 합쳐 50개
const log = (...a) => console.log('[freejobs]', ...a);

const newId = () => `fj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const modeOf = b => MODES.includes(b?.mode) ? b.mode : 'suggest';
const dedupKey = b => b?.campaignId != null ? `${modeOf(b)}::${b.specId}::${b.campaignId}` : null;
export const positionOf = id => id === RUNNING ? 0 : QUEUE.indexOf(id) + 1;   // running 0 · 큐 1부터 · 끝났으면 0
const isLegacyTones = s => Array.isArray(s) && s.length === DEFAULT_STYLES.length && s.every((x, i) => x === DEFAULT_STYLES[i]);

function totalOf(body, mode) { if (mode === 'spread') return (body.specIds ?? []).length || 1; if (mode === 'revise') return 1; return Array.isArray(body.styles) && body.styles.length ? body.styles.length : (typeof body.n === 'number' && body.n >= 1 ? Math.min(6, body.n) : 3); }

// 예상 남은 시간(11-09 6단계 — 재요청 반영). 통합 시험: 39초에 「남은 1분 20초」 → 실제 156초(두 안이 재요청). 평균 전체 시간만 쓰면 설계 호출 꼬리·재요청이 빠진다.
//   남은 = max(평균 전체 − 경과, 설계 호출 p75 + 측정 − 경과 + P(남은 안 중 하나라도 재요청) × (재요청 평균 + 측정))
//   P = 1 − (1 − 안당 재요청률)^남은 안 수. spread 는 규격 3개씩 묶음 수만큼. 넘기면 남은 개수 × 재요청 꼬리(최소 5초)
export const GATE_MS = 8_000;   // 렌더 측정 1회(헤드리스 Chrome 3번) 어림
export function etaOf(j, now = Date.now()) {
  if (j.status === 'done' || j.status === 'failed' || j.status === 'cancelled') return 0;
  const s = statsSummary().byMode[j.mode];
  const batches = j.mode === 'spread' ? Math.max(1, Math.ceil(j.progress.total / 3)) : 1;
  const est = (s?.avgTotalMs ?? DEFAULT_ETA[j.mode]) * batches;
  const el = j.startedAt ? now - j.startedAt : 0;
  const queuedAhead = j.status === 'queued' ? positionOf(j.id) * (s?.avgTotalMs ?? DEFAULT_ETA.suggest) : 0;
  const k = Math.max(0, (j.progress?.total ?? 1) - (j.progress?.done ?? 0));
  const p = Math.min(1, Math.max(0, s?.retryRate ?? 0.4));
  const retryTail = (1 - Math.pow(1 - p, Math.max(1, k))) * ((s?.avgRetryMs ?? 25_000) + GATE_MS);
  const p75 = s?.p75CallMs ?? s?.avgCallMs ?? (DEFAULT_ETA[j.mode] * 0.6);
  const gen = p75 * batches + GATE_MS;
  let left = Math.max(est - el, gen - el + retryTail);
  // 진행 중 실제 신호(11-09 r1: 첫 카드 126s 에 「34초」 → 실제 80초) — 설계 호출이 끝났는데 아직 안 온 안 = 재요청·측정 중, 아직 설계 중인 안 = 꼬리가 길다
  if (j.status === 'running' && Array.isArray(j.calls) && j.mode !== 'revise') {
    const gens = j.calls.filter(c => c.kind !== 'retry' && c.kind !== 'review'), retries = j.calls.filter(c => c.kind === 'retry');
    const pendingGen = Math.max(0, (j.progress?.total ?? 0) - gens.length), inFix = Math.max(0, gens.length - (j.progress?.done ?? 0));
    const retryMs = (s?.avgRetryMs ?? 25_000) + GATE_MS;
    let live = 0;
    if (pendingGen) { const tail = el < p75 ? p75 - el : Math.max(25_000, p75 * 0.35); live = Math.max(live, tail + GATE_MS + (1 - Math.pow(1 - p, pendingGen)) * retryMs); }
    if (inFix) { const lastGen = Math.max(...gens.map(c => c.t ?? now)); const sinceGen = now - lastGen; const fixing = retries.filter(c => (c.t ?? 0) >= lastGen).length; live = Math.max(live, Math.max(5_000, (fixing ? GATE_MS : retryMs) - sinceGen)); }
    left = Math.max(left - Math.max(0, est - el - live) * 0.5, live);   // 평균 기반과 실제 신호 사이 — 신호가 더 길면 신호를 따른다
  }
  return Math.round(queuedAhead + (left > 5_000 ? left : Math.max(5_000, k * Math.max(5_000, retryTail * 0.5))));
}

// 첫 안까지 남은 시간(아직 안 왔을 때만) — 같은 모드 최근 평균 firstMs − 경과. 앱이 「첫 안 ~N초」로 쓴다(11-09 통합)
export function firstEtaOf(j, now = Date.now()) {
  if (j.status !== 'running' && j.status !== 'queued') return null; if (j.partial?.length) return null;
  const s = statsSummary().byMode[j.mode]; const f = s?.avgFirstMs ?? (j.mode === 'suggest' ? 90_000 : null); if (f == null) return null;
  const el = j.startedAt ? now - j.startedAt : 0; const ahead = j.status === 'queued' ? positionOf(j.id) * (s?.avgTotalMs ?? DEFAULT_ETA.suggest) : 0;
  return Math.round(ahead + Math.max(3_000, f - el));
}
export function publicJob(j, { withResult = false } = {}) {
  if (!j) return null;
  const out = { id: j.id, status: j.status, mode: j.mode ?? 'suggest', specId: j.specId, specIds: j.specIds ?? null, campaignId: j.campaignId ?? null, styles: j.styles ?? null, stage: j.stage ?? (j.status === 'done' ? 'done' : j.status), progress: j.progress ?? { done: 0, total: 0 }, etaMs: j.progress ? etaOf(j) : 0, firstEtaMs: j.progress ? firstEtaOf(j) : null,
    createdAt: j.createdAt, startedAt: j.startedAt ?? null, finishedAt: j.finishedAt ?? null, elapsedMs: j.startedAt ? (j.finishedAt ?? Date.now()) - j.startedAt : 0, position: j.status === 'queued' || j.status === 'running' ? positionOf(j.id) : 0, error: j.error ?? null, stats: j.stats ?? null };
  if (withResult) { out.partial = j.partial ?? []; if (j.result) out.result = j.result; }
  return out;
}

function jobFile(id, dir) { return path.join(dir, `${String(id).replace(/[^\w.-]/g, '_')}.json`); }
function persist(j, dir) {
  try {
    mkdirSync(dir, { recursive: true });
    const f = jobFile(j.id, dir), tmp = f + '.tmp';
    const pub = publicJob(j, { withResult: true }); if (pub.result) delete pub.partial;   // 끝난 작업은 result 에 다 있다(파일 크기 절반)
    writeFileSync(tmp, JSON.stringify(pub));
    renameSync(tmp, f);
  } catch (e) { log('저장 실패', j.id, e.message); }
}
export function readJobFile(id, dir = JOBS_DIR) {
  const f = jobFile(id, dir); if (!existsSync(f)) return null;
  try { const o = JSON.parse(readFileSync(f, 'utf8')); if (o.result && !o.partial) o.partial = o.result.variants ?? []; return o; } catch { return null; }
}

// ── 통계(속도 측정 훅) — 작업이 끝날 때 한 줄
export function statsRowOf(j) {
  const r = j.result ?? {}; const calls = r.calls ?? j.calls ?? [];
  return { id: j.id, mode: j.mode, specId: j.specId, n: j.progress?.total ?? 0, status: j.status, at: j.finishedAt ?? Date.now(), totalMs: j.startedAt ? (j.finishedAt ?? Date.now()) - j.startedAt : null,
    firstMs: j.firstAt ? j.firstAt - j.startedAt : (r.firstMs ?? null), calls: calls.map(c => ({ kind: c.kind, ms: c.ms, model: c.model ?? null, style: c.style ?? null, specId: c.specId ?? null })),
    retries: calls.filter(c => c.kind === 'retry').length, rejected: r.rejected ?? (r.variants ?? []).filter(v => v.rejected).length, model: calls.find(c => c.kind !== 'retry' && c.model)?.model ?? r.model ?? null };   // 설계 호출의 모델(재요청은 빠른 모델)
}
function readStatsFile(dir) { const f = path.join(dir, 'stats.jsonl'); if (!existsSync(f)) return []; try { return readFileSync(f, 'utf8').trim().split('\n').slice(-LIST_MAX).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } }
let STATS_DIR = JOBS_DIR, STATS_LOADED = false;
function recordStats(row, dir) {
  if (!STATS_LOADED || STATS_DIR !== dir) { STATS.length = 0; STATS.push(...readStatsFile(dir)); STATS_DIR = dir; STATS_LOADED = true; }
  STATS.push(row); while (STATS.length > LIST_MAX) STATS.shift();
  try { mkdirSync(dir, { recursive: true }); appendFileSync(path.join(dir, 'stats.jsonl'), JSON.stringify(row) + '\n'); } catch (e) { log('통계 저장 실패', e.message); }
}
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
export function statsSummary(dir = STATS_DIR) {
  if (!STATS_LOADED || STATS_DIR !== dir) { STATS.length = 0; STATS.push(...readStatsFile(dir)); STATS_DIR = dir; STATS_LOADED = true; }
  const rows = STATS.slice(-LIST_MAX); const byMode = {};
  for (const m of MODES) {
    const rs = rows.filter(r => r.mode === m && r.status === 'done'); if (!rs.length) continue;
    const calls = rs.flatMap(r => r.calls ?? []); const models = {}; for (const c of calls) if (c.model) models[c.model] = (models[c.model] ?? 0) + 1;
    const gens = calls.filter(c => c.kind !== 'retry' && c.ms != null).map(c => c.ms).sort((a, b) => a - b);
    const nv = rs.reduce((a, r) => a + (r.n || 1), 0);
    byMode[m] = { p75CallMs: gens.length ? gens[Math.min(gens.length - 1, Math.floor(gens.length * 0.75))] : null, retryRate: nv ? Math.round(rs.reduce((a, r) => a + (r.retries ?? 0), 0) / nv * 100) / 100 : 0, n: rs.length, avgTotalMs: avg(rs.map(r => r.totalMs).filter(v => v != null)), avgFirstMs: avg(rs.map(r => r.firstMs).filter(v => v != null)), avgCallMs: avg(calls.filter(c => c.kind !== 'retry').map(c => c.ms).filter(v => v != null)), avgRetryMs: avg(calls.filter(c => c.kind === 'retry').map(c => c.ms)), avgRetries: rs.length ? Math.round(rs.reduce((a, r) => a + (r.retries ?? 0), 0) / rs.length * 100) / 100 : 0, avgRejected: Math.round(rs.reduce((a, r) => a + (r.rejected ?? 0), 0) / rs.length * 100) / 100, models };
  }
  return { n: rows.length, byMode, recent: rows.slice(-10).reverse() };
}

// 작업 걸기 — 바로 돌려준다(생성은 백그라운드). 같은 mode+specId+campaignId 가 살아 있으면 그것(dup:true)
export function enqueue(body, deps = {}) {
  const mode = modeOf(body);
  if (mode === 'spread') { if (!Array.isArray(body?.specIds) || !body.specIds.length) throw Object.assign(new Error('spread 는 specIds 가 필요합니다'), { status: 400 }); if (!body.language) throw Object.assign(new Error('spread 는 language 가 필요합니다'), { status: 400 }); }
  const specId = body?.specId ?? (mode === 'spread' ? body.specIds[0] : null);
  if (!specId) throw Object.assign(new Error('specId 가 없습니다'), { status: 400 });
  if (mode === 'revise' && !body?.prev?.html) throw Object.assign(new Error('revise 는 prev.html 이 필요합니다'), { status: 400 });
  const key = dedupKey({ ...body, specId });
  if (key) { for (const j of JOBS.values()) if ((j.status === 'queued' || j.status === 'running') && j.dedupKey === key) return { job: j, dup: true }; }
  if (QUEUE.length >= (deps.maxQueue ?? MAX_QUEUE)) throw Object.assign(new Error(`대기열이 가득 찼습니다(최대 ${deps.maxQueue ?? MAX_QUEUE}) — 끝나면 다시 눌러 주세요`), { status: 429 });
  // 옛 앱이 보내던 톤 3종(typo/bright/dark)은 「지정 없음」으로 — 11-09 부터 방향은 구성 축(KV 유형별 pickCompositions)
  const styles = Array.isArray(body.styles) && body.styles.length && !isLegacyTones(body.styles) ? body.styles : null;
  const engine = body.engine === 'api' && API_ENGINE_ENABLED ? 'api' : 'claude-code';
  const nb = { ...body, mode, specId, styles: styles ?? undefined, engine, review: body.review === true };
  const j = { id: newId(), mode, status: 'queued', stage: 'queued', specId, specIds: mode === 'spread' ? [...body.specIds] : null, campaignId: body.campaignId ?? null, dedupKey: key, styles, createdAt: Date.now(), partial: [], calls: [], progress: { done: 0, total: totalOf(nb, mode) }, body: nb,
    deps: { engines: { suggest: deps.freeDesign ?? realFreeDesign, revise: deps.freeRevise ?? realFreeRevise, spread: deps.freeSpread ?? realFreeSpread }, client: deps.client ?? null, dir: deps.dir ?? JOBS_DIR } };
  JOBS.set(j.id, j); QUEUE.push(j.id);
  log('접수', j.id, mode, j.specId, j.campaignId ?? '', `대기 ${QUEUE.length}`);
  pump();
  return { job: j, dup: false };
}

const stageRank = s => STAGES.indexOf(s);
// 큐 펌프 — 한 번에 하나만. 끝나면 다음 것
function pump() {
  if (RUNNING || !QUEUE.length) return;
  const id = QUEUE.shift(); const j = JOBS.get(id); if (!j) return pump();
  RUNNING = id; j.status = 'running'; j.stage = 'kv'; j.startedAt = Date.now();
  log('시작', id, j.mode, j.specId, j.styles ? `방향 ${j.styles.join(',')}` : '방향 자동');
  const { engines, client, dir } = j.deps;
  j.abort = new AbortController();
  const hooks = {
    client, signal: j.abort.signal,
    onStage: s => { if (stageRank(s) > stageRank(j.stage)) j.stage = s; },
    onVariant: v => { j.partial.push(v); j.progress.done = j.partial.length; if (!j.firstAt) j.firstAt = Date.now(); log('안', id, v.specId ?? '', v.style?.id ?? '', v.rejected ? '반려' : '통과', `${((Date.now() - j.startedAt) / 1000).toFixed(0)}s`); },
    onCall: c => { j.calls.push({ ...c, t: Date.now() }); },
  };
  Promise.resolve().then(() => engines[j.mode](j.body, hooks))
    .then(out => {
      if (j.status === 'cancelled') { j.result = out; return; }   // 취소 신호를 무시하고 끝난 엔진(stub) — 상태는 취소로 둔다
      j.result = out; j.status = 'done'; j.stage = 'done'; j.finishedAt = Date.now();
      if (!j.partial.length && out?.variants?.length) { j.partial = [...out.variants]; j.firstAt ??= j.finishedAt; }   // onVariant 을 안 부르는 엔진(옛 stub)
      j.progress.done = j.partial.length || j.progress.done; j.progress.total = Math.max(j.progress.total, out?.variants?.length ?? 0);
      log('완료', id, `${((j.finishedAt - j.startedAt) / 1000).toFixed(0)}s`, `안 ${out?.variants?.length ?? (out?.html ? 1 : 0)}`);
    })
    .catch(e => { if (j.status === 'cancelled') { log('취소 끝', id); return; } j.error = e?.message ?? String(e); j.status = 'failed'; j.stage = 'failed'; j.finishedAt = Date.now(); log('실패', id, j.error); })
    .finally(() => { delete j.body; delete j.abort; j.stats = statsRowOf(j); recordStats(j.stats, dir); persist(j, dir); j.done?.(); RUNNING = null; pump(); });
}

// 취소 — queued 는 큐에서 빼고 바로 끝, running 은 신호로 claude 자식 프로세스를 끊는다(엔진이 '취소됨' 으로 끝나면 pump 가 다음 작업으로). 이미 끝난 작업은 그대로
export function cancelJob(id) {
  const j = JOBS.get(id); if (!j) return null;
  if (j.status !== 'queued' && j.status !== 'running') return j;
  const was = j.status;
  j.status = 'cancelled'; j.stage = 'cancelled'; j.finishedAt = Date.now(); j.error = null;
  if (was === 'queued') { const i = QUEUE.indexOf(id); if (i >= 0) QUEUE.splice(i, 1); delete j.body; persist(j, j.deps?.dir ?? JOBS_DIR); j.done?.(); }
  else j.abort?.abort();
  log('취소', id, was, `도착 ${j.partial?.length ?? 0}`);
  return j;
}

export function getJob(id) { return JOBS.get(id) ?? null; }
export function listJobs() { return [...JOBS.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, LIST_MAX).map(j => publicJob(j)); }
export const jobsState = () => ({ running: RUNNING ? publicJob(JOBS.get(RUNNING)) : null, queued: QUEUE.length });
// 테스트용 — 끝날 때까지 기다리기 · 비우기
export function waitJob(id) { const j = JOBS.get(id); if (!j) return Promise.resolve(null); if (j.status === 'done' || j.status === 'failed' || (j.status === 'cancelled' && !j.abort)) return Promise.resolve(j); return new Promise(ok => { const prev = j.done; j.done = () => { prev?.(); ok(j); }; }); }
export function resetJobs() { JOBS.clear(); QUEUE.length = 0; RUNNING = null; STATS.length = 0; STATS_LOADED = false; }

async function loginCheck(body, check) {
  if (body.engine === 'api' && API_ENGINE_ENABLED) return null;
  const cc = await check();
  if (!cc.ok) return 'claude 명령을 찾지 못했습니다 — Claude Code 설치 후 서버를 다시 켜 주세요';
  if (cc.loggedIn === false) return 'Claude Code 가 로그인돼 있지 않습니다 — 터미널에서 `claude auth login` 한 번';
  return null;
}

// ── 라우트 ── 처리했으면 true. json(res, code, body)·readBody(req) 는 server.mjs 의 것. check 는 claude 로그인 확인(테스트는 stub)
export async function handleFreeJobs(req, res, u, { json, readBody, client = null, freeDesign = null, freeRevise = null, freeSpread = null, check = claudeCodeAvailable, dir = JOBS_DIR, maxQueue = MAX_QUEUE } = {}) {
  const p = u.pathname;
  if (!p.startsWith('/api/freedesign/jobs')) return false;
  const rest = p.slice('/api/freedesign/jobs'.length).replace(/^\//, '');
  if (req.method === 'POST' && !rest) {
    let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }), true; }
    if (body.engine === 'api' && API_ENGINE_ENABLED && !client) return json(res, 503, { error: 'API 키가 없습니다 — engine:"claude-code" 를 쓰거나 server/.env 에 ANTHROPIC_API_KEY=… 를 넣고 서버를 다시 켜 주세요' }), true;
    const bad = await loginCheck(body, check); if (bad) return json(res, 503, { error: bad }), true;
    try {
      const { job, dup } = enqueue(body, { freeDesign: freeDesign ?? undefined, freeRevise: freeRevise ?? undefined, freeSpread: freeSpread ?? undefined, client, dir, maxQueue });
      return json(res, dup ? 200 : 202, { jobId: job.id, status: job.status, mode: job.mode, position: positionOf(job.id), dup, progress: job.progress, etaMs: etaOf(job), ...jobsState() }), true;
    } catch (e) { return json(res, e.status ?? 500, { error: e.message }), true; }
  }
  if (req.method === 'GET' && !rest) return json(res, 200, { jobs: listJobs(), ...jobsState() }), true;
  if (req.method === 'GET' && rest) {
    const id = decodeURIComponent(rest);
    const j = getJob(id); if (j) return json(res, 200, publicJob(j, { withResult: true })), true;
    const f = readJobFile(id, dir); if (f) return json(res, 200, { ...f, position: 0, fromFile: true }), true;
    return json(res, 404, { error: '작업 없음: ' + id }), true;
  }
  if (req.method === 'DELETE' && rest) {
    const id = decodeURIComponent(rest);
    const j = cancelJob(id); if (!j) return json(res, 404, { error: '작업 없음: ' + id }), true;
    return json(res, 200, { id: j.id, status: j.status, partial: j.partial?.length ?? 0, ...jobsState() }), true;
  }
  return json(res, 405, { error: 'method' }), true;
}

// 즉시 수정 — LLM 없음. 규격 규칙(rulesForSpec)으로 고정 글자색·로고 크기·금지 배경색을 미리 거절
export function quickFix({ html, instruction, specId, brand = null } = {}) {
  if (!html) return { ok: false, reason: 'html 이 없습니다' };
  if (!instruction) return { ok: false, reason: 'instruction 이 없습니다' };
  const spec = specId ? SPECS[specId] : null;
  let rules = null; try { if (spec?.channel === 'ad') rules = rulesForSpec(specId); } catch {}
  const t0 = Date.now();
  const r = applyQuick(html, instruction, { w: spec?.w ?? null, h: spec?.h ?? null, rules, brand });
  return { ...r, ms: Date.now() - t0 };
}
export async function handleFreeExtra(req, res, u, { json, readBody, dir = JOBS_DIR } = {}) {
  const p = u.pathname;
  if (p === '/api/freedesign/quick') {
    if (req.method !== 'POST') return json(res, 405, { error: 'method' }), true;
    let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }), true; }
    return json(res, 200, quickFix(body)), true;
  }
  if (p === '/api/freedesign/stats' && req.method === 'GET') return json(res, 200, statsSummary(dir)), true;
  return false;
}
