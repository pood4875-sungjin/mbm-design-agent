#!/usr/bin/env node
// 종합 품질 점수표 (10-20 사용자: 「가이드에 맞게 잘 나오는지 / 다양한 레이아웃을 제공하는지 / 배경과 키비주얼을 여백 없이, 비어 보이지 않게, 텍스트와 겹치지 않게,
//   끊어 보이지 않게 잘 들어가는지 — 이거 중심으로 검수를 하면서 계속 고도화」). 전 케이스 × 추출 규격(전달물·로고만 제외)을 한 줄에 여섯 축으로 잰다:
//   ① 가이드 준수  guidecheck 규칙 ✗(check.* 는 ③④로 보내고 뺀다) + 매체 규정 검사 block(cases-lint 방식: core/lint.js + scripts/lib/lint-extra.mjs)
//   ② 여백        kv-gap 판정(scripts/lib/kv-gap.mjs — kv-gap-audit 과 같은 자)
//   ③ 빈 곳       adcheck empty-band(warn) + 단일 사물 누끼 면적이 CANON.objectBleed.targetArea 하한 아래(area-low)
//   ④ 겹침        adcheck text-over-subject · logo-covered · text-clipped(warn) + overlapFix 가 fail 로 끝남
//   ⑤ 끊김·이질감 kv-seam-audit 판정(자식 프로세스로 돌려 JSON 을 합친다 — 픽셀 측정이라 따로)
//   ⑥ 레이아웃 다양성(측정만, 고치지 않는다) — 케이스마다 규격별 place.mode / objectSide / kvPlace 분포. 같은 비율(shape)·같은 유형의 규격이 전부 한 배치면 「단조」 표시
// 측정: ①~④·⑥ 은 케이스마다 headless Chrome 한 번(규격 전부를 한 페이지에 쌓고, 루트마다 가짜 document 로 core/guidemeasure.js measureGuideDoc(adcheck 포함)·lint measureDoc·여백 입력을 읽음).
//   ⑤ 는 scripts/kv-seam-audit.mjs 를 같은 케이스·규격·core 로 동시에 돌린다(--jobs 와 별도).
// 사용: node scripts/quality-audit.mjs [--cases all|a,b] [--specs a,b] [--tag before|after] [--jobs 4] [--seam-jobs 5] [--core <dir>] [--skip-seam] [--seam-json <경로>] [--no-sheet] [--sheet-max 60] [--before-core <dir>] [--out docs/quality-audit.md] [--reeval]
//   --reeval: Chrome 없이 저장된 원시 측정(_out/cmp-1016/_quality_tmp/<tag>/<id>.raw.json)과 이음 JSON 으로 판정만 다시 — 규칙 문장·판정 논리를 고쳤을 때(렌더러를 고쳤으면 다시 재야 한다)
//   --core: 다른 판의 core/ 로 그린다(전/후 — `git archive <sha> core | tar -x -C /tmp/before` 뒤 --core /tmp/before/core). --tag before 는 _out/cmp-1016/quality_audit_before.json(+md) 에, after 는 quality_audit.json + docs/quality-audit.md 에 쓰고 before 가 있으면 전/후 표를 만든다.
//   --before-core: after 시트에서 before 에 ✗ 였던 칸을 「전|후」로 나란히 그린다(없으면 after ✗ 만).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { judgeGap, GAP_COLLECT_JS, MIN_GAP, MAX_RATIO } from './lib/kv-gap.mjs';
import { extraChecks, MEASURE_JS, decodeDump } from './lib/lint-extra.mjs';

const T0 = Date.now();
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const TAG = opt('--tag') ?? 'after';
const JOBS = Math.max(1, +(opt('--jobs') ?? 4));
const SEAM_JOBS = Math.max(1, +(opt('--seam-jobs') ?? 5));
const ONLY = opt('--specs') ? opt('--specs').split(',') : null;
const CORE_DIR = path.resolve(opt('--core') ?? path.join(ROOT, 'core'));
const BEFORE_CORE = opt('--before-core') ? path.resolve(opt('--before-core')) : null;
const OUT_DIR = path.join(ROOT, 'ref/learned/cases/_out/cmp-1016');
const OUT_JSON = path.resolve(opt('--json') ?? path.join(OUT_DIR, TAG === 'before' ? 'quality_audit_before.json' : 'quality_audit.json'));
const OUT_MD = path.resolve(opt('--out') ?? (TAG === 'before' ? path.join(OUT_DIR, 'quality_audit_before.md') : path.join(ROOT, 'docs/quality-audit.md')));
const OUT_SHEET = path.resolve(opt('--sheet') ?? path.join(OUT_DIR, TAG === 'before' ? 'quality_sheet_before.png' : 'quality_sheet.png'));
const SHEET_MAX = +(opt('--sheet-max') ?? 60);
const NO_SHEET = flag('--no-sheet');
const REEVAL = flag('--reeval');   // 렌더·측정 없이 저장된 원시 측정(_quality_tmp/<tag>/<id>.raw.json)·이음 JSON 으로 판정만 다시(규칙 문장·판정 논리를 고쳤을 때)
const SKIP_SEAM = flag('--skip-seam') || REEVAL;
const SEAM_JSON = path.resolve(opt('--seam-json') ?? path.join(OUT_DIR, TAG === 'before' ? 'qa_seam_before.json' : 'qa_seam.json'));
const TMP = path.join(OUT_DIR, '_quality_tmp', TAG); mkdirSync(TMP, { recursive: true });
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };

const core = f => import(pathToFileURL(path.join(CORE_DIR, f)).href);
const F = await core('fonts.js');
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js'); const { applyKvTypeOverride, kvTypeOf } = await core('kvtypes.js');
const { CANON, guideFor } = await core('canon.js'); const { shapeOf } = await core('layouts.js');
const { lintArtifact } = await core('lint.js');
// 판정·측정 코드는 현재 판(ROOT)으로 고정 — 렌더러(CORE_DIR)만 바꿔 전/후를 잰다
const { RULES, applyRulesJson, evaluate, guideContext } = await import(pathToFileURL(path.join(ROOT, 'core/guidecheck.js')).href);
registerAll();
const ENTRIES = adSpecEntries();
const EXTRACT = JSON.parse(readFileSync(path.join(CORE_DIR, 'media/_extract.json'), 'utf8'));
const IDS = (EXTRACT.extract ?? []).filter(id => ENTRIES[id] && ENTRIES[id].channel !== 'asset' && (!ONLY || ONLY.includes(id)));
const RULES_JSON = path.join(ROOT, 'ref/learned/rules.json');
const RULESET = applyRulesJson(RULES, existsSync(RULES_JSON) ? JSON.parse(readFileSync(RULES_JSON, 'utf8')) : null);
const MEDIA = {}; const mediaName = m => { if (!MEDIA[m]) MEDIA[m] = JSON.parse(readFileSync(path.join(CORE_DIR, 'media', m + '.json'), 'utf8')); return MEDIA[m].name ?? m; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CASES = path.join(ROOT, 'ref/learned/cases');
const LEDGER = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const CASE_IDS = (() => { const v = opt('--cases') ?? 'all'; return v === 'all' ? LEDGER.cases.map(c => c.id).filter(id => existsSync(path.join(CASES, id, 'meta.json'))) : v.split(','); })();
const mime = f => f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const dataUri = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;
// 케이스 입력 — scripts/guide-trace.mjs styleOf 와 같은(로고 톤·단색 사본·유형 지정). 키비주얼은 file:// (한 페이지에 49장)
function caseOf(id, coreMods = null) {
  const c = LEDGER.cases.find(x => x.id === id); if (!c) throw new Error('케이스 없음: ' + id);
  const dir = path.join(CASES, c.id);
  const M = coreMods ?? { applyKvTypeOverride, normalizeStyle, createContext, kvTypeOf };
  const meta = M.applyKvTypeOverride(JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), c.typeOverride ?? null);
  const logo = c.logo && existsSync(path.join(dir, c.logo)) ? pathToFileURL(path.join(dir, c.logo)).href : null;
  const tone = c.logoMeta?.tone ?? 'dark';
  const style = M.normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: (c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono))) ? pathToFileURL(path.join(dir, c.logoMono)).href : null, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null });
  const kt = M.kvTypeOf(meta);
  return { c, meta, style, kt, ctx: M.createContext(c.fields ?? DEFAULT_FIELDS, 'recruit'), kind: meta.field?.kind ?? ((meta.field?.opaque ?? 1) < 0.5 ? 'cutout' : 'illust'), type: kt ? `${kt.id}${kt.sub ? '/' + kt.sub.id : ''}` : '', hasDate: !!(c.fields ?? DEFAULT_FIELDS).deadline };
}

// ── 브라우저 측정(케이스 한 페이지) — 루트마다 가짜 document 를 만들어 measureGuideDoc(adcheck 포함)·measureDoc(lint)·collectGap 을 돌린다
const MEASURE = (kvUrl, kvMeta) => `<script type="module">
import { kvGrid, measureGuideDoc } from '${pathToFileURL(path.join(ROOT, 'core/guidemeasure.js')).href}';
${MEASURE_JS}
${GAP_COLLECT_JS}
const __out = o => { const p = document.createElement('pre'); p.id = 'q'; p.style.display = 'none'; p.textContent = JSON.stringify(o); document.body.appendChild(p); document.documentElement.dataset.done = '1'; };
addEventListener('error', e => __out({ error: String(e.error?.stack ?? e.message) })); addEventListener('unhandledrejection', e => __out({ error: String(e.reason?.stack ?? e.reason) }));
const settle = async () => { try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 4000))]); } catch {} const urls = new Set(); for (const e of document.querySelectorAll('*')) { for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.add(m[1]); } const imgs = {}; await Promise.race([Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = () => { imgs[u] = i.naturalWidth > 0; r(); }; i.onerror = () => { imgs[u] = false; r(); }; i.src = u; }))), new Promise(r => setTimeout(r, 8000))]); await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))); await new Promise(r => setTimeout(r, 200)); return imgs; };
(async () => { const out = { specs: {} }; try {
  const kvMeta = ${JSON.stringify(kvMeta)};
  out.__imgs = await settle();
  const G = await kvGrid(${JSON.stringify(kvUrl)}); out.grid = G?.err ? { err: G.err } : G ? { gw: G.gw, gh: G.gh, nw: G.nw, nh: G.nh } : null;
  // 루트 하나만 보는 가짜 document: querySelector 가 루트 자신도 맞춘다
  const docOf = root => ({ querySelector: s => root.matches(s) ? root : root.querySelector(s), querySelectorAll: s => root.querySelectorAll(s), createTreeWalker: (...a) => document.createTreeWalker(...a), createRange: () => document.createRange(), body: { firstElementChild: root }, images: root.querySelectorAll('img'), fonts: document.fonts, readyState: 'complete' });
  for (const root of document.querySelectorAll('[data-ad]')) {
    const sid = root.dataset.spec; const d = docOf(root); const r = {};
    if (root.dataset.renderError) { out.specs[sid] = { error: root.dataset.renderError }; continue; }
    try { r.g = measureGuideDoc(d, { kvMeta, G }); } catch (e) { r.g = { error: String(e?.stack ?? e) }; }
    try { r.l = measureDoc(d); } catch (e) { r.l = { error: String(e) }; }
    try { r.gap = collectGap(root); } catch (e) { r.gap = null; }
    r.overlap = root.dataset.overlap ?? null;
    out.specs[sid] = r;
  } } catch (e) { out.error = String(e?.stack ?? e); }
  __out(out); })();
</script>`;
const chromeAsync = (args) => new Promise((res, rej) => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { maxBuffer: 512 << 20 }, (err, stdout) => err ? rej(err) : res(stdout.toString())));

async function measureCase(K) {
  let y = 0; const cells = []; let maxW = 400;
  for (const sid of IDS) {
    const sp = ENTRIES[sid]; let html = '';
    try { html = renderArtifact(sid, K.ctx, K.style, {}); } catch (e) { html = `<div data-ad="1" data-spec="${sid}" data-render-error="${esc(e.message)}" style="width:${sp.w}px;height:${sp.h}px;background:#f0f"></div>`; }
    cells.push(`<div style="position:absolute;left:0;top:${y}px;width:${sp.w}px;height:${sp.h}px">${html}</div>`); y += sp.h + 20; maxW = Math.max(maxW, sp.w);
  }
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}</style><style>html,body{margin:0;background:#fff}body{position:relative;width:${maxW}px;height:${y}px}</style></head><body>${cells.join('')}${MEASURE(K.style.keyVisual, K.meta)}</body></html>`;
  const f = path.join(TMP, `${K.c.id}.html`); writeFileSync(f, doc);
  let o = null;
  for (let t = 0; t < 3 && !o; t++) {
    try {
      const dom = await chromeAsync([`--virtual-time-budget=${30000 + t * 20000}`, `--window-size=${maxW},1200`, '--dump-dom', pathToFileURL(f).href]);
      const m = dom.match(/<pre id="q"[^>]*>([\s\S]*?)<\/pre>/); if (m) o = JSON.parse(decodeDump(m[1]));
      if (o?.error) { console.warn(K.c.id, '측정 스크립트 오류', String(o.error).slice(0, 160)); o = null; continue; }
      if (o && Object.values(o.__imgs ?? {}).some(v => v === false)) { console.warn(K.c.id, '그림 로드 실패 — 재시도'); o = null; }
    } catch (e) { console.warn(K.c.id, 'chrome 실패', String(e.message).slice(0, 120)); o = null; }
  }
  return o ?? { specs: {} };
}

// ── 판정(규격 하나) ──
const OVERLAP_CODES = ['text-over-subject', 'logo-covered', 'text-clipped'];
function judgeSpec(K, sid, r) {
  const sp = ENTRIES[sid];
  const row = { case: K.c.id, kind: K.kind, type: K.type, spec: sid, medium: sp.medium, mediumName: mediaName(sp.medium), W: sp.w, H: sp.h, shape: shapeOf(sp.w, sp.h), axes: {}, bad: [], causes: [] };
  if (!r || r.error) { row.skip = r?.error ? '렌더 실패 ' + String(r.error).slice(0, 60) : '측정 실패'; return row; }
  const g = r.g ?? {}; const trace = g.trace ?? null; const ad = g.ad ?? {};
  if (ad['data-logo-only']) { row.skip = '로고만 규격'; return row; }
  if (g.error) { row.skip = '측정 오류 ' + String(g.error).slice(0, 60); return row; }
  row.mode = trace?.place?.mode ?? trace?.mode ?? null; row.side = trace?.place?.objectSide ?? null; row.kvUse = ad['data-kv-use'] ?? null; row.template = !!(ad['data-template'] || ad['data-mold']);
  row.kvPlace = trace?.edit?.place?.want ?? null; row.imgCol = trace?.place?.imgCol ?? null; row.variant = ad['data-variant'] ?? null; row.rules = (trace?.rules ?? []).filter(x => /overlapFix|objectBleed|cutFade|meltFix|templateMold$|visualOnly|fill\.|cutWindow|maxUpscale|fieldAlign/.test(x));
  row.fieldSource = trace?.field?.source ?? null;
  const visualOnly = (trace?.rules ?? []).includes('visualOnly');
  // ① 가이드 규칙(check.* 제외) + 매체 규정 block
  const C = guideContext({ spec: sp, trace, m: g, meta: K.meta, kt: K.kt, guide: guideFor(sp.mediumRules ?? {}), shape: row.shape, logoMeta: K.c.logoMeta ?? null, primary: K.style.palette?.primary ?? null, kind: 'recruit', hasDate: K.hasDate });
  let rows = []; try { rows = evaluate(C, RULESET); } catch (e) { rows = []; row.evalError = String(e.message); }
  const guideFail = rows.filter(x => x.ok === false && !x.id.startsWith('check.')).map(x => x.id);
  const guideFailDetail = rows.filter(x => x.ok === false && !x.id.startsWith('check.')).map(x => `${x.id}(${x.expect} → ${x.actual})`);
  let lintBlock = [];
  const l = r.l;
  if (l && !l.error) {
    const measure = { w: l.w * (sp.exportScale ?? 1), h: l.h * (sp.exportScale ?? 1), bytes: null, format: null, transparent: l.transparent, fontFamily: l.fontFamily, texts: l.texts, logo: l.logo, objects: l.objects, logoCount: l.logoCount, bgColors: null, cutout: (K.meta.field?.opaque ?? 1) < 0.5 };
    try { const L = lintArtifact({ spec: sp.rules, medium: sp.mediumRules, measure }); const X = extraChecks(sp, measure).filter(x => !L.issues.some(i => i.code === x.code)); lintBlock = [...L.issues, ...X].filter(i => i.level === 'block').map(i => i.code + (i.role ? ':' + i.role : '')); } catch (e) { row.lintError = String(e.message); }
  }
  row.axes.guide = { v: guideFail.length || lintBlock.length ? '✗' : '✓', rules: guideFail, detail: guideFailDetail, lint: lintBlock, checked: rows.filter(x => x.ok !== null).length };
  // ② 여백
  const gp = judgeGap(r.gap, sp, K.meta.px);
  row.axes.gap = gp.skip ? { v: '–', skip: gp.skip } : { v: gp.verdict, why: gp.why, gap: gp.gap, bad: gp.bad, fit: gp.img?.fit ?? null };
  // ③ 빈 곳 — adcheck empty-band(warn) · 단일 사물 누끼 면적 하한
  const warns = g.check?.warnings ?? [];
  const emptyWarn = warns.find(w => w.code === 'empty-band' && w.level !== 'info'), emptyInfo = warns.find(w => w.code === 'empty-band' && w.level === 'info');
  let areaLow = null;
  // 틀(templateMold)의 그림 칸은 템플릿이 크기를 정한다(10-15 「칸 안에 맞춰 넣기」) — 면적 목표는 자유 배치에만
  if (trace?.gate?.singleObj && trace?.place?.bleed && g.kvArea != null && !row.template) {
    const B = C.guide.objectBleed, sh = row.shape; const tallish = sh === 'tall' || sh === 'tower'; const tower = B.tower && sp.w <= B.tower.maxW && tallish;
    const [lo, hi] = (tower ? B.tower.targetArea?.[sh] : null) ?? B.targetArea?.[sh] ?? B.targetArea.wide;
    const capped = (trace.rules ?? []).includes('maxUpscale');
    areaLow = { area: g.kvArea, lo, hi, low: g.kvArea < lo - 0.01, capped };
  }
  const emptyBad = []; if (emptyWarn) emptyBad.push('empty-band'); if (areaLow?.low && !areaLow.capped) emptyBad.push('area-low');
  row.axes.empty = { v: (visualOnly || row.kvUse === 'none') && !emptyBad.length ? '–' : emptyBad.length ? '✗' : '✓', bad: emptyBad, band: g.check?.metrics?.emptyBand ?? null, mid: g.check?.metrics?.emptyMid ?? null, info: emptyInfo ? emptyInfo.msg : null, area: areaLow };
  // ④ 겹침
  const ovCodes = warns.filter(w => OVERLAP_CODES.includes(w.code) && w.level !== 'info').map(w => w.code);
  const ovFail = (trace?.rules ?? []).includes('overlapFix.fail');
  if (ovFail) ovCodes.push('overlapFix.fail');
  row.axes.overlap = { v: ovCodes.length ? '✗' : (row.kvUse === 'none' ? '–' : '✓'), bad: ovCodes, pct: g.check?.metrics?.textOverSubject ?? null, logo: g.check?.metrics?.logoCovered ?? null, fix: r.overlap ?? null, msgs: warns.filter(w => OVERLAP_CODES.includes(w.code) && w.level !== 'info').map(w => w.msg) };
  // ⑤ 끊김·이질감 — 자식(kv-seam-audit) 결과를 뒤에 합친다
  row.axes.seam = { v: '–', skip: '미측정' };
  // ⑥ 다양성 입력
  row.kvArea = g.kvArea ?? null;
  return row;
}
function finishRow(row) {
  row.bad = Object.entries(row.axes).filter(([, a]) => a.v === '✗').map(([k]) => k);
  row.verdict = row.skip ? '–' : row.bad.length ? '✗' : '✓';
  row.causes = [];
  if (row.axes.guide?.v === '✗') { for (const id of row.axes.guide.rules) row.causes.push('rule:' + id); for (const c of row.axes.guide.lint) row.causes.push('lint:' + c.split(':')[0]); }
  if (row.axes.gap?.v === '✗') row.causes.push('gap:' + row.axes.gap.why);
  if (row.axes.empty?.v === '✗') for (const b of row.axes.empty.bad) row.causes.push('empty:' + b);
  if (row.axes.overlap?.v === '✗') for (const b of row.axes.overlap.bad) row.causes.push('overlap:' + b);
  if (row.axes.seam?.v === '✗') for (const c of row.axes.seam.cats ?? []) row.causes.push('seam:' + c);
  return row;
}

// ── ⑤ kv-seam-audit 자식 프로세스 ──
function runSeam() {
  if (SKIP_SEAM) return Promise.resolve(null);
  const args = [path.join(ROOT, 'scripts/kv-seam-audit.mjs'), '--cases', CASE_IDS.join(','), '--tag', TAG, '--json', SEAM_JSON, '--out', path.join(TMP, 'seam.md'), '--no-sheet', '--jobs', String(SEAM_JOBS), '--core', CORE_DIR];
  if (ONLY) args.push('--specs', ONLY.join(','));
  return new Promise(res => {
    const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let last = ''; p.stdout.on('data', d => { last = String(d).trim().split('\n').pop(); }); p.stderr.on('data', d => { const s = String(d).trim(); if (s && !/ExperimentalWarning/.test(s)) process.stderr.write('[seam] ' + s.slice(0, 200) + '\n'); });
    p.on('close', code => { console.log(`[seam] 끝(${code}) ${last}`); res(code); });
  });
}
const seamP = runSeam();

// ── 실행(①~④·⑥) ──
const rows = []; const byCase = {}; const queue = CASE_IDS.slice(); let done = 0;
async function worker() {
  while (queue.length) {
    const cid = queue.shift(); let K;
    try { K = caseOf(cid); } catch (e) { console.warn(cid, e.message); continue; }
    byCase[cid] = K;
    const rawP = path.join(TMP, `${cid}.raw.json`);
    let o;
    if (REEVAL) { if (!existsSync(rawP)) { console.warn(cid, '원시 측정 없음 —', rawP); continue; } o = JSON.parse(readFileSync(rawP, 'utf8')); }
    else { o = await measureCase(K); writeFileSync(rawP, JSON.stringify(o)); }   // 원시 측정은 늘 남긴다(--reeval 입력)
    for (const sid of IDS) rows.push(judgeSpec(K, sid, o.specs?.[sid] ?? null));
    done++;
    const mine = rows.filter(r => r.case === cid && !r.skip);
    const bad = mine.filter(r => Object.values(r.axes).some(a => a.v === '✗'));
    process.stdout.write(`[${done}/${CASE_IDS.length}] ${cid} (${K.kind}) ✗ ${bad.length} / ${mine.length} — ${['guide', 'gap', 'empty', 'overlap'].map(k => `${k} ${mine.filter(r => r.axes[k]?.v === '✗').length}`).join(' · ')}  ${Math.round((Date.now() - T0) / 1000)}s\n`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));
console.log(`①~④ 측정 끝 ${Math.round((Date.now() - T0) / 1000)}s — ⑤ 이음 감사 대기`);
await seamP;
if (existsSync(SEAM_JSON)) {
  const S = JSON.parse(readFileSync(SEAM_JSON, 'utf8')); const map = new Map(S.rows.map(r => [`${r.case}__${r.spec}`, r]));
  for (const row of rows) { const s = map.get(`${row.case}__${row.spec}`); if (!s) continue; row.axes.seam = s.skip ? { v: '–', skip: s.skip } : { v: s.verdict, cats: s.cats, bad: s.bad }; }
} else if (!SKIP_SEAM) console.warn('⑤ 이음 감사 JSON 없음 —', SEAM_JSON);
for (const row of rows) finishRow(row);
const order = new Map(CASE_IDS.map((c, i) => [c, i])); const sorder = new Map(IDS.map((s, i) => [s, i]));
rows.sort((a, b) => (sorder.get(a.spec) - sorder.get(b.spec)) || (order.get(a.case) - order.get(b.case)));

// ── ⑥ 레이아웃 다양성(측정만) ──
const FREE = m => !!m && !/^(mold|template|corner|box|full|bg-|none)/.test(m);   // 틀·템플릿 칸·오브젝트 상자·지면 전체는 매체·그림이 정한 배치 — 자유 배치만 따로 센다
// 배치 열쇠: 틀(mold)은 그림 칸 자리(imgCol: left/right/bottom/corner)와 변형(variant)으로, 자유 배치는 mode/objectSide 로. 정렬 프리셋이 자리를 옮겼으면(kvPlace) 덧붙인다
const placeKey = r => `${r.mode ?? '—'}/${r.side === 'template' ? (r.imgCol ?? 'template') : (r.side ?? '—')}${r.variant ? '@' + r.variant : ''}${r.kvPlace ? '@' + r.kvPlace : ''}`;
function diversityOf(cid) {
  const mine = rows.filter(r => r.case === cid && !r.skip && r.kvUse && r.kvUse !== 'none');
  const key = placeKey;
  const all = new Set(mine.map(key)), free = new Set(mine.filter(r => FREE(r.mode)).map(key));
  const byShape = {}; for (const r of mine) { (byShape[r.shape] ??= []).push(r); }
  const mono = [];
  for (const [sh, rs] of Object.entries(byShape)) { const fr = rs.filter(r => FREE(r.mode)); if (fr.length >= 3) { const ks = new Set(fr.map(key)); if (ks.size === 1) mono.push({ shape: sh, n: fr.length, key: [...ks][0] }); } }
  const modes = {}; for (const r of mine) modes[key(r)] = (modes[key(r)] ?? 0) + 1;
  return { n: mine.length, nFree: mine.filter(r => FREE(r.mode)).length, kinds: all.size, kindsFree: free.size, mono, modes };
}
const DIV = Object.fromEntries(CASE_IDS.filter(c => byCase[c]).map(c => [c, diversityOf(c)]));

// ── 집계 ──
const AXES = [['guide', '① 가이드 준수'], ['gap', '② 여백'], ['empty', '③ 빈 곳'], ['overlap', '④ 겹침'], ['seam', '⑤ 끊김·이질감']];
const measured = rows.filter(r => !r.skip);
const badRows = measured.filter(r => r.verdict === '✗');
const countAxis = (rs, k) => rs.filter(r => r.axes[k]?.v === '✗').length;
const measuredAxis = (rs, k) => rs.filter(r => r.axes[k] && r.axes[k].v !== '–').length;
const causeCount = rs => { const m = {}; for (const r of rs) for (const c of new Set(r.causes)) { m[c] ??= { n: 0, specs: {}, cases: new Set(), modes: {} }; m[c].n++; m[c].specs[r.spec] = (m[c].specs[r.spec] ?? 0) + 1; m[c].cases.add(r.case); m[c].modes[r.mode ?? '—'] = (m[c].modes[r.mode ?? '—'] ?? 0) + 1; } for (const v of Object.values(m)) v.cases = [...v.cases]; return m; };
const CAUSES = causeCount(badRows);
const BEFORE_PATH = path.join(OUT_DIR, 'quality_audit_before.json');
const before = (TAG !== 'before' && existsSync(BEFORE_PATH)) ? JSON.parse(readFileSync(BEFORE_PATH, 'utf8')) : null;
const bRows = before ? before.rows.filter(r => !r.skip) : [];
const bBad = bRows.filter(r => r.verdict === '✗');
const bCauses = before ? causeCount(bBad) : null;
const bKey = new Set(bBad.map(r => `${r.case}__${r.spec}`)); const aKey = new Set(badRows.map(r => `${r.case}__${r.spec}`));
const fixed = before ? bBad.filter(r => !aKey.has(`${r.case}__${r.spec}`)) : [];
const regressed = before ? badRows.filter(r => !bKey.has(`${r.case}__${r.spec}`)) : [];
writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), tag: TAG, core: CORE_DIR, elapsedSec: Math.round((Date.now() - T0) / 1000), cases: CASE_IDS, specs: IDS, axes: AXES.map(a => a[0]), thresholds: { gap: { MIN_GAP, MAX_RATIO }, emptyBand: 0.28, overlap: CANON.overlapFix, targetArea: CANON.objectBleed.targetArea }, diversity: DIV, rows }, null, 1));

// ── 문서 ──
const md = [];
const pct = (a, b) => b ? `${a} (${Math.round(a / b * 1000) / 10}%)` : `${a}`;
md.push('# 종합 품질 점수표 (quality-audit)', '');
md.push(`- 생성: \`node scripts/quality-audit.mjs --tag ${TAG}\` · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · 케이스 ${CASE_IDS.length} × 규격 ${IDS.length}(추출 규격 중 전달물 제외) = ${rows.length} · 측정 ${measured.length} · 제외 ${rows.length - measured.length}(${Object.entries(rows.filter(r => r.skip).reduce((a, r) => (a[r.skip] = (a[r.skip] ?? 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(' · ')}) · ${Math.round((Date.now() - T0) / 1000)}초`);
md.push('- 한 줄 = 케이스 × 규격. 축마다 ✗/✓/–(해당 없음). 규격 하나가 한 축이라도 ✗ 면 ✗ 규격으로 센다.');
md.push('  - **① 가이드 준수** `core/guidecheck.js` 규칙(장부 `ref/learned/rules.json` 문장 적용) ✗ — 검수 규칙 `check.*` 는 ③④로 보내고 여기선 뺀다 + 매체 규정 검사 block(`core/lint.js` + `scripts/lib/lint-extra.mjs`, cases-lint 와 같은 측정)');
md.push(`  - **② 여백** \`scripts/lib/kv-gap.mjs\` — 그림 오른쪽·아래 변이 지면 변에서 ${MIN_GAP}px 초과 ~ 변 ${MAX_RATIO * 100}% 이하 떨어짐(템플릿 edgeInset·전폭 띠 대칭은 ✓). kv-gap-audit 과 같은 자`);
md.push('  - **③ 빈 곳** adcheck `empty-band`(아무것도 없는 가로 띠 > 28%, 가장자리 36% — warn 만, info 는 그림·틀 탓이라 참고) + 단일 사물 누끼 면적이 `CANON.objectBleed.targetArea` 하한 아래(`area-low` — 자유 배치만. 틀 그림 칸은 템플릿이 크기를 정하고, maxUpscale 로 멈춘 것은 그림 탓이라 제외)');
md.push('  - **④ 겹침** adcheck `text-over-subject`(15%, 캐릭터 2%) · `logo-covered`(5%) · `text-clipped` + `overlapFix.fail`(교정 사다리를 다 써도 문턱 위)');
md.push('  - **⑤ 끊김·이질감** `scripts/kv-seam-audit.mjs` 판정(cut-nomask · cut-short · cutout-cut · seam-far · bg-box · bg-in-cutout) — 같은 케이스·규격·core 로 동시에 돌린 결과를 합침');
md.push('  - **⑥ 레이아웃 다양성** 측정만(2단계 설계 입력) — 아래 절', '');

md.push(`## 결과: **✗ ${badRows.length} 규격** / 측정 ${measured.length}${before ? ` (전 ✗ ${bBad.length} / ${bRows.length} · 고침 ${fixed.length} · 새로 ✗ ${regressed.length})` : ''}`, '');
md.push(before ? '| 축 | 전 ✗ | 후 ✗ | 측정 |' : '| 축 | ✗ | 측정 |', before ? '|---|---|---|---|' : '|---|---|---|');
for (const [k, name] of AXES) md.push(before ? `| ${name} | ${countAxis(bRows, k)} | **${countAxis(measured, k)}** | ${measuredAxis(measured, k)} |` : `| ${name} | **${countAxis(measured, k)}** | ${measuredAxis(measured, k)} |`);
md.push(before ? `| **✗ 규격(중복 제외)** | **${bBad.length}** | **${badRows.length}** | ${measured.length} |` : `| **✗ 규격(중복 제외)** | **${badRows.length}** | ${measured.length} |`, '');
const kinds = [...new Set(measured.map(r => r.kind))];
md.push('유형별 ✗/측정: ' + kinds.map(k => `${k} ${before ? `${bBad.filter(r => r.kind === k).length} → ` : ''}${badRows.filter(r => r.kind === k).length} / ${measured.filter(r => r.kind === k).length}`).join(' · '), '');

md.push('## 원인별(많은 순)', '', before ? '| 원인 | 전 | 후 | 규격 수 | 케이스 수 | 많이 나는 규격 | 배치(mode) |' : '| 원인 | ✗ | 규격 수 | 케이스 수 | 많이 나는 규격 | 배치(mode) |', before ? '|---|---|---|---|---|---|---|' : '|---|---|---|---|---|---|');
const allCauses = new Set([...Object.keys(CAUSES), ...Object.keys(bCauses ?? {})]);
const top = s => Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(' · ');
for (const c of [...allCauses].sort((a, b) => (CAUSES[b]?.n ?? 0) - (CAUSES[a]?.n ?? 0) || (bCauses?.[b]?.n ?? 0) - (bCauses?.[a]?.n ?? 0))) {
  const v = CAUSES[c] ?? { n: 0, specs: {}, cases: [], modes: {} };
  md.push(before ? `| \`${c}\` | ${bCauses?.[c]?.n ?? 0} | **${v.n}** | ${Object.keys(v.specs).length} | ${v.cases.length} | ${top(v.specs)} | ${top(v.modes)} |` : `| \`${c}\` | **${v.n}** | ${Object.keys(v.specs).length} | ${v.cases.length} | ${top(v.specs)} | ${top(v.modes)} |`);
}
md.push('');
const bySpecBad = {}; for (const r of badRows) bySpecBad[r.spec] = (bySpecBad[r.spec] ?? 0) + 1;
const byCaseBad = {}; for (const r of badRows) byCaseBad[r.case] = (byCaseBad[r.case] ?? 0) + 1;
md.push('규격별 ✗(많은 순): ' + Object.entries(bySpecBad).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `\`${k}\` ${v}`).join(' · '), '');
md.push('케이스별 ✗(많은 순): ' + Object.entries(byCaseBad).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `\`${k}\` ${v}`).join(' · '), '');
if (before && (fixed.length || regressed.length)) {
  md.push('## 전/후 달라진 규격', '');
  if (fixed.length) md.push(`- 고침 ${fixed.length}: ` + fixed.slice(0, 40).map(r => `${r.case}@${r.spec}(${r.bad.join('·')})`).join(' · ') + (fixed.length > 40 ? ' …' : ''));
  if (regressed.length) md.push(`- **새로 ✗ ${regressed.length}**: ` + regressed.slice(0, 40).map(r => `${r.case}@${r.spec}(${r.causes.join('·')})`).join(' · ') + (regressed.length > 40 ? ' …' : ''));
  md.push('');
}

// ⑥
md.push('## ⑥ 레이아웃 다양성(측정만 — 고치지 않음)', '');
md.push('케이스마다 키비주얼이 있는 규격의 배치 종류 = `place.mode/objectSide[@kvPlace]`. 「자유 배치」 = 틀(mold)·템플릿 칸(template·corner)·오브젝트 상자(box)·지면 전체(full·bg-*)가 아닌 것 — 매체가 자리를 정한 규격은 다양성을 따질 수 없다. 「단조」 = 같은 비율(shape)의 자유 배치 규격이 3개 이상인데 전부 한 배치.', '');
const hist = {}; for (const d of Object.values(DIV)) hist[d.kindsFree] = (hist[d.kindsFree] ?? 0) + 1;
md.push('- 케이스당 자유 배치 종류 수 분포: ' + Object.entries(hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}종 ${v}케이스`).join(' · '));
const histAll = {}; for (const d of Object.values(DIV)) histAll[d.kinds] = (histAll[d.kinds] ?? 0) + 1;
md.push('- 케이스당 전체 배치 종류 수 분포(틀·템플릿 포함): ' + Object.entries(histAll).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}종 ${v}케이스`).join(' · '));
const monoBy = {}; for (const [cid, d] of Object.entries(DIV)) for (const m of d.mono) { (monoBy[m.shape] ??= { n: 0, keys: {}, cases: [] }); monoBy[m.shape].n++; monoBy[m.shape].keys[m.key] = (monoBy[m.shape].keys[m.key] ?? 0) + 1; monoBy[m.shape].cases.push(cid); }
md.push('- 단조(비율별): ' + (Object.keys(monoBy).length ? Object.entries(monoBy).map(([sh, v]) => `${sh} ${v.n}케이스(${top(v.keys)})`).join(' · ') : '없음'));
const modeTot = {}; for (const r of measured) if (r.kvUse && r.kvUse !== 'none') { const k = placeKey(r); modeTot[k] = (modeTot[k] ?? 0) + 1; }
md.push('- 배치 전체 분포(규격 수): ' + Object.entries(modeTot).sort((a, b) => b[1] - a[1]).map(([k, v]) => `\`${k}\` ${v}`).join(' · '));
// 비율 × 유형 → 자유 배치 종류
const shapeType = {}; for (const r of measured) { if (!r.kvUse || r.kvUse === 'none') continue; const k = `${r.shape} × ${r.kind}`; (shapeType[k] ??= { n: 0, keys: {} }); shapeType[k].n++; const kk = placeKey(r); shapeType[k].keys[kk] = (shapeType[k].keys[kk] ?? 0) + 1; }
md.push('', '| 비율 × 유형(키비주얼 있는 규격 전부) | 규격 수 | 배치 종류 | 분포 |', '|---|---|---|---|');
for (const [k, v] of Object.entries(shapeType).sort((a, b) => b[1].n - a[1].n)) md.push(`| ${k} | ${v.n} | ${Object.keys(v.keys).length} | ${Object.entries(v.keys).sort((a, b) => b[1] - a[1]).map(([kk, n]) => `\`${kk}\` ${n}`).join(' · ')} |`);
md.push('');

// ✗ 목록
md.push('## ✗ 목록', '', '| 규격 | 케이스(유형) | 배치 | ① 가이드 | ② 여백 | ③ 빈 곳 | ④ 겹침 | ⑤ 끊김 |', '|---|---|---|---|---|---|---|---|');
const cell = (a, f) => !a ? '' : a.v === '✗' ? `✗ ${f(a)}` : a.v;
for (const r of badRows) md.push(`| ${r.spec} ${r.W}×${r.H} | ${r.case} (${r.type || r.kind}) | ${r.mode ?? ''}${r.side && r.side !== 'template' ? '/' + r.side : ''} | ${cell(r.axes.guide, a => [...a.detail, ...a.lint.map(x => 'lint ' + x)].join(' / '))} | ${cell(r.axes.gap, a => `${a.bad.join('·')} ${a.why}`)} | ${cell(r.axes.empty, a => a.bad.map(b => b === 'empty-band' ? `빈 띠 ${a.band}%` : `면적 ${Math.round(a.area.area * 100)}% < ${Math.round(a.area.lo * 100)}%`).join(' / '))} | ${cell(r.axes.overlap, a => a.bad.join('·') + (a.pct != null ? ` ${a.pct}%` : '') + (a.fix ? ` (교정 ${a.fix})` : ''))} | ${cell(r.axes.seam, a => a.cats.join('·'))} |`);
md.push('');
md.push('## 축별 ✓/✗/– (케이스 × 규격 전체는 JSON)', '', `- JSON: \`${path.relative(ROOT, OUT_JSON)}\` · 시트: \`${path.relative(ROOT, OUT_SHEET)}\`(✗ 규격, 최대 ${SHEET_MAX}장${BEFORE_CORE ? ', before 에 ✗ 였던 칸은 전|후' : ''})`);
writeFileSync(OUT_MD, md.join('\n') + '\n');

// ── ✗ 시트 ──
if (!NO_SHEET && badRows.length) {
  const prio = r => (r.bad.includes('gap') || r.bad.includes('empty') || r.bad.includes('overlap') ? 0 : r.bad.includes('seam') ? 1 : 2);
  const pick = [...badRows].sort((a, b) => prio(a) - prio(b)).slice(0, SHEET_MAX);
  let beforeMods = null;
  if (BEFORE_CORE && before) {
    const bc = f => import(pathToFileURL(path.join(BEFORE_CORE, f)).href);
    const B = { renderArtifact: (await bc('contract.js')).renderArtifact, registerAll: (await bc('generate.js')).registerAll, applyKvTypeOverride: (await bc('kvtypes.js')).applyKvTypeOverride, normalizeStyle: (await bc('style.js')).normalizeStyle, createContext: (await bc('context.js')).createContext, kvTypeOf: (await bc('kvtypes.js')).kvTypeOf };
    B.registerAll(); beforeMods = B;
  }
  const CELL = 400, cols = beforeMods ? 3 : 4; const cells = []; let i = 0;
  for (const r of pick) {
    const K = byCase[r.case]; const sp = ENTRIES[r.spec]; const k = Math.min(1, CELL / sp.w, CELL / sp.h);
    const wasBad = bKey.has(`${r.case}__${r.spec}`);
    const pair = beforeMods && wasBad;
    const x = (i % cols) * ((pair ? 2 : 1) * (CELL + 12) + 24), y = Math.floor(i / cols) * (CELL + 84);
    const label = `${r.spec} ${sp.w}×${sp.h} · ${r.case} (${r.type || r.kind}) · ${r.mode ?? ''}<br><span style="color:#c00">${esc(r.causes.join(' · ')).slice(0, 220)}</span>`;
    cells.push(`<div style="position:absolute;left:${x}px;top:${y}px;width:${(pair ? 2 : 1) * (CELL + 12)}px;font:12px/1.3 sans-serif;color:#222;overflow:hidden;height:52px">${label}</div>`);
    if (pair) {
      let bh = ''; try { const KB = caseOf(r.case, beforeMods); bh = beforeMods.renderArtifact(r.spec, KB.ctx, KB.style, {}); } catch (e) { bh = `<div style="width:${sp.w}px;height:${sp.h}px;background:#fcc"></div>`; }
      cells.push(`<div style="position:absolute;left:${x}px;top:${y + 56}px;width:${sp.w}px;height:${sp.h}px;transform:scale(${k});transform-origin:0 0;outline:${1 / k}px dashed #f0f">${bh}</div>`);
      cells.push(`<div style="position:absolute;left:${x + CELL + 12}px;top:${y + 56}px;width:${sp.w}px;height:${sp.h}px;transform:scale(${k});transform-origin:0 0;outline:${1 / k}px dashed #0a0">${renderArtifact(r.spec, K.ctx, K.style, {})}</div>`);
    } else cells.push(`<div style="position:absolute;left:${x}px;top:${y + 56}px;width:${sp.w}px;height:${sp.h}px;transform:scale(${k});transform-origin:0 0;outline:${1 / k}px dashed #f0f">${renderArtifact(r.spec, K.ctx, K.style, {})}</div>`);
    i++;
  }
  const rowsN = Math.ceil(pick.length / cols); const totW = cols * ((beforeMods ? 2 : 1) * (CELL + 12) + 24), totH = rowsN * (CELL + 84);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}</style><style>html,body{margin:0;background:#e9e9e9}body{position:relative;width:${totW}px;height:${totH}px}</style></head><body>${cells.join('')}</body></html>`;
  const f = path.join(TMP, 'sheet.html'); writeFileSync(f, doc);
  try { await chromeAsync(['--virtual-time-budget=20000', `--window-size=${totW},${Math.min(totH, 16000)}`, `--screenshot=${OUT_SHEET}`, pathToFileURL(f).href]); } catch (e) { console.warn('시트 실패', e.message.slice(0, 100)); }
}
console.log(`✗ ${badRows.length} / 측정 ${measured.length} · ${AXES.map(([k, n]) => `${n.slice(0, 1)} ${countAxis(measured, k)}`).join(' · ')} · ${Math.round((Date.now() - T0) / 1000)}초 → ${OUT_MD}`);
