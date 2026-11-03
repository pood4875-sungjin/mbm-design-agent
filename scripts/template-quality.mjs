#!/usr/bin/env node
// 전수 결과(self-block --recipes) → 시안×규격×비주얼 유형 합격 목록(core/templates-quality.js). 후보는 이 목록 안에서 점수 순으로 나간다.
//   node scripts/template-quality.mjs <결과.json> [통과율 기준 0.7] [유형별 상한 12]
//   그려진 것 중 통과율로 거르고, 순위는 그 유형 그림 전체 대비 통과율(렌더에서 빠진 경우 포함)로 매긴다. 유형마다 잘 맞는 시안이 다르다(11-03 피그마 비주얼 시험)
import { readFileSync, writeFileSync } from 'node:fs';
import { kvKeyOf } from '../core/recipes.js';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8')).filter(r => r.recipe && r.skip !== 'asset');
const min = +(process.argv[3] ?? 0.7), cap = +(process.argv[4] ?? 12), by = {}, keyOfCase = {};
const keyOf = id => (keyOfCase[id] ??= kvKeyOf(JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'))));
for (const r of rows) {
  const k = `${r.recipe}|${r.spec}|${keyOf(r.case)}`; const v = (by[k] ??= { n: 0, ok: 0, drawn: 0 }); v.n++;
  if (r.skip) continue;
  v.drawn++;
  const onlySubject = r.state === 'review' && (r.design ?? []).every(d => d.code === 'text-over-subject' || d.level === 'info');   // 주인공 겹침은 키비주얼마다 달라 런타임(trace.tpl.overlap)에서 거른다
  if (r.quality?.ok && (r.state === 'ready' || onlySubject)) v.ok++;
}
const groups = {};
// 그림마다 겹침·크기로 빠지는 건 런타임이 거른다: 그려진 것 중 통과율 + 같은 유형 그림의 1/4 이상에 들어갈 것.
// 순위는 유형 전체 대비 통과율(여러 그림에 두루 맞는 시안이 앞)
for (const [k, v] of Object.entries(by)) {
  if (v.drawn < 4 || v.ok / v.drawn < min || v.drawn / v.n < 0.25) continue;
  const [, s, t] = k.split('|'); (groups[`${s}|${t}`] ??= []).push([k, +(v.ok / v.n).toFixed(2)]);
}
const pass = Object.values(groups).flatMap(g => g.sort((a, b) => b[1] - a[1]).slice(0, cap)).sort((a, b) => (a[0] < b[0] ? -1 : 1));
writeFileSync(new URL('../core/templates-quality.js', import.meta.url), `// 생성 파일(scripts/template-quality.mjs). 시안×규격×비주얼 유형 → 통과율. 청사진 대조·매체 검수 ${Math.round(min * 100)}% 이상, 유형별 상위 ${cap}개.\nexport const TEMPLATE_PASS = new Map(${JSON.stringify(pass)});\n`);
console.log(`조합 ${Object.keys(by).length} → 합격 ${pass.length}`);
const t = {}; for (const [k, g] of Object.entries(groups)) t[k] = `${Math.min(g.length, cap)}/${g.length}`; console.log(t);
