// 형태별 레이아웃 기준 — 사용자가 고른 실제 소재(레퍼런스)를 픽셀로 재서 옮긴 값이다. 취향으로 정한 숫자가 아니다.
//
// 지면은 비율로 나눈다. 같은 형태면 매체가 달라도 같은 문법으로 그린다:
//   wide    가로형    가로 ÷ 세로 ≥ 1.8          리멤버 2240×360 · 2240×240 · 1005×360 · 1125×276 · 530×200
//   tall    세로형    세로 ÷ 가로 1.2 ~ 2.5      한미글로벌 · 세아제강 600×880
//   tower   세로 띠   세로 ÷ 가로 ≥ 2.5          도레이첨단소재 · 한독 · PT코리아 160×600
//   square  그 사이   (정사각에 가까운 것)       세로형 문법을 줄여서. 가로가 넉넉하면 이미지를 오른쪽에
// 높이 120px 미만의 띠(728×90 등)는 레퍼런스가 없어 렌더러의 띠 문법을 그대로 쓴다.
//
// 값의 단위가 형태마다 다르다 — 레퍼런스가 그렇게 움직였다.
//   가로형은 √(가로×세로)에 비례: 메인 = PC(가로÷세로 ≥ 5) 0.056 · MO 0.09 — 다섯 장 모두 ±2px 안에 든다
//     (2240×360 50 · 2240×240 41 · 1005×360 52 · 1125×276 52 · 530×200 30). 높이 비례로는 ±20% 어긋났다.
//     왼쪽 여백 = 높이의 15~24%, 글자 덩어리 가운데는 높이의 44% 지점(가운데보다 조금 위)
//   세로형·세로 띠는 가로(w)에 비례: 메인 = 폭의 8.7%(600폭 52px) / 15%(160폭 24px)
// 측정법: 글자 줄마다 잉크 높이를 재고, Pretendard 굵게의 한글 잉크 높이 0.89em으로 글자 크기를 되돌려 계산했다.
//
// 우선순위: 매체 규정 > 매체 템플릿 실측·지정 글자 크기(자소설) > 이 기준 > 매체별 관찰 다수결(core/design.js)
//
// 레퍼런스(피그마 「매체별 규격정리」 gD8RsVVg5iWAvQ0VbV2Wbz, 2026-10-02 사용자 지정):
//   가로형  410:19 안랩 PC · 410:18 안랩 MO · 410:21 삼진제약 PC · 410:20 삼진제약 MO · 414:22 신한캐피탈 · 414:23 신한캐피탈
//           414:25 · 414:33 (글자 없는 배경+사진 — 이미지 자리와 지면 처리만 참고)
//   세로형  418:1992 한미글로벌 · 408:37986 세아제강
//   세로 띠 408:43959 도레이첨단소재 · 408:43809 한독 · 408:43673 PT코리아

export const LAYOUT_REFS = {
  wide: [
    { node: '410:19', client: '안랩', medium: 'remember', w: 2240, h: 360, file: '410-19_remember_main-top_pc_2240x360.png' },
    { node: '410:18', client: '안랩', medium: 'remember', w: 1005, h: 360, file: '410-18_remember_main-top_mo_1005x360.png' },
    { node: '410:21', client: '삼진제약', medium: 'remember', w: 2240, h: 240, file: '410-21_remember_main-mid_pc_2240x240.png' },
    { node: '410:20', client: '삼진제약', medium: 'remember', w: 1005, h: 360, file: '410-20_remember_main-mid_mo_1005x360.png' },
    { node: '414:22', client: '신한캐피탈', medium: 'remember', w: 1125, h: 276, file: '414-22_1125x276.png' },
    { node: '414:23', client: '신한캐피탈', medium: 'remember', w: 530, h: 200, file: '414-23_530x200.png' },
    { node: '414:25', client: '', medium: 'remember', w: 2240, h: 240, file: '414-25_2240x240.png', backgroundOnly: true },
    { node: '414:33', client: '', medium: 'remember', w: 1125, h: 276, file: '414-33_1125x276.png', backgroundOnly: true },
  ],
  tall: [
    { node: '418:1992', client: '한미글로벌', medium: 'jasoseol', w: 600, h: 880, file: '418-1992_600x880.png' },
    { node: '408:37986', client: '세아제강', medium: 'jasoseol', w: 600, h: 880, file: '408-37986_600x880.png' },
  ],
  tower: [
    { node: '408:43959', client: '도레이첨단소재', medium: 'jasoseol', w: 160, h: 600, file: '408-43959_160x600.png' },
    { node: '408:43809', client: '한독', medium: 'jasoseol', w: 160, h: 600, file: '408-43809_160x600.png' },
    { node: '408:43673', client: 'PT코리아', medium: 'jasoseol', w: 160, h: 600, file: '408-43673_160x600.png' },
  ],
  square: [],
};
export const SHAPE_LABEL = { wide: '가로형', tall: '세로형', tower: '세로 띠', square: '정사각형', strip: '얇은 띠' };

export function shapeOf(w, h) {
  if (h < 120) return 'strip';
  if (w / h >= 1.8) return 'wide';
  if (h / w >= 2.5) return 'tower';
  if (h / w >= 1.2) return 'tall';
  return 'square';
}

const r = Math.round;

// 형태와 크기 → px 값. 렌더러는 이 값을 "원하는 크기"로 쓰고, 자리가 모자라면 비율을 지킨 채 줄인다.
// gapSub = 서브와 메인 사이(서브 글자 크기의 배수), gapDetail = 메인과 상세 사이(메인 글자 크기의 배수).
// 레퍼런스의 잉크 사이 간격에서 줄 상자의 위아래 여백을 뺀 값이다.
export function layoutFor(w, h) {
  const shape = shapeOf(w, h);
  if (shape === 'strip') return { shape };
  if (shape === 'wide') {
    // 2240×360·2240×240(PC)은 메인 한 줄 + 날짜 한 줄, 그보다 덜 납작한 것(MO)은 메인 두 줄("회사 / 채용 문구")
    const flat = w / h >= 5;
    const main = r(Math.sqrt(w * h) * (flat ? 0.056 : 0.09));
    return {
      shape, align: 'left', vAlign: 'center',
      // 위 여백 < 아래 여백 — 글자 덩어리 가운데가 높이의 44~45%에 온다
      padX: Math.max(16, r(h * (flat ? 0.23 : 0.165))), padY: Math.max(8, r(h * 0.08)), padBottom: Math.max(8, r(h * 0.18)), top: null,
      // 줄 간격: 메인 1.25 · 서브·상세 1.3 — Figma 9월 공채 디자이너 가로형 메인 4/4가 1.2~1.25(블라인드·카카오 1.25, 에브리타임·자소설 PC메인 auto≈1.2). 예전 1.5는 리멤버 잉크 간격에서 읽은 값(10-08 typo A1)
      main, mainLine: 1.25, mainLines: flat ? 1 : 2,
      sub: Math.max(9, r(main * 0.62)), subLine: 1.3, subWeight: 400, subAbove: false, gapSub: 0,
      detail: Math.max(9, r(main * 0.62)), detailLine: 1.3, gapDetail: 0, detailLabelBold: false,
      object: 'right', objectW: Math.min(r(w * 0.42), r(h * 2.2)),
      // 가로형도 로고를 둔다 — 우상단 소형(Figma 9월 공채 디자이너 가로형 6/6에 로고, 높이 = 지면 높이의 6~8%). 매체가 로고를 금하면(리멤버 count 0) 렌더러가 생략
      logo: 'top-right', logoH: Math.max(12, r(h * 0.065)), logoTop: Math.max(8, r(h * 0.07)),
    };
  }
  if (shape === 'tower') {
    // 160×600: 왼쪽 16 · 로고 위 가운데(y24, 높이 28) · 서브 y84 17px(굵게) → 메인 24px 줄 간격 1.4 → 35 띄고 상세 13px 줄 간격 1.65
    return {
      shape, align: 'left', vAlign: 'top',
      padX: Math.max(10, r(w * 0.1)), padY: Math.max(10, r(w * 0.1)), top: r(h * 0.132),
      main: r(w * 0.15), mainLine: 1.4, mainLines: 4,
      sub: Math.max(9, r(w * 0.1)), subLine: 1.32, subWeight: 700, subAbove: true, gapSub: 0.8,
      detail: Math.max(9, r(w * 0.081)), detailLine: 1.65, gapDetail: 1.0, detailLabelBold: true,
      object: 'bottom', objectH: r(h * 0.33),
      logo: 'top-center', logoH: Math.max(12, r(h * 0.046)), logoTop: r(h * 0.04),
    };
  }
  if (shape === 'tall') {
    // 600×880: 왼쪽 43 · 로고 우상단(위 36, 오른쪽 34, 높이 33) · 서브 y163 30px(굵게) → 메인 52px 줄 간격 1.33(레퍼런스 실측) →
    // 75 띄고 상세 28px 줄 간격 1.57(라벨 굵게) · 이미지 아래 36~46%
    // 메인 줄 간격은 1.28을 쓴다(10-08 typo A2): Figma 9월 공채 디자이너 세로·정사각 메인 1.15~1.33(중앙 ≈1.25), 자소설 M팝업 템플릿 auto(≈1.2).
    //   레퍼런스 1.33은 그 띠의 위 끝이라 중앙 쪽으로 옮겼다 — 근거 둘(세아제강·한미 1.33 / 9월 공채 13장)이 어긋나면 사용자 확인
    return {
      shape, align: 'left', vAlign: 'top',
      padX: Math.max(14, r(w * 0.072)), padY: Math.max(14, r(w * 0.057)), top: r(h * 0.178),
      main: r(w * 0.087), mainLine: 1.28, mainLines: 3,
      sub: Math.max(10, r(w * 0.05)), subLine: 1.3, subWeight: 700, subAbove: true, gapSub: 0.29,
      detail: Math.max(10, r(w * 0.047)), detailLine: 1.57, gapDetail: 1.0, detailLabelBold: true,
      object: 'bottom', objectH: r(h * 0.42),
      logo: 'top-right', logoH: Math.max(14, r(w * 0.055)), logoTop: r(w * 0.06),
    };
  }
  // 정사각형에 가까운 것 — 세로형 문법을 짧은 변에 맞춰 줄인다. 가로가 넉넉하면(글자 칸 400px 이상) 이미지를 오른쪽에.
  const m = Math.min(w, h);
  const roomy = w - 2 * r(m * 0.072) - r(w * 0.42) >= 240;
  return {
    shape, align: 'left', vAlign: 'top',
    padX: Math.max(14, r(m * 0.072)), padY: Math.max(14, r(m * 0.06)), top: r(h * 0.15),
    main: r(m * 0.087), mainLine: 1.28, mainLines: 3,   // 세로형과 같은 1.28(A2)
    sub: Math.max(9, r(m * 0.05)), subLine: 1.3, subWeight: 700, subAbove: true, gapSub: 0.29,
    detail: Math.max(9, r(m * 0.047)), detailLine: 1.57, gapDetail: 0.95, detailLabelBold: true,
    object: roomy && w / h >= 1.15 ? 'right' : 'bottom', objectW: r(w * 0.42), objectH: r(h * 0.36),
    logo: 'top-right', logoH: Math.max(12, r(m * 0.055)), logoTop: r(m * 0.06),
  };
}
