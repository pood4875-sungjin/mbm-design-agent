// core/variants.js — 레이아웃 안(variant) 후보 만들기(10-20 2단계 플로우).
//   안 = 편집 프리셋(core/editlayout.js PRESETS + textTone)의 조합. 새 디자인을 지어내지 않는다.
//   후보를 순서대로 실제 렌더해(renderArtifact) 추적(trace)으로 거른다: ① 프리셋이 통째로 무시되면(edit.ignored 의 `키(사유)` — 「textAlign(규정 매체)」「kvSize(매체 칸·지면 전체)」)
//   ② 위치 프리셋이 안 서면(edit.place.ok false — 「매체 템플릿이 그림 칸을 정함」「투명 배경 규격」) ③ 겹침 교정 실패(overlapFix.fail) ④ 결과 그림이 이미 있는 안과 같으면(hash, trace 제외) 버린다.
//   `textAlign.kv(…)`·`textAlign.logo(…)` 같은 「키.부분(사유)」는 틀 칸 메모(글자는 정렬됐고 그림·로고 칸만 제자리) — 부분 적용이라 버리지 않는다(그림이 같으면 ④가 거른다).
//   ⑤(11-05) 기본안보다 못한 프리셋 안: 기본안엔 없던 글자-그림 겹침 교정이 필요하거나, 기본안엔 있던 키비주얼이 빠지면 버린다.
//   첫 안은 늘 기본안(빈 style) — 지금 시스템이 내는 그림이라 거르지 않는다(겹침 실패여도 검수가 그대로 보고). 규정 매체(fonts.required)는 기본안 하나.
import { renderArtifact } from './contract.js';
import { adSpecEntries } from './adspecs.js';
import { CANON } from './canon.js';
import { familyById, familiesFor, familyStyle, frameFor, recipeEligible } from './recipes.js';
import { shapeOf } from './layouts.js';
import { contrast } from './palette.js';
import { fingerprintOf, nearDuplicate } from './typoaudit.js';

export const CANDIDATE_ORDER = [
  {}, { kvPlace: 'left' }, { kvPlace: 'bottom' }, { textAlign: 'center' }, { kvPlace: 'bg' }, { kvSize: 'lg' }, { bgFill: 'brand' },
  { kvPlace: 'left', textAlign: 'center' }, { kvPlace: 'bottom', textAlign: 'center' }, { textAlign: 'right' }, { kvSize: 'sm' }, { textTone: 'light' }, { textTone: 'dark' }, { bgFill: 'brand', textAlign: 'center' },
];
const KV_KEYS = new Set(['kvPlace', 'kvSize']);
const traceOf = html => { const m = html?.match?.(/data-trace="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch { return null; } };
// 그림 지문: 추적(data-trace — 프리셋을 적기만 해도 달라진다)·그림 바이트(data:)·그림 참조(blob:, core/assetref.js 11-09)는 빼고 잰다 — 참조로 그려도 data URL 로 그린 것과 지문이 같다
export const htmlHash = html => { const s = String(html ?? '').replace(/data-trace="[^"]*"/g, '').replace(/data:[^'")]+/g, '').replace(/blob:[^'")]+/g, ''); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
export function variantCountFor(spec) {
  const V = CANON.variants ?? { regulated: 1, default: 3, free: 5 };
  if (!spec) return V.default;
  if (spec.mediumRules?.fonts?.required) return V.regulated;
  if (spec.grade === 'B') return V.regulated;   // 로고·비주얼만 파일 규격(등급 B)은 글자·배치가 없어 안이 뜻이 없다(10-20 ZIP 확인: 네이버 네이티브에 3안이 생김)
  if (spec.grade === 'C') return V.free;
  return V.default;
}
const labelOf = (st, spec0 = null) => { if (!Object.keys(st).length) return '기본안'; if (st.tpl) { const f = familyById(st.tpl); return (spec0 && f && frameFor(f, spec0)?.name) || f?.name || '시안'; } const L = { kvPlace: { left: '키비주얼 왼쪽', bottom: '키비주얼 아래', bg: '전체 배경', right: '키비주얼 오른쪽' }, textAlign: { center: '가운데 정렬', right: '오른쪽 정렬', left: '왼쪽 정렬' }, kvSize: { lg: '키비주얼 크게', sm: '키비주얼 작게' }, bgFill: { brand: '브랜드색 지면', kv: '키비주얼색 지면', light: '밝은 지면' }, bgGrad: { none: '단색 지면', d: '대각 그라데이션', v: '세로 그라데이션', h: '가로 그라데이션', auto: '자동 그라데이션' }, textAnchor: { center: '글자 세로 가운데', bottom: '글자 아래', top: '글자 위' }, infoTag: { date: '일정 태그', label: '라벨 태그', both: '일정 태그' }, textTone: { light: '흰 글자', dark: '검은 글자' } }; return Object.entries(st).map(([k, v]) => L[k]?.[v]).filter(Boolean).join(' · ') || '다른 배치'; };   // 11-10: 이름 없는 값은 내부 키(「bgGrad none」)를 내보내지 않는다
// 안 축(11-06 사용자 「타이포 강조형·뱃지형·레이아웃·배경색이 달라야 후보」): 후보끼리 네 축 중 하나 이상 달라야 한다. 라벨도 이 축으로 적는다.
const TYPO_EMPH = new Set(['weight', 'big', 'color']);
const INFO_OF = { datebadge: '일정 뱃지', labelbadge: '라벨 뱃지', label: '라벨' };
const LAYOUT_OF = { right: '우측 비주얼', left: '좌측 비주얼', bottom: '하단 비주얼', top: '상단 비주얼', full: '전면 비주얼', bg: '전체 배경', center: '가운데 배치', object: '오브젝트', cover: '전면 비주얼', band: '띠', none: '글자만' };
const fieldSourceOf = html => (String(html ?? '').match(/data-field-source="([^"]*)"/)?.[1] ?? '');
// 지면 톤은 실제로 그려진 지면색(trace.field.stops 첫 색의 밝기)으로 — 틀 원본이 밝아도 브랜드색 지면이면 어두움(11-06 시트에서 라벨 어긋남)
const lumOf = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim()); if (!m) return null; const n = parseInt(m[1], 16), f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
const renderedTone = (tr, html, fallbackDark) => { const L = lumOf(tr?.field?.stops?.[0]); if (L != null) return L < 0.3 ? '어두움' : '밝음'; const src = fieldSourceOf(html); if (src) return /dark|photo-full|kv-full|kv-texture|kv-frame/.test(src) ? '어두움' : '밝음'; return fallbackDark ? '어두움' : '밝음'; };
export function axesOf(cand, tr, spec, html = '') {
  if (cand?.tpl) {
    const f = familyById(cand.tpl), fr = f && spec ? frameFor(f, spec) : null;
    return { typo: TYPO_EMPH.has(f?.typo) ? '강조' : '기본', info: INFO_OF[f?.typo] ?? '글줄', layout: fr?.visual ?? f?.visual ?? 'auto', tone: renderedTone(tr, html, fr?.bgDark ?? f?.bgDark) };
  }
  const tone = cand?.bgFill === 'brand' ? '브랜드색' : cand?.textTone === 'light' ? '어두움' : cand?.textTone === 'dark' ? '밝음' : renderedTone(tr, html, false);
  const layout = cand?.kvPlace ?? tr?.place?.mode ?? (cand?.textAlign ? `정렬 ${cand.textAlign}` : 'auto');
  return { typo: '기본', info: '글줄', layout: `${layout}${cand?.textAlign ? `/${cand.textAlign}` : ''}${cand?.kvSize ? `/${cand.kvSize}` : ''}`, tone };
}
export const axesKey = ax => `${ax.typo}|${ax.info}|${ax.layout}|${ax.tone}`;
export const axesLabel = ax => `${ax.typo === '강조' ? '타이포 강조' : '기본 타이포'} · ${ax.info} · ${LAYOUT_OF[ax.layout] ?? ax.layout} · ${ax.tone} 지면`;
export const MIN_VARIANTS = 4;   // 기본안 + 추가 3안(11-09 사용자 「소재마다 최소 3개의 추가 시안」). 규정 매체(1안)는 예외
// 틀 후보 순서: 이미 고른 안들과 다른 축 수가 가장 많은 것부터(렌더 전에 가족 메타만으로 — 비용 0). 같으면 원래 순서(합격 점수)
const axesDiff = (a, b) => ['typo', 'info', 'layout', 'tone'].filter(k => a[k] !== b[k]).length;
export function spreadByAxes(styles, spec) {
  const pool = styles.map((st, i) => ({ st, i, ax: axesOf(st, null, spec) })); const out = [];
  while (pool.length) {
    let best = 0, bestScore = -1;
    pool.forEach((p, j) => { const score = out.length ? Math.min(...out.map(o => axesDiff(o.ax, p.ax))) * 10 + Math.max(0, 7 - p.i) : 100 - p.i; if (score > bestScore) { bestScore = score; best = j; } });
    out.push(pool.splice(best, 1)[0]);
  }
  return out.map(p => p.st);
}   // 안 최소 수(11-06 사용자 「무조건 후보는 3개」). 규정 매체(1안)는 예외
// 겹침 교정이 실제로 글자·그림을 줄였나(data-overlap="처음>끝:단계") — 처음 겹침이 문턱을 넘었다는 뜻
export const overlapFixed = html => /data-overlap="\d+>\d+:/.test(String(html ?? ''));
// 키비주얼이 그려졌나 — 그림 원본 주소(data: 앞부분)가 결과에 있는지. 캐치 메인 라지 틀에서 「키비주얼 왼쪽」이 그림 없이 서던 것(11-05)
export const kvDrawn = (html, style) => { const u = String(style?.keyVisual ?? ''); return !!u && String(html ?? '').includes(u.slice(0, 160)); };
// 프리셋 안 품질 거름(11-05): 기본안은 교정 없이 섰는데 이 안은 교정이 필요했으면 뺀다. 기본안도 교정했으면 비교 기준이 없어 남긴다
export const presetWorse = (html, baseFixed) => baseFixed === false && overlapFixed(html);
// ── 유형 고정 3슬롯(11-09 사용자 「소재마다 최소 3개의 추가 시안 — ① 정렬에 따른 비주얼 위치 ② 일정 태그 강조 ③ 컬러 반전 밝은 지면」, docs/variant-types-1109.md · docs/layout-variants.md) ──
//   기본안 다음에 A·B·C 를 하나씩 「의도적으로」 만든다. 슬롯마다 「기본안 style + 슬롯 프리셋」 후보를 순서대로 렌더해 거르기(위 ①~⑤ + 정렬-비주얼 짝 + 대비)를 통과한 첫 것.
//   시안 틀 규격(recipeEligible)은 프리셋 후보 뒤에 그 슬롯 뜻에 맞는 틀(axesOf — layout/info/tone 축이 기본안과 다른 것)을 더 본다.
//   슬롯이 실패하면(③ 어두운 사진 등) 사유를 trace 에 남기고 ①의 다른 변형 · ②의 다른 태그 구성 → 기존 시안 틀·프리셋 후보 순으로 채운다(최소 MIN_VARIANTS).
export const SLOTS = [
  { id: 'A', key: 'align', label: '정렬·비주얼 바꿈' },
  { id: 'B', key: 'tag', label: '일정 태그 강조' },
  { id: 'C', key: 'light', label: '밝은 지면' },
];
const SLOT_OF = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const ALIGN_KO = { left: '왼쪽', center: '가운데', right: '오른쪽' };
const MOLD_MODES = new Set(['mold', 'template']);
const FULL_MODES = new Set(['full', 'bg-room', 'bg-texture', 'bg-frame']);
// 부제 — 무엇이 바뀌었나(앱 「레이아웃 안」 썸네일 아래 한 줄). style 만으로 정해진다(저장된 안 style 에서 다시 만든다)
export function variantSubOf(st, spec = null) {
  if (!st || !Object.keys(st).length) return '';
  if (st.tpl) { const f = familyById(st.tpl); return `시안 「${(spec && f && frameFor(f, spec)?.name) || f?.name || st.tpl}」`; }
  const out = [];
  if (st.textAlign) out.push(`${ALIGN_KO[st.textAlign] ?? st.textAlign} 정렬`);
  if (st.kvPlace) out.push({ bottom: st.textAlign ? '비주얼 아래 칸' : '비주얼 아래', bg: '전면 비주얼(녹임)', right: '비주얼 칸형(오른쪽)', left: '좌우 거울(비주얼 왼쪽)' }[st.kvPlace] ?? st.kvPlace);
  else if (st.textAlign === 'right') out.push('비주얼 왼쪽으로');
  if (st.infoTag) out.push({ date: '날짜 알약', label: '라벨 각진 태그', both: '라벨 태그 + 날짜 알약' }[st.infoTag] ?? st.infoTag);
  if (st.tagShape) out.push(st.tagShape === 'square' ? '각진 모양' : '알약 모양');
  if (st.bgFill) out.push({ light: '흰·옅은 지면 + 브랜드 딥 글자', brand: '브랜드색 지면', kv: '키비주얼 배경색' }[st.bgFill] ?? st.bgFill);
  if (st.textTone) out.push(st.textTone === 'light' ? '흰 글자' : '어두운 글자');
  if (st.kvSize) out.push(st.kvSize === 'lg' ? '비주얼 크게' : '비주얼 작게');
  return out.join(' · ');
}
// 정렬-비주얼 짝(11-09 사용자 피드백 「가운데 정렬 안이 글자만 가운데로 옮기고 키비주얼은 오른쪽 칸 그대로 → 금지」):
//   글자 정렬을 바꾼 안은 비주얼도 그 정렬에 맞아야 한다 — 가운데 = 아래 칸(폭 80%↑)·전면, 오른쪽 = 비주얼이 왼쪽(또는 아래 칸·전면), 왼쪽 = 비주얼이 오른쪽(또는 아래 칸·전면).
//   못 따라가면 { ok:false, why } — 안에서 거른다
export function alignFollows(cand, tr, spec) {
  const a = cand?.textAlign; if (!a || !tr || !spec) return { ok: true };
  const P = tr.place ?? {}, mode = P.mode ?? 'none';
  if (mode === 'none' || FULL_MODES.has(mode) || !tr.gate?.hasKv) return { ok: true };
  const W = spec.w, H = spec.h;
  let r = P.tImage && Number.isFinite(P.tImage.x) ? P.tImage : P.bleed && Number.isFinite(P.bleed.left) ? { x: P.bleed.left, y: P.bleed.top, w: W - P.bleed.left, h: H - P.bleed.top } : null;
  if (!r) {
    if (P.objectSide === 'bottom') r = { x: 0, y: H * 0.6, w: W, h: H * 0.4 };
    else if (P.objectSide === 'right') { const ow = P.objW ?? W * 0.4; r = { x: W - ow, y: 0, w: ow, h: H }; }
    else return { ok: true };
    if (tr.edit?.mirror && P.objectSide === 'right') r = { ...r, x: W - r.x - r.w };
  }
  const vis = { x: Math.max(0, r.x), w: Math.min(W, r.x + r.w) - Math.max(0, r.x) };
  const band = vis.w >= W * 0.8 && r.y >= H * 0.25;
  const cx = (vis.x + vis.w / 2) / W;
  if (band) return { ok: true };
  if (a === 'center') return { ok: false, why: `가운데 정렬인데 비주얼이 ${cx >= 0.5 ? '오른쪽' : '왼쪽'} 칸에 남음` };
  if (a === 'right' && cx >= 0.5) return { ok: false, why: '오른쪽 정렬인데 비주얼이 오른쪽 칸에 남음' };
  if (a === 'left' && cx < 0.5) return { ok: false, why: '왼쪽 정렬인데 비주얼이 왼쪽 칸에 남음' };
  return { ok: true };
}
// 로고 칸이 매체 안전영역(숫자) 밖이면 — 틀 로고 칸 거울(오른쪽 정렬)·시안 틀 로고 자리가 안전영역을 벗어난 안(11-09 전수: 에브리타임 커뮤니티보드·네이버 1250 safe-area:logo)
export function logoInSafe(tr, spec, html = '') {
  const sa = spec?.rules?.safeArea; if (!sa || !['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number')) return true;
  // 로고 칸: 틀 로고 칸(tplRect) · 시안 틀 로고(tpl.logo — 실제 그림이 칸 끝까지 차므로 2px 안쪽을 요구) · 로고가 오브젝트인 칸(data-object="logo" — 그림은 칸 가운데 세로 56%)
  const z = /<div data-object="logo" style="position:absolute;left:(-?[\d.]+)px;top:(-?[\d.]+)px;width:([\d.]+)px;height:([\d.]+)px/.exec(String(html ?? ''));
  const r = z ? { x: +z[1] + +z[3] * 0.17, y: +z[2] + +z[4] * 0.22, w: +z[3] * 0.66, h: +z[4] * 0.56 } : tr?.tpl?.logo ?? tr?.logo?.tplRect ?? null; if (!r || !Number.isFinite(r.x)) return true;
  const lg = typeof sa.logoInset === 'number' ? sa.logoInset : null, tol = tr?.tpl?.logo && !z ? -2 : 2.5;
  const B = lg != null ? { x0: lg, y0: lg, x1: spec.w - lg, y1: spec.h - lg } : { x0: sa.left ?? 0, y0: sa.top ?? 0, x1: spec.w - (sa.right ?? 0), y1: spec.h - (sa.bottom ?? 0) };
  return r.x >= B.x0 - tol && r.y >= B.y0 - tol && r.x + r.w <= B.x1 + tol && r.y + r.h <= B.y1 + tol;
}
// 메인 글자 대비(trace.text.mainFg vs 지면 정지점) — hex 가 아니면 못 잰다(통과)
const minMainContrast = tr => { const fg = tr?.text?.mainFg, st = tr?.field?.stops ?? []; if (!/^#[0-9a-f]{6}$/i.test(fg ?? '') || !st.length) return null; return Math.min(...st.filter(x => /^#[0-9a-f]{6}$/i.test(x)).map(x => contrast(x, fg))); };
// 슬롯 프리셋 후보 — 기본안 trace(정렬·배치·지면)에 따라. { st, sub }
export function slotPresets(slotId, spec, baseTr, style, ctx = null) {
  const shape = shapeOf(spec.w, spec.h), hasKv = !!style?.keyVisual && !!baseTr?.gate?.hasKv;
  const ba = baseTr?.place?.zone?.align ?? 'left', mode = baseTr?.place?.mode ?? 'none', mold = MOLD_MODES.has(mode) || !!baseTr?.gate?.template;
  const cut = (style?.kvMeta?.field?.opaque ?? 1) < 0.5;
  const C = [];
  if (slotId === 'A') {
    if (shape === 'strip') return [];
    if (!hasKv) { for (const a of ['center', 'left', 'right']) if (a !== ba) C.push({ textAlign: a }); }
    else if (shape === 'tall' || shape === 'tower') {   // 결정 2: 세로형은 정렬을 바꿔도 비주얼 아래 칸 유지
      const alt = ba === 'center' ? 'left' : 'center';
      if (!mold) C.push({ textAlign: alt, kvPlace: 'bottom' });
      C.push({ textAlign: alt });
    } else if (shape === 'wide') {   // 결정 2: 가로형 ① = 비주얼 칸형 ↔ 전면 녹임 또는 좌우 거울(기본안과 다른 쪽)
      if (mold) C.push({ textAlign: 'right' });
      else if (FULL_MODES.has(mode)) C.push({ kvPlace: 'right' }, { kvPlace: 'left' });
      else { if (!cut) C.push({ kvPlace: 'bg' }); C.push({ kvPlace: 'left' }, { textAlign: 'right' }); }
    } else {   // 정사각·가로 살짝(580×400·1080·300×250)
      if (mold) { if (ba === 'center') C.push({ textAlign: 'left' }, { textAlign: 'right' }); else C.push({ textAlign: 'center' }, { textAlign: ba === 'right' ? 'left' : 'right' }); }   // 가운데 틀 → 왼쪽(시안 B·C 세트), 왼쪽 틀 → 가운데(누끼 가운데·이미지 가득) → 거울
      else if (ba === 'center') C.push({ textAlign: 'left', kvPlace: 'right' }, { kvPlace: 'left' });
      else { C.push({ textAlign: 'center', kvPlace: 'bottom' }, { kvPlace: 'left' }); if (!cut) C.push({ kvPlace: 'bg' }); C.push({ textAlign: 'center' }); }
    }
  } else if (slotId === 'B') {
    // R2(11-09 총괄 「B 가 기본안과 차이가 약함 — 날짜 알약 하나만」): 브리프에 직무·라벨 정보가 있으면 라벨 각진 태그 + 날짜 알약(both)을 먼저 — 피그마 ② 묶음 A·H(라벨 태그 + 값), C·D(날짜 알약)
    const core = ctx?.core ?? {}, hasLabel = !!(core.role || core.employType || (Array.isArray(core.label) ? core.label.length : core.label));
    if (hasLabel) C.push({ infoTag: 'both' }, { infoTag: 'date' }, { infoTag: 'label' }, { infoTag: 'date', tagShape: 'square' });
    else C.push({ infoTag: 'date' }, { infoTag: 'both' }, { infoTag: 'label' }, { infoTag: 'date', tagShape: 'square' });
  }
  else if (slotId === 'C') {
    const L = lumOf(baseTr?.field?.stops?.[0]);
    if (L != null && L >= 0.6 && !/^manual/.test(baseTr?.field?.source ?? '')) C.push({ bgFill: 'brand' });   // 기본안이 이미 밝은 지면이면 반전 = 브랜드색 지면
    else C.push({ bgFill: 'light' });
  }
  return C.map(st => ({ st, sub: variantSubOf(st, spec) }));
}
// opts 는 renderArtifact 로 그대로(purpose·size…). opts.stats = {} 를 주면 { rendered, tried, slots } 를 채운다(인스펙터·로그·전수용)
//   opts.accept(html, rec) → false 면 그 후보를 버린다(브라우저에서 lint 를 돌릴 수 있는 호출자용 — 동기)
export function variantCandidates(specId, ctx, style, opts = {}) {
  const { stats, accept, ...ropts } = opts;
  const spec = adSpecEntries()[specId]; if (!spec) return [];
  const want = variantCountFor(spec); const V = CANON.variants ?? {};
  const maxRender = V.maxRender ?? 28;
  const out = []; const seen = new Set(); let rendered = 0; const hasKv = !!style?.keyVisual; let baseFixed = null, baseKv = null, baseTr = null, baseMc = null, baseMain = null;
  const slotLog = [];   // 슬롯마다 { slot, ok, style?, tried, why[] }
  // 후보 하나 렌더 + 거르기 → rec 또는 { why }
  const tryCand = (cand, meta = {}) => {
    if (rendered >= maxRender) return { why: '렌더 상한' };
    if (!hasKv && Object.keys(cand).some(k => KV_KEYS.has(k))) return { why: '키비주얼 없음' };
    const st = { ...style, ...cand };
    let html; try { html = renderArtifact(specId, ctx, st, ropts); rendered++; } catch (e) { return { why: '렌더 실패' }; }
    const tr = traceOf(html); if (!tr) return { why: 'trace 없음' };
    const keys = Object.keys(cand);
    const mainTag = String(html).match(/<div data-field="main"[^>]*>/)?.[0]?.replace(/ data-[a-z-]+="[^"]*"/g, '') ?? null;
    if (!keys.length) { baseFixed = overlapFixed(html); baseKv = kvDrawn(html, style); baseTr = tr; baseMc = minMainContrast(tr); baseMain = mainTag; }
    if (cand.tpl && (!/data-field="main"/.test(html) || (tr.tpl?.overlap ?? 0) >= 0.05 || tr.tpl?.unfit)) return { why: '시안 틀이 이 그림에 안 맞음' };
    if (keys.length) {
      const ignored = (tr.edit?.ignored ?? []).filter(Boolean).map(String);
      const ig = ignored.find(x => keys.some(k => x.startsWith(k + '('))); if (ig) return { why: `무시됨 ${ig}` };
      if (cand.kvPlace && tr.edit?.place && tr.edit.place.ok === false) return { why: `위치 안 섬(${tr.edit.place.why ?? ''})` };
      if (tr.rules?.includes('overlapFix.fail')) return { why: '겹침 교정 실패' };
      if (!cand.tpl && presetWorse(html, baseFixed)) return { why: '기본안보다 못함(겹침 교정)' };
      if (!cand.tpl && (baseKv || keys.some(k => KV_KEYS.has(k))) && !kvDrawn(html, style)) return { why: '키비주얼 빠짐' };
      const af = alignFollows(cand, tr, spec); if (!af.ok) return { why: af.why };
      if (!logoInSafe(tr, spec, html)) return { why: '로고가 안전영역 밖' };
      const mc = minMainContrast(tr), need = cand.bgFill === 'light' ? 7 : Math.min(3, (baseMc ?? 3) - 0.05);   // 기본안부터 대비가 낮은 질감 지면(그라데이션 2.3)은 기본안보다 나빠질 때만
      if (mc != null && mc < need) return { why: `메인 대비 ${Math.round(mc * 10) / 10}` };
      if (cand.infoTag && !(tr.tags ?? []).length) return { why: '태그 붙일 정보 없음' };
      // R2(11-09 전수 jobda-main-mo 몰락스 both → overflow:main): 태그만 바꾸는 안이 메인 칸(폭·크기)까지 바꾸면 거른다
      if (cand.infoTag && Object.keys(cand).every(k => k === 'infoTag' || k === 'tagShape') && baseMain && mainTag && mainTag !== baseMain) return { why: '태그가 메인 칸을 바꿈' };
      if ((tr.tags ?? []).some(t => t.contrast < 4.5)) return { why: '태그 글자 대비 4.5 미만' };
      // R2(11-09): 가운데 정렬 전면 이미지 스크림이 0.9 로도 흰 글자 4.5:1 을 못 보장(렌더러 centerScrim.short) → 다른 A 변형으로
      if (tr.scrim?.center?.short) return { why: `가운데 전면 스크림 부족(필요 ${tr.scrim.center.need ?? '>0.95'} · 복잡도 ${tr.scrim.center.busy})` };
      // R2: 밝은 지면에서 로고가 안 보임 — 칠할 수 없는 타일 로고가 지면과 3:1 미만(렌더러 logo.light.low)
      if (cand.bgFill === 'light' && tr.logo?.light?.low) return { why: `밝은 지면 로고 대비 부족(타일 로고 ${tr.logo.light.min}:1)` };
      // R2: 「지면 반전」(bgFill brand)인데 지면이 기본안과 거의 같다(KG 브랜드 #F1F1F1 — 반전이 안 보임)
      if (cand.bgFill === 'brand' && !cand.tpl && meta.slot === 'C') { const a = lumOf(tr.field?.stops?.[0]), b = lumOf(baseTr?.field?.stops?.[0]); if (a != null && b != null && Math.abs(a - b) < 0.2) return { why: `지면 반전이 기본안과 비슷(밝기 ${Math.round(b * 100) / 100}→${Math.round(a * 100) / 100})` }; }
    }
    const hash = htmlHash(html); if (seen.has(hash)) return { why: '기본안·다른 안과 같은 그림' };
    const ax = axesOf(cand, tr, spec, html);
    const rec = { id: out.length, slot: meta.slot ?? null, label: meta.label ?? (!keys.length ? '기본안' : cand.tpl ? axesLabel(ax) : labelOf(cand, spec)), sub: meta.sub ?? variantSubOf(cand, spec), style: cand, hash, axes: ax, trace: { rules: tr.rules ?? [], edit: tr.edit ?? null, place: tr.place ? { mode: tr.place.mode, objectSide: tr.place.objectSide } : null, ...(meta.substitute ? { substitute: meta.substitute } : {}), ...(tr.text?.light ? { light: tr.text.light } : {}) } };
    if (accept && keys.length && accept(html, rec) === false) return { why: '호출자 검사(lint) 탈락' };
    seen.add(hash);
    return { rec, html };
  };
  const push = rec => { rec.id = out.length; out.push(rec); };
  const base = tryCand({}); if (base.rec) push(base.rec);
  if (want === 1 || !out.length) { if (stats) { stats.rendered = rendered; stats.tried = rendered; stats.slots = []; } return out; }
  const target = Math.max(want, MIN_VARIANTS);
  const recipe = recipeEligible(spec) ? familiesFor(spec, style?.kvMeta, hasKv, ctx?.core?.client ?? '') : [];
  const baseAx = out[0].axes;
  const used = new Set(['{}']);
  const keyOf = st => JSON.stringify(st);
  // 슬롯에 맞는 시안 틀(렌더 뒤 축으로 판정): A = 레이아웃 축이 다름 · B = 정보 축이 뱃지/라벨 · C = 지면 톤이 다름
  const tplFits = (slotId, ax) => slotId === 'A' ? ax.layout !== baseAx.layout : slotId === 'B' ? ax.info !== '글줄' : ax.tone !== baseAx.tone;
  const runSlot = (slotId, presets, { substituteFor = null } = {}) => {
    const S = SLOT_OF[slotId], log = { slot: slotId, ok: false, why: [], tried: 0 };
    for (const { st, sub } of presets) {
      if (used.has(keyOf(st))) continue; used.add(keyOf(st)); log.tried++;
      const r = tryCand(st, { slot: slotId, label: st.bgFill === 'brand' ? '지면 반전' : S.label, sub, substitute: substituteFor });
      if (r.rec) { push(r.rec); log.ok = true; log.style = st; return log; }
      log.why.push(`${keyOf(st)}: ${r.why}`);
      if (/^지면 반전이 기본안과 비슷/.test(r.why ?? '')) used.delete(keyOf(st));   // 「반전」이라 부르진 않지만 채움 후보(브랜드색 지면)로는 다시 쓸 수 있게(네이버 1250 KG — 3안 보장)
    }
    for (const f of recipe) {
      const st = familyStyle(f); if (used.has(keyOf(st))) continue;
      const fr = frameFor(f, spec); const pre = axesOf(st, null, spec);
      if (slotId === 'B' && pre.info === '글줄') continue;
      if (slotId === 'A' && (fr?.visual ?? f.visual) === (baseTr?.place?.imgCol ?? null)) continue;
      used.add(keyOf(st)); log.tried++;
      const r = tryCand(st, { slot: slotId, label: S.label, sub: variantSubOf(st, spec), substitute: substituteFor });
      if (r.rec && tplFits(slotId, r.rec.axes)) { push(r.rec); log.ok = true; log.style = st; return log; }
      if (r.rec) { seen.delete(r.rec.hash); used.delete(keyOf(st)); }   // 슬롯 뜻엔 안 맞음 — 채우기에서 다시 쓸 수 있게
      log.why.push(`${st.tpl}: ${r.why ?? '슬롯 축이 기본안과 같음'}`);
    }
    return log;
  };
  const failed = [];
  for (const S of SLOTS) {
    // ③ 밝은 지면의 사진 톤 검수(결정 4)는 렌더러(core/field.js lightFieldOf)가 한다 — 이음 쪽 밝기 < 0.55·대비 미달이면 edit.ignored 「bgFill(밝은 지면 — 사유)」로 거르고 사유가 슬롯 기록에 남는다
    const log = runSlot(S.id, slotPresets(S.id, spec, baseTr, style, ctx));
    slotLog.push(log); if (!log.ok) failed.push(log);
  }
  // 대체(결정 4): 실패한 슬롯 자리는 ①의 다른 변형 → ②의 다른 태그 구성 → 시안 틀·기존 프리셋 후보
  if (out.length < target) {
    const more = [...slotPresets('A', spec, baseTr, style, ctx).map(x => ({ ...x, slot: 'A' })), ...slotPresets('B', spec, baseTr, style, ctx).map(x => ({ ...x, slot: 'B' })), { st: { infoTag: 'both', tagShape: 'pill' }, slot: 'B' }, { st: { infoTag: 'label', tagShape: 'pill' }, slot: 'B' }];
    for (const m of more) {
      if (out.length >= target) break;
      if (used.has(keyOf(m.st))) continue; used.add(keyOf(m.st));
      const r = tryCand(m.st, { slot: m.slot, label: SLOT_OF[m.slot].label, sub: variantSubOf(m.st, spec), substitute: failed.map(f => `${f.slot}: ${f.why.slice(-1)[0] ?? '후보 없음'}`).join(' / ') || null });
      if (r.rec) push(r.rec);
    }
  }
  if (out.length < target) {
    const order = [...spreadByAxes(recipe.slice(0, 8).map(familyStyle), spec), ...CANDIDATE_ORDER.slice(1), { bgFill: 'brand', infoTag: 'date' }, { textAnchor: 'center' }, { textAnchor: 'bottom' }, { bgGrad: 'd' }, { bgGrad: 'none' }, { bgFill: 'kv' }, { bgFill: 'brand', textAlign: 'right' }, { bgFill: 'brand', textAnchor: 'center' }];   // 마지막 채움(11-09 전수: 질감 그림·날짜 없는 작은 규격에서 3안 미만 51건)
    for (const cand of order) {
      if (out.length >= target) break;
      if (used.has(keyOf(cand))) continue; used.add(keyOf(cand));
      const r = tryCand(cand); if (r.rec) push(r.rec);
    }
  }
  if (stats) { stats.rendered = rendered; stats.tried = rendered; stats.slots = slotLog; }
  return out;
}

// 이 규격·키비주얼에 쓸 수 있는 시안 전부 — 사용자가 고르는 목록. 글자가 주인공에 얹히거나 규정을 못 지키는 시안은 뺀다
export function templateChoices(specId, ctx, style, ropts = {}, { countOnly = false } = {}) {
  const spec = adSpecEntries()[specId]; if (!spec) return countOnly ? 0 : [];
  const list = familiesFor(spec, style?.kvMeta, !!style?.keyVisual, ctx?.core?.client);
  if (countOnly) return list.length;
  const out = [], fps = [], axesSeen = new Set();
  for (const f of list) {
    const st = familyStyle(f); let html; try { html = renderArtifact(specId, ctx, { ...style, ...st }, ropts); } catch { continue; }
    const tr = traceOf(html); if (!tr?.tpl || tr.tpl.unfit || (tr.tpl.overlap ?? 0) >= 0.05) continue;
    // 거의 같은 안(글자 상자 몇 px 차이)은 앞의 것만 — 11-03 모달에 「일정 뱃지형」 3개가 사실상 같은 그림으로 떴다. 「n개」는 남은 수
    const fp = fingerprintOf(tr, spec.w, spec.h); if (fp && fps.some(x => nearDuplicate(x, fp))) continue; if (fp) fps.push(fp);
    const ax = axesOf(st, tr, spec, html), akey = axesKey(ax);   // 네 축(타이포 강조·정보 블록·레이아웃·지면 톤)이 전부 같은 시안은 하나만(11-06 「차이도 기준도 애매」)
    if (axesSeen.has(akey)) continue; axesSeen.add(akey);
    out.push({ label: axesLabel(ax), sub: frameFor(f, spec)?.name ?? f.name, style: st, html, axes: ax });
  }
  return out;
}
