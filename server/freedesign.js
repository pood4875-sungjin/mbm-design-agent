// 자유 디자인(freedesign) — Claude 가 규격·가이드 안에서 배경(그라데이션·도형·블러·패턴·스크림·KV 합성)과 타이포를 HTML/CSS/SVG 로 직접 설계한다.
//   픽셀 그림 생성은 아니다. 출력 HTML 은 A/B 트랙과 같은 표식(data-ad · data-field · data-object · data-logo)을 달아 기존 검수기(core/lint.js · app/measure.js)가 그대로 잰다.
//   엔진 두 가지:
//     claude-code : 헤드리스 Claude Code(`claude -p … --output-format json`) — 사용자 로그인 계정(구독), API 키 없음. 그림은 임시 파일로 써서 「Read 로 보라」(imageMode:'read', 기본)
//                   또는 `--input-format stream-json` 으로 이미지 블록을 직접 넣는다(imageMode:'stream').
//     api         : server/design.js makeClient 와 같은 Anthropic SDK 호출(키 있을 때).
//   계약(앱과 공유 — 바꾸지 말 것):
//     입력 { specId, brief, kv:{dataUrl, meta}, logo:{dataUrl, tone}|null, brand, rules:{w,h,exportScale,safeArea,textLimits,fonts:{allowed,required},logo,background,textColors,mold,notes}, history, prev:{html}|null, engine, n }
//     출력 { html, notes, engine, model, ms, usage? }
//   프롬프트에는 dataURL 을 넣지 않는다 — 모델은 {{KV}}·{{LOGO}} 자리표시를 쓰고 서버가 치환한다(substituteAssets). 글자 자리표시({main} 등)는 금지.

import { spawn, execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SPECS } from '../core/contract.js';
import { registerAll } from '../core/generate.js';
import { createContext } from '../core/context.js';
import { copyFor } from '../core/renderers/ad.js';
import { limitsByRole, inImage, countChars } from '../core/adfields.js';
import { FONTS, DEFAULT_FONT, fontIds, isBundledFont, fontRuleOf, effectiveFontId } from '../core/fonts.js';
import { safeAreaOf } from '../core/trackb/prompt.js';
import { TEMPLATE_NORMS } from '../core/template-norms.js';

registerAll();

// 취향 규칙(docs/freedesign-rules.md — 11-05 사용자 「AI 티」 금지). 프롬프트에 그대로 넣고(loadFreeRules) 검증(aiTellIssues)에서도 거른다.
export const RULES_DOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/freedesign-rules.md');
let _rulesDoc = null;
export function loadFreeRules({ force = false } = {}) {
  if (_rulesDoc != null && !force) return _rulesDoc;
  _rulesDoc = existsSync(RULES_DOC) ? readFileSync(RULES_DOC, 'utf8').trim() : '';
  return _rulesDoc;
}
// 「AI 티」 검출 — 응답 HTML 의 style 안에서만 본다. 하나라도 있으면 1회 재요청(사유 명시)
export const AI_TELLS = [   // 11-05 사용자: 취향 규칙은 자간·장평 둘뿐(나머지 금지는 「디자인이 다채롭지 못하다」로 폐기)
  { code: 'tracking', re: /letter-spacing\s*:\s*(?:0*\.?0*[1-9]|[1-9])[\d.]*(?:em|px|rem|%)/i, why: '양의 letter-spacing 금지 — 자간은 0 또는 음수만' },
  { code: 'stretch', re: /transform\s*:[^;"]*scale[XY]?\(|font-stretch\s*:\s*(?!normal)/i, why: '장평(transform scaleX/Y · font-stretch) 금지' },
];
export function aiTellIssues(html) {
  const h = String(html ?? '');
  return AI_TELLS.filter(t => t.re.test(h)).map(t => `AI 티 위반: ${t.why}`);
}

export const FIELD_ROLES = ['main', 'sub', 'date', 'detail', 'notice'];
export const KV_PLACEHOLDER = '{{KV}}';
export const LOGO_PLACEHOLDER = '{{LOGO}}';
export const DEFAULT_CC_MODEL = process.env.FREEDESIGN_CC_MODEL ?? null;   // null = 로그인 계정의 기본 모델
export const DEFAULT_API_MODEL = 'claude-sonnet-5-5';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── 규격 → 계약의 rules 블록(앱이 만드는 것과 같은 모양). 스크립트·테스트가 쓴다. 앱이 rules 를 주면 그걸 그대로 쓴다.
export function rulesForSpec(specId, { fontId = DEFAULT_FONT } = {}) {
  const spec = SPECS[specId]; if (!spec || spec.channel !== 'ad') throw new Error(`알 수 없는 광고 규격: ${specId}`);
  const r = spec.rules ?? {}; const m = spec.mediumRules ?? {};
  const safe = safeAreaOf(spec);
  const fr = fontRuleOf(m, r);
  const allowed = fr.fixed && fr.requiredId ? [FONTS[fr.requiredId].family] : fontIds().filter(isBundledFont).map(id => FONTS[id].family);
  const eff = effectiveFontId(m, fontId, r);
  const by = limitsByRole((r.textLimits ?? []).filter(inImage));
  const textLimits = Object.entries(by).filter(([role]) => FIELD_ROLES.includes(role)).map(([role, s]) => ({ role, maxChars: s.maxChars, lines: s.lines, fields: s.fields }));
  const mold = r.safeArea?.measuredFromTemplate?.mold ? { source: String(r.safeArea.measuredFromTemplate.mold.source ?? '').slice(0, 200), note: String(r.safeArea.measuredFromTemplate.mold.note ?? '').slice(0, 600) } : null;
  const notes = [];
  if (r.safeArea?.note) notes.push(`안전영역 메모: ${r.safeArea.note}`);
  for (const n of r.layoutNotes ?? []) notes.push(typeof n === 'string' ? n : (n.note ?? n.text ?? JSON.stringify(n)));
  if (m.fonts?.note) notes.push(`글꼴 메모: ${m.fonts.note}`);
  if (r.logo?.note) notes.push(`로고 메모: ${r.logo.note}`);
  if (r.textHeightPx) notes.push(`글자 높이 규정 ${r.textHeightPx.min ?? '?'}~${r.textHeightPx.max ?? '?'}px(한글 글자 높이 ≈ 글꼴 크기×0.92)`);
  if (r.mainMustIncludeClient) notes.push('메인 문구에 고객사명 필수');
  return {
    w: spec.w, h: spec.h, exportScale: spec.exportScale ?? 1, format: spec.format ?? ['png'], maxKB: spec.maxKB ?? null,
    safeArea: { top: safe.top, right: safe.right, bottom: safe.bottom, left: safe.left, source: safe.source, hard: ['top', 'right', 'bottom', 'left'].some(k => typeof r.safeArea?.[k] === 'number') },
    textLimits,
    fonts: { allowed, required: fr.required ?? null, defaultFamily: FONTS[eff]?.family ?? allowed[0], weights: FONTS[eff]?.weights ?? [400, 700] },
    logo: { count: r.logo?.count ?? null, w: r.logo?.w ?? null, h: r.logo?.h ?? null, forbidden: r.logo?.count === 0 },
    background: r.background ?? null,
    backgroundBanned: m.backgroundColors?.banned ?? [],
    textColors: r.textColors ?? (m.textColors?.main && !/전용/.test(String(m.textColors.note ?? '')) ? { main: m.textColors.main, sub: m.textColors.sub ?? [] } : null),
    textColorsUniform: !!m.textColors?.uniform,
    textCounting: m.textCounting ?? 'all-1',
    mold, notes: notes.map(s => String(s).slice(0, 400)).slice(0, 10),
  };
}

// 브리프 → 역할별 글감(사다리는 A 트랙과 같은 copyFor). 모델은 이 글만 쓴다.
export function copyOptions(brief = {}) {
  const ctx = createContext(brief, 'recruit'); const c = copyFor(ctx);
  const uniq = a => a.filter(s => s && String(s).trim()).map(s => String(s).trim()).filter((s, i, arr) => arr.indexOf(s) === i);
  const mains = uniq([c.mainWide, c.main, c.mainNarrow]);
  const season = brief.season ? String(brief.season).trim() : '';
  return {
    main: mains,
    sub: uniq([brief.slogan, c.sub, season, season && brief.hiringType ? `${season} ${brief.hiringType}` : '']),
    date: c.date ? uniq([`${c.label ?? '접수기간'} ${c.date}`, `모집기간 ${c.date}`, c.date]) : [],
    detail: uniq([brief.role ? `모집직무 ${brief.role}` : '', season && brief.hiringType ? `${season} ${brief.hiringType}` : '', brief.role ?? '', brief.slogan ?? '']),
    notice: brief.notice ? [String(brief.notice).trim()] : [],
    advertiser: c.advertiser ?? brief.client ?? '',
  };
}

function normsLine(specId, w, h) {
  const n = TEMPLATE_NORMS[specId]; if (!n) return null;
  const S = Math.sqrt(w * h), short = Math.min(w, h);
  const px = v => Math.round(v * S), pd = v => Math.round(v * short);
  return `과거 통과 소재 ${n.n}건 실측(하위10%·중앙·상위10%): 메인 글자 ${px(n.main[0])}·${px(n.main[1])}·${px(n.main[2])}px · 왼쪽 여백 ${pd(n.padL[0])}·${pd(n.padL[1])}·${pd(n.padL[2])}px · 위 여백 ${pd(n.padT[0])}·${pd(n.padT[1])}·${pd(n.padT[2])}px · 둘째 글자/메인 ${n.r2[1]} · 가장 작은 글자/메인 ${n.rMin[1]} · 그림 면적 ${Math.round(n.img[0] * 100)}~${Math.round(n.img[2] * 100)}%(중앙 ${Math.round(n.img[1] * 100)}%)`;
}

const kvKindLabel = k => ({ cutout: '누끼(배경 투명, 주인공만)', photo: '사진', illust: '일러스트', texture: '질감·추상', pattern: '패턴' }[k] ?? k ?? '?');

// ── 프롬프트 조립 — 순수 함수. images: { kv:'<경로>'|null, logo:'<경로>'|null } (read 모드) / 'inline'(stream 모드)
export function buildFreePrompt(input, { images = {}, retryErrors = null } = {}) {
  const { specId, brief = {}, rules, brand = {}, kv, logo, history = [], prev = null } = input;
  if (!rules) throw new Error('rules 가 없습니다');
  const copy = copyOptions(brief);
  const kvMeta = kv?.meta ?? {}; const f = kvMeta.field ?? {};
  const L = [];
  L.push(`너는 채용 광고 소재를 만드는 아트디렉터이자 프런트엔드 디자이너다. 아래 규격·브리프·키비주얼로 ${rules.w}×${rules.h}px 광고 한 장을 HTML/CSS(인라인 SVG 허용)로 **직접 디자인**한다. 템플릿을 고르는 게 아니라 이 그림·이 문구에 맞는 새 배경 디자인(그라데이션·도형·블러·패턴·스크림·키비주얼 합성)과 타이포를 만든다. 그림 파일을 새로 만들지는 않는다 — 배경은 CSS/SVG 로만.`);
  L.push('');
  L.push(`## 규격 (고정 — 어기면 반려)`);
  L.push(`- 규격 id: ${specId} · 캔버스 ${rules.w}×${rules.h}px${rules.exportScale && rules.exportScale !== 1 ? ` (내보내기 ${rules.exportScale}배)` : ''}${rules.maxKB ? ` · 파일 ${rules.maxKB}KB 이하` : ''}`);
  const sa = rules.safeArea ?? {};
  L.push(`- 안전영역: 위 ${sa.top ?? 0} · 오른쪽 ${sa.right ?? 0} · 아래 ${sa.bottom ?? 0} · 왼쪽 ${sa.left ?? 0}px${sa.source ? ` (${sa.source})` : ''}${sa.hard ? ' — 글자·로고 상자는 반드시 이 안' : ' — 글자·로고는 이 안에 두는 게 안전'}. 키비주얼·배경은 지면 끝까지 닿아도 된다.`);
  for (const t of rules.textLimits ?? []) L.push(`- 글자 수 한도 ${t.role}: ${t.maxChars != null ? `최대 ${t.maxChars}자(공백 포함)` : ''}${t.lines != null ? ` · 최대 ${t.lines}줄` : ''}`);
  const fo = rules.fonts ?? {};
  L.push(`- 글꼴: ${fo.required ? `**${fo.required} 고정**(매체 규정)` : `다음 중에서만: ${(fo.allowed ?? []).join(', ')}`}${fo.defaultFamily ? ` · 기본 ${fo.defaultFamily}` : ''}${fo.weights?.length ? ` · 보유 굵기 ${fo.weights.join('/')}` : ''}. font-family 에 이 이름을 그대로 쓴다(@font-face 는 앱이 넣는다 — 네가 쓰지 않는다).`);
  const lg = rules.logo ?? {};
  if (lg.forbidden || lg.count === 0) L.push(`- 로고: **삽입 불가** — <img data-logo> 를 넣지 않는다.`);
  else if (logo?.dataUrl) L.push(`- 로고: 최대 ${lg.count ?? 1}개${lg.w || lg.h ? ` · 크기 ${lg.w ?? '?'}×${lg.h ?? '?'}px` : ''} · 원본 비율 유지(object-fit:contain) · 안전영역 안 · 톤 ${logo.tone === 'light' ? '밝음(어두운 바탕 필요)' : '어두움/유색(밝은 바탕 필요)'}`);
  else L.push(`- 로고: 없음 — data-logo 요소를 만들지 않는다.`);
  if (rules.background) L.push(`- 배경 규정: ${String(rules.background).slice(0, 500)}`);
  if (rules.backgroundBanned?.length) L.push(`- **배경 금지색**: ${rules.backgroundBanned.join(' ')} (같은 색은 반려 — 근접색도 피한다)`);
  if (rules.textColors?.main) L.push(`- 글자색 규정: 메인 ${rules.textColors.main}${rules.textColors.sub?.length ? ` · 서브 ${rules.textColors.sub.join('/')}` : ''} — 정확히 이 hex`);
  if (rules.textColorsUniform) L.push(`- 모든 글자 한 색(고지 제외)`);
  if (rules.mold?.note) L.push(`- 공식 템플릿 실측(참고 — 자리 감각만, 그대로 베끼지 않는다): ${rules.mold.note}`);
  for (const n of rules.notes ?? []) L.push(`- ${n}`);
  L.push('');
  L.push(`## 브리프 (글은 아래 것만 — 지어내거나 바꾸지 않는다)`);
  L.push(`- 고객사: ${brief.client ?? ''}${brief.hiringType ? ` · 채용 종류: ${brief.hiringType}` : ''}${brief.season ? ` · 시즌: ${brief.season}` : ''}`);
  if (brief.role) L.push(`- 모집 직무: ${brief.role}`);
  if (brief.startDate || brief.deadline) L.push(`- 접수: ${brief.startDate ?? ''} ~ ${brief.deadline ?? ''}${brief.deadlineTime ? ` ${brief.deadlineTime}` : ''}`);
  if (brief.slogan) L.push(`- 슬로건: ${brief.slogan}`);
  if (brief.notice) L.push(`- 고지(토씨 하나 못 바꿈): ${brief.notice}`);
  L.push(`- 역할별 쓸 수 있는 문구(각 역할에 정확히 이 중 하나, 줄바꿈만 <br> 로 네가 정한다):`);
  for (const role of FIELD_ROLES) if (copy[role]?.length) L.push(`  - ${role}: ${copy[role].map(s => `「${s}」`).join(' / ')}${role === 'main' ? ` — 고객사 이름 「${copy.advertiser}」이 반드시 보인다` : ''}`);
  L.push(`  - main${copy.date.length ? '·date' : ''} 는 필수, 나머지는 지면이 허락할 때만.`);
  L.push('');
  L.push(`## 키비주얼`);
  if (kv?.dataUrl || images.kv) {
    const px = Array.isArray(kvMeta.px) ? `${kvMeta.px[0]}×${kvMeta.px[1]}px` : '';
    const fc = f.focus ?? kvMeta.focus;
    L.push(`- 유형 ${kvKindLabel(f.kind ?? kvMeta.kind)} · 원본 ${px} 비율 ${kvMeta.ar ? Number(kvMeta.ar).toFixed(3) : '?'}${kvMeta.colors?.length ? ` · 대표색 ${kvMeta.colors.join(' ')}` : ''}${kvMeta.edge ? ` · 가장자리색 ${kvMeta.edge}` : ''}${f.lum != null ? ` · 밝기 ${f.lum}` : ''}${fc ? ` · 주인공 위치(원본 비율) 중심 (${fc.x}, ${fc.y}) 크기 ${fc.w}×${fc.h}` : ''}`);
    if (images.kv) L.push(`- 그림 파일: ${images.kv} — **먼저 Read 도구로 열어 눈으로 본 뒤** 디자인한다.`);
    else if (images.inline) L.push(`- 그림은 첫 번째 이미지로 첨부했다.`);
    L.push(`- HTML 에서는 \`${KV_PLACEHOLDER}\` 자리표시를 쓴다: <div data-object="1" style="position:absolute;…;background:url('${KV_PLACEHOLDER}') center/cover no-repeat"> 또는 <img data-kv="1" src="${KV_PLACEHOLDER}">. 서버가 실제 그림으로 바꾼다. 왜곡 금지(background-size 는 cover/contain/한 축 auto).`);
  } else L.push(`- 키비주얼 없음 — 글자와 배경 그래픽만으로.`);
  if (logo?.dataUrl && !(lg.forbidden || lg.count === 0)) L.push(`- 로고 자리표시: <img data-logo="1" src="${LOGO_PLACEHOLDER}" style="position:absolute;…;object-fit:contain">${images.logo ? ` (파일: ${images.logo} — Read 로 본다)` : ''}`);
  L.push('');
  L.push(`## 브랜드`);
  const cols = [brand.primary, brand.secondary, brand.accent].filter(Boolean);
  L.push(`- 브랜드 색: ${cols.length ? cols.join(' ') : '없음 — 키비주얼 대표색에서 고른다'}`);
  L.push('');
  L.push(`## 디자인 원칙`);
  L.push(`1. 타이포·패딩·여백이 안정적일 것 — 메인은 크고 굵게(지면의 주인), 서브는 메인의 40~55%, 가장 작은 글자도 메인의 0.3배 이상. 글자 상자 간 간격·바깥 여백은 일정한 리듬.`);
  L.push(`2. 키비주얼이 작거나 허전하지 않게 — 캔버스의 35~55%를 차지하게, 누끼는 지면 높이의 70% 이상, 사진·일러스트는 한 변으로 흘려도 된다(잘리는 몫 ≤ 30%). 주인공 위에는 글자를 올리지 않는다.`);
  L.push(`3. 이음이 자연스럽게 — 키비주얼과 지면 사이는 같은 계열 색·한 방향 그라데이션·마스크(mask-image 의 linear-gradient)로 잇는다. 테두리가 뚝 끊겨 보이면 안 된다. 글자 가독을 위한 스크림은 단색→투명 linear-gradient 한 장까지.`);
  L.push(`4. 배경은 네 디자인이지만 절제한다 — 단색 또는 같은 색상의 2색 그라데이션(각도 하나). 비는 곳은 장식이 아니라 키비주얼·글자를 키워 채운다.`);
  L.push(`5. 대비 — 글자와 그 바로 아래 바탕의 대비 4.5:1 이상. 글자는 흰 또는 #111 단색, 강조는 브랜드 포인트색 한 단어까지.`);
  const nl = normsLine(specId, rules.w, rules.h); if (nl) L.push(`6. 청사진 분포 참고 — ${nl}.`);
  const doc = loadFreeRules();
  if (doc) {
    L.push('');
    L.push(`## 취향 규칙 (docs/freedesign-rules.md 그대로. 어기면 재요청된다: 양의 letter-spacing · 장평(transform scale/font-stretch) 두 가지만 검증기가 잡는다. 그 외는 전부 자유 — 과감하게)`);
    L.push(doc);
  }
  L.push('');
  L.push(`## 출력 형식 (렌더러·검수기 호환 — 정확히)`);
  L.push(`- 루트 하나: <div data-ad="1" data-spec="${specId}" data-free="1" style="position:relative;width:${rules.w}px;height:${rules.h}px;overflow:hidden;font-family:'…'"> … </div>. 모든 자식은 position:absolute, 좌표는 px.`);
  L.push(`- 글자는 역할별 data-field="main|sub|date|detail|notice" 요소 **한 역할에 한 요소**. 줄바꿈은 <br>. 문구는 브리프의 것 그대로(자리표시 {main} 같은 것 금지). 글자 요소 안에 다른 글자 요소를 넣지 않는다.`);
  L.push(`- 키비주얼은 data-object="1"(배경 url) 또는 <img data-kv="1">, 로고는 <img data-logo="1">. 장식 도형엔 data-* 를 붙이지 않는다.`);
  L.push(`- 외부 리소스·<script>·<link>·@import·http(s) URL 금지. 색은 CSS 그대로. SVG 는 인라인.`);
  L.push(`- 응답은 \`\`\`html 코드 블록 하나와, 그 뒤 「NOTES: 」로 시작하는 한 줄(왜 이렇게 디자인했는지, 한국어)만. 다른 말 없이.`);
  if (prev?.html || history.length) {
    L.push('');
    L.push(`## 수정 모드`);
    for (const h of history.slice(-6)) L.push(`- ${h.role === 'assistant' ? 'AI' : '사용자'}: ${String(h.text ?? '').slice(0, 600)}`);
    if (prev?.html) { L.push(`아래는 이전 HTML 이다. 위 대화의 요청대로 고쳐서 전체 HTML 을 다시 내라(다른 부분은 유지):`); L.push('```html'); L.push(String(prev.html).slice(0, 60000)); L.push('```'); }
  }
  if (retryErrors?.length) {
    L.push('');
    L.push(`## 다시 — 방금 결과가 검증에 걸렸다. 아래를 고쳐 전체 HTML 을 다시 내라:`);
    for (const e of retryErrors) L.push(`- ${e}`);
  }
  return L.join('\n');
}

// ── 응답에서 HTML 블록 꺼내기
export function extractHtml(text) {
  const s = String(text ?? '');
  const fence = /```(?:html)?\s*\n([\s\S]*?)```/i.exec(s);
  let body = fence ? fence[1] : s;
  const i = body.search(/<div[^>]*data-ad=/i); if (i < 0) return null;
  body = body.slice(i).trim();
  // 루트 div 의 짝 </div> 까지만 — 뒤에 NOTES 등이 붙어 있을 수 있다
  let depth = 0, pos = 0; const re = /<div\b[^>]*>|<\/div>/gi; let m;
  while ((m = re.exec(body))) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) { pos = m.index + m[0].length; break; } }
  return pos ? body.slice(0, pos) : body;
}
export function extractNotes(text) {
  const m = /^\s*NOTES?\s*[:：]\s*(.+)$/im.exec(String(text ?? '').replace(/```[\s\S]*?```/g, ''));
  return m ? m[1].trim() : '';
}

// ── 자리표시 치환 — {{KV}}·{{LOGO}} → 실제 URL(dataURL 또는 file://). 반대로 보관용은 stripAssets 로 되돌린다
export function substituteAssets(html, { kv = null, logo = null } = {}) {
  let h = String(html ?? '');
  if (kv) h = h.split(KV_PLACEHOLDER).join(kv);
  if (logo) h = h.split(LOGO_PLACEHOLDER).join(logo);
  return h;
}
export function stripAssets(html, { kv = null, logo = null } = {}) {
  let h = String(html ?? '');
  if (kv) h = h.split(kv).join(KV_PLACEHOLDER);
  if (logo) h = h.split(logo).join(LOGO_PLACEHOLDER);
  return h;
}

const textOfField = inner => String(inner).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
// 문구 비교 — 공백·물결/하이픈(기간 구분)·쉼표/가운뎃점(나열 구분) 차이는 같은 글로 본다
const squash = s => String(s ?? '').replace(/\s+/g, '').replace(/[~\-–—]/g, '-').replace(/[,·|]/g, '·');

// ── HTML 검증 — 순수 함수. errors 가 비면 통과. (픽셀 측정은 렌더 뒤 lint 가 한다)
export function validateFreeHtml(html, input) {
  const errors = [];
  const h = String(html ?? '');
  const { specId, rules, brief = {}, logo } = input;
  const root = /^\s*<div\b([^>]*)>/i.exec(h);
  if (!root) { errors.push('루트가 <div data-ad="1"> 가 아님'); return { ok: false, errors }; }
  const attrs = root[1];
  if (!/data-ad="1"/.test(attrs)) errors.push('루트에 data-ad="1" 없음');
  if (!new RegExp(`data-spec="${specId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(attrs)) errors.push(`루트 data-spec 이 "${specId}" 가 아님`);
  if (!/data-free="1"/.test(attrs)) errors.push('루트에 data-free="1" 없음');
  const st = /style="([^"]*)"/i.exec(attrs)?.[1] ?? '';
  const w = /(?:^|;)\s*width\s*:\s*([\d.]+)px/.exec(st)?.[1], hh = /(?:^|;)\s*height\s*:\s*([\d.]+)px/.exec(st)?.[1];
  if (Number(w) !== rules.w || Number(hh) !== rules.h) errors.push(`루트 크기 ${w ?? '?'}×${hh ?? '?'} — 규격 ${rules.w}×${rules.h}px 여야 함`);
  if (!/position\s*:\s*relative/.test(st)) errors.push('루트 style 에 position:relative 없음');
  if (!/overflow\s*:\s*hidden/.test(st)) errors.push('루트 style 에 overflow:hidden 없음');
  if (/<script\b|<link\b|@import\b|<iframe\b/i.test(h)) errors.push('<script>·<link>·@import·<iframe> 금지');
  if (/\bhttps?:\/\//i.test(h)) errors.push('외부 URL(http/https) 금지');
  if (/\{\s*(main|sub|date|detail|notice|client|kv|logo)\s*\}/i.test(h)) errors.push('글자 자리표시({main} 등) 금지 — 브리프 글을 그대로 쓴다');
  if (h.includes(KV_PLACEHOLDER) || h.includes(LOGO_PLACEHOLDER)) errors.push('그림 자리표시가 치환되지 않음');
  // 글자 역할
  const fields = [...h.matchAll(/<([a-z0-9]+)\b[^>]*data-field="([a-z]+)"[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => ({ role: m[2], text: textOfField(m[3]) }));
  const roles = fields.map(f => f.role);
  if (!roles.includes('main')) errors.push('data-field="main" 요소가 없음');
  for (const r of roles) if (!FIELD_ROLES.includes(r)) errors.push(`알 수 없는 data-field 역할 "${r}" (main|sub|date|detail|notice 만)`);
  for (const r of new Set(roles)) if (roles.filter(x => x === r).length > 1) errors.push(`data-field="${r}" 가 ${roles.filter(x => x === r).length}개 — 한 역할에 한 요소`);
  const copy = copyOptions(brief);
  for (const f of fields) {
    if (!f.text.trim()) { errors.push(`${f.role} 글자가 비어 있음`); continue; }
    if (f.role === 'main' && copy.advertiser && !squash(f.text).includes(squash(copy.advertiser))) errors.push(`main 에 고객사 이름 「${copy.advertiser}」이 없음`);
    if (f.role === 'notice' && copy.notice[0] && squash(f.text) !== squash(copy.notice[0])) errors.push('notice 문구가 브리프와 다름(토씨 하나 못 바꿈)');
    const opts = copy[f.role] ?? [];
    if (opts.length && !opts.some(o => squash(o) === squash(f.text))) errors.push(`${f.role} 문구 「${f.text.replace(/\n/g, ' ')}」 — 브리프 문구가 아님(허용: ${opts.map(o => `「${o}」`).join(' / ')})`);
  }
  for (const t of rules.textLimits ?? []) {
    const f = fields.find(x => x.role === t.role); if (!f) continue;
    if (t.maxChars != null) { const n = countChars(f.text.replace(/\n/g, ''), rules.textCounting ?? 'all-1'); if (n > t.maxChars) errors.push(`${t.role} ${n}자 — 최대 ${t.maxChars}자`); }
    if (t.lines != null) { const n = f.text.split('\n').length; if (n > t.lines) errors.push(`${t.role} ${n}줄 — 최대 ${t.lines}줄`); }
  }
  // 그림·로고
  const kvCount = (h.match(/data-object="1"|data-kv="1"/g) ?? []).length;
  if (input.kv?.dataUrl && kvCount === 0) errors.push('키비주얼 요소(data-object="1" 또는 data-kv="1")가 없음');
  const logoCount = (h.match(/data-logo="1"/g) ?? []).length;
  if ((rules.logo?.forbidden || rules.logo?.count === 0) && logoCount > 0) errors.push('이 규격은 로고 삽입 불가 — data-logo 제거');
  if (!logo?.dataUrl && logoCount > 0) errors.push('로고가 없는데 data-logo 요소가 있음');
  if (typeof rules.logo?.count === 'number' && rules.logo.count > 0 && logoCount > rules.logo.count) errors.push(`로고 ${logoCount}개 — 최대 ${rules.logo.count}개`);
  // 글꼴
  const allowed = (rules.fonts?.allowed ?? []).map(s => s.toLowerCase());
  const fams = [...h.matchAll(/font-family\s*:\s*([^;"]+)/gi)].map(m => m[1].split(',')[0].replace(/["']/g, '').trim()).filter(Boolean);
  for (const fam of new Set(fams)) if (allowed.length && !allowed.includes(fam.toLowerCase())) errors.push(`글꼴 「${fam}」 — 허용 목록에 없음(${rules.fonts.allowed.join(', ')})`);
  if (rules.fonts?.required && fams.length && !fams.every(f => f.toLowerCase() === String(rules.fonts.required).toLowerCase())) errors.push(`글꼴은 ${rules.fonts.required} 고정`);
  if (!fams.length) errors.push('루트 font-family 없음');
  // 글자색 규정
  if (rules.textColors?.main) {
    const mainEl = /<[a-z0-9]+\b[^>]*data-field="main"[^>]*style="([^"]*)"/i.exec(h)?.[1] ?? '';
    const col = /(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8})/i.exec(mainEl)?.[1];
    if (col && col.toLowerCase() !== String(rules.textColors.main).toLowerCase()) errors.push(`메인 글자색 ${col} — 규정 ${rules.textColors.main}`);
  }
  errors.push(...aiTellIssues(h));
  return { ok: !errors.length, errors, fields };
}

// ── 헤드리스 Claude Code
let _ccAvail = null;
export function claudeCodeAvailable({ force = false } = {}) {
  if (_ccAvail && !force) return _ccAvail;
  _ccAvail = new Promise(res => {
    execFile('claude', ['--version'], { env: ccEnv(), timeout: 15000 }, (err, out) => {
      if (err) return res({ ok: false, version: null, loggedIn: null, error: String(err.message ?? err) });
      const version = String(out).trim();
      execFile('claude', ['auth', 'status'], { env: ccEnv(), timeout: 15000 }, (e2, out2) => {
        let loggedIn = null; try { loggedIn = !!JSON.parse(String(out2)).loggedIn; } catch {}
        res({ ok: true, version, loggedIn });
      });
    });
  });
  return _ccAvail;
}
function ccEnv() { const env = { ...process.env }; delete env.CLAUDECODE; return env; }   // 안에서 또 띄우는 것이라 중첩 표식을 지운다

const dataUrlToFile = (dataUrl, file) => {
  const m = /^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? '').trim());
  if (!m) throw new Error('data:image/png|jpeg|webp;base64 형식이어야 합니다');
  const f = `${file}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`; writeFileSync(f, Buffer.from(m[3], 'base64')); return { file: f, mediaType: m[1], data: m[3] };
};

// prompt 를 stdin 으로 넣고 `claude -p` 를 돌린다. 반환 { text, usage, model, raw, ms }
//   imageMode 'read'  : 그림을 임시 파일로 써 두고 프롬프트에 경로 — 모델이 Read 로 본다(--allowedTools Read)
//   imageMode 'stream': --input-format stream-json 으로 user 메시지에 image 블록을 직접 넣는다(도구 없이)
export function runClaudeCode(prompt, { images = [], model = DEFAULT_CC_MODEL, imageMode = 'read', timeoutMs = 600_000, cwd = tmpdir() } = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const args = ['-p', '--output-format', imageMode === 'stream' ? 'stream-json' : 'json', '--no-session-persistence'];
    if (model) args.push('--model', model);
    let stdinText;
    if (imageMode === 'stream') {
      args.push('--input-format', 'stream-json', '--verbose', '--tools', '');
      const content = images.map(im => { const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(im.dataUrl); return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }; });
      content.push({ type: 'text', text: prompt });
      stdinText = JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';
    } else {
      args.push('--allowedTools', 'Read', '--tools', 'Read', '--max-turns', String(2 + images.length * 2));
      stdinText = prompt;
    }
    const child = spawn('claude', args, { env: ccEnv(), cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [], err = [];
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`claude -p 시간 초과(${Math.round(timeoutMs / 1000)}s)`)); }, timeoutMs);
    child.stdout.on('data', d => out.push(d)); child.stderr.on('data', d => err.push(d));
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      const so = Buffer.concat(out).toString('utf8'), se = Buffer.concat(err).toString('utf8');
      let res = null;
      if (imageMode === 'stream') { for (const line of so.split('\n')) { try { const o = JSON.parse(line); if (o.type === 'result') res = o; } catch {} } }
      else { try { res = JSON.parse(so); } catch {} }
      if (!res) return reject(new Error(`claude -p 응답을 읽지 못함(code ${code}): ${(se || so).slice(0, 400)}`));
      if (res.is_error) return reject(new Error(`claude -p 오류: ${String(res.result ?? '').slice(0, 300)}`));
      const text = typeof res.result === 'string' ? res.result : (res.result?.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('');
      resolve({ text, usage: res.usage ?? null, model: Object.keys(res.modelUsage ?? {})[0] ?? model ?? null, cost: res.total_cost_usd ?? null, raw: res, ms: Date.now() - t0 });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(stdinText);
  });
}

// api 엔진 — server/design.js makeClient 와 같은 SDK. client 는 호출자가 만든다.
async function runApi(client, prompt, { images = [], model = DEFAULT_API_MODEL } = {}) {
  const t0 = Date.now();
  const content = images.map(im => { const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(im.dataUrl); return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }; });
  content.push({ type: 'text', text: prompt });
  const res = await client.messages.create({ model, max_tokens: 16000, messages: [{ role: 'user', content }] });
  if (res.stop_reason === 'refusal') throw new Error('모델이 요청을 거절했습니다');
  const text = (res.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('');
  return { text, usage: res.usage ?? null, model: res.model ?? model, raw: null, ms: Date.now() - t0 };
}

// ── 메인 — 입력(계약) → { html, notes, engine, model, ms, usage, attempts, errors, prompt }
//   deps: { run(prompt, {images}) } 로 모델 호출을 바꿔 끼울 수 있다(테스트 mock). client 는 api 엔진용.
export async function freeDesign(input = {}, { client = null, run = null, imageMode = 'read', model = null, keepTmp = false } = {}) {
  const t0 = Date.now();
  const specId = input.specId; if (!specId) throw new Error('specId 가 없습니다');
  const rules = input.rules ?? rulesForSpec(specId);
  const engine = input.engine === 'api' ? 'api' : 'claude-code';
  const inp = { ...input, rules, history: input.history ?? [], prev: input.prev ?? null };
  const images = []; if (input.kv?.dataUrl) images.push({ name: 'kv', dataUrl: input.kv.dataUrl }); if (input.logo?.dataUrl) images.push({ name: 'logo', dataUrl: input.logo.dataUrl });
  let tmp = null; const paths = {};
  if (!run && engine === 'claude-code' && imageMode === 'read' && images.length) {
    tmp = mkdtempSync(path.join(tmpdir(), 'freedesign-'));
    for (const im of images) paths[im.name] = dataUrlToFile(im.dataUrl, path.join(tmp, im.name)).file;
  }
  const call = run ?? (engine === 'api'
    ? (p) => { if (!client) throw new Error('API 키가 없습니다(engine:api)'); return runApi(client, p, { images, model: model ?? DEFAULT_API_MODEL }); }
    : (p) => runClaudeCode(p, { images, model: model ?? DEFAULT_CC_MODEL, imageMode, cwd: tmp ?? tmpdir() }));
  const imgOpt = engine === 'claude-code' && imageMode === 'read' && !run ? { kv: paths.kv ?? null, logo: paths.logo ?? null } : { inline: images.length > 0 };
  const usages = []; let attempts = 0, html = null, notes = '', errors = [], usedModel = null, lastText = '';
  try {
    let retryErrors = null;
    while (attempts < 2) {
      const prompt = buildFreePrompt(inp, { images: imgOpt, retryErrors });
      const r = await call(prompt, { images }); attempts++;
      if (r.usage) usages.push(r.usage); usedModel = r.model ?? usedModel; lastText = r.text ?? '';
      const raw = extractHtml(r.text);
      if (!raw) { errors = ['응답에 <div data-ad> HTML 블록이 없음']; retryErrors = errors; continue; }
      const sub = substituteAssets(raw, { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null });
      const v = validateFreeHtml(sub, inp);
      html = sub; notes = extractNotes(r.text); errors = v.errors;
      if (v.ok) break;
      retryErrors = v.errors;
    }
  } finally { if (tmp && !keepTmp) { try { rmSync(tmp, { recursive: true, force: true }); } catch {} } }
  if (!html) throw new Error(`HTML 을 받지 못함: ${errors.join(' · ')} — 응답 앞부분: ${lastText.slice(0, 300)}`);
  const usage = usages.length ? usages.reduce((a, u) => { for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) if (u[k] != null) a[k] = (a[k] ?? 0) + u[k]; return a; }, {}) : null;
  return { html, notes, engine, model: usedModel, ms: Date.now() - t0, usage, attempts, ok: !errors.length, errors, specId };
}
