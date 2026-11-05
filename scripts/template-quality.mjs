#!/usr/bin/env node
// 전수 결과(self-block --recipes) → 시안×규격×비주얼 유형 합격 목록(core/templates-quality.js). 후보는 이 목록 안에서 점수 순으로 나간다.
//   node scripts/template-quality.mjs <결과.json[,결과2.json…]> [통과율 기준 0.7] [유형별 상한 12]
//   그려진 것 중 통과율로 거르고, 순위는 그 유형 그림 전체 대비 통과율(렌더에서 빠진 경우 포함)로 매긴다. 유형마다 잘 맞는 시안이 다르다(11-03 피그마 비주얼 시험)
//   11-03(2): 타이포·여백 검사(core/typoaudit.js — 위계·비율·패딩·간격·잘림·로고 겹침)에 ✗ 면 그 그림은 불합격. 같은 결과 행을 Node 에서 다시 그려 trace 로 잰다(브라우저 결과와 같은 코드).
//            거의 같은 안(지문 거리 < DUP_DIST, 그린 조합의 과반)은 순위 낮은 쪽을 뺀다 — 「다른 시안」 모달에 같은 안이 3개 뜨던 것.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { kvKeyOf, familyById, familyStyle, frameFor } from '../core/recipes.js';
import { auditFromTrace, traceOf, fingerprintOf, fpDistance, DUP_DIST } from '../core/typoaudit.js';
import { renderArtifact } from '../core/contract.js';
import { registerAll } from '../core/generate.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { adSpecEntries } from '../core/adspecs.js';
import { BRIEFS } from './lib/briefs.mjs';
registerAll();
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = process.argv[2].split(',');   // 결과 파일 여러 개는 쉼표로(11-05: 10규격 전수 + 21규격 전수)
const rows = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8'))).filter(r => r.recipe && r.skip !== 'asset');
const min = +(process.argv[3] ?? 0.7), cap = +(process.argv[4] ?? 12), by = {}, caseOf = {}, specs = adSpecEntries();
const led = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8')).cases;
const loadCase = id => (caseOf[id] ??= (() => {
  const c = led.find(x => x.id === id), dir = path.join(ROOT, 'ref/learned/cases', id), meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const logo = c?.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, tone = c?.logoMeta?.tone ?? 'dark';
  const style = normalizeStyle({ colors: [c?.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c?.kv ?? 'kv.png')).href, kvMeta: meta, kvTypeOverride: c?.typeOverride ?? null, logo, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c?.logoMeta ?? null });
  return { style, key: kvKeyOf(style.kvMeta) };
})());
const ctxOf = {}; const ctxFor = b => (ctxOf[b] ??= createContext(BRIEFS[b] ?? BRIEFS.gs, 'recruit'));
const typo = {}, fps = {};   // typo: 행별 검사 결과 집계, fps: 규격|유형|그림|문구 → [{recipe, fp}]
let typoFail = 0, typoN = 0;
for (const r of rows) {
  const { style, key } = loadCase(r.case);
  const k = `${r.recipe}|${r.spec}|${key}`; const v = (by[k] ??= { n: 0, ok: 0, drawn: 0, typoX: 0 }); v.n++;
  if (r.skip) continue;
  v.drawn++;
  const onlySubject = (r.state === 'review' || r.state === 'draft') && (r.design ?? []).every(d => d.code === 'text-over-subject' || d.level === 'info') && !(r.issues ?? []).some(i => i.level === 'block');   // 주인공 겹침은 키비주얼마다 달라 런타임(trace.tpl.overlap)에서 거른다 · draft = 매체 등급이 없는 규격(11-05 21규격) — 사유가 등급 없음뿐이면 ready 와 같다
  let pass = !!(r.quality?.ok && (r.state === 'ready' || onlySubject));
  // 타이포·여백 검사(같은 코드로 다시 그려 trace 로)
  const spec = specs[r.spec], fam = familyById(r.recipe);
  if (spec && fam && BRIEFS[r.brief]) {
    try {
      const html = renderArtifact(r.spec, ctxFor(r.brief), { ...style, ...familyStyle(fam) }, {});
      const a = auditFromTrace(html, spec, frameFor(fam, spec));
      if (a) { typoN++; if (!a.ok) { typoFail++; v.typoX++; pass = false; for (const f of a.fails) typo[f.code] = (typo[f.code] ?? 0) + 1; } }
      const fp = fingerprintOf(traceOf(html), spec.w, spec.h); if (fp) (fps[`${r.spec}|${key}|${r.case}|${r.brief}`] ??= []).push({ recipe: r.recipe, fp });
    } catch (e) { typo[`error:${String(e.message).slice(0, 30)}`] = (typo[`error:${String(e.message).slice(0, 30)}`] ?? 0) + 1; }
  }
  if (pass) v.ok++;
}
// 중복 판정: (규격·유형) 안의 두 시안이 함께 그려진 조합 중 과반에서 지문이 같으면 같은 안
const pair = {};
for (const [k, list] of Object.entries(fps)) {
  const [spec, key] = k.split('|');
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const pk = `${spec}|${key}|${[list[i].recipe, list[j].recipe].sort().join('~')}`; const v = (pair[pk] ??= { n: 0, same: 0 }); v.n++;
    if (fpDistance(list[i].fp, list[j].fp) < DUP_DIST) v.same++;
  }
}
const isDup = (spec, key, a, b) => { const v = pair[`${spec}|${key}|${[a, b].sort().join('~')}`]; return !!v && v.n >= 2 && v.same / v.n > 0.5; };
const groups = {};
// 그림마다 겹침·크기로 빠지는 건 런타임이 거른다: 그려진 것 중 통과율 + 같은 유형 그림의 1/4 이상에 들어갈 것.
// 순위는 유형 전체 대비 통과율(여러 그림에 두루 맞는 시안이 앞)
for (const [k, v] of Object.entries(by)) {
  if (v.drawn < 4 || v.ok / v.drawn < min || v.drawn / v.n < 0.25) continue;
  const [, s, t] = k.split('|'); (groups[`${s}|${t}`] ??= []).push([k, +(v.ok / v.n).toFixed(2)]);
}
let dupDropped = 0;
const pass = Object.entries(groups).flatMap(([gk, g]) => {
  const [s, t] = gk.split('|'), kept = [];
  for (const e of g.sort((a, b) => b[1] - a[1])) { const id = e[0].split('|')[0]; if (kept.some(x => isDup(s, t, x[0].split('|')[0], id))) { dupDropped++; continue; } kept.push(e); if (kept.length >= cap) break; }
  return kept;
}).sort((a, b) => (a[0] < b[0] ? -1 : 1));
writeFileSync(new URL('../core/templates-quality.js', import.meta.url), `// 생성 파일(scripts/template-quality.mjs). 시안×규격×비주얼 유형 → 통과율. 청사진 대조·매체 검수·타이포 여백 검사(core/typoaudit.js) ${Math.round(min * 100)}% 이상, 중복 안 제외, 유형별 상위 ${cap}개.\nexport const TEMPLATE_PASS = new Map(${JSON.stringify(pass)});\n`);
console.log(`조합 ${Object.keys(by).length} → 합격 ${pass.length} (중복으로 뺀 안 ${dupDropped})`);
console.log(`타이포 검사 ${typoN}장 중 ✗ ${typoFail}`, typo);
const t = {}; for (const [k, g] of Object.entries(groups)) t[k] = `${Math.min(g.length, cap)}/${g.length}`; console.log(t);
