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
//
// ── 엔솔 오프라인 MBM 템플릿(Figma 1rjsauqop2eXiivrOCcX1W, 섹션 441:1837 "공용 B") 반영 ──
// 주의: 이 파일은 산출물마다 축척이 다르다. 대형 출력물(엑스배너·현수막)만 pt 1:10 축소이고
//   (엑스배너 170.1×510.2pt → 600×1800mm, 1단위 = 3.528mm · 현수막 845×652pt → 2980×2300mm로 검산),
//   지류(Welcome Letter 421×595pt → A5, 안내지 612×859pt → A4+블리드 3mm)는 1:1 pt다.
// 그래서 아래 상수는 mm 절대값이 아니라 전부 "프레임 안에서의 비율"로 뽑아 뒀다 — 축척과 무관하다.
// 템플릿 전 매체가 공유하는 레이아웃 문법 4가지:
//   ① 로크업(로고)은 세로 매체에서 "하단 중앙", 가로 매체에서 "상단 우측"이다.
//      — 전 엑스배너가 같은 좌표(441:2340·441:1849·441:1860·441:1883: x62.25 y467 44.96×13.2),
//        가로물은 441:1620(wall)·441:1810(desk)에서 상단 우측.
//   ② 세로 매체는 콘텐츠가 상단에 정박하고 아래 절반은 그래픽 여백으로 비운다
//      (441:1891 로크업 상단 87/510.2 = 높이의 17%).
//   ③ 아이브로우 → 대형 2행 타이틀 → 메타 순으로 쌓는다.
//   ④ 토픽·역할은 "헤어라인 아웃라인 칩"으로 표시한다(441:1613 Solution/Geotechnical/AI Onsite).
//      채움 없음 · 모서리 각짐 — 버튼이 아니라 태그다. 인쇄물 버튼 금지 규칙과 충돌하지 않는다.

import { esc, fitFontSize, fieldGradient, textWidth, WRAP } from './banner.js';
import { cmykText } from '../style.js';
import { fontStack, fontLink } from '../fonts.js';
import { fitKeyVisual } from '../palette.js';

const ARROW_GLYPH = { up: '↑', down: '↓', left: '←', right: '→' };
const PURPOSE_LABEL = { main: '', way: '', agenda: 'PROGRAM', reception: 'REGISTRATION' };

// 세로 매체 상단 정박 비율 — 전부 "재단 높이"에 대한 비율(시안 441:1879 · 441:2244 실측).
const TOP = {
  lockup: 0.170,   // main 로크업 잉크 윗선   87 / 510.2
  heading: 0.043,  // agenda 헤딩 윗선        22 / 510.2
  table: 0.041,    // 헤딩 아랫선 → 표 윗선   21 / 510.2
  cta: 0.050,      // 로크업 아랫선 → 라벨    25.5 / 510.2
  foot: 0.0588,    // 로고 아랫선 → 재단 아랫선 30 / 510.2
};

// 프로그램 표가 비어 있을 때 — 시간을 지어내지 않는다(정보는 시스템 소유, 추측 금지).
const PROGRAM_PLACEHOLDER = [
  { time: '개시 30분 전', title: '등록 · 접수' },
  { time: '본 행사', title: '세션 프로그램', presenter: '세부 순서는 현장 안내를 확인해 주세요' },
  { time: '상시', title: '문의 · 안내데스크' },
];

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
  const useKv = !!style.keyVisual;   // 용도와 무관하게 배경으로 쓴다 — 안내형은 위에서 가림막으로 가독성을 지킨다
  const rd = useKv ? (style.kvReadability?.print ?? null) : null;
  const fg = rd?.text ?? p.onPrimary;
  // 키비주얼이 없을 때의 지면. 주색 파생 그라데이션이라 색 계열이 하나 —
  // 순백/순흑 글자 판정이 흔들리지 않는다(단색일 때와 대비가 같다).
  let bg = `background:${fieldGradient(p.primary)}`;
  if (useKv) {
    const fit = fitKeyVisual(spec.wmm / spec.hmm, style.kvMeta?.ar, style.kvMeta?.edge ?? p.primary);
    bg = fit.mode === 'contain'
      ? `background:${fit.bg};background-image:url('${esc(style.keyVisual)}'),${fit.bg};background-size:contain,cover;background-position:center bottom,center;background-repeat:no-repeat,no-repeat`
      : `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`;
  }
  // 안내형(방향·데스크)은 글자가 절대 우선이라 배경이 깨끗해도 가림막을 깐다.
  const needScrim = useKv && (rd?.scrim || purpose === 'way' || purpose === 'reception');
  const veil = fg === '#FFFFFF' ? 'rgba(0,0,0,.46)' : 'rgba(255,255,255,.52)';
  const scrim = needScrim
    ? `<div class="scrim" style="inset:0;background:${veil};pointer-events:none"></div>`
    : '';
  const pxW = (W * 3.7795).toFixed(0);
  const pxH = (H * 3.7795).toFixed(0);

  // 상단 정박 = main·agenda(세로)만. way·reception은 H.Solution Day 구성이라 수직 중앙을 유지한다.
  const topAnchored = !landscape && (purpose === 'main' || purpose === 'agenda');

  // 로고 크기 — 시안은 세로/가로에서 폭 대비 비율이 다르다.
  //   세로 13.2/170.1 = 0.0776  (441:2340)
  //   가로 24.06/845 = 0.0285 (441:1620) · 16.75/510 = 0.0328 (441:1810) → 0.030
  // 가로는 4000×900처럼 극단적으로 납작한 규격에서 로고가 지면을 잡아먹으므로 높이로도 물린다.
  const logoH = landscape
    ? Math.min(spec.wmm * 0.030, spec.hmm * 0.085)
    : spec.wmm * 0.0776;
  // 세로는 하단 중앙(재단 아랫선에서 5.88%), 가로는 상단 우측 — 시안 ① 근거.
  const footPos = landscape
    ? `right:${pad}mm;top:${pad}mm;justify-content:flex-end`
    : `left:0;right:0;bottom:${(spec.bleed + spec.hmm * TOP.foot).toFixed(1)}mm;justify-content:center`;
  // 로고 자리는 레이아웃에서 "먼저" 비운다. 로고는 절대배치라 flex 흐름을 밀지 못하므로
  // 여백으로 비워 두지 않으면 본문이 그 위로 올라와 글자를 덮는다(실제로 났던 버그).
  //   세로 = 하단 로크업 → 아래 여백을 로고 높이만큼 더 준다.
  //   가로 = 상단 우측 로크업 → 위를 비우되, 같은 값을 아래에도 줘야 본문이 광학적으로 중앙에 남는다.
  const hasLogo = !!style.logo;
  const landscapeReserve = hasLogo ? logoH + spec.hmm * 0.03 : 0;
  const padTop = landscape ? (Number(pad) + landscapeReserve).toFixed(1) : pad;
  const padBottom = landscape
    ? padTop
    : (spec.bleed + spec.hmm * TOP.foot + (hasLogo ? logoH + spec.hmm * 0.02 : 0)).toFixed(1);

  /* ── 행사명 자동 축소 ──
     지금까지 제목 크기가 짧은 변의 고정 비율(12.5%)이었다. 시안만큼 짧은 행사명은 괜찮지만
     "…및 디지털 트윈 기술 혁신 컨퍼런스 with MIDAS IT" 같은 실제 행사명이 들어오면
     지면 아래로 흘러 재단면 밖에서 잘리고, 하단 로고와 겹쳤다.
     인쇄물은 스크롤이 없으니 "안에서 줄이는" 것 말고 안전한 선택지가 없다.
     (ui-trends.md > 큰 폰트 + 강한 위계의 "줄바꿈/오버플로 점검" · 토스 UX 라이팅의
      "max-line 해제 → 가변 높이 대응 필요" 지적과 같은 맥락) */
  const innerW = W - Number(pad) * 2;
  const innerH = H - Number(padTop) - Number(padBottom);
  const lockTop = Number(anchor(spec, TOP.lockup, pad));
  // 제목 말고 로크업이 쓰는 것들의 높이를 실제로 더해 뺀다.
  // "남은 높이의 몇 %" 같은 어림값을 쓰면 아이브로우 한 줄만 늘어도 지면을 넘긴다.
  const subLines = Math.max(1, Math.ceil(textWidth(venue) / Math.max(1, innerW / (base * 0.045))));
  const chipRows = spec.topics?.length ? Math.ceil(textWidth(spec.topics.join('   ')) / Math.max(1, innerW / (base * 0.0252))) : 0;
  const reserve =
    base * 0.054 * 1.2                                     // 아이브로우(일자)
    + base * (landscape ? 0.03 : 0.032)                    // 아이브로우 ↔ 제목
    + base * (landscape ? 0.035 : 0.04)                    // 제목 ↔ 장소
    + base * 0.045 * 1.5 * subLines                        // 장소
    + (chipRows ? base * 0.061 + base * 0.0607 * chipRows : 0)
    + (landscape ? 0 : Number(gapAfter(spec, base, TOP.cta)) + base * 0.03 + base * 0.055 * 1.2)  // CTA(텍스트+구분선)
    + base * 0.05;                                         // .sheet의 flex gap 1회 (로크업은 한 덩어리로 묶여 있다)
  // 하한은 fitFontSize의 최소값과 같게 둔다 — 여기서 크게 잡으면 예산 계산이 무력해진다.
  const titleBudget = Math.max(base * 0.05, innerH - (landscape ? 0 : lockTop) - reserve);
  const titleMm = landscape
    ? fitFontSize(name, innerW, titleBudget, base * 0.16, base * 0.05, 1.1)
    : fitFontSize(name, innerW, titleBudget, base * 0.125, base * 0.045);
  const wayTopMm = fitFontSize(name, innerW, innerH * 0.16, base * 0.06, base * 0.028);

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
.sheet{width:${W}mm;height:${H}mm;${bg};color:${fg};font-family:${fontStack(style.fonts.heading)};display:flex;flex-direction:column;align-items:${centered ? 'center' : 'flex-start'};justify-content:${topAnchored ? 'flex-start' : 'center'};${centered ? 'text-align:center;' : ''}gap:${mm(0.05)}mm;padding:${padTop}mm ${pad}mm ${padBottom}mm;overflow:hidden;position:relative}
/* 스크림·그래픽면은 절대배치라 정적 요소보다 위에 칠해진다 — 내용에도 position을 줘서 DOM 순서대로 쌓이게 한다 */
.sheet > *{position:relative}
.sheet > .scrim,.sheet > .field{position:absolute}
.title{font-size:${titleMm.toFixed(1)}mm;font-weight:800;line-height:1.15;${WRAP}}
.sub{font-size:${mm(0.045)}mm;opacity:.92;line-height:1.5;${WRAP}}
.eyebrow{font-size:${mm(0.054)}mm;font-weight:700;letter-spacing:0.2em;opacity:.75}
.lockup{width:100%;margin-top:${anchor(spec, TOP.lockup, pad)}mm}
.cta{margin-top:${gapAfter(spec, base, TOP.cta)}mm;padding-top:${mm(0.03)}mm;border-top:${mm(0.004)}mm solid ${fg}8c;${centered ? '' : `min-width:${mm(0.42)}mm;`}}
.ctaText{font-size:${mm(0.055)}mm;font-weight:800}
.chips{display:flex;flex-wrap:wrap;gap:${mm(0.0101)}mm;margin-top:${mm(0.061)}mm;${centered ? 'justify-content:center;' : ''}}
.chip{display:inline-flex;align-items:center;height:${mm(0.0607)}mm;padding:0 ${mm(0.0254)}mm;border:${mm(0.0015)}mm solid ${fg}99;font-size:${mm(0.0252)}mm;font-weight:700;line-height:1;white-space:nowrap}
.wayTop{font-size:${wayTopMm.toFixed(1)}mm;font-weight:800;line-height:1.25;${WRAP}}
.disc{width:${mm(0.44)}mm;height:${mm(0.44)}mm;border-radius:50%;background:${fg};display:flex;align-items:center;justify-content:center;margin:${mm(0.1)}mm 0}
.disc span{font-size:${mm(0.2)}mm;line-height:1;color:${p.primary};font-weight:400}
.dest{font-size:${mm(0.05)}mm;font-weight:800;letter-spacing:-0.01em;${WRAP}}
.rule{width:${mm(0.32)}mm;height:${mm(0.004)}mm;background:${fg};opacity:.6;margin:${mm(0.08)}mm 0}
.arrow{font-size:${mm(0.42)}mm;line-height:.9;font-weight:400}
.wayText{font-size:${mm(0.11)}mm;font-weight:800;line-height:1.2;${WRAP}}
.big{font-size:${titleMm.toFixed(1)}mm;font-weight:800;line-height:1.1;${WRAP}}
.agTitle{font-size:${mm(0.105)}mm;font-weight:800;line-height:1.15;letter-spacing:0.02em;width:100%;text-align:center;margin-top:${anchor(spec, TOP.heading, pad)}mm}
.rows{width:100%;text-align:left;margin-top:${gapAfter(spec, base, TOP.table)}mm}
.rowHead{display:flex;font-size:${mm(0.026)}mm;font-weight:700;letter-spacing:0.08em;opacity:.7;padding-bottom:${mm(0.029)}mm}
.row{display:flex;padding:${mm(0.029)}mm 0;border-top:${mm(0.003)}mm solid ${fg}59}
.rowHead b,.row b{flex:0 0 26%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${mm(0.023)}mm;line-height:1.3}
.rowHead b{font-size:inherit;letter-spacing:inherit}
.rowHead span,.row span{flex:1;min-width:0}
.rowTitle{font-size:${mm(0.028)}mm;font-weight:700;line-height:1.3;${WRAP}}
.rowBy{font-size:${mm(0.023)}mm;line-height:1.3;opacity:.72;margin-top:${mm(0.006)}mm;${WRAP}}
.foot{position:absolute;${footPos};display:flex;align-items:center}
/* 로고는 높이로 크기를 잡고 폭을 물린다. 폭 제한이 없으면 초가로 로크업이 지면을
   가로질러 재단선 밖으로 나간다 — object-fit:contain이라 비율은 어느 쪽으로도 왜곡되지 않는다. */
.brand{height:${logoH.toFixed(1)}mm;width:auto;max-width:${(spec.wmm * (landscape ? 0.28 : 0.62)).toFixed(1)}mm;object-fit:contain;${fg === '#FFFFFF' ? 'filter:brightness(0) invert(1)' : ''}}
/* 키비주얼이 없는 지면의 그래픽 층. 시안 ②는 세로 매체의 아래 절반을 "그래픽 여백"으로
   비워 뒀는데 지금까지 그 자리가 통째로 빈 색면이었다. 지면 아래에서 올라오는 큰 색면 하나와
   가는 대각선 두 줄로 결만 준다 — 알파 0x1A~0x38이라 글자 대비를 건드리지 않는다.
   (ui-trends.md > 뉴브루탈리즘은 "엔터프라이즈엔 부적합"이라 채택하지 않고, 저대비 레이어만 쓴다) */
.field{inset:0;pointer-events:none;background:
  radial-gradient(${landscape ? '64% 150%' : '124% 44%'} at ${landscape ? '94% 112%' : '50% 114%'},${p.secondary}3d 0%,${p.secondary}00 70%),
  linear-gradient(${landscape ? '98deg' : '164deg'},${fg}00 ${landscape ? '58%' : '62%'},${fg}17 ${landscape ? '58.25%' : '62.2%'},${fg}17 ${landscape ? '58.7%' : '62.6%'},${fg}00 ${landscape ? '58.95%' : '62.8%'}),
  linear-gradient(${landscape ? '98deg' : '164deg'},${fg}00 ${landscape ? '66%' : '72%'},${fg}14 ${landscape ? '66.25%' : '72.2%'},${fg}14 ${landscape ? '66.7%' : '72.6%'},${fg}00 ${landscape ? '66.95%' : '72.8%'})}
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
    ${useKv ? '' : '<div class="field"></div>'}
    ${scrim}
    ${body}
    ${style.logo ? `<div class="foot"><img class="brand" src="${esc(style.logo)}" alt=""></div>` : ''}
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

/* ── 상단 정박 계산 ──
   시안의 "재단 윗선에서 몇 %" 값은 .sheet의 상단 패딩보다 아래에 있다. 그 차이만 margin으로 준다.
   A3처럼 짧은 지면에서는 패딩이 이미 그 지점을 넘길 수 있어 음수 margin이 나오므로 0으로 막는다. */
function anchor(spec, ratio, pad) {
  return Math.max(0, spec.bleed + spec.hmm * ratio - Number(pad)).toFixed(1);
}
// .sheet의 flex gap이 이미 mm(0.05)만큼 벌려 주므로, 시안 간격에서 그만큼 빼고 margin으로 채운다.
function gapAfter(spec, base, ratio) {
  return Math.max(0, spec.hmm * ratio - base * 0.05).toFixed(1);
}

/* ── 용도별 본문 ── */

// 메인 홍보 — 시안 441:1879(세로) · 441:1605(가로 wall 현수막)의 로크업 문법을 따른다:
//   상단 정박 로크업(타이틀 → 날짜·장소) → 헤어라인 토픽 칩 → 텍스트 CTA.
// 타이틀은 시안 실측 25/170.1 line-height ÷ 1.15 ≈ 짧은 변의 12.8%로 크게 잡는다(441:1893).
// 토픽 칩은 spec.topics가 있을 때만 나온다 — 없으면 기존 구성 그대로다(회귀 방지).
function mainBody(ctx, style, spec, mm, landscape) {
  const { name, date, venue, cta } = ctx.core;
  const chips = chipRow(spec.topics);
  // 위계를 3단으로 편다: 일자(아이브로우) → 행사명 → 장소.
  // 기존은 "제목 크게 + 날짜·장소 한 줄"의 2단뿐이라 큰 지면일수록 밋밋했다.
  // 문구를 지어내지 않고 이미 가진 데이터만 재배치한 것이다 — 시안 문법 ③(아이브로우 → 타이틀 → 메타)과 같다.
  // (ui-trends.md > 큰 폰트 + 강한 위계 / design-system-examples.md > 타입 스케일 근거)
  if (landscape) {
    // 현수막 — 센터 대형 타이포. 네 줄을 .sheet의 직계 자식으로 두면 flex gap이 세 번 붙어
    // 납작한 지면(4000×900)에서 그것만으로 높이의 4분의 1을 먹는다 — 한 덩어리로 묶는다.
    return `<div class="lockup" style="margin-top:0">
      <div class="eyebrow">${esc(date)}</div>
      <div class="big" style="margin-top:${mm(0.03)}mm">${esc(name)}</div>
      <div class="sub" style="margin-top:${mm(0.035)}mm">${esc(venue)}</div>${chips}
    </div>`;
  }
  return `<div class="lockup">
    <div class="eyebrow">${esc(date)}</div>
    <div class="title" style="margin-top:${mm(0.032)}mm">${esc(name)}</div>
    <div class="sub" style="margin-top:${mm(0.04)}mm">${esc(venue)}</div>${chips}
  </div>
  <div class="cta"><div class="ctaText">${esc(cta)}</div></div>`;
}

// 헤어라인 아웃라인 칩 — 시안 441:1613. 채움 없음·각진 모서리라 버튼으로 읽히지 않는다.
function chipRow(topics) {
  const list = (topics ?? []).filter(t => typeof t === 'string' && t.trim());
  if (!list.length) return '';
  return `\n    <div class="chips">${list.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>`;
}

// 방향 안내 — H.Solution Day 엑스배너 4종(Figma 181:6932) 구성을 따른다:
//   상단 행사명 → 중앙 원형 배지 속 화살표 → 목적지 한 줄.
//   목적지는 산출물마다 다르다("2F Conference Hall") — 없으면 장소로 대체.
function wayBody(ctx, style, spec, mm) {
  const { name, venue, date } = ctx.core;
  const dir = spec.arrow ?? 'right';
  const dest = spec.dest || venue;
  const glyph = ARROW_GLYPH[dir];
  // 화살표 없는 안내형 — 방향을 가리키지 않고 장소·일정만 알린다(입구 옆 정보판 등).
  if (!glyph) {
    return `<div class="wayTop">${esc(name)}</div>
    <div class="rule"></div>
    <div class="dest">${esc(dest)}</div>
    <div class="sub" style="margin-top:${mm(0.03)}mm">${esc(date)}</div>`;
  }
  return `<div class="wayTop">${esc(name)}</div>
  <div class="disc"><span>${glyph}</span></div>
  <div class="dest">${esc(dest)}</div>`;
}

// 프로그램 안내 — 시안 441:2244의 표 구조를 그대로 옮긴다:
//   중앙 대형 헤딩 → "TIME | TITLE / PRESENTER" 헤더 → 헤어라인으로 나뉜 행.
//   시간 열은 표 폭의 26%(38/146)이고 행 안에서 수직 중앙, 제목 열은 상단 정렬이다(441:2270 실측).
//   발표자는 제목 바로 아래 작은 줄로 붙는다.
// 헤딩 문구: 시안은 "AGENDA"지만 우리 시스템 어휘는 PURPOSE_LABEL의 PROGRAM이다.
//   캠페인에서 바꾸고 싶으면 spec.heading으로 덮는다.
function agendaBody(ctx, style, spec, mm) {
  const rows = normalizeProgram(spec.program);
  const heading = spec.heading || PURPOSE_LABEL.agenda;
  return `<div class="agTitle">${esc(heading)}</div>
  <div class="rows">
    <div class="rowHead"><b>TIME</b><span>TITLE / PRESENTER</span></div>
    ${rows.map(r => `<div class="row"><b>${esc(r.time)}</b><span>
      <div class="rowTitle">${esc(r.title)}</div>${r.presenter ? `
      <div class="rowBy">${esc(r.presenter)}</div>` : ''}
    </span></div>`).join('\n    ')}
  </div>`;
}

// 주입 데이터는 문자열 배열("10:00 세션명")이 아니라 {time,title,presenter} 객체로 받는다.
// 비었거나 형태가 안 맞으면 플레이스홀더로 — 없는 시간을 지어내지 않는다.
function normalizeProgram(program) {
  const list = Array.isArray(program)
    ? program.filter(r => r && (r.time || r.title)).map(r => ({
      time: String(r.time ?? ''), title: String(r.title ?? ''), presenter: r.presenter ? String(r.presenter) : '',
    }))
    : [];
  return list.length ? list : PROGRAM_PLACEHOLDER;
}

// 사전등록·안내데스크 — 상단 행사명, 가는 구분선, 역할 라벨 하나가 크게.
function receptionBody(ctx, style, spec, mm) {
  const { name, cta } = ctx.core;
  const base = Math.min(spec.wmm, spec.hmm);
  const dest = spec.dest || '안내데스크';
  // 역할 라벨이 주인공이라 크게 두되, "사전등록 · 안내데스크"처럼 긴 라벨이 오면
  // 지면 폭 안에서 두 줄까지만 쓰도록 줄인다.
  const fs = fitFontSize(dest, spec.wmm - base * 0.18, base * 0.3, base * 0.125, base * 0.05);
  return `<div class="wayTop">${esc(name)}</div>
  <div class="rule"></div>
  <div class="big" style="font-size:${fs.toFixed(1)}mm">${esc(dest)}</div>
  <div class="sub" style="margin-top:${mm(0.03)}mm">${esc(cta)}</div>`;
}
