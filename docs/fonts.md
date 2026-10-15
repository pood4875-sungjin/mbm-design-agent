# 무료 폰트 — 검증 목록과 쓰는 규칙

> 2026-10-14 조사·첨부. 아래 표는 **배포처 1차 자료**(네이버 고객센터 라이선스 안내, 카카오 기업사이트 브랜드 리소스, 지마켓 폰트 페이지, GitHub 저장소의 LICENSE, 폰트 파일 name 테이블)에서 확인한 것만 적는다. 확인 못 한 것은 「확인 필요」로 남긴다.
> 묶은 파일: `app/fonts/<family>/<family>-<굵기>.woff2` + `LICENSE.txt`. 만드는 법: `python3 scripts/fonts-subset.py`(fonttools + brotli 필요). 서브셋 범위 = KS X 1001 한글 2,350자 + 호환 자모 + 라틴 + 문장부호·화살표·도형 일부 + 전각 문장부호(4,216 코드포인트), 힌팅 제거.

## 검증한 폰트

| 폰트 | 제작 | 라이선스 | 상업 광고 | 웹 임베딩·소재에 넣기 | 수정 | 굵기(배포) | 묶은 굵기 | 출처 | 확인일 |
|---|---|---|---|---|---|---|---|---|---|
| **Paperlogy** (기본, 10-15~) | PT& (Lee Juim · Gmarket Sans·Montserrat 글리프 재설계) | SIL OFL 1.1 (폰트 name 13/14; zip 에 라이선스 파일 없음) | 가능 | 가능 | 가능 | 9단계(100~900) | 100~900 전부 | 사용자 제공 Paperlogy-1.000.zip | 10-15 |
| **Freesentation** | PT& (Lee Juim · Roboto + Noto Sans CJK 글리프) | SIL OFL 1.1 (name 13/14) | 가능 | 가능 | 가능 | 9단계 | 100~900 전부 | 사용자 제공 Freesentation-2.001.zip | 10-15 |
| **에이투지체 (A2Z)** | PT& (Lee Juim · Latin = Outfit) | SIL OFL 1.1 (name 13/14) · OTF(CFF) | 가능 | 가능 | 가능 | 9단계 | 100~900 전부 | 사용자 제공 에이투지체-otf-v1.001.zip | 10-15 |
| **Pretendard** (10-14 까지 기본 · 자소설·카카오·리멤버 고정) | 길형진(orioncactus) | SIL OFL 1.1 (저장소 LICENSE, 폰트 name 13) | 가능 | 가능 | 가능 | 9단계(100~900) + 가변 | 400·500·600·700 | https://github.com/orioncactus/pretendard v1.3.9 | 10-14 |
| **나눔스퀘어** | 네이버 | 나눔글꼴 라이선스 = SIL OFL 1.1 (네이버 고객센터 안내 전문) | 가능(글꼴 자체 유료 판매만 금지) | 가능(번들·재배포 가능) | 가능 | Light·Regular·Bold·ExtraBold | 300·400·700·800 | https://hangeul.naver.com/fonts → hangeul.pstatic.net …/nanum-square.zip | 10-14 |
| **나눔스퀘어 네오** | 네이버(산돌 제작) | 나눔글꼴 라이선스 = SIL OFL 1.1 (예약 이름 목록에 NanumSquareNeo 명시) | 가능 | 가능 | 가능 | Light(350)·Regular·Bold·ExtraBold·Heavy + 가변 | 300(Light)·400·700·800·900 | …/nanum-square-neo.zip | 10-14 |
| **나눔스퀘어 라운드** | 네이버 | 나눔글꼴 라이선스 = SIL OFL 1.1 (예약 이름 NanumSquareRound 명시) | 가능 | 가능 | 가능 | Light·Regular·Bold·ExtraBold | 300·400·700·800 | …/nanum-square-round.zip | 10-14 |
| **카카오 큰글씨 (Kakao Big Sans)** | 카카오(FONTRIX 제작) | OFL — 브랜드 리소스 페이지 「오픈 폰트 라이선스(OFL)를 적용하여 별도의 라이선스 없이 개인 및 상업적 용도로 자유롭게 사용」, 폰트 name 14 = scripts.sil.org/OFL | 가능 | 가능(OFL) | 가능(OFL, 예약 이름 제외) | Regular·Bold·ExtraBold | 400·700·800 | https://www.kakaocorp.com/page/detail/11571 (카카오큰글씨.zip, t1.kakaocdn.net) | 10-14 |
| **카카오 작은글씨 (Kakao Small Sans)** | 카카오(FONTRIX 제작) | 위와 같음 | 가능 | 가능 | 가능 | Light·Regular·Bold | 300·400·700 | 같은 페이지 (카카오작은글씨.zip) | 10-14 |
| **나눔고딕** | 네이버 | 나눔글꼴 라이선스 = SIL OFL 1.1 (예약 이름 NanumGothic) · Google Fonts 도 OFL 로 배포 | 가능 | 가능 | 가능 | Light·Regular·Bold·ExtraBold | 400·700(Bold)·800(ExtraBold) | …/nanum-gothic.zip · https://github.com/google/fonts/tree/main/ofl/nanumgothic | 10-14 |
| **Gmarket Sans** | 지마켓(eBay Korea) | SIL OFL 1.1 (페이지 명시 + 폰트 name 13 에 전문) | 가능 | 가능 | 가능 | Light·Medium·Bold | 300·500·700 | https://corp.gmarket.com/fonts/ (GmarketSansTTF.zip) | 10-14 |
| **SUIT** | SUNN(sun.fo) | SIL OFL 1.1 (저장소 LICENSE) | 가능 | 가능 | 가능 | 9단계 + 가변 | 400·500·600·700 | https://github.com/sun-typeface/SUIT v2.0.5 | 10-14 |

- 「굵기(배포)」와 다르게 묶은 이유: 렌더러가 쓰는 굵기는 400/500/600/700(+에브리타임 메인 800)이다. 사용자가 고른 네 폰트(나눔스퀘어·네오·라운드·카카오 큰글씨)는 배포 굵기를 전부 넣었고, 나머지는 쓰는 굵기만 넣었다. 없는 굵기(예: 나눔 계열 500·600)는 브라우저가 가장 가까운 굵기로 그린다(500→400, 600→700).
- 나눔스퀘어 네오 Light 는 파일상 350 이지만 CSS 300 자리에 두었다(가장 가까운 자리).
- 나눔고딕 Bold 파일의 usWeightClass 는 600 이지만 이름이 Bold 라 700 자리, ExtraBold 는 800 자리에 두었다.
- 네이버 라이선스 안내는 「네이버 나눔글꼴을 사용한 인쇄물, 광고물(온라인 포함)의 이미지는 나눔글꼴 프로모션을 위해 활용될 수 있습니다. 이를 원치 않는 사용자는 당사에 요청」이라는 조항이 있다. 광고 소재에 쓰는 데는 문제없지만 알아둘 것.
- 네이버 라이선스 전문의 예약 이름 목록에는 NanumSquare(무인 플레인)가 빠져 있다(NanumSquareRound·NanumSquareNeo 는 있음). 안내문의 「네이버 나눔글꼴」 전체 조건(상업 사용·수정·재배포 가능)은 나눔스퀘어에도 적용되는 것으로 읽었다 — 폰트 파일 name 테이블도 NAVER Corporation. **확인 필요(가벼움)**.

### 확인 못 한 것 / 넣지 않은 것
| 이름 | 상태 |
|---|---|
| 나눔명조·나눔바른고딕·나눔손글씨·마루 부리 | 네이버 안내문에 같은 OFL 조건으로 명시(마루 부리는 「나눔 글꼴과 같은 오픈라이센스」 문장). 광고 소재에 거의 안 쓰여 묶지 않았다. 필요하면 `scripts/fonts-subset.py` MANIFEST 에 한 줄 더하면 된다(zip 주소는 nanum-myeongjo·nanum-barun-gothic, 마루 부리는 zip 주소를 못 찾음). |
| 「Kakao OTF」·「카카오 서체」(2013년 무렵 옛 카카오 폰트) | 카카오 기업사이트에서 지금 배포하는 폰트는 **카카오 큰글씨·작은글씨(2025-06 공개)** 둘뿐. 옛 폰트의 현재 라이선스 페이지를 찾지 못해 **확인 필요** — 넣지 않음. 사용자가 말한 「카카오 빅산스」 = 카카오 큰글씨(영문명 Kakao Big Sans)로 보고 그것을 넣었다. |
| 카카오 폰트 라이선스 **전문** | 배포 zip 에 라이선스 파일이 없다. 페이지 문장(OFL 적용·개인·상업 무료)과 폰트 name 테이블의 OFL URL 로 확인했고, LICENSE.txt 에는 그 인용 + OFL 1.1 전문을 넣었다. 카카오가 낸 자체 라이선스 문서는 없다(**확인 필요: 카카오에 문의하면 확실**). |
| 캐치 PSD 의 Noto Sans CJK KR | 매체 규정이 아니라 샘플 폰트라 넣지 않음(OFL, 필요하면 추가 가능). |

## 쓰는 규칙 (규칙 장부 `font-medium-or-campaign`)
1. **매체가 폰트를 지정하면 그 폰트** — 매체 JSON `fonts.required`. 10-15 전수 조사: **required 가 있는 매체는 자소설닷컴·카카오(비즈보드)·리멤버 셋뿐**(전부 Pretendard). 네이버 GFA 는 권장(나눔고딕·고딕계열)만, NAP 비즈보드는 「템플릿 내 폰트만」(이름 미상), 알바몬·게임잡은 PSD 표기만 있고 규정 아님, 나머지(구글·인스타·블라인드·에브리타임·캐치·잡다·당근·스펙업)는 없음. 캠페인에서 무엇을 골라도 이 매체는 Pretendard 로 나간다(`core/renderers/ad.js` 가 `'Pretendard', <고른 스택>` 으로 강제, `core/lint.js` 가 실측 서체가 다르면 경고).
2. **아니면 캠페인에서 고른 폰트, 고르지 않았으면 기본 Paperlogy**(10-15 사용자: 「폰트 규정 없는 건 Paperlogy 로 제작」 — `DEFAULT_FONT`·`normalizeStyle` 기본) — `style.fonts.heading`. 산출물 하나만 다르게 하려면 인스펙터의 산출물 「폰트」 칸(`overrides.style.fonts`). 고정 매체 산출물에는 선택 칸 대신 「이 매체는 Pretendard 고정」 문구만 뜬다.
3. `fonts.allowed` 배열이 매체 JSON 에 생기면 그중 카탈로그에 있는 첫 폰트를 쓴다(아직 어느 매체에도 없음). `fonts.recommended`(네이버 GFA 「나눔고딕 혹은 고딕계열」)는 안내만 한다.
4. 매체 JSON 의 값은 이번에 하나도 바꾸지 않았다(읽기만).

## 앱에서 보이는 안내 문구(원문)
- 폰트 선택 아래(인테이크 스타일 단계 · 캠페인 인스펙터): **「자소설닷컴·카카오·리멤버는 매체 규정상 Pretendard로 고정됩니다. 여기서 고른 폰트는 폰트 규정이 없는 매체에만 적용됩니다.」** + 이 캠페인의 고정 매체 / 고른 폰트가 적용되는 매체 목록(매체 JSON 에서 계산) + 고른 폰트의 라이선스 한 줄.
- 내보내기 창: **「폰트 고정 매체: 자소설닷컴·카카오톡 (Pretendard) · 나머지: 나눔스퀘어 — 파일에 폰트를 함께 넣어 내보냅니다」**.
- 산출물 인스펙터(고정 매체): **「이 매체는 Pretendard 고정 — 매체 규정(자소설닷컴)」**.

## 미리보기·내보내기에서 폰트가 뜨는 길
| 어디 | 어떻게 |
|---|---|
| 보드 미리보기(iframe srcdoc) | `localFaceCss()` — 상대 경로 `fonts/…woff2` @font-face. srcdoc 문서는 부모의 base URL 을 물려받아 그대로 열린다. 산출물 HTML 은 가벼운 채로. |
| 매체 소재 래스터(PNG/JPG)·배너 | `exportFaceCss()` — woff2 를 fetch 해 dataURL @font-face 로 끼운다(SVG foreignObject 는 바깥 파일을 못 받는다). 커스텀 첨부 폰트와 같은 길. 기본 Pretendard 는 예전처럼 설치된 폰트에 맡긴다(산출물마다 1.1MB 를 더 싣지 않게). |
| SVG(Figma 편집용) | 앱 문서에 묶은 폰트 전부의 @font-face 를 넣어 두어(`#bundledFonts`) 글자 상자를 같은 서체로 잰다. SVG 에는 family 이름만 남으므로 Figma 에 같은 이름의 폰트(나눔스퀘어 네오 → 「NanumSquare Neo」, 카카오 큰글씨 → 「Kakao Big Sans」)가 설치돼 있어야 한다. |
| 랜딩·인쇄(fontLink) | CDN css 가 있는 폰트는 CDN, 없는 폰트(카카오·나눔고딕·Gmarket·SUIT)는 상대 경로 @font-face. |

## 용량
| 폰트 | 묶은 합계 | 폰트 | 묶은 합계 |
|---|---|---|---|
| Pretendard | 1,127KB (4) | 카카오 큰글씨 | 469KB (3) |
| 나눔스퀘어 | 510KB (4) | 카카오 작은글씨 | 448KB (3) |
| 나눔스퀘어 네오 | 901KB (5) | 나눔고딕 | 624KB (3) |
| 나눔스퀘어 라운드 | 433KB (4) | Gmarket Sans | 491KB (3) |
| SUIT | 559KB (4) | **전체** | **5.6MB** |

내보낼 때 폰트를 넣은 소재 HTML 은 폰트 전 굵기 base64(≈ 1.33배)만큼 무거워지지만, 매체에 제출하는 것은 래스터 PNG/JPG 라 소재 파일 크기는 변하지 않는다.
