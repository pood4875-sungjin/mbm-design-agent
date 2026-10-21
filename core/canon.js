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
  // 배경 금지색 검사(bg-banned) — 리멤버 PDF p.8 금지 5색, ±12 는 #F7F7F0↔#FFFFFF 가 서로 안 덮이는 폭 / grid 는 바탕 샘플 격자(가장자리 6%) / boxPad 는 글자·로고·그림 상자 둘레 여유 px
  bgBanned: { tol: 12, grid: [0.06, 0.5, 0.94], boxPad: 4 },
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
  objectBleed: { maxCut: 0.3, edges: ['right', 'bottom'], core: 0.6, targetArea: { wide: [0.2, 0.3], square: [0.22, 0.27], tall: [0.22, 0.27], tower: [0.22, 0.27] }, minTextCol: 0.42, narrow: { maxW: 320, edges: ['left', 'right', 'bottom'], maxCut: 0.35, core: 0.4 },
    // 10-12 남은 문제: 아주 좁은 세로 띠(폭 ≤ 160 — 알바몬 120×600·자소설 160×600)는 폭 맞춤 그림이 지면의 15~20%라 글자 아래가 빈다(빈 띠 30~43%). 면적 목표를 올리고 좌우를 더 흘린다
    tower: { maxW: 160, maxCut: 0.42, core: 0.4, targetArea: { tower: [0.28, 0.34], tall: [0.28, 0.34] } } },
  // 로고는 메인보다 작게 — 폭 ≤ 메인 글자 크기 × 2.4 (디자이너 1.3~2.4, 중앙 1.9), 그리고 ≤ 캔버스 폭 × 12%(세로 띠 160·300 폭은 25%)
  logoCap: { perMainPx: 2.4, wRatio: 0.12, wRatioTower: 0.25 },
  // 로고 색 = 지면 색이면 단색으로(10-12 데스크탑 desk-37: 주황 로고(동부건설) × 주황 지면(브랜드색 #E86800) 카카오 1200×600 — 로고가 지면에 녹아 안 보였다).
  //   로고 대표색(core/logo.js logoMeta.colors) 중 지면과 대비 < minContrast 인 색이 로고 불투명 면적의 share 이상이면, 원색 대신 글자색 단색(밝은 지면 검정)으로.
  //   브랜드색이 곧 지면색이라 원색 로고가 지면과 같은 색인 경우가 흔하다 — 디자이너는 이때 로고를 단색(글자색)으로 쓴다(어두운 지면 흰 단색과 같은 관례, 10-06 사용자 결정)
  logoClash: { minContrast: 1.6, share: 0.5 },
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
  // ── 10-12 사용자 피드백 묶음(history/2026-10-12_흰글자_그라데이션_이음.md) ──
  // 채도 높은 브랜드·그림 지면에는 흰 글자(10-12 desk-12 세방 초록 #2EBA56: 대비만 재면 검정 8:1 > 흰 2.5:1이라 검정이 이겼다 — 사용자 「흰색이 더 잘 보일 것 같아」).
  //   지면 모든 색이 HSL 채도 ≥ minSat 이고 상대 휘도가 minLum~maxLum, HSL 명도 ≤ maxL(파스텔 제외 — desk-03-cut 라벤더는 검정 유지)이면, 같은 색상(hue)으로 명도만 내려(브랜드 딥과 같은 방식)
  //   흰 큰 글자 minContrastLarge(3:1)에 닿는지 본다 — maxDL(HSL 명도 0.12) 안에서 못 닿으면(노랑 #F8C808: 0.14 필요) 검정 그대로. 탁해지지 않게 상한을 둔다.
  //   닿으면 작은 글자 smallMin(4.5:1)까지 smallMaxDL 안에서 더 내린다. 그림 변에서 읽은 지면(kv-edge)이면 그림도 같은 비율로 어둡혀(brightness) 이음매를 지킨다
  vividWhite: { minSat: 0.45, minLum: 0.1, maxLum: 0.42, maxL: 0.62, minContrastLarge: 3, smallMin: 4.5, maxDL: 0.12, smallMaxDL: 0.14, step: 0.01, dimKv: true, dimMin: 0.94 },
  // 녹임(그림 → 지면) 길이와 곡선 — 그림 변 색과 지면색의 거리(colorDistance)에 비례해 min~max(그림 칸·띠 길이의 몫), fullAt 거리에서 max.
  //   10-12 desk-15(한국산업단지공단 파랑→복숭아 그라데이션)·GC녹십자(밝은 3D × 네이비): 「뚝 끊기는 느낌」. 곡선은 smoothstep 여러 마디(직선 끝이 선으로 읽힌다)
  //   bridgeFrom·bridgeMax: 브랜드 지면이 그림 변과 멀면(≥ bridgeFrom) 지면의 이음매 쪽 끝을 그림 변 색 쪽으로 최대 bridgeMax 만큼(흰 글자 4.5:1 안에서) 당긴다(GC녹십자 1080)
  //   bridgeMinLum: 그림이 이만큼 밝을 때만 당긴다(10-14 t1014 한진 어두운 빌딩 사진 0.40 — 남색이 청록 회색으로 탁해짐, GC녹십자 밝은 사진 0.71 은 그대로)
  //   seamInside(10-20 키비주얼 이음 전수 감사): 덮어 자른 자리(cover·주인공 당김)의 글자 쪽 변은 그림 한가운데를 지난다 — 그 변의 색을 그림 「변 색」으로 보면 한샘 사진(변 갈색·속 크림)이 지면과 같은 색으로 읽혀 35% 에 머물렀다(cut-short 107케이스 전수).
  //     보이는 변이 그림 변이 아니고(frac > edgeTol) 걸린 열·행이 바탕 줄(bg ≥ bgQuiet)도 아니면 그림 속 색(걸린 줄 + 대표색 dominant 개 + 그 변 쪽 사분면 색) 중 지면과 가장 먼 색으로 길이를 잰다. 그린 뒤 후처리(ad.js meltFix)라 모든 배치 경로에 같이 걸린다 — 짧아지는 쪽으로는 안 바꾼다
  melt: { min: 0.30, max: 0.55, fullAt: 0.45, ease: 'smoothstep', stops: 7, bridgeFrom: 0.35, bridgeMax: 0.6, bridgeMinLum: 0.55, seamInside: { edgeTol: 0.02, bgQuiet: 0.85, dominant: 3 } },
  // 질감 전체 깔기에서 글자 아래가 어지러우면(형태 가장자리가 뚜렷) 글자 쪽에서 지면 자기 색 스크림을 깐다 — 「아주 살짝」이 기본, 어지러울수록 진하게.
  //   10-12 desk-23 제주항공(알약 가장자리 뚜렷 「비주얼이랑 텍스트 너무 겹쳐」) · desk-02 대한항공(「글씨 영역 쪽만 아주 살짝 오퍼」).
  //   busy = max((texture.spread − spreadMin) / (spreadFull − spreadMin), texture.sharp / sharpFull) 를 0~1로 · busyMin 미만이면 스크림 없음(hdot-wave 0.01·hdot-purple3d 0.08은 그대로, desk-02 0.10부터)
  //   불투명 = scrimMin + (scrimMax − scrimMin) × busy (글자 쪽 끝) → 0(글자 칸 폭의 reach 몫). 색은 지면 자기 색(밝은 질감은 흰 쪽, 어두운 질감은 검정 쪽으로 섞은 틴트) — 회색 아님
  textureCalm: { busyMin: 0.09, spreadMin: 20, spreadFull: 30, sharpFull: 0.05, scrimMin: 0.35, scrimMax: 0.75, reach: 0.75, tintMix: 0.45 },
  // 분위기 있는 KV 배경 > 브랜드 지면색(10-12 사용자 desk-03 딜로이트·desk-37 동부·desk-04 기아·desk-05 KB·desk-36 GC). 브랜드는 로고·알약·강조색으로 드러낸다. 매체 규정·색 금지는 여전히 이긴다.
  //   darkPhotoLum: 어두운 사진(lum < 이 값)은 지면도 어둡게 — 사진 글자 쪽 변 색을 흰 글자 4.5:1까지 같은 색상으로 내린 것(밝은 지면 매체 선호도 양보, 「차라리 어두운 배경이 나음」)
  //   minSat·minGrad: 글자 쪽 변이 채도 있는 그라데이션(평균 HSL 채도 ≥ minSat, 양 끝 거리 ≥ minGrad)이면 그 그라데이션을 지면으로 잇는다(기아 라벤더→파랑, GC 민트→파랑)
  //   누끼는 원본 바탕 팔레트(kvMeta.bgPalette — 케이스 장부가 kv-orig 에서 잰다)가 있으면 그 색으로. 앱에서 누끼만 올리면(원본 없음) 지금처럼 브랜드 규칙
  kvMood: { darkPhotoLum: 0.4, darkMin: 4.5, minSat: 0.5, minGrad: 0.15 },
  // 지면은 비주얼이 우선(10-16 사용자 「배경색은 비주얼에 어울리게 뽑아야 — 비주얼이 우선」): 이음매(kv-edge)·분위기(kv-mood)가 없는 사진·누끼도 브랜드색이 아니라 그림 색에서 —
  //   사진은 글자 쪽 변 색(photoFrom edge), 누끼는 대표색(cutoutFrom dominant). 어두운 지면 매체는 그 색을 흰 글자 4.5:1 까지 어둡힌 같은 색상(brandDeep), 밝은 지면 매체는 옅은 틴트(tint)→흰색.
  //   브랜드색은 포인트(칩·날짜 상자·강조)에만. 채도가 아주 낮은 그림(무채)은 그대로 회색 계열
  //   10-16 오후 사용자 「배경은 기본적으로 화이트 계열 말고 — 규정 없으면 키비주얼 컬러에서 좀 화사하게 따오고 글자는 흰색. 그게 어려운 비주얼이나 안 묻을 때만 밝은 톤」:
  //   화사하게 = HSL 채도를 sat 이상으로 올리고 명도를 lMin~lMax 로 — 그 뒤 흰 글자 4.5:1 이 될 때까지만 어둡힌다(brandDeep 처럼 탁하게 가라앉히지 않는다).
  //   후보 색(사진: 글자 쪽 변 → 대표색 → 팔레트 / 누끼: 대표색 → 팔레트 → 변) 중 채도 ≥ minSat 인 첫 색. 전부 무채(회색·베이지)면 「안 묻는」 그림 → 그때만 옅은 틴트 + 검정 글자(tint)
  //   prefSat: 첫 후보 채도가 이 값 이상이면 그대로, 아니면 후보 중 가장 채도 높은 색(ABL 베이지 → 복숭아, 동부 크림 → 주황, 유리 행성 청회색 → 청록)
  // 글자색 기본(10-19 사용자 「규칙 있는 애들 제외하고 타이틀 #333/#fff, 서브텍스트 오퍼시티 0.7」): 글자색 규정(textColors.main)·규정 매체(fonts.required: 자소설·리멤버·카카오)가 아니면 메인은 밝은 지면 #333 / 어두운 지면 #fff, 서브·날짜·상세는 같은 색 70%
  textDefault: { light: '#333333', dark: '#FFFFFF', subOpacity: 0.7 },
  // 글자색 흑/백 판정(10-20 사용자 「이 수준이면 화이트 폰트가 맞아」 — 중간 밝기 파랑 지면에 회색 글자가 묻힘): 지면 상대휘도가 darkIfLum 이상(파스텔·흰 계열)일 때만 검정, 그 외 색 있는 지면은 대비가 3:1 에 못 미쳐도 흰색(실제 소재 관례). 손 지정 색(manual)도 같은 규칙
  textOn: { darkIfLum: 0.45 },   // .45: 연보라 #C7AEFF(.49)·복숭아는 검정, 중간 파랑 #6AA7F2(.37)·주황 #F07020(.37)·초록 #2EBA56(.38)은 흰색
  // 레이아웃 안(10-20 2단계 「여러 레이아웃 생성 → 선택 → 추출」): 안 = 편집 프리셋 조합. 규정 매체(fonts.required)는 1(정답 하나), 등급 C(자유)는 free, 그 외 default.
  //   후보는 CANDIDATE_ORDER 순서로 렌더해 프리셋이 안 먹거나(ignored) 겹침 교정이 실패하거나 그림이 같으면 버린다 — 「많이」가 아니라 「쓸 수 있는 안만」
  variants: { regulated: 1, default: 3, free: 5, maxRender: 14 },
  kvHarmony: { photoFrom: 'edge', cutoutFrom: 'dominant', tint: 0.78, minSat: 0.18, prefSat: 0.4, sat: 0.7, lMin: 0.34, lMax: 0.5 },   // 10-19 사용자: 「흰 글자 그대로, 채도만 더 올려 화사하게(명도 그대로)」 sat .55 → .7
  // 누끼는 명확할 때만(10-12 사용자 「명확할 때만 누끼, 웬만하면 배경 분위기도 살려」 desk-37·desk-03) — 바탕 색감(chroma 평균) < chromaMax 이고
  //   그라데이션 세기 < gradMax 이면(흰·연회색·무채 단색) 딴다. 넘으면 원본이 주 KV(scripts/kv-cutout.py --auto, cases.mjs bgpalette 가 같은 수치)
  cutoutAuto: { chromaMax: 0.12, gradMax: 0.15 },
  // 작은 누끼를 크게 키우지 않는다 — 원본 픽셀의 maxUpscale 배까지(10-12 desk-37-cut 163px이 1005×360에서 계단). 넘으면 작게 둔다(참고 경고 low-res)
  maxUpscale: { cutout: 1.5 },
  // ── 10-14 t1014 테스트 예시(10개 고객사 디자이너 산출물 54장 대조, ref/learned/cases/_out/t1014-report.md) ──
  // 벡터 그림 판정(GS에너지 2026 svg 장면): 평평한 변 하나 · 주인공 못 가름이면 사진으로 보던 것을, 이웃 픽셀 같은 색 몫(palette flatFillOf) ≥ 이 값이면 일러스트로 둔다.
  //   장부 사진 최대 0.782(desk-19, 평평한 변 0이라 이 갈래 밖) · gs2026 0.824 — 근거 1건
  flatVector: 0.8,
  // 누끼 사람 떼(맞닿아 틈 열이 없는 떼): 윗선 봉우리 ≥ peaks 이고 가로로 넓으면(비율 ≥ minAr) 떼(ABL 6명 어깨동무 봉우리 7 · 장부 단일 사물 최대 3, 장식 프레임 5~7은 frame 이 먼저)
  crowdPeaks: { peaks: 5, minAr: 1.3 },
  // 전신 인물·캐릭터 누끼 → 상반신(동서식품 디자이너 9/9 머리~허리 · 바이오노트 개 1/1 머리~가슴): 그림 비율 < maxAr(0.6 — 동서식품 전신 0.42·바이오노트 앉은 개 0.59 는 들고, 이미 허리 위인 연사 hdot-speaker-b 0.62·세로로 긴 3D 사물 desk-03-cut 0.63 은 뺀다) 인 세로로 선 누끼는 위 vis 몫만 있는 그림으로 배치하고,
  //   그린 뒤 머리 위 숨 top(상자 높이 몫)을 두고 아래를 흘린다. 폭은 상자 폭의 widen 배까지(0.8 — 1.05 로 두니 인스타 정사각에서 상세 줄이 어깨 위로 겹쳤다: desk-03-cut·hdot-speaker-b·동서식품 17~29%).
  //   minCanvasAr: 지면 비율(폭/높이)이 이보다 작으면(세로 띠·스토리·320×480) 전신 그대로 · fadeFrom: 상자 아랫변이 지면 안쪽이면 그 높이(%)부터 아래로 녹인다
  bust: { maxAr: 0.6, vis: 0.55, top: 0.03, widen: 0.8, minCanvasAr: 0.7, fadeFrom: 72 },
  // 끊김 녹임(10-19 사용자 「그라데이션으로 옅게 처리하던지 해 줘. 끊기는 건. 네이버도 마찬가지」): 그림이 상자 변에서 뚝 잘리면 그 변을 지면으로 녹인다.
  //   누끼 = 그림이 상자(지면) 밖으로 넘친 변(구글 300×600 좌우·당근 아래·에브리타임 우하단) · 사진·바탕 일러스트 = 상자 변이 지면 안쪽에 있는 변(네이버 DA 사진 칸 오른쪽·아래 — 지면 변에 붙은 변은 자연스러운 끝)
  //   길이(상자 변 길이의 %) = 잘린 몫×2 + base, min~max · 사진 안쪽 변은 photo · 템플릿이 여백을 정한 변(mold.image.edgeInset)·둥근 상자·지면 전체 그림은 제외
  //   10-21 사용자 「너무 조금 보여… 좌·하단을 보이는 게 낫지 않나」(자소설 PC팝업 550×400 틀 그림 칸 249×183 에 방 사진: 왼쪽 39~50 + 오른쪽 42~53 + 아래 55% 가 색 차로 다 늘어나 그림 가운데 조각만 남았다):
  //     insetFixed — 템플릿이 여백을 적어 둔 변(mold.image.edgeInset — 자소설 PC팝업 오른쪽 8·아래 30)은 그 너머가 좁은 지면색 띠뿐이라 색 차로 늘리지 않고 photo(28%) 고정
  //     keep — 한 축의 양쪽 녹임 합이 상자 길이의 (1−keep) 를 넘으면 그만큼 줄여 가운데 keep(40%)은 늘 또렷하게 남긴다. 줄이는 순서: 글자 쪽 녹임을 CANON.melt.min(30%)까지 → 그래도 넘치면 잘린 변 녹임을 min(10%)까지.
  //     한쪽만 녹이는 칸(구글 580 모서리 칸 왼 55%·인스타 1080 틀 칸 위 55%)은 예산 안이라 그대로
  cutFade: { base: 8, k: 2, min: 10, max: 36, photo: 28, minGap: 2, insetFixed: true, keep: 0.4 },
  // 겹침 교정 사다리(10-19 사용자 「키비주얼과 텍스트가 겹쳐서 텍스트가 안 보일 땐 텍스트를 줄이던지 띄어쓰던지 키비주얼 위치를 조정」): 글자 행 × 주인공 상자 겹침이 문턱(검수와 같음: 캐릭터·인물 2%, 그 외 15%)을 넘으면
  //   ① 글자 배율 textSteps(바닥 textFloor, 규정 매체 틀은 textFloorRegulated) ② 메인 두 줄 ③ 키비주얼 배율 kvSteps 순으로 다시 그려 처음 문턱 아래를 쓴다
  overlapFix: { character: 0.02, other: 0.15, textSteps: [0.92, 0.84, 0.75], textFloor: 0.75, textFloorRegulated: 0.85, kvSteps: [0.85, 0.7], cellOpaque: 0.3 },
  // 빈 지면 보정 사다리(10-21 사용자 「이런 경우 키비주얼이 꽤 크게 들어가야 비어 보이지 않고 임팩트」 — 파란 바탕 발광 큐브(pin-glow-cube)가 구글 580·NAP 300×250 모서리 칸에서 지면의 8~12%):
  //   그린 뒤 글자 행(TR.textBox) ∪ 그림 주인공(focus·열행 프로필 상자 ∩ 그림 상자) 이 지면을 덮는 몫(coverage)이 min 미만이면 키비주얼 배율 steps 순으로 다시 그려 처음 min 에 닿는 것을 쓴다.
  //   문턱 근거: 10-21 탐침(107케이스 × 추출 규격) — 구글 580 디자이너형(사진 slotCover·단일 누끼 objectBleed) .34~.37, 그라데이션 바탕 일러스트 contain .10~.18, 전체 p50 .27. 겹침 교정(overlapFix)이 이미 손댄 그림, 문턱을 넘긴 겹침(overlapFix 문턱)이 생기는 단계, 커지지 않는 단계에서 멈춘다.
  //   틀 그림 칸은 지면 변에 닿은 변을 두고 글자 쪽으로만 키운다(slotCap — 모서리 칸 지면의 80%, 아래 띠는 fill.maxObject). 둥근 칸·bleed:false 칸·로고 칸·규정 매체 틀도 키운다(regulated:true — 10-21 사용자 결정, 처음엔 false 로 두고 확인받음). 편집 「키비주얼 크기」를 손으로 정했으면 안 건드린다. 지면 높이 < minH(띠)는 제외
  emptyFix: { min: 0.3, steps: [1.25, 1.5, 1.8, 2.2], minH: 70, slotCap: 0.8, regulated: true },   // regulated: 10-21 사용자 「자소설·리멤버 1단계 틀에도 켜 줘」 — 샘플 칸은 상한·닿은 변 규칙 안에서 커진다
  // 밝은 난색 브랜드(주황·노랑·연두 — HSL 색상 hueMin~hueMax, 흰 글자 대비 < maxWhiteContrast)는 어둡히면 갈색·올리브가 된다 — 사진·누끼 지면을 브랜드 딥 대신
  //   브랜드 틴트(mix(브랜드, 흰색, tint) → 흰색)로 두고 글자는 검정, 브랜드색은 로고·강조에(동서식품 #FFC000 디자이너 9/9 크림 지면 · 바이오노트 #F67E06 인스타 V2 밝은 회색 지면).
  //   초록(#2EBA56 desk-12, 색상 0.38)은 범위 밖 — 10-12 「채도 지면 흰 글자」 그대로
  warmLightBrand: { hueMin: 0.055, hueMax: 0.305, maxWhiteContrast: 3, tint: 0.82 },
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
