// 글자 정렬 프리셋(10-19) — 「기준 명확한 거 제외하곤 정렬 선택할 수 있게 · 글자 이동 대신 정렬만, 그에 따라 비주얼 위치도」(사용자 10-19).
//
// 한 군데서 정한다 — 앱 인스펙터(app/editor.js)·렌더러(core/renderers/ad.js)·테스트(test/align-preset.test.js)가 같이 쓴다.
//   ① 잠금 판정 alignLockOf(spec): 매체 규정·공식 템플릿 틀을 그대로 쓰는 규정 매체(mediumRules.fonts.required — 자소설·리멤버·카카오),
//      글자가 없는 규격(visualOnly · logoOnly · 전달물 asset), 틀(mold)에 alignLocked 가 적힌 규격은 고를 수 없다. 이유 한 줄을 돌려준다.
//   ② 자유 배치의 짝: 왼쪽 정렬 → 키비주얼 오른쪽 열(또는 우하단) · 오른쪽 정렬 → 왼쪽 열(거울, mirrorX) · 가운데 → 아래 띠(가로형은 아래 가운데, 세로형은 아래)
//   ③ 틀(mold) 규격: 글자 칸(행)은 그대로 두고 칸 안에서 text-align 만 — 키비주얼 칸·로고 칸은 렌더 시 거울 반사(틀 좌표 데이터는 손대지 않는다)
//      오른쪽: x' = w − x − 칸폭 · 가운데: 칸을 가로 가운데로(세로 자리 유지) — 가운데 칸이 글자 줄과 세로로 겹치면 원자리 유지(이유를 trace 에)
// 순수 함수만(브라우저·파일 접근 없음).

import { inImage } from './adfields.js';

export const ALIGN_CHOICES = { auto: '자동', left: '왼쪽', center: '가운데', right: '오른쪽' };
export const ALIGNS = ['left', 'center', 'right'];
// 자유 배치에서 정렬이 데려가는 키비주얼 자리(core/editlayout.js kvPlace 와 같은 낱말 — placeAvail 로 그 규격에서 되는지 본다)
export const ALIGN_KV_PLACE = { left: 'right', right: 'left', center: 'bottom' };
// 글자 열 안 로고 줄(flex) 정렬 — 글자와 같은 쪽
export const ALIGN_JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' };

const isAlign = v => ALIGNS.includes(v);

// 로고만 규격(렌더러 ad.js logoOnly 와 같은 식) — 프로필·로고 이미지: 이름에 로고/프로필, 이미지 안 글자 한도에 메인·서브류가 없다
export function isLogoOnlySpec(spec) {
  const rules = spec?.rules ?? {};
  const inLimits = (rules.textLimits ?? []).filter(inImage);
  return /로고|프로필/.test(rules.name ?? spec?.name ?? '') && !inLimits.some(t => /메인|서브|상세|제목|헤드|문구|카피/.test(String(t.field ?? '')));
}

// 잠금 판정 — { locked, why, kind }. kind: medium(규정 매체 틀) · noText(글자 없음) · mold(틀이 정렬 고정) · null
export function alignLockOf(spec) {
  if (!spec) return { locked: false, why: null, kind: null };
  const rules = spec.rules ?? {}, mr = spec.mediumRules ?? {};
  if (spec.channel === 'asset' || rules.assetOnly) return { locked: true, why: '전달물(파일 그대로) — 글자 없음', kind: 'noText' };
  if (spec.visualOnly || rules.visualOnly) return { locked: true, why: '비주얼만 넣는 규격 — 글자 없음', kind: 'noText' };
  if (isLogoOnlySpec(spec)) return { locked: true, why: '로고만 넣는 규격 — 글자 없음', kind: 'noText' };
  if (mr.fonts?.required) return { locked: true, why: `${mr.name ?? spec.medium ?? '매체'} 공식 템플릿 틀(매체 규정)`, kind: 'medium' };
  const mold = rules.safeArea?.measuredFromTemplate?.mold ?? null;
  if (mold?.alignLocked === true) return { locked: true, why: `${mr.name ?? spec.medium ?? '매체'} 템플릿 틀 — 정렬 고정`, kind: 'mold' };
  return { locked: false, why: null, kind: null };
}

// 스타일(캠페인 + 산출물 개별을 합친 것)에서 이 규격에 실제로 걸리는 정렬 — 'left' | 'center' | 'right' | null(자동 또는 잠김)
export function textAlignOf(style, spec) {
  const v = style?.textAlign;
  if (!isAlign(v)) return null;
  return alignLockOf(spec).locked ? null : v;
}

// 칸 거울 — 오른쪽: x' = w − x − 칸폭 · 가운데: 가로 가운데(세로 유지) · 왼쪽: 그대로
export function mirrorSlot(r, w, align) {
  if (!r) return r;
  if (align === 'right') return { ...r, x: Math.max(0, Math.round(w - r.x - r.w)) };
  if (align === 'center') return { ...r, x: Math.max(0, Math.round((w - r.w) / 2)) };
  return { ...r };
}

// 틀 글자 상자(캔버스 px) — 렌더러 moldFreeRect 가 쓰는 것과 같은 계산(행 x·폭·y·줄 수·줄 간격). 겹침 판정용
export function moldTextBoxes(mold, { w, k = 1 } = {}) {
  const MR = mold?.rows ?? {}; const boxes = [];
  for (const [role, r] of Object.entries(MR)) {
    if (!r || r.y == null) continue;
    const lines = r.lines ?? (role === 'main' ? 2 : 1), pitch = r.chip ? (r.chip.h ?? r.pitch ?? r.px * 1.2) : (r.pitch ?? r.px * 1.2);
    const y0 = r.afterMain != null && MR.main ? MR.main.y + ((MR.main.lines ?? 2) - 1) * (MR.main.pitch ?? MR.main.px * 1.2) + r.afterMain : r.y;
    const extra = r.labelRow ? 1 : 0;
    const x = Math.round((r.x ?? mold.x ?? 0) * k), right = Math.round(((r.x ?? mold.x ?? 0) + (r.w ?? mold.w ?? (w / k - (mold.x ?? 0)))) * k);
    boxes.push({ role, x, y: Math.round(y0 * k), w: Math.max(0, right - x), h: Math.max(0, Math.round((y0 + pitch * (lines + extra)) * k) - Math.round(y0 * k)) });
  }
  return boxes;
}
const yOverlap = (a, b) => a && b && a.y < b.y + b.h && b.y < a.y + a.h;
const rectOverlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && yOverlap(a, b);
const overlapArea = (a, b) => rectOverlap(a, b) ? (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * (Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)) : 0;

// 틀 그림 칸·로고 칸을 정렬에 맞춰 옮긴다(렌더 시 변환). free: 그림 칸이 틀 데이터가 아니라 「글자 상자를 피한 가장 큰 빈 칸」(templateMold.freeKv)이면
//   오른쪽 정렬일 때 왼쪽 아래에 붙는 가장 큰 빈 칸을 다시 찾고(렌더러와 같은 20% 문턱), 없으면 원자리.
// 돌려주는 것: { tImage, tLogo, kv: 'mirror'|'center'|'keep'|null, logo: 'mirror'|'center'|'keep'|null, notes: [] }
export function alignMoldSlots({ mold, w, h, k = 1, tImage, tLogo, align, free = false }) {
  const out = { tImage, tLogo, kv: null, logo: null, notes: [] };
  if (!mold || !isAlign(align) || align === 'left') return out;
  const boxes = moldTextBoxes(mold, { w, k });
  if (tImage) {
    if (free) {
      if (align === 'right') {
        const r = freeRectAt(boxes, w, h, 'left');
        if (r) { out.tImage = r; out.kv = 'mirror'; } else { out.kv = 'keep'; out.notes.push('kv(왼쪽 아래 빈 칸이 좁아 원자리 유지)'); }
      } else out.kv = 'keep';   // 가운데: 자유 그림 칸은 글자 상자를 피한 자리 그대로
    } else if (align === 'right') { out.tImage = mirrorSlot(tImage, w, 'right'); out.kv = 'mirror'; }
    else {
      const c = mirrorSlot(tImage, w, 'center');
      if (boxes.some(b => yOverlap(b, c))) { out.kv = 'keep'; out.notes.push('kv(가운데 칸이 글자 줄과 겹쳐 원자리 유지)'); }
      else { out.tImage = c; out.kv = 'center'; }
    }
  }
  if (tLogo) {
    // 로고 칸: 옮긴 자리가 글자 상자·그림 칸과 겹치는 넓이가 원자리보다 커지지 않으면 옮긴다(틀 글자 상자는 폭이 지면 가득이라 원자리도 상자와는 겹친다 — 「더 나빠지지 않으면」)
    //   오른쪽 정렬은 글자 잉크도 거울(오른끝에 붙는다)이라 로고 거울은 대칭으로 늘 괜찮다. 가운데 정렬만 잰다(잉크가 상자 가운데)
    const m = mirrorSlot(tLogo, w, align);
    const score = (r, slot) => boxes.reduce((a, b) => a + overlapArea(r, b), 0) + overlapArea(r, slot);
    const ok = align === 'right' || score(m, out.tImage) <= score(tLogo, tImage) + 1;
    if (ok) { out.tLogo = m; out.logo = align === 'right' ? 'mirror' : 'center'; }
    else { out.logo = 'keep'; out.notes.push('logo(가운데 자리가 글자·그림 칸과 더 겹쳐 원자리 유지)'); }
  }
  return out;
}
// 좌우 낱말 뒤집기 — 틀 로고 칸 안 정렬(mold.logo.align right ↔ left)
export const flipLR = v => ({ right: 'left', left: 'right' }[v] ?? v);
// 글자 상자를 피해 아래쪽 한 모서리에 붙는 가장 큰 빈 네모(캔버스 px) — side 'left'(왼쪽 아래) · 'right'(오른쪽 아래, 렌더러 moldFreeRect 와 같다)
export function freeRectAt(boxes, w, h, side = 'right') {
  const gap = Math.round(Math.min(w, h) * 0.03);
  const B = side === 'left' ? boxes.map(b => ({ ...b, x: w - b.x - b.w })) : boxes;   // 왼쪽은 상자를 거울에 비춰 오른쪽 아래를 찾고 되비춘다
  const xs = [0, ...B.map(b => b.x + b.w + gap)], ys = [0, ...B.map(b => b.y + b.h + gap)];
  let best = null;
  for (const x0 of xs) for (const y0 of ys) {
    if (w - x0 < w * 0.2 || h - y0 < h * 0.2) continue;
    if (B.some(b => b.x + b.w > x0 && b.y + b.h > y0)) continue;
    const area = (w - x0) * (h - y0); if (!best || area > best.area) best = { x: x0, y: y0, w: w - x0, h: h - y0, area };
  }
  if (!best) return null;
  const r = { x: best.x, y: best.y, w: best.w, h: best.h };
  return side === 'left' ? { ...r, x: w - r.x - r.w } : r;
}

// 모서리 그림 칸의 HTML 을 거울에 맞춘다 — 녹임 방향(to right → to left)·배경 위치 낱말(right bottom → left bottom)만. 좌표(left px)는 이미 거울 값.
//   가운데 칸은 배경 위치의 right → center. 렌더러 mirrorLayer(자유 배치 왼쪽 열)와 같은 치환
export function alignObjectHtml(html, align) {
  if (!html || !isAlign(align) || align === 'left') return html;
  return html.replace(/(<div data-object="[^"]*"[^>]*?style=")([^"]*)"/, (m0, a0, st) => {
    let s = st;
    if (align === 'right') s = s.replace(/to right/g, 'to left').replace(/(background:url\('[^']*'\)\s*)([^\/;]*)\//, (m1, b0, pos) => b0 + pos.replace(/\b(left|right)\b/g, x => (x === 'left' ? 'right' : 'left')) + '/');
    else s = s.replace(/(background:url\('[^']*'\)\s*)([^\/;]*)\//, (m1, b0, pos) => b0 + pos.replace(/\b(left|right)\b/g, 'center') + '/');
    return a0 + s + '"';
  }).replace(/data-melt-dir="to right"/g, align === 'right' ? 'data-melt-dir="to left"' : 'data-melt-dir="to right"');
}

// 규격 목록에서 잠긴 것 모음 — 앱 안내 「n개 규격은 규정으로 잠김」. items: [{ spec, ... }]
export function lockedSummary(specs) {
  const m = new Map(); let n = 0;
  for (const spec of specs) { const L = alignLockOf(spec); if (!L.locked) continue; n++; m.set(L.why, (m.get(L.why) ?? 0) + 1); }
  return { n, reasons: [...m.entries()].sort((a, b) => b[1] - a[1]) };
}
