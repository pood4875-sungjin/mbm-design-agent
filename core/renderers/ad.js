// 광고 소재 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
//
// 두 층의 데이터가 그림을 정한다:
//   ① 매체 규격(spec.rules · spec.mediumRules) — 치수·안전영역·글자 슬롯·글자색·글꼴·폰트 크기·배경(투명) : 지켜야 하는 것
//   ② 매체 디자인 프로필(core/design.js) — 실제 나간 소재 N장에서 다수인 선택 : 그렇게 생겨야 하는 것
//      배경 유형·오브젝트 위치와 폭·정렬·카피 줄 수·메인 글자 비율·로고 자리·날짜 알약 여부
//   프로필이 비어 있으면(관찰 부족) 지면 비율로 판단하는 기본 문법을 쓴다.
//
// 구글 GDN 28장에서 확인된 "한 캠페인을 여러 비율로 재배치하는 법"이 기본 문법이다:
//   가로형 = 왼쪽 정렬, 오브젝트 오른쪽 28~38% / 세로형 = 세로 스택, 오브젝트 하단 1/3, 중앙 정렬
//   메인 카피는 비율이 아니라 절대 px(24~40)에 가깝고, 정보(날짜·모집분야)는 규격이 작아져도 빼지 않는다
//   날짜는 알약(pill)·태그로 장식한다(24/28)
//
// 문구는 "사다리"에서 고른다(긴 표현 → 짧은 표현, 매체 글자수 한도에 들어가는 가장 긴 것) — 지어내지 않는다.
// 모든 글자 요소에 data-field="<role>"을 심어 measure.js가 재고 lint.js가 판정한다. 렌더러는 검사하지 않는다.
// 절대배치 금지·로고는 flex 슬롯·글자는 지면 안에서 줄이기 — banner.js와 같은 원칙.

import { esc, WRAP, fitFontSize, fieldGradient, textWidth } from './banner.js';
import { fontStack } from '../fonts.js';
import { fitKeyVisual } from '../palette.js';
import { limitsByRole, roleOf, countChars, estimateLines, inImage } from '../adfields.js';
import { designOf } from '../design.js';

const mmdd = d => String(d ?? '').replace(/^\d{4}-(\d{2})-(\d{2})$/, '$1.$2');

// 맥락 → 역할별 문구 사다리(긴 것 → 짧은 것). 채용이 기본, 행사 맥락도 같은 슬롯으로 흘린다.
export function copyLadder(ctx) {
  const c = ctx.core ?? {};
  const uniq = arr => [...new Set(arr.filter(s => s != null && String(s).trim() !== ''))];
  if (ctx.kind === 'recruit') {
    const d = c.deadline ? mmdd(c.deadline) : '';
    const qual = c.qualification ? String(c.qualification) : '';
    return {
      main: uniq([c.headline, [c.client, c.role, '채용'].filter(Boolean).join(' '), c.role ? `${c.role} 채용` : null, c.role, c.client ? `${c.client} 채용` : null, '채용 공고']),
      sub: uniq([[c.employType, c.location].filter(Boolean).join(' · '), c.location, c.employType]),
      date: uniq(d ? [`~ ${d} 지원 마감`, `~ ${d} 마감`, `~${d}`] : []),
      extra: uniq([qual, qual.split(/[·,/]/)[0]?.trim()]),
      advertiser: uniq([c.client]),
      cta: uniq([c.ctaText, '지원하기', '지원']),
      notice: uniq([c.notice]),
      label: uniq([c.role ? `모집직무 : ${c.role}` : null, c.employType]),
      url: uniq([c.applyUrl ? String(c.applyUrl).replace(/^https?:\/\//, '') : null]),
    };
  }
  return {
    main: uniq([c.name]), sub: uniq([c.venue]), date: uniq([c.date]), extra: uniq([c.audience]),
    advertiser: [], cta: uniq([c.cta]), notice: [], label: [], url: [],
  };
}
export function copyFor(ctx) {
  const l = copyLadder(ctx);
  return Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v[0] ?? '']));
}

// 매체 템플릿 실측(문구 칸·이미지 영역·폰트 크기)이 캔버스와 다른 프레임 기준일 때가 있다 —
// 자소설 PC달력배너는 328×466(2배) 프레임에서 쟀고 캔버스는 164×233이다. 그 비율로 환산한다.
export function templateScale(rules, w) {
  const src = `${rules?.safeArea?.measuredFromTemplate?.frame ?? ''} ${rules?.fontSizes?.unit ?? ''}`;
  const m = src.match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/);
  if (!m) return 1;
  const fw = Number(m[1]);
  return fw > 0 && fw !== w ? w / fw : 1;
}
function statedFontSizes(rules, scale = 1) {
  const out = {};
  for (const [k, v] of Object.entries(rules?.fontSizes ?? {})) {
    if (typeof v !== 'number') continue;
    const role = roleOf(k);
    if (role !== 'other' && out[role] == null) out[role] = Math.round(v * scale);
  }
  return out;
}
function safePad(rules, fallback) {
  const sa = rules?.safeArea;
  const n = k => (sa && typeof sa[k] === 'number') ? sa[k] : null;
  const any = sa && ['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number');
  if (!any) return { top: fallback, right: fallback, bottom: fallback, left: fallback, stated: false };
  return { top: n('top') ?? fallback, right: n('right') ?? fallback, bottom: n('bottom') ?? fallback, left: n('left') ?? fallback, stated: true };
}
const val = (m, fallback = null) => (m && m.value != null ? m.value : fallback);

export function renderAd(ctx, style, spec) {
  const rules = spec.rules ?? {};
  const mr = spec.mediumRules ?? {};
  const D = designOf(spec.medium) ?? null;
  const p = style.palette;
  const { w, h } = spec;
  const ladder = copyLadder(ctx);
  const counting = mr.textCounting ?? 'all-1';

  /* ── 슬롯 ── 매체 글자수 표에 있는 역할만 그린다. 표가 없으면 메인·서브·날짜가 기본(구글: 날짜 28/28 유지). */
  const inLimits = (rules.textLimits ?? []).filter(inImage);
  const by = limitsByRole(inLimits);
  const slots = Object.keys(by).length ? by : { main: { lines: null, maxChars: null }, sub: { lines: null, maxChars: null }, date: { lines: 1, maxChars: null } };
  const logoOnly = /로고|프로필/.test(rules.name ?? '') && !inLimits.length;
  if (!logoOnly && !slots.main) slots.main = { lines: null, maxChars: null };

  const tScale = templateScale(rules, w);
  const statedEarly = statedFontSizes(rules, tScale);
  const pickIn = (role, widthPx, fsHint = null, linesHint = null) => {
    const cands = ladder[role] ?? [];
    if (!cands.length) return '';
    const slot = slots[role];
    let perLine = slot?.maxCharsPerLine ?? null;
    // 매체가 정한 크기 > 목표 크기(관찰 px). 폭 ÷ 글자 폭으로 줄당 글자수를 잡아 줄 수를 추정한다
    const fs = statedEarly[role] ?? fsHint;
    if (fs && widthPx) perLine = Math.min(perLine ?? Infinity, Math.max(1, Math.floor(widthPx / (fs * 0.98))));
    const linesCap = slot?.lines ?? linesHint;
    const fits = c => (slot?.maxChars == null || countChars(c, counting) <= slot.maxChars)
      && (linesCap == null || perLine == null || !Number.isFinite(perLine) || estimateLines(c, perLine, counting) <= linesCap);
    return cands.find(fits) ?? cands[cands.length - 1];
  };
  let copy = Object.fromEntries(Object.keys(ladder).map(r => [r, pickIn(r, null)]));

  /* ── 지면 성격 ── */
  const S = Math.sqrt(w * h);
  const strip = !logoOnly && (h < 120 || w / h > 3.2);
  const tall = h / w > 1.6;

  /* ── 배경 ── 규격의 투명 규정 > 프로필 다수(단색/그라데이션/밝은 지면) > 기본 그라데이션 */
  const bgText = String(rules.background ?? '');
  const transparent = /투명/.test(bgText) && !/투명.{0,12}?(불가|금지)/.test(bgText);
  const lightField = !transparent && (D?.bgLight?.value ?? 0) >= 0.6;      // 자소설: 밝은 단색 위 검정 카피(9/13)
  const solidField = spec.flat || val(D?.background) === 'solid';
  let bg = '';
  if (!transparent) {
    if (lightField) bg = `background:${p.bg};`;
    else if (solidField) bg = `background:${p.primary};`;
    else bg = `background:${fieldGradient(p.primary)};`;
  }

  /* ── 글자색 ── 규격이 정하면 그대로(비즈보드), 아니면 지면 위 순흑/순백 */
  const tc = rules.textColors ?? {};
  const onField = (transparent || lightField) ? '#000000' : p.onPrimary;
  const mainFg = tc.main ?? onField;
  const subFg = tc.sub?.[0] ?? (tc.main ? tc.main : (mainFg === '#FFFFFF' ? 'rgba(255,255,255,.86)' : 'rgba(0,0,0,.64)'));
  const fgIsDark = mainFg !== '#FFFFFF';

  /* ── 글꼴 ── 매체가 요구하면 맨 앞(style 속성 안이라 작은따옴표) */
  const required = mr.fonts?.required;
  const family = required ? `'${required}', ${fontStack(style.fonts.heading)}` : fontStack(style.fonts.heading);

  /* ── 안전영역 → 패딩 ── 숫자가 없으면 지면 비례(8pt 그리드). 템플릿 실측 문구 칸이 있으면 그 자리. */
  const basePad = strip ? Math.min(16, Math.round(h * 0.15)) : (S >= 280 ? 24 : 16);
  const pad = safePad(rules, basePad);
  const tpl = rules.safeArea?.measuredFromTemplate;
  if (!pad.stated && tpl?.textColumn?.w) {
    pad.left = Math.round(tpl.textColumn.x * tScale); pad.right = Math.max(0, Math.round(w - (tpl.textColumn.x + tpl.textColumn.w) * tScale));
  }
  const tplImageBottom = !pad.stated && tpl?.image && (tpl.image.y + tpl.image.h) * tScale >= h - 1 && tpl.image.w * tScale >= w - 1;
  const tplBand = tplImageBottom ? Math.round(tpl.image.h * tScale) : 0;
  const hasKvEarly = !!style.keyVisual && !spec.flat;
  // 키비주얼이 없으면 템플릿의 이미지 띠를 비워 둔다(글자는 템플릿 문구 칸에만). 있으면 그 띠에 오브젝트가 들어간다.
  if (tplImageBottom && !hasKvEarly) pad.bottom = Math.max(pad.bottom, Math.round(h - tpl.image.y * tScale) + 8);
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const shell = `position:relative;width:${w}px;height:${h}px;${bg}overflow:hidden;font-family:${family};color:${mainFg};box-sizing:border-box;display:flex;padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`;
  const open = (extra = '') => `<div data-ad="1" data-spec="${esc(spec.id ?? '')}" data-transparent="${transparent ? 1 : 0}" style="${shell};${extra}">`;

  /* ── 로고 전용 규격 ── 로고를 가운데에, 없으면 광고주명 워드마크(한 줄 고정) */
  if (logoOnly) {
    const side = Math.min(innerW, innerH);
    const mark = style.logo
      ? `<img data-logo="1" src="${esc(style.logo)}" alt="" style="display:block;height:${Math.round(side * 0.6)}px;width:auto;max-width:${Math.round(innerW * 0.86)}px;object-fit:contain;${fgIsDark ? '' : 'filter:brightness(0) invert(1)'}"/>`
      : (() => { const t = copy.advertiser || copy.main; const fs = Math.max(8, Math.floor(Math.min(side * 0.22, (innerW * 0.86) / Math.max(1, textWidth(t)))));
          return `<div data-field="advertiser" style="font-size:${fs}px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${mainFg};text-align:center;white-space:nowrap">${esc(t)}</div>`; })();
    return `${open('align-items:center;justify-content:center')}${mark}</div>`;
  }

  /* ── 정렬·오브젝트 자리 (같은 형태의 관찰 > 매체 전체 관찰 > 지면 비율) ── */
  const shape = strip ? 'strip' : tall ? 'tall' : (w / h >= 1.6 ? 'wide' : 'box');
  const Ds = D?.byShape?.[shape];
  const prof = key => val(Ds?.[key]) ?? val(D?.[key]);
  const profNum = key => (Ds?.[key] ?? D?.[key]) ?? null;
  const align = strip ? 'left' : (prof('textAlign') ?? (tall ? 'center' : 'left'));
  const hasKv = hasKvEarly;
  let objectSide = hasKv ? (tplBand ? 'bottom' : (prof('objectSide') ?? (tall ? 'bottom' : 'right'))) : 'none';
  if (objectSide === 'full-bleed' || objectSide === 'center') objectSide = tall ? 'bottom' : 'right';
  if (strip && objectSide === 'bottom') objectSide = 'right';
  if (objectSide === 'right' && !strip && innerW < 400 && h / w > 0.8) objectSide = 'bottom';   // 288×288 썸네일류
  if (objectSide === 'left') objectSide = 'right';     // 왼쪽 오브젝트는 카피 왼쪽 정렬과 부딪힌다 — 다수(오른쪽)로 통일
  const objRatio = profNum('objectWidthRatio');
  const objW = objectSide === 'right' ? Math.round(innerW * Math.min(0.5, Math.max(0.24, objRatio ?? (strip ? 0.32 : 0.38)))) : 0;
  const objH = objectSide === 'bottom' ? (tplBand ? Math.max(24, tplBand - pad.bottom) : Math.round(innerH * 0.33)) : 0;
  const textW = objectSide === 'right' ? innerW - objW - Math.round(innerW * 0.04) : innerW;
  const textH = objectSide === 'bottom' ? innerH - objH - 12 : innerH;

  /* ── 슬롯 유무 ── 정보는 규격이 작아져도 빼지 않는다(구글 28/28). 날짜는 알약으로. */
  const pillDate = (D?.badgePresent?.value ?? 0) >= 0.5 || val(D?.badgeStyle) === 'pill';
  const want = {
    sub: !!slots.sub && !!copy.sub, date: !!slots.date && !!copy.date, extra: !!slots.extra && !!copy.extra,
    label: !!slots.label && !!copy.label, cta: !!slots.cta && !!copy.cta, notice: !!slots.notice && !!copy.notice,
    advertiser: !!slots.advertiser && !!copy.advertiser && !style.logo,
  };
  /* ── 타이포 ── 메인은 절대 px에 가깝다: 프로필 비율×높이 → 22~72px 안으로, 그다음 예산 안에서 줄인다 */
  const stated = statedFontSizes(rules, tScale);
  const th = rules.textHeightPx ?? null;
  const line = 1.22;
  // 관찰된 메인 글자 px(중앙값)가 있으면 그것이 상한 — 지면이 커진다고 비율로 키우지 않는다(GDN 28/28)
  const observedPx = profNum('mainPx');
  let titleMax = Math.min(72, Math.max(22, observedPx ? Math.round(observedPx * 1.15) : Math.round(S * 0.085)));
  if (strip) titleMax = Math.min(titleMax, Math.round(innerH * 0.5));
  titleMax = Math.max(14, Math.min(titleMax, Math.floor(textW / 5)));   // 한 줄에 다섯 글자는 들어가야 카피가 된다 (썸네일 288px)
  const capMain = th?.max != null ? Math.min(titleMax, th.max) : titleMax;
  const floorMain = th?.min != null ? Math.max(11, th.min) : 11;
  const obsLines = profNum('mainLines');
  const mainLinesCap = slots.main.lines ?? (obsLines ? Math.max(2, Math.round(obsLines) + (tall ? 2 : 1)) : null);
  const noticeLines = slots.notice?.lines ?? 2;
  // 이제 목표 크기·줄 수를 아니 문구를 다시 고른다 — 관찰 px를 지키고 문구를 줄이는 쪽이 실제 소재의 방식이다
  copy.main = pickIn('main', textW, stated.main ?? capMain, mainLinesCap);
  for (const r of ['sub', 'date', 'extra', 'label']) copy[r] = pickIn(r, textW);

  const sizesAt = k => {
    const cap = Math.max(floorMain, Math.round(capMain * k));
    const subFs = Math.max(9, Math.round((stated.sub ?? Math.round(capMain * 0.5)) * k));
    const smallFs = Math.max(8, Math.round(subFs * 0.88));
    const noticeFs = Math.max(8, Math.round(subFs * 0.7));
    const ctaFs = Math.max(10, Math.round(cap * 0.5));
    const logoH = strip ? Math.min(22, Math.round(innerH * 0.5)) : Math.round(Math.min(40, Math.max(14, S * 0.07)) * k);
    return { cap, subFs, smallFs, noticeFs, ctaFs, logoH };
  };
  const pillPadV = fs => Math.round(fs * 0.38);
  const blocksOf = z => (style.logo && !strip ? z.logoH + Math.round(z.logoH * 0.7) : 0)
    + (want.advertiser ? Math.round(z.smallFs * 1.3) + 4 : 0)
    + (want.sub ? Math.round(z.subFs * line) + 6 : 0)
    + ((want.date || want.label) ? Math.round(z.smallFs * line) + (pillDate ? pillPadV(z.smallFs) * 2 + 4 : 0) + 8 : 0)
    + (want.extra ? Math.round(z.smallFs * line) + 4 : 0)
    + (want.notice ? Math.round(z.noticeFs * line * noticeLines) + 6 : 0)
    + (want.cta && !strip ? Math.round(z.ctaFs * 1.3) + Math.round(z.ctaFs * 0.6) * 2 + 8 : 0);

  let z = sizesAt(1);
  let titleBudget = textH - blocksOf(z);
  if (titleBudget < z.cap * line) {
    const k = Math.max(0.35, (textH - z.cap * line) / Math.max(1, blocksOf(z)));
    z = sizesAt(k);
    titleBudget = textH - blocksOf(z);
  }
  titleBudget = Math.max(floorMain * line, titleBudget);
  let mainFs = stated.main ?? Math.floor(fitFontSize(copy.main, textW, titleBudget, z.cap, floorMain, line));
  let mainLines = Math.max(1, Math.min(mainLinesCap ?? 99, Math.floor(titleBudget / (mainFs * line))));
  // 예산이 사다리가 가정한 줄 수보다 적으면(작은 지면·하단 오브젝트) 실제 줄 수로 다시 고르고 크기를 다시 맞춘다
  const rePick = pickIn('main', textW, mainFs, mainLines);
  if (rePick !== copy.main) {
    copy.main = rePick;
    mainFs = stated.main ?? Math.floor(fitFontSize(copy.main, textW, titleBudget, z.cap, floorMain, line));
    mainLines = Math.max(1, Math.min(mainLinesCap ?? 99, Math.floor(titleBudget / (mainFs * line))));
  }

  // 한 줄 슬롯은 폭을 넘기면 잘린다 — 글자수 한도는 지키면서 폭에 들어가는 가장 긴 문구로 다시 고른다
  const byWidth = (role, fs, width) => {
    const cands = ladder[role] ?? []; if (cands.length < 2) return;
    const slot = slots[role]; if (slot?.lines != null && slot.lines > 1) return;
    const charsOk = c => slot?.maxChars == null || countChars(c, counting) <= slot.maxChars;
    copy[role] = cands.find(c => charsOk(c) && textWidth(c) * fs <= width) ?? cands.find(charsOk) ?? cands[cands.length - 1];
  };
  byWidth('date', z.smallFs, (pillDate && want.label ? textW * 0.5 : textW) * 0.9);
  byWidth('label', z.smallFs, textW * 0.45);
  if (!strip) byWidth('sub', z.subFs, textW * 0.96);
  byWidth('extra', z.smallFs, textW * 0.96);
  const noticeFs = want.notice ? Math.max(8, Math.floor(fitFontSize(copy.notice, textW * 0.92, z.noticeFs * line * noticeLines, Math.min(z.noticeFs, Math.floor(innerW / 14)), 8, line))) : 0;

  /* ── 조각 ── */
  const clamp = n => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden`;
  const T = (role, text, fs, weight, color, extraCss = '', lines = 1) =>
    `<div data-field="${role}" style="font-size:${fs}px;line-height:${line};font-weight:${weight};color:${color};text-align:${align};${WRAP};${clamp(lines)};${extraCss}">${esc(text)}</div>`;
  // 알약 — 테두리형(네이버·블라인드·GDN 다수). 글자색을 그대로 써서 지면과 어긋나지 않는다.
  const pill = (role, text, fs) =>
    `<span data-field="${role}" style="display:inline-block;font-size:${fs}px;line-height:${line};font-weight:600;color:${mainFg};border:1.5px solid ${mainFg};border-radius:999px;padding:${pillPadV(fs)}px ${Math.round(fs * 0.9)}px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">${esc(text)}</span>`;
  const ctaChip = () => `<span data-field="cta" style="display:inline-block;background:${mainFg};color:${fgIsDark ? '#FFFFFF' : p.primary};font-size:${z.ctaFs}px;line-height:${line};font-weight:700;padding:${Math.round(z.ctaFs * 0.6)}px ${Math.round(z.ctaFs * 1.1)}px;border-radius:6px;white-space:nowrap">${esc(copy.cta)}</span>`;
  const logoImg = (hPx, maxW) => style.logo
    ? `<img data-logo="1" src="${esc(style.logo)}" alt="" style="display:block;height:${hPx}px;width:auto;max-width:${maxW}px;object-fit:contain;${fgIsDark ? '' : 'filter:brightness(0) invert(1)'}"/>`
    : '';
  // 오브젝트(키비주얼) — 썸네일형: 둥근 상자에 cover. 세로형은 하단 띠(전폭).
  const kvFit = hasKv ? fitKeyVisual(1, style.kvMeta?.ar, style.kvMeta?.edge ?? p.primary) : null;
  const objectBox = (bw, bh, radius) => hasKv
    ? `<div data-object="1" style="flex:none;width:${bw}px;height:${bh}px;border-radius:${radius}px;background:${kvFit?.bg ?? p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat;overflow:hidden"></div>`
    : '';

  /* ── 로고 자리 (프로필: 우상단 다수 / 세로·중앙 정렬은 상단 중앙 / 캐치 MO는 우하단) ── */
  let logoPos = prof('logoPosition') ?? 'top-left';
  if (['right', 'inline-with-copy', 'left'].includes(logoPos)) logoPos = 'top-right';
  if (align === 'center' && logoPos.startsWith('top')) logoPos = 'top-center';
  const logoRowJustify = logoPos.endsWith('right') ? 'flex-end' : logoPos.endsWith('center') ? 'center' : 'flex-start';
  const logoAtBottom = logoPos.startsWith('bottom');

  const metaRow = () => {
    const parts = [];
    if (want.date) parts.push(pillDate ? pill('date', copy.date, z.smallFs) : T('date', copy.date, z.smallFs, 600, subFg));
    if (want.label && pillDate) parts.push(pill('label', copy.label, z.smallFs));
    if (!parts.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:6px 8px;justify-content:${align === 'center' ? 'center' : 'flex-start'};margin-top:${Math.round(z.smallFs * 0.5)}px">${parts.join('')}</div>`;
  };

  if (strip) {
    // 가로 띠 — [로고] | [메인 / 서브 · 날짜 / 고지] | [오브젝트] [CTA]
    const meta = [want.sub ? copy.sub : null, want.date ? copy.date : null].filter(Boolean).join('  ·  ');
    const lg = logoImg(z.logoH, Math.round(innerW * 0.16));
    return `${open('flex-direction:row;align-items:center;gap:20px')}
${lg ? `<div style="flex:none;display:flex;align-items:center;gap:20px">${lg}<div style="width:1px;height:${Math.round(innerH * 0.7)}px;background:${mainFg};opacity:.25"></div></div>` : ''}
<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center">
${T('main', copy.main, mainFs, 800, mainFg, 'letter-spacing:-0.015em', mainLines)}
${meta ? T(want.sub ? 'sub' : 'date', meta, z.subFs, 500, subFg, 'margin-top:3px') : ''}
${want.notice ? T('notice', copy.notice, noticeFs, 400, subFg, 'margin-top:3px;opacity:.9') : ''}
</div>
${objectSide === 'right' ? objectBox(objW, Math.round(innerH * 0.92), Math.round(innerH * 0.16)) : ''}
${want.cta ? `<div style="flex:none">${ctaChip()}</div>` : ''}
</div>`;
  }

  /* ── 세로 스택 ── [로고] / [광고주] / 메인 / 서브 / [날짜 알약 · 라벨 알약] / 부가 / CTA / 고지 */
  const parts = [];
  const lg = logoImg(z.logoH, Math.round(innerW * Math.min(0.42, Math.max(0.16, D?.logoSizeRatio ?? 0.3))));
  const logoRow = lg ? `<div style="flex:none;display:flex;justify-content:${logoRowJustify};height:${z.logoH}px;${logoAtBottom ? 'margin-top:auto;padding-top:8px' : `margin-bottom:${Math.round(z.logoH * 0.7)}px`}">${lg}</div>` : '';
  if (lg && !logoAtBottom) parts.push(logoRow);
  else if (want.advertiser) parts.push(T('advertiser', copy.advertiser, z.smallFs, 700, subFg, `letter-spacing:.08em;margin-bottom:${Math.round(z.smallFs * 0.5)}px`));
  parts.push(T('main', copy.main, mainFs, 800, mainFg, 'letter-spacing:-0.015em', mainLines));
  if (want.sub) parts.push(T('sub', copy.sub, z.subFs, 500, subFg, 'margin-top:6px', Math.min(slots.sub.lines ?? 2, 2)));
  parts.push(metaRow());
  if (want.extra) parts.push(T('extra', copy.extra, z.smallFs, 400, subFg, 'margin-top:6px', Math.min(slots.extra.lines ?? 1, 2)));
  if (want.cta) parts.push(`<div style="flex:none;margin-top:${Math.round(z.ctaFs * 0.6)}px;text-align:${align}">${ctaChip()}</div>`);
  if (want.notice) parts.push(T('notice', copy.notice, noticeFs, 400, subFg, `${logoAtBottom ? '' : 'margin-top:auto;'}padding-top:6px;opacity:.9`, noticeLines));
  if (lg && logoAtBottom) parts.push(logoRow);

  const textCol = `<div style="flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:${tall && objectSide !== 'bottom' ? 'center' : 'flex-start'};align-items:${align === 'center' ? 'center' : 'stretch'}">${parts.filter(Boolean).join('\n')}</div>`;

  if (objectSide === 'bottom') {
    return `${open('flex-direction:column;gap:12px')}
${textCol}
${objectBox(innerW, objH, 0)}
</div>`;
  }
  return `${open('flex-direction:row;gap:' + Math.round(innerW * 0.04) + 'px;align-items:stretch')}
${textCol}${objectSide === 'right' ? objectBox(objW, innerH, Math.round(Math.min(18, innerH * 0.08))) : ''}
</div>`;
}
