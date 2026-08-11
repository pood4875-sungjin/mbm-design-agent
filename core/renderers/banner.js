// 배너 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
// 키비주얼은 cover 크롭(안전 크롭), 없으면 색면 배경 (PRD F5 비율 대응 규칙).
// variant: 0=컬러 솔리드/키비주얼 · 1=화이트 반전 · 2=하단 컬러 밴드

import { fontStack } from '../fonts.js';
import { fitKeyVisual } from '../palette.js';

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function renderBanner(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const v = spec.variant ?? 0;
  const compact = spec.h < 120;

  let bg, fg, subFg, ctaBg, ctaFg, band = '';
  if (v === 1) {
    bg = `background:${p.bg}`;
    fg = p.primary; subFg = p.inkSub;
    ctaBg = p.primary; ctaFg = p.onPrimary;
  } else {
    if (style.keyVisual) {
      const fit = fitKeyVisual(spec.w / spec.h, style.kvMeta?.ar, style.kvMeta?.edge ?? p.primary);
      bg = fit.mode === 'contain'
        // 비율이 크게 다르면 잘라내지 않고 넣어 맞추고, 여백은 가장자리 색으로 잇는다
        ? `background:${fit.bg};background-image:url('${esc(style.keyVisual)}'),${fit.bg};background-size:contain,cover;background-position:${fit.wide ? 'right center' : 'center bottom'},center;background-repeat:no-repeat,no-repeat`
        : `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`;
    } else {
      bg = `background:${p.primary}`;
    }
    const rd = style.keyVisual ? (style.kvReadability?.banner ?? null) : null;
    fg = rd?.text ?? p.onPrimary;
    subFg = fg === '#FFFFFF' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.6)';
    ctaBg = fg; ctaFg = fg === '#FFFFFF' ? p.primary : '#FFFFFF';
    if (rd?.scrim) {
      const dir = fg === '#FFFFFF' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.62)';
      band = `<div data-scrim style="position:absolute;inset:0;background:linear-gradient(${compact ? '90deg' : '180deg'},${dir},transparent 72%)"></div>` + band;
    }
    if (v === 2) band = `<div data-band style="position:absolute;left:0;right:0;bottom:0;height:36%;background:${p.secondary}"></div>`;
  }
  const fgIsDark = fg !== '#FFFFFF';
  const border = v === 1 ? `;border:1px solid ${p.surface}` : '';
  // 로고는 절대배치하면 긴 제목과 겹친다 — 흐름 안에 두고 여백으로 자리를 확보한다.
  const logoFilter = (v === 1 || fgIsDark) ? '' : 'filter:brightness(0) invert(1)';
  const logo = style.logo
    ? `<img src="${esc(style.logo)}" alt="" style="position:relative;display:block;height:${compact ? 16 : 20}px;width:auto;max-width:${compact ? 90 : 120}px;object-fit:contain;opacity:.95;${logoFilter};${compact ? '' : `margin-bottom:${spec.h > 400 ? 14 : 10}px`}">`
    : '';
  return `<div style="position:relative;width:${spec.w}px;height:${spec.h}px;${bg}${border};overflow:hidden;font-family:${fontStack(style.fonts.heading)};color:${fg};display:flex;flex-direction:${compact ? 'row' : 'column'};align-items:${compact ? 'center' : 'flex-start'};justify-content:space-between;padding:${compact ? '0 16px' : '18px'};box-sizing:border-box">
  ${band}
  <div style="position:relative;min-width:0">
    ${compact ? '' : logo}
    <div style="font-size:${compact ? 15 : 18}px;font-weight:700;line-height:1.3;color:${fg}">${esc(name)}</div>
    <div style="font-size:11px;color:${subFg};margin-top:4px">${esc(date)} · ${esc(venue)}</div>
  </div>
  <div style="position:relative;display:flex;align-items:center;gap:10px;flex:none">
    ${compact ? logo : ''}
    <span style="background:${ctaBg};color:${ctaFg};font-size:12px;font-weight:700;padding:8px 14px;border-radius:6px;white-space:nowrap">${esc(cta)}</span>
  </div>
</div>`;
}
