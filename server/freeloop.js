// 자유 시안 평가 루프(11-05 사용자: 「사이트가 계속 떠 있고, 생성된 걸 내가 판단해 입력 누르면 데이터가 자동으로 들어가고, 다음 묶음이 또 생성돼 같은 페이지에 깔리는 식」).
//   라우트(server/server.mjs 가 handleFreeLoop 한 줄로 위임):
//     GET  /api/freeprefs                → { prefs, stats }  (ref/learned/free-prefs.json — 앱 IndexedDB `mbm-free-prefs` 와 같은 레코드 형식, png 는 파일에 안 넣는다)
//     POST /api/freeprefs { prefs:[rec…] } | { ratings:[{ batch, itemId, rating(1~5|null), scope, note }] } → 합쳐 저장 → { saved, stats }
//     POST /api/freeloop/next { kvCases:[caseId…], specId, n }  → claude 로그인 상태면 케이스마다 /api/freedesign 과 같은 엔진으로 n 안 생성 → _out/freedesign-loop/<batch>/ 에 json·png → { batch }
//                                                                미로그인이면 { pending:true, reason } (페이지는 「다음 묶음 대기 중」)
//     GET  /api/freeloop/batches          → { batches:[{ id, at, specId, cases, items:[…] }] } 최신 먼저
//   수동 경로: scripts/freeloop-push.mjs <batchDir> | --from-matrix → 같은 형식 batch.json 으로 밀어 넣는다(pushBatch).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prefRecord, mergePrefs, prefStats, exemplarsFor, scoreCandidates, kvTypeId, kvKeyOf, fingerprintOf, normRating, SCOPES } from '../core/freeprefs.js';
import { freeDesign, claudeCodeAvailable, substituteAssets } from './freedesign.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PREFS_FILE = path.join(ROOT, 'ref/learned/free-prefs.json');
export const LOOP_DIR = path.join(ROOT, '_out/freedesign-loop');
export const DEFAULT_SPEC = 'google-gdn-580x400';

// ── 파일 저장소 ──
export function readPrefs(file = PREFS_FILE) {
  try { const j = JSON.parse(readFileSync(file, 'utf8')); return Array.isArray(j) ? j : Array.isArray(j.prefs) ? j.prefs : []; } catch { return []; }
}
export function writePrefs(prefs, file = PREFS_FILE) {
  mkdirSync(path.dirname(file), { recursive: true });
  const list = prefs.map(({ png, ...p }) => p);   // 썸네일은 파일에 넣지 않는다(브라우저에만)
  const tmp = file + '.tmp';
  writeFileSync(tmp, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), note: '자유 시안 취향 평가(core/freeprefs.js). 개인 취향 — 커밋 대상. 고객사 글감은 자리표시.', stats: prefStats(list), prefs: list }, null, 1));
  renameSync(tmp, file);
  return list.length;
}
export function addPrefs(recs, file = PREFS_FILE) { const merged = mergePrefs(readPrefs(file), recs); writePrefs(merged, file); return merged; }

// ── 묶음 저장소 ──
export function listBatches(dir = LOOP_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(d => existsSync(path.join(dir, d, 'batch.json'))).map(d => { try { return JSON.parse(readFileSync(path.join(dir, d, 'batch.json'), 'utf8')); } catch { return null; } }).filter(Boolean).sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}
export function readBatch(id, dir = LOOP_DIR) { const f = path.join(dir, String(id), 'batch.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; }
export function writeBatch(b, dir = LOOP_DIR) { const d = path.join(dir, b.id); mkdirSync(d, { recursive: true }); writeFileSync(path.join(d, 'batch.json'), JSON.stringify(b, null, 1)); return d; }
const relPng = f => f ? '/' + path.relative(ROOT, f).split(path.sep).join('/') : null;

// 케이스 메타(ref/learned/cases) — 서버가 kvMeta·유형을 알기 위해
export function caseMeta(caseId) {
  const dir = path.join(ROOT, 'ref/learned/cases', caseId); const f = path.join(dir, 'meta.json');
  if (!existsSync(f)) return null;
  const meta = JSON.parse(readFileSync(f, 'utf8'));
  return { ...meta, kind: meta.field?.kind ?? null };
}
export function listCases() {
  try { const j = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8')); return (j.cases ?? []).map(c => { const m = caseMeta(c.id); return { id: c.id, name: c.name ?? c.id, kind: m?.kind ?? null, kvType: m ? kvTypeId(m) : null, logo: !!c.logo }; }); } catch { return []; }
}

// 묶음 항목 → 평가 레코드(앱 IndexedDB 와 같은 형식)
export function recordFromItem(item, batch, { rating = null, scope = 'type', note = '', id = null } = {}) {
  const meta = item.kvMeta ?? (item.caseId ? caseMeta(item.caseId) : null);
  const rec = prefRecord({ id: id ?? `fp-${batch.id}-${item.id}`, specId: item.specId ?? batch.specId, kvMeta: meta, kvType: item.kvType ?? null, caseId: item.caseId ?? null, html: item.html ?? '', rating: rating ?? 'unrated', note, scope, at: Date.now(), batch: batch.id, fp: item.fp ?? null, measure: item.measure ?? null });
  rec.rating = normRating(rating) ?? 'unrated';   // 5점(옛 good/ok/bad 는 5/3/1). 평가 안 한 카드는 보통으로 간주하지 않고 미평가로
  rec.itemId = item.id; rec.png = null; rec.pngUrl = item.png ?? null;
  return rec;
}

// 외부(대화창에서 만든 json/png) 묶음 → 표준 batch.json. entries: [{ id?, caseId, specId, html, png?, notes?, style?, kvType? }]
export function pushBatch(entries, { id = null, specId = null, source = 'manual', label = null, dir = LOOP_DIR } = {}) {
  const at = Date.now(); const bid = id ?? `b-${new Date(at).toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${source}`;
  const items = entries.map((e, i) => {
    const meta = e.kvMeta ?? (e.caseId ? caseMeta(e.caseId) : null);
    const fp = e.fp ?? fingerprintOf(e.html, { specId: e.specId ?? specId, kvMeta: meta, measure: e.measure ?? null });
    return { id: e.id ?? `${e.caseId ?? 'x'}-${i + 1}`, caseId: e.caseId ?? null, specId: e.specId ?? specId, kvType: e.kvType ?? fp.kvType ?? null, kvKey: kvKeyOf(meta), html: e.html, png: e.png ?? null, notes: e.notes ?? '', style: e.style ?? null, fp, measure: e.measure ?? null };
  });
  const b = { id: bid, at, specId: specId ?? items[0]?.specId ?? null, cases: [...new Set(items.map(i => i.caseId).filter(Boolean))], source, label, items };
  // 점수(현재 취향 기준) — 정렬·배지용. 버리지 않는다
  const prefs = readPrefs();
  b.items = rankItems(b.items, prefs);
  writeBatch(b, dir);
  return b;
}
export function rankItems(items, prefs) {
  const byCase = new Map(); for (const it of items) (byCase.get(it.caseId) ?? byCase.set(it.caseId, []).get(it.caseId)).push(it);
  const out = [];
  for (const [caseId, list] of byCase) { const kt = list[0]?.kvType ?? null; out.push(...scoreCandidates(list, prefs, { specId: list[0]?.specId, kvType: kt, kvKey: list[0]?.kvKey ?? null })); }
  return out;
}

// 다음 묶음 생성 — 로그인된 claude 로 케이스마다 n 안(styles 기본 3종 중 n). render 는 scripts/lib/freedesign-renderer.mjs(헤드리스 Chrome) — 없으면 png 없이
export async function nextBatch({ kvCases = [], specId = DEFAULT_SPEC, n = 3 } = {}, { client = null, run = null, render = null, dir = LOOP_DIR, check = claudeCodeAvailable } = {}) {
  if (!kvCases.length) throw new Error('kvCases 가 비었습니다');
  if (!run) {
    const cc = await check();
    if (!cc.ok) return { pending: true, reason: 'claude 명령 없음 — Claude Code 설치 후 서버 재시작, 또는 대화창에서 수동 생성(scripts/freeloop-push.mjs)' };
    if (cc.loggedIn === false) return { pending: true, reason: 'claude 로그인 필요(`claude auth login`) — 또는 대화창에서 수동 생성 후 scripts/freeloop-push.mjs' };
  }
  const { caseInput } = await import('../scripts/lib/freedesign-case.mjs');
  const prefs = readPrefs();
  const at = Date.now(); const bid = `b-${new Date(at).toISOString().slice(0, 16).replace(/[-:T]/g, '')}-auto`;
  const bdir = path.join(dir, bid); mkdirSync(bdir, { recursive: true });
  const entries = [];
  for (const caseId of kvCases) {
    const inp = caseInput(caseId, specId, { assets: 'data' });
    const meta = caseMeta(caseId);
    inp.prefs = exemplarsFor(prefs, { specId, kvMeta: meta, n: 3 });
    inp.n = n; inp.styles = undefined; inp.review = false;
    const out = await freeDesign(inp, { client, run });
    const vars = (out.variants ?? [{ html: out.html, notes: out.notes, style: null }]).slice(0, n);
    vars.forEach((v, i) => {
      const name = `${caseId}-${i + 1}`;
      const html = substituteAssets(v.html, { kv: inp.kv.dataUrl, logo: inp.logo?.dataUrl ?? null }).split(inp.kv.dataUrl).join(pathToFileURL(inp._files.kv).href).split(inp.logo?.dataUrl ?? '\u0000').join(inp._files.logo ? pathToFileURL(inp._files.logo).href : '');
      let png = null, measure = null;
      try { if (render) { const a = render({ specId, html, caseId, name }, bdir); png = relPng(a.png); measure = a.measure; } } catch (e) { console.error('[freeloop render]', e.message); }
      writeFileSync(path.join(bdir, name + '.json'), JSON.stringify({ specId, caseId, html, notes: v.notes ?? '', style: v.style ?? null }, null, 1));
      entries.push({ id: name, caseId, specId, html, png, notes: v.notes ?? '', style: v.style ?? null, kvMeta: meta, measure });
    });
  }
  return { batch: pushBatch(entries, { id: bid, specId, source: 'auto', dir }) };
}

// ── 라우트 ── 처리했으면 true. json(res, code, body)·readBody(req) 는 server.mjs 의 것
export async function handleFreeLoop(req, res, u, { json, readBody, client = null, render = null } = {}) {
  const p = u.pathname;
  if (req.method === 'GET' && p === '/api/freeprefs') { const prefs = readPrefs(); return json(res, 200, { prefs, stats: prefStats(prefs) }), true; }
  if (req.method === 'POST' && p === '/api/freeprefs') {
    let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }), true; }
    const recs = [];
    if (Array.isArray(body.prefs)) for (const r of body.prefs) if (r?.id && r.fp) recs.push({ ...r, png: undefined });
    if (Array.isArray(body.ratings)) {
      const cache = new Map();
      for (const r of body.ratings) {
        const b = cache.get(r.batch) ?? cache.set(r.batch, readBatch(r.batch)).get(r.batch); if (!b) continue;
        const item = b.items.find(i => i.id === r.itemId); if (!item) continue;
        recs.push(recordFromItem(item, b, { rating: r.rating ?? null, scope: SCOPES.includes(r.scope) ? r.scope : 'type', note: r.note ?? '' }));
        item.rating = normRating(r.rating) ?? 'unrated'; item.scope = r.scope ?? 'type'; item.note = r.note ?? '';
      }
      for (const b of cache.values()) if (b) { b.rated = b.items.every(i => i.rating != null); writeBatch(b); }
    }
    const merged = addPrefs(recs);
    return json(res, 200, { saved: recs.length, total: merged.length, stats: prefStats(merged) }), true;
  }
  if (req.method === 'GET' && p === '/api/freeloop/batches') return json(res, 200, { batches: listBatches(), cases: listCases(), stats: prefStats(readPrefs()) }), true;
  if (req.method === 'POST' && p === '/api/freeloop/next') {
    let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }), true; }
    try { const out = await nextBatch({ kvCases: body.kvCases ?? [], specId: body.specId ?? DEFAULT_SPEC, n: Math.max(1, Math.min(6, Number(body.n) || 3)) }, { client, render }); return json(res, 200, out), true; }
    catch (e) { console.error('[freeloop]', e?.message ?? e); return json(res, 500, { error: e?.message ?? String(e) }), true; }
  }
  return false;
}
