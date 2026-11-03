import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whitenLogo } from '../core/logo.js';

test('원색 로고를 흰색으로: 모양(알파)은 그대로, 색만 흰색', () => {
  const d = new Uint8ClampedArray([20, 40, 200, 255, 0, 0, 0, 0, 200, 10, 10, 128, 0, 0, 0, 0]);
  assert.deepEqual([...whitenLogo(d)], [255, 255, 255, 255, 255, 255, 255, 0, 255, 255, 255, 128, 255, 255, 255, 0]);
});

test('투명 배경이 없는 로고(상자째)는 흰 사각형이 되므로 만들지 않는다', () => {
  assert.equal(whitenLogo(new Uint8ClampedArray([10, 10, 10, 255, 20, 20, 20, 255])), null);
});
