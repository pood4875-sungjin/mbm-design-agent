// 생성 파일 — 직접 고치지 말 것. 원본: ref/learned/rules.json, 빌드: node scripts/build-rules.mjs
// 장부 갱신 2026-10-16 · 가이드 검수 짝 58건
export const RULES_DATA = {
 "updated": "2026-10-16",
 "rules": [
  {
   "id": "cutout-contain",
   "rule": "누끼는 자리에 맞춰 넣는다. 자르지도 녹이지도 않는다. 투명 배경 규격에 그대로 나갈 수 있는 유일한 유형이다.",
   "value": "contain",
   "where": "core/kvtypes.js:9",
   "status": "active"
  },
  {
   "id": "cutout-wide-overflow",
   "rule": "가로로 긴 누끼(건물·3D 장면)는 오른쪽 열 높이에 맞추고 우하단에 붙여 지면 밖으로 조금 흘린다. 그보다 더 흘러야 하면 그냥 맞춰 넣는다(떼가 반 잘리면 안 된다).",
   "value": "폭 130%까지 지면 밖으로",
   "where": "core/kvtypes.js:11",
   "status": "active"
  },
  {
   "id": "cutout-square-band",
   "rule": "정사각 규격에서 가로로 긴 누끼 떼는 모서리 상자 대신 폭 전체 아래 띠에 둔다. 높이에 맞추고 좌우를 지면 밖으로 흘린다.",
   "value": "아래 띠 높이 30~55% · 허용 배율 ≤ 2.2",
   "where": "core/kvtypes.js:76",
   "status": "active"
  },
  {
   "id": "cutout-gap-window",
   "rule": "떼 누끼를 좁은 띠에 넣을 때 자르기 선은 캐릭터 사이 빈 열(틈)에서만 긋는다. 얼굴·몸통을 가르지 않는다. 틈이 없으면 통째로 맞춰 넣거나 가운데 맞춤.",
   "value": "틈 = 투명 ≥ 75% 열(60%는 얼굴을 갈랐다) · 틈 창 배율 1.15~2.4 · 틈 없으면 1.3~1.8 · 지면 높이 45% 목표",
   "where": "core/kvtypes.js:75",
   "status": "active"
  },
  {
   "id": "cutout-char-place",
   "rule": "캐릭터 누끼는 열에 세운다. 발은 바닥에, 머리는 자르지 않고 머리 위에 숨을 둔다. 자리가 낮으면 발부터 자른다. 가로형은 오른쪽 열 폭의 60~70%, 세로형은 아래 띠의 45~55%를 캐릭터에 준다.",
   "value": "머리 위 숨 4% · 모서리 상자 64%×72% · 세로형 72% · 자리가 주인공보다 30% 넘게 낮으면 발 자름",
   "where": "core/kvtypes.js:72",
   "status": "active"
  },
  {
   "id": "cutout-char-bleed-70",
   "rule": "캐릭터 하나는 지면 좌우 밖으로 흘려도 된다. 단 얼굴·몸통 중심은 보이게 한다. 꼬리·팔 끝·반짝이만 잘린다.",
   "value": "주인공 상자 가운데 70%는 보임",
   "where": "core/renderers/ad.js:942",
   "status": "active"
  },
  {
   "id": "frame-place",
   "rule": "장식 프레임(유리 슬랩)은 어두운 브랜드 지면 위에 크게 깐다. 오른쪽 끝을 기준으로 지면 폭보다 크게 잘라 바깥 슬랩이 오른쪽을 채우게 한다. 세로형은 아래에 둔다. 글자 쪽에 브랜드색 스크림. 작게 맞춰 넣으면 장난감처럼 보인다.",
   "value": "지면 폭 × 1.7 · 세로형 높이 ≥ 45%",
   "where": "core/renderers/ad.js:323",
   "status": "active"
  },
  {
   "id": "crowd-full",
   "rule": "현장·군중 사진은 자동으로 지면 전체에 깐다. 글자 쪽에서 시작하는 브랜드색 스크림에 한 단계 어둡힌 브랜드색을 한 겹 더 덮고 흰 글자. 한쪽 열에 잘라 녹이면 사람 머리가 조각나고 로고가 사진 위에 얹힌다. 「한쪽에 넣기」를 고르면 예전대로.",
   "value": "전체형 + 브랜드 스크림 + 어둡힌 브랜드색 55% 덮기",
   "where": "core/renderers/ad.js:329",
   "status": "active"
  },
  {
   "id": "texture-full",
   "rule": "질감 그림은 지면 전체에 깔고 글자만 올린다. 자르면 뜻 없는 색 조각이 된다. 모서리 상자에 같은 그림을 또 넣지 않는다. 오브젝트 상자·누끼 슬롯 매체에는 글자만.",
   "value": "가운데 맞춤 cover",
   "where": "core/renderers/ad.js:321",
   "status": "active"
  },
  {
   "id": "illust-head-keep",
   "rule": "가운데 맞춤이 캐릭터 머리를 조금이라도 자르면 머리 기준으로 옮기고 머리 위에 숨을 둔다. 발을 자른다.",
   "value": "머리 잘림 > 자리 폭 2% → 머리 기준 + 숨 4%",
   "where": "core/field.js:216",
   "status": "active"
  },
  {
   "id": "room-full",
   "rule": "배경형 그림은 캔버스 비율이 그림과 비슷하면 통째로 깔고 빈 자리에 글자를 둔다. 자리가 모자라면 윗변이 바탕일 때 그림을 아래로 밀어 글자 자리를 만든다. 띠·열에서는 주인공만 당겨 넣는다.",
   "value": "캔버스 비율 = 그림의 0.6~1.7배 · 글자 자리 최대 62%(정사각)·58%(가로형)",
   "where": "core/field.js:228",
   "status": "active"
  },
  {
   "id": "portrait-fit",
   "rule": "인물 사진의 아래 띠가 머리부터 턱까지 못 담으면 그림을 줄여 오른쪽에 붙이고 왼변·윗변을 녹인다. 머리는 절대 자르지 않는다.",
   "value": "머리~턱이 띠 높이의 94% 안 · 왼변 녹임은 색 거리로(hr-nurse 30 → 50%)",
   "where": "core/field.js:386",
   "status": "active"
  },
  {
   "id": "fill-slack",
   "rule": "글자 덩어리 아래가 비어 보이면 그림 자리가 자라서 메운다. 비어 보이는 예시는 없다.",
   "value": "남는 높이 > 지면 12% → 그림 자리 확대, 최대 55%(세로형 64%)",
   "where": "core/canon.js:28",
   "status": "active"
  },
  {
   "id": "object-overlap",
   "rule": "글자가 그림 자리의 위쪽(녹인 구간)으로 조금 겹쳐도 된다. 세로형이 가장 많이, 세로 띠가 가장 적게.",
   "value": "세로형 30% · 세로 띠 15% · 정사각 20% (구글 가이드 40 · 20 · 26)",
   "where": "core/canon.js:26",
   "status": "active"
  },
  {
   "id": "photo-logo-top-left",
   "rule": "사진이 오른쪽 열을 채우는 가로형에서는 로고를 글자 쪽 지면(좌상단)에 둔다. 사진 위에 얹힌 흰 로고는 밝은 벽·하늘에서 사라진다. 세로형 아래 띠는 로고가 지면 위라 그대로.",
   "value": "가로형·오른쪽 열 규격 → 로고 좌상단",
   "where": "core/renderers/ad.js:336",
   "status": "active"
  },
  {
   "id": "object-bleed",
   "rule": "단일 사물 누끼는 크게 놓고 오른쪽·아래로 지면 밖으로 흘린다. 사물의 70% 이상은 보이고 핵심부는 캔버스 안에 둔다. 글자 칸은 안쪽 폭의 42% 이상을 지킨다. 템플릿 틀의 그림 칸(자소설 mold.image) 안에서는 흘리지 않고 칸 안에 맞춰 넣는다(10-15 세아제강 팝업 그림 249×183@293,187 프레임 안).",
   "value": "잘림 ≤ 30%(오른쪽·아래만) · 핵심부 = 주인공 상자 가운데 60% · 목표 면적 가로형 20~30%, 정사각·세로형 22~27% · 틀 그림 칸 제외",
   "where": "core/canon.js:41",
   "status": "single-evidence"
  },
  {
   "id": "object-bleed-narrow",
   "rule": "좁은 세로형·세로 띠(글자가 그림 위에 오는 규격)에서는 사물을 왼쪽·오른쪽 양쪽과 아래로 흘리고 주인공 가운데를 지면 가운데에 둔다. 오른쪽·아래만 흘리면 면적이 절반밖에 안 된다.",
   "value": "폭 ≤ 320 · 잘림 ≤ 35% · 핵심부 40% · 면적 24~27%",
   "where": "core/canon.js:42",
   "status": "single-evidence"
  },
  {
   "id": "object-bleed-tower",
   "rule": "아주 좁은 세로 띠(알바몬 120×600·자소설 160×600)에서는 폭 맞춤 그림이 너무 작아 글자 아래가 빈다. 면적 목표를 올리고 좌우를 더 흘린다.",
   "value": "폭 ≤ 160 · 잘림 ≤ 42% · 핵심부 40% · 면적 28~34% · 틀 하단 칸(mold.image, 자소설 160×200·달력)에는 적용 안 함(10-19)",
   "where": "core/canon.js:44",
   "status": "active"
  },
  {
   "id": "bleed-cut-melt",
   "rule": "지면 밖으로 흘린 누끼가 가로 띠(320×50·400×76·728×90)에서 글자 열 왼변에 걸려 잘리면 그 변을 녹인다. 잘린 만큼 길게.",
   "value": "녹임 = 잘린 몫 + 8%, 16~30%",
   "where": "core/field.js:463",
   "status": "active"
  },
  {
   "id": "max-upscale",
   "rule": "작은 누끼를 크게 키우지 않는다. 원본의 1.5배까지만. 그 때문에 생긴 빈 띠는 그림 탓이라 참고로만 센다.",
   "value": "누끼 ≤ 원본 × 1.5",
   "where": "core/canon.js:85",
   "status": "active"
  },
  {
   "id": "kv-mood",
   "rule": "분위기 있는 그림 배경이 브랜드 지면색보다 먼저다. 브랜드는 로고·알약·강조색으로 드러낸다. 누끼는 원본 바탕색으로, 어두운 사진은 사진 변 색을 흰 글자가 읽힐 때까지 어둡혀 지면으로 쓴다(밝은 지면 매체 선호보다 먼저). 직접 고른 색·매체 규정은 여전히 이긴다.",
   "value": "어두운 사진 = 밝기 < 0.4 · 흰 글자 4.5:1 까지 어둡힘 · 누끼는 원본 바탕 팔레트가 있을 때만",
   "where": "core/canon.js:80",
   "status": "active"
  },
  {
   "id": "kv-mood-gradient",
   "rule": "글자 쪽 변이 채도 있는 그라데이션이면 브랜드색 대신 그 그라데이션을 지면으로 잇는다.",
   "value": "변 평균 채도 ≥ 0.5 · 양 끝 색 거리 ≥ 0.15",
   "where": "core/canon.js:80",
   "status": "single-evidence"
  },
  {
   "id": "text-colour-brand",
   "rule": "밝은 지면의 메인은 브랜드색, 어두운 지면은 흰색이다. 브랜드색이 지면과 충분히 대비될 때만.",
   "value": "브랜드색 4.5:1 넘을 때",
   "where": "core/canon.js:24",
   "status": "active"
  },
  {
   "id": "text-black-or-white",
   "rule": "본문 글자색은 순흑과 순백 둘 중 하나만 쓴다. 중간 회색은 인쇄·이메일에서 탁해진다.",
   "value": "#000000 / #FFFFFF",
   "where": "core/palette.js:62",
   "status": "active"
  },
  {
   "id": "vivid-white",
   "rule": "진한 초록·파랑·주황처럼 채도 높고 중간 밝기인 브랜드색 지면에는 흰 글자를 쓴다. 대비 수치만 재면 검정이 이기지만 흰색이 더 잘 보인다. 큰 글자가 읽히도록 지면을 같은 색 계열로 조금 어둡히고, 되면 작은 글자까지 어둡힌다. 노랑·파스텔은 그만큼 어둡혀도 안 되므로 검정 그대로.",
   "value": "채도 ≥ 0.45 · 휘도 0.1~0.42 · 명도 ≤ 0.62 · 큰 글자 3:1 을 명도 −0.12 안에서, 작은 글자 4.5:1 을 −0.14 안에서",
   "where": "core/canon.js:66",
   "status": "single-evidence"
  },
  {
   "id": "texture-calm",
   "rule": "질감을 전체에 깔았는데 글자 아래가 어지러우면(형태 가장자리가 뚜렷) 글자 쪽에서 지면 자기 색 스크림을 깐다. 기본은 아주 살짝, 어지러울수록 진하게. 회색이 아니라 밝은 질감은 흰 쪽, 어두운 질감은 검정 쪽 틴트.",
   "value": "어지러움 = max((퍼짐−20)/10, 날카로움/0.05) · 0.09 미만이면 없음 · 불투명 35~75% · 글자 칸 폭 75%까지",
   "where": "core/canon.js:75",
   "status": "single-evidence"
  },
  {
   "id": "photo-text-scrim",
   "rule": "사진 위 글자는 스크림 없이는 금지다. 사진 전체형은 글자 뒤 스크림이 필수. 어두운 사진은 스크림 없이도 되지만 대비를 확인한다.",
   "value": "4.5:1",
   "where": "core/kvtypes.js:43",
   "status": "active"
  },
  {
   "id": "small-dark-weight",
   "rule": "어두운 지면 위 작은 글자는 너무 가늘게 두지 않는다. 가는 흰 글자가 뭉개진다. 매체가 실측으로 정한 굵기는 그대로 둔다.",
   "value": "14px 미만 → 굵기 500 이상(자소설 13px 400 은 템플릿 실측이라 예외)",
   "where": "core/canon.js:35",
   "status": "active"
  },
  {
   "id": "melt-length",
   "rule": "그림을 지면에 녹이는 길이는 그림 변 색과 지면색의 차이에 비례한다. 색이 비슷하면 짧게, 밝은 그림을 어두운 지면에 붙이면 길게. 곡선은 양 끝이 모두 부드러워야 녹임의 끝이 선으로 읽히지 않는다. 오른쪽 열·아래 띠·템플릿 칸·모서리 상자 모두 같은 규칙.",
   "value": "그림 칸의 30~55% · 색 거리 0.45 에서 최대 · 부드러운 곡선 7마디(이전 4마디)",
   "where": "core/canon.js:70",
   "status": "active"
  },
  {
   "id": "melt-base",
   "rule": "녹임은 짧고 직선적이면 「급하게 끊긴」 느낌이 난다. 지면과 같은 색으로 이어지면 짧게, 아니면 길게. 처음은 천천히 뒤는 빠르게.",
   "value": "같은 색 18% · 다른 색 32%(이전 10%) — 10-12 이후 색 거리 규칙이 덮는다",
   "where": "core/renderers/ad.js:1166",
   "status": "active"
  },
  {
   "id": "weights",
   "rule": "크고 중요한 것일수록 굵다. 메인 Bold, 메인 위 서브 SemiBold, 슬로건·날짜 Medium, 상세 값 Regular. 칩·태그·CTA는 SemiBold, 상세 라벨은 Bold. 이웃 단계는 한 단계 이상 차이.",
   "value": "메인 700 · 강조 700 · 아이브로 600 · 슬로건 500 · 날짜 500 · 태그 600 · 상세 라벨 700 · 상세 값 400 · 칩 600 · CTA 600 · 부가·고지 400",
   "where": "core/canon.js:35",
   "status": "active"
  },
  {
   "id": "tracking",
   "rule": "메인 글자는 자간을 살짝 좁힌다. 작은 글자는 그대로. 템플릿을 실측한 매체(자소설·에브리타임)는 0.",
   "value": "메인 28px 이상 −2.5%(em)",
   "where": "core/canon.js:58",
   "status": "active"
  },
  {
   "id": "required-date",
   "rule": "채용 소재는 날짜를 버리지 않는다. 날짜 줄을 먼저 확보하고 메인을 줄인다. 쌓기 칸이 모자라면 날짜를 직무보다 먼저 넣는다.",
   "value": "줄 4 이상이면 날짜 → 직무",
   "where": "core/canon.js:53",
   "status": "active"
  },
  {
   "id": "main-floor-square",
   "rule": "정사각 규격의 메인은 짧은 변의 일정 비율보다 작아지지 않는다. 인스타 메인이 보드 관찰값의 절반이었다.",
   "value": "짧은 변 × 0.067(1080 → 72px 이상)",
   "where": "core/canon.js:55",
   "status": "active"
  },
  {
   "id": "main-overflow",
   "rule": "회사명이 길어 메인이 줄 수 상한을 넘으면 「…」으로 잘리지 않게 어절 단위로 미리 어림한다. 정보 우선 범위까지 글자를 줄이고, 그래도 넘으면 회사 뒤에서 두 줄로 나눈다.",
   "value": "줄 수 어림 · 75%까지 축소",
   "where": "core/renderers/ad.js:1030",
   "status": "active"
  },
  {
   "id": "layout-shape-sizes",
   "rule": "형태마다 글자 크기의 기준이 다르다. 가로형은 가로×세로의 제곱근에 비례, 세로형·세로 띠는 폭에 비례. 레퍼런스를 픽셀로 잰 값이다.",
   "value": "가로형 PC 0.056 · MO 0.09 · 세로형 폭 8.7% · 세로 띠 폭 15% · 정사각 짧은 변 8.7%",
   "where": "core/layouts.js:11",
   "status": "active"
  },
  {
   "id": "logo-cap",
   "rule": "로고는 메인 글자보다 작게. 폭이 메인 글자 크기의 몇 배와 캔버스 폭의 일정 비율 중 작은 값을 넘지 않는다. 템플릿 틀(자소설 mold)의 로고 칸은 칸이 크기라 상한을 걸지 않는다(10-15 — 세아제강 로고 143×23 이 150×31 칸을 채운다).",
   "value": "폭 ≤ 메인 px × 2.4 · ≤ 캔버스 폭 12%(세로 띠 폭 ≤ 320 은 25%) · 틀 로고 칸 제외",
   "where": "core/canon.js:45",
   "status": "active"
  },
  {
   "id": "wide-logo",
   "rule": "가로형에도 로고를 둔다. 기본은 우상단 소형. 매체가 로고를 금하면(리멤버) 생략.",
   "value": "우상단 · 높이 = 지면 높이 6~8%",
   "where": "core/canon.js:51",
   "status": "active"
  },
  {
   "id": "logo-mono",
   "rule": "로고는 지면에 맞춰 단색으로 바꾼다. 어두운 지면에 원색 로고만 있으면 흰색, 밝은 지면에 흰 로고만 있으면 검정. 투명 배경 로고라면 실루엣이 그대로 살아 디자이너의 단색 변환과 같다.",
   "value": "어두운 지면 → 흰 · 밝은 지면 흰 로고 → 검정",
   "where": "core/renderers/ad.js:548",
   "status": "active"
  },
  {
   "id": "logo-tile",
   "rule": "타일 로고(둥근 모서리 앱 아이콘처럼 색 타일이 로고의 판)는 단색으로 바꾸지 않는다. 반전하면 흰 네모가 된다.",
   "value": "불투명이 트림 상자의 85% 이상",
   "where": "core/renderers/ad.js:550",
   "status": "active"
  },
  {
   "id": "logo-clash",
   "rule": "로고 색이 지면 색과 같으면(주황 로고 × 주황 지면) 원색 대신 글자색 단색으로. 브랜드색이 곧 지면색이라 흔한 경우다. 로고 대표색 중 지면과 대비가 낮은 색이 로고 면적의 절반 이상일 때.",
   "value": "대비 < 1.6 인 색이 면적 ≥ 50% → 검정 단색",
   "where": "core/canon.js:49",
   "status": "active"
  },
  {
   "id": "logo-google",
   "rule": "구글 가이드 규격의 로고 크기는 지면 높이와 폭의 비율로 정한다.",
   "value": "높이 7.5% · 폭 ≤ 30%",
   "where": "core/media/google-gdn.json:525",
   "status": "active"
  },
  {
   "id": "jasoseol-typo",
   "rule": "자소설은 메인 자간 0 이고 두 톤 강조를 쓰지 않는다.",
   "value": "자간 0 · 강조 끔",
   "where": "core/media/jasoseol.json:1115",
   "status": "active"
  },
  {
   "id": "everytime-tracking",
   "rule": "에브리타임은 메인 자간 0 이다.",
   "value": "자간 0",
   "where": "core/media/everytime.json:807",
   "status": "active"
  },
  {
   "id": "google-main-px",
   "rule": "구글은 규격이 작아져도 메인 글자를 비례로 줄이지 않는다. 「글자 크고 굵게」. 예시에서 역산한 px 띠를 지킨다.",
   "value": "메인 24~44px · 상세 13~15px · 서브 ≤ 20px",
   "where": "core/media/google-gdn.json:510",
   "status": "active"
  },
  {
   "id": "media-weights-win",
   "rule": "매체가 템플릿을 실측해 정한 굵기·자간은 공통 기준보다 먼저다. 공통 기준의 하한은 매체 값에 걸지 않는다.",
   "value": "매체 guide > 공통 기준",
   "where": "core/canon.js:95",
   "status": "active"
  },
  {
   "id": "check-text-over-subject",
   "rule": "글자가 주인공 위로 올라가면 경고. 글자는 요소 상자가 아니라 실제 글줄로 잰다.",
   "value": "겹침 ≥ 15%",
   "where": "core/adcheck.js:88",
   "status": "active"
  },
  {
   "id": "check-logo-covered",
   "rule": "주인공이 로고를 가리면 경고.",
   "value": "가림 > 5%",
   "where": "core/adcheck.js:94",
   "status": "active"
  },
  {
   "id": "check-hard-cut",
   "rule": "주인공이 그림 상자 변에서 잘리는데 그 변이 지면 안쪽이고 녹임이 없으면 경고. 둥근 상자(카카오 썸네일)는 상자가 의도라 제외.",
   "value": "녹임 없음 + 지면 안쪽 변",
   "where": "core/adcheck.js:97",
   "status": "active"
  },
  {
   "id": "check-empty-band",
   "rule": "글자도 그림도 로고도 없는 가로 띠가 너무 크면 경고. 가운데 구멍과 위아래 가장자리 여백을 다르게 본다. 그림이 지면 전체이거나 로고 전용 규격이면 제외. 템플릿이 칸을 고정한 규격과 작은 누끼 상한 때문에 생긴 빈 띠는 참고로만.",
   "value": "가운데 > 28% · 가장자리 > 36% · 높이 150 이상 규격",
   "where": "core/adcheck.js:107",
   "status": "active"
  },
  {
   "id": "check-text-clipped",
   "rule": "글자가 지면 밖으로 나가거나 잘리면 경고. 줄 수 상한에 걸려 「…」으로 잘린 것도 잘림이다.",
   "value": "세로 넘침 > 반 줄",
   "where": "core/adcheck.js:123",
   "status": "active"
  },
  {
   "id": "check-pill-overflow",
   "rule": "라벨 알약이 지면 오른쪽 밖으로 나가면 경고.",
   "value": "오른쪽 넘침",
   "where": "core/adcheck.js:132",
   "status": "active"
  },
  {
   "id": "place-text-zone",
   "rule": "글자 덩어리는 레이아웃이 글자에 비워 둔 칸 안에 둔다 — 키비주얼 반대쪽 열(가로형·정사각 오른쪽 열이면 왼쪽), 아래 띠면 띠 위(그림 녹인 구간 겹침 몫까지), 배경형이면 그림 빈 자리, 우하단 그림 상자면 주인공 위 전폭 + 주인공 왼쪽 열(ㄱ자). 프리셋(위치·정렬)이 바꾼 칸을 따른다.",
   "value": "글자 요소마다 칸 안 · 허용 4%(최소 8px) · ㄱ자는 주인공 외곽 네모와 35% 이하 겹침 허용",
   "where": "core/guidecheck.js:158",
   "status": "active"
  },
  {
   "id": "place-text-align",
   "rule": "글자 덩어리의 시작선은 자동 배치의 여백 선 — 왼쪽 정렬은 왼쪽 여백, 가운데 정렬은 가운데 선, 아래 띠 규격은 위 여백까지.",
   "value": "±6px 또는 1.5%(큰 쪽) · 잉크 곁 여백 ≤ 4px(92케이스 실측)",
   "where": "core/guidecheck.js:170",
   "status": "active"
  },
  {
   "id": "place-manual-drift",
   "rule": "직접 수정(끌어 옮기기·화살표)이 자동 배치에서 크게 벗어나면 가이드 배치 이탈로 알린다 — 칸 규칙이 느슨한 규격(ㄱ자·전폭 열)에서도 의미 있는 이동은 드러나게. 의도면 넘기기에 이유.",
   "value": "글자·키비주얼·로고 각각 가로·세로 이동 ≤ 6%",
   "where": "core/guidecheck.js:179",
   "status": "active"
  },
  {
   "id": "place-logo-slot",
   "rule": "로고는 자동 배치가 정한 자리(기본 우상단, 사진 열·배경형 주인공 쪽이면 좌상단, 매체 로고 칸)에 — 다른 모서리로 옮기거나 멀리 떼지 않는다.",
   "value": "모서리 3×3(가로 40/60%·세로 40/60%) 같음 + 자동 자리에서 4%(최소 8px) 안",
   "where": "core/guidecheck.js:308",
   "status": "active"
  },
  {
   "id": "place-recommended-margin",
   "rule": "매체가 안전영역을 숫자로 정하지 않은 규격은 글자·로고를 가장자리에서 짧은 변의 4% 이상 띄운다(권장 여백, 경고 수준).",
   "value": "≥ 짧은 변 × 4%(편집기 safeRect 와 같은 값)",
   "where": "core/guidecheck.js:316",
   "status": "active"
  },
  {
   "id": "cutout-bust",
   "rule": "서 있는 전신 인물·캐릭터 누끼는 상반신(머리~허리)으로 쓴다. 상자에 통째로 맞추면 키에 맞춰 작아져 얼굴이 점만 해진다. 머리 위에 숨을 두고 허리 아래는 지면 밖으로 흘린다. 상자 아랫변이 지면 안쪽이면 아래를 녹인다. 세로로 긴 지면(세로 띠·스토리)은 전신 그대로.",
   "value": "그림 비율 < 0.6 · 보이는 몫 55% · 머리 위 숨 3% · 폭 ≤ 상자 × 0.8 · 지면 폭/높이 ≥ 0.7 · 안쪽 상자는 72%부터 녹임",
   "where": "core/renderers/ad.js:187",
   "status": "single-evidence"
  }
 ]
};
