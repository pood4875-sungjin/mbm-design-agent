#!/usr/bin/env node
// 매체 규정 전수 검사 — 케이스 장부(전 케이스 × 전 광고 규격)를 다시 그려 앱과 같은 식으로 재고(app/measure.js measureDom),
// 매체 규칙 검사기(core/lint.js lintArtifact) + 보조 규칙(scripts/lib/lint-extra.mjs)을 돌린다.
// cases.mjs run 은 디자인 검수(core/adcheck.js)만 돈다 — 치수·글자수·줄 수·안전영역·글자 크기·로고 규정은 여기서 본다.
//
//   node scripts/cases-lint.mjs [id …] [--spec <규격id>] [--keep]
//     → ref/learned/cases/_out/lint/summary.json · lint-report.md · <id>.lint.json(측정값 + 판정)
//
// 재지 못하는 것(검사 안 함, 위반 아님): 제출 파일 용량(bytes)·포맷 — 래스터는 앱에서만 한다. 투명 여부는 렌더러 선언값(data-transparent).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { extraChecks, coverageOf, MEASURE_JS } from './lib/lint-extra.mjs';
import { limitsByRole, inImage, countChars } from '../core/adfields.js';
import { decodeDump } from './lib/lint-extra.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const OUT = path.join(CASES, '_out/lint');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(OUT, { recursive: true });

const core = async f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { applyKvTypeOverride } = await core('kvtypes.js');
const { logoMeta } = await core('logo.js');
const { renderArtifact } = await core('contract.js');
const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js');
const { normalizeStyle } = await core('style.js');
const { adSpecGroups } = await core('adspecs.js');
const { lintArtifact } = await core('lint.js');
registerAll();

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };

// cases.mjs 와 같은 입력(로고 톤·유형 지정) — 렌더가 장부와 같아야 같은 소재를 검사한다
function rgbaOf(file) { const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), file, '0'], { maxBuffer: 256 * 1024 * 1024 }).toString()); return { ...j, rgba: new Uint8ClampedArray(Buffer.from(j.rgba, 'base64')) }; }
function styleInput(c, dir, meta) {
  const logo = c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null;
  if (c.logo && !c.logoMeta) { const j = rgbaOf(path.join(dir, c.logo)); c.logoMeta = logoMeta(j.rgba, j.w, j.h); }
  const tone = c.logoMeta?.tone ?? 'dark';
  const mono = c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono)) ? pathToFileURL(path.join(dir, c.logoMono)).href : null;
  return { colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: mono, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null };
}

const ledger = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const ids = positional.length ? positional : ledger.cases.map(c => c.id);
const groups = adSpecGroups().filter(g => !opt('--spec') || g.id === opt('--spec'));
const entries = Object.fromEntries(groups.map(g => [g.id, g.entry]));
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const doc = inner => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:transparent;overflow:hidden}</style></head><body>${inner}</body></html>`;

// 역할별 측정 vs 한도 표 — 보고서의 「측정값 vs 한도」에 쓴다(위반이 아니어도 남긴다)
function roleTable(entry, measure) {
  const rules = entry.rules, by = limitsByRole((rules.textLimits ?? []).filter(inImage)), counting = entry.mediumRules?.textCounting ?? 'all-1';
  return (measure.texts ?? []).map(t => {
    const slot = by[t.role];
    return { role: t.role, text: t.text, chars: t.text != null ? countChars(t.text, counting) : null, maxChars: slot?.maxChars ?? null, lines: t.lines, maxLines: slot?.lines ?? null, fontPx: t.fontPx, fontRange: rules.textHeightPx ? [rules.textHeightPx.min ?? null, rules.textHeightPx.max ?? null] : null, bbox: t.bbox && Object.fromEntries(Object.entries(t.bbox).map(([k, v]) => [k, Math.round(v)])) };
  });
}

const all = {};   // id → { [spec]: { level, issues, roles, measure } }
for (const id of ids) {
  const c = ledger.cases.find(x => x.id === id); if (!c) { console.warn('없는 케이스', id); continue; }
  const dir = path.join(CASES, id);
  const meta = applyKvTypeOverride(JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), c.typeOverride ?? null);
  const style = normalizeStyle(styleInput(c, dir, meta));
  const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
  const cells = groups.map(g => {
    const e = g.entry; let html, err = null;
    try { html = renderArtifact(g.id, ctx, style, {}); } catch (x) { html = ''; err = x.message; }
    return `<iframe data-spec="${g.id}"${err ? ` data-error="${esc(err)}"` : ''} style="width:${e.w}px;height:${e.h}px;border:0;display:block" srcdoc="${esc(doc(html))}"></iframe>`;
  });
  const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body>${cells.join('')}<pre id="measures"></pre>
<script type="module">
${MEASURE_JS}
const settle = async f => {
  const d = f.contentDocument; if (!d) return;
  if (d.readyState !== 'complete') await new Promise(r => f.addEventListener('load', r, { once: true }));
  await d.fonts?.ready;
  await Promise.all([...d.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
  const urls = [...d.querySelectorAll('*')].map(e => getComputedStyle(e).backgroundImage).flatMap(b => [...b.matchAll(/url\\("?([^")]+)"?\\)/g)].map(m => m[1]));
  await Promise.all([...new Set(urls)].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
};
await Promise.race([Promise.all([...document.querySelectorAll('iframe[data-spec]')].map(settle)), new Promise(r => setTimeout(r, 20000))]);
await new Promise(r => setTimeout(r, 300));
const out = {};
for (const f of document.querySelectorAll('iframe[data-spec]')) {
  if (f.dataset.error) { out[f.dataset.spec] = { error: f.dataset.error }; continue; }
  try { out[f.dataset.spec] = measureDoc(f.contentDocument); } catch (e) { out[f.dataset.spec] = { error: String(e) }; }
}
document.getElementById('measures').textContent = JSON.stringify(out);
document.documentElement.dataset.done = '1';
</script></body></html>`;
  const sheetPath = path.join(OUT, `${id}.sheet.html`); writeFileSync(sheetPath, sheet);
  let dom = '';
  try { dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=30000', '--window-size=2400,1200', '--dump-dom', pathToFileURL(sheetPath).href], { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
  catch (e) { console.warn(id, 'chrome 실패', e.message.slice(0, 120)); }
  const m = dom.match(/<pre id="measures">([\s\S]*?)<\/pre>/);
  let measures = {};
  try { measures = m ? JSON.parse(decodeDump(m[1])) : {}; } catch { console.warn(id, 'measures 파싱 실패'); }
  const res = {};
  for (const [sid, e] of Object.entries(entries)) {
    const mm = measures[sid];
    if (!mm || mm.error) { res[sid] = { level: 'error', issues: [{ level: 'error', code: 'render', msg: mm?.error ?? '측정 없음' }], roles: [] }; continue; }
    const measure = { w: mm.w * (e.exportScale ?? 1), h: mm.h * (e.exportScale ?? 1), bytes: null, format: null, transparent: mm.transparent, fontFamily: mm.fontFamily, texts: mm.texts, logo: mm.logo, objects: mm.objects, logoCount: mm.logoCount, bgColors: mm.bgColors ?? null, cutout: (meta.field?.opaque ?? 1) < 0.5 };
    const L = lintArtifact({ spec: e.rules, medium: e.mediumRules, measure });
    const X = extraChecks(e, measure).filter(x => !L.issues.some(i => i.code === x.code));   // logo-forbidden 은 core/lint.js 가 개수로 먼저 잡는다 — 같은 코드 이중 집계 방지
    const issues = [...L.issues, ...X];
    const level = issues.some(i => i.level === 'block') ? 'block' : issues.some(i => i.level === 'warn') ? 'warn' : 'pass';
    res[sid] = { level, issues, roles: roleTable(e, measure), logo: mm.logo?.bbox ?? null, logoCount: mm.logoCount, objects: mm.objects, kvUse: mm.kvUse };
  }
  all[id] = res;
  writeFileSync(path.join(OUT, `${id}.lint.json`), JSON.stringify({ id, summary: c.summary, specs: res }, null, 1));
  const bad = Object.values(res).filter(r => r.level !== 'pass');
  const byCode = bad.flatMap(r => r.issues.map(i => `${i.code}(${i.level[0]})`)).reduce((a, k) => (a[k] = (a[k] ?? 0) + 1, a), {});
  console.log(`${id.padEnd(16)} 차단/경고 ${bad.length}/${groups.length}  ${JSON.stringify(byCode)}`);
  if (!argv.includes('--keep')) { try { execFileSync('rm', [sheetPath]); } catch {} }
}

// ── 집계
const specIds = Object.keys(entries);
const byCode = {}, bySpec = {}, offenders = [];
for (const [id, res] of Object.entries(all)) for (const [sid, r] of Object.entries(res)) {
  for (const i of r.issues) {
    const k = i.code; byCode[k] ??= { block: 0, warn: 0, error: 0, specs: {}, cases: new Set() }; byCode[k][i.level]++; byCode[k].specs[sid] = (byCode[k].specs[sid] ?? 0) + 1; byCode[k].cases.add(id);
    bySpec[sid] ??= { block: 0, warn: 0, error: 0, codes: {} }; bySpec[sid][i.level]++; bySpec[sid].codes[k] = (bySpec[sid].codes[k] ?? 0) + 1;
    offenders.push({ id, spec: sid, level: i.level, code: i.code, role: i.role ?? null, msg: i.msg });
  }
}
for (const v of Object.values(byCode)) v.cases = [...v.cases];
const coverage = Object.fromEntries(specIds.map(s => [s, coverageOf(entries[s])]));
const passCells = Object.values(all).reduce((n, res) => n + Object.values(res).filter(r => r.level === 'pass').length, 0);
const totalCells = Object.keys(all).length * specIds.length;
const summary = { at: new Date().toISOString(), cases: Object.keys(all).length, specs: specIds.length, cells: totalCells, pass: passCells, byCode, bySpec, coverage, offenders };
writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));

// ── 보고서
const gap = (key, label) => { const miss = specIds.filter(s => !coverage[s][key] || (Array.isArray(coverage[s][key]) && !coverage[s][key].length)); return `- **${label}** 규정 없음 ${miss.length}/${specIds.length}: ${miss.join(', ') || '없음'}`; };
const lvOrder = { block: 0, error: 1, warn: 2 };
const top = [...offenders].sort((a, b) => lvOrder[a.level] - lvOrder[b.level] || a.code.localeCompare(b.code) || a.spec.localeCompare(b.spec) || a.id.localeCompare(b.id));
const md = [`# 매체 규정 전수 검사 — ${summary.at.slice(0, 10)}`, '',
  `케이스 ${summary.cases} × 규격 ${summary.specs} = ${totalCells}장. 통과 ${passCells} · 위반 있는 장 ${totalCells - passCells}.`,
  `검사기: core/lint.js(치수·글자수·줄 수·잘림·글자색·글꼴·안전영역·글자 높이 범위·투명) + scripts/lib/lint-extra.mjs(로고 불가/크기/높이 범위·템플릿 글자 px·오브젝트 상자·이미지 밖 글자).`,
  `재지 않은 것: 제출 파일 용량·포맷(래스터는 앱에서만). 투명 여부는 렌더러 선언값.`, '',
  '## 규칙별', '| 규칙 | 차단 | 경고 | 오류 | 규격 수 | 케이스 수 |', '|---|---|---|---|---|---|',
  ...Object.entries(byCode).sort((a, b) => (b[1].block + b[1].warn) - (a[1].block + a[1].warn)).map(([k, v]) => `| ${k} | ${v.block} | ${v.warn} | ${v.error} | ${Object.keys(v.specs).length} | ${v.cases.length} |`),
  '', '## 규격별 (위반 있는 규격만)', '| 규격 | 차단 | 경고 | 규칙 |', '|---|---|---|---|',
  ...Object.entries(bySpec).sort((a, b) => (b[1].block + b[1].warn) - (a[1].block + a[1].warn)).map(([s, v]) => `| ${s} | ${v.block} | ${v.warn} | ${Object.entries(v.codes).map(([k, n]) => `${k} ${n}`).join(' · ')} |`),
  '', '## 상위 위반 (차단 먼저, 최대 120건)', '| 케이스 | 규격 | 등급 | 규칙 | 역할 | 측정 vs 한도 |', '|---|---|---|---|---|---|',
  ...top.slice(0, 120).map(o => `| ${o.id} | ${o.spec} | ${o.level} | ${o.code} | ${o.role ?? ''} | ${o.msg} |`),
  '', '## 「통과」가 보장하지 않는 것 — 규정 데이터가 없는 규격',
  gap('chars', '글자수 한도'), gap('lines', '줄 수 한도'), gap('safeArea', '안전영역(숫자)'), gap('fontRange', '글자 높이 범위'), gap('fontTemplate', '역할별 글자 px'),
  gap('logoCount', '로고 개수'), gap('logoSize', '로고 크기'), gap('objectBox', '오브젝트 상자'), gap('textColor', '글자색'), gap('weight', '용량 상한(앱에서만 측정)'),
  '- **로고 위치**: 어느 규격도 숫자로 적지 않음(메모뿐) — 검사 불가',
  `- 안전영역이 메모뿐인 규격 ${specIds.filter(s => coverage[s].safeAreaMemoOnly).length}: ${specIds.filter(s => coverage[s].safeAreaMemoOnly).join(', ')}`,
];
writeFileSync(path.join(OUT, 'lint-report.md'), md.join('\n'));
console.log(`\n통과 ${passCells}/${totalCells} · 규칙별 ${JSON.stringify(Object.fromEntries(Object.entries(byCode).map(([k, v]) => [k, v.block + v.warn])))}`);
console.log('→', path.join(OUT, 'lint-report.md'));
