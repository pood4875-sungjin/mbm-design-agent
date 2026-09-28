#!/usr/bin/env node
// core/media/*.json → core/media.js
//
// 매체 규정은 데이터다(불변식 ⑤). 사람이 고치는 원본은 매체별 JSON 한 파일씩이고,
// 브라우저·테스트가 한 번에 읽도록 이 스크립트가 하나의 ESM으로 묶는다.
// core/media.js 는 생성물이다 — 직접 고치지 말고 JSON을 고친 뒤 다시 돌린다.
//
//   node scripts/build-media.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'core', 'media');
const out = join(root, 'core', 'media.js');

const GROUP_ORDER = ['채용포털', '디지털', '커뮤니티', '기타'];

const media = readdirSync(srcDir)
  .filter(f => f.endsWith('.json'))
  .map(f => {
    const m = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
    if (m.id !== f.replace(/\.json$/, '')) throw new Error(`${f}: id "${m.id}"가 파일명과 다르다`);
    return m;
  })
  .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name, 'ko'));

// 규격 id는 전체에서 유일해야 한다 — 산출물 key로 쓰인다.
const seen = new Map();
for (const m of media) for (const s of m.specs ?? []) {
  if (seen.has(s.id)) throw new Error(`규격 id 중복: ${s.id} (${seen.get(s.id)} / ${m.id})`);
  seen.set(s.id, m.id);
}

const counts = {
  media: media.length,
  specs: media.reduce((n, m) => n + (m.specs?.length ?? 0), 0),
  needsReview: media.reduce((n, m) => n + (m.needsReview?.length ?? 0), 0),
  conflicts: media.reduce((n, m) => n + (m.conflicts?.length ?? 0), 0),
  rejections: media.reduce((n, m) => n + (m.rejections?.length ?? 0), 0),
};

const header = `// 생성 파일 — 직접 고치지 말 것. 원본: core/media/*.json, 빌드: node scripts/build-media.mjs
// 매체 ${counts.media} · 규격 ${counts.specs} · 확인필요 ${counts.needsReview} · 충돌 ${counts.conflicts} · 반려사례 ${counts.rejections}
// 출처: [SK추진실] 광고소재제작가이드_260918.zip + Figma "매체별 규격정리" 보드 (2026-09-28 추출)
`;

const body = `${header}
export const MEDIA = ${JSON.stringify(media, null, 2)};

export const MEDIA_GROUPS = ${JSON.stringify(GROUP_ORDER)};

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
console.log(`core/media.js ← ${counts.media} media, ${counts.specs} specs, ${counts.needsReview} needsReview, ${counts.conflicts} conflicts`);
