// 11-17 LINE 로고 — 글자가 그림 끝까지 꽉 찬 흰 바탕 로고(모서리만 둥글게 흰색)를
// 2% 안쪽 모서리 색(글자색)으로 바탕을 잡아 글자를 지우던 것. 진짜 모서리 색이 바탕이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knockoutLogo, prepLogoRGBA } from '../core/logo.js';

const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };
const W = 300, H = 100, GREEN = [0, 185, 0], WHITE = [255, 255, 255];
// 네 글자 기둥이 위아래 끝까지 닿고, 맨 바깥 기둥은 좌우 끝에도 닿는다. 기둥 모서리는 둥글어 진짜 모서리(0,0 …)만 흰색
const line = () => img(W, H, (x, y) => {
  const col = (x < 60) || (x >= 80 && x < 130) || (x >= 150 && x < 220) || (x >= 240);
  const corner = (x < 2 || x >= W - 2) && (y < 2 || y >= H - 2);   // 2% 안쪽 점(2,2)은 글자 위에 떨어진다
  return col && !corner ? GREEN : WHITE;
});

test('글자가 끝까지 꽉 찬 로고: 흰 바탕을 지우고 초록 글자는 남긴다(11-17 LINE)', () => {
  const d = line(); const k = knockoutLogo(d, W, H);
  assert.ok(k, '바탕을 찾는다');
  assert.equal(k.bg, '#FFFFFF');
  assert.equal(d[(50 * W + 30) * 4 + 3], 255, '글자는 그대로');
  assert.equal(d[(50 * W + 70) * 4 + 3], 0, '글자 사이 흰 틈은 투명');
  const p = prepLogoRGBA(line(), W, H);
  assert.equal(p.meta.tone, 'dark', '흰색 로고로 읽지 않는다');
});

test('1px 테두리 선만 검정인 로고는 테두리 선을 바탕으로 보지 않는다(예전과 같게)', () => {
  const d = img(W, H, (x, y) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? [0, 0, 0] : (x > 100 && x < 200 && y > 30 && y < 70) ? GREEN : WHITE);
  const k = knockoutLogo(d, W, H);
  assert.ok(k === null || k.bg !== '#000000', JSON.stringify(k));
});
