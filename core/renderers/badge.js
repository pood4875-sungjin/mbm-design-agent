// 참석자 명찰 — 인쇄물이지만 다른 인쇄물과 성격이 다르다:
//   · 사람마다 내용이 바뀐다(명단 주입)
//   · 한 파일에 여러 장이 들어간다(사람 수만큼 페이지)
//   · 이름이 주인공이다 — 멀리서 읽히도록 가장 크게
//
// 레이아웃 근거: 엔솔 오프라인 MBM 템플릿(Figma 762:4075) — 110×140mm,
//   어두운 바탕 · 상단 행사명 · 중앙 이름/소속 · 하단 로고 · 배경에 회전하는 겹사각 모티프.
//   모티프 색은 캠페인 주색을 따라간다(템플릿은 마젠타 고정이었다).
//
// 명단이 없으면 견본 1장(플레이스홀더)을 낸다. 있으면 사람 수만큼 페이지를 이어 붙인다.

import { esc } from './banner.js';
import { fontStack, fontLink } from '../fonts.js';
import { shiftHue } from '../palette.js';

const SAMPLE = [{ name: '홍길동', org: 'MIDAS IT', role: '책임연구원' }];
const LAYERS = 17;   // 템플릿과 같은 겹 수 (762:4079~4095)

export function renderBadge(ctx, style, spec) {
  const people = (spec.roster?.length ? spec.roster : SAMPLE);
  const p = style.palette;
  const W = spec.wmm + spec.bleed * 2;
  const H = spec.hmm + spec.bleed * 2;
  const base = Math.min(spec.wmm, spec.hmm);
  const mm = k => (base * k).toFixed(2);
  const pxW = (W * 3.7795).toFixed(0);
  const pxH = (H * 3.7795).toFixed(0);
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

  const page = (person, i) => `<div class="badge" ${i ? 'style="page-break-before:always"' : ''}>
  <div class="art">${vortex}</div>
  <div class="evt">${esc(evt)}</div>
  <div class="mid">
    <div class="pname">${esc(person.name)}</div>
    ${person.org ? `<div class="porg">${esc(person.org)}</div>` : ''}
    ${person.role ? `<div class="prole">${esc(person.role)}</div>` : ''}
  </div>
  <div class="foot">${style.logo
    ? `<img class="brand" src="${esc(style.logo)}" alt="">`
    : `<span class="meta">${esc(date)} · ${esc(venue)}</span>`}</div>
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
.badge{width:${W}mm;height:${H}mm;background:${card};color:#FFFFFF;font-family:${fontStack(style.fonts.heading)};
  position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;
  padding:${mm(0.075)}mm ${mm(0.07)}mm ${mm(0.06)}mm}
.art{position:absolute;left:50%;top:50%;width:${spec.wmm}mm;height:${spec.wmm}mm;transform:translate(-50%,-50%)}
.evt{position:relative;font-size:${mm(0.045)}mm;font-weight:600;letter-spacing:-0.01em;text-align:center;line-height:1.1;word-break:keep-all}
.mid{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${mm(0.012)}mm;text-align:center;width:100%}
.pname{font-size:${mm(0.12)}mm;font-weight:600;letter-spacing:-0.01em;line-height:1.11;word-break:keep-all}
.porg{font-size:${mm(0.037)}mm;font-weight:600;letter-spacing:-0.01em;line-height:1.11;opacity:.95}
.prole{font-size:${mm(0.032)}mm;opacity:.72;margin-top:${mm(0.008)}mm}
.foot{position:relative;height:${mm(0.05)}mm;display:flex;align-items:center;justify-content:center}
.brand{height:${mm(0.038)}mm;width:auto;filter:brightness(0) invert(1)}
.meta{font-size:${mm(0.028)}mm;opacity:.6}
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
<div class="cap">명찰 ${people.length}장 · ${W}×${H}mm (재단 ${spec.wmm}×${spec.hmm} + 블리드 ${spec.bleed}mm) · 인쇄하면 1인 1페이지</div>
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

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
