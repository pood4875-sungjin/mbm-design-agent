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
// 어두운 브랜드 지면 — 단색 대신 은은한 대각 그라데이션(왼쪽 위 살짝 밝고 따뜻하게 → 오른쪽 아래 짙게). 보드 1-884 코엑스 카드(보라 → 짙은 보라)·리멤버 예시의 문법.
// 색 거리는 그라데이션 문턱(0.045)을 넘되 글자 대비는 두 끝 모두 지킨다. 단색 전용 규격·'단색' 선택이면 resolveField가 가운데 색으로 접는다
function brandDeep(brand) { return [shiftHue(brand, 0, 0.06, 0), shiftHue(brand, 0, -0.08, 0)]; }   // 색상(hue)은 그대로 — 명도만. 색상까지 돌면 글자 대비 판정의 전제가 깨진다

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
    else { stops = brandDeep(brand); angle = 135; source = f.kind === 'photo' ? 'brand-photo' : 'brand'; }
  }
  else if (f && dominant) {
    // 배경을 딴 이미지 + 밝은 지면을 쓰는 매체(자소설)면 대표색의 옅은 틴트, 아니면 대표색 그대로
    stops = (f.opaque < 0.5 && light) ? [mix(dominant, WHITE, 0.80), mix(dominant, WHITE, 0.90)] : [dominant];
    source = 'kv-colour';
  }
  if (!stops && style.keyVisual && style.kvMeta?.edge) { stops = [style.kvMeta.edge]; source = 'kv-edge'; }   // 예전에 저장된 캠페인
  if (!stops) {
    const brand = p.primary ?? '#2456D6';
    stops = light ? [mix(brand, WHITE, 0.80), mix(brand, WHITE, 0.90)] : brandDeep(brand);
    if (!light) angle = 135;
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
export function subjectCrop(style, bw, bh, { margin = 0.08, maxUp = 1.25, minGain = 1.25, sMul = 1 } = {}) {
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
  if (sMul !== 1) s = Math.max(s0, s * sMul);   // 배율을 낮춰 자리에 바탕 여유를 둔다(띠 윗줄을 바탕에서 끊기 위해) — 통째 배율 아래로는 안 간다
  if (s / s0 < minGain) return null;
  const cx = (x0 + x1) / 2 * iw * s, cy = (y0 + y1) / 2 * ih * s;
  // 주인공이 그림의 변에 닿아 있으면(바닥에 선 오브젝트·오른쪽에 붙은 오브젝트) 그 변을 자리의 변에 맞춘다 — 가운데 맞춤은 발을 자른다.
  // 단 자리가 주인공보다 30% 넘게 낮으면 위(머리·얼굴)를 지키고 아래(발)를 자른다 — 캐릭터 머리가 잘린 띠는 어색하다(여우 10-06). 머리 위 숨 4%
  const lossV = 1 - Math.min(1, bh / (fh * s));
  const ox = Math.round(focus.x + focus.w / 2 >= 0.97 ? bw - iw * s : Math.min(0, Math.max(bw - iw * s, bw / 2 - cx)));
  const oy0 = Math.round(focus.y + focus.h / 2 >= 0.97 ? bh - ih * s : Math.min(0, Math.max(bh - ih * s, bh / 2 - cy)));
  // 가운데 맞춤이 머리 위(주인공 상자 윗변+숨)를 자리 폭의 2% 넘게 자르면 머리를 지킨다 — 귀가 잘린 채 윗변에서 녹는 여우(10-06 "뚝 끊은 면")
  const headCut = oy0 + y0 * ih * s < -bh * 0.02;
  const oy = (lossV > 0.3 || headCut) ? Math.round(Math.min(0, Math.max(bh - ih * s, -(y0 * ih * s) + bh * 0.04))) : oy0;
  return { size: `${Math.round(iw * s)}px auto`, pos: `${ox}px ${oy}px`, ox, oy, iw, ih, scale: Math.round(s * 1000) / 1000, gain: Math.round(s / s0 * 100) / 100,
    top: Math.round(-oy / (ih * s) * 1000) / 1000, left: Math.round(-ox / (iw * s) * 1000) / 1000 };   // 자리의 윗변·왼변이 그림의 어느 높이·폭에 걸리는가(0~1)
}
// 배경형 그림 — 그림을 지면 전체에 깔고(cover) 비어 있는 자리(room, palette.js roomOf)에 글자를 둔다.
// 레퍼런스(삼정KPMG 보라 배경·GC녹십자·마이다스·삼성 3D 호)는 그림이 곧 지면이다 — 잘라서 한쪽에 붙이고 녹이면(뿌연 번짐) AI 티가 난다(10-06 사용자).
// 캔버스 비율이 그림과 비슷할 때만(0.6~1.7배) — 띠·세로 긴 규격은 자르면 조각이 된다. 글자 자리는 폭 42%·높이 38%, 그리고 절대 240×120px은 돼야 한다(작은 규격은 글자가 안 들어간다).
// 자르는 쪽은 주인공이 가장 많이 보이는 쪽. 글자 자리가 캔버스 높이의 절반에 못 미치면, 그림의 윗변이 평평한 바탕일 때 그림을 아래로 밀어(최대 24%h) 자리를 키운다 —
// 비는 위쪽은 자리의 바탕색으로 채운다(윗변 색과 같아 이음매가 없다). 주인공 아래가 조금 잘리는 쪽을 택하는 것이 글자를 작게 구기는 것보다 낫다.
// 글자 자리는 위쪽 모서리(tl·tr)만 — 아래 모서리 자리는 글자 흐름이 위에서 시작하는 지금 레이아웃과 맞지 않는다
export function kvFull(style, w, h, { minW = 0.42, minH = 0.38, wantH = null, arMin = 0.6, arMax = 1.7, minPxW = 240, minPxH = 120 } = {}) {
  const f = style.kvMeta?.field, room = f?.room, ar = style.kvMeta?.ar;
  // 글자 자리로 바라는 높이 — 정사각에 가까우면 62%(로고·아이브로·메인 두 줄·상세 세 줄), 가로형은 58%. 그 아래면 그림을 밀어서라도 키운다
  if (wantH == null) wantH = (w / h) < 1.6 ? 0.62 : 0.58;
  if (!room || !ar || (f?.opaque ?? 1) < 0.5 || !(w > 0 && h > 0)) return null;
  // 바탕을 품은 일러스트·3D만 — 사진(평평한 변 없음)은 하늘이 비어 보여도 배경형이 아니다(일화 사옥 사진 → 레퍼런스는 틴트 지면 + 모서리 사진)
  if (f.kind !== 'illust') return null;
  if (room.corner !== 'tl' && room.corner !== 'tr') return null;
  const ratio = (w / h) / ar;
  if (ratio < arMin || ratio > arMax) return null;
  const px = style.kvMeta?.px;
  const iw = px?.[0] ?? Math.round(ar * 1000), ih = px?.[1] ?? 1000;
  const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
  const focus = f.focus;
  const top = f.edges?.top;
  const topFlat = !!(top?.flat && top.hex && room.hex && colorDistance(top.hex, room.hex) < 0.035);
  const oxs = dw > w + 0.5 ? [w - dw, (w - dw) / 2, 0] : [0];
  const oys = dh > h + 0.5 ? [h - dh, (h - dh) / 2, 0] : [0];
  if (topFlat) for (const k of [0.08, 0.16, 0.24]) oys.push(Math.round(h * k));   // 아래로 밀기 — 위는 바탕색으로 채운다
  const cands = [];
  for (const ox of oxs) for (const oy of oys) {
    const rx0 = Math.max(0, ox + room.x0 * dw), rx1 = Math.min(w, ox + room.x1 * dw);
    const ry0 = 0, ry1 = Math.min(h, oy + room.y1 * dh);   // 아래로 민 만큼 위쪽 채움도 글자 자리다
    const rw = rx1 - rx0, rh = ry1 - ry0;
    if (rw < w * minW || rh < h * minH || rw < minPxW || rh < minPxH) continue;
    let vis = 1;
    if (focus) {
      const fx0 = ox + (focus.x - focus.w / 2) * dw, fx1 = ox + (focus.x + focus.w / 2) * dw;
      const fy0 = oy + (focus.y - focus.h / 2) * dh, fy1 = oy + (focus.y + focus.h / 2) * dh;
      const vw = Math.max(0, Math.min(w, fx1) - Math.max(0, fx0)), vh = Math.max(0, Math.min(h, fy1) - Math.max(0, fy0));
      vis = Math.round((vw * vh) / Math.max(1, (fx1 - fx0) * (fy1 - fy0)) * 100) / 100;
    }
    if (vis < 0.6) continue;   // 주인공이 반 넘게 잘리면 배경형이 아니다(여우 캐릭터 머리만 남는 580·720) — 자리 배치로 돌아간다
    cands.push({ ox: Math.round(ox), oy: Math.round(oy), room: { x: Math.round(rx0), y: ry0, w: Math.round(rw), h: Math.round(rh) }, vis, shifted: oy > 0 });
  }
  if (!cands.length) return null;
  // 점수: 글자 자리 높이(절반까지만 쳐 준다) + 주인공 보임. 밀지 않아도 되면 밀지 않는다
  const score = c => Math.min(c.room.h / h, wantH) * 2 + c.vis - (c.shifted ? 0.05 : 0);
  cands.sort((a, b) => score(b) - score(a));
  const c = cands[0];
  return { ...c, corner: room.corner, hex: room.hex, lum: room.lum, cornersBg: room.cornersBg, size: `${Math.round(dw)}px auto`, pos: `${c.ox}px ${c.oy}px`, scale: Math.round(s * 1000) / 1000 };
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

// 통째로 덮을 때(cover)의 위치 — 주인공이 자리 한가운데 오게 하되, 자리가 주인공보다 30% 넘게 낮으면 위(머리)를 지키고 아래를 자른다.
// 돌려주는 값: pos(CSS background-position), joinFrac(자리 윗변이 그림의 어느 높이에 걸리는가)
export function coverPos(style, bw, bh, { seamless = false, side = 'bottom', fallback = 'center' } = {}) {
  const ar = style.kvMeta?.ar, focus = style.kvMeta?.field?.focus;
  const join = side === 'right' ? 'left center' : 'center top';
  if (!ar) return { pos: seamless ? join : fallback, joinFrac: 0, trueEdge: seamless };
  const imgH = Math.max(bh, bw / ar), imgW = imgH * ar;
  const at = (box, img, f) => img > box + 0.5 ? Math.min(1, Math.max(0, (box / 2 - f * img) / (box - img))) : 0.5;
  if (!focus) {
    // 주인공을 모르면 기본 위치(템플릿 띠는 바닥 맞춤 — 길쭉한 그림의 주인공은 아래쪽, 그 밖엔 가운데)
    const px = seamless && side === 'right' ? 0 : 0.5, py = seamless && side !== 'right' ? 0 : (fallback === 'center bottom' ? 1 : 0.5);
    return { pos: seamless ? join : fallback, joinFrac: side === 'right' ? (imgW > bw + 0.5 ? px * (imgW - bw) / imgW : 0) : (imgH > bh + 0.5 ? py * (imgH - bh) / imgH : 0), trueEdge: seamless };
  }
  const px = at(bw, imgW, focus.x);
  let py = at(bh, imgH, focus.y), oyPx = null;
  const lossV = imgH > bh + 0.5 ? 1 - Math.min(1, bh / (focus.h * imgH)) : 0;
  // 가운데 맞춤이 주인공 윗변(머리)을 자리 높이의 2% 넘게 자르면 머리를 지키고 아래를 자른다 — 숨은 머리 위 4%
  const headCut = imgH > bh + 0.5 && (-(py * (imgH - bh)) + (focus.y - focus.h / 2) * imgH) < -bh * 0.02;
  if (lossV > 0.3 || headCut) oyPx = Math.round(Math.min(0, Math.max(bh - imgH, -(focus.y - focus.h / 2) * imgH + bh * 0.04)));   // 머리 위 숨 4%
  const pos = oyPx != null ? `${Math.round(px * 100)}% ${oyPx}px` : `${Math.round(px * 100)}% ${Math.round(py * 100)}%`;
  const trueEdge = seamless && (side === 'right' ? (px === 0 || imgW <= bw + 0.5) : (oyPx == null && (py === 0 || imgH <= bh + 0.5)));
  const joinFrac = side === 'right' ? (imgW > bw + 0.5 ? px * (imgW - bw) / imgW : 0) : (imgH > bh + 0.5 ? (oyPx != null ? -oyPx / imgH : py * (imgH - bh) / imgH) : 0);
  return { pos, joinFrac, trueEdge };
}

// 자리 안에서 그림을 어떻게 놓는가 — 통째로(cover)·주인공으로 당겨서(crop)·누끼는 맞춰서(contain).
// 렌더러가 지면색을 정할 때(joinFrac → joinColour)와 그릴 때(kvLayer) 같은 답을 받는다.
//   joinFrac: 자리의 글자 쪽 변이 그림의 어느 높이(아래 띠)·폭(오른쪽 열)에 걸리는가. 0 = 그림의 변 그대로(지면과 같은 색)
export function kvPlacement(style, field, { side, w, h, size, edgePad = 0, inset = 0, top = 0 }) {
  const cutout = (style.kvMeta?.field?.opaque ?? 1) < 0.5;
  const bw = side === 'right' ? size + edgePad - inset : w, bh = side === 'right' ? h - top : size + edgePad;   // top: 오른쪽 열이 로고 띠 아래부터 시작할 때
  const [far, join] = side === 'right' ? ['right center', 'left center'] : ['center bottom', 'center top'];
  // 잘라 채울 때 어디를 보여 줄 것인가 — 그림의 주인공(focus)이 자리 한가운데 오게 한다. 모르면 가운데.
  // 이미지의 글자 쪽 변이 자리의 변에 그대로 닿으면(trueEdge) 지면과 색이 같아 이음매가 없다.
  const ar = style.kvMeta?.ar, focus = style.kvMeta?.field?.focus;
  let pos = field?.seamless ? join : 'center', trueEdge = !!field?.seamless, joinFrac = 0;
  if (!cutout && ar) {
    const c = coverPos(style, bw, bh, { seamless: !!field?.seamless, side });
    pos = c.pos; trueEdge = c.trueEdge; joinFrac = c.joinFrac;
  }
  // 주인공이 그림의 일부면 주인공으로 자리를 채운다 — 그러면 자리의 글자 쪽 변은 그림 한가운데라 지면과 같은 색이 아니다(녹인다)
  const crop = cutout ? null : subjectCrop(style, bw, bh);
  if (crop && side === 'right') {
    // 창 왼변이 주인공이 아닌 다른 덩어리(왼쪽의 파란 호)를 가르면 그 조각이 녹아 뿌옇게 번진다 — 창 왼변을 그 덩어리의 오른쪽 끝 너머로 옮긴다(주인공이 조금 잘리는 쪽을 택한다)
    const others = (style.kvMeta?.field?.focus?.others ?? []).filter(o => o.x1 < (style.kvMeta.field.focus.x + style.kvMeta.field.focus.w / 2));
    const minOx = bw - crop.iw * crop.scale;
    for (const o of others) {
      const left = -crop.ox / (crop.iw * crop.scale);
      if (left < o.x1 && left > o.x0 - 0.02) {
        const ox = Math.max(minOx, Math.round(-(o.x1 + 0.01) * crop.iw * crop.scale));
        if (ox < crop.ox) { crop.ox = ox; crop.pos = `${ox}px ${crop.oy}px`; crop.left = Math.round(-ox / (crop.iw * crop.scale) * 1000) / 1000; crop.nudged = 'blob'; }
      }
    }
    // 창의 왼변이 다른 오브젝트(두 번째 덩어리)를 자르면 그 조각이 녹아 뿌옇게 번진다 — 창을 주인공 쪽으로 밀어(창 폭의 4%씩, 최대 6번) 바탕 열(바탕 ≥ 85%)에서 끊는다
    const cols = style.kvMeta?.field?.cols;
    if (cols?.length) {
      const bgAt = ox => cols[Math.min(cols.length - 1, Math.max(0, Math.floor(-ox / (crop.iw * crop.scale) * cols.length)))]?.bg ?? 1;
      const minOx = bw - crop.iw * crop.scale;
      let ox = crop.ox, tries = 0;
      while (tries < 6 && bgAt(ox) < 0.85 && ox > minOx + 0.5) { ox = Math.max(minOx, ox - Math.round(bw * 0.04)); tries++; }
      if (ox !== crop.ox && bgAt(ox) >= 0.85) { crop.ox = ox; crop.pos = `${ox}px ${crop.oy}px`; crop.left = Math.round(-ox / (crop.iw * crop.scale) * 1000) / 1000; crop.nudged = true; }
    }
  }
  let placed = crop;
  if (crop && side === 'bottom') {
    // 띠 윗줄이 주인공을 가르면(바탕 < 85%) 그 줄이 녹아 뿌옇게 번진다 — 윗줄이 바탕이 될 때까지 배율을 8%씩 낮춘다(통째 배율의 1.25배는 지킨다). 못 찾으면 원래 창
    const rows = style.kvMeta?.field?.rows;
    if (rows?.length) {
      const bgTop = c => rows[Math.min(rows.length - 1, Math.max(0, Math.floor(c.top * rows.length)))]?.bg ?? 1;
      let c = crop, k = 1;
      // 바탕 95% — 85%면 귀 끝을 가르는 줄도 통과해 귀가 녹아 보인다(여우 300×600)
      while (bgTop(c) < 0.95 && k > 0.55) { k *= 0.92; const c2 = subjectCrop(style, bw, bh, { sMul: k }); if (!c2) break; c = c2; }
      if (c !== crop && bgTop(c) >= 0.95) placed = { ...c, eased: true };
    }
  }
  if (placed) { trueEdge = false; joinFrac = side === 'right' ? placed.left : placed.top; }
  return { cutout, bw, bh, far, pos, trueEdge, crop: placed, joinFrac: Math.round(joinFrac * 1000) / 1000 };
}

// 통째로 덮은(cover) 그림의 윗변이 그림의 어느 높이에 걸리는가(0 = 그림 윗변 그대로) — pos 'X% Y%' 또는 'X% Npx'
export function coverTopFrac(pos, bw, bh, ar) {
  if (!ar || !(bw > 0 && bh > 0)) return 0;
  const imgH = bw / bh > ar ? bw / ar : bh;
  if (imgH <= bh + 0.5) return 0;
  const m = String(pos).trim().split(/\s+/);
  const y = m[1] ?? '50%';
  const oy = y.endsWith('px') ? Number.parseFloat(y) : -(Number.parseFloat(y) / 100) * (imgH - bh);
  return Math.max(0, Math.min(1, -oy / imgH));
}
const arKvOf = style => style.kvMeta?.ar ?? null;

// 키비주얼 층 — 상자에 가두지 않는다. 지면 가장자리까지 붙이고, 글자 쪽 변만 지면으로 녹인다(마스크라 그라데이션 지면에도 맞는다).
//   side 'right' | 'bottom' · size: 이미지가 차지하는 폭(오른쪽) 또는 높이(아래) · edgePad: 그쪽 지면 여백(이미지는 여백까지 덮는다)
//   inset: 가장자리에서 띄울 폭(좌우 끝이 단색이어야 하는 지면) · melt:false 면 녹이지 않는다(투명 배경 규격)
// 그 변이 이미 지면색과 같으면(field.seamless) 그 변을 기준으로 붙여 이음매에서 그림이 잘리지 않게 하고, 녹이는 폭을 줄인다.
// 배경을 딴 이미지는 자르지 않고 맞춰 넣는다.
export function kvLayer(style, field, { side, w, h, size, edgePad = 0, inset = 0, melt = true, top = 0 }) {
  const url = String(style.keyVisual).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { cutout, bw, far, pos, trueEdge, crop, joinFrac } = kvPlacement(style, field, { side, w, h, size, edgePad, inset, top });
  const hh = side === 'right' ? h - top : h;
  // 맞닿는 변이 평평하지 않으면(사진) 더 넓게 녹인다 — 리멤버 예시 사진은 지면 폭의 30% 남짓이 그라데이션. 주인공으로 당긴 자리는 그림 한가운데가 변이다
  const joinFlat = crop ? false : style.kvMeta?.field?.edges?.[side === 'right' ? 'left' : 'top']?.flat;
  // 이음매 줄이 바탕(≥85%)이고 그 색이 지면과 거의 같으면 넓게 녹일 이유가 없다(10%) — 넓은 녹임은 그림을 뿌옇게 만들어 AI 티가 난다
  const axis = side === 'right' ? 'cols' : 'rows';
  const prof = style.kvMeta?.field?.[axis];
  const jr = prof?.length ? prof[Math.min(prof.length - 1, Math.max(0, Math.round(joinFrac * (prof.length - 1))))] : null;
  // 지면이 이음매 색으로 이어진 그라데이션(joinField)이면 자리 쪽 끝 색과 비교한다
  const near = field?.stops?.length ? field.stops[field.stops.length - 1] : null;
  // 이음매 줄이 바탕 95% 이상이고 지면색과 같으면 10%, 85~95%(귀·팔 끝만 걸림)면 20% — 85%를 '조용하다'고 보고 10%만 녹이면 뚝 끊기고, 30%로 길게 녹이면 팔이 뿌옇다
  const same = !!(jr?.hex && near && colorDistance(jr.hex, near) < 0.035);
  const quiet = same && jr.bg >= 0.95, calm = same && jr.bg >= 0.85;
  const pct = quiet ? 10 : calm ? 20 : trueEdge ? 16 : joinFlat === false ? 38 : 30;
  const dir = side === 'right' ? 'to right' : 'to bottom';
  // 오른쪽 열이 로고 띠 아래(top>0)에서 시작하면 열의 윗변은 지면 한가운데의 직선이다 — 그 줄이 그림의 바탕이 아니면(여우 귀가 잘림) 윗변도 녹인다(10-06 사용자 "뚝 끊은 면… 그라로 넣던지").
  // 윗줄이 바탕이고 지면색과 같으면 녹일 게 없다. 녹임은 짧게(22%) — 머리 위를 길게 녹이면 뿌옇다
  const topFrac = side === 'right' && top > 0 && !cutout ? (crop ? crop.top : coverTopFrac(pos, bw, hh, arKvOf(style))) : null;
  const rows = style.kvMeta?.field?.rows;
  const tr = (topFrac != null && rows?.length) ? rows[Math.min(rows.length - 1, Math.max(0, Math.round(topFrac * (rows.length - 1))))] : null;
  const topQuiet = topFrac == null ? true : tr ? (tr.bg >= 0.95 && (!near || colorDistance(tr.hex, near) < 0.035)) : false;
  const mask = (!melt || cutout) ? '' : topQuiet ? meltMask(dir, pct) : meltMask2(pct, 22);
  // 누끼를 오른쪽 열에 맞춰 넣을 때 폭이 모자라 작아지면(건물·3D처럼 가로가 긴 누끼) 높이에 맞추고 오른쪽·아래로 붙인다 — 폭이 열의 130%까지 넘치는 건 지면 밖으로 잘린다.
  // 보드 1-884 코엑스 카드가 건물을 오른쪽 아래로 크게 두고 가장자리에서 자른 문법. 그 이상 넘치면 그냥 맞춰 넣는다(캐릭터 떼가 반 잘리면 안 된다)
  const arKv = style.kvMeta?.ar;
  const bleed = cutout && side === 'right' && arKv && hh * arKv > bw && hh * arKv <= bw * 1.3;
  const fill = `background:url('${url}') ${cutout ? (bleed ? `right bottom/auto ${hh}px` : `${far}/contain`) : crop ? `${crop.pos}/${crop.size}` : `${pos}/cover`} no-repeat;${crop ? `--kv-gain:${crop.gain};` : ''}${bleed ? '--kv-bleed:1;' : ''}`;
  return side === 'right'
    ? `<div data-object="1" style="position:absolute;top:${top ? top + 'px' : 0};right:${inset}px;width:${size + edgePad - inset}px;height:${hh}px;${fill}${mask}"></div>`
    : `<div data-object="1" style="position:absolute;left:0;bottom:0;width:${w}px;height:${size + edgePad}px;${fill}${mask}"></div>`;
}
