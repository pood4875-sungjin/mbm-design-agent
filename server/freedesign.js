// 자유 디자인(freedesign) — Claude 가 규격·가이드 안에서 배경(그라데이션·도형·블러·패턴·스크림·KV 합성)과 타이포를 HTML/CSS/SVG 로 직접 설계한다.
//   픽셀 그림 생성은 아니다. 출력 HTML 은 A/B 트랙과 같은 표식(data-ad · data-field · data-object · data-logo)을 달아 기존 검수기(core/lint.js · app/measure.js)가 그대로 잰다.
//   엔진 두 가지:
//     claude-code : 헤드리스 Claude Code(`claude -p … --output-format json`) — 사용자 로그인 계정(구독), API 키 없음. 그림은 임시 파일로 써서 「Read 로 보라」(imageMode:'read', 기본)
//                   또는 `--input-format stream-json` 으로 이미지 블록을 직접 넣는다(imageMode:'stream').
//     api         : server/design.js makeClient 와 같은 Anthropic SDK 호출(키 있을 때).
//   계약(앱과 공유 — 바꾸지 말 것):
//     입력 { specId, brief, kv:{dataUrl, meta}, logo:{dataUrl, tone}|null, brand, rules:{w,h,exportScale,safeArea,textLimits,fonts:{allowed,required},logo,background,textColors,mold,notes}, history, prev:{html}|null, engine, n,
//            styles?: [id…](STYLE_DIRECTIONS 의 id, 기본 3종 — n 은 styles 길이), review?: true|false(자기 검토 1회, 기본 켬) }
//     출력 { html, notes, engine, model, ms, usage?, variants:[{ style:{id,name}, html, notes, attempts, errors, review:{issues:[…], fixed, auto:[…]}|null }], review }
//            — 하위 호환: 첫 안(variants[0])을 html·notes·review 에도 그대로. 방향마다 `claude -p` 1회씩 순차(각 결과 검증·재요청·자기 검토).
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
import { typoNormsFor, TYPO_RULE_FIXED, BP } from '../core/typoaudit.js';

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

// ── 스타일 방향(11-05 정정 B — 요청 1회 = 안 3개, 방향마다 지시가 다르다). 기본 세트 3종 + 추가 후보(정의만).
export const STYLE_DIRECTIONS = [
  { id: 'typo', name: '타이포 강조형', hint: '제목이 지면의 주인 — 메인을 분포 상위로 크게, 지면은 단색 또는 아주 약한 같은 색상 그라데이션, 키비주얼은 작게(캔버스 20~30%) 보조로 한쪽에.', default: true },
  { id: 'bright', name: '밝은 비주얼형', hint: '밝은 지면(흰~연한 유색), 키비주얼을 크게(캔버스 45~60%) 주인공으로, 글자는 어두운색(#111 계열) 단색.', default: true },
  { id: 'dark', name: '어두운 비주얼형', hint: '어두운 지면(브랜드색 딥톤 또는 #0B0B0B 계열)과 단색→투명 스크림, 키비주얼을 크게(캔버스 45~60%), 글자는 흰색.', default: true },
  { id: 'brand', name: '브랜드색형', hint: '브랜드 원색을 지면 전체에 깔고 글자는 흰색 또는 검정 한 가지, 키비주얼은 중간 크기.' },
  { id: 'photo', name: '사진 전면형', hint: '키비주얼을 지면 전체(블리드)로 깔고 한쪽에 스크림을 넣어 글자를 올린다. 누끼면 지면 높이 90% 이상으로.' },
  { id: 'minimal', name: '절제형', hint: '여백을 넉넉히(분포 상위) 두고 글자 크기 차이를 작게, 장식 없이 키비주얼 하나와 글자만.' },
];
export const DEFAULT_STYLES = STYLE_DIRECTIONS.filter(s => s.default).map(s => s.id);
export const styleOf = id => STYLE_DIRECTIONS.find(s => s.id === id) ?? null;

// ── 정보 블록 프리셋 3종(규칙 3항). 글자 크기는 {px}(정보 글자), 라벨 폭 {lw}. 모델은 하나를 통째로 쓰고 크기만 맞춘다.
export const INFO_PRESETS = [
  { id: 'badge', name: '뱃지형 2행', html: `<div data-field="date" style="position:absolute;left:48px;top:260px;font-size:18px;line-height:28px;color:#111;white-space:nowrap"><span style="display:inline-block;width:76px;box-sizing:border-box;text-align:center;background:#111;color:#fff;font-weight:700;font-size:14px;line-height:24px;border-radius:5px;margin-right:10px;vertical-align:top;margin-top:2px">모집기간</span><span style="display:inline-block;vertical-align:top;font-weight:700">~10.31(토)</span></div>
<div data-field="detail" style="position:absolute;left:48px;top:298px;font-size:18px;line-height:28px;color:#111;white-space:nowrap"><span style="display:inline-block;width:76px;box-sizing:border-box;text-align:center;background:#111;color:#fff;font-weight:700;font-size:14px;line-height:24px;border-radius:5px;margin-right:10px;vertical-align:top;margin-top:2px">모집직무</span><span style="display:inline-block;vertical-align:top;font-weight:400">클라우드 플랫폼 엔지니어</span></div>`,
    note: '두 행 모두 뱃지(같은 폭·같은 배경·같은 굵기), 행 피치 = 글자 2.1배(예 18px → 38px), 값은 vertical-align:top 으로 라벨과 같은 줄' },
  { id: 'bold', name: '볼드 라벨형 2행', html: `<div data-field="date" style="position:absolute;left:48px;top:260px;font-size:18px;line-height:28px;color:#111;white-space:nowrap"><b style="display:inline-block;width:5em;font-weight:700">모집기간</b><span style="font-weight:400">~10.31(토)</span></div>
<div data-field="detail" style="position:absolute;left:48px;top:294px;font-size:18px;line-height:28px;color:#111;white-space:nowrap"><b style="display:inline-block;width:5em;font-weight:700">모집직무</b><span style="font-weight:400">클라우드 플랫폼 엔지니어</span></div>`,
    note: '라벨은 <b> 고정 폭 5em(값 시작 x 같음), 값은 Regular, 행 피치 = 글자 1.9배(예 18px → 34px)' },
  { id: 'divider', name: '세로 구분선형 가로 1행', html: `<div data-field="date" style="position:absolute;left:48px;top:270px;font-size:18px;line-height:28px;color:#111;white-space:nowrap"><span style="font-weight:700;margin-right:8px">모집기간</span><span style="font-weight:400">~10.31(토)</span></div>
<div data-field="detail" style="position:absolute;left:240px;top:270px;font-size:18px;line-height:28px;color:#111;white-space:nowrap;border-left:1px solid rgba(17,17,17,.35);padding-left:16px"><span style="font-weight:700;margin-right:8px">모집직무</span><span style="font-weight:400">클라우드 플랫폼 엔지니어</span></div>`,
    note: '한 행에 가로로, 두 번째 요소의 border-left 가 구분선. 라벨 span 스타일은 둘이 같다(볼드 + margin-right). 가로형 규격에서 글자 덩어리 폭이 허락할 때만' },
];
export function infoPresetLines() {
  const L = [`## 정보 블록 프리셋 (규칙 3항 — 아래 셋 중 **하나를 통째로** 쓰고 좌표·글자 크기만 규격에 맞춘다. 글꼴·색은 디자인에 맞게 바꿔도 되지만 구조(라벨 요소·폭·vertical-align·행 피치)는 유지. date 만 쓸 때도 같은 구조)`];
  for (const p of INFO_PRESETS) { L.push(`- ${p.name}(${p.id}) — ${p.note}`); L.push('```html'); L.push(p.html); L.push('```'); }
  return L;
}

// ── 4항 간격 규칙 + 참고 분포 — 프롬프트 문장. 수치는 core/template-norms.js · core/typoaudit.js 에서만.
export function typoRuleLines(specId, rules) {
  const N = typoNormsFor(specId), F = TYPO_RULE_FIXED, w = rules.w, h = rules.h, S = Math.sqrt(w * h), short = Math.min(w, h);
  const px = v => Math.round(v * S), pd = v => Math.round(v * short);
  const mainMid = px(N.main.mid);
  return [
    `## 간격 기본 규칙 (규칙 4항 — 렌더 실측으로 검증, 어기면 재요청. em = 두 요소 중 작은 글자)`,
    `- 서브→메인 ≥ ${F.gapSubMain}em · 메인→정보 블록 ≥ ${F.gapMainInfo}em · 정보 블록 행 ≥ ${F.gapInfoRow}em — 너무 붙으면 ✗`,
    `- 모든 글자 쌍 간격 ≤ 메인 px × ${N.gap.hi}(${N.source} 줄 간격 상위10%; 메인 ${mainMid}px 이면 ${Math.round(N.gap.hi * mainMid)}px) — 너무 벙벙하면 ✗`,
    `- 글자 ↔ 키비주얼(누끼 주인공)·로고: 겹침 0 · 거리 ≥ 메인 px × ${F.assetGap} · 키비주얼은 규격 긴 변 ${F.assetGapMaxFrac * 100}%(${Math.round(Math.max(w, h) * F.assetGapMaxFrac)}px) 이하 — 그 이상 비면 글자·그림을 키운다`,
    `- 잘림 · 낱말 안 줄바꿈(한글도 어절 끝에서만 — <br> 로 네가 정한다) · 규격 밖 · 안전영역 밖 0`,
    `- 참고 분포(검증하지 않음, ${N.source} 하위10%~상위10%·중앙): 왼쪽 여백 ${pd(N.padL.lo)}~${pd(N.padL.hi)}px(중앙 ${pd(N.padL.mid)}) · 위 여백 ${pd(N.padT.lo)}~${pd(N.padT.hi)}px(중앙 ${pd(N.padT.mid)}) · 메인 글자 ${px(N.main.lo)}~${px(N.main.hi)}px(중앙 ${mainMid}) · 서브/메인 ${N.r2.lo}~${N.r2.hi}(중앙 ${N.r2.mid}) · 날짜/메인 ≤ ${BP.date} · 상세/메인 ≤ ${BP.detail} · 글자 덩어리 폭은 가로형 60%·정사각 85% 안쪽이 보통`,
  ];
}

// ── 정보 블록 검사(규칙 3항) — HTML 정적: date·detail·notice 의 라벨(첫 자식 span/b/strong/em/i) 스타일 지문(배경 유무·굵기·테두리)이 서로 다르면 ✗.
//   measure.free(렌더 측정, scripts/lib/freedesign-renderer.mjs)가 들어오면: 라벨 폭·값 시작 x 가 다르면 ✗, 행 간격 < 글자 0.6배면 ✗.
const INFO_ROLES = ['date', 'detail', 'notice'];
export function infoLabelOf(inner) {
  const m = /^\s*<(span|b|strong|em|i)\b([^>]*)>([\s\S]*?)<\/\1>/i.exec(String(inner ?? '')); if (!m) return null;
  const st = /style="([^"]*)"/i.exec(m[2])?.[1] ?? '';
  const bg = /(?:^|;)\s*background(?:-color)?\s*:\s*(?!none|transparent)[^;]+/i.test(st);
  const fw = /(?:^|;)\s*font-weight\s*:\s*([^;]+)/i.exec(st)?.[1]?.trim();
  const bold = fw ? (/bold/i.test(fw) || parseInt(fw) >= 600) : /^(b|strong)$/i.test(m[1]);
  const border = /(?:^|;)\s*border(?:-left|-right|-top|-bottom)?\s*:\s*(?!none|0)[^;]+/i.test(st);
  return { tag: m[1].toLowerCase(), text: m[3].replace(/<[^>]+>/g, '').trim(), bg, bold, border, kind: bg ? '뱃지' : border ? '구분선' : bold ? '볼드 라벨' : '평문 라벨' };
}
export function infoBlockIssues(html, measure = null) {
  const issues = []; const h = String(html ?? '');
  const els = [...h.matchAll(/<([a-z0-9]+)\b[^>]*data-field="(date|detail|notice)"[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => ({ role: m[2], inner: m[3], label: infoLabelOf(m[3]) }));
  if (els.length < 2) { if (measure?.free) {/* 한 행이면 간격 검사만 없음 */} return { ok: true, issues, labels: els.map(e => ({ role: e.role, kind: e.label?.kind ?? '라벨 없음' })) }; }
  const kinds = els.map(e => ({ role: e.role, kind: e.label?.kind ?? '라벨 없음' }));
  const uniq = [...new Set(kinds.map(k => k.kind))];
  if (uniq.length > 1) issues.push(`3항 라벨 스타일 섞임: ${kinds.map(k => `${k.role}=${k.kind}`).join(' · ')} — 한 블록은 전부 뱃지 / 전부 볼드 라벨 / 전부 세로 구분선 중 하나`);
  const F = measure?.free?.fields;
  if (F) {
    const rows = els.map(e => ({ role: e.role, f: F[e.role] })).filter(r => r.f);
    const labs = rows.filter(r => r.f.label);
    if (labs.length >= 2) {
      const ws = labs.map(r => r.f.label.bbox.w); if (Math.max(...ws) - Math.min(...ws) > 2) issues.push(`3항 라벨 폭 다름: ${labs.map(r => `${r.role} ${Math.round(r.f.label.bbox.w)}px`).join(' · ')} — 라벨은 고정 폭 한 열`);
      const xs = labs.map(r => r.f.valueX).filter(v => v != null); if (xs.length >= 2 && Math.max(...xs) - Math.min(...xs) > 2) issues.push(`3항 값 시작 x 다름: ${labs.filter(r => r.f.valueX != null).map(r => `${r.role} ${Math.round(r.f.valueX)}px`).join(' · ')}`);
    }
    const stack = rows.filter(r => r.f.ink).sort((a, b) => a.f.ink.y - b.f.ink.y);
    for (let i = 1; i < stack.length; i++) {
      const a = stack[i - 1], b = stack[i], g = b.f.ink.y - (a.f.ink.y + a.f.ink.h), em = Math.min(a.f.fontPx, b.f.fontPx);
      const sameRow = Math.abs(a.f.ink.y - b.f.ink.y) < em * 0.5;   // 가로 1행(구분선형)은 세로 간격을 안 잰다
      if (!sameRow && g < em * TYPO_RULE_FIXED.gapInfoRow - 1) issues.push(`3항 행 간격 ${a.role}→${b.role} ${Math.round(g)}px < 글자 ${TYPO_RULE_FIXED.gapInfoRow}배(${Math.round(em * TYPO_RULE_FIXED.gapInfoRow)}px) — 너무 붙음`);
    }
  }
  return { ok: !issues.length, issues, labels: kinds };
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
export function buildFreePrompt(input, { images = {}, retryErrors = null, style = null } = {}) {
  const { specId, brief = {}, rules, brand = {}, kv, logo, history = [], prev = null } = input;
  const dir = typeof style === 'string' ? styleOf(style) : style;
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
  if (dir) {
    L.push('');
    L.push(`## 스타일 방향: ${dir.name}(${dir.id})`);
    L.push(`- ${dir.hint}`);
    L.push(`- 이 방향 안에서 배경·타이포는 네 디자인. 다른 방향과 겹치지 않게 이 지시를 분명히 드러낸다.`);
  }
  const doc = loadFreeRules();
  if (doc) {
    L.push('');
    L.push(`## 규칙 (docs/freedesign-rules.md 그대로. 어기면 재요청된다 — 검증기가 잡는 것: 양의 letter-spacing · 장평(1·2항) · 정보 블록 라벨 섞임·행 붙음(3항) · 간격 하한/상한·그림/로고 겹침·잘림(4항). 그 외 배경·색·장식은 전부 자유 — 과감하게)`);
    L.push(doc);
  }
  L.push('');
  L.push(...typoRuleLines(specId, rules));
  L.push('');
  L.push(...infoPresetLines());
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
  { const ps = prefsSection(input.prefs); if (ps) { L.push(''); L.push(ps); } }   // 취향 학습(core/freeprefs.js) — 채택된 안 참고·피할 안(최대 1)
  if (retryErrors?.length) {
    L.push('');
    L.push(`## 다시 — 방금 결과가 검증에 걸렸다. 아래를 고쳐 전체 HTML 을 다시 내라:`);
    for (const e of retryErrors) L.push(`- ${e}`);
  }
  return L.join('\n');
}

// ── 취향 학습 절(11-05 사용자: 좋음/보통/절대 안 됨 셀렉이 품질 기준). input.prefs = { exemplars:[{html,fp,note,summary}], avoid:[{html,fp,note,summary}] } (core/freeprefs.js exemplarsFor)
//   긍정 예시 위주(최대 3) — 「don't 를 많이 줄수록 자유도가 떨어진다」. 피할 안은 최대 1, 금지 문장은 만들지 않는다(참고만).
export function prefsSection(prefs) {
  const ex = (prefs?.exemplars ?? []).filter(e => e?.html).slice(0, 3), av = (prefs?.avoid ?? []).filter(e => e?.html).slice(0, 1);
  if (!ex.length && !av.length) return '';
  const L = [`## 채택된 안(참고 — 사용자가 좋다고 고른 안. 구조·톤의 감각만 가져오고 그대로 베끼지 않는다. 새 디자인이어야 한다)`];
  ex.forEach((e, i) => { L.push(`${i + 1}. ${e.summary ?? ''}${e.note ? ` — 사용자 메모: ${String(e.note).slice(0, 200)}` : ''}`); L.push('```html'); L.push(String(e.html).slice(0, 2500)); L.push('```'); });
  if (av.length) { const e = av[0]; L.push(`## 피할 안(참고 — 사용자가 어느 키비주얼에도 안 맞는다고 한 구조 하나. 이 구조만 피하면 된다, 다른 제약은 없다)`); L.push(`- ${e.summary ?? ''}${e.note ? ` — 사용자 메모: ${String(e.note).slice(0, 200)}` : ''}`); }
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
  _ccAvail.then(r => { if (!r.ok || r.loggedIn !== true) _ccAvail = null; });   // 11-05: 미로그인 결과를 기억해 로그인 뒤에도 「로그인 필요」가 남던 것 — 성공만 기억
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

// ── 자기 검토 프롬프트 — 1차 HTML 의 렌더 PNG 와 체크리스트로 「지적 → 고친 HTML」 한 번. 응답: ISSUES: 줄(없으면 「ISSUES: 없음」) + ```html``` 블록(고칠 게 있을 때만) + NOTES:
export const REVIEW_CHECKLIST = [
  '위계: 메인 > 서브 > 상세(날짜·직무) — 크기·굵기 순서가 한눈에 읽히는가',
  '간격 균일: 글자 덩어리 안 간격이 한 리듬인가(서브→메인·메인→정보 블록·정보 행). 너무 붙거나 벙벙한 곳',
  '정렬 기준선: 모든 글자의 왼쪽(또는 가운데) 기준선이 한 줄인가, 라벨·값이 같은 기준선인가',
  '라벨 일관성: 정보 블록 라벨이 전부 뱃지 / 전부 볼드 / 전부 구분선 중 하나인가, 라벨 폭·값 시작 x 가 같은가',
  '여백 균형: 바깥 여백(왼·위·아래)이 고르고 지면이 한쪽으로 쏠리지 않는가',
  '키비주얼: 잘리거나(주인공 손상) 작아 허전하지 않은가, 글자와 겹치지 않는가',
  '이음: 키비주얼과 지면 사이 경계가 뚝 끊기지 않는가(같은 계열 색·그라데이션·마스크)',
];
export function buildReviewPrompt(input, { html, png = null, auto = [], style = null } = {}) {
  const { specId, rules } = input; const dir = typeof style === 'string' ? styleOf(style) : style;
  const L = [];
  L.push(`너는 방금 아래 ${rules.w}×${rules.h}px 광고(규격 ${specId}${dir ? ` · 방향 ${dir.name}` : ''})를 디자인했다. 이제 **아트디렉터로서 자기 검토** 한 번: 렌더된 PNG 를 보고 체크리스트로 문제를 짚은 뒤, 고칠 게 있으면 전체 HTML 을 고쳐 낸다. 디자인 방향은 바꾸지 않는다(고치는 건 간격·정렬·크기·라벨·여백·이음 같은 마감).`);
  L.push('');
  if (png) L.push(`렌더 PNG: ${png} — **먼저 Read 도구로 열어 눈으로 본다.**`); else L.push(`렌더 PNG 는 첨부한 마지막 이미지다.`);
  L.push('');
  L.push(`## 체크리스트`);
  REVIEW_CHECKLIST.forEach((c, i) => L.push(`${i + 1}. ${c}`));
  L.push(...typoRuleLines(specId, rules));
  if (auto.length) { L.push(''); L.push(`## 검증기가 이미 잡은 것(반드시 고친다)`); for (const a of auto) L.push(`- ${a}`); }
  L.push('');
  L.push(`## 현재 HTML`); L.push('```html'); L.push(String(html).slice(0, 60000)); L.push('```');
  L.push('');
  L.push(`## 출력 형식`);
  L.push(`- 첫 줄부터 「ISSUES:」 다음 줄마다 「- 」로 지적(한국어, 위치와 무엇이 문제인지). 문제가 없으면 「ISSUES: 없음」 한 줄.`);
  L.push(`- 고칠 게 있으면 이어서 \`\`\`html 코드 블록에 **전체 HTML**(같은 계약: 루트 data-ad/data-spec/data-free, 자리표시 ${KV_PLACEHOLDER}·${LOGO_PLACEHOLDER} 그대로, 문구 그대로). 없으면 코드 블록을 내지 않는다.`);
  L.push(`- 마지막에 「NOTES: 」 한 줄(무엇을 고쳤는지).`);
  return L.join('\n');
}
export function extractIssues(text) {
  const s = String(text ?? '').replace(/```[\s\S]*?```/g, '');
  const m = /ISSUES?\s*[:：][ \t]*([^\n]*)\n?([\s\S]*)/i.exec(s); if (!m) return [];
  if (/^(없음|none|no issues?)\s*$/i.test(m[1].trim())) return [];
  const out = m[1].trim() ? [m[1].trim().replace(/^[-•*]\s+/, '')] : [];
  for (const line of m[2].split('\n')) { const t = line.trim(); if (/^NOTES?\s*[:：]/i.test(t)) break; if (/^[-•*]\s+/.test(t)) out.push(t.replace(/^[-•*]\s+/, '')); else if (t && out.length === 0 && !/^#/.test(t)) out.push(t); else if (!t && out.length) break; }
  return out.filter(x => x && !/^없음$/.test(x));
}

// 기본 렌더 — scripts/lib/freedesign-renderer.mjs(헤드리스 Chrome). 순환 import 라 늦게 불러온다. 반환 { png, measure, free, auto:[…] }
async function defaultRender(input, html, dir) {
  const { renderFree } = await import('../scripts/lib/freedesign-renderer.mjs');
  const a = renderFree({ specId: input.specId, html, rules: input.rules, brief: input.brief ?? {}, name: `review-${Date.now()}` }, dir, { kvFocus: input.kv?.meta?.focus ?? input.kv?.meta?.field?.focus ?? null, kvKind: input.kv?.meta?.field?.kind ?? input.kv?.meta?.kind ?? null });
  return { png: a.png, measure: a.measure, free: a.free, auto: [...(a.info?.issues ?? []), ...(a.typoRules?.issues ?? [])], audit: a };
}

// ── 메인 — 입력(계약) → { html, notes, engine, model, ms, usage, attempts, errors, review, variants:[…] }
//   deps: { run(prompt, {images}) } 로 모델 호출을, { render(input, html, dir) } 로 렌더를 바꿔 끼울 수 있다(테스트 mock). client 는 api 엔진용.
//   방향(styles)마다 순차: 생성(검증 실패 시 사유 붙여 1회 재요청) → 자기 검토 1회(review !== false: 렌더 PNG + 체크리스트 + 검증기 자동 지적 → 고친 HTML 이 검증을 통과하면 채택).
export async function freeDesign(input = {}, { client = null, run = null, render = null, imageMode = 'read', model = null, keepTmp = false } = {}) {
  const t0 = Date.now();
  const specId = input.specId; if (!specId) throw new Error('specId 가 없습니다');
  const rules = input.rules ?? rulesForSpec(specId);
  const engine = input.engine === 'api' ? 'api' : 'claude-code';
  const inp = { ...input, rules, history: input.history ?? [], prev: input.prev ?? null };
  const styleIds = Array.isArray(input.styles) && input.styles.length ? input.styles : (typeof input.n === 'number' && input.n === 1 ? DEFAULT_STYLES.slice(0, 1) : DEFAULT_STYLES);
  const styles = styleIds.map(id => styleOf(id) ?? { id: String(id), name: String(id), hint: '' });
  const doReview = input.review !== false;
  const images = []; if (input.kv?.dataUrl) images.push({ name: 'kv', dataUrl: input.kv.dataUrl }); if (input.logo?.dataUrl) images.push({ name: 'logo', dataUrl: input.logo.dataUrl });
  const readMode = !run && engine === 'claude-code' && imageMode === 'read';
  let tmp = null; const paths = {};
  if ((readMode && images.length) || (doReview && !render)) tmp = mkdtempSync(path.join(tmpdir(), 'freedesign-'));
  if (readMode && images.length) for (const im of images) paths[im.name] = dataUrlToFile(im.dataUrl, path.join(tmp, im.name)).file;
  const call = run ?? (engine === 'api'
    ? (p, o = {}) => { if (!client) throw new Error('API 키가 없습니다(engine:api)'); return runApi(client, p, { images: o.images ?? images, model: model ?? DEFAULT_API_MODEL }); }
    : (p, o = {}) => runClaudeCode(p, { images: o.images ?? images, model: model ?? DEFAULT_CC_MODEL, imageMode, cwd: tmp ?? tmpdir() }));
  const imgOpt = readMode ? { kv: paths.kv ?? null, logo: paths.logo ?? null } : { inline: images.length > 0 };
  const renderFn = render ?? ((html) => defaultRender(inp, html, tmp));
  const usages = []; let usedModel = null; const variants = [];
  const addUsage = r => { if (r?.usage) usages.push(r.usage); usedModel = r?.model ?? usedModel; };
  try {
    for (const dir of styles) {
      let attempts = 0, html = null, notes = '', errors = [], lastText = '', retryErrors = null;
      while (attempts < 2) {
        const prompt = buildFreePrompt(inp, { images: imgOpt, retryErrors, style: dir });
        const r = await call(prompt, { images }); attempts++; addUsage(r); lastText = r.text ?? '';
        const raw = extractHtml(r.text);
        if (!raw) { errors = ['응답에 <div data-ad> HTML 블록이 없음']; retryErrors = errors; continue; }
        const sub = substituteAssets(raw, { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null });
        const v = validateFreeHtml(sub, inp);
        html = sub; notes = extractNotes(r.text); errors = v.errors;
        if (v.ok) break;
        retryErrors = v.errors;
      }
      if (!html) throw new Error(`HTML 을 받지 못함(${dir.name}): ${errors.join(' · ')} — 응답 앞부분: ${lastText.slice(0, 300)}`);
      let review = null;
      if (doReview) {
        review = { issues: [], fixed: false, auto: [] };
        try {
          const rd = await renderFn(html, dir);
          review.auto = rd.auto ?? [];
          const rawHtml = stripAssets(html, { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null });
          const pngImg = rd.png && !readMode ? { name: 'png', dataUrl: `data:image/png;base64,${readFileSync(rd.png).toString('base64')}` } : null;
          const prompt = buildReviewPrompt(inp, { html: rawHtml, png: readMode ? rd.png : null, auto: review.auto, style: dir });
          const r = await call(prompt, { images: pngImg ? [...images, pngImg] : readMode ? [...images, { name: 'png', dataUrl: null }] : images }); addUsage(r);
          review.issues = extractIssues(r.text);
          const fixedRaw = extractHtml(r.text);
          if (fixedRaw) {
            const fixed = substituteAssets(fixedRaw, { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null });
            const v2 = validateFreeHtml(fixed, inp);
            if (v2.ok) { html = fixed; errors = []; review.fixed = true; const n2 = extractNotes(r.text); if (n2) notes = n2; }
            else review.rejected = v2.errors;
          }
        } catch (e) { review.error = String(e?.message ?? e); }
      }
      variants.push({ style: { id: dir.id, name: dir.name }, html, notes, attempts, errors, ok: !errors.length, review });
    }
  } finally { if (tmp && !keepTmp) { try { rmSync(tmp, { recursive: true, force: true }); } catch {} } }
  const usage = usages.length ? usages.reduce((a, u) => { for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) if (u[k] != null) a[k] = (a[k] ?? 0) + u[k]; return a; }, {}) : null;
  const first = variants[0];
  return { html: first.html, notes: first.notes, engine, model: usedModel, ms: Date.now() - t0, usage, attempts: first.attempts, ok: first.ok, errors: first.errors, review: first.review, specId, variants };
}
