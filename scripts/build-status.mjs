#!/usr/bin/env node
// docs/status.json (손으로 관리하는 진행 상태) + 저장소에서 센 숫자 → docs/status.html (과제 현황판)
//
// 판은 파일 하나로 열린다 — 서버가 꺼져 있어도 더블클릭으로 본다. 그래서 데이터를 페이지 안에 구워 넣는다.
// 목표·KPI·월별 계획은 과제 문서에서 옮긴 값이고, 진행 상태만 status.json 에서 고친다.
// 매체·규격·확인 필요 수와 테스트 결과는 사람이 적지 않는다 — 만들 때마다 저장소에서 다시 센다.
//
//   node scripts/build-status.mjs            테스트까지 돌려서 센다 (약 10초)
//   node scripts/build-status.mjs --no-test  테스트는 건너뛴다

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const status = JSON.parse(readFileSync(join(root, 'docs', 'status.json'), 'utf8'));
const { MEDIA_COUNTS } = await import(join(root, 'core', 'media.js'));
const { adSpecEntries, adSpecGroups } = await import(join(root, 'core', 'adspecs.js'));
const sh = cmd => execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const live = {
  media: MEDIA_COUNTS.media,
  specs: MEDIA_COUNTS.specs,
  needsReview: MEDIA_COUNTS.needsReview,
  conflicts: MEDIA_COUNTS.conflicts,
  renderable: Object.keys(adSpecEntries()).length,
  creatives: adSpecGroups().length,
  commits: Number(sh('git rev-list --count HEAD')),
  lastCommit: sh('git log -1 --date=short --pretty=%ad'),
  tests: null, testsFail: null,
};

if (!process.argv.includes('--no-test')) {
  let out = '';
  try { out = sh('node --test 2>&1'); } catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
  const num = k => Number(out.match(new RegExp(`^ℹ ${k} (\\d+)`, 'm'))?.[1] ?? NaN);
  if (Number.isFinite(num('pass'))) { live.tests = num('pass'); live.testsFail = num('fail'); }
}

const d = new Date();
const builtAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// </script> 가 데이터 안에 들어가도 페이지가 깨지지 않게 '<' 를 이스케이프한다
const data = JSON.stringify({ status, live, builtAt }).replace(/</g, '\\u003c');
const html = readFileSync(join(root, 'docs', 'status.template.html'), 'utf8').replace('/*DATA*/', () => data);
writeFileSync(join(root, 'docs', 'status.html'), html);
console.log(`docs/status.html ← 기준일 ${status.asOf} · 매체 ${live.media} · 규격 ${live.specs} · 소재 ${live.creatives}종 · 테스트 ${live.tests ?? '건너뜀'}${live.testsFail ? ` (실패 ${live.testsFail})` : ''}`);
