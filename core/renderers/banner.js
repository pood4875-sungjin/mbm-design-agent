// 배너 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
// 키비주얼은 cover 크롭(안전 크롭), 없으면 색면 배경 (PRD F5 비율 대응 규칙).
// variant: 0=컬러 솔리드/키비주얼 · 1=화이트 반전 · 2=하단 컬러 밴드
//
// 레이아웃 문법 2종 — 규격 비율이 성격을 정한다:
//   stack (h ≥ 120)  세로로 쌓는다. [로고 슬롯] → [일자 아이브로우 → 행사명 → 장소] → [CTA]
//   strip (h < 120)  가로로 눕힌다. [로고 슬롯] | [행사명 + 메타] [CTA]
// 두 문법 모두 로고를 flex 아이템으로 두어 "자리를 먼저 비우고" 글자를 배치한다.
// 절대배치로 얹으면 행사명이 길어질 때 글자를 덮는다 — 이전에 실제로 났던 버그다.

import { fontStack } from '../fonts.js';
import { fitKeyVisual, shiftHue } from '../palette.js';

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

export function renderBanner(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const v = spec.variant ?? 0;
  const strip = spec.h < 120;
  // 지면 크기를 한 값으로 묶는다 — 300×250과 160×600은 면적이 비슷하니 글자도 비슷해야 한다.
  const S = Math.sqrt(spec.w * spec.h);
  // 8pt 그리드 (design-system-examples.md > 스페이싱 8pt 그리드 + 4pt 보조 근거)
  const pad = strip ? 16 : (S >= 280 ? 24 : 16);

  let bg, fg, subFg, ctaBg, ctaFg, band = '', accent;
  if (v === 1) {
    bg = `background:${p.bg}`;
    fg = p.primary; subFg = p.inkSub;
    ctaBg = p.primary; ctaFg = p.onPrimary;
    accent = p.primary;
  } else {
    if (style.keyVisual) {
      const fit = fitKeyVisual(spec.w / spec.h, style.kvMeta?.ar, style.kvMeta?.edge ?? p.primary);
      bg = fit.mode === 'contain'
        // 비율이 크게 다르면 잘라내지 않고 넣어 맞추고, 여백은 가장자리 색으로 잇는다
        ? `background:${fit.bg};background-image:url('${esc(style.keyVisual)}'),${fit.bg};background-size:contain,cover;background-position:${fit.wide ? 'right center' : 'center bottom'},center;background-repeat:no-repeat,no-repeat`
        : `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`;
    } else {
      bg = `background:${fieldGradient(p.primary)}`;
    }
    const rd = style.keyVisual ? (style.kvReadability?.banner ?? null) : null;
    fg = rd?.text ?? p.onPrimary;
    subFg = fg === '#FFFFFF' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.6)';
    ctaBg = fg; ctaFg = fg === '#FFFFFF' ? p.primary : '#FFFFFF';
    accent = fg === '#FFFFFF' ? p.accent : p.primary;
    if (rd?.scrim) {
      const dir = fg === '#FFFFFF' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.62)';
      band = `<div data-scrim="1" style="position:absolute;inset:0;background:linear-gradient(${strip ? '90deg' : '180deg'},${dir},transparent 72%)"></div>` + band;
    }
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
    ? spec.w - pad * 2 - (style.logo ? logoMaxW + 29 : 0) - ctaWidth(cta) - 14
    : spec.w - pad * 2;

  let titleBudget, titleFs, metaLines;
  if (strip) {
    metaLines = 1;
    titleBudget = spec.h - 12 - metaFs * 1.35 - 3;
  } else {
    // 세로 스택의 높이 예산: 지면 − 패딩 − 로고 슬롯 − 아이브로우 − 룰 − 장소 − CTA
    const logoBlock = style.logo ? logoH + Math.round(logoH * 0.8) : 0;
    const eyebrowBlock = Math.round(eyebrowFs * 1.3) + Math.round(eyebrowFs * 0.7);
    const ctaBlock = Math.round(ctaFs * 1.3) + Math.round(ctaFs * 0.62) * 2 + Math.round(pad * 0.6);
    metaLines = Math.max(1, Math.min(2, Math.ceil(textWidth(venue) / Math.max(1, textW / metaFs))));
    const metaBlock = Math.round(metaFs * 1.35) * metaLines + Math.round(titleMax * 0.5);
    const ruleBlock = 3 + Math.round(titleMax * 0.55);
    titleBudget = spec.h - pad * 2 - logoBlock - eyebrowBlock - ruleBlock - metaBlock - ctaBlock;
  }
  titleBudget = Math.max(titleMax * line, titleBudget);
  // 내림으로 정수화한다 — 올림하면 방금 맞춰 놓은 예산을 한 픽셀 차이로 넘겨
  // 아래 titleLines가 한 줄 줄어들고 멀쩡한 글자가 말줄임된다.
  titleFs = Math.max(11, Math.floor(fitFontSize(name, textW, titleBudget, titleMax, 11, line)));
  // 예산 안에 들어가는 줄 수만 허용한다. 행사명이 더 길면 마지막 줄에서 말줄임 —
  // 지면 밖으로 흘려 잘리거나 아래 요소를 덮는 것보다 낫다(디자이너는 산출물별 overrides로 줄인다).
  const titleLines = Math.max(1, Math.floor(titleBudget / (titleFs * line)));

  const clamp = n => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden`;
  const title = `<div style="font-size:${titleFs}px;font-weight:800;line-height:${line};color:${fg};${WRAP};${clamp(titleLines)}">${esc(name)}</div>`;
  // 스트립은 글자 칸이 좁다. 일자와 장소를 다 넣으면 장소가 말줄임돼 오히려 정보가 사라진다 —
  // 한 줄에 못 들어가면 일자만 온전히 보여 준다(잘린 장소보다 낫다).
  const metaText = strip && textWidth(`${date} · ${venue}`) * metaFs > textW ? date : `${date} · ${venue}`;
  const meta = `<div style="font-size:${metaFs}px;line-height:1.35;color:${subFg};margin-top:${strip ? 3 : 6}px;${clamp(1)}">${esc(metaText)}</div>`;
  const ctaChip = `<span style="background:${ctaBg};color:${ctaFg};font-size:${ctaFs}px;font-weight:700;padding:${Math.round(ctaFs * 0.62)}px ${Math.round(ctaFs * 1.15)}px;border-radius:6px;white-space:nowrap">${esc(cta)}</span>`;

  const shell = `position:relative;width:${spec.w}px;height:${spec.h}px;${bg}${border};overflow:hidden;font-family:${fontStack(style.fonts.heading)};color:${fg};box-sizing:border-box;display:flex`;

  if (strip) {
    // 가로 스트립 — 로고와 글자 사이에 헤어라인을 세워 두 덩어리를 분리한다.
    // (industry-examples.md > 네이버 코퍼레이트: "단순하지만 또렷한 위계" 근거)
    return `<div style="${shell};flex-direction:row;align-items:center;gap:14px;padding:0 ${pad}px">
  ${band}
  ${logoImg ? `<div style="position:relative;flex:none;display:flex;align-items:center;gap:14px">
    ${logoImg}
    <div style="width:1px;height:${Math.round(spec.h * 0.46)}px;background:${fg};opacity:.28"></div>
  </div>` : ''}
  <div style="position:relative;flex:1 1 auto;min-width:0">
    ${title}
    ${meta}
  </div>
  <div style="position:relative;flex:none">${ctaChip}</div>
</div>`;
  }

  // 세로 스택 — [로고 슬롯] / [아이브로우 → 행사명 → 액센트 룰 → 장소] / [CTA] 세 층.
  // 본문 층은 overflow:hidden이다. 예산 계산이 어긋나도 아래 CTA를 덮는 일만은 없게 하는 마지막 방어선.
  const eyebrow = `<div style="font-size:${eyebrowFs}px;font-weight:700;color:${subFg};margin-bottom:${Math.round(eyebrowFs * 0.7)}px">${esc(date)}</div>`;
  // 액센트 룰 — 제목과 메타 사이의 한 칸. 색면 하나만으로 지면에 리듬이 생긴다.
  // (industry-examples.md > 토스 10가지 UX 법칙 ⑨ 폰 레스토프: 강조엔 진한·보색 근거)
  const rule = `<div style="width:${Math.round(spec.w * 0.16)}px;height:3px;background:${accent};margin-top:${Math.round(titleMax * 0.55)}px"></div>`;
  return `<div style="${shell};flex-direction:column;align-items:stretch;justify-content:flex-start;padding:${pad}px">
  ${band}
  ${logoImg ? `<div style="position:relative;flex:none;height:${logoH}px;margin-bottom:${Math.round(logoH * 0.8)}px">${logoImg}</div>` : ''}
  <div style="position:relative;flex:1 1 auto;min-height:0;min-width:0;overflow:hidden;display:flex;flex-direction:column;justify-content:${spec.h / spec.w >= 1.8 ? 'center' : 'flex-start'}">
    ${eyebrow}
    ${title}
    ${rule}
    <div style="font-size:${metaFs}px;line-height:1.35;color:${subFg};margin-top:${Math.round(titleMax * 0.5)}px;${clamp(metaLines)}">${esc(venue)}</div>
  </div>
  <div style="position:relative;flex:none;margin-top:${Math.round(pad * 0.6)}px">${ctaChip}</div>
</div>`;
}

// CTA 칩이 스트립에서 차지할 폭의 근사 — 글자 폭 단위 × 크기 + 좌우 패딩.
// 정확할 필요는 없다. 남은 폭을 과대평가해 제목이 넘치는 것만 막으면 된다.
function ctaWidth(cta) {
  return Math.round(textWidth(cta) * 13 + 34);
}
