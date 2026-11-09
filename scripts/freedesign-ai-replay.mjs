#!/usr/bin/env node
// AI 트랙 반려 안 재생(11-09 7단계) — 루프 runs.json 의 반려 안 HTML 을 LLM 없이 지금 코드의 게이트 + 자동 고침(tryAutoFix)으로 다시 잰다.
//   자동 고침을 고친 뒤 「몇 안이 더 살아나는가」를 호출 없이 본다.
//   node scripts/freedesign-ai-replay.mjs --rounds 1,2,3 [--only stack|all] [--out _out/ai-track/replay]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/freedesign-case.mjs';
import { measureFreeHtml, tryAutoFix, substituteAssets, isStackIssue, validateFreeHtml } from '../server/freedesign.js';
import { stagingInput } from './lib/freedesign-staging.mjs';

const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROUNDS = (opt('--rounds') ?? '3').split(',');
const ONLY = opt('--only', 'stack');
const OUT = path.resolve(ROOT, opt('--out', '_out/ai-track/replay')); mkdirSync(OUT, { recursive: true });

const rows = [];
for (const R of ROUNDS) {
  const f = path.join(ROOT, `_out/ai-track/loop-r${R}/runs.json`); if (!existsSync(f)) continue;
  for (const r of JSON.parse(readFileSync(f, 'utf8'))) for (const v of r.variants ?? []) {
    if (v.ok || !v.html) continue;
    if (ONLY === 'stack' && !(v.errors ?? []).some(isStackIssue)) continue;
    const inp = stagingInput(r.kv, r.spec);
    const assets = { kv: inp.kv.dataUrl, logo: inp.logo?.dataUrl ?? null };
    const html = substituteAssets(v.html, assets);
    if (!validateFreeHtml(html, inp).ok) { rows.push({ R, kv: r.kv, spec: r.spec, id: v.id, skip: 'validate' }); continue; }
    const X = { assets, measureFn: (h, dir, i, k) => measureFreeHtml(i, h, OUT, `r${R}-${r.kv}-${r.spec}-${v.id}-${k}`) };
    const g = await X.measureFn(html, null, inp, 'b');
    const before = g?.issues ?? [];
    let after = before, moves = null;
    if (before.length) { const af = await tryAutoFix(X, html, v.html, g, null, inp, 'a'); if (af) { after = af.gate.issues ?? []; moves = af.moves; } }
    const row = { R, kv: r.kv, spec: r.spec, id: v.id, before: before.length, after: after.length, stackBefore: before.filter(isStackIssue).length, stackAfter: after.filter(isStackIssue).length, pass: !after.length, moves, left: after.map(s => s.slice(0, 90)) };
    rows.push(row);
    console.log(`r${R} ${r.kv} ${r.spec} ${v.id}: ${row.before}→${row.after} (간격 ${row.stackBefore}→${row.stackAfter})${row.pass ? ' 통과' : ''}${moves ? ' moves ' + JSON.stringify(moves).slice(0, 120) : ''}\n   ${row.left.join(' | ').slice(0, 300)}`);
  }
}
const sum = { n: rows.filter(r => !r.skip).length, pass: rows.filter(r => r.pass).length, stackGone: rows.filter(r => r.stackBefore && !r.stackAfter).length, stackHad: rows.filter(r => r.stackBefore).length };
writeFileSync(path.join(OUT, `replay-${ONLY}.json`), JSON.stringify({ sum, rows }, null, 1));
console.log(JSON.stringify(sum));
process.exit(0);
