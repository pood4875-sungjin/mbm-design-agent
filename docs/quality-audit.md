# 종합 품질 점수표 (quality-audit)

- 생성: `node scripts/quality-audit.mjs --tag after` · 2026-10-20 11:23 · 케이스 107 × 규격 49(추출 규격 중 전달물 제외) = 5243 · 측정 4387 · 제외 856(로고만 규격 856) · 418초
- 한 줄 = 케이스 × 규격. 축마다 ✗/✓/–(해당 없음). 규격 하나가 한 축이라도 ✗ 면 ✗ 규격으로 센다.
  - **① 가이드 준수** `core/guidecheck.js` 규칙(장부 `ref/learned/rules.json` 문장 적용) ✗ — 검수 규칙 `check.*` 는 ③④로 보내고 여기선 뺀다 + 매체 규정 검사 block(`core/lint.js` + `scripts/lib/lint-extra.mjs`, cases-lint 와 같은 측정)
  - **② 여백** `scripts/lib/kv-gap.mjs` — 그림 오른쪽·아래 변이 지면 변에서 2px 초과 ~ 변 12% 이하 떨어짐(템플릿 edgeInset·전폭 띠 대칭은 ✓). kv-gap-audit 과 같은 자
  - **③ 빈 곳** adcheck `empty-band`(아무것도 없는 가로 띠 > 28%, 가장자리 36% — warn 만, info 는 그림·틀 탓이라 참고) + 단일 사물 누끼 면적이 `CANON.objectBleed.targetArea` 하한 아래(`area-low` — 자유 배치만. 틀 그림 칸은 템플릿이 크기를 정하고, maxUpscale 로 멈춘 것은 그림 탓이라 제외)
  - **④ 겹침** adcheck `text-over-subject`(15%, 캐릭터 2%) · `logo-covered`(5%) · `text-clipped` + `overlapFix.fail`(교정 사다리를 다 써도 문턱 위)
  - **⑤ 끊김·이질감** `scripts/kv-seam-audit.mjs` 판정(cut-nomask · cut-short · cutout-cut · seam-far · bg-box · bg-in-cutout) — 같은 케이스·규격·core 로 동시에 돌린 결과를 합침
  - **⑥ 레이아웃 다양성** 측정만(2단계 설계 입력) — 아래 절

## 결과: **✗ 898 규격** / 측정 4387 (전 ✗ 1483 / 4387 · 고침 585 · 새로 ✗ 0)

| 축 | 전 ✗ | 후 ✗ | 측정 |
|---|---|---|---|
| ① 가이드 준수 | 1381 | **880** | 4387 |
| ② 여백 | 252 | **108** | 3644 |
| ③ 빈 곳 | 7 | **7** | 3661 |
| ④ 겹침 | 46 | **16** | 4226 |
| ⑤ 끊김·이질감 | 20 | **19** | 4209 |
| **✗ 규격(중복 제외)** | **1483** | **898** | 4387 |

유형별 ✗/측정: illust 673 → 300 / 1763 · texture 274 → 274 / 287 · photo 240 → 184 / 1107 · cutout 296 → 140 / 1230

## 원인별(많은 순)

| 원인 | 전 | 후 | 규격 수 | 케이스 수 | 많이 나는 규격 | 배치(mode) |
|---|---|---|---|---|---|---|
| `rule:texture.bg` | 259 | **259** | 37 | 7 | jasoseol-pc-premium-popup-pc 7 · jasoseol-pc-premium-jobpost-pc 7 · jasoseol-pc-standard-main-pc 7 · jasoseol-pc-standard-jobpost-pc 7 | mold 224 · — 35 |
| `lint:safe-area` | 184 | **184** | 2 | 107 | kakao-bizboard-mo 107 · everytime-home-card-image 77 | mold 184 |
| `rule:required.date` | 132 | **132** | 4 | 106 | everytime-home-card-image 106 · catch-center-object-pc 21 · everytime-home-banner 4 · daangn-native-feed-image 1 | mold 110 · — 21 · bleed 1 |
| `gap:칸이 변에서 떨어짐` | 107 | **108** | 2 | 107 | naver-gfa-mobile-da-1250x560 107 · google-gdn-300x1050 1 | mold 108 |
| `lint:text-height` | 107 | **107** | 1 | 107 | naver-gfa-mobile-da-1250x560 107 | mold 107 |
| `rule:hierarchy` | 83 | **83** | 1 | 83 | daangn-native-feed-image 83 | band 61 · bleed 14 · template-band-cover 4 · corner-contain 4 |
| `lint:logo-forbidden` | 56 | **56** | 1 | 56 | catch-center-object-pc 56 | — 56 |
| `rule:character.head` | 155 | **51** | 11 | 13 | catch-center-object-mo 13 · naver-gfa-native-mo-342x228 8 · remember-main-top-pc 5 · remember-main-mid-pc 5 | mold 27 · — 24 |
| `rule:maxUpscale` | 40 | **40** | 18 | 6 | remember-main-top-pc 5 · jasoseol-m-premium-popup-mo 4 · instagram-feed-1080 4 · kakao-display-pc-promo 4 | mold 37 · — 3 |
| `rule:photoCrowd.full` | 40 | **40** | 5 | 8 | catch-center-object-mo 8 · naver-gfa-native-mo-342x228 8 · everytime-community-native 8 · everytime-contest-card 8 | — 40 |
| `rule:objectOverlap` | 36 | **36** | 1 | 36 | daangn-native-feed-image 36 | band 36 |
| `rule:place.textZone` | 38 | **34** | 1 | 34 | daangn-native-feed-image 34 | band 32 · template-band-cover 2 |
| `seam:cut-short` | 5 | **17** | 13 | 4 | naver-gfa-mobile-da-1250x560 3 · remember-job-top-mo 2 · remember-job-side-mo 2 · jasoseol-pc-premium-popup-pc 1 | mold 17 |
| `rule:roomFull` | 16 | **16** | 5 | 7 | daangn-native-feed-image 6 · naver-gfa-native-mo-342x228 4 · everytime-community-native 2 · everytime-contest-card 2 | — 10 · band 6 |
| `lint:chars` | 18 | **12** | 2 | 11 | kakao-bizboard-mo 11 · remember-job-side-mo 1 | mold 12 |
| `rule:contrast.small` | 369 | **10** | 5 | 4 | jasoseol-pc-premium-popup-pc 2 · jasoseol-pc-premium-jobpost-pc 2 · jasoseol-pc-standard-jobpost-pc 2 · jasoseol-pc-calendar-pc 2 | mold 8 · bg-texture 1 · full 1 |
| `overlap:text-over-subject` | 20 | **10** | 3 | 8 | naver-gfa-mobile-da-1250x560 6 · jasoseol-pc-premium-popup-pc 2 · daangn-native-feed-image 2 | mold 8 · template-band-cover 2 |
| `rule:objectBleed.area` | 98 | **7** | 1 | 7 | daangn-native-feed-image 7 | bleed 7 |
| `lint:overflow` | 26 | **7** | 1 | 7 | naver-gfa-mobile-da-1250x560 7 | mold 7 |
| `overlap:text-clipped` | 26 | **7** | 1 | 7 | naver-gfa-mobile-da-1250x560 7 | mold 7 |
| `rule:melt.cutout.none` | 7 | **7** | 4 | 3 | google-gdn-300x600 3 · jasoseol-m-premium-popup-mo 2 · google-gdn-300x1050 1 · nap-dsp-full-320x480 1 | mold 7 |
| `empty:area-low` | 7 | **7** | 1 | 7 | daangn-native-feed-image 7 | bleed 7 |
| `rule:main.lines` | 24 | **5** | 1 | 5 | naver-gfa-mobile-da-1250x560 5 | mold 5 |
| `rule:cutout.contain` | 5 | **5** | 1 | 5 | daangn-native-feed-image 5 | template-band-cover 3 · corner-contain 2 |
| `seam:seam-far` | 15 | **2** | 2 | 1 | jasoseol-m-premium-popup-mo 1 · google-gdn-300x600 1 | mold 2 |
| `rule:place.recommendedMargin` | 6 | **2** | 1 | 2 | google-gdn-300x1050 2 | mold 2 |
| `overlap:overlapFix.fail` | 2 | **2** | 2 | 1 | jasoseol-m-standard-main-mo 1 · everytime-home-card-image 1 | mold 2 |
| `rule:contrast.main` | 354 | **0** | 0 | 0 |  |  |
| `gap:칸 안 그림 정렬(contain)` | 145 | **0** | 0 | 0 |  |  |

규격별 ✗(많은 순): `kakao-bizboard-mo` 107 · `naver-gfa-mobile-da-1250x560` 107 · `everytime-home-card-image` 107 · `daangn-native-feed-image` 85 · `catch-center-object-pc` 78 · `catch-center-object-mo` 30 · `naver-gfa-native-mo-342x228` 27 · `everytime-community-native` 18 · `everytime-contest-card` 18 · `everytime-search-keyword-thumb` 18 · `remember-main-top-pc` 17 · `remember-job-side-mo` 16 · `remember-main-mid-pc` 15 · `remember-job-top-pc` 15

케이스별 ✗(많은 순): `hdot-wave` 40 · `texture-dark` 39 · `gradient` 39 · `hdot-purple3d` 39 · `midas-facets` 39 · `desk-02` 39 · `desk-23` 39 · `desk-37-cut` 19 · `desk-19` 16 · `desk-08` 15 · `desk-13` 13 · `desk-22` 13 · `desk-24` 13 · `desk-10` 13

## 전/후 달라진 규격

- 고침 585: fox-gradbg@jasoseol-pc-premium-popup-pc(guide) · midas-cards-orange@jasoseol-pc-premium-popup-pc(guide) · midas-bridge-icons@jasoseol-pc-premium-popup-pc(guide) · desk-03@jasoseol-pc-premium-popup-pc(guide) · desk-03-cut@jasoseol-pc-premium-popup-pc(guide) · desk-04@jasoseol-pc-premium-popup-pc(guide) · desk-08@jasoseol-pc-premium-popup-pc(guide) · desk-11@jasoseol-pc-premium-popup-pc(guide) · desk-13@jasoseol-pc-premium-popup-pc(guide) · desk-15-cut@jasoseol-pc-premium-popup-pc(guide) · desk-17@jasoseol-pc-premium-popup-pc(guide) · desk-24@jasoseol-pc-premium-popup-pc(guide) · desk-29@jasoseol-pc-premium-popup-pc(guide) · desk-30@jasoseol-pc-premium-popup-pc(guide) · desk-37@jasoseol-pc-premium-popup-pc(guide) · desk-37-cut@jasoseol-pc-premium-popup-pc(guide) · fox-gradbg@jasoseol-pc-premium-jobpost-pc(guide) · midas-cards-orange@jasoseol-pc-premium-jobpost-pc(guide) · desk-03@jasoseol-pc-premium-jobpost-pc(guide) · desk-03-cut@jasoseol-pc-premium-jobpost-pc(guide) · desk-04@jasoseol-pc-premium-jobpost-pc(guide) · desk-08@jasoseol-pc-premium-jobpost-pc(guide) · desk-11@jasoseol-pc-premium-jobpost-pc(guide) · desk-15-cut@jasoseol-pc-premium-jobpost-pc(guide) · desk-17@jasoseol-pc-premium-jobpost-pc(guide) · desk-19@jasoseol-pc-premium-jobpost-pc(guide) · desk-24@jasoseol-pc-premium-jobpost-pc(guide) · desk-29@jasoseol-pc-premium-jobpost-pc(guide) · desk-30@jasoseol-pc-premium-jobpost-pc(guide) · desk-37@jasoseol-pc-premium-jobpost-pc(guide) · desk-37-cut@jasoseol-pc-premium-jobpost-pc(guide) · fox-gradbg@jasoseol-pc-standard-main-pc(guide) · midas-cards-orange@jasoseol-pc-standard-main-pc(guide) · midas-bridge-icons@jasoseol-pc-standard-main-pc(guide) · desk-03@jasoseol-pc-standard-main-pc(guide) · desk-03-cut@jasoseol-pc-standard-main-pc(guide) · desk-04@jasoseol-pc-standard-main-pc(guide) · desk-08@jasoseol-pc-standard-main-pc(guide) · desk-11@jasoseol-pc-standard-main-pc(guide) · desk-15-cut@jasoseol-pc-standard-main-pc(guide) …

## ⑥ 레이아웃 다양성(측정만 — 고치지 않음)

케이스마다 키비주얼이 있는 규격의 배치 종류 = `place.mode/objectSide[@kvPlace]`. 「자유 배치」 = 틀(mold)·템플릿 칸(template·corner)·오브젝트 상자(box)·지면 전체(full·bg-*)가 아닌 것 — 매체가 자리를 정한 규격은 다양성을 따질 수 없다. 「단조」 = 같은 비율(shape)의 자유 배치 규격이 3개 이상인데 전부 한 배치.

- 케이스당 자유 배치 종류 수 분포: 0종 31케이스 · 1종 76케이스
- 케이스당 전체 배치 종류 수 분포(틀·템플릿 포함): 8종 107케이스
- 단조(비율별): 없음
- 배치 전체 분포(규격 수): `mold/right` 1528 · `mold/corner` 956 · `—/—` 565 · `mold/bottom` 535 · `mold/corner@top-left` 214 · `mold/bottom@top-left` 214 · `mold/left` 107 · `band/bottom` 62 · `bleed/template` 14 · `corner-contain/template` 10 · `full/none` 8 · `bg-texture/none` 7 · `template-band-cover/template` 4 · `bg-frame/none` 2

| 비율 × 유형(키비주얼 있는 규격 전부) | 규격 수 | 배치 종류 | 분포 |
|---|---|---|---|
| wide × illust | 774 | 4 | `mold/right` 516 · `mold/corner` 172 · `mold/left` 43 · `mold/corner@top-left` 43 |
| wide × cutout | 570 | 4 | `mold/right` 390 · `mold/corner` 120 · `mold/left` 30 · `mold/corner@top-left` 30 |
| square × illust | 516 | 4 | `mold/corner` 215 · `—/—` 215 · `mold/corner@top-left` 43 · `band/bottom` 43 |
| wide × photo | 486 | 4 | `mold/right` 324 · `mold/corner` 108 · `mold/left` 27 · `mold/corner@top-left` 27 |
| square × cutout | 390 | 7 | `—/—` 180 · `mold/corner` 150 · `mold/corner@top-left` 30 · `bleed/template` 14 · `corner-contain/template` 10 · `template-band-cover/template` 4 · `bg-frame/none` 2 |
| square × photo | 324 | 5 | `mold/corner` 135 · `—/—` 135 · `mold/corner@top-left` 27 · `band/bottom` 19 · `full/none` 8 |
| tall × illust | 172 | 2 | `mold/bottom` 129 · `mold/bottom@top-left` 43 |
| tower × illust | 129 | 2 | `mold/bottom` 86 · `mold/bottom@top-left` 43 |
| tall × cutout | 120 | 2 | `mold/bottom` 90 · `mold/bottom@top-left` 30 |
| wide × texture | 119 | 4 | `mold/right` 84 · `mold/corner` 21 · `mold/left` 7 · `mold/corner@top-left` 7 |
| tall × photo | 108 | 2 | `mold/bottom` 81 · `mold/bottom@top-left` 27 |
| tower × cutout | 90 | 2 | `mold/bottom` 60 · `mold/bottom@top-left` 30 |
| strip × illust | 86 | 1 | `mold/right` 86 |
| square × texture | 84 | 4 | `mold/corner` 35 · `—/—` 35 · `mold/corner@top-left` 7 · `bg-texture/none` 7 |
| tower × photo | 81 | 2 | `mold/bottom` 54 · `mold/bottom@top-left` 27 |
| strip × cutout | 60 | 1 | `mold/right` 60 |
| strip × photo | 54 | 1 | `mold/right` 54 |
| tall × texture | 28 | 2 | `mold/bottom` 21 · `mold/bottom@top-left` 7 |
| tower × texture | 21 | 2 | `mold/bottom` 14 · `mold/bottom@top-left` 7 |
| strip × texture | 14 | 1 | `mold/right` 14 |

## ✗ 목록

| 규격 | 케이스(유형) | 배치 | ① 가이드 | ② 여백 | ③ 빈 곳 | ④ 겹침 | ⑤ 끊김 |
|---|---|---|---|---|---|---|---|
| jasoseol-pc-premium-popup-pc 550×400 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 4.2 · detail 4.2) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | desk-07 (illust/illust-character) | mold | ✗ contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 3.6 · detail 3.6) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| jasoseol-pc-premium-popup-pc 550×400 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | t1014-gs2025 (illust/illust-room) | mold | ✓ | ✓ | ✓ | ✗ text-over-subject 23% | ✓ |
| jasoseol-pc-premium-popup-pc 550×400 | t1014-gs2026 (illust/illust-scene) | mold | ✓ | ✓ | ✓ | ✗ text-over-subject 20% | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 4.2 · detail 4.2) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | desk-07 (illust/illust-character) | mold | ✗ contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 3.6 · detail 3.6) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-premium-jobpost-pc 160×600 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-main-pc 1200×280 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.7배) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 4.2 · detail 4.2) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | desk-07 (illust/illust-character) | mold | ✗ contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 3.6 · detail 3.6) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-standard-jobpost-pc 160×600 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | dongbu_illust (cutout/cutout-object) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 53%) / maxUpscale(≤ 1.5배 → 2.1배) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | dongsuh-model (cutout/cutout-character) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 55%) / maxUpscale(≤ 1.5배 → 3.4배) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 2.5배) | ✓ | ✓ | ✓ | ✗ seam-far |
| jasoseol-m-premium-popup-mo 600×880 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-premium-popup-mo 600×880 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 2.1배) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | sep-open-recruit (cutout/cutout-glass) | mold | ✓ | ✓ | ✓ | ✗ overlapFix.fail 0% (교정 8>7:kv) | ✓ |
| jasoseol-m-standard-main-mo 750×500 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-m-standard-main-mo 750×500 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| jasoseol-m-standard-main-mo 750×500 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / contrast.small(≥ 4.5:1(큰 글자 3:1) → date 4.2) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | desk-07 (illust/illust-character) | mold | ✗ contrast.small(≥ 4.5:1(큰 글자 3:1) → date 3.6) | ✓ | ✓ | ✓ | ✓ |
| jasoseol-pc-calendar-pc 164×233 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | dongbu-flatbg (illust/illust-object) | mold | ✗ maxUpscale(≤ 2배 → 2.8배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | fox-3d (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 23% · 아랫변 37%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | dongbu_illust (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.7배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-05 (photo/photo-dark) | mold | ✗ maxUpscale(≤ 2배 → 2.9배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 4.9배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-13 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 32% · 아랫변 29%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-22 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 28% · 아랫변 31%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-24 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 48% · 아랫변 18%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-10 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 29% · 아랫변 29%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-pc 2240×360 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 2.2배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-main-top-mo 1005×360 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-top-mo 1005×360 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 2.2배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | dongbu-flatbg (illust/illust-object) | mold | ✗ maxUpscale(≤ 2배 → 2.9배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | fox-3d (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 30% · 아랫변 44%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-05 (photo/photo-dark) | mold | ✗ maxUpscale(≤ 2배 → 2.9배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 5배) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-13 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 39% · 아랫변 36%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-22 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 36% · 아랫변 38%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-24 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 54% · 아랫변 24%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-pc 2240×240 | desk-10 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 36% · 아랫변 36%) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-main-mid-mo 1005×360 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-main-mid-mo 1005×360 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 2.2배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | dongbu-flatbg (illust/illust-object) | mold | ✗ maxUpscale(≤ 2배 → 2.9배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | fox-3d (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 30% · 아랫변 44%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-05 (photo/photo-dark) | mold | ✗ maxUpscale(≤ 2배 → 2.9배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 5배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-13 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 39% · 아랫변 36%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-22 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 36% · 아랫변 38%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-24 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 54% · 아랫변 24%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-pc 2240×240 | desk-10 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 36% · 아랫변 36%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | fox-3d (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 11% · 아랫변 25%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | midas-glass-folders (illust/illust-object) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-job-top-mo 1125×276 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 2.4배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-13 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 20% · 아랫변 18%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-job-top-mo 1125×276 | desk-22 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 17% · 아랫변 19%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-10 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 17% · 아랫변 17%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-top-mo 1125×276 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.7배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-pc 530×200 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-job-side-pc 530×200 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | fox-3d (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 11% · 아랫변 25%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | midas-glass-folders (illust/illust-object) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-job-side-mo 1125×276 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 2.4배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-13 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 20% · 아랫변 18%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| remember-job-side-mo 1125×276 | desk-22 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 17% · 아랫변 19%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-10 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 17% · 아랫변 17%) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.7배) | ✓ | ✓ | ✓ | ✓ |
| remember-job-side-mo 1125×276 | t1014-dongsuh (cutout/cutout-character) | mold | ✗ lint chars:main | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-pc 792×240 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| jobda-main-pc 792×240 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| jobda-main-mo 343×160 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| jobda-main-mo 343×160 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| catch-center-object-pc 515×315 | dongbu-flatbg (illust/illust-object) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | texture-dark (texture/texture-dark) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | slabs-3d (illust/illust-scene) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | geo-3d (illust/illust-room) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | samsung-3d (illust/illust-room) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | gradient (texture/texture-light) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | fox-3d (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | ilhwa-dark (photo/photo-dark) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | ilhwa-photo (photo/photo-roomy) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | ilhwa-roomy (photo/photo-roomy) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | bc-illust (illust/illust-scene) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | fox-gradbg (illust/illust-character) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | hdot-wave (texture/texture-dark) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | hdot-purple3d (texture/texture-dark) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | hdot-hall (illust/illust-object) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | hdot-seminar (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | hdot-audience (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | hr-doctor (photo/photo-portrait) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | hr-teamhands (photo/photo-bright) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | hr-nurse-ai (photo/photo-portrait) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-cablebridge (photo/photo-roomy) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-city (photo/photo-busy) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-glass-folders (illust/illust-object) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-acrylic-box (illust/illust-grad-bg) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-cards-orange (illust/illust-grad-bg) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-bridge-icons (illust/illust-character) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-bridge-dark (illust/illust-grad-bg) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-book-vib (illust/illust-grad-bg) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-book-sim (photo/photo-bright) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-skyscraper (photo/photo-crowd) |  | ✗ required.date(날짜 있음 → 없음) | – | – | – | – |
| catch-center-object-pc 515×315 | midas-facets (texture/texture-light) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-01 (illust/illust-object) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-02 (texture/texture-light) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-03 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-04 (photo/photo-busy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-05 (photo/photo-dark) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-06 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-07 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-08 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-09 (illust/illust-object) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-11 (illust/illust-grad-bg) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-12 (illust/illust-scene) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-13 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-14 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-15 (illust/illust-scene) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-16 (photo/photo-dark) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-17 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-18 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-19 (photo/photo-roomy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-20 (illust/illust-object) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-21 (illust/illust-grad-bg) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-22 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-23 (texture/texture-light) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-24 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-25 (illust/illust-grad-bg) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-26 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-27 (photo/photo-busy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-28 (photo/photo-busy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-29 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-30 (illust/illust-object) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-31 (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-32 (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-33 (photo/photo-busy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-34 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-35 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-36 (photo/photo-bright) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-10 (illust/illust-character) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-37 (illust/illust-grad-bg) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | desk-37-cut (cutout/cutout-object) |  | ✗ maxUpscale(≤ 1.5배 → 1.6배) | – | – | ✓ | ✓ |
| catch-center-object-pc 515×315 | t1014-gs2025 (illust/illust-room) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-gs2026 (illust/illust-scene) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-lt (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-lt-v2 (illust/illust-grad-bg) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-lt-v3 (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-asan-illust (illust/illust-scene) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-asan-photo (photo/photo-crowd) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-hanssem (photo/photo-busy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-pc 515×315 | t1014-hanjin (photo/photo-busy) |  | ✗ lint logo-forbidden | – | – | – | – |
| catch-center-object-mo 622×380 | texture-dark (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | gradient (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | fox-3d (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 4% · 아랫변 17%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | fox-gradbg (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 4% · 아랫변 26%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | hdot-wave (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | hdot-purple3d (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | hdot-seminar (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | hdot-audience (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | midas-bridge-icons (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 19% · 아랫변 23%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | midas-skyscraper (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | midas-facets (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-02 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-06 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 4% · 아랫변 23%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-08 (illust/illust-character) |  | ✗ maxUpscale(≤ 2배 → 2.6배) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-13 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 13% · 아랫변 11%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-14 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 3% · 아랫변 29%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-17 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 31%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-22 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 12%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-23 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-24 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 31% · 아랫변 1%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-26 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 12%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-31 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-32 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-34 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 14% · 아랫변 36%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-35 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 2% · 아랫변 0%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-10 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 9%) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | desk-37-cut (cutout/cutout-object) |  | ✗ maxUpscale(≤ 1.5배 → 2배) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | t1014-lt (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | t1014-lt-v3 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| catch-center-object-mo 622×380 | t1014-asan-photo (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| google-gdn-580x400 580×400 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-580x400 580×400 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-580x400 580×400 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-580x400 580×400 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-580x400 580×400 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-580x400 580×400 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-580x400 580×400 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-970x250 970×250 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | dongbu_illust (cutout/cutout-object) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 53%) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | dongsuh-model (cutout/cutout-character) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 55%) / maxUpscale(≤ 1.5배 → 2.3배) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | desk-08 (illust/illust-character) | mold | ✓ | ✓ | ✓ | ✓ | ✗ seam-far |
| google-gdn-300x600 300×600 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x600 300×600 | desk-37-cut (cutout/cutout-object) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 55%) / maxUpscale(≤ 1.5배 → 2.4배) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | dongsuh-model (cutout/cutout-character) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 55%) / maxUpscale(≤ 1.5배 → 1.7배) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | sep-open-recruit (cutout/cutout-glass) | mold | ✗ place.recommendedMargin(권장 여백 ≥ 12px(짧은 변 4%) → 글자 왼 0px · 로고 위 35px) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | desk-29 (illust/illust-character) | mold | ✓ | ✗ 오른쪽 29.2px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.8배) | ✓ | ✓ | ✓ | ✓ |
| google-gdn-300x1050 300×1050 | t1014-asan-illust (illust/illust-scene) | mold | ✗ place.recommendedMargin(권장 여백 ≥ 12px(짧은 변 4%) → 글자 왼 0px · 로고 위 35px) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | fox-3d (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 5% · 아랫변 18%) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | desk-13 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 14% · 아랫변 12%) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | desk-22 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 10% · 아랫변 13%) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x50 320×50 | desk-10 (illust/illust-character) | mold | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 10% · 아랫변 10%) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-band-320x100 320×100 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| nap-dsp-band-320x100 320×100 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-300x250 300×250 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| nap-dsp-full-320x480 320×480 | desk-37-cut (cutout/cutout-object) | mold | ✗ melt.cutout.none(마스크 없음(잘린 변만 10%~36%) → to right 55%) / maxUpscale(≤ 1.5배 → 2배) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | dongbu_illust (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 2.3배) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | dongsuh-model (cutout/cutout-character) | mold | ✗ maxUpscale(≤ 1.5배 → 2배) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 3.5배) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) | ✓ | ✓ | ✓ | ✓ |
| instagram-feed-1080 1080×1080 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 3배) | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | dongbu-flatbg (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | texture-dark (texture/texture-dark) | mold/none | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | slabs-3d (illust/illust-scene) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | geo-3d (illust/illust-room) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | samsung-3d (illust/illust-room) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | gradient (texture/texture-light) | mold | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | fox-3d (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | ilhwa-dark (photo/photo-dark) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | ilhwa-photo (photo/photo-roomy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | ilhwa-roomy (photo/photo-roomy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | bc-illust (illust/illust-scene) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | fox-gradbg (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | dongbu_illust (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | abl-group (cutout/cutout-group) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | dongsuh-model (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | fox-cutout (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | sep-open-recruit (cutout/cutout-glass) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hdot-wave (texture/texture-dark) | mold | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | hdot-purple3d (texture/texture-dark) | mold | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | hdot-hall (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hdot-speaker-a (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hdot-speaker-b (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hdot-seminar (photo/photo-crowd) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hdot-audience (photo/photo-crowd) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hdot-asterisk (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hr-doctor (photo/photo-portrait) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hr-teamhands (photo/photo-bright) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | hr-nurse-ai (photo/photo-portrait) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-cablebridge (photo/photo-roomy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-stadium-wire (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-city (photo/photo-busy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-folder-blue (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-folder-dark (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-glass-folders (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-acrylic-box (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-cards-orange (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-bridge-icons (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-bridge-dark (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-book-vib (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-book-open (cutout/cutout-group) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-book-flow (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-book-sim (photo/photo-bright) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-skyscraper (photo/photo-crowd) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-facets (texture/texture-light) | mold | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | midas-glass-mint (cutout/cutout-frame) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | midas-glass-dark (cutout/cutout-frame) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-01 (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-02 (texture/texture-light) | mold | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | desk-03 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-03-cut (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-04 (photo/photo-busy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-05 (photo/photo-dark) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-06 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-07 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-08 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-09 (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-11 (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-12 (illust/illust-scene) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-13 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-13-cut (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-14 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-15 (illust/illust-scene) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-15-cut (cutout/cutout-group) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-16 (photo/photo-dark) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-17 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-18 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-18-cut (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-19 (photo/photo-roomy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-20 (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-20-cut (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-21 (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-22 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-22-cut (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-23 (texture/texture-light) | mold | ✗ lint safe-area:sub / lint safe-area:main | – | – | – | – |
| kakao-bizboard-mo 1029×258 | desk-24 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-25 (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-26 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-27 (photo/photo-busy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-28 (photo/photo-busy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-29 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-30 (illust/illust-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-31 (photo/photo-crowd) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-32 (photo/photo-crowd) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-32-cut (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-33 (photo/photo-busy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-34 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-35 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-35-cut (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-36 (photo/photo-bright) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-10 (illust/illust-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-37 (illust/illust-grad-bg) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | desk-37-cut (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-abl (cutout/cutout-group) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-gs2025 (illust/illust-room) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-gs2026 (illust/illust-scene) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-lt (photo/photo-crowd) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-lt-v2 (illust/illust-grad-bg) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-lt-v3 (photo/photo-crowd) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-dongsuh (cutout/cutout-character) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-bionote-dog (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-bionote-cat (cutout/cutout-group) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-asan-illust (illust/illust-scene) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-asan-photo (photo/photo-crowd) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-jeil (cutout/cutout-object) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-hanssem (photo/photo-busy) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-hanssem-blocks (cutout/cutout-character) | mold | ✗ lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-bizboard-mo 1029×258 | t1014-hanjin (photo/photo-busy) | mold | ✗ lint chars:sub / lint safe-area:sub / lint safe-area:main | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | dongbu-flatbg (illust/illust-object) | mold | ✗ maxUpscale(≤ 2배 → 2.1배) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | dongsuh-model (cutout/cutout-character) | mold | ✗ maxUpscale(≤ 1.5배 → 2.2배) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | desk-08 (illust/illust-character) | mold | ✗ maxUpscale(≤ 2배 → 2.5배) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| kakao-display-pc-promo 1200×600 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 2.3배) | ✓ | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | dongbu-flatbg (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | slabs-3d (illust/illust-scene) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | geo-3d (illust/illust-room) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✗ cut-short |
| naver-gfa-mobile-da-1250x560 1250×560 | samsung-3d (illust/illust-room) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | fox-3d (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | ilhwa-dark (photo/photo-dark) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | ilhwa-photo (photo/photo-roomy) | mold | ✗ lint text-height:main | ✗ 아래 20.3px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | ilhwa-roomy (photo/photo-roomy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | bc-illust (illust/illust-scene) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | fox-gradbg (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | dongbu_illust (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | abl-group (cutout/cutout-group) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | dongsuh-model (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | fox-cutout (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | sep-open-recruit (cutout/cutout-glass) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-hall (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-speaker-a (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-speaker-b (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-seminar (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-audience (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hdot-asterisk (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hr-doctor (photo/photo-portrait) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hr-teamhands (photo/photo-bright) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | hr-nurse-ai (photo/photo-portrait) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-cablebridge (photo/photo-roomy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-stadium-wire (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-city (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-folder-blue (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-folder-dark (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-glass-folders (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-acrylic-box (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-cards-orange (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-bridge-icons (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-bridge-dark (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-book-vib (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-book-open (cutout/cutout-group) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-book-flow (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-book-sim (photo/photo-bright) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-skyscraper (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-glass-mint (cutout/cutout-frame) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-glass-dark (cutout/cutout-frame) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-01 (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-03 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-03-cut (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-04 (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-05 (photo/photo-dark) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-06 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-07 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-08 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-09 (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-11 (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-12 (illust/illust-scene) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-13 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-13-cut (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-14 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-15 (illust/illust-scene) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-15-cut (cutout/cutout-group) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-16 (photo/photo-dark) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-17 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-18 (illust/illust-character) | mold | ✗ main.lines(≤ 2줄 → 3줄 (2026 하반기 / 마이다스아이티 정규직 / 채용)) / lint overflow:main / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-clipped 0% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-18-cut (cutout/cutout-object) | mold | ✗ main.lines(≤ 2줄 → 3줄 (2026 하반기 / 마이다스아이티 정규직 / 채용)) / lint overflow:main / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-clipped 1% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-19 (photo/photo-roomy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✗ cut-short |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-20 (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-20-cut (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-21 (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-22 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-22-cut (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-24 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-25 (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-26 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-27 (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-28 (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-29 (illust/illust-character) | mold | ✗ main.lines(≤ 2줄 → 3줄 (2026 하반기 / 볼보그룹코리아 정규직 / 채용)) / lint overflow:main / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-clipped 0% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-30 (illust/illust-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-31 (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-32 (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-32-cut (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-33 (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-34 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-35 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-35-cut (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-36 (photo/photo-bright) | mold | ✗ main.lines(≤ 2줄 → 3줄 (2026 하반기 / GC녹십자그룹 정규직 / 채용)) / lint overflow:main / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-clipped 1% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-10 (illust/illust-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-37 (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.7배) / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-abl (cutout/cutout-group) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-gs2025 (illust/illust-room) | mold | ✗ lint overflow:detail / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-over-subject·text-clipped 23% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-gs2026 (illust/illust-scene) | mold | ✗ lint overflow:detail / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-over-subject·text-clipped 18% | ✗ cut-short |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-lt (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-over-subject 21% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-lt-v2 (illust/illust-grad-bg) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-lt-v3 (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-over-subject 27% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-dongsuh (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-bionote-dog (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-bionote-cat (cutout/cutout-group) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-asan-illust (illust/illust-scene) | mold | ✗ main.lines(≤ 2줄 → 3줄 (2022 하반기 / 서울아산병원 디자이너 / 채용)) / lint overflow:main / lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-over-subject·text-clipped 20% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-asan-photo (photo/photo-crowd) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✗ text-over-subject 23% | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-jeil (cutout/cutout-object) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-hanssem (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-hanssem-blocks (cutout/cutout-character) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-hanjin (photo/photo-busy) | mold | ✗ lint text-height:main | ✗ 아래 20px 칸이 변에서 떨어짐 | ✓ | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | texture-dark (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | samsung-3d (illust/illust-room) |  | ✗ roomFull(kv-use bg (비율 1.13배) → part) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | gradient (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | hdot-wave (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | hdot-purple3d (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | hdot-seminar (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | hdot-audience (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | midas-acrylic-box (illust/illust-grad-bg) |  | ✗ roomFull(kv-use bg (비율 0.92배) → part) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | midas-bridge-icons (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 16% · 아랫변 20%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | midas-book-vib (illust/illust-grad-bg) |  | ✗ roomFull(kv-use bg (비율 0.76배) → part) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | midas-skyscraper (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | midas-facets (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-02 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-13 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 10% · 아랫변 7%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-17 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 6% · 아랫변 28%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-22 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 5% · 아랫변 8%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-23 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-24 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 28% · 아랫변 0%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-26 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 5% · 아랫변 8%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-31 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-32 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-34 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 12% · 아랫변 34%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | desk-10 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 6% · 아랫변 6%) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | t1014-gs2025 (illust/illust-room) |  | ✗ roomFull(kv-use bg (비율 1.5배) → part) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | t1014-lt (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | t1014-lt-v3 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| naver-gfa-native-mo-342x228 342×228 | t1014-asan-photo (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-board 1029×258 | desk-37-cut (cutout/cutout-object) | mold | ✗ maxUpscale(≤ 1.5배 → 1.6배) | ✓ | ✓ | ✓ | ✓ |
| everytime-community-native 288×288 | texture-dark (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | samsung-3d (illust/illust-room) |  | ✗ roomFull(kv-use bg (비율 0.75배) → part) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | gradient (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | hdot-wave (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | hdot-purple3d (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | hdot-seminar (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | hdot-audience (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | midas-acrylic-box (illust/illust-grad-bg) |  | ✗ roomFull(kv-use bg (비율 0.61배) → part) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | midas-skyscraper (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | midas-facets (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | desk-02 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | desk-23 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | desk-24 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 0%) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | desk-31 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | desk-32 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | t1014-lt (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | t1014-lt-v3 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-community-native 288×288 | t1014-asan-photo (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-home-banner 640×200 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | t1014-lt (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | t1014-lt-v2 (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | t1014-lt-v3 (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-banner 640×200 | t1014-jeil (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | dongbu-flatbg (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | slabs-3d (illust/illust-scene) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | geo-3d (illust/illust-room) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | samsung-3d (illust/illust-room) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | fox-3d (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | ilhwa-dark (photo/photo-dark) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | ilhwa-photo (photo/photo-roomy) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | ilhwa-roomy (photo/photo-roomy) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | bc-illust (illust/illust-scene) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | fox-gradbg (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | dongbu_illust (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | abl-group (cutout/cutout-group) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | dongsuh-model (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | fox-cutout (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | sep-open-recruit (cutout/cutout-glass) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✗ overlapFix.fail 0% (교정 30>8:kv) | ✓ |
| everytime-home-card-image 720×480 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-hall (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-speaker-a (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-speaker-b (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-seminar (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-audience (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hdot-asterisk (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hr-doctor (photo/photo-portrait) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hr-teamhands (photo/photo-bright) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | hr-nurse-ai (photo/photo-portrait) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-cablebridge (photo/photo-roomy) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-stadium-wire (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-city (photo/photo-busy) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-folder-blue (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-folder-dark (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-glass-folders (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-acrylic-box (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-cards-orange (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-bridge-icons (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-bridge-dark (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-book-vib (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-book-open (cutout/cutout-group) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-book-flow (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-book-sim (photo/photo-bright) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-skyscraper (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-glass-mint (cutout/cutout-frame) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | midas-glass-dark (cutout/cutout-frame) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-01 (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-03 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-03-cut (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-04 (photo/photo-busy) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-05 (photo/photo-dark) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-06 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-07 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-08 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-09 (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-11 (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-12 (illust/illust-scene) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-13 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-13-cut (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-14 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-15 (illust/illust-scene) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-15-cut (cutout/cutout-group) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-16 (photo/photo-dark) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-17 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-18 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-18-cut (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-19 (photo/photo-roomy) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✗ cut-short |
| everytime-home-card-image 720×480 | desk-20 (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-20-cut (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-21 (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-22 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-22-cut (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter false) / required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-24 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-25 (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-26 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-27 (photo/photo-busy) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-28 (photo/photo-busy) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-29 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-30 (illust/illust-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-31 (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-32 (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-32-cut (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-33 (photo/photo-busy) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-34 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-35 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-35-cut (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-36 (photo/photo-bright) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-10 (illust/illust-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-37 (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | desk-37-cut (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-abl (cutout/cutout-group) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-gs2025 (illust/illust-room) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-gs2026 (illust/illust-scene) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-lt (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-lt-v2 (illust/illust-grad-bg) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-lt-v3 (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-dongsuh (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-bionote-dog (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-bionote-cat (cutout/cutout-group) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-asan-illust (illust/illust-scene) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-asan-photo (photo/photo-crowd) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-jeil (cutout/cutout-object) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-hanssem (photo/photo-busy) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-hanssem-blocks (cutout/cutout-character) | mold | ✗ required.date(날짜 있음 → 없음) / lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-home-card-image 720×480 | t1014-hanjin (photo/photo-busy) | mold | ✗ lint safe-area:logo | ✓ | ✓ | ✓ | ✓ |
| everytime-contest-card 288×288 | texture-dark (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | samsung-3d (illust/illust-room) |  | ✗ roomFull(kv-use bg (비율 0.75배) → part) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | gradient (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | hdot-wave (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | hdot-purple3d (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | hdot-seminar (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | hdot-audience (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | midas-acrylic-box (illust/illust-grad-bg) |  | ✗ roomFull(kv-use bg (비율 0.61배) → part) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | midas-skyscraper (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | midas-facets (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | desk-02 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | desk-23 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | desk-24 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 0%) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | desk-31 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | desk-32 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | t1014-lt (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | t1014-lt-v3 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-contest-card 288×288 | t1014-asan-photo (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | texture-dark (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | samsung-3d (illust/illust-room) |  | ✗ roomFull(kv-use bg (비율 0.75배) → part) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | gradient (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | hdot-wave (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | hdot-purple3d (texture/texture-dark) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | hdot-seminar (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | hdot-audience (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | midas-acrylic-box (illust/illust-grad-bg) |  | ✗ roomFull(kv-use bg (비율 0.61배) → part) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | midas-skyscraper (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | midas-facets (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | desk-02 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | desk-23 (texture/texture-light) |  | ✗ texture.bg(kv-use bg · 세로 가운데 → bg · vCenter —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | desk-24 (illust/illust-character) |  | ✗ character.head(주인공 상자 윗변 잘림 ≤ 2% → 윗변 9% · 아랫변 0%) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | desk-31 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | desk-32 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | t1014-lt (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | t1014-lt-v3 (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| everytime-search-keyword-thumb 288×288 | t1014-asan-photo (photo/photo-crowd) |  | ✗ photoCrowd.full(kv-use full · 스크림 ≥ 0.9 · 흰 글자 → full · 스크림 0.94 · 글자 —) | – | – | ✓ | ✓ |
| blind-feed-image 1200×628 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-feed-image 1200×628 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-feed-image 1200×628 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-feed-image 1200×628 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-feed-image 1200×628 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-feed-image 1200×628 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-feed-image 1200×628 | desk-19 (photo/photo-roomy) | mold | ✓ | ✓ | ✓ | ✓ | ✗ cut-short |
| blind-feed-image 1200×628 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | texture-dark (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | gradient (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | hdot-wave (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | hdot-purple3d (texture/texture-dark) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | midas-facets (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | desk-02 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| blind-post-banner 1250×560 | desk-23 (texture/texture-light) | mold | ✗ texture.bg(kv-use bg · 세로 가운데 → part · vCenter true) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | dongbu-flatbg (illust/illust-object) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.27 서브 1.27) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | slabs-3d (illust/illust-scene) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | geo-3d (illust/illust-room) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / roomFull(kv-use bg (비율 0.67배) → part) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | samsung-3d (illust/illust-room) | band/bottom | ✗ roomFull(kv-use bg (비율 0.75배) → part) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | fox-3d (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | ilhwa-dark (photo/photo-dark) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | ilhwa-photo (photo/photo-roomy) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | ilhwa-roomy (photo/photo-roomy) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | bc-illust (illust/illust-scene) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | fox-gradbg (illust/illust-character) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | dongbu_illust (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 21%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 21% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | abl-group (cutout/cutout-group) | template-band-cover | ✗ cutout.contain(위·아래 0 · 틈 창 좌우 합 ≤ 60%(배율 2.4) · 녹임 없음 → 잘림 왼 38% 오른 0% 위 0% 아래 0% · 녹임 0%) / place.textZone(글자 칸: 가로 7~93% · 세로 7~43% → 가로 7~87% · 세로 6~56%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✗ text-over-subject 23% | ✓ |
| daangn-native-feed-image 200×200 | dongsuh-model (cutout/cutout-character) | corner-contain | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.6 서브 1.6) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | sep-open-recruit (cutout/cutout-glass) | bleed | ✗ required.date(날짜 있음 → 없음) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | hdot-wave (texture/texture-dark) | bg-texture/none | ✗ contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 3.9 · detail 3.7) | – | ✓ | ✓ | – |
| daangn-native-feed-image 200×200 | hdot-hall (illust/illust-object) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | hdot-asterisk (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 16%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 16% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | hr-doctor (photo/photo-portrait) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | hr-teamhands (photo/photo-bright) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | hr-nurse-ai (photo/photo-portrait) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-cablebridge (photo/photo-roomy) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-stadium-wire (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 17%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 17% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-city (photo/photo-busy) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-folder-blue (cutout/cutout-object) | bleed | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-folder-dark (cutout/cutout-object) | bleed | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-glass-folders (illust/illust-object) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-acrylic-box (illust/illust-grad-bg) | band/bottom | ✗ roomFull(kv-use bg (비율 0.61배) → part) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.36 서브 1.36) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-cards-orange (illust/illust-grad-bg) | band/bottom | ✗ roomFull(kv-use bg (비율 0.64배) → part) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.36 서브 1.36) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-bridge-icons (illust/illust-character) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-bridge-dark (illust/illust-grad-bg) | band/bottom | ✗ roomFull(kv-use bg (비율 0.66배) → part) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-book-vib (illust/illust-grad-bg) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.27 서브 1.27) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-book-open (cutout/cutout-group) | template-band-cover | ✗ cutout.contain(위·아래 0 · 틈 창 좌우 합 ≤ 60%(배율 2.4) · 녹임 없음 → 잘림 왼 35% 오른 0% 위 0% 아래 0% · 녹임 0%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.3 서브 1.3) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-book-flow (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 21%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 21% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-book-sim (photo/photo-bright) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | midas-skyscraper (photo/photo-crowd) | full/none | ✗ contrast.small(≥ 4.5:1(큰 글자 3:1) → sub 3.6 · detail 3.5) | – | ✓ | ✓ | – |
| daangn-native-feed-image 200×200 | desk-03 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-04 (photo/photo-busy) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-05 (photo/photo-dark) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-06 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-07 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 9%) / place.textZone(글자 칸: 위 17~58% → 세로 16~67%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-08 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-09 (illust/illust-object) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-11 (illust/illust-grad-bg) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-12 (illust/illust-scene) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-13 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-13-cut (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 18%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 18% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-14 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-15 (illust/illust-scene) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-16 (photo/photo-dark) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-17 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-18 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-18-cut (cutout/cutout-object) | bleed | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-19 (photo/photo-roomy) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-20 (illust/illust-object) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 9%) / place.textZone(글자 칸: 위 17~58% → 세로 16~67%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-20-cut (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 21%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 21% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-21 (illust/illust-grad-bg) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-22 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-22-cut (cutout/cutout-object) | bleed | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-24 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-25 (illust/illust-grad-bg) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-26 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-27 (photo/photo-busy) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-28 (photo/photo-busy) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-29 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-30 (illust/illust-object) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 29%) / place.textZone(글자 칸: 위 24~58% → 세로 23~73%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-32-cut (cutout/cutout-object) | bleed | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-33 (photo/photo-busy) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-34 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-35 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-35-cut (cutout/cutout-character) | corner-contain | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.36 서브 1.36) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-36 (photo/photo-bright) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-10 (illust/illust-character) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-37 (illust/illust-grad-bg) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | desk-37-cut (cutout/cutout-object) | bleed | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-abl (cutout/cutout-group) | template-band-cover | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.3 서브 1.3) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-gs2025 (illust/illust-room) | band/bottom | ✗ roomFull(kv-use bg (비율 1배) → part) / place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-gs2026 (illust/illust-scene) | band/bottom | ✗ place.textZone(글자 칸: 위 16~58% → 세로 14~65%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-lt-v2 (illust/illust-grad-bg) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-dongsuh (cutout/cutout-character) | corner-contain | ✗ cutout.contain(상반신: 위 0 · 아래 잘림 ≤ 55% · 좌우 합 ≤ 30% · 녹임은 아래(to top)만 → 잘림 왼 0% 오른 0% 위 0% 아래 34% · 녹임 0%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.27 서브 1.27) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-bionote-dog (cutout/cutout-character) | corner-contain | ✗ cutout.contain(상반신: 위 0 · 아래 잘림 ≤ 55% · 좌우 합 ≤ 30% · 녹임은 아래(to top)만 → 잘림 왼 0% 오른 0% 위 0% 아래 33% · 녹임 0%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.36 서브 1.36) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-bionote-cat (cutout/cutout-group) | template-band-cover | ✗ cutout.contain(위·아래 0 · 틈 창 좌우 합 ≤ 60%(배율 2.4) · 녹임 없음 → 잘림 왼 22% 오른 0% 위 0% 아래 0% · 녹임 0%) / place.textZone(글자 칸: 가로 7~93% · 세로 16~51% → 가로 7~86% · 세로 15~61%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.3 서브 1.3) | ✓ | ✓ | ✗ text-over-subject 19% (교정 7>0:kv) | ✓ |
| daangn-native-feed-image 200×200 | t1014-asan-illust (illust/illust-scene) | band/bottom | ✗ objectOverlap(≤ 0% (가이드 20%) → 3%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-jeil (cutout/cutout-object) | bleed | ✗ objectBleed.area(22%~27% → 19%) / hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.42 서브 1.7) | ✓ | ✗ 면적 19% < 22% | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-hanssem (photo/photo-busy) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |
| daangn-native-feed-image 200×200 | t1014-hanjin (photo/photo-busy) | band/bottom | ✗ hierarchy(메인/상세 ≥ 1.8 · 메인/서브 ≥ 1.6 → 상세 1.18 서브 1.18) | ✓ | ✓ | ✓ | ✓ |

## 축별 ✓/✗/– (케이스 × 규격 전체는 JSON)

- JSON: `ref/learned/cases/_out/cmp-1016/quality_audit.json` · 시트: `ref/learned/cases/_out/cmp-1016/quality_sheet.png`(✗ 규격, 최대 60장, before 에 ✗ 였던 칸은 전|후)
