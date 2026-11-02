#!/usr/bin/env node
// 전수 결과(self-block --recipes) → 시안×규격 통과 목록(core/templates-quality.js). 후보는 이 목록 안에서만 나간다.
//   node scripts/template-quality.mjs <결과.json> [통과율 기준 0.85]
import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8')).filter(r => !r.skip && r.recipe);
const min = +(process.argv[3] ?? 0.85), by = {};
for (const r of rows) { const k = `${r.recipe}|${r.spec}`; (by[k] ??= { n: 0, ok: 0 }).n++; const onlySubject = r.state === 'review' && (r.design ?? []).every(d => d.code === 'text-over-subject' || d.level === 'info'); if (r.quality?.ok && (r.state === 'ready' || onlySubject)) by[k].ok++; }   // 주인공 겹침은 키비주얼마다 달라 런타임(trace.tpl.overlap)에서 거른다

const pass = Object.entries(by).filter(([, v]) => v.n >= 4 && v.ok / v.n >= min).map(([k]) => k).sort();
writeFileSync(new URL('../core/templates-quality.js', import.meta.url), `// 생성 파일(scripts/template-quality.mjs). 청사진 대조(타이포·패딩·여백)와 매체 검수를 ${Math.round(min * 100)}% 이상 통과한 시안×규격.\nexport const TEMPLATE_PASS = new Set(${JSON.stringify(pass)});\n`);
const spec = {}; for (const k of pass) { const s = k.split('|')[1]; spec[s] = (spec[s] ?? 0) + 1; }
console.log(`조합 ${Object.keys(by).length} → 통과 ${pass.length}`); console.log(spec);
