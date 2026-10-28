// core/gate.js — 승인 게이트(10-20 운영 모델 §4·§5): 등급 × 규격 검사(lint) × 디자인 검수(adcheck) × 샘플 문구 → 상태 하나.
//   blocked  규격 검사 차단(매체 규정 위반) — 승인·전달 불가, 고쳐야 함
//   pending  아직 검사 안 끝남
//   review   규정은 통과했지만 사람이 봐야 함(글자-주인공 겹침·로고 가림·글자 잘림·저해상도·칩 넘침·샘플 문구) — 사유를 적고 승인 가능
//   ready    등급 A·B 가 검사 다 통과 — 「통과분 승인」 묶음에 들어간다
//   draft    등급 C(자유 배치) 또는 등급 모름 — 디자이너 수정 전제. 개별 승인만
// 원칙: 확신 없으면 내보내지 않고 표시한다(광고는 틀린 걸 내보내는 비용이 더 크다).
export const REVIEW_CODES = new Set(['text-over-subject', 'logo-covered', 'text-clipped', 'low-res', 'low-res-logo', 'chip-overflow', 'design-failed']);   // design-failed: 검수 자체가 실패 → 사람이 본다
export const STATE_LABEL = { blocked: '차단', pending: '검사 중', review: '검수 필요', ready: '승인 가능', draft: '초안' };

// guide: 가이드 검수(core/guidecheck.js evaluate) 줄 목록 — 틀 규격(templateMold)의 level 'block' 규칙(mold.*: 글자 칸 x·줄 y·크기·굵기·로고 칸·그림 칸 ±2px)이 ✗ 면 규정 위반과 같이 차단(10-28 컨시어지 #9 자소설 「규정 미준수 소재 검수 승인 오류」, 장부 mold-measured-gate)
export function approvalGate({ grade, lint, design, samples = 0, guide = null }) {
  const reasons = [];
  if (lint?.level === 'block') { for (const i of lint.issues ?? []) if (i.level === 'block') reasons.push(`규정: ${i.msg ?? i.code}`); return { state: 'blocked', reasons }; }
  const moldFails = (Array.isArray(guide) ? guide : guide?.rows ?? []).filter(r => r?.level === 'block' && r.ok === false);
  if (moldFails.length) { for (const r of moldFails) reasons.push(`틀: ${r.name ?? r.id}${r.actual != null ? ` — ${r.actual}` : ''}`); return { state: 'blocked', reasons }; }
  if (!lint) return { state: 'pending', reasons: ['규격 검사 전'] };
  const warns = (design?.warnings ?? []).filter(w => REVIEW_CODES.has(w.code));
  for (const w of warns) reasons.push(`디자인: ${w.msg ?? w.code}`);
  if (samples > 0) reasons.push(`샘플 문구 ${samples}곳 — 실제 정보로 바꿔야 함`);
  if (grade !== 'A' && grade !== 'B') return { state: 'draft', reasons: [grade === 'C' ? '자유 배치 — 디자이너 수정 전제' : '등급 없음', ...reasons] };
  if (reasons.length) return { state: 'review', reasons };
  return { state: 'ready', reasons: [] };
}
