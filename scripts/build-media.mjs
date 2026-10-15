#!/usr/bin/env node
// core/media/*.json + core/media-board.json → core/media.js
//
// 매체 규정은 데이터다(불변식 ⑤). 사람이 고치는 원본은 매체별 JSON 한 파일씩이고,
// 브라우저·테스트가 한 번에 읽도록 이 스크립트가 하나의 ESM으로 묶는다.
// core/media.js 는 생성물이다 — 직접 고치지 말고 JSON을 고친 뒤 다시 돌린다.
//
// 매체 순서와 그룹은 Figma 보드 구조(core/media-board.json)를 따른다: 01 채용포털 → 02 디지털 → 03 커뮤니티 → 보드 밖.
// 규칙·규격·반려 사례마다 보드의 어느 프레임에서 왔는지(frame)를 출처로 판단해 붙인다 — 프레임 단위로 대조하기 위해서다.
//   memo 섹션 메모 · rules 01 소재 제작 규정 · guide 02 제작가이드&예시 · rejects 반려 이슈 사례 · off 보드 밖 자료(PDF·PSD 등)
//
//   node scripts/build-media.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'core', 'media');
const out = join(root, 'core', 'media.js');

const OFF_GROUP = '기타';
const board = JSON.parse(readFileSync(join(root, 'core', 'media-board.json'), 'utf8'));
const GROUP_ORDER = [...board.groups.map(g => g.name), OFF_GROUP];
const FRAME_KEYS = Object.keys(board.frames);

// 추출 목록(_extract.json): 이미지로 뽑는 규격 47 + 매체 순서. 매체 JSON 이 아니라 '_' 로 시작한다
const extractCfg = JSON.parse(readFileSync(join(srcDir, '_extract.json'), 'utf8'));
const EXTRACT_SET = new Set(extractCfg.extract);

const byId = new Map(readdirSync(srcDir)
  .filter(f => f.endsWith('.json') && !f.startsWith('_'))
  .map(f => {
    const m = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
    if (m.id !== f.replace(/\.json$/, '')) throw new Error(`${f}: id "${m.id}"가 파일명과 다르다`);
    return [m.id, m];
  }));

// 보드 순서대로 늘어놓는다. 매체 JSON은 보드나 보드 밖 목록 어디엔가 꼭 한 번 있어야 한다.
const placed = new Set();
const place = (id, group) => {
  const m = byId.get(id);
  if (!m) throw new Error(`media-board.json: 매체 "${id}"의 JSON이 없다`);
  if (placed.has(id)) throw new Error(`media-board.json: 매체 "${id}"가 두 번 있다`);
  placed.add(id);
  return { ...m, group };
};
const media = [
  ...board.groups.flatMap(g => g.media.map(b => {
    for (const k of Object.keys(b.frames)) if (!FRAME_KEYS.includes(k)) throw new Error(`media-board.json: ${b.id}의 프레임 "${k}"는 없는 칸이다`);
    return place(b.id, g.name);
  })),
  ...board.offBoard.media.map(id => place(id, OFF_GROUP)),
];
for (const id of byId.keys()) if (!placed.has(id)) throw new Error(`media-board.json: 매체 "${id}"가 보드에도 보드 밖 목록에도 없다`);

// 출처 → 보드 프레임. 출처가 여럿 이어 붙어 있으면 첫 출처로 판단한다.
function frameOf(source, fallback) {
  const first = String(source ?? '').split(/\s+\/\s+|\s+\+\s+/)[0];
  if (!/^figma/.test(first)) return 'off';
  if (/섹션.*메모/.test(first)) return 'memo';
  if (/반려/.test(first)) return 'rejects';
  if (/02\(/.test(first)) return 'guide';
  if (/01/.test(first)) return 'rules';
  return fallback;
}
for (const m of media) {
  for (const r of m.common ?? []) r.frame = frameOf(r.source, 'rules');
  // 규격은 01(글자 규정)과 02(규격별 예시 프레임)에 걸쳐 있는 일이 많다 — 02가 따로 있고 출처에 02가 있으면 02에 둔다
  for (const s of m.specs ?? []) s.frame = /02\(/.test(s.source ?? '') ? 'guide' : frameOf(s.source, 'rules');
  for (const r of m.rejections ?? []) r.frame = frameOf(r.source, 'rejects') === 'off' ? 'off' : 'rejects';
}

// 규격 id는 전체에서 유일해야 한다 — 산출물 key로 쓰인다.
const seen = new Map();
for (const m of media) for (const s of m.specs ?? []) {
  if (seen.has(s.id)) throw new Error(`규격 id 중복: ${s.id} (${seen.get(s.id)} / ${m.id})`);
  seen.set(s.id, m.id);
  // 추출 규격인가 — 목록에 있으면 true, 아니면 false(참고 규격). 목록에만 있고 JSON 에 없는 id 는 아래서 막는다
  s.extract = EXTRACT_SET.has(s.id);
}
for (const id of EXTRACT_SET) if (!seen.has(id)) throw new Error(`_extract.json: 규격 "${id}"가 매체 JSON 에 없다`);
for (const id of extractCfg.order) if (!byId.has(id)) throw new Error(`_extract.json order: 매체 "${id}"의 JSON이 없다`);

const counts = {
  media: media.length,
  specs: media.reduce((n, m) => n + (m.specs?.length ?? 0), 0),
  extract: media.reduce((n, m) => n + (m.specs ?? []).filter(s => s.extract).length, 0),
  needsReview: media.reduce((n, m) => n + (m.needsReview?.length ?? 0), 0),
  conflicts: media.reduce((n, m) => n + (m.conflicts?.length ?? 0), 0),
  rejections: media.reduce((n, m) => n + (m.rejections?.length ?? 0), 0),
};
// 검수 진행 — 보드에 실제로 있는 프레임(01에 합쳐진 02는 빼고)만 센다
const frames = board.groups.flatMap(g => g.media.flatMap(b => Object.values(b.frames).filter(f => f && !f.same)));
counts.frames = frames.length;
counts.framesDone = frames.filter(f => f.review?.status === 'done').length;

const header = `// 생성 파일 — 직접 고치지 말 것. 원본: core/media/*.json, 빌드: node scripts/build-media.mjs
// 매체 ${counts.media} · 규격 ${counts.specs}(추출 ${counts.extract}) · 확인필요 ${counts.needsReview} · 충돌 ${counts.conflicts} · 반려사례 ${counts.rejections}
// 출처: [SK추진실] 광고소재제작가이드_260918.zip + Figma "매체별 규격정리" 보드 (2026-09-28 추출)
// 보드 검수 ${counts.framesDone}/${counts.frames} 프레임
`;

const body = `${header}
export const MEDIA = ${JSON.stringify(media, null, 2)};

export const MEDIA_GROUPS = ${JSON.stringify(GROUP_ORDER)};

// 추출 규격 — 이미지로 뽑아 전달하는 규격 ${counts.extract}개(사용자 「컨시어지」 보드 목록)와 매체 순서. 나머지는 참고 규격.
export const EXTRACT = ${JSON.stringify({ order: extractCfg.order, counts: extractCfg.counts, ids: extractCfg.extract, source: extractCfg.source, decisions: extractCfg.decisions, board: extractCfg.board ?? null }, null, 2)};

// Figma 보드 구조 — 그룹 → 매체 → 프레임(01 규정 · 02 가이드&예시 · 반려 사례)과 프레임별 검수 기록
export const MEDIA_BOARD = ${JSON.stringify(board, null, 2)};

export function mediumOf(specId) {
  for (const m of MEDIA) for (const s of m.specs) if (s.id === specId) return m;
  return null;
}

export function specOf(specId) {
  for (const m of MEDIA) for (const s of m.specs) if (s.id === specId) return s;
  return null;
}

export const MEDIA_COUNTS = ${JSON.stringify(counts)};
`;

writeFileSync(out, body);
console.log(`core/media.js ← ${counts.media} media, ${counts.specs} specs (extract ${counts.extract}), ${counts.needsReview} needsReview, ${counts.conflicts} conflicts · 보드 검수 ${counts.framesDone}/${counts.frames}`);
