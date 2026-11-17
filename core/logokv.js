// 비즈보드 「이미지 대신 로고 사용」(11-17 노션 확인요청 N2 「[카카오] 비즈보드 이미지 로고로 바꾸기」).
//   그림이 애매하거나 고객이 원하면 키비주얼 칸에 그림 대신 로고를 넣어요. 소재마다(overrides.style.logoAsKv) 켜고 꺼요.
//   로고 색이 모양을 정해요:
//     흰 로고(logoTone 'light', 또는 톤이 없고 실측이 밝고 무채) → 썸네일형: 320×222 r18 상자에 브랜드색(흰 로고 3:1 안 되면 진하게) 바탕 + 흰 로고 원색 그대로
//     검은·원색 로고(나머지, 'both' 도 원색이 있으니 여기) → 오브젝트형: 314×300 오브젝트 칸에 배경 없이 로고만
//   비즈보드(매체가 썸네일 상자와 오브젝트 상자를 둘 다 정한 규격 — 카카오 비즈보드·NAP DSP 비즈보드, 옛 1029 포함)에서만 켜져요. 다른 규격은 값이 있어도 무시해요.
//   순수 함수 — 렌더러(core/renderers/ad.js renderAd)·앱 토글(app/artkv.js)·테스트가 같은 판정을 써요.
import { contrast, WHITE } from './palette.js';
import { brandDeep } from './field.js';

const rulesOf = spec => spec?.rules ?? spec ?? {};
// 이 규격에 토글을 보여 줄까 — 매체 objectBox 에 썸네일·오브젝트 둘 다 있는 규격만(=비즈보드)
export function logoKvSpec(spec) {
  const ob = rulesOf(spec).objectBox;
  return !!(ob?.thumbnail && ob?.cutout);
}
// 흰 로고인가 — 업로드 때 잰 톤이 먼저, 없으면 실측(core/logo.js logoToneOf 와 같은 문턱: 밝기 > .8 · 채도 < .25)
export function logoIsWhite(style) {
  if (style?.logoTone === 'light') return true;
  if (style?.logoTone) return false;
  const m = style?.logoMeta;
  return !!(m && m.lum != null && m.lum > 0.8 && (m.sat ?? 0) < 0.25);
}
export function logoKvForm(style) { return logoIsWhite(style) ? 'thumb' : 'object'; }
// 썸네일형 바탕색 — 브랜드 주색이 흰 로고와 3:1(그래픽 요소 대비) 이상이면 그대로, 아니면 같은 색 계열로 진하게
export function logoKvBg(style) {
  const p = style?.palette?.primary ?? '#191919';
  try { return contrast(p, WHITE) >= 3 ? p : brandDeep(p)[0]; } catch { return '#191919'; }
}
// 렌더 전에 style 을 바꾼다: 그림 계열을 걷고(logoAsObject 경로로 가게) 모양을 적는다. 해당 없으면 그대로
const KV_DROP = ['keyVisual', 'kvMeta', 'kvVariants', 'object', 'objectMeta', 'aiKvBox', 'aiFade', 'aiKvOrig', 'aiKvMetaOrig', 'aiShapes', 'kvFullForce'];
export function applyLogoKv(style, spec) {
  if (!style?.logoAsKv || !style.logo || !logoKvSpec(spec)) return style;
  const o = { ...style };
  for (const k of KV_DROP) delete o[k];
  o.keyVisual = null; o.kvMeta = null; o.kvUse = 'auto';
  o.logoKv = logoKvForm(style);
  if (o.logoKv === 'thumb') o.logoKvBg = logoKvBg(style);
  return o;
}
