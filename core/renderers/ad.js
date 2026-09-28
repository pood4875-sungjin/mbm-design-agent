// 광고 소재 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
//
// 매체가 달라도 그리는 문법은 하나다. 다른 것은 spec.rules(매체 규격)와 spec.mediumRules(매체 공통 규칙)뿐이다:
//   치수 · 안전영역(숫자면 패딩으로) · 글자 슬롯(역할별 유무·줄 수·글자수) · 글자색(매체가 정하면 그대로) ·
//   글꼴(매체가 정하면 맨 앞) · 폰트 크기(매체가 정하면 그대로) · 배경(투명 규격이면 칠하지 않음)
//
// 문구는 "사다리"에서 고른다. 같은 정보를 긴 표현부터 짧은 표현까지 늘어놓고, 매체 글자수 한도에
// 들어가는 가장 긴 것을 쓴다(고객사+직무+채용 → 직무+채용 → 직무 → …). 정보를 지어내지 않고
// 있는 정보 중 고르는 것이라 불변식 ③(추측 금지)과 어긋나지 않는다.
//
// 모든 글자 요소에 data-field="<role>"을 심는다. 앱의 measure.js가 이 표식으로 줄 수·크기·색·상자를 재고,
// core/lint.js가 규칙과 비교한다. 렌더러는 규칙을 "지키려" 하지만 "검사"하지는 않는다.
//
// 절대배치 금지·로고는 flex 슬롯·글자는 지면 안에서 줄이기 — banner.js와 같은 원칙이다.

import { esc, WRAP, fitFontSize, fieldGradient } from './banner.js';
import { fontStack } from '../fonts.js';
import { fitKeyVisual } from '../palette.js';
import { limitsByRole, roleOf, countChars, estimateLines, inImage } from '../adfields.js';
import { textWidth } from './banner.js';

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
      label: uniq([c.employType]),
      url: uniq([c.applyUrl ? String(c.applyUrl).replace(/^https?:\/\//, '') : null]),
    };
  }
  return {
    main: uniq([c.name]), sub: uniq([c.venue]), date: uniq([c.date]), extra: uniq([c.audience]),
    advertiser: [], cta: uniq([c.cta]), notice: [], label: [], url: [],
  };
}

// 하위 호환 — 사다리의 첫 칸
export function copyFor(ctx) {
  const l = copyLadder(ctx);
  return Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v[0] ?? '']));
}

// 매체가 정한 폰트 크기 — 필드 이름을 역할로 바꿔 찾는다 (자소설: 메인문구 35 / 서브문구 22 / 상세문구 17)
function statedFontSizes(rules) {
  const out = {};
  for (const [k, v] of Object.entries(rules?.fontSizes ?? {})) {
    if (typeof v !== 'number') continue;
    const role = roleOf(k);
    if (role !== 'other' && out[role] == null) out[role] = v;
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

export function renderAd(ctx, style, spec) {
  const rules = spec.rules ?? {};
  const mr = spec.mediumRules ?? {};
  const p = style.palette;
  const { w, h } = spec;
  const ladder = copyLadder(ctx);
  const counting = mr.textCounting ?? 'all-1';

  // ── 슬롯: 매체 글자수 표에 있는 역할만 그린다. 표가 없으면 메인·서브 두 슬롯이 기본.
  const inLimits = (rules.textLimits ?? []).filter(inImage);
  const by = limitsByRole(inLimits);
  const slots = Object.keys(by).length ? by : { main: { lines: null, maxChars: null }, sub: { lines: null, maxChars: null } };
  // 로고 전용 규격(브랜드 로고 96×96, 프로필 300×300…)은 글자 소재가 아니다 — 이미지 안 글자 슬롯이 없다
  const logoOnly = /로고|프로필/.test(rules.name ?? '') && !inLimits.length;
  if (!logoOnly && !slots.main) slots.main = { lines: null, maxChars: null };

  // 사다리에서 한도에 들어가는 가장 긴 문구를 고른다. 아무것도 안 들어가면 가장 짧은 것(검사기가 잡는다).
  const statedEarly = statedFontSizes(rules);
  const pickIn = (role, widthPx) => {
    const cands = ladder[role] ?? [];
    if (!cands.length) return '';
    const slot = slots[role];
    let perLine = slot?.maxCharsPerLine ?? null;
    // 매체가 폰트 크기를 정했으면 글자수 표보다 실제 폭이 더 좁을 수 있다 — 둘 중 작은 쪽
    const fs = statedEarly[role];
    if (fs && widthPx) perLine = Math.min(perLine ?? Infinity, Math.max(1, Math.floor(widthPx / (fs * 0.98))));
    const fits = c => (slot?.maxChars == null || countChars(c, counting) <= slot.maxChars)
      && (slot?.lines == null || perLine == null || !Number.isFinite(perLine) || estimateLines(c, perLine, counting) <= slot.lines);
    return cands.find(fits) ?? cands[cands.length - 1];
  };
  let copy = Object.fromEntries(Object.keys(ladder).map(r => [r, pickIn(r, null)]));

  // ── 배경: 투명 규격이면 칠하지 않는다. 아니면 키비주얼 / 주색 그라데이션 / (용량이 빡빡하면) 단색.
  const bgText = String(rules.background ?? '');
  const transparent = /투명/.test(bgText) && !/투명.{0,12}?(불가|금지)/.test(bgText);
  const S = Math.sqrt(w * h);
  let bg = '';
  if (!transparent) {
    if (style.keyVisual && !spec.flat) {
      const fit = fitKeyVisual(w / h, style.kvMeta?.ar, style.kvMeta?.edge ?? p.primary);
      bg = fit.mode === 'contain'
        ? `background:${fit.bg};background-image:url('${esc(style.keyVisual)}'),${fit.bg};background-size:contain,cover;background-position:${fit.wide ? 'right center' : 'center bottom'},center;background-repeat:no-repeat,no-repeat;`
        : `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat;`;
    } else if (spec.flat) {
      bg = `background:${p.primary};`;
    } else {
      bg = `background:${fieldGradient(p.primary)};`;
    }
  }

  // ── 글자색: 규격이 정하면 그대로(카카오·NAP 비즈보드 — 매체 단위 값은 참고 메모라 쓰지 않는다), 아니면 지면 위 순흑/순백.
  const tc = rules.textColors ?? {};
  const onField = transparent ? '#000000' : (style.kvReadability?.banner?.text ?? p.onPrimary);
  const mainFg = tc.main ?? onField;
  const subFg = tc.sub?.[0] ?? (tc.main ? tc.main : (mainFg === '#FFFFFF' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.62)'));
  const fgIsDark = mainFg !== '#FFFFFF';

  // ── 글꼴: 매체가 요구하면 맨 앞에. (style 속성 안이라 작은따옴표)
  const required = mr.fonts?.required;
  const family = required ? `'${required}', ${fontStack(style.fonts.heading)}` : fontStack(style.fonts.heading);

  // ── 안전영역 → 패딩. 숫자가 없으면 지면 크기에 비례한 기본값(8pt 그리드).
  const strip = !logoOnly && (h < 120 || w / h > 3.2);
  const tall = h / w > 1.6;
  const basePad = strip ? Math.min(16, Math.round(h * 0.15)) : (S >= 280 ? 24 : 16);
  const pad = safePad(rules, basePad);
  // 매체 템플릿에서 잰 문구 칸·이미지 영역(확인필요 표시된 실측)이 있으면 그 자리를 그대로 쓴다 — 우리 기본 패딩보다 낫다
  const tpl = rules.safeArea?.measuredFromTemplate;
  if (!pad.stated && tpl?.textColumn?.w) {
    pad.left = Math.round(tpl.textColumn.x); pad.right = Math.max(0, Math.round(w - tpl.textColumn.x - tpl.textColumn.w));
  }
  if (!pad.stated && tpl?.image && tpl.image.y + tpl.image.h >= h - 1 && tpl.image.w >= w - 1) {
    pad.bottom = Math.max(pad.bottom, Math.round(h - tpl.image.y) + 8);   // 이미지가 하단 띠면 글자는 그 위에서 끝난다
  }
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const shell = `position:relative;width:${w}px;height:${h}px;${bg}overflow:hidden;font-family:${family};color:${mainFg};box-sizing:border-box;display:flex;padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`;
  const open = (extra = '') => `<div data-ad="1" data-spec="${esc(spec.id ?? '')}" data-transparent="${transparent ? 1 : 0}" style="${shell};${extra}">`;

  const logoImg = (hPx, maxW) => style.logo
    ? `<img data-logo="1" src="${esc(style.logo)}" alt="" style="display:block;height:${hPx}px;width:auto;max-width:${maxW}px;object-fit:contain;object-position:left center;${fgIsDark ? '' : 'filter:brightness(0) invert(1)'}"/>`
    : '';

  // ── 로고 전용 규격: 로고를 가운데에, 없으면 광고주명을 워드마크처럼.
  if (logoOnly) {
    const side = Math.min(innerW, innerH);
    const mark = style.logo
      ? `<img data-logo="1" src="${esc(style.logo)}" alt="" style="display:block;height:${Math.round(side * 0.6)}px;width:auto;max-width:${Math.round(innerW * 0.86)}px;object-fit:contain;${fgIsDark ? '' : 'filter:brightness(0) invert(1)'}"/>`
      : (() => {
          // 워드마크는 한 줄이다 — 낱말 중간에서 꺾이면 이름이 깨진다. 폭에 맞춰 크기를 줄이고 줄바꿈은 막는다.
          const t = copy.advertiser || copy.main;
          // 한 줄 고정이라 fitFontSize(여러 줄 허용)가 아니라 폭 ÷ 글자 폭으로 직접 잰다
          const fs = Math.max(8, Math.floor(Math.min(side * 0.22, (innerW * 0.86) / Math.max(1, textWidth(t)))));
          return `<div data-field="advertiser" style="font-size:${fs}px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${mainFg};text-align:center;white-space:nowrap">${esc(t)}</div>`; })();
    return `${open('align-items:center;justify-content:center')}${mark}</div>`;
  }

  // ── 타이포: 매체가 크기를 정했으면 그대로, 아니면 지면 크기에 비례해 잡고 예산 안에서 줄인다.
  const stated = statedFontSizes(rules);
  const th = rules.textHeightPx ?? null;
  const line = 1.22;
  const titleMax = Math.min(96, Math.max(13, Math.round(S * 0.085)));
  const capMain = th?.max != null ? Math.min(titleMax, th.max) : titleMax;
  const floorMain = th?.min != null ? Math.max(11, th.min) : 11;

  const want = {
    sub: !!slots.sub && !!copy.sub, date: !!slots.date && !!copy.date, extra: !!slots.extra && !!copy.extra,
    cta: !!slots.cta && !!copy.cta, notice: !!slots.notice && !!copy.notice,
    advertiser: !!slots.advertiser && !!copy.advertiser && !style.logo,
  };
  const objectSide = !strip && !transparent && !!style.keyVisual && !tall && innerW >= 300;
  const textW = strip ? innerW - (style.logo ? Math.round(innerW * 0.16) + 24 : 0) - (want.cta ? Math.round(innerW * 0.14) : 0)
    : (objectSide ? Math.round(innerW * 0.62) : innerW);
  for (const r of ['main', 'sub', 'date', 'extra']) copy[r] = pickIn(r, textW);

  // 크기 세트 — k는 전체 축소 비율. 블록 합이 안쪽 높이를 넘으면 k를 줄여 한 번 더 잰다.
  const sizesAt = k => {
    const cap = Math.max(floorMain, Math.round(capMain * k));
    const subFs = Math.max(9, Math.round((stated.sub ?? Math.round(capMain * 0.5)) * k));
    const smallFs = Math.max(8, Math.round(subFs * 0.85));
    const noticeFs = Math.max(8, Math.round(subFs * 0.7));
    const ctaFs = Math.max(10, Math.round(cap * 0.5));
    const logoH = strip ? Math.min(20, Math.round(innerH * 0.5)) : Math.round(Math.min(32, Math.max(14, S * 0.075)) * k);
    return { cap, subFs, smallFs, noticeFs, ctaFs, logoH };
  };
  const blocksOf = z => (style.logo && !strip ? z.logoH + Math.round(z.logoH * 0.7) : 0)
    + (want.sub ? Math.round(z.subFs * line) + 6 : 0)
    + (want.date ? Math.round(z.smallFs * line) + 4 : 0)
    + (want.extra ? Math.round(z.smallFs * line) + 4 : 0)
    + (want.notice ? Math.round(z.noticeFs * 1.3) + 6 : 0)
    + (want.cta && !strip ? Math.round(z.ctaFs * 1.3) + Math.round(z.ctaFs * 0.6) * 2 + 8 : 0)
    + (want.advertiser ? Math.round(z.smallFs * 1.3) + 4 : 0);

  let z = sizesAt(1);
  let titleBudget = innerH - blocksOf(z);
  if (titleBudget < z.cap * line) {
    // 다른 블록만으로 넘친다 — 전부 같은 비율로 줄인다(위계는 유지)
    const k = Math.max(0.35, (innerH - z.cap * line) / Math.max(1, blocksOf(z)));
    z = sizesAt(k);
    titleBudget = innerH - blocksOf(z);
  }
  titleBudget = Math.max(floorMain * line, titleBudget);
  const mainLinesCap = slots.main.lines ?? null;
  let mainFs = stated.main ?? Math.floor(fitFontSize(copy.main, textW, titleBudget, z.cap, floorMain, line));
  if (stated.main && mainLinesCap) {
    // 매체가 크기를 정했으면 크기는 못 건드린다 — 대신 사다리가 짧은 문구를 고른다(위에서). 줄 수만 지킨다.
  }
  const mainLines = Math.max(1, Math.min(mainLinesCap ?? 99, Math.floor(titleBudget / (mainFs * line))));
  // 고지문은 잘리면 안 된다(법정 문구) — 한 줄 폭에 맞춰 줄인다
  // 한 줄짜리 슬롯은 글자수 규정이 없어도 폭을 넘기면 잘린다 — 크기가 정해졌으니 폭에 들어가는 가장 긴 문구로 다시 고른다
  const byWidth = (role, fs) => {
    const cands = ladder[role] ?? []; if (cands.length < 2) return;
    const slot = slots[role]; if (slot?.lines != null && slot.lines > 1) return;
    // 글자수 한도는 그대로 지키고, 그 안에서 폭까지 들어가는 가장 긴 것
    const charsOk = c => slot?.maxChars == null || countChars(c, counting) <= slot.maxChars;
    copy[role] = cands.find(c => charsOk(c) && textWidth(c) * fs <= textW * 0.96) ?? cands.find(charsOk) ?? cands[cands.length - 1];
  };
  byWidth('date', z.smallFs); if (!strip) byWidth('sub', z.subFs);
  const noticeFs = want.notice ? Math.max(8, Math.floor(fitFontSize(copy.notice, textW, z.noticeFs * line * (slots.notice.lines ?? 1), z.noticeFs, 8, line))) : 0;

  const clamp = n => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden`;
  const T = (role, text, fs, weight, color, extraCss = '', lines = 1) =>
    `<div data-field="${role}" style="font-size:${fs}px;line-height:${line};font-weight:${weight};color:${color};${WRAP};${clamp(lines)};${extraCss}">${esc(text)}</div>`;
  const ctaChip = () => `<span data-field="cta" style="display:inline-block;background:${mainFg};color:${fgIsDark ? '#FFFFFF' : p.primary};font-size:${z.ctaFs}px;line-height:${line};font-weight:700;padding:${Math.round(z.ctaFs * 0.6)}px ${Math.round(z.ctaFs * 1.1)}px;border-radius:6px;white-space:nowrap">${esc(copy.cta)}</span>`;

  if (strip) {
    // 가로 띠 — [로고] | [메인 / 서브·일자 / 고지] | [CTA]. 세로로 쌓을 높이가 없다.
    const meta = [want.sub ? copy.sub : null, want.date ? copy.date : null].filter(Boolean).join('  ·  ');
    const lg = logoImg(z.logoH, Math.round(innerW * 0.16));
    return `${open('flex-direction:row;align-items:center;gap:24px')}
${lg ? `<div style="flex:none;display:flex;align-items:center;gap:24px">${lg}<div style="width:1px;height:${Math.round(innerH * 0.7)}px;background:${mainFg};opacity:.25"></div></div>` : ''}
<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center">
${T('main', copy.main, mainFs, 800, mainFg, 'letter-spacing:-0.015em', mainLines)}
${meta ? T(want.sub ? 'sub' : 'date', meta, z.subFs, 500, subFg, 'margin-top:3px') : ''}
${want.notice ? T('notice', copy.notice, noticeFs, 400, subFg, 'margin-top:3px;opacity:.9') : ''}
</div>
${want.cta ? `<div style="flex:none">${ctaChip()}</div>` : ''}
</div>`;
  }

  // 세로 스택 — [로고 슬롯] / [메인 → 서브 → 일자 → 부가] / [CTA] / [고지]
  const parts = [];
  const lg = logoImg(z.logoH, Math.round(innerW * 0.4));
  if (lg) parts.push(`<div style="flex:none;height:${z.logoH}px;margin-bottom:${Math.round(z.logoH * 0.7)}px">${lg}</div>`);
  else if (want.advertiser) parts.push(T('advertiser', copy.advertiser, z.smallFs, 700, subFg, `letter-spacing:.08em;margin-bottom:${Math.round(z.smallFs * 0.5)}px`));
  parts.push(T('main', copy.main, mainFs, 800, mainFg, 'letter-spacing:-0.015em', mainLines));
  if (want.sub) parts.push(T('sub', copy.sub, z.subFs, 500, subFg, 'margin-top:6px', Math.min(slots.sub.lines ?? 2, 2)));
  if (want.date) parts.push(T('date', copy.date, z.smallFs, 600, subFg, 'margin-top:4px'));
  if (want.extra) parts.push(T('extra', copy.extra, z.smallFs, 400, subFg, 'margin-top:4px', Math.min(slots.extra.lines ?? 1, 2)));
  if (want.cta) parts.push(`<div style="flex:none;margin-top:${Math.round(z.ctaFs * 0.6)}px">${ctaChip()}</div>`);
  if (want.notice) parts.push(T('notice', copy.notice, noticeFs, 400, subFg, 'margin-top:auto;padding-top:6px;opacity:.9', slots.notice.lines ?? 1));

  const textCol = `<div style="flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:${tall ? 'center' : 'flex-start'}">${parts.join('\n')}</div>`;
  // 오브젝트 자리는 비워 둔다 — 키비주얼은 배경으로 깔리고, 글자는 왼쪽 62%만 쓴다.
  const objectCol = objectSide ? `<div data-object="1" style="flex:none;width:${innerW - textW}px"></div>` : '';
  return `${open('flex-direction:row;gap:0')}
${textCol}${objectCol}
</div>`;
}
