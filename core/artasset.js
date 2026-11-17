// 이 소재만 그림·로고 바꾸기(11-10 hub/pro 이식 1단계 — hub 「이미지 레이어 채움 행 🖼 → 그 레이어 그림만」).
//   앱은 레이어를 들고 있지 않고 「캠페인 style + 소재 overrides.style」을 렌더러가 매번 다시 그린다(core/generate.js · app adEffStyle 가 { ...c.style, ...a.overrides.style }).
//   그래서 그림 바꾸기 = overrides.style 에 그 소재만의 keyVisual·kvMeta 를 얹는 것. 순수 함수(브라우저 없음) — test/artasset-1110.test.js
//   · kvVariants: null 필수 — 렌더러 pickKvVariant 가 캠페인의 가로형/세로형 그림을 먼저 골라 이 소재 그림을 덮는다
//   · AI 그림 판단 조각(aiShape·aiKvBox·aiFade·aiKvOrig·aiKvMetaOrig·aiShapes, AI 지면 background.ai, AI 유형 kvTypeOverride)은 다른 그림 기준이라 뺀다
//   · 색은 기본 캠페인 색 유지(브랜드 일관, 11-10 총괄 결정 1). 「이 소재 색도 맞춤」을 켜면 palette 를 새 그림에서(kvOwnColors 표시)
//   · 저장: 같은 그림 data URL 은 campstore dehydrate 가 내용 해시로 한 번만 쓴다 — 소재마다 넣어도 IndexedDB 는 한 벌
export const ART_KV_KEYS = ['keyVisual', 'kvOrig', 'kvMeta', 'kvReadability', 'kvVariants', 'kvOwnColors'];
export const ART_LOGO_KEYS = ['logo', 'logoLight', 'logoMono', 'logoMeta', 'logoTone', 'logoOrig'];
export const ART_ASSET_KEYS = [...ART_KV_KEYS, 'kvUse', ...ART_LOGO_KEYS, 'logoAsKv'];   // logoAsKv: 11-17 노션 N2 비즈보드 「이미지 대신 로고 사용」(core/logokv.js)
const AI_KEYS = ['aiShape', 'aiKvBox', 'aiFade', 'aiKvOrig', 'aiKvMetaOrig', 'aiShapes', 'kvTypeOverride'];

const dropAi = st => {
  const o = { ...(st ?? {}) };
  for (const k of AI_KEYS) delete o[k];
  if (o.background?.ai) { const { ai, ...rest } = o.background; o.background = rest; }
  return o;
};

// 이 소재 그림 바꾸기 → 새 overrides.style. palette 를 주면(「이 소재 색도 맞춤」) 그 소재 색도 새 그림에서
export function withArtKv(st, { keyVisual, kvOrig = null, kvMeta = null, kvReadability = null, palette = null }) {
  if (!keyVisual) return clearArtKv(st);
  const o = dropAi(st);
  Object.assign(o, { keyVisual, kvOrig: kvOrig ?? keyVisual, kvMeta, kvReadability, kvVariants: null });
  if (palette) { o.palette = palette; o.kvOwnColors = true; }
  else if (o.kvOwnColors) { delete o.palette; delete o.kvOwnColors; }   // 앞 그림에 맞췄던 색은 걷는다(캠페인 색으로)
  return o;
}
// 캠페인 키비주얼로 되돌리기 — 이 소재 그림·그 그림에 맞춘 색만 지운다(다른 개별값은 남는다)
export function clearArtKv(st) {
  const o = { ...(st ?? {}) };
  if (o.kvOwnColors) delete o.palette;
  for (const k of ART_KV_KEYS) delete o[k];
  return o;
}
// 이 소재 색 맞춤 켜기/끄기(그림은 그대로)
export function withArtKvColors(st, palette) {
  const o = { ...(st ?? {}) };
  if (palette) { o.palette = palette; o.kvOwnColors = true; } else if (o.kvOwnColors) { delete o.palette; delete o.kvOwnColors; }
  return o;
}
// 이 소재 그림 맞춤(hub 채움 행 cover/contain → 렌더러 kvUse auto·full·part). 'auto' = 캠페인 값 따름(키 삭제)
export function withArtKvUse(st, use) {
  const o = { ...(st ?? {}) };
  if (['full', 'part'].includes(use)) o.kvUse = use; else delete o.kvUse;
  return o;
}
// 이 소재 로고 바꾸기 — key: 'logo'(원색) | 'logoLight'(흰색). tone·meta·mono 는 원색일 때 앱이 잰 값
export function withArtLogo(st, key, { src, orig = null, mono = null, meta = null, tone = null }, base = {}) {
  const o = { ...(st ?? {}) };
  if (key === 'logoLight') {
    o.logoLight = src;
    const cur = o.logoTone ?? base.logoTone;
    o.logoTone = cur === 'light' ? 'light' : 'both';
    return o;
  }
  Object.assign(o, { logo: src, logoOrig: orig ?? src, logoMono: mono ?? null, logoMeta: meta ?? null });
  // 11-10 고침: 캠페인 흰색 로고는 옛 로고라 이 소재엔 물려받지 않는다 — 어두운 지면에서 옛 흰 로고가 그대로 보였다.
  //   이 소재가 따로 올린 흰색 로고가 있으면 그것, 없으면 비워서 렌더러가 새 원색 로고를 반전해 쓴다(흰 로고면 그 자체)
  if (!st?.logoLight) o.logoLight = tone === 'light' ? src : null;
  o.logoTone = tone === 'light' ? 'light' : o.logoLight ? 'both' : 'dark';
  void base;
  return o;
}
export function clearArtLogo(st) {
  const o = { ...(st ?? {}) };
  for (const k of ART_LOGO_KEYS) delete o[k];
  return o;
}
// 이 소재가 자기 그림/로고를 쓰나
export const hasArtKv = a => !!a?.overrides?.style?.keyVisual;
export const hasArtLogo = a => !!(a?.overrides?.style?.logo || a?.overrides?.style?.logoLight);
// 그림이 누끼(배경 투명)인가 — 회전·뒤집기는 누끼만(사진형은 녹임·스크림 층과 어긋난다, 11-10 총괄 결정 3)
export const isCutoutMeta = m => (m?.field?.opaque ?? 1) < 0.5;
