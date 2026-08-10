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

export const FONT_IDS = Object.keys(FONTS);

export function fontStack(id) {
  return (FONTS[id] ?? FONTS.Pretendard).stack;
}

// 매체가 웹폰트 링크를 허용할 때만 <link> 태그를 돌려준다.
export function fontLink(id, allow = true) {
  const f = FONTS[id];
  return allow && f ? `<link rel="stylesheet" href="${f.css}">` : '';
}
