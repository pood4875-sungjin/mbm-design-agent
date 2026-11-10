#!/usr/bin/env node
// 규칙 층 분류 초안 — ref/learned/rules.json 의 규칙마다 「어느 층인가」와 「AI 트랙에서 어떻게 쓰나」를 정한다(docs/ai-rule-layers.md).
//   node scripts/rule-layers.mjs          층별 개수 + AI 쓰임별 개수
//   node scripts/rule-layers.mjs --list   층별 규칙 id 목록
//   node scripts/rule-layers.mjs --json   { id: { layer, ai, why } }
// 초안이다: 묶음(category) 기본값 + 아래 OVERRIDE. 사용자 확인 뒤 rules.json 에 layer·ai 칸으로 옮기고 이 표는 지운다.
//
// 층: L0 매체 규정(공식) · L1 공통 원칙(정보·가독·그림 보존 — 두 트랙 다) · M 공용 측정(그림·로고를 재는 법 — AI 에겐 입력)
//     L2 룰 트랙 레시피(수치·배치·틀 — AI 에겐 참고) · L3 AI 전용(장부 밖 docs/freedesign-rules.md → 장부로 옮길 것)
// AI 쓰임: block(어기면 반려) · fix(자동 고침 후 재측정, 남으면 block) · input(프롬프트에 측정값으로) · hint(참고 수치·분포) · off(AI 와 무관)
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rules = JSON.parse(readFileSync(resolve(ROOT, 'ref/learned/rules.json'), 'utf8')).rules.filter(r => r.status !== 'reverted');

const BY_CATEGORY = {
  '매체 규정': ['L0', 'block'], '유형 판정': ['M', 'input'], '누끼·로고 손질': ['M', 'input'],
  '배치·비중': ['L2', 'hint'], '자르기·블리드': ['L2', 'hint'], '지면 색': ['L2', 'hint'], '이음·녹임': ['L2', 'hint'],
  '글자 색·스크림': ['L2', 'hint'], '타이포': ['L2', 'hint'], '로고': ['L2', 'hint'], '자동 검사': ['L1', 'block'],
};
const L1 = (ai, ids, why) => ids.map(id => [id, ['L1', ai, why]]);
const L2 = (ai, ids, why) => ids.map(id => [id, ['L2', ai, why]]);
export const OVERRIDE = Object.fromEntries([
  // 정보 정확성 — 지어내지 않기·빠뜨리지 않기·같은 말 두 번 금지(AI 문구 화이트리스트 copyOptions 가 지켜야 함)
  ...L1('block', ['required-date', 'keep-info', 'hire-no-auto', 'season-slogan-no-default', 'year-once', 'label-no-double', 'label-role-dedup', 'schedule-note-date', 'deadline-time', 'main-keep-client', 'mold-client-first', 'no-cta', 'count-chars-invisible'], '정보 정확성'),
  // 가독 — 대비·작은 글자·사진 위 글자
  ...L1('fix', ['small-dark-weight', 'date-box-text-contrast', 'check-busy-under-text'], '가독(대비)'),
  // 11-10 사용자 결정 ②: 「낱말 안 줄바꿈 금지」·「사진 위 글자 스크림 필수」는 AI 에 강제 안 함 → 룰 레시피(L2 참고). 대비 자체는 L1(AI 게이트 대비 검사)
  ...L2('hint', ['photo-text-scrim', 'orphan-glue', 'middot-keep', 'client-keep', 'long-word-syllable-break', 'slash-split-word', 'word-width-check'], '사용자 11-10 「안 지켜도 됨」(AI) — 룰 트랙은 그대로'),
  // 11-10 사용자 결정 ④ 「지키면 좋을듯」: 로고 비중 상한은 두 트랙 다(AI 게이트 4항-2 logo-big → 자동 축소)
  ...L1('fix', ['logo-cap'], '로고 비중 상한(사용자 11-10)'),
  // 그림 보존 — 주인공 가림·잘림·흐림·로고 가림
  ...L1('block', ['logo-upscale-cap'], '그림·로고 보존'),
  ...L2('hint', ['logo-right-col-below'], '배치 방법 — 결과(로고 가림)는 check-logo-covered 가 L1'),
  ...L2('off', ['mold-text-rows', 'mold-logo-box', 'mold-image-box', 'mold-measured-gate', 'tpl-pass', 'tpl-norm'], '룰 트랙 틀·시안 틀 검사'),
  ...[['check-profile-focus', ['M', 'input', '주인공 어림 방법']], ['check-subject-tolerance', ['M', 'input', '잘림 여유 — 측정 방법']], ['remember-bg-banned-same-only-1028', ['L0', 'block', '리멤버 배경 금지색(규정)']]],
  // 자동 검사 중 룰 트랙 운영용(AI 와 무관하거나 참고)
  ...[['check-warn-only', ['L1', 'off', '집계 방식']], ['ship-rules-grade-a', ['L0', 'off', '출고 체크리스트']], ['quality-audit-loop', ['L2', 'off', '룰 트랙 품질 루프']],
    ['check-empty-band', ['L2', 'hint', '빈 띠 — 자유 구성은 여백이 의도일 수 있음']], ['check-short-melt', ['L2', 'hint', '녹임 길이 — 룰 트랙 레시피']], ['check-band-seam', ['L2', 'hint', '이음 — 룰 트랙']],
    ['check-low-res', ['L1', 'fix', '흐림(참고)']], ['object-rects-melt-right', ['M', 'off', '측정 파서']], ['approval-gate', ['L1', 'block', '승인 게이트 — 두 트랙 같은 길']]],
  // 「매체 규정」 묶음 안에서 공식 규정이 아니라 샘플 틀·디자이너 실측에서 온 것 → AI 에겐 참고(L2). 규정 매체의 틀 칸은 C1 결정 전까지 참고
  ...L2('hint', ['jasoseol-weights', 'jasoseol-typo', 'everytime-main-800', 'everytime-tracking', 'google-main-px', 'google-object-ratio', 'google-slots', 'media-weights-win', 'sample-text-layer', 'jobda-date-above', 'template-mold-media-4', 'kakao-mold-1016', 'naver-da-labelcol-1016', 'mold-client-len', 'detail-short-before-drop', 'gdn-930-image-right'], '샘플 틀·실측(공식 아님)'),
  ...[['file-name-human', ['L0', 'off', '내보내기']], ['asset-bg-composite', ['L0', 'off', '내보내기']], ['everytime-extract-5-1028', ['L0', 'off', '추출 목록']], ['google-gdn-930-extract-1028', ['L0', 'off', '추출 목록']]],
]);

export function layerOf(r) {
  const [layer, ai, why] = OVERRIDE[r.id] ?? BY_CATEGORY[r.category] ?? ['L2', 'hint'];
  return { layer, ai, why: why ?? `묶음 기본(${r.category})` };
}

const out = Object.fromEntries(rules.map(r => [r.id, layerOf(r)]));
const unknown = Object.keys(OVERRIDE).filter(id => !out[id]);
if (unknown.length) console.error('OVERRIDE 에 없는 id:', unknown.join(', '));
const arg = process.argv.slice(2);
if (arg.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
const LAYERS = ['L0', 'L1', 'M', 'L2'], AIS = ['block', 'fix', 'input', 'hint', 'off'];
console.log(`| 층 | 규칙 | ${AIS.join(' | ')} |\n|---|---|${AIS.map(() => '---').join('|')}|`);
for (const L of LAYERS) { const rs = Object.values(out).filter(x => x.layer === L); console.log(`| ${L} | ${rs.length} | ${AIS.map(a => rs.filter(x => x.ai === a).length).join(' | ')} |`); }
console.log(`| 합계 | ${rules.length} | ${AIS.map(a => Object.values(out).filter(x => x.ai === a).length).join(' | ')} |`);
if (arg.includes('--list')) for (const L of LAYERS) console.log(`\n${L}: ${Object.entries(out).filter(([, x]) => x.layer === L).map(([id, x]) => `${id}(${x.ai})`).join(' · ')}`);
