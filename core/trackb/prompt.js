// B 트랙 — 고정 조건(buildFixed)과 Claude 에게 줄 프롬프트(buildPrompt).
//   고정 조건은 매체 JSON(core/media/*.json → SPECS[id].rules / mediumRules)에서만 읽는다. 여기 없는 수치는 지어내지 않는다.
//   문구는 A 트랙과 같은 사다리(core/renderers/ad.js copyFor)에서 가져온다 — 두 트랙이 같은 글을 받아야 비교가 된다.
//   순수 함수. SPECS 는 호출자가 registerAll() 뒤 넘긴다.

import { FONTS, DEFAULT_FONT, fontRuleOf, effectiveFontId } from '../fonts.js';
import { copyFor } from '../renderers/ad.js';
import { ROLE_LABEL } from './schema.js';

const n = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;

// 안전영역 — 매체 수치가 있으면 그것, 없으면 권장 여백(짧은 변 4% — 가이드 규칙 place.margin 과 같은 값)
export function safeAreaOf(spec) {
  const sa = spec.rules?.safeArea ?? {};
  const vals = ['top', 'right', 'bottom', 'left'].map(k => n(sa[k]));
  if (vals.some(v => v != null)) return { top: vals[0] ?? 0, right: vals[1] ?? 0, bottom: vals[2] ?? 0, left: vals[3] ?? 0, source: sa.source ?? '매체 규정', note: sa.note ?? '' };
  const m = Math.round(Math.min(spec.w, spec.h) * 0.04);
  return { top: m, right: m, bottom: m, left: m, source: '권장 여백(짧은 변 4%) — 매체 수치 없음', note: '' };
}

// 글자 크기 규정 — textLimits 중 fontSizeRange 가 있는 항목(카카오 「이미지 내 텍스트 48~164px」)
function fontSizeRuleOf(spec) {
  const tl = (spec.rules?.textLimits ?? []).find(t => t.fontSizeRange && (n(t.fontSizeRange.min) != null || n(t.fontSizeRange.max) != null));
  if (!tl) return { min: null, max: null, lines: null, note: null, noticeMin: null };
  const noticeMin = /24px/.test(tl.note ?? '') ? 24 : null;   // '심의필·저작권 등 필수 문구는 24px 이상 권장'
  return { min: n(tl.fontSizeRange.min), max: n(tl.fontSizeRange.max), lines: n(tl.lines), note: tl.note ?? null, noticeMin };
}

// 고정 조건 — AI 가 못 바꾸는 것. 검증(schema.js validateLayout)과 프롬프트가 같은 객체를 본다.
export function buildFixed(spec, { ctx, fontId = DEFAULT_FONT, kvMeta = null, logoMeta = null, hasKv = true, hasLogo = false } = {}) {
  const safe = safeAreaOf(spec);
  const fs = fontSizeRuleOf(spec);
  const rule = fontRuleOf(spec.mediumRules, spec.rules);
  const fid = effectiveFontId(spec.mediumRules, FONTS[fontId] ? fontId : DEFAULT_FONT, spec.rules);
  const F = FONTS[fid] ?? FONTS[DEFAULT_FONT];
  const copy = copyFor(ctx);
  const core = ctx.core ?? {};
  const required = [];
  if (copy.advertiser) required.push({ role: 'main', text: copy.advertiser, verbatim: false, why: '고객사 이름' });
  if (copy.date) required.push({ role: 'period', text: copy.date, verbatim: false, why: '접수 기간(브리프 그대로)' });
  if (core.notice) required.push({ role: 'notice', text: String(core.notice).trim(), verbatim: true, why: '필수 고지 문구 — 토씨 하나 못 바꿈' });
  return {
    specId: spec.id, w: spec.w, h: spec.h,
    safe,
    fontSize: { min: fs.min ?? Math.round(Math.min(spec.w, spec.h) * 0.03), max: fs.max ?? Math.round(spec.h * 0.4), source: fs.min != null ? '매체 규정' : '권장(짧은 변 3% ~ 높이 40%)' },
    noticeMin: fs.noticeMin ?? (fs.min != null ? fs.min : Math.round(Math.min(spec.w, spec.h) * 0.03)),
    maxLines: fs.lines,
    textLimitNote: fs.note,
    font: { id: fid, family: F.family, stack: F.stack, fixed: rule.fixed, required: rule.required, note: rule.note ?? null },
    weights: F.weights ?? [400, 700],
    requiredTexts: required,
    hasKv, hasLogo,
    kvAr: n(kvMeta?.ar), kvPx: Array.isArray(kvMeta?.px) ? kvMeta.px : null,
    logoAr: n(logoMeta?.ar) ?? (Array.isArray(logoMeta?.px) && logoMeta.px[1] ? logoMeta.px[0] / logoMeta.px[1] : null),
    background: spec.rules?.background ?? null,
    maxKB: spec.maxKB ?? null,
    copy,
  };
}

export const SYSTEM_PROMPT = `너는 채용 광고 소재를 만드는 아트디렉터다. 키비주얼·로고 이미지와 광고 문구, 고객사 요구, 브랜드 색, 매체 규격을 받아 한 장의 광고 레이아웃을 JSON 으로 설계한다. 기존 템플릿을 고르는 것이 아니라, 허용 범위 안에서 이 그림과 이 문구에 맞는 새 배치를 만든다.

네가 판단하는 것: 정보의 우선순위, 글자 크기·굵기·색·줄바꿈·위치·정렬, 키비주얼의 크기·위치·어느 부분을 보일지(crop)·한 변 녹임(fade), 배경색·그라데이션·도형 같은 그래픽 구성.
네가 못 바꾸는 것(고정 조건으로 따로 준다): 캔버스 크기, 안전영역, 필수 문구, 지정 폰트(JSON 에 폰트는 없다 — 렌더러가 박는다), 로고 원본 비율, 글자 크기 범위.

좌표는 캔버스 왼쪽 위 (0,0) 기준 px. 글자 상자는 x·y·w 만 주고 높이는 글이 정한다. 줄바꿈은 \\n. 글은 준 문구를 그대로 쓰되 줄바꿈과 역할 배분만 네가 정한다 — 문구를 지어내거나 바꾸지 않는다.
키비주얼의 주인공(인물·사물) 위에 글자를 올리지 않는다. 글자와 그 아래 배경의 대비를 확보한다. 로고는 가려지지 않게. 브랜드 색은 강조·배경에 쓰되 키비주얼과 어울리게 고른다. 글자 역할마다 한 색, 전체 글자색은 2가지 이내.
배경은 코드로 그릴 수 있는 것만(단색·그라데이션·사각/원 도형·블러). 그림을 새로 만들라고 하지 않는다.
rationale 에는 왜 이렇게 놓았는지 한두 문장(한국어).`;

export function buildPrompt(fixed, { brief = {}, brand = {}, requests = '', kvMeta = null, logoMeta = null, kvTypeSummary = null } = {}) {
  const lines = [];
  lines.push(`## 매체 규격 (고정)`);
  lines.push(`- 규격: ${fixed.specId} · 캔버스 ${fixed.w}×${fixed.h}px`);
  lines.push(`- 안전영역: 위 ${fixed.safe.top} · 오른쪽 ${fixed.safe.right} · 아래 ${fixed.safe.bottom} · 왼쪽 ${fixed.safe.left}px (${fixed.safe.source})${fixed.safe.note ? ` — ${fixed.safe.note}` : ''}. 글자·로고는 이 안에만. 키비주얼은 지면 끝까지 닿아도 된다.`);
  lines.push(`- 글자 크기: ${fixed.fontSize.min}~${fixed.fontSize.max}px (${fixed.fontSize.source})${fixed.maxLines ? ` · 이미지 내 글줄 ${fixed.maxLines}줄 이하 권장` : ''}${fixed.textLimitNote ? ` · 규정: ${fixed.textLimitNote}` : ''}`);
  lines.push(`- 고지 문구 최소 ${fixed.noticeMin}px`);
  lines.push(`- 폰트: ${fixed.font.family}${fixed.font.fixed ? ` (매체 지정 — 못 바꿈)` : ' (캠페인 선택)'} · 쓸 수 있는 굵기 ${fixed.weights.join('/')}`);
  if (fixed.background) lines.push(`- 배경 규정: ${fixed.background}`);
  if (fixed.maxKB) lines.push(`- 파일 용량 ${fixed.maxKB}KB 이하 (과한 그라데이션·블러는 용량을 키운다)`);
  lines.push('');
  lines.push(`## 그림`);
  if (fixed.hasKv) lines.push(`- 키비주얼(첫 번째 이미지): 원본 ${fixed.kvPx ? `${fixed.kvPx[0]}×${fixed.kvPx[1]}px` : ''} 비율 ${fixed.kvAr ? fixed.kvAr.toFixed(3) : '?'}${kvTypeSummary ? ` · 유형 ${kvTypeSummary}` : ''}${kvMeta?.colors?.length ? ` · 대표색 ${kvMeta.colors.join(' ')}` : ''}${kvMeta?.edge ? ` · 가장자리색 ${kvMeta.edge}` : ''}. 왜곡 없이 crop 으로 보일 부분을 정한다 — crop 은 원본 픽셀 기준 {x,y,w,h}(0 ≤ x+w ≤ 원본 가로, 0 ≤ y+h ≤ 원본 세로). 보이는 부분의 비율은 상자 비율로 맞춰진다.`);
  else lines.push(`- 키비주얼 없음 — 글자와 배경 그래픽만으로 구성`);
  if (fixed.hasLogo) lines.push(`- 로고(${fixed.hasKv ? '두 번째' : '첫 번째'} 이미지): 비율 ${fixed.logoAr ? fixed.logoAr.toFixed(3) : '?'}${logoMeta?.tone ? ` · 톤 ${logoMeta.tone === 'light' ? '흰색(밝은 로고 — 어두운 바탕 필요)' : '어두운/유색'}` : ''}. 원본 비율 그대로, 전체(crop 은 원본 전체), 안전영역 안.`);
  else lines.push(`- 로고 없음 — 로고 층을 만들지 않는다`);
  lines.push('');
  lines.push(`## 광고 문구 (이 글만 쓴다 — 역할별)`);
  const c = fixed.copy ?? {};
  const pairs = [['season', brief.season], ['main', c.main], ['period', c.date ? `${c.label ?? '접수기간'} ${c.date}` : ''], ['role', brief.role ? `모집직무 ${brief.role}` : ''], ['slogan', brief.slogan], ['notice', brief.notice], ['cta', c.cta]];
  for (const [role, text] of pairs) if (text && String(text).trim()) lines.push(`- ${role}(${ROLE_LABEL[role]}): ${String(text).trim()}`);
  lines.push(`- 메인 문구 다른 길이: 「${c.mainWide ?? ''}」 / 「${c.main ?? ''}」 / 「${c.mainNarrow ?? ''}」 — 이 중 하나를 쓴다. 고객사 이름 「${c.advertiser ?? brief.client ?? ''}」은 반드시 보인다.`);
  if (c.date) lines.push(`- 접수 기간은 「${c.date}」 표기 그대로(라벨 「${c.label ?? '접수기간'}」은 붙여도 되고 빼도 된다).`);
  if (fixed.requiredTexts.some(r => r.role === 'notice')) lines.push(`- 고지 문구는 토씨 하나 바꾸지 않고 그대로, 작게.`);
  lines.push('');
  lines.push(`## 브랜드`);
  const cols = [brand.primary, brand.accent, ...(brand.colors ?? [])].filter(Boolean);
  lines.push(`- 브랜드 색: ${cols.length ? cols.join(' ') : '없음(키비주얼에서 고른다)'}`);
  lines.push(`- 고객사 요구: ${requests?.trim() ? requests.trim() : '없음'}`);
  lines.push('');
  lines.push(`위 조건으로 ${fixed.w}×${fixed.h} 광고 한 장의 레이아웃 JSON 을 만들어라. 글자 역할은 필요한 것만(메인·접수 기간은 꼭). 고정 조건을 어기면 서버가 고치거나 다시 묻는다.`);
  return lines.join('\n');
}

// 두 번째 요청 — 검증이 돌려준 retry 사유를 붙여 같은 대화에서 고쳐 달라고 한다
export function retryPrompt(reasons = []) {
  return `방금 레이아웃에서 고정 조건 위반이 있다. 아래를 고쳐 전체 JSON 을 다시 내라(다른 부분은 유지):\n${reasons.map(r => `- ${r}`).join('\n')}`;
}
