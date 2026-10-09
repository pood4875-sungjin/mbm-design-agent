// 배너 조형 기준(canon) — 매체가 뭐든 배너는 배너다. 매체 가이드(core/media/<id>.json guide)가 없는 매체에 공통으로 적용하는
// "디자이너 습관"을 데이터로 적어 둔다. 우선순위: 매체 규정 > 매체 템플릿 실측 > 매체 가이드(guide) > 이 기준 > 레퍼런스 형태 문법(core/layouts.js).
//
// 근거: 보드 예시 141장(core/design/*.json 관찰) + 레퍼런스 13장(core/layouts.js) + 구글 예시 5곳 재현(2026-10-06).
//   여백: balanced 90 · airy 31 · tight 20 — 비어 보이는 예시는 없다. 글자가 짧으면 그림이 그 자리를 메운다.
//   메인 굵기: bold 110 · black 20 · medium 4 — 메인 700, 서브는 한 단계 가볍게, 상세는 "라벨 굵게 : 값 가늘게".
//   메인 줄 수: 580·970 예시 10/10이 "회사 / 채용구분" 두 줄 — 한 줄에 넣느라 글자가 작아지면 두 줄로.
//   정보: 예시는 글자 크기보다 정보를 먼저 지켰다(비씨월드 2줄 40px) — 사다리 위 문구가 75%까지 줄여서 들어가면 그쪽.
//   글자색: 밝은 지면의 메인은 브랜드색(일화 레드·동부 네이비·비씨 네이비·한미 블루 4/5), 어두운 지면은 흰색.
//   겹침: 글자가 그림 자리 위쪽(녹인 구간)으로 겹친다(일화 300×600 목록 vs 사진, 동부 목록 vs 일러스트).
// 매체 가이드가 같은 키를 정하면 그 값이 이긴다(구글: mainScale·padX·lightField·seasonInMain 등).

export const CANON = {
  canon: true,
  note: '배너 공통 조형 기준 — 매체 가이드가 없는 매체에 적용. 보드 예시 141장·레퍼런스 13장에서 읽음(2026-10-06)',
  // 글자수 표가 없는 매체의 문구 슬롯(구글처럼) — 표가 있으면 표가 정한다
  slots: ['sub', 'main', 'detail'],
  // 상세 줄 수 상한(라벨 줄 포함) — 모자라면 글자를 줄이고, 그래도 안 되면 뒤 항목부터 뺀다
  detailRows: { square: 4, wide: 3, tall: 5, tower: 7 },
  // 한 줄에 넣느라 작아지면 회사 뒤에서 두 줄로(10/10) · 사다리 위 문구가 75%까지 줄여서 들어가면 그쪽(정보 우선)
  twoLines: true,
  keepInfo: 0.75,
  // 밝은 지면의 메인은 브랜드색(4.5:1 넘을 때), 어두운 지면은 흰색
  textColour: 'brand',
  // 글자가 그림 자리 위쪽으로 겹쳐도 되는 비율(그림의 녹인 구간)
  objectOverlap: { tall: 0.3, tower: 0.15, square: 0.2 },
  // 채움: 글자 블록 아래 남는 높이가 지면의 12%를 넘으면 그림 자리가 자라서 메운다(최대 55%) — 비어 보이는 예시는 없다
  fill: { slack: 0.12, maxObject: 0.55, maxObjectTall: 0.64 },
  // 굵기 위계(10-09 「bold·semibold·medium으로 강약」) — 크고 중요한 것일수록 굵게. 이웃 단계는 100 이상 차이(메인 700 > 아이브로 600 > 슬로건·날짜 500 > 값 400).
  //   근거: Figma 9월 공채 28프레임(figma-sep-typo.md) — 메인 Bold 27/28 · 슬로건 Medium 2/2(카카오·에브리타임) · 날짜 500 3/5(700 2/5) ·
  //         브랜드 라벨·해시태그 칩·CTA SemiBold 600(GDN·인스타·블라인드) · 상세 라벨 700 + 값 400(자소설 3/3) · 보드 예시 메인 bold 110/141.
  //   accent(두 톤 강조)는 색만 바꾼다 — 굵기는 메인과 같다(디자이너 23/28 같은 Bold 노드 안 색 분리).
  //   매체 guide.weights가 정한 역할은 그 값이 이긴다(자소설 템플릿 실측: 메인 위 서브 「굵게」 700). 매체 값엔 아래 하한을 걸지 않는다.
  //   smallDark: 어두운 지면 위 14px 미만 글자는 500 밑으로 내리지 않는다(가는 흰 글자가 뭉개진다)
  weights: { main: 700, accent: 700, eyebrow: 600, slogan: 500, date: 500, tag: 600, detailLabel: 700, detailValue: 400, chip: 600, cta: 600, extra: 400, notice: 400, smallDark: { px: 14, min: 500 } },
  // ── 10-08 Figma 9월 공채(디자이너 13장) 비교에서 채택한 규칙 — 근거는 케이스 하나(sep-open-recruit), 예외가 나오면 조정(사용자 결정) ──
  // 단일 사물 누끼(kvtypes flags.single): 크게, 우하단으로 블리드. 디자이너 KV 면적 가로형 19~31%·정사각 25%·세로형 22~27%, 보임 63~86%(R·B로 잘림)
  //   maxCut: 잘려도 되는 몫(오브젝트의 30%까지 — 70% 이상 보임) · edges: 잘려도 되는 변(오른쪽·아래만) · core: 캔버스 안에 있어야 하는 주인공 상자 가운데 몫
  //   narrow: 폭 ≤ maxW인 세로형·세로 띠(글자가 그림 위)는 왼쪽·오른쪽 양쪽 + 아래로 흘린다 — 디자이너 GDN 300×600·300×1050 LRB 블리드(면적 24~27%). 오른쪽·아래만이면 300×1050이 12.5%에 그쳤다(10-08 밤 B2)
  //     좁은 띠에서 디자이너는 오브젝트의 66~69%만 보였고(가운데 1/3 폭) — 잘려도 되는 몫 35%, 캔버스 안에 둘 핵심부 = 주인공 상자 가운데 40%
  objectBleed: { maxCut: 0.3, edges: ['right', 'bottom'], core: 0.6, targetArea: { wide: [0.2, 0.3], square: [0.22, 0.27], tall: [0.22, 0.27], tower: [0.22, 0.27] }, minTextCol: 0.42, narrow: { maxW: 320, edges: ['left', 'right', 'bottom'], maxCut: 0.35, core: 0.4 } },
  // 로고는 메인보다 작게 — 폭 ≤ 메인 글자 크기 × 2.4 (디자이너 1.3~2.4, 중앙 1.9), 그리고 ≤ 캔버스 폭 × 12%(세로 띠 160·300 폭은 25%)
  logoCap: { perMainPx: 2.4, wRatio: 0.12, wRatioTower: 0.25 },
  // 가로형도 로고를 둔다(디자이너 6/6) — 기본 우상단 소형. 매체가 로고 0개(리멤버 count 0)면 생략
  wideLogo: 'top-right',
  // 채용 소재는 날짜를 버리지 않는다(디자이너 12/13, 인스타 보드 17/18) — 날짜 줄을 먼저 확보하고 메인을 줄인다
  required: { recruit: ['date'] },
  // 정사각 규격 메인 하한 = 짧은 변 × 0.067 (core/design/instagram.json mainSizeRatioRange 0.067~0.09 · 디자이너 1080에 91px)
  mainFloor: { square: 0.067 },
  // ── 10-08 Figma 9월 공채 타이포 비교(figma-sep-typo.md)에서 채택 ──
  // 메인 자간 −2.5%(em) — 디자이너 메인 17/27 노드가 −2~−3%(중앙 −3%). 작은 글자(28px 미만)는 0. 템플릿을 실측한 매체(자소설·에브리타임 0%)는 매체 guide에서 tracking.main 0
  tracking: { main: -0.025, mainMinPx: 28 },
  // 메인 두 톤 강조(옵션, 기본 꺼짐): 스타일에 강조색(style.accent)을 적어 줬고 지면 대비 4.5:1 이상일 때만 메인 속 채용구분을 그 색으로(디자이너 23/28). 색을 짐작하지 않는다. 자소설은 guide에서 끈다
  mainAccent: true,
};

// 매체 가이드 위에 공통 기준을 깐다 — 가이드가 정한 키가 이긴다
export function guideFor(medium) {
  return { ...CANON, ...(medium?.guide ?? {}) };
}

// 역할 → 글자 굵기. 우선순위: 매체 guide.weights(템플릿 실측) > CANON.weights. 모르는 역할은 400.
// CANON 값만 어두운 지면 작은 글자 하한(smallDark)을 받는다 — 매체가 실측으로 정한 값은 그대로 둔다
export function weightOf(role, { medium = null, fs = null, darkField = false } = {}) {
  const own = medium?.guide?.weights?.[role];
  if (Number.isFinite(own)) return own;
  const W = CANON.weights, v = Number.isFinite(W[role]) ? W[role] : 400;
  return darkField && fs != null && fs < W.smallDark.px ? Math.max(v, W.smallDark.min) : v;
}
