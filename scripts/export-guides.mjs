#!/usr/bin/env node
// 광고 소재 가이드 페이지 3종을 "파일 하나로 열리는" HTML로 묶는다 — 서버 없이 더블클릭으로 연다.
//
//   docs/media-rules.html   → 1_매체 규격 레퍼런스.html
//   docs/design-guide.html  → 2_매체 디자인 기준.html
//   docs/media-check.html   → 3_규격 적합 검사.html
//
// 페이지가 부르는 ../core·../app 모듈을 전부 읽어 data: URL로 바꾸고 import map으로 이어 붙인다.
// (file:// 에서는 다른 파일의 모듈을 불러올 수 없다 — 페이지 안에 다 들어 있어야 한다.)
// 모듈 안의 상대 경로 import는 "guide/<저장소 경로>" 이름으로 바꾼다. 브라우저는 import map에서 그 이름을 찾는다.
// 글꼴(Pretendard)은 CDN 링크 그대로 — 인터넷이 없으면 시스템 글꼴로 보인다.
//
//   node scripts/export-guides.mjs [내보낼 폴더]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = new Date();
const stamp = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const outDir = resolve(process.argv[2] ?? join(homedir(), 'Downloads', `광고소재 가이드_${stamp}`));

const PAGES = [
  { src: 'docs/media-rules.html', out: '1_매체 규격 레퍼런스.html' },
  { src: 'docs/design-guide.html', out: '2_매체 디자인 기준.html' },
  { src: 'docs/media-check.html', out: '3_규격 적합 검사.html' },
];
const RENAME = Object.fromEntries(PAGES.map(p => [p.src.split('/').pop(), p.out]));

// import·export ... from '…' 와 import('…') 의 경로를 찾는다
const SPEC = /((?:import|export)\s[^'"]*?from\s*|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g;
const keyOf = abs => 'guide/' + relative(root, abs).split('\\').join('/');

function bundle(htmlPath) {
  const html = readFileSync(join(root, htmlPath), 'utf8');
  const base = dirname(join(root, htmlPath));
  const mods = new Map();   // key → source (경로를 바꾼 뒤)
  const visit = abs => {
    const key = keyOf(abs);
    if (mods.has(key)) return key;
    mods.set(key, '');
    const src = readFileSync(abs, 'utf8').replace(SPEC, (m, pre, q, spec) => `${pre}${q}${visit(resolve(dirname(abs), spec))}${q}`);
    mods.set(key, src);
    return key;
  };
  let page = html.replace(/<script type="module">([\s\S]*?)<\/script>/g, (m, code) =>
    `<script type="module">${code.replace(SPEC, (mm, pre, q, spec) => `${pre}${q}${visit(resolve(base, spec))}${q}`)}</script>`);
  const map = { imports: Object.fromEntries([...mods].map(([k, src]) => [k, 'data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64')])) };
  // import map은 첫 모듈 스크립트보다 앞에 있어야 한다
  page = page.replace('<script type="module">', `<script type="importmap">${JSON.stringify(map)}</script>\n<script type="module">`);
  // 세 페이지끼리의 링크는 내보낸 파일 이름으로
  page = page.replace(/href="([a-z-]+\.html)"/g, (m, f) => RENAME[f] ? `href="${encodeURI(RENAME[f])}"` : m);
  return { page, modules: mods.size };
}

mkdirSync(outDir, { recursive: true });
for (const p of PAGES) {
  const { page, modules } = bundle(p.src);
  writeFileSync(join(outDir, p.out), page);
  console.log(`${p.out}  ←  ${p.src}  (모듈 ${modules}개, ${Math.round(Buffer.byteLength(page) / 1024)}KB)`);
}
console.log(outDir);
