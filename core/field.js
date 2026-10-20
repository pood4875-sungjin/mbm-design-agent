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

import { mix, colorDistance, contrast, shiftHue, hexToRgb, rgbToHsl, rgbToHex, hslToRgb, BLACK, WHITE } from './palette.js';
import { CANON } from './canon.js';
import { kvTypeOf } from './kvtypes.js';

const ROUGH_MAX = 0.035;   // 이보다 거칠면 "바탕"이 아니라 사진의 디테일이다
const GRADIENT_MIN = 0.045; // 두 끝이 이만큼은 달라야 그라데이션이라 부른다

// facing: 이미지가 글자 쪽으로 맞닿는 변 — 이미지가 오른쪽에 있으면 'left', 아래에 있으면 'top', 왼쪽에 있으면 'right'
// lightPhoto: 사진도 밝은 지면에 녹이는 매체(구글 일화 사옥 → 흰 지면). 자소설은 밝은 매체여도 사진은 브랜드색 지면(한독 → 파랑)
// 어두운 브랜드 지면 — 단색 대신 은은한 대각 그라데이션(왼쪽 위 살짝 밝고 따뜻하게 → 오른쪽 아래 짙게). 보드 1-884 코엑스 카드(보라 → 짙은 보라)·리멤버 예시의 문법.
// 색 거리는 그라데이션 문턱(0.045)을 넘되 글자 대비는 두 끝 모두 지킨다. 단색 전용 규격·'단색' 선택이면 resolveField가 가운데 색으로 접는다
// 어두운 브랜드 지면 — 색상(hue)은 그대로, 명도만 내린다. 밝은 끝이 흰 글자 4.5:1을 넘을 때까지 어둡힌다: 주황·노랑·연두 브랜드(여우 #E0813A)는 그냥 두면 2.7:1이라 검정 글자로 떨어져 싸구려 티가 난다(케이스 장부 R3) — 코엑스 카드처럼 딥 컬러 + 흰 글자가 답
// 밝은 난색 브랜드(CANON warmLightBrand) — 어둡히면 갈색·올리브라 지면은 틴트로 둔다
export function warmLightBrand(brand) {
  const W = CANON.warmLightBrand; if (!W || !/^#[0-9A-Fa-f]{6}$/.test(brand ?? '')) return false;
  const [h, sat] = rgbToHsl(hexToRgb(brand));
  return sat >= 0.4 && h >= W.hueMin && h <= W.hueMax && contrast(brand, WHITE) < W.maxWhiteContrast;
}
export function brandDeep(brand) {
  let d = -0.06;
  while (d < 0.5 && contrast(shiftHue(brand, 0, -d, 0), WHITE) < 4.5) d += 0.02;
  return [shiftHue(brand, 0, -d, 0), shiftHue(brand, 0, -(d + 0.14), 0)];
}

// 화사한 지면색(CANON.kvHarmony, 10-16 오후): 후보 중 채도 ≥ minSat 인 첫 색을 채도 sat 이상·명도 lMin~lMax 로 맞추고, 흰 글자 4.5:1 이 될 때까지만 명도를 내린다. 전부 무채면 null
export function vividOf(cands, K = CANON.kvHarmony) {
  const ok = cands.filter(x => /^#[0-9A-Fa-f]{6}$/.test(x ?? '')).map(hex => ({ hex, hsl: rgbToHsl(hexToRgb(hex)) })).filter(c => c.hsl[1] >= (K.minSat ?? 0.18));
  if (!ok.length) return null;
  // 첫 후보(사진 변 색·누끼 대표색)가 충분히 채도 있으면 그대로, 아니면(베이지·크림·회갈색) 후보 중 가장 채도 높은 색 — 탁한 올리브 대신 복숭아·주황·청록
  const pick = ok[0].hsl[1] >= (K.prefSat ?? 0.4) ? ok[0] : ok.reduce((a, b) => (b.hsl[1] > a.hsl[1] ? b : a));
  let [h, s, l] = pick.hsl;
  s = Math.max(s, K.sat ?? 0.55); l = Math.min(Math.max(l, K.lMin ?? 0.34), K.lMax ?? 0.5);
  let c = rgbToHex(hslToRgb([h, s, l])), guard = 0;
  while (contrast(c, WHITE) < 4.5 && guard++ < 40) { l -= 0.02; c = rgbToHex(hslToRgb([h, s, Math.max(0.08, l)])); }
  return c;
}

// 캠페인 공통 「그림 변 지면」(10-20 사용자 「배경색 일관되지 않게 나오는 것도 문제」): 어느 규격이든 같은 답 — 글자 쪽 변(facing)이 아니라 그림 자체의 네 변에서 고른다.
//   바탕이 그라데이션이면 그림의 축대로(위·아래 평평한 변 색이 다르면 세로 180°, 왼·오른쪽이 다르면 가로 90° — 둘 다면 더 먼 쪽. 한 변 안에서 앞·뒤 반이 다른 것(from→to)도 같은 축의 증거),
//   단톤이면 평평한 변 중 가장 고른(std 작은) 변 색 하나. 규격마다 다른 건 이 그라데이션을 그림 자리에 px 로 맞춰 거는 일뿐(ad.js fieldAlign — at: 두 끝 색이 그림 길이의 어느 몫에 있나).
//   전에는 facing 변의 from→to 를 썼다 — 오른쪽 열 규격(왼변)과 아래 띠 규격(윗변)이 다른 지면이 되고(desk-21 세로 그라데이션: 팝업 하단 띠는 윗변 남색 단색, 모서리 칸은 왼변 그라데이션), 한 캠페인이 두 색이었다
export function edgeField(f, { flatEdge = x => !!(x?.hex && x.opaque >= 0.9 && (x.flat ?? x.rough <= ROUGH_MAX)) } = {}) {
  const E = f?.edges ?? {}; const T = E.top, B = E.bottom, L = E.left, R = E.right;
  const flats = ['top', 'left', 'right', 'bottom'].filter(k => flatEdge(E[k]));
  if (!flats.length) return null;
  const d = (a, b) => (a && b) ? colorDistance(a, b) : 0;
  const cand = [];
  // 세로 축: 위·아래 변 색 / 왼·오른쪽 변 안의 위 반→아래 반
  if (flatEdge(T) && flatEdge(B) && d(T.hex, B.hex) >= GRADIENT_MIN) cand.push({ axis: 'v', stops: [T.hex, B.hex], at: [0.03, 0.97], str: d(T.hex, B.hex) });
  for (const x of [L, R]) if (flatEdge(x) && d(x.from, x.to) >= GRADIENT_MIN) { cand.push({ axis: 'v', stops: [x.from, x.to], at: [0.25, 0.75], str: d(x.from, x.to) }); break; }
  // 가로 축: 왼·오른쪽 변 색 / 위·아래 변 안의 왼 반→오른 반
  if (flatEdge(L) && flatEdge(R) && d(L.hex, R.hex) >= GRADIENT_MIN) cand.push({ axis: 'h', stops: [L.hex, R.hex], at: [0.03, 0.97], str: d(L.hex, R.hex) });
  for (const x of [T, B]) if (flatEdge(x) && d(x.from, x.to) >= GRADIENT_MIN) { cand.push({ axis: 'h', stops: [x.from, x.to], at: [0.25, 0.75], str: d(x.from, x.to) }); break; }
  // 그라데이션은 한 글자색으로 읽혀야 쓴다(gradientReadable): 흰 글자 3:1 이 두 끝 다 되거나(또는 vividWhite 로 되거나), 두 끝 다 밝아 검정 글자인 그라데이션(비씨월드 라벤더). 한 끝은 채도 지면(흰 글자, 10-12 desk-12 초록)·한 끝은 연한 색이면 글자색이 갈라진다 — 단색으로
  if (cand.length) { const c = cand.sort((a, b) => b.str - a.str)[0]; if (gradientReadable(c.stops)) return { stops: c.stops, angle: c.axis === 'v' ? 180 : 90, align: { axis: c.axis, at: c.at } }; }
  // 단색: 평평한 변 중 왼쪽 → 위 → 오른쪽 → 아래 순(글자가 왼쪽에 서는 규격이 다수 — 어느 규격이든 같은 변)
  const solid = ['left', 'top', 'right', 'bottom'].map(k => E[k]).find(flatEdge);
  return { stops: [solid.hex], angle: 180, align: null };
}
export function gradientReadable(stops) {
  const w = Math.min(...stops.map(s => contrast(s, WHITE))), b = Math.min(...stops.map(s => contrast(s, BLACK)));
  if (w >= 3) return true;
  if (vividWhite(stops)) return true;
  return b >= 4.5 && !stops.some(s => !!vividWhite([s]));
}
export function resolveField(style, { facing = 'left', solidOnly = false, light = false, lightPhoto = false } = {}) {
  const p = style.palette ?? {};
  const opt = style.background ?? {};
  const f = style.keyVisual ? style.kvMeta?.field ?? null : null;
  const dominant = style.keyVisual ? style.kvMeta?.colors?.[0] ?? null : null;
  let stops = null, angle = 180, source = null, seamless = false, align = null, deviation = null;   // deviation: 이 규격이 캠페인 공통 지면에서 벗어난 이유(규정·모드) — 없으면 null(10-20)

  // 지면을 정하는 순서: ① 직접 고른 색 → ② 배경을 품은 일러스트의 가장자리 색(이음매가 없어야 하니 로고보다 우선) → ③ 흰색 로고만 있으면 어두운 브랜드색 → ④ 사진·누끼는 브랜드색(밝은 매체면 틴트)
  const flatEdge = x => !!(x?.hex && x.opaque >= 0.9 && (x.flat ?? x.rough <= ROUGH_MAX));
  const e = f?.edges?.[facing];
  const hasBg = !!(f && f.kind !== 'photo' && f.opaque >= 0.5);
  // 글자 쪽 변은 그림이 걸쳐 있지만 다른 변이 평평하면(한미글로벌 3D: 위는 흰 바탕, 왼쪽은 글자가 가로지름) 그 바탕색이 지면이다.
  // 대표색을 쓰면 그림의 흰 바탕이 상자처럼 드러나고, 오브젝트가 오른쪽인 규격과 아래인 규격의 지면색이 달라진다(구글 GDN 5규격은 지면색이 같다 28/28)
  const other = (hasBg && !flatEdge(e)) ? ['top', 'bottom', 'left', 'right'].map(k => f.edges?.[k]).find(flatEdge) : null;

  if (opt.color) { stops = [opt.color]; source = 'manual'; }
  // 사람이 색 자리를 손으로 고쳤으면(10-19 사용자 「저기서 바꾸면 배경이든 컬러가 반영돼야 — 그라데이션까지」) 지면 = 주색 → 같은 색상을 조금 어둡힌 그라데이션 135°. 비주얼 우선(kv-vivid)보다 앞
  else if (style.colorsManual && p.primary) { stops = [p.primary, shiftHue(p.primary, 0, -0.08, 0)]; angle = 135; source = 'palette-manual'; }
  // 그림 변 지면(kv-edge): 규격(facing)과 무관하게 그림 네 변에서 한 번 정한다(edgeField, 10-20 캠페인 공통 지면). seamless 는 배치용(글자 쪽 변이 평평해 그 변을 기준으로 붙인다) — 색은 바꾸지 않는다
  else if (hasBg && (flatEdge(e) || other)) { const ef = edgeField(f, { flatEdge }); stops = ef.stops; angle = ef.angle; align = ef.align; source = 'kv-edge'; seamless = flatEdge(e); }
  // 분위기 있는 KV 배경 > 브랜드 지면색(CANON kvMood, 10-12) — 누끼의 원본 바탕 팔레트, 어두운 사진, 채도 있는 그라데이션 변(10-20: facing 변이 아니라 그림 축으로 — 캠페인 공통)
  else if (moodStops(style, e, f)) { const m = moodStops(style, e, f); stops = m.stops; source = m.source; angle = m.angle; align = m.align ?? null; }
  // 비주얼 우선 지면(CANON kvHarmony, 10-16): 사진은 글자 쪽 변 색, 누끼는 대표색 — 어두운 매체는 흰 글자 4.5:1 까지 어둡힌 같은 색상, 밝은 매체는 옅은 틴트. 브랜드색은 포인트에만
  else if (CANON.kvHarmony && f && (f.kind === 'photo' || f.opaque < 0.5) && (e?.hex || dominant)) {
    const K = CANON.kvHarmony;
    const pal = (style.kvMeta?.colors ?? []).filter(Boolean);
    // 10-20 캠페인 공통 지면: 후보에 글자 쪽 변(facing)을 넣으면 오른쪽 열 규격(왼변)과 아래 띠 규격(윗변)의 색이 갈린다 — 사진은 왼변(글자가 왼쪽에 서는 규격이 다수) 하나로 고정, 누끼는 대표색·팔레트만
    const cands = [...new Set((f.kind === 'photo' ? [f.edges?.left?.hex, dominant, ...pal] : [dominant, ...pal]).filter(Boolean))];
    const vivid = vividOf(cands, K);
    if (vivid) { stops = [vivid, shiftHue(vivid, 0, -0.08, 0)]; angle = 135; source = f.kind === 'photo' ? 'kv-vivid-photo' : 'kv-vivid'; }   // 화사한 KV 색 + 흰 글자(10-16 오후)
    else {   // 전부 무채(회색·베이지) — 「안 묻는」 그림. 그때만 옅은 틴트 + 검정 글자
      const base = cands[0];
      stops = [mix(base, WHITE, K.tint ?? 0.78), WHITE]; angle = 180; source = 'kv-harmony-tint';
    }
  }
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
    const warm = warmLightBrand(brand);
    // 10-20 캠페인 공통 지면: 매체 프로필(구글 lightField·자소설 bgLight)로 틴트/딥을 가르지 않는다 — 같은 캠페인이 자소설은 분홍 틴트, 카카오는 딥 빨강으로 갈렸다(사용자 보드: ABL 떼 누끼 × 로고 빨강). 밝은 난색 브랜드(warm)는 브랜드 자체의 성질이라 캠페인 공통
    const tint = warm;
    if (tint) { stops = [mix(brand, WHITE, CANON.warmLightBrand.tint), WHITE]; angle = 180; source = 'brand-tint-warm'; }
    else {
      stops = brandDeep(brand); angle = 135; source = f.kind === 'photo' ? 'brand-photo' : 'brand';
      // 10-12 GC녹십자(밝은 사진 × 네이비 브랜드): 지면이 그림과 따로 정해져 이음매 쪽 색이 멀면(거리 ≥ bridgeFrom) 이음매 쪽 끝을 그림 변 색 쪽으로 당긴다 —
      //   흰 글자 4.5:1을 지키는 데까지만. 글자 쪽 끝은 브랜드 딥 그대로
      const eh = f?.edges?.left?.hex ?? e?.hex, B = CANON.melt;   // 10-20: 브릿지 색도 규격(facing)과 무관하게 왼변 기준
      // 밝은 사진만(그림 밝기 ≥ bridgeMinLum) — 어두운 사진(한진 빌딩 0.40)은 브랜드 딥 그대로 녹인다: 당기면 남색이 청록 회색으로 탁해졌다(10-14 t1014 한진정보통신 디자이너 9/9 남색 브랜드)
      if (eh && B?.bridgeFrom && colorDistance(eh, stops[stops.length - 1]) >= B.bridgeFrom && (f?.lum ?? 1) >= (B.bridgeMinLum ?? 0)) {
        let t = B.bridgeMax ?? 0.6, end = null;
        while (t > 0.05) { const c = mix(stops[0], eh, t); if (contrast(c, WHITE) >= 4.5) { end = c; break; } t -= 0.05; }
        if (end) { stops = [stops[0], end]; angle = 90; source += '-bridge'; }
      }
    }
  }
  else if (f && dominant) {
    // 배경을 딴 이미지 + 밝은 지면을 쓰는 매체(자소설)면 대표색의 옅은 틴트, 아니면 대표색 그대로
    stops = [dominant];   // 10-20: 밝은 매체 틴트 분기 제거(캠페인 공통 지면)
    source = 'kv-colour';
  }
  if (!stops && style.keyVisual && style.kvMeta?.edge) { stops = [style.kvMeta.edge]; source = 'kv-edge'; }   // 예전에 저장된 캠페인
  if (!stops) {
    const brand = p.primary ?? '#2456D6';
    // 그림 없는 캠페인(브랜드색뿐): 매체 밝은 프로필(자소설 bgLight·구글 lightField)의 틴트는 유지하되 캠페인 공통 지면에서 벗어난 것으로 기록한다(deviation medium-light, 10-20).
    //   그림 있는 캠페인의 같은 분기는 없앴다(위 brand-photo/brand). 그림 없는 캠페인까지 한 색으로 할지는 사용자 결정 대기(테스트 ad.test 「자소설 밝은 단색」 유지)
    const lt = light || warmLightBrand(brand);
    stops = lt ? [mix(brand, WHITE, 0.80), mix(brand, WHITE, 0.90)] : brandDeep(brand);
    if (!lt) angle = 135;
    source = 'brand';
    if (light && !warmLightBrand(brand)) deviation = 'medium-light';
  }

  const mode = solidOnly ? 'solid' : (opt.mode ?? 'auto');
  const far = stops.length > 1 && colorDistance(stops[0], stops[1]) >= GRADIENT_MIN;
  const mid = () => stops.length > 1 ? mix(stops[0], stops[1], 0.5) : stops[0];
  // 그라데이션 변을 단색으로 접으면(우하단 상자·단색 전용 규격) 그림의 변과 지면이 더는 같은 색이 아니다 — 이음매를 녹여야 한다
  if (mode === 'solid' || (mode === 'auto' && !far)) { if (far) { seamless = false; if (mode === 'solid') deviation = solidOnly ? 'solid-only' : 'mode-solid'; } stops = [mid()]; align = null; }   // 단색 전용 규정(에브리타임 홈배너 「동일한 단색 배경만」)이 그라데이션을 접으면 그 규격만 캠페인 지면에서 벗어난다 — 기록
  else if (mode === 'gradient' && !far) { const b = mid(); stops = [shiftHue(b, 0, 0.05, 0), shiftHue(b, 0, -0.05, 0)]; angle = 180; }

  // 글자색 — 그라데이션의 두 끝 모두에서 읽혀야 한다. 큰 글자 기준 대비 3:1(WCAG)을 못 넘으면 그라데이션을 접는다.
  // 색이 있는 지면에는 흰 글자가 먼저다(실제 소재의 관례) — 흰색이 큰 글자 기준 3:1을 넘으면 흰색, 못 넘는 밝은 지면에서만 검정.
  const worst = c => Math.min(...stops.map(s => contrast(s, c)));
  const pick = () => worst(WHITE) >= 3 ? WHITE : (worst(BLACK) >= worst(WHITE) ? BLACK : WHITE);
  let text = pick();
  if (stops.length > 1 && worst(text) < 3) { stops = [mid()]; text = pick(); }
  // 채도 높은 지면엔 흰 글자(CANON vividWhite, 10-12 desk-12) — 같은 색상으로 명도만 조금 내려 흰 큰 글자 3:1, 되면 작은 글자 4.5:1까지
  let dim = null;
  const vv = vividWhite(stops, { manual: !!opt.color || source === 'palette-manual' });
  if (text === BLACK && vv) {
    // 그림 변이 곧 지면(kv-edge) — 그림도 같은 비율로 어둡혀 이음매를 지킨다(CANON vividWhite.dimKv). 단 그림 속 흰 주인공이 회색으로 죽으면 안 된다:
    //   어둡힘이 dimMin 보다 세면 그림은 dimMin 까지만, 남는 차이는 녹임이 잇는다(seamless 해제 → CANON melt 길이)
    if ((seamless || source === 'kv-edge') && CANON.vividWhite.dimKv !== false && vv.dim) { dim = Math.max(vv.dim, CANON.vividWhite.dimMin ?? 0); if (dim > vv.dim + 0.005) seamless = false; if (dim >= 0.995) dim = null; }
    stops = vv.stops; text = WHITE;
  }

  const css = stops.length > 1 ? `linear-gradient(${angle}deg,${stops[0]} 0%,${stops[1]} 100%)` : stops[0];
  // contrast: 지면에서 가장 불리한 곳의 글자 대비 — 4.5에 못 미치면 렌더러가 작은 글자를 흐리게 쓰지 않는다
  return { stops, angle, css, text, source, seamless, gradient: stops.length > 1, contrast: Math.round(worst(text) * 100) / 100, ...(vv && text === WHITE && vv.d > 0 ? { vivid: vv.d } : {}), ...(dim ? { dim } : {}), ...(align && stops.length > 1 ? { align } : {}), ...(deviation ? { deviation } : {}) };
}

// 분위기 지면(CANON kvMood) — 그림 바탕의 색감이 브랜드 지면색보다 먼저다. 없으면 null
export function moodStops(style, e, f, K = CANON.kvMood) {
  if (!K || !f) return null;
  const sat = h => rgbToHsl(hexToRgb(h))[1];
  // ① 누끼 + 원본 바탕 팔레트(kv-orig 에서 잰 것, 또는 사용자가 준 것)
  const bp = style.kvMeta?.bgPalette;
  if (f.opaque < 0.5) return bp?.stops?.length ? { stops: bp.stops.slice(0, 2), angle: bp.angle ?? 180, source: 'kv-mood' } : null;   // 누끼는 원본 팔레트가 있을 때만
  // 10-20 캠페인 공통 지면: 글자 쪽 변(e)이 아니라 그림 자체의 축으로 — 위·아래 변 색(세로 180°, 두 끝 그림 길이의 3%·97%) 또는 왼·오른쪽 변 색(가로 90°) 중 더 먼 쪽. 규격마다 px 로 맞춰 건다(ad.js fieldAlign)
  if (!e?.from || !e?.to) return null;   // 변 안의 흐름(from→to)까지 잰 메타일 때만(예전과 같은 조건)
  const E = f.edges ?? {};
  const ok = x => !!(x?.hex && x.from && x.to);
  const pair = (() => { const v = (ok(E.top) && ok(E.bottom)) ? { stops: [E.top.hex, E.bottom.hex], angle: 180, d: colorDistance(E.top.hex, E.bottom.hex) } : null, h = (ok(E.left) && ok(E.right)) ? { stops: [E.left.hex, E.right.hex], angle: 90, d: colorDistance(E.left.hex, E.right.hex) } : null; const best = [v, h].filter(Boolean).sort((a, b) => b.d - a.d)[0]; return best ?? { stops: [e.from, e.to], angle: 180, d: colorDistance(e.from, e.to) }; })();
  const align = { axis: pair.angle === 180 ? 'v' : 'h', at: [0.03, 0.97] };
  // ② 어두운 사진 → 사진 변 색을 같은 색상으로 흰 글자 4.5:1까지 내린 어두운 지면(군중 사진 전체 깔기는 따로)
  if (f.kind === 'photo' && (f.lum ?? 1) < K.darkPhotoLum) {
    const deep = c => { let d = 0; while (d < 0.5 && contrast(shiftHue(c, 0, -d, 0), WHITE) < K.darkMin) d += 0.02; return shiftHue(c, 0, -d, 0); };
    return { stops: pair.stops.map(deep), angle: pair.angle, align, source: 'kv-mood-dark' };
  }
  // ③ 채도 있는 그라데이션 변(기아 라벤더→파랑 · GC 민트→파랑)
  if ((sat(pair.stops[0]) + sat(pair.stops[1])) / 2 >= K.minSat && pair.d >= K.minGrad) return { stops: pair.stops, angle: pair.angle, align, source: 'kv-mood' };
  return null;
}

// 상대 휘도(WCAG)
export function relLum(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// 채도 높은 지면 → 흰 글자로 갈 수 있는가(CANON vividWhite). 된다면 어둡힌 지면색(stops)·명도 내림(d)·그림을 어둡힐 비율(dim)
//   검정이 이긴 지면에서만 부른다. 노랑·밝은 주황·파스텔은 maxDL 안에서 흰 3:1에 못 닿아 null(검정 유지)
export function vividWhite(stops, { manual = false, V = CANON.vividWhite } = {}) {
  if (!V || manual || !stops?.length) return null;
  const ok = stops.every(s => { const [, sat, l] = rgbToHsl(hexToRgb(s)); const L = relLum(s); return sat >= V.minSat && L >= V.minLum && L <= V.maxLum && l <= (V.maxL ?? 1); });
  if (!ok) return null;
  const dark = d => stops.map(s => shiftHue(s, 0, -d, 0));
  const w = st => Math.min(...st.map(s => contrast(s, WHITE)));
  const reach = (min, cap) => { for (let i = 0; i * V.step <= cap + 1e-9; i++) { const d = i * V.step; if (w(dark(d)) >= min) return d; } return null; };
  const dL = reach(V.minContrastLarge, V.maxDL);
  if (dL == null) return null;
  const dS = reach(V.smallMin, V.smallMaxDL);
  const d = Math.round((dS ?? V.maxDL) * 100) / 100;
  const st = dark(d);
  const l0 = rgbToHsl(hexToRgb(stops[0]))[2], l1 = rgbToHsl(hexToRgb(st[0]))[2];
  return { stops: st, d, dim: d > 0 && l0 > 0 ? Math.round(l1 / l0 * 1000) / 1000 : null, large: dL, small: dS, contrast: Math.round(w(st) * 100) / 100 };
}

// 녹임 그라데이션 — 직선(0→100%)으로 짧게 자르면 "급하게 끊긴" 느낌이 난다(10-06 사용자). 리멤버 사진 예시처럼 길게(30% 안팎), 처음은 천천히 뒤는 빠르게(이징).
// 10-12(CANON melt.ease): smoothstep 여러 마디 — 양 끝이 모두 부드러워야 녹임의 끝이 「선」으로 읽히지 않는다(desk-15·GC녹십자 「뚝 끊기는 느낌」)
export function meltGradient(dir, pct) {
  const n = Math.max(3, CANON.melt?.stops ?? 7);
  const st = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = t * t * (3 - 2 * t);
    const at = Math.round(pct * t * 10) / 10;
    st.push(i === 0 ? `transparent 0%` : i === n - 1 ? `#000 ${at}%` : `rgba(0,0,0,${a.toFixed(2)}) ${at}%`);
  }
  return `linear-gradient(${dir},${st.join(',')})`;
}
// 녹임 길이(%, 그림 칸·띠 길이의 몫) — 그림 변 색과 지면색이 멀수록 길게(CANON melt: min~max, fullAt 거리에서 max).
//   밝은 그림 × 어두운 네이비 지면(GC녹십자 1005×360)은 길게, 같은 색으로 이어지면 base(기존 짧은 값) 그대로
export function meltLength(kvHex, fieldHex, base = 30) {
  const M = CANON.melt; if (!M || !kvHex || !fieldHex) return base;
  const d = colorDistance(kvHex, fieldHex);
  if (d < 0.035) return base;
  const k = Math.min(1, d / M.fullAt);
  return Math.round(Math.max(base, (M.min + (M.max - M.min) * k) * 100));
}
// 이음매 색 후보(10-20 키비주얼 이음 전수 감사): 그림을 덮어 자른(cover·주인공 당김) 자리의 글자 쪽 변은 그림의 변이 아니라 그림 한가운데를 지난다 —
//   그 자리의 색을 그림 「변 색」(edges)으로 보면 한샘 사무실 사진(변 갈색 · 속은 크림 벽·하늘색 화면)이 갈색 지면과 같은 색으로 읽혀 녹임이 기본값(35%)에 머물렀다(전수 감사 cut-short 16/39 규격).
//   · 보이는 변이 그림의 변(frac ≤ edgeTol)이면 변 색(hex·from·to)
//   · 그 변이 걸린 열·행(cols/rows)이 바탕 줄(bg ≥ bgQuiet)이면 그 줄 바탕색 — 기존 quiet/calm 판정과 같은 자리
//   · 그 밖(주인공을 가르는 줄)은 그림 속 색 — 걸린 줄 색 + 대표색 3 + 그 변 쪽 사분면 색. 녹임 길이는 이 중 지면과 가장 먼 색으로 잰다(CANON.melt.seamInside)
export function seamHexes(style, side, frac, { S = CANON.melt?.seamInside } = {}) {
  const f = style.kvMeta?.field; if (!f) return [];
  const axis = (side === 'left' || side === 'right') ? 'cols' : 'rows';
  const prof = f[axis], e = f.edges?.[side];
  const edgeTol = S?.edgeTol ?? 0.02, bgQuiet = S?.bgQuiet ?? 0.85;
  // 사진은 변이 평평해도 그 띠(6%)뿐이고 녹임(30~55%)이 끝나는 곳은 사진 속이다 — 변 색이 아니라 속 색으로(한샘 580 모서리 칸: 왼변 frac 0.016 인데 35% 끝은 크림 벽). 일러스트는 평평한 변(바탕)이 그대로 이어질 때만 변 색
  const atEdge = !(frac > edgeTol) && !(S && f.kind === 'photo') && (e?.flat !== false || !S);
  if (atEdge) return [...new Set([e?.hex, e?.from, e?.to].filter(Boolean))];
  const at = prof?.length ? prof[Math.min(prof.length - 1, Math.max(0, Math.floor(frac * prof.length)))] : null;
  if (at?.hex && (at.bg ?? 0) >= bgQuiet && frac > edgeTol) return [at.hex];
  if (!S) return [at?.hex ?? e?.hex].filter(Boolean);
  const q = f.quadrants ?? {};
  const quads = side === 'left' ? [q.tl, q.bl] : side === 'right' ? [q.tr, q.br] : side === 'top' ? [q.tl, q.tr] : [q.bl, q.br];
  return [...new Set([at?.hex, e?.hex, ...(style.kvMeta?.colors ?? []).slice(0, S.dominant ?? 3), ...quads].filter(h => /^#[0-9A-Fa-f]{6}$/.test(h ?? '')))];
}
// 여러 이음매 색 후보 × 지면 색 끝들 중 가장 먼 거리로 잰 녹임 길이 — 길이와 함께 어떤 색끼리 멀었는지(seam·far) 돌려준다
export function meltNeed(hexes, stops, base = 30) {
  let best = { pct: base, seam: hexes?.[0] ?? null, far: stops?.[0] ?? null, d: 0 };
  for (const hx of hexes ?? []) for (const st of stops ?? []) { const d = colorDistance(hx, st); if (d > best.d) best = { pct: meltLength(hx, st, base), seam: hx, far: st, d }; }
  best.d = Math.round(best.d * 1000) / 1000;
  return best;
}
// 끊김 녹임 길이(%): 잘린 몫(0~1) → CANON.cutFade 의 잘린 몫%×k+base 를 min~max 로 — ad.js cutFade(후처리)와 kvLayer 의 넘친 누끼 왼변 녹임이 같은 자를 쓴다
export function cutFadePct(cutFrac) {
  const C = CANON.cutFade ?? { base: 8, k: 2, min: 10, max: 36 };
  return Math.min(C.max, Math.max(C.min, Math.round(Math.max(0, cutFrac) * 100) * C.k + C.base));
}
// 상자 변이 아니라 그 안의 그림 변(fromPct 만큼 들어간 곳)에서 시작하는 녹임 — 칸보다 작은 그림(contain·제 크기)은 마스크를 상자 변에 걸면 그림 변에선 짧아진다(10-20 전수 감사: NAP 320×50 틀 칸 84px 안 그림 37px, desk-08 제 크기 띠)
export function meltGradientFrom(dir, fromPct, pct) {
  const n = Math.max(3, CANON.melt?.stops ?? 7);
  const st = [`transparent 0%`, `transparent ${Math.round(fromPct * 10) / 10}%`];
  for (let i = 1; i < n; i++) { const t = i / (n - 1), a = t * t * (3 - 2 * t); const at = Math.round((fromPct + pct * t) * 10) / 10; st.push(i === n - 1 ? `#000 ${at}%` : `rgba(0,0,0,${a.toFixed(2)}) ${at}%`); }
  return `linear-gradient(${dir},${st.join(',')})`;
}
export function meltMask(dir, pct) {
  const g = meltGradient(dir, pct);
  return `-webkit-mask-image:${g};mask-image:${g};`;
}
// 양옆(왼쪽·오른쪽)을 함께 녹인다 — 틀 그림 칸에 contain 으로 넣은 그라데이션 바탕 일러스트(10-15 저녁 사용자: 여우 몸 전체가 보이게)
export function meltMaskSides(pctL, pctR) {
  const g = `${meltGradient('to right', pctL)},${meltGradient('to left', pctR)}`;
  return `-webkit-mask-image:${g};-webkit-mask-composite:source-in;mask-image:${g};mask-composite:intersect;`;
}
// 여러 그라데이션을 교집합 마스크 한 줄로(끊김 녹임 cutFade — 기존 녹임 그라데이션과 합친다)
export function meltMaskList(grads) {
  if (!grads.length) return '';
  const g = grads.join(',');
  return grads.length === 1 ? `-webkit-mask-image:${g};mask-image:${g};` : `-webkit-mask-image:${g};-webkit-mask-composite:source-in;mask-image:${g};mask-composite:intersect;`;
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
// 주인공 상자를 못 찾은 그림(focus null — 바탕이 그라데이션이라 덩어리를 못 가른 3D·일러스트)은 줄·열 프로필에서 바탕이 아닌(bg < 0.5) 줄·열을 묶어 어림한다.
// 10-12 desk-15(한국산업단지공단 신호등, 세로 그림): focus 가 없어 아래 띠를 「위 맞춤」으로 덮었더니 1080에서 파란 하늘만 보였다(그림이 없는 듯)
export function profileFocus(f) {
  if (!f || f.focus || (f.opaque ?? 1) < 0.5) return f?.focus ?? null;
  const span = prof => { if (!prof?.length) return null; const idx = prof.map((r, i) => (r && (r.bg ?? 1) < 0.5) ? i : -1).filter(i => i >= 0); if (!idx.length || idx.length === prof.length && false) return null; if (!idx.length) return null; const a = idx[0] / prof.length, b = (idx[idx.length - 1] + 1) / prof.length; return [a, b]; };
  const ry = span(f.rows), rx = span(f.cols);
  if (!ry && !rx) return null;
  const [y0, y1] = ry ?? [0, 1], [x0, x1] = rx ?? [0, 1];
  if ((y1 - y0) * (x1 - x0) > 0.95) return null;   // 그림 전체가 주인공이면 어림할 게 없다
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, derived: true };
}
export function coverPos(style, bw, bh, { seamless = false, side = 'bottom', fallback = 'center', headroom = 0.04 } = {}) {
  const ar = style.kvMeta?.ar, focus = profileFocus(style.kvMeta?.field);
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
  if (lossV > 0.3 || headCut || headroom > 0.04) oyPx = Math.round(Math.min(0, Math.max(bh - imgH, -(focus.y - focus.h / 2) * imgH + bh * headroom)));   // 머리 위 숨 4%(모서리 상자 덮기는 위 글자에 닿지 않게 더)
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
  // 인물 사진(사람 상자 + 얼굴, palette.js personFocus) — 아래 띠가 폭 맞춤(cover)으로는 머리~턱을 못 담으면(AI 간호사 인스타 1080: 띠 393px, 머리~턱 497px → 코에서 잘림)
  // 그림을 줄여 머리~턱이 띠 높이의 94%에 들게 하고 오른쪽에 붙인다 — 왼변·윗변을 녹인다(kvLayer). 머리는 절대 자르지 않는다(10-12 결정 반영·남은 문제)
  if (!cutout && side === 'bottom' && !placed) { const pf = portraitFit(style, bw, bh); if (pf) placed = pf; }
  if (placed) { trueEdge = false; joinFrac = side === 'right' ? placed.left : placed.top; }
  return { cutout, bw, bh, far, pos, trueEdge, crop: placed, joinFrac: Math.round(joinFrac * 1000) / 1000 };
}

// 인물 사진을 아래 띠에 넣을 때 머리~턱(사람 상자 윗변 → 가장 큰 얼굴 아래 + 얼굴 높이 25%)이 폭 맞춤으로 안 들어가면 줄여서 오른쪽에 붙인다.
//   반환: subjectCrop 과 같은 꼴 + portrait(그림이 실제로 차지하는 폭 dw) — 띠보다 좁으면 kvLayer 가 왼변도 녹인다. 들어가면 null(coverPos 가 머리 기준으로 놓는다)
export function portraitFit(style, bw, bh) {
  const f = style.kvMeta?.field, P = f?.person, ar = style.kvMeta?.ar;
  if (!P?.faces?.length || f?.focus?.source !== 'person' || !ar || !(bw > 0 && bh > 0)) return null;
  const face = P.faces.reduce((a, b) => ((b.x1 - b.x0) * (b.y1 - b.y0) > (a.x1 - a.x0) * (a.y1 - a.y0) ? b : a));
  const px = style.kvMeta?.px, iw = px?.[0] ?? Math.round(ar * 1000), ih = px?.[1] ?? 1000;
  const top = Math.max(0, P.y0 - 0.02), bot = Math.min(1, face.y1 + (face.y1 - face.y0) * 0.25);
  const s0 = Math.max(bw / iw, bh / ih);
  if ((bot - top) * ih * s0 <= bh * 0.94) return null;
  const s = Math.max(bh / ih, (bh * 0.94) / ((bot - top) * ih));
  const dw = Math.min(bw, Math.round(iw * s)), dh = ih * s;
  // 얼굴 가운데가 그림 칸(dw) 가운데에 오게 — 칸보다 그림이 넓을 때만 옆으로 민다
  const cx = (face.x0 + face.x1) / 2 * iw * s;
  const ox = Math.round(Math.min(0, Math.max(dw - iw * s, dw / 2 - cx)));
  const oy = Math.round(Math.min(0, Math.max(bh - dh, -(top * dh) + bh * 0.04)));
  return { size: `${Math.round(iw * s)}px auto`, pos: `${ox}px ${oy}px`, ox, oy, iw, ih, scale: Math.round(s * 1000) / 1000, gain: Math.round(s / s0 * 100) / 100,
    top: Math.round(-oy / dh * 1000) / 1000, left: Math.round(-ox / (iw * s) * 1000) / 1000, portrait: { w: dw } };
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
export function kvLayer(style, field, { side, w, h, size, edgePad = 0, inset = 0, melt = true, top = 0, bleedMax = 1.3, cutLeft = null }) {
  const url = String(style.keyVisual).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { cutout, bw, bh, far, pos, trueEdge, crop, joinFrac } = kvPlacement(style, field, { side, w, h, size, edgePad, inset, top });
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
  const pct0 = quiet ? 10 : calm ? 20 : trueEdge ? 16 : joinFlat === false ? 38 : 30;
  // 10-12 CANON melt: 이음매의 그림 색(걸린 줄 → 없으면 변 색)과 지면색이 멀면 길게. 그라데이션 바탕 그림(변 양 끝 색이 다름)은 줄 평균이 같아도 짧게 두지 않는다(midas-cards-orange 1005×360)
  const seamHex = jr?.hex ?? style.kvMeta?.field?.edges?.[side === 'right' ? 'left' : 'top']?.hex ?? null;
  const gradSeam = (() => { const e = style.kvMeta?.field?.edges?.[side === 'right' ? 'left' : 'top']; return !!(e?.from && e?.to && colorDistance(e.from, e.to) > 0.06); })();
  const farStop = (seamHex && field?.stops?.length) ? field.stops.reduce((m, x) => colorDistance(seamHex, x) > colorDistance(seamHex, m) ? x : m) : near;
  const pct = (pct0 <= 20 && !gradSeam) ? pct0 : meltLength(seamHex, farStop, pct0);
  const dir = side === 'right' ? 'to right' : 'to bottom';
  // 오른쪽 열이 로고 띠 아래(top>0)에서 시작하면 열의 윗변은 지면 한가운데의 직선이다 — 그 줄이 그림의 바탕이 아니면(여우 귀가 잘림) 윗변도 녹인다(10-06 사용자 "뚝 끊은 면… 그라로 넣던지").
  // 윗줄이 바탕이고 지면색과 같으면 녹일 게 없다. 녹임은 짧게(22%) — 머리 위를 길게 녹이면 뿌옇다
  const topFrac = side === 'right' && top > 0 && !cutout ? (crop ? crop.top : coverTopFrac(pos, bw, hh, arKvOf(style))) : null;
  const rows = style.kvMeta?.field?.rows;
  const tr = (topFrac != null && rows?.length) ? rows[Math.min(rows.length - 1, Math.max(0, Math.round(topFrac * (rows.length - 1))))] : null;
  const topQuiet = topFrac == null ? true : tr ? (tr.bg >= 0.95 && (!near || colorDistance(tr.hex, near) < 0.035)) : false;
  const mask = (!melt || cutout) ? '' : topQuiet ? meltMask(dir, pct) : meltMask2(pct, 22);
  // 가이드 대조표(scripts/guide-trace.mjs)가 읽는 녹임 추적 — 마스크와 같은 값. pct0: 색 거리 보정 전 기본값, seam: 이음매 그림 색, far: 지면 먼 끝 색
  const meltData = mask ? ` data-melt="${pct}" data-melt-dir="${dir}"${topQuiet ? '' : ' data-melt-top="22"'} data-melt-base="${pct0}" data-melt-seam="${seamHex ?? ''}" data-melt-far="${farStop ?? ''}"` : '';
  // 누끼를 오른쪽 열에 맞춰 넣을 때 폭이 모자라 작아지면(건물·3D처럼 가로가 긴 누끼) 높이에 맞추고 오른쪽·아래로 붙인다 — 폭이 열의 130%까지 넘치는 건 지면 밖으로 잘린다.
  // 보드 1-884 코엑스 카드가 건물을 오른쪽 아래로 크게 두고 가장자리에서 자른 문법. 그 이상 넘치면 그냥 맞춰 넣는다(캐릭터 떼가 반 잘리면 안 된다)
  const arKv = style.kvMeta?.ar;
  // 캐릭터는 넘치지 않는다 — 열의 왼변은 지면 안쪽이라 몸통이 세로로 뚝 잘린다(10-08 트림한 여우 1.10: 네이버 1250·블라인드·잡다 '뚝 끊김')
  const charKv = (() => { const t = kvTypeOf(style.kvMeta); return !!(t?.flags.character && !t.flags.group); })();
  const bleed = cutout && !charKv && side === 'right' && arKv && hh * arKv > bw && hh * arKv <= bw * 1.3;
  // 아래 띠의 가로 긴 누끼도 같은 문법 — 띠 높이에 맞추면 폭이 지면을 넘칠 때(130%까지) 가운데 두고 좌우를 지면 밖으로 자른다(세로 띠 300×1050 건물)
  const bleedB = cutout && side === 'bottom' && arKv && bh * arKv > w && bh * arKv <= w * bleedMax + 1;
  // 틈 창(cutLeft)이 있으면 가운데가 아니라 창의 왼쪽 끝부터 — 자르기 선이 캐릭터 사이 틈에 떨어진다
  const bPos = cutLeft != null ? `${-Math.round(cutLeft * bh * arKv)}px bottom` : 'center bottom';
  // 작은 누끼는 원본의 1.5배까지만(CANON maxUpscale) — 맞춰 넣은 크기가 넘으면 그 폭으로 작게 둔다
  const capW = cutoutCapW(style), arC = arKv || 1;
  const cutSize = bleed ? (hh * arC > capW ? `${capW}px auto` : `auto ${hh}px`) : bleedB ? (bh * arC > capW ? `${capW}px auto` : `auto ${bh}px`) : (Math.min(bw, bh * arC) > capW ? `${capW}px auto` : 'contain');
  // 넘쳐 흘린 누끼(bleed)는 열의 왼변에서 잘린다 — 가로 띠(320×50·400×76·728×90)에선 그 변이 지면 한가운데의 직선이라 「뚝 끊김」(10-12 남은 문제, midas-stadium-wire·abl-group·desk-22-cut).
  //   잘린 몫이 2%를 넘으면 왼변을 녹인다(잘린 몫 + 8%, 16~30%) — 사진·바탕 그림과 같은 녹임 문법
  const bleedCut = bleed && arKv ? 1 - bw / Math.min(hh * arKv, capW) : 0;
  //   길이는 끊김 녹임과 한 자(CANON.cutFade: 잘린 몫%×k+base, min~max — 10-20 전수 감사: 예전 「잘린 몫+8%, 16~30%」 와 cutFade 가 따로 놀아 같은 잘림에 두 길이가 났다)
  const cutMask = (melt && bleedCut > 0.02) ? meltMask('to right', cutFadePct(bleedCut)) : '';
  const fill = `background:url('${url}') ${cutout ? `${bleed ? 'right bottom' : bleedB ? bPos : far}/${cutSize}` : crop ? `${crop.pos}/${crop.size}` : `${pos}/cover`} no-repeat;${cutout && /px auto$/.test(cutSize) ? '--kv-capped:1;' : ''}${crop ? `--kv-gain:${crop.gain};` : ''}${(bleed || bleedB) ? '--kv-bleed:1;' : ''}`;
  // 인물 사진을 줄여 오른쪽에 붙였으면(portraitFit) 그림 칸만큼만 — 왼변(글자 쪽 지면)과 윗변을 녹인다. 윗변은 짧게(22%) — 머리 위를 길게 녹이면 뿌옇다
  if (side === 'bottom' && crop?.portrait) {
    // 왼변 녹임 길이는 그림 왼변 색과 지면색의 거리로(CANON melt — 사진 가장자리와 지면이 멀면 길게)
    const lHex = style.kvMeta?.field?.edges?.left?.hex ?? null;
    const lFar = (lHex && field?.stops?.length) ? field.stops.reduce((m, x) => colorDistance(lHex, x) > colorDistance(lHex, m) ? x : m) : near;
    const pw = crop.portrait.w, mk = melt ? (pw < w - 1 ? meltMask2(meltLength(lHex, lFar, 30), 22) : meltMask('to bottom', 22)) : '';
    return `<div data-object="1" style="position:absolute;right:0;bottom:0;width:${pw}px;height:${size + edgePad}px;${fill}${mk}--kv-portrait:1"${mk ? ` data-melt="${pw < w - 1 ? meltLength(lHex, lFar, 30) : 22}" data-melt-dir="${pw < w - 1 ? 'to right' : 'to bottom'}" data-melt-top="22"` : ''}></div>`;
  }
  return side === 'right'
    ? `<div data-object="1" style="position:absolute;top:${top ? top + 'px' : 0};right:${inset}px;width:${size + edgePad - inset}px;height:${hh}px;${fill}${mask}${cutMask}"${meltData}${cutMask ? ` data-cut-melt="${cutFadePct(bleedCut)}" data-bleed-cut="${Math.round(bleedCut * 100) / 100}"` : ''}></div>`
    : `<div data-object="1" style="position:absolute;left:0;bottom:0;width:${w}px;height:${size + edgePad}px;${fill}${mask}"${meltData}></div>`;
}

// 누끼를 원본 픽셀의 몇 배까지 키울 수 있나(CANON maxUpscale.cutout, 10-12 desk-37-cut 163px) — 그려도 되는 최대 폭(px). 누끼가 아니거나 크기를 모르면 Infinity
export function cutoutCapW(style) {
  const px = style.kvMeta?.px, k = CANON.maxUpscale?.cutout;
  return ((style.kvMeta?.field?.opaque ?? 1) < 0.5 && px?.[0] > 0 && k) ? Math.round(px[0] * k) : Infinity;
}
// 단일 사물 누끼의 블리드 배치(CANON objectBleed) — 크게, 우하단으로. 10-08 Figma 9월 공채 디자이너 13장: KV 면적 가로형 19~31%·정사각 25%·세로형 22~27%, 보임 63~86%(R·B로 잘림).
//   x0·y0: 보이는 그림이 넘으면 안 되는 왼쪽·위 경계(글자 칸·로고 띠·가이드 그림 상자) · 오른쪽·아래 변으로만 잘린다(maxCut까지, 보임 ≥ 1−maxCut)
//   핵심부(주인공 상자 가운데 core 몫)는 캔버스 안 · 목표 면적(targetArea[shape])에 가장 가까운 배치, 못 닿으면 가장 큰 배치(맞춰 넣기보다 작아지지 않는다)
// 면적은 열·행 투명 프로필(cols·rows, 투명 비율)로 어림한다 — 보이는 몫 = 왼쪽 (1−cutX)의 불투명 질량 × 위쪽 (1−cutY)의 불투명 질량(두 축 독립 가정)
export function objectBleedPlace(style, { w, h, x0 = 0, y0 = 0, shape = 'wide', bleed = null, sym = false } = {}) {
  const f = style.kvMeta?.field, ar = style.kvMeta?.ar, fo = f?.focus;
  if (!f || !ar || !fo || !(w > 0 && h > 0)) return null;
  const B = bleed ?? { maxCut: 0.3, core: 0.6, targetArea: { wide: [0.2, 0.3], square: [0.22, 0.27], tall: [0.22, 0.27], tower: [0.22, 0.27] } };
  const [lo, hi] = B.targetArea?.[shape] ?? B.targetArea?.wide ?? [0.2, 0.3];
  const mid = (lo + hi) / 2;
  const prof = p => (p?.length ? p.map(c => 1 - (c?.bg ?? 1)) : null);
  const cx = prof(f.cols), cy = prof(f.rows);
  const cum = arr => { if (!arr) return t => t; const tot = arr.reduce((a, b) => a + b, 0) || 1; return t => { const k = t * arr.length; let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i] * Math.max(0, Math.min(1, k - i)); return s / tot; }; };
  const Mx = cum(cx), My = cum(cy);
  const cov = cx ? cx.reduce((a, b) => a + b, 0) / cx.length : (fo.density ?? 0.5) * fo.w * fo.h;   // 그림 전체에서 불투명 몫
  const half = (B.core ?? 0.6) / 2;
  // 좁은 세로 띠(폭 ≤ 320, 글자가 그림 위): 왼쪽·오른쪽 양쪽 + 아래로 흘린다(Figma 9월 공채 GDN 300×600·300×1050 디자이너 LRB 블리드, 면적 24~27%).
  // 오른쪽·아래로만 흘리면 왼쪽 변에 붙은 채 폭에 막혀 면적 12%에 그친다. 그림은 주인공 가운데를 지면 가운데에 맞추고(지면 밖으로 넘치는 만큼만 좌우로 잘린다), 핵심부는 캔버스 안
  if (sym) {
    const coreL = Math.max(0, fo.x - fo.w * half), coreR = Math.min(1, fo.x + fo.w * half);
    const maxCy = Math.min(B.maxCut, Math.max(0, 1 - (fo.y + fo.h * half)));
    let best = null, biggest = null;
    for (let i = 0; i <= 40; i++) {
      const dw = w * (0.6 + i * 0.05);                      // 지면 폭의 0.6~2.6배
      if (dw > cutoutCapW(style) && i > 0) continue;        // 작은 누끼는 원본의 1.5배까지(CANON maxUpscale)
      const dh = dw / ar;
      const cutY = Math.max(0, 1 - (h - y0) / dh);          // 경계(y0) 위로 못 올라간다 — 넘치는 만큼 아래로 잘린다
      if (cutY > maxCy + 1e-6) continue;
      const left = dw <= w ? (w - dw) / 2 : Math.min(0, Math.max(w - dw, w / 2 - fo.x * dw));
      const cutL = Math.max(0, -left / dw), cutR = Math.max(0, (left + dw - w) / dw);
      if (cutL > coreL + 1e-6 || 1 - cutR < coreR - 1e-6) continue;
      const vis = (Mx(1 - cutR) - Mx(cutL)) * My(1 - cutY);
      if (vis < 1 - B.maxCut - 1e-6) continue;
      const area = cov * dw * dh * vis / (w * h);
      const c = { cutX: cutL + cutR, cutY, vis, dw, dh, area, left };
      if (!biggest || area > biggest.area) biggest = c;
      if (area >= lo) { const score = Math.abs(Math.min(area, hi) - mid) + (area > hi ? (area - hi) * 2 : 0) + (cutL + cutR + cutY) * 0.05; if (!best || score < best.score) best = { ...c, score }; }
    }
    const c = best ?? biggest; if (!c) return null;
    const dw = Math.round(c.dw), dh = Math.round(c.dh);
    return { left: Math.round(c.left), top: Math.round(h - dh * (1 - c.cutY)), dw, dh, cutX: Math.round(c.cutX * 100) / 100, cutY: Math.round(c.cutY * 100) / 100, vis: Math.round(c.vis * 100) / 100, area: Math.round(c.area * 1000) / 1000, reached: !!best, sym: true };
  }
  const maxCx =Math.min(B.maxCut, Math.max(0, 1 - (fo.x + fo.w * half))), maxCy = Math.min(B.maxCut, Math.max(0, 1 - (fo.y + fo.h * half)));
  let best = null, biggest = null;
  const steps = 12;
  for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
    const cutX = maxCx * i / steps, cutY = maxCy * j / steps;
    const vis = Mx(1 - cutX) * My(1 - cutY);
    if (vis < 1 - B.maxCut - 1e-6) continue;
    // 경계 안에 들어가는 가장 큰 그림 — 폭·높이 중 빠듯한 쪽
    const dw = Math.min((w - x0) / (1 - cutX), ((h - y0) / (1 - cutY)) * ar, cutoutCapW(style));   // 작은 누끼는 원본의 1.5배까지(CANON maxUpscale)
    if (!(dw > 8)) continue;
    const dh = dw / ar;
    const areaF = cov * dw * dh * vis / (w * h);
    const c = { cutX, cutY, vis, dw, dh, area: areaF };
    if (!biggest || areaF > biggest.area) biggest = c;
    // 목표 띠 안이면 덜 자른 것 우선, 띠 위면 목표 상한에 맞춰 줄인다
    if (areaF >= lo) {
      const k = areaF > hi ? Math.sqrt(hi / areaF) : 1;
      const cc = k < 1 ? { ...c, dw: dw * k, dh: dh * k, area: areaF * k * k } : c;
      const score = Math.abs(cc.area - mid) + (cutX + cutY) * 0.05;
      if (!best || score < best.score) best = { ...cc, score };
    }
  }
  const c = best ?? biggest; if (!c) return null;
  const dw = Math.round(c.dw), dh = Math.round(c.dh);
  const left = Math.round(w - dw * (1 - c.cutX)), top = Math.round(h - dh * (1 - c.cutY));
  return { left, top, dw, dh, cutX: Math.round(c.cutX * 100) / 100, cutY: Math.round(c.cutY * 100) / 100, vis: Math.round(c.vis * 100) / 100, area: Math.round(c.area * 1000) / 1000, reached: !!best };
}
// 블리드 배치를 그린다 — 보이는 네모(left·top → 캔버스 오른쪽·아래 끝)에 그림을 제 크기(dw)로, 왼쪽 위에 붙여서. 넘치는 오른쪽·아래는 지면 밖
export function bleedLayer(style, P, w, h) {
  const url = String(style.keyVisual).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const capped = P.dw >= cutoutCapW(style) - 1;
  return `<div data-object="1" data-bleed="1" style="position:absolute;left:${P.left}px;top:${P.top}px;width:${w - P.left}px;height:${h - P.top}px;background:url('${url}') 0px 0px/${P.dw}px auto no-repeat;--kv-bleed:1${capped ? ';--kv-capped:1' : ''}"></div>`;
}
