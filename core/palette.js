// 팔레트 — 프라이머리 하나가 아니라 세트로 다룬다.
//   primary   주색 (CTA·강조)
//   secondary 보조색 (서브 블록·배지)
//   accent    포인트색 (작은 강조)
//   ink/bg/surface  모드(라이트·다크)에 따라 결정되는 지면색
//
// 키비주얼이 있으면 픽셀에서 대표색을 뽑아 제안하고, 없으면 프라이머리에서 파생한다.
// 사람이 언제든 덮어쓸 수 있다 — 제안일 뿐 강제가 아니다.
import { CANON } from './canon.js';

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
// 로고와 키비주얼에서 뽑은 색을 세 자리에 배치한다 — 고객사는 매번 다르므로 색은 저장해 두지 않고 올린 자료에서 읽는다.
//   로고만      → 로고 색으로 세 자리
//   키비주얼만  → 키비주얼 색으로 세 자리
//   둘 다       → 주색은 로고(브랜드 색이 지면 색이 된다), 보조·포인트는 키비주얼(분위기)
//                 키비주얼이 사진이면 대표색이 살색·회색으로 나온다 — 그걸 지면에 깔면 브랜드가 사라진다.
//   로고가 무채색(검정·흰색 로고)이면 뽑힌 색이 없으므로 키비주얼이 전부 맡는다.
// lead='kv' 는 사용자가 키비주얼 색을 주색으로 고른 경우 — 그때는 키비주얼이 세 자리를 다 맡는다.
export function rolesFromSources({ logo = [], kv = [], lead = 'logo' } = {}, mode = 'light') {
  const ok = list => (list ?? []).filter(c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
  const L = ok(logo), K = ok(kv);
  if (!L.length || (lead === 'kv' && K.length)) return rolesFromKeyVisual(K.length ? K : L, mode);
  if (!K.length) return rolesFromKeyVisual(L, mode);
  const primary = L[0];
  return rolesFromKeyVisual([primary, ...K.filter(c => !tooClose(c, primary))], mode);
}

// 두 색을 t만큼 섞는다 (t=1이면 b)
export function mix(a, b, t) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}
// 두 색의 거리(0~1, RGB 공간) — 그라데이션이라 부를 만큼 다른가를 볼 때 쓴다
export function colorDistance(a, b) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return Math.sqrt(x.reduce((n, v, i) => n + (v - y[i]) ** 2, 0)) / 441.673;
}

// 키비주얼의 가장자리에서 지면색을 읽는다 — 지면이 이미지에서 그대로 이어지게 하려는 것이다.
// 네 변마다: 평균색(hex), 변을 따라 앞 절반·뒤 절반의 색(from → to: 이미지에 그라데이션이 있으면 둘이 다르다),
//           불투명한 픽셀 비율(opaque: 낮으면 배경을 딴 이미지), 거칠기(rough: 이웃 픽셀끼리 얼마나 다른가 — 높으면 사진처럼 복잡한 가장자리).
// 왼쪽·오른쪽 변은 위→아래, 위·아래 변은 왼→오른쪽 순서다.
// 이웃(오른쪽·아래) 픽셀과 RGB 합 차이 ≤ 3 인 픽셀 몫 — 벡터 면 채움은 높고 사진(잡티·결)은 낮다(10-14 장부: 사진 0.03~0.77 · 평면 일러스트 대부분 ≥ 0.5)
export function flatFillOf(rgba, w, h) {
  const step = Math.max(1, Math.floor(Math.max(w, h) / 480));
  let n = 0, eq = 0;
  for (let y = 0; y + step < h; y += step) for (let x = 0; x + step < w; x += step) {
    const i = (y * w + x) * 4, r = (y * w + x + step) * 4, d = ((y + step) * w + x) * 4;
    n++;
    const dr = Math.abs(rgba[i] - rgba[r]) + Math.abs(rgba[i + 1] - rgba[r + 1]) + Math.abs(rgba[i + 2] - rgba[r + 2]);
    const dd = Math.abs(rgba[i] - rgba[d]) + Math.abs(rgba[i + 1] - rgba[d + 1]) + Math.abs(rgba[i + 2] - rgba[d + 2]);
    if (dr <= 3 && dd <= 3) eq++;
  }
  return n ? Math.round(eq / n * 1000) / 1000 : null;
}
// 누끼 윗선(열마다 첫 불투명 행) 봉우리 수 — 48칸, 높이의 8% 이상 내려갔다 올라와야 다른 봉우리
export function topPeaksOf(rgba, w, h, n = 48, depth = 0.08) {
  const seq = [];
  for (let k = 0; k < n; k++) {
    const x0 = Math.floor(k * w / n), x1 = Math.max(x0 + 1, Math.floor((k + 1) * w / n));
    let top = 1;
    outer: for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) if (rgba[(y * w + x) * 4 + 3] > 128) { top = y / h; break outer; }
    seq.push(top);
  }
  let peaks = 0, mode = 'down', cand = seq[0], hi = seq[0];
  for (const v of seq.slice(1)) {
    if (mode === 'down') { if (v < cand) cand = v; else if (v - cand >= depth) { peaks++; mode = 'up'; hi = v; } }
    else { if (v > hi) hi = v; else if (hi - v >= depth) { mode = 'down'; cand = v; } }
  }
  if (mode === 'down' && cand < 1) peaks++;
  return peaks;
}
export function fieldFromImage(rgba, w, h, band = 0.06) {
  const bw = Math.max(2, Math.round(w * band)), bh = Math.max(2, Math.round(h * band));
  const scan = (x0, y0, x1, y1, along) => {
    const len = along === 'y' ? y1 - y0 : x1 - x0;
    const half = [{ r: 0, g: 0, b: 0, n: 0 }, { r: 0, g: 0, b: 0, n: 0 }];
    let total = 0, opaque = 0, rough = 0, pairs = 0;
    const sq = { r: 0, g: 0, b: 0 };   // 색 편차용 제곱합 — 변 전체가 한 색(또는 매끈한 그라데이션)인지 본다
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        total++;
        const i = (y * w + x) * 4;
        if (rgba[i + 3] < 200) continue;
        opaque++;
        const t = half[((along === 'y' ? y - y0 : x - x0) * 2 >= len) ? 1 : 0];
        t.r += rgba[i]; t.g += rgba[i + 1]; t.b += rgba[i + 2]; t.n++;
        sq.r += rgba[i] * rgba[i]; sq.g += rgba[i + 1] * rgba[i + 1]; sq.b += rgba[i + 2] * rgba[i + 2];
        // 변을 따라 다음 픽셀과의 차이 — 매끈한 그라데이션은 작고, 사진의 디테일은 크다
        const nx = along === 'y' ? x : x + 1, ny = along === 'y' ? y + 1 : y;
        if (nx < x1 && ny < y1) {
          const j = (ny * w + nx) * 4;
          if (rgba[j + 3] >= 200) { rough += (Math.abs(rgba[i] - rgba[j]) + Math.abs(rgba[i + 1] - rgba[j + 1]) + Math.abs(rgba[i + 2] - rgba[j + 2])) / 765; pairs++; }
        }
      }
    }
    const hex = t => t.n ? rgbToHex([t.r / t.n, t.g / t.n, t.b / t.n]) : null;
    const all = { r: half[0].r + half[1].r, g: half[0].g + half[1].g, b: half[0].b + half[1].b, n: half[0].n + half[1].n };
    // 변의 색 편차(0~128): 바탕이 한 색이면 0에 가깝고, 사진의 변은 25를 넘는다(보드 레퍼런스 측정: 한독 사옥 사진 25~39 · 일러스트 0~14)
    const sd = c => all.n ? Math.sqrt(Math.max(0, sq[c] / all.n - (all[c] / all.n) ** 2)) : 0;
    const std = all.n ? Math.round((sd('r') + sd('g') + sd('b')) / 3) : 0;
    const op = total ? Math.round(opaque / total * 100) / 100 : 0;
    return {
      hex: hex(all), from: hex(half[0]) ?? hex(all), to: hex(half[1]) ?? hex(all),
      opaque: op,
      rough: pairs ? Math.round(rough / pairs * 1000) / 1000 : 0,
      // 10-12 desk-06 동원(별 점이 흩뿌려진 파랑 그라데이션 3D): 거의 한 색인 변(편차 ≤ 6)은 별·압축 티끌로 결이 0.012까지 올라도 평평한 바탕이다 — 사진의 변은 편차가 그보다 크다(데스크탑 사진 22건 중 0건)
      std, flat: op >= 0.9 && std < 15 && (pairs ? rough / pairs : 0) < 0.006,
      ...((op >= 0.9 && std <= 6 && (pairs ? rough / pairs : 0) < 0.012) ? { noisyFlat: true } : {}),   // 평평한 변 = 색 편차 작고 결도 없다(사진의 변은 어둡게 찍혀 편차가 줄어도 결 ≥ .008 — 일화 사옥 어둡게)
    };
  };
  const edges = {
    top: scan(0, 0, w, bh, 'x'), bottom: scan(0, h - bh, w, h, 'x'),
    left: scan(0, 0, bw, h, 'y'), right: scan(w - bw, 0, w, h, 'y'),
  };
  const list = Object.values(edges);
  const opaque = Math.round(list.reduce((n, e) => n + e.opaque, 0) / list.length * 100) / 100;
  // 그림의 종류 — 보드 예시 136장을 나눈 세 갈래(ref/learned/board/kv-typology.json):
  //   cutout  배경을 딴 그림(투명 PNG) — 칸에 맞춰 놓고 녹이지 않는다
  //   photo   네 변 어디에도 평평한 바탕이 없다 — 사진. 지면은 브랜드색, 지면과 만나는 변을 그라데이션으로 녹인다(한독·리멤버 예시)
  //   illust  평평한 변이 하나라도 있다 — 바탕을 품은 일러스트·3D. 그 변의 색이 지면이 되어 이음매 없이 이어진다(72/136, 가장 흔함)
  let flatEdges = list.filter(e => e.flat).length;
  const cutout = opaque < 0.5;
  // 그림 전체 밝기(0~1) — 사진·질감의 밝은/어두운 세분, 글자색·스크림 판단. 4px 표본, 불투명 픽셀만
  let lsum = 0, lsq = 0, ln = 0;
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const i = (y * w + x) * 4; if (rgba[i + 3] < 200) continue; const L = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255; lsum += L; lsq += L * L; ln++; }
  const lum = ln ? Math.round(lsum / ln * 100) / 100 : null;
  const lumSpread = ln ? Math.round(Math.sqrt(Math.max(0, lsq / ln - (lsum / ln) ** 2)) * 100) / 100 : null;
  // 채도(sat, 0~1: 불투명 픽셀의 (max−min)/max 평균)와 반투명 비율(semi: 보이는 픽셀(α>10) 중 10<α<230의 비율) — 반사·유리·크롬 누끼(cutout-glass) 판정.
  // 유리 행성(Figma 9월 공채 KV): 무채·중간 밝기 + 반투명 가장자리 15% → 밝은 틴트 지면 위에선 회색으로 탁해진다(디자이너 13/13 어두운 지면)
  let ssum = 0, sn = 0, vis = 0, semi = 0;
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
    const i = (y * w + x) * 4, a = rgba[i + 3];
    if (a > 10) { vis++; if (a < 230) semi++; }
    if (a < 200) continue;
    const mx = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]), mn = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    ssum += mx ? (mx - mn) / mx : 0; sn++;
  }
  const sat = sn ? Math.round(ssum / sn * 100) / 100 : null;
  const semiRatio = vis ? Math.round(semi / vis * 1000) / 1000 : 0;
  // 질감(texture): 날카로운 경계가 거의 없고(이웃 차 > 0.08인 쌍 0.3% 미만) 전체가 매끈한(평균 이웃 차 0.005 미만) 그림 — 블러 그라데이션.
  // 주인공도 바탕도 없다. 측정(10-06): 그라데이션 0.00% / 삼성 3D 4.3% / 일화 사진 7.8% / 비씨 일러스트 17.8%
  const tex = textureOf(rgba, w, h);
  // 10-09 figma-dg: 문턱 0.003 → 0.005 — 흐릿한 3D가 깔린 바탕(에이치닷 보라 3D, sharp 0.41%·네 변 평평)은 디자이너 9/9가 배경으로 깔았다. 삼성 3D 4.3%와는 멀다
  // 단색조 추상 렌더(마이다스 파란 유리 면: 평평한 변 0 · 색 퍼짐 28 · 채도 0.81)도 질감 — 사진처럼 한쪽에 녹이면 뜻 없는 조각이다(디자이너 히어로 20여 종이 전면 배경). 사진은 퍼짐 33 이상(일화 어둡게 33)
  // 10-09 데스크탑: 색 퍼짐이 25 이하인 그림(파스텔 블롭·민트 알약 패턴, 퍼짐 21·24)은 채도와 상관없이 질감 — 핀터레스트 JPG의 압축 노이즈가 거칠기(rough)를 문턱 위로 올려 사진으로 갔다.
  //   사진은 퍼짐 33 이상(일화 어둡게 33 · 실사 41~80)이라 겹치지 않는다
  // 10-12 desk-06: 별·티끌만 있는 거의 한 색 변(noisyFlat)은 바탕이다 — 단, 색 퍼짐이 큰 그림(> 25: 질감·블롭이 아닌 것)에서만. 질감 판정을 흔들지 않는다
  if (tex.spread > 25) { for (const e of list) if (e.noisyFlat && !e.flat) e.flat = true; flatEdges = list.filter(e => e.flat).length; }
  for (const e of list) delete e.noisyFlat;
  const abstract = flatEdges === 0 && (tex.spread <= 25 || (tex.spread <= 30 && (sat ?? 0) >= 0.6));
  let kind = cutout ? 'cutout' : ((tex.sharp < 0.005 && tex.rough < 0.005 && tex.spread >= 6) || abstract) ? 'texture' : flatEdges === 0 ? 'photo' : 'illust';
  const quadrants = quadrantsOf(rgba, w, h);
  // rows·cols: 그림을 16칸으로 자른 띠마다의 "바탕" 색(주인공이 아닌 픽셀의 평균). 오브젝트 자리를 주인공으로 당겨 채우면 자리의 글자 쪽 변이
  // 그림 한가운데 걸린다 — 그 줄의 바탕색을 지면이 이어받아야 이음매가 안 보인다(core/field.js joinColour). 누끼는 바탕이 없다(null)
  // 바탕 기준색 — 평평한 변이 있으면 그 색. 주인공이 변까지 닿는 줄에서는 그 줄의 양끝 색이 주인공 색이라 바탕 추정이 틀어진다(초록 호가 오른쪽 변에 닿은 줄) — 그때는 이 색을 쓴다
  const refEdge = [edges.top, edges.left, edges.right, edges.bottom].find(e => e.flat && e.hex);
  const ref = refEdge ? hexToRgb(refEdge.hex) : null;
  if (kind === 'texture') return { edges, opaque, flatEdges, kind, lum, lumSpread, sat, semi: semiRatio, texture: tex, quadrants, focus: null, rows: bgProfile(rgba, w, h, bw, 'rows', 16, ref), cols: bgProfile(rgba, w, h, bw, 'cols', 16, ref), room: null };
  // 누끼의 열/행 프로필은 투명 비율(bg) — 자르기 선·창 변이 캐릭터 몸을 가르지 않고 캐릭터 사이 빈 열에서 끊게 한다(ABL 떼 300×1050)
  const alphaProfile = (axis, n = 16) => Array.from({ length: n }, (_, k) => {
    let tot = 0, clear = 0;
    if (axis === 'cols') { const x0 = Math.floor(k * w / n), x1 = Math.max(x0 + 1, Math.floor((k + 1) * w / n)); for (let y = 0; y < h; y += 2) for (let x = x0; x < x1; x += 2) { tot++; if (rgba[(y * w + x) * 4 + 3] < 200) clear++; } }
    else { const y0 = Math.floor(k * h / n), y1 = Math.max(y0 + 1, Math.floor((k + 1) * h / n)); for (let y = y0; y < y1; y += 2) for (let x = 0; x < w; x += 2) { tot++; if (rgba[(y * w + x) * 4 + 3] < 200) clear++; } }
    return { hex: null, bg: tot ? Math.round(clear / tot * 100) / 100 : 1 };
  });
  // 대각 그라데이션 바탕(10-09 figma-dg 오렌지 카드 3D: 노랑 → 주황, 평평한 변 3개가 모두 그라데이션) — 변 기준색 하나로 가르면 주황 모서리가 주인공이 된다(주인공 5%, 우하단 구석).
  // 평평한 변이 셋 이상이고 그중 둘 이상이 그라데이션이며 네 모서리가 고르면(편차 < 12) 모서리 색 보간을 바탕으로 쓴다
  const cornerPatch = (x0, y0) => { const n = Math.max(2, bw); let r = 0, g = 0, b = 0, q = 0, c = 0; for (let y = y0; y < y0 + n; y++) for (let x = x0; x < x0 + n; x++) { const i = (y * w + x) * 4; r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; q += (rgba[i] + rgba[i + 1] + rgba[i + 2]) ** 2 / 9; c++; } const m = [r / c, g / c, b / c]; const lm = (m[0] + m[1] + m[2]) / 3; return { c: m, sd: Math.sqrt(Math.max(0, q / c - lm * lm)) }; };
  const gradFlat = list.filter(e => e.flat && e.from && e.to && colorDistance(e.from, e.to) > 0.035).length;
  let corners = null;
  if (!cutout && flatEdges >= 3 && gradFlat >= 2) {
    const n = Math.max(2, bw), P = { tl: cornerPatch(0, 0), tr: cornerPatch(w - n, 0), bl: cornerPatch(0, h - n), br: cornerPatch(w - n, h - n) };
    if (Object.values(P).every(p => p.sd < 12)) corners = Object.fromEntries(Object.entries(P).map(([k, p]) => [k, p.c]));
  }
  const focus = focusOf(rgba, w, h, bw, cutout, ref, corners, kind === 'illust' || cutout);   // 쌓인 덩어리 묶기 — 바탕 있는 일러스트·3D와 누끼(10-12 desk-20-cut 위 공 + 아래 반구). 사진 장면은 그대로, 옆으로 선 누끼 떼(ABL)는 묶이지 않는다
  // 평평한 변이 하나뿐인데 바탕을 못 가르면(주인공 픽셀 > 60% → focus null) 그 변은 바탕이 아니라 사진의 흐린 천장·벽이다 — 사진(10-09 figma-dg AI 간호사: 일러스트로 보고 윗변에 붙여 얼굴이 잘렸다)
  // 단, 면이 고르게 칠해진 벡터 그림(이웃 픽셀이 같은 색인 몫 flatFill ≥ CANON flatVector — 사진 최대 0.77, 10-14 t1014 GS에너지 2026 svg 장면 0.82)은 사진이 아니다(바탕이 구름·건물로 갈려 주인공을 못 가른 일러스트)
  const flatFill = cutout ? null : flatFillOf(rgba, w, h);
  if (kind === 'illust' && flatEdges === 1 && !focus && !(flatFill >= (CANON.flatVector ?? 2))) kind = 'photo';
  // 누끼 윗선의 봉우리 수(머리·꼭대기) — 맞닿아 연결 성분 하나·틈 열 없는 사람 떼(10-14 t1014 ABL 6명 어깨동무: 봉우리 7)를 단일 사물과 가른다(kvtypes group)
  const topPeaks = cutout ? topPeaksOf(rgba, w, h) : null;
  return { edges, opaque, flatEdges, kind, lum, lumSpread, sat, semi: semiRatio, texture: tex, quadrants, focus, ...(topPeaks != null ? { topPeaks } : {}), ...(flatFill != null ? { flatFill } : {}), rows: cutout ? alphaProfile('rows', 32) : bgProfile(rgba, w, h, bw, 'rows', 16, ref), cols: cutout ? alphaProfile('cols', 32) : bgProfile(rgba, w, h, bw, 'cols', 16, ref), room: cutout ? null : roomOf(rgba, w, h, bw, 8, ref) };
}

// 인물 상자로 주인공 잡기(10-12 결정 반영·남은 문제: hr-doctor 흰 가운 × 흰 흐린 배경, AI 간호사 얼굴이 코에서 잘림).
// person: 사람 분리 마스크의 상자·면적(Apple Vision — scripts/kv-person.swift, 케이스 장부가 잰다. 브라우저 앱은 없음 → 유형 직접 지정으로).
// 마스크는 주인공 상자(focus)를 잡는 데만 쓴다 — 오려 내지 않는다. 색으로 사람을 못 가른 그림에만:
//   사람이 한 덩어리(상자 채움 ≥ 0.45)이고 크며(면적 ≥ 0.15) 그림 전체는 아니고(상자 < 90%),
//   색 주인공이 없거나(focus null) 성글고(밀도 < 0.4) 사람 상자의 절반도 못 덮을 때(손 든 컨트롤러 desk-25 · 단체 사진 desk-27 은 그대로).
// 바탕 있는 일러스트로 판정됐던 그림이면 사진이다(흐린 배경의 한 변이 평평해 일러스트로 갔다).
export const PERSON_FOCUS = { fill: 0.45, area: 0.15, boxMax: 0.9, density: 0.4, cover: 0.5 };
export function personFocus(field, person) {
  if (!field || !person || field.kind === 'cutout' || field.kind === 'texture') return field;
  const P = PERSON_FOCUS, bw = person.x1 - person.x0, bh = person.y1 - person.y0;
  if (!(person.fill >= P.fill && person.area >= P.area && bw * bh < P.boxMax)) return field;
  const f0 = field.focus;
  if (f0) {
    const ix = Math.max(0, Math.min(person.x1, f0.x + f0.w / 2) - Math.max(person.x0, f0.x - f0.w / 2));
    const iy = Math.max(0, Math.min(person.y1, f0.y + f0.h / 2) - Math.max(person.y0, f0.y - f0.h / 2));
    if (!((f0.density ?? 1) < P.density && ix * iy / (bw * bh) < P.cover)) return field;
  }
  const r = v => Math.round(v * 100) / 100;
  return { ...field, kind: field.kind === 'illust' ? 'photo' : field.kind, kindFrom: field.kind === 'illust' ? 'illust' : undefined,
    focus: { x: r((person.x0 + person.x1) / 2), y: r((person.y0 + person.y1) / 2), w: r(bw), h: r(bh), parts: 1, others: [], density: r(person.fill), source: 'person' } };
}

// 전체 거칠기 — 2px 격자에서 오른쪽·아래 이웃과의 색 차 평균(rough), 차가 0.08을 넘는 쌍의 비율(sharp), 전체 색 편차(spread). 질감 판정에 쓴다
function textureOf(rgba, w, h) {
  let rough = 0, sharp = 0, n = 0, sr = 0, sg = 0, sb = 0, qr = 0, qg = 0, qb = 0, c = 0;
  // 이웃은 표본 간격과 같은 2px 건너 — 1px 이웃으로 재면 짝수 좌표에 선 경계(합성 그림)가 표본 사이로 빠진다
  for (let y = 0; y < h - 2; y += 2) for (let x = 0; x < w - 2; x += 2) {
    const i = (y * w + x) * 4; if (rgba[i + 3] < 200) continue;
    const j = i + 8, k = ((y + 2) * w + x) * 4;
    if (rgba[j + 3] >= 200 && rgba[k + 3] >= 200) {
      const d = (Math.abs(rgba[i] - rgba[j]) + Math.abs(rgba[i + 1] - rgba[j + 1]) + Math.abs(rgba[i + 2] - rgba[j + 2]) + Math.abs(rgba[i] - rgba[k]) + Math.abs(rgba[i + 1] - rgba[k + 1]) + Math.abs(rgba[i + 2] - rgba[k + 2])) / 1530;
      rough += d; if (d > 0.08) sharp++; n++;
    }
    sr += rgba[i]; sg += rgba[i + 1]; sb += rgba[i + 2]; qr += rgba[i] ** 2; qg += rgba[i + 1] ** 2; qb += rgba[i + 2] ** 2; c++;
  }
  const sd = (s1, q) => c ? Math.sqrt(Math.max(0, q / c - (s1 / c) ** 2)) : 0;
  return { rough: n ? Math.round(rough / n * 10000) / 10000 : 0, sharp: n ? Math.round(sharp / n * 10000) / 10000 : 0, spread: Math.round((sd(sr, qr) + sd(sg, qg) + sd(sb, qb)) / 3) };
}
// 네 사분면의 평균색 — 질감 그림 위에 글자를 둘 때 그 자리의 밝기를 읽는다
function quadrantsOf(rgba, w, h) {
  const acc = { tl: [0, 0, 0, 0], tr: [0, 0, 0, 0], bl: [0, 0, 0, 0], br: [0, 0, 0, 0] };
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * 4; if (rgba[i + 3] < 200) continue;
    const a = acc[(y < h / 2 ? 't' : 'b') + (x < w / 2 ? 'l' : 'r')];
    a[0] += rgba[i]; a[1] += rgba[i + 1]; a[2] += rgba[i + 2]; a[3]++;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, a[3] ? rgbToHex([a[0] / a[3], a[1] / a[3], a[2] / a[3]]) : null]));
}

// 바탕 프로필 — 띠(가로 16칸 rows / 세로 16칸 cols)마다 바탕 픽셀(주인공이 아닌 픽셀)의 대표색(채널별 중앙값)과 비율.
// 평균이 아니라 중앙값이다 — 주인공 가장자리의 섞인 픽셀(부채 살·글자 획 둘레)이 바탕색을 탁하게 끌고 가지 않도록
function bgProfile(rgba, w, h, bw, axis, n = 16, ref = null) {
  const acc = Array.from({ length: n }, () => ({ hist: [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], k: 0, t: 0 }));
  for (let y = 0; y < h; y += 2) {
    const side = from => { let r = 0, g = 0, b = 0; for (let x = from; x < from + bw; x++) { const i = (y * w + x) * 4; r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; } return [r / bw, g / bw, b / bw]; };
    const L = edgeOrRef(side(0), ref), R = edgeOrRef(side(w - bw), ref);
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4, t = x / (w - 1);
      const a = acc[Math.min(n - 1, Math.floor((axis === 'rows' ? y / h : x / w) * n))];
      a.t++;
      if (rgba[i + 3] < 200) continue;
      if (subjectPx(rgba, i, L, R, t)) continue;
      a.hist[0][rgba[i]]++; a.hist[1][rgba[i + 1]]++; a.hist[2][rgba[i + 2]]++; a.k++;
    }
  }
  const median = (hist, k) => { let c = 0; for (let v = 0; v < 256; v++) { c += hist[v]; if (c * 2 >= k) return v; } return 255; };
  return acc.map(a => ({ hex: a.k ? rgbToHex([median(a.hist[0], a.k), median(a.hist[1], a.k), median(a.hist[2], a.k)]) : null, bg: a.t ? Math.round(a.k / a.t * 100) / 100 : 0 }));
}

// 빈 자리(room) — 그림을 8×8 격자로 나눠 바탕 비율 ≥ 0.9 인 칸만으로 네 모서리 중 하나에 붙여 만들 수 있는 가장 큰 직사각형.
// 글자가 들어갈 자리다. 배경형 그림(삼성 3D 호: 호가 오른쪽·아래를 감싸고 왼쪽 위가 빔 · 삼정KPMG·GC녹십자 예시)은 자리에 잘라 붙이는 게 아니라
// 그림을 지면 전체에 깔고 이 자리에 글자를 둔다(core/field.js kvFull). 64칸 중 6칸(≈10%)은 돼야 자리라 부른다
function roomOf(rgba, w, h, bw, n = 8, ref = null) {
  const cells = Array.from({ length: n * n }, () => ({ k: 0, t: 0, r: 0, g: 0, b: 0 }));
  for (let y = 0; y < h; y += 2) {
    const side = from => { let r = 0, g = 0, b = 0; for (let x = from; x < from + bw; x++) { const i = (y * w + x) * 4; r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; } return [r / bw, g / bw, b / bw]; };
    const L = edgeOrRef(side(0), ref), R = edgeOrRef(side(w - bw), ref), gy = Math.min(n - 1, Math.floor(y / h * n));
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4, c = cells[gy * n + Math.min(n - 1, Math.floor(x / w * n))];
      c.t++;
      if (rgba[i + 3] < 200 || subjectPx(rgba, i, L, R, x / (w - 1))) continue;
      c.k++; c.r += rgba[i]; c.g += rgba[i + 1]; c.b += rgba[i + 2];
    }
  }
  const bg = (gx, gy) => { const c = cells[gy * n + gx]; return c.t ? c.k / c.t : 0; };
  const corners = [['tl', 0, 0, 1, 1], ['tr', n - 1, 0, -1, 1], ['bl', 0, n - 1, 1, -1], ['br', n - 1, n - 1, -1, -1]];
  let best = null;
  for (const [name, sx, sy, dx, dy] of corners) {
    for (let cw = 1; cw <= n; cw++) for (let ch = 1; ch <= n; ch++) {
      let ok = true;
      for (let i = 0; i < cw && ok; i++) for (let j = 0; j < ch && ok; j++) if (bg(sx + i * dx, sy + j * dy) < 0.9) ok = false;
      if (!ok) continue;
      const area = cw * ch;
      if (!best || area > best.area) best = { name, cw, ch, area, sx, sy, dx, dy };
    }
  }
  if (!best || best.area < 6) return null;
  let r = 0, g = 0, b = 0, k = 0;
  for (let i = 0; i < best.cw; i++) for (let j = 0; j < best.ch; j++) { const c = cells[(best.sy + j * best.dy) * n + (best.sx + i * best.dx)]; r += c.r; g += c.g; b += c.b; k += c.k; }
  const hex = k ? rgbToHex([r / k, g / k, b / k]) : null;
  const lum = k ? Math.round(((0.2126 * r + 0.7152 * g + 0.0722 * b) / k / 255) * 100) / 100 : null;
  const x0 = best.dx > 0 ? 0 : (n - best.cw) / n, x1 = best.dx > 0 ? best.cw / n : 1;
  const y0 = best.dy > 0 ? 0 : (n - best.ch) / n, y1 = best.dy > 0 ? best.ch / n : 1;
  // 모서리 칸의 바탕 비율 — 로고를 둘 수 있는 모서리인지 렌더러가 본다
  const cornersBg = { tl: bg(0, 0), tr: bg(n - 1, 0), bl: bg(0, n - 1), br: bg(n - 1, n - 1) };
  return { corner: best.name, x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, hex, lum, cornersBg };
}

// 그림의 주인공이 어디 있는가 — 좁은 자리에 잘라 넣을 때 주인공이 잘려 나가지 않게 하려는 것이다.
// 바탕은 "그 줄의 왼쪽 끝 색에서 오른쪽 끝 색으로 이어지는 색"으로 본다(가로·세로 그라데이션 바탕을 모두 견딘다).
// 바탕과 충분히 다른 픽셀이 주인공이다. 배경을 딴 이미지는 불투명한 픽셀이 주인공이다.
// 돌려주는 값은 주인공 상자의 중심(x, y: 0~1). 주인공이 화면 대부분이면(사진) 알 수 없으므로 null.
// 주인공 픽셀인가 — 그 줄의 양끝 색을 이은 바탕색과 충분히 다르고(0.15), 밝은 바탕 위에서 "더 밝고 채도 없는" 픽셀(흰 글로우·하이라이트)은 아니다.
// 흰 글로우는 바탕의 일부다 — 주인공으로 치면 두 모서리의 오브젝트가 글로우로 이어져 한 덩어리가 되고, 자리를 당겨 채워도 글로우만 커진다(10-06)
const SUBJECT_D = 0.15;
// 줄의 끝 색이 바탕 기준색(ref)과 0.15 넘게 다르면 주인공이 변에 닿은 것 — 그 줄의 바탕은 기준색으로 본다
function edgeOrRef(c, ref) {
  if (!ref) return c;
  return (Math.abs(c[0] - ref[0]) + Math.abs(c[1] - ref[1]) + Math.abs(c[2] - ref[2])) / 765 > 0.15 ? ref : c;
}
export function subjectPx(rgba, i, L, R, t) {
  const br = L[0] + (R[0] - L[0]) * t, bg = L[1] + (R[1] - L[1]) * t, bb = L[2] + (R[2] - L[2]) * t;
  const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
  if ((Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb)) / 765 <= SUBJECT_D) return false;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, blum = (0.2126 * br + 0.7152 * bg + 0.0722 * bb) / 255;
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  return !(blum > 0.7 && lum > blum && sat < 0.12);
}
function focusOf(rgba, w, h, bw, cutout, ref = null, corners = null, stackParts = false) {
  // 2px 격자로 "주인공 픽셀"을 표시한다
  const gw = Math.ceil(w / 2), gh = Math.ceil(h / 2);
  const hit = new Uint8Array(gw * gh);
  let n = 0;
  for (let gy = 0; gy < gh; gy++) {
    const y = gy * 2;
    const side = from => { let r = 0, g = 0, b = 0; for (let x = from; x < from + bw; x++) { const i = (y * w + x) * 4; r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; } return [r / bw, g / bw, b / bw]; };
    // corners: 대각 그라데이션 바탕(네 모서리 색이 다르다) — 줄마다 왼쪽·오른쪽 바탕색을 모서리 색의 세로 보간으로(변 색이 기준색과 멀다고 주인공으로 치지 않는다)
    const lerp3 = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
    const L = cutout ? null : corners ? lerp3(corners.tl, corners.bl, y / Math.max(1, h - 1)) : edgeOrRef(side(0), ref), R = cutout ? null : corners ? lerp3(corners.tr, corners.br, y / Math.max(1, h - 1)) : edgeOrRef(side(w - bw), ref);
    for (let gx = 0; gx < gw; gx++) {
      const x = gx * 2, i = (y * w + x) * 4;
      let on;
      if (cutout) on = rgba[i + 3] >= 200;
      else on = subjectPx(rgba, i, L, R, x / (w - 1));
      if (on) { hit[gy * gw + gx] = 1; n++; }
    }
  }
  const total = gw * gh;
  // 바탕 있는 그림에서 60% 넘게 '주인공'이면 바탕을 못 가른 것 — 주인공 없음. 누끼는 투명 여백을 트림하면 당연히 60%를 넘는다(10-08 여우 트림 후 focus null)
  if (!n || (!cutout && n / total > 0.6)) return null;
  // 덩어리로 나눈다 — 먼저 한 칸(2px) 부풀려 가는 틈(부채 살·글자 획)을 메운 뒤 8방향 연결로 묶는다.
  // 주인공이 여럿이고 서로 멀면(두 모서리의 3D 오브젝트) 가장 큰 덩어리가 주인공이다. 전부 묶은 상자가 큰 덩어리 상자의 1.5배 안이면 한 주인공(캐릭터 떼·도시 일러스트)
  const fat = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    if (!hit[gy * gw + gx]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = gx + dx, ny = gy + dy; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) fat[ny * gw + nx] = 1; }
  }
  const label = new Int32Array(gw * gh).fill(-1);
  const comps = [];
  const stack = [];
  for (let s0 = 0; s0 < gw * gh; s0++) {
    if (!fat[s0] || label[s0] >= 0) continue;
    const id = comps.length; const c = { area: 0, x0: gw, x1: 0, y0: gh, y1: 0 };
    stack.push(s0); label[s0] = id;
    while (stack.length) {
      const k = stack.pop(); const gx = k % gw, gy = (k - gx) / gw;
      if (hit[k]) { c.area++; if (gx < c.x0) c.x0 = gx; if (gx > c.x1) c.x1 = gx; if (gy < c.y0) c.y0 = gy; if (gy > c.y1) c.y1 = gy; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const m = ny * gw + nx; if (fat[m] && label[m] < 0) { label[m] = id; stack.push(m); }
      }
    }
    if (c.area) comps.push(c);
  }
  // 티끌(격자의 0.5% 미만)은 주인공이 아니다
  let groups = comps.filter(c => c.area >= total * 0.005);
  if (!groups.length) groups = comps;
  const big = groups.reduce((m, c) => (c.area > m.area ? c : m), groups[0]);
  const all = groups.reduce((u, c) => ({ x0: Math.min(u.x0, c.x0), x1: Math.max(u.x1, c.x1), y0: Math.min(u.y0, c.y0), y1: Math.max(u.y1, c.y1) }), { x0: gw, x1: 0, y0: gh, y1: 0 });
  const boxArea = c => (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1);
  let pick = boxArea(all) <= boxArea(big) * 1.5 ? all : big;
  // 10-12 desk-06 동원(구 머리 + 반구 몸)·desk-07 코스맥스(흐린 흉상): 위아래로 쌓인 덩어리는 한 인물이다 — 가장 큰 덩어리(몸)만 고르면 머리가 잘린다.
  //   가로로 겹치고(작은 쪽 폭의 50% 이상) 세로 틈이 지금 상자 높이의 50% 안이며 큰 덩어리 넓이의 10% 이상인 덩어리를 묶는다. 옆으로 나란히 선 떼(가로 틈)는 묶지 않는다
  if (pick === big && stackParts) {
    let u = { ...big }, grew = true;
    while (grew) {
      grew = false;
      for (const g of groups) {
        if (g.area < big.area * 0.1 || (g.x0 >= u.x0 && g.x1 <= u.x1 && g.y0 >= u.y0 && g.y1 <= u.y1)) continue;
        const ov = Math.min(u.x1, g.x1) - Math.max(u.x0, g.x0) + 1, minW = Math.min(u.x1 - u.x0, g.x1 - g.x0) + 1;
        const gap = Math.max(g.y0 - u.y1, u.y0 - g.y1), uh = u.y1 - u.y0 + 1;
        if (ov >= minW * 0.5 && gap <= uh * 0.5) { u = { x0: Math.min(u.x0, g.x0), x1: Math.max(u.x1, g.x1), y0: Math.min(u.y0, g.y0), y1: Math.max(u.y1, g.y1), stacked: true }; grew = true; }
      }
    }
    // 누끼는 투명 여백을 트림해 묶은 상자가 늘 그림 전체에 가깝다 — 60% 상한을 걸지 않는다(10-12 남은 문제 desk-20-cut: 위 공 + 아래 반구 「사용자 추가」 아이콘 하나)
    if (u.stacked && (cutout || boxArea(u) <= gw * gh * 0.6)) pick = u;   // 묶은 상자가 그림의 60%를 넘으면 한 인물이 아니라 장면이다(마이다스 유리 폴더) — 묶지 않는다
  }
  if (globalThis.__focusDebug) globalThis.__focusDebug({ gw, gh, comps, groups, big, all, pick });   // 측정 디버그 훅(Node 전용)
  const r2 = v => Math.round(v * 100) / 100;
  // 격자 좌표 → 0~1 (셀 하나가 2px)
  const X0 = pick.x0 * 2, X1 = Math.min(w - 1, pick.x1 * 2 + 1), Y0 = pick.y0 * 2, Y1 = Math.min(h - 1, pick.y1 * 2 + 1);
  // others: 주인공으로 고르지 않은 덩어리들의 상자(0~1) — 자리 창이 이들을 가르지 않게 피하는 데 쓴다(core/field.js kvPlacement)
  const inPick = g => g.x0 >= pick.x0 && g.x1 <= pick.x1 && g.y0 >= pick.y0 && g.y1 <= pick.y1;
  const others = pick === all ? [] : groups.filter(g => g !== big && !inPick(g)).map(g => ({ x0: r2(g.x0 * 2 / w), x1: r2(Math.min(w - 1, g.x1 * 2 + 1) / w), y0: r2(g.y0 * 2 / h), y1: r2(Math.min(h - 1, g.y1 * 2 + 1) / h) }));
  // density: 주인공 상자 안에서 주인공 픽셀이 차지하는 비율 — 캐릭터·사물은 촘촘(≥0.5), 크레인·건물 장면은 성글다(<0.45). 유형 세분(core/kvtypes.js)에 쓴다
  let inBox = 0;
  for (let gy = pick.y0; gy <= pick.y1; gy++) for (let gx = pick.x0; gx <= pick.x1; gx++) if (hit[gy * gw + gx]) inBox++;
  const density = r2(inBox / Math.max(1, boxArea(pick)));
  return { x: r2((X0 + X1) / 2 / w), y: r2((Y0 + Y1) / 2 / h), w: r2((X1 - X0) / w), h: r2((Y1 - Y0) / h), parts: groups.length, others, density, ...(pick.stacked ? { stacked: true } : {}) };
}

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
