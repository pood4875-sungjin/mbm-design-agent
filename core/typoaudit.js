// core/typoaudit.js — 시안 틀 타이포·여백 검사(순수 판정). 그린 결과의 글자 역할별 실측(px·굵기·줄 수·상자)을 청사진 세트의 원본 프레임과 상대 비교한다.
//   11-03 사용자: 「폰트가 타이틀보다 서브 비중이 크고, 패딩이 이상하고 … 싹 다 잡아내라」. 합격 순서 2(타이포·여백 안정)의 자동 검사.
//   기준은 세트별(청사진 프레임 값 ×1.15) 과 전역 상한(청사진 188프레임 분포, 아래 BP) 중 작은 쪽. 전역 상수만으로 재지 않는다.
//
// 청사진 분포(core/templates-data.js 188프레임, 2026-11-03 실측 — scripts/template-typo-audit.mjs --bp):
//   서브/메인  n=109  p10 .47  p50 .61  p90 .77  max .87     → 상한 .78
//   날짜/메인  n=162  p10 .42  p50 .52  p90 .68  max .83     → 상한 .70
//   상세/메인  n=134  p10 .38  p50 .45  p90 .57  max .70     → 상한 .60
//   라벨/메인  n=66   p10 .36  p50 .43  p90 .55  max .64     → 상한 .60
//   날짜 뱃지 글자/메인 n=64 p50 .50 p90 .66 max .76 · 뱃지 높이/메인 p50 .89 p90 1.10 max 1.54 → 상한 글자 .66 · 높이 1.10
//   상세 뱃지 글자/메인 n=22 p50 .44 p90 .54 · 높이/메인 p90 1.01 → 상한 글자 .54 · 높이 1.01 (서브 뱃지 n=1 → 날짜 값)
//   굵기: 서브·날짜·상세가 메인(강조 굵기 포함)보다 굵은 프레임 18/405줄 — 그 세트는 청사진을 따른다
import { TEMPLATE_NORMS } from './template-norms.js';

// 11-10 사용자 「청사진 크기감이 정상 — 이보다 작아지면 비정상으로 파악」: 하한 = 같은 분포의 하위 10%(p10). 자유 배치가 이 아래면 생성 단계에서 올리고, 검사에서 size-below-blueprint 로 잡는다
//   가로로 긴 규격(폭 ÷ 높이 ≥ 3)은 샘플 쪽이 더 크다 — 날짜·서브/메인 .57~.88(자소설 PC메인 .69 · 잡다 .57 · 비즈보드 .86~.88 · NAP 띠 .65), 상세/메인 .48~.73 → minWide
export const BP = { min: { sub: 0.47, date: 0.42, detail: 0.38, label: 0.36 }, minWide: { sub: 0.55, date: 0.55, detail: 0.48, label: 0.45 }, sub: 0.78, date: 0.70, detail: 0.60, label: 0.60, badgePx: { date: 0.66, detail: 0.54, sub: 0.66 }, badgeH: { date: 1.10, detail: 1.01, sub: 1.10 }, kRel: 1.15 };

const ROLE_OF = { main: 'main', season: 'sub', date: 'date', role: 'detail' };
const mainWt = r => Math.max(r.wt ?? 0, r.emph?.kind === 'weight' ? Math.max(r.emph.client ?? 0, r.emph.hire ?? 0) : 0);

// 청사진 프레임의 기준값(규격 크기로 환산)
// 규격 모양에 맞는 하한(가로로 긴 규격은 minWide)
export const bpMinFor = (w, h) => (w / Math.max(1, h) >= 3 ? BP.minWide : BP.min);

export function blueprintOf(frame, { sx = 1, sy = 1 } = {}) {
  const rows = frame.rows.filter(r => r.role !== 'label');
  const main = rows.find(r => r.role === 'main');
  const ratio = {}, wt = {}, badgeH = {}, bpRows = [];
  for (const r of rows) {
    const k = ROLE_OF[r.role] ?? r.role;
    if (k !== 'main') ratio[k] = r.fs / main.fs;
    if (k !== 'main' && r.badge && (r.badge.fill || r.badge.stroke)) badgeH[k] = r.badge.h / main.fs;
    wt[k] = k === 'main' ? mainWt(r) : r.wt;
    const H0 = (r.lines ?? 1) * r.fs * 1.25;
    bpRows.push({ role: k, y0: (r.y - H0 / 2) * sy, y1: (r.y + H0 / 2) * sy, x: r.x * sx, w: r.w * sx, fs: r.fs });
  }
  bpRows.sort((a, b) => a.y0 - b.y0);
  const gaps = {};
  for (let i = 1; i < bpRows.length; i++) gaps[`${bpRows[i - 1].role}>${bpRows[i].role}`] = bpRows[i].y0 - bpRows[i - 1].y1;
  const L = Math.min(...bpRows.map(r => r.x)), R = Math.max(...bpRows.map(r => r.x + r.w)), T = Math.min(...bpRows.map(r => r.y0)), B = Math.max(...bpRows.map(r => r.y1));
  const slot = frame.slot ? { x: frame.slot.x * sx, y: frame.slot.y * sy, w: frame.slot.w * sx, h: frame.slot.h * sy } : null;
  // 글자 덩어리와 그림 칸 사이(청사진 최소값, 겹치면 0). 전면·세로형은 재지 않는다
  let kvGap = null;
  if (slot && !frame.full) {
    if (frame.visual === 'right') kvGap = Math.max(0, slot.x - R);
    else if (frame.visual === 'left') kvGap = Math.max(0, L - (slot.x + slot.w));
    else if (frame.visual === 'bottom') kvGap = Math.max(0, slot.y - B);
    else if (frame.visual === 'top') kvGap = Math.max(0, T - (slot.y + slot.h));
  }
  return { ratio, wt, badgeH, gaps, L, R, T, B, cx: (L + R) / 2, cy: (T + B) / 2, kvGap, rows: bpRows };
}

// 한 그림의 판정. rows: [{ role, px, wt, lines, x, y, w, h, badge, wb, clip }] (trace.tpl.rows 또는 DOM 실측)
//   logo·kv: { x, y, w, h } | null. safe: { l, r, t, b } (규격 안전영역 px). frame: 청사진 프레임, sx·sy: 규격/프레임 배율, align: 렌더 정렬
export function typoAudit({ W, H, rows, logo = null, kv = null, kvCutout = false, frame, sx = 1, sy = 1, align = 'left', safe = null }) {
  const fails = [], m = {};
  const fail = (code, msg) => fails.push({ code, msg });
  const main = rows.find(r => r.role === 'main');
  if (!main) return { ok: false, fails: [{ code: 'no-main', msg: '메인 없음' }], m };
  const bp = blueprintOf(frame, { sx, sy });
  bp.L = Math.max(bp.L, +(safe?.l ?? 0) || 0, Math.min(W, H) * 0.05);   // 매체 안전영역·지면 가장자리(짧은 변 5%)가 청사진보다 안쪽이면 그 값이 기준(합격 순서 1 매체 가이드)
  const by = Object.fromEntries(rows.map(r => [r.role, r]));
  const others = rows.filter(r => r !== main);

  // 1. 위계 — px: 메인 > 서브 ≥ 날짜·상세. 청사진 자체가 뒤집힌 세트는 청사진을 따른다
  for (const r of others) if (r.px >= main.px) fail('hier-px', `${r.role} ${r.px}px ≥ 메인 ${main.px}px`);
  if (by.sub) for (const k of ['date', 'detail']) if (by[k] && by[k].px > by.sub.px && !(bp.ratio[k] > bp.ratio.sub)) fail('hier-px', `${k} ${by[k].px}px > 서브 ${by.sub.px}px`);
  // 1-2. 굵기: 메인(강조 굵기 포함) ≥ 서브·날짜·상세(뱃지형이면 뱃지 안 글자 기준 = 그 줄의 굵기)
  m.mainWt = main.wt;
  for (const r of others) if (r.wt > main.wt && !(bp.wt[r.role] > bp.wt.main)) fail('hier-wt', `${r.role} 굵기 ${r.wt} > 메인 ${main.wt}`);
  // 1-3. 비율: 세트 값 ×1.15 와 전역 상한 중 작은 쪽(세트가 전역을 넘으면 세트 ×1.03)
  m.ratio = {};
  for (const r of others) {
    const v = r.px / main.px, b0 = bp.ratio[r.role];
    m.ratio[r.role] = +v.toFixed(3);
    if (b0 == null) continue;
    const glob = r.badge ? (BP.badgePx[r.role] ?? BP[r.role]) : (BP[r.role] ?? 0.8);
    const bound = Math.min(glob, b0 * BP.kRel);   // 세트가 전역 상한을 넘어도(블라인드 날짜 .83) 전역이 이긴다 — 사용자 「서브 비중이 타이틀보다 큼」이 우선
    if (v > bound + 0.005) fail(r.badge ? 'badge-px' : 'ratio', `${r.role}${r.badge ? ' 뱃지' : ''}/메인 ${v.toFixed(2)} > 상한 ${bound.toFixed(2)}(청사진 ${b0.toFixed(2)})`);
    // 뱃지(알약)는 높이까지: 알약이 타이틀보다 커 보이면 안 된다(11-03 GFA 날짜 뱃지)
    if (r.badge && r.h) {
      const hv = r.h / main.px, hb = bp.badgeH[r.role] ?? null, hg = BP.badgeH[r.role] ?? 1.1;
      const hbound = hb == null ? hg : Math.min(hg, hb * BP.kRel);
      m.ratio[`${r.role}-badge-h`] = +hv.toFixed(2);
      if (hv > hbound + 0.01) fail('badge-h', `${r.role} 뱃지 높이/메인 ${hv.toFixed(2)} > 상한 ${hbound.toFixed(2)}(청사진 ${hb == null ? '-' : hb.toFixed(2)})`);
    }
  }

  // 2. 패딩 — 글자 블록의 좌(정렬 기준 변)·상 위치가 청사진 ±10%(또는 규격 폭 2%)
  const L = Math.min(...rows.map(r => r.x)), R = Math.max(...rows.map(r => r.x + r.w)), T = Math.min(...rows.map(r => r.y)), B = Math.max(...rows.map(r => r.y + r.h));
  const tolX = Math.max(W * 0.02, 0.1 * (align === 'center' ? bp.cx : align === 'right' ? W - bp.R : bp.L));
  const dx = align === 'center' ? (L + R) / 2 - bp.cx : align === 'right' ? (W - R) - (W - bp.R) : L - bp.L;
  m.padL = { got: Math.round(align === 'right' ? W - R : align === 'center' ? (L + R) / 2 : L), bp: Math.round(align === 'right' ? W - bp.R : align === 'center' ? bp.cx : bp.L) };
  if (Math.abs(dx) > tolX) fail('pad-x', `${align === 'center' ? '가운데' : align === 'right' ? '오른쪽' : '왼쪽'} ${m.padL.got}px, 청사진 ${m.padL.bp}px`);
  // 위: 줄이 빠지면 덩어리를 세로 가운데로 다시 맞추므로(렌더러 recenter) 블록 중심으로 잰다. 그림이 아래인 시안은 위 기준
  const topMode = frame.visual === 'bottom';
  const dy = topMode ? T - bp.T : (T + B) / 2 - bp.cy;
  const tolY = Math.max(H * 0.02, 0.1 * (topMode ? bp.T : bp.cy));
  m.padT = { got: Math.round(T), bp: Math.round(bp.T) };
  if (Math.abs(dy) > tolY) fail('pad-y', `위 ${Math.round(T)}px, 청사진 ${Math.round(bp.T)}px(${topMode ? '위' : '중심'} 차 ${Math.round(dy)}px)`);

  // 2-2. 안전영역
  if (safe) {
    const s = { l: +safe.l || 0, r: +safe.r || 0, t: +safe.t || 0, b: +safe.b || 0 };
    if (L < s.l - 1 || R > W - s.r + 1 || T < s.t - 1 || B > H - s.b + 1) fail('safe', `글자 상자 ${Math.round(L)},${Math.round(T)}~${Math.round(R)},${Math.round(B)} 안전영역 밖`);
  }
  // 2-3. 글자와 그림(누끼) 간격 ≥ 청사진 최소값(겹치면 0 → 겹침만 금지). 배경 있는 그림은 글자 쪽을 녹이므로 안 잰다
  if (kv && kvCutout) {
    // 줄마다 잰다(ㄱ자 빈칸에 넣은 떼는 제목 아래·짧은 줄 옆이라 덩어리 상자로는 겹친 것처럼 보인다). 간격은 가장 가까운 줄
    let gap = Infinity;
    for (const r of rows) {
      const ox = Math.min(r.x + r.w, kv.x + kv.w) - Math.max(r.x, kv.x), oy = Math.min(r.y + r.h, kv.y + kv.h) - Math.max(r.y, kv.y);
      gap = Math.min(gap, ox > 0 && oy > 0 ? -Math.min(ox, oy) : Math.max(ox > 0 ? 0 : -ox, oy > 0 ? 0 : -oy));   // 모서리로 떨어진 줄은 더 먼 축이 간격
    }
    const horiz = frame.visual === 'right' || frame.visual === 'left', want = bp.kvGap == null ? null : Math.min(bp.kvGap, (horiz ? W : H) * 0.1);   // 렌더러와 같은 상한(규격의 10%)
    m.kvGap = { got: Math.round(gap), bp: want == null ? null : Math.round(want) };
    if (gap < 0) fail('kv-overlap', `글자와 그림 ${Math.round(-gap)}px 겹침`);
    else if (want != null && gap < want * 0.9 - 1) fail('kv-gap', `글자·그림 간격 ${Math.round(gap)}px < 청사진 ${Math.round(want)}px`);
  }
  // 2-4. 줄 간 간격 ±20%(청사진의 같은 쌍만. 렌더러가 H·12% 로 자르는 긴 간격은 그 값으로)
  m.gaps = {};
  const stack = [...rows].sort((a, b) => a.y - b.y);
  for (let i = 1; i < stack.length; i++) {
    const a = stack[i - 1], b = stack[i], g = b.y - (a.y + a.h), k = `${a.role}>${b.role}`, g0 = bp.gaps[k];
    m.gaps[k] = Math.round(g);
    if (g < -1) { fail('overlap', `${a.role}·${b.role} 겹침 ${Math.round(-g)}px`); continue; }
    if (g0 == null || g0 <= 0) continue;
    const want = Math.min(g0, H * 0.12), tol = Math.max(3, want * 0.2, Math.min(a.px, b.px) * 0.3, main.px * 0.12);   // 글자의 .3 아래 차이는 눈에 안 띈다(청사진 간격은 줄 높이 추정값이라 작은 값은 오차)
    if (Math.abs(g - want) > tol) fail('gap', `${k} 간격 ${Math.round(g)}px, 청사진 ${Math.round(want)}px`);
  }

  // 3. 잘림·넘침
  for (const r of rows) {
    if (r.y + r.h > H + 1 || r.x + r.w > W + 1 || r.x < -1 || r.y < -1) fail('clip', `${r.role} 상자가 규격 밖`);
    if (r.clip) fail('clip', `${r.role} 글자 잘림`);
    if (r.wb) fail('word-break', `${r.role} 낱말 안 줄바꿈`);
  }
  if (logo) for (const r of rows) if (r.x < logo.x + logo.w && r.x + r.w > logo.x && r.y < logo.y + logo.h && r.y + r.h > logo.y) { fail('logo-overlap', `로고와 ${r.role} 겹침`); break; }
  return { ok: fails.length === 0, fails, m };
}

// 렌더 HTML 의 trace(data-trace) → 검사 입력. 렌더러가 tpl.rows·kv 를 남긴다(core/renderers/ad-template.js)
export function traceOf(html) {
  const mt = /data-trace="([^"]*)"/.exec(String(html)); if (!mt) return null;
  return JSON.parse(mt[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
}
export function auditFromTrace(html, spec, frame) {
  const tr = traceOf(html); if (!tr?.tpl?.rows) return null;
  const sa = spec.rules?.safeArea ?? {};
  return typoAudit({ W: spec.w, H: spec.h, rows: tr.tpl.rows, logo: tr.tpl.logo ?? null, kv: tr.tpl.kv ?? null, kvCutout: !!tr.tpl.kvCutout, frame, sx: tr.tpl.sx, sy: tr.tpl.sy, align: tr.tpl.align, safe: { l: sa.left, r: sa.right, t: sa.top, b: sa.bottom } });
}

// 그린 결과의 지문 — 거의 같은 안(글자 상자 몇 px 차이)을 하나로 접는다(11-03 「다른 시안」 모달에 같은 안 3개).
//   역할별 상자(x·y·w·h ÷ 규격)·px(÷√면적)·굵기·뱃지 + 그림 상자 + 전면 여부
export function fingerprintOf(tr, W, H) {
  const t = tr?.tpl; if (!t?.rows) return null;
  const S = Math.sqrt(W * H), rows = {};
  for (const r of t.rows) rows[r.role] = { x: r.x / W, y: r.y / H, w: r.w / W, h: r.h / H, px: r.px / S, wt: r.wt, badge: !!r.badge };
  const kv = t.kv ? { x: t.kv.x / W, y: t.kv.y / H, w: t.kv.w / W, h: t.kv.h / H } : null;
  return { rows, kv, align: t.align ?? 'left' };
}
// 두 지문의 거리(0 = 같음, 1 이상 = 다른 안). 역할 구성·정렬·뱃지가 다르면 다른 안. 그 밖엔 성분마다 「사람 눈에 같은 안」 허용폭으로 나눈 최대값:
//   x 12%·y 15%(블록 자리 몇 십 px 차이는 같은 안 — 11-03 모달 사례), 폭 15%·높이 8%, 글자 15%, 굵기 150(700↔800 은 같은 안), 그림 상자 10%
const TOL = { x: 0.12, y: 0.15, w: 0.15, h: 0.08, px: 0.15, wt: 150, kv: 0.1 };   // 폭은 문구 길이에 따라 달라 15%
export function fpDistance(a, b) {
  if (!a || !b || a.align !== b.align) return 9;
  const ka = Object.keys(a.rows).sort().join(), kb = Object.keys(b.rows).sort().join();
  if (ka !== kb || !!a.kv !== !!b.kv) return 9;
  let d = 0;
  for (const k of Object.keys(a.rows)) {
    const p = a.rows[k], q = b.rows[k];
    if (p.badge !== q.badge) return 9;
    d = Math.max(d, Math.abs(p.x - q.x) / TOL.x, Math.abs(p.y - q.y) / TOL.y, Math.abs(p.w - q.w) / TOL.w, Math.abs(p.h - q.h) / TOL.h, Math.abs(p.px - q.px) / Math.max(p.px, q.px) / TOL.px, Math.abs(p.wt - q.wt) / TOL.wt);
  }
  if (a.kv) for (const k of ['x', 'y', 'w', 'h']) d = Math.max(d, Math.abs(a.kv[k] - b.kv[k]) / TOL.kv);
  return d;
}
export const DUP_DIST = 1;
export const nearDuplicate = (a, b) => fpDistance(a, b) < DUP_DIST;

// ── 기준 = 규격 분포(norms) 모드 — 자유 디자인(11-05 사용자 「배경은 자유, 타이포는 기본 여백 규칙」 → 정정 「간격만 규칙, 나머지는 참고 분포」).
//   검증하는 것(docs/freedesign-rules.md 4항): 글자 덩어리 안 간격(서브→메인·메인→정보 블록·정보 블록 행)과 글자↔키비주얼·로고 거리의 「너무 붙음(하한)·너무 벙벙(상한)」,
//   잘림·겹침·규격 밖·안전영역(매체 규정 층). 여백 위치·메인 크기·서브/메인 비·덩어리 폭은 m 에 재서 돌려줄 뿐 fail 하지 않는다(프롬프트의 참고 분포).
//   상한은 core/template-norms.js 의 gap(줄 간격 ÷ 메인 글자) 상위10% — 규격 분포가 없으면 전 규격 상위10% 들의 중앙값. 하한은 em 고정값(두 요소 중 작은 글자 기준).
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
export const TYPO_RULE_FIXED = { gapSubMain: 0.3, gapMainInfo: 0.8, gapInfoRow: 0.6, assetGap: 0.5, assetGapMaxFrac: 0.1, logoMaxMain: 2.4 };   // logoMaxMain: 로고 폭 ≤ 메인 px × 2.4(룰 logo-cap 과 같은 값, 11-10 사용자 「지키면 좋을듯」)   // em = 작은 쪽 글자 · 그림 거리 상한 = 규격 긴 변 10%(렌더러 kv-gap 상한과 같은 값)
export function typoNormsFor(specId) {
  const n = TEMPLATE_NORMS[specId];
  const pick = k => n ? [n[k][0], n[k][2], n[k][1]] : (() => { const all = Object.values(TEMPLATE_NORMS).map(x => x[k]); return [med(all.map(a => a[0])), med(all.map(a => a[2])), med(all.map(a => a[1]))]; })();
  const r = { source: n ? `규격 분포 n=${n.n}` : '전 규격 합산 중앙값(규격 분포 없음)' };
  for (const k of ['main', 'padL', 'padT', 'r2', 'gap']) { const [lo, hi, mid] = pick(k); r[k] = { lo: +lo.toFixed(3), hi: +hi.toFixed(3), mid: +mid.toFixed(3) }; }
  return r;
}
// rows: [{ role, px, lines, x,y,w,h(상자), ink:{x,y,w,h}|null, clip, wb }] · logo/kv: {x,y,w,h}|null (kv 는 주인공 상자 — 누끼일 때만 넘긴다)
export function typoAuditNorms({ W, H, rows, logo = null, kv = null, specId, norms = null, safe = null }) {
  const N = norms ?? typoNormsFor(specId), F = TYPO_RULE_FIXED, fails = [], m = { norms: N };
  const fail = (rule, code, msg) => fails.push({ rule, code, msg });
  const main = rows.find(r => r.role === 'main');
  if (!main) return { ok: false, fails: [{ rule: 0, code: 'no-main', msg: '메인 없음' }], m };
  const box = r => r.ink ?? r;
  const short = Math.min(W, H), S = Math.sqrt(W * H);
  const L = Math.min(...rows.map(r => box(r).x)), R = Math.max(...rows.map(r => box(r).x + box(r).w)), T = Math.min(...rows.map(r => box(r).y)), B = Math.max(...rows.map(r => box(r).y + box(r).h));
  // 참고 수치(검증 안 함): 여백·메인 크기·서브/메인·덩어리 폭
  m.padL = +(L / short).toFixed(3); m.padT = +(T / short).toFixed(3); m.main = +(main.px / S).toFixed(3); m.blockW = +((R - L) / W).toFixed(3);
  const second = rows.filter(r => r !== main && r.role !== 'notice').sort((a, b) => b.px - a.px)[0];
  if (second) m.r2 = +(second.px / main.px).toFixed(3);
  // ① 덩어리 안 간격 — 하한: 서브→메인 0.3em · 메인→정보 0.8em · 정보 행 0.6em(em = 작은 쪽) · 상한: 분포 상위10%(÷메인 px). 겹침은 ✗
  const INFO = ['date', 'detail', 'notice'];
  const stack = [...rows].sort((a, b) => box(a).y - box(b).y); m.gaps = {};
  const hi = N.gap.hi * main.px;
  for (let i = 1; i < stack.length; i++) {
    const a = stack[i - 1], b = stack[i], g = box(b).y - (box(a).y + box(a).h), k = `${a.role}>${b.role}`; m.gaps[k] = Math.round(g);
    // 가로 1행(세로 구분선형 정보 블록 — 프리셋 divider)은 위아래 스택이 아니다: 가로로 안 겹치고 세로로 겹치면 건너뛴다(11-09 r1 오탐 「date·detail 겹침 20px」)
    { const A = box(a), B = box(b); const xo = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x); if (xo <= 0 && g < 0) continue; }
    if (g < -1) { fail(1, 'overlap', `${a.role}·${b.role} 겹침 ${Math.round(-g)}px`); continue; }
    const em = Math.min(a.px, b.px);
    const lo = a.role === 'sub' && b.role === 'main' ? F.gapSubMain : a.role === 'main' && INFO.includes(b.role) ? F.gapMainInfo : INFO.includes(a.role) && INFO.includes(b.role) ? F.gapInfoRow : null;
    if (lo != null && g < em * lo - 1) fail(1, 'gap-tight', `${k} 간격 ${Math.round(g)}px < ${lo}em(${Math.round(em * lo)}px) — 너무 붙음`);
    if (g > hi + 1) fail(1, 'gap-loose', `${k} 간격 ${Math.round(g)}px > 분포 상위10% ${N.gap.hi}×메인(${Math.round(hi)}px) — 너무 벙벙`);
  }
  // ② 글자 ↔ 키비주얼(주인공)·로고 — 겹침 0 · 하한 메인 px 0.5배 · 상한(키비주얼만) 규격 긴 변 10%
  const want = main.px * F.assetGap, cap = Math.max(W, H) * F.assetGapMaxFrac;
  const gapTo = (o) => { let gap = Infinity; for (const r of rows) { const b = box(r); const ox = Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x), oy = Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y); gap = Math.min(gap, ox > 0 && oy > 0 ? -Math.min(ox, oy) : Math.max(ox > 0 ? 0 : -ox, oy > 0 ? 0 : -oy)); } return gap; };
  for (const [name, o] of [['키비주얼', kv], ['로고', logo]]) {
    if (!o) continue; const g = gapTo(o); m[name === '로고' ? 'logoGap' : 'kvGap'] = Math.round(g);
    if (g < 0) fail(2, name === '로고' ? 'logo-overlap' : 'kv-overlap', `글자와 ${name} ${Math.round(-g)}px 겹침`);
    else if (g < want - 1) (m.notes ??= []).push(`asset-tight(참고): 글자·${name} 간격 ${Math.round(g)}px < 메인 0.5배(${Math.round(want)}px) — 너무 붙음`);   // 11-10 사용자 「그래」: 비중은 객관(가림·대비·로고 상한·겹침)만 검수(2층), 거리·붙음·비어 보임은 디자인 판단(3층) — AI 는 참고
    else if (name === '키비주얼' && g > cap + 1) (m.notes ??= []).push(`asset-loose(참고): 글자·${name} 간격 ${Math.round(g)}px > 규격 긴 변 10%(${Math.round(cap)}px)`);   // 11-10 사용자 「참고」 — 반려 안 함(docs/ai-rule-layers.md K9)
  }
  // 로고 비중 상한(L1 — 룰 logo-cap 과 같은 값): 로고 폭이 메인 글자 px × 2.4 를 넘으면 ✗ — 자동 고침이 줄인다(core/freequick.js fixLogoSize)
  if (logo && logo.w > main.px * F.logoMaxMain + 1) { m.logoCap = Math.round(main.px * F.logoMaxMain); fail(2, 'logo-big', `로고 폭 ${Math.round(logo.w)}px > 메인 글자 ${main.px}px × ${F.logoMaxMain}(${m.logoCap}px) — 로고가 메인보다 커 보임`); }
  // ③ 잘림·낱말 안 줄바꿈·규격 밖·안전영역(매체 규정 층)
  for (const r of rows) {
    if (r.y + r.h > H + 1 || r.x + r.w > W + 1 || r.x < -1 || r.y < -1) fail(3, 'clip', `${r.role} 상자가 규격 밖`);
    if (r.clip) fail(3, 'clip', `${r.role} 글자 잘림`);
    if (r.wb) (m.notes ??= []).push(`word-break(참고): ${r.role} 낱말 안 줄바꿈`);   // 11-10 사용자 「안 지켜도 됨」 — AI 트랙은 반려 안 함
  }
  if (safe) { const s = { l: +safe.l || 0, r: +safe.r || 0, t: +safe.t || 0, b: +safe.b || 0 }; if (L < s.l - 1 || R > W - s.r + 1 || T < s.t - 1 || B > H - s.b + 1) fail(3, 'safe', `글자 상자 ${Math.round(L)},${Math.round(T)}~${Math.round(R)},${Math.round(B)} 안전영역 밖`); }
  return { ok: fails.length === 0, fails, m };
}

// ── 11-09 AI 트랙 통합 — 게이트 구멍: 글자 ↔ 사진·장식 겹침(순수 판정. 측정은 scripts/lib/freedesign-renderer.mjs measureOverlap)
//   서버 에이전트 보고: 대각 구성에서 상세 글자 끝이 사진 위로 넘어가도, 장식 별이 서브 글자에 걸려도 통과했다(대비 검사가 글자 둘레 평균이라 묻힘).
//   ① 사진 위 글자: 글자를 지운 렌더에서 잉크 상자 안(키비주얼 상자와 겹치는 점만)을 촘촘히 재어 대비 < 기준(24px 이상 3:1, 그 밖 4.5:1 — 게이트 대비와 같은 기준)인 점이 상자의 photoBadFrac 이상이고
//      그 점들의 하위 10% 대비가 기준 × photoSlack 밑이면 ✗(4.4:1 같은 경계값 스크림 위 글자는 살린다 — fg-dn-park 전면 안 실측)
//   ② 장식 겹침: svg 도형·글자 없는 칠한 상자가 글자 잉크 상자에 decoMinHits 점 이상 걸리면 ✗. 단 글자 아래에 깔린 넓은 판(글자 점의 backdropFrac 이상을 덮음)·지면 넓이 bigArea 이상(패턴·질감)·흐린 것(opacity < minOpacity)은 뺀다.
//      칠한 상자(div)는 글자 위에 올라온 것만 센다(글자 아래 형광펜·라벨 판은 디자인).
export const OVERLAP_RULE = { photoBadFrac: 0.08, photoSlack: 0.9, decoMinHits: 3, backdropFrac: 0.6, bigArea: 0.4, minOpacity: 0.2 };
// fields: [{ role, fontPx, need, n, photo:{ n, bad, p10, min }, decos:[{ tag, svg, box, area, opacity, hits, above, frac }] }]
export function overlapAudit({ fields = [], rule = OVERLAP_RULE } = {}) {
  const fails = [], m = {};
  for (const f of fields) {
    const n = f.n || 1, ph = f.photo ?? {};
    m[f.role] = { photoBad: ph.n ? Math.round(ph.bad / n * 100) / 100 : 0, p10: ph.p10 ?? null };
    if (ph.n && ph.bad / n >= rule.photoBadFrac && (ph.p10 ?? ph.min ?? 0) < f.need * rule.photoSlack) fails.push({ code: 'photo-text', role: f.role, msg: `${f.role} 글자가 사진 위 — 상자 ${Math.round(ph.bad / n * 100)}%가 대비 ${ph.p10 ?? ph.min}:1 < ${f.need}:1. 글자를 지면 쪽으로 옮기거나 줄을 나누거나, 글자 뒤에 판·스크림` });
    for (const d of f.decos ?? []) {
      const above = d.above > 0;
      if (d.hits < rule.decoMinHits || (d.area >= rule.bigArea && !above) || d.opacity < rule.minOpacity) continue;   // 넓은 도형도 글자 위로 지나가면 ✗(11-09 r1: 지면 가로지르는 사선이 날짜 글자 위)
      if (!d.svg && !above) continue;                       // 글자 아래 칠한 상자 = 판·형광펜(디자인)
      if (!above && d.frac >= rule.backdropFrac) continue;  // 글자 아래 넓게 깔린 도형 = 바탕
      fails.push({ code: 'deco-overlap', role: f.role, msg: `장식 ${d.tag}(x${d.box.x} y${d.box.y} ${d.box.w}×${d.box.h})가 ${f.role} 글자에 걸림${above ? '(글자 위)' : ''} — 장식을 글자 밖으로 옮기거나 지운다` });
    }
  }
  return { ok: !fails.length, fails, issues: fails.map(f => `겹침 ${f.code}: ${f.msg}`), m };
}

// ── 11-09 6단계 검증 루프 — 게이트 구멍: 앱 디자인 검수(core/adcheck.js checkAdDoc 1·2항)와 같은 판정을 서버 게이트에서(순수. 측정은 scripts/lib/freedesign-renderer.mjs measureSubjects)
//   통합 시험: 전면 사진 안에서 「sub 글자가 주인공 위 100%」「주인공이 로고 100% 가림」이 앱에서만 잡혀 「경고」 카드로 추천됐다.
//   주인공 상자 = 그림이 실제 그려진 네모(배경 size/position 환산) × kvMeta 주인공(core/field.js profileFocus — 앱과 같은 함수), 오브젝트 상자 안으로 자름.
//   주인공을 모르면(focus 없음) 오브젝트 상자 전체가 주인공(앱과 같음).
//   ① 글자-주인공: 글자 잉크 상자의 textFrac 이상이 주인공 상자 위면 ✗ ② 로고 가림: 로고 상자의 logoFrac 넘게 주인공과 겹치는데 로고가 위(z-index>0 조상)가 아니면 ✗
export const SUBJECT_RULE = { textFrac: 0.15, logoFrac: 0.05, boxBgFrac: 0.6 };
const _inter = (a, b) => { const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h); return Math.max(0, x1 - x0) * Math.max(0, y1 - y0); };
const _area = r => Math.max(1, r.w * r.h);
// objects: [{ box:{x,y,w,h}(요소 상자), clip?:{x,y,w,h}(clip-path 로 보이는 bbox), drawn:{x,y,w,h}|null(그림이 그려진 네모) }], focus: { x,y,w,h }(원본 비율) | null, texts: [{ role, ink }], logo: { box, onTop } | null
export function subjectBoxes(objects = [], focus = null) {
  return objects.filter(o => o?.box).map(o => {
    const vb = o.clip ?? o.box;   // clip-path 가 있으면 보이는 영역(앱 adcheck 와 같음)
    if (!focus || !o.drawn) return { box: o.box, s: vb, full: null };
    const img = o.drawn;
    const full = { x: img.x + (focus.x - focus.w / 2) * img.w, y: img.y + (focus.y - focus.h / 2) * img.h, w: focus.w * img.w, h: focus.h * img.h };
    const x0 = Math.max(full.x, vb.x), y0 = Math.max(full.y, vb.y), x1 = Math.min(full.x + full.w, vb.x + vb.w), y1 = Math.min(full.y + full.h, vb.y + vb.h);
    return { box: o.box, s: { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }, full };
  });
}
export function subjectAudit({ texts = [], logo = null, objects = [], focus = null, cutout = false, rule = SUBJECT_RULE } = {}) {
  const subs = subjectBoxes(objects, focus); const fails = [];
  const r1 = v => Math.round(v);
  const m = { subjects: subs.map(s => ({ x: r1(s.s.x), y: r1(s.s.y), w: r1(s.s.w), h: r1(s.s.h) })), text: {}, logo: null, focus: !!focus };
  for (const t of texts) {
    const ink = t.ink; if (!ink || ink.w < 1 || ink.h < 1) continue;
    let pct = 0; for (const s of subs) pct = Math.max(pct, _inter(ink, s.s) / _area(ink));
    m.text[t.role] = Math.round(pct * 100);
    if (pct >= rule.textFrac) { const s = subs[0]?.s; fails.push({ code: 'text-over-subject', role: t.role, msg: `${t.role} 글자가 주인공 위로 ${Math.round(pct * 100)}% 겹침(주인공 상자 x${r1(s.x)} y${r1(s.y)} ${r1(s.w)}×${r1(s.h)}) — 글자를 주인공 밖 빈 쪽(하늘·바닥·단색 면)으로 옮기거나, 그림 위치·크기를 바꿔 주인공을 글자 반대쪽으로` }); }
  }
  // ③ 뚝 끊긴 변(앱 adcheck 3항과 같음): 주인공이 요소 상자 변에서 잘리는데 그 변이 지면 안쪽이고 녹임(mask)·둥근 상자·clip-path 가 없으면 ✗ — 11-09 r1 누끼 행성이 상자 왼변에서 세로로 뚝 잘림
  if (focus && cutout) subs.forEach((s, i) => {
    const o = objects.filter(x => x?.box)[i]; if (!s.full || !o || o.masked || o.rounded || o.clip) return;
    const tol = 0.12, tx = s.full.w * tol, ty = s.full.h * tol, b = o.box, W = o.W ?? Infinity, H = o.H ?? Infinity;
    const cut = { top: s.full.y < b.y - ty, bottom: s.full.y + s.full.h > b.y + b.h + ty, left: s.full.x < b.x - tx, right: s.full.x + s.full.w > b.x + b.w + tx };
    const inside = { top: b.y > 1, bottom: b.y + b.h < H - 1, left: b.x > 1, right: b.x + b.w < W - 1 };
    const hard = ['top', 'bottom', 'left', 'right'].filter(k => cut[k] && inside[k]);
    if (hard.length) fails.push({ code: 'hard-cut', role: 'kv', msg: `주인공이 키비주얼 상자 ${hard.map(k => ({ top: '윗변', bottom: '아랫변', left: '왼변', right: '오른변' }[k])).join('·')}에서 뚝 잘림(녹임 없음) — 상자를 키우거나 background-size:contain 으로 주인공 전체를 담거나, 그 변을 지면 끝에 붙인다` });
  });
  // ④ 글자가 키비주얼 상자(카드·창·면) 위로 걸침 — 지면 바탕으로 깐 그림(지면의 boxBgFrac 이상)은 빼고, 보이는 상자(clip-path 반영)와 글자 잉크가 2px 넘게 겹치면 ✗(11-09 r2: 카드 테두리 위로 직무 글자 끝 「IT」가 넘어감)
  { const objs = objects.filter(x => x?.box); const W0 = objs[0]?.W, H0 = objs[0]?.H;
    if (!cutout && W0 && H0) for (const o of objs) { const vb = o.clip ?? o.box; if (vb.w * vb.h >= rule.boxBgFrac * W0 * H0) continue;
      for (const t of texts) { const ink = t.ink; if (!ink) continue; const ox = Math.min(ink.x + ink.w, vb.x + vb.w) - Math.max(ink.x, vb.x), oy = Math.min(ink.y + ink.h, vb.y + vb.h) - Math.max(ink.y, vb.y);
        if (ox > 2 && oy > 2 && vb.poly) {   // 다각형(대각 면)은 bbox 가 아니라 다각형 안 점으로 — 잉크 격자 점 중 다각형 안이 3% 넘을 때만
          const inPoly = (x, y) => { let c = false; const P = vb.poly; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
          let n = 0, k = 0; for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 16; gx++) { n++; if (inPoly(ink.x + ink.w * (gx + 0.5) / 16, ink.y + ink.h * (gy + 0.5) / 8)) k++; }
          if (k / n <= 0.03) continue;
        }
        if (ox > 2 && oy > 2 && !fails.some(f => f.role === t.role)) fails.push({ code: 'text-over-kvbox', role: t.role, msg: `${t.role} 글자가 키비주얼 상자(x${r1(vb.x)} y${r1(vb.y)} ${r1(vb.w)}×${r1(vb.h)}) 위로 ${r1(ox)}×${r1(oy)}px 걸침 — 줄을 나누거나 글자를 상자 밖으로` }); } } }
  if (logo?.box) {
    let pct = 0; for (const s of subs) pct = Math.max(pct, _inter(logo.box, s.s) / _area(logo.box));
    m.logo = Math.round(pct * 100);
    if (pct > rule.logoFrac && !logo.onTop) fails.push({ code: 'logo-covered', role: 'logo', msg: `주인공이 로고를 ${Math.round(pct * 100)}% 가림 — 로고를 주인공 밖(빈 모서리)으로 옮기거나 주인공을 비킨다` });
  }
  return { ok: !fails.length, fails, issues: fails.map(f => `주인공 ${f.code}: ${f.msg}`), m };
}
// clip-path 로 보이는 영역(요소 상자 기준 bbox) — polygon(…px|%)·inset(…) 만. 모르면 null(요소 상자 그대로). 앱 core/adcheck.js 와 렌더러 측정이 같이 쓴다(문자열로 주입하므로 자기완결).
//   11-09 6단계 r1: 대각 구성이 지면 전체 상자에 clip-path 로 사진을 한 면에만 그렸는데, 요소 상자 전체를 주인공으로 재어 글자·로고가 「주인공 위」로 반려됐다(눈으로는 깨끗).
export function clipBoxOf(clip, r) {
  const s = String(clip ?? '').trim(); if (!s || s === 'none') return null;
  const val = (v, ref) => { v = String(v).trim(); if (/%$/.test(v)) return parseFloat(v) / 100 * ref; if (/px$/.test(v) || /^-?[\d.]+$/.test(v)) return parseFloat(v); return null; };
  let m = /^polygon\((.*)\)$/i.exec(s);
  if (m) {
    const pts = m[1].replace(/^\s*(nonzero|evenodd)\s*,/i, '').split(',').map(p => p.trim().split(/\s+/)).filter(p => p.length >= 2).map(([x, y]) => [val(x, r.w), val(y, r.h)]);
    if (!pts.length || pts.some(([x, y]) => x == null || y == null || !isFinite(x) || !isFinite(y))) return null;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys)), x1 = Math.min(r.w, Math.max(...xs)), y1 = Math.min(r.h, Math.max(...ys));
    return x1 > x0 && y1 > y0 ? { x: r.x + x0, y: r.y + y0, w: x1 - x0, h: y1 - y0, poly: pts.map(([x, y]) => [r.x + x, r.y + y]) } : null;
  }
  m = /^inset\(([^)]*)\)$/i.exec(s);
  if (m) {
    const parts = m[1].split(/\s+round\s+/i)[0].trim().split(/\s+/); const [t, rt = t, b = t, l = rt] = parts;
    const T = val(t, r.h), Rr = val(rt, r.w), B = val(b, r.h), L = val(l, r.w); if ([T, Rr, B, L].some(v => v == null)) return null;
    return { x: r.x + L, y: r.y + T, w: Math.max(0, r.w - L - Rr), h: Math.max(0, r.h - T - B) };
  }
  return null;
}
