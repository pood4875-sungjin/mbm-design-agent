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

test('logo leads the primary colour; the key visual fills the rest', async () => {
  const { rolesFromSources } = await import('../core/palette.js');
  const logo = ['#E4002B'], kv = ['#1B50C8', '#E67814', '#1EAA5A'];
  const both = rolesFromSources({ logo, kv });
  assert.equal(both[0], '#E4002B', '주색은 로고 — 브랜드 색이 지면 색이 된다');
  assert.equal(both[1], '#1B50C8', '보조는 키비주얼에서');
  assert.ok(kv.includes(both[2]), '포인트도 키비주얼에서');
  assert.deepEqual(rolesFromSources({ logo: [], kv }), ['#1B50C8', '#E67814', '#1EAA5A'], '로고가 무채색이면 키비주얼이 전부 맡는다');
  assert.equal(rolesFromSources({ logo, kv: [] })[0], '#E4002B', '로고만 있으면 로고 색으로 세 자리');
  assert.equal(rolesFromSources({ logo, kv: [] }).length, 3);
  assert.deepEqual(rolesFromSources({ logo, kv, lead: 'kv' }), ['#1B50C8', '#E67814', '#1EAA5A'], '키비주얼 색을 주색으로 고르면 키비주얼이 맡는다');
  assert.equal(rolesFromSources({ logo: [], kv: [] }), null, '뽑은 색이 없으면 배치할 것도 없다');
});

test('a key visual colour that repeats the logo colour is not used twice', async () => {
  const { rolesFromSources } = await import('../core/palette.js');
  const r = rolesFromSources({ logo: ['#1B50C8'], kv: ['#1C52CA', '#E67814'] });
  assert.equal(r[0], '#1B50C8');
  assert.equal(r[1], '#E67814', '로고와 거의 같은 키비주얼 색은 건너뛴다');
});

test('the field colour is read from the image edge: flat edge → one colour, graded edge → two, busy or cut-out edge → flagged', async () => {
  const { fieldFromImage } = await import('../core/palette.js');
  const W = 40, H = 30;
  const img = fn => { const a = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, g, b, al = 255] = fn(x, y); a.set([r, g, b, al], (y * W + x) * 4); } return a; };
  const flat = fieldFromImage(img(() => [18, 58, 107]), W, H);
  assert.equal(flat.edges.left.from, '#123A6B'); assert.equal(flat.edges.left.to, '#123A6B');
  assert.equal(flat.edges.left.opaque, 1); assert.ok(flat.edges.left.rough < 0.01);
  const graded = fieldFromImage(img((x, y) => [30 + y * 6, 80, 200 - y * 4]), W, H);
  assert.notEqual(graded.edges.left.from, graded.edges.left.to, '세로 그라데이션은 왼쪽 변의 위·아래 색이 다르다');
  assert.equal(graded.edges.top.from, graded.edges.top.to, '같은 이미지의 위쪽 변은 한 색');
  assert.ok(graded.edges.left.rough < 0.035, '매끈한 그라데이션은 거칠지 않다');
  const noisy = fieldFromImage(img((x, y) => ((x * 7 + y * 13) % 2 ? [240, 240, 240] : [20, 20, 20])), W, H);
  assert.ok(noisy.edges.left.rough > 0.035, '체크무늬 같은 복잡한 가장자리는 거칠다');
  const cut = fieldFromImage(img((x, y) => (x > 12 && x < 28 && y > 8 && y < 22 ? [230, 120, 20, 255] : [0, 0, 0, 0])), W, H);
  assert.ok(cut.opaque < 0.5, '배경을 딴 이미지는 가장자리가 투명하다');
});

test('the resolved field: manual colour wins, solid can be forced, text colour follows the field', async () => {
  const { resolveField } = await import('../core/field.js');
  const edge = (from, to, rough = 0.004) => ({ hex: from, from, to, rough, opaque: 1 });
  const base = { palette: { primary: '#0B3C8C' }, keyVisual: 'x', kvMeta: { colors: ['#E67814'], field: { opaque: 1, edges: { left: edge('#F2E9FF', '#D9C8FF') } } } };
  const auto = resolveField(base);
  assert.equal(auto.gradient, true); assert.equal(auto.text, '#000000'); assert.equal(auto.source, 'kv-edge');
  assert.equal(resolveField({ ...base, background: { mode: 'solid' } }).gradient, false);
  assert.deepEqual(resolveField({ ...base, background: { color: '#112233' } }).stops, ['#112233']);
  assert.equal(resolveField({ ...base, background: { color: '#112233' } }).text, '#FFFFFF');
  assert.equal(resolveField({ palette: { primary: '#0B3C8C' } }).source, 'brand', '키비주얼이 없으면 브랜드 색');
  assert.equal(resolveField({ palette: { primary: '#0B3C8C' }, background: { mode: 'gradient' } }).gradient, true, '그라데이션을 고르면 같은 색에서 자연스럽게 만든다');
  assert.equal(resolveField(base, { solidOnly: true }).gradient, false, '단색만 허용하는 지면');
});

test('the image is cropped around its subject, not around its centre', async () => {
  const { fieldFromImage } = await import('../core/palette.js');
  const { kvLayer, resolveField } = await import('../core/field.js');
  const W = 60, H = 40;
  const a = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const subject = x >= 42 && x < 54 && y >= 12 && y < 28;      // 오른쪽에 치우친 주인공
    a.set(subject ? [40, 20, 200, 255] : [220, 214, 255, 255], (y * W + x) * 4);
  }
  const f = fieldFromImage(a, W, H);
  assert.ok(f.focus.x > 0.7 && f.focus.x < 0.9, `주인공은 오른쪽에 있다 (x=${f.focus.x})`);
  const style = { palette: { primary: '#0A3D91' }, keyVisual: 'kv.png', kvMeta: { ar: W / H, colors: ['#2814C8'], field: f } };
  const html = kvLayer(style, resolveField(style), { side: 'right', w: 300, h: 250, size: 108, edgePad: 24 });
  const px = Number(html.match(/(\d+)% \d+%\/cover/)[1]);
  assert.ok(px > 60, `자리가 좁아도 주인공이 보이게 오른쪽으로 당긴다 (${px}%)`);
  // 사진처럼 화면 대부분이 바탕과 다르면 주인공을 알 수 없다
  const busy = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) busy.set([(i * 37) % 255, (i * 91) % 255, (i * 53) % 255, 255], i * 4);
  assert.equal(fieldFromImage(busy, W, H).focus, null);
});
