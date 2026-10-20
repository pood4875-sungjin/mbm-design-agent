// 가이드 검수 판정(10-14 core/guidecheck.js) — 「가이드는 이렇게 말한다(기대) vs 렌더는 이렇게 했다(실측)」를 규칙마다 숫자로 견줘 ✓ / ✗ / – 를 낸다.
// 원래 scripts/guide-rules.mjs(10-12 가이드 대조표)였다. 앱(브라우저)도 같은 판정을 쓰도록 core 로 옮겼다 — scripts/guide-rules.mjs 는 이 파일을 그대로 내보낸다.
// 순수 함수(브라우저·파일 접근 없음). 실측은 core/guidemeasure.js(앱 iframe · scripts/guide-trace.mjs 가 같은 코드), 규칙 문장은 ref/learned/rules.json → core/rules-data.js(node scripts/build-rules.mjs).
//
// 기대값의 출처: ref/learned/rules.json(있으면 — 같은 id 의 text·source 를 덮는다) > core/canon.js CANON > core/kvtypes.js 세분 유형 guide > 매체 guide(core/media/*.json).
// 판정은 숫자에서만 나온다 — 못 재는 규칙은 ok:null(「측정 불가 — 사람 판정」)로 적고 ✓ 라고 하지 않는다.
//
// ctx(C) 모양:
//   spec   { id, w, h, shape, medium }            shape = core/layouts.js shapeOf
//   guide  guideFor(mediumRules)                   CANON 위에 매체 guide 를 덮은 것
//   mr     mediumRules(매체 공통 규칙)             rules.logo 등은 spec.rules
//   rules  spec.rules(규격 원본)
//   trace  렌더 추적(ad.js data-trace JSON)        kv·gate·field·text·scrim·logo·place·fill·fonts·copy·rules
//   m      실측(guide-trace.mjs 브라우저 측정)    frame·objects·kvArea·kvVis·texts·logo·scrim·check(adcheck)·ad(data-*)
//   meta   케이스 측정값(meta.json, typeOverride 입힌 것)
//   kt     kvTypeOf(meta)
//   logoMeta 케이스 로고 실측(colors·tone·solid) — 없으면 null
import { CANON, weightOf } from './canon.js';
import { meltLength, vividWhite, moodStops } from './field.js';
import { contrast, colorDistance, WHITE, BLACK } from './palette.js';
import { KV_SUBTYPES } from './kvtypes.js';
import { limitsByRole, inImage } from './adfields.js';
import { invertBox, safeRect } from './editlayout.js';

const pct = v => v == null ? '—' : `${Math.round(v * 100)}%`;
const px = v => v == null ? '—' : `${Math.round(v * 10) / 10}px`;
const num = (v, d = 2) => v == null ? '—' : String(Math.round(v * 10 ** d) / 10 ** d);
const within = (v, lo, hi, tol = 0) => v != null && v >= lo - tol && v <= hi + tol;
const tallish = s => s === 'tall' || s === 'tower';
const isWhite = c => /^#?fff(fff)?$/i.test(String(c ?? '').replace(/\s/g, '')) || /^rgba?\(255,\s*255,\s*255/.test(String(c ?? ''));
const isBlack = c => /^#?000(000)?$/i.test(String(c ?? '')) || /^rgba?\(0,\s*0,\s*0/.test(String(c ?? ''));

// 실측 글자 하나의 지면 대비 — 그림 위면 표본(sampled), 아니면 지면 색 가운데 가장 불리한 값(field)
const textContrast = t => t?.contrastSampled ?? t?.contrastField ?? null;
// 10-20 사용자 결정(장부 text-on-field-lum): 색 있는 지면(모든 정지점 상대휘도 < CANON.textOn.darkIfLum)은 흰 글자가 기본 — 대비가 3:1 에 못 미쳐도 흰색. 자동 지면(손 지정 아님)의 흰 글자는 대비 규칙에서 「결정으로 면제」(–, note)
const relLumHex = h => { const m = String(h ?? '').match(/^#?([0-9a-f]{6})$/i); if (!m) return null; const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const whiteOnColourField = C => { const F = C.trace?.field; if (!F?.stops?.length || !isWhite(F.text)) return false; if (F.source === 'palette-manual') return false; const thr = CANON.textOn?.darkIfLum ?? 0.45; return F.stops.every(s => { const l = relLumHex(s); return l != null && l < thr; }); };
const mainOf = C => (C.m?.texts ?? []).find(t => t.role === 'main') ?? null;
// 「구멍 뚫린 틀」(templateMold, 10-15~) — 글자 px·굵기·자간·로고 칸이 매체 템플릿 실측(docs/*-mold.md)이라 CANON·보드 가이드 수치로 재지 않는다(10-20 종합 점수표: 틀 규격 34/41 이 weights·tracking ✗ 로 떠 가이드 축을 덮었다)
const isMold = C => C.trace?.mode === 'templateMold';
const textsOf = C => C.m?.texts ?? [];
const obj0 = C => (C.m?.objects ?? [])[0] ?? null;
const warn = (C, code) => (C.m?.check?.warnings ?? []).find(w => w.code === code && w.level !== 'info') ?? null;
const metric = (C, k) => C.m?.check?.metrics?.[k] ?? null;
const guideLine = (C, subId, i) => { for (const list of Object.values(KV_SUBTYPES)) { const s = list.find(x => x.id === subId); if (s) return s.guide?.[i] ?? null; } return null; };

// ── 가이드 배치 규칙(10-14 place.*) 도우미 ──
// 사용자 보고(10-14): 「글자 덩어리를 다른 데로 이동시켜도 검수에서 그냥 통과된다」 — 빈 곳으로 옮기면 겹침(adcheck)·매체 규정(lint)·가이드 44개 어디에도 안 걸렸다.
// 자동 배치가 글자에 비워 둔 칸(렌더러 trace.place.zone + 실측 [data-text-col])·시작선·로고 자리를 기준으로 직접 수정이 거기서 벗어났는지 본다.
// 직접 수정 이동은 left/top(글자)·translate(로고·키비주얼)이라 실측 상자에서 그 값을 빼면 자동 상자가 된다 — 프리셋(위치·정렬)은 자동 쪽에 들어간다(오탐 없음).
const manualOf = (C, part) => { const e = C.trace?.edit; const p = e?.manual?.[part]; if (!p) return null; if ((e.ignored ?? []).some(s => String(s).startsWith(part + '('))) return null; return p; };
const textOffPx = C => { const p = manualOf(C, 'text'); return p ? { x: Math.round(p.dx * C.spec.w * 10) / 10, y: Math.round(p.dy * C.spec.h * 10) / 10 } : { x: 0, y: 0 }; };
const shiftBox = (b, dx, dy) => b && { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
const unionBox = list => { const bs = list.filter(b => b && b.w > 0.5 && b.h > 0.5); if (!bs.length) return null; const x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y)), x1 = Math.max(...bs.map(b => b.x + b.w)), y1 = Math.max(...bs.map(b => b.y + b.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
export const textBlockOf = C => unionBox(textsOf(C).map(t => t.ink));
export const PLACE_TOL = { hull: 0.35, zone: 0.04, zonePx: 8, align: 0.015, alignPx: 6, drift: 0.06, margin: 0.04 };
const tolOf = (C, k, kPx) => ({ x: Math.max(kPx, C.spec.w * k), y: Math.max(kPx, C.spec.h * k) });
// 자동 글자 칸(직접 수정 전) — 네모 목록(글자 요소 하나하나가 그중 하나 안에 들면 칸 안)
//   열·띠: 글자 열([data-text-col] 실측, 메인·서브가 열보다 넓게 쓰면 그 폭까지)
//   아래 띠: 그림 윗부분(녹인 구간)으로 겹쳐도 되는 몫(trace.place.overlap — CANON objectOverlap)까지 아래로
//   배경형(bg-room): 그림의 빈 자리(room)도 칸
//   우하단 그림 상자(corner): 「주인공 위 전폭」 + 「주인공 왼쪽 열」의 ㄱ자 — 주인공 = KV 불투명 상자(실측, 직접 수정 이동은 되돌림), 없으면 상자
const autoKvBox = C => { const o = (C.m?.objects ?? []).find(x => !x.root); if (!o) return null; const b = o.bbox ?? o.box; const p = manualOf(C, 'kv'); const a = p ? invertBox(b, p, C.spec.w, C.spec.h) : b; const x0 = Math.max(0, a.x), y0 = Math.max(0, a.y), x1 = Math.min(C.spec.w, a.x + a.w), y1 = Math.min(C.spec.h, a.y + a.h); return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null; };
export function autoTextZone(C) {
  const Z = C.trace?.place?.zone; const off = textOffPx(C);
  const col = C.m?.textCol ? shiftBox(C.m.textCol, -off.x, -off.y) : Z?.col ?? null;
  if (!col) return null;
  const span = Math.max(col.w, Z?.spanW ?? 0);   // 메인·서브가 글자 열보다 넓게 쓰는 규격(카카오 3줄 mainSpan)
  const P = C.trace?.place ?? {};
  if (Z?.cut) {
    const kb = autoKvBox(C); const cut = kb && kb.x < Z.cut.x + Z.cut.w && kb.y < Z.cut.y + Z.cut.h ? kb : Z.cut;
    if (cut.y > col.y + 4) { const head = { x: col.x, y: col.y, w: span, h: cut.y - col.y }; const tail = { x: col.x, y: col.y, w: Math.max(Z.detailW ?? 0, Math.min(span, cut.x - col.x)), h: col.h }; return { rects: [head, tail], col, kind: 'corner', cut }; }
  }
  const main = { x: col.x, y: col.y, w: span, h: col.h };
  if (Z?.side === 'bottom') { const kb = autoKvBox(C); const ov = P.overlap ?? 0; if (kb) { const bot = Math.max(col.y + col.h, kb.y + kb.h * ov); main.h = bot - col.y; } return { rects: [main], col, kind: 'bottom' }; }
  if (Z?.room) return { rects: [main, Z.room], col, kind: 'room' };
  return { rects: [main], col, kind: Z?.side ?? 'none' };
}
const overlapFrac = (a, b) => { if (!a || !b) return 0; const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return (w * h) / Math.max(1, a.w * a.h); };
const inRect = (b, r, t) => b.x >= r.x - t.x && b.y >= r.y - t.y && b.x + b.w <= r.x + r.w + t.x && b.y + b.h <= r.y + r.h + t.y;
const range = (a, b, n) => `${Math.round(a / n * 100)}~${Math.round(b / n * 100)}%`;
const SIDE_KO = { right: '왼쪽', left: '오른쪽', bottom: '위', template: '', none: '', corner: '' };
const H_KO = { left: '왼쪽', center: '가운데', right: '오른쪽' }, V_KO = { top: '위', middle: '가운데', bottom: '아래' };
export const cornerOf = (b, W, H) => { const cx = (b.x + b.w / 2) / W, cy = (b.y + b.h / 2) / H; return { h: cx < 0.4 ? 'left' : cx > 0.6 ? 'right' : 'center', v: cy < 0.4 ? 'top' : cy > 0.6 ? 'bottom' : 'middle' }; };
const cornerKo = c => (c.h === 'center' && c.v === 'middle') ? '가운데' : `${H_KO[c.h]} ${V_KO[c.v]}`;
const TRACE_CORNER = { 'top-right': { h: 'right', v: 'top' }, 'top-left': { h: 'left', v: 'top' }, 'top-center': { h: 'center', v: 'top' } };
const sgn = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 1000) / 10}%`;

// ── 규칙 목록 ────────────────────────────────────────────────────────────────
// 각 규칙: { id, group, name, source, text(가이드 문장), when(C) → 해당 여부, eval(C) → { expect, actual, ok(true|false|null), note? } }
export const RULES = [
  // ── 배치 ──
  { id: 'objectBleed.area', group: '배치', name: '단일 사물 누끼 면적', source: 'canon.objectBleed.targetArea',
    text: '단일 사물 누끼는 크게, 우하단 블리드 — 목표 면적 가로형 20~30% · 정사각·세로형 22~27%(아주 좁은 세로 띠 28~34%)',
    when: C => !!(C.trace?.gate?.singleObj && C.trace?.place?.bleed) && !isMold(C),   // 틀 그림 칸은 템플릿이 크기를 정한다(10-15 「칸 안에 맞춰 넣기」) — 면적 목표는 자유 배치에만(10-20)
    eval: C => { const B = C.guide.objectBleed, sh = C.spec.shape; const tower = B.tower && C.spec.w <= B.tower.maxW && tallish(sh); const [lo, hi] = (tower ? B.tower.targetArea?.[sh] : null) ?? B.targetArea?.[sh] ?? B.targetArea.wide; const a = C.m?.kvArea ?? null;
      return { expect: `${pct(lo)}~${pct(hi)}`, actual: a == null ? null : pct(a), ok: a == null ? null : (C.trace.rules ?? []).includes('maxUpscale') && a < lo ? null : within(a, lo, hi, 0.01), note: `렌더 어림 ${pct(C.trace.place.bleed.area)}${(C.trace.rules ?? []).includes('maxUpscale') ? ' · 작은 원본 1.5배 상한(maxUpscale)에 걸림 — 그림 탓' : C.trace.place.bleed.reached ? '' : ' (목표 못 닿음 — 글자 칸·로고 띠 경계 안에서 가장 큰 배치)'}` }; } },
  { id: 'objectBleed.cut', group: '배치', name: '블리드 잘림 변·몫', source: 'canon.objectBleed.maxCut/edges',
    text: '오른쪽·아래 변으로만 30%까지 잘린다(좁은 세로 띠 ≤320: 좌·우·아래 35%, ≤160: 42%)',
    when: C => !!(C.trace?.gate?.singleObj && C.trace?.place?.bleed && obj0(C)?.cut),
    eval: C => { const B = C.guide.objectBleed, sym = !!C.trace.place.bleed.sym; const tower = B.tower && C.spec.w <= B.tower.maxW; const max = sym ? (tower ? B.tower.maxCut : B.narrow.maxCut) : B.maxCut; const allowed = sym ? B.narrow.edges : B.edges; const c = obj0(C).cut;
      const bad = Object.entries(c).filter(([k, v]) => allowed.includes(k) ? v > max + 0.02 : v > 0.02);
      return { expect: `${allowed.map(k => ({ left: '왼', right: '오른', top: '위', bottom: '아래' })[k]).join('·')} ≤ ${pct(max)}`, actual: `왼 ${pct(c.left)} · 오른 ${pct(c.right)} · 위 ${pct(c.top)} · 아래 ${pct(c.bottom)}`, ok: !bad.length, note: bad.length ? `어긋난 변: ${bad.map(([k]) => k).join(', ')}` : '' }; } },
  { id: 'objectBleed.vis', group: '배치', name: '블리드 보이는 몫', source: 'canon.objectBleed.maxCut',
    text: '오브젝트의 70% 이상은 보인다(좁은 세로 띠 65%, ≤160 58%)',
    when: C => !!(C.trace?.gate?.singleObj && C.trace?.place?.bleed && obj0(C)?.visRatio != null),
    eval: C => { const B = C.guide.objectBleed, sym = !!C.trace.place.bleed.sym; const tower = B.tower && C.spec.w <= B.tower.maxW; const max = sym ? (tower ? B.tower.maxCut : B.narrow.maxCut) : B.maxCut; const v = obj0(C).visRatio;
      return { expect: `≥ ${pct(1 - max)}`, actual: pct(v), ok: v >= 1 - max - 0.02, note: `렌더 어림 ${pct(C.trace.place.bleed.vis)}` }; } },
  { id: 'objectBleed.minTextCol', group: '배치', name: '글자 칸 최소 폭(가로형)', source: 'canon.objectBleed.minTextCol',
    text: '단일 사물 블리드 옆 글자 칸은 안쪽 폭의 42% 이상',
    when: C => !!(C.trace?.gate?.singleObj && C.trace?.place?.objectSide === 'right' && C.trace?.place?.innerW),
    eval: C => { const P = C.trace.place, r = P.textW / P.innerW, min = C.guide.objectBleed.minTextCol ?? 0.42; return { expect: `≥ ${pct(min)}`, actual: `${pct(r)} (${P.textW}px / ${P.innerW}px)`, ok: r >= min - 0.005, note: '렌더 값(DOM 아님)' }; } },
  { id: 'cutout.contain', group: '배치', name: '누끼는 맞춰 넣기(자르지도 녹이지도 않음)', source: 'kvtypes.cutout.place[0] / cutout-character·group·scene guide',
    text: '누끼는 자리에 맞춰 넣는다(contain) — 자르지도 녹이지도 않는다. 가로 긴 누끼는 폭 130%까지 지면 밖으로, 떼·장면은 틈 창(배율 ≤ 2.4)으로 좌우만, 캐릭터 하나는 머리·발은 두고 주인공 상자 가운데 70%는 보이게',
    when: C => C.kt?.id === 'cutout' && !C.trace?.place?.bleed && !C.trace?.gate?.frameFull && ['column', 'band', 'corner-contain', 'box', 'template-band-contain', 'template-band-native', 'template-band-cover', 'template'].includes(C.trace?.place?.mode ?? '') && !!obj0(C)?.cut,
    eval: C => { const o = obj0(C), c = o.cut, fc = o.focusCut; const solo = !!(C.kt?.flags?.character && !C.kt?.flags?.group); const group = !!(C.kt?.flags?.group || C.kt?.flags?.multi); const win = C.trace?.place?.cutLeft != null || (C.trace?.place?.cutBleed ?? 1) > 1.01 || C.trace?.place?.cutBand; const vert = c.top <= 0.02 && c.bottom <= 0.02; const noMask = !o.mask || o.cutMelt != null;
      const cutTxt = `잘림 왼 ${pct(c.left)} 오른 ${pct(c.right)} 위 ${pct(c.top)} 아래 ${pct(c.bottom)} · 녹임 ${o.mask ? o.mask.pct + '%' : '없음'}`;
      // 전신 인물 상반신(CANON bust, 10-14): 머리는 두고(위 0) 허리 아래는 흘린다 — 아래 잘림 ≤ 1 − vis(+여유), 아래 녹임(to top)만 허용
      const bustV = (C.trace?.rules ?? []).includes('kv.bust') ? (C.guide.bust?.vis ?? 0.55) : null;
      if (solo && bustV) { const okMask = !o.mask || o.mask.dir === 'to top'; return { expect: `상반신: 위 0 · 아래 잘림 ≤ ${pct(1 - bustV + 0.1)} · 좌우 합 ≤ 30% · 녹임은 아래(to top)만`, actual: cutTxt, ok: c.top <= 0.02 && c.bottom <= 1 - bustV + 0.1 && c.left + c.right <= 0.31 && okMask, note: '전신 인물 → 상반신(10-14 동서식품 9/9)' }; }
      if (solo) return { expect: '위·아래 0 · 주인공 상자 좌우 잘림 ≤ 15% · 녹임 없음(캐릭터)', actual: `${cutTxt}${fc ? ` · 주인공 상자 왼 ${pct(fc.left)} 오른 ${pct(fc.right)}` : ''}`, ok: vert && noMask && (fc ? fc.left <= 0.16 && fc.right <= 0.16 : c.left + c.right <= 0.31) };
      if (group && win) return { expect: '위·아래 0 · 틈 창 좌우 합 ≤ 60%(배율 2.4) · 녹임 없음', actual: cutTxt, ok: vert && noMask && c.left + c.right <= 0.6, note: '떼·장면은 틈 창(캐릭터 사이 틈)에서 자른다' };
      if (o.bleedFlag) return { expect: '위·아래 0 · 좌우 합 ≤ 30%(폭 130%) · 녹임 없음', actual: cutTxt, ok: vert && noMask && c.left + c.right <= 0.31, note: o.cutMelt != null ? `가로 띠 넘친 누끼 왼변 녹임 ${o.cutMelt}%(10-12 남은 문제)` : '' };
      return { expect: '잘림 0 · 녹임 없음', actual: cutTxt, ok: Math.max(c.left, c.right, c.top, c.bottom) <= 0.02 && noMask }; } },
  { id: 'cutout.square.box', group: '배치', name: '정사각 누끼 모서리 상자', source: 'kvtypes.cutout.place[2]',
    text: '가이드 없는 정사각 규격은 우하단 모서리 상자 58%×55%(캐릭터 하나 64%×72%, 가로 긴 누끼는 아래 띠 30~55%)',
    when: C => C.trace?.place?.mode === 'corner-contain' && !!C.trace?.place?.tImage,
    eval: C => { const solo = !!(C.kt?.flags?.character && !C.kt?.flags?.group); const [ew, eh] = solo ? [0.64, 0.72] : [0.58, 0.55]; const b = C.trace.place.tImage; const rw = b.w / C.spec.w, rh = b.h / C.spec.h; const o = obj0(C)?.box;
      return { expect: `폭 ${pct(ew)} × 높이 ${pct(eh)}`, actual: `상자 폭 ${pct(rw)} × 높이 ${pct(rh)}${o ? ` · 그림 네모 ${pct(o.w / C.spec.w)} × ${pct(o.h / C.spec.h)}` : ''}`, ok: within(rw, ew, ew, 0.015) && within(rh, eh, eh, 0.015), note: '상자는 렌더 값, 그림은 그 안에 우하단 맞춤(contain)' }; } },
  { id: 'fill.maxObject', group: '배치', name: '아래 띠 그림 높이 상한', source: 'canon.fill.maxObject',
    text: '글자 아래가 비면 그림 자리가 자라서 메운다 — 최대 55%(세로형 64%, 캐릭터 하나 72%)',
    when: C => C.trace?.place?.objectSide === 'bottom' && !C.trace?.gate?.template && !!obj0(C)?.box && !C.trace?.place?.bleed,
    eval: C => { const F = C.guide.fill, sh = C.spec.shape; const solo = !!(C.kt?.id === 'cutout' && C.kt?.flags?.character && !C.kt?.flags?.group); let max = tallish(sh) ? (F.maxObjectTall ?? F.maxObject) : F.maxObject; if (solo && tallish(sh)) max = Math.max(max, 0.72); const r = obj0(C).box.h / C.spec.h;
      return { expect: `≤ ${pct(max)}(+아래 여백 ${pct((C.trace.place.pad?.bottom ?? 0) / C.spec.h)})`, actual: pct(r), ok: r <= max + (C.trace.place.pad?.bottom ?? 0) / C.spec.h + 0.01, note: C.trace.fill ? `남는 높이 ${C.trace.fill.slack}px → 키움 ${C.trace.fill.grow}px` : '' }; } },
  { id: 'objectOverlap', group: '배치', name: '글자가 그림 위쪽(녹인 구간)으로 겹치는 몫', source: 'canon.objectOverlap',
    text: '글자는 그림 자리 위쪽(녹인 구간)으로 세로형 30%·세로 띠 15%·정사각 20%까지만 겹친다 — 누끼·사진·윗줄이 주인공이면 0',
    when: C => C.trace?.place?.objectSide === 'bottom' && C.trace?.place?.overlap != null && !!obj0(C)?.box && textsOf(C).length > 0 && !C.trace?.place?.bleed,
    eval: C => { const o = obj0(C).box, objH = Math.max(1, C.trace.place.objH || o.h); const deep = Math.max(0, ...textsOf(C).map(t => t.ink.y + t.ink.h - o.y)) / objH; const exp = C.trace.place.overlap;
      return { expect: `≤ ${pct(exp)} (가이드 ${pct(C.guide.objectOverlap?.[C.spec.shape] ?? 0)})`, actual: pct(deep), ok: deep <= exp + 0.03 }; } },
  { id: 'roomFull', group: '배치', name: '배경형 — 통째로 깔고 빈 자리에 글자', source: 'kvtypes.illust-room.guide[0]',
    text: '배경형(빈 자리 있는 바탕 그림): 캔버스 비율이 그림의 0.6~1.7배면 통째로 깔고 빈 자리에 글자',
    when: C => !!(C.kt?.flags?.room && C.spec.shape !== 'strip' && C.trace?.gate?.hasKv && !C.trace?.gate?.template && !C.rules?.objectBox && !C.trace?.gate?.transparent && !C.trace?.gate?.photoFull),
    eval: C => { const ratio = (C.spec.w / C.spec.h) / (C.meta?.ar ?? 1); const should = ratio >= 0.6 && ratio <= 1.7; const use = C.m?.ad?.['data-kv-use'] ?? C.trace?.gate?.kvUse;
      if (!should) return { expect: `비율 ${num(ratio)}배 — 범위 밖, 자리 배치`, actual: use, ok: use !== 'bg' }; return { expect: `kv-use bg (비율 ${num(ratio)}배)`, actual: use, ok: use === 'bg', note: use !== 'bg' ? '주인공이 60% 넘게 잘리거나 글자 자리가 모자라면 자리 배치로(kvFull 조건)' : '' }; } },
  { id: 'photoCrowd.full', group: '배치', name: '현장·군중 사진은 전체 깔기 + 스크림', source: 'kvtypes.photo-crowd.guide[0]',
    text: '현장·군중 사진: 지면 전체에 깔고 글자 쪽에서 시작하는 브랜드색 스크림 위에 흰 글자',
    when: C => !!(C.kt?.flags?.crowd && C.trace?.gate?.hasKv && !C.trace?.gate?.template && !C.trace?.gate?.transparent),
    eval: C => { const use = C.m?.ad?.['data-kv-use']; const mt = mainOf(C); const a = C.m?.scrim?.maxA ?? null; return { expect: 'kv-use full · 스크림 ≥ 0.9 · 흰 글자', actual: `${use} · 스크림 ${a == null ? '없음' : a} · 글자 ${mt?.color ?? '—'}`, ok: use === 'full' && a != null && a >= 0.85 && isWhite(mt?.color) }; } },
  { id: 'texture.bg', group: '배치', name: '질감은 지면 전체에', source: 'kvtypes.texture.place[0]',
    text: '그라데이션·질감(주인공 없음)은 지면 전체에 깐다 — 글자 덩어리는 세로 가운데에',
    when: C => C.kt?.id === 'texture' && C.trace?.gate?.hasKv && !C.rules?.objectBox && !C.trace?.gate?.transparent,
    eval: C => { const use = C.m?.ad?.['data-kv-use']; return { expect: 'kv-use bg · 세로 가운데', actual: `${use} · vCenter ${C.trace?.place?.vCenter ?? '—'}`, ok: use === 'bg' && !!C.trace?.place?.vCenter }; } },
  { id: 'frame.bg', group: '배치', name: '장식 프레임 누끼는 어두운 지면 전체에', source: 'kvtypes.cutout-frame.guide',
    text: '장식 프레임(유리 슬랩): 지면 전체에 깔고 지면은 어두운 브랜드색, 오른쪽을 크게(지면 폭 1.7배) 잘라',
    when: C => !!(C.kt?.flags?.frame && C.trace?.gate?.hasKv && !C.trace?.gate?.transparent && !C.trace?.gate?.template),
    eval: C => { const use = C.m?.ad?.['data-kv-use']; const f = C.trace?.field; const dark = f?.stops ? Math.min(...f.stops.map(s => contrast(s, WHITE))) >= 4.5 : false; return { expect: 'kv-use bg · 지면 kv-frame(어두움, 흰 글자 4.5:1)', actual: `${use} · ${f?.source ?? '—'} 대비 ${f?.contrast ?? '—'}`, ok: use === 'bg' && f?.source === 'kv-frame' && dark }; } },
  { id: 'photo.column.logoLeft', group: '로고', name: '사진 오른쪽 열이면 로고는 글자 쪽', source: 'kvtypes.photo.place[3]',
    text: '사진이 오른쪽 열인 가로형은 로고를 글자 쪽 지면(좌상단)에 — 사진 위 흰 로고는 밝은 벽·하늘에서 사라진다',
    when: C => !!(C.trace?.gate?.photoCol && C.m?.logo?.box),
    eval: C => { const b = C.m.logo.box, cx = (b.x + b.w / 2) / C.spec.w; return { expect: '좌상단(가로 가운데 왼쪽)', actual: `${C.m.logo.corner} (x 중심 ${pct(cx)})`, ok: cx < 0.5 }; } },
  { id: 'character.head', group: '배치', name: '캐릭터·인물 머리 보존', source: 'kvtypes.*-character / photo-portrait',
    text: '머리는 자르지 않는다(머리 위 숨 4%) — 자를 땐 발·몸 아래부터',
    when: C => !!(C.kt?.flags?.character && obj0(C)?.focusCut),
    eval: C => { const fc = obj0(C).focusCut; return { expect: '주인공 상자 윗변 잘림 ≤ 2%', actual: `윗변 ${pct(fc.top)} · 아랫변 ${pct(fc.bottom)}`, ok: fc.top <= 0.02 }; } },
  // ── 가이드 배치(10-14 사용자 보고: 글자 덩어리를 빈 곳으로 옮겨도 통과) ──
  { id: 'place.textZone', group: '배치', name: '글자 칸(자동 배치가 비워 둔 자리)', source: 'ad.js trace.place.zone / [data-text-col]',
    text: '글자 덩어리는 레이아웃이 글자에 비워 둔 칸(키비주얼 반대쪽 열·띠) 안에 — 칸 밖으로 4%(최소 8px) 넘게 나가지 않는다',
    when: C => textsOf(C).length > 0 && !C.m?.ad?.['data-logo-only'] && !!(C.m?.textCol || C.trace?.place?.zone?.col),
    eval: C => { const Z = autoTextZone(C), t = tolOf(C, PLACE_TOL.zone, PLACE_TOL.zonePx), W = C.spec.w, H = C.spec.h; const blk = textBlockOf(C);
      // ㄱ자(corner)의 주인공 상자는 불투명 픽셀의 외곽 네모라 왼쪽 위 모서리가 빈 경우가 많다 — 글자 요소가 그 네모와 35% 이하로만 겹치고 글자 열 안이면 칸 안(실제 주인공 겹침은 check.textOverSubject 가 본다)
      const hullOk = x => Z.kind === 'corner' && inRect(x.ink, { ...Z.col, w: Math.max(Z.col.w, Z.rects[0].w) }, t) && overlapFrac(x.ink, Z.cut) <= PLACE_TOL.hull;
      const out = textsOf(C).filter(x => x.ink?.w > 0.5 && !Z.rects.some(r => inRect(x.ink, r, t)) && !hullOk(x));
      const u = unionBox(Z.rects); const side = Z.kind;
      const exp = side === 'corner' ? `위 전폭(세로 ${range(Z.rects[0].y, Z.rects[0].y + Z.rects[0].h, H)}) + 그림 왼쪽 열(가로 ${range(Z.rects[1].x, Z.rects[1].x + Z.rects[1].w, W)})`
        : side === 'bottom' ? `위 ${range(u.y, u.y + u.h, H)}` : (side === 'right' || side === 'left') ? `${SIDE_KO[side]} ${range(u.x, u.x + u.w, W)}(세로 ${range(u.y, u.y + u.h, H)})` : side === 'room' ? `글자 열 + 그림 빈 자리(가로 ${range(u.x, u.x + u.w, W)} · 세로 ${range(u.y, u.y + u.h, H)})` : `가로 ${range(u.x, u.x + u.w, W)} · 세로 ${range(u.y, u.y + u.h, H)}`;
      const act = side === 'bottom' && blk.x >= u.x - t.x && blk.x + blk.w <= u.x + u.w + t.x ? `세로 ${range(blk.y, blk.y + blk.h, H)}` : `가로 ${range(blk.x, blk.x + blk.w, W)} · 세로 ${range(blk.y, blk.y + blk.h, H)}`;
      return { expect: `글자 칸: ${exp}`, actual: act, ok: !out.length, note: out.length ? `칸 밖: ${[...new Set(out.map(x => x.role))].join('·')}${manualOf(C, 'text') ? ' — 직접 수정으로 옮김' : ' — 자동 배치(규칙 과제)'}` : '' }; } },
  { id: 'place.textAlign', group: '배치', name: '글자 시작선(여백·정렬선)', source: 'ad.js trace.place.zone.margin / align',
    text: '글자 덩어리의 시작선은 자동 배치의 여백 선과 같다 — 왼쪽 정렬은 왼쪽 여백, 가운데 정렬은 가운데 선, 오른쪽 정렬은 오른쪽 여백선, 아래 띠 규격은 위 여백까지(±6px 또는 1.5%)',
    when: C => textsOf(C).length > 0 && !C.m?.ad?.['data-logo-only'] && !!C.trace?.place?.zone,
    // 시작선 = 자동 글자 열의 시작(실측 [data-text-col] 에서 직접 수정 이동을 뺀 것 — 렌더러 여백 pad 와 같다). 글자 잉크의 왼쪽 곁 여백(≤ 4px, 92케이스 실측)은 허용 오차 안
    eval: C => { const Z = C.trace.place.zone, off = textOffPx(C), blk = textBlockOf(C), t = tolOf(C, PLACE_TOL.align, PLACE_TOL.alignPx); const col = C.m?.textCol ? shiftBox(C.m.textCol, -off.x, -off.y) : Z.col ?? shiftBox(blk, -off.x, -off.y); const rows = [], acts = []; let ok = true;
      if (Z.align === 'center') { const e = col.x + col.w / 2, a = blk.x + blk.w / 2; const g = Math.abs(a - e) <= t.x; ok = ok && g; rows.push(`가운데 정렬선 x ${Math.round(e)}px`); acts.push(`${Math.round(a)}px`); }
      else if (Z.align === 'right') { const e = col.x + col.w, a = blk.x + blk.w; const g = Math.abs(a - e) <= t.x; ok = ok && g; rows.push(`오른쪽 여백선 x ${Math.round(e)}px`); acts.push(`${Math.round(a)}px`); }   // 정렬 프리셋 오른쪽(10-19): 글자 덩어리 오른끝 = 글자 열 오른끝
      else { const g = Math.abs(blk.x - col.x) <= t.x; ok = ok && g; rows.push(`왼쪽 여백 ${Math.round(col.x)}px`); acts.push(`${Math.round(blk.x)}px`); }
      if (Z.side === 'bottom' && Z.v === 'top') { const g = Math.abs(blk.y - col.y) <= t.y; ok = ok && g; rows.push(`위 여백 ${Math.round(col.y)}px`); acts.push(`${Math.round(blk.y)}px`); }
      return { expect: rows.join(' · '), actual: acts.join(' · '), ok, note: ok ? '' : manualOf(C, 'text') ? '직접 수정으로 여백 선에서 벗어남' : '자동 배치의 글자가 여백 선에서 떨어짐(규칙 과제)' }; } },
  { id: 'place.manualDrift', group: '배치', name: '직접 수정 이탈', source: 'core/editlayout.js overrides.layout',
    text: '직접 수정(끌어 옮기기·화살표)은 자동 배치에서 가로·세로 각각 6% 안 — 넘으면 가이드 배치에서 벗어난 것(의도면 넘기기에 이유)',
    when: C => !!C.trace?.edit?.manual,
    eval: C => { const drawn = { text: textsOf(C).length > 0, kv: (C.m?.objects ?? []).some(o => !o.root), logo: !!C.m?.logo?.box }; const parts = ['text', 'kv', 'logo'].filter(k => drawn[k]).map(k => [k, manualOf(C, k)]).filter(([, p]) => p); const NM = { text: '글자', kv: '키비주얼', logo: '로고' }; const lim = PLACE_TOL.drift;
      if (!parts.length) return { expect: `이동 ≤ ${pct(lim)}`, actual: '적용된 직접 수정 없음(매체 칸이 막았거나 그 덩어리가 없음)', ok: null };
      const bad = parts.filter(([, p]) => Math.abs(p.dx) > lim + 1e-4 || Math.abs(p.dy) > lim + 1e-4);
      return { expect: `이동 ≤ ${pct(lim)}(가로·세로 각각)`, actual: parts.map(([k, p]) => `${NM[k]} ${sgn(p.dx)} · ${sgn(p.dy)}${p.scale && p.scale !== 1 ? ` ×${p.scale}` : ''}`).join(' / '), ok: !bad.length, note: bad.length ? `가이드 배치에서 벗어남(직접 수정): ${bad.map(([k]) => NM[k]).join('·')}` : '' }; } },
  // ── 지면 ──
  { id: 'kvMood', group: '지면', name: '분위기 있는 KV 배경 > 브랜드 지면', source: 'canon.kvMood',
    text: '어두운 사진·채도 있는 그라데이션 변·누끼 원본 바탕은 그 색이 지면(kv-mood) — 브랜드는 로고·알약으로',
    when: C => { if (!C.trace?.field || C.trace.gate?.photoFull || C.trace.gate?.textureFull || C.trace.gate?.roomFull || C.trace.gate?.transparent) return false; const facing = C.trace.place?.objectSide === 'bottom' ? 'top' : 'left'; const e = C.meta?.field?.edges?.[facing]; return !!moodStops({ kvMeta: C.meta }, e, C.meta?.field); },
    eval: C => { const facing = C.trace.place?.objectSide === 'bottom' ? 'top' : 'left'; const e = C.meta?.field?.edges?.[facing]; const ms = moodStops({ kvMeta: C.meta }, e, C.meta.field); const src = C.trace.field.source;
      if (src === 'kv-edge' || src === 'manual') return { expect: ms.source, actual: src, ok: null, note: '그림 변이 평평해 가장자리 색이 먼저(kv-edge) — 해당 없음' };
      return { expect: `${ms.source} (${ms.stops.join('→')})`, actual: `${src} (${C.trace.field.stops.join('→')})`, ok: src.startsWith('kv-mood') }; } },
  { id: 'vividWhite', group: '지면', name: '채도 높은 지면엔 흰 글자', source: 'canon.vividWhite',
    text: '채도 ≥ 0.45·중간 밝기 지면은 같은 색상으로 명도만 내려 흰 글자 3:1(작은 글자 4.5:1)',
    when: C => { const f = C.trace?.field; return !!(f?.stops?.length && ['brand', 'kv-edge', 'kv-mood', 'kv-colour', 'brand-photo', 'kv-mood-dark', 'brand-tint'].some(s => f.source?.startsWith(s)) && (vividWhite(f.stops) || f.vivid != null)); },
    eval: C => { const mt = mainOf(C); const c = textContrast(mt); return { expect: '흰 글자 · 대비 ≥ 3:1', actual: `${mt?.color ?? '—'} · ${c == null ? '—' : num(c) + ':1'}`, ok: mt ? isWhite(mt.color) && (c == null || c >= 2.9) : null, note: C.trace.field.vivid != null ? `명도 −${C.trace.field.vivid}` : (mt && isWhite(mt.color)) ? '원래 흰 글자(어두운 지면) — 명도 내림 없음' : '지면이 채도 조건을 만족하는데 vividWhite 가 안 걸림' }; } },
  { id: 'textColour.brand', group: '글자', name: '밝은 지면의 메인은 브랜드색', source: 'canon.textColour',
    text: '밝은 지면의 메인은 브랜드색(지면 어디서나 4.5:1 넘을 때) — 어두운 지면은 흰색. 10-19 사용자 결정(textDefault: 규정 없는 매체는 #333/#fff, 서브 70%)이 걸린 지면은 제외',
    when: C => !!(C.guide.textColour === 'brand' && C.trace?.field && C.trace.text?.mainFg && !isWhite(C.trace.text.mainFg) && C.primary && !C.rules?.textColors?.main && !(C.trace.rules ?? []).includes('textDefault') && !isMold(C) && !C.mr?.fonts?.required),   // 틀 글자색(mold.color — 자소설 #555)·규정 매체(fonts.required)는 매체가 정한 색
    eval: C => { const ok45 = Math.min(...C.trace.field.stops.map(s => contrast(s, C.primary))) >= 4.5; const mt = mainOf(C); const got = (mt?.color ?? C.trace.text.mainFg).toUpperCase(); const brand = got.replace(/\s/g, '') === C.primary.toUpperCase() || (mt?.colorHex ?? '').toUpperCase() === C.primary.toUpperCase();
      return { expect: ok45 ? `브랜드색 ${C.primary}` : `검정(브랜드색 대비 부족 ${num(Math.min(...C.trace.field.stops.map(s => contrast(s, C.primary))))}:1)`, actual: mt?.colorHex ?? got, ok: ok45 ? brand : !brand }; } },
  // ── 이음 ──
  { id: 'melt.length', group: '이음', name: '녹임 길이', source: 'canon.melt',
    text: '그림 변 색과 지면색이 멀수록 길게 녹인다 — 30~55%(거리 0.45에서 55%), 같은 색이면 짧게(10~20%)',
    when: C => (C.m?.objects ?? []).some(o => o.mask && !o.cutout),
    eval: C => { const rows = []; let ok = true, any = false; const M = C.guide.melt;
      for (const o of C.m.objects.filter(o => o.mask && !o.cutout)) { const seam = o.meltSeam || o.edgeHex || null, far = o.meltFar || null; if (!seam || !far) continue; const d = colorDistance(seam, far);
        // 이음매 줄이 바탕이고 지면 이음 쪽 끝과 같은 색이면(kvLayer quiet/calm) 짧은 기본값 10~20% — 그 값대로 그렸으면 ✓
        if (o.meltBase != null && o.meltBase <= 20) { any = true; const good = o.mask.pct >= o.meltBase - 0.5; ok = ok && good; rows.push(`${o.mask.dir} ${o.mask.pct}% (이음매 줄 = 지면색 → 기본 ${o.meltBase}%)${good ? '' : ' ✗'}`); continue; }
        if (d < 0.035) { rows.push(`${o.mask.dir} ${o.mask.pct}% (같은 색 — 기본값)`); continue; } any = true; const need = Math.round((M.min + (M.max - M.min) * Math.min(1, d / M.fullAt)) * 100); const good = o.mask.pct >= need - 2; ok = ok && good; rows.push(`${o.mask.dir} ${o.mask.pct}% (거리 ${num(d)} → ${need}%)${good ? '' : ' ✗'}`); }
      if (!rows.length) return { expect: '—', actual: '—', ok: null, note: '이음매 색을 못 읽음' };
      return { expect: `≥ 거리별 필요 길이(${pct(M.min)}~${pct(M.max)})`, actual: rows.join(' · '), ok: any ? ok : null, note: any ? '' : '그림 변과 지면이 같은 색 — 해당 없음' }; } },
  { id: 'melt.curve', group: '이음', name: '녹임 곡선(smoothstep 여러 마디)', source: 'canon.melt.ease/stops',
    text: '녹임은 직선이 아니라 smoothstep 7마디 — 끝이 선으로 읽히지 않게',
    when: C => (C.m?.objects ?? []).some(o => o.mask && o.mask.stops > 0),   // % 녹임 마스크만 — px 마스크(cutFade, CANON.cutFade 곡선)는 마디를 세지 않는다(10-20)
    eval: C => { const n = C.guide.melt?.stops ?? 7; const got = C.m.objects.filter(o => o.mask && o.mask.stops > 0).map(o => o.mask.stops); return { expect: `마디 ${n}`, actual: got.join(' · '), ok: got.every(g => g >= n) }; } },
  { id: 'melt.cutout.none', group: '이음', name: '누끼는 녹이지 않는다', source: 'kvtypes.cutout.place[0]',
    text: '누끼는 녹임 마스크 없음 — 잘린 변(넘친 누끼 왼변 cutMelt · 끊김 녹임 cutFade)만 CANON.cutFade 길이(잘린 몫%×2+8, 10~36%), 상반신 상자 아랫변만 아래 녹임',
    when: C => C.kt?.id === 'cutout' && (C.m?.objects ?? []).length > 0 && !C.trace?.gate?.frameFull,
    eval: C => { const bust = (C.trace?.rules ?? []).includes('kv.bust'); const CF = C.guide.cutFade ?? { min: 10, max: 36 }; const masked = C.m.objects.filter(o => o.mask); const bad = masked.filter(o => o.cutMelt == null && o.cutFade == null && !(bust && o.mask.dir === 'to top')); /* 상반신 상자 아랫변이 지면 안쪽이면 아래 녹임(10-14 bust) · 잘린 변 녹임(10-19 cutFade, 10-20 한 자로) */ return { expect: `마스크 없음(잘린 변만 ${pct(CF.min / 100)}~${pct(CF.max / 100)})`, actual: masked.length ? masked.map(o => `${o.mask.dir} ${o.mask.pct}%${o.cutMelt != null ? '(넘침 ' + pct(o.bleedCut) + ')' : o.cutFade != null ? '(잘림 ' + o.cutFade + ')' : ''}`).join(' · ') : '없음', ok: !bad.length && masked.every(o => o.cutMelt == null || within(o.mask.pct, CF.min, CF.max, 0.5)) }; } },
  { id: 'textureCalm', group: '지면', name: '어지러운 질감 위 글자 쪽 스크림', source: 'canon.textureCalm',
    text: '질감이 어지러우면(busy ≥ 0.09) 글자 쪽에서 지면 자기 색 스크림 0.35~0.75 — 매끈하면 없음',
    when: C => C.kt?.id === 'texture' && C.m?.ad?.['data-kv-use'] === 'bg' && !!C.meta?.field?.texture && !C.trace?.gate?.frameFull,
    eval: C => { const T = C.guide.textureCalm, t = C.meta.field.texture; const busy = Math.max(0, Math.min(1, Math.max(((t.spread ?? 0) - T.spreadMin) / (T.spreadFull - T.spreadMin), (t.sharp ?? 0) / T.sharpFull))); const a = C.m.ad['data-calm'] != null ? parseFloat(C.m.ad['data-calm']) : null; const contrastScrim = C.trace?.scrim?.kind === 'texture-contrast';
      if (contrastScrim) return { expect: '대비 부족 → 브랜드색 스크림', actual: `스크림 ${C.m.scrim?.maxA ?? '—'}`, ok: (C.m.scrim?.maxA ?? 0) >= 0.85, note: '지면 대비 < 4.5 — textureCalm 대신 대비 스크림' };
      if (busy < T.busyMin) return { expect: `없음 (busy ${num(busy)} < ${T.busyMin})`, actual: a == null ? '없음' : String(a), ok: a == null };
      const exp = Math.round((T.scrimMin + (T.scrimMax - T.scrimMin) * busy) * 100) / 100; return { expect: `${exp} (busy ${num(busy)})`, actual: a == null ? '없음' : String(a), ok: a != null && Math.abs(a - exp) <= 0.03 }; } },
  { id: 'scrim.photoFull', group: '지면', name: '사진 전체형 스크림', source: 'ad.js photoFull',
    text: '사진 전체형: 글자 쪽에서 시작하는 브랜드색 스크림(0.94 → 0.82 → 0, 글자 칸 폭의 70~78%)',
    when: C => C.m?.ad?.['data-kv-use'] === 'full',
    eval: C => { const a = C.m.scrim?.maxA ?? null; return { expect: '불투명 0.94 → 0 · 흰 글자', actual: `${a == null ? '스크림 없음' : '최대 ' + a} · 끝 ${C.m.scrim?.end ?? '—'}%`, ok: a != null && a >= 0.9 }; } },
  // ── 글자 ──
  { id: 'weights', group: '글자', name: '굵기 위계', source: 'canon.weights / 매체 guide.weights',
    text: '메인 700 > 아이브로 600 > 슬로건·날짜 500 > 값 400, 라벨 700, 칩·CTA 600 (매체 실측 값이 이김 · 어두운 지면 14px 미만은 500 하한 · 틀은 템플릿 실측 굵기)',
    when: C => !!C.trace?.fonts && textsOf(C).length > 0,
    eval: C => { const F = C.trace.fonts, dark = isWhite(C.trace.text?.mainFg); const rows = []; let ok = true; const mold = isMold(C);
      // 틀: 기대 = 템플릿 실측(trace.fonts 의 main/sub/detail.value) — 적히지 않은 역할(날짜·라벨·칩)은 틀이 정한 것이라 건너뛴다
      const moldW = { main: F.main?.weight, sub: F.sub?.weight, detailValue: F.detail?.value ?? F.detail?.weight }; if (F.sub?.role) moldW[F.sub.role] = F.sub.weight;
      const ex = (role, fs) => mold ? (Number.isFinite(moldW[role]) ? moldW[role] : null) : weightOf(role, { medium: C.mr, fs, darkField: dark });
      const chk = (label, role, fs, got) => { if (got == null) return; const e = ex(role, fs); if (e == null) return; const g = Number(got); const good = g === e; ok = ok && good; rows.push(`${label} ${e}→${g}${good ? '' : ' ✗'}`); };
      const T = r => textsOf(C).find(t => t.role === r);
      if (T('main')) chk('메인', 'main', T('main').fs, T('main').fw);
      if (T('sub') && F.sub) chk(`서브(${F.sub.role})`, F.sub.role, T('sub').fs, T('sub').fw);
      if (T('date')) chk('날짜', 'date', T('date').fs, T('date').fw);
      const d = T('detail'); if (d) { chk('값', 'detailValue', d.fs, d.fw); const lb = (d.bolds ?? []).find(b => !b.chip); if (lb) chk('라벨', 'detailLabel', d.fs, lb.fw); const ch = (d.bolds ?? []).find(b => b.chip); if (ch) chk('칩', 'chip', ch.fs ?? d.fs, ch.fw); }
      if (T('extra')) chk('부가', 'extra', T('extra').fs, T('extra').fw);
      return { expect: rows.map(r => r.split('→')[0]).join(' · '), actual: rows.join(' · ') || '—', ok: rows.length ? ok : null, note: mold ? '틀 템플릿 실측 굵기' : C.mr?.guide?.weights ? '매체 실측 굵기 적용' : '' }; } },
  { id: 'tracking', group: '글자', name: '메인 자간', source: 'canon.tracking',
    text: '메인 28px 이상이면 자간 −2.5%em(템플릿 실측 매체 자소설·에브리타임은 0 · 틀은 템플릿 실측 자간이라 제외)',
    when: C => !!mainOf(C) && !isMold(C),
    eval: C => { const mt = mainOf(C); const tk = C.guide.tracking ?? {}; const v = (tk.main ?? 0) && mt.fs >= (tk.mainMinPx ?? 28) ? tk.main : 0; const expPx = v * mt.fs; const got = mt.ls ?? 0; return { expect: v ? `${v}em = ${px(expPx)}` : '0', actual: px(got), ok: Math.abs(got - expPx) <= 0.6 }; } },
  { id: 'required.date', group: '글자', name: '채용 소재는 날짜를 버리지 않는다', source: 'canon.required.recruit',
    text: '채용 소재는 날짜(접수기간)를 둔다 — 날짜 줄을 먼저 확보하고 메인을 줄인다',
    when: C => C.kind === 'recruit' && !C.m?.ad?.['data-logo-only'] && textsOf(C).length > 0 && !!C.hasDate,
    eval: C => { const hit = textsOf(C).find(t => /\d{1,2}\.\d{1,2}|접수기간|~\s?\d/.test(t.text ?? ''));
      // 매체 글자 규정이 역할을 나눠 두고 날짜·상세·서브 칸이 없으면(리멤버 메인 한 줄) 날짜를 둘 자리가 없다 — 해당 없음
      const by = limitsByRole((C.rules?.textLimits ?? []).filter(inImage)); const roles = Object.keys(by); const noSlot = roles.length > 0 && !roles.some(r => ['date', 'detail', 'sub', 'extra'].includes(r)) && !(C.rules?.textLimits ?? []).some(t => /^이미지 내 텍스트$/.test(String(t.field ?? '').trim()));
      if (!hit && noSlot) return { expect: '날짜 있음', actual: '없음', ok: null, note: `매체 글자 규정에 날짜 칸이 없음(${roles.join('·')}만)` };
      return { expect: '날짜 있음', actual: hit ? `${hit.role}: ${hit.text.slice(0, 30)}` : '없음', ok: !!hit, note: !hit && C.spec.shape === 'strip' ? '얇은 띠(높이 <120)는 날짜 줄이 없을 수 있음' : '' }; } },
  { id: 'mainFloor.square', group: '글자', name: '정사각 메인 하한', source: 'canon.mainFloor.square',
    text: '정사각 규격 메인 ≥ 짧은 변 × 0.067(가이드 mainPx 매체 제외)',
    when: C => C.spec.shape === 'square' && !C.guide.mainPx && !!C.guide.mainFloor?.square && !!mainOf(C) && !C.trace?.fonts?.stated?.main,
    eval: C => { const fl = Math.round(Math.min(C.spec.w, C.spec.h) * C.guide.mainFloor.square); const fs = mainOf(C).fs; return { expect: `≥ ${fl}px`, actual: px(fs), ok: fs >= fl - 0.5 }; } },
  { id: 'guide.mainPx', group: '글자', name: '매체 가이드 메인 px 띠', source: '매체 guide.mainPx',
    text: '가이드 매체(구글)는 메인 24~44px — 규격이 작아져도 비례로 줄이지 않는다',
    when: C => !!C.guide.mainPx && !!mainOf(C) && !isMold(C),
    eval: C => { const { min, max } = C.guide.mainPx, fs = mainOf(C).fs; return { expect: `${min}~${max}px`, actual: px(fs), ok: within(fs, min ?? 0, max ?? 999, 0.5) }; } },
  { id: 'guide.detailPx', group: '글자', name: '매체 가이드 상세 px', source: '매체 guide.detailPx',
    text: '가이드 매체 상세 글자 13~15px(메인과 달리 작게)',
    when: C => !!C.guide.detailPx && !!textsOf(C).find(t => t.role === 'detail') && !isMold(C),
    eval: C => { const { min, max } = C.guide.detailPx, fs = textsOf(C).find(t => t.role === 'detail').fs; return { expect: `${min ?? '…'}~${max ?? '…'}px`, actual: px(fs), ok: within(fs, min ?? 0, max ?? 999, 0.5) }; } },
  { id: 'guide.subPx', group: '글자', name: '매체 가이드 서브 px', source: '매체 guide.subPx',
    text: '가이드 매체 서브(슬로건·시즌) ≤ 20px',
    when: C => !!C.guide.subPx && !!textsOf(C).find(t => t.role === 'sub') && !isMold(C),
    eval: C => { const { max } = C.guide.subPx, fs = textsOf(C).find(t => t.role === 'sub').fs; return { expect: `≤ ${max}px`, actual: px(fs), ok: fs <= max + 0.5 }; } },
  { id: 'main.lines', group: '글자', name: '메인 줄 수(계획대로 접혔나)', source: 'ad.js mainLines',
    text: '메인은 렌더러가 잡은 줄 수 안에서 접힌다 — 넘치면 「…」로 잘린다',
    when: C => !!mainOf(C) && C.trace?.fonts?.main?.lines != null,
    eval: C => { const mt = mainOf(C), cap = C.trace.fonts.main.lines; return { expect: `≤ ${cap}줄`, actual: `${mt.lines?.length ?? '—'}줄 (${(mt.lines ?? []).join(' / ')})`, ok: mt.lines ? mt.lines.length <= cap : null }; } },
  { id: 'contrast.main', group: '글자', name: '메인 대비', source: 'canon(WCAG 큰 글자 3:1)',
    text: '큰 글자(메인) 지면 대비 ≥ 3:1 — 그림 위면 스크림 포함 표본',
    when: C => !!mainOf(C),
    eval: C => { const mt = mainOf(C), c = textContrast(mt); const exempt = c != null && c < 2.95 && mt.contrastSampled == null && isWhite(mt.colorHex ?? mt.color) && whiteOnColourField(C); return { expect: '≥ 3:1', actual: c == null ? '측정 불가' : `${num(c)}:1${mt.contrastSampled != null ? ' (그림 위 표본)' : ''}`, ok: c == null ? null : exempt ? null : c >= 2.95, note: exempt ? '10-20 사용자 결정 — 색 지면은 흰 글자(대비 3:1 미만이어도) · 면제' : '' }; } },
  { id: 'contrast.small', group: '글자', name: '작은 글자 대비', source: 'canon(WCAG 4.5:1) / kvtypes.illust-grad-bg.guide[2]',
    text: '서브·날짜·상세 같은 작은 글자는 지면 가장 불리한 곳에서 4.5:1',
    when: C => textsOf(C).some(t => t.role !== 'main' && textContrast(t) != null),
    eval: C => { const rows = textsOf(C).filter(t => t.role !== 'main' && textContrast(t) != null).map(t => ({ t, c: textContrast(t), large: t.fs >= 24 || (t.fs >= 18.66 && Number(t.fw) >= 700) })); const bad = rows.filter(r => r.c < (r.large ? 2.95 : 4.45));
      // 10-20 사용자 결정(색 지면 흰 글자 · 서브·상세는 같은 색 70%, CANON.textDefault.subOpacity): 자동 색 지면 위 흰 계열 작은 글자가 모자라면 결정으로 면제(–)
      const exempt = bad.length > 0 && bad.every(r => r.t.contrastSampled == null && isWhite(r.t.colorHex ?? r.t.color)) && whiteOnColourField(C);
      return { expect: '≥ 4.5:1(큰 글자 3:1)', actual: rows.map(r => `${r.t.role} ${num(r.c, 1)}`).join(' · '), ok: exempt ? null : !bad.length, note: exempt ? '10-20 사용자 결정 — 색 지면 흰 글자(서브 70%) · 면제' : bad.length ? `모자람: ${bad.map(r => r.t.role).join(', ')}${C.trace?.field?.vivid != null ? ' — vividWhite 가 명도 상한(smallMaxDL) 안에서 4.5 에 못 닿아 3:1 에서 멈춤(가이드 vs 코드 틈)' : ''}` : '' }; } },
  { id: 'hierarchy', group: '글자', name: '위계(메인 ≥ 상세 1.8배·서브 1.6배)', source: 'ad.js 위계',
    text: '메인은 상세의 1.8배·서브의 1.6배는 돼야 한다(매체가 px 를 정한 경우 제외)',
    when: C => !!mainOf(C) && !C.trace?.fonts?.stated && !isMold(C) && !C.guide.detailPx && !C.rules?.textHeightPx && !C.trace?.fonts?.fsRange && textsOf(C).some(t => t.role === 'detail' || t.role === 'sub'),
    eval: C => { const m = mainOf(C).fs, d = textsOf(C).find(t => t.role === 'detail')?.fs, s = textsOf(C).find(t => t.role === 'sub')?.fs; const okD = d == null || m >= d * 1.8 - 0.5, okS = s == null || m >= s * 1.6 - 0.5; return { expect: '메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6', actual: `${d != null ? '상세 ' + num(m / d) : ''} ${s != null ? '서브 ' + num(m / s) : ''}`.trim(), ok: okD && okS }; } },
  // ── 로고 ──
  { id: 'logoCap', group: '로고', name: '로고 폭 상한', source: 'canon.logoCap',
    text: '로고 폭 ≤ 메인 글자 크기 × 2.4, 그리고 ≤ 캔버스 폭 12%(폭 ≤ 320 세로 띠는 25%)',
    when: C => !!C.m?.logo?.box && !!mainOf(C) && !!C.guide.logoCap && !C.trace?.logo?.asObject && !C.m?.ad?.['data-logo-only'] && !(isMold(C) && (C.rules?.safeArea?.measuredFromTemplate?.mold?.logo || (C.trace?.rules ?? []).includes('templateMold.logoArea'))),   // 틀 로고 칸(mold.logo·templateMold.logoArea)은 템플릿 실측 크기
    eval: C => { const LC = C.guide.logoCap, b = C.m.logo.box, fs = mainOf(C).fs; const cap = Math.max(24, Math.min(fs * LC.perMainPx, C.spec.w * (C.spec.w <= 320 ? LC.wRatioTower : LC.wRatio))); return { expect: `≤ ${Math.round(cap)}px (메인 ${px(fs)} × ${LC.perMainPx} / 폭 ${pct(C.spec.w <= 320 ? LC.wRatioTower : LC.wRatio)})`, actual: `${Math.round(b.w)}px (메인의 ${num(b.w / fs, 1)}배)`, ok: b.w <= cap + 1 }; } },
  { id: 'logo.tone', group: '로고', name: '로고 단색 변환(지면에 맞춰)', source: 'ad.js logoFilter / canon.logoClash',
    text: '어두운 지면에 원색 로고만 있으면 흰색으로, 밝은 지면에 흰 로고만 있으면 검정으로. 로고색 = 지면색이면(대비 < 1.6 인 색이 절반 이상) 검정 단색. 타일 로고는 그대로',
    when: C => !!C.m?.logo?.box && !!C.trace?.logo,
    eval: C => { const L = C.trace.logo, dark = isWhite(C.trace.text?.mainFg); let exp; if (L.tile) exp = 'original'; else if (dark) exp = L.srcTone === 'light' ? 'original' : 'white'; else { const cl = C.guide.logoClash; const clash = !!(cl && C.logoMeta?.colors?.length && C.trace.field?.stops?.length && L.srcTone !== 'light' && C.logoMeta.colors.filter(c => Math.min(...C.trace.field.stops.map(st => contrast(c.hex, st))) < cl.minContrast).reduce((a, c) => a + c.share, 0) >= cl.share); exp = (L.srcTone === 'light' || clash) ? 'black' : 'original'; }
      const got = C.m.logo.tone; return { expect: exp, actual: `${got} (filter ${C.m.logo.filter || 'none'})`, ok: got === exp, note: L.clash ? '지면과 색 겹침(logoClash)' : '' }; } },
  { id: 'wideLogo', group: '로고', name: '가로형 로고 자리', source: 'canon.wideLogo',
    text: '가로형도 로고를 둔다 — 기본 우상단 소형(매체가 로고 0개면 생략, 오브젝트 상자 규격은 없음, 사진 열·배경형 주인공 쪽이면 좌상단)',
    when: C => !isMold(C) && C.spec.shape === 'wide' && !!C.trace?.logo?.has && C.trace.logo.allow !== false && !C.trace.logo.asObject && !C.trace.logo.template,
    eval: C => { const b = C.m?.logo?.box; const exp = C.trace.logo.place; if (exp === 'none') return { expect: '없음', actual: b ? C.m.logo.corner : '없음', ok: !b }; return { expect: exp, actual: b ? `${C.m.logo.corner} (y ${pct(b.y / C.spec.h)})` : '없음', ok: !!b && b.y < C.spec.h * 0.35 && (exp === 'top-right' ? (b.x + b.w) > C.spec.w * 0.6 : exp === 'top-left' ? b.x < C.spec.w * 0.4 : true) }; } },
  { id: 'guide.logo.h', group: '로고', name: '매체 가이드 로고 높이', source: '매체 guide.logo.hRatio',
    text: '가이드 매체 로고 높이 ≈ 짧은 변의 7.5%(세로 로고는 면적 보정으로 최대 1.8배), 폭 ≤ 30%',
    when: C => !!C.guide.logo?.hRatio && !!C.m?.logo?.box && !C.trace?.logo?.asObject && !C.m?.ad?.['data-logo-only'],
    eval: C => { const g = C.guide.logo, b = C.m.logo.box, short = Math.min(C.spec.w, C.spec.h); const eh = short * g.hRatio; const k = C.m.logo.nat ? Math.max(1, Math.min(1.8, Math.sqrt(0.8 / Math.max(1e-3, C.m.logo.nat[0] / C.m.logo.nat[1])))) : 1; return { expect: `높이 ≈ ${Math.round(eh)}px(×${num(k)} 세로 보정) · 폭 ≤ ${pct(g.maxWRatio ?? 0.3)}`, actual: `높이 ${Math.round(b.h)}px · 폭 ${pct(b.w / C.spec.w)}`, ok: b.h <= eh * k + 1.5 && b.w <= C.spec.w * (g.maxWRatio ?? 0.3) + 1, note: '로고 폭 상한(logoCap)에 걸리면 높이가 더 작아질 수 있음' }; } },
  { id: 'place.logoSlot', group: '로고', name: '로고 자리(모서리)', source: 'ad.js trace.logo.corner / slot',
    text: '로고는 자동 배치가 정한 자리(기본 우상단, 사진 열·배경형 주인공 쪽이면 좌상단, 매체 로고 칸) — 다른 모서리로 가거나 4%(최소 8px) 넘게 떠나지 않는다',
    when: C => !!C.m?.logo?.box && !!C.trace?.logo && !C.trace.logo.asObject && !C.m?.ad?.['data-logo-only'],
    eval: C => { const W = C.spec.w, H = C.spec.h, b = C.m.logo.box, p = manualOf(C, 'logo'); const auto = p ? invertBox(b, p, W, H) : b; const t = tolOf(C, PLACE_TOL.zone, PLACE_TOL.zonePx);
      const want = (C.trace.logo.slot === 'abs' && TRACE_CORNER[C.trace.logo.corner]) || cornerOf(auto, W, H); const now = cornerOf(b, W, H);
      const dx = (b.x + b.w / 2) - (auto.x + auto.w / 2), dy = (b.y + b.h / 2) - (auto.y + auto.h / 2);
      const same = want.h === now.h && want.v === now.v; const near = Math.abs(dx) <= t.x && Math.abs(dy) <= t.y;
      return { expect: `로고 자리: ${cornerKo(want)}`, actual: `${cornerKo(now)}${(dx || dy) ? ` (자동에서 ${Math.round(dx)}·${Math.round(dy)}px)` : ''}`, ok: same && near, note: !same && !p ? '자동 배치의 로고가 정한 모서리와 다름(규칙 과제)' : (same && !near) ? '같은 모서리지만 자동 자리에서 멀어짐' : '' }; } },
  { id: 'place.recommendedMargin', group: '배치', name: '권장 여백(매체 안전영역이 없는 규격)', source: 'core/editlayout.js safeRect — 짧은 변 × 4%', level: 'warn',
    text: '매체가 안전영역을 숫자로 정하지 않은 규격은 글자·로고를 가장자리에서 짧은 변의 4% 이상 띄운다(권장 여백)',
    when: C => !safeRect({ w: C.spec.w, h: C.spec.h, rules: C.rules }).stated && !C.m?.ad?.['data-logo-only'] && (textsOf(C).length > 0 || !!C.m?.logo?.box),
    eval: C => { const W = C.spec.w, H = C.spec.h, fb = Math.round(Math.min(W, H) * PLACE_TOL.margin); const items = [['글자', textBlockOf(C)], ['로고', (C.trace?.logo?.asObject ? null : C.m?.logo?.box) ?? null]].filter(([, b]) => b);
      const E = { left: '왼', top: '위', right: '오른', bottom: '아래' }; const bad = []; const acts = [];
      for (const [k, b] of items) { const d = { left: b.x, top: b.y, right: W - (b.x + b.w), bottom: H - (b.y + b.h) }; const mn = Object.entries(d).reduce((a, x) => x[1] < a[1] ? x : a); acts.push(`${k} ${E[mn[0]]} ${Math.round(mn[1])}px`); for (const [e, v] of Object.entries(d)) if (v < fb - 1) bad.push(`${k} ${E[e]} ${Math.round(v)}px`); }
      return { expect: `권장 여백 ≥ ${fb}px(짧은 변 4%)`, actual: acts.join(' · '), ok: !bad.length, note: bad.length ? `권장 여백보다 가까움: ${bad.join(', ')}` : '' }; } },
  // ── 검수(adcheck) ──
  { id: 'check.textOverSubject', group: '검수', name: '글자-주인공 겹침', source: 'core/adcheck.js',
    text: '글자 상자가 주인공 위로 15% 넘게 올라가지 않는다(캐릭터·인물은 0)',
    when: C => metric(C, 'textOverSubject') != null && (C.m?.objects ?? []).length > 0,
    eval: C => { const v = metric(C, 'textOverSubject'); const strict = !!(C.kt?.flags?.character); return { expect: strict ? '≤ 2% (캐릭터·인물)' : '< 15%', actual: `${v}%`, ok: strict ? v <= 2 : !warn(C, 'text-over-subject') }; } },
  { id: 'check.emptyBand', group: '검수', name: '빈 띠', source: 'core/adcheck.js / canon.fill',
    text: '아무것도 없는 가로 띠가 지면 높이의 28%(가장자리 36%)를 넘지 않는다 — 비어 보이는 예시는 없다',
    when: C => metric(C, 'emptyBand') != null && C.spec.h >= 150 && !C.m?.ad?.['data-logo-only'] && !['bg', 'full'].includes(C.m?.ad?.['data-kv-use']),
    eval: C => { const w = warn(C, 'empty-band'); const info = (C.m?.check?.warnings ?? []).find(x => x.code === 'empty-band' && x.level === 'info'); return { expect: '≤ 28% (가운데) · ≤ 36% (가장자리)', actual: `${metric(C, 'emptyBand')}% (가운데 ${metric(C, 'emptyMid')}%)`, ok: !w, note: info ? '참고(템플릿 칸·작은 누끼·그림 없음)' : '' }; } },
  { id: 'check.logoCovered', group: '검수', name: '로고 가림', source: 'core/adcheck.js',
    text: '주인공이 로고를 5% 넘게 덮지 않는다', when: C => metric(C, 'logoCovered') != null,
    eval: C => ({ expect: '≤ 5%', actual: `${metric(C, 'logoCovered')}%`, ok: !warn(C, 'logo-covered') }) },
  { id: 'check.hardCut', group: '검수', name: '뚝 끊긴 변', source: 'core/adcheck.js',
    text: '주인공이 상자 변에서 잘리는데 그 변이 지면 안쪽이면 녹여야 한다', when: C => (C.m?.objects ?? []).length > 0,
    eval: C => { const w = warn(C, 'hard-cut'); return { expect: '없음', actual: w ? w.msg : '없음', ok: !w }; } },
  { id: 'check.textClipped', group: '검수', name: '글자 잘림', source: 'core/adcheck.js',
    text: '글자가 잘리거나 지면 밖으로 나가지 않는다', when: C => textsOf(C).length > 0,
    eval: C => { const w = warn(C, 'text-clipped'); return { expect: '없음', actual: w ? w.msg : '없음', ok: !w }; } },
  { id: 'check.chipOverflow', group: '검수', name: '알약 넘침', source: 'core/adcheck.js',
    text: '라벨 알약이 지면 오른쪽 밖으로 나가지 않는다', when: C => (C.m?.chips ?? 0) > 0,
    eval: C => { const w = warn(C, 'chip-overflow'); return { expect: '없음', actual: w ? w.msg : '없음', ok: !w }; } },
  { id: 'maxUpscale', group: '검수', name: '키우기 상한', source: 'canon.maxUpscale',
    text: '누끼는 원본의 1.5배, 바탕 있는 그림은 2배 넘게 키우지 않는다(넘으면 흐림 — 그림 탓)',
    when: C => metric(C, 'kvUpscale') != null,
    eval: C => { const v = metric(C, 'kvUpscale'), cap = C.kt?.id === 'cutout' ? C.guide.maxUpscale?.cutout ?? 1.5 : 2; return { expect: `≤ ${cap}배`, actual: `${v}배`, ok: v <= cap + 0.05, note: v > cap + 0.05 ? '그림 탓(원본이 작다) — 큰 원본 필요' : '' }; } },
];

// 사람이 봐야 하는 규칙 — 숫자로 못 재는 것. 표 끝에 「–」로 붙여 둔다(✓ 라고 하지 않는다)
export const HUMAN_RULES = [
  { id: 'human.typeFit', group: '사람 판정', name: '유형 판정이 그림과 맞는가', text: '유형(누끼·질감·사진·일러스트)·세분 유형이 그림과 맞아야 이후 배치가 맞는다 — 틀리면 cases.mjs type 으로 지정' },
  { id: 'human.seam', group: '사람 판정', name: '이음매가 눈에 띄는가', text: '녹임 길이·곡선 수치가 맞아도 「뚝 끊긴 느낌」은 눈으로' },
  { id: 'human.aiLook', group: '사람 판정', name: '그림자·받침·번짐(AI 티)', text: '사물이 작아 보여도 지면색 블록·그림자·받침을 더하지 않는다, 녹임이 뿌옇지 않다' },
  { id: 'human.face', group: '사람 판정', name: '얼굴·핵심부 쪽 글자', text: '얼굴 상자가 없는 그림은 겹침 수치가 0이어도 얼굴 옆 글자를 눈으로' },
  { id: 'human.logoLegible', group: '사람 판정', name: '로고 가독', text: '원색 로고 반전·단색 변환이 뭉개지지 않는가, 로고가 지면에 녹지 않는가' },
  { id: 'human.mood', group: '사람 판정', name: '지면 톤·분위기', text: '브랜드 지면 vs KV 배경 분위기 선택이 자연스러운가, 탁하지 않은가' },
  { id: 'human.hierarchy', group: '사람 판정', name: '위계가 눈에 띄는가', text: '메인이 가장 먼저 읽히는가(수치 위계와 별개로)' },
  { id: 'human.cutoutChoice', group: '사람 판정', name: '누끼 선택', text: '배경이 분위기 있으면 누끼 대신 원본이 맞는가(cutoutAuto)' },
];

// 대조표 규칙 id → 규칙 장부(ref/learned/rules.json, scripts/rules-ledger.mjs) id. 장부가 있으면 그 문장(rule — value)과 위치(where)로 가이드 문장을 덮는다
export const RULES_JSON_MAP = {
  'objectBleed.area': ['object-bleed', 'object-bleed-narrow', 'object-bleed-tower'], 'objectBleed.cut': ['object-bleed', 'object-bleed-narrow', 'object-bleed-tower'], 'objectBleed.vis': ['object-bleed'], 'objectBleed.minTextCol': ['object-bleed'],
  'cutout.contain': ['cutout-contain', 'cutout-wide-overflow', 'cutout-gap-window', 'cutout-char-bleed-70', 'cutout-bust'], 'cutout.square.box': ['cutout-char-place', 'cutout-square-band'], 'fill.maxObject': ['fill-slack'], 'objectOverlap': ['object-overlap'],
  'roomFull': ['room-full'], 'photoCrowd.full': ['crowd-full'], 'texture.bg': ['texture-full'], 'frame.bg': ['frame-place'], 'photo.column.logoLeft': ['photo-logo-top-left'], 'character.head': ['illust-head-keep', 'cutout-char-place', 'portrait-fit'],
  'kvMood': ['kv-mood', 'kv-mood-gradient'], 'vividWhite': ['vivid-white'], 'textColour.brand': ['text-colour-brand'], 'melt.length': ['melt-length', 'melt-base'], 'melt.curve': ['melt-length'], 'melt.cutout.none': ['cutout-contain', 'bleed-cut-melt', 'cutout-bust'],
  'textureCalm': ['texture-calm'], 'scrim.photoFull': ['photo-text-scrim', 'crowd-full'], 'weights': ['weights', 'small-dark-weight', 'media-weights-win'], 'tracking': ['tracking', 'everytime-tracking', 'jasoseol-typo'], 'required.date': ['required-date'],
  'mainFloor.square': ['main-floor-square'], 'guide.mainPx': ['google-main-px'], 'guide.detailPx': ['google-main-px'], 'guide.subPx': ['google-main-px'], 'main.lines': ['main-overflow'], 'contrast.main': ['text-black-or-white'], 'contrast.small': ['text-black-or-white'], 'hierarchy': ['layout-shape-sizes'],
  'logoCap': ['logo-cap'], 'logo.tone': ['logo-mono', 'logo-clash', 'logo-tile'], 'wideLogo': ['wide-logo'], 'guide.logo.h': ['logo-google'],
  'check.textOverSubject': ['check-text-over-subject'], 'check.emptyBand': ['check-empty-band'], 'check.logoCovered': ['check-logo-covered'], 'check.hardCut': ['check-hard-cut'], 'check.textClipped': ['check-text-clipped'], 'check.chipOverflow': ['check-pill-overflow'], 'maxUpscale': ['max-upscale'],
  'place.textZone': ['place-text-zone'], 'place.textAlign': ['place-text-align'], 'place.logoSlot': ['place-logo-slot'], 'place.manualDrift': ['place-manual-drift'], 'place.recommendedMargin': ['place-recommended-margin'],
};
// rules.json(규칙 장부)이 있으면 짝지은 항목의 rule·value 로 가이드 문장을, where 로 출처를 덮는다. 모양이 달라도(배열·{rules:[]}·{id: text}) 깨지지 않게 느슨히 읽는다
export function applyRulesJson(rules, json, map = RULES_JSON_MAP) {
  if (!json) return rules;
  const list = Array.isArray(json) ? json : Array.isArray(json.rules) ? json.rules : Object.entries(json.rules ?? json).map(([id, v]) => ({ id, ...(typeof v === 'object' ? v : { rule: String(v) }) }));
  const by = new Map(list.filter(r => r && r.id).map(r => [r.id, r]));
  return rules.map(r => {
    const ids = (map[r.id] ?? [r.id]).filter(id => by.has(id)); if (!ids.length) return r;
    const hit = ids.map(id => by.get(id)).filter(o => (o.status ?? 'active') !== 'retired');
    if (!hit.length) return r;
    const text = hit.map(o => [o.rule ?? o.text ?? o.guide ?? o.desc, o.value ? `(${o.value})` : ''].filter(Boolean).join(' ')).join(' / ');
    return { ...r, text: text || r.text, source: `rules.json ${hit.map(o => o.id).join('·')} — ${hit.map(o => o.where).filter(Boolean).join(', ') || r.source}`, fromRulesJson: true, rulesJsonIds: hit.map(o => o.id) };
  });
}

// 한 케이스 × 한 규격의 대조표 — 해당하는 규칙만. ok: true ✓ · false ✗ · null –(측정 불가)
export function evaluate(C, rules = RULES) {
  const rows = [];
  for (const r of rules) {
    let on = false; try { on = !!r.when(C); } catch { on = false; }
    if (!on) continue;
    let res; try { res = r.eval(C); } catch (e) { res = { expect: '—', actual: '평가 실패: ' + (e?.message ?? e), ok: null }; }
    rows.push({ id: r.id, group: r.group, name: r.name, source: r.source, text: r.text, fromRulesJson: !!r.fromRulesJson, ...(r.level ? { level: r.level } : {}), ...res, verdict: res.ok === true ? '✓' : res.ok === false ? '✗' : '–' });
  }
  for (const h of HUMAN_RULES) rows.push({ ...h, expect: '—', actual: '측정 불가 — 사람 판정', ok: null, verdict: '–' });
  return rows;
}
export function summarize(rows) {
  const checked = rows.filter(r => r.ok !== null).length;
  return { checked, pass: rows.filter(r => r.ok === true).length, fail: rows.filter(r => r.ok === false).length, na: rows.filter(r => r.ok === null).length };
}

// ── 앱 「가이드 검수」(10-14) ──────────────────────────────────────────────
// 규칙 장부 문장(ref/learned/rules.json → core/rules-data.js 생성 파일)을 입힌 규칙 목록. rulesJson 을 넘기면 그걸로(scripts/guide-trace.mjs 는 디스크의 rules.json)
export function rulesetOf(rulesJson) { return applyRulesJson(RULES, rulesJson); }
// 판정 맥락 — 규격(spec: id·w·h·medium·rules·mediumRules)·렌더 추적·실측·KV 측정값을 C 모양으로. guideFor·shapeOf·kvTypeOf 는 부르는 쪽이 넘긴다(순환 import 를 피하려고)
export function guideContext({ spec, trace, m, meta, kt, guide, shape, logoMeta = null, primary = null, kind = 'recruit', hasDate = true }) {
  return { spec: { id: spec.id, w: spec.w, h: spec.h, shape, medium: spec.medium }, guide, mr: spec.mediumRules ?? {}, rules: spec.rules ?? {}, trace, m, meta, kt, logoMeta, primary, kind, hasDate };
}
// 넘긴 규칙(skips: { ruleId: { reason } })은 ✗ 로 세지 않는다 — 「의도한 것」
export function guideSummary(rows, skips = {}) {
  const fails = rows.filter(r => r.ok === false);
  const skipped = fails.filter(r => skips?.[r.id]);
  return { checked: rows.filter(r => r.ok !== null).length, pass: rows.filter(r => r.ok === true).length, fail: fails.length - skipped.length, skipped: skipped.length, na: rows.filter(r => r.ok === null).length, human: rows.filter(r => r.id?.startsWith('human.')).length };
}
