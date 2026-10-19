# 키비주얼 여백 전수조사 (kv-gap-audit)

- 생성: `node scripts/kv-gap-audit.mjs` · 2026-10-19 04:50 · 규격 49(추출 규격 중 전달물 제외) × 케이스 5
- 케이스: `t1014-abl` 여러 오브젝트·캐릭터 떼 · 덩어리 여럿 · 가로형 · `midas-glass-mint` 장식 프레임 누끼(가운데가 빈 유리 슬랩) · 주인공 39% · 어두운 바탕 · 어두운 지면 우선 · 전면 배경 · 가로형 · `dongbu_illust` 단일 사물 누끼 · 가로형 · `bc-illust` 배경과 엮인 장면 일러스트·3D · 가로형 · `t1014-hanssem` 꽉 찬 사진 · 가장자리 그라데이션 · 가로형
- 판정: 그림(누끼 contain 은 kvMeta.px 비율로 계산한 실제 그림, 사진 cover 는 칸) 오른쪽·아래 변이 캔버스 변에서 **2px 초과 ~ 변 길이 12% 이하** 떨어지면 ✗. 12% 넘으면 의도한 여백 ✓(수치 남김). 왼쪽/위(글자 쪽)는 안 잰다. 누끼 PNG 안의 투명 여백은 그림 사각형에 포함(원본 자산의 여백은 따로).
- 예외(✓, 수치는 남김): ① 매체 JSON `mold.image.edgeInset` — 템플릿 칸 자체가 안쪽(자소설 PC팝업 샘플 상자 오른 8·아래 30, 카카오 비즈보드 r10 상자 오른 53·아래 37) ② 캔버스 좌우 변에 다 닿는 전폭 띠 안에서 그림이 좌우 대칭 가운데(NAP 320×480 사용자 수정본도 좌우 25/25) — 「한쪽이 비는」 틈이 아님.
- 결과: **✗ 5건** / 측정 172 · 제외 73(로고만 규격 40 · visualOnly 30 · 오브젝트 없음(bg) 1 · 키비주얼 없음(kvUse none) 2)

## ✗ 목록

| 규격 | 케이스 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 사유 |
|---|---|---|---|---|---|---|
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-abl | (554,262) 443×278 | (554.3,262) 442.7×278 contain | 253 | 20 | 칸이 변에서 떨어짐 |
| naver-gfa-mobile-da-1250x560 1250×560 | midas-glass-mint | (553,301) 444×239 | (553.2,301) 443.8×239 contain | 253 | 20 | 칸이 변에서 떨어짐 |
| naver-gfa-mobile-da-1250x560 1250×560 | dongbu_illust | (622,262) 375×278 | (622,262.4) 375×277.6 contain | 253 | 20 | 칸이 변에서 떨어짐 |
| naver-gfa-mobile-da-1250x560 1250×560 | bc-illust | (553,262) 444×278 | (553,262) 444×278 cover | 253 | 20 | 칸이 변에서 떨어짐 |
| naver-gfa-mobile-da-1250x560 1250×560 | t1014-hanssem | (553,262) 444×278 | (553,262) 444×278 cover | 253 | 20 | 칸이 변에서 떨어짐 |

## 규격 × 케이스 전체

칸 = `data-object` 실제 상자 · 그림 = 배경 size/position 으로 계산한 그림 사각형(fit) · 틈 = 캔버스 변까지(오른쪽/아래, 보이는 그림 기준) · 괄호는 칸 기준 틈.


### 자소설닷컴 · PC프리미엄패키지 - PC팝업배너 `jasoseol-pc-premium-popup-pc` 550×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (293,214) 249×156 | (293.6,214) 248.4×156 contain | 8 (8) | 30 (30) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 8·bottom 30) |

### 자소설닷컴 · PC프리미엄패키지 - PC채용공고배너 `jasoseol-pc-premium-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (0,400) 160×200 | (0,499.5) 160×100.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC스탠다드패키지 - PC메인배너 `jasoseol-pc-standard-main-pc` 1200×280

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (0,0) 350×280 | (0,60.2) 350×219.8 contain | 850 (850) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 자소설닷컴 · PC스탠다드패키지 - PC채용공고배너 `jasoseol-pc-standard-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (0,400) 160×200 | (0,499.5) 160×100.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M팝업배너 `jasoseol-m-premium-popup-mo` 600×880

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (0,544) 600×336 | (32.4,544) 535.1×336 contain | 32.4 (0) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 32.4 = 우 32.4) |

### 자소설닷컴 · M프리미엄패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-premium-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · M스탠다드패키지 - M메인배너 `jasoseol-m-standard-main-mo` 750×500

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (376,265) 374×235 | (376,265.2) 374×234.8 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M스탠다드패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-standard-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · PC달력배너 (채용달력 좌측 게재) `jasoseol-pc-calendar-pc` 164×233

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (0,153) 164×80 | (18.3,153) 127.4×80 contain | 18.3 (0) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 18.3 = 우 18.3) |

### 리멤버 · 메인 상단 배너 (PC) `remember-main-top-pc` 2240×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (1088,0) 1152×360 | (1666.7,0) 573.3×360 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (Mobile/APP) `remember-main-top-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (571,0) 434×360 | (571,87.5) 434×272.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (PC) `remember-main-mid-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1857.8,0) 382.2×240 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (Mobile/APP) `remember-main-mid-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (570,0) 435×360 | (570,86.9) 435×273.1 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (PC) `remember-job-top-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1857.8,0) 382.2×240 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (Mobile/APP) `remember-job-top-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (685.5,0) 439.5×276 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (PC) `remember-job-side-pc` 530×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (295,0) 235×200 | (295,52.4) 235×147.6 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (Mobile/APP) `remember-job-side-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (685.5,0) 439.5×276 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (PC) `jobda-main-pc` 792×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (537,0) 255×240 | (537,79.9) 255×160.1 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (MO) `jobda-main-mo` 343×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (226,0) 117×160 | (226,86.5) 117×73.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 캐치 · 중앙(메인 대형) 배너 오브젝트형 — PC 이미지(BG Img) `catch-center-object-pc` 515×315

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙(메인 대형) 배너 — MO 이미지(BG Img) `catch-center-object-mo` 622×380

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙 배너 MO 로고 `catch-center-logo-mo` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 구글 GDN · GDN 고정 배너 580×400 `google-gdn-580x400` 580×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (297,229) 283×178 | (297,229.3) 283×177.7 contain | 0 (0) | 0 (-7) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 970×250 `google-gdn-970x250` 970×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (655,52) 315×198 | (655,52.2) 315×197.8 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×600 `google-gdn-300x600` 300×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (-49,351) 397×249 | (-48.8,351) 396.5×249 contain | 0 (-48) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×1050 `google-gdn-300x1050` 300×1050

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (0,689) 300×361 | (0,861.6) 300×188.4 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×50 (2배 추출 640×100) `nap-dsp-band-320x50` 320×50

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (236,0) 84×50 | (240.4,0) 79.6×50 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×100 `nap-dsp-band-320x100` 320×100

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (193,0) 127×100 | (193,20.3) 127×79.7 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 300×250 `nap-dsp-full-300x250` 300×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (158,161) 142×89 | (158.3,161) 141.7×89 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 320×480 (2배 추출 640×960) `nap-dsp-full-320x480` 320×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (0,297) 320×183 | (14.3,297) 291.4×183 contain | 14.3 (0) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 14.3 = 우 14.3) |

### 인스타그램 · 인스타그램 피드 (기본형 1080×1080) `instagram-feed-1080` 1080×1080

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (295,587) 785×493 | (295,587.1) 785×492.9 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 비즈보드 (MO) `kakao-bizboard-mo` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.font | (681,36) 295×185 | (681.4,36) 294.6×185 contain | 53 (53) | 37 (37) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 53·bottom 37) |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 홍보이미지 `kakao-display-pc-promo` 1200×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (818,0) 382×600 | (818,360.1) 382×239.9 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 프로필이미지 `kakao-display-pc-profile` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 네이버 GFA · 모바일 DA 이미지형 1250×560 (성과형: 네이버 메인·서비스 통합 / 보장형: 브랜딩DA·M통합DA) `naver-gfa-mobile-da-1250x560` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.labelCol | (554,262) 443×278 | (554.3,262) 442.7×278 contain | 253 (253) | 20 (20) | ✗ 칸이 변에서 떨어짐 |

### 네이버 GFA · M통합 네이티브 DA (모바일) 썸네일 342×228 `naver-gfa-native-mo-342x228` 342×228

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: visualOnly |

### 네이버 GFA · M통합 네이티브 DA 광고주 로고 썸네일(프로필 이미지) 300×300 `naver-gfa-native-mo-profile-300` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 커뮤니티 보드 `everytime-community-board` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (666,0) 363×258 | (666,30.1) 363×227.9 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 커뮤니티 네이티브 (썸네일 이미지) `everytime-community-native` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 홈 배너 `everytime-home-banner` 640×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.freeKv | (406,0) 234×200 | (406,53.1) 234×146.9 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 홈 카드 — 프로필 이미지 `everytime-home-card-profile` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 홈 카드 — 카드 이미지 `everytime-home-card-image` 720×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold,templateMold.logoArea | (329,234) 401×252 | (329,234.2) 401×251.8 contain | 0 (-10) | 0 (-6) | ✓ 붙음 |

### 에브리타임 · 공모전·대외활동·채용 정보 — 카드 이미지 `everytime-contest-card` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 검색 키워드 — 썸네일 이미지 `everytime-search-keyword-thumb` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 데일리 메시지 — 프로필 이미지 `everytime-daily-message-profile` 120×120

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 브랜드 로고 (피드 이미지 광고용) `blind-brand-logo` 96×96

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 피드 이미지 광고 (채용채널&피드광고 / 홈피드광고) `blind-feed-image` 1200×628

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (773,361) 427×268 | (773.2,361) 426.8×268 contain | 0 (0) | 0 (-1) | ✓ 붙음 |

### 블라인드 · 게시글 배너·댓글 배너 (보드 표기: 게시글 배너, 띠 배너) `blind-post-banner` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl | templateMold templateMold | (852,310) 398×250 | (852,310.1) 398×249.9 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 당근 · 네이티브 피드 광고 (이미지 유형) `daangn-native-feed-image` 200×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-abl |  | (0,90) 200×110 | (12.4,90) 175.2×110 contain | 12.4 (0) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 12.4 = 우 12.4) |

### 자소설닷컴 · PC프리미엄패키지 - PC팝업배너 `jasoseol-pc-premium-popup-pc` 550×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (293,236) 249×134 | (293.2,236) 248.8×134 contain | 8 (8) | 30 (30) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 8·bottom 30) |

### 자소설닷컴 · PC프리미엄패키지 - PC채용공고배너 `jasoseol-pc-premium-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (0,400) 160×200 | (0,513.8) 160×86.2 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC스탠다드패키지 - PC메인배너 `jasoseol-pc-standard-main-pc` 1200×280

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (0,0) 350×280 | (0,91.5) 350×188.5 contain | 850 (850) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 자소설닷컴 · PC스탠다드패키지 - PC채용공고배너 `jasoseol-pc-standard-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (0,400) 160×200 | (0,513.8) 160×86.2 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M팝업배너 `jasoseol-m-premium-popup-mo` 600×880

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (0,557) 600×323 | (0.1,557) 599.7×323 contain | 0.1 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-premium-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · M스탠다드패키지 - M메인배너 `jasoseol-m-standard-main-mo` 750×500

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (376,299) 374×201 | (376.8,299) 373.2×201 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M스탠다드패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-standard-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · PC달력배너 (채용달력 좌측 게재) `jasoseol-pc-calendar-pc` 164×233

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (0,153) 164×80 | (7.7,153) 148.5×80 contain | 7.7 (0) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 7.7 = 우 7.7) |

### 리멤버 · 메인 상단 배너 (PC) `remember-main-top-pc` 2240×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (1088,0) 1152×360 | (1571.6,0) 668.4×360 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (Mobile/APP) `remember-main-top-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (571,0) 434×360 | (571,126.3) 434×233.7 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (PC) `remember-main-mid-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1794.4,0) 445.6×240 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (Mobile/APP) `remember-main-mid-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (570,0) 435×360 | (570,125.7) 435×234.3 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (PC) `remember-job-top-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1794.4,0) 445.6×240 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (Mobile/APP) `remember-job-top-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (612.5,0) 512.5×276 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (PC) `remember-job-side-pc` 530×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (295,0) 235×200 | (295,73.4) 235×126.6 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (Mobile/APP) `remember-job-side-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (612.5,0) 512.5×276 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (PC) `jobda-main-pc` 792×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (537,0) 255×240 | (537,102.7) 255×137.3 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (MO) `jobda-main-mo` 343×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (226,0) 117×160 | (226,97) 117×63 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 캐치 · 중앙(메인 대형) 배너 오브젝트형 — PC 이미지(BG Img) `catch-center-object-pc` 515×315

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙(메인 대형) 배너 — MO 이미지(BG Img) `catch-center-object-mo` 622×380

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙 배너 MO 로고 `catch-center-logo-mo` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 구글 GDN · GDN 고정 배너 580×400 `google-gdn-580x400` 580×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (297,255) 283×152 | (297.8,255) 282.2×152 contain | 0 (0) | 0 (-7) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 970×250 `google-gdn-970x250` 970×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (654,80) 316×170 | (654.3,80) 315.7×170 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×600 `google-gdn-300x600` 300×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (-49,386) 397×214 | (-49,386.2) 397×213.8 contain | 0 (-48) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×1050 `google-gdn-300x1050` 300×1050

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (0,689) 300×361 | (0,888.4) 300×161.6 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×50 (2배 추출 640×100) `nap-dsp-band-320x50` 320×50

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (236,0) 84×50 | (236,4.8) 84×45.2 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×100 `nap-dsp-band-320x100` 320×100

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (193,0) 127×100 | (193,31.6) 127×68.4 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 300×250 `nap-dsp-full-300x250` 300×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (158,174) 142×76 | (158.9,174) 141.1×76 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 320×480 (2배 추출 640×960) `nap-dsp-full-320x480` 320×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea | (0,308) 320×172 | (0.3,308) 319.4×172 contain | 0.3 (0) | 0 (0) | ✓ 붙음 |

### 인스타그램 · 인스타그램 피드 (기본형 1080×1080) `instagram-feed-1080` 1080×1080

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (262,639) 818×441 | (262,639.5) 818×440.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 비즈보드 (MO) `kakao-bizboard-mo` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.font | (663,52) 313×169 | (663,52.4) 313×168.6 contain | 53 (53) | 37 (37) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 53·bottom 37) |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 홍보이미지 `kakao-display-pc-promo` 1200×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (818,0) 382×600 | (818,394.3) 382×205.7 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 프로필이미지 `kakao-display-pc-profile` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 네이버 GFA · 모바일 DA 이미지형 1250×560 (성과형: 네이버 메인·서비스 통합 / 보장형: 브랜딩DA·M통합DA) `naver-gfa-mobile-da-1250x560` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.labelCol | (553,301) 444×239 | (553.2,301) 443.8×239 contain | 253 (253) | 20 (20) | ✗ 칸이 변에서 떨어짐 |

### 네이버 GFA · M통합 네이티브 DA (모바일) 썸네일 342×228 `naver-gfa-native-mo-342x228` 342×228

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: visualOnly |

### 네이버 GFA · M통합 네이티브 DA 광고주 로고 썸네일(프로필 이미지) 300×300 `naver-gfa-native-mo-profile-300` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 커뮤니티 보드 `everytime-community-board` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (666,0) 363×258 | (666,62.5) 363×195.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 커뮤니티 네이티브 (썸네일 이미지) `everytime-community-native` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 홈 배너 `everytime-home-banner` 640×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.freeKv | (406,0) 234×200 | (406,74) 234×126 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 홈 카드 — 프로필 이미지 `everytime-home-card-profile` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 홈 카드 — 카드 이미지 `everytime-home-card-image` 720×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold,templateMold.logoArea,templateMold.plainLabel | (329,270) 401×216 | (329,270) 401×216 contain | 0 (-10) | 0 (-6) | ✓ 붙음 |

### 에브리타임 · 공모전·대외활동·채용 정보 — 카드 이미지 `everytime-contest-card` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 검색 키워드 — 썸네일 이미지 `everytime-search-keyword-thumb` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 데일리 메시지 — 프로필 이미지 `everytime-daily-message-profile` 120×120

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 브랜드 로고 (피드 이미지 광고용) `blind-brand-logo` 96×96

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 피드 이미지 광고 (채용채널&피드광고 / 홈피드광고) `blind-feed-image` 1200×628

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (773,399) 427×230 | (773,399) 427×230 contain | 0 (0) | 0 (-1) | ✓ 붙음 |

### 블라인드 · 게시글 배너·댓글 배너 (보드 표기: 게시글 배너, 띠 배너) `blind-post-banner` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | templateMold templateMold | (852,346) 398×214 | (852.6,346) 397.4×214 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 당근 · 네이티브 피드 광고 (이미지 유형) `daangn-native-feed-image` 200×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| midas-glass-mint | — | — | — | — | — | 제외: 오브젝트 없음(bg) |

### 자소설닷컴 · PC프리미엄패키지 - PC팝업배너 `jasoseol-pc-premium-popup-pc` 550×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (295,187) 247×183 | (295,187.1) 247×182.9 contain | 8 (8) | 30 (30) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 8·bottom 30) |

### 자소설닷컴 · PC프리미엄패키지 - PC채용공고배너 `jasoseol-pc-premium-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,400) 160×200 | (0,481.5) 160×118.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC스탠다드패키지 - PC메인배너 `jasoseol-pc-standard-main-pc` 1200×280

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,0) 350×280 | (0,20.9) 350×259.1 contain | 850 (850) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 자소설닷컴 · PC스탠다드패키지 - PC채용공고배너 `jasoseol-pc-standard-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,400) 160×200 | (0,481.5) 160×118.5 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M팝업배너 `jasoseol-m-premium-popup-mo` 600×880

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,669) 600×211 | (157.5,669) 285×211 native | 157.5 (0) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 자소설닷컴 · M프리미엄패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-premium-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · M스탠다드패키지 - M메인배너 `jasoseol-m-standard-main-mo` 750×500

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed | (377,183) 373×317 | (377,183) 428×316.9 autoW | 0 (0) | 0.1 (0) | ✓ 붙음 |

### 자소설닷컴 · M스탠다드패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-standard-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · PC달력배너 (채용달력 좌측 게재) `jasoseol-pc-calendar-pc` 164×233

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,153) 164×80 | (28,153) 108.1×80 contain | 28 (0) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 리멤버 · 메인 상단 배너 (PC) `remember-main-top-pc` 2240×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (1088,0) 1152×360 | (1753.7,0) 486.3×360 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (Mobile/APP) `remember-main-top-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (571,0) 434×360 | (571,38.7) 434×321.3 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (PC) `remember-main-mid-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1915.8,0) 324.2×240 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (Mobile/APP) `remember-main-mid-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (570,0) 435×360 | (570,37.9) 435×322.1 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (PC) `remember-job-top-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1915.8,0) 324.2×240 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (Mobile/APP) `remember-job-top-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (752.2,0) 372.8×276 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (PC) `remember-job-side-pc` 530×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (295,0) 235×200 | (295,26) 235×174 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (Mobile/APP) `remember-job-side-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (752.2,0) 372.8×276 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (PC) `jobda-main-pc` 792×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (537,0) 255×240 | (537,51.2) 255×188.8 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (MO) `jobda-main-mo` 343×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (226,0) 117×160 | (226,73.4) 117×86.6 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 캐치 · 중앙(메인 대형) 배너 오브젝트형 — PC 이미지(BG Img) `catch-center-object-pc` 515×315

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙(메인 대형) 배너 — MO 이미지(BG Img) `catch-center-object-mo` 622×380

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙 배너 MO 로고 `catch-center-logo-mo` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 구글 GDN · GDN 고정 배너 580×400 `google-gdn-580x400` 580×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed | (298,229) 282×171 | (298,229) 299×221.4 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 970×250 `google-gdn-970x250` 970×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed | (656,52) 314×198 | (656,52) 346×256.2 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×600 `google-gdn-300x600` 300×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (-49,389) 397×211 | (7,389) 285×211 native | 8 (-48) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 7 = 우 8) |

### 구글 GDN · GDN 고정 배너 300×1050 `google-gdn-300x1050` 300×1050

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,828) 300×222 | (0.1,828) 299.9×222 contain | 0.1 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×50 (2배 추출 640×100) `nap-dsp-band-320x50` 320×50

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (236,0) 84×50 | (252.5,0) 67.5×50 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×100 `nap-dsp-band-320x100` 320×100

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (193,0) 127×100 | (193,6) 127×94 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 300×250 `nap-dsp-full-300x250` 300×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed | (158,161) 142×89 | (158,161) 156×115.5 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 320×480 (2배 추출 640×960) `nap-dsp-full-320x480` 320×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (0,297) 320×183 | (36.4,297) 247.2×183 contain | 36.4 (0) | 0 (0) | ✓ 전폭 띠 가운데 대칭(좌 36.4 = 우 36.4) |

### 인스타그램 · 인스타그램 피드 (기본형 1080×1080) `instagram-feed-1080` 1080×1080

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold | (414,587) 666×493 | (414.1,587) 665.9×493 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 비즈보드 (MO) `kakao-bizboard-mo` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.font | (726,36) 250×185 | (726.1,36) 249.9×185 contain | 53 (53) | 37 (37) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 53·bottom 37) |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 홍보이미지 `kakao-display-pc-promo` 1200×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (818,0) 382×600 | (818,317.2) 382×282.8 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 프로필이미지 `kakao-display-pc-profile` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 네이버 GFA · 모바일 DA 이미지형 1250×560 (성과형: 네이버 메인·서비스 통합 / 보장형: 브랜딩DA·M통합DA) `naver-gfa-mobile-da-1250x560` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.labelCol | (622,262) 375×278 | (622,262.4) 375×277.6 contain | 253 (253) | 20 (20) | ✗ 칸이 변에서 떨어짐 |

### 네이버 GFA · M통합 네이티브 DA (모바일) 썸네일 342×228 `naver-gfa-native-mo-342x228` 342×228

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: visualOnly |

### 네이버 GFA · M통합 네이티브 DA 광고주 로고 썸네일(프로필 이미지) 300×300 `naver-gfa-native-mo-profile-300` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 커뮤니티 보드 `everytime-community-board` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (666,0) 363×258 | (680.5,0) 348.5×258 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 커뮤니티 네이티브 (썸네일 이미지) `everytime-community-native` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 홈 배너 `everytime-home-banner` 640×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold templateMold,templateMold.freeKv | (406,0) 234×200 | (406,26.8) 234×173.2 contain | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 홈 카드 — 프로필 이미지 `everytime-home-card-profile` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 홈 카드 — 카드 이미지 `everytime-home-card-image` 720×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed,templateMold.plainLabel | (331,228) 389×252 | (331,228) 420×310.9 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 공모전·대외활동·채용 정보 — 카드 이미지 `everytime-contest-card` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 검색 키워드 — 썸네일 이미지 `everytime-search-keyword-thumb` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 데일리 메시지 — 프로필 이미지 `everytime-daily-message-profile` 120×120

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 브랜드 로고 (피드 이미지 광고용) `blind-brand-logo` 96×96

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 피드 이미지 광고 (채용채널&피드광고 / 홈피드광고) `blind-feed-image` 1200×628

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed | (780,329) 420×299 | (780,329) 428×316.9 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### 블라인드 · 게시글 배너·댓글 배너 (보드 표기: 게시글 배너, 띠 배너) `blind-post-banner` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust | templateMold objectBleed,templateMold,templateMold.slotBleed | (856,281) 394×279 | (856,281) 425×314.6 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### 당근 · 네이티브 피드 광고 (이미지 유형) `daangn-native-feed-image` 200×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| dongbu_illust |  objectBleed | (60,97) 140×103 | (60,97) 180×133.3 autoW | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC프리미엄패키지 - PC팝업배너 `jasoseol-pc-premium-popup-pc` 550×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.slotCover | (293,187) 249×183 | (293,187) 249×183 cover | 8 (8) | 30 (30) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 8·bottom 30) |

### 자소설닷컴 · PC프리미엄패키지 - PC채용공고배너 `jasoseol-pc-premium-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand | (0,400) 160×200 | (0,400) 160×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC스탠다드패키지 - PC메인배너 `jasoseol-pc-standard-main-pc` 1200×280

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand | (0,0) 350×280 | (0,0) 350×280 cover | 850 (850) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 자소설닷컴 · PC스탠다드패키지 - PC채용공고배너 `jasoseol-pc-standard-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand | (0,400) 160×200 | (0,400) 160×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M팝업배너 `jasoseol-m-premium-popup-mo` 600×880

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand | (0,544) 600×336 | (0,544) 600×336 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-premium-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · M스탠다드패키지 - M메인배너 `jasoseol-m-standard-main-mo` 750×500

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.slotCover | (376,160) 374×340 | (376,160) 374×340 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M스탠다드패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-standard-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · PC달력배너 (채용달력 좌측 게재) `jasoseol-pc-calendar-pc` 164×233

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand | (0,153) 164×80 | (0,153) 164×80 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (PC) `remember-main-top-pc` 2240×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (1088,0) 1152×360 | (1088,0) 1152×360 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (Mobile/APP) `remember-main-top-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (571,0) 434×360 | (571,0) 434×360 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (PC) `remember-main-mid-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (1060,0) 1180×240 | (1060,0) 1180×240 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (Mobile/APP) `remember-main-mid-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (570,0) 435×360 | (570,0) 435×360 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (PC) `remember-job-top-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (1060,0) 1180×240 | (1060,0) 1180×240 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (Mobile/APP) `remember-job-top-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (569,0) 556×276 | (569,0) 556×276 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (PC) `remember-job-side-pc` 530×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (295,0) 235×200 | (295,0) 235×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (Mobile/APP) `remember-job-side-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (569,0) 556×276 | (569,0) 556×276 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (PC) `jobda-main-pc` 792×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.freeKv | (537,0) 255×240 | (537,0) 255×240 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (MO) `jobda-main-mo` 343×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold | (226,0) 117×160 | (226,0) 117×160 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 캐치 · 중앙(메인 대형) 배너 오브젝트형 — PC 이미지(BG Img) `catch-center-object-pc` 515×315

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙(메인 대형) 배너 — MO 이미지(BG Img) `catch-center-object-mo` 622×380

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙 배너 MO 로고 `catch-center-logo-mo` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 구글 GDN · GDN 고정 배너 580×400 `google-gdn-580x400` 580×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover | (297,229) 283×178 | (297,229) 283×178 cover | 0 (0) | 0 (-7) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 970×250 `google-gdn-970x250` 970×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover | (654,52) 316×198 | (654,52) 316×198 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×600 `google-gdn-300x600` 300×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold | (-49,351) 397×249 | (-49,351) 397×249 cover | 0 (-48) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×1050 `google-gdn-300x1050` 300×1050

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold | (0,689) 300×361 | (0,689) 300×361 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×50 (2배 추출 640×100) `nap-dsp-band-320x50` 320×50

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold | (236,0) 84×50 | (236,0) 84×50 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×100 `nap-dsp-band-320x100` 320×100

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold | (193,0) 127×100 | (193,0) 127×100 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 300×250 `nap-dsp-full-300x250` 300×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover | (158,161) 142×89 | (158,161) 142×89 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 320×480 (2배 추출 640×960) `nap-dsp-full-320x480` 320×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold | (0,297) 320×183 | (0,297) 320×183 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 인스타그램 · 인스타그램 피드 (기본형 1080×1080) `instagram-feed-1080` 1080×1080

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover | (262,587) 818×493 | (262,587) 818×493 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 비즈보드 (MO) `kakao-bizboard-mo` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | (663,36) 313×185 | (663,36) 313×185 cover | 53 (53) | 37 (37) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 53·bottom 37) |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 홍보이미지 `kakao-display-pc-promo` 1200×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,textColour.brand,templateMold.freeKv | (818,0) 382×600 | (818,0) 382×600 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 프로필이미지 `kakao-display-pc-profile` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 네이버 GFA · 모바일 DA 이미지형 1250×560 (성과형: 네이버 메인·서비스 통합 / 보장형: 브랜딩DA·M통합DA) `naver-gfa-mobile-da-1250x560` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover,templateMold.labelCol | (553,262) 444×278 | (553,262) 444×278 cover | 253 (253) | 20 (20) | ✗ 칸이 변에서 떨어짐 |

### 네이버 GFA · M통합 네이티브 DA (모바일) 썸네일 342×228 `naver-gfa-native-mo-342x228` 342×228

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: visualOnly |

### 네이버 GFA · M통합 네이티브 DA 광고주 로고 썸네일(프로필 이미지) 300×300 `naver-gfa-native-mo-profile-300` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 커뮤니티 보드 `everytime-community-board` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 키비주얼 없음(kvUse none) |

### 에브리타임 · 커뮤니티 네이티브 (썸네일 이미지) `everytime-community-native` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 홈 배너 `everytime-home-banner` 640×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.freeKv | (406,0) 234×200 | (406,0) 234×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 홈 카드 — 프로필 이미지 `everytime-home-card-profile` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 홈 카드 — 카드 이미지 `everytime-home-card-image` 720×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover,templateMold.plainLabel | (329,228) 401×258 | (329,228) 401×258 cover | 0 (-10) | 0 (-6) | ✓ 붙음 |

### 에브리타임 · 공모전·대외활동·채용 정보 — 카드 이미지 `everytime-contest-card` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 검색 키워드 — 썸네일 이미지 `everytime-search-keyword-thumb` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 데일리 메시지 — 프로필 이미지 `everytime-daily-message-profile` 120×120

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 브랜드 로고 (피드 이미지 광고용) `blind-brand-logo` 96×96

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 피드 이미지 광고 (채용채널&피드광고 / 홈피드광고) `blind-feed-image` 1200×628

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover | (773,329) 427×300 | (773,329) 427×300 cover | 0 (0) | 0 (-1) | ✓ 붙음 |

### 블라인드 · 게시글 배너·댓글 배너 (보드 표기: 게시글 배너, 띠 배너) `blind-post-banner` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust | templateMold templateMold,templateMold.slotCover | (852,281) 398×279 | (852,281) 398×279 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 당근 · 네이티브 피드 광고 (이미지 유형) `daangn-native-feed-image` 200×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| bc-illust |  | (0,128) 200×72 | (0,128) 200×72 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC프리미엄패키지 - PC팝업배너 `jasoseol-pc-premium-popup-pc` 550×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | (293,187) 249×183 | (293,187) 249×183 cover | 8 (8) | 30 (30) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 8·bottom 30) |

### 자소설닷컴 · PC프리미엄패키지 - PC채용공고배너 `jasoseol-pc-premium-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (0,400) 160×200 | (0,400) 160×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · PC스탠다드패키지 - PC메인배너 `jasoseol-pc-standard-main-pc` 1200×280

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (0,0) 350×280 | (0,0) 350×280 cover | 850 (850) | 0 (0) | ✓ 의도한 여백(12% 초과) |

### 자소설닷컴 · PC스탠다드패키지 - PC채용공고배너 `jasoseol-pc-standard-jobpost-pc` 160×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (0,400) 160×200 | (0,400) 160×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M팝업배너 `jasoseol-m-premium-popup-mo` 600×880

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (0,544) 600×336 | (0,544) 600×336 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M프리미엄패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-premium-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · M스탠다드패키지 - M메인배너 `jasoseol-m-standard-main-mo` 750×500

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover | (376,160) 374×340 | (376,160) 374×340 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 자소설닷컴 · M스탠다드패키지 - M채팅목록배너 로고 (PDF 명칭: M텍스트배너) `jasoseol-m-standard-chatlist-logo-mo` 300×180

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 자소설닷컴 · PC달력배너 (채용달력 좌측 게재) `jasoseol-pc-calendar-pc` 164×233

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold | (0,153) 164×80 | (0,153) 164×80 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (PC) `remember-main-top-pc` 2240×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (1088,0) 1152×360 | (1088,0) 1152×360 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 상단 배너 (Mobile/APP) `remember-main-top-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (571,0) 434×360 | (571,0) 434×360 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (PC) `remember-main-mid-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1060,0) 1180×240 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 메인 중간 배너 (Mobile/APP) `remember-main-mid-mo` 1005×360

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (570,0) 435×360 | (570,0) 435×360 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (PC) `remember-job-top-pc` 2240×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (1060,0) 1180×240 | (1060,0) 1180×240 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 상단 배너 (Mobile/APP) `remember-job-top-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (569,0) 556×276 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (PC) `remember-job-side-pc` 530×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (295,0) 235×200 | (295,0) 235×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 리멤버 · 공고 상세 사이드 배너 (Mobile/APP) `remember-job-side-mo` 1125×276

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (569,0) 556×276 | (569,0) 556×276 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (PC) `jobda-main-pc` 792×240

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (537,0) 255×240 | (537,0) 255×240 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 잡다 · 잡다 메인 배너 (MO) `jobda-main-mo` 343×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold | (226,0) 117×160 | (226,0) 117×160 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 캐치 · 중앙(메인 대형) 배너 오브젝트형 — PC 이미지(BG Img) `catch-center-object-pc` 515×315

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙(메인 대형) 배너 — MO 이미지(BG Img) `catch-center-object-mo` 622×380

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: visualOnly |

### 캐치 · 중앙 배너 MO 로고 `catch-center-logo-mo` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 구글 GDN · GDN 고정 배너 580×400 `google-gdn-580x400` 580×400

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover | (297,229) 283×178 | (297,229) 283×178 cover | 0 (0) | 0 (-7) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 970×250 `google-gdn-970x250` 970×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover | (654,52) 316×198 | (654,52) 316×198 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×600 `google-gdn-300x600` 300×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold | (-49,358) 397×242 | (-49,358.1) 397×241.9 contain | 0 (-48) | 0 (0) | ✓ 붙음 |

### 구글 GDN · GDN 고정 배너 300×1050 `google-gdn-300x1050` 300×1050

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold | (0,689) 300×361 | (0,689) 300×361 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×50 (2배 추출 640×100) `nap-dsp-band-320x50` 320×50

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (236,0) 84×50 | (236,0) 84×50 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 띠배너 320×100 `nap-dsp-band-320x100` 320×100

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (193,0) 127×100 | (193,0) 127×100 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 300×250 `nap-dsp-full-300x250` 300×250

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea,templateMold.slotCover | (158,161) 142×89 | (158,161) 142×89 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### NAP DSP (나스미디어) · 전면배너 320×480 (2배 추출 640×960) `nap-dsp-full-320x480` 320×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea | (0,297) 320×183 | (0,297) 320×183 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 인스타그램 · 인스타그램 피드 (기본형 1080×1080) `instagram-feed-1080` 1080×1080

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover | (262,587) 818×493 | (262,587) 818×493 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 비즈보드 (MO) `kakao-bizboard-mo` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotRound,templateMold.slotCover,templateMold.font | (663,36) 313×185 | (663,36) 313×185 cover | 53 (53) | 37 (37) | ✓ 템플릿 칸 안쪽(의도, edgeInset right 53·bottom 37) |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 홍보이미지 `kakao-display-pc-promo` 1200×600

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (818,0) 382×600 | (818,0) 382×600 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 카카오톡 · 카카오 디스플레이 광고 (PC) — 프로필이미지 `kakao-display-pc-profile` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 네이버 GFA · 모바일 DA 이미지형 1250×560 (성과형: 네이버 메인·서비스 통합 / 보장형: 브랜딩DA·M통합DA) `naver-gfa-mobile-da-1250x560` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover,templateMold.labelCol | (553,262) 444×278 | (553,262) 444×278 cover | 253 (253) | 20 (20) | ✗ 칸이 변에서 떨어짐 |

### 네이버 GFA · M통합 네이티브 DA (모바일) 썸네일 342×228 `naver-gfa-native-mo-342x228` 342×228

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: visualOnly |

### 네이버 GFA · M통합 네이티브 DA 광고주 로고 썸네일(프로필 이미지) 300×300 `naver-gfa-native-mo-profile-300` 300×300

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 커뮤니티 보드 `everytime-community-board` 1029×258

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 키비주얼 없음(kvUse none) |

### 에브리타임 · 커뮤니티 네이티브 (썸네일 이미지) `everytime-community-native` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 홈 배너 `everytime-home-banner` 640×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.freeKv | (406,0) 234×200 | (406,0) 234×200 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 에브리타임 · 홈 카드 — 프로필 이미지 `everytime-home-card-profile` 160×160

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 에브리타임 · 홈 카드 — 카드 이미지 `everytime-home-card-image` 720×480

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.logoArea,templateMold.slotCover,templateMold.plainLabel | (329,228) 401×258 | (329,228) 401×258 cover | 0 (-10) | 0 (-6) | ✓ 붙음 |

### 에브리타임 · 공모전·대외활동·채용 정보 — 카드 이미지 `everytime-contest-card` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 검색 키워드 — 썸네일 이미지 `everytime-search-keyword-thumb` 288×288

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: visualOnly |

### 에브리타임 · 데일리 메시지 — 프로필 이미지 `everytime-daily-message-profile` 120×120

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 브랜드 로고 (피드 이미지 광고용) `blind-brand-logo` 96×96

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | — | — | — | — | — | 제외: 로고만 규격 |

### 블라인드 · 피드 이미지 광고 (채용채널&피드광고 / 홈피드광고) `blind-feed-image` 1200×628

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover | (773,329) 427×300 | (773,329) 427×300 cover | 0 (0) | 0 (-1) | ✓ 붙음 |

### 블라인드 · 게시글 배너·댓글 배너 (보드 표기: 게시글 배너, 띠 배너) `blind-post-banner` 1250×560

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem | templateMold templateMold,templateMold.slotCover | (852,281) 398×279 | (852,281) 398×279 cover | 0 (0) | 0 (0) | ✓ 붙음 |

### 당근 · 네이티브 피드 광고 (이미지 유형) `daangn-native-feed-image` 200×200

| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |
|---|---|---|---|---|---|---|
| t1014-hanssem |  | (0,128) 200×72 | (0,128) 200×72 cover | 0 (0) | 0 (0) | ✓ 붙음 |
