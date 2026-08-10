// 랜딩 렌더러 — 자기완결 단일 HTML(임베디드 CSS), 반응형. HubSpot 등록은 추후(X2) — 지금은 게시 가능한 패키지.

import { esc } from './banner.js';
import { fontStack, fontLink } from '../fonts.js';

export function renderLanding(ctx, style, spec = {}) {
  const { name, date, venue, audience, cta } = ctx.core;
  const p = style.palette;
  const light = spec.variant === 1;
  const heroBg = light
    ? `background:${p.bg}`
    : style.keyVisual
      ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
      : `background:${p.primary}`;
  const rd = (!light && style.keyVisual) ? (style.kvReadability?.landing ?? null) : null;
  const heroFg = light ? p.primary : (rd?.text ?? p.onPrimary);
  const heroScrim = rd?.scrim
    ? `<div style="position:absolute;inset:0;background:linear-gradient(180deg,${heroFg === '#FFFFFF' ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.58)'},transparent 78%)"></div>` : '';
  const heroBtn = light
    ? `background:${p.primary};color:${p.onPrimary}`
    : `background:${p.onPrimary};color:${p.primary}`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
${fontLink(style.fonts.body)}
<style>
  *{box-sizing:border-box;margin:0}
  body{font-family:${fontStack(style.fonts.body)};color:${p.ink};background:${p.bg}}
  .hero{position:relative;${light ? `background:${p.surface}` : heroBg};color:${heroFg};padding:96px 24px;text-align:center}
  .brand{max-height:34px;width:auto;margin-bottom:26px;${light ? '' : 'filter:brightness(0) invert(1)'}}
  .hero > *{position:relative}
  .hero h1{font-size:clamp(28px,5vw,44px);line-height:1.25}
  .hero p{margin-top:14px;font-size:16px;opacity:.9}
  .btn{display:inline-block;margin-top:32px;${heroBtn};font-weight:700;padding:16px 36px;border-radius:8px;text-decoration:none}
  .info{max-width:760px;margin:0 auto;padding:64px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
  .card{background:${p.surface};border:1px solid ${p.secondary}22;border-radius:10px;padding:24px}
  .card b{display:block;font-size:13px;color:${p.inkSub};margin-bottom:6px}
  .form{max-width:520px;margin:0 auto;padding:0 24px 96px}
  .form h2{font-size:22px;margin-bottom:20px;text-align:center}
  .form input{width:100%;padding:14px;border:1px solid ${p.inkSub}55;border-radius:8px;background:${p.bg};color:${p.ink};font-size:15px;margin-bottom:10px}
  .form button{width:100%;padding:16px;background:${p.primary};color:${p.onPrimary};border:0;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<section class="hero" data-hero="${light ? 'light' : 'dark'}">
  ${heroScrim}
  ${style.logo ? `<img class="brand" src="${esc(style.logo)}" alt="">` : ''}
  <h1>${esc(name)}</h1>
  <p>${esc(date)} · ${esc(venue)}</p>
  <a class="btn" href="#register">${esc(cta)}</a>
</section>
<section class="info">
  <div class="card"><b>일시</b>${esc(date)}</div>
  <div class="card"><b>장소</b>${esc(venue)}</div>
  <div class="card"><b>대상</b>${esc(audience)}</div>
</section>
<section class="form" id="register">
  <h2>${esc(cta)}</h2>
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
