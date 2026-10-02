// 랜딩 렌더러 — 자기완결 단일 HTML(임베디드 CSS), 반응형. HubSpot 등록은 추후(X2) — 지금은 게시 가능한 패키지.
//
// 온라인 매체라서 인쇄물과 다르게 가는 것들: 버튼(누를 수 있다) · 라운드 · 그라데이션 지면 · 호버/포커스 상태.
// 반대로 인쇄물과 공유하는 것: 아이브로우 → 대형 타이틀 → 메타 순의 위계, 팔레트, 순흑/순백 글자.
//
// 로고는 히어로 최상단의 "슬롯"이다 — 높이가 고정된 flex 아이템이라
// 행사명이 길어져도 로고 자리를 침범하지 못한다(절대배치 금지).

import { esc, fieldGradient } from './banner.js';
import { fontStack, fontLink } from '../fonts.js';

export function renderLanding(ctx, style, spec = {}) {
  const { name, date, venue, audience, cta } = ctx.core;
  const p = style.palette;
  const light = spec.variant === 1;
  const heroBg = style.keyVisual
    ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
    // 키비주얼이 없으면 단색 대신 주색 파생 그라데이션 — 색 계열이 하나라 글자 대비는 그대로다
    : `background:${fieldGradient(p.primary)}`;
  // 테두리는 지면색(순흑/순백)에 알파를 얹어 만든다. inkSub는 이미 rgba라
  // 뒤에 알파 두 자리를 붙이면 잘못된 색이 되어 브라우저가 통째로 무시한다(기존 버그).
  const hair = `${p.ink}1a`, field = `${p.ink}33`;
  const rd = (!light && style.keyVisual) ? (style.kvReadability?.landing ?? null) : null;
  const heroFg = light ? p.primary : (rd?.text ?? p.onPrimary);
  const heroSub = heroFg === '#FFFFFF' ? 'rgba(255,255,255,.82)' : 'rgba(0,0,0,.62)';
  const heroScrim = rd?.scrim
    ? `<div class="scrim"></div>` : '';
  const scrimCss = rd?.scrim
    ? `.scrim{position:absolute;inset:0;background:linear-gradient(180deg,${heroFg === '#FFFFFF' ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.58)'},transparent 78%)}` : '';
  const heroBtn = light
    ? `background:${p.primary};color:${p.onPrimary}`
    : `background:${p.onPrimary};color:${p.primary}`;
  // 라이트 히어로에서는 주색이 글자라 액센트를 보조색으로 돌린다(같은 색 두 번 쓰면 위계가 죽는다).
  const accent = light ? p.secondary : (heroFg === '#FFFFFF' ? p.accent : p.primary);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
${fontLink(style.fonts.body)}
<style>
  /* 스페이싱은 8pt 그리드 (design-system-examples.md > 스페이싱 8pt 그리드 + 4pt 보조 근거) */
  *{box-sizing:border-box;margin:0}
  body{font-family:${fontStack(style.fonts.body)};color:${p.ink};background:${p.bg};-webkit-font-smoothing:antialiased}
  .hero{position:relative;${light ? `background:${fieldGradient(p.surface, 0.5)}` : heroBg};color:${heroFg};padding:72px 24px 80px;display:flex;flex-direction:column;align-items:center;text-align:center}
  ${scrimCss}
  .hero > *{position:relative}
  /* 로고 슬롯 — 높이를 먼저 잡고 폭을 물린다. object-fit:contain이라
     정사각·가로긴·초가로 로고가 전부 왜곡 없이 이 상자 안에서만 산다.
     max-width에 %를 함께 걸어 좁은 뷰포트에서 가로로 삐져나가지 않게 한다. */
  .brandSlot{height:36px;margin-bottom:40px;display:flex;align-items:center;justify-content:center;width:100%}
  .brand{height:36px;width:auto;max-width:min(240px,72%);object-fit:contain;${light ? '' : 'filter:brightness(0) invert(1)'}}
  /* 아이브로우 → 대형 타이틀 → 메타 3단 위계.
     기존은 "제목 크게 + 부제 작게" 2단뿐이라 지면이 밋밋했다.
     (ui-trends.md > 큰 폰트 + 강한 위계 / design-system-examples.md > 타입 스케일 근거) */
  .eyebrow{font-size:13px;font-weight:700;color:${heroSub};margin-bottom:20px}
  .hero h1{font-size:clamp(30px,5.2vw,52px);line-height:1.18;font-weight:800;max-width:19ch;word-break:keep-all}
  .accent{width:56px;height:4px;background:${accent};margin:28px 0 0;border-radius:2px}
  .hero p{margin-top:20px;font-size:17px;line-height:1.5;color:${heroSub}}
  .btn{display:inline-block;margin-top:40px;${heroBtn};font-weight:700;font-size:16px;padding:16px 40px;border-radius:8px;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}
  .btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.18)}
  .btn:focus-visible{outline:3px solid ${accent};outline-offset:3px}
  .info{max-width:900px;margin:0 auto;padding:72px 24px 8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
  /* 카드 위 얇은 색 띠 — 회색 상자 세 개가 나란한 것보다 스캔이 빠르다
     (industry-examples.md > 네이버 코퍼레이트: 단순하지만 또렷한 위계) */
  .card{position:relative;background:${p.surface};border:1px solid ${hair};border-radius:12px;padding:26px 24px 24px;overflow:hidden}
  .card:before{content:"";position:absolute;left:0;top:0;width:100%;height:3px;background:${p.primary}}
  .card b{display:block;font-size:12px;font-weight:700;color:${p.inkSub};margin-bottom:10px}
  .card span{font-size:19px;font-weight:700;line-height:1.35;word-break:keep-all}
  .form{max-width:520px;margin:0 auto;padding:56px 24px 96px}
  .form h2{font-size:26px;font-weight:800;margin-bottom:8px;text-align:center}
  .form .lead{font-size:14px;color:${p.inkSub};text-align:center;margin-bottom:28px}
  .form input{width:100%;padding:15px 16px;border:1px solid ${field};border-radius:8px;background:${p.bg};color:${p.ink};font-size:15px;margin-bottom:12px;font-family:inherit}
  .form input:focus{outline:2px solid ${p.primary};outline-offset:1px;border-color:${p.primary}}
  .form button{width:100%;padding:17px;background:${p.primary};color:${p.onPrimary};border:0;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}
  .form button:hover{filter:brightness(1.08)}
  @media (max-width:520px){ .hero{padding:56px 20px 64px} .brandSlot{height:30px;margin-bottom:32px} .brand{height:30px} }
</style>
</head>
<body>
<section class="hero" data-hero="${light ? 'light' : 'dark'}">
  ${heroScrim}
  ${style.logo ? `<div class="brandSlot"><img class="brand" src="${esc(style.logo)}" alt=""></div>` : ''}
  <div class="eyebrow">${esc(date)}</div>
  <h1>${esc(name)}</h1>
  <div class="accent"></div>
  <p>${esc(venue)}</p>
  <a class="btn" href="#register">${esc(cta)}</a>
</section>
<section class="info">
  <div class="card"><b>일시</b><span>${esc(date)}</span></div>
  <div class="card"><b>장소</b><span>${esc(venue)}</span></div>
  <div class="card"><b>대상</b><span>${esc(audience)}</span></div>
</section>
<section class="form" id="register">
  <h2>${esc(cta)}</h2>
  <p class="lead">${esc(audience)} 대상 · ${esc(date)}</p>
  <form>
    <input type="text" name="name" placeholder="이름" required>
    <input type="email" name="email" placeholder="이메일" required>
    <input type="text" name="company" placeholder="회사명">
    <button type="submit">${esc(cta)}</button>
  </form>
</section>
</body>
</html>`;
}
