// core/variants.js — 레이아웃 안(variant) 후보 만들기(10-20 2단계 플로우).
//   안 = 편집 프리셋(core/editlayout.js PRESETS + textTone)의 조합. 새 디자인을 지어내지 않는다.
//   후보를 순서대로 실제 렌더해(renderArtifact) 추적(trace)으로 거른다: ① 프리셋이 통째로 무시되면(edit.ignored 의 `키(사유)` — 「textAlign(규정 매체)」「kvSize(매체 칸·지면 전체)」)
//   ② 위치 프리셋이 안 서면(edit.place.ok false — 「매체 템플릿이 그림 칸을 정함」「투명 배경 규격」) ③ 겹침 교정 실패(overlapFix.fail) ④ 결과 그림이 이미 있는 안과 같으면(hash, trace 제외) 버린다.
//   `textAlign.kv(…)`·`textAlign.logo(…)` 같은 「키.부분(사유)」는 틀 칸 메모(글자는 정렬됐고 그림·로고 칸만 제자리) — 부분 적용이라 버리지 않는다(그림이 같으면 ④가 거른다).
//   첫 안은 늘 기본안(빈 style) — 지금 시스템이 내는 그림이라 거르지 않는다(겹침 실패여도 검수가 그대로 보고). 규정 매체(fonts.required)는 기본안 하나.
import { renderArtifact } from './contract.js';
import { adSpecEntries } from './adspecs.js';
import { CANON } from './canon.js';

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
const labelOf = st => { if (!Object.keys(st).length) return '기본안'; const L = { kvPlace: { left: '키비주얼 왼쪽', bottom: '키비주얼 아래', bg: '전체 배경', right: '키비주얼 오른쪽' }, textAlign: { center: '가운데 정렬', right: '오른쪽 정렬', left: '왼쪽 정렬' }, kvSize: { lg: '키비주얼 크게', sm: '키비주얼 작게' }, bgFill: { brand: '브랜드색 지면' }, textTone: { light: '흰 글자', dark: '검은 글자' } }; return Object.entries(st).map(([k, v]) => L[k]?.[v] ?? `${k} ${v}`).join(' · '); };
// opts 는 renderArtifact 로 그대로(purpose·size…). opts.stats = {} 를 주면 { rendered, tried } 를 채운다(인스펙터·로그용)
export function variantCandidates(specId, ctx, style, opts = {}) {
  const { stats, ...ropts } = opts;
  const spec = adSpecEntries()[specId]; if (!spec) return [];
  const want = variantCountFor(spec); const V = CANON.variants ?? {};
  const out = []; const seen = new Set(); let rendered = 0; const hasKv = !!style?.keyVisual;
  for (const cand of CANDIDATE_ORDER) {
    if (out.length >= want || rendered >= (V.maxRender ?? 14)) break;
    if (!hasKv && Object.keys(cand).some(k => KV_KEYS.has(k))) continue;
    const st = { ...style, ...cand };
    let html; try { html = renderArtifact(specId, ctx, st, ropts); rendered++; } catch { continue; }
    const tr = traceOf(html); if (!tr) continue;
    const keys = Object.keys(cand);
    if (keys.length) {   // 기본안은 거르지 않는다
      const ignored = (tr.edit?.ignored ?? []).filter(Boolean).map(String);
      if (keys.some(k => ignored.some(x => x.startsWith(k + '(')))) continue;                 // 통째로 무시 — 「키(사유)」만. 「키.부분(사유)」는 틀 칸 메모
      if (cand.kvPlace && tr.edit?.place && tr.edit.place.ok === false) continue;              // 위치가 안 서는 규격(틀·투명·얇은 띠) — 그림은 기본안과 같다
      if (tr.rules?.includes('overlapFix.fail')) continue;
    }
    const hash = htmlHash(html); if (seen.has(hash)) continue; seen.add(hash);
    out.push({ id: out.length, label: labelOf(cand), style: cand, hash, trace: { rules: tr.rules ?? [], edit: tr.edit ?? null, place: tr.place ? { mode: tr.place.mode, objectSide: tr.place.objectSide } : null } });
    if (want === 1) break;
  }
  if (stats) { stats.rendered = rendered; stats.tried = rendered; }
  return out;
}
