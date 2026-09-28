// 광고 소재 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
//
// 세 층의 데이터가 그림을 정한다:
//   ① 매체 규격(spec.rules · spec.mediumRules) — 치수·안전영역·글자 슬롯·글자색·글꼴·폰트 크기·배경(투명)·로고 허용 : 지켜야 하는 것
//   ② 매체 템플릿 실측(rules.safeArea.measuredFromTemplate) — 로고 칸·문구 칸·이미지 영역의 좌표 : 자소설처럼 칸이 고정된 매체
//   ③ 매체 디자인 프로필(core/design.js) — 실제 나간 소재 N장에서 다수인 선택 : 그렇게 생겨야 하는 것
//      배경·오브젝트 위치와 폭·정렬·카피 줄 수·메인 글자 px·로고 자리·날짜 알약·서브가 메인 위인지
//   프로필이 비어 있으면(관찰 부족) 지면 비율로 판단하는 기본 문법(구글 GDN 28장)을 쓴다.
//
// 자소설 실제 소재(현대케피코·한독·세아제강)의 위계가 기준이다:
//   [로고 칸] → 서브(시즌 문구, 굵게·작게) → 메인(굵게 2~4줄) → 상세("라벨 : 값" 정보 줄, 가늘게) → [이미지 띠 전폭]
//   지면은 브랜드색 파스텔 틴트 또는 브랜드 단색, 글자는 순흑/순백.
//
// 문구는 "사다리"에서 고른다(긴 표현 → 짧은 표현, 한도에 들어가는 가장 긴 것) — 지어내지 않는다.
// 모든 글자 요소에 data-field="<role>"을 심어 measure.js가 재고 lint.js가 판정한다. 렌더러는 검사하지 않는다.
// 절대배치는 템플릿이 좌표를 정한 로고 칸·이미지 영역에만 쓴다 — 글자는 그 영역을 피한 흐름 배치다.

import { esc, WRAP, fitFontSize, fieldGradient, textWidth } from './banner.js';
import { fontStack } from '../fonts.js';
import { limitsByRole, roleOf, countChars, estimateLines, inImage } from '../adfields.js';
import { designOf } from '../design.js';

const mmdd = d => String(d ?? '').replace(/^\d{4}-(\d{2})-(\d{2})$/, '$1.$2');
const mix = (hex, to, t) => {   // hex와 to를 t만큼 섞는다 (t=1이면 to)
  const a = hex.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16)), b = to.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// 맥락 → 역할별 문구 사다리(긴 것 → 짧은 것) + 상세 정보 줄. 채용이 기본, 행사 맥락도 같은 슬롯으로 흘린다.
export function copyLadder(ctx) {
  const c = ctx.core ?? {};
  const uniq = arr => [...new Set(arr.filter(s => s != null && String(s).trim() !== ''))];
  if (ctx.kind === 'recruit') {
    const d = c.deadline ? mmdd(c.deadline) : '';
    const qual = c.qualification ? String(c.qualification) : '';
    return {
      main: uniq([c.headline, [c.client, c.role, '채용'].filter(Boolean).join(' '), c.role ? `${c.role} 채용` : null, c.role, c.client ? `${c.client} 채용` : null, '채용 공고']),
      sub: uniq([c.season ? `${c.season} ${c.client ?? ''}`.trim() : null, c.client ? `${c.client} 채용` : null, c.employType, '채용 공고']),
      date: uniq(d ? [`~ ${d} 지원 마감`, `~ ${d} 마감`, `~${d}`] : []),
      extra: uniq([qual, qual.split(/[·,/]/)[0]?.trim()]),
      advertiser: uniq([c.client]),
      cta: uniq([c.ctaText, '지원하기', '지원']),
      notice: uniq([c.notice]),
      label: uniq([c.role ? `모집직무 : ${c.role}` : null, c.employType]),
      url: uniq([c.applyUrl ? String(c.applyUrl).replace(/^https?:\/\//, '') : null]),
      // 상세 정보 줄 — 우선순위 순. 자리(줄 수)가 모자라면 뒤에서부터 뺀다.
      details: [
        d ? { label: '채용일정', value: `~${d}` } : null,
        c.role ? { label: '모집직무', value: c.role } : null,
        c.location ? { label: '근무지', value: c.location } : null,
        c.employType ? { label: '고용형태', value: c.employType } : null,
        qual ? { label: '지원자격', value: qual } : null,
      ].filter(Boolean),
    };
  }
  return {
    main: uniq([c.name]), sub: uniq([c.audience]), date: uniq([c.date]), extra: uniq([c.audience]),
    advertiser: [], cta: uniq([c.cta]), notice: [], label: [], url: [],
    details: [c.date ? { label: '일시', value: c.date } : null, c.venue ? { label: '장소', value: c.venue } : null, c.audience ? { label: '대상', value: c.audience } : null].filter(Boolean),
  };
}
export function copyFor(ctx) {
  const l = copyLadder(ctx);
  return Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'details').map(([k, v]) => [k, v[0] ?? '']));
}

// 매체 템플릿 실측이 캔버스와 다른 프레임 기준일 때(자소설 PC달력배너: 328×466 = 2배) 그 비율로 환산한다.
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
const rect = (r, k) => r ? { x: Math.round(r.x * k), y: Math.round(r.y * k), w: Math.round(r.w * k), h: Math.round(r.h * k) } : null;

export function renderAd(ctx, style, spec) {
  const rules = spec.rules ?? {};
  const mr = spec.mediumRules ?? {};
  const D = designOf(spec.medium) ?? null;
  const p = style.palette;
  const { w, h } = spec;
  const ladder = copyLadder(ctx);
  const counting = mr.textCounting ?? 'all-1';

  /* ── 슬롯 ── 매체 글자수 표에 있는 역할만. 표가 없으면 메인·서브·날짜가 기본(구글: 날짜 28/28 유지). */
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
    const fs = statedEarly[role] ?? fsHint;
    if (fs && widthPx) perLine = Math.min(perLine ?? Infinity, Math.max(1, Math.floor(widthPx / (fs * 0.98))));
    const linesCap = slot?.lines ?? linesHint;
    const fits = c => (slot?.maxChars == null || countChars(c, counting) <= slot.maxChars)
      && (linesCap == null || perLine == null || !Number.isFinite(perLine) || estimateLines(c, perLine, counting) <= linesCap);
    return cands.find(fits) ?? cands[cands.length - 1];
  };
  let copy = Object.fromEntries(Object.keys(ladder).filter(k => k !== 'details').map(r => [r, pickIn(r, null)]));

  /* ── 지면 성격 ── */
  const S = Math.sqrt(w * h);
  const strip = !logoOnly && (h < 120 || w / h > 3.2);
  const tall = h / w > 1.6;
  const shape = strip ? 'strip' : tall ? 'tall' : (w / h >= 1.6 ? 'wide' : 'box');
  const Ds = D?.byShape?.[shape];
  const prof = key => val(Ds?.[key]) ?? val(D?.[key]);
  const profNum = key => (Ds?.[key] ?? D?.[key]) ?? null;

  /* ── 배경 ── 규격의 투명 규정 > 프로필(밝은 지면 틴트 / 단색 / 그라데이션) */
  const bgText = String(rules.background ?? '');
  const transparent = /투명/.test(bgText) && !/투명.{0,12}?(불가|금지)/.test(bgText);
  const lightField = !transparent && (D?.bgLight?.value ?? 0) >= 0.6;      // 자소설: 밝은 지면 위 검정 카피(9/13)
  const solidField = spec.flat || val(D?.background) === 'solid';
  // 밝은 지면은 순백이 아니라 브랜드색 파스텔 틴트 — 현대케피코(라벤더 블루)·한독(하늘색)처럼 지면이 브랜드를 말한다
  const tintTop = mix(p.primary, '#FFFFFF', 0.80), tintBottom = mix(p.primary, '#FFFFFF', 0.90);
  let bg = '', fieldColor = p.primary;
  if (!transparent) {
    if (lightField) { bg = `background:linear-gradient(180deg,${tintTop} 0%,${tintBottom} 100%);`; fieldColor = tintBottom; }
    else if (solidField) bg = `background:${p.primary};`;
    else bg = `background:${fieldGradient(p.primary)};`;
  }

  /* ── 글자색 ── 규격이 정하면 그대로(비즈보드), 아니면 지면 위 순흑/순백 */
  const tc = rules.textColors ?? {};
  const onField = (transparent || lightField) ? '#000000' : p.onPrimary;
  const mainFg = tc.main ?? onField;
  const fgIsDark = mainFg !== '#FFFFFF';
  const subFg = tc.sub?.[0] ?? (tc.main ? tc.main : (fgIsDark ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.86)'));
  const detailFg = tc.sub?.[0] ?? (tc.main ? tc.main : (fgIsDark ? 'rgba(0,0,0,.66)' : 'rgba(255,255,255,.82)'));

  /* ── 글꼴 ── */
  const required = mr.fonts?.required;
  const family = required ? `'${required}', ${fontStack(style.fonts.heading)}` : fontStack(style.fonts.heading);

  /* ── 템플릿 실측 칸 (자소설) ── */
  const tpl = rules.safeArea?.measuredFromTemplate ?? null;
  const tLogo = rect(tpl?.logo ?? tpl?.logoHorizontal ?? null, tScale);
  const tImage = rect(tpl?.image ?? tpl?.imageMain ?? null, tScale);
  const tText = tpl?.textColumn ? { x: Math.round(tpl.textColumn.x * tScale), w: Math.round(tpl.textColumn.w * tScale) } : null;
  const allowLogo = !(rules.logo && rules.logo.count === 0);   // M스탠다드·PC달력배너: 로고 삽입 불가
  const hasKv = !!style.keyVisual && !spec.flat;
  // 어두운 지면에는 흰색 로고. 없으면 원색 로고를 반전한다(워드마크는 괜찮고 컬러 로고는 뭉개진다 — 흰색 로고를 받는 게 맞다)
  const logoSrc = (!fgIsDark && style.logoLight) ? style.logoLight : style.logo;
  const logoFilter = (!fgIsDark && !style.logoLight) ? 'filter:brightness(0) invert(1)' : '';

  /* ── 안전영역 → 패딩 ── */
  const basePad = strip ? Math.min(16, Math.round(h * 0.15)) : (S >= 280 ? 24 : 16);
  const pad = safePad(rules, basePad);
  if (!pad.stated && tText) { pad.left = tText.x; pad.right = Math.max(0, w - tText.x - tText.w); }
  // 템플릿 이미지 영역: 하단 띠(전폭)면 글자는 그 위에서 끝나고, 우하단 상자면 그 윗선까지
  const imgBottomBand = tImage && tImage.y + tImage.h >= h - 1 && tImage.w >= w - 1;
  const imgCorner = tImage && !imgBottomBand && tImage.y > 0;
  const imgLeftCol = tImage && !imgBottomBand && tImage.x <= 1 && tImage.h >= h - 1;   // 자소설 PC메인: 왼쪽 이미지 열
  if (tImage && imgBottomBand) pad.bottom = Math.max(pad.bottom, h - tImage.y + Math.round(h * 0.02));
  if (imgLeftCol && !tText) pad.left = Math.max(pad.left, tImage.x + tImage.w + 16);
  // 템플릿 로고 칸이 상단에 있으면 글자는 그 아래에서 시작 (자소설: 로고 23~53 → 서브 82)
  if (allowLogo && tLogo && logoSrc && tLogo.y < h * 0.3) pad.top = Math.max(pad.top, tLogo.y + tLogo.h + Math.round(h * 0.045));
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const shell = `position:relative;width:${w}px;height:${h}px;${bg}overflow:hidden;font-family:${family};color:${mainFg};box-sizing:border-box;display:flex;padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`;
  const open = (extra = '') => `<div data-ad="1" data-spec="${esc(spec.id ?? '')}" data-transparent="${transparent ? 1 : 0}" style="${shell};${extra}">`;

  /* ── 로고 전용 규격 ── */
  if (logoOnly) {
    const side = Math.min(innerW, innerH);
    const mark = style.logo
      ? `<img data-logo="1" src="${esc(logoSrc)}" alt="" style="display:block;height:${Math.round(side * 0.6)}px;width:auto;max-width:${Math.round(innerW * 0.86)}px;object-fit:contain;${logoFilter}"/>`
      : (() => { const t = copy.advertiser || copy.main; const fs = Math.max(8, Math.floor(Math.min(side * 0.22, (innerW * 0.86) / Math.max(1, textWidth(t)))));
          return `<div data-field="advertiser" style="font-size:${fs}px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${mainFg};text-align:center;white-space:nowrap">${esc(t)}</div>`; })();
    return `${open('align-items:center;justify-content:center')}${mark}</div>`;
  }

  /* ── 정렬·오브젝트 자리 (템플릿 > 같은 형태의 관찰 > 매체 전체 > 지면 비율) ── */
  const align = strip ? 'left' : (prof('textAlign') ?? (tall ? 'center' : 'left'));
  let objectSide = 'none';
  if (hasKv) {
    if (tImage) objectSide = 'template';
    else {
      objectSide = prof('objectSide') ?? (tall ? 'bottom' : 'right');
      if (objectSide === 'full-bleed' || objectSide === 'center') objectSide = tall ? 'bottom' : 'right';
      if (strip && objectSide === 'bottom') objectSide = 'right';
      if (objectSide === 'right' && !strip && innerW < 400 && h / w > 0.8) objectSide = 'bottom';
      if (objectSide === 'left') objectSide = 'right';
    }
  }
  const objRatio = profNum('objectWidthRatio');
  const objW = objectSide === 'right' ? Math.round(innerW * Math.min(0.5, Math.max(0.24, objRatio ?? (strip ? 0.32 : 0.38)))) : 0;
  const objH = objectSide === 'bottom' ? Math.round(innerH * 0.33) : 0;
  const stripLogoCol = (strip && allowLogo && logoSrc && !tLogo && innerH >= 70) ? Math.round(innerW * 0.16) + 41 : 0;   // 로고 + 구분선 + 간격
  const textW = (objectSide === 'right' ? innerW - objW - Math.round(innerW * 0.04) : innerW) - stripLogoCol;
  const cornerTop = (tImage && !(tImage.y + tImage.h >= h - 1 && tImage.w >= w - 1) && tImage.y > 0) ? tImage.y + Math.round(tImage.h * 0.22) : null;
  const textH = objectSide === 'bottom' ? innerH - objH - 12 : (cornerTop != null && hasKv ? Math.max(40, cornerTop - pad.top) : innerH);

  /* ── 슬롯 유무 ── 정보는 규격이 작아져도 빼지 않는다(구글 28/28). */
  const pillDate = (D?.badgePresent?.value ?? 0) >= 0.5 || val(D?.badgeStyle) === 'pill';
  const subAbove = (D?.subAbove?.value ?? 0) >= 0.5;      // 자소설·캐치·GDN: 서브는 메인 위의 시즌 문구
  const useDetail = !!slots.detail && (!strip || innerH >= 200) && (ladder.details?.length > 0);
  const want = {
    sub: !!slots.sub && !!copy.sub, date: !!slots.date && !!copy.date && !useDetail, extra: !!slots.extra && !!copy.extra,
    label: !!slots.label && !!copy.label, cta: !!slots.cta && !!copy.cta, notice: !!slots.notice && !!copy.notice,
    detail: useDetail,
    advertiser: !!slots.advertiser && !!copy.advertiser && !(logoSrc && allowLogo),
  };

  /* ── 타이포 ── 메인은 절대 px에 가깝다(프로필 관찰 px) */
  const stated = statedFontSizes(rules, tScale);
  const th = rules.textHeightPx ?? null;
  const line = 1.3;
  const observedPx = profNum('mainPx');
  let titleMax = Math.min(72, Math.max(22, observedPx ? Math.round(observedPx * 1.15) : Math.round(S * 0.085)));
  if (strip) titleMax = Math.min(titleMax, Math.round(innerH * 0.5));
  titleMax = Math.max(14, Math.min(titleMax, Math.floor(textW / 5)));
  const capMain = th?.max != null ? Math.min(titleMax, th.max) : titleMax;
  const floorMain = th?.min != null ? Math.max(11, th.min) : 11;
  const obsLines = profNum('mainLines');
  const mainLinesCap = slots.main.lines ?? (obsLines ? Math.max(2, Math.round(obsLines) + (tall ? 2 : 1)) : null);
  const noticeLines = slots.notice?.lines ?? 2;
  copy.main = pickIn('main', textW, stated.main ?? capMain, mainLinesCap);
  for (const r of ['sub', 'date', 'extra', 'label']) copy[r] = pickIn(r, textW);

  // 상세 줄 — "라벨 : 값". 줄당 글자수가 좁으면(자소설 세로형 11자) 라벨 줄 + 값 줄로 쌓는다.
  const detailSlot = slots.detail ?? null;
  const detailFs = stated.detail ?? null;
  const detailLines = [];
  const detailW = (imgCorner && hasKv) ? Math.max(60, tImage.x - pad.left - 10) : textW;   // 이미지 옆으로 흐르는 구간의 폭
  if (want.detail) {
    const fsForWidth = detailFs ?? Math.round(capMain * 0.5);
    const perLine = Math.min(detailSlot.maxCharsPerLine ?? Infinity, Math.max(6, Math.floor(detailW / (fsForWidth * 0.98))));
    const cap = detailSlot.lines ?? 3;
    let used = 0;
    for (const d of ladder.details) {
      const inline = `${d.label} : ${d.value}`;
      const inlineOk = countChars(inline, counting) <= perLine;
      const needed = inlineOk ? 1 : 1 + estimateLines(d.value, perLine, counting);
      if (used + needed > cap) continue;
      detailLines.push({ label: d.label, value: d.value, inline: inlineOk, rows: needed });
      used += needed;
    }
  }

  const sizesAt = k => {
    const cap = Math.max(floorMain, Math.round(capMain * k));
    const subFs = stated.sub ?? Math.max(9, Math.round(capMain * (subAbove ? 0.62 : 0.5) * k));
    const smallFs = Math.max(8, Math.round(subFs * 0.88));
    const dFs = detailFs ?? Math.max(8, Math.round(cap * 0.5 * k));
    const noticeFs = Math.max(8, Math.round(subFs * 0.7));
    const ctaFs = Math.max(10, Math.round(cap * 0.5));
    const logoH = strip ? Math.min(22, Math.round(innerH * 0.5)) : Math.round(Math.min(40, Math.max(14, S * 0.07)) * k);
    return { cap, subFs, smallFs, dFs, noticeFs, ctaFs, logoH };
  };
  const pillPadV = fs => Math.round(fs * 0.38);
  const detailBlockH = z => detailLines.reduce((n, d) => n + d.rows, 0) * Math.round(z.dFs * 1.65) + (detailLines.length ? Math.round(z.cap * 0.9) : 0);
  const flexLogo = allowLogo && logoSrc && !tLogo && !(strip && innerH < 70);   // 50px 띠에는 로고 자리가 없다
  const blocksOf = z => (flexLogo && !strip ? z.logoH + Math.round(z.logoH * 0.7) : 0)
    + (want.advertiser ? Math.round(z.smallFs * 1.3) + 4 : 0)
    + (want.sub ? Math.round(z.subFs * line) + Math.round(z.subFs * 0.5) : 0)
    + ((want.date || want.label) ? Math.round(z.smallFs * line) + (pillDate ? pillPadV(z.smallFs) * 2 + 4 : 0) + 8 : 0)
    + ((imgCorner && hasKv) ? 0 : detailBlockH(z))
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
  const rePick = pickIn('main', textW, mainFs, mainLines);
  if (rePick !== copy.main) {
    copy.main = rePick;
    mainFs = stated.main ?? Math.floor(fitFontSize(copy.main, textW, titleBudget, z.cap, floorMain, line));
    mainLines = Math.max(1, Math.min(mainLinesCap ?? 99, Math.floor(titleBudget / (mainFs * line))));
  }
  const byWidth = (role, fs, width) => {
    const cands = ladder[role] ?? []; if (cands.length < 2) return;
    const slot = slots[role]; if (slot?.lines != null && slot.lines > 1) return;
    const charsOk = c => slot?.maxChars == null || countChars(c, counting) <= slot.maxChars;
    copy[role] = cands.find(c => charsOk(c) && textWidth(c) * fs <= width) ?? cands.find(charsOk) ?? cands[cands.length - 1];
  };
  byWidth('date', z.smallFs, (pillDate && want.label ? textW * 0.5 : textW) * 0.9);
  byWidth('label', z.smallFs, textW * 0.45);
  byWidth('sub', z.subFs, textW * 0.96);
  byWidth('extra', z.smallFs, textW * 0.96);
  const noticeFs = want.notice ? Math.max(8, Math.floor(fitFontSize(copy.notice, textW * 0.92, z.noticeFs * line * noticeLines, Math.min(z.noticeFs, Math.floor(innerW / 14)), 8, line))) : 0;

  /* ── 조각 ── */
  const clamp = n => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden`;
  const T = (role, text, fs, weight, color, extraCss = '', lines = 1) =>
    `<div data-field="${role}" style="font-size:${fs}px;line-height:${line};font-weight:${weight};color:${color};text-align:${align};${WRAP};${clamp(lines)};${extraCss}">${esc(text)}</div>`;
  const pill = (role, text, fs) =>
    `<span data-field="${role}" style="display:inline-block;font-size:${fs}px;line-height:${line};font-weight:600;color:${mainFg};border:1.5px solid ${mainFg};border-radius:999px;padding:${pillPadV(fs)}px ${Math.round(fs * 0.9)}px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">${esc(text)}</span>`;
  const ctaChip = () => `<span data-field="cta" style="display:inline-block;background:${mainFg};color:${fgIsDark ? '#FFFFFF' : p.primary};font-size:${z.ctaFs}px;line-height:${line};font-weight:700;padding:${Math.round(z.ctaFs * 0.6)}px ${Math.round(z.ctaFs * 1.1)}px;border-radius:6px;white-space:nowrap">${esc(copy.cta)}</span>`;
  // 상세 블록 — 한 요소로 묶어 검사기가 총 글자수·총 줄 수를 본다. 라벨은 굵게, 값은 가늘게(세아제강·한독).
  const detailBlock = () => detailLines.length
    ? `<div data-field="detail" style="font-size:${z.dFs}px;line-height:1.65;color:${detailFg};text-align:${align};margin-top:${Math.round(z.cap * 0.9)}px;${WRAP}">${detailLines.map(d =>
        d.inline ? `<div><b style="font-weight:700">${esc(d.label)}</b> : ${esc(d.value)}</div>` : `<div><b style="font-weight:700;display:block">${esc(d.label)}</b>${esc(d.value)}</div>`).join('')}</div>` : '';
  const logoImg = (hPx, maxW) => (allowLogo && logoSrc)
    ? `<img data-logo="1" src="${esc(logoSrc)}" alt="" style="display:block;height:${hPx}px;width:auto;max-width:${maxW}px;object-fit:contain;${logoFilter}"/>`
    : '';
  // 오브젝트 상자 — 썸네일형(둥근 상자, cover). 지면색으로 가장자리를 녹인다(현대모비스·한독). 먼저 쓴 층이 위에 칠해진다.
  const fade = (dir) => transparent ? '' : `linear-gradient(${dir},${fieldColor} 0%,rgba(0,0,0,0) 26%),`;
  const objectBox = (bw, bh, radius, dir = '180deg') => hasKv
    ? `<div data-object="1" style="flex:none;width:${bw}px;height:${bh}px;border-radius:${radius}px;background:${fade(dir)}url('${esc(style.keyVisual)}') center/cover no-repeat;overflow:hidden"></div>`
    : '';

  /* ── 로고 자리 ── 템플릿 칸이 있으면 그 칸에 정확히(contain, 가운데). 없으면 프로필 위치. */
  let logoPos = prof('logoPosition') ?? 'top-left';
  if (['right', 'inline-with-copy', 'left'].includes(logoPos)) logoPos = 'top-right';
  if (align === 'center' && logoPos.startsWith('top')) logoPos = 'top-center';
  const logoRowJustify = logoPos.endsWith('right') ? 'flex-end' : logoPos.endsWith('center') ? 'center' : 'flex-start';
  const logoAtBottom = logoPos.startsWith('bottom');
  const tplLogo = (allowLogo && logoSrc && tLogo)
    ? `<div data-logo-slot="1" style="position:absolute;left:${tLogo.x}px;top:${tLogo.y}px;width:${tLogo.w}px;height:${tLogo.h}px;display:flex;align-items:center;justify-content:${tpl?.logoHorizontal && !tpl?.logo ? 'flex-end' : 'center'}"><img data-logo="1" src="${esc(logoSrc)}" alt="" style="display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;${logoFilter}"/></div>`
    : '';
  const tplObject = (hasKv && tImage)
    ? (imgCorner
      // 우하단 상자는 일러스트를 담는 자리 — 잘라 채우지 않고 우하단에 맞춰 넣는다(위에 여백이 남아 메인이 그 위를 쓴다)
      ? `<div data-object="1" style="position:absolute;left:${tImage.x}px;top:${tImage.y}px;width:${tImage.w}px;height:${tImage.h}px;background:url('${esc(style.keyVisual)}') right bottom/contain no-repeat;overflow:hidden"></div>`
      : `<div data-object="1" style="position:absolute;left:${tImage.x}px;top:${tImage.y}px;width:${tImage.w}px;height:${tImage.h}px;background:${fade(imgLeftCol ? '270deg' : '180deg')}url('${esc(style.keyVisual)}') center/cover no-repeat;overflow:hidden"></div>`)
    : '';

  const metaRow = () => {
    const parts = [];
    if (want.date) parts.push(pillDate ? pill('date', copy.date, z.smallFs) : T('date', copy.date, z.smallFs, 600, subFg));
    if (want.label && pillDate) parts.push(pill('label', copy.label, z.smallFs));
    if (!parts.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:6px 8px;justify-content:${align === 'center' ? 'center' : 'flex-start'};margin-top:${Math.round(z.smallFs * 0.5)}px">${parts.join('')}</div>`;
  };

  if (strip) {
    const meta = [want.sub ? copy.sub : null, want.date ? copy.date : null].filter(Boolean).join('  ·  ');
    const lg = flexLogo ? logoImg(z.logoH, Math.round(innerW * 0.16)) : '';
    return `${open('flex-direction:row;align-items:center;gap:20px')}
${lg ? `<div style="flex:none;display:flex;align-items:center;gap:20px">${lg}<div style="width:1px;height:${Math.round(innerH * 0.7)}px;background:${mainFg};opacity:.25"></div></div>` : ''}
<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center">
${(want.sub && subAbove) ? T('sub', copy.sub, z.subFs, 700, subFg, `margin-bottom:${Math.round(z.subFs * 0.4)}px`) : ''}
${T('main', copy.main, mainFs, 800, mainFg, 'letter-spacing:-0.02em', mainLines)}
${(meta && !(want.sub && subAbove)) ? T(want.sub ? 'sub' : 'date', meta, z.subFs, 500, subFg, 'margin-top:3px') : (want.date && subAbove ? T('date', copy.date, z.smallFs, 600, subFg, 'margin-top:3px') : '')}
${want.detail ? detailBlock() : ''}
${want.notice ? T('notice', copy.notice, noticeFs, 400, subFg, 'margin-top:3px;opacity:.9') : ''}
</div>
${objectSide === 'right' ? objectBox(objW, Math.round(innerH * 0.92), Math.round(innerH * 0.16), '270deg') : ''}
${want.cta ? `<div style="flex:none">${ctaChip()}</div>` : ''}
${tplLogo}${tplObject}
</div>`;
  }

  /* ── 세로 스택 ── [로고] / (서브 위) / 메인 / (서브 아래) / [날짜·라벨 알약] / 상세 / 부가 / CTA / 고지 */
  const parts = [];
  const head = parts;                 // 로고·서브·메인·알약
  const tail = [];                    // 상세·부가·CTA·고지 (우하단 이미지 옆 열로 갈 수 있는 것들)
  const lg = flexLogo ? logoImg(z.logoH, Math.round(innerW * Math.min(0.42, Math.max(0.16, D?.logoSizeRatio ?? 0.3)))) : '';
  const logoRow = lg ? `<div style="flex:none;display:flex;justify-content:${logoRowJustify};height:${z.logoH}px;${logoAtBottom ? 'margin-top:auto;padding-top:8px' : `margin-bottom:${Math.round(z.logoH * 0.7)}px`}">${lg}</div>` : '';
  if (lg && !logoAtBottom) parts.push(logoRow);
  else if (want.advertiser) parts.push(T('advertiser', copy.advertiser, z.smallFs, 700, subFg, `letter-spacing:.08em;margin-bottom:${Math.round(z.smallFs * 0.5)}px`));
  if (want.sub && subAbove) parts.push(T('sub', copy.sub, z.subFs, 700, subFg, `margin-bottom:${Math.round(z.subFs * 0.55)}px`, Math.min(slots.sub.lines ?? 2, 2)));
  parts.push(T('main', copy.main, mainFs, 800, mainFg, 'letter-spacing:-0.02em', mainLines));
  if (want.sub && !subAbove) parts.push(T('sub', copy.sub, z.subFs, 500, subFg, 'margin-top:6px', Math.min(slots.sub.lines ?? 2, 2)));
  parts.push(metaRow());
  tail.push(detailBlock());
  if (want.extra) tail.push(T('extra', copy.extra, z.smallFs, 400, subFg, 'margin-top:6px', Math.min(slots.extra.lines ?? 1, 2)));
  if (want.cta) tail.push(`<div style="flex:none;margin-top:${Math.round(z.ctaFs * 0.6)}px;text-align:${align}">${ctaChip()}</div>`);
  if (want.notice) tail.push(T('notice', copy.notice, noticeFs, 400, subFg, `${logoAtBottom ? '' : 'margin-top:auto;'}padding-top:6px;opacity:.9`, noticeLines));
  if (lg && logoAtBottom) tail.push(logoRow);
  if (!(imgCorner && hasKv)) parts.push(...tail);

  // 우하단 이미지 상자 옆으로 글자가 흐르게: 텍스트 열을 블록으로 두고 이미지 자리에 float 스페이서를 세운다(세아제강 팝업 — 메인은 전폭, 상세는 이미지 왼쪽).
  // 우하단 이미지(자소설 팝업·M메인): 메인·서브는 일러스트 위를 전폭으로, 상세·부가는 일러스트 왼쪽 고정 폭 열에 (세아제강)
  const textCol = (imgCorner && hasKv)
    ? `<div style="position:relative;flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:${align === 'center' ? 'center' : 'stretch'}">${head.filter(Boolean).join('\n')}<div style="width:${detailW}px;max-width:100%">${tail.filter(Boolean).join('\n')}</div></div>`
    : `<div style="position:relative;flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:${tall && objectSide === 'none' ? 'center' : 'flex-start'};align-items:${align === 'center' ? 'center' : 'stretch'}">${parts.filter(Boolean).join('\n')}</div>`;

  if (objectSide === 'bottom') {
    return `${open('flex-direction:column;gap:12px')}
${textCol}
${objectBox(innerW, objH, 0, '180deg')}
</div>`;
  }
  return `${open('flex-direction:row;gap:' + Math.round(innerW * 0.04) + 'px;align-items:stretch')}
${textCol}${objectSide === 'right' ? objectBox(objW, innerH, Math.round(Math.min(18, innerH * 0.08)), '270deg') : ''}
${tplLogo}${tplObject}
</div>`;
}
