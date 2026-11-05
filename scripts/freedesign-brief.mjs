#!/usr/bin/env node
// 자유 디자인 — 케이스 × 규격의 계약 입력과 프롬프트를 파일로 뽑는다(스킬 /design-free 가 Claude(대화창)에게 보여 주는 재료).
//   node scripts/freedesign-brief.mjs <케이스id> <규격,…> <출력 폴더> [--req "요구사항"]
//   출력: <폴더>/<규격>.input.json(dataURL 대신 그림 경로 _files) · <규격>.prompt.md(그림은 경로로 — Read 로 본다)
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { caseInput } from './lib/freedesign-case.mjs';
import { buildFreePrompt } from '../server/freedesign.js';
const [caseId, specArg, out] = process.argv.slice(2);
const ri = process.argv.indexOf('--req'); const req = ri > 0 ? process.argv[ri + 1] : '';
if (!caseId || !specArg || !out) { console.error('사용: node scripts/freedesign-brief.mjs <케이스id> <규격,…> <출력 폴더> [--req "요구사항"]'); process.exit(2); }
mkdirSync(out, { recursive: true });
for (const specId of specArg.split(',')) {
  const inp = caseInput(caseId, specId, { assets: 'file' });
  if (req) inp.history = [{ role: 'user', text: req }];
  const prompt = buildFreePrompt(inp, { images: { kv: inp._files.kv, logo: inp._files.logo } });
  const slim = { ...inp, kv: { ...inp.kv, dataUrl: '{{KV}}' }, logo: inp.logo ? { ...inp.logo, dataUrl: '{{LOGO}}' } : null };
  writeFileSync(path.join(out, `${specId}.input.json`), JSON.stringify(slim, null, 1));
  writeFileSync(path.join(out, `${specId}.prompt.md`), prompt);
  console.log(`${specId}: ${path.join(out, specId + '.prompt.md')} (${prompt.length}자) · KV ${inp._files.kv}${inp._files.logo ? ' · 로고 ' + inp._files.logo : ''}`);
}
