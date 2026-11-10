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
import { createContext, migrateRecruitCore } from '../core/context.js';
import { copyFor, copyLadder, seasonSubOf } from '../core/renderers/ad.js';
import { limitsByRole, inImage, countChars } from '../core/adfields.js';
import { FONTS, DEFAULT_FONT, fontIds, isBundledFont, fontRuleOf, effectiveFontId } from '../core/fonts.js';
import { safeAreaOf } from '../core/trackb/prompt.js';
import { TEMPLATE_NORMS } from '../core/template-norms.js';
import { typoNormsFor, TYPO_RULE_FIXED, BP } from '../core/typoaudit.js';
import { kvTypeOf } from '../core/kvtypes.js';
import { languageLines, languageOf, languageFromHtml, mergeLanguage } from '../core/freelang.js';
import { fixStack, fixStackCandidates, fixLogoGap, fixKvGap, fixLogoPlate, fixTextSize, fixContrast, fixLogoSize } from '../core/freequick.js';
import { profileFocus } from '../core/field.js';

// 주인공 상자(원본 비율) — 앱 디자인 검수(core/adcheck.js)와 같은 profileFocus(meta.field). 사진에 focus 가 없으면 줄·열 프로필로 어림한 상자
export function focusOf(meta) { try { if (meta?.field) return profileFocus(meta.field) ?? null; } catch {} return meta?.focus ?? null; }
const r2 = v => Math.round(v * 100) / 100;

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
    hint: '키비주얼이 지면 전체를 덮는다 — 사진·바탕 있는 그림은 background-size:cover 로 캔버스 전체(주인공이 잘리지 않게 background-position 을 주인공 쪽으로), 누끼는 지면 높이 90~130%로 크게 키워 한 변 밖으로 흘린다. 글자는 그림의 빈 쪽(하늘·바닥·여백) 위에 올리고, 가독은 단색→투명 스크림 한 장 또는 글자 뒤 반투명 판 하나로. 주인공 얼굴·몸통 위 글자 금지. 그림 비율이 지면과 많이 달라도 그림을 작은 상자에 넣고 옆에 회색·단색 띠를 남기지 않는다(cover 로 채우거나, 한쪽에 붙이고 가장자리색으로 녹인다 — 11-09 r1 1080 에서 띠 남긴 안 2점).' },
  { id: 'motif', name: '그래픽 모티프 지면', kind: 'composition', kvArea: [0.3, 0.45],
    hint: '키비주얼에서 뽑은 모양(원·호·띠·격자·물결·별·셀 등 그림의 형태 언어)과 대표색으로 인라인 SVG(또는 CSS 도형)를 만들어 지면에 반복·확대 배치한다 — 최소 2개 요소가 리듬을 이룬다. 키비주얼은 캔버스 30~45% 중간 크기로 모티프와 엮는다(모티프가 그림 뒤를 지나가거나 그림을 감싼다). 모티프 도형은 글자 덩어리(글자 상자 + 여백 0.5em)와 겹치지 않게 비운 자리에 둔다 — 도형 가장자리·선이 글자를 가로지르면 반려(11-09 r2 반려 1위). 글자 전체를 덮는 넓은 바탕 면은 예외.' },
  { id: 'typehero', name: '타이포 주도 + 키비주얼 작게', kind: 'composition', kvArea: [0.15, 0.25],
    hint: '메인 글자가 지면의 주인 — 분포 상위 이상으로 크게(메인 글자 덩어리 높이가 캔버스 짧은 변의 30~45%), 강조 한 단어는 색 또는 태그. 키비주얼은 캔버스 15~25%로 작게 — 원형·라운드 창, 글자 줄 끝에 붙는 스티커, 또는 메인 글자와 맞물리게. 지면은 단색 또는 아주 약한 같은 색상 그라데이션.' },
  { id: 'diagonal', name: '분할 대각·곡선', kind: 'composition', kvArea: [0.35, 0.55],
    hint: '지면을 대각선(15~35°) 또는 큰 곡선(호)으로 두 면으로 나눈다(clip-path polygon 또는 인라인 SVG path). 한 면 = 키비주얼 면(사진·바탕 있는 그림은 이 면 안에만 clip-path 로 cover — 주인공이 면 안에 온전히), 다른 면 = **글자 면: 단색 또는 같은 색 2색 그라데이션만**(사진·패턴·도형이 글자 아래를 지나가지 않는다). 글자 상자(가장 긴 줄 끝까지)는 전부 글자 면 안, 사선 경계에서 메인 글자 1em 이상 떨어뜨린다 — 사선이 글자 쪽으로 기울어 끝 글자가 사진 위로 넘어가면 반려. 키비주얼 면은 사진으로 꽉 채운다(면 안에 회색·단색 빈 띠 금지 — 11-09 r2). 누끼만 경계선을 넘어 걸쳐 두 면을 잇는다. 장식 원·도형은 키비주얼 면 쪽에만. 세로 직선 50:50 분할은 금지.' },
  { id: 'frame', name: '카드·프레임', kind: 'composition', kvArea: [0.4, 0.6],
    hint: '지면 위에 라운드 카드(창) 하나를 띄우고 키비주얼을 카드 안에 cover 로 담는다(radius 16~32px, 얇은 테두리 또는 부드러운 그림자). 글자는 카드 밖 지면 또는 카드 아래 띠에. 카드는 캔버스의 40~60%, 살짝 기울이거나 두 장을 겹쳐도 좋다. 누끼는 카드 밖으로 머리·몸 일부가 튀어나오게.' },
  { id: 'axis', name: '가운데 축(대칭)', kind: 'composition', kvArea: [0.4, 0.6],
    hint: '글자(서브·메인·정보 블록)를 **한 덩어리로** 가운데 정렬해 위 또는 아래 한쪽에만 모으고(키비주얼 위아래로 글자를 나누면 간격 규칙에 걸려 반려) 키비주얼을 가운데 축에 크게 세운다(캔버스 40~60%). 좌우 대칭의 안정감 — 정보 블록도 가운데 정렬(라벨 규칙은 그대로). 배경은 주인공 뒤 후광(원형 그라데이션)이나 바닥 그림자로 깊이를 준다.' },
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
  else if (kind === 'cutout') ids = character ? ['axis', 'motif', 'typehero'] : ['motif', 'typehero', 'axis'];   // 11-09 6단계 r1: 누끼 전면(bleed)은 1/6 통과(주인공이 글자와 겹치거나 아래가 뚝 잘림) → 가운데 축
  else ids = ['typehero', 'motif', 'diagonal'];
  const ar = rules?.w && rules?.h ? rules.w / rules.h : 1;
  const swap = (from, to) => { const i = ids.indexOf(from); if (i >= 0 && !ids.includes(to)) ids[i] = to; };
  const swapAny = (from, tos) => { const i = ids.indexOf(from); if (i < 0) return; const to = tos.find(t => !ids.includes(t)); if (to) ids[i] = to; };
  if (ar >= 3) { swapAny('axis', ['typehero', 'motif', 'diagonal', 'bleed']); swap('frame', 'motif'); }
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
    `- 글자 ↔ 키비주얼(누끼 주인공)·로고: 겹침 0 · 거리 ≥ 메인 px × ${F.assetGap}(참고: 키비주얼과 너무 멀면(규격 긴 변 ${F.assetGapMaxFrac * 100}% 넘게) 비어 보일 수 있다 — 반려는 안 함)`,
    `- 로고 폭 ≤ 메인 글자 px × ${F.logoMaxMain} — 로고가 메인보다 커 보이면 ✗(자동으로 줄인다)`,
    `- 가장 작은 글자(고지 제외) ≥ ${Math.max(10, Math.round(S * 0.022))}px — 정보 블록(날짜·직무)도 이보다 작으면 ✗`,
    `- 잘림 · 규격 밖 · 안전영역 밖 0 (참고: 낱말 안 줄바꿈은 피한다 — 한글도 어절 끝에서 <br>. 반려는 안 함)`,
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
    const oneRow = rows.length >= 2 && rows.every(r => r.f.ink) && rows.every(r => Math.abs(r.f.ink.y - rows[0].f.ink.y) < Math.min(...rows.map(x => x.f.fontPx || 16)) * 0.5);   // 가로 1행(구분선형) — 라벨 폭·값 x 는 열이 아니다(11-09 r1 오탐)
    if (labs.length >= 2 && !oneRow) {
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
// 호출 시간 상한(11-09 6단계 r2: sonnet 재요청 한 번이 508s — 3안 전체가 592s). 재요청은 넘기면 그 안을 반려로 끝낸다
export const RETRY_TIMEOUT_MS = Number(process.env.FREEDESIGN_RETRY_TIMEOUT_MS ?? 120_000);
export const GEN_TIMEOUT_MS = Number(process.env.FREEDESIGN_GEN_TIMEOUT_MS ?? 420_000);
export const IMAGE_MODE = process.env.FREEDESIGN_IMAGE_MODE ?? 'stream';
// 생각 길이(--effort) — 11-09 실측: revise 프롬프트 sonnet 기본 80s → low 21s(출력 1.8k 토큰). 설계(suggest·spread)도 low(11-09 6단계 r2), 고치기(revise·재요청) low
export const CC_SYSTEM = '너는 채용 광고 소재를 HTML/CSS 로 디자인하는 아트디렉터다. 도구나 스킬을 쓰지 않고, 사용자 메시지가 정한 출력 형식(```html 코드 블록 + NOTES 등)으로만 답한다.';
export const DESIGN_EFFORT = process.env.FREEDESIGN_EFFORT ?? 'low';   // 11-09 6단계 r2: medium → low 로 첫 카드 117→76s · 3안 229→171s, 눈 점수 3.46→3.61(프롬프트·게이트 고침 포함) — 떨어지지 않아 low
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
// 11-10 사용자 「맞춰줘」 — AI 문구 후보도 룰 렌더와 같은 규칙(docs/ai-rule-layers.md K1): 서브 = 추가 문구(subText)만, 연도는 메인에 한 번,
//   자소설만 추가 문구가 비면 서브 = 시즌(그때 메인 후보는 연도 없는 것), 상세엔 「시즌 + 채용구분」·슬로건 안 씀, 모집직무가 채용 구분에 든 말이면 상세 없음(결정 ②)
export function copyOptions(brief = {}, specId = null) {
  const b = migrateRecruitCore(brief ?? {}) ?? {};   // 옛 slogan → subText, 고용형태·근무지 → 추가 행
  const ctx = createContext(b, 'recruit'); const c = copyFor(ctx);
  const uniq = a => a.filter(s => s && String(s).trim()).map(s => String(s).trim()).filter((s, i, arr) => arr.indexOf(s) === i);
  const mains = uniq([c.mainWide, c.main, c.mainNarrow]);
  const sea = seasonSubOf(b, /^jasoseol-/.test(String(specId ?? '')));
  const yr = sea?.match(/(?:19|20)\d{2}/)?.[0];
  const roleRow = copyLadder(ctx).details.find(d => d.label === '모집직무');
  return {
    main: sea ? (mains.filter(m => !m.includes(yr)).length ? mains.filter(m => !m.includes(yr)) : mains) : mains,
    sub: uniq([b.subText, sea, c.sub]),
    date: c.date ? uniq([`${c.label ?? '접수기간'} ${c.date}`, `모집기간 ${c.date}`, c.date]) : [],
    detail: roleRow ? uniq([`모집직무 ${roleRow.value}`, roleRow.value]) : [],
    notice: b.notice ? [String(b.notice).trim()] : [],
    advertiser: c.advertiser ?? b.client ?? '',
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
  const copy = copyOptions(brief, specId);
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
  else if (logo?.dataUrl) {
    const lc = (logo.colors ?? []).filter(c => c?.hex);
    L.push(`- 로고: 최대 ${lg.count ?? 1}개${lg.w || lg.h ? ` · 크기 ${lg.w ?? '?'}×${lg.h ?? '?'}px` : ''} · 원본 비율 유지(object-fit:contain) · 안전영역 안 · 톤 ${logo.tone === 'light' ? '밝음(어두운 바탕 필요)' : '어두움/유색(밝은 바탕 필요)'}${lc.length ? ` · 로고 색 ${lc.map(c => `${c.hex} ${Math.round((c.share ?? 0) * 100)}%`).join(' · ')}` : ''}`);
    L.push(`  - **로고가 바탕에 묻히면 반려**(검증기가 로고 픽셀마다 바로 아래 바탕과 대비를 잰다 — 픽셀 절반 이상이 2:1 이상). ${lc.length >= 2 && lc.some(c => /^#F[0-9A-F]F[0-9A-F]F[0-9A-F]$/i.test(c.hex)) && lc.some(c => !/^#F/i.test(c.hex)) ? '흰색과 진한 색이 섞인 로고 — 흰 부분과 진한 부분이 모두 보이는 중간 톤(브랜드 원색·채도 있는 색) 바탕, 또는 로고 뒤에 그런 색 판을 둔다. 흰 지면·크림 지면 위에 그대로 두지 않는다.' : '로고 톤과 반대 밝기의 바탕에 둔다.'}`);
  }
  else L.push(`- 로고: 없음 — data-logo 요소를 만들지 않는다.`);
  if (rules.background) L.push(`- 배경 규정: ${String(rules.background).slice(0, 500)}`);
  if (rules.backgroundBanned?.length) L.push(`- **배경 금지색**: ${rules.backgroundBanned.join(' ')} (같은 색은 반려 — 근접색도 피한다)`);
  if (rules.textColors?.main) L.push(`- 글자색 규정: 메인 ${rules.textColors.main}${rules.textColors.sub?.length ? ` · 서브 ${rules.textColors.sub.join('/')}` : ''} — 정확히 이 hex`);
  if (rules.textColorsUniform) L.push(`- 모든 글자 한 색(고지 제외)`);
  if (rules.mold?.note) L.push(`- 공식 템플릿 실측(참고 — 자리 감각만, 그대로 베끼지 않는다): ${rules.mold.note}`);
  for (const n of rules.notes ?? []) L.push(`- ${n}`);
  L.push('');
  L.push(`## 브리프 (글은 아래 것만 — 지어내거나 바꾸지 않는다)`);
  L.push(`- 고객사: ${brief.client ?? ''}${brief.hiringType ? ` · 채용 종류: ${brief.hiringType}` : ''}${brief.season ? ` · 시즌: ${brief.season}(연도는 광고 전체에 한 번 — 아래 문구 후보에 이미 있으면 다른 데 또 쓰지 않는다)` : ''}`);
  if (brief.role) L.push(`- 모집 직무: ${brief.role}`);
  if (brief.startDate || brief.deadline) L.push(`- 접수: ${brief.startDate ?? ''} ~ ${brief.deadline ?? ''}${brief.deadlineTime ? ` ${brief.deadlineTime}` : ''}`);
  { const ex = String(brief.subText ?? brief.slogan ?? '').trim(); if (ex) L.push(`- 추가 문구(서브 자리에만): ${ex}`); }
  if (brief.notice) L.push(`- 고지(토씨 하나 못 바꿈): ${brief.notice}`);
  L.push(`- 역할별 쓸 수 있는 문구(각 역할에 정확히 이 중 하나, 줄바꿈만 <br> 로 네가 정한다):`);
  for (const role of FIELD_ROLES) if (copy[role]?.length) L.push(`  - ${role}: ${copy[role].map(s => `「${s}」`).join(' / ')}${role === 'main' ? ` — 고객사 이름 「${copy.advertiser}」이 반드시 보인다` : ''}`);
  L.push(`  - main${copy.date.length ? '·date' : ''} 는 필수, 나머지는 지면이 허락할 때만.`);
  L.push('');
  L.push(`## 키비주얼`);
  if (kv?.dataUrl || images.kv) {
    const px = Array.isArray(kvMeta.px) ? `${kvMeta.px[0]}×${kvMeta.px[1]}px` : '';
    const fc0 = focusOf(kvMeta); const fc = fc0 ? { x: r2(fc0.x), y: r2(fc0.y), w: r2(fc0.w), h: r2(fc0.h) } : null;
    L.push(`- 유형 ${kvKindLabel(f.kind ?? kvMeta.kind)} · 원본 ${px} 비율 ${kvMeta.ar ? Number(kvMeta.ar).toFixed(3) : '?'}${kvMeta.colors?.length ? ` · 대표색 ${kvMeta.colors.join(' ')}` : ''}${kvMeta.edge ? ` · 가장자리색 ${kvMeta.edge}` : ''}${f.lum != null ? ` · 밝기 ${f.lum}` : ''}${fc ? ` · 주인공 위치(원본 비율) 중심 (${fc.x}, ${fc.y}) 크기 ${fc.w}×${fc.h}` : ''}`);
    if (images.kv) L.push(`- 그림 파일: ${images.kv} — **먼저 Read 도구로 열어 눈으로 본 뒤** 디자인한다.`);
    else if (images.inline) L.push(`- 그림은 첫 번째 이미지로 첨부했다.`);
    if (fc) {   // 11-09 6단계: 앱 디자인 검수와 같은 판정을 게이트가 실측 — 주인공 상자를 지면 좌표로 환산해 글자·로고를 피한다
      L.push(`- **주인공 상자**(원본 그림 비율 0~1): x ${r2(fc.x - fc.w / 2)}~${r2(fc.x + fc.w / 2)} · y ${r2(fc.y - fc.h / 2)}~${r2(fc.y + fc.h / 2)}. 그림을 그린 위치·크기(cover·position)로 지면 좌표에 환산해, **글자 잉크가 이 상자와 15% 이상 겹치거나 로고가 5% 넘게 겹치면 반려**(검증기가 렌더로 실측 — 앱 디자인 검수와 같은 기준). 검증기는 키비주얼 요소 상자와 background-size·position(또는 object-fit)으로 그림이 그려진 자리를 잰다 — clip-path·mask 로 가린 부분도 그림으로 센다. 그러니 그림을 한 면에만 두려면 **요소 상자 자체를 그 면 크기로** 만들거나 background-size·position 으로 그 면에만 그린다.`);
      if ((f.opaque ?? 1) >= 0.5 && fc.w * fc.h >= 0.55) L.push(`- 이 그림은 주인공이 그림의 ${Math.round(fc.w * fc.h * 100)}%를 차지한다 — 그림을 지면 전체에 깔고 그 위에 글자를 올리면 반려된다. 그림은 지면의 한쪽(55~70%)만 덮게 놓고(background-size 를 높이 또는 폭 100% 로, position 을 한쪽 끝으로), 나머지는 그림 가장자리색 단색 면으로 마스크(mask-image) 녹여 잇고, 글자·로고는 그 단색 면에만.`);
    }
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
    L.push(`   - 글자 상자(가장 긴 줄 끝까지)가 사진 위로 넘어가지 않게 — 넘으면 줄을 나누거나 글자 뒤에 판·스크림. 장식(SVG 도형·별·선·원·호·물결)은 글자 덩어리 밖에 — 도형의 가장자리·선이 글자 상자를 지나가면 반려(검증기가 글자 없는 렌더로 실측). 큰 원·호를 글자 뒤로 걸치는 연출은 쓰지 않는다.`);
  } else {
  L.push(`2. 키비주얼이 작거나 허전하지 않게 — 캔버스의 35~55%를 차지하게, 누끼는 지면 높이의 70% 이상, 사진·일러스트는 한 변으로 흘려도 된다(잘리는 몫 ≤ 30%). 주인공 위에는 글자를 올리지 않는다.`);
  L.push(`3. 이음이 자연스럽게 — 키비주얼과 지면 사이는 같은 계열 색·한 방향 그라데이션·마스크(mask-image 의 linear-gradient)로 잇는다. 테두리가 뚝 끊겨 보이면 안 된다. 글자 가독을 위한 스크림은 단색→투명 linear-gradient 한 장까지.`);
  L.push(`4. 배경은 네 디자인이지만 절제한다 — 단색 또는 같은 색상의 2색 그라데이션(각도 하나). 비는 곳은 장식이 아니라 키비주얼·글자를 키워 채운다.`);
  L.push(`5. 대비 — 글자와 그 바로 아래 바탕의 대비 4.5:1 이상. 글자는 흰 또는 #111 단색, 강조는 브랜드 포인트색 한 단어까지.`);
  }
  const nl = normsLine(specId, rules.w, rules.h); if (nl) L.push(`6. 청사진 분포 참고 — ${nl}.`);
  if (input.language) {
    L.push(''); L.push(...languageLines(input.language)); L.push(`- 이 규격의 비율·안전영역·글자 수에 맞게 자리와 크기만 새로 짠다. ${COMPOSITION_BAN}`);
    const lc = input.language.composition?.id;
    if (lc === 'diagonal') L.push(`- 분할 대각 구성을 이 비율로 옮길 때(11-09 펼치기 반려 잦음): 사선 각도는 규격에 맞게 다시 정한다(가로 띠는 거의 세로에 가까운 짧은 사선, 세로형은 가로에 가까운 사선). 글자 면은 단색(또는 같은 색 그라데이션)만 — 사진·장식이 글자 아래로 지나가지 않게, 글자 상자는 사선에서 메인 1em 이상 떨어뜨린다. 글자 덩어리가 들어갈 단색 면이 모자라면 사선을 키비주얼 쪽으로 민다.`);
    else if (lc === 'bleed') L.push(`- 전면 구성을 이 비율로 옮길 때: 글자 쪽은 스크림·판으로 가독을 먼저 확보하고, 주인공 상자(위 키비주얼 줄)와 글자·로고가 겹치지 않게 그림 position 을 다시 정한다.`);
  }
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

// ── 문구 자동 고침(11-09 6단계 r3) — 「브리프 문구가 아님」만 걸렸을 때, 그 역할 글을 가장 가까운 허용 문구로 바꾼다. 라벨(첫 자식 span/b)은 두고 값만.
export const isCopyError = e => /^(main|sub|date|detail) 문구 「[\s\S]*」 — 브리프 문구가 아님/.test(String(e));
const bigrams = t => { const x = squash(t); const out = new Set(); for (let i = 0; i < x.length - 1; i++) out.add(x.slice(i, i + 2)); return out; };
const simOf = (a, b) => { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let k = 0; for (const g of A) if (B.has(g)) k++; return 2 * k / (A.size + B.size); };
export function fixCopy(html, brief, errors, specId = null) {
  let h = String(html ?? ''); const copy = copyOptions(brief, specId);
  for (const role of new Set(errors.map(e => /^(\w+) 문구/.exec(e)?.[1]).filter(Boolean))) {
    const opts = copy[role] ?? []; if (!opts.length) return null;
    const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*data-field="${role}"[^>]*>)([\\s\\S]*?)(</\\2>)`, 'i'); const m = re.exec(h); if (!m) return null;
    const inner = m[3], cur = textOfField(inner).replace(/\n/g, ' ');
    const target = [...opts].sort((a, b) => simOf(b, cur) - simOf(a, cur))[0]; if (simOf(target, cur) < 0.3) return null;
    const lab = /^\s*<(span|b|strong|em|i)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(inner);
    let next;
    if (lab) {
      const L = lab[2].replace(/<[^>]+>/g, '').trim(); const sq = squash(target), sl = squash(L);
      let value = target; if (sl && sq.startsWith(sl)) { let i = 0, k = 0; while (k < sl.length && i < target.length) { if (squash(target[i])) k++; i++; } value = target.slice(i).trim(); }
      const rest = inner.slice(lab[0].length); const vm = /^(\s*<(span|b|strong|em|i)\b[^>]*>)[\s\S]*?(<\/\2>\s*)$/i.exec(rest);
      next = lab[0] + (vm ? vm[1] + esc(value) + vm[3] : esc(value));
    } else next = esc(target);
    h = h.slice(0, m.index) + m[1] + next + m[4] + h.slice(m.index + m[0].length);
  }
  return h;
}

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
  const copy = copyOptions(brief, specId);
  for (const f of fields) {
    if (!f.text.trim()) { errors.push(`${f.role} 글자가 비어 있음`); continue; }
    if (f.role === 'main' && copy.advertiser && !squash(f.text).includes(squash(copy.advertiser))) errors.push(`main 에 고객사 이름 「${copy.advertiser}」이 없음`);
    if (f.role === 'notice' && copy.notice[0] && squash(f.text) !== squash(copy.notice[0])) errors.push('notice 문구가 브리프와 다름(토씨 하나 못 바꿈)');
    const opts = copy[f.role] ?? [];
    if (opts.length && !opts.some(o => squash(o) === squash(f.text))) errors.push(`${f.role} 문구 「${f.text.replace(/\n/g, ' ')}」 — 브리프 문구가 아님(허용: ${opts.map(o => `「${o}」`).join(' / ')})`);
  }  // 11-10 연도 한 번(L1 year-once — 룰 렌더와 같은 규칙): 같은 연도가 메인·서브·상세에 두 번 이상이면 반려
  { const yc = {}; for (const f of fields) for (const y of f.text.match(/(?:19|20)\d{2}/g) ?? []) yc[y] = (yc[y] ?? 0) + 1;
    for (const [y, n] of Object.entries(yc)) if (n > 1) errors.push(`연도 「${y}」가 ${n}번 — 메인에 한 번만(서브·상세에 또 쓰지 않는다)`); }

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
  if (logo?.dataUrl && logoCount === 0 && !(rules.logo?.forbidden || rules.logo?.count === 0)) errors.push('로고 요소(<img data-logo="1">)가 없음 — 로고를 넣는다(로고 톤에 맞는 바탕 위나 판 위에)');   // 11-09 6단계 r1: 흰 로고를 밝은 지면에서 빼 버린 안 2건
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
    const sys = [];   // 11-09 7단계: stream-json 의 system 이벤트(api_retry 등) — 시간 초과가 계정 한도(429)·과부하(529) 재시도인지 가린다
    const sysNote = () => { const r = sys.filter(e => e.subtype && e.subtype !== 'init'); if (!r.length) return ''; const last = r[r.length - 1]; return ` · ${r.length}회 ${last.subtype}${last.error_status ?? last.status ? ' ' + (last.error_status ?? last.status) : ''}${last.error ? ' ' + String(last.error).slice(0, 60) : ''}`; };
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Object.assign(new Error(`claude -p 시간 초과(${Math.round(timeoutMs / 1000)}s)${sysNote()}`), { system: sys.slice(-5) })); }, timeoutMs);
    // 취소(11-09 통합 — DELETE /api/freedesign/jobs/:id): 자식 claude 를 끊는다(SIGTERM → 2초 뒤 SIGKILL)
    const onAbort = () => { clearTimeout(timer); try { child.kill('SIGTERM'); } catch {} const k = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2000); k.unref?.(); reject(cancelError()); };
    signal?.addEventListener?.('abort', onAbort, { once: true });
    child.on('close', () => signal?.removeEventListener?.('abort', onAbort));
    let buf = '';
    child.stdout.on('data', d => { out.push(d); if (imageMode !== 'stream') return; buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (line.startsWith('{"type":"system"')) { try { const o = JSON.parse(line); sys.push({ subtype: o.subtype, status: o.status ?? null, error_status: o.error_status ?? null, error: o.error ?? null, attempt: o.attempt ?? null, retry_delay_ms: o.retry_delay_ms ?? null, at: Date.now() - t0 }); } catch {} } } });
    child.stderr.on('data', d => err.push(d));
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
      const retries = sys.filter(e => e.subtype && e.subtype !== 'init');
      resolve({ text, usage: res.usage ?? null, model: Object.keys(res.modelUsage ?? {})[0] ?? model ?? null, cost: res.total_cost_usd ?? null, raw: res, ms: Date.now() - t0, apiRetries: retries.length ? retries.slice(-5) : null });
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
export const MIN_TEXT_FRAC = 0.022;   // 가장 작은 글자(고지 제외) 하한 = √(w·h) × 2.2% — 580×400 11px · 1080 24px · 300×250 6px→ 10px 바닥
export const minTextPx = sp => Math.max(10, Math.round(Math.sqrt(sp.w * sp.h) * MIN_TEXT_FRAC));
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
  for (const x of a.subject?.issues ?? []) out.push(x);
  for (const x of a.logoIssues ?? []) out.push(x);
  { const W = a.measure?.w, H = a.measure?.h; const sp = SPECS[a.specId]; const S = sp ? Math.sqrt(sp.w * sp.h) : null;   // 11-09 6단계 r1: 1080 에서 정보 글자 14~18px(읽히지 않음)이 추천됐다
    if (S) for (const t of a.measure?.texts ?? []) if (t.role !== 'notice' && t.fontPx && t.fontPx < minTextPx(sp)) out.push(`4항-3 tiny: ${t.role} 글자 ${Math.round(t.fontPx)}px < 최소 ${minTextPx(sp)}px(이 규격 √면적의 ${Math.round(MIN_TEXT_FRAC * 1000) / 10}%) — 정보 글자를 키운다`); }   // 11-09 6단계: 로고가 바탕에 묻힘(흰 로고 · 밝은 지면)   // 11-09 6단계: 앱 디자인 검수(core/adcheck.js)와 같은 「글자-주인공 15% · 로고 가림 5%」 — 앱에서만 잡혀 경고 카드로 추천되던 것
  for (const x of a.overlap?.issues ?? []) out.push(x);   // 11-09 글자 ↔ 사진(실측 대비)·장식 겹침(core/typoaudit.js overlapAudit)
  if (a.kvLoaded === false) out.push('키비주얼 그림을 불러오지 못함');
  return out;
}
export async function measureFreeHtml(inp, html, dir, name) {
  const R = await loadRenderer(); if (!R || !R.chromeAvailable()) return null;
  const meta = inp.kv?.meta ?? {};
  const a = await R.renderFreeAsync({ specId: inp.specId, html, rules: inp.rules, brief: inp.brief ?? {}, name }, dir, { kvFocus: meta.focus ?? meta.field?.focus ?? null, kvKind: meta.field?.kind ?? meta.kind ?? null, kvMeta: meta.field ? meta : null });
  const rows = a.measure ? R.typoRowsOf(a.measure, a.free) : [];
  const mainPx = rows.find(r => r.role === 'main')?.px ?? null; const sa = inp.rules?.safeArea ?? {};
  const fix = rows.length ? { rows, hi: mainPx ? typoNormsFor(inp.specId).gap.hi * mainPx : null, H: inp.rules?.h ?? SPECS[inp.specId]?.h, safe: sa.hard ? { t: sa.top, b: sa.bottom } : null, codes: (a.typoRules?.fails ?? []).map(f => f.code), logo: a.measure?.logo?.bbox ?? null, want: mainPx ? mainPx * TYPO_RULE_FIXED.assetGap : null, contrast: a.contrast ?? null, subject: a.subject?.m?.subjects?.[0] ?? null, cap: Math.max(inp.rules?.w ?? 0, inp.rules?.h ?? 0) * TYPO_RULE_FIXED.assetGapMaxFrac || null } : null;
  return { png: a.png, audit: a, issues: gateIssues(a), auto: [...(a.info?.issues ?? []), ...(a.typoRules?.issues ?? [])], fix };
}
export const STACK_CODES = ['gap-tight', 'gap-loose', 'overlap'];
export const STACK_TRIES = Number(process.env.FREEDESIGN_STACK_TRIES ?? 4);   // 스택 후보 측정 상한(1회 ≈ 3~8s)
export const isStackIssue = s => /^4항-1 (gap-tight|gap-loose|overlap)\b|^3항 행 간격/.test(String(s));
// 재요청에 붙이는 실측(모델은 렌더 높이를 모른다 — 잉크 상자를 알려 줘야 간격을 고친다)
export function measureLines(gate) {
  const rows = gate?.fix?.rows ?? []; if (!rows.length) return [];
  const subs = gate?.audit?.subject?.m?.subjects ?? [];
  return [`(참고 실측 — 렌더된 글자 잉크 상자 px: ${rows.filter(r => r.ink).map(r => `${r.role} x${Math.round(r.ink.x)} y${Math.round(r.ink.y)}~${Math.round(r.ink.y + r.ink.h)} 폭${Math.round(r.ink.w)} ${r.lines ?? '?'}줄 ${r.px}px`).join(' · ')} — 요소 top 은 잉크보다 (line-height−글자)/2 위)`,
    ...(subs.length && gate?.audit?.subject?.fails?.length ? [`(참고 실측 — 지면 위 주인공 상자 px: ${subs.map(b => `x${b.x}~${b.x + b.w} y${b.y}~${b.y + b.h}`).join(' · ')} — 글자 잉크·로고가 이 상자와 겹치지 않게)`] : [])];
}
// 게이트 위반 중 간격(4항-1)·로고 간격(4항-2 asset-tight 로고)이 있으면 LLM 없이 옮겨 본다 → 다시 측정. 반환 { html, raw, gate, moves } | null
//   한 번에 하나씩(스택 → 로고), 고칠 때마다 다시 잰다. 채택: 「고치려던 위반은 줄고 그 밖 위반은 늘지 않음」(11-09 6단계 — 총 개수로 보면 다른 사유 1건 때문에 버려졌다)
// 스택 위·아래 장애물(주인공 상자·로고) — 글자 덩어리와 가로로 겹치고 덩어리 아래(위)에 있는 것의 경계 − 간격 하한(11-09 r2: 간격 고치다 글자가 아래 카드 사진 위로 밀려 버려졌다)
export function stackBounds(f) {
  const ink = (f?.rows ?? []).filter(r => r.ink).map(r => r.ink); if (!ink.length) return {};
  const T = Math.min(...ink.map(b => b.y)), B = Math.max(...ink.map(b => b.y + b.h)), L = Math.min(...ink.map(b => b.x)), R = Math.max(...ink.map(b => b.x + b.w)), g = f.want ?? 0;
  const xo = b => Math.min(R, b.x + b.w) - Math.max(L, b.x) > 0;
  const obs = [f.subject, f.logo].filter(b => b && b.w > 0 && xo(b));
  const below = obs.filter(b => b.y >= B - 2).map(b => b.y - g), above = obs.filter(b => b.y + b.h <= T + 2).map(b => b.y + b.h + g);
  return { floor: below.length ? Math.max(B, Math.min(...below)) : null, ceil: above.length ? Math.min(T, Math.max(...above)) : null };   // 이미 그 안쪽이면 지금 자리까지만 막는다
}
export const isLogoGapIssue = s => /^4항-2 asset-tight: 글자·로고/.test(String(s));
export const isContrastIssue = s => /^대비 \w+ [\d.]+:1 </.test(String(s));
export const isTinyIssue = s => /^4항-3 tiny/.test(String(s));
export const isLogoBuried = s => /^로고 묻힘/.test(String(s));
export const isKvGapIssue = s => /^4항-2 (kv-overlap|asset-tight: 글자·키비주얼)/.test(String(s));   // asset-loose 는 11-10 부터 참고(반려 안 함)
export const isLogoBigIssue = s => /^4항-2 logo-big/.test(String(s));
export async function tryAutoFix(X, html, raw, gate, dir, inp, k, restore = h => h) {
  let cur = { html, raw, gate }; const moves = []; let n = 0;
  const steps = [
    { is: isTinyIssue, later: x => isStackIssue(x) || isLogoGapIssue(x) || isKvGapIssue(x), run: (r, f) => { const sp = SPECS[inp.specId]; const need = sp ? minTextPx(sp) : null; const small = (f.rows ?? []).filter(x => x.role !== 'notice' && x.px && need && x.px < need); return small.length ? fixTextSize(r, Object.fromEntries(small.map(x => [x.role, Math.min(1.6, (need + 0.5) / x.px)]))) : null; } },
    { is: isContrastIssue, run: (r, f) => { const bad = (cur.gate.issues ?? []).filter(isContrastIssue).map(x => /^대비 (\w+)/.exec(x)?.[1]).filter(Boolean); const by = {}; for (const role of bad) { const c = (f.contrast ?? []).find(x => x.role === role); if (c?.bg == null) continue; by[role] = (1.05 / (c.bg + 0.05)) >= ((c.bg + 0.05) / 0.0555) ? '#FFFFFF' : '#111111'; } return Object.keys(by).length ? fixContrast(r, by, inp.rules) : null; } },
    { is: isStackIssue, tries: STACK_TRIES, run: (r, f) => { const sp = SPECS[inp.specId]; return fixStackCandidates(r, f.rows, { rules: TYPO_RULE_FIXED, hi: f.hi, H: f.H, safe: f.safe, obstacles: [f.subject, f.logo], want: f.want ?? 0, minPx: sp ? minTextPx(sp) : 0, legacy: stackBounds(f) }); } },   // 11-09 7단계: 후보 여러 개(붙는 쪽·글자 한 단계 축소) 중 게이트가 고른다
    { is: isLogoGapIssue, run: (r, f) => f.logo && f.want ? fixLogoGap(r, f.rows, f.logo, { want: f.want, H: f.H, safe: f.safe }) : null },
    { is: isLogoBuried, run: r => (inp.logo?.colors ?? []).length ? fixLogoPlate(r, inp.logo.colors, [inp.brand?.primary, inp.brand?.secondary, ...(inp.kv?.meta?.colors ?? [])]) : null },
    { is: isKvGapIssue, run: (r, f) => f.subject && f.want ? fixKvGap(r, f.rows, f.subject, { want: f.want, cap: f.cap }) : null },
    { is: isLogoBigIssue, run: (r, f) => { const main = (f.rows ?? []).find(x => x.role === 'main'); return f.logo && main?.px ? fixLogoSize(r, f.logo, main.px * TYPO_RULE_FIXED.logoMaxMain) : null; } },
  ];
  for (const st of steps) {
    const f = cur.gate?.fix; if (!f || !(cur.gate.issues ?? []).some(st.is)) continue;
    const got = st.run(cur.raw, f); const cands = (Array.isArray(got) ? got : [got]).filter(Boolean).slice(0, st.tries ?? 1);
    const split = g => { const is = (g?.issues ?? []).filter(x => !st.later?.(x)); const t = is.filter(st.is).length; return { t, other: is.length - t }; };   // later = 뒤 단계가 고칠 위반(글자 키우면 생기는 간격)은 셈에서 뺀다
    let best = null;
    for (const fr of cands) {   // 후보는 차례로 재서 「고치려던 위반 0 · 그 밖 안 늘어남」이면 바로, 아니면 줄어든 것 중 가장 적은 것
      const nh = restore(substituteAssets(fr.html, X.assets));
      if (!validateFreeHtml(nh, inp).ok) continue;
      let g2; try { g2 = await X.measureFn(nh, dir, inp, `${k}f${++n}`); } catch { continue; }
      const b = split(cur.gate), a = split(g2);
      if (!(a.t < b.t && a.other <= b.other)) continue;
      if (!best || a.t + a.other < best.score) best = { fr, nh, g2, score: a.t + a.other };
      if (a.t === 0 && a.other <= b.other) break;
    }
    if (!best) continue;
    cur = { html: best.nh, raw: best.fr.html, gate: best.g2 }; moves.push(...best.fr.moves);
  }
  return moves.length && (cur.gate.issues?.length ?? 0) <= (gate.issues?.length ?? 0) ? { ...cur, moves } : null;
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
    : (p, o = {}) => runClaudeCode(p, { images: o.images ?? images, model: o.model ?? useModel ?? DEFAULT_CC_MODEL, imageMode, cwd: tmp ?? tmpdir(), tools: o.tools ?? true, effort: o.effort, signal: o.signal ?? signal, timeoutMs: o.kind === 'retry' ? RETRY_TIMEOUT_MS : GEN_TIMEOUT_MS }));
  const call = async (prompt, o = {}) => {
    const sig = o.signal ?? signal;
    if (sig?.aborted) throw cancelError();
    const t0 = Date.now();
    const effort = o.effort ?? (o.kind === 'retry' || o.kind === 'revise' ? (input.fastEffort ?? FAST_EFFORT) : (input.effort ?? DESIGN_EFFORT));
    let r;
    try { r = await base(prompt, { ...o, effort, signal: sig }); }
    catch (e) { const rec = { kind: o.kind ?? 'gen', style: o.style ?? null, specId: o.specId ?? input.specId ?? null, ms: Date.now() - t0, model: o.model ?? useModel ?? null, ...(e?.cancelled ? { cancelled: true } : { failed: String(e?.message ?? e).slice(0, 80) }) }; calls.push(rec); onCall?.(rec); throw e; }   // 11-09 7단계: 끊은 예비·시간 초과 호출도 센다(계정 사용량)   // 11-09 7단계: 3안이 차서 끊은 예비 안 호출도 센다(계정 사용량)
    const rec = { ...(r?.apiRetries ? { apiRetries: r.apiRetries.length, apiLast: r.apiRetries[r.apiRetries.length - 1] } : {}), kind: o.kind ?? 'gen', style: o.style ?? null, specId: o.specId ?? input.specId ?? null, ms: r?.ms ?? (Date.now() - t0), model: r?.model ?? o.model ?? useModel ?? null, effort: engine === 'claude-code' ? effort : null, imageMode: o.images?.length ? imageMode : null };
    calls.push(rec); if (r?.usage) usages.push(r.usage); usedModel = r?.model ?? usedModel; onCall?.(rec);
    return r;
  };
  const assets = { kv: input.kv?.dataUrl ?? null, logo: input.logo?.dataUrl ?? null };
  const imgOpt = readMode ? { kv: paths.kv ?? null, logo: paths.logo ?? null } : { inline: images.length > 0 };
  // 측정: 주입(measure) > 실제 엔진이면 헤드리스 Chrome(input.measure !== false) > 없음
  const measureFn = measure ?? (!run && input.measure !== false ? (html, dir, inp, k) => measureFreeHtml(inp, html, tmp ?? tmpdir(), `${inp.specId}-${dir?.id ?? 'x'}-${k ?? 0}-${Date.now()}`) : null);
  const renderFn = render ?? (measureFn ? (html, dir, inp) => measureFn(html, dir, inp ?? input, 'review') : null);
  const usage = () => usages.length ? usages.reduce((a, u) => { for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) if (u[k] != null) a[k] = (a[k] ?? 0) + u[k]; return a; }, {}) : null;
  return { stub: !!run, engine, signal, images, readMode, tmp, call, calls, assets, imgOpt, measureFn, renderFn, usage, model: () => usedModel, retryModel: run ? null : (input.retryModel ?? RETRY_MODEL) };
}

// ── 한 안 — 생성 → 계약 검증 → 렌더 측정(가이드 게이트) → 걸리면 사유 + 방금 HTML 로 1회 재요청 → 그래도 걸리면 rejected. (review 가 켜져 있으면 통과 안에 자기 검토 1회)
// 셋째 시도 — 둘째에도 걸렸지만 사유가 THIRD_MAX_ISSUES 이하(자동 고침 뒤)이고 작업 시작부터 THIRD_BUDGET_MS 안이면 sonnet 고치기 1회 더. r3 실측(재요청 1회): 안 통과율 56%, 3안 다 나온 작업 2/16
export const THIRD_BUDGET_MS = Number(process.env.FREEDESIGN_THIRD_BUDGET_MS ?? 150_000), THIRD_MAX_ISSUES = 3;
const thirdTry = (inp, X, retryHtml, retryErrors, t0) => (X.stub ? inp.thirdTry === true : inp.thirdTry !== false) && !!retryHtml && (retryErrors ?? []).filter(e => !/^\(참고 실측/.test(e)).length <= THIRD_MAX_ISSUES && Date.now() - t0 < THIRD_BUDGET_MS;
async function designVariant(inp, dir, X, { doReview = false, onStage = null, kind = 'gen', t0 = Date.now(), signal = null, onRisk = null } = {}) {
  const tv = Date.now();
  let attempts = 0, html = null, raw = null, notes = '', errors = [], lastText = '', text = '', retryErrors = null, retryHtml = null, gate = null; const tries = [];
  while (attempts < 2 || (attempts < 3 && thirdTry(inp, X, retryHtml, retryErrors, t0))) {   // 11-09 6단계: 걸린 게 몇 개뿐이고 시간 여유가 있으면 「걸린 것만 고치기」 한 번 더(3안 보장)
    // 첫 시도 = 전체 프롬프트(그림 봄). 재요청은 HTML 이 있으면 「걸린 것만 고치기」 짧은 프롬프트(그림·도구 없음, RETRY_MODEL) — 없으면 전체 다시
    if (attempts > 0) onRisk?.();   // 첫 시도가 걸림 — 예비 안을 깨울 신호(11-09 7단계)
    const fix = attempts > 0 && retryHtml;
    const prompt = fix ? buildRevisePrompt(inp, { html: retryHtml, instruction: '검증기가 잡은 아래 문제만 고친다 — 구성·색·그래픽·문구는 그대로', retryErrors, fix: true }) : buildFreePrompt(inp, { images: X.imgOpt, retryErrors, retryHtml, style: dir });
    const r = await X.call(prompt, fix ? { images: [], tools: false, model: X.retryModel ?? undefined, kind: 'retry', style: dir?.id ?? null, specId: inp.specId, signal } : { images: X.images, kind: attempts ? 'retry' : kind, style: dir?.id ?? null, specId: inp.specId, signal }); attempts++;
    lastText = r.text ?? '';
    let rr = extractHtml(r.text);
    if (!rr) { errors = ['응답에 <div data-ad> HTML 블록이 없음']; tries.push({ attempt: attempts, errors, text: String(r.text ?? '').slice(0, 300) }); retryErrors = errors; continue; }
    let sub = substituteAssets(rr, X.assets);
    let v = validateFreeHtml(sub, inp);
    if (!v.ok && v.errors.every(isCopyError)) {   // 문구만 틀렸으면(브리프 문구 아님) 가장 가까운 허용 문구로 바꿔 끼운다 — 0초(11-09 r3: 첫 시도 3안 중 2안이 직무 문구를 줄여 써 통째로 버려졌다)
      const fc = fixCopy(rr, inp.brief ?? {}, v.errors, inp.specId); if (fc) { const s2 = substituteAssets(fc, X.assets); const v2 = validateFreeHtml(s2, inp); if (v2.ok) { tries.push({ attempt: attempts, errors: v.errors, autofix: [{ role: 'copy' }] }); rr = fc; sub = s2; v = v2; } }
    }
    if (fix && raw && !/LANGUAGE\s*[:：]/i.test(r.text ?? '')) text = `${r.text}\n${(text.match(/LANGUAGE\s*[:：][^\n]*/i) ?? [''])[0]}`; else text = r.text;   // 고치기 응답엔 LANGUAGE 가 없다 — 첫 응답 것을 잇는다
    raw = rr; html = sub; notes = extractNotes(r.text) || notes; errors = v.errors; gate = null;
    if (!v.ok) { tries.push({ attempt: attempts, errors: v.errors }); retryErrors = v.errors; retryHtml = rr; continue; }
    if (X.measureFn) {
      onStage?.('review');
      if (signal?.aborted) throw cancelError();
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
export const SPARE = Math.max(0, Number(process.env.FREEDESIGN_SPARE ?? 2) || 0);   // r4: 1 → 8/16(설계 시간 초과 15안) → r5 부터 2(staged 라 필요할 때만 띄움)   // 11-09 7단계: 3안 보장 = 과생성(서로 다른 구성 n+SPARE 안 → 게이트 통과 안 중 먼저 끝난 n안만 노출)
// 예비를 언제 띄우나: 'staged'(기본) = n안 먼저, 어느 안이 첫 시도에 걸리거나(재요청) 반려되거나 SPARE_AFTER_MS 안에 n안이 안 차면 예비 1개씩 / 'eager' = 처음부터 n+SPARE 동시.
//   11-09 r4 실측: 같은 계정에서 opus 설계 4개를 동시에 돌리면 호출마다 느려진다(혼자 91s → 4개 동시 236~244s, api_retry 없음 = 계정 처리량 나눠 씀) — 처음부터 4개면 첫 카드가 늦다.
export const SPARE_MODE = process.env.FREEDESIGN_SPARE_MODE ?? 'staged';
export const SPARE_AFTER_MS = Number(process.env.FREEDESIGN_SPARE_AFTER_MS ?? 150_000);
export async function freeDesign(input = {}, deps = {}) {
  const t0 = Date.now();
  const specId = input.specId; if (!specId) throw new Error('specId 가 없습니다');
  const rules = input.rules ?? rulesForSpec(specId);
  const inp = { ...input, rules, history: input.history ?? [], prev: input.prev ?? null };
  const n = typeof input.n === 'number' && input.n >= 1 ? Math.min(6, input.n) : 3;
  const given = Array.isArray(input.styles) && input.styles.length;
  // 예비 안: 방향을 지정하지 않은 여러 안 제안일 때만(지정 방향·1안은 그대로). r3 실측 안 통과율 56~67% → 3안 다 나온 작업 2~3/16
  const spare = given || n < 2 ? 0 : Math.max(0, Math.min(3, Number(input.spare ?? SPARE) || 0));
  const styleIds = given ? input.styles : pickCompositions(input.kv?.meta ?? null, rules, input.n === 1 ? 1 : n + spare);
  const styles = styleIds.map(id => styleOf(id) ?? { id: String(id), name: String(id), hint: '' });
  const want = spare ? Math.min(n, styles.length) : styles.length;
  const mode = input.spareMode ?? SPARE_MODE;
  const X = engineCtx(inp, deps, { defaultModel: SUGGEST_MODEL });
  const stop = stageTimer(deps.onStage);
  const limit = input.parallel === false ? 1 : Math.max(1, deps.concurrency ?? (spare ? Math.max(PARALLEL, styles.length) : PARALLEL));
  // 예비 끊기: 통과 안이 want 개 차면 남은 안(설계·재요청 중인 claude 자식)을 끊어 계정 사용량을 아낀다. 작업 취소(deps.signal)도 같이 전달
  const enough = new AbortController(); const onJobAbort = () => enough.abort(); deps.signal?.addEventListener?.('abort', onJobAbort, { once: true }); if (deps.signal?.aborted) enough.abort();
  const shown = [], held = [], extra = [], cut = [], spareStarts = []; let passed = 0;
  const emit = v => { shown.push(v); deps.onVariant?.(v); };
  const head = spare && mode === 'staged' && input.parallel !== false ? styles.slice(0, want) : styles, tail = head === styles ? [] : styles.slice(want);
  const tasks = []; let nextSpare = 0, timer = null;
  const startSpare = why => { if (enough.signal.aborted || nextSpare >= tail.length || passed >= want) return; const dir = tail[nextSpare++]; spareStarts.push({ id: dir.id, why, at: Date.now() - t0 }); tasks.push(runOne(dir)); };
  async function runOne(dir) {
    let v;
    try { v = await designVariant(inp, dir, X, { doReview: input.review === true, onStage: deps.onStage, t0, signal: enough.signal, onRisk: () => startSpare('retry') }); }
    catch (e) {
      if (e?.cancelled && deps.signal?.aborted) throw e;
      if (e?.cancelled) { cut.push({ id: `${specId}:${dir.id}`, style: { id: dir.id, name: dir.name }, cancelled: true, at: Date.now() - t0 }); return null; }
      v = { id: `${specId}:${dir.id}`, specId, style: { id: dir.id, name: dir.name }, html: null, notes: '', attempts: 0, errors: [String(e?.message ?? e)], ok: false, valid: { ok: false, errors: [String(e?.message ?? e)] }, rejected: true, gate: gateSummary(null), review: null, language: null, ms: Date.now() - t0, at: Date.now() - t0 };
    }
    if (!spare) { emit(v); return v; }   // 예비 없음(방향 지정·1안) — 예전처럼 끝난 순서대로 전부
    if (v.ok && passed < want) { passed++; emit(v); if (passed >= want) enough.abort(); }
    else if (v.ok) extra.push(v);   // 끊기 전에 이미 끝난 통과 안 — 예비로 둔다
    else { held.push(v); startSpare('rejected'); }   // 반려는 붙잡아 둔다(예비가 메우면 안 보임)
    return v;
  }
  try {
    if (!tail.length) await pool(styles, limit, runOne, enough.signal);
    else {
      // 느린 설계 가리기(hedge): SPARE_AFTER_MS 에 아직 설계 응답이 없는 안 수만큼(모자란 안 수까지) 예비를 띄운다 — r4: 설계 호출이 시간대에 따라 86s~420s+
      timer = setTimeout(() => { const settled = new Set([...shown, ...held, ...extra].map(v => v?.id)); const slow = head.filter(d => !settled.has(`${specId}:${d.id}`) && !X.calls.some(c => c.style === d.id && c.kind === 'gen' && !c.cancelled && !c.failed)).length; for (let i = 0; i < Math.max(1, Math.min(slow, want - passed)); i++) startSpare('slow'); }, SPARE_AFTER_MS); timer.unref?.();
      tasks.push(...head.map(d => runOne(d)));
      for (let k = 0; k < tasks.length; k++) await tasks[k];   // 도는 중에 예비가 더해질 수 있다
      clearTimeout(timer);
      for (const d of tail.slice(nextSpare)) cut.push({ id: `${specId}:${d.id}`, style: { id: d.id, name: d.name }, cancelled: true, notStarted: true, at: Date.now() - t0 });
    }
    if (deps.signal?.aborted) throw cancelError();
    if (spare && passed < want) for (const v of held.splice(0, want - passed)) emit(v);   // 다 돌았는데 모자라면 반려 안을 (숨김 카드로) 보내 「N안 제외」 안내
    const all = [...shown, ...extra, ...held];
    if (!all.some(v => v.html)) throw new Error(`HTML 을 받지 못함(${styles.map(s => s.name).join('·')}): ${all.flatMap(v => v.errors ?? []).slice(0, 3).join(' · ')} — 응답 앞부분: ${all[0]?.lastText ?? ''}`);
    const order = v => styles.findIndex(d => `${specId}:${d.id}` === v.id);   // 결과 variants 는 방향 순서(partial 은 끝난 순서)
    return resultOf('suggest', X, [...shown].sort((x, y) => order(x) - order(y)), t0, inp, { spares: [...extra, ...held], cut, spareStarts, made: styles.length - cut.length, planned: styles.length, want, spareMode: tail.length ? 'staged' : spare ? 'eager' : null });
  } finally { clearTimeout(timer); stop(); deps.signal?.removeEventListener?.('abort', onJobAbort); if (X.tmp && !deps.keepTmp) { try { rmSync(X.tmp, { recursive: true, force: true }); } catch {} } }
}

// ── revise — 이전 HTML + 지시만. 자기 검토 없음, 검증기만, 기본 모델 sonnet, 그림 안 봄(도구 없음). 목표 ≤ 60초
export function buildRevisePrompt(input, { html, instruction, retryErrors = null, fix = false }) {
  const { specId, rules, brief = {} } = input; const sa = rules.safeArea ?? {}; const fo = rules.fonts ?? {}; const lg = rules.logo ?? {};
  const copy = copyOptions(brief, specId);
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
  // 11-09 r4: 「글자가 키비주얼 상자 위」를 고치며 정보 값을 줄바꿈 → 라벨 위/아래로 쌓거나 값 둘째 줄이 라벨 x 로 돌아가 「3항 값 시작 x 다름」으로 다시 반려(3안 중 3)
  if (fix && (retryErrors ?? []).some(e => /text-over-kvbox|word-break|4항-3 clip|낱말 안 줄바꿈/.test(e))) L.push('- 정보 행(date·detail)은 **라벨 | 값 두 칸** 그대로: 라벨 폭·값 시작 x 를 다른 행과 같게 두고, 값이 길면 값 칸에 max-width 를 줘 값 칸 안에서만 줄바꿈(둘째 줄도 값 첫 글자 x, word-break:keep-all). 라벨을 값 위로 올리거나 값을 라벨 아래 x 로 내리지 않는다 — 공간이 모자라면 정보 글자를 한 단계 줄이거나 덩어리를 키비주얼 반대쪽으로 옮긴다.');
  if (retryErrors?.length) { L.push(''); L.push(fix ? `## 다시 — 방금 결과가 검증에 걸렸다. 아래만 고친다(간격은 글자 상자 top 을 옮기고, 대비·사진 위 글자는 글자 뒤 스크림·판·글자색 또는 줄 나누기, 장식 겹침은 장식을 옮기거나 지운다, 주인공 겹침·로고 가림은 글자·로고를 실측 주인공 상자 밖으로 옮기거나 그림 background-position·size 를 바꿔 주인공을 비킨다)` : `## 방금 결과가 검증에 걸렸다 — 이것도 고친다`); for (const e of retryErrors) L.push(`- ${e}`); }
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
        // 11-09 6단계: AI 수정본도 게이트(기본 켬 — r1 수정 3건 중 2건이 대비·간격 위반인 채 카드로 왔다). 자동 고침(0초) 먼저, 남으면 LLM 1회
        if (input.measure !== false && X.measureFn) {
          try { gate = await X.measureFn(html, { id: 'revise' }, inp, attempts); } catch (e) { gate = { error: e.message, issues: [] }; }
          if (gate?.issues?.length) { const af = await tryAutoFix(X, html, rr, gate, { id: 'revise' }, inp, `v${attempts}`, h => restoreDataUrls(h, map)); if (af) { html = af.html; raw = af.raw; gate = af.gate; } }
          if (gate?.issues?.length) { errors = gate.issues; if (attempts < 2) { retryErrors = [...errors, ...measureLines(gate)]; cur = raw; continue; } }
        }
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
