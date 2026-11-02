// core/recipes.js — 시안 레시피(11-02 「홍보사업셀」 소재 1,918장 유형화, docs/design-recipes-2026-11-02.md).
//   레시피 = 키비주얼 쓰임 + 글자 구조 + 정보 표현. 자리·정렬은 기존 편집 프리셋으로 정하고, 글자 표현만 렌더러가 style.recipe 를 보고 바꾼다.
//   규정 매체·틀에 가까운 매체·얇은 띠·오브젝트 칸 규격에는 쓰지 않는다 — 그 규격은 지금처럼 규정대로 1안.
import { kvTypeOf } from './kvtypes.js';

export const RECIPES = {
  info: { label: '정보형' },        // 지면 + 오브젝트, 왼쪽 정렬, 라벨 알약 + 값(GS에너지·AhnLab)
  impact: { label: '임팩트형' },    // 사진 전면, 기업명 굵게 + 채용구분 가늘게(GS에너지·아머스포츠) — 굵기 대비 13~26%
  accent: { label: '강조형' },      // 지면 + 오브젝트, 가운데 정렬, 채용구분 색 강조 + 날짜 알약(SPC·ABL·동부건설) — 색 강조 19~40%, 날짜 알약 16~22%
};

const MIN_H = 240;   // 790×90·930×180 같은 띠는 글자 한 덩어리만 들어간다
const NO_RECIPE_MEDIA = new Set(['jobda']);   // 잡다 254장 전부 Pretendard Bold·왼쪽 정렬·알약 0 — 사실상 틀
const NO_RECIPE_SPECS = new Set(['everytime-home-card-image']);   // 에브리타임 홈카드는 「모집분야」 알약 + 오브젝트 칸이 정해진 구조

export function recipeEligible(spec) {
  if (!spec || spec.w == null || spec.h == null) return false;
  if (NO_RECIPE_SPECS.has(spec.id)) return false;
  if (spec.grade === 'B') return false;
  if (spec.mediumRules?.fonts?.required) return false;
  if (NO_RECIPE_MEDIA.has(spec.mediumRules?.id)) return false;
  if ((spec.rules ?? spec).objectBox) return false;
  return spec.h >= MIN_H;
}

export const recipeActive = (spec, style) => !!RECIPES[style?.recipe] && recipeEligible(spec);

// 키비주얼 유형별 우선순위: 사진은 전면(인스타 40%), 누끼·일러스트는 지면 + 오브젝트(GDN 가로 60~78%, 세로 71%)
const ORDER = {
  photo: ['impact', 'info', 'accent'],
  illust: ['info', 'impact', 'accent'],
  cutout: ['info', 'accent', 'impact'],
  texture: ['impact', 'accent', 'info'],
};

// 측정한 자리: 가로형은 오른쪽, 세로형·정사각은 아래
const placeOf = spec => (spec.w / spec.h >= 1.25 ? 'right' : 'bottom');

export function recipeStyles(spec, kvMeta, hasKv = !!kvMeta) {
  if (!recipeEligible(spec)) return [];
  const kind = kvTypeOf(kvMeta)?.id ?? 'illust';
  const place = placeOf(spec);
  return (ORDER[kind] ?? ORDER.illust).map(recipe => {
    const st = { recipe, textAlign: recipe === 'accent' ? 'center' : 'left' };
    if (!hasKv) return st;
    const t = kvTypeOf(kvMeta);
    const fullOk = recipe === 'impact' && (kind === 'photo' || kind === 'texture' || !!t?.flags?.room);   // 전면은 빈 면이 있는 그림만. 일러스트 장면 위에 글자를 얹지 않는다
    if (!(fullOk && kind === 'texture')) st.kvPlace = fullOk ? 'bg' : place;
    if (st.kvPlace && st.kvPlace !== 'bg') st.kvSize = spec.w <= 320 && spec.h >= 400 ? 'sm' : 'md';   // 빈 곳 채우기 키움을 끄고 글자에 자리를 준다(소재 메인이 그림보다 먼저 읽힌다)
    return st;
  });
}
