#!/usr/bin/env node
// 학습한 소재 목록 — ref/learned/index.json (로컬 전용. ref/ 는 git·공개 배포에서 빠진다: 실제 고객사 소재다)
//
//   user  사용자가 "이렇게 만들어 달라"고 준 레퍼런스(core/layouts.js LAYOUT_REFS) — 형태별 레이아웃 값의 출처
//   board 피그마 「컨시어지」 보드에서 관찰한 실제 소재(core/design/*.json) — 매체별 디자인 경향의 출처
// 앱은 이 파일이 있으면 갤러리에 그림을 보여 주고, 없으면(공개 주소) 이름만 보여 준다.
//
//   node scripts/build-ref-index.mjs [보드 캡처 폴더]

import { readdirSync, readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUT_REFS, shapeOf } from '../core/layouts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'ref', 'learned');
const shots = process.argv[2] ?? null;
mkdirSync(join(out, 'board'), { recursive: true });

const user = Object.entries(LAYOUT_REFS).flatMap(([shape, list]) => list.map(r => ({ ...r, shape, src: `user13/${r.file}`, have: existsSync(join(out, 'user13', r.file)) })));

const NAMES = Object.fromEntries((await import('../core/media.js')).MEDIA.map(m => [m.id, m.name]));
const board = [];
for (const f of readdirSync(join(root, 'core', 'design')).filter(f => f.endsWith('.json')).sort()) {
  const d = JSON.parse(readFileSync(join(root, 'core', 'design', f), 'utf8'));
  for (const e of d.examples ?? []) {
    const m = String(e.spec ?? '').match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/);
    const w = m ? +m[1] : null, h = m ? +m[2] : null;
    const file = `${String(e.nodeId).replace(':', '-')}.png`;
    if (shots && existsSync(join(shots, file)) && !existsSync(join(out, 'board', file))) copyFileSync(join(shots, file), join(out, 'board', file));
    board.push({ node: e.nodeId, client: e.client ?? '', medium: d.medium, mediumName: NAMES[d.medium] ?? d.medium, spec: e.spec ?? '', w, h,
      shape: w && h ? shapeOf(w, h) : null, src: `board/${file}`, have: existsSync(join(out, 'board', file)) });
  }
}
writeFileSync(join(out, 'index.json'), JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), user, board }, null, 1));
console.log(`ref/learned/index.json ← 사용자 레퍼런스 ${user.length}(그림 ${user.filter(x => x.have).length}) · 보드 소재 ${board.length}(그림 ${board.filter(x => x.have).length})`);
