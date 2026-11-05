#!/usr/bin/env node
// 자유 시안 취향 평가 파일(ref/learned/free-prefs.json) 가져오기/내보내기(11-05).
//   node scripts/free-prefs.mjs import <json>   — 앱 내보내기({prefs:[…]}) 또는 rate.html 내려받기({sheet,spec,ratings:{id:{v,note,type,case,variant}}}, 안 HTML 은 _out/freedesign-matrix/matrix.json F__ 키)를 합친다. 옛 good/ok/bad 는 5/3/1
//   node scripts/free-prefs.mjs export [out.json] — 파일을 그대로(썸네일 없음) 내보낸다. 생략하면 표준출력
//   node scripts/free-prefs.mjs stats            — 유형별 평가 수
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readPrefs, addPrefs, PREFS_FILE, ROOT, caseMeta } from '../server/freeloop.js';
import { prefRecord, prefStats, COARSE_TYPES, normRating } from '../core/freeprefs.js';

const [cmd, arg] = process.argv.slice(2);
const MATRIX_CASE = { photo: 'fig-28', object: 'fig-04', person: 'dongsuh-model', group: 'fig-07', illust: 'fig-14', texture: 'gradient' };
const printStats = list => { const s = prefStats(list); console.log(`평가 ${s.total}(미평가 ${s.unrated}) · 좋음 ${s.good} · 보통 ${s.ok} · 안 됨 ${s.bad}`); for (const [t, v] of Object.entries(s.byType)) console.log(`  ${t.padEnd(18)} 5:${v.by[5]} 4:${v.by[4]} 3:${v.by[3]} 2:${v.by[2]} 1:${v.by[1]}`); };

if (cmd === 'import' && arg) {
  const j = JSON.parse(readFileSync(arg, 'utf8')); const recs = [];
  if (Array.isArray(j.prefs)) for (const r of j.prefs) if (r?.id && r.fp) recs.push({ ...r, png: undefined });
  else if (j.ratings && typeof j.ratings === 'object') {   // rate.html 시트
    const m = JSON.parse(readFileSync(path.join(ROOT, '_out/freedesign-matrix/matrix.json'), 'utf8'));
    for (const [id, v] of Object.entries(j.ratings)) {
      const html = m[id]; if (!html) { console.warn('matrix.json 에 없음:', id); continue; }
      const type = v.type ?? id.split('__')[1]; const caseId = v.case ?? MATRIX_CASE[type] ?? null; const meta = caseId ? caseMeta(caseId) : null;
      recs.push(prefRecord({ id: `fp-${j.sheet ?? 'sheet'}-${id}`, specId: j.spec ?? 'google-gdn-580x400', kvMeta: meta ?? type, kvType: meta ? undefined : COARSE_TYPES[type], caseId, html, rating: normRating(v.v), note: v.note ?? '', scope: 'type', at: v.at ? Date.parse(v.at) : Date.now(), batch: j.sheet ?? 'sheet' }));
    }
  }
  const merged = addPrefs(recs);
  console.log(`가져옴 ${recs.length}건 → ${PREFS_FILE} (총 ${merged.length})`); printStats(merged);
} else if (cmd === 'export') {
  const list = readPrefs().map(({ png, ...p }) => p); const out = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), prefs: list }, null, 1);
  if (arg) { writeFileSync(arg, out); console.log(`${list.length}건 → ${arg}`); } else process.stdout.write(out + '\n');
} else if (cmd === 'stats') printStats(readPrefs());
else { console.error('사용: node scripts/free-prefs.mjs import <json> | export [out.json] | stats'); process.exit(2); }
