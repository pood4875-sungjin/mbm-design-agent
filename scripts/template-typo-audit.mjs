#!/usr/bin/env node
// 시안 틀 타이포·여백 자동 검사 전수(core/typoaudit.js). 시안 틀로 그린 결과의 trace(글자 역할별 px·굵기·줄 수·상자)를 청사진 세트 값과 상대 비교해 ✗ 표를 낸다.
//   node scripts/template-typo-audit.mjs [--cases a,b] [--briefs gs,longname] [--specs s1,s2] [--all] [--out 파일.json] [--shots 폴더 [--shot-n 10]] [--bp]
//   기본: 합격 목록(core/templates-quality.js)의 안만. --all 은 규격에 맞는 시안 전부(합격 목록 재계산 전 점검용). --bp 는 청사진 분포만 찍고 끝.
//   --shots: 대표 ✗ 사례를 헤드리스 Chrome 으로 PNG(규칙마다 고르게). Chrome 은 scripts/case-shot.mjs 와 같은 경로
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { adSpecGroups } = await core('adspecs.js');
const { familiesFor, familyStyle, familyById, frameFor, recipeEligible, kvKeyOf } = await core('recipes.js');
const { auditFromTrace, traceOf, fingerprintOf, fpDistance, DUP_DIST, BP } = await core('typoaudit.js');
const { TEMPLATE_FAMILIES } = await core('templates-data.js');
const { TEMPLATE_PASS } = await core('templates-quality.js');
import { BRIEFS } from './lib/briefs.mjs';
registerAll();
const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

if (argv.includes('--bp')) {   // 청사진 분포 — 상한의 근거(core/typoaudit.js BP 머리말)
  const r = {};
  for (const f of TEMPLATE_FAMILIES) for (const fr of f.frames) {
    const m = fr.rows.find(x => x.role === 'main');
    for (const x of fr.rows) { if (x.role === 'main') continue; const k = { season: 'sub', date: 'date', role: 'detail' }[x.role] ?? x.role; (r[k] ??= []).push(x.fs / m.fs); if (x.label) (r.label ??= []).push(x.label.fs / m.fs); if (x.badge && (x.badge.fill || x.badge.stroke)) { (r[`${k}-badge-h`] ??= []).push(x.badge.h / m.fs); (r[`${k}-badge-px`] ??= []).push(x.fs / m.fs); } }
  }
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(14), `n=${v.length}`, 'p10', q(v, .1).toFixed(2), 'p50', q(v, .5).toFixed(2), 'p90', q(v, .9).toFixed(2), 'max', Math.max(...v).toFixed(2));
  process.exit(0);
}

const CASES = (opt('--cases') ?? 'fig-28,fig-31,dongsuh-model,fig-32,fig-07,fig-13,fig-04,fig-14').split(',');
const briefIds = (opt('--briefs') ?? 'gs,longname').split(',');
const all = argv.includes('--all');
const led = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8')).cases;
const groups = adSpecGroups().filter(g => g.entry.extract && recipeEligible(g.entry) && (!opt('--specs') || opt('--specs').split(',').includes(g.id)));
const rows = [], fps = {};
for (const cid of CASES) {
  const c = led.find(x => x.id === cid); const dir = path.join(ROOT, 'ref/learned/cases', cid);
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const logo = c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, tone = c.logoMeta?.tone ?? 'dark';
  const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null });
  const key = kvKeyOf(style.kvMeta);
  for (const bid of briefIds) {
    const ctx = createContext(BRIEFS[bid], 'recruit');
    for (const g of groups) {
      const spec = g.entry;
      for (const f of familiesFor(spec, style.kvMeta, true, bid, { all: true })) {
        const inPass = TEMPLATE_PASS.has(`${f.id}|${g.id}|${key}`);
        if (!all && !inPass) continue;
        let html; try { html = renderArtifact(g.id, ctx, { ...style, ...familyStyle(f) }, {}); } catch (e) { rows.push({ case: cid, brief: bid, spec: g.id, recipe: f.id, err: String(e.message).slice(0, 80) }); continue; }
        const tr = traceOf(html); if (!tr?.tpl) continue;
        const fr = frameFor(f, spec);
        const a = auditFromTrace(html, spec, fr);
        const fp = fingerprintOf(tr, spec.w, spec.h);
        (fps[`${g.id}|${key}|${cid}|${bid}`] ??= []).push({ recipe: f.id, fp });
        rows.push({ case: cid, brief: bid, spec: g.id, recipe: f.id, frame: fr.id, key, inPass, unfit: !!tr.tpl.unfit, ok: a.ok, fails: a.fails, m: a.m });
      }
    }
  }
}
// 중복: 같은 규격·유형·그림·문구에서 지문 거리 < DUP_DIST 인 안 쌍 → (규격·유형) 단위로 「그 쌍이 그려진 조합의 과반에서 같음」이면 중복
const pairHit = {};
for (const [k, list] of Object.entries(fps)) {
  const [spec, key] = k.split('|');
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const pk = `${spec}|${key}|${[list[i].recipe, list[j].recipe].sort().join('~')}`; const v = (pairHit[pk] ??= { n: 0, same: 0 }); v.n++;
    if (fpDistance(list[i].fp, list[j].fp) < DUP_DIST) v.same++;
  }
}
const dups = Object.entries(pairHit).filter(([, v]) => v.n >= 2 && v.same / v.n > 0.5).map(([k, v]) => ({ k, ...v }));

const out = opt('--out'); if (out) { mkdirSync(path.dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify({ rows, dups, BP }, null, 0)); }
const drawn = rows.filter(r => !r.err), fit = drawn.filter(r => !r.unfit);
const byRule = {}, bySet = {}, bySpec = {};
for (const r of fit) for (const f of r.fails) { byRule[f.code] = (byRule[f.code] ?? 0) + 1; (bySet[r.recipe] ??= { n: 0, x: 0 }); (bySpec[r.spec] ??= { n: 0, x: 0 }); }
for (const r of fit) { (bySet[r.recipe] ??= { n: 0, x: 0 }).n++; (bySpec[r.spec] ??= { n: 0, x: 0 }).n++; if (!r.ok) { bySet[r.recipe].x++; bySpec[r.spec].x++; } }
console.log(`그림 ${drawn.length}(unfit 제외 ${fit.length}) · ✗ ${fit.filter(r => !r.ok).length} (${Math.round(fit.filter(r => !r.ok).length / Math.max(1, fit.length) * 100)}%) · 합격 목록 안만: ${!all}`);
console.log('규칙별', Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('규격별', Object.entries(bySpec).map(([k, v]) => `${k} ${v.x}/${v.n}`).join(' · '));
console.log('세트별(✗/그림, 상위 15)', Object.entries(bySet).sort((a, b) => b[1].x / b[1].n - a[1].x / a[1].n).slice(0, 15).map(([k, v]) => `${k} ${v.x}/${v.n}`).join(' · '));
console.log(`중복 쌍(규격·유형 단위, 과반 같음) ${dups.length}`, dups.slice(0, 12).map(d => `${d.k} ${d.same}/${d.n}`).join(' · '));
const ex = {}; for (const r of fit) for (const f of r.fails) { if ((ex[f.code] ??= []).length < 3) ex[f.code].push(`${r.case}/${r.brief}/${r.spec}/${r.recipe}: ${f.msg}`); }
for (const [k, v] of Object.entries(ex)) console.log(`  ${k}:`, v.join(' | '));

// 대표 사례 PNG: 규칙마다 돌아가며 n장(헤드리스 Chrome, 케이스 그림·로고는 file URL)
const shots = opt('--shots');
if (shots) {
  const n = +opt('--shot-n', 10), CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
  mkdirSync(shots, { recursive: true });
  const picked = [], codes = Object.keys(byRule);
  for (let i = 0; picked.length < n && i < 50; i++) { const code = codes[i % Math.max(1, codes.length)]; const r = fit.find(r => !picked.includes(r) && r.fails.some(f => f.code === code)); if (r) picked.push(r); else if (!codes.length) break; }
  for (const r of picked) {
    const c = led.find(x => x.id === r.case), dir = path.join(ROOT, 'ref/learned/cases', r.case), meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const logo = c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, tone = c.logoMeta?.tone ?? 'dark';
    const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null });
    const spec = groups.find(g => g.id === r.spec).entry, html = renderArtifact(r.spec, createContext(BRIEFS[r.brief], 'recruit'), { ...style, ...familyStyle(familyById(r.recipe)) }, {});
    const f = path.join(shots, `${r.fails[0].code}__${r.case}__${r.brief}__${r.spec}__${r.recipe}.html`);
    writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}</style></head><body>${html}</body></html>`);
    try { execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=6000', `--window-size=${spec.w},${spec.h}`, `--screenshot=${f.replace(/\.html$/, '.png')}`, pathToFileURL(f).href], { stdio: 'ignore' }); } catch (e) { console.log('shot 실패', f, e.message); }
    console.log('PNG', f.replace(/\.html$/, '.png'), '—', r.fails.map(x => x.msg).join(' / '));
  }
}
