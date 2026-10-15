// 폰트 카탈로그 — 이름 하나로 CSS 스택·로컬 파일·라이선스를 함께 관리.
//
// 10-14: 무료 폰트를 앱 안에 묶었다(app/fonts/<family>/*.woff2 + LICENSE.txt, 만드는 법: scripts/fonts-subset.py).
//   · 미리보기는 상대 경로 @font-face(localFaceCss)로 — 산출물 HTML 이 가벼운 채로 iframe(srcdoc 은 부모 base URL 을 물려받는다)에서 뜬다.
//   · 내보내기(래스터·배너)는 dataURL @font-face(embeddedFaceCss)로 — SVG foreignObject 는 바깥 파일을 못 받으므로 바이트째 넣는다(커스텀 폰트와 같은 길).
//   · CDN css 는 옛 산출물(랜딩·인쇄 fontLink) 호환으로 남겨 둔다.
// 매체 규정: 매체 JSON fonts.required 가 있으면(자소설·카카오·리멤버 = Pretendard) 여기서 고른 폰트와 무관하게 그 폰트 — 렌더러(ad.js)가 강제하고 lint 가 검사한다.
//   fonts.recommended(네이버 GFA 「나눔고딕 혹은 고딕계열」)는 권장일 뿐 강제하지 않는다(fontRuleOf 가 읽어 안내만).
//
// 자기완결 원칙의 예외: 웹폰트 CDN(옛 경로).
//     landing / print  : 웹폰트 링크 포함 (정확한 렌더가 목적)
//     eDM              : 링크 없음 (이메일 클라이언트가 외부 CSS를 막고, 도달률에도 불리)
//     banner(래스터)    : 링크 없음 — canvas 래스터화는 외부 폰트를 기다리지 않는다. 묶은 폰트는 embeddedFaceCss 로 넣는다.

const OFL = { name: 'SIL Open Font License 1.1', commercial: true, embed: true, modify: true };

export const FONTS = {
  // ── 기본 글꼴(10-15 저녁 사용자: 「폰트 규정 없는 건 Paperlogy 로 제작」) — 매체가 글꼴을 정한 곳(자소설·카카오·리멤버 = Pretendard)은 그대로 ──
  Paperlogy: {
    label: 'Paperlogy', group: 'default', maker: 'PT& (Lee Juim)',
    family: 'Paperlogy',
    stack: `'Paperlogy','Pretendard','Apple SD Gothic Neo',system-ui,sans-serif`,
    dir: 'fonts/paperlogy', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    license: { ...OFL, url: 'https://scripts.sil.org/OFL' },   // 폰트 name 테이블 ID 13/14 — 배포 zip 에 라이선스 파일 없음
    source: '사용자 제공 Paperlogy-1.000.zip (2026-10-15) · redesigned by Lee Juim, glyphs from Gmarket Sans & Montserrat',
  },
  Pretendard: {
    label: 'Pretendard', group: 'free', maker: '길형진(orioncactus)',
    family: 'Pretendard',
    stack: `'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif`,
    css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css',
    dir: 'fonts/pretendard', weights: [400, 500, 600, 700],
    license: { ...OFL, url: 'https://github.com/orioncactus/pretendard/blob/main/LICENSE' },
    source: 'https://github.com/orioncactus/pretendard (v1.3.9)',
  },
  Freesentation: {   // 사용자 제공(10-15 저녁) — 무료 폰트 목록 맨 앞
    label: 'Freesentation', group: 'free', maker: 'PT& (Lee Juim)',
    family: 'Freesentation',
    stack: `'Freesentation','Pretendard','Apple SD Gothic Neo',system-ui,sans-serif`,
    dir: 'fonts/freesentation', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    license: { ...OFL, url: 'https://scripts.sil.org/OFL' },   // 폰트 name 테이블 ID 13/14
    source: '사용자 제공 Freesentation-2.001.zip (2026-10-15) · Roboto + Noto Sans CJK 글리프, Lee Juim/PT& 재설계',
  },
  A2Z: {   // 사용자 제공(10-15 저녁) 에이투지체
    label: '에이투지체 (A2Z)', group: 'free', maker: 'PT& (Lee Juim)',
    family: 'A2Z',
    stack: `'A2Z','에이투지체','Pretendard','Apple SD Gothic Neo',system-ui,sans-serif`,
    dir: 'fonts/a2z', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    license: { ...OFL, url: 'https://scripts.sil.org/OFL' },   // 폰트 name 테이블 ID 13/14
    source: '사용자 제공 에이투지체-otf-v1.001.zip (2026-10-15) · Latin glyphs from Outfit, Lee Juim/PT&',
  },
  // ── 무료 폰트(사용자 지정 순서: 나눔스퀘어 → 네오 → 라운드 → 카카오 큰글씨, 10-14) ──
  NanumSquare: {
    label: '나눔스퀘어', group: 'free', maker: '네이버',
    family: 'NanumSquare',
    stack: `'NanumSquare','Apple SD Gothic Neo',sans-serif`,
    css: 'https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css',
    dir: 'fonts/nanum-square', weights: [300, 400, 700, 800],
    license: { ...OFL, url: 'https://help.naver.com/service/30016/contents/18088' },
    source: 'https://hangeul.naver.com/fonts (nanum-square.zip)',
  },
  NanumSquareNeo: {
    label: '나눔스퀘어 네오', group: 'free', maker: '네이버',
    family: 'NanumSquare Neo',
    stack: `'NanumSquare Neo','NanumSquareNeo','NanumSquare','Apple SD Gothic Neo',sans-serif`,
    css: 'https://cdn.jsdelivr.net/gh/moonspam/NanumSquareNeo@1.0/nanumsquareneo.css',
    dir: 'fonts/nanum-square-neo', weights: [300, 400, 700, 800, 900],
    license: { ...OFL, url: 'https://help.naver.com/service/30016/contents/18088' },
    source: 'https://hangeul.naver.com/fonts (nanum-square-neo.zip)',
  },
  NanumSquareRound: {
    label: '나눔스퀘어 라운드', group: 'free', maker: '네이버',
    family: 'NanumSquareRound',
    stack: `'NanumSquareRound','나눔스퀘어라운드','Apple SD Gothic Neo',sans-serif`,
    css: 'https://cdn.jsdelivr.net/npm/@kfonts/nanum-square-round@0.2.0/index.css',
    dir: 'fonts/nanum-square-round', weights: [300, 400, 700, 800],
    license: { ...OFL, url: 'https://help.naver.com/service/30016/contents/18088' },
    source: 'https://hangeul.naver.com/fonts (nanum-square-round.zip)',
  },
  KakaoBigSans: {
    label: '카카오 큰글씨 (Kakao Big Sans)', group: 'free', maker: '카카오',
    family: 'Kakao Big Sans',
    stack: `'Kakao Big Sans','Apple SD Gothic Neo',sans-serif`,
    dir: 'fonts/kakao-big-sans', weights: [400, 700, 800],
    license: { ...OFL, url: 'https://www.kakaocorp.com/page/detail/11571' },
    source: 'https://www.kakaocorp.com/page/detail/11571 (카카오큰글씨.zip)',
  },
  KakaoSmallSans: {
    label: '카카오 작은글씨 (Kakao Small Sans)', group: 'free', maker: '카카오',
    family: 'Kakao Small Sans',
    stack: `'Kakao Small Sans','Apple SD Gothic Neo',sans-serif`,
    dir: 'fonts/kakao-small-sans', weights: [300, 400, 700],
    license: { ...OFL, url: 'https://www.kakaocorp.com/page/detail/11571' },
    source: 'https://www.kakaocorp.com/page/detail/11571 (카카오작은글씨.zip)',
  },
  NanumGothic: {
    label: '나눔고딕', group: 'free', maker: '네이버',
    family: 'NanumGothic',
    stack: `'NanumGothic','나눔고딕','Apple SD Gothic Neo',sans-serif`,
    dir: 'fonts/nanum-gothic', weights: [400, 700, 800],
    license: { ...OFL, url: 'https://help.naver.com/service/30016/contents/18088' },
    source: 'https://hangeul.naver.com/fonts (nanum-gothic.zip)',
    // 네이버 GFA 모바일 DA 권장 글꼴(fonts.recommended) — 강제는 아니다
  },
  GmarketSans: {
    label: 'Gmarket Sans', group: 'free', maker: '지마켓',
    family: 'Gmarket Sans',
    stack: `'Gmarket Sans','GmarketSans','Apple SD Gothic Neo',sans-serif`,
    dir: 'fonts/gmarket-sans', weights: [300, 500, 700],
    license: { ...OFL, url: 'https://corp.gmarket.com/fonts/' },
    source: 'https://corp.gmarket.com/fonts/ (GmarketSansTTF.zip)',
    // 알바몬 PSD 가이드(PC 메인 빅·커튼·보드)가 쓰는 서체 — 매체 JSON 에는 note 로만 있어 강제하지 않는다
  },
  SUIT: {
    label: 'SUIT', group: 'free', maker: 'SUNN(sun.fo)',
    family: 'SUIT',
    stack: `'SUIT','Apple SD Gothic Neo',sans-serif`,
    dir: 'fonts/suit', weights: [400, 500, 600, 700],
    license: { ...OFL, url: 'https://github.com/sun-typeface/SUIT/blob/main/LICENSE' },
    source: 'https://github.com/sun-typeface/SUIT (v2.0.5)',
  },
};

// 카탈로그에 처음부터 있는 종류. 런타임에 끼운 커스텀 폰트는 여기 들어오지 않는다 —
// 목록이 필요하면 fontIds()를 쓴다(FONT_IDS는 모듈 로드 시점에 굳는 값이다).
export const FONT_IDS = Object.keys(FONTS);
export function fontIds() { return Object.keys(FONTS); }
export const DEFAULT_FONT = 'Paperlogy';   // 10-15 저녁: 규정 없는 매체 기본(이전 Pretendard)
export function isBundledFont(id) { return !!FONTS[id]?.dir; }
export function fontGroup(id) { return FONTS[id]?.custom ? 'custom' : (FONTS[id]?.group ?? 'free'); }

export function fontStack(id) {
  return (FONTS[id] ?? FONTS.Pretendard).stack;
}

// 묶은 폰트의 파일 목록 [{ weight, path }] — path 는 app/ 기준 상대 경로
export function fontFiles(id) {
  const f = FONTS[id];
  if (!f?.dir) return [];
  const base = f.dir.split('/').pop();
  return f.weights.map(weight => ({ weight, path: `${f.dir}/${base}-${weight}.woff2` }));
}

const BUNDLED_MARK = '/*mbm-bundled-font*/';
export { BUNDLED_MARK };

// 미리보기용 @font-face — 상대 경로. prefix 로 base 를 바꿀 수 있다(앱 밖에서 쓸 때)
export function localFaceCss(id, prefix = '') {
  const f = FONTS[id];
  if (!f?.dir) return '';
  return BUNDLED_MARK + fontFiles(id).map(({ weight, path }) =>
    `@font-face{font-family:'${f.family}';src:url(${prefix}${path}) format('woff2');font-weight:${weight};font-style:normal;font-display:block}`).join('');
}

// 내보내기용 @font-face — dataUrls: { [weight]: 'data:font/woff2;base64,…' } (앱이 fetch 해 만든다)
export function embeddedFaceCss(id, dataUrls) {
  const f = FONTS[id];
  if (!f?.dir) return '';
  return BUNDLED_MARK + fontFiles(id).filter(x => dataUrls[x.weight]).map(({ weight }) =>
    `@font-face{font-family:'${f.family}';src:url(${dataUrls[weight]}) format('woff2');font-weight:${weight};font-style:normal;font-display:block}`).join('');
}

// 라이선스 한 줄(화면용) — 「SIL OFL 1.1 · 상업 광고 가능 · 임베딩 가능 · 굵기 400/700/800」
export function fontInfoLine(id) {
  const f = FONTS[id];
  if (!f) return '';
  if (f.custom) return '첨부한 파일 — 라이선스는 사용자가 확인';
  const L = f.license ?? {};
  return [L.name, L.commercial ? '상업 광고 가능' : null, L.embed ? '임베딩 가능' : null, f.weights?.length ? `굵기 ${f.weights.join('/')}` : null].filter(Boolean).join(' · ');
}

/* ── 매체 폰트 규정 읽기 ──
   매체 JSON fonts 블록은 { required, recommended, allowed?, note } 다. 값은 바꾸지 않고 읽기만 한다.
   required  : 그 폰트로 고정(자소설·카카오·리멤버 Pretendard). 카탈로그 id 로 바꿔 준다(이름이 다르면 그대로).
   allowed   : 배열이면 그중 카탈로그에 있는 첫 폰트(없으면 고른 폰트). 지금 매체 JSON 에는 없다 — 생기면 바로 읽힌다.
   recommended: 안내만. */
const FAMILY_ALIAS = { paperlogy: 'Paperlogy', '페이퍼로지': 'Paperlogy', freesentation: 'Freesentation', '프리젠테이션': 'Freesentation', a2z: 'A2Z', '에이투지체': 'A2Z', '에이투지': 'A2Z', pretendard: 'Pretendard', '나눔고딕': 'NanumGothic', nanumgothic: 'NanumGothic', '나눔스퀘어': 'NanumSquare', nanumsquare: 'NanumSquare',
  '나눔스퀘어 네오': 'NanumSquareNeo', 'nanumsquare neo': 'NanumSquareNeo', nanumsquareneo: 'NanumSquareNeo', '나눔스퀘어 라운드': 'NanumSquareRound', nanumsquareround: 'NanumSquareRound',
  'gmarket sans': 'GmarketSans', gmarketsans: 'GmarketSans', suit: 'SUIT', 'kakao big sans': 'KakaoBigSans', '카카오 큰글씨': 'KakaoBigSans', 'kakao small sans': 'KakaoSmallSans', '카카오 작은글씨': 'KakaoSmallSans' };
export function fontIdOfName(name) {
  if (!name) return null;
  const k = String(name).trim().toLowerCase();
  if (FONTS[name]) return name;
  for (const id of Object.keys(FONTS)) if (FONTS[id].family?.toLowerCase() === k || FONTS[id].label?.toLowerCase() === k) return id;
  return FAMILY_ALIAS[k] ?? null;
}

export function fontRuleOf(medium, spec = null) {
  const mf = medium?.fonts ?? null, sf = spec?.fonts ?? null;
  const required = sf?.required ?? mf?.required ?? null;
  const allowed = sf?.allowed ?? mf?.allowed ?? null;
  const recommended = sf?.recommended ?? mf?.recommended ?? null;
  return { fixed: !!required, required, requiredId: fontIdOfName(required), allowed: Array.isArray(allowed) ? allowed : null, recommended, note: mf?.note ?? null };
}

// 이 매체·규격에서 실제로 쓰일 폰트 id — 고정이면 그 폰트, allowed 가 있으면 그중 카탈로그에 있는 첫 것, 아니면 고른 폰트
export function effectiveFontId(medium, selectedId, spec = null) {
  const r = fontRuleOf(medium, spec);
  if (r.fixed) return r.requiredId ?? selectedId;
  if (r.allowed?.length) { const hit = r.allowed.map(fontIdOfName).find(Boolean); if (hit) return hit; }
  return selectedId;
}

/* ── 커스텀 폰트(사용자 업로드) ──
   회사·행사 전용 서체는 카탈로그에 없다. 파일을 dataURL @font-face로 카탈로그에 끼워
   산출물 HTML 안에 폰트 바이트째로 넣는다 — 외부 요청이 0이라 자기완결 원칙이 그대로 지켜지고,
   메일 클라이언트나 canvas 래스터화처럼 외부 CSS를 못 받는 매체에서도 같은 글자가 나온다.
   대가는 용량이다. 산출물 한 장마다 폰트가 통째로 복사되므로 용량 경고는 앱(호출부) 책임. */
const CUSTOM_MARK = '/*mbm-custom-font*/';
export { CUSTOM_MARK };

export function registerCustomFont({ id, label, dataUrl, format }) {
  // family 이름을 접두어로 감싸는 이유: 사용자가 "Pretendard"라는 이름의 파일을 올려도
  // 시스템/CDN 폰트와 이름이 충돌해 엉뚱한 글자가 나오지 않게 한다.
  const family = `mbmCustom_${id}`;
  FONTS[id] = {
    label, custom: true, group: 'custom', family,
    stack: `'${family}','Apple SD Gothic Neo',system-ui,sans-serif`,
    // weight 범위를 넓게 여는 이유: 렌더러가 700·800을 쓰는데 파일이 단일 굵기면
    // 브라우저가 합성 볼드를 만들어서라도 위계를 유지한다(굵기별 파일이 없어도 깨지지 않음).
    face: `${CUSTOM_MARK}@font-face{font-family:'${family}';src:url(${dataUrl}) format('${format}');font-weight:100 900;font-style:normal;font-display:swap}`,
  };
  return id;
}
export function isCustomFont(id) { return !!FONTS[id]?.custom; }
export function customFontCss(id) { return FONTS[id]?.face ?? ''; }

// 매체가 웹폰트 링크를 허용할 때만 <link> 태그를 돌려준다.
// 커스텀 폰트는 예외 — dataURL이라 외부 요청이 없다. 링크를 막는 정책의 이유가
// "외부 CSS 요청"이므로, 요청이 없는 폰트까지 막을 근거가 없다.
// 묶은 폰트(CDN css 없음)는 상대 경로 @font-face 를 준다 — 같은 app/ 아래에서 열리는 문서(랜딩·인쇄 미리보기)에서 뜬다.
export function fontLink(id, allow = true) {
  const f = FONTS[id];
  if (!f) return '';
  if (f.face) return `<style>${f.face}</style>`;
  if (!allow) return '';
  if (f.css) return `<link rel="stylesheet" href="${f.css}">`;
  return f.dir ? `<style>${localFaceCss(id)}</style>` : '';
}
