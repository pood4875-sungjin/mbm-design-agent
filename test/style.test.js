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

/* ── 키비주얼 → 컬러 배치 ──
   주색 하나만 이미지에서 뽑고 보조·포인트를 색상환에서 돌려 만들면
   이미지에 없던 색이 산출물에 올라와 키비주얼과 따로 논다. */

const pxOf = (w, h, fn) => {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y); const i = (y * w + x) * 4;
    a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = 255;
  }
  return a;
};

test('extractPalette returns distinct colors, not three shades of one', async () => {
  const { extractPalette } = await import('../core/palette.js');
  // 파랑이 넓게 깔리고(미세하게 다른 두 톤) 주황·초록이 조금씩 섞인 이미지
  const rgba = pxOf(40, 40, (x, y) => {
    if (y < 24) return x % 2 ? [20, 80, 200] : [24, 86, 206];   // 거의 같은 파랑 두 가지
    if (y < 32) return [230, 120, 20];
    return [30, 170, 90];
  });
  const out = extractPalette(rgba, 3);
  assert.equal(out.length, 3);
  const hue = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    return (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  };
  const hues = out.map(hue).sort((a, b) => a - b);
  for (let i = 1; i < hues.length; i++) {
    assert.ok(hues[i] - hues[i - 1] > 0.06, `색상환에서 겹치는 색이 있다: ${out.join(', ')}`);
  }
});

test('key visual colors fill all three roles instead of one plus hue rotation', async () => {
  const { rolesFromKeyVisual } = await import('../core/palette.js');
  const kv = ['#1B50C8', '#E67814', '#1EAA5A'];
  assert.deepEqual(rolesFromKeyVisual(kv), ['#1B50C8', '#E67814', '#1EAA5A'],
    '뽑은 색 셋이 그대로 주색·보조·포인트가 된다');
  // 포인트는 남은 후보 중 채도가 가장 높은 색 — 작은 면적에서 눈에 띄어야 한다
  assert.equal(rolesFromKeyVisual(['#1B50C8', '#E67814', '#8A8F70', '#FF2D00'])[2], '#FF2D00');
});

test('when the key visual yields too few colors, roles stay in the same family', async () => {
  const { rolesFromKeyVisual, hexToRgb, rgbToHsl } = await import('../core/palette.js');
  const hue = hex => rgbToHsl(hexToRgb(hex))[0];
  const one = rolesFromKeyVisual(['#1B50C8']);
  assert.equal(one.length, 3);
  assert.equal(one[0], '#1B50C8');
  for (const c of one.slice(1)) {
    const d = Math.abs(hue(c) - hue('#1B50C8'));
    // 보색(+176°)로 튀면 이미지에 없던 색이 된다 — 40° 안쪽에 머물러야 한다
    assert.ok(Math.min(d, 1 - d) < 40 / 360, `${c}는 키비주얼에서 너무 멀다`);
  }
  assert.equal(new Set(one).size, 3, '세 자리가 같은 색이면 위계가 사라진다');
  assert.equal(rolesFromKeyVisual([]), null, '뽑은 색이 없으면 배치할 것도 없다');
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
  assert.equal(bright.text, '#000000', '밝은 배경엔 검은 글자');

  const busy = analyzeRegion(px(20, 20, (x, y) => ((x + y) % 2 ? [10, 10, 10] : [250, 250, 250])), 20, 20, box);
  assert.equal(busy.scrim, true, '명암 편차가 크면 가림막을 켠다');
});
