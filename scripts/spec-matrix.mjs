#!/usr/bin/env node
// 추출 47규격 × 8항목 매트릭스 — 사용자 「컨시어지」 보드 값 vs 우리 매체 JSON 값 → 일치 / 불일치 / 확인 필요.
//
// 읽는 것: core/media.js(EXTRACT·MEDIA), core/checklist8.js(칸별 판정), core/media/_concierge-frames.json(보드 섹션 직계 프레임 치수·용량 메모 — 10-14 보드 메타 요약, '_' 파일이라 매체 JSON 으로 안 읽힘)
// 쓰는 것: docs/spec-matrix.md(사람용 표) · ref/learned/spec-matrix.json(데이터)
// 규칙 값은 바꾸지 않는다. 불일치·확인 필요는 목록으로만 남긴다.
//
//   node scripts/spec-matrix.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { MEDIA, EXTRACT } = await import(join(root, 'core', 'media.js'));
const { ITEMS, checklist8, orderedChecklist8 } = await import(join(root, 'core', 'checklist8.js'));
const board = JSON.parse(readFileSync(join(root, 'core', 'media', '_concierge-frames.json'), 'utf8'));

// 보드 섹션 → 매체 id (섹션 이름 앞머리)
const SEC = [['당근', 'daangn'], ['블라인드', 'blind'], ['에브리타임', 'everytime'], ['네이버', 'naver-gfa'], ['카카오', 'kakao'], ['인스타', 'instagram'], ['NAP', 'nap-dsp'], ['구글', 'google-gdn'], ['캐치', 'catch'], ['잡다', 'jobda'], ['리멤버', 'remember'], ['자소설', 'jasoseol']];
const mediumOfSec = name => (SEC.find(([k]) => name?.startsWith(k)) ?? [])[1] ?? null;
// 섹션 밖(최상위) 프레임은 좌표로 매체 칸을 찾는다 — 당근 1:59 는 당근01 프레임 안, 캐치 31:4191 류는 캐치 칸 위
const topMedium = f => {
  if (f.name.startsWith('당근_')) return 'daangn';
  if (f.name.includes('캐치')) return 'catch';
  return null;
};
// 당근01(소재가이드)은 section 이 아니라 frame 이라 직계 프레임 목록에 1:59 가 없다 — 보드 메타(1:59 「당근_네이티브 피드 광고」 200×200)를 직접 둔다
const DAANGN = [{ sec: '당근01(소재가이드)', id: '1:59', name: '당근_네이티브 피드 광고', w: 200, h: 200 }, { sec: '당근01(소재가이드)', id: '1:63', name: '당근_카탈로그 상품 광고', w: 200, h: 200 }];
const frames = [...board.frames, ...DAANGN].map(f => ({ ...f, medium: f.sec ? mediumOfSec(f.sec) : topMedium(f) })).filter(f => f.medium);
// 소재 프레임만 — 보드 장식(Group·Frame N·Mask·BG Img 묶음)은 뺀다. 1920×1080 매체 표지, 이름 없는 Group 은 소재가 아니다
const isAsset = f => !/^(Group|Frame|Mask group)\b/.test(f.name) && !(f.w === 1920 && f.h === 1080) && !/Mask|^각 매체별/.test(f.name);
const assets = frames.filter(isAsset);

const specOf = new Map(MEDIA.flatMap(m => (m.specs ?? []).map(s => [s.id, { s, m }])));
const sizeKey = (w, h) => `${w}×${h}`;

// 규격 → 보드 프레임(같은 매체 칸, 같은 치수 — 캔버스 또는 제출 치수)
function boardSizeOf(s, m) {
  const cands = assets.filter(f => f.medium === m.id);
  const hit = cands.filter(f => sizeKey(f.w, f.h) === sizeKey(s.w, s.h));
  const hit2 = !hit.length && s.exportScale > 1 ? cands.filter(f => sizeKey(f.w, f.h) === sizeKey(s.w * s.exportScale, s.h * s.exportScale)) : [];
  const use = hit.length ? hit : hit2;
  if (!use.length) return null;
  return { size: hit.length ? sizeKey(s.w, s.h) : `${sizeKey(s.w * s.exportScale, s.h * s.exportScale)} (제출 치수)`, frames: use.length, ids: use.slice(0, 4).map(f => f.id), names: [...new Set(use.map(f => f.name.replace(/^[^_]*_/, '')))].slice(0, 3) };
}

const rows = [];
for (const id of EXTRACT.ids) {
  const { s, m } = specOf.get(id);
  const bs = boardSizeOf(s, m);
  const items = checklist8(s, m, { boardSize: bs });
  rows.push({ id, medium: m.id, mediumName: m.name, name: s.name, confidence: s.confidence, boardFrames: bs, items });
}

// 보드에만 있는 치수(매체 칸에 소재 프레임이 있는데 우리 추출 47 에 없는 것) / 우리에만 있는 규격(추출 47 밖의 참고 규격)
const extractSizes = new Set(rows.flatMap(r => { const { s } = specOf.get(r.id); return [`${r.medium}:${sizeKey(s.w, s.h)}`, s.exportScale > 1 ? `${r.medium}:${sizeKey(s.w * s.exportScale, s.h * s.exportScale)}` : null].filter(Boolean); }));
const allOurSizes = new Set(MEDIA.flatMap(m => (m.specs ?? []).filter(s => s.w && s.h).flatMap(s => [`${m.id}:${sizeKey(s.w, s.h)}`, s.exportScale > 1 ? `${m.id}:${sizeKey(s.w * s.exportScale, s.h * s.exportScale)}` : null].filter(Boolean))));
const boardOnly = {};
for (const f of assets) {
  const k = `${f.medium}:${sizeKey(f.w, f.h)}`;
  if (extractSizes.has(k)) continue;
  (boardOnly[k] ??= { medium: f.medium, size: sizeKey(f.w, f.h), inOurRef: allOurSizes.has(k), frames: [] }).frames.push(`${f.id} ${f.name}`);
}
const oursOnly = MEDIA.flatMap(m => (m.specs ?? []).filter(s => !s.extract).map(s => ({ id: s.id, medium: m.id, name: s.name, size: s.w && s.h ? sizeKey(s.w, s.h) : (s.format?.every(f => f === 'text') ? '텍스트' : '치수 없음'), confidence: s.confidence, deliverable: s.deliverable !== false, onBoard: assets.some(f => f.medium === m.id && s.w && (sizeKey(f.w, f.h) === sizeKey(s.w, s.h) || (s.exportScale > 1 && sizeKey(f.w, f.h) === sizeKey(s.w * s.exportScale, s.h * s.exportScale)))) })));

// 집계
const tally = { 일치: 0, 불일치: 0, '확인 필요': 0 };
const byItem = Object.fromEntries(ITEMS.map(i => [i, { 일치: 0, 불일치: 0, '확인 필요': 0 }]));
for (const r of rows) for (const it of r.items) { tally[it.verdict]++; byItem[it.item][it.verdict]++; }
const mismatches = rows.flatMap(r => r.items.filter(i => i.verdict === '불일치').map(i => ({ id: r.id, item: i.item, board: i.board, ours: i.ours, why: i.why })));
const reviews = rows.flatMap(r => r.items.filter(i => i.verdict === '확인 필요').map(i => ({ id: r.id, item: i.item, board: i.board, ours: i.ours, why: i.why })));
const countsByMedium = Object.fromEntries(EXTRACT.order.map(mid => [mid, rows.filter(r => r.medium === mid).length]));

const json = {
  note: '추출 47규격 × 8항목 — 보드 값(사용자 체크리스트·프레임·추출 메모) vs 우리 매체 JSON. 값은 바꾸지 않고 판정만. 만드는 법: node scripts/spec-matrix.mjs',
  generatedAt: new Date().toISOString().slice(0, 10), board: { file: board.file, readAt: board.readAt }, items: ITEMS,
  counts: { specs: rows.length, byMedium: countsByMedium, expected: EXTRACT.counts, tally, byItem },
  rows, boardOnly: Object.values(boardOnly), oursOnly, mismatches, reviews,
};
writeFileSync(join(root, 'ref', 'learned', 'spec-matrix.json'), JSON.stringify(json, null, 1) + '\n');
// 가이드 페이지(docs/media-rules.html)가 규격마다 보드 프레임 치수를 보여 주도록 — 작은 생성 파일(ESM). 직접 고치지 말 것
writeFileSync(join(root, 'core', 'spec-board-data.js'), `// 생성 파일 — 직접 고치지 말 것. 원본: core/media/_concierge-frames.json + core/media/_extract.json, 빌드: node scripts/spec-matrix.mjs
// 추출 규격마다 사용자 「컨시어지」 보드에서 찾은 같은 치수의 소재 프레임(수·id). 가이드 페이지의 8항목 「배너 사이즈 규격」 보드 값.
export const SPEC_BOARD = ${JSON.stringify(Object.fromEntries(rows.map(r => [r.id, r.boardFrames])), null, 1)};
`);

// ── 사람용 표 ──
const V = { 일치: '✓ 일치', 불일치: '✗ 불일치', '확인 필요': '? 확인 필요' };
const cell = s => String(s ?? '—').replace(/\|/g, '／').replace(/\n/g, ' ');
const short = (s, n = 70) => { const t = cell(s); return t.length > n ? t.slice(0, n) + '…' : t; };
let md = `# 추출 47규격 × 8항목 매트릭스\n\n`;
md += `> 만든 날 ${json.generatedAt} · 보드 Figma 「컨시어지」 ${board.file} (${board.readAt} 읽음) · 생성: \`node scripts/spec-matrix.mjs\` · 데이터: \`ref/learned/spec-matrix.json\`\n>\n`;
md += `> 보드 값은 사용자가 매체 칸마다 적은 8항목 체크리스트(자유·있음·권장·미기입)와 소재 프레임 치수·추출 메모, 우리 값은 \`core/media/*.json\`. **값은 바꾸지 않았다** — 불일치·확인 필요는 아래 목록으로만 둔다.\n\n`;
md += `## 요약\n- 규격 ${rows.length} = ${EXTRACT.order.map(mid => `${MEDIA.find(m => m.id === mid).name} ${countsByMedium[mid]}`).join(' · ')}\n`;
md += `- 칸 ${rows.length * ITEMS.length}: ✓ 일치 ${tally['일치']} · ✗ 불일치 ${tally['불일치']} · ? 확인 필요 ${tally['확인 필요']}\n`;
md += `- 항목별: ${ITEMS.map(i => `${i} ✓${byItem[i]['일치']}/✗${byItem[i]['불일치']}/?${byItem[i]['확인 필요']}`).join(' · ')}\n\n`;
md += `판정 규칙은 \`core/checklist8.js\` 머리말에 있다. 요지: 사이즈·추출은 숫자를 실제로 견줌 / 나머지 6칸은 보드 「자유」면 일치(우리 값은 템플릿 참고값), 「있음·권장」이면 우리 값이 있어야 일치, 보드 미기입(자소설·리멤버·에브리타임·블라인드·당근 칸)이면 확인 필요.\n\n`;

md += `## 47 매칭표 (규격 ↔ 보드 프레임)\n| # | 매체 | 규격 id | 우리 치수 | 보드 프레임 | 상태 |\n|---|---|---|---|---|---|\n`;
rows.forEach((r, i) => { const { s } = specOf.get(r.id); md += `| ${i + 1} | ${r.mediumName} | \`${r.id}\` | ${sizeKey(s.w, s.h)}${s.exportScale > 1 ? ` ×${s.exportScale}` : ''} | ${r.boardFrames ? `${r.boardFrames.size} · ${r.boardFrames.frames}개 (${r.boardFrames.ids.join(', ')}${r.boardFrames.names.length ? ' — ' + r.boardFrames.names.join(' / ') : ''})` : '없음'} | ${r.boardFrames ? (r.boardFrames.size.startsWith(sizeKey(s.w, s.h)) || r.boardFrames.size.includes('제출') ? '✓' : '✗') : '?'} |\n`; });

md += `\n## 보드에만 있는 치수 (추출 47 밖)\n| 매체 | 치수 | 우리 참고 규격에 있나 | 보드 프레임 |\n|---|---|---|---|\n`;
for (const b of Object.values(boardOnly)) md += `| ${MEDIA.find(m => m.id === b.medium)?.name ?? b.medium} | ${b.size} | ${b.inOurRef ? '있음(참고)' : '없음'} | ${short(b.frames.slice(0, 3).join(' · '), 110)}${b.frames.length > 3 ? ` 외 ${b.frames.length - 3}` : ''} |\n`;
md += `\n## 우리에만 있는 규격 (참고 규격 ${oursOnly.length})\n| 매체 | 규격 id | 치수 | 보드에 같은 치수 | 상태 |\n|---|---|---|---|---|\n`;
for (const o of oursOnly) md += `| ${MEDIA.find(m => m.id === o.medium)?.name ?? o.medium} | \`${o.id}\` | ${o.size} | ${o.onBoard ? '있음' : '없음'} | ${o.confidence}${o.deliverable ? '' : ' · 전달 자료만'} |\n`;

md += `\n## 불일치 (${mismatches.length})\n`;
md += mismatches.length ? `| 규격 | 항목 | 보드 | 우리 | 왜 |\n|---|---|---|---|---|\n` + mismatches.map(x => `| \`${x.id}\` | ${x.item} | ${short(x.board)} | ${short(x.ours)} | ${short(x.why, 90)} |\n`).join('') : '없음\n';
md += `\n## 확인 필요 (${reviews.length})\n| 규격 | 항목 | 보드 | 우리 | 왜 |\n|---|---|---|---|---|\n` + reviews.map(x => `| \`${x.id}\` | ${x.item} | ${short(x.board, 50)} | ${short(x.ours, 60)} | ${short(x.why, 70)} |\n`).join('');

md += `\n## 규격별 8항목 (고정 → 자유 순)\n`;
for (const mid of EXTRACT.order) {
  const m = MEDIA.find(x => x.id === mid);
  const c = EXTRACT.board?.checklist?.[mid];
  md += `\n### ${m.name} (${countsByMedium[mid]}) — 보드 칸 ${c ? c.node : '체크리스트 미기입'}${c?.note ? ` · ${c.note}` : ''} · 수 메모 ${EXTRACT.board?.countMemo?.[mid] ?? '-'}\n`;
  for (const r of rows.filter(r => r.medium === mid)) {
    const { s } = specOf.get(r.id);
    md += `\n#### \`${r.id}\` — ${r.name} (${r.confidence})\n| 항목 | 보드 | 우리 | 판정 |\n|---|---|---|---|\n`;
    for (const it of orderedChecklist8(s, m, { boardSize: r.boardFrames })) md += `| ${it.fixed ? '**' + it.item + '**' : it.item} | ${short(it.board, 80)} | ${short(it.ours, 90)} | ${V[it.verdict]}${it.why ? ' — ' + short(it.why, 60) : ''} |\n`;
  }
}
writeFileSync(join(root, 'docs', 'spec-matrix.md'), md);
console.log(`spec-matrix: 규격 ${rows.length} · 칸 ${rows.length * ITEMS.length} → 일치 ${tally['일치']} · 불일치 ${tally['불일치']} · 확인 필요 ${tally['확인 필요']} · 보드에만 ${Object.keys(boardOnly).length}치수 · 우리에만 ${oursOnly.length}규격`);
