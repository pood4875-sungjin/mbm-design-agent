// 지면(배경) — 소재의 바탕색을 어디서 가져오는가.
//
// 밝게/어둡게를 사람이 고르지 않는다. 키비주얼이 있으면 그 이미지에서 읽는다:
//   ① 이미지가 글자 쪽으로 맞닿는 변이 매끈하면(일러스트의 바탕) 그 변의 색을 그대로 지면으로 쓴다 — 이미지가 지면에 이어진다.
//      그 변에 그라데이션이 있으면 지면도 같은 그라데이션이 된다. 억지로 만들지 않고, 이미지에 있을 때만 생긴다.
//   ② 변이 복잡하거나(사진) 배경을 딴 이미지면 이미지의 대표색을 지면으로 쓴다.
//   ③ 키비주얼이 없으면 브랜드(로고) 색.
// 글자색은 지면이 정한다 — 순흑·순백 중 지면 어디에서나 읽히는 쪽.
//
// 사람이 덮어쓸 수 있는 것은 둘뿐이다: 색을 직접 고르기(background.color), 단색/그라데이션 고정(background.mode).

import { mix, colorDistance, contrast, shiftHue, BLACK, WHITE } from './palette.js';

const ROUGH_MAX = 0.035;   // 이보다 거칠면 "바탕"이 아니라 사진의 디테일이다
const GRADIENT_MIN = 0.045; // 두 끝이 이만큼은 달라야 그라데이션이라 부른다

// facing: 이미지가 글자 쪽으로 맞닿는 변 — 이미지가 오른쪽에 있으면 'left', 아래에 있으면 'top', 왼쪽에 있으면 'right'
export function resolveField(style, { facing = 'left', solidOnly = false, light = false } = {}) {
  const p = style.palette ?? {};
  const opt = style.background ?? {};
  const f = style.keyVisual ? style.kvMeta?.field ?? null : null;
  const dominant = style.keyVisual ? style.kvMeta?.colors?.[0] ?? null : null;
  let stops = null, angle = 180, source = null, seamless = false;

  if (opt.color) { stops = [opt.color]; source = 'manual'; }
  else if (f) {
    const e = f.edges?.[facing];
    if (e?.hex && e.opaque >= 0.9 && e.rough <= ROUGH_MAX) {
      stops = [e.from, e.to];
      angle = (facing === 'left' || facing === 'right') ? 180 : 90;
      source = 'kv-edge'; seamless = true;
    } else if (dominant) {
      // 배경을 딴 이미지 + 밝은 지면을 쓰는 매체(자소설)면 대표색의 옅은 틴트, 아니면 대표색 그대로
      stops = (f.opaque < 0.5 && light) ? [mix(dominant, WHITE, 0.80), mix(dominant, WHITE, 0.90)] : [dominant];
      source = 'kv-colour';
    }
  }
  if (!stops && style.keyVisual && style.kvMeta?.edge) { stops = [style.kvMeta.edge]; source = 'kv-edge'; }   // 예전에 저장된 캠페인
  if (!stops) {
    const brand = p.primary ?? '#2456D6';
    stops = light ? [mix(brand, WHITE, 0.80), mix(brand, WHITE, 0.90)] : [brand];
    source = 'brand';
  }

  const mode = solidOnly ? 'solid' : (opt.mode ?? 'auto');
  const far = stops.length > 1 && colorDistance(stops[0], stops[1]) >= GRADIENT_MIN;
  const mid = () => stops.length > 1 ? mix(stops[0], stops[1], 0.5) : stops[0];
  if (mode === 'solid' || (mode === 'auto' && !far)) stops = [mid()];
  else if (mode === 'gradient' && !far) { const b = mid(); stops = [shiftHue(b, 0, 0.05, 0), shiftHue(b, 0, -0.05, 0)]; angle = 180; }

  // 글자색 — 그라데이션의 두 끝 모두에서 읽혀야 한다. 큰 글자 기준 대비 3:1(WCAG)을 못 넘으면 그라데이션을 접는다.
  // 색이 있는 지면에는 흰 글자가 먼저다(실제 소재의 관례) — 흰색이 큰 글자 기준 3:1을 넘으면 흰색, 못 넘는 밝은 지면에서만 검정.
  const worst = c => Math.min(...stops.map(s => contrast(s, c)));
  const pick = () => worst(WHITE) >= 3 ? WHITE : (worst(BLACK) >= worst(WHITE) ? BLACK : WHITE);
  let text = pick();
  if (stops.length > 1 && worst(text) < 3) { stops = [mid()]; text = pick(); }

  const css = stops.length > 1 ? `linear-gradient(${angle}deg,${stops[0]} 0%,${stops[1]} 100%)` : stops[0];
  // contrast: 지면에서 가장 불리한 곳의 글자 대비 — 4.5에 못 미치면 렌더러가 작은 글자를 흐리게 쓰지 않는다
  return { stops, angle, css, text, source, seamless, gradient: stops.length > 1, contrast: Math.round(worst(text) * 100) / 100 };
}
