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

  // 지면을 정하는 순서: ① 직접 고른 색 → ② 배경을 품은 일러스트의 가장자리 색(이음매가 없어야 하니 로고보다 우선) → ③ 흰색 로고만 있으면 어두운 브랜드색 → ④ 사진·누끼는 브랜드색(밝은 매체면 틴트)
  const flatEdge = x => !!(x?.hex && x.opaque >= 0.9 && (x.flat ?? x.rough <= ROUGH_MAX));
  const e = f?.edges?.[facing];
  const hasBg = !!(f && f.kind !== 'photo' && f.opaque >= 0.5);
  // 글자 쪽 변은 그림이 걸쳐 있지만 다른 변이 평평하면(한미글로벌 3D: 위는 흰 바탕, 왼쪽은 글자가 가로지름) 그 바탕색이 지면이다.
  // 대표색을 쓰면 그림의 흰 바탕이 상자처럼 드러나고, 오브젝트가 오른쪽인 규격과 아래인 규격의 지면색이 달라진다(구글 GDN 5규격은 지면색이 같다 28/28)
  const other = (hasBg && !flatEdge(e)) ? ['top', 'bottom', 'left', 'right'].map(k => f.edges?.[k]).find(flatEdge) : null;

  if (opt.color) { stops = [opt.color]; source = 'manual'; }
  else if (hasBg && flatEdge(e)) {
    stops = [e.from, e.to];
    angle = (facing === 'left' || facing === 'right') ? 180 : 90;
    source = 'kv-edge'; seamless = true;
  }
  else if (hasBg && other) { stops = [other.hex]; source = 'kv-edge'; }
  else if (style.logoTone === 'light') {
    // 흰색 로고만 있다 — 그림이 지면을 정하지 않는 경우(사진·누끼·그림 없음) 로고가 지면을 정한다: 어두운 브랜드색. 브랜드색이 밝으면 검정을 섞는다
    const brand = p.primary ?? '#2456D6';
    stops = [contrast(brand, WHITE) >= 3 ? brand : mix(brand, BLACK, 0.5)]; source = 'brand-dark-logo';
  }
  else if (f?.kind === 'photo' || (f && f.opaque < 0.5)) {
    // 사진의 변은 바탕이 아니고(하늘·벽의 한 조각), 배경을 딴 그림엔 바탕이 없다 — 둘 다 지면은 브랜드색.
    // 어두운 지면 매체: 브랜드색 단색(한독 사옥 → 파랑, ABL 캐릭터 → 파랑). 밝은 지면 매체(구글·자소설): 브랜드색 틴트 → 흰색 그라데이션
    // (비씨월드 하늘색→흰색, 한국앤컴퍼니 오렌지 18%→흰색, PT코리아 라벤더). 그림의 대표색을 쓰면 탁해진다(ABL 캐릭터 → 보라회색)
    const brand = p.primary ?? '#2456D6';
    const tint = f.kind === 'photo' ? lightPhoto : light;
    if (tint) { stops = [mix(brand, WHITE, 0.78), WHITE]; angle = 180; source = 'brand-tint'; }
    else { stops = [brand]; source = f.kind === 'photo' ? 'brand-photo' : 'brand'; }
  }
  else if (f && dominant) {
    // 배경을 딴 이미지 + 밝은 지면을 쓰는 매체(자소설)면 대표색의 옅은 틴트, 아니면 대표색 그대로
    stops = (f.opaque < 0.5 && light) ? [mix(dominant, WHITE, 0.80), mix(dominant, WHITE, 0.90)] : [dominant];
    source = 'kv-colour';
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
  // 그라데이션 변을 단색으로 접으면(우하단 상자·단색 전용 규격) 그림의 변과 지면이 더는 같은 색이 아니다 — 이음매를 녹여야 한다
  if (mode === 'solid' || (mode === 'auto' && !far)) { if (far) seamless = false; stops = [mid()]; }
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

// 녹임 그라데이션 — 직선(0→100%)으로 짧게 자르면 "급하게 끊긴" 느낌이 난다(10-06 사용자). 리멤버 사진 예시처럼 길게(30% 안팎), 처음은 천천히 뒤는 빠르게(이징).
export function meltGradient(dir, pct) {
  const a = Math.round(pct * 0.45 * 10) / 10, b = Math.round(pct * 0.78 * 10) / 10;
  return `linear-gradient(${dir},transparent 0%,rgba(0,0,0,.28) ${a}%,rgba(0,0,0,.78) ${b}%,#000 ${pct}%)`;
}
export function meltMask(dir, pct) {
  const g = meltGradient(dir, pct);
  return `-webkit-mask-image:${g};mask-image:${g};`;
}
// 두 변(왼쪽·위)을 함께 녹인다 — 우하단 모서리 상자
export function meltMask2(pctX, pctY) {
  const g = `${meltGradient('to right', pctX)},${meltGradient('to bottom', pctY)}`;
  return `-webkit-mask-image:${g};-webkit-mask-composite:source-in;mask-image:${g};mask-composite:intersect;`;
}

// 주인공으로 채우기 — 오브젝트 자리는 그림 전체가 아니라 그림의 주인공(focus 상자)으로 채운다.
// 바탕이 넓은 3D·일러스트(주인공이 그림의 절반)를 통째로 자리에 맞추면 자리에는 바탕만 크게 보이고 주인공은 작다(10-06 사용자: "꽉 안 채워져서 나오고… 비주얼 옆에 화이트").
// 보드 예시는 주인공이 자리를 거의 다 쓴다(한미글로벌 3D·세아제강 일러스트·동부 3D). 그래서 주인공 상자(+숨 쉴 여백 8%)가 자리를 덮도록 배율을 올리고, 주인공 가운데가 자리 가운데에 오게 한다.
//   · 통째로 덮는 배율(s0)과 비슷하면(1.25배 미만) 그대로 둔다 — 레퍼런스처럼 주인공이 이미 큰 그림은 건드리지 않는다
//   · 원본 픽셀보다 25% 넘게 키우지 않는다(흐려진다). 단 자리는 덮어야 하니 s0 아래로는 안 내려간다
//   · 사진(주인공을 못 찾음)·누끼(배경 없음)는 해당 없다
export function subjectCrop(style, bw, bh, { margin = 0.08, maxUp = 1.25, minGain = 1.25 } = {}) {
  const f = style.kvMeta?.field, focus = f?.focus, ar = style.kvMeta?.ar;
  if (!focus || !ar || (f?.opaque ?? 1) < 0.5 || !(bw > 0 && bh > 0)) return null;
  const px = style.kvMeta?.px;
  const iw = px?.[0] ?? Math.round(ar * 1000), ih = px?.[1] ?? 1000;
  const s0 = Math.max(bw / iw, bh / ih);
  const x0 = Math.max(0, focus.x - focus.w / 2 - focus.w * margin), x1 = Math.min(1, focus.x + focus.w / 2 + focus.w * margin);
  const y0 = Math.max(0, focus.y - focus.h / 2 - focus.h * margin), y1 = Math.min(1, focus.y + focus.h / 2 + focus.h * margin);
  const fw = Math.max(1, (x1 - x0) * iw), fh = Math.max(1, (y1 - y0) * ih);
  let s = Math.max(bw / fw, bh / fh);
  if (px) s = Math.min(s, Math.max(s0, maxUp));
  if (s / s0 < minGain) return null;
  const cx = (x0 + x1) / 2 * iw * s, cy = (y0 + y1) / 2 * ih * s;
  // 주인공이 그림의 변에 닿아 있으면(바닥에 선 오브젝트·오른쪽에 붙은 오브젝트) 그 변을 자리의 변에 맞춘다 — 가운데 맞춤은 발을 자른다
  const ox = Math.round(focus.x + focus.w / 2 >= 0.97 ? bw - iw * s : Math.min(0, Math.max(bw - iw * s, bw / 2 - cx)));
  const oy = Math.round(focus.y + focus.h / 2 >= 0.97 ? bh - ih * s : Math.min(0, Math.max(bh - ih * s, bh / 2 - cy)));
  return { size: `${Math.round(iw * s)}px auto`, pos: `${ox}px ${oy}px`, scale: Math.round(s * 1000) / 1000, gain: Math.round(s / s0 * 100) / 100,
    top: Math.round(-oy / (ih * s) * 1000) / 1000, left: Math.round(-ox / (iw * s) * 1000) / 1000 };   // 자리의 윗변·왼변이 그림의 어느 높이·폭에 걸리는가(0~1)
}
// 이음매 줄의 바탕색 — 자리의 글자 쪽 변이 그림의 어느 높이(rows, 아래 띠) 또는 폭(cols, 오른쪽 열)에 걸리는가(frac 0~1) → 그 줄의 바탕색.
// 바탕이 거의 없는 줄(주인공이 가득 찬 줄)이면 null — 그때는 지면을 바꾸지 않고 녹임에 맡긴다
export function joinColour(style, frac, axis = 'rows') {
  const prof = style.kvMeta?.field?.[axis];
  if (!prof?.length) return null;
  // 주인공이 반 넘게 찬 줄의 "바탕색"은 주인공 가장자리 픽셀이 섞여 탁하다 — 글자 쪽으로 한두 줄 물러나 바탕이 반 이상인 줄을 쓴다
  const at = Math.min(prof.length - 1, Math.max(0, Math.round(frac * (prof.length - 1))));
  for (let i = at; i >= Math.max(0, at - 2); i--) { const r = prof[i]; if (r?.hex && r.bg >= 0.5) return r.hex; }
  return null;
}
// 지면을 이음매 줄의 바탕색으로 이어 준다 — 글자 쪽 끝은 그림의 변 색(원래 지면), 자리 쪽 끝은 걸린 줄의 바탕색(세로 그라데이션 · 오른쪽 열은 가로).
// 그림의 바탕이 흰 글로우에서 연파랑으로 흐르면 지면도 그렇게 흐른다 — "비주얼 옆에 화이트"가 지면과 한 몸이 된다(10-06). 글자는 두 색 모두에서 4.5:1이어야 한다
export function joinField(field, jc, side = 'bottom') {
  if (!field || !jc || field.gradient || field.source !== 'kv-edge') return field;
  if (colorDistance(jc, field.stops[0]) < 0.02 || contrast(jc, field.text) < 4.5) return field;
  const angle = side === 'right' ? 90 : 180;
  return { ...field, stops: [field.stops[0], jc], angle, css: `linear-gradient(${angle}deg,${field.stops[0]} 0%,${jc} 100%)`, gradient: true, seamless: false, joined: true,
    contrast: Math.round(Math.min(contrast(field.stops[0], field.text), contrast(jc, field.text)) * 100) / 100 };
}

// 자리 안에서 그림을 어떻게 놓는가 — 통째로(cover)·주인공으로 당겨서(crop)·누끼는 맞춰서(contain).
// 렌더러가 지면색을 정할 때(joinFrac → joinColour)와 그릴 때(kvLayer) 같은 답을 받는다.
//   joinFrac: 자리의 글자 쪽 변이 그림의 어느 높이(아래 띠)·폭(오른쪽 열)에 걸리는가. 0 = 그림의 변 그대로(지면과 같은 색)
export function kvPlacement(style, field, { side, w, h, size, edgePad = 0, inset = 0 }) {
  const cutout = (style.kvMeta?.field?.opaque ?? 1) < 0.5;
  const bw = side === 'right' ? size + edgePad - inset : w, bh = side === 'right' ? h : size + edgePad;
  const [far, join] = side === 'right' ? ['right center', 'left center'] : ['center bottom', 'center top'];
  // 잘라 채울 때 어디를 보여 줄 것인가 — 그림의 주인공(focus)이 자리 한가운데 오게 한다. 모르면 가운데.
  // 이미지의 글자 쪽 변이 자리의 변에 그대로 닿으면(trueEdge) 지면과 색이 같아 이음매가 없다.
  const ar = style.kvMeta?.ar, focus = style.kvMeta?.field?.focus;
  let pos = field?.seamless ? join : 'center', trueEdge = !!field?.seamless, joinFrac = 0;
  if (!cutout && ar) {
    const imgH = Math.max(bh, bw / ar), imgW = imgH * ar;
    const at = (box, img, f) => img > box + 0.5 ? Math.min(1, Math.max(0, (box / 2 - f * img) / (box - img))) : 0.5;
    const px = focus ? at(bw, imgW, focus.x) : (field?.seamless && side === 'right' ? 0 : 0.5);
    const py = focus ? at(bh, imgH, focus.y) : (field?.seamless && side !== 'right' ? 0 : 0.5);
    if (focus) {
      pos = `${Math.round(px * 100)}% ${Math.round(py * 100)}%`;
      trueEdge = !!field?.seamless && (side === 'right' ? (px === 0 || imgW <= bw + 0.5) : (py === 0 || imgH <= bh + 0.5));
    }
    joinFrac = side === 'right' ? (imgW > bw + 0.5 ? px * (imgW - bw) / imgW : 0) : (imgH > bh + 0.5 ? py * (imgH - bh) / imgH : 0);
  }
  // 주인공이 그림의 일부면 주인공으로 자리를 채운다 — 그러면 자리의 글자 쪽 변은 그림 한가운데라 지면과 같은 색이 아니다(녹인다)
  const crop = cutout ? null : subjectCrop(style, bw, bh);
  if (crop) { trueEdge = false; joinFrac = side === 'right' ? crop.left : crop.top; }
  return { cutout, bw, bh, far, pos, trueEdge, crop, joinFrac: Math.round(joinFrac * 1000) / 1000 };
}

// 키비주얼 층 — 상자에 가두지 않는다. 지면 가장자리까지 붙이고, 글자 쪽 변만 지면으로 녹인다(마스크라 그라데이션 지면에도 맞는다).
//   side 'right' | 'bottom' · size: 이미지가 차지하는 폭(오른쪽) 또는 높이(아래) · edgePad: 그쪽 지면 여백(이미지는 여백까지 덮는다)
//   inset: 가장자리에서 띄울 폭(좌우 끝이 단색이어야 하는 지면) · melt:false 면 녹이지 않는다(투명 배경 규격)
// 그 변이 이미 지면색과 같으면(field.seamless) 그 변을 기준으로 붙여 이음매에서 그림이 잘리지 않게 하고, 녹이는 폭을 줄인다.
// 배경을 딴 이미지는 자르지 않고 맞춰 넣는다.
export function kvLayer(style, field, { side, w, h, size, edgePad = 0, inset = 0, melt = true }) {
  const url = String(style.keyVisual).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { cutout, far, pos, trueEdge, crop } = kvPlacement(style, field, { side, w, h, size, edgePad, inset });
  // 맞닿는 변이 평평하지 않으면(사진) 더 넓게 녹인다 — 리멤버 예시 사진은 지면 폭의 30% 남짓이 그라데이션. 주인공으로 당긴 자리는 그림 한가운데가 변이다
  const joinFlat = crop ? false : style.kvMeta?.field?.edges?.[side === 'right' ? 'left' : 'top']?.flat;
  const pct = trueEdge ? 16 : joinFlat === false ? 38 : 30;
  const dir = side === 'right' ? 'to right' : 'to bottom';
  const mask = (!melt || cutout) ? '' : meltMask(dir, pct);
  const fill = `background:url('${url}') ${cutout ? `${far}/contain` : crop ? `${crop.pos}/${crop.size}` : `${pos}/cover`} no-repeat;${crop ? `--kv-gain:${crop.gain};` : ''}`;
  return side === 'right'
    ? `<div data-object="1" style="position:absolute;top:0;right:${inset}px;width:${size + edgePad - inset}px;height:${h}px;${fill}${mask}"></div>`
    : `<div data-object="1" style="position:absolute;left:0;bottom:0;width:${w}px;height:${size + edgePad}px;${fill}${mask}"></div>`;
}
