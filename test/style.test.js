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
  // 주인공이 그림의 일부(폭 20%·높이 40%)면 자리를 주인공으로 채운다 — 배율을 올리고(통째로 덮는 배율의 1.25배 이상) 주인공 가운데가 자리 가운데에 오게 왼쪽으로 당긴다
  const html = kvLayer(style, resolveField(style), { side: 'right', w: 300, h: 250, size: 108, edgePad: 24 });
  const gain = Number(html.match(/--kv-gain:([\d.]+)/)?.[1]);
  assert.ok(gain >= 1.25, `주인공으로 채운다 (배율 이득 ${gain})`);
  const ox = Number(html.match(/\) (-?\d+)px -?\d+px\/\d+px auto/)?.[1]);
  assert.ok(ox < -300, `오른쪽의 주인공이 자리 가운데 오도록 그림을 왼쪽으로 당긴다 (${ox}px)`);
  assert.match(html, /mask-image:linear-gradient\(to right/, '자리의 글자 쪽 변은 그림 한가운데라 지면으로 녹인다');
  // 주인공이 이미 그림을 거의 다 쓰면(보드 예시의 3D·일러스트) 통째로 — 주인공이 보이게 위치만 당긴다
  const big = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) big.set((x >= 10 && x < 56 && y >= 5 && y < 35) ? [40, 20, 200, 255] : [220, 214, 255, 255], (y * W + x) * 4);
  const styleBig = { ...style, kvMeta: { ...style.kvMeta, field: fieldFromImage(big, W, H) } };
  const htmlBig = kvLayer(styleBig, resolveField(styleBig), { side: 'right', w: 300, h: 250, size: 108, edgePad: 24 });
  const px = Number(htmlBig.match(/(\d+)% \d+%\/cover/)?.[1]);
  assert.ok(px > 50, `자리가 좁아도 주인공이 보이게 오른쪽으로 당긴다 (${px}%)`);
  // 사진처럼 화면 대부분이 바탕과 다르면 주인공을 알 수 없다
  const busy = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) busy.set([(i * 37) % 255, (i * 91) % 255, (i * 53) % 255, 255], i * 4);
  assert.equal(fieldFromImage(busy, W, H).focus, null);
});

test('a wide-background illustration: the biggest object is the subject, the slot is filled with it, and the field follows the row colour at the join', async () => {
  const { fieldFromImage } = await import('../core/palette.js');
  const { kvLayer, kvPlacement, resolveField, joinColour, joinField, subjectCrop } = await import('../core/field.js');
  const W = 120, H = 80;
  const a = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const glow = y >= 44 && x >= 30 && x < 90;                       // 아래 가운데 흰 글로우 — 바탕의 일부다
    const big = x >= 4 && x < 46 && y >= 50 && y < 80;                // 왼쪽 아래 큰 파란 오브젝트(바닥에 닿음)
    const small = x >= 100 && x < 116 && y >= 62 && y < 80;           // 오른쪽 아래 작은 초록 오브젝트 — 멀리 떨어져 있다
    a.set(big ? [40, 110, 235, 255] : small ? [60, 190, 80, 255] : glow ? [252, 253, 255, 255] : [218, 231, 250, 255], (y * W + x) * 4);
  }
  const f = fieldFromImage(a, W, H);
  assert.equal(f.kind, 'illust');
  assert.equal(f.focus.parts, 2, '두 오브젝트는 서로 멀어 덩어리가 둘이다');
  assert.ok(f.focus.x < 0.4 && f.focus.w < 0.5, `주인공은 큰 쪽(왼쪽 파랑)이다 (x=${f.focus.x}, w=${f.focus.w})`);
  assert.equal(f.rows.length, 16);
  assert.ok(/^#F[A-F]F[A-F]F[A-F]$/i.test(f.rows[12].hex), `글로우 줄의 바탕색은 글로우(흰색)다 — 주인공으로 치지 않는다 (${f.rows[12].hex})`);
  const style = { palette: { primary: '#1428A0' }, keyVisual: 'kv.png', kvMeta: { ar: W / H, px: [1200, 800], colors: ['#2814C8'], field: f } };
  const field0 = resolveField(style, { facing: 'top', light: true });
  assert.equal(field0.source, 'kv-edge', '윗변이 평평한 연파랑 — 지면은 그 색');
  // 아래 띠(400×140)를 주인공으로 채운다 — 배율을 올리고 바닥에 맞춘다
  const crop = subjectCrop(style, 400, 140);
  assert.ok(crop && crop.gain >= 1.25, `주인공으로 채운다 (${crop?.gain})`);
  const oy = Number(crop.pos.match(/^-?\d+px (-?\d+)px$/)[1]);
  assert.equal(oy, 140 - Math.round(800 * crop.scale), '바닥에 선 주인공은 띠 바닥에 맞춘다');
  // 띠의 윗변이 주인공을 가르면 뿌옇게 번진다 — 윗줄이 바탕이 될 때까지 배율을 낮춘다(eased). 그 줄의 바탕색이 지면과 다르면 지면을 그 색으로 잇고, 같으면 그대로 둔다
  const P = kvPlacement(style, field0, { side: 'bottom', w: 400, h: 340, size: 124, edgePad: 16 });
  assert.ok(P.joinFrac > 0.3, `이음매는 그림 한가운데 (${P.joinFrac})`);
  assert.equal(P.crop.eased, true, '윗줄이 바탕이 되도록 배율을 낮췄다');
  assert.ok(f.rows[Math.floor(P.joinFrac * 16)].bg >= 0.85, '띠 윗줄은 바탕이다 — 녹여도 주인공이 번지지 않는다');
  const jc = joinColour(style, P.joinFrac);
  assert.ok(jc, '이음매 줄의 바탕색이 있다');
  const field = joinField(field0, jc, 'bottom');
  const { colorDistance } = await import('../core/palette.js');
  if (colorDistance(jc, field0.stops[0]) >= 0.02) assert.match(field.css, /^linear-gradient\(180deg,#DAE7FA 0%,#/, '위는 그림의 윗변 색, 아래는 이음매 줄 색');
  else assert.equal(field.css, field0.css, '이음매 줄 색이 지면과 같으면 지면을 바꾸지 않는다');
  // 글로우 줄(그림 높이 75~80%)에 이음매가 걸리면 지면은 글로우 색으로 이어진다
  const glowRow = 0.78;
  const jg = joinColour(style, glowRow);
  assert.ok(jg && colorDistance(jg, field0.stops[0]) >= 0.02, `글로우 줄의 바탕색은 지면과 다르다 (${jg})`);
  assert.match(joinField(field0, jg, 'bottom').css, /^linear-gradient\(180deg,#DAE7FA 0%,#/, '지면이 글로우 색으로 흐른다');
  assert.match(kvLayer(style, field, { side: 'bottom', w: 400, h: 340, size: 124, edgePad: 16 }), /--kv-gain:/, '그릴 때도 같은 배치');
});

test('a background-type illustration: the empty corner is the text room, the picture becomes the whole field (illustrations only, not photos)', async () => {
  const { fieldFromImage } = await import('../core/palette.js');
  const { kvFull } = await import('../core/field.js');
  const W = 120, H = 90;
  const mk = (bgOf, subject) => { const a = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a.set(subject(x, y) ? [60, 190, 80, 255] : bgOf(x, y), (y * W + x) * 4); return a; };
  // 연파랑 평평한 바탕 + 오른쪽·아래를 감싸는 초록 호(삼성 3D 호 꼴) — 왼쪽 위가 빈다
  const arc = (x, y) => (x > 60 && y > 12) || (y > 54 && x > 10);   // 오른쪽 열 + 아래 띠(ㄴ자로 감싼다) — 왼쪽 위가 빈다
  const f = fieldFromImage(mk(() => [218, 231, 250, 255], arc), W, H);
  assert.equal(f.kind, 'illust');
  assert.ok(f.room && f.room.corner === 'tl', `빈 자리는 왼쪽 위 (${JSON.stringify(f.room)})`);
  assert.ok(f.room.w >= 0.35 && f.room.h >= 0.35, `자리는 폭·높이 35% 이상 (${f.room.w}×${f.room.h})`);
  const style = { palette: { primary: '#1428A0' }, keyVisual: 'kv.png', kvMeta: { ar: W / H, px: [1200, 900], colors: ['#3CBE50'], field: f } };
  const full = kvFull(style, 580, 400);
  assert.ok(full, '비율이 비슷한 580×400은 배경형');
  assert.ok(full.room.w >= 580 * 0.42 && full.room.h >= 400 * 0.38, `글자 자리 ${full.room.w}×${full.room.h}`);
  assert.equal(kvFull(style, 2240, 360), null, '띠는 배경형이 아니다(비율 차이)');
  assert.equal(kvFull(style, 300, 1050), null, '세로 띠도 아니다');
  assert.equal(kvFull(style, 200, 140), null, '작은 규격은 글자 자리가 모자라 배경형이 아니다');
  // 사진(평평한 변 없음)은 하늘이 비어도 배경형이 아니다
  const noise = (x, y) => [170 + ((x * 31 + y * 17) % 80), 170 + ((x * 13 + y * 29) % 80), 230, 255];
  const fp = fieldFromImage(mk(noise, arc), W, H);
  assert.equal(fp.kind, 'photo');
  assert.equal(kvFull({ ...style, kvMeta: { ...style.kvMeta, field: fp } }, 580, 400), null);
});

test('a blurred gradient is a texture: no subject, no room — the renderer lays it under everything', async () => {
  const { fieldFromImage } = await import('../core/palette.js');
  const W = 120, H = 90;
  const a = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a.set([140 + Math.round(60 * x / W), 170 + Math.round(40 * y / H), 250, 255], (y * W + x) * 4);
  const f = fieldFromImage(a, W, H);
  assert.equal(f.kind, 'texture', `부드러운 그라데이션은 질감 (sharp ${f.texture.sharp}, rough ${f.texture.rough})`);
  assert.equal(f.focus, null); assert.equal(f.room, null);
  assert.ok(f.quadrants.tl && f.quadrants.br, '사분면 색이 있다');
  // 같은 그라데이션에 네모 하나만 얹어도 질감이 아니다(날카로운 경계)
  for (let y = 40; y < 80; y++) for (let x = 60; x < 110; x++) a.set([40, 60, 200, 255], (y * W + x) * 4);
  assert.notEqual(fieldFromImage(a, W, H).kind, 'texture');
});
