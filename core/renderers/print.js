// 인쇄 렌더러 — poster·xbanner·현수막 공용. 페이지 = 재단(trim) + 블리드, 풀블리드 배경.
// 타이포는 매체 짧은 변에 비례(mm) — A2와 현수막이 같은 코드로 스케일.

import { esc } from './banner.js';

export function renderPrint(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const W = spec.wmm + spec.bleed * 2;
  const H = spec.hmm + spec.bleed * 2;
  const base = Math.min(spec.wmm, spec.hmm);
  const landscape = spec.wmm > spec.hmm;
  const title = (base * 0.10).toFixed(1);
  const sub = (base * 0.038).toFixed(1);
  const pill = (base * 0.042).toFixed(1);
  const pad = (base * 0.09 + spec.bleed).toFixed(1);
  const centered = spec.variant === 1;
  const bg = style.keyVisual
    ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
    : `background:${p.primary}`;
  const align = centered ? 'center' : (landscape ? 'center' : 'flex-start');
  const justify = centered ? 'center' : 'space-between';
  const dir = centered ? 'column' : (landscape ? 'row' : 'column');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
@page{size:${W}mm ${H}mm;margin:0}
*{box-sizing:border-box;margin:0}
body{width:${W}mm;height:${H}mm;${bg};color:#fff;font-family:'${esc(style.fonts.heading)}','Apple SD Gothic Neo',sans-serif;display:flex;flex-direction:${dir};align-items:${align};justify-content:${justify};${centered ? 'text-align:center;gap:' + (base * 0.06).toFixed(1) + 'mm;' : ''}padding:${pad}mm;overflow:hidden}
</style>
</head>
<body>
<div>
  <div style="font-size:${title}mm;font-weight:800;line-height:1.15;word-break:keep-all">${esc(name)}</div>
  <div style="font-size:${sub}mm;margin-top:${(base * 0.03).toFixed(1)}mm;opacity:.9">${esc(date)} · ${esc(venue)}</div>
</div>
<div style="background:#fff;color:${p.primary};font-size:${pill}mm;font-weight:800;padding:${(base * 0.028).toFixed(1)}mm ${(base * 0.06).toFixed(1)}mm;border-radius:${(base * 0.05).toFixed(1)}mm;white-space:nowrap">${esc(cta)}</div>
</body>
</html>`;
}
