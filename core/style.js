// Campaign Style — 3경로(업로드·프리셋·AI 생성 추후) 어디서 와도 이 구조 하나로 정규화 (PRD 불변식 2)

import { FONTS } from './fonts.js';
import { buildPalette, MODES } from './palette.js';

const HEX = /^#[0-9A-Fa-f]{6}$/;

// RGB → CMYK 근사(naive). 인쇄 사양서·화면 표기용 참고값이며,
// 실제 분판은 인쇄소 ICC 프로파일 기준이다(브라우저는 CMYK를 직접 출력하지 못함).
export function toCmyk(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k), m = (1 - g - k) / (1 - k), y = (1 - b - k) / (1 - k);
  return [c, m, y, k].map(v => Math.round(v * 100));
}
export function cmykText(hex) {
  const [c, m, y, k] = toCmyk(hex);
  return `C${c} M${m} Y${y} K${k}`;
}

export function normalizeStyle(input = {}) {
  const colors = input.colors ?? [];
  for (const c of colors) {
    if (!HEX.test(c)) throw new Error(`hex 컬러 형식이 아님: ${c}`);
  }
  const mode = MODES[input.mode] ? input.mode : 'light';
  return {
    keyVisual: input.keyVisual ?? null,
    kvReadability: input.kvReadability ?? null,
    kvMeta: input.kvMeta ?? null,                 // {ar, edge} — 비율 대응·여백 색   // {banner:{text,scrim},...} — 업로드 시 앱이 측정
    mode,
    palette: buildPalette({
      primary: colors[0] ?? '#2456D6',
      secondary: colors[1],
      accent: colors[2],
      mode,
    }),
    fonts: {
      heading: FONTS[input.fonts?.heading] ? input.fonts.heading : 'Pretendard',
      body: FONTS[input.fonts?.body] ? input.fonts.body : 'Pretendard',
    },
    logo: input.logo ?? null,
    // 지면(배경) — 기본은 키비주얼에서 읽는다(core/field.js). 사람이 고정할 수 있는 것은 단색/그라데이션과 색 하나뿐이다.
    background: {
      mode: ['solid', 'gradient'].includes(input.background?.mode) ? input.background.mode : 'auto',
      color: HEX.test(input.background?.color ?? '') ? input.background.color.toUpperCase() : null,
    },
    logoLight: input.logoLight ?? null,   // 어두운 지면용(흰색) 로고 — 없으면 렌더러가 원색 로고를 반전한다(컬러 로고는 뭉개진다)
    mood: input.mood ?? [],
    presetId: input.presetId ?? null,
    // 인쇄 사양 — 근사 CMYK(사양서·미리보기 표기용)
    cmyk: {
      primary: toCmyk(colors[0] ?? '#2456D6'),
      secondary: toCmyk(buildPalette({ primary: colors[0] ?? '#2456D6', secondary: colors[1], mode }).secondary),
    },
  };
}
