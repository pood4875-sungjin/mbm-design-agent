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
// lightPhoto: 사진도 밝은 지면에 녹이는 매체(구글 일화 사옥 → 흰 지면). 자소설은 밝은 매체여도 사진은 브랜드색 지면(한독 → 파랑)
export function resolveField(style, { facing = 'left', solidOnly = false, light = false, lightPhoto = false } = {}) {
  const p = style.palette ?? {};
  const opt = style.background ?? {};
  const f = style.keyVisual ? style.kvMeta?.field ?? null : null;
  const dominant = style.keyVisual ? style.kvMeta?.colors?.[0] ?? null : null;
  let stops = null, angle = 180, source = null, seamless = false;

  if (opt.color) { stops = [opt.color]; source = 'manual'; }
  else if (f?.kind === 'photo' || (f && f.opaque < 0.5)) {
    // 사진의 변은 바탕이 아니고(하늘·벽의 한 조각), 배경을 딴 그림엔 바탕이 없다 — 둘 다 지면은 브랜드색.
    // 어두운 지면 매체: 브랜드색 단색(한독 사옥 → 파랑, ABL 캐릭터 → 파랑). 밝은 지면 매체(구글·자소설): 브랜드색 틴트 → 흰색 그라데이션
    // (비씨월드 하늘색→흰색, 한국앤컴퍼니 오렌지 18%→흰색, PT코리아 라벤더). 그림의 대표색을 쓰면 탁해진다(ABL 캐릭터 → 보라회색)
    const brand = p.primary ?? '#2456D6';
    const tint = f.kind === 'photo' ? lightPhoto : light;
    if (tint) { stops = [mix(brand, WHITE, 0.78), WHITE]; angle = 180; source = 'brand-tint'; }
    else { stops = [brand]; source = f.kind === 'photo' ? 'brand-photo' : 'brand'; }
  }
  else if (f) {
    const e = f.edges?.[facing];
    const flatEdge = x => !!(x?.hex && x.opaque >= 0.9 && (x.flat ?? x.rough <= ROUGH_MAX));
    // 글자 쪽 변은 그림이 걸쳐 있지만 다른 변이 평평하면(한미글로벌 3D: 위는 흰 바탕, 왼쪽은 글자가 가로지름) 그 바탕색이 지면이다.
    // 대표색을 쓰면 그림의 흰 바탕이 상자처럼 드러나고, 오브젝트가 오른쪽인 규격과 아래인 규격의 지면색이 달라진다(구글 GDN 5규격은 지면색이 같다 28/28)
    const other = flatEdge(e) ? null : ['top', 'bottom', 'left', 'right'].map(k => f.edges?.[k]).find(flatEdge);
    if (flatEdge(e)) {
      stops = [e.from, e.to];
      angle = (facing === 'left' || facing === 'right') ? 180 : 90;
      source = 'kv-edge'; seamless = true;
    } else if (other) {
      stops = [other.hex]; source = 'kv-edge';
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

// 키비주얼 층 — 상자에 가두지 않는다. 지면 가장자리까지 붙이고, 글자 쪽 변만 지면으로 녹인다(마스크라 그라데이션 지면에도 맞는다).
//   side 'right' | 'bottom' · size: 이미지가 차지하는 폭(오른쪽) 또는 높이(아래) · edgePad: 그쪽 지면 여백(이미지는 여백까지 덮는다)
//   inset: 가장자리에서 띄울 폭(좌우 끝이 단색이어야 하는 지면) · melt:false 면 녹이지 않는다(투명 배경 규격)
// 그 변이 이미 지면색과 같으면(field.seamless) 그 변을 기준으로 붙여 이음매에서 그림이 잘리지 않게 하고, 녹이는 폭을 줄인다.
// 배경을 딴 이미지는 자르지 않고 맞춰 넣는다.
export function kvLayer(style, field, { side, w, h, size, edgePad = 0, inset = 0, melt = true }) {
  const url = String(style.keyVisual).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cutout = (style.kvMeta?.field?.opaque ?? 1) < 0.5;
  const bw = side === 'right' ? size + edgePad - inset : w, bh = side === 'right' ? h : size + edgePad;
  const [far, join] = side === 'right' ? ['right center', 'left center'] : ['center bottom', 'center top'];
  // 잘라 채울 때 어디를 보여 줄 것인가 — 그림의 주인공(focus)이 자리 한가운데 오게 한다. 모르면 가운데.
  // 이미지의 글자 쪽 변이 자리의 변에 그대로 닿으면(trueEdge) 지면과 색이 같아 이음매가 없다.
  const ar = style.kvMeta?.ar, focus = style.kvMeta?.field?.focus;
  let pos = field?.seamless ? join : 'center', trueEdge = !!field?.seamless;
  if (!cutout && ar && focus) {
    const imgH = Math.max(bh, bw / ar), imgW = imgH * ar;
    const at = (box, img, f) => img > box + 0.5 ? Math.min(1, Math.max(0, (box / 2 - f * img) / (box - img))) : 0.5;
    const px = at(bw, imgW, focus.x), py = at(bh, imgH, focus.y);
    pos = `${Math.round(px * 100)}% ${Math.round(py * 100)}%`;
    trueEdge = !!field?.seamless && (side === 'right' ? (px === 0 || imgW <= bw + 0.5) : (py === 0 || imgH <= bh + 0.5));
  }
  // 맞닿는 변이 평평하지 않으면(사진) 더 넓게 녹인다 — 리멤버 예시 사진은 지면 폭의 30% 남짓이 그라데이션
  const joinFlat = style.kvMeta?.field?.edges?.[side === 'right' ? 'left' : 'top']?.flat;
  const pct = trueEdge ? 10 : joinFlat === false ? 32 : 26;
  const dir = side === 'right' ? 'to right' : 'to bottom';
  const mask = (!melt || cutout) ? '' : `-webkit-mask-image:linear-gradient(${dir},transparent 0%,#000 ${pct}%);mask-image:linear-gradient(${dir},transparent 0%,#000 ${pct}%);`;
  const fill = `background:url('${url}') ${cutout ? `${far}/contain` : `${pos}/cover`} no-repeat;`;
  return side === 'right'
    ? `<div data-object="1" style="position:absolute;top:0;right:${inset}px;width:${size + edgePad - inset}px;height:${h}px;${fill}${mask}"></div>`
    : `<div data-object="1" style="position:absolute;left:0;bottom:0;width:${w}px;height:${size + edgePad}px;${fill}${mask}"></div>`;
}
