#!/usr/bin/env node
// Figma upload_assets 가 준 submitUrl 목록에 _plan/<page>.uploads.json 의 파일을 순서대로 POST 한다(curl, 동시 6).
//   node scripts/figma/figma-frames-upload.mjs <page> <urls.json> [--from N]
//   urls.json = upload_assets 응답의 uploads 배열([{ submitUrl, targetNodeId? }]) — 순서가 uploads.json 과 같아야 한다(--from 으로 시작 번호 지정)
//   → _plan/<page>.uploaded.json 에 nodeId(placedOnNodeId)·imageHash·오류를 누적 기록
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PLAN = path.join(ROOT, 'ref/learned/cases/_out/figma-frames/_plan');
const [page, urlsF] = process.argv.slice(2);
const from = Number((process.argv.indexOf('--from') >= 0) ? process.argv[process.argv.indexOf('--from') + 1] : 0);
const ups = JSON.parse(readFileSync(path.join(PLAN, `${page}.uploads.json`), 'utf8'));
const urls = JSON.parse(readFileSync(urlsF, 'utf8')); const list = Array.isArray(urls) ? urls : urls.uploads;
const outF = path.join(PLAN, `${page}.uploaded.json`);
const done = existsSync(outF) ? JSON.parse(readFileSync(outF, 'utf8')) : ups.map(u => ({ ...u }));
const post = (u, url) => new Promise(res => {
  const safe = path.basename(u.file).replace(/[^\w.\-]/g, '_');
  execFile('curl', ['-s', '-X', 'POST', url, '-F', `file=@${u.file};type=${u.ct ?? (u.file.endsWith('.svg') ? 'image/svg+xml' : 'image/png')};filename=${safe}`], { maxBuffer: 8 << 20 }, (e, so) => {
    if (e) return res({ error: e.message.slice(0, 120) });
    try { res(JSON.parse(so)); } catch { res({ error: 'bad json ' + so.slice(0, 120) }); }
  });
});
let i = 0; const jobs = list.map((entry, j) => [j, entry]);
const results = [];
async function worker() { while (i < jobs.length) { const [j, entry] = jobs[i++]; const u = ups[from + j]; if (!u) continue; const url = typeof entry === 'string' ? entry : entry.submitUrl; const r = await post(u, url); results.push([from + j, r]); process.stdout.write(`${r.error ? '✗' : '✓'} ${from + j} ${u.name ?? u.key} ${r.error ?? (r.placedOnNodeId ?? r.targetNodeId ?? '')}\n`); } }
await Promise.all(Array.from({ length: 6 }, worker));
for (const [j, r] of results) { const d = done[j]; if (r.error) d.error = r.error; else { d.nodeId = r.placedOnNodeId ?? r.targetNodeId ?? d.nodeId ?? null; d.imageHash = r.imageHash ?? null; delete d.error; } }
writeFileSync(outF, JSON.stringify(done, null, 1));
console.log(`기록 → ${outF} (성공 ${results.filter(([, r]) => !r.error).length}/${results.length})`);
