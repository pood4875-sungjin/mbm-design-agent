// 포토부스(포토존) 백드롭 — 2024 MIDAS WEEK 본사 1층 포토존 시안(Figma 1361:3 "포토부스 시안")을 옮겼다.
//
// 이 매체가 다른 인쇄물과 다른 점:
//   1. 사람이 앞에 선다 — 화면 아래 가운데는 몸에 가린다. 글자와 로고는 가장자리로 몰고
//      가운데 아래는 도형만 둔다. 시안 4종이 모두 그렇게 짜여 있다.
//   2. 카메라가 찍는다 — CTA가 없다. 시안에도 없다. 사진에 남는 건 행사명·기간·로고뿐이라
//      포스터의 "사전등록" 같은 행동 유도 문구를 넣지 않는다. (인쇄물 공통: 버튼도 없다)
//   3. 매우 크다(m 단위) — 타이포는 짧은 변 비례 mm라 규격이 바뀌어도 비율이 유지된다.
//
// 시안 실측: 패널 4종이 모두 1553.39 × 776.69 = 정확히 2:1. 그래서 도형 좌표를
//   패널 좌표계(아래 PW×PH) 그대로 SVG viewBox에 넣고, 지면 비율이 달라지면 늘리지 않고 잘라낸다.
//
// 색은 캠페인 팔레트를 따른다 — 시안의 파랑/초록/주황 자리에 primary/secondary/accent가 들어간다.
//   (시안 고정색은 #5473B6 / #1DB29F / #FF6025 였다. 캠페인마다 주색이 다르므로 하드코딩하지 않는다.)

import { esc, fitFontSize, textWidth, WRAP } from './banner.js';
import { cmykText } from '../style.js';
import { fontStack, fontLink } from '../fonts.js';
import { onColor, contrast, BLACK, WHITE } from '../palette.js';

// 시안 패널 좌표계 — 아래 도형 좌표는 전부 이 기준이다.
const PW = 1553.4, PH = 776.7;

// 시안에서 실측한 도형 어휘 5종. w/h = 피그마 노드 bbox(원본 크기).
const SHAPES = {
  blob:  { w: 516.5, h: 525.5, d: 'M 427.4 282.5 C 319.6 427.2 156.5 535.6 63.1 524.7 C -30.3 513.8 -18.7 387.7 89.1 243 C 196.9 98.3 359.9 -10.2 453.4 0.8 C 546.8 11.7 535.1 137.8 427.4 282.5 Z' },
  wedge: { w: 690.6, h: 618.8, d: 'M 0 0 L 10.2 618.8 L 690.6 442.2 L 0 0 Z' },
  kite:  { w: 731.6, h: 794.2, d: 'M 285.8 794.2 L 731.6 675 L 445.8 0 L 0 119.1 L 285.8 794.2 Z' },
  star:  { w: 662.1, h: 699.7, d: 'M 570.8 109.5 C 576.1 108 580.7 113.3 578.8 118.7 L 527.9 268.1 C 526.8 271.4 528 274.9 530.8 276.6 L 658.8 356.2 C 663.4 359.1 663.1 366.3 658.1 368.8 L 522.7 438.2 C 519.8 439.7 518.2 443.1 519 446.5 L 554.7 599.2 C 556 604.7 550.9 609.7 545.8 607.8 L 405.2 556.5 C 402.1 555.4 398.7 556.7 397.1 559.7 L 319.6 696.2 C 316.8 701.1 310 700.8 307.7 695.7 L 244.2 553.8 C 242.8 550.7 239.6 549.1 236.5 550 L 91.2 590.3 C 85.9 591.7 81.4 586.4 83.2 581 L 134.1 431.6 C 135.2 428.4 134 424.8 131.2 423.1 L 3.3 343.5 C -1.4 340.6 -1 333.4 3.9 330.9 L 139.4 261.5 C 142.3 260 143.8 256.6 143.1 253.3 L 107.3 100.5 C 106 95 111.1 90 116.2 91.9 L 256.9 143.2 C 259.9 144.3 263.3 143 265 140 L 342.4 3.6 C 345.2 -1.4 352.1 -1.1 354.4 4 L 417.8 145.9 C 419.2 149 422.5 150.6 425.6 149.7 L 570.8 109.4 L 570.8 109.5 Z' },
  // 두 번 감기는 손그림 곡선 — 시안의 서명 같은 요소. 선 두께 15.6도 실측(패널 높이의 2%).
  loop:  { w: 1252.0, h: 1175.1, stroke: 15.6, d: 'M 1240.2 138.2 C 1261.9 107.4 1252.2 59.7 1223.3 31.8 C 1194.4 3.9 1151 -5 1113.3 2.6 C 1075.6 10.3 1043.1 32.7 1016.8 59.7 C 954.1 124.2 923.6 213.8 903.6 303 C 883.6 392.1 872.3 484.3 840 569.1 C 801.6 670.4 733.4 758.7 645.7 821 C 603.3 851.1 551.9 876 498.5 866.3 C 434.4 854.7 382.7 787.4 389.2 724 C 391 707.2 396.6 690.5 408.6 679.2 C 420.7 668 440.1 663.6 455.4 671.9 C 481.6 686 481 722.8 474.4 750.4 C 438.2 901 338.3 1031.7 203.3 1104.9 C 203.3 1104.9 66.4 1170.4 0 1175.1' },
};

// 시안 4종. art = [도형, 색역할, x, y, w, h] — 패널 좌표, 배열 순서가 곧 겹침 순서(뒤가 위).
//   TYPE1·TYPE2는 시안 노드 bbox를 그대로 실측했다.
//   TYPE3·TYPE4는 위치·크기만 실측하고, 어떤 도형인지는 시안 렌더를 보고 위 어휘에서 골랐다
//   (원본이 개별 벡터라 어휘와 1:1로 대응하지 않는다 — 구성은 같고 형태는 근사다).
const LAYOUTS = [
  { // TYPE1 — 좌상단 2줄 로크업, 우상단 기간, 우하단 로고. 도형은 아래쪽 띠에 모인다.
    id: 'TYPE1', ground: 'bg', lines: 2, title: 0.157, place: 'topLeft', showDate: true, logo: 'bottomRight', logoOn: 'secondary', box: 52,
    art: [
      ['kite',  'primary',   -287.5, 643.6,  731.6,  794.2],
      ['star',  'secondary', 1211.7, 426.8,  662.1,  699.7],
      ['kite',  'primary',    609.9, 451.1,  757.8,  905.8],
      ['wedge', 'secondary',  -27.8, 439.7,  690.6,  618.8],
      ['blob',  'accent',     153.2, 533.2,  516.5,  525.5],
      ['loop',  'primary',    786.0, -374.1, 1252.0, 1175.1],
    ],
  },
  { // TYPE2 — 좌상단 3줄 로크업이 accent 블롭 위에 얹힌다. 글자색은 블롭 대비로 정해진다.
    id: 'TYPE2', ground: 'bg', lines: 3, title: 0.163, place: 'topLeft', on: 'accent', logo: 'bottomRight', logoOn: 'primary', box: 35,
    art: [
      ['wedge', 'secondary',  627.6, -15.5,  1066.6, 551.4],
      ['kite',  'primary',    986.4, 232.6,  779.8,  1224.8],
      ['wedge', 'secondary',  478.3, 525.5,  707.6,  618.8],
      ['wedge', 'paper',      -93.1, 440.5,  477.9,  392.5],
      ['blob',  'accent',    -580.8, -39.5,  1307.5, 701.8],
      ['loop',  'paper',      779.4, -586.2, 1210.7, 1270.5],
    ],
  },
  { // TYPE3 — secondary 지면을 꽉 채우고 상단 중앙에 한 줄만 작게. 도형이 주인공인 안.
    id: 'TYPE3', ground: 'secondary', lines: 1, title: 0.069, place: 'topCenter', logo: 'bottomRight', logoOn: 'primary', box: 66,
    art: [
      ['blob',  'accent',    -180.8, -64.4,  930.4,  992.8],
      ['kite',  'paper',     -299.7, 205.4,  712.5,  633.9],
      ['wedge', 'secondary',  108.2, 482.2,  502.0,  827.4],
      ['star',  'primary',   1029.9, 231.0,  843.3,  865.4],
      ['star',  'primary',    904.7, 358.3,  502.3,  514.3],
      ['blob',  'accent',    1171.9, -79.8,  580.9,  669.1],
      ['loop',  'paper',      638.9, 217.5,  1181.2, 575.8],
    ],
  },
  { // TYPE4 — 정중앙 3줄 로크업 + 장소 한 줄, 로고는 우상단. 도형은 네 귀퉁이로 흩어진다.
    id: 'TYPE4', ground: 'bg', lines: 3, title: 0.084, place: 'center', showVenue: true, logo: 'topRight', logoOn: 'primary', box: 24,
    art: [
      ['blob',  'accent',    -542.5, 416.3,  929.6,  1017.2],
      ['blob',  'accent',    -261.9, 303.0,  895.1,  862.3],
      ['kite',  'primary',      9.8, 403.6,  373.1,  439.4],
      ['wedge', 'secondary',  961.9, -19.1,  705.3,  596.1],
      ['kite',  'primary',   1052.7, -242.2, 692.6,  692.6],
      ['star',  'secondary',  315.9, 494.4,  507.0,  607.0],
      ['blob',  'accent',    1214.4, 483.0,  600.1,  749.5],
      ['loop',  'primary',    124.3, 21.3,   1307.7, 735.6],
    ],
  },
];

export function renderPhotobooth(ctx, style, spec) {
  const { name, date, venue } = ctx.core;
  const p = style.palette;
  const L = LAYOUTS[Math.min(Math.max(spec.variant ?? 0, 0), LAYOUTS.length - 1)];

  const W = spec.wmm + spec.bleed * 2;
  const H = spec.hmm + spec.bleed * 2;
  const base = Math.min(spec.wmm, spec.hmm);
  const mm = k => (base * k).toFixed(2);
  // 시안 실측: 로크업 왼쪽·위 여백은 짧은 변의 11%대. 로고는 그보다 붙는다(7~9%).
  const pad = (base * 0.11 + spec.bleed).toFixed(1);
  const logoPad = (base * 0.08 + spec.bleed).toFixed(1);

  const ground = L.ground === 'secondary' ? p.secondary : p.bg;
  // 글자는 순흑·순백만. TYPE2 로크업은 블롭 위에서 시작하지만 행사명이 시안보다 길면
  // 아래 줄이 지면으로 흘러나간다 — 두 바탕에 다 걸치므로 나쁜 쪽 대비로 판정한다.
  const ink = L.on === 'accent' ? inkOver(p.accent, ground) : onColor(ground);
  const groundInk = onColor(ground);

  const roles = { primary: p.primary, secondary: p.secondary, accent: p.accent, paper: p.bg };
  // 로고는 지면이 아니라 그 귀퉁이에 깔린 도형 위에 얹힌다 — 시안도 도형 위 흰 워드마크였다.
  // 지면 기준으로 판정하면 어두운 도형 위에 검은 로고를 얹어 사라진다.
  const logoInk = onColor(roles[L.logoOn] ?? ground);
  const art = L.art.map(([shape, role, x, y, w, h]) => {
    const s = SHAPES[shape];
    const sx = w / s.w, sy = h / s.h;
    const g = `transform="translate(${x} ${y}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})"`;
    // 곡선은 면이 아니라 선이다. 확대·축소로 두께가 흔들리지 않게 스케일을 되나눠 준다.
    const paint = s.stroke
      ? `fill="none" stroke="${roles[role]}" stroke-width="${(s.stroke / ((sx + sy) / 2)).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`
      : `fill="${roles[role]}"`;
    return `<path d="${s.d}" ${paint} ${g}/>`;
  }).join('');

  /* ── 로크업 크기·줄 수 ──
     시안은 "2024 MIDAS WEEK"처럼 짧은 워드마크라 줄 수(L.lines)와 크기가 고정이어도 됐다.
     실제 행사명("… 및 디지털 트윈 기술 혁신 컨퍼런스 with MIDAS IT")이 들어오면
     비워 둔 폭(L.box%)에서 CSS가 알아서 예닐곱 줄로 접었고, 그 줄들이 아래 도형 띠까지 내려와
     검은 글자가 남색 도형 위에 얹혀 사라졌다. 이 매체는 "가운데 아래는 도형만" 이라는 규칙이
     구성의 핵심이라(사람이 그 앞에 선다) 로크업은 반드시 위쪽 띠 안에 머물러야 한다. */
  const lockW = spec.wmm * (L.box / 100);
  // 상단 배치는 여백(11%) 아래 42%까지, 정중앙 배치는 중앙 기준 44%까지. 그 아래는 도형 몫이다.
  const lockH = spec.hmm * (L.place === 'center' ? 0.44 : 0.42);
  const lock = fitLockup(name, lockW, lockH, base * L.title, base * L.title * 0.3, L.lines);
  const titleMm = lock.fs;
  const lines = titleLines(name, lock.lines).map(esc).join('<br>');
  // 로고 자리는 시안에서 브랜드 워드마크였다. 로고가 없으면 비운다 —
  // 장소나 날짜로 대신 채우면 그게 브랜드인 것처럼 읽힌다.
  const brand = style.logo
    ? `<div class="logo ${L.logo}"><img class="brand" src="${esc((logoInk === '#FFFFFF' && style.logoMono) ? style.logoMono : style.logo)}" alt=""></div>`
    : '';

  const pxW = (W * 3.7795).toFixed(0);
  const pxH = (H * 3.7795).toFixed(0);

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${fontLink(style.fonts.heading)}
<style>
@page{size:${W}mm ${H}mm;margin:0}
*{box-sizing:border-box;margin:0}
.sheet{width:${W}mm;height:${H}mm;background:${ground};color:${groundInk};font-family:${fontStack(style.fonts.heading)};position:relative;overflow:hidden}
.art{position:absolute;inset:0;width:100%;height:100%}
/* box = 시안이 로크업에 비워 둔 구역의 폭(지면 대비 %). 행사명이 시안보다 길어도
   글자가 도형 위로 흘러나가 읽히지 않는 일이 없도록 그 안에서 줄바꿈시킨다. */
.lock{position:absolute;color:${ink};max-width:${L.box}%}
.title{font-size:${titleMm.toFixed(2)}mm;font-weight:800;line-height:1.04;letter-spacing:-0.01em;${WRAP}}
.sub{font-size:${mm(0.035)}mm;font-weight:600;opacity:.9;margin-top:${mm(0.03)}mm}
.date{position:absolute;right:${pad}mm;top:${pad}mm;font-size:${mm(0.043)}mm;font-weight:700;color:${groundInk}}
.logo{position:absolute;line-height:0}
/* 로고 폭을 물리지 않으면 초가로 로크업이 백드롭을 가로질러 로크업 글자와 겹친다.
   contain이라 정사각·가로긴 로고 모두 이 상자 안에서만 산다. */
.brand{height:${mm(0.031)}mm;width:auto;max-width:${(spec.wmm * 0.22).toFixed(2)}mm;object-fit:contain;${logoInk === '#FFFFFF' ? 'filter:brightness(0) invert(1)' : ''}}
.topLeft{left:${pad}mm;top:${pad}mm}
.topCenter{left:0;right:0;margin:0 auto;top:${pad}mm;text-align:center}
.center{left:0;right:0;margin:0 auto;top:50%;transform:translateY(-58%);text-align:center}
.bottomRight{right:${logoPad}mm;bottom:${logoPad}mm}
.topRight{right:${logoPad}mm;top:${logoPad}mm}
.trim{display:none}
@media screen{
  html{background:#2e2e2e}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:38px 20px 20px}
  .trim{display:block;position:absolute;inset:${spec.bleed}mm;border:0.4mm dashed ${groundInk}73;pointer-events:none}
  .cap{position:fixed;top:9px;left:0;right:0;text-align:center;color:#c9c9c9;font:12px/1.5 system-ui,sans-serif}
  .cap b{color:#eee}
}
@media print{ body{margin:0;padding:0;display:block} .cap{display:none} .stage{transform:none!important;width:auto!important;height:auto!important;position:static!important} .sheet{position:relative!important;left:auto!important;top:auto!important;transform:none!important} }
</style>
</head>
<body>
<div class="cap"><b>${W} × ${H}mm</b> (재단 ${spec.wmm}×${spec.hmm} + 블리드 ${spec.bleed}mm) · ${L.id} · 점선 = 재단선 · 인쇄 시 실측 출력<br>메인 ${p.primary} ≈ ${cmykText(p.primary)} <span style="opacity:.6">(근사값 — 분판은 인쇄소 프로파일 기준)</span></div>
<div class="stage" id="stage">
  <div class="sheet">
    <svg class="art" viewBox="0 0 ${PW} ${PH}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${art}</svg>
    <div class="lock ${L.place}">
      <div class="title">${lines}</div>
      ${L.showVenue ? `<div class="sub">in ${esc(venue)}</div>` : ''}
    </div>
    ${L.showDate ? `<div class="date">${esc(date)}</div>` : ''}
    ${brand}
    <div class="trim"></div>
  </div>
</div>
<script>
(function(){
  var st=document.getElementById('stage'), sh=st.firstElementChild;
  function fit(){
    var s=Math.min((innerWidth-56)/${pxW},(innerHeight-110)/${pxH},1);
    st.style.position='relative';
    st.style.width=(${pxW}*s)+'px'; st.style.height=(${pxH}*s)+'px';
    sh.style.position='absolute'; sh.style.left='0'; sh.style.top='0';
    sh.style.transformOrigin='0 0'; sh.style.transform='scale('+s+')';
  }
  fit(); addEventListener('resize',fit);
})();
<\/script>
</body>
</html>`;
}

// 여러 바탕에 걸치는 글자색 — 가장 나쁜 바탕에서의 대비가 더 높은 쪽을 고른다.
// 어느 한 바탕에서 글자가 사라지는 경우(대비 1)를 피하는 게 목적이다.
function inkOver(...grounds) {
  const worst = c => Math.min(...grounds.map(g => contrast(c, g)));
  return worst(WHITE) >= worst(BLACK) ? WHITE : BLACK;
}

/* 로크업은 titleLines()가 단어 단위로 미리 줄을 나눠 <br>로 박는다 — 그래서 "한 줄에 몇 글자"가
   아니라 "가장 긴 줄이 얼마나 넓은가"가 크기를 정한다. 줄 수를 시안 값부터 하나씩 늘려 보며
   폭·높이 둘 다 만족하는 가장 큰 크기를 고른다. 시안 크기 그대로 들어가면 거기서 멈춘다 —
   짧은 워드마크에서는 시안 구성이 그대로 유지돼야 한다. */
function fitLockup(name, boxW, boxH, max, min, minLines) {
  let best = { fs: 0, lines: minLines };
  for (let n = minLines; n <= minLines + 6; n++) {
    const parts = titleLines(name, n);
    const widest = Math.max(...parts.map(textWidth), 0.001);
    const fs = Math.min(max, boxW / widest, boxH / (parts.length * 1.04));
    if (fs > best.fs) best = { fs, lines: parts.length };
    if (fs >= max) break;                       // 시안 크기 그대로 — 더 쪼갤 이유가 없다
    if (parts.length < n) break;                // 단어를 다 써서 더는 줄이 늘지 않는다
  }
  return { fs: Math.max(min, best.fs), lines: best.lines };
}

// 시안 로크업은 "2024 / MIDAS WEEK"처럼 맨 앞 연도를 떼어 첫 줄에 세운다.
// 남은 단어는 나머지 줄에 고르게 나눈다 — 행사명 길이가 달라도 덩어리 모양이 유지된다.
export function titleLines(name, maxLines = 2) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  if (maxLines <= 1) return [words.join(' ')];
  const lines = [];
  if (/^\d{4}$/.test(words[0]) && words.length > 1) lines.push(words.shift());
  const rest = Math.max(1, maxLines - lines.length);
  const per = Math.ceil(words.length / rest);
  for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(' '));
  return lines.length ? lines : [''];
}
