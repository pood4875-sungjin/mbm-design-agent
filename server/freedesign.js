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
import { kvTypeOf } from '../core/kvtypes.js';
import { languageLines, languageOf, languageFromHtml, mergeLanguage } from '../core/freelang.js';
import { fixStack } from '../core/freequick.js';

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
export const DEFAULT_STYLES = STYLE_DIRECTIONS.filter(s => s.default).map(s => s.id);   // 옛 톤 3종(11-05) — styles 로 명시할 때만. 지정이 없으면 구성 축(pickCompositions)

// ── 구성 축 방향(11-09 AI 디자인 트랙 — docs/ai-design-flow.md). 톤이 아니라 「구성」이 서로 다른 3안. 평가 54건: 「글자 좌·KV 우」 단순 분할 22건 좋음 0 → 금지.
//   KV 유형(core/kvtypes)에 맞춰 pickCompositions 가 3개를 고른다. 지시는 구체(자리·비율·기법) + 금지(가이드)만.
export const COMPOSITION_BAN = '「글자 왼쪽 · 키비주얼 오른쪽」을 세로 직선으로 반 나눈 단순 분할은 쓰지 않는다(평가 54건 중 22건이 이 구성, 좋음 0).';
export const COMPOSITIONS = [
  { id: 'bleed', name: '전면 비주얼 + 글자 오버레이', kind: 'composition', kvArea: [0.85, 1],
    hint: '키비주얼이 지면 전체를 덮는다 — 사진·바탕 있는 그림은 background-size:cover 로 캔버스 전체(주인공이 잘리지 않게 background-position 을 주인공 쪽으로), 누끼는 지면 높이 90~130%로 크게 키워 한 변 밖으로 흘린다. 글자는 그림의 빈 쪽(하늘·바닥·여백) 위에 올리고, 가독은 단색→투명 스크림 한 장 또는 글자 뒤 반투명 판 하나로. 주인공 얼굴·몸통 위 글자 금지.' },
  { id: 'motif', name: '그래픽 모티프 지면', kind: 'composition', kvArea: [0.3, 0.45],
    hint: '키비주얼에서 뽑은 모양(원·호·띠·격자·물결·별·셀 등 그림의 형태 언어)과 대표색으로 인라인 SVG(또는 CSS 도형)를 만들어 지면에 반복·확대 배치한다 — 최소 2개 요소가 리듬을 이룬다. 키비주얼은 캔버스 30~45% 중간 크기로 모티프와 엮는다(모티프가 그림 뒤를 지나가거나 그림을 감싼다). 모티프가 글자 아래를 지나가도 되지만 글자 바로 뒤 대비 4.5:1 유지.' },
  { id: 'typehero', name: '타이포 주도 + 키비주얼 작게', kind: 'composition', kvArea: [0.15, 0.25],
    hint: '메인 글자가 지면의 주인 — 분포 상위 이상으로 크게(메인 글자 덩어리 높이가 캔버스 짧은 변의 30~45%), 강조 한 단어는 색 또는 태그. 키비주얼은 캔버스 15~25%로 작게 — 원형·라운드 창, 글자 줄 끝에 붙는 스티커, 또는 메인 글자와 맞물리게. 지면은 단색 또는 아주 약한 같은 색상 그라데이션.' },
  { id: 'diagonal', name: '분할 대각·곡선', kind: 'composition', kvArea: [0.35, 0.55],
    hint: '지면을 대각선(15~35°) 또는 큰 곡선(호)으로 두 면으로 나눈다(clip-path polygon 또는 인라인 SVG path). 두 면은 대비되는 색(키비주얼 대표색 + 그 짝색 또는 딥톤). 키비주얼은 한 면에 두되 경계선을 넘어 걸치게 해 두 면을 잇는다. 세로 직선 50:50 분할은 금지.' },
  { id: 'frame', name: '카드·프레임', kind: 'composition', kvArea: [0.4, 0.6],
    hint: '지면 위에 라운드 카드(창) 하나를 띄우고 키비주얼을 카드 안에 cover 로 담는다(radius 16~32px, 얇은 테두리 또는 부드러운 그림자). 글자는 카드 밖 지면 또는 카드 아래 띠에. 카드는 캔버스의 40~60%, 살짝 기울이거나 두 장을 겹쳐도 좋다. 누끼는 카드 밖으로 머리·몸 일부가 튀어나오게.' },
  { id: 'axis', name: '가운데 축(대칭)', kind: 'composition', kvArea: [0.4, 0.6],
    hint: '글자를 가운데 정렬로 위(또는 아래)에 모으고 키비주얼을 가운데 축에 크게 세운다(캔버스 40~60%). 좌우 대칭의 안정감 — 정보 블록도 가운데 정렬(라벨 규칙은 그대로). 배경은 주인공 뒤 후광(원형 그라데이션)이나 바닥 그림자로 깊이를 준다.' },
];
export const compositionOf = id => COMPOSITIONS.find(c => c.id === id) ?? null;
export const styleOf = id => STYLE_DIRECTIONS.find(s => s.id === id) ?? compositionOf(id) ?? null;
// KV 유형 → 서로 다른 구성 3개. 캔버스 비율: 아주 긴 가로 띠(≥3)는 가운데 축 대신 타이포 주도, 세로형은 대각 대신 가운데 축
export function pickCompositions(kvMeta = null, rules = null, n = 3) {
  const f = kvMeta?.field ?? {}; const kind = f.kind ?? kvMeta?.kind ?? null;
  let character = false;
  try { if (kvMeta?.field) character = !!kvTypeOf(kvMeta)?.flags?.character; } catch {}
  let ids;
  if (!kind) ids = ['typehero', 'motif', 'diagonal'];
  else if (kind === 'photo') ids = ['bleed', 'diagonal', 'frame'];
  else if (kind === 'illust') ids = ['bleed', 'frame', 'typehero'];
  else if (kind === 'texture' || kind === 'pattern') ids = ['bleed', 'typehero', 'motif'];
  else if (kind === 'cutout') ids = character ? ['axis', 'motif', 'bleed'] : ['motif', 'bleed', 'typehero'];
  else ids = ['typehero', 'motif', 'diagonal'];
  const ar = rules?.w && rules?.h ? rules.w / rules.h : 1;
  const swap = (from, to) => { const i = ids.indexOf(from); if (i >= 0 && !ids.includes(to)) ids[i] = to; };
  if (ar >= 3) { swap('axis', 'typehero'); swap('frame', 'motif'); }
  if (ar <= 0.8) swap('diagonal', 'axis');
  const spare = ['typehero', 'motif', 'diagonal', 'frame', 'bleed', 'axis'].filter(x => !ids.includes(x));
  while (ids.length < n && spare.length) ids.push(spare.shift());
  return ids.slice(0, n);
}

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
// API 키 경로는 기본 꺼짐(11-09 사용자: 「Claude 계정 로그인 토큰만, API 안 씀」) — FREEDESIGN_API=1 일 때만 engine:'api' 를 받는다. 꺼져 있으면 claude-code 로 돌린다
export const API_ENGINE_ENABLED = process.env.FREEDESIGN_API === '1';
export const enginesAvailable = ({ client = null, cc = true } = {}) => [...(cc ? ['claude-code'] : []), ...(API_ENGINE_ENABLED && client ? ['api'] : [])];
export const REVISE_MODEL = process.env.FREEDESIGN_REVISE_MODEL ?? 'sonnet';
export const SUGGEST_MODEL = process.env.FREEDESIGN_SUGGEST_MODEL ?? null;   // null = 로그인 계정 기본(측정 후 결정 — history 11-09)
export const PARALLEL = Math.max(1, Number(process.env.FREEDESIGN_PARALLEL ?? 3) || 3);
export const RETRY_MODEL = process.env.FREEDESIGN_RETRY_MODEL ?? 'sonnet';   // 게이트 재요청(걸린 것만 고치기)은 짧은 프롬프트 + 빠른 모델
export const IMAGE_MODE = process.env.FREEDESIGN_IMAGE_MODE ?? 'stream';
// 생각 길이(--effort) — 11-09 실측: revise 프롬프트 sonnet 기본 80s → low 21s(출력 1.8k 토큰). 설계(suggest·spread)는 medium, 고치기(revise·재요청)는 low
export const CC_SYSTEM = '너는 채용 광고 소재를 HTML/CSS 로 디자인하는 아트디렉터다. 도구나 스킬을 쓰지 않고, 사용자 메시지가 정한 출력 형식(```html 코드 블록 + NOTES 등)으로만 답한다.';
export const DESIGN_EFFORT = process.env.FREEDESIGN_EFFORT ?? 'medium';
export const FAST_EFFORT = process.env.FREEDESIGN_FAST_EFFORT ?? 'low';     // 서버 기본: 그림을 메시지에 직접(Read 도구 왕복 없음 — 11-09 실측 7.5s 확인)
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
export function buildFreePrompt(input, { images = {}, retryErrors = null, retryHtml = null, style = null } = {}) {
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
  const comp = dir?.kind === 'composition' || input.language;
  if (comp) {   // 11-09 AI 트랙: 그래픽·패턴·컬러·강조는 자유 — 구성 지시와 가이드(대비·간격·잘림)만
    L.push(`2. 키비주얼은 아래 구성 지시의 크기로. 비율 유지(늘이기 금지), 주인공 잘림 금지(사진·일러스트는 한 변으로 흘려도 되지만 주인공은 온전히), 누끼는 누끼답게(바탕 네모가 보이지 않게). 주인공 위에는 글자를 올리지 않는다.`);
    L.push(`3. 이음이 자연스럽게 — 키비주얼과 지면 사이는 같은 계열 색·그라데이션·마스크(mask-image)로 잇는다. 테두리가 뚝 끊겨 보이면 안 된다(카드·프레임처럼 의도한 테두리는 예외).`);
    L.push(`4. 지면·그래픽·패턴·컬러·강조(태그·색·굵기)·글꼴 섞기는 자유 — 키비주얼과 어울리는 그래픽(키비주얼의 모양·색에서 뽑은 SVG/CSS 도형·패턴)을 과감하게. 단 글자 가독과 위계를 해치지 않는다.`);
    L.push(`5. 대비 — 글자와 그 바로 아래 바탕의 대비 4.5:1 이상(24px 이상 굵은 글자는 3:1). 강조색 한 가지까지.`);
    L.push(`   - 글자 상자(가장 긴 줄 끝까지)가 사진 위로 넘어가지 않게 — 넘으면 줄을 나누거나 글자 뒤에 판·스크림. 장식(SVG 도형·별·선·원)은 글자 획에서 떨어뜨린다(글자에 걸치면 반려 — 검증기가 글자 없는 렌더로 실측).`);
  } else {
  L.push(`2. 키비주얼이 작거나 허전하지 않게 — 캔버스의 35~55%를 차지하게, 누끼는 지면 높이의 70% 이상, 사진·일러스트는 한 변으로 흘려도 된다(잘리는 몫 ≤ 30%). 주인공 위에는 글자를 올리지 않는다.`);
  L.push(`3. 이음이 자연스럽게 — 키비주얼과 지면 사이는 같은 계열 색·한 방향 그라데이션·마스크(mask-image 의 linear-gradient)로 잇는다. 테두리가 뚝 끊겨 보이면 안 된다. 글자 가독을 위한 스크림은 단색→투명 linear-gradient 한 장까지.`);
  L.push(`4. 배경은 네 디자인이지만 절제한다 — 단색 또는 같은 색상의 2색 그라데이션(각도 하나). 비는 곳은 장식이 아니라 키비주얼·글자를 키워 채운다.`);
  L.push(`5. 대비 — 글자와 그 바로 아래 바탕의 대비 4.5:1 이상. 글자는 흰 또는 #111 단색, 강조는 브랜드 포인트색 한 단어까지.`);
  }
  const nl = normsLine(specId, rules.w, rules.h); if (nl) L.push(`6. 청사진 분포 참고 — ${nl}.`);
  if (input.language) { L.push(''); L.push(...languageLines(input.language)); L.push(`- 이 규격의 비율·안전영역·글자 수에 맞게 자리와 크기만 새로 짠다. ${COMPOSITION_BAN}`); }
  else if (dir?.kind === 'composition') {
    L.push('');
    L.push(`## 구성: ${dir.name}(${dir.id}) — 이 안의 뼈대. 다른 안과 구성이 겹치지 않게 이 지시를 분명히 드러낸다`);
    L.push(`- ${dir.hint}`);
    L.push(`- 키비주얼 면적 목표: 캔버스의 ${Math.round(dir.kvArea[0] * 100)}~${Math.round(dir.kvArea[1] * 100)}%.`);
    L.push(`- 금지: ${COMPOSITION_BAN}`);
  } else if (dir) {
    L.push('');
    L.push(`## 스타일 방향: ${dir.name}(${dir.id})`);
    L.push(`- ${dir.hint}`);
    L.push(`- 이 방향 안에서 배경·타이포는 네 디자인. 다른 방향과 겹치지 않게 이 지시를 분명히 드러낸다.`);
  }
  if (input.prompt && !prev?.html) { L.push(''); L.push(`## 사용자 요청(방향 힌트 — 위 구성 안에서 반영)`); L.push(`- ${String(input.prompt).slice(0, 400)}`); }
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
  if (comp && !input.language) L.push(`- NOTES 다음 줄에 이 안의 캠페인 디자인 언어를 한 줄 JSON 으로: LANGUAGE: {"ground":"<지면 background CSS>","palette":["#hex",…],"motifs":[{"note":"모티프 설명","svg":"<svg…>대표 조각(800자 이내)</svg>"}],"emphasis":{"kind":"tag|color|weight","color":"#hex","note":"…"},"fonts":{"families":["…"],"mainWeight":800,"align":"left"},"textColors":{"main":"#hex","sub":"#hex","date":"#hex"}} — 다른 규격으로 펼칠 때 쓴다.`);
  if (prev?.html || history.length) {
    L.push('');
    L.push(`## 수정 모드`);
    for (const h of history.slice(-6)) L.push(`- ${h.role === 'assistant' ? 'AI' : '사용자'}: ${String(h.text ?? '').slice(0, 600)}`);
    if (prev?.html) { L.push(`아래는 이전 HTML 이다. 위 대화의 요청대로 고쳐서 전체 HTML 을 다시 내라(다른 부분은 유지):`); L.push('```html'); L.push(String(prev.html).slice(0, 60000)); L.push('```'); }
  }
  { const ps = prefsSection(input.prefs); if (ps) { L.push(''); L.push(ps); } }   // 취향 학습(core/freeprefs.js) — 채택된 안 참고·피할 안(최대 1)
  if (retryErrors?.length) {
    L.push('');
    L.push(`## 다시 — 방금 결과가 검증에 걸렸다. 아래를 고쳐 전체 HTML 을 다시 내라(구성·색은 유지, 걸린 것만 고친다):`);
    for (const e of retryErrors) L.push(`- ${e}`);
    if (retryHtml) { L.push(`방금 낸 HTML(그림은 자리표시):`); L.push('```html'); L.push(String(retryHtml).slice(0, 40000)); L.push('```'); }
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
  if (/\bhttps?:\/\//i.test(h.replace(/\bxmlns(?::\w+)?\s*=\s*"https?:\/\/www\.w3\.org\/[^"]*"/gi, ''))) errors.push('외부 URL(http/https) 금지');   // SVG 이름공간(xmlns="http://www.w3.org/…")은 주소가 아니다(11-09 revise 실측에서 반려됨)
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
export function runClaudeCode(prompt, { images = [], model = DEFAULT_CC_MODEL, imageMode = 'read', timeoutMs = 600_000, cwd = tmpdir(), tools = true, effort = null, signal = null } = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    if (signal?.aborted) return reject(cancelError());
    const args = ['-p', '--output-format', imageMode === 'stream' ? 'stream-json' : 'json', '--no-session-persistence'];
    if (model) args.push('--model', model);
    if (effort) args.push('--effort', effort);   // 11-09: 생각 길이 — revise·재요청은 low(속도)
    args.push('--strict-mcp-config', '--disable-slash-commands');   // MCP 서버·스킬을 싣지 않는다 — 11-09 실측: 도구 없는 호출에서 모델이 스킬(frontend-design 등)을 부르려다 HTML 없이 끝났다(3안 중 3)
    if (imageMode === 'stream' || !tools) args.push('--system-prompt', CC_SYSTEM);   // 코딩 에이전트 시스템 프롬프트 대신 짧은 디자이너 역할(도구 없는 호출만)
    let stdinText;
    if (imageMode === 'stream') {
      args.push('--input-format', 'stream-json', '--verbose', '--tools', '');
      const content = images.map(im => { const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(im.dataUrl); return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }; });
      content.push({ type: 'text', text: prompt });
      stdinText = JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';
    } else if (!tools) {   // 그림을 보지 않는 호출(revise) — 도구 없이 한 턴(빠르다)
      args.push('--tools', '', '--max-turns', '1');
      stdinText = prompt;
    } else {
      args.push('--allowedTools', 'Read', '--tools', 'Read', '--max-turns', String(2 + images.length * 2));
      stdinText = prompt;
    }
    const child = spawn('claude', args, { env: ccEnv(), cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [], err = [];
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`claude -p 시간 초과(${Math.round(timeoutMs / 1000)}s)`)); }, timeoutMs);
    // 취소(11-09 통합 — DELETE /api/freedesign/jobs/:id): 자식 claude 를 끊는다(SIGTERM → 2초 뒤 SIGKILL)
    const onAbort = () => { clearTimeout(timer); try { child.kill('SIGTERM'); } catch {} const k = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2000); k.unref?.(); reject(cancelError()); };
    signal?.addEventListener?.('abort', onAbort, { once: true });
    child.on('close', () => signal?.removeEventListener?.('abort', onAbort));
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

export const cancelError = () => Object.assign(new Error('취소됨'), { cancelled: true });

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


// ── 렌더 측정(가이드 게이트, 11-09) — scripts/lib/freedesign-renderer.mjs renderFreeAsync(헤드리스 Chrome CLI, puppeteer 불필요). Chrome 이 없으면 null(측정 생략, validate 만).
//   순환 import 라 늦게 불러온다.
let _renderer = null;
async function loadRenderer() { if (_renderer === null) { try { _renderer = await import('../scripts/lib/freedesign-renderer.mjs'); } catch (e) { console.warn('[freedesign] 렌더러 적재 실패(측정 생략):', e.message); _renderer = false; } } return _renderer || null; }
export const GATE_SKIP_LINT = new Set(['weight', 'format']);   // 용량·포맷은 내보내기(JPG/PNG 선택)에서 정해진다 — PNG 측정으로 막지 않는다(11-05 기록)
// 렌더 감사(audit) → 추천 막는 사유. 매체 규정 block · 대비(24px 이상 3:1, 그 밖 4.5:1) · 정보 블록 3항 · 간격 4항 · 그림 못 읽음
export function gateIssues(a) {
  if (!a) return [];
  const out = [];
  for (const i of a.lint?.issues ?? []) if (i.level === 'block' && !GATE_SKIP_LINT.has(i.code)) out.push(`규정 ${i.code}: ${i.msg}`);
  const byRole = Object.fromEntries((a.measure?.texts ?? []).map(t => [t.role, t]));
  for (const c of a.contrast ?? []) { if (c.ratio == null) continue; const need = (byRole[c.role]?.fontPx ?? 0) >= 24 ? 3 : 4.5; if (c.ratio < need) out.push(`대비 ${c.role} ${c.ratio}:1 < ${need}:1 — 글자 뒤 바탕을 정리(스크림·판)하거나 글자색을 바꾼다`); }
  for (const x of a.info?.issues ?? []) out.push(x);
  for (const x of a.typoRules?.issues ?? []) out.push(x);
  for (const x of a.overlap?.issues ?? []) out.push(x);   // 11-09 글자 ↔ 사진(실측 대비)·장식 겹침(core/typoaudit.js overlapAudit)
  if (a.kvLoaded === false) out.push('키비주얼 그림을 불러오지 못함');
  return out;
}
export async function measureFreeHtml(inp, html, dir, name) {
  const R = await loadRenderer(); if (!R || !R.chromeAvailable()) return null;
  const meta = inp.kv?.meta ?? {};
  const a = await R.renderFreeAsync({ specId: inp.specId, html, rules: inp.rules, brief: inp.brief ?? {}, name }, dir, { kvFocus: meta.focus ?? meta.field?.focus ?? null, kvKind: meta.field?.kind ?? meta.kind ?? null });
  const rows = a.measure ? R.typoRowsOf(a.measure, a.free) : [];
  const mainPx = rows.find(r => r.role === 'main')?.px ?? null; const sa = inp.rules?.safeArea ?? {};
  const fix = rows.length ? { rows, hi: mainPx ? typoNormsFor(inp.specId).gap.hi * mainPx : null, H: inp.rules?.h ?? SPECS[inp.specId]?.h, safe: sa.hard ? { t: sa.top, b: sa.bottom } : null, codes: (a.typoRules?.fails ?? []).map(f => f.code) } : null;
  return { png: a.png, audit: a, issues: gateIssues(a), auto: [...(a.info?.issues ?? []), ...(a.typoRules?.issues ?? [])], fix };
}
export const STACK_CODES = ['gap-tight', 'gap-loose', 'overlap'];
// 재요청에 붙이는 실측(모델은 렌더 높이를 모른다 — 잉크 상자를 알려 줘야 간격을 고친다)
export function measureLines(gate) {
  const rows = gate?.fix?.rows ?? []; if (!rows.length) return [];
  return [`(참고 실측 — 렌더된 글자 잉크 상자 px: ${rows.filter(r => r.ink).map(r => `${r.role} x${Math.round(r.ink.x)} y${Math.round(r.ink.y)}~${Math.round(r.ink.y + r.ink.h)} ${r.lines ?? '?'}줄 ${r.px}px`).join(' · ')} — 요소 top 은 잉크보다 (line-height−글자)/2 위)`];
}
// 게이트 위반 중 간격(4항-1)이 있으면 LLM 없이 스택을 다시 쌓아 본다 → 다시 측정. 반환 { html, raw, gate } | null
async function tryAutoFix(X, html, raw, gate, dir, inp, k) {
  const f = gate?.fix; if (!f || !f.codes?.some(c => STACK_CODES.includes(c))) return null;
  const opts = { rules: TYPO_RULE_FIXED, hi: f.hi, H: f.H, safe: f.safe };
  const fr = fixStack(raw, f.rows, opts); if (!fr) return null;
  const nh = substituteAssets(fr.html, X.assets);
  if (!validateFreeHtml(nh, inp).ok) return null;
  let g2; try { g2 = await X.measureFn(nh, dir, inp, `${k}f`); } catch { return null; }
  if ((g2?.issues?.length ?? 0) >= (gate.issues?.length ?? 0)) return null;   // 나아지지 않으면 버린다
  return { html: nh, raw: fr.html, gate: g2, moves: fr.moves };
}
const gateSummary = g => g ? { measured: !g.error && !!(g.audit || g.issues), issues: g.issues ?? [], error: g.error ?? null, contrast: g.audit?.contrast ?? null, verdict: g.audit?.verdict ?? null } : { measured: false, issues: [] };

// 동시 실행 상한 풀 — 결과는 입력 순서, fn 이 끝나는 순서는 자유
export async function pool(items, limit, fn, signal = null) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => { while (next < items.length && !signal?.aborted) { const k = next++; out[k] = await fn(items[k], k); } }));
  return out;
}

// 그림 dataURL ↔ 자리표시(프롬프트에 dataURL 을 넣지 않는다). kv/logo 는 {{KV}}/{{LOGO}}, 그 밖 data:image 는 {{IMG1}}…
export function stripDataUrls(html, { kv = null, logo = null } = {}) {
  let h = stripAssets(html, { kv, logo }); const map = {}; let n = 0;
  h = h.replace(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/g, m => { const key = `{{IMG${++n}}}`; map[key] = m; return key; });
  return { html: h, map };
}
export const restoreDataUrls = (html, map = {}) => Object.entries(map).reduce((h, [k, v]) => h.split(k).join(v), String(html ?? ''));

// ── 공통 엔진 준비 — 모델 호출(call: 시간·모델·종류 기록), 그림 임시 파일, 측정·렌더 함수
function engineCtx(input, { client = null, run = null, render = null, measure = null, imageMode = input.imageMode ?? IMAGE_MODE, model = null, onCall = null, allowApi = false, signal = null } = {}, { defaultModel = SUGGEST_MODEL, needTmp = true } = {}) {
  const engine = input.engine === 'api' && (API_ENGINE_ENABLED || allowApi) ? 'api' : 'claude-code';
  const images = []; if (input.kv?.dataUrl) images.push({ name: 'kv', dataUrl: input.kv.dataUrl }); if (input.logo?.dataUrl) images.push({ name: 'logo', dataUrl: input.logo.dataUrl });
  const readMode = !run && engine === 'claude-code' && imageMode === 'read';
  const tmp = needTmp && (readMode || !run) ? mkdtempSync(path.join(tmpdir(), 'freedesign-')) : null;
  const paths = {};
  if (readMode && tmp) for (const im of images) paths[im.name] = dataUrlToFile(im.dataUrl, path.join(tmp, im.name)).file;
  const useModel = model ?? input.model ?? defaultModel;
  const calls = [], usages = []; let usedModel = null;
  const base = run ?? (engine === 'api'
    ? (p, o = {}) => { if (!client) throw new Error('API 키가 없습니다(engine:api)'); return runApi(client, p, { images: o.images ?? images, model: o.model ?? useModel ?? DEFAULT_API_MODEL }); }
    : (p, o = {}) => runClaudeCode(p, { images: o.images ?? images, model: o.model ?? useModel ?? DEFAULT_CC_MODEL, imageMode, cwd: tmp ?? tmpdir(), tools: o.tools ?? true, effort: o.effort, signal }));
  const call = async (prompt, o = {}) => {
    if (signal?.aborted) throw cancelError();
    const t0 = Date.now();
    const effort = o.effort ?? (o.kind === 'retry' || o.kind === 'revise' ? (input.fastEffort ?? FAST_EFFORT) : (input.effort ?? DESIGN_EFFORT));
    const r = await base(prompt, { ...o, effort });
    const rec = { kind: o.kind ?? 'gen', style: o.style ?? null, specId: o.specId ?? input.specId ?? null, ms: r?.ms ?? (Date.now() - t0), model: r?.model ?? o.model ?? useModel ?? null, effort: engine === 'claude-code' ? effort : null, imageMode: o.images?.length ? imageMode : null };
    calls.push(rec); if (r?.usage) usages.push(r.usage); usedModel = r?.model ?? usedModel; onCall?.(rec);
    return r;
  };
  const assets = { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null };
  const imgOpt = readMode ? { kv: paths.kv ?? null, logo: paths.logo ?? null } : { inline: images.length > 0 };
  // 측정: 주입(measure) > 실제 엔진이면 헤드리스 Chrome(input.measure !== false) > 없음
  const measureFn = measure ?? (!run && input.measure !== false ? (html, dir, inp, k) => measureFreeHtml(inp, html, tmp ?? tmpdir(), `${inp.specId}-${dir?.id ?? 'x'}-${k ?? 0}-${Date.now()}`) : null);
  const renderFn = render ?? (measureFn ? (html, dir, inp) => measureFn(html, dir, inp ?? input, 'review') : null);
  const usage = () => usages.length ? usages.reduce((a, u) => { for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) if (u[k] != null) a[k] = (a[k] ?? 0) + u[k]; return a; }, {}) : null;
  return { engine, signal, images, readMode, tmp, call, calls, assets, imgOpt, measureFn, renderFn, usage, model: () => usedModel, retryModel: run ? null : (input.retryModel ?? RETRY_MODEL) };
}

// ── 한 안 — 생성 → 계약 검증 → 렌더 측정(가이드 게이트) → 걸리면 사유 + 방금 HTML 로 1회 재요청 → 그래도 걸리면 rejected. (review 가 켜져 있으면 통과 안에 자기 검토 1회)
async function designVariant(inp, dir, X, { doReview = false, onStage = null, kind = 'gen', t0 = Date.now() } = {}) {
  const tv = Date.now();
  let attempts = 0, html = null, raw = null, notes = '', errors = [], lastText = '', text = '', retryErrors = null, retryHtml = null, gate = null; const tries = [];
  while (attempts < 2) {
    // 첫 시도 = 전체 프롬프트(그림 봄). 재요청은 HTML 이 있으면 「걸린 것만 고치기」 짧은 프롬프트(그림·도구 없음, RETRY_MODEL) — 없으면 전체 다시
    const fix = attempts > 0 && retryHtml;
    const prompt = fix ? buildRevisePrompt(inp, { html: retryHtml, instruction: '검증기가 잡은 아래 문제만 고친다 — 구성·색·그래픽·문구는 그대로', retryErrors, fix: true }) : buildFreePrompt(inp, { images: X.imgOpt, retryErrors, retryHtml, style: dir });
    const r = await X.call(prompt, fix ? { images: [], tools: false, model: X.retryModel ?? undefined, kind: 'retry', style: dir?.id ?? null, specId: inp.specId } : { images: X.images, kind: attempts ? 'retry' : kind, style: dir?.id ?? null, specId: inp.specId }); attempts++;
    lastText = r.text ?? '';
    const rr = extractHtml(r.text);
    if (!rr) { errors = ['응답에 <div data-ad> HTML 블록이 없음']; tries.push({ attempt: attempts, errors, text: String(r.text ?? '').slice(0, 300) }); retryErrors = errors; continue; }
    const sub = substituteAssets(rr, X.assets);
    const v = validateFreeHtml(sub, inp);
    if (fix && raw && !/LANGUAGE\s*[:：]/i.test(r.text ?? '')) text = `${r.text}\n${(text.match(/LANGUAGE\s*[:：][^\n]*/i) ?? [''])[0]}`; else text = r.text;   // 고치기 응답엔 LANGUAGE 가 없다 — 첫 응답 것을 잇는다
    raw = rr; html = sub; notes = extractNotes(r.text) || notes; errors = v.errors; gate = null;
    if (!v.ok) { tries.push({ attempt: attempts, errors: v.errors }); retryErrors = v.errors; retryHtml = rr; continue; }
    if (X.measureFn) {
      onStage?.('review');
      try { gate = await X.measureFn(html, dir, inp, attempts); } catch (e) { gate = { error: String(e?.message ?? e), issues: [] }; }
      let gi = gate?.issues ?? [];
      if (gi.length) {   // 간격만이면 LLM 없이 스택 다시 쌓기(0초) → 다시 측정
        const af = await tryAutoFix(X, html, rr, gate, dir, inp, attempts);
        if (af) { tries.push({ attempt: attempts, errors: gi, autofix: af.moves }); html = af.html; raw = af.raw; gate = af.gate; gi = gate.issues ?? []; }
      }
      if (gi.length) { tries.push({ attempt: attempts, errors: gi }); errors = gi; retryErrors = [...gi, ...measureLines(gate)]; retryHtml = raw; continue; }
    }
    tries.push({ attempt: attempts, errors: [] });
    break;
  }
  let review = null;
  if (html && !errors.length && doReview && X.renderFn) {
    review = { issues: [], fixed: false, auto: [] };
    try {
      const rd = gate?.png ? gate : await X.renderFn(html, dir, inp);
      review.auto = rd?.auto ?? [];
      const rawHtml = stripAssets(html, X.assets);
      const pngImg = rd?.png && !X.readMode ? { name: 'png', dataUrl: `data:image/png;base64,${readFileSync(rd.png).toString('base64')}` } : null;
      const prompt = buildReviewPrompt(inp, { html: rawHtml, png: X.readMode ? rd?.png : null, auto: review.auto, style: dir });
      const r = await X.call(prompt, { images: pngImg ? [...X.images, pngImg] : X.images, kind: 'review', style: dir?.id ?? null, specId: inp.specId });
      review.issues = extractIssues(r.text);
      const fixedRaw = extractHtml(r.text);
      if (fixedRaw) {
        const fixed = substituteAssets(fixedRaw, X.assets);
        const v2 = validateFreeHtml(fixed, inp);
        let g2 = null; if (v2.ok && X.measureFn && gate) { try { g2 = await X.measureFn(fixed, dir, inp, 'r'); } catch {} }
        if (v2.ok && !(g2?.issues?.length)) { html = fixed; raw = fixedRaw; review.fixed = true; if (g2) gate = g2; const n2 = extractNotes(r.text); if (n2) notes = n2; text = r.text + '\n' + text; }
        else review.rejected = v2.ok ? g2.issues : v2.errors;
      }
    } catch (e) { review.error = String(e?.message ?? e); }
  }
  const ok = !!html && !errors.length;
  const composition = dir ? { id: dir.id, name: dir.name, hint: dir.hint ?? '' } : null;
  const language = raw ? (inp.language ? { ...inp.language } : languageOf(text, raw, { composition })) : null;
  return { id: `${inp.specId}:${dir?.id ?? 'x'}`, specId: inp.specId, style: { id: dir?.id ?? null, name: dir?.name ?? null }, html, notes, attempts, errors, ok, valid: { ok, errors }, rejected: !ok, gate: gateSummary(gate), tries, review, language, ms: Date.now() - tv, at: Date.now() - t0, lastText: ok ? undefined : lastText.slice(0, 300) };
}

const stageTimer = (onStage) => { onStage?.('kv'); const t = setTimeout(() => onStage?.('design'), 20_000); t.unref?.(); return () => clearTimeout(t); };
const resultOf = (mode, X, variants, t0, input, extra = {}) => {
  const first = variants.find(v => v.ok) ?? variants[0];
  return { mode, html: first?.html ?? null, notes: first?.notes ?? '', engine: X.engine, model: X.model(), ms: Date.now() - t0, usage: X.usage(), attempts: first?.attempts ?? 0, ok: !!first?.ok, errors: first?.errors ?? [], review: first?.review ?? null, specId: input.specId ?? null, variants,
    calls: X.calls, retries: X.calls.filter(c => c.kind === 'retry').length, firstMs: variants.length ? Math.min(...variants.map(v => v.at ?? Infinity)) : null, rejected: variants.filter(v => v.rejected).length, language: first?.language ?? null, ...extra };
};

// ── suggest(기본) — 입력(계약) → { html, notes, …, variants:[…] }. 방향(구성)마다 별도 호출을 동시에(상한 concurrency, 기본 PARALLEL=3). 끝난 순서대로 onVariant(v).
//   deps: { run(prompt,{images}) } 모델 mock · { measure(html, dir, inp) → {issues, png?, auto?} } 게이트 mock · { render(html, dir) } 자기 검토용 렌더 mock. client 는 api 엔진용(FREEDESIGN_API=1 일 때만).
//   styles 지정이 없으면 KV 유형으로 구성 3개(pickCompositions). review 는 기본 끔(속도 — 게이트가 가이드를 지킨다), true 면 통과 안마다 자기 검토 1회.
export async function freeDesign(input = {}, deps = {}) {
  const t0 = Date.now();
  const specId = input.specId; if (!specId) throw new Error('specId 가 없습니다');
  const rules = input.rules ?? rulesForSpec(specId);
  const inp = { ...input, rules, history: input.history ?? [], prev: input.prev ?? null };
  const n = typeof input.n === 'number' && input.n >= 1 ? Math.min(6, input.n) : 3;
  const styleIds = Array.isArray(input.styles) && input.styles.length ? input.styles : pickCompositions(input.kv?.meta ?? null, rules, input.n === 1 ? 1 : n);
  const styles = styleIds.map(id => styleOf(id) ?? { id: String(id), name: String(id), hint: '' });
  const X = engineCtx(inp, deps, { defaultModel: SUGGEST_MODEL });
  const stop = stageTimer(deps.onStage);
  const limit = input.parallel === false ? 1 : Math.max(1, deps.concurrency ?? PARALLEL);
  try {
    const variants = await pool(styles, limit, async dir => {
      let v;
      try { v = await designVariant(inp, dir, X, { doReview: input.review === true, onStage: deps.onStage, t0 }); }
      catch (e) { if (e?.cancelled) throw e; v = { id: `${specId}:${dir.id}`, specId, style: { id: dir.id, name: dir.name }, html: null, notes: '', attempts: 0, errors: [String(e?.message ?? e)], ok: false, valid: { ok: false, errors: [String(e?.message ?? e)] }, rejected: true, gate: gateSummary(null), review: null, language: null, ms: Date.now() - t0, at: Date.now() - t0 }; }
      deps.onVariant?.(v);
      return v;
    }, deps.signal);
    if (deps.signal?.aborted) throw cancelError();
    if (!variants.some(v => v.html)) throw new Error(`HTML 을 받지 못함(${variants.map(v => v.style.name).join('·')}): ${variants.flatMap(v => v.errors).slice(0, 3).join(' · ')} — 응답 앞부분: ${variants[0]?.lastText ?? ''}`);
    return resultOf('suggest', X, variants, t0, inp);
  } finally { stop(); if (X.tmp && !deps.keepTmp) { try { rmSync(X.tmp, { recursive: true, force: true }); } catch {} } }
}

// ── revise — 이전 HTML + 지시만. 자기 검토 없음, 검증기만, 기본 모델 sonnet, 그림 안 봄(도구 없음). 목표 ≤ 60초
export function buildRevisePrompt(input, { html, instruction, retryErrors = null, fix = false }) {
  const { specId, rules, brief = {} } = input; const sa = rules.safeArea ?? {}; const fo = rules.fonts ?? {}; const lg = rules.logo ?? {};
  const copy = copyOptions(brief);
  const L = [];
  L.push(`아래 ${rules.w}×${rules.h}px 채용 광고 HTML 을 지시대로 고쳐 **전체 HTML** 을 다시 내라. 지시 밖의 디자인(구성·색·그래픽)은 유지한다.`);
  L.push('');
  L.push(`## 지시`); L.push(`- ${String(instruction ?? '').slice(0, 600)}`);
  L.push('');
  L.push(`## 지킬 것(요약 — 어기면 반려)`);
  L.push(`- 루트 <div data-ad="1" data-spec="${specId}" data-free="1" style="position:relative;width:${rules.w}px;height:${rules.h}px;overflow:hidden;…"> 그대로. 글자 data-field 역할당 한 요소, 문구는 그대로(새 문구 금지 — 쓸 수 있는 문구: ${FIELD_ROLES.filter(r => copy[r]?.length).map(r => `${r} ${copy[r].map(s => `「${s}」`).join('/')}`).join(' · ')}).`);
  L.push(`- 안전영역 위 ${sa.top ?? 0} · 오른쪽 ${sa.right ?? 0} · 아래 ${sa.bottom ?? 0} · 왼쪽 ${sa.left ?? 0}px 안에 글자·로고.${(rules.textLimits ?? []).length ? ' 글자 수: ' + rules.textLimits.map(t => `${t.role} ${t.maxChars ?? '-'}자/${t.lines ?? '-'}줄`).join(' · ') : ''}`);
  L.push(`- 글꼴: ${fo.required ? `${fo.required} 고정` : (fo.allowed ?? []).join(', ')}.${lg.forbidden || lg.count === 0 ? ' 로고 삽입 불가.' : ''}${rules.backgroundBanned?.length ? ` 배경 금지색 ${rules.backgroundBanned.join(' ')}.` : ''}${rules.textColors?.main ? ` 메인 글자색 ${rules.textColors.main} 고정.` : ''}`);
  L.push(`- 자간은 0 또는 음수만 · 장평(scaleX/Y·font-stretch) 금지 · 정보 블록(date·detail·notice) 라벨 스타일 하나 · 간격 서브→메인 ≥ ${TYPO_RULE_FIXED.gapSubMain}em, 메인→정보 ≥ ${TYPO_RULE_FIXED.gapMainInfo}em, 정보 행 ≥ ${TYPO_RULE_FIXED.gapInfoRow}em · 글자와 키비주얼·로고 겹침 0 · 대비 4.5:1 · 글자가 사진 위로 넘어가지 않게 · 장식은 글자 획에 걸치지 않게.`);
  L.push(`- 그림 자리표시(${KV_PLACEHOLDER}·${LOGO_PLACEHOLDER}·{{IMG1}} 등)는 그대로 둔다.`);
  if (retryErrors?.length) { L.push(''); L.push(fix ? `## 다시 — 방금 결과가 검증에 걸렸다. 아래만 고친다(간격은 글자 상자 top 을 옮기고, 대비·사진 위 글자는 글자 뒤 스크림·판·글자색 또는 줄 나누기, 장식 겹침은 장식을 옮기거나 지운다)` : `## 방금 결과가 검증에 걸렸다 — 이것도 고친다`); for (const e of retryErrors) L.push(`- ${e}`); }
  L.push('');
  L.push(`## 현재 HTML`); L.push('```html'); L.push(String(html).slice(0, 60000)); L.push('```');
  L.push('');
  L.push(`응답은 \`\`\`html 코드 블록 하나와 「NOTES: 」 한 줄(무엇을 고쳤는지)만.`);
  return L.join('\n');
}
export async function freeRevise(input = {}, deps = {}) {
  const t0 = Date.now();
  const specId = input.specId; if (!specId) throw new Error('specId 가 없습니다');
  const prevHtml = input.prev?.html; if (!prevHtml) throw new Error('revise 는 prev.html 이 필요합니다');
  const instruction = input.prompt ?? [...(input.history ?? [])].reverse().find(h => h.role !== 'assistant')?.text;
  if (!instruction) throw new Error('revise 는 prompt(수정 지시)가 필요합니다');
  const rules = input.rules ?? rulesForSpec(specId);
  const inp = { ...input, rules };
  const X = engineCtx(inp, deps, { defaultModel: REVISE_MODEL, needTmp: false });
  const stop = stageTimer(deps.onStage);
  try {
    const { html: base, map } = stripDataUrls(prevHtml, X.assets);
    let attempts = 0, html = null, raw = null, notes = '', errors = [], text = '', retryErrors = null, cur = base, gate = null;
    while (attempts < 2) {
      const r = await X.call(buildRevisePrompt(inp, { html: cur, instruction, retryErrors }), { images: [], tools: false, kind: attempts ? 'retry' : 'revise' }); attempts++;
      const rr = extractHtml(r.text);
      if (!rr) { errors = ['응답에 <div data-ad> HTML 블록이 없음']; retryErrors = errors; continue; }
      const sub = restoreDataUrls(substituteAssets(rr, X.assets), map);
      const v = validateFreeHtml(sub, inp);
      raw = rr; text = r.text; html = sub; notes = extractNotes(r.text); errors = v.errors;
      if (v.ok) {
        if (input.measure === true && X.measureFn) { try { gate = await X.measureFn(html, { id: 'revise' }, inp, attempts); } catch (e) { gate = { error: e.message, issues: [] }; } if (gate?.issues?.length) { errors = gate.issues; retryErrors = errors; cur = rr; continue; } }
        break;
      }
      retryErrors = v.errors; cur = rr;
    }
    if (!html) throw new Error(`HTML 을 받지 못함(revise): ${errors.join(' · ')}`);
    const ok = !errors.length;
    const v = { id: `${specId}:revise`, specId, style: { id: 'revise', name: 'AI 수정' }, html, notes, attempts, errors, ok, valid: { ok, errors }, rejected: !ok, gate: gateSummary(gate), review: null, language: raw ? (input.language ? mergeLanguage(input.language, languageFromHtml(raw, { composition: input.language.composition ?? null })) : languageOf(text, raw)) : null, ms: Date.now() - t0, at: Date.now() - t0 };   // 고친 안의 새 모티프·라벨도 언어로(11-09 통합)
    deps.onVariant?.(v);
    return resultOf('revise', X, [v], t0, inp, { instruction });
  } finally { stop(); }
}

// ── spread — 캠페인 디자인 언어(language) + 대상 규격들 → 규격별 병렬 생성(규격 규칙·글자 수·안전영역은 규격마다). 자기 검토 없음, 게이트(검증+측정+재요청 1회)는 같다
export async function freeSpread(input = {}, deps = {}) {
  const t0 = Date.now();
  let language = input.language; if (!language || typeof language !== 'object') throw new Error('spread 는 language(캠페인 디자인 언어)가 필요합니다');
  // 앱이 언어를 못 받은 안(옛 카드·즉시 수정본)은 { fromHtml:true } + prev.html — 원안 HTML 에서 뽑아 빈 칸을 채운다(11-09 통합)
  if (input.prev?.html && (language.fromHtml || !language.ground?.css)) { const { fromHtml, ...m } = language; language = mergeLanguage(m, languageFromHtml(stripAssets(input.prev.html, { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null }), { composition: m.composition ?? null })); }
  const specIds = [...new Set((input.specIds ?? []).filter(Boolean))]; if (!specIds.length) throw new Error('spread 는 specIds 가 필요합니다');
  const dir = (language.composition?.id && compositionOf(language.composition.id)) || { id: 'spread', name: language.composition?.name ?? '펼치기', kind: 'composition', hint: language.composition?.hint ?? '', kvArea: [0.3, 0.6] };
  const X = engineCtx({ ...input, specId: specIds[0] }, deps, { defaultModel: SUGGEST_MODEL });
  const stop = stageTimer(deps.onStage);
  const limit = input.parallel === false ? 1 : Math.max(1, deps.concurrency ?? PARALLEL);
  try {
    const variants = await pool(specIds, limit, async specId => {
      let v;
      try {
        const rules = input.rulesBySpec?.[specId] ?? rulesForSpec(specId);
        const inp = { ...input, specId, rules, history: [], prev: null, language, styles: undefined };
        v = await designVariant(inp, dir, X, { onStage: deps.onStage, kind: 'spread', t0 });
      } catch (e) { if (e?.cancelled) throw e; v = { id: `${specId}:spread`, specId, style: { id: dir.id, name: dir.name }, html: null, notes: '', attempts: 0, errors: [String(e?.message ?? e)], ok: false, valid: { ok: false, errors: [String(e?.message ?? e)] }, rejected: true, gate: gateSummary(null), review: null, language, ms: Date.now() - t0, at: Date.now() - t0 }; }
      deps.onVariant?.(v);
      return v;
    }, deps.signal);
    if (deps.signal?.aborted) throw cancelError();
    return resultOf('spread', X, variants, t0, { ...input, specId: specIds[0] }, { specIds });
  } finally { stop(); if (X.tmp && !deps.keepTmp) { try { rmSync(X.tmp, { recursive: true, force: true }); } catch {} } }
}

// 모드 분기 — freejobs 가 쓴다
export function runMode(mode, body, deps) { return mode === 'revise' ? freeRevise(body, deps) : mode === 'spread' ? freeSpread(body, deps) : freeDesign(body, deps); }
