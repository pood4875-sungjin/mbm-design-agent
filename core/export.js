// 출력 변환 (PRD F8) — macOS Chrome headless CLI. npm 의존성 0 유지.
// Chrome 없으면 null 반환 — HTML 파일 자체가 폴백 산출물.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

export function findChrome() {
  return CANDIDATES.find(p => existsSync(p)) ?? null;
}

function run(chrome, args) {
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', ...args], { stdio: 'ignore', timeout: 60000 });
}

export function exportPng(htmlPath, outPath, w, h) {
  const chrome = findChrome();
  if (!chrome) return null;
  run(chrome, [`--screenshot=${resolve(outPath)}`, `--window-size=${w},${h}`, `file://${resolve(htmlPath)}`]);
  return outPath;
}

export function exportPdf(htmlPath, outPath) {
  const chrome = findChrome();
  if (!chrome) return null;
  run(chrome, [`--print-to-pdf=${resolve(outPath)}`, '--no-pdf-header-footer', `file://${resolve(htmlPath)}`]);
  return outPath;
}
