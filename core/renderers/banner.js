// 배너 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
// 키비주얼은 cover 크롭(안전 크롭), 없으면 색면 배경 (PRD F5 비율 대응 규칙).
// variant: 0=컬러 솔리드/키비주얼 · 1=화이트 반전 · 2=하단 컬러 밴드

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
    bg = 'background:#fff';
    fg = p.primary; subFg = '#777';
    ctaBg = p.primary; ctaFg = '#fff';
  } else {
    bg = style.keyVisual
      ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
      : `background:${p.primary}`;
    fg = '#fff'; subFg = 'rgba(255,255,255,.85)';
    ctaBg = '#fff'; ctaFg = p.primary;
    if (v === 2) band = `<div data-band style="position:absolute;left:0;right:0;bottom:0;height:36%;background:rgba(255,255,255,.14)"></div>`;
  }
  const border = v === 1 ? `;border:1px solid #e5e5e5` : '';
  return `<div style="position:relative;width:${spec.w}px;height:${spec.h}px;${bg}${border};overflow:hidden;font-family:'${esc(style.fonts.heading)}',sans-serif;color:${fg};display:flex;flex-direction:${compact ? 'row' : 'column'};align-items:${compact ? 'center' : 'flex-start'};justify-content:space-between;padding:${compact ? '0 16px' : '18px'};box-sizing:border-box">
  ${band}
  <div style="position:relative">
    <div style="font-size:${compact ? 15 : 18}px;font-weight:700;line-height:1.3;color:${fg}">${esc(name)}</div>
    <div style="font-size:11px;color:${subFg};margin-top:4px">${esc(date)} · ${esc(venue)}</div>
  </div>
  <div style="position:relative;background:${ctaBg};color:${ctaFg};font-size:12px;font-weight:700;padding:8px 14px;border-radius:6px;white-space:nowrap">${esc(cta)}</div>
</div>`;
}
