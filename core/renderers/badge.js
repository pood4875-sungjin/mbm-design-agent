// 참석자 명찰 — 인쇄물이지만 다른 인쇄물과 성격이 다르다:
//   · 사람마다 내용이 바뀐다(명단 주입)
//   · 한 파일에 여러 장이 들어간다(사람 수만큼 페이지)
//   · 이름이 주인공이다 — 멀리서 읽히도록 가장 크게
//
// 시안 2종 — 같은 "명찰"이라도 착용 방식이 달라 구성이 갈린다:
//   variant 0 = 세로형 110×140mm · 엔솔 오프라인 MBM 템플릿(Figma 762:4075)
//       어두운 지면 · 상단 행사명 · 중앙 이름/소속 · 하단 로고 · 배경에 회전하는 겹사각 모티프.
//   variant 1 = 가로형 100×90mm · H.Solution Day 명찰 자체인쇄(Figma 258:2023)
//       목걸이 홀더에 끼우는 카드라 지면이 짧고 넓다. 이름이 위, 그 아래 "소속 | 직급" 한 줄,
//       하단에 원형 그래픽 밴드, 맨 아래 행사 워드마크. 상단 행사명은 없다 —
//       워드마크가 그 역할을 하므로 이름이 카드에서 유일한 큰 글자가 된다.
//
// 규격을 가로로 바꾸면(wmm > hmm) variant와 상관없이 가로형이 된다.
//   print.js의 `landscape` 판단과 같은 관례 — 규격만 바꿔도 레이아웃이 따라오게 하려는 것이다.
//
// 두 시안 모두 색은 캠페인 팔레트를 따른다(템플릿의 마젠타, 시안의 남색·연두는 고정색이 아니다).
// 명단이 없으면 견본 1장(플레이스홀더)을 낸다. 있으면 사람 수만큼 페이지를 이어 붙인다.

import { esc } from './banner.js';
import { fontStack, fontLink } from '../fonts.js';
import { shiftHue } from '../palette.js';

const SAMPLE = [{ name: '홍길동', org: 'MIDAS IT', role: '책임연구원' }];
const LAYERS = 17;   // 세로형 템플릿과 같은 겹 수 (762:4079~4095)

export function renderBadge(ctx, style, spec) {
  const people = (spec.roster?.length ? spec.roster : SAMPLE);
  const W = spec.wmm + spec.bleed * 2;
  const H = spec.hmm + spec.bleed * 2;
  const base = Math.min(spec.wmm, spec.hmm);
  const mm = k => (base * k).toFixed(2);        // 타이포·굵기 — 매체 짧은 변 비례(인쇄물 공통 규칙)
  const pxW = (W * 3.7795).toFixed(0);
  const pxH = (H * 3.7795).toFixed(0);

  const landscape = spec.variant === 1 || spec.wmm > spec.hmm;
  const L = landscape
    ? horizontalLayout(ctx, style, spec, { mm })
    : verticalLayout(ctx, style, spec, { mm });

  const page = (person, i) => `<div class="badge"${i ? ' style="page-break-before:always"' : ''}>
${L.body(person, i)}
  <div class="trim"></div>
</div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${fontLink(style.fonts.heading)}
<style>
@page{size:${W}mm ${H}mm;margin:0}
*{box-sizing:border-box;margin:0}
.badge{width:${W}mm;height:${H}mm;font-family:${fontStack(style.fonts.heading)};position:relative;overflow:hidden}
${L.css}
.trim{display:none}
@media screen{
  html{background:#2e2e2e}
  body{padding:36px 20px 24px;display:flex;flex-wrap:wrap;gap:20px;justify-content:center;align-items:flex-start}
  .badge{box-shadow:0 6px 30px rgba(0,0,0,.5);transform:scale(var(--fit,1));transform-origin:top center;page-break-before:auto!important}
  .trim{display:block;position:absolute;inset:${spec.bleed}mm;border:0.4mm dashed rgba(255,255,255,.35);pointer-events:none}
  .cap{position:fixed;top:9px;left:0;right:0;text-align:center;color:#c9c9c9;font:12px/1.5 system-ui,sans-serif}
}
@media print{ body{margin:0;padding:0;display:block} .cap{display:none} .badge{transform:none!important;box-shadow:none} }
</style>
</head>
<body>
<div class="cap">명찰 ${people.length}장 · ${L.label} · ${W}×${H}mm (재단 ${spec.wmm}×${spec.hmm} + 블리드 ${spec.bleed}mm) · 인쇄하면 1인 1페이지</div>
${people.map(page).join('\n')}
<script>
(function(){
  function fit(){
    var cols=Math.max(1,Math.min(4,Math.floor((innerWidth-40)/(${pxW}+20))));
    var s=Math.min(((innerWidth-40)/cols-20)/${pxW},(innerHeight-120)/${pxH},1);
    document.querySelectorAll('.badge').forEach(function(b){
      b.style.setProperty('--fit',s);
      b.style.marginBottom=(${pxH}*(s-1))+'px';
    });
  }
  fit(); addEventListener('resize',fit);
})();
<\/script>
</body>
</html>`;
}

/* ── variant 0 · 세로형 (엔솔 템플릿 762:4075) ────────────────────────────── */

function verticalLayout(ctx, style, spec, { mm }) {
  const p = style.palette;
  const { name: evt, date, venue } = ctx.core;

  // 배경: 검정 지면 위에서 주색이 안쪽으로 갈수록 밝아지는 겹사각(회전 누적)
  const card = '#0A0A0C';
  // 바깥은 지면에 가깝게 어둡고, 안으로 들어갈수록 주색이 밝아진다.
  // 각 겹을 조금씩 회전시키면 대각 모서리가 겹쳐 소용돌이 결이 생긴다(불투명 = 결이 선명).
  const edge = mixHex(card, p.primary, 0.22);
  const inner = shiftHue(p.primary, 0, 0.16, -0.06);
  const vortex = Array.from({ length: LAYERS }, (_, i) => {
    const t = i / (LAYERS - 1);
    const size = 97 - t * 44;
    const rot = -6 - t * 46;
    const col = mixHex(edge, inner, t);
    return `<div style="position:absolute;left:50%;top:50%;width:${size}%;height:${size}%;` +
      `transform:translate(-50%,-50%) rotate(${rot.toFixed(2)}deg);background:${col}"></div>`;
  }).join('');

  return {
    label: '세로형',
    css: `.badge{background:${card};color:#FFFFFF;display:flex;flex-direction:column;align-items:center;
  padding:${mm(0.075)}mm ${mm(0.07)}mm ${mm(0.06)}mm}
.art{position:absolute;left:50%;top:50%;width:${spec.wmm}mm;height:${spec.wmm}mm;transform:translate(-50%,-50%)}
.evt{position:relative;font-size:${mm(0.045)}mm;font-weight:600;letter-spacing:-0.01em;text-align:center;line-height:1.1;word-break:keep-all}
.mid{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${mm(0.012)}mm;text-align:center;width:100%}
.pname{font-size:${mm(0.12)}mm;font-weight:600;letter-spacing:-0.01em;line-height:1.11;word-break:keep-all}
.porg{font-size:${mm(0.037)}mm;font-weight:600;letter-spacing:-0.01em;line-height:1.11;opacity:.95}
.prole{font-size:${mm(0.032)}mm;opacity:.72;margin-top:${mm(0.008)}mm}
.foot{position:relative;height:${mm(0.05)}mm;display:flex;align-items:center;justify-content:center}
.brand{height:${mm(0.038)}mm;width:auto;filter:brightness(0) invert(1)}
.meta{font-size:${mm(0.028)}mm;opacity:.6}`,
    body: person => `  <div class="art">${vortex}</div>
  <div class="evt">${esc(evt)}</div>
  <div class="mid">
    <div class="pname">${esc(person.name)}</div>
    ${person.org ? `<div class="porg">${esc(person.org)}</div>` : ''}
    ${person.role ? `<div class="prole">${esc(person.role)}</div>` : ''}
  </div>
  <div class="foot">${style.logo
      ? `<img class="brand" src="${esc(style.logo)}" alt="">`
      : `<span class="meta">${esc(date)} · ${esc(venue)}</span>`}</div>`,
  };
}

/* ── variant 1 · 가로형 (H.Solution Day 258:2023) ─────────────────────────── */

// 시안 실측(카드 노드 198:1817 = 284×255pt, ×0.3528 → 100.2×90.0mm)을 재단 높이 대비 비율로 환산.
// 세로 위치는 전부 높이 255pt 기준 — 규격이 바뀌어도 비례로 따라간다.
const HZ = {
  nameTop: 0.149,    // 이름 잉크 윗선    37.98/255
  metaTop: 0.413,    // 소속·직급 잉크 윗선 105.27/255
  bandTop: 0.569,    // 그래픽 밴드 윗선  145.27/255
  bandH: 0.208,      // 밴드 높이 = 원 지름 52.32/255
  markBottom: 0.084, // 워드마크 아랫선까지의 여백 (255-233.61)/255
  nameSize: 0.190,   // 이름 — 잉크 높이가 지면의 16.8%(42.85/255)가 되는 크기
  metaSize: 0.056,   // 소속·직급 — 잉크 높이 5.0%(12.69/255)
  markSize: 0.046,   // 워드마크 대체 텍스트 (시안은 로고 락업이라 폭이 아니라 무게를 맞춘다)
};
// 위 수치는 "글자 잉크"의 위치인데 CSS `top`은 라인박스를 잡는다.
// 그 차이(라인박스 윗선 ~ 한글 잉크 윗선)는 글자 크기에 비례하므로 em 상수 하나로 보정한다.
const LEAD = 0.062;

function horizontalLayout(ctx, style, spec, { mm }) {
  const p = style.palette;
  const { name: evt } = ctx.core;
  const ink = p.onPrimary;             // 순흑/순백 중 지면 대비가 큰 쪽 (palette.onColor)
  const bandH = spec.hmm * HZ.bandH;
  const nameFs = Number(mm(HZ.nameSize));
  const metaFs = Number(mm(HZ.metaSize));
  // 이름 라인박스 바로 아래에서 소속줄 잉크가 metaTop에 앉도록 역산한 간격
  const metaGap = spec.hmm * (HZ.metaTop - HZ.nameTop) - nameFs + LEAD * (nameFs - metaFs);

  return {
    label: '가로형',
    // 지면은 주색. 시안은 남색·연두 2벌이었는데, 그건 캠페인 주색/보조색 자리다 — 고정하지 않는다.
    css: `.badge{background:${p.primary};color:${ink}}
.head{position:absolute;left:0;right:0;top:${(spec.bleed + spec.hmm * HZ.nameTop - nameFs * LEAD).toFixed(2)}mm;text-align:center;padding:0 ${mm(0.05)}mm}
.pname{font-size:${nameFs.toFixed(2)}mm;font-weight:700;letter-spacing:-0.035em;line-height:1;word-break:keep-all}
.pmeta{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0 ${mm(0.035)}mm;
  margin-top:${metaGap.toFixed(2)}mm;
  font-size:${metaFs.toFixed(2)}mm;font-weight:700;letter-spacing:-0.01em;line-height:1;word-break:keep-all}
.pmeta span{min-width:0}
.pmeta i{width:${mm(0.005)}mm;height:${mm(0.05)}mm;background:${ink};opacity:.55;flex:none}
.band{position:absolute;left:0;top:${(spec.bleed + spec.hmm * HZ.bandTop).toFixed(2)}mm;
  width:${(spec.wmm + spec.bleed * 2).toFixed(2)}mm;height:${bandH.toFixed(2)}mm;display:block}
.mark{position:absolute;left:0;right:0;bottom:${(spec.bleed + spec.hmm * HZ.markBottom).toFixed(2)}mm;
  display:flex;align-items:flex-end;justify-content:center}
.markText{font-size:${mm(HZ.markSize)}mm;font-weight:700;letter-spacing:-0.01em;line-height:1;word-break:keep-all}
.brand{height:${mm(0.05)}mm;width:auto;${ink === '#FFFFFF' ? 'filter:brightness(0) invert(1)' : 'filter:brightness(0)'}}`,
    body: (person, i) => {
      // 시안은 소속과 직급을 세로로 쌓지 않고 얇은 세로줄로 이어 한 줄에 붙인다.
      // 둘 중 하나만 있으면 구분선도 빼야 줄이 어색해지지 않는다.
      const bits = [person.org, person.role].filter(Boolean).map(t => `<span>${esc(t)}</span>`);
      return `  ${band(p, spec, i)}
  <div class="head">
    <div class="pname">${esc(person.name)}</div>
    ${bits.length ? `<div class="pmeta">${bits.join('<i></i>')}</div>` : ''}
  </div>
  <div class="mark">${style.logo
        ? `<img class="brand" src="${esc(style.logo)}" alt="">`
        : `<span class="markText">${esc(evt)}</span>`}</div>`;
    },
  };
}

// 하단 원형 그래픽 밴드 (시안 198:1849 · 198:1856).
// 실측은 전부 "밴드 높이 = 1" 단위로 환산해 뒀다(pt ÷ 52.32) — 규격이 바뀌어도 원이 찌그러지지 않는다.
// 원 지름 = 밴드 높이, 알약(stadium)의 둥근 끝도 같은 반지름 0.5.
// 왼쪽 무리는 왼쪽 재단선에, 오른쪽 무리는 오른쪽 재단선에 붙는다 —
//   규격이 넓어지면 가운데 여백만 벌어지고 양끝은 그대로 재단면 밖으로 흘러나간다.
const BAND = {
  // 그라데이션은 알약의 바운딩박스 기준(objectBoundingBox)이라 알약이 왼쪽으로 얼마나
  // 흘러나가는지가 재단선에서 보이는 색을 정한다. 시안은 재단선에서 이미 청록으로 물들어 있다
  // (x=19pt에서 보조색→주색 사이 약 55% 지점) — 그 색이 나오는 꼬리 길이가 -0.35.
  tailL: -0.35,
  capL: 0.425,    // 왼쪽 그라데이션 알약의 둥근 끝 중심 (22.5pt)
  leafL: 1.198,   // 왼쪽 보조색 원 중심 (63.5pt)
  // ↓ *R은 "오른쪽 재단선에서 왼쪽으로 얼마나"인 거리다. 음수면 재단선 바깥(흘림).
  discR: 2.103,   // 주색 원 중심 (172.5pt)
  paleR: 1.311,   // 흰 반원의 중심 (214.5pt)
  edgeR: 1.320,   // 오른쪽 그라데이션 알약의 곧은 왼쪽 끝 (214pt)
  capR: 0.707,    // 오른쪽 그라데이션 알약의 둥근 끝 중심 (246.5pt)
  leafR: -0.302,  // 오른쪽 보조색 원 중심 (300pt — 재단선 밖으로 나간다)
};

function band(p, spec, i) {
  const bandH = spec.hmm * HZ.bandH;
  const R = spec.wmm / bandH;          // 재단 폭 (밴드 높이 단위)
  const bl = spec.bleed / bandH;       // 블리드 (같은 단위)
  const n = v => Number(v).toFixed(4);

  // 지면이 주색이므로 원은 주색에서 띄워야 보인다. 시안 실측이 지면 (46,45,90) → 원 (45,72,158),
  // 즉 명도 +0.13 · 채도 +0.22쯤 올린 같은 계열이었다. 색상은 돌리지 않는다 —
  // 캠페인 주색이 무엇으로 바뀌어도 "주색의 선명한 판"으로 읽히게 하려는 것.
  const disc = shiftHue(p.primary, 0, 0.13, 0.22);
  const leaf = p.secondary;
  // 흰 반원이 주색 원 위에 겹치는 자리 — 시안은 옅은 하늘색이다. 두 색의 중간으로 만든다.
  const lens = mixHex(disc, p.onPrimary, 0.5);

  const gid = `bg${i}`, cid = `bc${i}`;
  const pill = (x0, cx) => `M ${n(x0)},0 H ${n(cx)} A .5,.5 0 0 1 ${n(cx)},1 H ${n(x0)} Z`;

  return `<svg class="band" viewBox="${n(-bl)} 0 ${n(R + bl * 2)} 1" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${leaf}"/><stop offset="1" stop-color="${disc}"/>
      </linearGradient>
      <clipPath id="${cid}"><circle cx="${n(R - BAND.discR)}" cy=".5" r=".5"/></clipPath>
    </defs>
    <circle cx="${n(BAND.leafL)}" cy=".5" r=".5" fill="${leaf}"/>
    <path d="${pill(Math.min(BAND.tailL, -bl - 0.1), BAND.capL)}" fill="url(#${gid})"/>
    <circle cx="${n(R - BAND.discR)}" cy=".5" r=".5" fill="${disc}"/>
    <path d="M ${n(R - BAND.paleR)},0 A .5,.5 0 0 0 ${n(R - BAND.paleR)},1 Z" fill="${p.onPrimary}"/>
    <circle cx="${n(R - BAND.paleR)}" cy=".5" r=".5" fill="${lens}" clip-path="url(#${cid})"/>
    <circle cx="${n(R - BAND.leafR)}" cy=".5" r=".5" fill="${leaf}"/>
    <path d="${pill(R - BAND.edgeR, R - BAND.capR)}" fill="url(#${gid})"/>
  </svg>`;
}

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
