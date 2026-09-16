// 팔레트 — 프라이머리 하나가 아니라 세트로 다룬다.
//   primary   주색 (CTA·강조)
//   secondary 보조색 (서브 블록·배지)
//   accent    포인트색 (작은 강조)
//   ink/bg/surface  모드(라이트·다크)에 따라 결정되는 지면색
//
// 키비주얼이 있으면 픽셀에서 대표색을 뽑아 제안하고, 없으면 프라이머리에서 파생한다.
// 사람이 언제든 덮어쓸 수 있다 — 제안일 뿐 강제가 아니다.

export function hexToRgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}
export function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = t => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export function shiftHue(hex, deg, dl = 0, ds = 0) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([
    (h + deg / 360 + 1) % 1,
    Math.max(0, Math.min(1, s + ds)),
    Math.max(0.05, Math.min(0.95, l + dl)),
  ]));
}
// 상대 휘도 기반 대비비 (WCAG)
export function contrast(a, b) {
  const lum = hex => {
    const [r, g, b2] = hexToRgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
// 글자색은 순흑·순백 둘 중 하나만 쓴다 — 중간 회색 글자는 인쇄·이메일에서 탁해진다.
export const BLACK = '#000000', WHITE = '#FFFFFF';
export function onColor(bg) {
  return contrast(bg, WHITE) >= contrast(bg, BLACK) ? WHITE : BLACK;
}

export const MODES = {
  light: { bg: '#FFFFFF', surface: '#F5F6F7', ink: BLACK, inkSub: 'rgba(0,0,0,.6)' },
  dark: { bg: '#111214', surface: '#1C1E22', ink: WHITE, inkSub: 'rgba(255,255,255,.68)' },
};

// 색 세트 구성 — 주어진 것은 쓰고, 빈 자리는 프라이머리에서 파생한다.
export function buildPalette({ primary = '#2456D6', secondary, accent, mode = 'light' } = {}) {
  const m = MODES[mode] ?? MODES.light;
  const sec = secondary ?? shiftHue(primary, 28, mode === 'dark' ? 0.12 : -0.1, -0.05);
  const acc = accent ?? shiftHue(primary, 176, mode === 'dark' ? 0.06 : 0.06, 0.08);
  return {
    primary, secondary: sec, accent: acc,
    bg: m.bg, surface: m.surface, ink: m.ink, inkSub: m.inkSub,
    onPrimary: onColor(primary), onSecondary: onColor(sec), onAccent: onColor(acc),
  };
}

// 두 색이 사실상 같은 색인가 — 색상환은 원형이라 0.98과 0.02는 이웃이다.
function tooClose(a, b) {
  const [h1, s1, l1] = rgbToHsl(hexToRgb(a));
  const [h2, s2, l2] = rgbToHsl(hexToRgb(b));
  const dh = Math.abs(h1 - h2);
  return Math.min(dh, 1 - dh) < 0.07 && Math.abs(l1 - l2) < 0.16 && Math.abs(s1 - s2) < 0.3;
}

// 키비주얼 픽셀 → 대표색 제안. rgba 배열(Uint8ClampedArray 형태)을 받는다.
// 채도 낮고 극단 밝기인 픽셀은 배경/노이즈로 보고 제외, HSL 버킷으로 군집화.
// 상위 버킷을 그대로 잘라 쓰면 같은 색의 미세한 변주가 1·2·3위를 나눠 가져
// 주색·보조·포인트가 눈으로는 한 색이 된다 — 이미 고른 색과 가까운 버킷은 건너뛴다.
export function extractPalette(rgba, count = 3) {
  const buckets = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < 200) continue;
    const rgb = [rgba[i], rgba[i + 1], rgba[i + 2]];
    const [h, s, l] = rgbToHsl(rgb);
    if (s < 0.14 || l < 0.12 || l > 0.92) continue;
    const key = `${Math.round(h * 18)}|${Math.round(s * 3)}|${Math.round(l * 4)}`;
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += rgb[0]; b.g += rgb[1]; b.b += rgb[2];
    buckets.set(key, b);
  }
  const sorted = [...buckets.values()].sort((x, y) => y.n - x.n)
    .map(b => rgbToHex([b.r / b.n, b.g / b.n, b.b / b.n]));
  const out = [];
  for (const hex of sorted) {
    if (out.length >= count) break;
    if (out.some(c => tooClose(c, hex))) continue;
    out.push(hex);
  }
  return out;
}

// 뽑은 대표색을 역할에 배치한다.
//   주색   = 이미지에서 가장 넓게 쓰인 색 — 키비주얼의 첫인상이 곧 캠페인 주색이 된다
//   보조   = 그 다음으로 넓은, 주색과 구별되는 색
//   포인트 = 남은 후보 중 채도가 가장 높은 색 — 작은 면적에서 눈에 띄어야 하기 때문
// 후보가 모자랄 때 색상환을 크게 돌리지 않는 이유: 보색(+176°)은 키비주얼에 없던 색이라
// 산출물에 얹으면 이미지와 따로 논다. 대신 이미 뽑힌 색의 명도·채도만 밀어
// 같은 색 가족 안에서 자리를 만든다.
export function rolesFromKeyVisual(colors = [], mode = 'light') {
  const list = colors.filter(c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
  if (!list.length) return null;
  const dark = mode === 'dark';
  const sat = c => rgbToHsl(hexToRgb(c))[1];
  const pop = c => shiftHue(c, 8, dark ? 0.08 : 0.02, 0.3);          // 같은 계열에서 채도만 올린 포인트색
  const primary = list[0];
  if (list.length === 1) {
    // 한 색뿐 — 보조는 같은 색상의 명도 대비로, 포인트는 그 색을 더 진하게 짜서 만든다
    return [primary, shiftHue(primary, 0, dark ? 0.16 : -0.16, -0.06), pop(primary)];
  }
  if (list.length === 2) {
    // 둘 다 넓은 면적이므로 주색·보조로 쓰고, 포인트는 둘 중 더 쨍한 쪽에서 파생한다
    return [primary, list[1], pop(sat(list[1]) >= sat(primary) ? list[1] : primary)];
  }
  const rest = list.slice(2);
  const accent = rest.reduce((a, b) => (sat(b) > sat(a) ? b : a));
  return [primary, list[1], accent];
}

// 키비주얼 위 글자 가독성 — 텍스트가 놓일 영역의 밝기·편차를 재서
// (1) 글자색을 흰/검 중 대비 높은 쪽으로 자동 선택하고
// (2) 배경이 복잡하면(편차 큼) 스크림(그라데이션 가림막)을 켠다.
// 이미지 속 기존 글자·오브젝트를 지우는 건 여기서 못 한다(인페인팅 = 별도 AI 필요).
// 대신 "겹쳐도 읽히게" 만드는 쪽으로 해결한다.
export function analyzeRegion(rgba, w, h, box) {
  const x0 = Math.max(0, Math.floor(box.x * w)), x1 = Math.min(w, Math.ceil((box.x + box.w) * w));
  const y0 = Math.max(0, Math.floor(box.y * h)), y1 = Math.min(h, Math.ceil((box.y + box.h) * h));
  // 고정 간격 샘플링은 격자 무늬에서 앨리어싱을 일으킨다 — 영역 크기에 맞춰 ~64x64로 균등 샘플
  const sx = Math.max(1, Math.floor((x1 - x0) / 64));
  const sy = Math.max(1, Math.floor((y1 - y0) / 64));
  let n = 0, sum = 0, sumSq = 0;
  for (let y = y0; y < y1; y += sy) {
    for (let x = x0; x < x1; x += sx) {
      const i = (y * w + x) * 4;
      const lum = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
      n++; sum += lum; sumSq += lum * lum;
    }
  }
  if (!n) return { lum: 0.5, sd: 0, text: '#FFFFFF', scrim: false };
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  const text = mean > 0.55 ? BLACK : WHITE;
  // 중간 밝기이거나 얼룩덜룩하면 글자가 묻힌다 → 스크림
  const scrim = sd > 0.17 || (mean > 0.32 && mean < 0.68);
  return { lum: Number(mean.toFixed(3)), sd: Number(sd.toFixed(3)), text, scrim };
}

// 매체별 텍스트 영역(0~1 상대좌표) — 렌더러 레이아웃과 맞춰 둔다.
export const TEXT_ZONES = {
  banner: { x: 0, y: 0, w: 1, h: 0.55 },
  edm: { x: 0, y: 0, w: 1, h: 1 },
  landing: { x: 0, y: 0, w: 1, h: 0.6 },
  print: { x: 0, y: 0, w: 1, h: 0.45 },
};

// 키비주얼 가장자리 평균색 — 이미지를 축소 배치했을 때 남는 여백을 이 색으로 잇는다.
export function edgeColor(rgba, w, h, band = 0.08) {
  const bw = Math.max(1, Math.round(w * band)), bh = Math.max(1, Math.round(h * band));
  let n = 0, r = 0, g = 0, b = 0;
  const take = (x, y) => { const i = (y * w + x) * 4; r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++; };
  for (let y = 0; y < h; y += 2) { for (let x = 0; x < bw; x += 2) take(x, y); for (let x = w - bw; x < w; x += 2) take(x, y); }
  for (let x = 0; x < w; x += 2) { for (let y = 0; y < bh; y += 2) take(x, y); for (let y = h - bh; y < h; y += 2) take(x, y); }
  return n ? rgbToHex([r / n, g / n, b / n]) : '#FFFFFF';
}

// 매체 비율과 이미지 비율이 많이 다르면 잘라내지 말고 넣어서 맞춘다(레터박스).
// 남는 면은 가장자리 색 그라데이션으로 이어 자연스럽게 만든다.
export function fitKeyVisual(specAR, imgAR, edge) {
  if (!imgAR || !specAR) return { mode: 'cover', bg: null };
  const diff = Math.abs(Math.log(specAR / imgAR));
  if (diff < 0.42) return { mode: 'cover', bg: null };      // 비슷하면 꽉 채워 크롭
  const wide = specAR > imgAR;                               // 매체가 이미지보다 가로로 김
  return {
    mode: 'contain',
    wide,
    bg: `linear-gradient(${wide ? '90deg' : '180deg'}, ${edge} 0%, ${edge} 22%, ${shiftHue(edge, 0, -0.06)} 100%)`,
  };
}
