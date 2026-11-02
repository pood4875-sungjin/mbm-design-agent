// core/recipes.js — 시안 틀 고르기(11-02 「홍보사업셀」 시안 탑재, docs/design-recipes-2026-11-02.md).
//   시안 = 피그마 실제 소재에서 옮긴 칸·타이포·뱃지 구조. 배경 비주얼은 만들지 않고 타이포(굵기·글꼴·크기·색)·뱃지·배치로 느낌을 낸다.
//   규정 매체·틀에 가까운 매체·얇은 띠·오브젝트 칸 규격에는 쓰지 않는다 — 그 규격은 지금처럼 규정대로 1안.
import { kvTypeOf } from './kvtypes.js';
import { TEMPLATE_FAMILIES } from './templates-data.js';
import { TEMPLATE_PASS } from './templates-quality.js';

const MIN_H = 240;
const NO_RECIPE_MEDIA = new Set(['jobda']);   // 잡다 254장 전부 Pretendard Bold·왼쪽 정렬·뱃지 0 — 사실상 틀
const NO_RECIPE_SPECS = new Set(['everytime-home-card-image']);   // 「모집분야」 뱃지 + 오브젝트 칸이 정해진 구조
const MAX_AR_GAP = 1.35;   // 시안 프레임과 규격의 비율 차이 상한 — 넘으면 칸이 찌그러진다

export function recipeEligible(spec) {
  if (!spec || spec.w == null || spec.h == null) return false;
  if (NO_RECIPE_SPECS.has(spec.id)) return false;
  if (spec.grade === 'B') return false;
  if (spec.mediumRules?.fonts?.required) return false;
  if (NO_RECIPE_MEDIA.has(spec.mediumRules?.id)) return false;
  if ((spec.rules ?? spec).objectBox) return false;
  return spec.h >= MIN_H;
}

export const familyById = id => TEMPLATE_FAMILIES.find(f => f.id === id) ?? null;

// 세트 안에서 규격에 가장 가까운 프레임. 비율이 너무 다르면 null
export function frameFor(family, spec) {
  let best = null, gap = Infinity;
  for (const fr of family.frames) {
    const a = fr.w / fr.h, b = spec.w / spec.h, g = Math.max(a / b, b / a);
    if (g < gap) { gap = g; best = fr; }
  }
  return gap <= MAX_AR_GAP ? best : null;
}

const kvKindOf = kvMeta => kvTypeOf(kvMeta)?.id ?? null;

// 키비주얼에 맞는가: 전면 시안은 배경 있는 그림만, 누끼는 칸에 담는 시안만
export function familyFits(family, kvMeta, hasKv = !!kvMeta, spec = null) {
  const fr = spec ? frameFor(family, spec) : null;
  if (!(fr ? fr.full : family.visual === 'full')) return true;
  return hasKv && kvKindOf(kvMeta) !== 'cutout';
}

const hashOf = s => { let h = 2166136261; for (const ch of String(s ?? '')) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };

// 규격에 쓸 수 있는 시안 전부(고르기용). 사진·질감은 전면 먼저, 누끼·일러스트는 칸 시안 먼저.
//   같은 묶음 안 순서는 seed(기업명)로 돌려 캠페인마다 다른 시안이 앞에 온다. 한 캠페인 안에서는 규격이 달라도 같은 순서
export function familiesFor(spec, kvMeta, hasKv = !!kvMeta, seed = '', { all = false } = {}) {
  if (!recipeEligible(spec)) return [];
  const kind = kvKindOf(kvMeta), wantFull = kind === 'photo' || kind === 'texture', h = hashOf(seed);
  const rank = f => (frameFor(f, spec).full === wantFull ? 0 : 1);
  return TEMPLATE_FAMILIES.filter(f => frameFor(f, spec) && familyFits(f, kvMeta, hasKv, spec) && (all || TEMPLATE_PASS.has(`${f.id}|${spec.id}`)))
    .map(f => ({ f, k: (hashOf(f.id) ^ h) >>> 0 }))
    .sort((a, b) => rank(a.f) - rank(b.f) || a.k - b.k)
    .map(x => x.f);
}

// 시안 묶음을 style 로: 글꼴까지 시안을 따른다
export const familyStyle = f => ({ tpl: f.id, fonts: { heading: f.font, body: f.font } });

// 자동 안: 비주얼 쓰임·타이포 특징이 겹치지 않게 n개
export function recipeStyles(spec, kvMeta, hasKv = !!kvMeta, seed = '', n = 2) {
  const out = [], typos = new Set(), visuals = new Set(), list = familiesFor(spec, kvMeta, hasKv, seed);
  for (const f of list) { const v = frameFor(f, spec).visual; if (out.length >= n) break; if (typos.has(f.typo) || visuals.has(v)) continue; typos.add(f.typo); visuals.add(v); out.push(f); }
  for (const f of list) { if (out.length >= n) break; if (!out.includes(f) && !typos.has(f.typo)) { typos.add(f.typo); out.push(f); } }
  for (const f of list) { if (out.length >= n) break; if (!out.includes(f)) out.push(f); }
  return out.map(familyStyle);
}

export const recipeActive = (spec, style) => { const f = style?.tpl ? familyById(style.tpl) : null; return !!f && recipeEligible(spec) && !!frameFor(f, spec); };
