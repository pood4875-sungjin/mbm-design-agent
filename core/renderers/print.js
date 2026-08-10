// 인쇄 렌더러 — poster·xbanner·현수막 공용. 페이지 = 재단(trim) + 블리드, 풀블리드 배경.
//
// 매체 규칙 (온라인과 다른 점):
//   1. 버튼 없음 — 종이는 누를 수 없다. CTA는 굵은 텍스트 + 구분선으로 표현.
//   2. 타이포는 매체 짧은 변에 비례(mm) — A2와 현수막이 같은 코드로 스케일.
//   3. 재단(trim) + 블리드 = 실측 mm. 화면 미리보기에서만 재단선을 점선으로 표시.
//   4. 용도(purpose)에 따라 레이아웃이 달라진다 — 같은 X배너라도 현장 역할이 다르다:
//        main      메인 홍보 (행사명 크게)
//        way       방향 안내 (화살표가 주인공, 글자는 짧게)
//        agenda    프로그램 안내 (시간표 블록)
//        reception 사전등록·안내데스크 (역할 라벨이 주인공)
//   5. 현수막은 가로형 — 센터 대형 타이포가 기본.
//
// 화면/인쇄 이원화: 실측 mm 그대로면 브라우저에서 귀퉁이만 보인다.
//   @media screen — 뷰포트에 맞춰 축소해 전체를 보여주고 재단선·CMYK 가이드 표시.
//   @media print  — 변형 없이 실측 mm 그대로 출력(PDF 규격 보존).

import { esc } from './banner.js';
import { cmykText } from '../style.js';
import { fontStack, fontLink } from '../fonts.js';

const ARROW_GLYPH = { up: '↑', down: '↓', left: '←', right: '→' };
const PURPOSE_LABEL = { main: '', way: '', agenda: 'PROGRAM', reception: 'REGISTRATION' };

export function renderPrint(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const purpose = spec.purpose ?? 'main';
  const W = spec.wmm + spec.bleed * 2;
  const H = spec.hmm + spec.bleed * 2;
  const base = Math.min(spec.wmm, spec.hmm);
  const landscape = spec.wmm > spec.hmm;
  const centered = spec.variant === 1 || landscape || purpose === 'way' || purpose === 'reception';
  const pad = (base * 0.09 + spec.bleed).toFixed(1);
  const mm = k => (base * k).toFixed(1);
  const useKv = style.keyVisual && purpose === 'main';
  const rd = useKv ? (style.kvReadability?.print ?? null) : null;
  const fg = rd?.text ?? p.onPrimary;
  const bg = useKv
    ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
    : `background:${p.primary}`;
  const scrim = rd?.scrim
    ? `<div style="position:absolute;inset:0;background:linear-gradient(180deg,${fg === '#FFFFFF' ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.58)'},transparent 70%);pointer-events:none"></div>`
    : '';
  const pxW = (W * 3.7795).toFixed(0);
  const pxH = (H * 3.7795).toFixed(0);

  const body = {
    main: mainBody, way: wayBody, agenda: agendaBody, reception: receptionBody,
  }[purpose](ctx, style, spec, mm, landscape);

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${fontLink(style.fonts.heading)}
<style>
@page{size:${W}mm ${H}mm;margin:0}
*{box-sizing:border-box;margin:0}
.sheet{width:${W}mm;height:${H}mm;${bg};color:${fg};font-family:${fontStack(style.fonts.heading)};display:flex;flex-direction:column;align-items:${centered ? 'center' : 'flex-start'};justify-content:${purpose === 'main' && !landscape ? 'space-between' : 'center'};${centered ? 'text-align:center;' : ''}gap:${mm(0.05)}mm;padding:${pad}mm;overflow:hidden;position:relative}
.title{font-size:${mm(0.10)}mm;font-weight:800;line-height:1.15;word-break:keep-all}
.sub{font-size:${mm(0.038)}mm;opacity:.92;line-height:1.5}
.eyebrow{font-size:${mm(0.03)}mm;font-weight:700;letter-spacing:0.2em;opacity:.75}
.cta{padding-top:${mm(0.03)}mm;border-top:${mm(0.004)}mm solid ${fg}8c;${centered ? '' : `min-width:${mm(0.42)}mm;`}}
.ctaText{font-size:${mm(0.055)}mm;font-weight:800}
.arrow{font-size:${mm(0.42)}mm;line-height:.9;font-weight:400}
.wayText{font-size:${mm(0.11)}mm;font-weight:800;line-height:1.2;word-break:keep-all}
.big{font-size:${mm(0.16)}mm;font-weight:800;line-height:1.1;word-break:keep-all}
.rows{width:100%;text-align:left;margin-top:${mm(0.04)}mm}
.row{display:flex;gap:${mm(0.05)}mm;padding:${mm(0.028)}mm 0;border-top:${mm(0.003)}mm solid ${fg}59;font-size:${mm(0.036)}mm}
.row b{min-width:${mm(0.24)}mm;font-weight:700;opacity:.85}
.brand{position:absolute;left:${pad}mm;top:${pad}mm;height:${mm(0.05)}mm;width:auto;${fg === '#FFFFFF' ? 'filter:brightness(0) invert(1)' : ''}}
.trim{display:none}
@media screen{
  html{background:#2e2e2e}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:38px 20px 20px}
  .trim{display:block;position:absolute;inset:${spec.bleed}mm;border:0.4mm dashed ${fg}73;pointer-events:none}
  .cap{position:fixed;top:9px;left:0;right:0;text-align:center;color:#c9c9c9;font:12px/1.5 system-ui,sans-serif}
  .cap b{color:#eee}
}
@media print{ body{margin:0;padding:0;display:block} .cap{display:none} .stage{transform:none!important;width:auto!important;height:auto!important;position:static!important} .sheet{position:relative!important;left:auto!important;top:auto!important;transform:none!important} }
</style>
</head>
<body>
<div class="cap"><b>${W} × ${H}mm</b> (재단 ${spec.wmm}×${spec.hmm} + 블리드 ${spec.bleed}mm) · 점선 = 재단선 · 인쇄 시 실측 출력<br>메인 ${p.primary} ≈ ${cmykText(p.primary)} <span style="opacity:.6">(근사값 — 분판은 인쇄소 프로파일 기준)</span></div>
<div class="stage" id="stage">
  <div class="sheet">
    ${scrim}
    ${style.logo ? `<img class="brand" src="${esc(style.logo)}" alt="">` : ''}
    ${body}
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

/* ── 용도별 본문 ── */

function mainBody(ctx, style, spec, mm, landscape) {
  const { name, date, venue, cta } = ctx.core;
  if (landscape) {
    // 현수막 — 센터 대형 타이포
    return `<div class="big">${esc(name)}</div>
    <div class="sub">${esc(date)} · ${esc(venue)}</div>`;
  }
  return `<div>
    <div class="title">${esc(name)}</div>
    <div class="sub" style="margin-top:${mm(0.03)}mm">${esc(date)} · ${esc(venue)}</div>
  </div>
  <div class="cta"><div class="ctaText">${esc(cta)}</div></div>`;
}

function wayBody(ctx, style, spec, mm) {
  const { name } = ctx.core;
  const dir = spec.arrow ?? 'right';
  return `<div class="arrow">${ARROW_GLYPH[dir] ?? '→'}</div>
  <div class="wayText">${esc(name)}</div>
  <div class="sub">이 방향입니다</div>`;
}

function agendaBody(ctx, style, spec, mm) {
  const { name, date, venue } = ctx.core;
  return `<div class="eyebrow">${PURPOSE_LABEL.agenda}</div>
  <div class="title" style="font-size:${mm(0.075)}mm">${esc(name)}</div>
  <div class="sub">${esc(date)} · ${esc(venue)}</div>
  <div class="rows">
    <div class="row"><b>등록</b><span>행사 시작 30분 전부터</span></div>
    <div class="row"><b>세션</b><span>프로그램은 현장 안내를 확인해 주세요</span></div>
    <div class="row"><b>문의</b><span>안내데스크</span></div>
  </div>`;
}

function receptionBody(ctx, style, spec, mm) {
  const { name, cta } = ctx.core;
  return `<div class="eyebrow">${PURPOSE_LABEL.reception}</div>
  <div class="big" style="font-size:${mm(0.13)}mm">${esc(cta)}</div>
  <div class="sub">${esc(name)}</div>
  <div class="cta" style="min-width:0"><div class="ctaText" style="font-size:${mm(0.042)}mm">안내데스크</div></div>`;
}
