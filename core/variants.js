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
import { familyById, familiesFor, familyStyle, frameFor, recipeStyles } from './recipes.js';
import { fingerprintOf, nearDuplicate } from './typoaudit.js';

export const CANDIDATE_ORDER = [
  {}, { kvPlace: 'left' }, { kvPlace: 'bottom' }, { textAlign: 'center' }, { kvPlace: 'bg' }, { kvSize: 'lg' }, { bgFill: 'brand' },
  { kvPlace: 'left', textAlign: 'center' }, { kvPlace: 'bottom', textAlign: 'center' }, { textAlign: 'right' }, { kvSize: 'sm' }, { textTone: 'light' }, { textTone: 'dark' }, { bgFill: 'brand', textAlign: 'center' },
];
const KV_KEYS = new Set(['kvPlace', 'kvSize']);
const traceOf = html => { const m = html?.match?.(/data-trace="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch { return null; } };
// 그림 지문: 추적(data-trace — 프리셋을 적기만 해도 달라진다)·그림 바이트(data:)는 빼고 잰다
export const htmlHash = html => { const s = String(html ?? '').replace(/data-trace="[^"]*"/g, '').replace(/data:[^'")]+/g, ''); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
export function variantCountFor(spec) {
  const V = CANON.variants ?? { regulated: 1, default: 3, free: 5 };
  if (!spec) return V.default;
  if (spec.mediumRules?.fonts?.required) return V.regulated;
  if (spec.grade === 'B') return V.regulated;   // 로고·비주얼만 파일 규격(등급 B)은 글자·배치가 없어 안이 뜻이 없다(10-20 ZIP 확인: 네이버 네이티브에 3안이 생김)
  if (spec.grade === 'C') return V.free;
  return V.default;
}
const labelOf = (st, spec0 = null) => { if (!Object.keys(st).length) return '기본안'; if (st.tpl) { const f = familyById(st.tpl); return (spec0 && f && frameFor(f, spec0)?.name) || f?.name || '시안'; } const L = { kvPlace: { left: '키비주얼 왼쪽', bottom: '키비주얼 아래', bg: '전체 배경', right: '키비주얼 오른쪽' }, textAlign: { center: '가운데 정렬', right: '오른쪽 정렬', left: '왼쪽 정렬' }, kvSize: { lg: '키비주얼 크게', sm: '키비주얼 작게' }, bgFill: { brand: '브랜드색 지면' }, textTone: { light: '흰 글자', dark: '검은 글자' } }; return Object.entries(st).map(([k, v]) => L[k]?.[v] ?? `${k} ${v}`).join(' · '); };
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
export const MIN_VARIANTS = 3;
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
// opts 는 renderArtifact 로 그대로(purpose·size…). opts.stats = {} 를 주면 { rendered, tried } 를 채운다(인스펙터·로그용)
export function variantCandidates(specId, ctx, style, opts = {}) {
  const { stats, ...ropts } = opts;
  const spec = adSpecEntries()[specId]; if (!spec) return [];
  const want = variantCountFor(spec); const V = CANON.variants ?? {};
  const out = []; const seen = new Set(); const axesSeen = new Set(); const spare = [], spare2 = []; let rendered = 0; const hasKv = !!style?.keyVisual; let baseFixed = null, baseKv = null;
  // 첫 안은 기본안, 그다음 키비주얼 유형에 맞는 시안, 모자라면 기존 프리셋 후보(11-02)
  const order = [{}, ...spreadByAxes(recipeStyles(spec, style?.kvMeta, hasKv, ctx?.core?.client, 8), spec), ...CANDIDATE_ORDER.slice(1)];   // 틀 후보는 네 축이 서로 멀어지는 순(11-06)
  for (const cand of order) {
    if (out.length >= want || rendered >= (V.maxRender ?? 14)) break;
    if (!hasKv && Object.keys(cand).some(k => KV_KEYS.has(k))) continue;
    const st = { ...style, ...cand };
    let html; try { html = renderArtifact(specId, ctx, st, ropts); rendered++; } catch { continue; }
    const tr = traceOf(html); if (!tr) continue;
    const keys = Object.keys(cand);
    if (!keys.length) { baseFixed = overlapFixed(html); baseKv = kvDrawn(html, style); }
    if (cand.tpl && (!/data-field="main"/.test(html) || (tr.tpl?.overlap ?? 0) >= 0.05 || tr.tpl?.unfit)) continue;   // 글자 없는 규격 · 글자가 주인공 위에 얹히는 시안은 이 키비주얼에 안 맞는다
    if (keys.length) {   // 기본안은 거르지 않는다
      const ignored = (tr.edit?.ignored ?? []).filter(Boolean).map(String);
      if (keys.some(k => ignored.some(x => x.startsWith(k + '(')))) continue;                 // 통째로 무시 — 「키(사유)」만. 「키.부분(사유)」는 틀 칸 메모
      if (cand.kvPlace && tr.edit?.place && tr.edit.place.ok === false) continue;              // 위치가 안 서는 규격(틀·투명·얇은 띠) — 그림은 기본안과 같다
      if (tr.rules?.includes('overlapFix.fail')) continue;
      if (!cand.tpl && (presetWorse(html, baseFixed) || ((baseKv || keys.some(k => KV_KEYS.has(k))) && !kvDrawn(html, style)))) continue;   // 그림 자리·크기 안인데 그림이 없으면 이름과 다른 안   // 프리셋 안이 기본안에 없던 글자-그림 겹침을 만들어 글자·그림을 줄여야 했으면 기본안보다 못한 안(11-05 캐치 메인 라지 가운데 정렬)
    }
    const hash = htmlHash(html); if (seen.has(hash)) continue; seen.add(hash);
    const ax = axesOf(cand, tr, spec, html), akey = axesKey(ax);
    const rec = { id: out.length, label: cand.tpl ? axesLabel(ax) : labelOf(cand, spec), style: cand, hash, axes: ax, trace: { rules: tr.rules ?? [], edit: tr.edit ?? null, place: tr.place ? { mode: tr.place.mode, objectSide: tr.place.objectSide } : null } };
    if (keys.length) {   // 고른 안 모두와 두 축 이상 달라야 바로 들어간다. 한 축만 다르면 뒤로, 전부 같으면 맨 뒤(모자랄 때만 채움)
      const minDiff = Math.min(...out.map(o => axesDiff(o.axes, ax)));
      if (minDiff < 2) { (minDiff === 1 ? spare : spare2).push(rec); continue; }
    }
    axesSeen.add(akey); out.push(rec);
    if (want === 1) break;
  }
  // 최소 3안(11-06): 축이 겹치더라도 그림이 다른 안으로 채운다
  if (want > 1) for (const rec of [...spare, ...spare2]) { if (out.length >= Math.max(want, MIN_VARIANTS)) break; rec.id = out.length; out.push(rec); }
  if (stats) { stats.rendered = rendered; stats.tried = rendered; }
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
