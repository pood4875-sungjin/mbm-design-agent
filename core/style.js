// Campaign Style — 3경로(업로드·프리셋·AI 생성 추후) 어디서 와도 이 구조 하나로 정규화 (PRD 불변식 2)

import { FONTS } from './fonts.js';
import { buildPalette, MODES } from './palette.js';
import { applyKvTypeOverride, isKvTypeOverride } from './kvtypes.js';
import { PRESETS, PRESET_KEYS } from './editlayout.js';

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
    // 키비주얼 유형 직접 지정(10-12 결정 5) — null = 자동. 유형 id(photo …) 또는 세분 유형 id(photo-portrait …). 렌더러·검수는 지정을 입힌 kvMeta 를 본다
    kvTypeOverride: isKvTypeOverride(input.kvTypeOverride) ? input.kvTypeOverride : null,
    kvMeta: applyKvTypeOverride(input.kvMeta ?? null, isKvTypeOverride(input.kvTypeOverride) ? input.kvTypeOverride : null),                 // {ar, edge} — 비율 대응·여백 색   // {banner:{text,scrim},...} — 업로드 시 앱이 측정
    // 사진 쓰임 — auto: 한쪽 칸에 넣고 지면으로 녹인다(한독) · full: 지면 전체에 깔고 글자 쪽에 스크림(코엑스·원광대병원·호반). 담당자가 고른다 — 자동으로 켜면 다른 유형과 충돌한다
    kvUse: ['full', 'part'].includes(input.kvUse) ? input.kvUse : 'auto',
    // 오브젝트 누끼(선택) — 투명 PNG 필수 자리·상자 자리에만 쓰는 두 번째 그림. 키비주얼은 배경 노릇을 그대로 한다(2026-10-06)
    object: input.object ?? null,
    objectMeta: input.objectMeta ?? null,
    mode,
    palette: buildPalette({
      primary: colors[0] ?? '#2456D6',
      secondary: colors[1],
      accent: colors[2],
      mode,
    }),
    fonts: {
      heading: FONTS[input.fonts?.heading] ? input.fonts.heading : 'KakaoBigSans',   // 10-15 밤: 기본 카카오 빅산스(규정 매체는 렌더러가 Pretendard 강제)
      body: FONTS[input.fonts?.body] ? input.fonts.body : 'KakaoBigSans',
    },
    logo: input.logo ?? null,
    // 지면(배경) — 기본은 키비주얼에서 읽는다(core/field.js). 사람이 고정할 수 있는 것은 단색/그라데이션과 색 하나뿐이다.
    background: {
      mode: ['solid', 'gradient'].includes(input.background?.mode) ? input.background.mode : 'auto',
      color: HEX.test(input.background?.color ?? '') ? input.background.color.toUpperCase() : null,
    },
    // 상세 라벨 알약 톤 — 'tint'(기본: 밝은 지면 검정 7%·어두운 지면 흰 20%, 코엑스 카드 '모집분야') · 'brand'(브랜드색 채움, 구글 예시 일화·비씨) · 'plain'(알약 없이 굵은 글자). 10-06 사용자 "찐한 노랑 말고 진한 노랑/블랙 7%"
    chipTone: ['tint', 'brand', 'plain'].includes(input.chipTone) ? input.chipTone : 'tint',
    // 메인 두 톤 강조색(선택, 기본 없음) — 사람이 브랜드 보조색을 적어 줄 때만(Figma 9월 공채 #00FFE2·#0026B3). 짐작하지 않는다: palette.accent(자동 생성)와 다르다.
    // 렌더러는 지면 대비 4.5:1 이상일 때만 메인 속 채용구분에 쓴다(core/canon.js mainAccent)
    accent: HEX.test(input.accent ?? '') ? input.accent.toUpperCase() : null,
    // 편집 프리셋(10-14, core/editlayout.js PRESETS) — 캠페인 일괄 값. 'auto'(기본)면 키를 두지 않는다(렌더 결과·저장 모양이 예전과 같게)
    ...Object.fromEntries(PRESET_KEYS.filter(k => input[k] && input[k] !== 'auto' && PRESETS[k].choices[input[k]]).map(k => [k, input[k]])),
    logoMono: input.logoMono ?? null,     // 단색 변환용 로고(글자 속까지 지운 사본, core/logo.js prepLogoRGBA mono) — 렌더러가 흰/검정 단색으로 바꿀 때만 쓴다(10-12 결정 12)
    logoLight: input.logoLight ?? null,   // 어두운 지면용(흰색) 로고 — 없으면 렌더러가 원색 로고를 흰 판 위에 올린다
    // 올린 원본(손질 전) — 전달물(자소설 M시작배너 로고 500px↑·이미지 720px↑)은 손질본이 아니라 원본 파일을 그대로 넘긴다(10-16). 손질본과 같으면 비워 둔다
    logoOrig: typeof input.logoOrig === 'string' && input.logoOrig !== input.logo ? input.logoOrig : null,
    kvOrig: typeof input.kvOrig === 'string' && input.kvOrig !== input.keyVisual ? input.kvOrig : null,
    // 올린 로고의 밝기 — 'light'(흰색 로고만: 지면은 어두운 브랜드색이어야 한다) · 'dark'(원색/진한 로고만) · 'both'(둘 다). 앱이 업로드 때 잰다
    logoTone: ['light', 'dark', 'both'].includes(input.logoTone) ? input.logoTone : null,
    // 로고 실측(core/logo.js logoMeta) — px(원본 크기)·solid(트림 상자 안 불투명 몫: 타일 로고 ≥ 0.85)·lum·sat·colors(대표색 3 + 몫 — 지면과 같은 색이면 단색, 10-12). 렌더러가 세로 로고 크기·타일 로고 반전 여부를 정한다
    logoMeta: input.logoMeta && Array.isArray(input.logoMeta.px) ? { px: input.logoMeta.px, solid: input.logoMeta.solid ?? null, lum: input.logoMeta.lum ?? null, sat: input.logoMeta.sat ?? null, colors: Array.isArray(input.logoMeta.colors) ? input.logoMeta.colors : null, emblem: input.logoMeta.emblem?.x1 > 0 ? { x1: input.logoMeta.emblem.x1 } : null } : null,   // emblem: 왼쪽 색 심볼 경계(단색 변환 때 심볼은 원색, 10-14 t1014)
    mood: input.mood ?? [],
    presetId: input.presetId ?? null,
    // 인쇄 사양 — 근사 CMYK(사양서·미리보기 표기용)
    cmyk: {
      primary: toCmyk(colors[0] ?? '#2456D6'),
      secondary: toCmyk(buildPalette({ primary: colors[0] ?? '#2456D6', secondary: colors[1], mode }).secondary),
    },
  };
}
