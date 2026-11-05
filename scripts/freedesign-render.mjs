#!/usr/bin/env node
// 자유 디자인 HTML → PNG 렌더 + 검수(CLI). 렌더·측정·판정은 scripts/lib/freedesign-renderer.mjs(renderFree — 서버 selfReview 와 같은 모듈).
//   node scripts/freedesign-render.mjs <html.json | 폴더> <출력 폴더>
//   html.json: { specId, html, caseId?, notes? } 또는 그 배열. html 안의 {{KV}}·{{LOGO}} 는 caseId 의 그림 file:// 로 치환한다(dataURL 이 이미 들어 있으면 그대로).
//   출력: <출력>/<specId>.html(@font-face 주입본) · .png(제출 크기) · .audit.json(측정값·lint·타이포 분포·정보 블록(3항)·타이포 규칙(4항)) · 표준출력에 표 한 줄씩.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { renderFree, auditRow } from './lib/freedesign-renderer.mjs';

const [inArg, outArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('사용: node scripts/freedesign-render.mjs <html.json|폴더> <출력 폴더>'); process.exit(2); }

function loadEntries(p) {
  const abs = path.resolve(p);
  if (statSync(abs).isDirectory()) return readdirSync(abs).filter(f => f.endsWith('.json') && !f.endsWith('.audit.json') && !f.endsWith('.input.json') && !f.startsWith('_')).flatMap(f => loadEntries(path.join(abs, f)));
  const j = JSON.parse(readFileSync(abs, 'utf8'));
  return (Array.isArray(j) ? j : [j]).filter(e => e && e.html && e.specId);
}

mkdirSync(outArg, { recursive: true });
const rows = [];
for (const e of loadEntries(inArg)) {
  let a; try { a = renderFree(e, outArg); } catch (err) { console.error(`${e.specId}: ${err.message}`); continue; }
  rows.push({ spec: e.specId, verdict: a.verdict, validate: a.validate.errors, lint: a.lint.issues.map(i => `${i.level}:${i.code} ${i.msg}`), typo: a.typo, info: a.info?.issues ?? [], typoRules: a.typoRules?.issues ?? [], lowContrast: a.lowContrast, kvLoaded: a.kvLoaded, bytes: a.bytes });
  console.log(auditRow(a));
}
writeFileSync(path.join(path.resolve(outArg), '_summary.json'), JSON.stringify(rows, null, 1));
