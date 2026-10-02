// 배너 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
// 지면색은 키비주얼에서 읽는다(core/field.js) — 사람이 바꿀 수 있다(style.background). 키비주얼이 없으면 브랜드 색.
// 키비주얼은 글자 위에 깔지 않는다: 가로형은 오른쪽, 세로형은 아래에 가장자리까지 붙이고 글자 쪽 변만 지면으로 녹인다.
// 꾸밈은 두지 않는다 — 자간 조정·빛 번짐·구분선·액센트 줄 없음. 굵기는 400·700.
// 버튼(CTA)은 그리지 않는다 — 2026-10-02 사용자 결정("버튼 빼줘 그냥, 우선"). 되살릴 때는 SHOW_CTA 만 켠다.
// variant: 0=지면+키비주얼 · 1=글자만(밝은 지면) · 2=하단 컬러 밴드
//
// 레이아웃 문법 2종 — 규격 비율이 성격을 정한다:
//   stack (h ≥ 120)  세로로 쌓는다. [로고 슬롯] → [일자 아이브로우 → 행사명 → 장소] → [CTA]
//   strip (h < 120)  가로로 눕힌다. [로고 슬롯] | [행사명 + 메타] [CTA]
// 두 문법 모두 로고를 flex 아이템으로 두어 "자리를 먼저 비우고" 글자를 배치한다.
// 절대배치로 얹으면 행사명이 길어질 때 글자를 덮는다 — 이전에 실제로 났던 버그다.

import { fontStack } from '../fonts.js';
import { shiftHue } from '../palette.js';
import { resolveField, kvLayer } from '../field.js';

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── 렌더러 공용 타이포 유틸 ──
   esc와 같은 이유로 이 파일에 둔다: 나머지 렌더러가 이미 banner.js를 공용 유틸로 임포트한다.
   같은 규칙을 온라인·인쇄가 공유해야 채널 사이에서 행사명 인상이 어긋나지 않는다. */

// 한글 줄바꿈 규칙. keep-all만 걸면 "구조엔지니어링" 같은 긴 합성어가 좁은 지면에서
// 줄바꿈되지 못하고 옆으로 흘러 잘린다. anywhere는 "다른 방법이 없을 때만" 단어를 쪼갠다.
// 두 값을 같이 걸어야 아래 fitFontSize의 줄 수 추정(단어 경계를 무시하고 전체 폭으로 계산)이 실제와 맞는다.
export const WRAP = 'word-break:keep-all;overflow-wrap:anywhere';

// 한글은 한 글자가 거의 1em, 라틴은 그 절반쯤이다.
// 글자 "수"가 아니라 "폭"으로 세야 한/영이 섞인 행사명의 줄 수를 맞게 볼 수 있다.
export function textWidth(s) {
  let w = 0;
  for (const ch of String(s ?? '')) {
    if (/\s/.test(ch)) w += 0.35;
    // 한글 자모·완성형 · CJK 한자·부수 · 가나 · 전각기호 = 전각(1em) 취급
    else if (/[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFF60]/.test(ch)) w += 1;
    else if (/[A-Z0-9@#%&]/.test(ch)) w += 0.62;
    else w += 0.5;
  }
  return w;
}

// 상자(boxW×boxH, 단위는 호출자와 동일)에 text가 들어가는 가장 큰 글자 크기.
// 큰 제목을 그대로 두면 지면을 넘어 잘리거나 절대배치 요소와 겹친다 —
// 인쇄물은 스크롤이 없으므로 "밖으로 흘리기"가 아니라 "안에서 줄이기"가 유일하게 안전하다.
// (ui-trends.md > 큰 폰트 + 강한 위계: "모바일에서 줄바꿈/오버플로 점검" 항목의 인쇄판 대응)
export function fitFontSize(text, boxW, boxH, max, min, lh = 1.15) {
  const units = textWidth(text);
  if (!(boxW > 0) || !(boxH > 0)) return min;
  for (let fs = max; fs > min; fs -= max / 48) {
    const perLine = boxW / fs;
    if (perLine < 1) continue;
    const lines = Math.max(1, Math.ceil(units / perLine));
    if (lines * fs * lh <= boxH) return fs;
  }
  return min;
}

// 키비주얼이 없을 때의 지면. 단색 한 판은 기업 행사물이라도 너무 심심하다.
// 주색에서만 파생한 저대비 광원 두 개 + 대각 그라데이션으로 깊이만 준다 —
// 색은 한 계열이라 글자 대비(순백/순흑 판정)가 흔들리지 않는다.
// (ui-trends.md > Glassmorphism 2.0의 "정제된 레이어" 관점: 블러 대신 그라데이션,
//  단 대비 저하 위험은 피한다 / 뉴브루탈리즘은 엔터프라이즈에 부적합이라 채택하지 않음)
export function fieldGradient(base, strength = 1) {
  const glow = shiftHue(base, 0, 0.10 * strength, -0.05 * strength);
  const deep = shiftHue(base, 0, -0.08 * strength, 0.03 * strength);
  return `radial-gradient(118% 88% at 88% 6%, ${glow} 0%, ${base} 58%),`
    + `radial-gradient(96% 72% at 2% 104%, ${deep} 0%, ${base} 64%),`
    + `linear-gradient(150deg, ${base} 0%, ${deep} 100%)`;
}

const SHOW_CTA = false;

export function renderBanner(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const v = spec.variant ?? 0;
  const strip = spec.h < 120;
  // 지면 크기를 한 값으로 묶는다 — 300×250과 160×600은 면적이 비슷하니 글자도 비슷해야 한다.
  const S = Math.sqrt(spec.w * spec.h);
  // 8pt 그리드 (design-system-examples.md > 스페이싱 8pt 그리드 + 4pt 보조 근거)
  const pad = strip ? 16 : (S >= 280 ? 24 : 16);

  // 키비주얼 자리 — 세로로 긴 지면은 아래, 나머지는 오른쪽. 글자는 그 자리를 비우고 놓는다.
  const hasKv = !!style.keyVisual && v !== 1;
  const side = !hasKv ? 'none' : (!strip && spec.h / spec.w >= 1.15) ? 'bottom' : 'right';
  const objW = side === 'right' ? Math.round(spec.w * (strip ? 0.24 : 0.36)) : 0;
  const objH = side === 'bottom' ? Math.round(spec.h * 0.32) : 0;

  let bg, fg, subFg, ctaBg, ctaFg, band = '', object = '';
  if (v === 1) {
    // 글자만 — 밝은 지면에 브랜드색 제목. 배경색을 직접 골랐으면 그 색 위에 읽히는 글자색으로.
    const manual = style.background?.color ?? null;
    const field = manual ? resolveField(style) : null;
    bg = `background:${manual ?? p.bg}`;
    fg = field ? field.text : p.primary; subFg = field ? field.text : p.inkSub;
    ctaBg = field ? field.text : p.primary; ctaFg = field ? manual : p.onPrimary;
  } else {
    const field = resolveField(style, { facing: side === 'bottom' ? 'top' : 'left' });
    bg = `background:${field.css}`;
    fg = field.text;
    // 지면 대비가 빠듯하면(4.5 미만) 보조 글자를 흐리게 쓰지 않는다
    subFg = field.contrast < 4.5 ? fg : (fg === '#FFFFFF' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.6)');
    ctaBg = fg; ctaFg = fg === '#FFFFFF' ? field.stops[field.stops.length - 1] : '#FFFFFF';
    if (hasKv) object = kvLayer(style, field, { side, w: spec.w, h: spec.h, size: side === 'right' ? objW : objH, edgePad: pad });
    if (v === 2) band = `<div data-band="1" style="position:absolute;left:0;right:0;bottom:0;height:36%;background:${p.secondary}"></div>`;
  }
  const fgIsDark = fg !== '#FFFFFF';
  const border = v === 1 ? `;border:1px solid ${p.surface}` : '';
  const logoFilter = (v === 1 || fgIsDark) ? '' : 'filter:brightness(0) invert(1)';

  // ── 로고 슬롯 ──
  // 높이를 먼저 고정하고 폭을 max-width로 물린다. object-fit:contain이라
  // 정사각·가로긴·초가로 로고 전부 왜곡 없이 이 상자 안에서만 산다.
  const logoH = strip ? Math.min(18, Math.round(spec.h * 0.22)) : Math.round(Math.min(26, Math.max(14, S * 0.075)));
  const logoMaxW = Math.round(spec.w * (strip ? 0.20 : 0.42));
  const logoImg = style.logo
    ? `<img src="${esc(style.logo)}" alt="" style="display:block;height:${logoH}px;width:auto;max-width:${logoMaxW}px;object-fit:contain;object-position:left center;opacity:.95;${logoFilter}">`
    : '';

  /* ── 타이포 스케일 ──
     규격마다 글자가 같으면(기존 18px 고정) 큰 지면은 텅 비어 보이고 작은 지면은 넘친다.
     지면 크기에 비례한 상한을 두되, 실제로 제목에 남는 높이를 계산해 그 안에서 다시 줄인다.
     제목 말고 나머지(아이브로우·룰·장소·CTA)는 "상한" 기준으로만 크기를 잡는다 —
     그래야 각 블록 높이를 먼저 알 수 있고, 제목 예산을 순환 없이 정확히 뺄 수 있다.
     (ui-trends.md > 큰 폰트 + 강한 위계 / design-system-examples.md > 타입 스케일 1.2~1.25 근거) */
  const titleMax = Math.min(34, Math.max(13, Math.round(S * 0.085)));
  const metaFs = Math.max(10, Math.round(titleMax * 0.55));
  const eyebrowFs = Math.max(9, Math.round(titleMax * 0.42));
  const ctaFs = Math.max(11, Math.round(titleMax * 0.58));
  const line = 1.25;

  const textW = strip
    ? spec.w - pad * 2 - (style.logo ? logoMaxW + 14 : 0) - (SHOW_CTA ? ctaWidth(cta) + 14 : 0) - objW
    : spec.w - pad * 2 - objW;

  let titleBudget, titleFs, metaLines;
  if (strip) {
    metaLines = 1;
    titleBudget = spec.h - 12 - metaFs * 1.35 - 3;
  } else {
    // 세로 스택의 높이 예산: 지면 − 패딩 − 로고 슬롯 − 아이브로우 − 룰 − 장소 − CTA
    const logoBlock = style.logo ? logoH + Math.round(logoH * 0.8) : 0;
    const eyebrowBlock = Math.round(eyebrowFs * 1.3) + Math.round(eyebrowFs * 0.7);
    const ctaBlock = SHOW_CTA ? Math.round(ctaFs * 1.3) + Math.round(ctaFs * 0.62) * 2 + Math.round(pad * 0.6) : 0;
    metaLines = Math.max(1, Math.min(2, Math.ceil(textWidth(venue) / Math.max(1, textW / metaFs))));
    const metaBlock = Math.round(metaFs * 1.35) * metaLines + Math.round(titleMax * 0.5);
    titleBudget = spec.h - pad * 2 - objH - logoBlock - eyebrowBlock - metaBlock - ctaBlock;
  }
  titleBudget = Math.max(titleMax * line, titleBudget);
  // 내림으로 정수화한다 — 올림하면 방금 맞춰 놓은 예산을 한 픽셀 차이로 넘겨
  // 아래 titleLines가 한 줄 줄어들고 멀쩡한 글자가 말줄임된다.
  titleFs = Math.max(11, Math.floor(fitFontSize(name, textW, titleBudget, titleMax, 11, line)));
  // 예산 안에 들어가는 줄 수만 허용한다. 행사명이 더 길면 마지막 줄에서 말줄임 —
  // 지면 밖으로 흘려 잘리거나 아래 요소를 덮는 것보다 낫다(디자이너는 산출물별 overrides로 줄인다).
  const titleLines = Math.max(1, Math.floor(titleBudget / (titleFs * line)));

  const clamp = n => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden`;
  const title = `<div data-field="title" style="font-size:${titleFs}px;font-weight:700;line-height:${line};color:${fg};${WRAP};${clamp(titleLines)}">${esc(name)}</div>`;
  // 스트립은 글자 칸이 좁다. 일자와 장소를 다 넣으면 장소가 말줄임돼 오히려 정보가 사라진다 —
  // 한 줄에 못 들어가면 일자만 온전히 보여 준다(잘린 장소보다 낫다).
  const metaText = strip && textWidth(`${date} · ${venue}`) * metaFs > textW ? date : `${date} · ${venue}`;
  const meta = `<div style="font-size:${metaFs}px;line-height:1.35;color:${subFg};margin-top:${strip ? 3 : 6}px;${clamp(1)}">${esc(metaText)}</div>`;
  const ctaChip = !SHOW_CTA ? '' : `<span style="background:${ctaBg};color:${ctaFg};font-size:${ctaFs}px;font-weight:700;padding:${Math.round(ctaFs * 0.62)}px ${Math.round(ctaFs * 1.15)}px;border-radius:6px;white-space:nowrap">${esc(cta)}</span>`;

  const shell = `position:relative;width:${spec.w}px;height:${spec.h}px;${bg}${border};overflow:hidden;font-family:${fontStack(style.fonts.heading)};color:${fg};box-sizing:border-box;display:flex`;

  if (strip) {
    // 가로 스트립 — [로고] [행사명 + 메타] [CTA], 오른쪽 끝에 키비주얼
    return `<div style="${shell};flex-direction:row;align-items:center;gap:14px;padding:0 ${pad + objW}px 0 ${pad}px">
  ${object}${band}
  ${logoImg ? `<div style="position:relative;flex:none;display:flex;align-items:center">${logoImg}</div>` : ''}
  <div style="position:relative;flex:1 1 auto;min-width:0">
    ${title}
    ${meta}
  </div>
  ${ctaChip ? `<div style="position:relative;flex:none">${ctaChip}</div>` : ''}
</div>`;
  }

  // 세로 스택 — [로고 슬롯] / [일자 → 행사명 → 장소] / [CTA] 세 층. 키비주얼 자리는 패딩으로 비운다.
  // 본문 층은 overflow:hidden이다. 예산 계산이 어긋나도 아래 CTA를 덮는 일만은 없게 하는 마지막 방어선.
  const eyebrow = `<div style="font-size:${eyebrowFs}px;font-weight:700;color:${subFg};margin-bottom:${Math.round(eyebrowFs * 0.7)}px">${esc(date)}</div>`;
  return `<div style="${shell};flex-direction:column;align-items:stretch;justify-content:flex-start;padding:${pad}px ${pad + objW}px ${pad + objH}px ${pad}px">
  ${object}${band}
  ${logoImg ? `<div style="position:relative;flex:none;height:${logoH}px;margin-bottom:${Math.round(logoH * 0.8)}px">${logoImg}</div>` : ''}
  <div style="position:relative;flex:1 1 auto;min-height:0;min-width:0;overflow:hidden;display:flex;flex-direction:column;justify-content:${spec.h / spec.w >= 1.8 ? 'center' : 'flex-start'}">
    ${eyebrow}
    ${title}
    <div style="font-size:${metaFs}px;line-height:1.35;color:${subFg};margin-top:${Math.round(titleMax * 0.5)}px;${clamp(metaLines)}">${esc(venue)}</div>
  </div>
  ${ctaChip ? `<div style="position:relative;flex:none;margin-top:${Math.round(pad * 0.6)}px">${ctaChip}</div>` : ''}
</div>`;
}

// CTA 칩이 스트립에서 차지할 폭의 근사 — 글자 폭 단위 × 크기 + 좌우 패딩.
// 정확할 필요는 없다. 남은 폭을 과대평가해 제목이 넘치는 것만 막으면 된다.
function ctaWidth(cta) {
  return Math.round(textWidth(cta) * 13 + 34);
}
