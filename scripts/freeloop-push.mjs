#!/usr/bin/env node
// 자유 시안 평가 루프 — 수동 밀어넣기(11-05). 대화창(Claude)에서 직접 만든 안 묶음을 app/loop.html 이 읽는 형식(_out/freedesign-loop/<batch>/batch.json)으로 넣는다.
//   node scripts/freeloop-push.mjs <batchDir> [--spec <specId>] [--id <batchId>] [--label <이름>]
//       batchDir 의 *.json({ specId, html, caseId, notes?, style? } 또는 그 배열, _·.audit 제외) + 같은 이름 .png → 묶음. png 가 없으면 헤드리스 Chrome 으로 렌더한다.
//   node scripts/freeloop-push.mjs --from-matrix
//       _out/freedesign-matrix/matrix.json 의 F__<type>__<A|B|C> 18안 + png → 묶음 b-matrix-1105 (유형→kvType: photo·object·person·group·illust·texture)
//   서버(server/server.mjs)가 떠 있으면 새로고침만 하면 뜬다(서버는 요청 때마다 폴더를 읽는다).
import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { pushBatch, LOOP_DIR, ROOT, caseMeta } from '../server/freeloop.js';
import { COARSE_TYPES } from '../core/freeprefs.js';

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MATRIX_CASE = { photo: 'fig-28', object: 'fig-04', person: 'dongsuh-model', group: 'fig-07', illust: 'fig-14', texture: 'gradient' };

if (args.includes('--from-matrix')) {
  const dir = path.join(ROOT, '_out/freedesign-matrix');
  const m = JSON.parse(readFileSync(path.join(dir, 'matrix.json'), 'utf8'));
  const bid = opt('--id', 'b-matrix-1105'); const out = path.join(LOOP_DIR, bid); mkdirSync(out, { recursive: true });
  const entries = [];
  for (const key of Object.keys(m).filter(k => /^F__/.test(k))) {
    const [, type, variant] = key.split('__'); const caseId = MATRIX_CASE[type] ?? null;
    const png = path.join(dir, key + '.png'); let pngRel = null;
    if (existsSync(png)) { copyFileSync(png, path.join(out, key + '.png')); pngRel = `/_out/freedesign-loop/${bid}/${key}.png`; }
    entries.push({ id: key, caseId, specId: opt('--spec', 'google-gdn-580x400'), html: m[key], png: pngRel, notes: '', style: { id: variant, name: `안 ${variant}` }, kvType: caseId && caseMeta(caseId) ? undefined : COARSE_TYPES[type] });
  }
  const b = pushBatch(entries, { id: bid, specId: opt('--spec', 'google-gdn-580x400'), source: 'matrix', label: '손으로 뽑은 18안(11-05 rate.html)' });
  console.log(`묶음 ${b.id}: ${b.items.length}안 → ${path.join(LOOP_DIR, b.id)}/batch.json`);
  for (const it of b.items) console.log(`  ${it.id}  ${it.kvType}  score ${it.score}${it.explore ? ' 탐색' : ''}`);
  process.exit(0);
}

const inDir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') === false || args[0]);
if (!inDir || inDir.startsWith('--') || !existsSync(inDir)) { console.error('사용: node scripts/freeloop-push.mjs <batchDir> [--spec id] [--id batchId] [--label 이름] | --from-matrix'); process.exit(2); }
const abs = path.resolve(inDir);
const files = readdirSync(abs).filter(f => f.endsWith('.json') && !f.endsWith('.audit.json') && !f.endsWith('.input.json') && !f.startsWith('_') && f !== 'batch.json');
const entries = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(path.join(abs, f), 'utf8'));
  for (const e of (Array.isArray(j) ? j : [j])) { if (!e?.html) continue; const base = f.replace(/\.json$/, ''); entries.push({ id: e.id ?? base, caseId: e.caseId ?? null, specId: e.specId ?? opt('--spec'), html: e.html, notes: e.notes ?? '', style: e.style ?? null, _png: existsSync(path.join(abs, base + '.png')) ? path.join(abs, base + '.png') : null }); }
}
if (!entries.length) { console.error('안이 없습니다(json 에 html·specId 필요)'); process.exit(2); }
const bid = opt('--id', `b-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}-manual`); const out = path.join(LOOP_DIR, bid); mkdirSync(out, { recursive: true });
let render = null; try { render = (await import('./lib/freedesign-renderer.mjs')).renderFree; } catch {}
for (const e of entries) {
  if (e._png) { copyFileSync(e._png, path.join(out, e.id + '.png')); e.png = `/_out/freedesign-loop/${bid}/${e.id}.png`; }
  else if (render && e.caseId) { try { const a = render({ specId: e.specId, html: e.html, caseId: e.caseId, name: e.id }, out); e.png = `/_out/freedesign-loop/${bid}/${e.id}.png`; e.measure = a.measure; } catch (err) { console.warn('렌더 실패', e.id, err.message); } }
  delete e._png;
}
const b = pushBatch(entries, { id: bid, specId: opt('--spec', entries[0].specId), source: 'manual', label: opt('--label') });
console.log(`묶음 ${b.id}: ${b.items.length}안 → ${path.join(LOOP_DIR, b.id)}/batch.json`);
