import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveDpi, requiredDpi, assessImage, assessForSpecs, DPI } from '../core/imagequality.js';
import { SPECS } from '../core/contract.js';

test('required density drops as the viewing distance grows', () => {
  assert.equal(requiredDpi(SPECS['badge-110x140']), DPI.press, '명찰은 손에 들고 본다');
  assert.equal(requiredDpi(SPECS['xbanner-600x1800']), DPI.large, 'X배너는 몇 걸음 밖');
  assert.equal(requiredDpi(SPECS['hyunsumak-4000x900']), DPI.huge, '현수막은 수 미터 밖');
  assert.equal(requiredDpi(SPECS['banner-300x250']), DPI.screen, '화면물은 규격 그대로');
});

test('effective dpi is limited by the tighter axis', () => {
  // A2 + 블리드 = 426×600mm = 16.77×23.62in
  const dpi = effectiveDpi(2000, 2000, SPECS['poster-a2']);
  assert.equal(dpi, Math.floor(2000 / (600 / 25.4)), '세로가 더 길어 세로가 품질을 정한다');
});

test('a big enough image passes', () => {
  const a = assessImage(6000, 8000, SPECS['poster-a2']);
  assert.equal(a.level, 'ok');
  assert.match(a.text, /충분합니다/);
});

test('a slightly small image is reported as fixable with a target size', () => {
  // 명찰은 300dpi를 요구한다 — 1000×1300은 조금 모자라 리샘플링으로 메울 수 있는 구간
  const a = assessImage(1000, 1300, SPECS['badge-110x140']);
  assert.equal(a.level, 'fixable');
  assert.ok(a.targetW > 1000 && a.targetH > 1300);
  assert.match(a.text, /키우면 기준을 채웁니다/);
});

test('an A2 poster is judged at viewing distance, not press standard', () => {
  const a = assessImage(3000, 4000, SPECS['poster-a2']);
  assert.equal(a.need, DPI.large, '600mm 규격은 150dpi 기준');
  assert.equal(a.level, 'ok', '169dpi면 포스터엔 충분하다');
});

test('a hopeless image says to fetch the original instead of upscaling', () => {
  const a = assessImage(400, 300, SPECS['poster-a2']);
  assert.equal(a.level, 'hopeless');
  assert.match(a.text, /원본 이미지를 받는 편이 낫습니다/);
});

test('campaign assessment reports the tightest spec', () => {
  const specs = [SPECS['banner-300x250'], SPECS['badge-110x140'], SPECS['hyunsumak-4000x900']];
  const a = assessForSpecs(1200, 1200, specs);
  // 요구 dpi가 아니라 "요구 대비 실제 비율"이 가장 나쁜 규격을 잡아야 한다.
  // 현수막은 요구가 낮지만(72) 실측이 7dpi라 비율로는 가장 나쁘다.
  assert.equal(a.spec.channel, 'hyunsumak');
  assert.equal(a.level, 'hopeless');
});

test('screen-only campaigns skip the print judgement', () => {
  assert.equal(assessForSpecs(100, 100, [SPECS['banner-300x250']]).level, 'na');
});
