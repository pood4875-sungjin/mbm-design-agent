import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle } from '../core/style.js';

test('normalizeStyle produces the standard structure from designer input', () => {
  const s = normalizeStyle({
    keyVisual: 'assets/kv.png',
    colors: ['#0A3D91', '#F5F7FA'],
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    logo: 'assets/logo.svg',
    mood: ['테크', '신뢰'],
  });
  assert.equal(s.keyVisual, 'assets/kv.png');
  assert.equal(s.palette.primary, '#0A3D91');
  assert.equal(s.palette.secondary, '#F5F7FA', '두 번째 색은 보조색');
  assert.equal(s.palette.bg, '#FFFFFF', '지면색은 모드가 정한다');
  assert.equal(s.palette.onPrimary, '#FFFFFF', '주색 위 글자색은 대비로 자동 결정');
  assert.equal(s.fonts.heading, 'Pretendard');
  assert.deepEqual(s.mood, ['테크', '신뢰']);
});

test('normalizeStyle applies defaults for omitted fields', () => {
  const s = normalizeStyle({ colors: ['#FF5500'] });
  assert.equal(s.keyVisual, null);
  assert.equal(s.palette.primary, '#FF5500');
  assert.equal(s.palette.bg, '#FFFFFF');
  assert.ok(s.palette.secondary && s.palette.accent, '빈 자리는 파생색으로 채운다');
  assert.equal(s.fonts.heading, 'Pretendard');
});

test('normalizeStyle rejects invalid hex colors', () => {
  assert.throws(() => normalizeStyle({ colors: ['blue'] }), /hex/i);
});

test('analyzeRegion picks readable text color and flags busy backgrounds', async () => {
  const { analyzeRegion } = await import('../core/palette.js');
  const px = (w, h, fn) => {
    const a = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y); const i = (y * w + x) * 4;
      a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = 255;
    }
    return a;
  };
  const box = { x: 0, y: 0, w: 1, h: 1 };
  const dark = analyzeRegion(px(20, 20, () => [20, 20, 30]), 20, 20, box);
  assert.equal(dark.text, '#FFFFFF', '어두운 배경엔 흰 글자');
  assert.equal(dark.scrim, false, '균일하고 어두우면 가림막 불필요');

  const bright = analyzeRegion(px(20, 20, () => [240, 240, 235]), 20, 20, box);
  assert.equal(bright.text, '#111111', '밝은 배경엔 검은 글자');

  const busy = analyzeRegion(px(20, 20, (x, y) => ((x + y) % 2 ? [10, 10, 10] : [250, 250, 250])), 20, 20, box);
  assert.equal(busy.scrim, true, '명암 편차가 크면 가림막을 켠다');
});
