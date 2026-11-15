// 레이아웃 가이드 겹쳐 보기 — 칸 계산(그리기는 app/app.js guideOverlay, 확인 그림은 scripts/guide-overlay-shot.mjs).
//
// 10-28 담당자 「프로그램 내 레이아웃 가이드」 → 11-09 실제 줄 → 11-15 노션 「문구별 가이드 영역으로 세분화(특정 가이드만)」.
//   - 대상 매체(LINE_GUIDE): 네이버(모바일 DA) · 리멤버 · 자소설닷컴 · 잡다 · 카카오 비즈보드(NAP DSP 비즈보드 포함) · 에브리타임(커뮤니티 보드·홈 배너).
//     매체 가이드 원본처럼 문구 한 줄마다 한 칸(줄 띠)을 그린다. 칸 폭은 틀 칸 폭(매체 가이드 원본 칸 값), 줄 위치·줄 수는 이 소재가 실제로 쓴 줄
//     (렌더 기록 data-trace textBox.rows) — 메인 1·2줄, 서브 줄 수, 상세 줄 수에 따라 따라 움직인다(자소설 PC메인·M메인 메인 2줄이면 상세 1행 자리 비움, M팝업 상세 위치, 달력 메인 + 날짜).
//   - 그 밖의 틀 있는 매체: 역할마다 한 칸(줄을 묶어 ×n).
//   - 렌더 기록이 없으면(예전 저장본) 틀 칸 값을 규격 크기로 환산해 그린다(달력 328×466 틀 → 164×233).
import { templateScale } from './renderers/ad.js';

export const GUIDE_ROLE = { sub: '서브', main: '메인', detail: '상세', date: '날짜', cta: 'CTA', extra: '부가', tags: '태그' };

// 문구별(줄 띠) 가이드 대상 — 노션 11-03 「특정 가이드만」 목록
const LINE_GUIDE = [/^naver-gfa-mobile-da/, /^remember-/, /^jasoseol-/, /^jobda-/, /^kakao-bizboard/, /^nap-dsp-bizboard/, /^everytime-(community-board|home-banner)$/];
export const lineGuideTarget = spec => !!spec?.id && LINE_GUIDE.some(re => re.test(spec.id));
const isBizboard = spec => /bizboard/.test(spec?.id ?? '');

export const traceOfHtml = html => { try { return JSON.parse(String(html ?? '').match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch { return null; } };

const r1 = v => Math.round(v * 10) / 10;
const label = (role, px, n) => `${GUIDE_ROLE[role] ?? role}${px ? ` ${Math.round(px)}px` : ''}${n > 1 ? ` · ${n}줄` : ''}`;

// 역할별 칸(틀 칸 x·폭) — 렌더 기록 mold.rows 가 규격 크기로 환산된 값. 칸 값이 없는 역할(잡다 태그 칩 행)은 메인 칸을 빌린다
function colOf(trace, role, spec, k) {
  const R = trace?.mold?.rows ?? {}, u = R[role], m = R.main ?? R.sub ?? null;
  const x = Number.isFinite(u?.x) ? u.x : Number.isFinite(m?.x) ? m.x : null;
  const w = Number.isFinite(u?.w) ? u.w : Number.isFinite(m?.w) ? m.w : null;
  if (x != null && w != null) return { x, w };
  const mold = spec?.rules?.safeArea?.measuredFromTemplate?.mold ?? {};
  const mx = (mold.rows?.[role]?.x ?? mold.x), mw = (mold.rows?.[role]?.w ?? mold.w);
  return { x: Number.isFinite(mx) ? mx * k : null, w: Number.isFinite(mw) ? mw * k : null };
}

// 줄 띠: 기록의 한 줄 = 한 칸. 같은 역할의 첫 줄에만 이름표(「메인 40px · 2줄」)
export function lineRowsOf(spec, trace, k = 1) {
  const rows = trace?.textBox?.rows; if (!Array.isArray(rows) || !rows.length) return null;
  const n = {}; for (const r of rows) n[r.role] = (n[r.role] ?? 0) + 1;
  const seen = new Set(), out = [];
  for (const r of rows) {
    const c = colOf(trace, r.role, spec, k);
    const x = c.x ?? r.x ?? 0, w = Math.max(c.w ?? 0, r.w ?? 0) || (spec.w - x);
    const px = trace.fonts?.[r.role]?.px ?? trace.mold?.rows?.[r.role]?.px ?? null;
    const first = !seen.has(r.role); seen.add(r.role);
    const sh = px ? Math.min(r.h, px * 1.22) : r.h;   // 띠 높이 = 글상자 높이(글자 크기 × 1.22) — 줄 간격만큼 띠 사이가 비어 매체 가이드처럼 줄이 갈린다. 행 가운데 정렬(글자가 행 가운데 놓인다)
    out.push({ kind: 'line', role: r.role, label: first ? label(r.role, px, n[r.role]) : '', x: r1(x), y: r1(r.y + (r.h - sh) / 2), w: r1(w), h: r1(sh) });
  }
  return out;
}

// 카카오 비즈보드 — 2줄형 전환(메인 2줄 ↔ 1줄형 자리)은 다른 작업(비즈보드 2줄형 가이드 변환)이 맡는다. 여기는 문구별 줄 띠만:
//   그쪽이 2줄형 칸 값을 렌더 기록에 남기면 이 함수만 맞춰 고친다
export function bizboardGuideRows(spec, trace, k = 1) { return lineRowsOf(spec, trace, k); }

// 역할마다 한 칸(줄을 묶어 ×n) — 대상 밖 매체(예전 방식, 11-09)
function mergedRowsOf(spec, trace) {
  const rows = trace?.textBox?.rows; if (!Array.isArray(rows) || !rows.length) return null;
  const out = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.role === r.role && Math.abs(r.y - (last.y + last.h)) < Math.max(4, r.h * 0.6)) { const x2 = Math.max(last.x + last.w, r.x + (r.w ?? 0)); last.x = Math.min(last.x, r.x); last.w = x2 - last.x; last.h = r.y + r.h - last.y; last.n++; continue; }
    out.push({ role: r.role, x: r.x ?? 0, y: r.y, w: r.w ?? 0, h: r.h, n: 1 });
  }
  return out.map(b => { const px = trace.fonts?.[b.role]?.px ?? trace.mold?.rows?.[b.role]?.px ?? null; const c = colOf(trace, b.role, spec, 1);
    return { kind: 'text', role: b.role, label: `${GUIDE_ROLE[b.role] ?? b.role}${px ? ` ${Math.round(px)}px` : ''}${b.n > 1 ? ` ×${b.n}` : ''}`, x: r1(c.x ?? b.x), y: r1(b.y), w: r1(Math.max(b.w, c.w ?? 0)), h: r1(b.h) }; });
}

// 렌더 기록이 없을 때: 틀 칸 값(최대 줄 수)을 규격 크기로 환산
function moldRowsOf(spec, mold, k, perLine) {
  const out = [];
  for (const [role, row] of Object.entries(mold?.rows ?? {})) {
    if (!row || !Number.isFinite(row.y)) continue;
    const x = (row.x ?? mold.x ?? 0) * k, w = (row.w ?? mold.w ?? (spec.w / k - (row.x ?? mold.x ?? 0))) * k;
    const pitch = (row.pitch ?? (row.px ? row.px * 1.25 : 24)) * k, n = row.lines ?? 1, px = row.px ? row.px * k : null;
    if (perLine) for (let i = 0; i < n; i++) out.push({ kind: 'line', role, label: i ? '' : label(role, px, n), x: r1(x), y: r1(row.y * k + i * pitch), w: r1(w), h: r1(pitch) });
    else out.push({ kind: 'text', role, label: `${GUIDE_ROLE[role] ?? role}${px ? ` ${Math.round(px)}px` : ''}${n > 1 ? ` ×${n}` : ''}`, x: r1(x), y: r1(row.y * k), w: r1(w), h: r1(pitch * n) });
  }
  return out;
}

const okRect = r => r && Number.isFinite(r.x) && Number.isFinite(r.y) && r.w > 0 && r.h > 0;

/** 소재 한 장의 가이드 칸들. spec = 규격(w·h·rules), trace = 렌더 기록(없으면 틀 칸).
 *  반환: [{ kind: 'line'|'text'|'logo'|'image'|'safe', role?, label, x, y, w, h }] — 규격 px 좌표 */
export function guideBoxes(spec, trace = null) {
  const sa = spec?.rules?.safeArea; if (!sa) return [];
  const mold = sa.measuredFromTemplate?.mold ?? null;
  const k = templateScale(spec.rules, spec.w) || 1;
  const perLine = lineGuideTarget(spec);
  const out = [];
  const used = trace ? (perLine ? (isBizboard(spec) ? bizboardGuideRows(spec, trace, k) : lineRowsOf(spec, trace, k)) : mergedRowsOf(spec, trace)) : null;
  if (used) out.push(...used); else out.push(...moldRowsOf(spec, mold, k, perLine));
  // 로고·그림 칸: 렌더 기록의 실제 칸(키비주얼 왼쪽 등 좌우 바꿈 반영) → 없으면 틀 칸 환산
  const sc = r => okRect(r) ? { x: r1(r.x * k), y: r1(r.y * k), w: r1(r.w * k), h: r1(r.h * k) } : null;
  const logo = okRect(trace?.mold?.logo) ? trace.mold.logo : sc(mold?.logo), image = okRect(trace?.mold?.image) ? trace.mold.image : sc(mold?.image);
  if (logo) out.push({ kind: 'logo', label: '로고 칸', x: logo.x, y: logo.y, w: logo.w, h: logo.h });
  if (image) out.push({ kind: 'image', label: '그림 칸', x: image.x, y: image.y, w: image.w, h: image.h });
  const ins = ['top', 'right', 'bottom', 'left'].map(key => Number.isFinite(sa[key]) ? sa[key] : null);
  if (ins.some(v => v != null) && spec.w && spec.h) { const [t, r, b, l] = ins.map(v => v ?? 0); out.push({ kind: 'safe', label: `안전 영역 ${[t, r, b, l].join('/')}`, x: l, y: t, w: spec.w - l - r, h: spec.h - t - b }); }
  return out;
}
export const GUIDE_LEGEND = { line: '문구 칸(줄마다)', text: '글자 칸', logo: '로고 칸', image: '그림 칸', safe: '안전 영역' };
