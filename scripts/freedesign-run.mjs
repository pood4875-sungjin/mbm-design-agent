#!/usr/bin/env node
// 자유 디자인 실제 호출 — 케이스 × 규격을 엔진(claude-code | api)으로 생성하고 렌더·검수까지 돌린다(서버 없이 server/freedesign.js 직접).
//   node scripts/freedesign-run.mjs <케이스id> <규격,…> [--engine claude-code|api] [--image-mode read|stream] [--model …] [--out _out/freedesign/<케이스>]
//   출력: <out>/<규격>.json({specId, caseId, html(자리표시로 되돌림), notes, ms, attempts, errors, usage}) · 이어서 scripts/freedesign-render.mjs 가 .html/.png/.audit.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, caseInput } from './lib/freedesign-case.mjs';
import { freeDesign, stripAssets } from '../server/freedesign.js';
const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [caseId, specArg] = argv;
if (!caseId || !specArg) { console.error('사용: node scripts/freedesign-run.mjs <케이스id> <규격,…> [--engine claude-code|api] [--image-mode read|stream] [--model …] [--out 폴더]'); process.exit(2); }
const engine = opt('--engine', 'claude-code'), imageMode = opt('--image-mode', 'read'), model = opt('--model', null);
const out = path.resolve(opt('--out', path.join(ROOT, '_out/freedesign', caseId))); mkdirSync(out, { recursive: true });
let client = null;
if (engine === 'api') { const { makeClient } = await import('../server/design.js'); client = makeClient(process.env.ANTHROPIC_API_KEY ?? ''); }
const log = [];
for (const specId of specArg.split(',')) {
  const inp = caseInput(caseId, specId, { engine });
  const t0 = Date.now(); let r = null, err = null;
  try { r = await freeDesign(inp, { client, imageMode, model }); } catch (e) { err = e.message; }
  const ms = Date.now() - t0;
  const rec = { specId, caseId, engine, imageMode, ms, attempts: r?.attempts ?? null, errors: r?.errors ?? (err ? [err] : []), notes: r?.notes ?? '', model: r?.model ?? null, usage: r?.usage ?? null, html: r ? stripAssets(r.html, { kv: inp.kv.dataUrl, logo: inp.logo?.dataUrl ?? null }) : null };
  writeFileSync(path.join(out, `${specId}.json`), JSON.stringify(rec, null, 1));
  log.push(rec);
  console.log(`${specId}: ${r ? `OK ${(ms / 1000).toFixed(0)}s · 시도 ${r.attempts} · 모델 ${r.model ?? '?'}${r.errors.length ? ' · 남은 위반 ' + r.errors.join(' / ') : ''}` : `실패 ${(ms / 1000).toFixed(0)}s — ${err}`}`);
}
writeFileSync(path.join(out, '_run.json'), JSON.stringify(log.map(({ html, ...x }) => x), null, 1));
if (log.some(x => x.html)) execFileSync('node', [path.join(ROOT, 'scripts/freedesign-render.mjs'), out, out], { stdio: 'inherit' });
