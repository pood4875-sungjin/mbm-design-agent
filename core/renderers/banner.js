// 배너 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
// 키비주얼은 cover 크롭(안전 크롭), 없으면 색면 배경 (PRD F5 비율 대응 규칙).

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function renderBanner(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const bg = style.keyVisual
    ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
    : `background:${p.primary}`;
  const compact = spec.h < 120;
  return `<div style="position:relative;width:${spec.w}px;height:${spec.h}px;${bg};overflow:hidden;font-family:'${esc(style.fonts.heading)}',sans-serif;color:#fff;display:flex;flex-direction:${compact ? 'row' : 'column'};align-items:${compact ? 'center' : 'flex-start'};justify-content:space-between;padding:${compact ? '0 16px' : '18px'};box-sizing:border-box">
  <div>
    <div style="font-size:${compact ? 15 : 18}px;font-weight:700;line-height:1.3">${esc(name)}</div>
    <div style="font-size:11px;opacity:.85;margin-top:4px">${esc(date)} · ${esc(venue)}</div>
  </div>
  <div style="background:#fff;color:${p.primary};font-size:12px;font-weight:700;padding:8px 14px;border-radius:6px;white-space:nowrap">${esc(cta)}</div>
</div>`;
}
