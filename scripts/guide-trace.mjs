#!/usr/bin/env node
// 가이드 대조표 — 케이스마다 「가이드는 이렇게 말한다 vs 렌더는 실제로 이렇게 했다」를 규격별 표로 만든다(10-12 사용자: "가이드가 어떻게 되어 있는데 지금 어떻게 들어갔는지, 잘 들어갔는지 비교").
//
//   node scripts/guide-trace.mjs [id …] [--specs a,b,c] [--warned N] [--no-shots] [--out <폴더>] [--reeval] [--keep]
//     --reeval  렌더·측정 없이 저장된 trace·measure 로 판정만 다시(규칙 문장·판정 논리를 고쳤을 때) · --keep 측정 시트(<id>.sheet.html)를 남긴다
//     → ref/learned/cases/_out/trace/<id>.html · <id>.json · img/<id>/<spec>.png · index.html · summary.json
//
//   대표 규격 4(가로형 580×400 · 가로 띠 1005×360 · 세로형 300×600 · 정사각 1080) + 그 케이스의 자동 검수 경고 규격(최대 --warned, 기본 8).
//   실측은 headless Chrome 의 DOM 에서(글자 상자·글자 크기·굵기·자간·로고 상자·마스크 녹임 길이·스크림 불투명) + KV 알파를 캔버스로 읽어 보이는 면적·잘린 변을 센다.
//   기대값은 scripts/guide-rules.mjs(CANON·kvtypes·매체 guide, ref/learned/rules.json 이 있으면 문장 덮어씀). 판정은 숫자에서만(못 재면 –).
//   렌더러의 결정은 ad.js 가 루트 data-trace(JSON)에 적은 것을 그대로 읽는다 — 그림엔 영향 없음.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const OUT0 = path.join(CASES, '_out');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEFAULT_SPECS = ['google-gdn-580x400', 'remember-main-top-mo', 'google-gdn-300x600', 'instagram-feed-1080'];
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const OUT = path.resolve(opt('--out') ?? path.join(OUT0, 'trace'));
mkdirSync(path.join(OUT, 'img'), { recursive: true });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js'); const { shapeOf } = await core('layouts.js');
const { guideFor } = await core('canon.js'); const { kvTypeOf, applyKvTypeOverride, kvTypeSummary } = await core('kvtypes.js');
const { contrast } = await core('palette.js');
const { RULES, applyRulesJson, evaluate, summarize } = await import(pathToFileURL(path.join(ROOT, 'scripts/guide-rules.mjs')).href);
registerAll();
const ENTRIES = adSpecEntries();
const RULES_JSON = path.join(ROOT, 'ref/learned/rules.json');
let rulesJson = null; if (existsSync(RULES_JSON)) { try { rulesJson = JSON.parse(readFileSync(RULES_JSON, 'utf8')); } catch (e) { console.warn('rules.json 읽기 실패 — CANON 값으로', e.message); } }
const RULESET = applyRulesJson(RULES, rulesJson);

const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const ids = positional.length ? positional : L.cases.map(c => c.id);
const maxWarned = Number(opt('--warned', 8));

// 케이스 스타일 — scripts/cases.mjs styleInput 과 같은 입력(로고 톤·단색 사본·유형 지정)
function styleOf(c, dir, meta) {
  const logo = c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null;
  const tone = c.logoMeta?.tone ?? 'dark';
  return normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: (c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono))) ? pathToFileURL(path.join(dir, c.logoMono)).href : null, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null });
}
function specsFor(c) {
  const want = (opt('--specs') ?? DEFAULT_SPECS.join(',')).split(',').filter(Boolean);
  const chk = path.join(OUT0, `${c.id}.checks.json`);
  if (existsSync(chk) && !opt('--specs')) {
    const ch = JSON.parse(readFileSync(chk, 'utf8'));
    const warned = Object.entries(ch).filter(([, r]) => r?.warnings?.some(w => w.level !== 'info')).map(([s]) => s).filter(s => !want.includes(s)).slice(0, maxWarned);
    want.push(...warned);
  }
  return want.filter(s => ENTRIES[s]);
}

// ── 브라우저 측정 스크립트(케이스 시트 안에서 돈다) — 실측은 core/guidemeasure.js(앱 「가이드 검수」와 같은 코드), 판정은 core/guidecheck.js ──
const MEASURE = (kvUrl, kvMeta, specs) => `
import { kvGrid, measureGuideDoc } from '${pathToFileURL(path.join(ROOT, 'core/guidemeasure.js')).href}';
const __fail = e => { const p = document.createElement('pre'); p.id = 'm'; p.textContent = JSON.stringify({ error: String(e?.stack ?? e) }); document.body.appendChild(p); };
addEventListener('error', e => __fail(e.error ?? e.message)); addEventListener('unhandledrejection', e => __fail(e.reason));
try {
const kvMeta = ${JSON.stringify(kvMeta)};
const settle = async f => { const d = f.contentDocument; if (!d) return; if (d.readyState !== 'complete') await new Promise(r => f.addEventListener('load', r, { once: true })); await d.fonts?.ready;
  const urls = [...d.querySelectorAll('*')].map(e => getComputedStyle(e).backgroundImage).flatMap(b => [...b.matchAll(/url\\("?([^")]+)"?\\)/g)].map(m => m[1]));
  await Promise.all([...new Set(urls)].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))); await Promise.all([...d.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))); };
// KV 알파·색 격자(최대 240px 폭) — 보이는 면적·잘린 변·글자 아래 표본색
document.documentElement.dataset.stage = 'grid';
const G = await kvGrid(${JSON.stringify(kvUrl)});
document.documentElement.dataset.stage = 'settle';
const out = { grid: G?.err ? { err: G.err } : G ? { gw: G.gw, gh: G.gh, nw: G.nw, nh: G.nh } : null, specs: {}, cells: {} };
await Promise.race([Promise.all([...document.querySelectorAll('iframe[data-spec]')].map(settle)), new Promise(r => setTimeout(r, 25000))]);
await new Promise(r => setTimeout(r, 300));
document.documentElement.dataset.stage = 'measure';
for (const f of document.querySelectorAll('iframe[data-spec]')) {
  document.documentElement.dataset.stage = 'measure:' + f.dataset.spec;
  const sid = f.dataset.spec; const cell = f.closest('.cell'); const cb = cell.getBoundingClientRect(); out.cells[sid] = [Math.round(cb.left + scrollX), Math.round(cb.top + scrollY), Math.round(cb.width), Math.round(cb.height)];
  out.specs[sid] = measureGuideDoc(f.contentDocument, { kvMeta, G });
}
const p = document.createElement('pre'); p.id = 'm'; p.style.display = 'none'; p.textContent = JSON.stringify(out); document.body.appendChild(p); document.documentElement.dataset.done = '1';
} catch (e) { __fail(e); }`;

const chrome = (args, pipe = false) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { maxBuffer: 256 << 20, stdio: ['ignore', pipe ? 'pipe' : 'ignore', 'ignore'] });

// ── 케이스 한 건 ──
function runCase(c) {
  const dir = path.join(CASES, c.id);
  const meta0 = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const meta = applyKvTypeOverride(meta0, c.typeOverride ?? null);
  const style = styleOf(c, dir, meta);
  const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
  const specs = specsFor(c);
  const kt = kvTypeOf(meta);
  const cells = [], htmls = {};
  for (const sid of specs) {
    const sp = ENTRIES[sid]; let html;
    try { html = renderArtifact(sid, ctx, style, {}); } catch (e) { html = `<div data-ad="1" style="width:${sp.w}px;height:${sp.h}px;color:red;padding:8px">${esc(e.message)}</div>`; }
    htmls[sid] = html;
    const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`;
    cells.push(`<div class="cell" data-spec="${sid}" style="width:${sp.w}px;height:${sp.h}px"><iframe data-spec="${sid}" style="width:${sp.w}px;height:${sp.h}px;border:0;display:block" srcdoc="${esc(doc)}"></iframe></div>`);
  }
  const maxW = Math.max(...specs.map(s => ENTRIES[s].w)), totH = specs.reduce((a, s) => a + ENTRIES[s].h + 12, 12);
  const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>body{margin:0;padding:12px 0 0 12px;background:#888;width:${maxW + 24}px}.cell{margin:0 0 12px;outline:0;background:#fff;position:relative}</style></head><body>${cells.join('')}<script type="module">${MEASURE(style.keyVisual, meta, specs)}</script></body></html>`;
  const sheet = path.join(OUT, `${c.id}.sheet.html`); writeFileSync(sheet, page);
  let dom = '', mm = null;
  // 폰트·그림 로드가 가상 시간 예산 안에 안 끝나면 측정 pre#m 이 없다 — 세 번까지 다시 연다
  for (let tryN = 0; tryN < 3 && !mm; tryN++) {
    try { dom = chrome([`--virtual-time-budget=${30000 + tryN * 15000}`, `--window-size=${maxW + 24},${Math.max(400, totH)}`, '--dump-dom', pathToFileURL(sheet).href], true).toString(); } catch (e) { console.warn(c.id, 'chrome 실패', e.message.slice(0, 120)); }
    mm = dom.match(/<pre id="m"[^>]*>([\s\S]*?)<\/pre>/);
    if (!mm && tryN < 2) console.warn(c.id, `측정 결과 없음 — 다시(${tryN + 2}/3)`);
  }
  let M = { specs: {}, cells: {} }; try { M = mm ? JSON.parse(unesc(mm[1])) : M; } catch (e) { console.warn(c.id, '측정 JSON 파싱 실패'); }
  if (M.error) { console.warn(c.id, '측정 스크립트 오류:', String(M.error).slice(0, 300)); M = { specs: {}, cells: {}, error: M.error }; }
  if (!mm) console.warn(c.id, '측정 결과 없음(pre#m 없음) — 로드 대기 초과');
  // 스크린샷 → 규격별 크롭(PIL) — 표 옆에 두는 그림
  const imgDir = path.join(OUT, 'img', c.id); mkdirSync(imgDir, { recursive: true });
  if (!flag('--no-shots')) {
    const shot = path.join(imgDir, '_sheet.png');
    try { chrome(['--virtual-time-budget=15000', `--window-size=${maxW + 24},${Math.max(400, totH)}`, `--screenshot=${shot}`, pathToFileURL(sheet).href]); } catch (e) { console.warn(c.id, '스크린샷 실패', e.message.slice(0, 80)); }
    if (existsSync(shot)) {
      const crops = specs.map(s => [s, M.cells?.[s] ?? null]).filter(([, b]) => b);
      try { execFileSync('python3', ['-I', '-c', `import sys, json
from PIL import Image
im = Image.open(sys.argv[1]); out = sys.argv[2]; crops = json.loads(sys.argv[3]); maxw = int(sys.argv[4])
for sid, (x, y, w, h) in crops:
    c = im.crop((x, y, x + w, y + h))
    if c.width > maxw: c = c.resize((maxw, max(1, round(c.height * maxw / c.width))), Image.LANCZOS)
    c.save(f'{out}/{sid}.png')`, shot, imgDir, JSON.stringify(crops), '720']); } catch (e) { console.warn(c.id, '크롭 실패', e.message.slice(0, 120)); }
    }
    try { execFileSync('rm', ['-f', shot]); } catch {}
  }
  // 규칙 대조
  const result = { id: c.id, summary: kvTypeSummary(meta), note: c.note, type: kt ? { id: kt.id, sub: kt.sub?.id ?? null, subs: kt.subs.map(s => s.id), flags: Object.keys(kt.flags).filter(k => kt.flags[k] === true), override: kt.override } : null, primary: style.palette?.primary ?? null, at: new Date().toISOString(), grid: M.grid ?? null, specs: {} };
  for (const sid of specs) {
    const sp = ENTRIES[sid], m = M.specs?.[sid] ?? null;
    if (!m || m.error) { result.specs[sid] = { w: sp.w, h: sp.h, shape: shapeOf(sp.w, sp.h), error: m?.error ?? '측정 없음', rows: [], sum: { checked: 0, pass: 0, fail: 0, na: 0 } }; continue; }
    const mr = sp.mediumRules ?? {}; const guide = guideFor(mr);
    const C = { spec: { id: sid, w: sp.w, h: sp.h, shape: shapeOf(sp.w, sp.h), medium: sp.medium }, guide, mr, rules: sp.rules ?? {}, trace: m.trace, m, meta, kt, logoMeta: c.logoMeta ?? null, primary: style.palette?.primary ?? null, kind: 'recruit', hasDate: !!(c.fields ?? DEFAULT_FIELDS).deadline };
    const rows = evaluate(C, RULESET);
    result.specs[sid] = { w: sp.w, h: sp.h, shape: C.spec.shape, title: sp.title, rows, sum: summarize(rows), trace: m.trace, measure: { kvArea: m.kvArea, kvVis: m.kvVis, objects: m.objects, texts: m.texts, logo: m.logo, textCol: m.textCol, scrim: m.scrim, chips: m.chips, check: m.check }, ad: m.ad, img: existsSync(path.join(imgDir, `${sid}.png`)) ? `img/${c.id}/${sid}.png` : null };
  }
  writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify(result, null, 1));
  writeFileSync(path.join(OUT, `${c.id}.html`), caseHtml(result));
  if (!flag('--keep')) { try { execFileSync('rm', ['-f', sheet]); } catch {} }
  const tot = Object.values(result.specs).reduce((a, s) => ({ checked: a.checked + s.sum.checked, pass: a.pass + s.sum.pass, fail: a.fail + s.sum.fail }), { checked: 0, pass: 0, fail: 0 });
  console.log(`${c.id.padEnd(16)} ${specs.length}규격  규칙 ${tot.checked} · ✓ ${tot.pass} · ✗ ${tot.fail}${tot.fail ? '  — ' + Object.entries(result.specs).flatMap(([s, r]) => r.rows.filter(x => x.ok === false).map(x => `${s}:${x.id}`)).slice(0, 6).join(', ') : ''}`);
  return result;
}

// ── HTML ──
const CSS = `:root{--bg:#f6f6f4;--fg:#1a1a1a;--mut:#666;--card:#fff;--line:#e2e2de;--ok:#1f7a4d;--bad:#b3261e;--na:#8a8a86;--okbg:#e6f4ec;--badbg:#fbe9e7;--focus:#2b59c3}
@media (prefers-color-scheme:dark){:root{--bg:#151515;--fg:#eee;--mut:#a0a0a0;--card:#1f1f1f;--line:#333;--ok:#5bc48c;--bad:#ff8a80;--na:#888;--okbg:#17301f;--badbg:#3a1d1a;--focus:#8fb0ff}}
body{margin:0;padding:20px 16px 48px;background:var(--bg);color:var(--fg);font:13px/1.5 Pretendard,-apple-system,system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}h1 small{font-weight:400;font-size:13px;color:var(--mut)}h2{font-size:16px;margin:28px 0 8px}h3{font-size:14px;margin:0 0 6px}p{color:var(--mut);margin:0 0 10px}a{color:inherit}
nav{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 12px}
.spec{display:grid;grid-template-columns:minmax(220px,380px) 1fr;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:0 0 16px}
@media(max-width:760px){.spec{grid-template-columns:1fr}}
.spec img{width:100%;height:auto;display:block;border-radius:6px;border:1px solid var(--line);background:#fff}
.meta{font-size:12px;color:var(--mut);margin-top:8px;overflow-wrap:anywhere}.meta b{color:var(--fg);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{text-align:left;vertical-align:top;padding:5px 8px;border-bottom:1px solid var(--line)}th{font-weight:600;color:var(--mut);white-space:nowrap}
td.v{white-space:nowrap;font-weight:700;text-align:center;width:28px}tr.ok td.v{color:var(--ok)}tr.bad td.v{color:var(--bad)}tr.bad{background:var(--badbg)}tr.na td{color:var(--na)}
td.n{min-width:120px}td.n small{display:block;color:var(--mut);font-weight:400}td.e,td.a{overflow-wrap:anywhere;min-width:120px}
.grp td{background:var(--bg);color:var(--mut);font-weight:600;padding:8px 8px 4px;font-size:12px}
.sum{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 10px;font-size:12px}.sum span{padding:2px 8px;border-radius:999px;background:var(--bg);border:1px solid var(--line)}.sum .ok{color:var(--ok)}.sum .bad{color:var(--bad)}
.rules{font-size:11.5px;color:var(--mut);overflow-wrap:anywhere}.rules code{font-size:11px}
details{margin-top:8px}summary{cursor:pointer;color:var(--mut);font-size:12px}pre{font-size:11px;overflow:auto;max-height:360px;background:var(--bg);padding:8px;border-radius:6px}
.idx{width:100%;border-collapse:collapse;font-size:12.5px}.idx td,.idx th{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}.idx .s{color:var(--mut);font-size:12px}.idx b.bad{color:var(--bad)}.idx b.ok{color:var(--ok)}
ul.fail{columns:2;column-gap:24px;padding-left:18px}@media(max-width:760px){ul.fail{columns:1}}ul.fail li{break-inside:avoid;margin:0 0 4px}ul.fail code{font-size:11.5px}
.bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden;min-width:60px}.bar i{display:block;height:100%;background:var(--ok)}`;
const vclass = r => r.ok === true ? 'ok' : r.ok === false ? 'bad' : 'na';
function rowsHtml(rows) {
  let g = null, out = '';
  for (const r of rows) { if (r.group !== g) { g = r.group; out += `<tr class="grp"><td colspan="4">${esc(g)}</td></tr>`; }
    out += `<tr class="${vclass(r)}"><td class="v" title="${r.ok === null ? '측정 불가 / 해당 없음' : ''}">${r.verdict}</td><td class="n">${esc(r.name)}<small title="${esc(r.text)}">${esc(r.text)}${r.fromRulesJson ? ' · rules.json' : ''}</small></td><td class="e">${esc(r.expect)}</td><td class="a">${esc(r.actual)}${r.note ? `<br><small style="color:var(--mut)">${esc(r.note)}</small>` : ''}</td></tr>`; }
  return out;
}
function caseHtml(res) {
  const specs = Object.entries(res.specs);
  const tot = specs.reduce((a, [, s]) => ({ checked: a.checked + s.sum.checked, pass: a.pass + s.sum.pass, fail: a.fail + s.sum.fail }), { checked: 0, pass: 0, fail: 0 });
  const secs = specs.map(([sid, s]) => {
    const T = s.trace ?? {}; const P = T.place ?? {}; const F = T.field ?? {};
    const meta = s.error ? `<div class="meta">측정 실패: ${esc(s.error)}</div>` : `<div class="meta"><b>${esc(T.kv?.type ?? '—')}${T.kv?.sub ? ' / ' + esc(T.kv.sub) : ''}</b>${T.kv?.override ? ' · 직접 지정' : ''} · 배치 <b>${esc(P.mode ?? '—')}</b>(${esc(P.objectSide ?? '—')}) · 지면 <b>${esc(F.source ?? '—')}</b> ${esc((F.stops ?? []).join('→'))} 글자 ${esc(F.text ?? '—')} 대비 ${F.contrast ?? '—'}${T.scrim ? ` · 스크림 ${esc(T.scrim.kind)}` : ''} · 로고 ${esc(T.logo?.place ?? '—')}/${esc(T.logo?.tone ?? '—')} · 메인 ${T.fonts?.main?.px ?? '—'}px/${T.fonts?.main?.weight ?? '—'}${T.fonts?.main?.tracking ? ' 자간 ' + T.fonts.main.tracking + 'em' : ''}${s.measure?.kvArea != null ? ` · KV 보이는 면적 <b>${Math.round(s.measure.kvArea * 100)}%</b>` : ''}<br><span class="rules">걸린 규칙: <code>${esc((T.rules ?? []).join(' · ') || '—')}</code></span></div>`;
    return `<section class="spec" id="${esc(sid)}"><div>${s.img ? `<img src="${esc(s.img)}" alt="${esc(sid)} 렌더" loading="lazy">` : '<div class="meta">그림 없음(--no-shots)</div>'}<h3 style="margin-top:8px">${esc(sid)} <small style="color:var(--mut);font-weight:400">${s.w}×${s.h} · ${esc(s.shape)}</small></h3>${meta}</div>
<div><div class="sum"><span>규칙 ${s.sum.checked}</span><span class="ok">✓ ${s.sum.pass}</span><span class="bad">✗ ${s.sum.fail}</span><span>– ${s.sum.na}</span></div><table><thead><tr><th></th><th>규칙 · 가이드</th><th>가이드 값</th><th>실제</th></tr></thead><tbody>${rowsHtml(s.rows)}</tbody></table>
<details><summary>렌더 추적(data-trace)·실측 JSON</summary><pre>${esc(JSON.stringify({ trace: s.trace, measure: s.measure }, null, 1))}</pre></details></div></section>`;
  }).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>가이드 대조표 — ${esc(res.id)}</title><link rel="stylesheet" href="${FONT}"><style>${CSS}</style></head><body>
<nav><a href="index.html">← 대조표 목록</a><a href="../index.html">케이스 장부</a><a href="../gallery.html">갤러리</a><a href="../${esc(res.id)}.html">74규격 시트</a></nav>
<h1>${esc(res.id)} <small>${esc(res.summary)}${res.note ? ' · ' + esc(res.note) : ''}</small></h1>
<div class="sum"><span>규격 ${specs.length}</span><span>규칙 ${tot.checked}</span><span class="ok">✓ ${tot.pass}</span><span class="bad">✗ ${tot.fail}</span><span class="s">${esc(res.at.slice(0, 16).replace('T', ' '))} UTC</span></div>
<p>왼쪽은 실제 렌더(1x 스크린샷 축소), 오른쪽은 규칙마다 「가이드 값 → 실제」. ✓ 숫자가 맞음 · ✗ 어긋남(렌더러 틈 또는 가이드 문장이 코드보다 느슨함) · – 해당 없음·측정 불가(사람이 봐야 함). 규칙 출처는 이름 위에 마우스를 올리면 보인다.</p>
<nav>${specs.map(([sid, s]) => `<a href="#${esc(sid)}">${esc(sid)}${s.sum.fail ? ` <b style="color:var(--bad)">✗${s.sum.fail}</b>` : ''}</a>`).join('')}</nav>
${secs}</body></html>`;
}
function indexHtml(results) {
  const rowsIdx = results.map(r => { const specs = Object.entries(r.specs); const tot = specs.reduce((a, [, s]) => ({ checked: a.checked + s.sum.checked, pass: a.pass + s.sum.pass, fail: a.fail + s.sum.fail }), { checked: 0, pass: 0, fail: 0 }); const fails = specs.flatMap(([sid, s]) => s.rows.filter(x => x.ok === false).map(x => `${x.id}@${sid.replace(/^google-gdn-|^remember-|^instagram-/, '')}`));
    return `<tr><td><a href="${esc(r.id)}.html"><b>${esc(r.id)}</b></a><br><span class="s">${esc(r.summary)}</span></td><td>${specs.length}</td><td>${tot.checked}<div class="bar"><i style="width:${tot.checked ? Math.round(tot.pass / tot.checked * 100) : 0}%"></i></div></td><td><b class="ok">${tot.pass}</b></td><td><b class="${tot.fail ? 'bad' : ''}">${tot.fail}</b></td><td class="s">${esc(fails.slice(0, 10).join(' · '))}${fails.length > 10 ? ` 외 ${fails.length - 10}` : ''}</td></tr>`; }).join('');
  const byRule = new Map();
  for (const r of results) for (const [sid, s] of Object.entries(r.specs)) for (const x of s.rows) if (x.ok === false) { if (!byRule.has(x.id)) byRule.set(x.id, { name: x.name, text: x.text, hits: [] }); byRule.get(x.id).hits.push({ id: r.id, sid, actual: x.actual, expect: x.expect }); }
  const ruleList = [...byRule.entries()].sort((a, b) => b[1].hits.length - a[1].hits.length).map(([id, v]) => `<h3 id="r-${esc(id)}"><code>${esc(id)}</code> ${esc(v.name)} <small style="color:var(--mut);font-weight:400">✗ ${v.hits.length}</small></h3><p>${esc(v.text)}</p><ul class="fail">${v.hits.map(h => `<li><a href="${esc(h.id)}.html#${esc(h.sid)}">${esc(h.id)}</a> <code>${esc(h.sid)}</code> — ${esc(h.expect)} → ${esc(h.actual)}</li>`).join('')}</ul>`).join('');
  const all = results.reduce((a, r) => { for (const s of Object.values(r.specs)) { a.checked += s.sum.checked; a.pass += s.sum.pass; a.fail += s.sum.fail; a.na += s.sum.na; a.specs++; } return a; }, { checked: 0, pass: 0, fail: 0, na: 0, specs: 0 });
  const human = RULESET.length ? '' : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>가이드 대조표</title><link rel="stylesheet" href="${FONT}"><style>${CSS}</style></head><body>
<nav><a href="../index.html">케이스 장부</a><a href="../gallery.html">갤러리</a><a href="#rules">✗ 규칙별 모음</a><a href="#human">사람이 봐야 하는 규칙</a></nav>
<h1>가이드 대조표 <small>케이스 ${results.length} · 규격 ${all.specs} · 규칙 ${all.checked} · ✓ ${all.pass} · ✗ ${all.fail} · – ${all.na} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC${rulesJson ? ' · rules.json 적용' : ' · CANON·kvtypes·매체 guide 값'}</small></h1>
<p>케이스마다 대표 규격(가로형·가로 띠·세로형·정사각) + 경고 난 규격을 렌더해, 규칙마다 가이드 값과 DOM 실측을 견준다. ✗ 는 「가이드는 X 라는데 렌더는 Y」— 렌더러 틈이거나 가이드 문장이 코드보다 느슨한 것. 만드는 법: <code>node scripts/guide-trace.mjs [id …]</code> 또는 <code>node scripts/cases.mjs run --trace</code>.</p>
<table class="idx"><thead><tr><th>케이스</th><th>규격</th><th>규칙</th><th>✓</th><th>✗</th><th>✗ 항목(규칙@규격)</th></tr></thead><tbody>${rowsIdx}</tbody></table>
<h2 id="rules">✗ 규칙별 모음 <small style="color:var(--mut);font-weight:400">많은 순</small></h2>${ruleList || '<p>✗ 없음</p>'}
<h2 id="human">사람이 봐야 하는 규칙(측정 불가)</h2><ul>${(results[0] ? Object.values(results[0].specs)[0]?.rows ?? [] : []).filter(r => r.id.startsWith('human.')).map(r => `<li><b>${esc(r.name)}</b> — ${esc(r.text)}</li>`).join('')}</ul>
<p>판정 시트(<a href="../verdict.html">verdict.html</a>)로 사람 판정을 모은다.</p></body></html>`;
}

// 다시 판정만(--reeval): 렌더·측정은 그대로 두고 저장된 <id>.json 의 trace·measure 로 규칙 대조만 다시 — 규칙 문장·판정 논리를 고쳤을 때
function reevalCase(c) {
  const p = path.join(OUT, `${c.id}.json`); if (!existsSync(p)) return null;
  const res = JSON.parse(readFileSync(p, 'utf8'));
  const dir = path.join(CASES, c.id); const meta = applyKvTypeOverride(JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), c.typeOverride ?? null); const kt = kvTypeOf(meta);
  for (const [sid, s] of Object.entries(res.specs)) {
    const sp = ENTRIES[sid]; if (!sp || s.error || !s.measure) continue;
    const mr = sp.mediumRules ?? {}; const guide = guideFor(mr); const m = { ...s.measure, ad: s.ad, trace: s.trace };
    const C = { spec: { id: sid, w: sp.w, h: sp.h, shape: shapeOf(sp.w, sp.h), medium: sp.medium }, guide, mr, rules: sp.rules ?? {}, trace: s.trace, m, meta, kt, logoMeta: c.logoMeta ?? null, primary: res.primary, kind: 'recruit', hasDate: !!(c.fields ?? DEFAULT_FIELDS).deadline };
    s.rows = evaluate(C, RULESET); s.sum = summarize(s.rows);
  }
  res.reevalAt = new Date().toISOString();
  writeFileSync(p, JSON.stringify(res, null, 1)); writeFileSync(path.join(OUT, `${c.id}.html`), caseHtml(res));
  const tot = Object.values(res.specs).reduce((a, s) => ({ checked: a.checked + s.sum.checked, pass: a.pass + s.sum.pass, fail: a.fail + s.sum.fail }), { checked: 0, pass: 0, fail: 0 });
  console.log(`${c.id.padEnd(16)} (재판정) 규칙 ${tot.checked} · ✓ ${tot.pass} · ✗ ${tot.fail}`);
  return res;
}
// ── 실행 ──
const results = [];
for (const id of ids) { const c = L.cases.find(x => x.id === id); if (!c) { console.warn('없는 케이스', id); continue; } try { const r = flag('--reeval') ? reevalCase(c) : runCase(c); if (r) results.push(r); } catch (e) { console.warn(id, '실패', e.message); } }
// 색인은 trace 폴더에 있는 모든 케이스 JSON 으로(이번에 안 돌린 케이스도 유지)
const allRes = L.cases.map(c => { const p = path.join(OUT, `${c.id}.json`); if (!existsSync(p)) return null; try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }).filter(Boolean);
writeFileSync(path.join(OUT, 'index.html'), indexHtml(allRes));
const summary = { at: new Date().toISOString(), rulesJson: !!rulesJson, cases: Object.fromEntries(allRes.map(r => [r.id, Object.fromEntries(Object.entries(r.specs).map(([sid, s]) => [sid, { ...s.sum, fail: s.rows.filter(x => x.ok === false).map(x => x.id) }]))])) };
writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
const all = allRes.reduce((a, r) => { for (const s of Object.values(r.specs)) { a.checked += s.sum.checked; a.pass += s.sum.pass; a.fail += s.sum.fail; } return a; }, { checked: 0, pass: 0, fail: 0 });
console.log(`대조표 → ${path.join(OUT, 'index.html')}  케이스 ${allRes.length} · 규칙 ${all.checked} · ✓ ${all.pass} · ✗ ${all.fail}`);
