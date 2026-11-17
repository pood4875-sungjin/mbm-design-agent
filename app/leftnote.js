// 11-17 노션 재검수 — 왼쪽 「전체 일괄」 반영 결과 안내(DOM 없음 · node 에서 시험: test/notion-fix-ui-1117.test.js)
//   반영하기 뒤 lNote 가 비어 있던 것 · 서브 문구를 반영했는데 이번 소재 어디에도 서브 자리가 없어 아무 데도 안 보이던 것
//   「자리가 있나」는 그려진 소재 html 의 data-field 로 센다(렌더러가 실제로 찍은 글자) — 매체 규칙을 따로 흉내 내지 않는다

// 왼쪽 칸(core 필드) → 소재에 찍히는 글자 요소(data-field). app.js LEFT_GROUPS·ROLE_GROUP 과 같은 묶음
export const FIELD_SLOTS = {
  headline: { name: '메인 문구', roles: ['main'] },
  subText: { name: '서브 문구', roles: ['sub'] },
  dateText: { name: '날짜', roles: ['date'] },
  role: { name: '상세 문구', roles: ['detail', 'chip', 'tags'] },
};

// 그 칸의 글자가 찍힌 소재 수(html 목록 중)
export function slotReach(f, htmls) {
  const roles = FIELD_SLOTS[f]?.roles; if (!roles) return null;
  const re = new RegExp(`data-field="(?:${roles.join('|')})"`);
  return (htmls ?? []).filter(h => re.test(String(h ?? ''))).length;
}

// 값이 있는데 이번 소재 어디에도 자리가 없으면 한 줄 — 「서브 문구는 이 캠페인 소재에 자리가 없어 보이지 않아요(28종 중 0종)」
export function missingSlotNote(f, htmls) {
  const n = (htmls ?? []).length, k = slotReach(f, htmls);
  if (!n || k == null || k > 0) return '';
  return `${FIELD_SLOTS[f].name}는 이 캠페인 소재에 자리가 없어 보이지 않아요(${n}종 중 0종)`;
}

// 반영하기 뒤 안내 — 몇 종에 반영됐는지 + 칸마다 실제로 나온 소재 수(빠진 곳)
//   impacted·conflicts: core/propagate 판정 수 · patch: 반영한 칸 · htmls: 다시 그린 뒤 광고 소재 html
export function applyNoteText({ impacted = 0, conflicts = 0, patch = {}, htmls = [] }) {
  const head = conflicts ? `${impacted}종 반영 · ${conflicts}종은 캔버스에서 따로 고친 값 유지` : `${impacted}종 모두 반영됨`;
  const n = htmls.length, parts = [];
  for (const [f, v] of Object.entries(patch)) {
    if (!FIELD_SLOTS[f] || !String(v ?? '').trim() || !n) continue;   // 비운 칸(자동으로 되돌림)은 자리 안내를 안 한다
    const k = slotReach(f, htmls);
    if (k === 0) parts.push(`${FIELD_SLOTS[f].name}는 이 캠페인 소재에 자리가 없어 보이지 않아요(${n}종 중 0종)`);
    else if (k < n) parts.push(`${FIELD_SLOTS[f].name}는 ${n}종 중 ${k}종에 나와요`);
  }
  return [head, ...parts].join(' · ');
}
