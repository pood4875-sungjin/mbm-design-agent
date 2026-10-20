# 키비주얼 이음 전수 감사 (kv-seam-audit)

- 생성: `node scripts/kv-seam-audit.mjs --tag after` · 2026-10-20 09:21 · 케이스 107(장부 전체) × 규격 49(추출 규격 중 전달물 제외) = 5243 · 측정 4209 · 제외 1034(로고만 규격 856 · 키비주얼 없음 161 · 지면 전체 그림(상자 없음) 17)
- 무엇을 재나: 그림 상자(`data-object="1"`)의 네 변마다 **보이는 변**(그림 사각형 ∩ 상자 ∩ 지면)을 잡고, 그 변이 그림이 **잘린 변**(cut — 그림이 변 너머로 이어짐)인지 **그림 변**(nat — 그림이 거기서 끝남)인지 가른다. 지면 변에 붙은 변은 자연스러운 끝이라 재지 않는다(단 누끼가 지면 변에서 잘리는 것은 잰다 — cutFade 의 자리). 페이지 오른쪽에 그림 상자를 **마스크 없이 자홍 바탕 위에 복제한 탐침**을 두어 녹임에 가려진 그림 본색과 누끼의 투명/불투명을 읽는다.
- 픽셀: 변을 따라 n ≥ 9 점(양 끝 6% 제외, 글자·로고·칩 위는 건너뜀). **dNear** = 렌더 변 ±2px 색 차(선이 보이나) · **dEdge** = 탐침 그림 변 안쪽 3px vs 지면 쪽 10px · **dSeam** = 탐침의 녹임 끝 쪽(0.5·0.8·1.0×녹임+4px, 녹임 없으면 4·10px) 평균색 vs 지면(녹임이 걷히며 드러나는 색 — 이질감). 색 차 = RGB 거리 ÷ 441.67(`core/palette.js colorDistance` 와 같은 자).
- 문턱(CANON 과 같은 자): 「다른 색」 = 0.15(검수 `short-melt` 와 같음) · 필요 녹임 = CANON.melt (0.3~0.55 × 상자 변 길이, 색 차 0.45 에서 최대) 의 70% 미만이면 짧음(검수 `short-melt` 와 같음) · 누끼 잘린 변은 CANON.cutFade (잘린 몫%×2+8, 10~36%) 의 70%. 누끼는 숨은 열·행에 불투명 ≥ 5% 일 때만 「잘림」(투명 여백만 잘린 것은 아님). 템플릿이 여백을 정한 변(`mold.image.edgeInset` 자소설 PC팝업 8/30)은 의도(✓, 수치만).
- 이음매가 「보이는」 변 = max(dNear, dEdge) ≥ 0.15 — 그림 변 색이 지면색과 같으면(검은 바탕 × 검은 지면) 속 그림이 뭐든 이어진 것(melt-length 「그림 변 색과 지면색의 거리」 그대로). 필요 길이는 max(dEdge, dSeam) 로.
- 판정 분류: `cut-nomask` 바탕 있는 그림이 상자 변에서 뚝 잘림(마스크 없음) · `cut-short` 잘린 변 녹임이 드러나는 색 차에 비해 짧음 · `cutout-cut` 누끼가 지면/상자 밖으로 잘렸는데 녹임 없음/짧음 · `seam-far` 바탕 있는 그림이 상자 안에서 끝나 네모 변이 보임(또는 그 변 녹임이 짧음) · `bg-box` 그런 변이 3개 이상(바탕 그림 네모가 뜸) · `bg-in-cutout` 누끼 판정인데 그림 변 3개 이상에서 가장자리가 불투명(바탕이 들어 있음).

## 결과: **✗ 20건** / 측정 4209 (전 ✗ 216 / 4209)

| 원인 분류 | 전(before) 규격 | 후(after) 규격 | 전 변 | 후 변 |
|---|---|---|---|---|
| `cut-nomask` 끊김 · 잘린 변 녹임 없음 | 0 | 0 | 0 | 0 |
| `cut-short` 끊김 · 녹임 짧음 | 154 | 5 | 158 | 5 |
| `cutout-cut` 끊김 · 누끼 잘림 녹임 없음/짧음 | 0 | 0 | 0 | 0 |
| `seam-far` 이질감 · 그림 변 네모(녹임 없음/짧음) | 85 | 15 | 115 | 19 |
| `bg-box` 배경 들어감 · 바탕 그림 네모 뜸 | 0 | 0 | 0 | 0 |
| `bg-in-cutout` 배경 들어감 · 누끼에 바탕 네모 | 0 | 0 | 0 | 0 |
| **합계(규격, 중복 제외)** | **216** | **20** | 273 | 24 |

유형별 ✗/측정: illust 127 → 20 / 1677 · texture 2 → 0 / 259 · photo 87 → 0 / 1045 · cutout 0 → 0 / 1228

규격별 ✗(많은 순): `naver-gfa-mobile-da-1250x560` 3 · `remember-main-top-pc` 2 · `remember-main-mid-pc` 2 · `remember-job-top-pc` 2 · `jasoseol-m-premium-popup-mo` 1 · `remember-main-top-mo` 1 · `remember-main-mid-mo` 1 · `remember-job-top-mo` 1 · `remember-job-side-pc` 1 · `remember-job-side-mo` 1 · `jobda-main-pc` 1 · `jobda-main-mo` 1 · `google-gdn-300x600` 1 · `nap-dsp-band-320x50` 1 · `blind-post-banner` 1

케이스별 ✗(많은 순): `desk-11` 8 · `desk-37` 3 · `desk-08` 2 · `midas-glass-folders` 2 · `desk-21` 2 · `geo-3d` 1 · `desk-06` 1 · `t1014-gs2026` 1

## ✗ 목록

| 규격 | 케이스(유형) | 배치 | 지면 | 변 | 사유 |
|---|---|---|---|---|---|
| jasoseol-m-premium-popup-mo 600×880 | desk-08 (illust/illust-character) | templateMold cutFade,meltFix,templateMold,templateMold.logoArea | kv-edge | 오른 | 오른변 그림 끝 녹임 106px < 필요 260px(변 색 차 0.23 · 드러나는 색 차 0.24) |
| remember-main-top-pc 2240×360 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼·오른 | 왼변 그림 끝 녹임 352px < 필요 525px(변 색 차 0.17 · 드러나는 색 차 0.28) / 오른변 그림 끝 녹임 295px < 필요 499px(변 색 차 0.24 · 드러나는 색 차 0.24) |
| remember-main-top-pc 2240×360 | desk-37 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 오른 | 오른변 그림 끝 녹임 376px < 필요 634px(변 색 차 0.49 · 드러나는 색 차 0.41) |
| remember-main-top-mo 1005×360 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 윗 | 윗변 그림 끝 녹임 98px < 필요 150px(변 색 차 0.15 · 드러나는 색 차 0.21) |
| remember-main-mid-pc 2240×240 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼·오른 | 왼변 그림 끝 녹임 235px < 필요 544px(변 색 차 0.18 · 드러나는 색 차 0.29) / 오른변 그림 끝 녹임 196px < 필요 511px(변 색 차 0.24 · 드러나는 색 차 0.24) |
| remember-main-mid-pc 2240×240 | desk-37 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 오른 | 오른변 그림 끝 녹임 251px < 필요 649px(변 색 차 0.49 · 드러나는 색 차 0.41) |
| remember-main-mid-mo 1005×360 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 윗 | 윗변 그림 끝 녹임 98px < 필요 150px(변 색 차 0.15 · 드러나는 색 차 0.21) |
| remember-job-top-pc 2240×240 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼·오른 | 왼변 그림 끝 녹임 235px < 필요 544px(변 색 차 0.18 · 드러나는 색 차 0.29) / 오른변 그림 끝 녹임 196px < 필요 511px(변 색 차 0.24 · 드러나는 색 차 0.24) |
| remember-job-top-pc 2240×240 | desk-37 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 오른 | 오른변 그림 끝 녹임 251px < 필요 649px(변 색 차 0.49 · 드러나는 색 차 0.41) |
| remember-job-top-mo 1125×276 | midas-glass-folders (illust/illust-object) | templateMold templateMold,templateMold.freeKv | kv-edge | 왼 | 왼변 녹임 100px < 필요 241px(변 색 차 0.2 · 드러나는 색 차 0.24) |
| remember-job-side-pc 530×200 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 윗 | 윗변 그림 끝 녹임 53px < 필요 88px(변 색 차 0.15 · 드러나는 색 차 0.25) |
| remember-job-side-mo 1125×276 | midas-glass-folders (illust/illust-object) | templateMold templateMold,templateMold.freeKv | kv-edge | 왼 | 왼변 녹임 100px < 필요 241px(변 색 차 0.2 · 드러나는 색 차 0.24) |
| jobda-main-pc 792×240 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 윗 | 윗변 그림 끝 녹임 57px < 필요 101px(변 색 차 0.15 · 드러나는 색 차 0.22) |
| jobda-main-mo 343×160 | desk-11 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗 | 윗변 그림 끝 녹임 26px < 필요 69px(변 색 차 0.15 · 드러나는 색 차 0.24) |
| google-gdn-300x600 300×600 | desk-08 (illust/illust-character) | templateMold cutFade,meltFix,templateMold | kv-edge | 오른 | 오른변 그림 끝 녹임 106px < 필요 172px(변 색 차 0.23 · 드러나는 색 차 0.24) |
| nap-dsp-band-320x50 320×50 | desk-21 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼 | 왼변 그림 끝 녹임 17px < 필요 35px(변 색 차 0.16 · 드러나는 색 차 0.22) |
| naver-gfa-mobile-da-1250x560 1250×560 | geo-3d (illust/illust-room) | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 아랫 | 아랫변 녹임 78px < 필요 153px(변 색 차 0.49 · 드러나는 색 차 0.38) |
| naver-gfa-mobile-da-1250x560 1250×560 | desk-06 (illust/illust-character) | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 아랫 | 아랫변 녹임 92px < 필요 153px(변 색 차 0.62 · 드러나는 색 차 0.3) |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-gs2026 (illust/illust-scene) | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 아랫 | 아랫변 녹임 95px < 필요 153px(변 색 차 0.24 · 드러나는 색 차 0.47) |
| blind-post-banner 1250×560 | desk-21 (illust/illust-grad-bg) | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼·오른 | 왼변 그림 끝 녹임 115px < 필요 181px(변 색 차 0.17 · 드러나는 색 차 0.28) / 오른변 그림 끝 녹임 115px < 필요 175px(변 색 차 0.15 · 드러나는 색 차 0.25) |

## 규격 × 케이스 전체(✓ 포함, 수치)

변 = 종류(cut 잘린 변 / nat 그림 변)·녹임 px·dNear/dSeam · 지면 변에 붙은 변·둥근 상자·지면 전체 그림은 생략. 「잇는 중」 = 드러나는 색 차 ≥ 0.15 이지만 녹임이 필요 길이를 채운 변.


### 자소설닷컴 · PC프리미엄패키지 - PC팝업배너 `jasoseol-pc-premium-popup-pc` 550×400

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 85px 0/0.22 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.18 잇는 중 · 아랫:cut 0px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.01 · 오른:nat 34px 0/0.04 · 윗:nat 59px 0/0.05 · 아랫:nat 0px 0.01/0.01 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.slotCover | kv-edge | 왼:cut 85px 0/0.06 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 62px 0/0.04 · 아랫:nat 0px 0.02/0.02 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0.04 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.03 · 아랫:cut 0px 0.49/0.49 잇는 중 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0.01 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 62px 0/0.02 · 아랫:cut 0px 0.37/0.29 잇는 중 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 37px 0/0.02 · 오른:nat 38px 0/0.06 · 윗:nat 59px 0/0.1 · 아랫:nat 0px 0.01/0.02 | ✓ |
| fox-3d | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 85px 0/0.37 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.23 잇는 중 · 아랫:cut 0px 0.53/0.51 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 105px 0/0.26 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 71px 0/0.22 잇는 중 · 아랫:cut 0px 0.02/0.03 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 137px 0/0.24 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 99px 0/0.38 잇는 중 · 아랫:nat 0px 0.16/0.18 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 117px 0/0.25 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 90px 0/0.47 잇는 중 · 아랫:nat 0px 0.17/0.17 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,textColour.brand,templateMold.slotCover | kv-edge | 왼:cut 85px 0/0.23 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 62px 0/0.15 잇는 중 · 아랫:nat 0px 0/0.01 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 56px 0/0.24 잇는 중 · 오른:nat 96px 0/0.43 잇는 중 · 윗:nat 64px 0/0.15 잇는 중 · 아랫:nat 0px 0.05/0.08 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.45 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.15 잇는 중 · 아랫:nat 0px 0.06/0.27 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.27 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.57 잇는 중 · 아랫:nat 0px 0/0.08 | ✓ |
| sep-open-recruit | templateMold overlapFix.ok,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.4 잇는 중 · 아랫:nat 0px 0/0.4 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 85px 0/0.07 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 62px 0/0.08 · 아랫:nat 0px 0.04/0.04 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 85px 0/0.05 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 62px 0/0.03 · 아랫:nat 0px 0.03/0.03 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 110px 0/0.16 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.11 · 아랫:cut 0px 0.02/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.41 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.33 잇는 중 · 아랫:nat 0px 0.26/0.27 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.22 잇는 중 · 아랫:nat 0px 0.19/0.47 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 137px 0/0.14 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0/0.06 · 아랫:nat 0px 0.04/0.16 잇는 중 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 137px 0/0.13 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 88px 0/0.21 잇는 중 · 아랫:nat 0px 0.24/0.18 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.54 잇는 중 · 아랫:nat 0px 0/0.21 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 137px 0/0.48 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0.01/0.47 잇는 중 · 아랫:nat 0px 0.47/0.48 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 137px 0/0.29 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0/0.32 잇는 중 · 아랫:nat 0px 0.27/0.31 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 137px 0/0.31 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 90px 0/0.51 잇는 중 · 아랫:cut 0px 0.1/0.14 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 125px 0/0.18 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 97px 0.01/0.14 · 아랫:nat 0px 0.15/0.18 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.29 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.31 잇는 중 · 아랫:nat 0px 0/0.6 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 117px 0/0.24 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 90px 0/0.24 잇는 중 · 아랫:nat 0px 0.23/0.33 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.2 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.32 잇는 중 · 아랫:nat 0px 0/0.17 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 137px 0/0.2 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0/0.27 잇는 중 · 아랫:nat 0px 0.11/0.16 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 45px 0/0.02 · 오른:nat 82px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.01 · 아랫:nat 0px 0.07/0.09 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 100px 0/0.07 · 오른:nat 95px (표본 부족(글자·로고 위)) · 윗:nat 0px 0.02/0.05 · 아랫:nat 0px 0.03/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 120px 0/0.43 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 88px 0/0.44 잇는 중 · 아랫:cut 0px 0.1/0.16 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 82px 0/0.02 · 오른:nat 100px (표본 부족(글자·로고 위)) · 윗:nat 0px 0.01/0.01 · 아랫:nat 0px 0.03/0.11 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 137px 0/0.12 · 오른:nat 80px (표본 부족(글자·로고 위)) · 윗:nat 0px 0.01/0.02 · 아랫:nat 0px 0.27/0.43 잇는 중 | ✓ |
| midas-book-open | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.52 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 132px 0/0.3 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 79px 0/0.23 잇는 중 · 아랫:cut 0px 0.5/0.57 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 117px 0/0.27 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 103px 0/0.25 잇는 중 · 아랫:nat 2px 0/0.31 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-colour | 왼:cut 87px 0/0.09 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 86px 0/0.05 · 아랫:nat 0px 0.09/0.09 | ✓ |
| midas-glass-mint | templateMold overlapFix.ok,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.11 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.21 잇는 중 | ✓ |
| midas-glass-dark | templateMold overlapFix.ok,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.15 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.41 잇는 중 · 아랫:nat 0px 0/0.08 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0 · 아랫:cut 0px 0.05/0.06 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea,templateMold.slotCover | kv-colour | 왼:nat 95px 0/0.11 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.06 · 아랫:cut 0px 0.06/0.07 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 35px 0/0.12 · 오른:nat 37px 0/0.13 · 윗:nat 51px 0/0.13 · 아랫:nat 0px 0.01/0.02 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.13 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.27 잇는 중 · 아랫:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood | 왼:nat 132px 0/0.26 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 97px 0/0.18 잇는 중 · 아랫:cut 0px 0.21/0.21 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 102px 0/0.18 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 97px 0/0.1 · 아랫:cut 0px 0.15/0.18 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 137px 0/0.37 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.14 · 아랫:cut 0px 0.38/0.59 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 41px 0/0.08 · 오른:nat 33px 0/0.08 · 윗:nat 59px 0/0.03 · 아랫:nat 0px 0.22/0.3 잇는 중 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 112px 0/0.21 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.1 · 아랫:cut 0px 0.15/0.16 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 90px 0/0.03 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 64px 0/0.08 · 아랫:nat 0px 0.02/0.02 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 137px 0/0.29 잇는 중 · 오른:nat 115px (표본 부족(글자·로고 위)) · 윗:nat 56px 0/0.23 잇는 중 · 아랫:nat 0px 0.02/0.06 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 137px 0.01/0.45 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0/0.48 잇는 중 · 아랫:cut 0px 0.49/0.55 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 85px 0/0.14 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 86px 0/0.13 · 아랫:cut 0px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 110px 0/0.15 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.04 · 아랫:cut 0px 0.03/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 137px 0/0.36 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 64px 0/0.21 잇는 중 · 아랫:cut 0px 0.4/0.45 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.12 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0.01/0.29 잇는 중 · 아랫:nat 0px 0.01/0.11 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 97px 0/0.16 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 90px 0/0.16 잇는 중 · 아랫:cut 0px 0.16/0.16 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0.37 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0/0 · 아랫:cut 0px 0.01/0.11 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,textColour.brand,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 34px 0/0.12 · 오른:nat 34px 0/0.05 · 윗:nat 51px 0/0.06 · 아랫:nat 0px 0.03/0.03 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.62 잇는 중 · 아랫:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:cut 125px 0/0.09 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 95px 0/0.12 · 아랫:cut 0px 0.12/0.12 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 137px 0/0.28 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0/0.23 잇는 중 · 아랫:cut 0px 0/0 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 63px 0/0.25 잇는 중 · 오른:nat 60px 0/0.16 잇는 중 · 윗:nat 88px 0/0.38 잇는 중 · 아랫:nat 0px 0.02/0.06 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 85px 0/0.52 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0/0.54 잇는 중 · 아랫:cut 0px 0/0 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.53 잇는 중 · 아랫:nat 0px 0/0.19 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 100px 0/0.04 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.08 · 아랫:cut 0px 0.11/0.14 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0.14 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.05 · 아랫:cut 0px 0.07/0.12 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 33px 0/0.01 · 오른:nat 33px 0/0.01 · 윗:nat 51px 0/0 · 아랫:nat 0px 0.01/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0.18 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.17 잇는 중 · 아랫:cut 0px 0.27/0.3 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 125px 0/0.34 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0.01/0.43 잇는 중 · 아랫:cut 0px 0.17/0.23 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 130px 0/0.36 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 97px 0.01/0.35 잇는 중 · 아랫:cut 0px 0.3/0.47 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 67px 0/0.28 잇는 중 · 오른:nat 67px 0/0.31 잇는 중 · 윗:nat 51px 0/0.03 · 아랫:nat 0px 0.25/0.45 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 87px 0/0.06 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 68px 0/0.06 · 아랫:cut 0px 0.07/0.08 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 135px 0/0.14 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0/0.15 잇는 중 · 아랫:nat 0px 0.06/0.07 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 97px 0/0.2 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 82px 0/0.28 잇는 중 · 아랫:nat 0px 0.19/0.17 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.22 잇는 중 · 아랫:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-vivid-photo | 왼:nat 122px 0/0.22 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 90px 0/0.29 잇는 중 · 아랫:cut 0px 0.24/0.25 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 100px 0/0.21 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 86px 0/0.07 · 아랫:cut 0px 0.17/0.17 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 85px 0/0.12 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.05 · 아랫:cut 0px 0.27/0.33 잇는 중 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.63 잇는 중 · 아랫:nat 0px 0/0.58 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 137px 0/0.33 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0.01/0.34 잇는 중 · 아랫:cut 0px 0.43/0.44 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 85px 0/0.36 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 101px 0/0.37 잇는 중 · 아랫:cut 0px 0.01/0.01 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 97px 0/0.16 잇는 중 · 오른:nat 137px (표본 부족(글자·로고 위)) · 윗:nat 0px 0.02/0.02 · 아랫:nat 0px 0.24/0.39 잇는 중 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.38 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.48 잇는 중 · 아랫:nat 0px 0/0.29 잇는 중 | ✓ |
| t1014-abl | templateMold overlapFix.ok,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.44 잇는 중 · 아랫:nat 0px 0/0.5 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 왼:cut 137px 0/0.31 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.15 잇는 중 · 아랫:nat 0px 0.36/0.56 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 135px 0/0.31 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:cut 62px 0/0.18 잇는 중 · 아랫:cut 0px 0.28/0.37 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 85px 0/0.05 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 64px 0/0.05 · 아랫:nat 0px 0.07/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 90px 0/0.06 · 오른:nat 137px (표본 부족(글자·로고 위)) · 윗:nat 0px 0.02/0.03 · 아랫:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 137px 0/0.1 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 97px 0/0.18 잇는 중 · 아랫:nat 0px 0.19/0.21 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 22px 0/0.6 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.18 잇는 중 · 아랫:cut 51px 0/0.44 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold overlapFix.ok,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.34 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold overlapFix.ok,templateMold,templateMold.logoArea,overlapFix.text | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.59 잇는 중 · 아랫:nat 0px 0/0.2 잇는 중 | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 137px 0/0.3 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 62px 0/0.02 · 아랫:nat 0px 0.35/0.5 잇는 중 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 135px 0/0.16 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 92px 0/0.12 · 아랫:nat 0px 0.22/0.17 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.66 잇는 중 · 아랫:nat 0px 0/0.54 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-vivid-photo | 왼:cut 137px 0/0.39 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0/0.27 잇는 중 · 아랫:nat 0px 0.24/0.45 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0/0.38 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-vivid-photo | 왼:cut 137px 0/0.34 잇는 중 · 오른:cut 0px (표본 부족(글자·로고 위)) · 윗:nat 101px 0.01/0.17 잇는 중 · 아랫:nat 0px 0.13/0.16 잇는 중 | ✓ |

### 자소설닷컴 · PC프리미엄패키지 - PC채용공고배너 `jasoseol-pc-premium-jobpost-pc` 160×600

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 윗:cut 36px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 20px 0/0.01 · 오른:nat 37px 0/0.05 · 윗:nat 64px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand | kv-edge | 윗:nat 36px 0/0.01 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0.01 | ✓ |
| samsung-3d | templateMold cutFade,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 34px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 41px 0/0.03 · 오른:nat 42px 0/0.06 · 윗:nat 64px 0/0.1 | ✓ |
| fox-3d | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 47px 0/0.07 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 78px 0/0.24 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 108px 0/0.38 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 98px 0/0.42 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,textColour.brand | kv-edge | 윗:nat 36px 0/0 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.05/0.08 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.11 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.09 | ✓ |
| hdot-hall | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.32 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 110px 0/0.05 | ✓ |
| hdot-audience | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 96px 0/0.19 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 110px 0.01/0.46 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 110px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 104px 0.01/0.38 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 106px 0.01/0.14 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 98px 0.01/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.48 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 110px 0/0.25 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.05 | ✓ |
| midas-bridge-icons | templateMold cutFade,templateMold | kv-edge | 윗:nat 51px 0/0.33 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 · 오른:nat 0px 0/0.56 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 86px 0/0.23 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 66px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 윗:nat 94px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-colour | 윗:nat 61px 0/0.08 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 38px 0/0.12 · 오른:nat 40px 0/0.13 · 윗:nat 56px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.16 잇는 중 · 오른:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 윗:nat 85px 0/0.22 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:cut 84px 0/0.11 | ✓ |
| desk-06 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.11 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 45px 0/0.08 · 오른:nat 20px 0/0.03 · 윗:nat 64px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 66px 0/0.13 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 70px 0/0.11 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 36px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 61px 0/0.41 잇는 중 | ✓ |
| desk-13 | templateMold cutFade,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.03 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-14 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 51px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 80px 0/0.39 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.08 · 오른:nat 0px 0/0.72 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 98px 0/0.19 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 110px 0/0.09 | ✓ |
| desk-18 | templateMold templateMold,textColour.brand,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0/0 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.35 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 104px 0/0.22 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 110px 0/0.26 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| desk-21 | templateMold templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 69px (표본 부족(글자·로고 위)) · 오른:nat 65px (표본 부족(글자·로고 위)) · 윗:nat 96px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.42 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-23 | templateMold templateMold,templateMold.logoArea | kv-colour | 윗:cut 66px 0/0.13 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 68px 0/0.11 | ✓ |
| desk-25 | templateMold templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| desk-26 | templateMold cutFade,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.12 | ✓ |
| desk-27 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 110px 0.01/0.27 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 106px 0.01/0.27 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 73px 0/0.28 잇는 중 · 오른:nat 73px 0/0.31 잇는 중 · 윗:nat 56px 0/0.03 | ✓ |
| desk-30 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 74px 0/0.17 잇는 중 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 110px 0/0.24 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 88px 0.01/0.31 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 78px 0/0.25 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 94px 0.01/0.26 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0.09 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.73 잇는 중 | ✓ |
| desk-36 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:cut 110px 0/0.42 잇는 중 | ✓ |
| desk-10 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.29 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.04 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| t1014-gs2025 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0.17 잇는 중 | ✓ |
| t1014-gs2026 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 44px 0/0.12 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 70px 0/0.04 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 106px 0/0.16 잇는 중 | ✓ |
| t1014-dongsuh | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-asan-illust | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.01 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 100px 0/0.16 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.48 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 110px 0/0.33 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 110px 0.01/0.13 | ✓ |

### 자소설닷컴 · PC스탠다드패키지 - PC메인배너 `jasoseol-pc-standard-main-pc` 1200×280

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 오른:cut 63px 0/0.18 잇는 중 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 28px 0/0.01 · 오른:nat 52px 0/0.04 | ✓ |
| slabs-3d | templateMold meltFix,templateMold,textColour.brand | kv-edge | 오른:cut 193px 0/0.22 잇는 중 | ✓ |
| geo-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.33 잇는 중 | ✓ |
| samsung-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.29 잇는 중 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 57px 0/0.03 · 오른:nat 58px 0/0.06 | ✓ |
| fox-3d | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.43 잇는 중 | ✓ |
| ilhwa-dark | templateMold templateMold | kv-mood-dark | 오른:cut 123px 0/0.13 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 오른:nat 193px 0/0.25 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 오른:nat 193px 0/0.25 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand | kv-edge | 오른:cut 193px 0/0.23 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 86px 0/0.24 잇는 중 · 오른:nat 147px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 오른:nat 0px 0/0.19 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.48 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 오른:nat 0px 0/0.19 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 63px 0/0.02 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 63px 0/0.02 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 154px 0/0.17 잇는 중 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.33 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.29 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 193px 0/0.11 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 172px 0/0.26 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 오른:nat 0px 0/0.19 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 오른:cut 193px 0/0.44 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 오른:cut 193px 0/0.31 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 오른:nat 193px 0/0.31 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold | kv-vivid-photo | 오른:cut 133px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 오른:cut 172px 0/0.28 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 · 오른:nat 0px 0/0.17 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 오른:cut 193px 0/0.14 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 오른:nat 116px 0/0.25 잇는 중 · 윗:nat 0px 0/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad | kv-edge | 오른:nat 133px 0/0.04 · 윗:nat 0px 0.03/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 오른:nat 168px 0/0.37 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 오른:nat 140px 0/0.11 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 오른:nat 63px 0/0.02 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.52 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 오른:cut 158px 0/0.29 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold | kv-mood-dark | 오른:cut 144px 0/0.12 | ✓ |
| midas-facets | templateMold templateMold,templateMold.logoArea | kv-colour | 오른:cut 112px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:cut 140px 0/0.26 잇는 중 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-colour | 오른:nat 133px 0/0.05 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 54px 0/0.12 · 오른:nat 57px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.03 · 오른:nat 0px 0/0.3 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 오른:nat 186px 0/0.26 잇는 중 | ✓ |
| desk-05 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 오른:nat 147px 0/0.1 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.35 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 63px 0/0.08 · 오른:nat 29px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 158px 0/0.2 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 119px 0/0.09 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 오른:nat 161px 0/0.24 잇는 중 · 윗:nat 79px 0/0.21 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.4 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:nat 63px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 154px 0/0.17 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.37 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.39 잇는 중 | ✓ |
| desk-16 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 오른:nat 133px 0/0.32 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:cut 63px 0/0 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 51px 0/0.12 · 오른:nat 51px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 오른:cut 158px 0/0.12 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:cut 193px 0/0.22 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 97px 0/0.24 잇는 중 · 오른:nat 92px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 63px 0/0.26 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.16 잇는 중 · 오른:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 오른:nat 140px 0/0.17 잇는 중 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:cut 116px 0/0.11 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 50px 0/0.01 · 오른:nat 50px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:cut 63px 0/0.04 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 오른:nat 186px 0/0.22 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 오른:nat 186px 0/0.3 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 102px 0/0.28 잇는 중 · 오른:nat 102px 0/0.3 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:cut 123px 0/0.06 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 189px 0/0.13 | ✓ |
| desk-32 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 137px 0/0.17 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 오른:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 오른:nat 172px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 140px 0/0.25 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:cut 63px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.36 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 오른:nat 193px 0/0.36 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.logoArea | kv-edge | 오른:nat 63px 0/0.11 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 오른:nat 193px 0/0.41 잇는 중 · 윗:nat 0px 0.01/0.02 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.34 잇는 중 · 오른:nat 0px 0/0.44 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 오른:nat 193px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:nat 189px 0/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 123px 0/0.13 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 오른:nat 193px 0/0.22 잇는 중 · 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 172px 0/0.12 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 2px 0/– · 오른:nat 2px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 91px 0/0.38 잇는 중 · 오른:nat 91px 0/0.27 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 오른:cut 193px 0/0.27 잇는 중 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 오른:cut 147px 0/0.22 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 오른:nat 0px 0/– · 윗:nat 0px 0/0.62 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 오른:cut 193px 0/0.27 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.28 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 오른:cut 193px 0/0.29 잇는 중 | ✓ |

### 자소설닷컴 · PC스탠다드패키지 - PC채용공고배너 `jasoseol-pc-standard-jobpost-pc` 160×600

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 윗:cut 36px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 20px 0/0.01 · 오른:nat 37px 0/0.05 · 윗:nat 64px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand | kv-edge | 윗:nat 36px 0/0.01 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0.01 | ✓ |
| samsung-3d | templateMold cutFade,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 34px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 41px 0/0.03 · 오른:nat 42px 0/0.06 · 윗:nat 64px 0/0.1 | ✓ |
| fox-3d | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 47px 0/0.07 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 78px 0/0.24 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 108px 0/0.38 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 98px 0/0.42 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,textColour.brand | kv-edge | 윗:nat 36px 0/0 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.05/0.08 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.11 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.09 | ✓ |
| hdot-hall | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.32 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 110px 0/0.05 | ✓ |
| hdot-audience | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 96px 0/0.19 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 110px 0.01/0.46 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 110px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 104px 0.01/0.38 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 106px 0.01/0.14 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 98px 0.01/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.48 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 110px 0/0.25 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.05 | ✓ |
| midas-bridge-icons | templateMold cutFade,templateMold | kv-edge | 윗:nat 51px 0/0.33 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 · 오른:nat 0px 0/0.56 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 86px 0/0.23 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 66px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 윗:nat 94px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-colour | 윗:nat 61px 0/0.08 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 38px 0/0.12 · 오른:nat 40px 0/0.13 · 윗:nat 56px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.16 잇는 중 · 오른:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 윗:nat 85px 0/0.22 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:cut 84px 0/0.11 | ✓ |
| desk-06 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.11 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 45px 0/0.08 · 오른:nat 20px 0/0.03 · 윗:nat 64px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 66px 0/0.13 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 70px 0/0.11 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 36px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 61px 0/0.41 잇는 중 | ✓ |
| desk-13 | templateMold cutFade,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.03 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-14 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 51px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 80px 0/0.39 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.08 · 오른:nat 0px 0/0.72 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 98px 0/0.19 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 110px 0/0.09 | ✓ |
| desk-18 | templateMold templateMold,textColour.brand,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0/0 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.35 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 104px 0/0.22 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 110px 0/0.26 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| desk-21 | templateMold templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 69px (표본 부족(글자·로고 위)) · 오른:nat 65px (표본 부족(글자·로고 위)) · 윗:nat 96px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.42 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-23 | templateMold templateMold,templateMold.logoArea | kv-colour | 윗:cut 66px 0/0.13 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 68px 0/0.1 | ✓ |
| desk-25 | templateMold templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| desk-26 | templateMold cutFade,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.12 | ✓ |
| desk-27 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 110px 0.01/0.27 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 106px 0.01/0.27 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 73px 0/0.28 잇는 중 · 오른:nat 73px 0/0.31 잇는 중 · 윗:nat 56px 0/0.03 | ✓ |
| desk-30 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 74px 0/0.17 잇는 중 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 110px 0/0.24 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 88px 0.01/0.31 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 78px 0/0.25 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 94px 0/0.26 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0.09 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.73 잇는 중 | ✓ |
| desk-36 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:cut 110px 0/0.42 잇는 중 | ✓ |
| desk-10 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 45px 0/0.3 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.04 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| t1014-gs2025 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 36px 0/0.17 잇는 중 | ✓ |
| t1014-gs2026 | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 44px 0/0.12 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 70px 0/0.04 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 106px 0/0.16 잇는 중 | ✓ |
| t1014-dongsuh | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-asan-illust | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 36px 0/0.01 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 100px 0/0.16 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.48 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 110px 0/0.33 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 110px 0.01/0.13 | ✓ |

### 자소설닷컴 · M프리미엄패키지 - M팝업배너 `jasoseol-m-premium-popup-mo` 600×880

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold cutFade,templateMold | kv-edge | 왼:nat 0px 0/0 · 오른:nat 0px 0/0 · 윗:nat 81px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 35px 0/0.01 · 오른:nat 63px 0/0.05 · 윗:nat 108px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 61px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0.01 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:nat 61px 0/0.01 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 68px 0/0.03 · 오른:nat 71px 0/0.06 · 윗:nat 108px 0/0.1 | ✓ |
| fox-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0.01 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 131px 0/0.24 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 181px 0/0.48 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 165px 0/0.48 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 61px 0/0 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 103px 0/0.25 잇는 중 · 오른:nat 176px 0/0.43 잇는 중 · 윗:nat 118px 0/0.15 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 161px 0/0.37 잇는 중 · 오른:nat 113px 0/0.53 잇는 중 · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 117px 0/0.5 잇는 중 · 오른:nat 27px 0/0.39 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 62px 0/0.04 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 62px 0/0.02 | ✓ |
| hdot-hall | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0.01 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 185px 0/0.04 | ✓ |
| hdot-audience | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 윗:cut 161px 0/0.1 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 185px 0/0.49 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 185px 0/0.41 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 185px 0/0.49 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 178px 0/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 165px 0/0.23 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 185px 0/0.3 잇는 중 | ✓ |
| midas-acrylic-box | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 99px 0/0.02 · 오른:nat 181px 0/0.25 잇는 중 · 윗:nat 94px 0/0 | ✓ |
| midas-cards-orange | templateMold cutFade,meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 210px 0/0.07 · 오른:nat 200px 0/0.04 · 윗:nat 111px 0/0.06 | ✓ |
| midas-bridge-icons | templateMold templateMold | kv-edge | 윗:cut 61px 0/0.01 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 168px 0/0.02 · 오른:nat 203px 0/0.11 · 윗:nat 94px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 145px 0/0.21 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 185px 0/0.31 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 윗:nat 158px 0/0.03 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0 | ✓ |
| desk-02 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-colour | 윗:cut 111px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 65px 0/0.13 · 오른:nat 68px 0/0.13 · 윗:nat 94px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.29 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 윗:nat 178px 0/0.1 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:cut 141px 0/0.11 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 111px 0/0.14 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 76px 0/0.08 · 오른:nat 34px 0/0.02 · 윗:nat 108px 0/0.03 | ✓ |
| desk-08 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 106px 0/0.21 잇는 중 · 오른:nat 106px 0/0.24 ✗ · 윗:nat 66px 0/0.05 | ✗ seam-far |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 118px 0/0.06 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 134px 0/0.25 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 185px 0/0.47 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| desk-14 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 134px 0/0.33 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 165px 0/0.18 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 185px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,textColour.brand,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 62px 0/0.12 · 오른:nat 62px 0/0.05 · 윗:nat 94px 0/0.06 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 175px 0/0.16 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 185px 0/0.26 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 116px 0/0.24 잇는 중 · 오른:nat 111px 0/0.16 잇는 중 · 윗:nat 161px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0.3 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.14 | ✓ |
| desk-23 | templateMold templateMold,templateMold.logoArea | kv-colour | 윗:cut 111px 0/0.11 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 114px 0/0.05 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 61px 0/0.01 · 오른:nat 61px 0/0.01 · 윗:nat 94px 0/0 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0 | ✓ |
| desk-27 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 185px 0/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 178px 0/0.34 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 123px 0/0.28 잇는 중 · 오른:nat 123px 0/0.31 잇는 중 · 윗:nat 94px 0/0.03 | ✓ |
| desk-30 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 124px 0/0.08 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 186px 0/0.15 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 151px 0/0.19 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 165px 0/0.24 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 158px 0/0.21 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-36 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:cut 185px 0/0.36 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0.02 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.03 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.41 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold templateMold,textColour.brand,templateMold.logoArea | kv-edge | 윗:cut 61px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 181px 0/0.38 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 118px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 181px 0/0.11 · 오른:nat 277px 0/0.2 잇는 중 · 윗:nat 94px 0/0.08 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 178px 0/0.09 | ✓ |
| t1014-dongsuh | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 81px 0/0.14 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 131px 0/0.14 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.63 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:cut 185px 0/0.31 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 150px 0.01/0.14 | ✓ |

### 자소설닷컴 · M프리미엄패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-premium-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · M스탠다드패키지 - M메인배너 `jasoseol-m-standard-main-mo` 750×500

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 127px 0/0.12 · 윗:nat 116px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 34px 0/0.01 · 오른:nat 63px 0/0.04 · 윗:nat 109px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.slotCover | kv-edge | 왼:cut 127px 0/0.06 · 윗:nat 116px 0/0.07 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand | kv-edge | 왼:cut 127px 0/0.15 잇는 중 · 윗:cut 116px 0/0.16 잇는 중 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand | kv-edge | 왼:cut 127px 0/0.01 · 윗:nat 116px 0/0.15 잇는 중 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 69px 0/0.03 · 오른:nat 71px 0/0.06 · 윗:nat 109px 0/0.1 | ✓ |
| fox-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 127px 0/0.36 잇는 중 · 윗:cut 116px 0/0.27 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 157px 0/0.26 잇는 중 · 윗:cut 133px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 206px 0/0.24 잇는 중 · 윗:cut 184px 0/0.36 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 206px 0/0.24 잇는 중 · 윗:cut 167px 0/0.42 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.slotCover | kv-edge | 왼:cut 206px 0/0.19 잇는 중 · 윗:nat 116px 0/0.21 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 104px 0/0.25 잇는 중 · 오른:nat 179px 0/0.43 잇는 중 · 윗:nat 119px 0/0.15 잇는 중 | ✓ |
| dongbu_illust | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed,overlapFix.text | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| fox-cutout | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| sep-open-recruit | templateMold overlapFix.fail,cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 127px 0/0.08 · 윗:nat 116px 0/0.08 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 127px 0/0.06 · 윗:nat 116px 0/0.04 | ✓ |
| hdot-hall | templateMold meltFix,templateMold | kv-edge | 왼:cut 165px 0/0.08 · 윗:cut 116px 0/0.13 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 206px 0/0.13 · 윗:nat 187px 0/0.1 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 206px 0/0.17 잇는 중 · 윗:nat 163px 0/0.19 잇는 중 | ✓ |
| hdot-asterisk | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 206px 0/0.47 잇는 중 · 윗:nat 187px 0/0.45 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 206px 0/0.28 잇는 중 · 윗:nat 187px 0/0.4 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 206px 0/0.32 잇는 중 · 윗:cut 153px 0/0.46 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 161px 0/0.2 잇는 중 · 윗:cut 180px 0/0.14 | ✓ |
| midas-stadium-wire | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed,overlapFix.text | kv-vivid | 왼:nat 0px 0/0.41 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 183px 0/0.28 잇는 중 · 윗:nat 167px 0/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| midas-folder-dark | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/– | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 206px 0/0.19 잇는 중 · 윗:cut 187px 0/0.26 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 67px 0/0.03 · 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 150px 0/0.07 · 윗:nat 0px 0.03/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 180px 0/0.35 잇는 중 · 윗:cut 163px 0/0.46 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 123px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 206px 0/0.13 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.61 잇는 중 | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 198px 0/0.29 잇는 중 · 윗:cut 146px 0/0.22 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 176px 0/0.31 잇는 중 · 윗:nat 187px 0/0.26 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:cut 176px 0/0.08 · 윗:nat 160px 0/0.06 | ✓ |
| midas-glass-mint | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.09 · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 왼:cut 127px 0/0 · 윗:cut 116px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.slotCover | kv-colour | 왼:nat 142px 0/0.11 · 윗:cut 116px 0/0.07 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 65px 0/0.12 · 오른:nat 69px 0/0.13 · 윗:nat 95px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood | 왼:nat 198px 0/0.22 잇는 중 · 윗:cut 180px 0/0.2 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 153px 0/0.11 · 윗:cut 184px 0/0.14 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 206px 0/0.35 잇는 중 · 윗:cut 116px 0/0.13 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 76px 0/0.08 · 오른:nat 61px 0/0.08 · 윗:nat 109px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 168px 0/0.15 잇는 중 · 윗:cut 116px 0/0.06 | ✓ |
| desk-09 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 135px 0/0.03 · 윗:nat 119px 0/0.1 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 206px 0/0.33 잇는 중 · 윗:nat 84px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 206px 0/0.43 잇는 중 · 윗:cut 129px 0/0.43 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.slotCover | kv-edge | 왼:nat 127px 0/0.06 · 윗:cut 116px 0/0.14 | ✓ |
| desk-13-cut | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 165px 0/0.13 · 윗:cut 116px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 206px 0/0.35 잇는 중 · 윗:cut 116px 0/0.2 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0.01/– | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 146px 0/0.22 잇는 중 · 윗:cut 173px 0/0.24 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 왼:cut 127px 0/0.33 잇는 중 · 윗:cut 187px 0/0.01 | ✓ |
| desk-18 | templateMold overlapFix.ok,cutFade,meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 53px 0/0.12 · 오른:nat 53px 0/0.05 · 윗:nat 81px 0/0.06 | ✓ |
| desk-18-cut | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:cut 187px 0/0.1 · 윗:cut 177px 0/0.21 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand | kv-edge | 왼:cut 206px 0/0.26 잇는 중 · 윗:cut 187px 0/0.26 잇는 중 | ✓ |
| desk-20-cut | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 117px 0/0.24 잇는 중 · 오른:nat 112px 0/0.16 잇는 중 · 윗:nat 163px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 127px 0/0.52 잇는 중 · 윗:cut 116px 0/0.62 잇는 중 | ✓ |
| desk-22-cut | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 150px 0/0.06 · 윗:cut 116px 0/0.05 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 왼:cut 127px 0/0.13 · 윗:cut 116px 0/0.07 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 61px 0/0.01 · 오른:nat 61px 0/0.01 · 윗:nat 95px 0/0 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand | kv-edge | 왼:cut 127px 0/0.19 잇는 중 · 윗:cut 116px 0/0.23 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 187px 0/0.24 잇는 중 · 윗:cut 187px 0/0.24 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.slotCover | kv-mood | 왼:nat 195px 0/0.36 잇는 중 · 윗:cut 180px 0/0.27 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 125px 0/0.28 잇는 중 · 오른:nat 125px 0/0.3 잇는 중 · 윗:nat 95px 0/0.03 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand | kv-edge | 왼:cut 131px 0/0.04 · 윗:cut 126px 0/0.1 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 202px 0/0.16 잇는 중 · 윗:nat 187px 0/0.18 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 206px 0/0.18 잇는 중 · 윗:nat 153px 0/0.33 잇는 중 | ✓ |
| desk-32-cut | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed,overlapFix.text | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 183px 0/0.28 잇는 중 · 윗:cut 167px 0/0.27 잇는 중 | ✓ |
| desk-34 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 150px 0/0.24 잇는 중 · 윗:cut 187px 0/0.23 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand | kv-edge | 왼:cut 127px 0/0.13 · 윗:cut 116px 0/0.09 | ✓ |
| desk-35-cut | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 206px 0/0.35 잇는 중 · 윗:cut 187px 0/0.35 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 127px 0/0.3 잇는 중 · 윗:cut 116px 0/0.31 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 146px 0/0.23 잇는 중 · 윗:nat 0px 0.02/0.02 | ✓ |
| desk-37-cut | templateMold objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand | kv-edge | 왼:cut 206px 0/0.32 잇는 중 · 윗:cut 116px 0/0.18 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 202px 0/0.29 잇는 중 · 윗:cut 116px 0/0.15 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 127px 0/0.02 · 윗:nat 119px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 135px 0/0.05 · 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 206px 0/0.09 · 윗:nat 180px 0/0.19 잇는 중 | ✓ |
| t1014-dongsuh | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold | kv-edge | 왼:cut 206px 0/0.3 잇는 중 · 윗:nat 116px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 202px 0/0.2 잇는 중 · 윗:nat 170px 0/0.15 잇는 중 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 206px 0/0.43 잇는 중 · 윗:nat 187px 0/0.3 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 206px 0/0.47 잇는 중 · 윗:nat 187px 0/0.16 잇는 중 | ✓ |

### 자소설닷컴 · M스탠다드패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-standard-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · PC달력배너 (채용달력 좌측 게재) `jasoseol-pc-calendar-pc` 164×233

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 윗:cut 14px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 8px 0/0.01 · 오른:nat 15px 0/0.05 · 윗:nat 26px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0.01 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand | kv-edge | 윗:nat 14px 0/0.01 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 16px 0.01/0.02 · 오른:nat 17px 0/0.06 · 윗:nat 26px 0/0.09 | ✓ |
| fox-3d | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.15 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 30px 0/0.19 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 38px 0.01/0.48 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 39px 0.01/0.46 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0.01 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 25px 0/0.29 잇는 중 · 오른:nat 42px 0/0.43 잇는 중 · 윗:nat 28px 0/0.14 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.57 잇는 중 | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.24 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 오른:nat 0px 0/0.31 잇는 중 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.2 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.06 | ✓ |
| hdot-purple3d | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.03 | ✓ |
| hdot-hall | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.01 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 · 오른:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.22 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.27 잇는 중 · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 44px 0/0.03 | ✓ |
| hdot-audience | templateMold templateMold | kv-mood-dark | 윗:cut 38px 0.01/0.21 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 44px 0.01/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 44px 0.01/0.37 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 44px 0.01/0.5 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 42px 0.01/0.18 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 39px 0.01/0.23 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 · 오른:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 44px 0/0.26 잇는 중 | ✓ |
| midas-acrylic-box | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 24px 0/0.02 · 오른:nat 43px 0/0.24 잇는 중 · 윗:nat 22px 0/0.01 | ✓ |
| midas-cards-orange | templateMold cutFade,meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 50px 0/0.07 · 오른:nat 48px 0/0.04 · 윗:nat 26px 0/0.05 | ✓ |
| midas-bridge-icons | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.01 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 40px 0/0.02 · 오른:nat 48px 0/0.12 · 윗:nat 22px 0/0.01 | ✓ |
| midas-book-vib | templateMold cutFade,meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 87px (표본 부족(글자·로고 위)) · 오른:nat 29px (표본 부족(글자·로고 위)) · 윗:nat 22px 0/0 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0.15/0.35 잇는 중 · 오른:nat 0px 0.28/0.55 잇는 중 · 윗:nat 0px 0.01/0.45 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 34px 0/0.21 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 44px 0/0.29 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold | kv-colour | 윗:nat 38px 0/0.03 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 윗:cut 14px 0/0 | ✓ |
| desk-02 | templateMold templateMold,textColour.brand | kv-colour | 윗:cut 26px 0/0.04 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 15px 0.01/0.13 · 오른:nat 16px 0/0.14 · 윗:nat 22px 0/0.12 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.18 잇는 중 · 오른:nat 0px 0/0.16 잇는 중 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold | kv-mood | 윗:nat 42px 0.01/0.1 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 34px 0/0.07 | ✓ |
| desk-06 | templateMold meltFix,templateMold | kv-edge | 윗:cut 26px 0/0.12 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.09 · 오른:nat 8px 0/0.03 · 윗:nat 26px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold | kv-edge | 윗:cut 26px 0.01/0.07 | ✓ |
| desk-09 | templateMold templateMold | kv-edge | 윗:nat 28px 0/0.06 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 78px 0/0.3 잇는 중 · 오른:nat 65px 0.02/0.23 잇는 중 · 윗:nat 32px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold | kv-edge | 윗:cut 44px 0.01/0.46 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.36 잇는 중 · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 | ✓ |
| desk-14 | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 윗:cut 32px 0.01/0.32 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.17 잇는 중 · 오른:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0.01/0.16 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 39px 0/0.11 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 윗:cut 44px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,textColour.brand,templateMold.containGrad | kv-edge | 왼:nat 15px 0/0.11 · 오른:nat 15px 0/0.22 잇는 중 · 윗:nat 22px 0/0.12 | ✓ |
| desk-18-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.5 잇는 중 · 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 윗:cut 42px 0/0.1 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand | kv-edge | 윗:cut 44px 0/0.23 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 오른:nat 0px 0/0.47 잇는 중 · 윗:nat 0px 0/0.46 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 28px 0/0.22 잇는 중 · 오른:nat 26px 0/0.16 잇는 중 · 윗:nat 38px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.3 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 윗:cut 28px 0.01/0.06 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 윗:cut 27px 0/0.04 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 14px 0/0.01 · 오른:nat 14px 0/0.01 · 윗:nat 22px 0/0 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0 | ✓ |
| desk-27 | templateMold templateMold | kv-vivid-photo | 윗:nat 44px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 윗:cut 42px 0.01/0.39 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 29px 0/0.18 잇는 중 · 오른:nat 29px 0/0.2 잇는 중 · 윗:nat 22px 0/0.03 | ✓ |
| desk-30 | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 30px 0/0.12 | ✓ |
| desk-31 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 44px 0/0.16 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 36px 0.01/0.16 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.2 잇는 중 · 오른:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.24 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 39px 0.01/0.24 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 윗:cut 38px 0.01/0.21 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 · 오른:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 | ✓ |
| desk-36 | templateMold templateMold | kv-vivid-photo | 윗:cut 44px 0.01/0.36 잇는 중 | ✓ |
| desk-10 | templateMold templateMold | kv-edge | 윗:cut 14px 0/0.15 잇는 중 | ✓ |
| desk-37 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 59px (표본 부족(글자·로고 위)) · 오른:nat 84px (표본 부족(글자·로고 위)) · 윗:nat 26px 0/0.17 잇는 중 | ✓ |
| desk-37-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.36 잇는 중 · 오른:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0.01/0.46 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 | ✓ |
| t1014-gs2025 | templateMold templateMold,textColour.brand | kv-edge | 윗:cut 14px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold | kv-edge | 윗:cut 43px 0/0.36 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 28px 0/0.03 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 43px 0/0.04 · 오른:nat 66px 0/0.2 잇는 중 · 윗:nat 22px 0/0.08 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 42px 0/0.1 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.44 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.48 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-asan-illust | templateMold cutFade,templateMold | kv-edge | 윗:nat 22px 0/0.1 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 36px 0/0.13 | ✓ |
| t1014-jeil | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.62 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 44px 0/0.32 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 · 오른:nat 0px 0/0.38 잇는 중 · 윗:nat 0px 0/0.39 잇는 중 | ✓ |
| t1014-hanjin | templateMold templateMold | kv-vivid-photo | 윗:nat 41px 0.02/0.14 | ✓ |

### 리멤버 · 메인 상단 배너 (PC) `remember-main-top-pc` 2240×360

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 37px 0/0.01 · 오른:nat 67px 0/0.04 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.03 | ✓ |
| geo-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 634px 0/0.05 | ✓ |
| samsung-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 72px 0/0.03 · 오른:nat 75px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.27 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 472px 0/0.28 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.47 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.29 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.18 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 109px 0/0.24 잇는 중 · 오른:nat 189px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 507px 0/0.03 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 380px 0/0.29 잇는 중 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 634px 0/0.13 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 634px 0/0.5 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.37 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 576px 0/0.17 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 565px 0/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-glass-folders | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.21 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 106px 0/0.02 · 오른:nat 193px 0/0.25 잇는 중 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 226px 0/0.07 · 오른:nat 215px 0/0.04 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 553px 0/0.37 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 180px 0/0.02 · 오른:nat 218px 0/0.11 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 392px 0/0.14 · 오른:nat 229px 0/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 541px 0/0.34 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 541px 0/0.07 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 438px 0/0.12 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.12 · 오른:nat 73px 0/0.12 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 611px 0/0.28 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 495px 0/0.21 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.24 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 80px 0/0.08 · 오른:nat 64px 0/0.07 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 518px 0/0.17 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 415px 0/0.02 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 352px 0/0.28 ✗ · 오른:nat 295px 0/0.24 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.44 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.08 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 507px 0/0.31 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.42 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 449px 0/0.18 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.34 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 65px 0/0.12 · 오른:nat 65px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 576px 0/0.13 | ✓ |
| desk-20 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 125px 0/0.24 잇는 중 · 오른:nat 119px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.44 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 461px 0/0.04 | ✓ |
| desk-24 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.09 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 65px 0/0.01 · 오른:nat 65px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 207px 0/0 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 576px 0/0.23 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 599px 0/0.36 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 133px 0/0.27 잇는 중 · 오른:nat 133px 0/0.3 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 530px 0/0.05 | ✓ |
| desk-31 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 495px 0/0.16 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 634px 0/0.21 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 565px 0/0.25 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 461px 0/0.16 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 207px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.3 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 207px 0/0.24 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 267px 0/0.08 · 오른:nat 376px 0/0.41 ✗ | ✗ seam-far |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 622px 0/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 392px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 195px 0/0.08 · 오른:nat 298px 0/0.21 잇는 중 | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 472px 0/0.27 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 634px 0/0.33 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 622px 0/0.13 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.39 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 634px 0/0.21 잇는 중 | ✓ |

### 리멤버 · 메인 상단 배너 (Mobile/APP) `remember-main-top-mo` 1005×360

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 37px 0/0.01 · 오른:nat 67px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 139px 0/0.05 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 143px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.03 · 오른:nat 75px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.07 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 182px 0/0.26 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.26 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 204px 0/0.26 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.21 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 110px 0/0.24 잇는 중 · 오른:nat 189px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 191px 0/0.08 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 239px 0/0.13 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 239px 0/0.19 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.27 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 239px 0/0.25 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 187px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 213px 0/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.2 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.02 · 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 174px 0/0.07 · 윗:nat 0px 0.03/0.06 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 208px 0/0.32 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 143px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.12 · 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 230px 0/0.31 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 204px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold templateMold,templateMold.freeKv | kv-colour | 왼:cut 148px 0/0.07 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 165px 0/0.1 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.12 · 오른:nat 73px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 230px 0/0.2 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 182px 0/0.1 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.35 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 81px 0/0.08 · 오른:nat 65px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 195px 0/0.17 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 156px 0/0.03 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.28 잇는 중 · 윗:nat 98px 0/0.21 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.4 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 191px 0/0.07 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.4 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 169px 0/0.23 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 143px 0/0.32 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 66px 0/0.12 · 오른:nat 66px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 217px 0/0.11 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.27 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 124px 0/0.24 잇는 중 · 오른:nat 119px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.29 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 174px 0/0.05 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 143px 0/0.13 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 65px 0/0.01 · 오른:nat 65px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0.05 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 217px 0/0.24 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 226px 0/0.36 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 132px 0/0.28 잇는 중 · 오른:nat 132px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 152px 0/0.06 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 234px 0/0.16 잇는 중 | ✓ |
| desk-32 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 169px 0/0.32 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 213px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 174px 0/0.24 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 239px 0/0.35 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.13 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 169px 0/0.15 잇는 중 · 윗:nat 0px 0.01/0.03 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 234px 0/0.32 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 148px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 156px 0/0.1 · 윗:nat 0px 0.02/0.04 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 239px 0/0.09 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 70px 0/0.49 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.3 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 234px 0/0.17 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.4 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.41 잇는 중 | ✓ |

### 리멤버 · 메인 중간 배너 (PC) `remember-main-mid-pc` 2240×240

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 25px 0/0.01 · 오른:nat 45px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.03 | ✓ |
| geo-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 649px 0/0.04 | ✓ |
| samsung-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.02 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 49px 0/0.03 · 오른:nat 50px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.29 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 496px 0/0.29 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.52 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.29 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.18 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.24 잇는 중 · 오른:nat 126px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 519px 0/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 401px 0/0.25 잇는 중 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 649px 0/0.12 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 649px 0/0.5 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.4 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 590px 0/0.22 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 578px 0/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.18 잇는 중 | ✓ |
| midas-glass-folders | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.21 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 71px 0/0.02 · 오른:nat 128px 0/0.25 잇는 중 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 150px 0/0.07 · 오른:nat 143px 0/0.04 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 566px 0/0.31 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 120px 0/0.02 · 오른:nat 145px 0/0.11 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 263px 0/0.13 · 오른:nat 153px 0/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 555px 0/0.33 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 555px 0/0.04 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 448px 0/0.12 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.12 · 오른:nat 49px 0/0.12 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.18 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 625px 0/0.23 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 507px 0/0.22 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.26 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 54px 0/0.08 · 오른:nat 44px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 531px 0/0.2 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 425px 0/0.02 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 235px 0/0.29 ✗ · 오른:nat 196px 0/0.24 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.47 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.07 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 519px 0/0.28 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.45 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 460px 0/0.17 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.36 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 44px 0/0.13 · 오른:nat 44px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 590px 0/0.13 | ✓ |
| desk-20 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 83px 0/0.25 잇는 중 · 오른:nat 79px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.44 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 472px 0/0.04 | ✓ |
| desk-24 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.08 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 43px 0/0.01 · 오른:nat 43px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 212px 0/0 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 590px 0/0.22 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 614px 0/0.4 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 88px 0/0.27 잇는 중 · 오른:nat 88px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 543px 0/0.07 | ✓ |
| desk-31 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 507px 0/0.17 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 649px 0/0.31 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 578px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 472px 0/0.2 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 212px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.29 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.24 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 178px 0/0.13 · 오른:nat 251px 0/0.41 ✗ | ✗ seam-far |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 637px 0/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 401px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.09 · 오른:nat 198px 0/0.19 잇는 중 | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 484px 0/0.33 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.33 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 637px 0/0.15 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.39 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.13 | ✓ |

### 리멤버 · 메인 중간 배너 (Mobile/APP) `remember-main-mid-mo` 1005×360

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 36px 0/0.01 · 오른:nat 67px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 139px 0/0.05 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 144px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.03 · 오른:nat 75px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.11 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 183px 0/0.26 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.28 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 205px 0/0.26 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.21 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 110px 0/0.25 잇는 중 · 오른:nat 189px 0/0.42 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 191px 0/0.07 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 239px 0/0.14 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 239px 0/0.18 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.27 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 239px 0/0.26 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 187px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 213px 0/0.27 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.21 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.02 · 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 174px 0/0.07 · 윗:nat 0px 0.03/0.06 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 209px 0/0.33 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 144px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.12 · 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 231px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 205px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold templateMold,templateMold.freeKv | kv-colour | 왼:cut 148px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 165px 0/0.1 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.12 · 오른:nat 73px 0/0.12 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 231px 0/0.2 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 183px 0/0.1 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.35 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 81px 0/0.08 · 오른:nat 65px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 196px 0/0.18 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 157px 0/0.03 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.29 잇는 중 · 윗:nat 98px 0/0.21 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.41 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 191px 0/0.06 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 239px 0/0.44 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 170px 0/0.23 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 144px 0/0.33 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 66px 0/0.12 · 오른:nat 66px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 218px 0/0.11 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.27 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 125px 0/0.24 잇는 중 · 오른:nat 119px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.35 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 174px 0/0.05 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 144px 0/0.14 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 65px 0/0.01 · 오른:nat 65px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0.06 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 218px 0/0.25 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 226px 0/0.36 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 132px 0/0.29 잇는 중 · 오른:nat 132px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 152px 0/0.05 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 235px 0/0.17 잇는 중 | ✓ |
| desk-32 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 170px 0/0.32 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 213px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 174px 0/0.23 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 239px 0/0.36 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.13 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 170px 0/0.15 잇는 중 · 윗:nat 0px 0.01/0.03 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 235px 0/0.32 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 148px 0/0.04 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 157px 0/0.08 · 윗:nat 0px 0.02/0.04 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 239px 0/0.09 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 70px 0/0.5 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 239px 0/0.3 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 235px 0/0.16 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.5 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.38 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 239px 0/0.42 잇는 중 | ✓ |

### 리멤버 · 공고 상세 상단 배너 (PC) `remember-job-top-pc` 2240×240

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 25px 0/0.01 · 오른:nat 45px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.03 | ✓ |
| geo-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 649px 0/0.04 | ✓ |
| samsung-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.02 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 49px 0/0.03 · 오른:nat 50px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.29 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 496px 0/0.29 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.52 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.29 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.18 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.24 잇는 중 · 오른:nat 126px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 519px 0/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 401px 0/0.25 잇는 중 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 649px 0/0.12 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 649px 0/0.5 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.4 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 590px 0/0.22 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 578px 0/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.18 잇는 중 | ✓ |
| midas-glass-folders | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.21 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 71px 0/0.02 · 오른:nat 128px 0/0.25 잇는 중 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 150px 0/0.07 · 오른:nat 143px 0/0.04 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 566px 0/0.31 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 120px 0/0.02 · 오른:nat 145px 0/0.11 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 263px 0/0.13 · 오른:nat 153px 0/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 555px 0/0.33 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 555px 0/0.04 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 448px 0/0.12 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.12 · 오른:nat 49px 0/0.12 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.18 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 625px 0/0.23 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 507px 0/0.22 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.26 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 54px 0/0.08 · 오른:nat 44px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 531px 0/0.2 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 425px 0/0.02 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 235px 0/0.29 ✗ · 오른:nat 196px 0/0.24 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.47 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.07 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 519px 0/0.28 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.45 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 460px 0/0.17 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.36 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 44px 0/0.13 · 오른:nat 44px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 590px 0/0.13 | ✓ |
| desk-20 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 83px 0/0.25 잇는 중 · 오른:nat 79px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.44 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 472px 0/0.04 | ✓ |
| desk-24 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.08 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 43px 0/0.01 · 오른:nat 43px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 212px 0/0 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 590px 0/0.22 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 614px 0/0.4 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 88px 0/0.27 잇는 중 · 오른:nat 88px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 543px 0/0.07 | ✓ |
| desk-31 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 507px 0/0.17 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 649px 0/0.31 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 578px 0/0.27 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 472px 0/0.2 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 212px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.29 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 212px 0/0.24 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 178px 0/0.13 · 오른:nat 251px 0/0.41 ✗ | ✗ seam-far |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 637px 0/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 401px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.09 · 오른:nat 198px 0/0.19 잇는 중 | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 484px 0/0.33 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 649px 0/0.33 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 637px 0/0.15 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.38 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 649px 0/0.13 | ✓ |

### 리멤버 · 공고 상세 상단 배너 (Mobile/APP) `remember-job-top-mo` 1125×276

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 28px 0/0.01 · 오른:nat 51px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.03 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 178px 0/0.03 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 184px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 55px 0/0.03 · 오른:nat 57px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.28 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 228px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.4 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.29 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.26 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 84px 0/0.23 잇는 중 · 오른:nat 144px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 245px 0/0.21 잇는 중 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| hdot-seminar | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 184px 0/0.13 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 306px 0/0.14 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 306px 0/0.48 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.33 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.3 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 278px 0/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 272px 0/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 | ✓ |
| midas-glass-folders | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0.24 ✗ | ✗ cut-short |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 81px 0/0.02 · 오른:nat 149px 0/0.24 잇는 중 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 173px 0/0.07 · 오른:nat 164px 0/0.04 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 267px 0/0.36 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 138px 0/0.02 · 오른:nat 167px 0/0.11 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 301px 0/0.12 · 오른:nat 173px (표본 부족(글자·로고 위)) | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 295px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 261px 0/0.25 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 261px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 211px 0/0.12 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 53px 0/0.12 · 오른:nat 56px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.07 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 295px 0/0.36 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 239px 0/0.14 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.32 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 62px 0/0.08 · 오른:nat 50px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 250px 0/0.21 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 200px 0/0.08 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 270px 0/0.29 잇는 중 · 오른:nat 223px 0.01/0.23 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.42 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 245px 0/0.18 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.43 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 217px 0/0.19 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 184px 0/0 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 50px 0/0.12 · 오른:nat 50px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 278px 0/0.11 | ✓ |
| desk-20 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 95px 0/0.24 잇는 중 · 오른:nat 91px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.42 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.11 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 222px 0/0.05 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 184px 0/0.07 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 50px 0/0.01 · 오른:nat 50px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0.07 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 278px 0/0.24 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 289px 0/0.36 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 102px 0/0.26 잇는 중 · 오른:nat 102px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 206px 0/0.05 | ✓ |
| desk-31 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 239px 0/0.12 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 306px 0/0.23 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 272px 0/0.25 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 222px 0/0.19 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.29 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.24 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 205px 0/0.15 잇는 중 · 오른:nat 289px 0/0.41 잇는 중 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.35 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 300px 0/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 189px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 149px 0/0.1 · 오른:nat 228px 0/0.19 잇는 중 | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 228px 0/0.26 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 306px 0/0.33 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 300px 0/0.12 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.39 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 306px 0/0.28 잇는 중 | ✓ |

### 리멤버 · 공고 상세 사이드 배너 (PC) `remember-job-side-pc` 530×200

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0.05 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 20px 0/0.01 · 오른:nat 37px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 75px 0/0.15 잇는 중 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 41px 0/0.03 · 오른:nat 42px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.08 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 99px 0/0.26 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.21 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 111px 0/0.27 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.18 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 61px 0/0.27 잇는 중 · 오른:nat 105px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 103px 0/0.12 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0/0.1 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0/0.17 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.29 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 129px 0/0.25 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 101px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.39 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 115px 0.01/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.54 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.2 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 94px 0/0.07 · 윗:nat 0px 0.02/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 113px 0/0.32 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 78px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.13 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 125px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 111px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold templateMold,templateMold.freeKv | kv-colour | 왼:cut 80px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.12 · 윗:nat 0px 0/0.24 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 89px 0/0.1 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 38px 0/0.12 · 오른:nat 41px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.12 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 125px 0/0.2 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 99px 0/0.12 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.35 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 45px 0/0.08 · 오른:nat 36px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 106px 0/0.17 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 85px 0/0.03 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.29 잇는 중 · 윗:nat 53px 0/0.25 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0.01/0.39 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 103px 0/0.07 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.42 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.31 잇는 중 | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 92px 0/0.22 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0.37 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 37px 0/0.12 · 오른:nat 37px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 118px 0/0.1 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.26 잇는 중 · 오른:nat 66px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.36 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 94px 0/0.06 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 78px 0/0.13 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 36px 0/0.01 · 오른:nat 36px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0.06 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 118px 0/0.23 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 122px 0/0.36 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.28 잇는 중 · 오른:nat 73px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 82px 0/0.07 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 127px 0/0.14 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0.01/0.2 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 115px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 94px 0/0.25 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 129px 0/0.36 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.13 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 92px 0/0.15 잇는 중 · 윗:nat 0px 0.02/0.02 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.41 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.19 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 127px 0/0.31 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 80px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 85px 0/0.06 · 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0/0.07 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 3px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 38px 0/0.49 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.3 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 127px 0/0.15 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.67 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.41 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.44 잇는 중 | ✓ |

### 리멤버 · 공고 상세 사이드 배너 (Mobile/APP) `remember-job-side-mo` 1125×276

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 28px 0/0.01 · 오른:nat 51px 0/0.04 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.03 | ✓ |
| geo-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 178px 0/0.03 | ✓ |
| samsung-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 184px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 55px 0/0.03 · 오른:nat 57px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.28 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 228px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.4 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.29 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.26 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 84px 0/0.23 잇는 중 · 오른:nat 144px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 245px 0/0.21 잇는 중 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| hdot-seminar | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 184px 0/0.13 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 306px 0/0.14 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 306px 0/0.48 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.32 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.3 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 278px 0/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 272px 0/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 | ✓ |
| midas-glass-folders | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0.24 ✗ | ✗ cut-short |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 81px 0/0.02 · 오른:nat 149px 0/0.24 잇는 중 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 173px 0/0.07 · 오른:nat 164px 0/0.04 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 267px 0/0.36 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 138px 0/0.02 · 오른:nat 167px 0/0.11 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 301px 0/0.12 · 오른:nat 173px (표본 부족(글자·로고 위)) | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 295px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 261px 0/0.26 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 261px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:nat 211px 0/0.12 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 53px 0/0.12 · 오른:nat 56px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.07 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 295px 0/0.36 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 239px 0/0.14 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.32 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 62px 0/0.08 · 오른:nat 50px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 250px 0/0.21 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 200px 0/0.09 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 270px 0/0.29 잇는 중 · 오른:nat 223px 0.01/0.23 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.42 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 245px 0/0.18 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0.43 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 217px 0/0.19 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 184px 0/0 | ✓ |
| desk-18 | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 50px 0/0.12 · 오른:nat 50px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 278px 0/0.11 | ✓ |
| desk-20 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 95px 0/0.24 잇는 중 · 오른:nat 91px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.42 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.11 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 222px 0/0.05 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 184px 0/0.07 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 50px 0/0.01 · 오른:nat 50px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0.07 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 278px 0/0.24 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 289px 0/0.35 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 102px 0/0.26 잇는 중 · 오른:nat 102px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 206px 0/0.05 | ✓ |
| desk-31 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 239px 0/0.12 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 306px 0/0.23 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 272px 0/0.25 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 222px 0/0.19 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 100px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.29 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.24 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 205px 0/0.15 잇는 중 · 오른:nat 289px 0/0.41 잇는 중 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.35 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 306px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 300px 0/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 189px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 149px 0/0.1 · 오른:nat 228px 0/0.19 잇는 중 | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 228px 0/0.26 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 306px 0/0.33 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 300px 0/0.12 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 306px 0/0.39 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 306px 0/0.28 잇는 중 | ✓ |

### 잡다 · 잡다 메인 배너 (PC) `jobda-main-pc` 792×240

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 140px 0/0.44 잇는 중 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 24px 0/0.01 · 오른:nat 45px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 82px 0/0.15 잇는 중 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 84px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 49px 0/0.03 · 오른:nat 50px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.18 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 107px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 140px 0/0.23 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 140px 0/0.23 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 140px 0/0.15 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.26 잇는 중 · 오른:nat 126px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 윗:nat 0px 0/0.27 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 112px 0/0.1 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 140px 0/0.13 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 140px 0/0.18 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 140px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 140px 0/0.28 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 140px 0/0.28 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 110px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 125px 0/0.27 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 140px 0/0.2 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.02 · 윗:nat 0px 0/0 | ✓ |
| midas-cards-orange | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 102px 0/0.07 · 윗:nat 0px 0.02/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 122px 0/0.32 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 84px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 140px 0/0.13 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 135px 0/0.29 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 120px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:cut 120px 0/0.1 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.1 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 46px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 97px 0/0.12 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.12 · 오른:nat 49px 0/0.12 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.19 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 135px 0/0.22 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 122px 0/0.12 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 140px 0/0.36 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 54px 0/0.08 · 오른:nat 43px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 115px 0/0.15 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 92px 0/0.03 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 140px 0/0.28 잇는 중 · 윗:nat 57px 0/0.22 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 140px 0.01/0.41 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 112px 0/0.14 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 140px 0/0.43 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 100px 0/0.23 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 84px 0/0.32 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 44px 0/0.12 · 오른:nat 44px (표본 부족(글자·로고 위)) | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.57 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 128px 0/0.11 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 140px 0/0.27 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 83px 0/0.24 잇는 중 · 오른:nat 79px 0/0.16 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.27 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 102px 0/0.06 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 84px 0/0.13 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 43px 0/0.01 · 오른:nat 43px (표본 부족(글자·로고 위)) | ✓ |
| desk-26 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 46px 0/0.08 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 128px 0/0.23 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 133px 0/0.34 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 88px 0/0.27 잇는 중 · 오른:nat 88px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 89px 0/0.04 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 138px 0/0.16 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 140px 0/0.18 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 125px 0/0.26 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 102px 0/0.22 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 46px 0/0.03 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.74 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 140px 0/0.37 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 46px 0/0.13 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 100px 0/0.16 잇는 중 · 윗:nat 0px 0.01/0.02 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 140px 0/0.24 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 138px 0/0.27 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 87px 0/0.03 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 92px 0/0.09 · 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 140px 0/0.04 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 21px 0/0.58 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 41px 0/0.48 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 140px 0/0.3 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 138px 0/0.18 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.66 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 140px 0/0.43 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 140px 0/0.46 잇는 중 | ✓ |

### 잡다 · 잡다 메인 배너 (MO) `jobda-main-mo` 343×160

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.48 잇는 중 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 16px 0/0.02 · 오른:nat 30px 0/0.04 | ✓ |
| slabs-3d | templateMold templateMold | kv-edge | 왼:nat 21px 0/0.01 | ✓ |
| geo-3d | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.49 잇는 중 | ✓ |
| samsung-3d | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.02 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 32px 0/0.02 · 오른:nat 33px 0/0.06 | ✓ |
| fox-3d | templateMold overlapFix.ok,meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 55px 0/0.43 잇는 중 · 윗:nat 46px 0/0.19 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 48px 0/0.08 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 64px 0.01/0.19 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold | kv-vivid-photo | 왼:cut 55px 0.01/0.18 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.14 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 37px 0/0.41 잇는 중 · 윗:nat 0px 0.07/0.08 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.48 잇는 중 | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| dongsuh-model | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.15 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold | kv-edge | 왼:nat 21px 0/0 | ✓ |
| hdot-purple3d | templateMold templateMold | kv-edge | 왼:nat 21px 0/0 | ✓ |
| hdot-hall | templateMold templateMold | kv-edge | 왼:cut 39px 0/0.05 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.36 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| hdot-speaker-b | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.24 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 64px 0/0.15 잇는 중 | ✓ |
| hdot-audience | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 64px 0/0.13 | ✓ |
| hdot-asterisk | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.32 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 64px 0.01/0.48 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 64px 0.01/0.29 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 64px 0.01/0.2 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold | kv-vivid-photo | 왼:cut 50px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.37 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 57px 0.01/0.27 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| midas-folder-dark | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.18 잇는 중 · 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.14 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 21px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-cards-orange | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 47px 0/0.07 · 윗:nat 0px 0.03/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:cut 56px 0.01/0.15 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 39px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 64px 0/0.14 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-flow | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0.01/0.35 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold | kv-vivid-photo | 왼:cut 62px 0/0.26 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 64px 0/0.23 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold | kv-colour | 왼:cut 55px 0/0.11 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 왼:nat 0px 0.02/0.13 · 윗:nat 0px 0/0.27 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.16 잇는 중 · 윗:nat 0px 0/0.29 잇는 중 | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 왼:cut 21px 0/0 | ✓ |
| desk-02 | templateMold templateMold | kv-colour | 왼:cut 37px 0/0.03 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 31px 0/0.11 · 오른:nat 32px 0/0.13 | ✓ |
| desk-03-cut | templateMold overlapFix.ok,templateMold | kv-mood | 왼:nat 0px 0/0.12 · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold | kv-mood | 왼:cut 62px 0.01/0.23 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 56px 0/0.17 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.29 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 36px 0/0.2 잇는 중 · 오른:nat 29px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold | kv-edge | 왼:cut 53px 0.01/0.24 잇는 중 | ✓ |
| desk-09 | templateMold templateMold | kv-edge | 왼:nat 42px 0/0.04 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 64px 0/0.28 잇는 중 · 윗:nat 27px 0/0.24 ✗ | ✗ seam-far |
| desk-12 | templateMold templateMold | kv-edge | 왼:cut 64px 0.01/0.4 잇는 중 | ✓ |
| desk-13 | templateMold overlapFix.ok,templateMold,templateMold.slotCover | kv-edge | 왼:cut 34px 0/0.21 잇는 중 · 윗:nat 46px 0/0.17 잇는 중 | ✓ |
| desk-13-cut | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 | ✓ |
| desk-14 | templateMold overlapFix.ok,templateMold,templateMold.slotCover | kv-edge | 왼:cut 34px 0/0.05 · 윗:nat 46px 0/0.1 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 64px 0.01/0.42 잇는 중 | ✓ |
| desk-15-cut | templateMold overlapFix.ok,templateMold | kv-mood | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0.02/0.43 잇는 중 | ✓ |
| desk-16 | templateMold templateMold | kv-mood-dark | 왼:nat 46px 0/0.16 잇는 중 | ✓ |
| desk-17 | templateMold overlapFix.ok,templateMold,templateMold.slotCover | kv-edge | 왼:cut 34px 0/0 · 윗:nat 46px 0/0.02 | ✓ |
| desk-18 | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 21px 0/0.2 잇는 중 · 윗:nat 0px 0/0.01 | ✓ |
| desk-18-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:cut 59px 0/0.12 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0.01/0.24 잇는 중 | ✓ |
| desk-20-cut | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 54px 0/0.25 잇는 중 · 윗:nat 75px (표본 부족(글자·로고 위)) | ✓ |
| desk-22 | templateMold overlapFix.ok,meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 55px 0.01/0.48 잇는 중 · 윗:nat 46px 0/0.59 잇는 중 | ✓ |
| desk-22-cut | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 47px 0/0.07 | ✓ |
| desk-24 | templateMold overlapFix.ok,templateMold | kv-edge | 왼:cut 34px 0/0.15 잇는 중 · 윗:cut 46px 0/0.13 | ✓ |
| desk-25 | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 21px 0/0.01 · 윗:nat 0px 0.01/0 | ✓ |
| desk-26 | templateMold overlapFix.ok,templateMold,templateMold.slotCover | kv-edge | 왼:cut 34px 0/0.05 · 윗:nat 46px 0/0.26 잇는 중 | ✓ |
| desk-27 | templateMold templateMold | kv-vivid-photo | 왼:cut 50px 0.01/0.31 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 왼:nat 62px 0/0.25 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 59px 0/0.27 잇는 중 · 오른:nat 59px (표본 부족(글자·로고 위)) | ✓ |
| desk-30 | templateMold meltFix,templateMold | kv-edge | 왼:cut 54px 0/0.03 | ✓ |
| desk-31 | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 63px 0/0.12 | ✓ |
| desk-32 | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 64px 0.01/0.33 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.24 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 57px 0.01/0.33 잇는 중 | ✓ |
| desk-34 | templateMold overlapFix.ok,templateMold,templateMold.slotCover | kv-edge | 왼:nat 40px 0.01/0.22 잇는 중 · 윗:cut 64px 0.01/0.26 잇는 중 | ✓ |
| desk-35 | templateMold overlapFix.ok,templateMold | kv-edge | 왼:cut 34px 0/0.25 잇는 중 · 윗:cut 46px 0/0.28 잇는 중 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 64px 0/0.42 잇는 중 | ✓ |
| desk-10 | templateMold overlapFix.ok,meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 55px 0/0.38 잇는 중 · 윗:nat 46px 0/0.34 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 46px 0/0.24 잇는 중 · 윗:nat 0px 0.01/0.04 | ✓ |
| desk-37-cut | templateMold overlapFix.ok,templateMold | kv-mood | 왼:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0.01/0.56 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0/0.23 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold | kv-edge | 왼:cut 63px 0.01/0.26 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold | kv-mood-dark | 왼:cut 39px 0/0.04 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 42px 0/0.05 · 윗:nat 0px 0.01/0.04 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 64px 0/0.14 | ✓ |
| t1014-dongsuh | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.29 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold | kv-edge | 왼:cut 64px 0.01/0.47 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold | kv-mood-dark | 왼:cut 63px 0/0.15 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 64px 0.01/0.39 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 64px 0.01/0.53 잇는 중 | ✓ |

### 캐치 · 중앙(메인 대형) 배너 오브젝트형 — PC 이미지(BG Img) `catch-center-object-pc` 515×315

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 키비주얼 없음 |
| texture-dark | — | — | — | 제외: 키비주얼 없음 |
| slabs-3d | — | — | — | 제외: 키비주얼 없음 |
| geo-3d | — | — | — | 제외: 키비주얼 없음 |
| samsung-3d | — | — | — | 제외: 키비주얼 없음 |
| gradient | — | — | — | 제외: 키비주얼 없음 |
| fox-3d | — | — | — | 제외: 키비주얼 없음 |
| ilhwa-dark | — | — | — | 제외: 키비주얼 없음 |
| ilhwa-photo | — | — | — | 제외: 키비주얼 없음 |
| ilhwa-roomy | — | — | — | 제외: 키비주얼 없음 |
| bc-illust | — | — | — | 제외: 키비주얼 없음 |
| fox-gradbg | — | — | — | 제외: 키비주얼 없음 |
| dongbu_illust |  objectBleed,visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.61 잇는 중 | ✓ |
| dongsuh-model |  visualOnly | none | 왼:nat 0px 0/0.43 잇는 중 · 오른:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.65 잇는 중 · 아랫:nat 0px 0.73/0.73 잇는 중 | ✓ |
| fox-cutout |  visualOnly | none | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.48 잇는 중 · 아랫:nat 0px 0/0.59 잇는 중 | ✓ |
| sep-open-recruit |  objectBleed,visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| hdot-wave | — | — | — | 제외: 키비주얼 없음 |
| hdot-purple3d | — | — | — | 제외: 키비주얼 없음 |
| hdot-hall | — | — | — | 제외: 키비주얼 없음 |
| hdot-speaker-a |  visualOnly | none | 왼:nat 0px 0/0.37 잇는 중 · 오른:nat 0px 0/0.88 잇는 중 · 윗:nat 0px 0/0.76 잇는 중 · 아랫:nat 0px 0.75/0.8 잇는 중 | ✓ |
| hdot-speaker-b |  visualOnly | none | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.99 잇는 중 · 윗:nat 0px 0/0.72 잇는 중 · 아랫:nat 0px 0.19/0.42 잇는 중 | ✓ |
| hdot-seminar | — | — | — | 제외: 키비주얼 없음 |
| hdot-audience | — | — | — | 제외: 키비주얼 없음 |
| hdot-asterisk |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.34 잇는 중 · 오른:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hr-doctor | — | — | — | 제외: 키비주얼 없음 |
| hr-teamhands | — | — | — | 제외: 키비주얼 없음 |
| hr-nurse-ai | — | — | — | 제외: 키비주얼 없음 |
| midas-cablebridge | — | — | — | 제외: 키비주얼 없음 |
| midas-stadium-wire |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 · 아랫:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-city | — | — | — | 제외: 키비주얼 없음 |
| midas-folder-blue |  objectBleed,visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-folder-dark |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.81 잇는 중 · 오른:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/0.48 잇는 중 · 아랫:nat 0px 0/0.81 잇는 중 | ✓ |
| midas-glass-folders | — | — | — | 제외: 키비주얼 없음 |
| midas-acrylic-box | — | — | — | 제외: 키비주얼 없음 |
| midas-cards-orange | — | — | — | 제외: 키비주얼 없음 |
| midas-bridge-icons | — | — | — | 제외: 키비주얼 없음 |
| midas-bridge-dark | — | — | — | 제외: 키비주얼 없음 |
| midas-book-vib | — | — | — | 제외: 키비주얼 없음 |
| midas-book-open |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-book-flow |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.4 잇는 중 · 오른:nat 0px 0/0.11 · 윗:nat 0px 0/0.15 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-book-sim | — | — | — | 제외: 키비주얼 없음 |
| midas-skyscraper | — | — | — | 제외: 키비주얼 없음 |
| midas-facets | — | — | — | 제외: 키비주얼 없음 |
| midas-glass-mint |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-01 | — | — | — | 제외: 키비주얼 없음 |
| desk-02 | — | — | — | 제외: 키비주얼 없음 |
| desk-03 | — | — | — | 제외: 키비주얼 없음 |
| desk-03-cut |  visualOnly | none | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| desk-04 | — | — | — | 제외: 키비주얼 없음 |
| desk-05 | — | — | — | 제외: 키비주얼 없음 |
| desk-06 | — | — | — | 제외: 키비주얼 없음 |
| desk-07 | — | — | — | 제외: 키비주얼 없음 |
| desk-08 | — | — | — | 제외: 키비주얼 없음 |
| desk-09 | — | — | — | 제외: 키비주얼 없음 |
| desk-11 | — | — | — | 제외: 키비주얼 없음 |
| desk-12 | — | — | — | 제외: 키비주얼 없음 |
| desk-13 | — | — | — | 제외: 키비주얼 없음 |
| desk-13-cut |  objectBleed,visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| desk-14 | — | — | — | 제외: 키비주얼 없음 |
| desk-15 | — | — | — | 제외: 키비주얼 없음 |
| desk-15-cut |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.78 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| desk-16 | — | — | — | 제외: 키비주얼 없음 |
| desk-17 | — | — | — | 제외: 키비주얼 없음 |
| desk-18 | — | — | — | 제외: 키비주얼 없음 |
| desk-18-cut |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.38 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-19 | — | — | — | 제외: 키비주얼 없음 |
| desk-20 | — | — | — | 제외: 키비주얼 없음 |
| desk-20-cut |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.2 잇는 중 · 아랫:nat 0px 0/0.34 잇는 중 | ✓ |
| desk-21 | — | — | — | 제외: 키비주얼 없음 |
| desk-22 | — | — | — | 제외: 키비주얼 없음 |
| desk-22-cut |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.74 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.66 잇는 중 · 아랫:nat 0px 0/0.77 잇는 중 | ✓ |
| desk-23 | — | — | — | 제외: 키비주얼 없음 |
| desk-24 | — | — | — | 제외: 키비주얼 없음 |
| desk-25 | — | — | — | 제외: 키비주얼 없음 |
| desk-26 | — | — | — | 제외: 키비주얼 없음 |
| desk-27 | — | — | — | 제외: 키비주얼 없음 |
| desk-28 | — | — | — | 제외: 키비주얼 없음 |
| desk-29 | — | — | — | 제외: 키비주얼 없음 |
| desk-30 | — | — | — | 제외: 키비주얼 없음 |
| desk-31 | — | — | — | 제외: 키비주얼 없음 |
| desk-32 | — | — | — | 제외: 키비주얼 없음 |
| desk-32-cut |  objectBleed,visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.81 잇는 중 | ✓ |
| desk-33 | — | — | — | 제외: 키비주얼 없음 |
| desk-34 | — | — | — | 제외: 키비주얼 없음 |
| desk-35 | — | — | — | 제외: 키비주얼 없음 |
| desk-35-cut |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.63 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.33 잇는 중 | ✓ |
| desk-36 | — | — | — | 제외: 키비주얼 없음 |
| desk-10 | — | — | — | 제외: 키비주얼 없음 |
| desk-37 | — | — | — | 제외: 키비주얼 없음 |
| desk-37-cut |  objectBleed,visualOnly | none | 왼:nat 0px 0/0.22 잇는 중 · 오른:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.19 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| t1014-abl |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 | — | — | — | 제외: 키비주얼 없음 |
| t1014-gs2026 | — | — | — | 제외: 키비주얼 없음 |
| t1014-lt | — | — | — | 제외: 키비주얼 없음 |
| t1014-lt-v2 | — | — | — | 제외: 키비주얼 없음 |
| t1014-lt-v3 | — | — | — | 제외: 키비주얼 없음 |
| t1014-dongsuh |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.69 잇는 중 · 윗:nat 0px 0/0.66 잇는 중 · 아랫:nat 0px 0/0.31 잇는 중 | ✓ |
| t1014-bionote-dog |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 · 아랫:nat 0px 0/0.35 잇는 중 | ✓ |
| t1014-bionote-cat |  visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-asan-illust | — | — | — | 제외: 키비주얼 없음 |
| t1014-asan-photo | — | — | — | 제외: 키비주얼 없음 |
| t1014-jeil |  objectBleed,visualOnly | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.49 잇는 중 · 아랫:nat 0px 0/0.22 잇는 중 | ✓ |
| t1014-hanssem | — | — | — | 제외: 키비주얼 없음 |
| t1014-hanssem-blocks |  visualOnly | none | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.78 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-hanjin | — | — | — | 제외: 키비주얼 없음 |

### 캐치 · 중앙(메인 대형) 배너 — MO 이미지(BG Img) `catch-center-object-mo` 622×380

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg |  visualOnly | kv-edge | — | ✓ |
| texture-dark |  textureFull,visualOnly | kv-texture | — | ✓ |
| slabs-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| geo-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| samsung-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| gradient |  textureFull,visualOnly | kv-texture | — | ✓ |
| fox-3d |  visualOnly | kv-edge | — | ✓ |
| ilhwa-dark |  photoColLogoLeft,visualOnly | kv-mood-dark | — | ✓ |
| ilhwa-photo |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| ilhwa-roomy |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| bc-illust |  visualOnly | kv-edge | — | ✓ |
| fox-gradbg |  visualOnly | kv-edge | — | ✓ |
| dongbu_illust |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.52 잇는 중 | ✓ |
| abl-group |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.49 잇는 중 | ✓ |
| dongsuh-model |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.29 잇는 중 · 아랫:nat 0px 0.07/0.09 | ✓ |
| fox-cutout |  visualOnly | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| sep-open-recruit |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| hdot-wave |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-purple3d |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-hall |  roomFull,visualOnly | kv-full | — | ✓ |
| hdot-speaker-a |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0.27/0.28 잇는 중 | ✓ |
| hdot-speaker-b |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0.21/0.41 잇는 중 | ✓ |
| hdot-seminar |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-audience |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-asterisk |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.16 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hr-doctor |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| hr-teamhands |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| hr-nurse-ai |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| midas-cablebridge |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| midas-stadium-wire |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 · 오른:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 · 아랫:nat 0px 0/0.48 잇는 중 | ✓ |
| midas-city |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| midas-folder-blue |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-folder-dark |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-glass-folders |  visualOnly | kv-edge | — | ✓ |
| midas-acrylic-box |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-cards-orange |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-bridge-icons |  visualOnly | kv-edge | — | ✓ |
| midas-bridge-dark |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-book-vib |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-book-open |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-book-flow |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-book-sim |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| midas-skyscraper |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| midas-facets |  textureFull,visualOnly | kv-texture | — | ✓ |
| midas-glass-mint |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.02/– · 오른:nat 0px 0.01/– · 윗:nat 0px 0.01/– · 아랫:nat 0px 0.01/– | ✓ |
| midas-glass-dark |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.04/– · 오른:nat 0px 0.06/– · 윗:nat 0px 0.01/– · 아랫:nat 0px 0.01/– | ✓ |
| desk-01 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-02 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-03 |  visualOnly | kv-edge | — | ✓ |
| desk-03-cut |  visualOnly | kv-mood | 왼:nat 0px 0/0.15 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.31 잇는 중 | ✓ |
| desk-04 |  photoColLogoLeft,visualOnly | kv-mood | — | ✓ |
| desk-05 |  photoColLogoLeft,visualOnly | kv-mood-dark | — | ✓ |
| desk-06 |  visualOnly | kv-edge | — | ✓ |
| desk-07 |  visualOnly | kv-edge | — | ✓ |
| desk-08 |  visualOnly | kv-edge | — | ✓ |
| desk-09 |  visualOnly | kv-edge | — | ✓ |
| desk-11 |  visualOnly | kv-edge | — | ✓ |
| desk-12 |  visualOnly | kv-edge | — | ✓ |
| desk-13 |  visualOnly | kv-edge | — | ✓ |
| desk-13-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.47 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| desk-14 |  visualOnly | kv-edge | — | ✓ |
| desk-15 |  visualOnly | kv-edge | — | ✓ |
| desk-15-cut |  visualOnly | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0.01/– · 아랫:nat 0px 0.01/– | ✓ |
| desk-16 |  photoColLogoLeft,visualOnly | kv-mood-dark | — | ✓ |
| desk-17 |  visualOnly | kv-edge | — | ✓ |
| desk-18 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-18-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-19 |  photoColLogoLeft,visualOnly | kv-mood | — | ✓ |
| desk-20 |  visualOnly | kv-edge | — | ✓ |
| desk-20-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-21 |  visualOnly | kv-edge | — | ✓ |
| desk-22 |  visualOnly | kv-edge | — | ✓ |
| desk-22-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.13 · 아랫:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-23 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-24 |  visualOnly | kv-edge | — | ✓ |
| desk-25 |  visualOnly | kv-edge | — | ✓ |
| desk-26 |  visualOnly | kv-edge | — | ✓ |
| desk-27 |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| desk-28 |  photoColLogoLeft,visualOnly | kv-mood | — | ✓ |
| desk-29 |  visualOnly | kv-edge | — | ✓ |
| desk-30 |  visualOnly | kv-edge | — | ✓ |
| desk-31 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-33 |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| desk-34 |  visualOnly | kv-edge | — | ✓ |
| desk-35 |  visualOnly | kv-edge | — | ✓ |
| desk-35-cut |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-36 |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| desk-10 |  visualOnly | kv-edge | — | ✓ |
| desk-37 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-37-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.39 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 · 아랫:nat 0px 0.01/– | ✓ |
| t1014-abl |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 |  roomFull,visualOnly | kv-full | — | ✓ |
| t1014-gs2026 |  roomFull,visualOnly | kv-full | — | ✓ |
| t1014-lt |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-lt-v2 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt-v3 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-dongsuh |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.47 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-bionote-dog |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.48 잇는 중 · 아랫:nat 0px 0/0.26 잇는 중 | ✓ |
| t1014-bionote-cat |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-asan-illust |  visualOnly | kv-edge | — | ✓ |
| t1014-asan-photo |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-jeil |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.52 잇는 중 | ✓ |
| t1014-hanssem |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |
| t1014-hanssem-blocks |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.58 잇는 중 | ✓ |
| t1014-hanjin |  photoColLogoLeft,visualOnly | kv-vivid-photo | — | ✓ |

### 캐치 · 중앙 배너 MO 로고 `catch-center-logo-mo` 160×160

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 구글 GDN · GDN 고정 배너 580×400 `google-gdn-580x400` 580×400

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 96px 0/0.3 잇는 중 · 윗:cut 61px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.01 · 오른:nat 33px 0/0.04 · 윗:nat 55px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 96px 0/0.04 · 윗:cut 61px 0/0.06 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 왼:cut 96px 0/0.03 · 윗:cut 61px 0/0.02 | ✓ |
| samsung-3d | templateMold templateMold | kv-edge | 왼:cut 96px 0/0.01 · 윗:nat 61px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 36px 0/0.03 · 오른:nat 37px 0/0.07 · 윗:nat 55px 0/0.1 | ✓ |
| fox-3d | templateMold cutFade,templateMold | kv-edge | 왼:nat 79px 0/0.22 잇는 중 · 윗:nat 48px 0/0 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 119px 0/0.26 잇는 중 · 윗:cut 69px 0/0.28 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 156px 0/0.29 잇는 중 · 윗:cut 96px 0/0.38 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 133px 0/0.31 잇는 중 · 윗:cut 87px 0/0.4 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 156px 0/0.21 잇는 중 · 윗:cut 61px 0/0.2 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 54px 0/0.21 잇는 중 · 오른:nat 93px 0/0.41 잇는 중 · 윗:nat 60px 0/0.14 | ✓ |
| dongbu_illust | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| fox-cutout | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.57 잇는 중 | ✓ |
| sep-open-recruit | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 윗:nat 0px 0/0.57 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 96px 0/0.06 · 윗:nat 61px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 96px 0/0.04 · 윗:nat 61px 0/0.03 | ✓ |
| hdot-hall | templateMold meltFix,templateMold | kv-edge | 왼:cut 125px 0/0.12 · 윗:cut 61px 0/0.04 | ✓ |
| hdot-speaker-a | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.32 잇는 중 | ✓ |
| hdot-speaker-b | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0/0.27 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 98px 0/0.12 · 윗:nat 98px 0/0.05 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 156px 0/0.13 · 윗:cut 85px 0/0.23 잇는 중 | ✓ |
| hdot-asterisk | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 156px 0/0.48 잇는 중 · 윗:nat 98px 0.01/0.45 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 156px 0/0.32 잇는 중 · 윗:cut 98px 0/0.35 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 156px 0/0.24 잇는 중 · 윗:cut 93px 0.01/0.49 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 142px 0/0.17 잇는 중 · 윗:cut 94px 0.01/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 윗:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 139px 0.01/0.28 잇는 중 · 윗:cut 87px 0/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| midas-folder-dark | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.18 잇는 중 · 윗:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 156px 0/0.25 잇는 중 · 윗:cut 98px 0/0.32 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 51px 0/0.02 · 윗:nat 0px 0/0 | ✓ |
| midas-cards-orange | templateMold cutFade,templateMold,templateMold.containGrad | kv-edge | 왼:nat 111px 0/0.07 · 오른:nat 105px (표본 부족(글자·로고 위)) · 윗:nat 56px 0/0.06 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:nat 136px 0/0.33 잇는 중 · 윗:nat 61px 0/0.02 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 89px 0/0.02 · 오른:nat 108px (표본 부족(글자·로고 위)) · 윗:nat 48px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 156px 0/0.05 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.65 잇는 중 · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 150px 0/0.31 잇는 중 · 윗:cut 77px 0/0.22 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 133px 0/0.26 잇는 중 · 윗:cut 98px 0.01/0.25 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 133px 0/0.07 · 윗:cut 61px 0/0.07 | ✓ |
| midas-glass-mint | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.1 · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 왼:cut 96px 0/0 · 윗:cut 61px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 108px 0/0.12 · 윗:cut 61px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 34px 0/0.12 · 오른:nat 36px 0/0.12 · 윗:nat 48px 0/0.12 | ✓ |
| desk-03-cut | templateMold cutFade,templateMold | kv-mood | 왼:nat 0px 0/0.12 · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood | 왼:nat 150px 0/0.22 잇는 중 · 윗:cut 94px 0/0.17 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 119px 0/0.15 잇는 중 · 윗:cut 93px 0/0.17 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 156px 0/0.32 잇는 중 · 윗:cut 98px 0/0.19 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 40px 0/0.09 · 오른:nat 32px 0/0.06 · 윗:nat 55px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 127px 0/0.17 잇는 중 · 윗:cut 80px 0/0.15 잇는 중 | ✓ |
| desk-09 | templateMold templateMold | kv-edge | 왼:cut 102px 0/0.08 · 윗:nat 62px 0/0.07 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 156px 0/0.3 잇는 중 · 윗:nat 64px 0/0.22 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 156px 0.01/0.4 잇는 중 · 윗:cut 98px 0/0.5 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 96px 0/0.17 잇는 중 · 윗:cut 84px 0/0.13 | ✓ |
| desk-13-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold | kv-edge | 왼:nat 125px 0/0.07 · 윗:cut 61px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 156px 0/0.37 잇는 중 · 윗:cut 62px 0/0.22 잇는 중 | ✓ |
| desk-15-cut | templateMold cutFade,templateMold | kv-mood | 왼:nat 0px 0/0.14 · 윗:nat 0px 0.01/0.19 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 110px 0/0.14 · 윗:nat 87px 0/0.15 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 왼:cut 96px 0/0.08 · 윗:cut 98px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 33px 0/0.17 잇는 중 · 오른:nat 33px 0/0.21 잇는 중 · 윗:nat 48px 0/0.06 | ✓ |
| desk-18-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:cut 142px 0/0.09 · 윗:cut 93px 0/0.11 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 왼:cut 96px 0/0.4 잇는 중 · 윗:cut 98px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.46 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 61px 0/0.27 잇는 중 · 오른:nat 59px 0/0.2 잇는 중 · 윗:nat 85px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 96px 0/0.57 잇는 중 · 윗:cut 98px 0/0.51 잇는 중 | ✓ |
| desk-22-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 113px 0/0.05 · 윗:cut 61px 0/0.06 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 왼:cut 96px 0/0.14 · 윗:cut 61px 0/0.05 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 32px 0/0.01 · 오른:nat 32px 0/0.01 · 윗:nat 48px 0/0 | ✓ |
| desk-26 | templateMold templateMold | kv-edge | 왼:cut 96px 0/0.17 잇는 중 · 윗:cut 61px 0/0.15 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 142px 0/0.37 잇는 중 · 윗:nat 98px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 왼:nat 147px 0/0.35 잇는 중 · 윗:cut 94px 0/0.35 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 65px 0/0.23 잇는 중 · 오른:nat 65px 0/0.3 잇는 중 · 윗:nat 48px 0/0.02 | ✓ |
| desk-30 | templateMold meltFix,templateMold | kv-edge | 왼:cut 99px 0/0.03 · 윗:cut 66px 0/0.05 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 153px 0/0.12 · 윗:nat 98px 0/0.13 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 156px 0/0.36 잇는 중 · 윗:nat 81px 0/0.25 잇는 중 | ✓ |
| desk-32-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 139px 0/0.23 잇는 중 · 윗:cut 87px 0/0.26 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 왼:nat 113px 0/0.25 잇는 중 · 윗:cut 84px 0/0.07 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 왼:cut 96px 0/0.12 · 윗:cut 61px 0/0.04 | ✓ |
| desk-35-cut | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.68 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 156px 0/0.31 잇는 중 · 윗:cut 98px 0.01/0.36 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 96px 0/0.36 잇는 중 · 윗:cut 98px 0/0.36 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 110px 0/0.13 · 윗:nat 0px 0.01/0.02 | ✓ |
| desk-37-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| t1014-abl | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold | kv-edge | 왼:cut 156px 0.01/0.19 잇는 중 · 윗:cut 61px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 153px 0/0.33 잇는 중 · 윗:cut 61px 0/0.2 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 96px 0/0.03 · 윗:cut 61px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 96px 0/0.04 · 오른:nat 147px (표본 부족(글자·로고 위)) · 윗:nat 48px 0/0.06 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 116px 0/0.21 잇는 중 · 윗:cut 94px 0/0.15 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold | kv-vivid | 왼:nat 22px 0/0.62 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold | kv-vivid | 왼:nat 31px 0/0.46 잇는 중 · 윗:nat 0px 0/0.59 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 156px 0/0.3 잇는 중 · 윗:nat 61px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 153px 0/0.14 · 윗:nat 89px 0/0.12 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.61 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 156px 0/0.36 잇는 중 · 윗:nat 98px 0/0.28 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold cutFade,templateMold | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 156px 0/0.3 잇는 중 · 윗:nat 98px 0.01/0.09 | ✓ |

### 구글 GDN · GDN 고정 배너 970×250 `google-gdn-970x250` 970×250

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 107px 0/0.21 잇는 중 · 윗:cut 67px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 20px 0/0.01 · 오른:nat 37px 0/0.05 · 윗:nat 63px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 107px 0/0.04 · 윗:cut 67px 0/0.07 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 왼:cut 107px 0/0.03 · 윗:cut 67px 0/0.02 | ✓ |
| samsung-3d | templateMold templateMold | kv-edge | 왼:cut 107px 0/0.01 · 윗:nat 67px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 40px 0/0.03 · 오른:nat 41px 0/0.06 · 윗:nat 63px 0/0.1 | ✓ |
| fox-3d | templateMold cutFade,templateMold | kv-edge | 왼:nat 88px 0/0.19 잇는 중 · 윗:nat 55px 0/0 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 133px 0/0.26 잇는 중 · 윗:cut 77px 0/0.28 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 174px 0/0.3 잇는 중 · 윗:cut 107px 0/0.39 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 149px 0/0.28 잇는 중 · 윗:cut 97px 0/0.42 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 174px 0/0.17 잇는 중 · 윗:cut 67px 0/0.17 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 60px 0/0.24 잇는 중 · 오른:nat 104px 0/0.43 잇는 중 · 윗:nat 69px 0/0.15 잇는 중 | ✓ |
| dongbu_illust | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 윗:nat 0px 0/0.16 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| sep-open-recruit | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 107px 0/0.06 · 윗:nat 67px 0/0.06 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 107px 0/0.04 · 윗:nat 67px 0/0.03 | ✓ |
| hdot-hall | templateMold meltFix,templateMold | kv-edge | 왼:cut 139px 0/0.09 · 윗:cut 67px 0/0.04 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.43 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 109px 0/0.08 · 윗:nat 109px 0/0.08 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 174px 0/0.15 잇는 중 · 윗:cut 95px 0/0.22 잇는 중 | ✓ |
| hdot-asterisk | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 174px 0/0.47 잇는 중 · 윗:nat 109px 0/0.45 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 174px 0/0.31 잇는 중 · 윗:cut 109px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 174px 0/0.24 잇는 중 · 윗:cut 103px 0.01/0.5 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 158px 0/0.17 잇는 중 · 윗:cut 105px 0.01/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0/0.39 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 155px 0.01/0.26 잇는 중 · 윗:cut 97px 0/0.23 잇는 중 | ✓ |
| midas-folder-blue | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.46 잇는 중 | ✓ |
| midas-folder-dark | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 174px 0/0.21 잇는 중 · 윗:cut 109px 0/0.32 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 57px 0/0.02 · 윗:nat 0px 0/0 | ✓ |
| midas-cards-orange | templateMold cutFade,templateMold,templateMold.containGrad | kv-edge | 왼:nat 123px 0/0.07 · 오른:nat 117px (표본 부족(글자·로고 위)) · 윗:nat 65px 0/0.06 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:nat 152px 0/0.34 잇는 중 · 윗:nat 67px 0/0.02 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 99px 0/0.01 · 오른:nat 120px (표본 부족(글자·로고 위)) · 윗:nat 55px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 174px 0/0.13 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 168px 0/0.3 잇는 중 · 윗:cut 85px 0/0.23 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 149px 0/0.26 잇는 중 · 윗:cut 109px 0.01/0.22 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 149px 0/0.09 · 윗:cut 67px 0/0.07 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.16 잇는 중 · 윗:nat 0px 0/0.13 | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 왼:cut 107px 0/0 · 윗:cut 67px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 120px 0/0.12 · 윗:cut 67px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 38px 0/0.12 · 오른:nat 40px 0/0.13 · 윗:nat 55px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.12 · 윗:nat 0px 0/0.29 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood | 왼:nat 168px 0/0.24 잇는 중 · 윗:cut 105px 0/0.17 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 133px 0/0.19 잇는 중 · 윗:cut 103px 0/0.15 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 174px 0/0.34 잇는 중 · 윗:cut 109px 0/0.19 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 45px 0/0.08 · 오른:nat 35px 0/0.08 · 윗:nat 63px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 142px 0/0.19 잇는 중 · 윗:cut 89px 0/0.15 잇는 중 | ✓ |
| desk-09 | templateMold templateMold | kv-edge | 왼:cut 114px 0/0.07 · 윗:nat 69px 0/0.06 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 174px 0/0.28 잇는 중 · 윗:nat 71px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 174px 0/0.41 잇는 중 · 윗:cut 109px 0/0.49 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 107px 0/0.13 · 윗:cut 93px 0/0.13 | ✓ |
| desk-13-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold | kv-edge | 왼:nat 139px 0/0.07 · 윗:cut 67px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 174px 0/0.4 잇는 중 · 윗:cut 69px 0/0.21 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0.01/0.52 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 123px 0/0.14 · 윗:nat 97px 0/0.15 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 왼:cut 107px 0/0.04 · 윗:cut 109px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 36px 0/0.12 · 오른:nat 36px 0/0.05 · 윗:nat 55px 0/0.06 | ✓ |
| desk-18-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:cut 158px 0/0.07 · 윗:cut 103px 0/0.07 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 왼:cut 107px 0/0.32 잇는 중 · 윗:cut 109px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 68px 0/0.24 잇는 중 · 오른:nat 65px 0/0.16 잇는 중 · 윗:nat 95px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 107px 0/0.56 잇는 중 · 윗:cut 109px 0/0.52 잇는 중 | ✓ |
| desk-22-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 126px 0/0.06 · 윗:cut 67px 0/0.07 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 왼:cut 107px 0/0.13 · 윗:cut 67px 0/0.05 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 36px 0/0.01 · 오른:nat 36px 0/0.01 · 윗:nat 55px 0/0 | ✓ |
| desk-26 | templateMold templateMold | kv-edge | 왼:cut 107px 0/0.19 잇는 중 · 윗:cut 67px 0/0.15 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 158px 0/0.36 잇는 중 · 윗:nat 109px 0/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 왼:nat 164px 0/0.36 잇는 중 · 윗:cut 105px 0/0.35 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 73px 0/0.27 잇는 중 · 오른:nat 73px 0/0.31 잇는 중 · 윗:nat 55px 0/0.03 | ✓ |
| desk-30 | templateMold meltFix,templateMold | kv-edge | 왼:cut 111px 0/0.05 · 윗:cut 73px 0/0.06 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 171px 0/0.13 · 윗:nat 109px 0/0.12 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 174px 0/0.26 잇는 중 · 윗:nat 90px 0/0.23 잇는 중 | ✓ |
| desk-32-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 155px 0/0.23 잇는 중 · 윗:cut 97px 0/0.23 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 왼:nat 126px 0/0.15 잇는 중 · 윗:cut 93px 0/0.07 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 왼:cut 107px 0/0.12 · 윗:cut 67px 0/0.04 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 174px 0/0.34 잇는 중 · 윗:cut 109px 0.01/0.36 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 107px 0/0.37 잇는 중 · 윗:cut 109px 0/0.36 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 123px 0/0.15 잇는 중 · 윗:nat 0px 0.01/0.02 | ✓ |
| desk-37-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0.01/0.49 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold | kv-edge | 왼:cut 174px 0.01/0.19 잇는 중 · 윗:cut 67px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 171px 0/0.34 잇는 중 · 윗:cut 67px 0/0.2 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 107px 0/0.05 · 윗:cut 67px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 107px 0/0.08 · 오른:nat 163px (표본 부족(글자·로고 위)) · 윗:nat 55px 0/0.08 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 130px 0/0.19 잇는 중 · 윗:cut 105px 0/0.14 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold | kv-vivid | 왼:nat 25px 0/0.62 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold | kv-vivid | 왼:nat 33px 0/0.49 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 174px 0/0.33 잇는 중 · 윗:nat 67px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 171px 0/0.14 · 윗:nat 99px 0/0.12 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.62 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 174px 0/0.33 잇는 중 · 윗:nat 109px 0/0.27 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.41 잇는 중 · 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 174px 0/0.22 잇는 중 · 윗:nat 109px 0.01/0.12 | ✓ |

### 구글 GDN · GDN 고정 배너 300×600 `google-gdn-300x600` 300×600

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 윗:cut 45px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 25px 0/0.01 · 오른:nat 46px 0/0.04 · 윗:nat 80px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.01 | ✓ |
| samsung-3d | templateMold templateMold | kv-edge | 윗:nat 45px 0/0.01 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 51px 0/0.03 · 오른:nat 52px 0/0.06 · 윗:nat 80px 0/0.1 | ✓ |
| fox-3d | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.17 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 97px 0/0.24 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 135px 0/0.43 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 122px 0/0.49 잇는 중 | ✓ |
| bc-illust | templateMold templateMold | kv-edge | 윗:cut 45px 0/0 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 76px 0/0.26 잇는 중 · 오른:nat 131px 0/0.42 잇는 중 · 윗:nat 87px 0/0.16 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 154px (표본 부족(글자·로고 위)) · 오른:nat 123px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 107px 0/0.55 잇는 중 · 오른:nat 47px 0/0.36 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.12 · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| sep-open-recruit | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold cutFade,templateMold | kv-edge | 윗:nat 62px 0/0.07 | ✓ |
| hdot-purple3d | templateMold cutFade,templateMold | kv-edge | 윗:nat 62px 0/0.03 | ✓ |
| hdot-hall | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.01 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 · 오른:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 136px 0/0.06 | ✓ |
| hdot-audience | templateMold templateMold | kv-mood-dark | 윗:cut 120px 0/0.17 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.18 잇는 중 · 오른:nat 0px 0/0.23 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 112px 0.01/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 137px 0/0.33 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 137px 0/0.42 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 132px 0/0.15 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 122px 0/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 오른:nat 0px 0/0.2 잇는 중 · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 137px 0/0.26 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 82px 0/0.04 | ✓ |
| midas-bridge-icons | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.01 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 70px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.56 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 107px 0/0.21 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 137px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold | kv-colour | 윗:nat 117px 0/0.08 | ✓ |
| midas-glass-mint | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0 | ✓ |
| desk-02 | templateMold templateMold | kv-colour | 윗:cut 82px 0/0.06 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 48px 0/0.12 · 오른:nat 51px 0/0.12 · 윗:nat 70px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.1 · 오른:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold | kv-mood | 윗:nat 132px 0/0.3 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 105px 0/0.14 | ✓ |
| desk-06 | templateMold meltFix,templateMold | kv-edge | 윗:cut 82px 0/0.37 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 56px 0/0.08 · 오른:nat 25px 0/0.03 · 윗:nat 80px 0/0.03 | ✓ |
| desk-08 | templateMold cutFade,meltFix,templateMold | kv-edge | 왼:nat 107px 0/0.21 잇는 중 · 오른:nat 107px 0/0.24 ✗ · 윗:nat 66px 0/0.05 | ✗ seam-far |
| desk-09 | templateMold templateMold | kv-edge | 윗:nat 87px 0/0.08 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 89px 0/0.25 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold | kv-edge | 윗:cut 137px 0/0.47 잇는 중 | ✓ |
| desk-13 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.02 | ✓ |
| desk-13-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.47 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| desk-14 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 윗:cut 100px 0/0.38 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0.01/0.28 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 122px 0/0.21 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 윗:cut 137px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 46px 0/0.12 · 오른:nat 46px 0/0.05 · 윗:nat 70px 0/0.06 | ✓ |
| desk-18-cut | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 윗:cut 130px 0/0.13 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 윗:cut 137px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 86px 0/0.24 잇는 중 · 오른:nat 82px 0/0.16 잇는 중 · 윗:nat 120px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.45 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.09 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| desk-23 | templateMold templateMold | kv-colour | 윗:cut 82px 0/0.13 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 윗:cut 85px 0/0.05 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 45px 0/0.01 · 오른:nat 45px 0/0.01 · 윗:nat 70px 0/0 | ✓ |
| desk-26 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0 | ✓ |
| desk-27 | templateMold templateMold | kv-vivid-photo | 윗:nat 137px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 윗:cut 132px 0/0.35 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 91px 0/0.27 잇는 중 · 오른:nat 91px 0/0.31 잇는 중 · 윗:nat 70px 0/0.03 | ✓ |
| desk-30 | templateMold templateMold | kv-edge | 윗:cut 92px 0/0.11 | ✓ |
| desk-31 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 123px 0/0.14 | ✓ |
| desk-32 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 113px 0/0.34 잇는 중 | ✓ |
| desk-32-cut | templateMold cutFade,templateMold | kv-mood | 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 122px 0/0.21 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 윗:cut 117px 0/0.39 잇는 중 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.73 잇는 중 | ✓ |
| desk-36 | templateMold templateMold | kv-vivid-photo | 윗:cut 137px 0/0.4 잇는 중 | ✓ |
| desk-10 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0.34 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.03 | ✓ |
| desk-37-cut | templateMold templateMold | kv-mood | 왼:nat 101px 0/0.35 잇는 중 · 오른:nat 101px 0/0.35 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| t1014-abl | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold templateMold | kv-edge | 윗:cut 45px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold | kv-edge | 윗:cut 135px 0/0.41 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 87px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 70px 0/0.14 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 132px 0/0.16 잇는 중 | ✓ |
| t1014-dongsuh | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 오른:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold cutFade,templateMold | kv-edge | 윗:nat 53px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 86px 0/0.11 | ✓ |
| t1014-jeil | templateMold cutFade,templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 133px 0/0.22 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 | ✓ |
| t1014-hanjin | templateMold templateMold | kv-vivid-photo | 윗:nat 99px 0.01/0.18 잇는 중 | ✓ |

### 구글 GDN · GDN 고정 배너 300×1050 `google-gdn-300x1050` 300×1050

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 윗:nat 65px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 37px 0/0.01 · 오른:nat 67px 0/0.04 · 윗:nat 116px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold | kv-edge | 윗:nat 65px 0/0.01 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 윗:cut 65px 0/0.02 | ✓ |
| samsung-3d | templateMold cutFade,templateMold | kv-edge | 윗:nat 63px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 73px 0/0.03 · 오른:nat 75px 0/0.06 · 윗:nat 116px 0/0.1 | ✓ |
| fox-3d | templateMold cutFade,templateMold | kv-edge | 윗:nat 88px 0/0.15 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 141px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 195px 0/0.35 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 177px 0/0.42 잇는 중 | ✓ |
| bc-illust | templateMold templateMold | kv-edge | 윗:nat 65px 0/0 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.05/0.08 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 102px 0/0.54 잇는 중 · 오른:nat 57px 0/0.42 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold | kv-edge | 윗:nat 65px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold | kv-edge | 윗:nat 65px 0/0.09 | ✓ |
| hdot-hall | templateMold templateMold | kv-edge | 윗:nat 65px 0/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 199px 0/0.09 | ✓ |
| hdot-audience | templateMold templateMold | kv-mood-dark | 윗:nat 173px 0/0.19 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 199px 0/0.46 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 199px 0/0.36 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 188px 0/0.36 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 191px 0/0.14 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.39 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 177px 0/0.25 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 199px 0/0.24 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0/0 | ✓ |
| midas-cards-orange | templateMold templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.05 | ✓ |
| midas-bridge-icons | templateMold cutFade,templateMold | kv-edge | 윗:nat 95px 0/0.24 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.58 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 155px 0/0.29 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 124px 0/0.22 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold | kv-colour | 윗:nat 170px 0/0.07 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.15 잇는 중 | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 윗:cut 65px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold | kv-colour | 윗:nat 114px 0/0.07 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 69px 0/0.12 · 오른:nat 73px 0/0.13 · 윗:nat 101px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold | kv-mood | 윗:nat 159px 0/0.23 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 152px 0/0.12 | ✓ |
| desk-06 | templateMold cutFade,templateMold | kv-edge | 윗:nat 84px 0/0.11 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 81px 0/0.08 · 오른:nat 36px 0/0.02 · 윗:nat 116px 0/0.03 | ✓ |
| desk-08 | templateMold cutFade,meltFix,templateMold | kv-edge | 왼:nat 106px 0/0.21 잇는 중 · 오른:nat 106px 0/0.24 잇는 중 · 윗:nat 66px 0/0.05 | ✓ |
| desk-09 | templateMold templateMold | kv-edge | 윗:nat 126px 0/0.1 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 68px 0/0.22 잇는 중 | ✓ |
| desk-12 | templateMold templateMold | kv-edge | 윗:nat 114px 0/0.4 잇는 중 | ✓ |
| desk-13 | templateMold cutFade,templateMold | kv-edge | 윗:nat 84px 0/0.03 | ✓ |
| desk-13-cut | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| desk-14 | templateMold cutFade,templateMold | kv-edge | 윗:nat 95px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 윗:cut 199px 0/0.45 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 177px 0/0.2 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 윗:cut 199px 0/0.04 | ✓ |
| desk-18 | templateMold templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0/0 | ✓ |
| desk-18-cut | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 윗:cut 188px 0/0.19 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 윗:cut 199px 0/0.27 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 123px 0.01/0.24 잇는 중 · 오른:nat 119px 0/0.16 잇는 중 · 윗:nat 173px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold cutFade,templateMold | kv-edge | 윗:nat 84px 0/0.46 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.09 | ✓ |
| desk-23 | templateMold templateMold | kv-colour | 윗:cut 119px 0/0.16 잇는 중 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 윗:cut 123px 0/0.1 | ✓ |
| desk-25 | templateMold templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.01 | ✓ |
| desk-26 | templateMold cutFade,templateMold | kv-edge | 윗:nat 84px 0/0.1 | ✓ |
| desk-27 | templateMold templateMold | kv-vivid-photo | 윗:cut 199px 0/0.24 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 윗:cut 191px 0.01/0.33 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 132px 0/0.28 잇는 중 · 오른:nat 132px 0/0.3 잇는 중 · 윗:nat 101px 0/0.02 | ✓ |
| desk-30 | templateMold templateMold | kv-edge | 윗:cut 134px 0/0.12 | ✓ |
| desk-31 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 199px 0/0.25 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 159px 0.01/0.34 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold | kv-mood | 윗:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 147px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 윗:cut 170px 0/0.2 잇는 중 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 윗:cut 65px 0/0.05 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| desk-36 | templateMold templateMold | kv-vivid-photo | 윗:cut 199px 0/0.41 잇는 중 | ✓ |
| desk-10 | templateMold cutFade,templateMold | kv-edge | 윗:nat 84px 0/0.28 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.02 | ✓ |
| desk-37-cut | templateMold templateMold | kv-mood | 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold templateMold | kv-edge | 윗:cut 65px 0/0.17 잇는 중 | ✓ |
| t1014-gs2026 | templateMold cutFade,templateMold | kv-edge | 윗:nat 82px 0/0.12 | ✓ |
| t1014-lt | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 126px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 191px 0/0.16 잇는 중 | ✓ |
| t1014-dongsuh | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.5 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold templateMold | kv-edge | 윗:nat 65px 0/0.01 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 181px 0/0.15 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.63 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 199px 0/0.33 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold templateMold | kv-vivid-photo | 윗:nat 199px 0/0.18 잇는 중 | ✓ |

### NAP DSP (나스미디어) · 띠배너 320×50 (2배 추출 640×100) `nap-dsp-band-320x50` 320×50

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 15px 0/0.04 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 5px 0.01/0.01 · 오른:nat 9px 0/0.04 | ✓ |
| slabs-3d | templateMold templateMold | kv-edge | 왼:nat 15px 0/0.03 | ✓ |
| geo-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 27px 0/0.03 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 28px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 10px 0.01/0.03 · 오른:nat 10px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.27 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 35px 0/0.26 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 46px 0.01/0.33 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold | kv-vivid-photo | 왼:cut 40px 0.01/0.36 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold | kv-edge | 왼:nat 46px 0/0.18 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 15px 0/0.23 잇는 중 · 오른:nat 26px 0/0.41 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.01 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 37px 0/0.21 잇는 중 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 | ✓ |
| hdot-seminar | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 28px 0/0.12 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 46px 0.01/0.12 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 46px 0.01/0.48 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 46px 0.01/0.26 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 46px 0.01/0.29 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 42px 0/0.17 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0.02/0.41 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 41px 0.01/0.27 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.18 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 46px 0.01/0.2 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 15px 0/0.02 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 31px 0/0.07 · 오른:nat 30px (표본 부족(글자·로고 위)) | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:nat 40px 0.01/0.47 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 25px 0/0.02 · 오른:nat 30px (표본 부족(글자·로고 위)) | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 46px 0/0.11 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0.18/0.57 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0.25/0.48 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold | kv-vivid-photo | 왼:cut 45px 0.01/0.31 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold | kv-mood-dark | 왼:nat 40px 0.01/0.25 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 40px 0/0.1 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0.13/0.15 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0.15/0.15 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 15px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 32px 0/0.1 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 10px 0.02/0.12 · 오른:nat 10px 0.01/0.14 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.15 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 왼:nat 45px 0/0.24 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 36px 0.01/0.08 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 46px 0/0.32 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 11px 0/0.09 · 오른:nat 9px 0/0.07 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 38px 0.01/0.19 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 30px 0/0.08 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 46px 0/0.3 잇는 중 · 윗:nat 19px (표본 부족(글자·로고 위)) | ✓ |
| desk-12 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 46px 0.01/0.39 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.06 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.35 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 37px 0/0.28 잇는 중 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 46px 0.01/0.43 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.31 잇는 중 | ✓ |
| desk-16 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 33px 0/0.19 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 28px 0/0.02 | ✓ |
| desk-18 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 9px 0/0.07 · 오른:nat 9px 0/0.16 잇는 중 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:cut 42px 0/0.09 | ✓ |
| desk-20 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.16 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 17px 0.01/0.22 ✗ · 오른:nat 17px 0/0.15 잇는 중 | ✗ seam-far |
| desk-22 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.39 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0.04/0.36 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 34px 0/0.06 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 28px 0/0.11 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 9px 0/0.02 · 오른:nat 9px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 15px 0/0.08 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 42px 0.01/0.26 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 44px 0.01/0.34 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.19 잇는 중 · 오른:nat 18px 0/0.19 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 29px 0/0.07 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 45px 0/0.11 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 46px 0/0.23 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.16 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 41px 0.01/0.22 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 34px 0/0.26 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 15px 0/0.03 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 46px 0.01/0.32 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 15px 0/0.2 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 33px 0/0.24 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.5 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.35 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 46px 0.01/0.12 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 45px 0.01/0.34 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 29px 0/0.03 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 27px 0/0.05 · 오른:nat 41px (표본 부족(글자·로고 위)) | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 34px 0.01/0.13 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.44 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 46px 0.01/0.49 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 45px 0/0.13 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 46px 0/0.39 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:cut 46px 0.01/0.22 잇는 중 | ✓ |

### NAP DSP (나스미디어) · 띠배너 320×100 `nap-dsp-band-320x100` 320×100

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 23px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 10px 0/0.01 · 오른:nat 19px 0/0.04 | ✓ |
| slabs-3d | templateMold templateMold | kv-edge | 왼:nat 23px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 41px 0/0.11 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 42px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 20px 0/0.02 · 오른:nat 21px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 23px 0/0.19 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 53px 0/0.26 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 70px 0.01/0.22 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold | kv-vivid-photo | 왼:cut 60px 0.01/0.26 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold | kv-edge | 왼:cut 70px 0/0.17 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 31px 0/0.26 잇는 중 · 오른:nat 53px 0/0.42 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/0.65 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 윗:nat 0px 0/0.32 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 23px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 23px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 56px 0/0.13 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.36 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 70px 0/0.14 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 70px 0/0.14 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.44 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 70px 0.01/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 70px 0.01/0.27 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 70px 0.01/0.29 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold | kv-vivid-photo | 왼:cut 55px 0/0.18 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 62px 0.01/0.25 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.37 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 70px 0.01/0.2 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 23px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-cards-orange | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 51px 0/0.07 · 윗:nat 0px 0.03/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:nat 61px 0/0.33 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 42px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 70px 0/0.12 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0.02/0.36 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold | kv-vivid-photo | 왼:cut 67px 0/0.3 잇는 중 | ✓ |
| midas-skyscraper | templateMold templateMold | kv-mood-dark | 왼:cut 60px 0.01/0.27 잇는 중 | ✓ |
| midas-facets | templateMold templateMold,templateMold.logoArea | kv-colour | 왼:cut 43px 0/0.08 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 23px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 48px 0/0.11 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 19px 0/0.13 · 오른:nat 20px 0/0.14 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.1 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 왼:nat 67px 0/0.21 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 53px 0/0.07 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 70px 0/0.34 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 23px 0/0.08 · 오른:nat 18px 0/0.08 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 57px 0/0.19 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 46px 0/0.02 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 70px 0/0.29 잇는 중 · 윗:nat 29px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 70px 0.01/0.44 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 23px 0/0.01 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.34 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 56px 0/0.08 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 70px 0.01/0.39 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.4 잇는 중 | ✓ |
| desk-16 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 50px 0/0.22 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 42px 0/0.32 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.12 · 오른:nat 18px 0/0.22 잇는 중 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:cut 64px 0/0.1 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 70px 0/0.27 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 35px 0/0.23 잇는 중 · 오른:nat 33px 0/0.17 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 23px 0/0.22 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 51px 0/0.06 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 42px 0/0.14 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.01 · 오른:nat 18px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 23px 0/0.08 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 64px 0.01/0.32 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 66px 0.01/0.34 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 37px 0/0.23 잇는 중 · 오른:nat 37px 0/0.21 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 45px 0/0.03 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 69px 0/0.16 잇는 중 | ✓ |
| desk-32 | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 50px 0/0.33 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.28 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 62px 0/0.24 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 51px 0/0.23 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 23px 0/0.03 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 70px 0/0.31 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 23px 0/0.1 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 50px 0/0.24 잇는 중 · 윗:nat 0px 0.02/0.04 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.4 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.38 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 70px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 69px 0/0.33 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 43px 0/0.03 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 46px 0/0.04 · 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 70px 0/0.07 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 21px 0/0.46 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 70px 0/0.3 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 왼:cut 69px 0/0.14 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.61 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:cut 70px 0/0.43 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:cut 70px 0/0.33 잇는 중 | ✓ |

### NAP DSP (나스미디어) · 전면배너 300×250 `nap-dsp-full-300x250` 300×250

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 48px 0/0.21 잇는 중 · 윗:cut 30px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 9px 0/0.01 · 오른:nat 17px 0/0.04 · 윗:nat 28px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 48px 0/0.09 · 윗:cut 30px 0/0.07 | ✓ |
| geo-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.03 · 윗:cut 30px 0/0.02 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.01 · 윗:nat 30px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 18px 0/0.02 · 오른:nat 19px 0/0.06 · 윗:nat 28px 0/0.09 | ✓ |
| fox-3d | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 왼:nat 40px 0/0.24 잇는 중 · 윗:nat 25px 0/0 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 60px 0/0.24 잇는 중 · 윗:cut 35px 0/0.24 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 78px 0/0.29 잇는 중 · 윗:cut 48px 0/0.34 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 67px 0.01/0.34 잇는 중 · 윗:cut 44px 0/0.37 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 78px 0/0.2 잇는 중 · 윗:cut 30px 0/0.14 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 27px 0/0.29 잇는 중 · 오른:nat 47px 0/0.43 잇는 중 · 윗:nat 31px 0/0.14 | ✓ |
| dongbu_illust | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.65 잇는 중 · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.16 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| sep-open-recruit | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 48px 0/0.05 · 윗:nat 30px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 48px 0/0.04 · 윗:nat 30px 0/0.03 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 63px 0/0.11 · 윗:cut 30px 0/0.05 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:nat 49px 0/0.07 · 윗:nat 49px 0/0.04 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:nat 78px 0/0.15 잇는 중 · 윗:cut 43px 0.01/0.21 잇는 중 | ✓ |
| hdot-asterisk | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 78px 0.01/0.48 잇는 중 · 윗:nat 49px 0.01/0.45 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 78px 0/0.29 잇는 중 · 윗:cut 49px 0.01/0.34 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 78px 0/0.25 잇는 중 · 윗:cut 46px 0.01/0.44 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 71px 0/0.18 잇는 중 · 윗:cut 47px 0.01/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 70px 0.01/0.26 잇는 중 · 윗:cut 44px 0.01/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-folder-dark | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 윗:nat 0px 0/0.33 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 78px 0/0.22 잇는 중 · 윗:cut 49px 0/0.31 잇는 중 | ✓ |
| midas-acrylic-box | templateMold cutFade,templateMold,templateMold.containGrad | kv-edge | 왼:nat 26px 0/0.02 · 윗:nat 23px 0/0.01 | ✓ |
| midas-cards-orange | templateMold cutFade,templateMold,templateMold.containGrad | kv-edge | 왼:nat 55px 0/0.06 · 윗:nat 29px 0/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:nat 68px 0/0.36 잇는 중 · 윗:nat 30px 0/0.02 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 45px 0/0.02 · 오른:nat 54px (표본 부족(글자·로고 위)) · 윗:nat 25px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 78px 0/0.12 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0.01/0.36 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 75px 0/0.31 잇는 중 · 윗:cut 38px 0/0.23 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 67px 0/0.26 잇는 중 · 윗:cut 49px 0.01/0.23 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-colour | 왼:nat 67px 0/0.1 · 윗:cut 30px 0/0.07 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.1 · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0 · 윗:cut 30px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-colour | 왼:nat 54px 0/0.12 · 윗:cut 30px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 17px 0.01/0.12 · 오른:nat 18px 0/0.13 · 윗:nat 25px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.13 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood | 왼:nat 75px 0/0.24 잇는 중 · 윗:cut 47px 0/0.17 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 60px 0/0.14 · 윗:cut 46px 0/0.15 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 78px 0/0.35 잇는 중 · 윗:cut 49px 0/0.19 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 20px 0/0.09 · 오른:nat 16px 0/0.07 · 윗:nat 28px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 64px 0/0.19 잇는 중 · 윗:cut 40px 0/0.16 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 51px 0/0.08 · 윗:nat 31px 0/0.07 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 78px 0/0.3 잇는 중 · 윗:nat 32px 0/0.23 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 78px 0.01/0.38 잇는 중 · 윗:cut 49px 0.01/0.5 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 48px 0/0.15 잇는 중 · 윗:cut 42px 0/0.12 | ✓ |
| desk-13-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 63px 0/0.07 · 윗:cut 30px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:nat 78px 0/0.39 잇는 중 · 윗:cut 31px 0/0.22 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.14 · 윗:nat 0px 0.01/0.21 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 왼:nat 55px 0/0.14 · 윗:nat 44px 0/0.13 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.04 · 윗:cut 49px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 16px 0/0.12 · 오른:nat 16px 0/0.21 잇는 중 · 윗:nat 25px 0/0.1 | ✓ |
| desk-18-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:cut 71px 0/0.03 · 윗:cut 46px 0.01/0.1 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.31 잇는 중 · 윗:cut 49px 0/0.29 잇는 중 | ✓ |
| desk-20-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.57 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 31px 0/0.24 잇는 중 · 오른:nat 29px 0/0.17 잇는 중 · 윗:nat 43px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 48px 0/0.56 잇는 중 · 윗:cut 49px 0.01/0.53 잇는 중 | ✓ |
| desk-22-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 왼:nat 57px 0/0.07 · 윗:cut 30px 0/0.07 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.11 · 윗:cut 30px 0/0.05 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 16px 0/0.01 · 오른:nat 16px 0/0.01 · 윗:nat 25px 0/0 | ✓ |
| desk-26 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.18 잇는 중 · 윗:cut 30px 0/0.15 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 71px 0.01/0.35 잇는 중 · 윗:nat 49px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 74px 0.01/0.36 잇는 중 · 윗:cut 47px 0.01/0.33 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 33px 0/0.23 잇는 중 · 오른:nat 33px 0/0.19 잇는 중 · 윗:nat 25px 0/0.03 | ✓ |
| desk-30 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 50px 0/0.05 · 윗:cut 33px 0/0.05 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 77px 0/0.11 · 윗:nat 49px 0/0.14 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:nat 78px 0/0.33 잇는 중 · 윗:nat 41px 0/0.22 잇는 중 | ✓ |
| desk-32-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.12 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-vivid-photo | 왼:nat 70px 0/0.22 잇는 중 · 윗:cut 44px 0.01/0.23 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:nat 57px 0/0.25 잇는 중 · 윗:cut 42px 0/0.06 | ✓ |
| desk-35 | templateMold templateMold,templateMold.logoArea | kv-edge | 왼:cut 48px 0/0.13 · 윗:cut 30px 0/0.04 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 윗:nat 0px 0/0.59 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 왼:nat 78px 0/0.34 잇는 중 · 윗:cut 49px 0.01/0.34 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 48px 0/0.36 잇는 중 · 윗:cut 49px 0.01/0.36 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 55px 0/0.23 잇는 중 · 윗:nat 0px 0.01/0.05 | ✓ |
| desk-37-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.34 잇는 중 · 윗:nat 0px 0.01/0.42 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 78px 0.01/0.19 잇는 중 · 윗:cut 30px 0/0.17 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 77px 0.01/0.35 잇는 중 · 윗:cut 30px 0/0.2 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:nat 48px 0/0.03 · 윗:cut 30px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 48px 0/0.04 · 오른:nat 73px (표본 부족(글자·로고 위)) · 윗:nat 25px 0/0.07 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:nat 58px 0.01/0.16 잇는 중 · 윗:cut 47px 0.01/0.17 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 10px 0/0.57 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 15px 0/0.44 잇는 중 · 윗:nat 0px 0/0.46 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:cut 78px 0.01/0.48 잇는 중 · 윗:nat 30px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-mood-dark | 왼:cut 77px 0/0.13 · 윗:nat 45px 0/0.12 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.59 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-vivid-photo | 왼:cut 78px 0/0.33 잇는 중 · 윗:nat 49px 0/0.31 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-vivid-photo | 왼:cut 78px 0/0.26 잇는 중 · 윗:nat 49px 0.01/0.14 | ✓ |

### NAP DSP (나스미디어) · 전면배너 320×480 (2배 추출 640×960) `nap-dsp-full-320x480` 320×480

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 윗:cut 33px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 19px 0/0.01 · 오른:nat 34px 0/0.05 · 윗:nat 59px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold | kv-edge | 윗:cut 33px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0.01 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 33px 0/0.01 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 37px 0/0.02 · 오른:nat 38px 0/0.06 · 윗:nat 59px 0/0.1 | ✓ |
| fox-3d | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0.13 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 윗:cut 71px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 99px 0/0.37 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 90px 0/0.45 잇는 중 | ✓ |
| bc-illust | templateMold templateMold | kv-edge | 윗:cut 33px 0/0.01 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 56px 0/0.26 잇는 중 · 오른:nat 96px 0/0.43 잇는 중 · 윗:nat 64px 0/0.15 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.16 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 오른:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| hdot-wave | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 50px 0/0.05 | ✓ |
| hdot-purple3d | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 50px 0/0.03 | ✓ |
| hdot-hall | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0.03 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.41 잇는 중 · 오른:nat 0px 0/0.33 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.27 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 101px 0/0.04 | ✓ |
| hdot-audience | templateMold templateMold,templateMold.logoArea | kv-mood-dark | 윗:cut 88px 0/0.23 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 90px 0.01/0.46 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 101px 0.01/0.38 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 101px 0.01/0.48 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 97px 0.01/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.36 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold | kv-vivid-photo | 윗:nat 90px 0.01/0.23 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 오른:nat 0px 0/0.18 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 윗:cut 101px 0/0.32 잇는 중 | ✓ |
| midas-acrylic-box | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 54px 0/0.02 · 오른:nat 99px 0/0.25 잇는 중 · 윗:nat 51px 0/0.01 | ✓ |
| midas-cards-orange | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 115px 0/0.07 · 오른:nat 109px 0/0.04 · 윗:nat 60px 0/0.05 | ✓ |
| midas-bridge-icons | templateMold templateMold | kv-edge | 윗:cut 33px 0/0.01 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 91px 0/0.02 · 오른:nat 111px 0/0.11 · 윗:nat 51px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 윗:cut 79px 0/0.21 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold | kv-mood-dark | 윗:nat 101px 0/0.25 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea | kv-colour | 윗:nat 86px 0/0.03 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/0.13 | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0 | ✓ |
| desk-02 | templateMold templateMold,templateMold.logoArea | kv-colour | 윗:cut 60px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 35px 0/0.12 · 오른:nat 37px 0/0.15 잇는 중 · 윗:nat 51px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.14 · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood | 윗:nat 97px 0/0.11 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:cut 77px 0/0.08 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 60px 0/0.13 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 41px 0/0.08 · 오른:nat 19px 0/0.03 · 윗:nat 59px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 60px 0/0.08 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:nat 64px 0/0.04 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 72px 0/0.21 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 101px 0/0.47 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-14 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 73px 0/0.34 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.04 · 오른:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0.01/0.25 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 90px 0/0.17 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 101px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 34px 0/0.12 · 오른:nat 34px 0/0.05 · 윗:nat 51px 0/0.06 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 95px 0/0.06 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 101px 0/0.27 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.44 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 63px 0/0.25 잇는 중 · 오른:nat 61px 0/0.16 잇는 중 · 윗:nat 88px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0.31 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.52 잇는 중 | ✓ |
| desk-23 | templateMold templateMold,templateMold.logoArea | kv-colour | 윗:cut 60px 0/0.11 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 62px 0/0.06 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 33px 0/0.01 · 오른:nat 33px 0/0.01 · 윗:nat 51px 0/0 | ✓ |
| desk-26 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0 | ✓ |
| desk-27 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 101px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea | kv-mood | 윗:cut 97px 0.01/0.37 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 67px 0/0.27 잇는 중 · 오른:nat 67px 0/0.31 잇는 중 · 윗:nat 51px 0/0.03 | ✓ |
| desk-30 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 68px 0/0.07 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 99px 0/0.13 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 82px 0/0.22 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.08 · 윗:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 90px 0/0.24 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 86px 0/0.21 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.68 잇는 중 | ✓ |
| desk-36 | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:cut 101px 0.01/0.36 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0.14 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 윗:nat 0px 0.02/0.02 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.logoArea | kv-mood | 왼:nat 98px 0/0.36 잇는 중 · 오른:nat 98px 0/0.34 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.34 잇는 중 · 오른:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold templateMold,templateMold.logoArea | kv-edge | 윗:cut 33px 0/0 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 윗:cut 99px 0/0.39 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 64px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad | kv-edge | 왼:nat 99px 0/0.06 · 오른:nat 151px 0/0.21 잇는 중 · 윗:nat 51px 0/0.12 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 97px 0/0.13 | ✓ |
| t1014-dongsuh | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px 0/0.17 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.37 잇는 중 · 오른:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.logoArea | kv-vivid | 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold cutFade,templateMold,templateMold.logoArea | kv-edge | 윗:nat 43px 0/0.1 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea | kv-mood-dark | 윗:nat 70px 0/0.12 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.65 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea | kv-vivid-photo | 윗:cut 101px 0.01/0.33 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin | templateMold templateMold,templateMold.logoArea | kv-vivid-photo | 윗:nat 80px 0.01/0.11 | ✓ |

### 인스타그램 · 인스타그램 피드 (기본형 1080×1080) `instagram-feed-1080` 1080×1080

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0.18 잇는 중 · 윗:cut 168px 0/0.14 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 50px 0/0.01 · 오른:nat 92px 0/0.04 · 윗:nat 158px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0.05 · 윗:cut 168px 0/0.07 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 왼:cut 278px 0/0.07 · 윗:cut 168px 0/0.04 | ✓ |
| samsung-3d | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 450px 0/0.02 · 윗:cut 168px 0/0.03 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 100px 0/0.03 · 오른:nat 103px 0/0.08 · 윗:nat 158px 0/0.1 | ✓ |
| fox-3d | templateMold cutFade,templateMold | kv-edge | 왼:nat 229px 0/0.2 잇는 중 · 윗:cut 138px 0/0 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 344px 0/0.27 잇는 중 · 윗:cut 192px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 450px 0/0.4 잇는 중 · 윗:cut 266px 0/0.44 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 385px 0/0.39 잇는 중 · 윗:cut 242px 0/0.49 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 450px 0/0.23 잇는 중 · 윗:cut 168px 0/0.2 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 151px 0/0.3 잇는 중 · 오른:nat 259px 0/0.42 잇는 중 · 윗:nat 173px 0/0.13 | ✓ |
| dongbu_illust | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 278px 0/0.06 · 윗:nat 168px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 278px 0/0.04 · 윗:nat 168px 0/0.03 | ✓ |
| hdot-hall | templateMold meltFix,templateMold | kv-edge | 왼:cut 360px 0/0.23 잇는 중 · 윗:cut 168px 0/0.02 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 278px 0/0.13 · 윗:cut 271px 0/0.09 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 450px 0/0.12 · 윗:cut 237px 0/0.18 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 450px 0/0.46 잇는 중 · 윗:nat 271px 0/0.46 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 450px 0/0.32 잇는 중 · 윗:cut 271px 0/0.32 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 450px 0/0.31 잇는 중 · 윗:cut 271px 0/0.45 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 409px 0/0.16 잇는 중 · 윗:cut 261px 0/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 401px 0/0.25 잇는 중 · 윗:cut 242px 0/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 450px 0/0.28 잇는 중 · 윗:cut 271px 0/0.32 잇는 중 | ✓ |
| midas-acrylic-box | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 145px 0/0.02 · 오른:nat 263px (표본 부족(글자·로고 위)) · 윗:nat 138px 0/0.01 | ✓ |
| midas-cards-orange | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 309px 0/0.07 · 오른:nat 293px 0/0.04 · 윗:nat 163px 0/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold | kv-edge | 왼:nat 393px 0/0.32 잇는 중 · 윗:nat 168px 0/0.02 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 246px 0/0.02 · 오른:nat 299px 0/0.11 · 윗:nat 138px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 450px 0/0.12 · 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 434px 0/0.3 잇는 중 · 윗:cut 212px 0/0.22 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 385px 0/0.27 잇는 중 · 윗:cut 271px 0/0.23 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 385px 0/0.09 · 윗:cut 168px 0/0.06 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0 · 윗:cut 168px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 311px 0/0.12 · 윗:cut 187px 0/0.07 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 94px 0/0.11 · 오른:nat 99px 0/0.15 잇는 중 · 윗:nat 138px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood | 왼:nat 434px 0/0.26 잇는 중 · 윗:cut 261px 0/0.24 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 344px 0/0.17 잇는 중 · 윗:cut 256px 0/0.16 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 450px 0/0.34 잇는 중 · 윗:cut 271px 0/0.2 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 110px 0/0.08 · 오른:nat 88px 0/0.06 · 윗:nat 158px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 368px 0/0.19 잇는 중 · 윗:cut 222px 0/0.15 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 295px 0/0.03 · 윗:nat 173px 0/0.08 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 450px 0/0.27 잇는 중 · 윗:nat 184px 0/0.25 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 450px 0/0.43 잇는 중 · 윗:cut 271px 0/0.47 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0.21 잇는 중 · 윗:cut 232px 0/0.18 잇는 중 | ✓ |
| desk-13-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold | kv-edge | 왼:nat 360px 0/0.06 · 윗:cut 168px 0/0.03 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 450px 0/0.36 잇는 중 · 윗:cut 173px 0/0.23 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 319px 0/0.14 · 윗:nat 242px 0/0.18 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 왼:nat 450px 0/0.31 잇는 중 · 윗:cut 168px 0/0.16 잇는 중 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 91px 0/0.18 잇는 중 · 오른:nat 91px 0/0.22 잇는 중 · 윗:nat 138px 0/0.06 | ✓ |
| desk-18-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:nat 409px 0/0.12 · 윗:cut 256px 0/0.07 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0.3 잇는 중 · 윗:cut 271px 0/0.13 | ✓ |
| desk-20-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 170px 0/0.26 잇는 중 · 오른:nat 163px 0/0.2 잇는 중 · 윗:nat 237px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0.53 잇는 중 · 윗:cut 271px 0/0.56 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 327px 0/0.06 · 윗:cut 168px 0/0.09 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 왼:nat 278px 0/0.1 · 윗:nat 168px 0/0.04 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 89px 0/0.01 · 오른:nat 89px 0/0.01 · 윗:nat 138px 0/0 | ✓ |
| desk-26 | templateMold templateMold | kv-edge | 왼:cut 278px 0/0.17 잇는 중 · 윗:cut 168px 0/0.16 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 409px 0/0.37 잇는 중 · 윗:nat 271px 0/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 왼:nat 425px 0/0.36 잇는 중 · 윗:cut 261px 0/0.35 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 181px 0/0.24 잇는 중 · 오른:nat 181px 0/0.3 잇는 중 · 윗:nat 138px 0/0.02 | ✓ |
| desk-30 | templateMold meltFix,templateMold | kv-edge | 왼:nat 376px 0/0.07 · 윗:cut 187px 0/0.15 잇는 중 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 442px 0/0.15 잇는 중 · 윗:nat 271px 0/0.13 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 450px 0/0.32 잇는 중 · 윗:cut 271px 0/0.18 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 401px 0/0.26 잇는 중 · 윗:cut 242px 0/0.26 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 왼:nat 327px 0/0.16 잇는 중 · 윗:cut 232px 0/0.18 잇는 중 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 왼:cut 278px 0/0.12 · 윗:cut 168px 0/0.04 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 450px 0/0.33 잇는 중 · 윗:cut 271px 0/0.35 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 278px 0/0.38 잇는 중 · 윗:cut 271px 0/0.38 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 319px 0/0.11 · 윗:nat 0px 0.02/0.03 | ✓ |
| desk-37-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold | kv-edge | 왼:cut 450px 0/0.22 잇는 중 · 윗:cut 168px 0/0.18 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 442px 0/0.37 잇는 중 · 윗:cut 182px 0/0.21 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 278px 0/0.04 · 윗:cut 168px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 267px 0/0.08 · 오른:nat 407px 0/0.26 잇는 중 · 윗:nat 138px 0/0.08 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 335px 0/0.22 잇는 중 · 윗:cut 261px 0/0.18 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold | kv-vivid | 왼:nat 61px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold | kv-vivid | 왼:nat 84px 0/0.48 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 450px 0/0.51 잇는 중 · 윗:nat 168px 0/0.03 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 442px 0/0.16 잇는 중 · 윗:nat 247px 0/0.14 | ✓ |
| t1014-jeil | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 450px 0/0.33 잇는 중 · 윗:cut 271px 0/0.3 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 450px 0/0.32 잇는 중 · 윗:nat 271px 0/0.15 잇는 중 | ✓ |

### 카카오톡 · 카카오 비즈보드 (MO) `kakao-bizboard-mo` 1029×258

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| texture-dark | — | — | — | 제외: 키비주얼 없음 |
| slabs-3d | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| geo-3d | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| samsung-3d | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| gradient | — | — | — | 제외: 키비주얼 없음 |
| fox-3d | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| ilhwa-dark | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| ilhwa-photo | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| ilhwa-roomy | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| bc-illust | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| fox-gradbg | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.11 · 오른:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.61 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.22 잇는 중 · 오른:nat 0px 0/0.81 잇는 중 · 윗:nat 0px 0/0.79 잇는 중 · 아랫:nat 0px 0.73/0.51 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.52 잇는 중 · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.66 잇는 중 · 아랫:nat 0px 0/0.62 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.65 잇는 중 · 오른:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hdot-wave | — | — | — | 제외: 키비주얼 없음 |
| hdot-purple3d | — | — | — | 제외: 키비주얼 없음 |
| hdot-hall | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.66 잇는 중 · 오른:nat 0px 0/0.88 잇는 중 · 윗:nat 0px 0/0.89 잇는 중 · 아랫:nat 0px 0.74/0.78 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.93 잇는 중 · 오른:nat 0px 0/0.93 잇는 중 · 윗:nat 0px 0/0.9 잇는 중 · 아랫:nat 0px 0.19/0.31 잇는 중 | ✓ |
| hdot-seminar | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| hdot-audience | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.99 잇는 중 · 오른:nat 0px 0/0.44 잇는 중 · 윗:nat 0px 0/0.94 잇는 중 · 아랫:nat 0px 0/0.56 잇는 중 | ✓ |
| hr-doctor | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| hr-teamhands | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| hr-nurse-ai | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-city | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.24 잇는 중 · 아랫:nat 0px 0/0.58 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.81 잇는 중 · 오른:nat 0px 0/0.63 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.79 잇는 중 | ✓ |
| midas-glass-folders | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-cards-orange | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-bridge-icons | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-bridge-dark | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-book-vib | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-book-open | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.13 · 오른:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.4 잇는 중 · 오른:nat 0px 0/0.11 · 윗:nat 0px 0/0.14 · 아랫:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-skyscraper | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| midas-facets | — | — | — | 제외: 키비주얼 없음 |
| midas-glass-mint | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.8 잇는 중 · 오른:nat 0px 0/0.89 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.71 잇는 중 · 오른:nat 0px 0/0.47 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-02 | — | — | — | 제외: 키비주얼 없음 |
| desk-03 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.19 잇는 중 · 오른:nat 0px 0/0.07 · 윗:nat 0px 0/0.33 잇는 중 · 아랫:nat 0px 0/0.45 잇는 중 | ✓ |
| desk-04 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-05 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-06 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-07 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-08 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-09 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-11 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-12 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-13 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/– · 오른:nat 0px 0/0.31 잇는 중 · 윗:nat 0px 0/0.32 잇는 중 · 아랫:nat 0px 0/0.49 잇는 중 | ✓ |
| desk-14 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-15 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.24 잇는 중 · 아랫:nat 0px 0/0.32 잇는 중 | ✓ |
| desk-16 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-17 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-18 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.48 잇는 중 · 오른:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0/0.16 잇는 중 · 아랫:nat 0px 0/0.31 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-20 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.48 잇는 중 · 오른:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 · 아랫:nat 0px 0/0.29 잇는 중 | ✓ |
| desk-21 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-22 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.24 잇는 중 · 아랫:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-23 | — | — | — | 제외: 키비주얼 없음 |
| desk-24 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-25 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-26 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-27 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-28 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-29 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-30 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-31 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-32 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.49 잇는 중 · 오른:nat 0px 0/0.59 잇는 중 · 윗:nat 0px 0/0.86 잇는 중 · 아랫:nat 0px 0/0.96 잇는 중 | ✓ |
| desk-33 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-34 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-35 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.21 잇는 중 · 오른:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 · 아랫:nat 0px 0/0.24 잇는 중 | ✓ |
| desk-36 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-10 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-37 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.08 · 오른:nat 0px 0/0.23 잇는 중 · 윗:nat 0px 0/0.06 · 아랫:nat 0px 0/0.24 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-gs2026 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-lt | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-lt-v2 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-lt-v3 | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.font | none | 왼:nat 23px 0/0.22 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.68 잇는 중 · 아랫:cut 52px 0.01/0.36 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.font | none | 왼:nat 32px 0/0.24 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.18 잇는 중 · 아랫:cut 52px 0/0.38 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.18 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.32 잇는 중 | ✓ |
| t1014-asan-illust | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.45 잇는 중 · 아랫:nat 0px 0/0.29 잇는 중 | ✓ |
| t1014-hanssem | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.font | none | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.77 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-hanjin | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | none | — | ✓ |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 홍보이미지 `kakao-display-pc-promo` 1200×600

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 61px 0/0.01 · 오른:nat 111px 0/0.04 | ✓ |
| slabs-3d | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.01 | ✓ |
| geo-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.37 잇는 중 | ✓ |
| samsung-3d | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 121px 0/0.03 · 오른:nat 125px 0/0.06 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 157px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.24 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 180px 0/0.23 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.26 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 122px 0/0.29 잇는 중 · 윗:nat 0px 0.05/0.08 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0 | ✓ |
| hdot-hall | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 126px 0/0.03 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 210px 0/0.35 잇는 중 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 210px 0/0.16 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.5 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.3 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.23 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 164px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 187px 0/0.25 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.21 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.02 · 윗:nat 0px 0/0 | ✓ |
| midas-cards-orange | templateMold templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 153px 0/0.07 · 윗:nat 0px 0.03/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 183px 0/0.22 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 126px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 210px 0/0.13 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.28 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 210px 0/0.31 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:cut 180px 0/0.11 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 69px 0/0 | ✓ |
| desk-02 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-colour | 왼:cut 122px 0/0.04 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 115px 0/0.12 · 오른:nat 121px 0/0.14 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:cut 203px 0/0.22 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 191px 0/0.1 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.46 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 135px 0/0.08 · 오른:nat 108px 0/0.07 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 172px 0/0.09 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 138px 0/0.05 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 210px 0/0.29 잇는 중 · 윗:nat 86px 0/0.24 잇는 중 | ✓ |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.38 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-14 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 122px 0/0.05 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 210px 0/0.43 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– | ✓ |
| desk-16 | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 149px 0/0.17 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 126px 0/0 | ✓ |
| desk-18 | templateMold templateMold,textColour.brand,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.12 · 윗:nat 0px 0/0 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 191px 0/0.09 | ✓ |
| desk-20 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.25 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 176px 0/0.26 잇는 중 · 윗:nat 244px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 153px 0/0.05 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 126px 0/0.14 | ✓ |
| desk-25 | templateMold templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.01 · 윗:nat 0px 0.01/0.01 | ✓ |
| desk-26 | templateMold templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 191px 0/0.3 잇는 중 | ✓ |
| desk-28 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:cut 203px 0/0.3 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 210px 0/0.26 잇는 중 · 윗:nat 0px 0.01/0.02 | ✓ |
| desk-30 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 134px 0/0.05 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 206px 0/0.21 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 210px 0/0.19 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 187px 0/0.28 잇는 중 | ✓ |
| desk-34 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.27 잇는 중 | ✓ |
| desk-35 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.41 잇는 중 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 210px 0/0.37 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 69px 0/0.01 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 149px 0/0.15 잇는 중 · 윗:nat 0px 0.02/0.02 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,textColour.brand,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.22 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 206px 0/0.32 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 126px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 138px 0/0.09 · 윗:nat 0px 0.01/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 210px 0/0.19 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 61px 0/0.56 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 210px 0/0.16 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 206px 0/0.2 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.58 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.51 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 210px 0/0.54 잇는 중 | ✓ |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 프로필이미지 `kakao-display-pc-profile` 300×300

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 네이버 GFA · 모바일 DA 이미지형 1250×560 (성과형: 네이버 메인·서비스 통합 / 보장형: 브랜딩DA·M통합DA) `naver-gfa-mobile-da-1250x560` 1250×560

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold cutFade,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 151px 0/0.21 잇는 중 · 오른:nat 124px 0/0.04 · 윗:cut 95px 0/0 · 아랫:cut 78px 0/0.22 잇는 중 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 28px 0/0.01 · 오른:nat 52px 0/0.04 · 윗:nat 89px 0/0.05 · 아랫:nat 78px 0/0.02 | ✓ |
| slabs-3d | templateMold cutFade,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 151px 0/0.02 · 오른:nat 244px 0/0.22 잇는 중 · 윗:cut 95px 0/0.06 · 아랫:cut 78px 0/0.24 잇는 중 | ✓ |
| geo-3d | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.04 · 오른:nat 244px 0/0.33 잇는 중 · 윗:cut 95px 0/0.03 · 아랫:cut 78px 0/0.38 ✗ | ✗ cut-short |
| samsung-3d | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.01 · 오른:nat 244px 0/0.21 잇는 중 · 윗:nat 95px 0/0.02 · 아랫:cut 153px 0/0.26 잇는 중 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 56px 0/0.03 · 오른:nat 58px 0/0.06 · 윗:nat 89px 0/0.1 · 아랫:nat 78px 0/0.06 | ✓ |
| fox-3d | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:nat 124px 0/0.26 잇는 중 · 오른:nat 244px 0/0.21 잇는 중 · 윗:nat 78px 0/0 · 아랫:cut 153px 0/0.27 잇는 중 | ✓ |
| ilhwa-dark | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-mood-dark | 왼:cut 187px 0/0.06 · 오른:cut 186px 0/0.14 · 윗:cut 108px 0/0.23 잇는 중 · 아랫:cut 103px 0/0.05 | ✓ |
| ilhwa-photo | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-vivid-photo | 왼:cut 244px 0/0.25 잇는 중 · 오른:nat 244px 0/0.25 잇는 중 · 윗:cut 150px 0/0.42 잇는 중 · 아랫:nat 153px 0/0.29 잇는 중 | ✓ |
| ilhwa-roomy | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-vivid-photo | 왼:cut 209px 0/0.26 잇는 중 · 오른:nat 244px 0/0.25 잇는 중 · 윗:cut 136px 0/0.42 잇는 중 · 아랫:nat 153px 0/0.29 잇는 중 | ✓ |
| bc-illust | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 244px 0/0.18 잇는 중 · 오른:nat 244px 0/0.19 잇는 중 · 윗:cut 95px 0/0.15 잇는 중 · 아랫:cut 78px 0/0.25 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 85px 0/0.25 잇는 중 · 오른:nat 146px 0/0.42 잇는 중 · 윗:nat 97px 0/0.15 잇는 중 · 아랫:nat 95px 0/0.41 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.2 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.57 잇는 중 | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0.06/0.13 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.18 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.15 잇는 중 | ✓ |
| sep-open-recruit | templateMold overlapFix.ok,templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| hdot-wave | templateMold cutFade,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.06 · 오른:cut 124px 0/0.04 · 윗:nat 95px 0/0.05 · 아랫:nat 92px 0/0.06 | ✓ |
| hdot-purple3d | templateMold cutFade,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.05 · 오른:cut 124px 0/0.02 · 윗:nat 95px 0/0.03 · 아랫:nat 78px 0/0.04 | ✓ |
| hdot-hall | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:cut 195px 0/0.21 잇는 중 · 오른:nat 195px 0/0.18 잇는 중 · 윗:cut 95px 0/0.03 · 아랫:cut 122px 0/0.24 잇는 중 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 · 아랫:nat 0px 0.27/0.28 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 오른:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.24 잇는 중 · 아랫:nat 0px 0.21/0.35 잇는 중 | ✓ |
| hdot-seminar | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:nat 152px 0/0.11 · 오른:nat 245px 0/0.11 · 윗:nat 153px 0/0.06 · 아랫:nat 153px 0/0.14 | ✓ |
| hdot-audience | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:nat 244px 0/0.09 · 오른:nat 218px 0/0.23 잇는 중 · 윗:cut 133px 0/0.22 잇는 중 · 아랫:cut 122px 0/0.16 잇는 중 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.24 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.23 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hr-doctor | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:cut 244px 0/0.47 잇는 중 · 오른:cut 244px 0/0.48 잇는 중 · 윗:nat 153px 0/0.43 잇는 중 · 아랫:nat 153px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:nat 244px 0/0.31 잇는 중 · 오른:nat 244px 0/0.32 잇는 중 · 윗:cut 153px 0/0.46 잇는 중 · 아랫:cut 153px 0/0.35 잇는 중 | ✓ |
| hr-nurse-ai | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:nat 244px 0/0.23 잇는 중 · 오른:nat 244px 0/0.24 잇는 중 · 윗:cut 145px 0/0.49 잇는 중 · 아랫:cut 136px 0/0.38 잇는 중 | ✓ |
| midas-cablebridge | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-vivid-photo | 왼:nat 222px 0/0.16 잇는 중 · 오른:cut 222px 0/0.17 잇는 중 · 윗:cut 147px 0/0.15 잇는 중 · 아랫:cut 142px 0/0.13 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 · 아랫:nat 0px 0/0.31 잇는 중 | ✓ |
| midas-city | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:nat 218px 0/0.27 잇는 중 · 오른:nat 218px 0/0.29 잇는 중 · 윗:cut 136px 0/0.25 잇는 중 · 아랫:cut 136px 0/0.25 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.2 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 · 아랫:nat 0px 0/0.13 | ✓ |
| midas-glass-folders | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:cut 244px 0/0.23 잇는 중 · 오른:cut 244px 0/0.13 · 윗:cut 153px 0/0.32 잇는 중 · 아랫:nat 108px 0/0.21 잇는 중 | ✓ |
| midas-acrylic-box | templateMold cutFade,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 80px 0/0.03 · 오른:nat 147px 0/0.25 잇는 중 · 윗:nat 0px 0.01/0 · 아랫:nat 153px 0/0.04 | ✓ |
| midas-cards-orange | templateMold cutFade,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 173px 0/0.07 · 오른:nat 164px 0/0.04 · 윗:nat 92px 0/0.06 · 아랫:nat 92px 0/0.12 | ✓ |
| midas-bridge-icons | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:nat 213px 0/0.39 잇는 중 · 오른:nat 213px 0/0.35 잇는 중 · 윗:nat 95px 0/0.02 · 아랫:cut 133px 0/0.4 잇는 중 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 139px 0/0.02 · 오른:nat 168px 0/0.11 · 윗:nat 78px 0/0.01 · 아랫:nat 153px 0/0.16 잇는 중 | ✓ |
| midas-book-vib | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 244px 0/0.13 · 오른:nat 142px 0/0.02 · 윗:nat 0px 0.02/0.02 · 아랫:nat 153px 0/0.03 | ✓ |
| midas-book-open | templateMold overlapFix.ok,templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 오른:nat 0px 0/0.56 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 · 아랫:nat 0px 0/0.34 잇는 중 | ✓ |
| midas-book-sim | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-vivid-photo | 왼:cut 235px 0/0.3 잇는 중 · 오른:cut 200px 0/0.24 잇는 중 · 윗:cut 120px 0/0.22 잇는 중 · 아랫:cut 120px 0/0.35 잇는 중 | ✓ |
| midas-skyscraper | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:nat 209px 0/0.26 잇는 중 · 오른:nat 244px 0/0.23 잇는 중 · 윗:cut 153px 0/0.26 잇는 중 · 아랫:cut 131px 0/0.19 잇는 중 | ✓ |
| midas-facets | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-colour | 왼:nat 209px 0/0.06 · 오른:nat 209px 0/0.05 · 윗:cut 95px 0/0.05 · 아랫:cut 89px 0/0.07 | ✓ |
| midas-glass-mint | templateMold overlapFix.ok,templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-01 | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0 · 오른:cut 124px 0/0.14 · 윗:cut 95px 0/0 · 아랫:cut 78px 0/0.1 | ✓ |
| desk-02 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-colour | 왼:nat 169px 0/0.12 · 오른:nat 169px 0/0.03 · 윗:cut 95px 0/0.05 · 아랫:cut 78px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 53px 0/0.12 · 오른:nat 56px 0/0.14 · 윗:nat 78px 0/0.13 · 아랫:nat 78px 0/0.16 잇는 중 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.labelCol | kv-mood | 왼:nat 0px 0/0.07 · 오른:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 · 아랫:nat 0px 0/0.24 잇는 중 | ✓ |
| desk-04 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood | 왼:nat 235px 0/0.24 잇는 중 · 오른:nat 235px 0/0.28 잇는 중 · 윗:cut 147px 0/0.19 잇는 중 · 아랫:cut 147px 0/0.14 | ✓ |
| desk-05 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-mood-dark | 왼:nat 187px 0/0.19 잇는 중 · 오른:nat 222px 0/0.1 · 윗:cut 145px 0/0.15 잇는 중 · 아랫:cut 131px 0/0.09 | ✓ |
| desk-06 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 244px 0/0.32 잇는 중 · 오른:nat 244px 0/0.35 잇는 중 · 윗:cut 153px 0/0.2 잇는 중 · 아랫:cut 92px 0/0.3 ✗ | ✗ cut-short |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 62px 0/0.08 · 오른:nat 50px 0/0.08 · 윗:nat 89px 0/0.03 · 아랫:nat 128px 0/0.09 | ✓ |
| desk-08 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 200px 0/0.19 잇는 중 · 오른:nat 200px 0/0.19 잇는 중 · 윗:cut 125px 0/0.17 잇는 중 · 아랫:cut 92px 0/0.26 잇는 중 | ✓ |
| desk-09 | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 160px 0/0.04 · 오른:cut 142px 0/0.22 잇는 중 · 윗:nat 97px 0/0.06 · 아랫:cut 78px 0/0.13 | ✓ |
| desk-11 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 244px 0/0.33 잇는 중 · 오른:nat 204px 0/0.24 잇는 중 · 윗:nat 100px 0/0.25 잇는 중 · 아랫:nat 153px 0/0.25 잇는 중 | ✓ |
| desk-12 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 244px 0/0.41 잇는 중 · 오른:nat 244px 0/0.4 잇는 중 · 윗:cut 153px 0/0.49 잇는 중 · 아랫:cut 153px 0/0.5 잇는 중 | ✓ |
| desk-13 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 151px 0/0.16 잇는 중 · 오른:nat 124px 0/0.01 · 윗:cut 131px 0/0.19 잇는 중 · 아랫:cut 131px 0/0.13 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.39 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| desk-14 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:nat 195px 0/0.12 · 오른:nat 195px 0/0.18 잇는 중 · 윗:cut 95px 0/0.03 · 아랫:cut 122px 0/0.05 | ✓ |
| desk-15 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:nat 244px 0/0.42 잇는 중 · 오른:nat 244px 0/0.33 잇는 중 · 윗:cut 97px 0/0.22 잇는 중 · 아랫:cut 153px 0/0.36 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.labelCol | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.13 · 윗:nat 0px 0.01/– · 아랫:nat 0px 0.01/0.46 잇는 중 | ✓ |
| desk-16 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-mood-dark | 왼:nat 173px 0/0.19 잇는 중 · 오른:nat 226px 0/0.19 잇는 중 · 윗:nat 136px 0/0.17 잇는 중 · 아랫:cut 150px 0/0.18 잇는 중 | ✓ |
| desk-17 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.06 · 오른:cut 124px 0/0 · 윗:cut 153px 0/0 · 아랫:cut 153px 0/0.1 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 51px 0/0.12 · 오른:nat 51px 0/0.05 · 윗:nat 78px 0/0.06 · 아랫:nat 92px 0/0.36 잇는 중 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.49 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| desk-19 | templateMold cutFade,templateMold,templateMold.labelCol | kv-mood | 왼:cut 222px 0/0.13 · 오른:cut 204px 0/0.13 · 윗:cut 145px 0/0.11 · 아랫:cut 142px 0/0.13 | ✓ |
| desk-20 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.32 잇는 중 · 오른:cut 124px 0/0.15 잇는 중 · 윗:cut 153px 0/0.27 잇는 중 · 아랫:cut 78px 0/0.17 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.53 잇는 중 · 아랫:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-21 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 96px 0/0.24 잇는 중 · 오른:nat 92px 0/0.16 잇는 중 · 윗:nat 133px 0/0.38 잇는 중 · 아랫:nat 89px 0/0.12 | ✓ |
| desk-22 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 151px 0/0.56 잇는 중 · 오른:nat 124px 0/0.37 잇는 중 · 윗:cut 153px 0.01/0.54 잇는 중 · 아랫:cut 153px 0/0.48 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.11 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.09 · 아랫:nat 0px 0/0.1 | ✓ |
| desk-23 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-colour | 왼:nat 178px 0/0.06 · 오른:nat 178px 0/0.17 잇는 중 · 윗:cut 95px 0/0.07 · 아랫:cut 92px 0/0.08 | ✓ |
| desk-24 | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.16 잇는 중 · 오른:cut 151px 0/0.1 · 윗:cut 95px 0/0.05 · 아랫:cut 95px 0/0.16 잇는 중 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 50px 0/0.01 · 오른:nat 50px 0/0.01 · 윗:nat 78px 0/0 · 아랫:nat 78px 0/0.01 | ✓ |
| desk-26 | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.18 잇는 중 · 오른:cut 124px 0/0.21 잇는 중 · 윗:cut 95px 0/0.15 잇는 중 · 아랫:cut 139px 0/0.22 잇는 중 | ✓ |
| desk-27 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-vivid-photo | 왼:nat 222px 0/0.37 잇는 중 · 오른:nat 235px 0/0.32 잇는 중 · 윗:nat 153px 0/0.48 잇는 중 · 아랫:cut 139px 0/0.38 잇는 중 | ✓ |
| desk-28 | templateMold cutFade,templateMold,templateMold.labelCol | kv-mood | 왼:nat 231px 0/0.35 잇는 중 · 오른:nat 240px 0/0.33 잇는 중 · 윗:cut 147px 0/0.35 잇는 중 · 아랫:cut 142px 0/0.36 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 102px 0/0.28 잇는 중 · 오른:nat 102px 0/0.3 잇는 중 · 윗:nat 78px 0/0.03 · 아랫:nat 153px 0/0.17 잇는 중 | ✓ |
| desk-30 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:cut 155px 0/0.1 · 오른:cut 155px 0/0.07 · 윗:cut 103px 0/0.06 · 아랫:cut 128px 0/0.05 | ✓ |
| desk-31 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:cut 240px 0/0.14 · 오른:cut 240px 0/0.13 · 윗:nat 153px 0/0.11 · 아랫:nat 142px 0/0.13 | ✓ |
| desk-32 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:nat 244px 0/0.22 잇는 중 · 오른:nat 235px 0/0.13 · 윗:nat 127px 0/0.21 잇는 중 · 아랫:nat 155px 0/0.15 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.labelCol | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-33 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:nat 218px 0/0.29 잇는 중 · 오른:nat 218px 0/0.26 잇는 중 · 윗:cut 136px 0/0.24 잇는 중 · 아랫:cut 136px 0/0.24 잇는 중 | ✓ |
| desk-34 | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:nat 178px 0/0.25 잇는 중 · 오른:nat 244px 0/0.3 잇는 중 · 윗:cut 131px 0/0.11 · 아랫:cut 153px 0/0.15 잇는 중 | ✓ |
| desk-35 | templateMold cutFade,templateMold,templateMold.labelCol | kv-edge | 왼:cut 151px 0/0.13 · 오른:cut 124px 0/0.03 · 윗:cut 95px 0/0.03 · 아랫:cut 153px 0/0.19 잇는 중 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/0.41 잇는 중 · 오른:nat 0px 0/0.34 잇는 중 · 윗:nat 0px 0/0.57 잇는 중 · 아랫:nat 0px 0/0.41 잇는 중 | ✓ |
| desk-36 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-vivid-photo | 왼:nat 244px 0/0.3 잇는 중 · 오른:nat 244px 0/0.4 잇는 중 · 윗:cut 153px 0/0.35 잇는 중 · 아랫:cut 153px 0/0.37 잇는 중 | ✓ |
| desk-10 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 151px 0/0.37 잇는 중 · 오른:nat 124px 0/0.25 잇는 중 · 윗:cut 153px 0/0.36 잇는 중 · 아랫:cut 153px 0/0.35 잇는 중 | ✓ |
| desk-37 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 173px 0/0.15 잇는 중 · 오른:nat 244px 0/0.41 잇는 중 · 윗:nat 0px 0.02/0.04 · 아랫:nat 153px 0/0.36 잇는 중 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.labelCol | kv-mood | 왼:nat 0px 0/0.29 잇는 중 · 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.39 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| t1014-abl | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold cutFade,meltFix,templateMold,templateMold.labelCol | kv-edge | 왼:cut 244px 0/0.29 잇는 중 · 오른:nat 244px 0/0.25 잇는 중 · 윗:cut 95px 0/0.15 잇는 중 · 아랫:nat 153px 0/0.3 잇는 중 | ✓ |
| t1014-gs2026 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:nat 240px 0/0.43 잇는 중 · 오른:nat 240px 0/0.34 잇는 중 · 윗:cut 95px 0/0.2 잇는 중 · 아랫:cut 95px 0/0.47 ✗ | ✗ cut-short |
| t1014-lt | templateMold cutFade,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:nat 151px 0/0.04 · 오른:nat 155px 0/0.05 · 윗:cut 95px 0/0.03 · 아랫:cut 92px 0/0.06 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.labelCol | kv-edge | 왼:nat 150px 0/0.09 · 오른:nat 229px 0/0.19 잇는 중 · 윗:nat 78px 0/0.1 · 아랫:nat 92px 0/0.08 | ✓ |
| t1014-lt-v3 | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:nat 182px 0/0.22 잇는 중 · 오른:nat 244px 0/0.2 잇는 중 · 윗:cut 147px 0/0.26 잇는 중 · 아랫:cut 153px 0/0.2 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.labelCol | kv-vivid | 왼:nat 34px 0/0.61 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:cut 78px 0/0.43 잇는 중 | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.labelCol | kv-vivid | 왼:nat 47px 0/0.49 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:cut 78px 0/0.34 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-edge | 왼:cut 244px 0/0.51 잇는 중 · 오른:cut 244px 0/0.27 잇는 중 · 윗:nat 95px 0/0.02 · 아랫:nat 153px 0/0.33 잇는 중 | ✓ |
| t1014-asan-photo | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-mood-dark | 왼:cut 240px 0/0.14 · 오른:cut 186px 0/0.21 잇는 중 · 윗:nat 139px 0/0.15 잇는 중 · 아랫:nat 139px 0/0.29 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.62 잇는 중 · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-hanssem | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:cut 244px 0/0.29 잇는 중 · 오른:cut 244px 0/0.32 잇는 중 · 윗:nat 153px 0/0.32 잇는 중 · 아랫:nat 153px 0/0.21 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.labelCol | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0/0.38 잇는 중 | ✓ |
| t1014-hanjin | templateMold cutFade,meltFix,templateMold,templateMold.slotCover,templateMold.labelCol | kv-vivid-photo | 왼:cut 244px 0/0.23 잇는 중 · 오른:cut 244px 0/0.14 · 윗:nat 153px 0/0.13 · 아랫:nat 153px 0/0.22 잇는 중 | ✓ |

### 네이버 GFA · M통합 네이티브 DA (모바일) 썸네일 342×228 `naver-gfa-native-mo-342x228` 342×228

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg |  visualOnly | kv-edge | — | ✓ |
| texture-dark |  textureFull,visualOnly | kv-texture | — | ✓ |
| slabs-3d |  visualOnly | kv-edge | — | ✓ |
| geo-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| samsung-3d |  visualOnly | kv-edge | — | ✓ |
| gradient |  textureFull,visualOnly | kv-texture | — | ✓ |
| fox-3d |  visualOnly | kv-edge | — | ✓ |
| ilhwa-dark |  visualOnly | kv-mood-dark | — | ✓ |
| ilhwa-photo |  visualOnly | kv-vivid-photo | — | ✓ |
| ilhwa-roomy |  visualOnly | kv-vivid-photo | — | ✓ |
| bc-illust |  visualOnly | kv-edge | — | ✓ |
| fox-gradbg |  visualOnly | kv-edge | — | ✓ |
| dongbu_illust |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group |  visualOnly | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.19 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.5 잇는 중 | ✓ |
| dongsuh-model |  visualOnly | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px 0/0.27 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 · 아랫:nat 0px 0.07/0.25 잇는 중 | ✓ |
| fox-cutout |  visualOnly | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 · 오른:nat 0px 0/0.13 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.07 | ✓ |
| sep-open-recruit |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.44 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 · 아랫:nat 0px 0/0.57 잇는 중 | ✓ |
| hdot-wave |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-purple3d |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-hall |  visualOnly | kv-edge | — | ✓ |
| hdot-speaker-a |  visualOnly | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.34 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0.27/0.28 잇는 중 | ✓ |
| hdot-speaker-b |  visualOnly | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 오른:nat 0px 0/0.24 잇는 중 · 윗:nat 0px 0/0.27 잇는 중 · 아랫:nat 0px 0.19/0.4 잇는 중 | ✓ |
| hdot-seminar |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-audience |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-asterisk |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.48 잇는 중 · 아랫:nat 0px 0/0.23 잇는 중 | ✓ |
| hr-doctor |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-teamhands |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-nurse-ai |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-cablebridge |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-stadium-wire |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-city |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-folder-blue |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.33 잇는 중 | ✓ |
| midas-folder-dark |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.18 잇는 중 · 윗:nat 0px 0/0.33 잇는 중 · 아랫:nat 0px 0/0.18 잇는 중 | ✓ |
| midas-glass-folders |  visualOnly | kv-edge | — | ✓ |
| midas-acrylic-box |  visualOnly | kv-edge | — | ✓ |
| midas-cards-orange |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-bridge-icons |  visualOnly | kv-edge | — | ✓ |
| midas-bridge-dark |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-book-vib |  visualOnly | kv-edge | — | ✓ |
| midas-book-open |  visualOnly | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.61 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-book-flow |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-book-sim |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-skyscraper |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| midas-facets |  textureFull,visualOnly | kv-texture | — | ✓ |
| midas-glass-mint |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.02/0.06 · 오른:nat 0px 0/0.09 · 윗:nat 0px 0.01/– · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.09/0.13 · 오른:nat 0px 0.1/0.26 잇는 중 · 윗:nat 0px 0.01/0.38 잇는 중 · 아랫:nat 0px 0.01/0.29 잇는 중 | ✓ |
| desk-01 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-02 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-03 |  visualOnly | kv-edge | — | ✓ |
| desk-03-cut |  visualOnly | kv-mood | 왼:nat 0px 0/0.12 · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-04 |  visualOnly | kv-mood | — | ✓ |
| desk-05 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-06 |  visualOnly | kv-edge | — | ✓ |
| desk-07 |  visualOnly | kv-edge | — | ✓ |
| desk-08 |  visualOnly | kv-edge | — | ✓ |
| desk-09 |  visualOnly | kv-edge | — | ✓ |
| desk-11 |  visualOnly | kv-edge | — | ✓ |
| desk-12 |  visualOnly | kv-edge | — | ✓ |
| desk-13 |  visualOnly | kv-edge | — | ✓ |
| desk-13-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0/0.25 잇는 중 | ✓ |
| desk-14 |  visualOnly | kv-edge | — | ✓ |
| desk-15 |  visualOnly | kv-edge | — | ✓ |
| desk-15-cut |  visualOnly | kv-mood | 왼:nat 0px 0/0.28 잇는 중 · 오른:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0.01/0.53 잇는 중 · 아랫:nat 0px 0.01/0.2 잇는 중 | ✓ |
| desk-16 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-17 |  visualOnly | kv-edge | — | ✓ |
| desk-18 |  visualOnly | kv-edge | — | ✓ |
| desk-18-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0/0.61 잇는 중 · 아랫:nat 0px 0/0.62 잇는 중 | ✓ |
| desk-19 |  visualOnly | kv-mood | — | ✓ |
| desk-20 |  visualOnly | kv-edge | — | ✓ |
| desk-20-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.46 잇는 중 · 아랫:nat 0px 0/0.41 잇는 중 | ✓ |
| desk-21 |  visualOnly | kv-edge | — | ✓ |
| desk-22 |  visualOnly | kv-edge | — | ✓ |
| desk-22-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.33 잇는 중 · 아랫:nat 0px 0/0.08 | ✓ |
| desk-23 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-24 |  visualOnly | kv-edge | — | ✓ |
| desk-25 |  visualOnly | kv-edge | — | ✓ |
| desk-26 |  visualOnly | kv-edge | — | ✓ |
| desk-27 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-28 |  visualOnly | kv-mood | — | ✓ |
| desk-29 |  visualOnly | kv-edge | — | ✓ |
| desk-30 |  visualOnly | kv-edge | — | ✓ |
| desk-31 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.24 잇는 중 · 아랫:nat 0px 0/0.27 잇는 중 | ✓ |
| desk-33 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-34 |  visualOnly | kv-edge | — | ✓ |
| desk-35 |  visualOnly | kv-edge | — | ✓ |
| desk-35-cut |  visualOnly | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.67 잇는 중 · 아랫:nat 0px 0/0.58 잇는 중 | ✓ |
| desk-36 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-10 |  visualOnly | kv-edge | — | ✓ |
| desk-37 |  visualOnly | kv-edge | — | ✓ |
| desk-37-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0.01/0.61 잇는 중 · 아랫:nat 0px 0.01/0.29 잇는 중 | ✓ |
| t1014-abl |  visualOnly | kv-vivid | 왼:nat 0px 0/0.33 잇는 중 · 오른:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 |  visualOnly | kv-edge | — | ✓ |
| t1014-gs2026 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-lt-v2 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt-v3 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-dongsuh |  visualOnly | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 · 오른:nat 0px 0/0.18 잇는 중 · 윗:nat 0px 0/0.17 잇는 중 · 아랫:nat 0px 0/0.5 잇는 중 | ✓ |
| t1014-bionote-dog |  visualOnly | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-bionote-cat |  visualOnly | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.38 잇는 중 | ✓ |
| t1014-asan-illust |  visualOnly | kv-edge | — | ✓ |
| t1014-asan-photo |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-jeil |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.63 잇는 중 · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-hanssem |  visualOnly | kv-vivid-photo | — | ✓ |
| t1014-hanssem-blocks |  visualOnly | kv-vivid | 왼:nat 0px 0/0.36 잇는 중 · 오른:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.37 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin |  visualOnly | kv-vivid-photo | — | ✓ |

### 네이버 GFA · M통합 네이티브 DA 광고주 로고 썸네일(프로필 이미지) 300×300 `naver-gfa-native-mo-profile-300` 300×300

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 커뮤니티 보드 `everytime-community-board` 1029×258

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 키비주얼 없음 |
| texture-dark | — | — | — | 제외: 키비주얼 없음 |
| slabs-3d | — | — | — | 제외: 키비주얼 없음 |
| geo-3d | — | — | — | 제외: 키비주얼 없음 |
| samsung-3d | — | — | — | 제외: 키비주얼 없음 |
| gradient | — | — | — | 제외: 키비주얼 없음 |
| fox-3d | — | — | — | 제외: 키비주얼 없음 |
| ilhwa-dark | — | — | — | 제외: 키비주얼 없음 |
| ilhwa-photo | — | — | — | 제외: 키비주얼 없음 |
| ilhwa-roomy | — | — | — | 제외: 키비주얼 없음 |
| bc-illust | — | — | — | 제외: 키비주얼 없음 |
| fox-gradbg | — | — | — | 제외: 키비주얼 없음 |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.41 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.36 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.52 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | — | — | — | 제외: 키비주얼 없음 |
| hdot-purple3d | — | — | — | 제외: 키비주얼 없음 |
| hdot-hall | — | — | — | 제외: 키비주얼 없음 |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.45 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.78 잇는 중 | ✓ |
| hdot-seminar | — | — | — | 제외: 키비주얼 없음 |
| hdot-audience | — | — | — | 제외: 키비주얼 없음 |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.36 잇는 중 | ✓ |
| hr-doctor | — | — | — | 제외: 키비주얼 없음 |
| hr-teamhands | — | — | — | 제외: 키비주얼 없음 |
| hr-nurse-ai | — | — | — | 제외: 키비주얼 없음 |
| midas-cablebridge | — | — | — | 제외: 키비주얼 없음 |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 | ✓ |
| midas-city | — | — | — | 제외: 키비주얼 없음 |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.43 잇는 중 | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.81 잇는 중 | ✓ |
| midas-glass-folders | — | — | — | 제외: 키비주얼 없음 |
| midas-acrylic-box | — | — | — | 제외: 키비주얼 없음 |
| midas-cards-orange | — | — | — | 제외: 키비주얼 없음 |
| midas-bridge-icons | — | — | — | 제외: 키비주얼 없음 |
| midas-bridge-dark | — | — | — | 제외: 키비주얼 없음 |
| midas-book-vib | — | — | — | 제외: 키비주얼 없음 |
| midas-book-open | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-book-sim | — | — | — | 제외: 키비주얼 없음 |
| midas-skyscraper | — | — | — | 제외: 키비주얼 없음 |
| midas-facets | — | — | — | 제외: 키비주얼 없음 |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.74 잇는 중 · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.35 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-01 | — | — | — | 제외: 키비주얼 없음 |
| desk-02 | — | — | — | 제외: 키비주얼 없음 |
| desk-03 | — | — | — | 제외: 키비주얼 없음 |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.45 잇는 중 | ✓ |
| desk-04 | — | — | — | 제외: 키비주얼 없음 |
| desk-05 | — | — | — | 제외: 키비주얼 없음 |
| desk-06 | — | — | — | 제외: 키비주얼 없음 |
| desk-07 | — | — | — | 제외: 키비주얼 없음 |
| desk-08 | — | — | — | 제외: 키비주얼 없음 |
| desk-09 | — | — | — | 제외: 키비주얼 없음 |
| desk-11 | — | — | — | 제외: 키비주얼 없음 |
| desk-12 | — | — | — | 제외: 키비주얼 없음 |
| desk-13 | — | — | — | 제외: 키비주얼 없음 |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– | ✓ |
| desk-14 | — | — | — | 제외: 키비주얼 없음 |
| desk-15 | — | — | — | 제외: 키비주얼 없음 |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– | ✓ |
| desk-16 | — | — | — | 제외: 키비주얼 없음 |
| desk-17 | — | — | — | 제외: 키비주얼 없음 |
| desk-18 | — | — | — | 제외: 키비주얼 없음 |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.4 잇는 중 | ✓ |
| desk-19 | — | — | — | 제외: 키비주얼 없음 |
| desk-20 | — | — | — | 제외: 키비주얼 없음 |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.46 잇는 중 | ✓ |
| desk-21 | — | — | — | 제외: 키비주얼 없음 |
| desk-22 | — | — | — | 제외: 키비주얼 없음 |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.73 잇는 중 | ✓ |
| desk-23 | — | — | — | 제외: 키비주얼 없음 |
| desk-24 | — | — | — | 제외: 키비주얼 없음 |
| desk-25 | — | — | — | 제외: 키비주얼 없음 |
| desk-26 | — | — | — | 제외: 키비주얼 없음 |
| desk-27 | — | — | — | 제외: 키비주얼 없음 |
| desk-28 | — | — | — | 제외: 키비주얼 없음 |
| desk-29 | — | — | — | 제외: 키비주얼 없음 |
| desk-30 | — | — | — | 제외: 키비주얼 없음 |
| desk-31 | — | — | — | 제외: 키비주얼 없음 |
| desk-32 | — | — | — | 제외: 키비주얼 없음 |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– | ✓ |
| desk-33 | — | — | — | 제외: 키비주얼 없음 |
| desk-34 | — | — | — | 제외: 키비주얼 없음 |
| desk-35 | — | — | — | 제외: 키비주얼 없음 |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-36 | — | — | — | 제외: 키비주얼 없음 |
| desk-10 | — | — | — | 제외: 키비주얼 없음 |
| desk-37 | — | — | — | 제외: 키비주얼 없음 |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.17 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | — | — | — | 제외: 키비주얼 없음 |
| t1014-gs2026 | — | — | — | 제외: 키비주얼 없음 |
| t1014-lt | — | — | — | 제외: 키비주얼 없음 |
| t1014-lt-v2 | — | — | — | 제외: 키비주얼 없음 |
| t1014-lt-v3 | — | — | — | 제외: 키비주얼 없음 |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | none | 왼:nat 45px 0/0.22 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | — | — | — | 제외: 키비주얼 없음 |
| t1014-asan-photo | — | — | — | 제외: 키비주얼 없음 |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-hanssem | — | — | — | 제외: 키비주얼 없음 |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | none | 왼:nat 0px 0/0.56 잇는 중 | ✓ |
| t1014-hanjin | — | — | — | 제외: 키비주얼 없음 |

### 에브리타임 · 커뮤니티 네이티브 (썸네일 이미지) `everytime-community-native` 288×288

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg |  visualOnly | kv-edge | — | ✓ |
| texture-dark |  textureFull,visualOnly | kv-texture | — | ✓ |
| slabs-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| geo-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| samsung-3d |  visualOnly | kv-edge | — | ✓ |
| gradient |  textureFull,visualOnly | kv-texture | — | ✓ |
| fox-3d |  visualOnly | kv-edge | — | ✓ |
| ilhwa-dark |  visualOnly | kv-mood-dark | — | ✓ |
| ilhwa-photo |  visualOnly | kv-vivid-photo | — | ✓ |
| ilhwa-roomy |  visualOnly | kv-vivid-photo | — | ✓ |
| bc-illust |  visualOnly | kv-edge | — | ✓ |
| fox-gradbg |  visualOnly | kv-edge | — | ✓ |
| dongbu_illust |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group |  visualOnly | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.47 잇는 중 | ✓ |
| dongsuh-model |  visualOnly | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 · 아랫:nat 0px 0.07/0.15 잇는 중 | ✓ |
| fox-cutout |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.1 · 윗:nat 0px 0/0.54 잇는 중 · 아랫:nat 0px 0/0.05 | ✓ |
| sep-open-recruit |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.29 잇는 중 · 아랫:nat 0px 0/0.5 잇는 중 | ✓ |
| hdot-wave |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-purple3d |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-hall |  visualOnly | kv-edge | — | ✓ |
| hdot-speaker-a |  visualOnly | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 오른:nat 0px 0/0.37 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 · 아랫:nat 0px 0.27/0.29 잇는 중 | ✓ |
| hdot-speaker-b |  visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 · 아랫:nat 0px 0.21/0.4 잇는 중 | ✓ |
| hdot-seminar |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-audience |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-asterisk |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hr-doctor |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-teamhands |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-nurse-ai |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-cablebridge |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-stadium-wire |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.3 잇는 중 · 아랫:nat 0px 0/0.59 잇는 중 | ✓ |
| midas-city |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-folder-blue |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 · 아랫:nat 0px 0/0.16 잇는 중 | ✓ |
| midas-folder-dark |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 · 아랫:nat 0px 0/0.16 잇는 중 | ✓ |
| midas-glass-folders |  visualOnly | kv-edge | — | ✓ |
| midas-acrylic-box |  visualOnly | kv-edge | — | ✓ |
| midas-cards-orange |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-bridge-icons |  visualOnly | kv-edge | — | ✓ |
| midas-bridge-dark |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-book-vib |  visualOnly | kv-edge | — | ✓ |
| midas-book-open |  visualOnly | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px 0/0.65 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 · 아랫:nat 0px 0/0.46 잇는 중 | ✓ |
| midas-book-flow |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-book-sim |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-skyscraper |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| midas-facets |  textureFull,visualOnly | kv-texture | — | ✓ |
| midas-glass-mint |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.08/0.07 · 오른:nat 0px 0/0.08 · 윗:nat 0px 0/0.6 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.08/– · 오른:nat 0px 0.27/0.02 · 윗:nat 0px 0.01/0.45 잇는 중 · 아랫:nat 0px 0.01/0.35 잇는 중 | ✓ |
| desk-01 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-02 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-03 |  visualOnly | kv-edge | — | ✓ |
| desk-03-cut |  visualOnly | kv-mood | 왼:nat 0px 0/0.29 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.23 잇는 중 | ✓ |
| desk-04 |  visualOnly | kv-mood | — | ✓ |
| desk-05 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-06 |  visualOnly | kv-edge | — | ✓ |
| desk-07 |  visualOnly | kv-edge | — | ✓ |
| desk-08 |  visualOnly | kv-edge | — | ✓ |
| desk-09 |  visualOnly | kv-edge | — | ✓ |
| desk-11 |  visualOnly | kv-edge | — | ✓ |
| desk-12 |  visualOnly | kv-edge | — | ✓ |
| desk-13 |  visualOnly | kv-edge | — | ✓ |
| desk-13-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| desk-14 |  visualOnly | kv-edge | — | ✓ |
| desk-15 |  visualOnly | kv-edge | — | ✓ |
| desk-15-cut |  visualOnly | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0.01/0.59 잇는 중 · 아랫:nat 0px 0.01/0.18 잇는 중 | ✓ |
| desk-16 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-17 |  visualOnly | kv-edge | — | ✓ |
| desk-18 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-18-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 · 아랫:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-19 |  visualOnly | kv-mood | — | ✓ |
| desk-20 |  visualOnly | kv-edge | — | ✓ |
| desk-20-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 · 아랫:nat 0px 0/0.39 잇는 중 | ✓ |
| desk-21 |  visualOnly | kv-edge | — | ✓ |
| desk-22 |  visualOnly | kv-edge | — | ✓ |
| desk-22-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.1 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.38 잇는 중 · 아랫:nat 0px 0/0.09 | ✓ |
| desk-23 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-24 |  visualOnly | kv-edge | — | ✓ |
| desk-25 |  visualOnly | kv-edge | — | ✓ |
| desk-26 |  visualOnly | kv-edge | — | ✓ |
| desk-27 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-28 |  visualOnly | kv-mood | — | ✓ |
| desk-29 |  visualOnly | kv-edge | — | ✓ |
| desk-30 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-31 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.22 잇는 중 · 아랫:nat 0px 0/0.28 잇는 중 | ✓ |
| desk-33 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-34 |  visualOnly | kv-edge | — | ✓ |
| desk-35 |  visualOnly | kv-edge | — | ✓ |
| desk-35-cut |  visualOnly | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.73 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| desk-36 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-10 |  visualOnly | kv-edge | — | ✓ |
| desk-37 |  visualOnly | kv-edge | — | ✓ |
| desk-37-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.44 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0.01/0.5 잇는 중 · 아랫:nat 0px 0.01/0.45 잇는 중 | ✓ |
| t1014-abl |  visualOnly | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 |  roomFull,visualOnly | kv-full | — | ✓ |
| t1014-gs2026 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-lt-v2 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt-v3 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-dongsuh |  visualOnly | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-bionote-dog |  visualOnly | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-bionote-cat |  visualOnly | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-asan-illust |  visualOnly | kv-edge | — | ✓ |
| t1014-asan-photo |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-jeil |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.63 잇는 중 · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-hanssem |  visualOnly | kv-vivid-photo | — | ✓ |
| t1014-hanssem-blocks |  visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 · 아랫:nat 0px 0/0.45 잇는 중 | ✓ |
| t1014-hanjin |  visualOnly | kv-vivid-photo | — | ✓ |

### 에브리타임 · 홈 배너 `everytime-home-banner` 640×200

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0.03 | ✓ |
| texture-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 36px 0/0.02 · 오른:nat 36px 0/0.02 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.02 | ✓ |
| geo-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 75px 0/0.15 잇는 중 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 77px 0/0.01 | ✓ |
| gradient | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 47px 0/0.06 · 오른:nat 47px 0/0.05 | ✓ |
| fox-3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.06 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 96px 0/0.26 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.22 잇는 중 | ✓ |
| ilhwa-roomy | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 105px 0.01/0.25 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.23 잇는 중 | ✓ |
| fox-gradbg | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 61px 0/0.25 잇는 중 · 오른:nat 105px 0/0.43 잇는 중 | ✓ |
| dongbu_illust | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.56 잇는 중 | ✓ |
| abl-group | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 | ✓ |
| sep-open-recruit | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| hdot-wave | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.01 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 103px 0/0.1 | ✓ |
| hdot-speaker-a | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.26 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0/0.08 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 124px 0/0.14 | ✓ |
| hdot-asterisk | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.59 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.29 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 129px 0/0.25 잇는 중 | ✓ |
| midas-cablebridge | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 98px 0/0.19 잇는 중 | ✓ |
| midas-stadium-wire | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 112px 0.01/0.26 잇는 중 | ✓ |
| midas-folder-blue | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| midas-folder-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.2 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 75px 0/0.03 · 윗:nat 0px 0.02/0.02 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 89px 0/0.11 · 윗:nat 0px 0.06/0.08 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 112px 0/0.32 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 77px 0/0.06 · 윗:nat 0px 0.03/0.06 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.12 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| midas-book-flow | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 | ✓ |
| midas-book-sim | templateMold templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 119px 0/0.24 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 98px 0/0.3 잇는 중 | ✓ |
| midas-facets | templateMold templateMold,templateMold.freeKv | kv-colour | 왼:cut 80px 0/0.09 | ✓ |
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.13 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| midas-glass-dark | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.16 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 | ✓ |
| desk-01 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 89px 0/0.1 | ✓ |
| desk-03 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 44px 0/0.12 · 오른:nat 38px 0/0.14 | ✓ |
| desk-03-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.11 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 124px 0/0.2 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 117px 0/0.14 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.36 잇는 중 | ✓ |
| desk-07 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 51px 0/0.09 · 오른:nat 36px 0/0.06 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 105px 0/0.16 잇는 중 | ✓ |
| desk-09 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 80px 0/0.03 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 126px 0/0.16 잇는 중 · 윗:nat 0px 0.03/0.07 | ✓ |
| desk-12 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0.01/0.38 잇는 중 | ✓ |
| desk-13 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0 | ✓ |
| desk-13-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 103px 0/0.07 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.42 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.17 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:nat 129px 0/0.2 잇는 중 | ✓ |
| desk-17 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 77px 0/0.37 잇는 중 | ✓ |
| desk-18 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 37px 0/0.12 · 오른:nat 37px 0/0.05 | ✓ |
| desk-18-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-19 | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:cut 91px 0/0.15 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 83px 0/0.28 잇는 중 · 오른:nat 83px 0/0.25 잇는 중 | ✓ |
| desk-22 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.35 잇는 중 | ✓ |
| desk-22-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.freeKv | kv-colour | 왼:nat 94px 0/0.06 | ✓ |
| desk-24 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 77px 0/0.13 | ✓ |
| desk-25 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 36px 0/0.01 · 오른:nat 36px 0/0.01 | ✓ |
| desk-26 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0.07 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 112px 0/0.29 잇는 중 | ✓ |
| desk-28 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood | 왼:nat 108px 0/0.22 잇는 중 | ✓ |
| desk-29 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 73px 0/0.28 잇는 중 · 오른:nat 73px 0/0.31 잇는 중 | ✓ |
| desk-30 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 82px 0/0.07 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 126px 0/0.19 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0/0.25 잇는 중 | ✓ |
| desk-32-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 112px 0/0.25 잇는 중 | ✓ |
| desk-34 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 129px 0/0.34 잇는 중 | ✓ |
| desk-35 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:cut 42px 0/0 | ✓ |
| desk-35-cut | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:nat 129px 0/0.35 잇는 중 | ✓ |
| desk-10 | templateMold templateMold,templateMold.freeKv | kv-edge | 왼:nat 42px 0/0.13 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 87px 0/0.12 · 윗:nat 0px 0.02/0.04 | ✓ |
| desk-37-cut | templateMold templateMold,templateMold.freeKv | kv-mood | 왼:nat 0px 0/0.48 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.19 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:nat 126px 0/0.31 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 80px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.freeKv | kv-edge | 왼:nat 80px 0/0.04 · 윗:nat 0px 0.02/0.04 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 129px 0/0.13 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 3px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.freeKv | kv-vivid | 왼:nat 37px 0/0.46 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-bionote-cat | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.44 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.freeKv | kv-edge | 왼:cut 129px 0/0.3 잇는 중 | ✓ |
| t1014-asan-photo | templateMold templateMold,templateMold.freeKv | kv-mood-dark | 왼:cut 108px 0/0.22 잇는 중 | ✓ |
| t1014-jeil | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.66 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.4 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold,templateMold.freeKv | kv-vivid | 왼:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.freeKv | kv-vivid-photo | 왼:cut 129px 0/0.43 잇는 중 | ✓ |

### 에브리타임 · 홈 카드 — 프로필 이미지 `everytime-home-card-profile` 160×160

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 홈 카드 — 카드 이미지 `everytime-home-card-image` 720×480

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.22 잇는 중 · 윗:cut 88px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 26px 0/0.01 · 오른:nat 48px 0/0.04 · 윗:nat 81px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 136px 0/0.04 · 윗:cut 88px 0/0.06 | ✓ |
| geo-3d | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.03 · 윗:cut 88px 0/0.03 | ✓ |
| samsung-3d | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.01 · 윗:nat 88px 0/0.01 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 52px 0/0.03 · 오른:nat 54px 0/0.06 · 윗:nat 81px 0/0.09 | ✓ |
| fox-3d | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 136px 0/0.43 잇는 중 · 윗:cut 142px 0/0.42 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold,templateMold.plainLabel | kv-mood-dark | 왼:cut 168px 0/0.26 잇는 중 · 윗:cut 101px 0/0.24 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold,templateMold.plainLabel | kv-vivid-photo | 왼:cut 221px 0/0.29 잇는 중 · 윗:cut 139px 0/0.45 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold,templateMold.plainLabel | kv-vivid-photo | 왼:cut 189px 0/0.26 잇는 중 · 윗:cut 126px 0/0.46 잇는 중 | ✓ |
| bc-illust | templateMold meltFix,templateMold,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 221px 0/0.14 · 윗:cut 88px 0/0.16 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 78px 0/0.22 잇는 중 · 오른:nat 135px 0/0.43 잇는 중 · 윗:nat 88px 0/0.11 | ✓ |
| dongbu_illust | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.plainLabel,overlapFix.text | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold cutFade,templateMold,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold cutFade,templateMold,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.14 | ✓ |
| fox-cutout | templateMold cutFade,templateMold,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold overlapFix.fail,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel,overlapFix.text | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.06 · 윗:nat 88px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.04 · 윗:nat 88px 0/0.03 | ✓ |
| hdot-hall | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 176px 0/0.09 · 윗:cut 88px 0/0.04 | ✓ |
| hdot-speaker-a | templateMold cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| hdot-speaker-b | templateMold cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.39 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:cut 136px 0/0.06 · 윗:nat 142px 0/0.09 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:nat 221px 0/0.15 잇는 중 · 윗:cut 124px 0/0.21 잇는 중 | ✓ |
| hdot-asterisk | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.14 · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:cut 221px 0/0.48 잇는 중 · 윗:nat 142px 0.01/0.45 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:nat 221px 0/0.32 잇는 중 · 윗:cut 142px 0/0.43 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:nat 221px 0/0.29 잇는 중 · 윗:cut 134px 0/0.5 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold,templateMold.plainLabel | kv-vivid-photo | 왼:nat 201px 0/0.18 잇는 중 · 윗:cut 137px 0/0.16 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:nat 197px 0/0.26 잇는 중 · 윗:cut 126px 0/0.25 잇는 중 | ✓ |
| midas-folder-blue | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 윗:nat 0px 0/0.38 잇는 중 | ✓ |
| midas-folder-dark | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.19 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold,templateMold.plainLabel | kv-edge | 왼:cut 221px 0/0.22 잇는 중 · 윗:cut 142px 0/0.32 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 72px 0/0.02 · 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 160px 0/0.07 · 윗:nat 81px 0/0.05 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.plainLabel | kv-edge | 왼:nat 193px 0/0.34 잇는 중 · 윗:nat 88px 0/0.02 | ✓ |
| midas-bridge-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 127px 0/0.02 · 윗:nat 71px 0/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 221px 0/0.08 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold overlapFix.ok,cutFade,templateMold,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.65 잇는 중 · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| midas-book-sim | templateMold meltFix,templateMold,templateMold.plainLabel | kv-vivid-photo | 왼:cut 213px 0/0.31 잇는 중 · 윗:cut 111px 0/0.22 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:nat 189px 0/0.26 잇는 중 · 윗:cut 142px 0/0.2 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-colour | 왼:nat 189px 0/0.09 · 윗:cut 121px 0/0.02 | ✓ |
| midas-glass-mint | templateMold overlapFix.ok,cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.1 · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold overlapFix.ok,cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0 · 윗:cut 88px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-colour | 왼:nat 152px 0/0.12 · 윗:cut 88px 0/0.04 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 49px 0/0.12 · 오른:nat 52px 0/0.15 잇는 중 · 윗:nat 71px 0/0.13 | ✓ |
| desk-03-cut | templateMold cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-mood | 왼:nat 0px 0/0.11 · 윗:nat 0px 0/0.24 잇는 중 | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood | 왼:nat 213px 0/0.23 잇는 중 · 윗:cut 137px 0/0.17 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-mood-dark | 왼:nat 168px 0/0.22 잇는 중 · 윗:cut 134px 0/0.17 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 221px 0/0.36 잇는 중 · 윗:cut 142px 0/0.2 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 58px 0/0.08 · 오른:nat 46px 0/0.06 · 윗:nat 81px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 181px 0/0.18 잇는 중 · 윗:cut 88px 0/0.1 | ✓ |
| desk-09 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 144px 0/0.05 · 윗:nat 90px 0/0.07 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 221px 0/0.29 잇는 중 · 윗:nat 90px 0/0.24 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 221px 0/0.43 잇는 중 · 윗:cut 142px 0/0.51 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 136px 0/0.14 · 윗:cut 121px 0/0.09 | ✓ |
| desk-13-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.37 잇는 중 | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:nat 176px 0/0.15 잇는 중 · 윗:cut 88px 0/0.02 | ✓ |
| desk-15 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:nat 221px 0/0.37 잇는 중 · 윗:cut 90px 0/0.22 잇는 중 | ✓ |
| desk-15-cut | templateMold cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0.01/0.35 잇는 중 | ✓ |
| desk-16 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-mood-dark | 왼:nat 156px 0/0.14 · 윗:nat 126px 0/0.15 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.05 · 윗:cut 142px 0/0 | ✓ |
| desk-18 | templateMold overlapFix.ok,cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 40px 0/0.17 잇는 중 · 오른:nat 40px 0/0.14 · 윗:nat 60px 0/0.06 | ✓ |
| desk-18-cut | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.52 잇는 중 · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| desk-19 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-mood | 왼:cut 201px 0/0.09 · 윗:cut 134px 0/0.14 | ✓ |
| desk-20 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.39 잇는 중 · 윗:cut 142px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.62 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 89px 0/0.27 잇는 중 · 오른:nat 85px 0/0.2 잇는 중 · 윗:nat 124px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 136px 0/0.59 잇는 중 · 윗:cut 142px 0/0.52 잇는 중 | ✓ |
| desk-22-cut | templateMold overlapFix.ok,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.08 · 윗:nat 0px 0/0.36 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-colour | 왼:nat 160px 0/0.05 · 윗:cut 88px 0/0.11 | ✓ |
| desk-24 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.14 · 윗:cut 88px 0/0.05 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 46px 0/0.01 · 오른:nat 46px 0/0.01 · 윗:nat 71px 0/0 | ✓ |
| desk-26 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.19 잇는 중 · 윗:cut 88px 0/0.16 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid-photo | 왼:nat 201px 0/0.37 잇는 중 · 윗:nat 142px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-mood | 왼:nat 209px 0/0.37 잇는 중 · 윗:cut 137px 0.01/0.35 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 95px 0/0.28 잇는 중 · 오른:nat 95px 0/0.31 잇는 중 · 윗:nat 71px 0/0.02 | ✓ |
| desk-30 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 140px 0/0.05 · 윗:cut 96px 0/0.06 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:cut 217px 0/0.13 · 윗:nat 142px 0/0.13 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:cut 221px 0/0.35 잇는 중 · 윗:nat 116px 0/0.26 잇는 중 | ✓ |
| desk-32-cut | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel,overlapFix.text | kv-mood | 왼:nat 0px 0/0.39 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:nat 197px 0/0.27 잇는 중 · 윗:cut 126px 0/0.22 잇는 중 | ✓ |
| desk-34 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:nat 160px 0/0.14 · 윗:cut 121px 0/0.09 | ✓ |
| desk-35 | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | kv-edge | 왼:cut 136px 0/0.12 · 윗:cut 88px 0/0.04 | ✓ |
| desk-35-cut | templateMold cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid-photo | 왼:nat 221px 0/0.31 잇는 중 · 윗:cut 142px 0.01/0.36 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:nat 136px 0/0.36 잇는 중 · 윗:cut 142px 0/0.38 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 156px 0/0.14 · 윗:nat 0px 0.01/0.02 | ✓ |
| desk-37-cut | templateMold objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-mood | 왼:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.45 잇는 중 | ✓ |
| t1014-abl | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold,templateMold.logoArea | kv-edge | 왼:cut 221px 0/0.19 잇는 중 · 윗:cut 88px 0/0.16 잇는 중 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover | kv-edge | 왼:nat 217px 0/0.33 잇는 중 · 윗:cut 88px 0/0.2 잇는 중 | ✓ |
| t1014-lt | templateMold templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:nat 136px 0/0.04 · 윗:cut 88px 0/0.07 | ✓ |
| t1014-lt-v2 | templateMold cutFade,meltFix,templateMold,templateMold.logoArea,templateMold.containGrad,templateMold.plainLabel | kv-edge | 왼:nat 137px 0/0.07 · 윗:nat 71px 0/0.08 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:nat 164px 0/0.18 잇는 중 · 윗:cut 137px 0/0.2 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 28px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 41px 0/0.47 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold cutFade,templateMold,templateMold.logoArea | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-edge | 왼:cut 221px 0/0.48 잇는 중 · 윗:nat 88px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-mood-dark | 왼:cut 217px 0/0.16 잇는 중 · 윗:nat 129px 0/0.13 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.62 잇는 중 | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:cut 140px 0/0.28 잇는 중 · 윗:nat 142px 0/0.31 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold cutFade,templateMold,templateMold.logoArea,templateMold.plainLabel | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | kv-vivid-photo | 왼:cut 221px 0/0.25 잇는 중 · 윗:nat 142px 0.01/0.12 | ✓ |

### 에브리타임 · 공모전·대외활동·채용 정보 — 카드 이미지 `everytime-contest-card` 288×288

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg |  visualOnly | kv-edge | — | ✓ |
| texture-dark |  textureFull,visualOnly | kv-texture | — | ✓ |
| slabs-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| geo-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| samsung-3d |  visualOnly | kv-edge | — | ✓ |
| gradient |  textureFull,visualOnly | kv-texture | — | ✓ |
| fox-3d |  visualOnly | kv-edge | — | ✓ |
| ilhwa-dark |  visualOnly | kv-mood-dark | — | ✓ |
| ilhwa-photo |  visualOnly | kv-vivid-photo | — | ✓ |
| ilhwa-roomy |  visualOnly | kv-vivid-photo | — | ✓ |
| bc-illust |  visualOnly | kv-edge | — | ✓ |
| fox-gradbg |  visualOnly | kv-edge | — | ✓ |
| dongbu_illust |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group |  visualOnly | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.47 잇는 중 | ✓ |
| dongsuh-model |  visualOnly | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 · 아랫:nat 0px 0.07/0.15 잇는 중 | ✓ |
| fox-cutout |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.1 · 윗:nat 0px 0/0.54 잇는 중 · 아랫:nat 0px 0/0.05 | ✓ |
| sep-open-recruit |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.29 잇는 중 · 아랫:nat 0px 0/0.5 잇는 중 | ✓ |
| hdot-wave |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-purple3d |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-hall |  visualOnly | kv-edge | — | ✓ |
| hdot-speaker-a |  visualOnly | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 오른:nat 0px 0/0.37 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 · 아랫:nat 0px 0.27/0.29 잇는 중 | ✓ |
| hdot-speaker-b |  visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 · 아랫:nat 0px 0.21/0.4 잇는 중 | ✓ |
| hdot-seminar |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-audience |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-asterisk |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.27 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hr-doctor |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-teamhands |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-nurse-ai |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-cablebridge |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-stadium-wire |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.3 잇는 중 · 아랫:nat 0px 0/0.59 잇는 중 | ✓ |
| midas-city |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-folder-blue |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 · 아랫:nat 0px 0/0.16 잇는 중 | ✓ |
| midas-folder-dark |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 · 아랫:nat 0px 0/0.16 잇는 중 | ✓ |
| midas-glass-folders |  visualOnly | kv-edge | — | ✓ |
| midas-acrylic-box |  visualOnly | kv-edge | — | ✓ |
| midas-cards-orange |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-bridge-icons |  visualOnly | kv-edge | — | ✓ |
| midas-bridge-dark |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-book-vib |  visualOnly | kv-edge | — | ✓ |
| midas-book-open |  visualOnly | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px 0/0.65 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 · 아랫:nat 0px 0/0.46 잇는 중 | ✓ |
| midas-book-flow |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-book-sim |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-skyscraper |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| midas-facets |  textureFull,visualOnly | kv-texture | — | ✓ |
| midas-glass-mint |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.08/0.07 · 오른:nat 0px 0/0.08 · 윗:nat 0px 0/0.6 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.08/– · 오른:nat 0px 0.27/0.02 · 윗:nat 0px 0.01/0.45 잇는 중 · 아랫:nat 0px 0.01/0.35 잇는 중 | ✓ |
| desk-01 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-02 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-03 |  visualOnly | kv-edge | — | ✓ |
| desk-03-cut |  visualOnly | kv-mood | 왼:nat 0px 0/0.29 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.23 잇는 중 | ✓ |
| desk-04 |  visualOnly | kv-mood | — | ✓ |
| desk-05 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-06 |  visualOnly | kv-edge | — | ✓ |
| desk-07 |  visualOnly | kv-edge | — | ✓ |
| desk-08 |  visualOnly | kv-edge | — | ✓ |
| desk-09 |  visualOnly | kv-edge | — | ✓ |
| desk-11 |  visualOnly | kv-edge | — | ✓ |
| desk-12 |  visualOnly | kv-edge | — | ✓ |
| desk-13 |  visualOnly | kv-edge | — | ✓ |
| desk-13-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| desk-14 |  visualOnly | kv-edge | — | ✓ |
| desk-15 |  visualOnly | kv-edge | — | ✓ |
| desk-15-cut |  visualOnly | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0.01/0.59 잇는 중 · 아랫:nat 0px 0.01/0.18 잇는 중 | ✓ |
| desk-16 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-17 |  visualOnly | kv-edge | — | ✓ |
| desk-18 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-18-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 · 아랫:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-19 |  visualOnly | kv-mood | — | ✓ |
| desk-20 |  visualOnly | kv-edge | — | ✓ |
| desk-20-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.46 잇는 중 · 아랫:nat 0px 0/0.39 잇는 중 | ✓ |
| desk-21 |  visualOnly | kv-edge | — | ✓ |
| desk-22 |  visualOnly | kv-edge | — | ✓ |
| desk-22-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.1 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.38 잇는 중 · 아랫:nat 0px 0/0.09 | ✓ |
| desk-23 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-24 |  visualOnly | kv-edge | — | ✓ |
| desk-25 |  visualOnly | kv-edge | — | ✓ |
| desk-26 |  visualOnly | kv-edge | — | ✓ |
| desk-27 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-28 |  visualOnly | kv-mood | — | ✓ |
| desk-29 |  visualOnly | kv-edge | — | ✓ |
| desk-30 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-31 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.22 잇는 중 · 아랫:nat 0px 0/0.28 잇는 중 | ✓ |
| desk-33 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-34 |  visualOnly | kv-edge | — | ✓ |
| desk-35 |  visualOnly | kv-edge | — | ✓ |
| desk-35-cut |  visualOnly | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.73 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| desk-36 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-10 |  visualOnly | kv-edge | — | ✓ |
| desk-37 |  visualOnly | kv-edge | — | ✓ |
| desk-37-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.44 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0.01/0.5 잇는 중 · 아랫:nat 0px 0.01/0.45 잇는 중 | ✓ |
| t1014-abl |  visualOnly | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 |  roomFull,visualOnly | kv-full | — | ✓ |
| t1014-gs2026 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-lt-v2 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt-v3 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-dongsuh |  visualOnly | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-bionote-dog |  visualOnly | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-bionote-cat |  visualOnly | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-asan-illust |  visualOnly | kv-edge | — | ✓ |
| t1014-asan-photo |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-jeil |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.63 잇는 중 · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-hanssem |  visualOnly | kv-vivid-photo | — | ✓ |
| t1014-hanssem-blocks |  visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 · 아랫:nat 0px 0/0.45 잇는 중 | ✓ |
| t1014-hanjin |  visualOnly | kv-vivid-photo | — | ✓ |

### 에브리타임 · 검색 키워드 — 썸네일 이미지 `everytime-search-keyword-thumb` 288×288

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg |  visualOnly | kv-edge | — | ✓ |
| texture-dark |  textureFull,visualOnly | kv-texture | — | ✓ |
| slabs-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| geo-3d |  roomFull,visualOnly | kv-full | — | ✓ |
| samsung-3d |  visualOnly | kv-edge | — | ✓ |
| gradient |  textureFull,visualOnly | kv-texture | — | ✓ |
| fox-3d |  visualOnly | kv-edge | — | ✓ |
| ilhwa-dark |  visualOnly | kv-mood-dark | — | ✓ |
| ilhwa-photo |  visualOnly | kv-vivid-photo | — | ✓ |
| ilhwa-roomy |  visualOnly | kv-vivid-photo | — | ✓ |
| bc-illust |  visualOnly | kv-edge | — | ✓ |
| fox-gradbg |  visualOnly | kv-edge | — | ✓ |
| dongbu_illust |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/– | ✓ |
| abl-group |  visualOnly | kv-vivid | 왼:nat 0px 0/0.6 잇는 중 · 오른:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.47 잇는 중 | ✓ |
| dongsuh-model |  visualOnly | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 오른:nat 0px 0/0.29 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 · 아랫:nat 0px 0.07/0.15 잇는 중 | ✓ |
| fox-cutout |  visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.1 · 윗:nat 0px 0/0.54 잇는 중 · 아랫:nat 0px 0/0.05 | ✓ |
| sep-open-recruit |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.29 잇는 중 · 아랫:nat 0px 0/0.5 잇는 중 | ✓ |
| hdot-wave |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-purple3d |  textureFull,visualOnly | kv-texture | — | ✓ |
| hdot-hall |  visualOnly | kv-edge | — | ✓ |
| hdot-speaker-a |  visualOnly | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 오른:nat 0px 0/0.37 잇는 중 · 윗:nat 0px 0/0.28 잇는 중 · 아랫:nat 0px 0.27/0.29 잇는 중 | ✓ |
| hdot-speaker-b |  visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 · 아랫:nat 0px 0.21/0.4 잇는 중 | ✓ |
| hdot-seminar |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-audience |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| hdot-asterisk |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| hr-doctor |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-teamhands |  visualOnly | kv-vivid-photo | — | ✓ |
| hr-nurse-ai |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-cablebridge |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-stadium-wire |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 · 오른:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.3 잇는 중 · 아랫:nat 0px 0/0.59 잇는 중 | ✓ |
| midas-city |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-folder-blue |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.58 잇는 중 · 오른:nat 0px 0/0.43 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 · 아랫:nat 0px 0/0.16 잇는 중 | ✓ |
| midas-folder-dark |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 오른:nat 0px 0/0.58 잇는 중 · 윗:nat 0px 0/0.41 잇는 중 · 아랫:nat 0px 0/0.16 잇는 중 | ✓ |
| midas-glass-folders |  visualOnly | kv-edge | — | ✓ |
| midas-acrylic-box |  visualOnly | kv-edge | — | ✓ |
| midas-cards-orange |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-bridge-icons |  visualOnly | kv-edge | — | ✓ |
| midas-bridge-dark |  roomFull,visualOnly | kv-full | — | ✓ |
| midas-book-vib |  visualOnly | kv-edge | — | ✓ |
| midas-book-open |  visualOnly | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 오른:nat 0px 0/0.65 잇는 중 · 윗:nat 0px 0/0.58 잇는 중 · 아랫:nat 0px 0/0.46 잇는 중 | ✓ |
| midas-book-flow |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.54 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/0.44 잇는 중 | ✓ |
| midas-book-sim |  visualOnly | kv-vivid-photo | — | ✓ |
| midas-skyscraper |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| midas-facets |  textureFull,visualOnly | kv-texture | — | ✓ |
| midas-glass-mint |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.08/0.07 · 오른:nat 0px 0/0.08 · 윗:nat 0px 0/0.6 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| midas-glass-dark |  frameFull,visualOnly | kv-frame | 왼:nat 0px 0.08/– · 오른:nat 0px 0.27/0.02 · 윗:nat 0px 0.01/0.45 잇는 중 · 아랫:nat 0px 0.01/0.35 잇는 중 | ✓ |
| desk-01 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-02 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-03 |  visualOnly | kv-edge | — | ✓ |
| desk-03-cut |  visualOnly | kv-mood | 왼:nat 0px 0/0.29 잇는 중 · 오른:nat 0px 0/0.21 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.23 잇는 중 | ✓ |
| desk-04 |  visualOnly | kv-mood | — | ✓ |
| desk-05 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-06 |  visualOnly | kv-edge | — | ✓ |
| desk-07 |  visualOnly | kv-edge | — | ✓ |
| desk-08 |  visualOnly | kv-edge | — | ✓ |
| desk-09 |  visualOnly | kv-edge | — | ✓ |
| desk-11 |  visualOnly | kv-edge | — | ✓ |
| desk-12 |  visualOnly | kv-edge | — | ✓ |
| desk-13 |  visualOnly | kv-edge | — | ✓ |
| desk-13-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/0.35 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| desk-14 |  visualOnly | kv-edge | — | ✓ |
| desk-15 |  visualOnly | kv-edge | — | ✓ |
| desk-15-cut |  visualOnly | kv-mood | 왼:nat 0px 0/– · 오른:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0.01/0.59 잇는 중 · 아랫:nat 0px 0.01/0.18 잇는 중 | ✓ |
| desk-16 |  visualOnly | kv-mood-dark | — | ✓ |
| desk-17 |  visualOnly | kv-edge | — | ✓ |
| desk-18 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-18-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.47 잇는 중 · 오른:nat 0px 0/0.36 잇는 중 · 윗:nat 0px 0/0.56 잇는 중 · 아랫:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-19 |  visualOnly | kv-mood | — | ✓ |
| desk-20 |  visualOnly | kv-edge | — | ✓ |
| desk-20-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px 0/0.47 잇는 중 · 아랫:nat 0px 0/0.39 잇는 중 | ✓ |
| desk-21 |  visualOnly | kv-edge | — | ✓ |
| desk-22 |  visualOnly | kv-edge | — | ✓ |
| desk-22-cut |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/0.1 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.38 잇는 중 · 아랫:nat 0px 0/0.09 | ✓ |
| desk-23 |  textureFull,visualOnly | kv-texture | — | ✓ |
| desk-24 |  visualOnly | kv-edge | — | ✓ |
| desk-25 |  visualOnly | kv-edge | — | ✓ |
| desk-26 |  visualOnly | kv-edge | — | ✓ |
| desk-27 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-28 |  visualOnly | kv-mood | — | ✓ |
| desk-29 |  visualOnly | kv-edge | — | ✓ |
| desk-30 |  roomFull,visualOnly | kv-full | — | ✓ |
| desk-31 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| desk-32-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.53 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/0.22 잇는 중 · 아랫:nat 0px 0/0.28 잇는 중 | ✓ |
| desk-33 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-34 |  visualOnly | kv-edge | — | ✓ |
| desk-35 |  visualOnly | kv-edge | — | ✓ |
| desk-35-cut |  visualOnly | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 오른:nat 0px 0/0.26 잇는 중 · 윗:nat 0px 0/0.73 잇는 중 · 아랫:nat 0px 0/0.43 잇는 중 | ✓ |
| desk-36 |  visualOnly | kv-vivid-photo | — | ✓ |
| desk-10 |  visualOnly | kv-edge | — | ✓ |
| desk-37 |  visualOnly | kv-edge | — | ✓ |
| desk-37-cut |  objectBleed,visualOnly | kv-mood | 왼:nat 0px 0/0.44 잇는 중 · 오른:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0.01/0.5 잇는 중 · 아랫:nat 0px 0.01/0.45 잇는 중 | ✓ |
| t1014-abl |  visualOnly | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 오른:nat 0px 0/0.57 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 · 아랫:nat 0px 0/– | ✓ |
| t1014-gs2025 |  roomFull,visualOnly | kv-full | — | ✓ |
| t1014-gs2026 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-lt-v2 |  visualOnly | kv-edge | — | ✓ |
| t1014-lt-v3 |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-dongsuh |  visualOnly | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 오른:nat 0px 0/0.15 잇는 중 · 윗:nat 0px 0/0.18 잇는 중 · 아랫:nat 0px 0/0.51 잇는 중 | ✓ |
| t1014-bionote-dog |  visualOnly | kv-vivid | 왼:nat 0px 0/0.55 잇는 중 · 오른:nat 0px 0/0.55 잇는 중 · 윗:nat 0px 0/0.51 잇는 중 · 아랫:nat 0px 0/0.37 잇는 중 | ✓ |
| t1014-bionote-cat |  visualOnly | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 오른:nat 0px 0/– · 윗:nat 0px 0/– · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-asan-illust |  visualOnly | kv-edge | — | ✓ |
| t1014-asan-photo |  photoCrowdFull,visualOnly | photo-full | — | ✓ |
| t1014-jeil |  objectBleed,visualOnly | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px 0/0.63 잇는 중 · 아랫:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-hanssem |  visualOnly | kv-vivid-photo | — | ✓ |
| t1014-hanssem-blocks |  visualOnly | kv-vivid | 왼:nat 0px 0/0.31 잇는 중 · 오른:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 · 아랫:nat 0px 0/0.45 잇는 중 | ✓ |
| t1014-hanjin |  visualOnly | kv-vivid-photo | — | ✓ |

### 에브리타임 · 데일리 메시지 — 프로필 이미지 `everytime-daily-message-profile` 120×120

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 브랜드 로고 (피드 이미지 광고용) `blind-brand-logo` 96×96

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | — | — | — | 제외: 로고만 규격 |
| texture-dark | — | — | — | 제외: 로고만 규격 |
| slabs-3d | — | — | — | 제외: 로고만 규격 |
| geo-3d | — | — | — | 제외: 로고만 규격 |
| samsung-3d | — | — | — | 제외: 로고만 규격 |
| gradient | — | — | — | 제외: 로고만 규격 |
| fox-3d | — | — | — | 제외: 로고만 규격 |
| ilhwa-dark | — | — | — | 제외: 로고만 규격 |
| ilhwa-photo | — | — | — | 제외: 로고만 규격 |
| ilhwa-roomy | — | — | — | 제외: 로고만 규격 |
| bc-illust | — | — | — | 제외: 로고만 규격 |
| fox-gradbg | — | — | — | 제외: 로고만 규격 |
| dongbu_illust | — | — | — | 제외: 로고만 규격 |
| abl-group | — | — | — | 제외: 로고만 규격 |
| dongsuh-model | — | — | — | 제외: 로고만 규격 |
| fox-cutout | — | — | — | 제외: 로고만 규격 |
| sep-open-recruit | — | — | — | 제외: 로고만 규격 |
| hdot-wave | — | — | — | 제외: 로고만 규격 |
| hdot-purple3d | — | — | — | 제외: 로고만 규격 |
| hdot-hall | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-a | — | — | — | 제외: 로고만 규격 |
| hdot-speaker-b | — | — | — | 제외: 로고만 규격 |
| hdot-seminar | — | — | — | 제외: 로고만 규격 |
| hdot-audience | — | — | — | 제외: 로고만 규격 |
| hdot-asterisk | — | — | — | 제외: 로고만 규격 |
| hr-doctor | — | — | — | 제외: 로고만 규격 |
| hr-teamhands | — | — | — | 제외: 로고만 규격 |
| hr-nurse-ai | — | — | — | 제외: 로고만 규격 |
| midas-cablebridge | — | — | — | 제외: 로고만 규격 |
| midas-stadium-wire | — | — | — | 제외: 로고만 규격 |
| midas-city | — | — | — | 제외: 로고만 규격 |
| midas-folder-blue | — | — | — | 제외: 로고만 규격 |
| midas-folder-dark | — | — | — | 제외: 로고만 규격 |
| midas-glass-folders | — | — | — | 제외: 로고만 규격 |
| midas-acrylic-box | — | — | — | 제외: 로고만 규격 |
| midas-cards-orange | — | — | — | 제외: 로고만 규격 |
| midas-bridge-icons | — | — | — | 제외: 로고만 규격 |
| midas-bridge-dark | — | — | — | 제외: 로고만 규격 |
| midas-book-vib | — | — | — | 제외: 로고만 규격 |
| midas-book-open | — | — | — | 제외: 로고만 규격 |
| midas-book-flow | — | — | — | 제외: 로고만 규격 |
| midas-book-sim | — | — | — | 제외: 로고만 규격 |
| midas-skyscraper | — | — | — | 제외: 로고만 규격 |
| midas-facets | — | — | — | 제외: 로고만 규격 |
| midas-glass-mint | — | — | — | 제외: 로고만 규격 |
| midas-glass-dark | — | — | — | 제외: 로고만 규격 |
| desk-01 | — | — | — | 제외: 로고만 규격 |
| desk-02 | — | — | — | 제외: 로고만 규격 |
| desk-03 | — | — | — | 제외: 로고만 규격 |
| desk-03-cut | — | — | — | 제외: 로고만 규격 |
| desk-04 | — | — | — | 제외: 로고만 규격 |
| desk-05 | — | — | — | 제외: 로고만 규격 |
| desk-06 | — | — | — | 제외: 로고만 규격 |
| desk-07 | — | — | — | 제외: 로고만 규격 |
| desk-08 | — | — | — | 제외: 로고만 규격 |
| desk-09 | — | — | — | 제외: 로고만 규격 |
| desk-11 | — | — | — | 제외: 로고만 규격 |
| desk-12 | — | — | — | 제외: 로고만 규격 |
| desk-13 | — | — | — | 제외: 로고만 규격 |
| desk-13-cut | — | — | — | 제외: 로고만 규격 |
| desk-14 | — | — | — | 제외: 로고만 규격 |
| desk-15 | — | — | — | 제외: 로고만 규격 |
| desk-15-cut | — | — | — | 제외: 로고만 규격 |
| desk-16 | — | — | — | 제외: 로고만 규격 |
| desk-17 | — | — | — | 제외: 로고만 규격 |
| desk-18 | — | — | — | 제외: 로고만 규격 |
| desk-18-cut | — | — | — | 제외: 로고만 규격 |
| desk-19 | — | — | — | 제외: 로고만 규격 |
| desk-20 | — | — | — | 제외: 로고만 규격 |
| desk-20-cut | — | — | — | 제외: 로고만 규격 |
| desk-21 | — | — | — | 제외: 로고만 규격 |
| desk-22 | — | — | — | 제외: 로고만 규격 |
| desk-22-cut | — | — | — | 제외: 로고만 규격 |
| desk-23 | — | — | — | 제외: 로고만 규격 |
| desk-24 | — | — | — | 제외: 로고만 규격 |
| desk-25 | — | — | — | 제외: 로고만 규격 |
| desk-26 | — | — | — | 제외: 로고만 규격 |
| desk-27 | — | — | — | 제외: 로고만 규격 |
| desk-28 | — | — | — | 제외: 로고만 규격 |
| desk-29 | — | — | — | 제외: 로고만 규격 |
| desk-30 | — | — | — | 제외: 로고만 규격 |
| desk-31 | — | — | — | 제외: 로고만 규격 |
| desk-32 | — | — | — | 제외: 로고만 규격 |
| desk-32-cut | — | — | — | 제외: 로고만 규격 |
| desk-33 | — | — | — | 제외: 로고만 규격 |
| desk-34 | — | — | — | 제외: 로고만 규격 |
| desk-35 | — | — | — | 제외: 로고만 규격 |
| desk-35-cut | — | — | — | 제외: 로고만 규격 |
| desk-36 | — | — | — | 제외: 로고만 규격 |
| desk-10 | — | — | — | 제외: 로고만 규격 |
| desk-37 | — | — | — | 제외: 로고만 규격 |
| desk-37-cut | — | — | — | 제외: 로고만 규격 |
| t1014-abl | — | — | — | 제외: 로고만 규격 |
| t1014-gs2025 | — | — | — | 제외: 로고만 규격 |
| t1014-gs2026 | — | — | — | 제외: 로고만 규격 |
| t1014-lt | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v2 | — | — | — | 제외: 로고만 규격 |
| t1014-lt-v3 | — | — | — | 제외: 로고만 규격 |
| t1014-dongsuh | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-dog | — | — | — | 제외: 로고만 규격 |
| t1014-bionote-cat | — | — | — | 제외: 로고만 규격 |
| t1014-asan-illust | — | — | — | 제외: 로고만 규격 |
| t1014-asan-photo | — | — | — | 제외: 로고만 규격 |
| t1014-jeil | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem | — | — | — | 제외: 로고만 규격 |
| t1014-hanssem-blocks | — | — | — | 제외: 로고만 규격 |
| t1014-hanjin | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 피드 이미지 광고 (채용채널&피드광고 / 홈피드광고) `blind-feed-image` 1200×628

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 145px 0/0.02 · 윗:nat 102px 0/0 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 30px 0/0.01 · 오른:nat 55px 0/0.04 · 윗:nat 96px 0/0.05 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 145px 0/0.06 · 윗:nat 102px 0/0.07 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 왼:cut 145px 0/0.04 · 윗:cut 102px 0/0.17 잇는 중 | ✓ |
| samsung-3d | templateMold templateMold | kv-edge | 왼:cut 145px 0/0.01 · 윗:nat 102px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 60px 0/0.03 · 오른:nat 62px 0/0.06 · 윗:nat 96px 0/0.1 | ✓ |
| fox-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 145px 0/0.39 잇는 중 · 윗:cut 102px 0/0.36 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 179px 0/0.27 잇는 중 · 윗:cut 117px 0/0.27 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 235px 0/0.27 잇는 중 · 윗:cut 162px 0/0.45 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 201px 0/0.3 잇는 중 · 윗:cut 147px 0/0.47 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 145px 0/0.3 잇는 중 · 윗:nat 102px 0/0.19 잇는 중 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 91px 0/0.24 잇는 중 · 오른:nat 157px 0/0.43 잇는 중 · 윗:nat 105px 0/0.16 잇는 중 | ✓ |
| dongbu_illust | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold overlapFix.ok,cutFade,objectBleed,templateMold,templateMold.slotBleed,overlapFix.text | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 145px 0/0.07 · 윗:nat 102px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 145px 0/0.05 · 윗:nat 102px 0/0.04 | ✓ |
| hdot-hall | templateMold meltFix,templateMold | kv-edge | 왼:cut 188px 0/0.13 · 윗:cut 102px 0/0.09 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 145px 0/0.08 · 윗:nat 165px 0/0.04 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 235px 0/0.16 잇는 중 · 윗:nat 144px 0/0.21 잇는 중 | ✓ |
| hdot-asterisk | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 235px 0/0.48 잇는 중 · 윗:nat 165px 0/0.47 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 235px 0/0.3 잇는 중 · 윗:nat 165px 0/0.35 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 235px 0/0.36 잇는 중 · 윗:cut 156px 0/0.51 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 214px 0/0.2 잇는 중 · 윗:cut 159px 0/0.15 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.36 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 201px 0/0.29 잇는 중 · 윗:nat 147px 0/0.24 잇는 중 | ✓ |
| midas-folder-blue | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.64 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 235px 0/0.21 잇는 중 · 윗:cut 165px 0/0.36 잇는 중 | ✓ |
| midas-acrylic-box | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 77px 0/0.02 · 윗:nat 0px 0.01/0 | ✓ |
| midas-cards-orange | templateMold templateMold,templateMold.containGrad | kv-edge | 왼:nat 171px 0/0.07 · 윗:nat 0px 0.03/0.06 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 205px 0/0.34 잇는 중 · 윗:cut 144px 0/0.43 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 141px 0/0.02 · 윗:nat 0px 0.01/0.01 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 235px 0/0.14 · 윗:nat 0px 0.02/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.53 잇는 중 · 윗:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 226px 0/0.32 잇는 중 · 윗:cut 129px 0/0.24 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 201px 0/0.31 잇는 중 · 윗:cut 165px 0/0.22 잇는 중 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:cut 150px 0/0.09 · 윗:nat 141px 0/0.04 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 왼:cut 145px 0/0 · 윗:cut 102px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 162px 0/0.12 · 윗:cut 102px 0/0.06 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 57px 0/0.12 · 오른:nat 61px 0/0.15 잇는 중 · 윗:nat 84px 0/0.13 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.04 · 윗:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood | 왼:nat 226px 0/0.24 잇는 중 · 윗:cut 159px 0/0.19 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 175px 0/0.11 · 윗:cut 159px 0/0.18 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 235px 0/0.36 잇는 중 · 윗:cut 102px 0/0.17 잇는 중 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 68px 0/0.08 · 오른:nat 54px 0/0.07 · 윗:nat 96px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 192px 0/0.16 잇는 중 · 윗:cut 102px 0/0.1 | ✓ |
| desk-09 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 154px 0/0.03 · 윗:nat 105px 0/0.08 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 235px 0/0.28 잇는 중 · 윗:nat 96px 0/0.21 잇는 중 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 235px 0/0.43 잇는 중 · 윗:cut 165px 0/0.52 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 145px 0/0.15 잇는 중 · 윗:cut 141px 0/0.14 | ✓ |
| desk-13-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 188px 0/0.08 · 윗:cut 102px 0/0.04 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 235px 0/0.35 잇는 중 · 윗:cut 105px (표본 부족(글자·로고 위)) | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 167px 0/0.14 · 윗:nat 147px 0/0.19 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 왼:cut 145px 0/0.38 잇는 중 · 윗:cut 165px 0/0.02 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 55px 0/0.12 · 오른:nat 55px 0/0.05 · 윗:nat 84px 0/0.06 | ✓ |
| desk-18-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:cut 214px 0/0.12 · 윗:cut 156px 0/0.16 잇는 중 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 왼:cut 235px 0/0.29 잇는 중 · 윗:cut 165px 0/0.28 잇는 중 | ✓ |
| desk-20-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 104px 0/0.25 잇는 중 · 오른:nat 99px 0/0.16 잇는 중 · 윗:nat 144px 0/0.38 잇는 중 | ✓ |
| desk-22 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 145px 0/0.53 잇는 중 · 윗:cut 165px 0/0.51 잇는 중 | ✓ |
| desk-22-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 171px 0/0.04 · 윗:cut 102px 0/0.07 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 왼:cut 145px 0/0.15 잇는 중 · 윗:cut 102px 0/0.07 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 54px 0/0.01 · 오른:nat 54px 0/0.01 · 윗:nat 84px (표본 부족(글자·로고 위)) | ✓ |
| desk-26 | templateMold templateMold | kv-edge | 왼:cut 145px 0/0.18 잇는 중 · 윗:cut 102px (표본 부족(글자·로고 위)) | ✓ |
| desk-27 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 214px 0/0.34 잇는 중 · 윗:nat 165px 0.01/0.48 잇는 중 | ✓ |
| desk-28 | templateMold templateMold | kv-mood | 왼:nat 222px 0/0.36 잇는 중 · 윗:cut 159px 0/0.33 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 110px 0/0.28 잇는 중 · 오른:nat 110px 0/0.31 잇는 중 · 윗:nat 84px 0/0.03 | ✓ |
| desk-30 | templateMold meltFix,templateMold | kv-edge | 왼:cut 150px 0/0.05 · 윗:cut 111px 0/0.06 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 231px 0/0.13 · 윗:nat 165px 0/0.15 잇는 중 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 167px 0/0.18 잇는 중 · 윗:nat 135px 0/0.21 잇는 중 | ✓ |
| desk-32-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 209px 0/0.24 잇는 중 · 윗:cut 147px 0/0.24 잇는 중 | ✓ |
| desk-34 | templateMold templateMold | kv-edge | 왼:nat 171px 0/0.17 잇는 중 · 윗:cut 141px 0/0.21 잇는 중 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 왼:cut 145px 0/0.12 · 윗:cut 102px 0/0.04 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 235px 0/0.34 잇는 중 · 윗:cut 165px 0.01/0.38 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 145px 0/0.36 잇는 중 · 윗:cut 165px 0/0.39 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 167px 0/0.15 잇는 중 · 윗:nat 0px 0.01/0.03 | ✓ |
| desk-37-cut | templateMold objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.43 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold | kv-edge | 왼:cut 235px 0/0.3 잇는 중 · 윗:cut 102px 0/0.12 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 231px 0/0.35 잇는 중 · 윗:cut 102px 0/0.19 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 145px 0/0.05 · 윗:cut 105px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 154px 0/0.08 · 윗:nat 0px 0.02/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 235px 0/0.12 · 윗:nat 159px 0/0.15 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold | kv-vivid | 왼:nat 37px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.6 잇는 중 | ✓ |
| t1014-bionote-cat | templateMold overlapFix.ok,templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 235px 0/0.3 잇는 중 · 윗:nat 102px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 231px 0/0.13 · 윗:nat 150px 0/0.14 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.63 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 235px 0/0.37 잇는 중 · 윗:nat 165px 0/0.29 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 235px 0/0.36 잇는 중 · 윗:nat 165px 0.01/0.15 잇는 중 | ✓ |

### 블라인드 · 게시글 배너·댓글 배너 (보드 표기: 게시글 배너, 띠 배너) `blind-post-banner` 1250×560

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg | templateMold templateMold | kv-edge | 왼:cut 135px 0/0.2 잇는 중 · 윗:cut 95px 0/0.2 잇는 중 | ✓ |
| texture-dark | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 50px 0/0.03 · 오른:nat 50px 0/0.02 · 윗:nat 89px 0/0.02 | ✓ |
| slabs-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 135px 0/0.06 · 윗:nat 95px 0/0.03 | ✓ |
| geo-3d | templateMold templateMold | kv-edge | 왼:cut 135px 0/0.04 · 윗:cut 95px 0/0.03 | ✓ |
| samsung-3d | templateMold templateMold | kv-edge | 왼:cut 135px 0/0.01 · 윗:nat 95px 0/0.02 | ✓ |
| gradient | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 66px 0/0.06 · 오른:nat 66px 0/0.05 · 윗:nat 100px 0/0.05 | ✓ |
| fox-3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:nat 135px 0/0.39 잇는 중 · 윗:cut 95px 0/0.25 잇는 중 | ✓ |
| ilhwa-dark | templateMold meltFix,templateMold | kv-mood-dark | 왼:cut 159px 0/0.26 잇는 중 · 윗:cut 109px 0/0.25 잇는 중 | ✓ |
| ilhwa-photo | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 219px 0/0.26 잇는 중 · 윗:cut 145px 0/0.4 잇는 중 | ✓ |
| ilhwa-roomy | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 179px 0/0.35 잇는 중 · 윗:cut 131px 0/0.45 잇는 중 | ✓ |
| bc-illust | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 135px 0/0.24 잇는 중 · 윗:nat 95px 0/0.11 | ✓ |
| fox-gradbg | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 85px 0/0.26 잇는 중 · 오른:nat 146px 0/0.42 잇는 중 · 윗:nat 98px 0/0.16 잇는 중 | ✓ |
| dongbu_illust | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| abl-group | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| dongsuh-model | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.17 잇는 중 | ✓ |
| fox-cutout | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 윗:nat 0px 0/– | ✓ |
| sep-open-recruit | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| hdot-wave | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 135px 0/0.07 · 윗:nat 95px 0/0.07 | ✓ |
| hdot-purple3d | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 135px 0/0.05 · 윗:nat 95px 0/0.04 | ✓ |
| hdot-hall | templateMold meltFix,templateMold | kv-edge | 왼:cut 175px 0/0.14 · 윗:cut 95px 0/0.07 | ✓ |
| hdot-speaker-a | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.28 잇는 중 | ✓ |
| hdot-speaker-b | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.21 잇는 중 | ✓ |
| hdot-seminar | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 135px 0/0.12 · 윗:nat 154px 0/0.1 | ✓ |
| hdot-audience | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 211px 0/0.2 잇는 중 · 윗:nat 148px 0/0.21 잇는 중 | ✓ |
| hdot-asterisk | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.07 | ✓ |
| hr-doctor | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 219px 0/0.48 잇는 중 · 윗:nat 154px 0.01/0.46 잇는 중 | ✓ |
| hr-teamhands | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 219px 0/0.28 잇는 중 · 윗:nat 154px 0/0.34 잇는 중 | ✓ |
| hr-nurse-ai | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 219px 0/0.36 잇는 중 · 윗:cut 142px 0/0.5 잇는 중 | ✓ |
| midas-cablebridge | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 193px 0/0.18 잇는 중 · 윗:cut 145px 0/0.15 잇는 중 | ✓ |
| midas-stadium-wire | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.32 잇는 중 · 윗:nat 0px 0/0.4 잇는 중 | ✓ |
| midas-city | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 179px 0/0.28 잇는 중 · 윗:nat 134px 0/0.25 잇는 중 | ✓ |
| midas-folder-blue | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-folder-dark | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.47 잇는 중 | ✓ |
| midas-glass-folders | templateMold meltFix,templateMold | kv-edge | 왼:cut 219px 0/0.23 잇는 중 · 윗:cut 154px 0/0.26 잇는 중 | ✓ |
| midas-acrylic-box | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 127px 0/0.03 · 윗:nat 0px 0.02/0.03 | ✓ |
| midas-cards-orange | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 151px 0/0.11 · 윗:nat 0px 0.06/0.08 | ✓ |
| midas-bridge-icons | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 191px 0/0.36 잇는 중 · 윗:cut 134px 0/0.45 잇는 중 | ✓ |
| midas-bridge-dark | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 131px 0/0.06 · 윗:nat 0px 0.04/0.06 | ✓ |
| midas-book-vib | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 219px 0/0.12 · 윗:nat 0px 0.01/0.02 | ✓ |
| midas-book-open | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-book-flow | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.46 잇는 중 · 윗:nat 0px 0/– | ✓ |
| midas-book-sim | templateMold meltFix,templateMold | kv-vivid-photo | 왼:cut 203px 0/0.24 잇는 중 · 윗:cut 114px 0/0.21 잇는 중 | ✓ |
| midas-skyscraper | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 219px 0/0.22 잇는 중 · 윗:cut 154px 0/0.11 | ✓ |
| midas-facets | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:cut 139px 0/0.09 · 윗:nat 131px 0/0.07 | ✓ |
| midas-glass-mint | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| midas-glass-dark | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-01 | templateMold templateMold | kv-edge | 왼:cut 135px 0/0 · 윗:cut 95px 0/0 | ✓ |
| desk-02 | templateMold meltFix,templateMold,templateMold.slotCover | kv-colour | 왼:nat 151px 0/0.12 · 윗:cut 95px 0/0.05 | ✓ |
| desk-03 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 61px 0/0.13 · 오른:nat 53px 0/0.17 잇는 중 · 윗:nat 92px 0/0.16 잇는 중 | ✓ |
| desk-03-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/0.05 · 윗:nat 0px 0/– | ✓ |
| desk-04 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood | 왼:nat 211px 0/0.24 잇는 중 · 윗:cut 148px 0/0.18 잇는 중 | ✓ |
| desk-05 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 199px 0/0.16 잇는 중 · 윗:cut 140px 0/0.18 잇는 중 | ✓ |
| desk-06 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 219px 0/0.36 잇는 중 · 윗:cut 95px 0/0.14 | ✓ |
| desk-07 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 70px 0/0.09 · 오른:nat 50px 0/0.06 · 윗:nat 95px 0/0.03 | ✓ |
| desk-08 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 179px 0/0.15 잇는 중 · 윗:cut 95px 0/0.11 | ✓ |
| desk-09 | templateMold templateMold,templateMold.slotCover | kv-edge | 왼:cut 135px 0/0.04 · 윗:nat 95px 0/0.11 | ✓ |
| desk-11 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 215px 0/0.15 잇는 중 · 윗:nat 0px 0.03/0.07 | ✓ |
| desk-12 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 219px 0/0.45 잇는 중 · 윗:cut 154px 0/0.5 잇는 중 | ✓ |
| desk-13 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 135px 0/0.17 잇는 중 · 윗:cut 131px 0/0.13 | ✓ |
| desk-13-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-14 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 175px 0/0.09 · 윗:cut 95px 0/0.04 | ✓ |
| desk-15 | templateMold meltFix,templateMold | kv-edge | 왼:nat 219px 0/0.35 잇는 중 · 윗:cut 98px 0/0.21 잇는 중 | ✓ |
| desk-15-cut | templateMold templateMold | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-16 | templateMold meltFix,templateMold | kv-mood-dark | 왼:nat 219px 0/0.13 · 윗:nat 154px 0/0.18 잇는 중 | ✓ |
| desk-17 | templateMold meltFix,templateMold | kv-edge | 왼:cut 135px 0/0.38 잇는 중 · 윗:cut 154px 0/0 | ✓ |
| desk-18 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 51px 0/0.12 · 오른:nat 51px 0/0.05 · 윗:nat 78px 0/0.06 | ✓ |
| desk-18-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-19 | templateMold templateMold | kv-mood | 왼:cut 155px 0/0.11 · 윗:cut 114px 0/0.07 | ✓ |
| desk-20 | templateMold meltFix,templateMold | kv-edge | 왼:cut 219px 0/0.29 잇는 중 · 윗:cut 154px 0/0.25 잇는 중 | ✓ |
| desk-20-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/– | ✓ |
| desk-21 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 115px 0/0.28 ✗ · 오른:nat 115px 0/0.25 ✗ · 윗:nat 109px 0/0.17 잇는 중 | ✗ seam-far |
| desk-22 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 135px 0/0.53 잇는 중 · 윗:cut 154px 0/0.54 잇는 중 | ✓ |
| desk-22-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.44 잇는 중 | ✓ |
| desk-23 | templateMold meltFix,templateMold | kv-colour | 왼:nat 159px 0/0.04 · 윗:cut 95px 0/0.07 | ✓ |
| desk-24 | templateMold templateMold | kv-edge | 왼:cut 135px 0/0.15 잇는 중 · 윗:cut 95px 0/0.06 | ✓ |
| desk-25 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 50px 0/0.01 · 오른:nat 50px 0/0.01 · 윗:nat 78px 0/0 | ✓ |
| desk-26 | templateMold templateMold | kv-edge | 왼:cut 135px 0/0.19 잇는 중 · 윗:cut 95px 0/0.17 잇는 중 | ✓ |
| desk-27 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 191px 0/0.33 잇는 중 · 윗:nat 154px 0.01/0.47 잇는 중 | ✓ |
| desk-28 | templateMold meltFix,templateMold | kv-mood | 왼:nat 183px 0/0.2 잇는 중 · 윗:cut 128px 0/0.22 잇는 중 | ✓ |
| desk-29 | templateMold cutFade,meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 102px 0/0.27 잇는 중 · 오른:nat 102px 0/0.3 잇는 중 · 윗:nat 78px 0/0.03 | ✓ |
| desk-30 | templateMold meltFix,templateMold | kv-edge | 왼:cut 139px 0/0.05 · 윗:cut 103px 0/0.06 | ✓ |
| desk-31 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 215px 0/0.19 잇는 중 · 윗:nat 151px 0/0.14 | ✓ |
| desk-32 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 163px 0/0.21 잇는 중 · 윗:nat 154px 0/0.27 잇는 중 | ✓ |
| desk-32-cut | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| desk-33 | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:nat 191px 0/0.23 잇는 중 · 윗:cut 134px 0/0.23 잇는 중 | ✓ |
| desk-34 | templateMold meltFix,templateMold | kv-edge | 왼:nat 219px 0/0.15 잇는 중 · 윗:cut 109px 0/0.12 | ✓ |
| desk-35 | templateMold templateMold | kv-edge | 왼:cut 135px 0/0.11 · 윗:cut 95px 0/0.05 | ✓ |
| desk-35-cut | templateMold templateMold | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-36 | templateMold meltFix,templateMold | kv-vivid-photo | 왼:nat 219px 0/0.33 잇는 중 · 윗:cut 154px 0.01/0.34 잇는 중 | ✓ |
| desk-10 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 135px 0/0.37 잇는 중 · 윗:cut 154px 0/0.37 잇는 중 | ✓ |
| desk-37 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 147px 0/0.11 · 윗:nat 0px 0.02/0.04 | ✓ |
| desk-37-cut | templateMold objectBleed,templateMold,templateMold.slotBleed | kv-mood | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| t1014-abl | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-gs2025 | templateMold meltFix,templateMold | kv-edge | 왼:cut 219px 0/0.2 잇는 중 · 윗:cut 95px 0/0.12 | ✓ |
| t1014-gs2026 | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:nat 215px 0/0.34 잇는 중 · 윗:cut 95px 0/0.19 잇는 중 | ✓ |
| t1014-lt | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:nat 135px 0/0.02 · 윗:cut 98px 0/0.05 | ✓ |
| t1014-lt-v2 | templateMold meltFix,templateMold,templateMold.containGrad | kv-edge | 왼:nat 135px 0/0.03 · 윗:nat 0px 0.02/0.03 | ✓ |
| t1014-lt-v3 | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 219px 0/0.13 · 윗:nat 154px 0/0.23 잇는 중 | ✓ |
| t1014-dongsuh | templateMold cutFade,templateMold | kv-vivid | 왼:nat 34px 0/0.6 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-dog | templateMold cutFade,templateMold | kv-vivid | 왼:nat 48px 0/0.48 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-bionote-cat | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/– | ✓ |
| t1014-asan-illust | templateMold meltFix,templateMold,templateMold.slotCover | kv-edge | 왼:cut 219px 0/0.3 잇는 중 · 윗:nat 95px 0/0.02 | ✓ |
| t1014-asan-photo | templateMold meltFix,templateMold,templateMold.slotCover | kv-mood-dark | 왼:cut 183px 0/0.21 잇는 중 · 윗:nat 117px 0/0.22 잇는 중 | ✓ |
| t1014-jeil | templateMold cutFade,objectBleed,templateMold,templateMold.slotBleed | kv-vivid | 왼:nat 0px 0/0.64 잇는 중 · 윗:nat 0px 0/– | ✓ |
| t1014-hanssem | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 219px 0/0.32 잇는 중 · 윗:nat 154px 0/0.27 잇는 중 | ✓ |
| t1014-hanssem-blocks | templateMold templateMold | kv-vivid | 왼:nat 0px 0/– · 윗:nat 0px 0/0.46 잇는 중 | ✓ |
| t1014-hanjin | templateMold meltFix,templateMold,templateMold.slotCover | kv-vivid-photo | 왼:cut 219px 0/0.33 잇는 중 · 윗:nat 154px 0.01/0.16 잇는 중 | ✓ |

### 당근 · 네이티브 피드 광고 (이미지 유형) `daangn-native-feed-image` 200×200

| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |
|---|---|---|---|---|
| dongbu-flatbg |  | kv-edge | 윗:cut 8px 0/0 | ✓ |
| texture-dark | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| slabs-3d |  | kv-edge | 윗:cut 7px 0.01/0.02 | ✓ |
| geo-3d |  | kv-edge | 윗:cut 7px 0.01/0.01 | ✓ |
| samsung-3d |  | kv-edge | 윗:nat 7px 0/0.01 | ✓ |
| gradient | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| fox-3d |  | kv-edge | 윗:cut 22px 0/0.03 | ✓ |
| ilhwa-dark |  | kv-mood-dark | 윗:cut 32px 0.01/0.18 잇는 중 | ✓ |
| ilhwa-photo |  | kv-vivid-photo | 윗:cut 39px 0.01/0.44 잇는 중 | ✓ |
| ilhwa-roomy |  meltFix | kv-vivid-photo | 윗:cut 40px 0.01/0.48 잇는 중 | ✓ |
| bc-illust |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| fox-gradbg |  | kv-edge | 윗:cut 24px 0/0.07 | ✓ |
| dongbu_illust |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.51 잇는 중 · 윗:nat 0px 0/0.5 잇는 중 | ✓ |
| abl-group |  cutFade | kv-vivid | 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| dongsuh-model |  overlapFix.ok,overlapFix.text | kv-vivid | 왼:nat 0px 0/0.56 잇는 중 · 윗:nat 0px 0/0.19 잇는 중 | ✓ |
| fox-cutout |  | kv-vivid | 왼:nat 0px 0/0.25 잇는 중 · 윗:nat 0px 0/0.11 | ✓ |
| sep-open-recruit |  cutFade,objectBleed | kv-vivid | 왼:nat 0px (표본 부족(글자·로고 위)) · 윗:nat 0px 0/0.32 잇는 중 | ✓ |
| hdot-wave | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| hdot-purple3d | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| hdot-hall |  | kv-edge | 윗:cut 7px 0.01/0.02 | ✓ |
| hdot-speaker-a |  | kv-vivid | 왼:nat 0px 0/0.41 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| hdot-speaker-b |  | kv-vivid | 왼:nat 0px 0/0.21 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| hdot-seminar | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| hdot-audience | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| hdot-asterisk |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.22 잇는 중 · 윗:nat 0px 0/0.31 잇는 중 | ✓ |
| hr-doctor |  | kv-vivid-photo | 윗:nat 40px 0.01/0.47 잇는 중 | ✓ |
| hr-teamhands |  | kv-vivid-photo | 윗:nat 40px 0.01/0.32 잇는 중 | ✓ |
| hr-nurse-ai |  meltFix | kv-vivid-photo | 왼:nat 72px 0/0.34 잇는 중 · 윗:cut 37px 0.01/0.5 잇는 중 | ✓ |
| midas-cablebridge |  | kv-vivid-photo | 윗:cut 38px 0.01/0.2 잇는 중 | ✓ |
| midas-stadium-wire |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.44 잇는 중 · 윗:nat 0px 0.22/0.42 잇는 중 | ✓ |
| midas-city |  meltFix | kv-vivid-photo | 윗:nat 35px 0.01/0.25 잇는 중 | ✓ |
| midas-folder-blue |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.4 잇는 중 · 윗:nat 0px 0/0.49 잇는 중 | ✓ |
| midas-folder-dark |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.23 잇는 중 · 윗:nat 0px 0/0.34 잇는 중 | ✓ |
| midas-glass-folders |  meltFix | kv-edge | 윗:cut 40px 0/0.27 잇는 중 | ✓ |
| midas-acrylic-box |  | kv-edge | 윗:cut 29px 0/0.02 | ✓ |
| midas-cards-orange |  | kv-edge | 윗:cut 27px 0/0.1 | ✓ |
| midas-bridge-icons |  | kv-edge | 윗:cut 22px 0/0.02 | ✓ |
| midas-bridge-dark |  | kv-edge | 윗:cut 27px 0/0.04 | ✓ |
| midas-book-vib |  | kv-edge | 윗:nat 8px 0/0.01 | ✓ |
| midas-book-open |  overlapFix.ok,cutFade,overlapFix.text | kv-vivid | 오른:nat 0px 0/0.65 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| midas-book-flow |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.42 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| midas-book-sim |  | kv-vivid-photo | 윗:cut 31px 0.01/0.2 잇는 중 | ✓ |
| midas-skyscraper | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| midas-facets | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| midas-glass-mint | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| midas-glass-dark | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| desk-01 |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| desk-02 | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| desk-03 |  | kv-edge | 윗:cut 30px 0.01/0.19 잇는 중 | ✓ |
| desk-03-cut |  | kv-mood | 왼:nat 0px 0/0.12 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| desk-04 |  meltFix | kv-mood | 윗:nat 38px 0/0.12 | ✓ |
| desk-05 |  | kv-mood-dark | 윗:cut 35px 0.01/0.1 | ✓ |
| desk-06 |  meltFix | kv-edge | 윗:cut 24px 0/0.08 | ✓ |
| desk-07 |  | kv-edge | 윗:cut 23px 0.01/0.03 | ✓ |
| desk-08 |  meltFix | kv-edge | 윗:cut 24px 0.01/0.05 | ✓ |
| desk-09 |  | kv-edge | 윗:nat 27px 0/0.04 | ✓ |
| desk-11 |  | kv-edge | 윗:cut 31px 0.01/0.23 잇는 중 | ✓ |
| desk-12 |  meltFix | kv-edge | 윗:cut 40px 0.01/0.45 잇는 중 | ✓ |
| desk-13 |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| desk-13-cut |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.3 잇는 중 · 윗:nat 0px 0/0.42 잇는 중 | ✓ |
| desk-14 |  | kv-edge | 윗:cut 14px 0/0.01 | ✓ |
| desk-15 |  | kv-edge | 윗:cut 30px 0.01/0.25 잇는 중 | ✓ |
| desk-15-cut |  | kv-mood | 왼:nat 0px 0/0.34 잇는 중 · 윗:nat 0px 0.01/0.34 잇는 중 | ✓ |
| desk-16 |  meltFix | kv-mood-dark | 윗:nat 35px 0/0.09 | ✓ |
| desk-17 |  meltFix | kv-edge | 윗:cut 40px 0/0 | ✓ |
| desk-18 |  | kv-edge | 윗:cut 7px 0.01/0.02 | ✓ |
| desk-18-cut |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.45 잇는 중 · 윗:nat 0px 0/0.61 잇는 중 | ✓ |
| desk-19 |  | kv-mood | 윗:cut 32px 0/0.05 | ✓ |
| desk-20 |  meltFix | kv-edge | 윗:cut 40px 0/0.13 | ✓ |
| desk-20-cut |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.61 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| desk-21 |  | kv-edge | 윗:cut 31px 0.01/0.32 잇는 중 | ✓ |
| desk-22 |  | kv-edge | 윗:cut 22px 0/0 | ✓ |
| desk-22-cut |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.48 잇는 중 · 윗:nat 0px 0/0.54 잇는 중 | ✓ |
| desk-23 | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| desk-24 |  meltFix | kv-edge | 윗:cut 25px 0/0.02 | ✓ |
| desk-25 |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| desk-26 |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| desk-27 |  | kv-vivid-photo | 윗:nat 40px 0.01/0.48 잇는 중 | ✓ |
| desk-28 |  | kv-mood | 윗:cut 39px 0.01/0.38 잇는 중 | ✓ |
| desk-29 |  | kv-edge | 윗:cut 23px 0/0.02 | ✓ |
| desk-30 |  meltFix | kv-edge | 윗:cut 27px (표본 부족(글자·로고 위)) | ✓ |
| desk-31 | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| desk-32 | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| desk-32-cut |  cutFade,objectBleed | kv-mood | 왼:nat 0px 0/0.28 잇는 중 · 윗:nat 0px 0/0.26 잇는 중 | ✓ |
| desk-33 |  meltFix | kv-vivid-photo | 윗:nat 35px 0.01/0.33 잇는 중 | ✓ |
| desk-34 |  | kv-edge | 윗:cut 34px 0/0.03 | ✓ |
| desk-35 |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| desk-35-cut |  | kv-vivid | 왼:nat 0px 0/0.5 잇는 중 · 윗:nat 0px 0/0.55 잇는 중 | ✓ |
| desk-36 |  | kv-vivid-photo | 윗:cut 40px 0.01/0.49 잇는 중 | ✓ |
| desk-10 |  | kv-edge | 윗:cut 22px 0/0.02 | ✓ |
| desk-37 |  | kv-edge | 윗:cut 27px 0.01/0.37 잇는 중 | ✓ |
| desk-37-cut |  cutFade,objectBleed | kv-mood | 왼:nat 0px 0/0.37 잇는 중 · 윗:nat 0px 0.01/0.53 잇는 중 | ✓ |
| t1014-abl |  overlapFix.ok,overlapFix.text | kv-vivid | 왼:nat 0px 0/– · 오른:nat 0px 0/– · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-gs2025 |  | kv-edge | 윗:cut 7px 0/0 | ✓ |
| t1014-gs2026 |  meltFix | kv-edge | 윗:cut 39px 0.01/0.3 잇는 중 | ✓ |
| t1014-lt | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| t1014-lt-v2 |  | kv-edge | 윗:cut 7px 0.01/0.04 | ✓ |
| t1014-lt-v3 | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| t1014-dongsuh |  cutFade | kv-vivid | 왼:nat 18px 0/0.55 잇는 중 · 윗:nat 0px 0/0.2 잇는 중 | ✓ |
| t1014-bionote-dog |  cutFade | kv-vivid | 왼:nat 21px 0/0.45 잇는 중 · 윗:nat 0px 0/0.53 잇는 중 | ✓ |
| t1014-bionote-cat |  overlapFix.ok,cutFade,overlapFix.text | kv-vivid | 오른:nat 0px 0/0.49 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-asan-illust |  | kv-edge | 윗:nat 8px 0/0.01 | ✓ |
| t1014-asan-photo | — | — | — | 제외: 지면 전체 그림(상자 없음) |
| t1014-jeil |  cutFade,objectBleed | kv-vivid | 왼:nat 0px 0/0.65 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-hanssem |  meltFix | kv-vivid-photo | 윗:cut 40px 0/0.31 잇는 중 | ✓ |
| t1014-hanssem-blocks |  | kv-vivid | 왼:nat 0px 0/0.39 잇는 중 · 윗:nat 0px (표본 부족(글자·로고 위)) | ✓ |
| t1014-hanjin |  | kv-vivid-photo | 윗:cut 40px 0.02/0.08 | ✓ |

## 지면색 일관성 (캠페인 = 케이스 단위)

- 사용자 10-20: 「배경색 일관되지 않게 나오는 것도 문제」(한진정보통신 × ABL 떼 누끼: 자소설 550·1200·750·네이버 DA 는 벽돌 빨강, 자소설 160×600·카카오 1200×600·네이버 300 은 청록 — 한 캠페인이 두 색). 규칙: **지면색은 캠페인 단위로 한 번** — 키비주얼·로고·손 지정으로 사다리를 한 번 타서 나온 지면(색·그라데이션)을 모든 규격이 공유하고, 규격별로는 규정이 강제할 때만 벗어난다(trace `field.deviation`).
- 셈법: 규격마다 루트 `data-trace` 의 `field.source`·`stops[0]`. **예외**(세지 않음) = `deviation`(solid-only 단색 규정 · mode-solid 사람이 단색 고정 · join-colour 이음매 줄 색 · object-slot 오브젝트 누끼 자리 · medium-light 매체 밝은 프로필), 그림이 곧 지면(photo-full·kv-texture·kv-frame·kv-full), 로고만 흰 카드, 투명. 나머지에서 source 종류 수 / 색 종류 수 — 목표 1/1.
- 결과: **1/1 인 케이스 107 / 107** (전 18 / 107)

| 케이스 | 유형 | 규격 | source/색 종류(전 → 후) | 다수파 | 소수파 규격(후) | 예외(후) |
|---|---|---|---|---|---|---|
| dongbu-flatbg | illust | 38+11 | 1/1 → 1/1 | kv-edge #102454 |  | logo-only 8 · no-field 3 |
| texture-dark | texture | 30+19 | 1/4 → 1/1 | kv-edge #284058 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| slabs-3d | illust | 34+15 | 1/3 → 1/1 | kv-edge #D6E6FB |  | logo-only 8 · no-field 3 · kv-as-field 4 |
| geo-3d | illust | 33+16 | 1/2 → 1/1 | kv-edge #DAE7FA |  | logo-only 8 · no-field 3 · kv-as-field 5 |
| samsung-3d | illust | 37+12 | 1/2 → 1/1 | kv-edge #EAF0FC |  | logo-only 8 · no-field 3 · kv-as-field 1 |
| gradient | texture | 30+19 | 1/2 → 1/1 | kv-edge #9CA1FE |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| fox-3d | illust | 38+11 | 1/1 → 1/1 | kv-edge #FFF7D3 |  | logo-only 8 · no-field 3 |
| ilhwa-dark | photo | 36+13 | 1/4 → 1/1 | kv-mood-dark #1A263F |  | logo-only 8 · no-field 3 · solid-only 2 |
| ilhwa-photo | photo | 36+13 | 1/3 → 1/1 | kv-vivid-photo #1A4493 |  | logo-only 8 · no-field 3 · solid-only 2 |
| ilhwa-roomy | photo | 36+13 | 1/4 → 1/1 | kv-vivid-photo #1A3E93 |  | logo-only 8 · no-field 3 · solid-only 2 |
| bc-illust | illust | 38+11 | 1/1 → 1/1 | kv-edge #FAF9FE |  | logo-only 8 · no-field 3 |
| fox-gradbg | illust | 38+11 | 1/3 → 1/1 | kv-edge #8C78DC |  | logo-only 8 · no-field 3 |
| dongbu_illust | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #9D6306 |  | logo-only 8 · no-field 3 · solid-only 2 |
| abl-group | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #2662D9 |  | logo-only 8 · no-field 3 · solid-only 2 |
| dongsuh-model | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #1A4293 |  | logo-only 8 · no-field 3 · solid-only 2 |
| fox-cutout | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #BC5A21 |  | logo-only 8 · no-field 3 · solid-only 2 |
| sep-open-recruit | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #1A6F93 |  | logo-only 8 · no-field 3 · solid-only 2 |
| hdot-wave | texture | 32+17 | 1/2 → 1/1 | kv-edge #2069CC |  | logo-only 8 · no-field 3 · kv-as-field 6 |
| hdot-purple3d | texture | 32+17 | 1/3 → 1/1 | kv-edge #341B73 |  | logo-only 8 · no-field 3 · kv-as-field 6 |
| hdot-hall | illust | 37+12 | 1/1 → 1/1 | kv-edge #0E0F10 |  | logo-only 8 · no-field 3 · kv-as-field 1 |
| hdot-speaker-a | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #BF5022 |  | logo-only 8 · no-field 3 · solid-only 2 |
| hdot-speaker-b | cutout | 36+13 | 1/3 → 1/1 | kv-vivid #933D1A |  | logo-only 8 · no-field 3 · solid-only 2 |
| hdot-seminar | photo | 30+19 | 1/4 → 1/1 | kv-mood-dark #141622 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| hdot-audience | photo | 30+19 | 1/4 → 1/1 | kv-mood-dark #53483F |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| hdot-asterisk | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #CE04D2 |  | logo-only 8 · no-field 3 · solid-only 2 |
| hr-doctor | photo | 36+13 | 1/2 → 1/1 | kv-vivid-photo #2650D9 |  | logo-only 8 · no-field 3 · solid-only 2 |
| hr-teamhands | photo | 36+13 | 1/2 → 1/1 | kv-vivid-photo #BF5622 |  | logo-only 8 · no-field 3 · solid-only 2 |
| hr-nurse-ai | photo | 36+13 | 1/2 → 1/1 | kv-vivid-photo #1A3993 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-cablebridge | photo | 36+13 | 1/3 → 1/1 | kv-vivid-photo #227BBF |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-stadium-wire | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #1D78A5 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-city | photo | 36+13 | 1/3 → 1/1 | kv-vivid-photo #2673D9 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-folder-blue | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #2651D9 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-folder-dark | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #7A7100 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-glass-folders | illust | 38+11 | 1/2 → 1/1 | kv-edge #CFD4E2 |  | logo-only 8 · no-field 3 |
| midas-acrylic-box | illust | 35+14 | 1/4 → 1/1 | kv-edge #030309 |  | logo-only 8 · no-field 3 · kv-as-field 1 · solid-only 2 |
| midas-cards-orange | illust | 31+18 | 1/4 → 1/1 | kv-edge #FBD15C |  | logo-only 8 · no-field 3 · kv-as-field 5 · solid-only 2 |
| midas-bridge-icons | illust | 38+11 | 1/1 → 1/1 | kv-edge #17132B |  | logo-only 8 · no-field 3 |
| midas-bridge-dark | illust | 31+18 | 1/4 → 1/1 | kv-edge #01020E |  | logo-only 8 · no-field 3 · kv-as-field 5 · solid-only 2 |
| midas-book-vib | illust | 37+12 | 1/2 → 1/1 | kv-edge #D7D8DE |  | logo-only 8 · no-field 3 · kv-as-field 1 |
| midas-book-open | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #262BD9 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-book-flow | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #207AB6 |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-book-sim | photo | 36+13 | 1/4 → 1/1 | kv-vivid-photo #9C671C |  | logo-only 8 · no-field 3 · solid-only 2 |
| midas-skyscraper | photo | 30+19 | 1/4 → 1/1 | kv-mood-dark #152B44 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| midas-facets | texture | 32+17 | 1/1 → 1/1 | kv-colour #1F6CF3 |  | logo-only 8 · no-field 3 · kv-as-field 6 |
| midas-glass-mint | cutout | 30+19 | 1/2 → 1/1 | kv-vivid #024EAB |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| midas-glass-dark | cutout | 30+19 | 1/2 → 1/1 | kv-vivid #1A4793 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| desk-01 | illust | 33+16 | 1/2 → 1/1 | kv-edge #010101 |  | logo-only 8 · no-field 3 · kv-as-field 5 |
| desk-02 | texture | 32+17 | 1/1 → 1/1 | kv-colour #87CAF9 |  | logo-only 8 · no-field 3 · kv-as-field 6 |
| desk-03 | illust | 36+13 | 1/3 → 1/1 | kv-edge #B8ACED |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-03-cut | cutout | 36+13 | 1/2 → 1/1 | kv-mood #B8ACED |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-04 | photo | 36+13 | 1/4 → 1/1 | kv-mood #5179B7 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-05 | photo | 36+13 | 1/4 → 1/1 | kv-mood-dark #31343E |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-06 | illust | 38+11 | 1/2 → 1/1 | kv-edge #02458B |  | logo-only 8 · no-field 3 |
| desk-07 | illust | 36+13 | 1/3 → 1/1 | kv-edge #C5AFC7 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-08 | illust | 38+11 | 1/2 → 1/1 | kv-edge #578BCB |  | logo-only 8 · no-field 3 |
| desk-09 | illust | 36+13 | 1/3 → 1/1 | kv-edge #C3EFEE |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-11 | illust | 36+13 | 1/3 → 1/1 | kv-edge #0162C7 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-12 | illust | 38+11 | 1/1 → 1/1 | kv-edge #21853D |  | logo-only 8 · no-field 3 |
| desk-13 | illust | 38+11 | 1/1 → 1/1 | kv-edge #EBF5FF |  | logo-only 8 · no-field 3 |
| desk-13-cut | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #0877C4 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-14 | illust | 38+11 | 1/1 → 1/1 | kv-edge #040417 |  | logo-only 8 · no-field 3 |
| desk-15 | illust | 38+11 | 1/1 → 1/1 | kv-edge #015AFF |  | logo-only 8 · no-field 3 |
| desk-15-cut | cutout | 36+13 | 1/2 → 1/1 | kv-mood #015AFF |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-16 | photo | 36+13 | 1/4 → 1/1 | kv-mood-dark #113F9E |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-17 | illust | 38+11 | 1/2 → 1/1 | kv-edge #1781E5 |  | logo-only 8 · no-field 3 |
| desk-18 | illust | 34+15 | 1/2 → 1/1 | kv-edge #F6FCF8 |  | logo-only 8 · no-field 3 · kv-as-field 4 |
| desk-18-cut | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #767004 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-19 | photo | 36+13 | 2/3 → 1/1 | kv-mood #2672FE |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-20 | illust | 38+11 | 1/1 → 1/1 | kv-edge #EBF5FF |  | logo-only 8 · no-field 3 |
| desk-20-cut | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #0B79C1 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-21 | illust | 36+13 | 1/2 → 1/1 | kv-edge #081A4E |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-22 | illust | 38+11 | 1/1 → 1/1 | kv-edge #010101 |  | logo-only 8 · no-field 3 |
| desk-22-cut | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #174196 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-23 | texture | 32+17 | 2/2 → 1/1 | kv-colour #8DE7F2 |  | logo-only 8 · no-field 3 · kv-as-field 6 |
| desk-24 | illust | 31+18 | 1/3 → 1/1 | kv-edge #6E97DD |  | join-colour 7 · logo-only 8 · no-field 3 |
| desk-25 | illust | 38+11 | 1/3 → 1/1 | kv-edge #1F2843 |  | logo-only 8 · no-field 3 |
| desk-26 | illust | 38+11 | 1/1 → 1/1 | kv-edge #EBF5FF |  | logo-only 8 · no-field 3 |
| desk-27 | photo | 36+13 | 1/2 → 1/1 | kv-vivid-photo #BD5821 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-28 | photo | 36+13 | 1/4 → 1/1 | kv-mood #1E4894 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-29 | illust | 38+11 | 1/2 → 1/1 | kv-edge #4AA7F8 |  | logo-only 8 · no-field 3 |
| desk-30 | illust | 28+21 | 1/1 → 1/1 | kv-edge #7499D1 |  | join-colour 7 · logo-only 8 · no-field 3 · kv-as-field 3 |
| desk-31 | photo | 30+19 | 1/4 → 1/1 | kv-mood-dark #0E4264 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| desk-32 | photo | 30+19 | 1/4 → 1/1 | kv-mood-dark #4F2815 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| desk-32-cut | cutout | 36+13 | 1/2 → 1/1 | kv-mood #836546 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-33 | photo | 36+13 | 1/2 → 1/1 | kv-vivid-photo #C723BB |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-34 | illust | 36+13 | 1/2 → 1/1 | kv-edge #111113 |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-35 | illust | 38+11 | 1/1 → 1/1 | kv-edge #E9E9E9 |  | logo-only 8 · no-field 3 |
| desk-35-cut | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #0502FD |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-36 | photo | 36+13 | 2/4 → 1/1 | kv-vivid-photo #1C7A9C |  | logo-only 8 · no-field 3 · solid-only 2 |
| desk-10 | illust | 38+11 | 1/3 → 1/1 | kv-edge #35314D |  | logo-only 8 · no-field 3 |
| desk-37 | illust | 35+14 | 1/3 → 1/1 | kv-edge #E45C01 |  | logo-only 8 · no-field 3 · kv-as-field 1 · solid-only 2 |
| desk-37-cut | cutout | 36+13 | 1/2 → 1/1 | kv-mood #D35501 |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-abl | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #DE3703 |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-gs2025 | illust | 34+15 | 1/1 → 1/1 | kv-edge #C6F3FF |  | logo-only 8 · no-field 3 · kv-as-field 4 |
| t1014-gs2026 | illust | 37+12 | 1/2 → 1/1 | kv-edge #046BB9 |  | logo-only 8 · no-field 3 · kv-as-field 1 |
| t1014-lt | photo | 32+17 | 1/3 → 1/1 | kv-mood-dark #121212 |  | logo-only 8 · no-field 3 · kv-as-field 6 |
| t1014-lt-v2 | illust | 36+13 | 1/3 → 1/1 | kv-edge #120434 |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-lt-v3 | photo | 30+19 | 1/4 → 1/1 | kv-mood-dark #861887 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| t1014-dongsuh | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #1A3693 |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-bionote-dog | cutout | 36+13 | 1/3 → 1/1 | kv-vivid #9C681C |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-bionote-cat | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #93441A |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-asan-illust | illust | 38+11 | 1/1 → 1/1 | kv-edge #4265CE |  | logo-only 8 · no-field 3 |
| t1014-asan-photo | photo | 30+19 | 1/3 → 1/1 | kv-mood-dark #4A6EE2 |  | logo-only 8 · no-field 3 · kv-as-field 6 · solid-only 2 |
| t1014-jeil | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #006DAD |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-hanssem | photo | 36+13 | 1/4 → 1/1 | kv-vivid-photo #9A551B |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-hanssem-blocks | cutout | 36+13 | 1/2 → 1/1 | kv-vivid #7F7810 |  | logo-only 8 · no-field 3 · solid-only 2 |
| t1014-hanjin | photo | 36+13 | 2/4 → 1/1 | kv-vivid-photo #1A6693 |  | logo-only 8 · no-field 3 · solid-only 2 |

