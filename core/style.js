// Campaign Style — 3경로(업로드·프리셋·AI 생성 추후) 어디서 와도 이 구조 하나로 정규화 (PRD 불변식 2)

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function normalizeStyle(input = {}) {
  const colors = input.colors ?? [];
  for (const c of colors) {
    if (!HEX.test(c)) throw new Error(`hex 컬러 형식이 아님: ${c}`);
  }
  return {
    keyVisual: input.keyVisual ?? null,
    palette: {
      primary: colors[0] ?? '#2456D6',
      bg: colors[1] ?? '#FFFFFF',
      ink: colors[2] ?? '#1A1A1A',
    },
    fonts: {
      heading: input.fonts?.heading ?? 'Pretendard',
      body: input.fonts?.body ?? 'Pretendard',
    },
    logo: input.logo ?? null,
    mood: input.mood ?? [],
    presetId: input.presetId ?? null,
  };
}
