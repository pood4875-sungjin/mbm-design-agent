// 11-10 Claude 가 그림을 보고 고른 추가 시안 방향(style.aiSlots) 정리 — core/style.js·core/variants.js 공용(순환 import 피하려고 따로)
export const AI_SLOT_A = ['center', 'mirror', 'full'];
export function cleanAiSlots(x) {
  if (!x || typeof x !== 'object') return null;
  const A = AI_SLOT_A.includes(x.A) ? x.A : null;
  const B = x.B && ['both', 'date', 'label'].includes(x.B.tag) ? { tag: x.B.tag, shape: x.B.shape === 'square' ? 'square' : 'pill' } : null;
  const C = x.C && typeof x.C.light === 'boolean' ? { light: x.C.light } : null;
  return A || B || C ? { ...(A ? { A } : {}), ...(B ? { B } : {}), ...(C ? { C } : {}) } : null;
}
