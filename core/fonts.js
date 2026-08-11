// 폰트 카탈로그 — 이름 하나로 CSS 스택과 웹폰트 링크를 함께 관리.
//
// 자기완결 원칙의 유일한 예외: 웹폰트 CDN.
//   나눔스퀘어 계열은 기본 설치 폰트가 아니라 링크 없이는 대체 폰트로 렌더된다.
//   그래서 매체별로 정책을 나눈다 —
//     landing / print  : 웹폰트 링크 포함 (정확한 렌더가 목적)
//     eDM              : 링크 없음 (이메일 클라이언트가 외부 CSS를 막고, 도달률에도 불리)
//     banner(래스터)    : 링크 없음 — canvas 래스터화는 외부 폰트를 기다리지 않는다.
//                         정확한 배너 이미지를 뽑으려면 해당 폰트가 로컬에 설치돼야 한다.

export const FONTS = {
  Pretendard: {
    label: 'Pretendard',
    stack: `'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif`,
    css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css',
  },
  NanumSquareNeo: {
    label: '나눔스퀘어 네오',
    stack: `'NanumSquareNeo','NanumSquare','Apple SD Gothic Neo',sans-serif`,
    css: 'https://cdn.jsdelivr.net/gh/moonspam/NanumSquareNeo@1.0/nanumsquareneo.css',
  },
  NanumSquare: {
    label: '나눔스퀘어',
    stack: `'NanumSquare','Apple SD Gothic Neo',sans-serif`,
    css: 'https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css',
  },
  NanumSquareRound: {
    label: '나눔스퀘어 라운드',
    stack: `'나눔스퀘어라운드','NanumSquareRound','Apple SD Gothic Neo',sans-serif`,
    css: 'https://cdn.jsdelivr.net/npm/@kfonts/nanum-square-round@0.2.0/index.css',
  },
};

// 카탈로그에 처음부터 있는 네 종. 런타임에 끼운 커스텀 폰트는 여기 들어오지 않는다 —
// 목록이 필요하면 fontIds()를 쓴다(FONT_IDS는 모듈 로드 시점에 굳는 값이다).
export const FONT_IDS = Object.keys(FONTS);
export function fontIds() { return Object.keys(FONTS); }

export function fontStack(id) {
  return (FONTS[id] ?? FONTS.Pretendard).stack;
}

/* ── 커스텀 폰트(사용자 업로드) ──
   회사·행사 전용 서체는 CDN에 없다. 파일을 dataURL @font-face로 카탈로그에 끼워
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
    label, custom: true,
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
export function fontLink(id, allow = true) {
  const f = FONTS[id];
  if (!f) return '';
  if (f.face) return `<style>${f.face}</style>`;
  return allow ? `<link rel="stylesheet" href="${f.css}">` : '';
}
