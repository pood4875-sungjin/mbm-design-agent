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

export const BP = { sub: 0.78, date: 0.70, detail: 0.60, label: 0.60, badgePx: { date: 0.66, detail: 0.54, sub: 0.66 }, badgeH: { date: 1.10, detail: 1.01, sub: 1.10 }, kRel: 1.15 };

const ROLE_OF = { main: 'main', season: 'sub', date: 'date', role: 'detail' };
const mainWt = r => Math.max(r.wt ?? 0, r.emph?.kind === 'weight' ? Math.max(r.emph.client ?? 0, r.emph.hire ?? 0) : 0);

// 청사진 프레임의 기준값(규격 크기로 환산)
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
export const TYPO_RULE_FIXED = { gapSubMain: 0.3, gapMainInfo: 0.8, gapInfoRow: 0.6, assetGap: 0.5, assetGapMaxFrac: 0.1 };   // em = 작은 쪽 글자 · 그림 거리 상한 = 규격 긴 변 10%(렌더러 kv-gap 상한과 같은 값)
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
    else if (g < want - 1) fail(2, 'asset-tight', `글자·${name} 간격 ${Math.round(g)}px < 메인 0.5배(${Math.round(want)}px) — 너무 붙음`);
    else if (name === '키비주얼' && g > cap + 1) fail(2, 'asset-loose', `글자·${name} 간격 ${Math.round(g)}px > 규격 긴 변 10%(${Math.round(cap)}px) — 너무 벙벙`);
  }
  // ③ 잘림·낱말 안 줄바꿈·규격 밖·안전영역(매체 규정 층)
  for (const r of rows) {
    if (r.y + r.h > H + 1 || r.x + r.w > W + 1 || r.x < -1 || r.y < -1) fail(3, 'clip', `${r.role} 상자가 규격 밖`);
    if (r.clip) fail(3, 'clip', `${r.role} 글자 잘림`);
    if (r.wb) fail(3, 'word-break', `${r.role} 낱말 안 줄바꿈`);
  }
  if (safe) { const s = { l: +safe.l || 0, r: +safe.r || 0, t: +safe.t || 0, b: +safe.b || 0 }; if (L < s.l - 1 || R > W - s.r + 1 || T < s.t - 1 || B > H - s.b + 1) fail(3, 'safe', `글자 상자 ${Math.round(L)},${Math.round(T)}~${Math.round(R)},${Math.round(B)} 안전영역 밖`); }
  return { ok: fails.length === 0, fails, m };
}
