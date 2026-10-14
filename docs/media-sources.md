# 매체 공식 가이드 출처

> 2026-10-14 조사. 지금 `core/media/*.json` 의 규정 값은 영업팀 자료 묶음(「[SK추진실] 광고소재제작가이드_260918.zip」)과 Figma 「매체별 규격정리」 보드에서 옮긴 것입니다. 이 문서는 매체가 **직접 공개한** 가이드 페이지나 PDF를 찾아 정리합니다. 목적은 나중에 그 페이지를 자동으로 감시해 바뀐 점을 제안하는 것입니다. 바뀐 값을 자동으로 반영하지는 않습니다.
>
> - 기계가 읽는 원본은 각 매체 JSON 의 `officialSources`(확인한 URL만 넣고, 없으면 빈 배열)입니다. 원래 있던 `sources` 키는 영업 자료·Figma 출처 문자열 목록이고 테스트와 화면이 쓰고 있어서, 새 키를 따로 만들었습니다.
> - 감시 목록과 비교 기준(선택자·텍스트 기준점)은 `ref/learned/media-watch.json` 에 있습니다.
> - 이번 작업에서 규정 값은 하나도 바꾸지 않았습니다. 아래 「다른 점」은 모두 **제안 후보**입니다.

## 매체별 표

| 매체 | 공식 링크 | 종류 | 다루는 규격 | 갱신일 표기 | 핵심 숫자 있나 | 자동 감시 |
|---|---|---|---|---|---|---|
| 카카오 | [비즈보드 제작 가이드](https://kakaobusiness.gitbook.io/main/ad/moment/performance/talkboard/content-guide) | 공개 HTML (GitBook, `.md` 원문 제공) | kakao-bizboard-mo | 없음 | ✅ 크기·용량·카피 px·AD 마크 영역 | ✅ 가장 쉬움 |
| 카카오 | [디스플레이 광고 제작 가이드](https://kakaobusiness.gitbook.io/main/ad/moment/performance/displayad/content-guide) | 공개 HTML | kakao-display-pc-promo·profile | 없음 | ✅ 크기·용량·세이프존·글자수 | ✅ |
| 카카오 | [커스텀 비즈보드(CPT)](https://kakaobusiness.gitbook.io/main/ad/moment/guarantee/cpt/content-guide/custom) · [CPT 10/20 이후 버전](https://kakaobusiness.gitbook.io/main/ad/moment/guarantee/cpt/10-20) | 공개 HTML | kakao-cpt-* | 「10/20 이후」 | ✅ 크기·용량·Safe Zone·텍스트 px | ✅ |
| 당근 | [전문가모드 제작 가이드](https://businessdaangn.gitbook.io/business.daangn/ads-pro/product/creative) | 공개 HTML (GitBook, `.md`) | daangn-native-feed-image·catalog-product | 없음 | ✅ 크기·용량·글자수 | ✅ |
| 구글 GDN | [업로드된 디스플레이 광고 사양](https://support.google.com/google-ads/answer/1722096?hl=ko) | 공개 HTML | google-gdn-* 5종 | 없음 | ✅ 허용 크기·150KB | ✅ |
| 인스타그램 | [Meta 광고 가이드: 피드 이미지](https://www.facebook.com/business/ads-guide/update/image/instagram-feed) · [스토리 이미지](https://www.facebook.com/business/ads-guide/update/image/instagram-story) | 공개 HTML | instagram-feed-1080 · instagram-story-1080x1920 | 없음 | ✅ 비율·해상도·용량·안전영역(스토리) | ✅ |
| NAP DSP (나스미디어) | [nap dsp 소재 제작 가이드 PDF](https://library.nasmedia.co.kr/file/ec8487cca87c575f470bf92df6efb042) (링크 허브: [napdsp-team.github.io/nap-dsp](https://napdsp-team.github.io/nap-dsp/)) | 공개 PDF (같은 링크가 새 판으로 바뀜) | nap-dsp-* 7종 | **표지 Update 2026.10** (우리 원본 2026.03) | ✅ 전 규격 | ✅ 파일명·텍스트 diff |
| 블라인드 | [blindAD 광고 소개](https://www.teamblind.com/kr/ad-inquiry) → [제작가이드 PDF (Google Drive)](https://drive.google.com/file/d/1WAYHjWBLFZXHvcOpVOso35ESJiEHaNEz/view) | 공개 HTML + 공개 PDF | blind-* 3종 | 파일명 「광고가이드_2503」 | 이미지 PDF (사람이 읽어야 함) | △ 링크·파일명만 |
| 네이버 GFA | [네이버 광고주센터 도움말](https://ads.naver.com/help) | 공개 HTML이지만 JS로 그려지고 자동 접근이 막힘 | naver-gfa-* 5종 | 확인 못 함 | 확인 못 함 | ❌ |
| 에브리타임 | [비누랩스 광고 비즈니스](https://www.vinuteam.com/business/ad) (상품소개서 202607 PDF) | 공개 HTML·PDF, **상품 안내만** | (규격 없음) | 소개서 「2026.7 ver, 9/30까지 유효」 | ❌ | △ 소개서 새 판 감지만 |
| 자소설닷컴 | [기업서비스 공지사항](https://jasoseol.com/business/notices) | 공개 HTML (공지 목록) | (규격 없음) | 공지별 날짜 | ❌ | △ 광고 공지 감지만 |
| 캐치 | [채용배너 상품 안내](https://apply.catch.co.kr/main/ProductInfo/RecruitBanner) | 공개 HTML, **상품 안내만** | catch-mainlarge-* (이름만 맞음) | 없음 | ❌ | △ 상품 표 감지만 |
| 리멤버 | 공식 페이지 못 찾음 (타깃광고 소개 [market.rememberapp.co.kr/targetads](https://market.rememberapp.co.kr/targetads)는 우리 채용 배너 규격과 다른 상품) | 영업 자료만 | — | — | — | ❌ |
| 알바몬 | 공식 페이지 못 찾음 (광고 문의는 worxphere.ai/partnership 폼) | 영업 자료만 | — | — | — | ❌ |
| 게임잡 | 공식 페이지 못 찾음 (사이트에 ad@gamejob.co.kr 메일만 있음) | 영업 자료만 | — | — | — | ❌ |
| 잡다 | 공식 페이지 못 찾음 (jobda.im 에 광고 안내 없음) | 영업 자료만 | — | — | — | ❌ |
| 스펙업 | 공식 페이지 못 찾음 (specup.net 응답 없음, 네이버 카페 기반) | 영업 자료만 | — | — | — | ❌ |

**자동 감시 가능**: 카카오·당근·구글·Meta(인스타)·NAP DSP 다섯 곳은 숫자까지 비교할 수 있습니다(15개 매체 중 5개, 매체 JSON 규격 90개 중 22개). 블라인드·에브리타임·자소설·캐치는 「새 판이 나왔다」는 신호만 잡을 수 있고, 숫자는 사람이 확인해야 합니다. 나머지 6곳(네이버 GFA·리멤버·알바몬·게임잡·잡다·스펙업)은 영업 담당에게 받는 수밖에 없습니다.

## 우리 값과 다른 점 (스팟 체크) — 제안 후보, 반영하지 않음

1. **NAP DSP 비즈보드: 새 판(2026.10)에서 규격이 바뀜**. 같은 공식 링크가 지금은 `_202610.pdf`(33쪽)를 내려줍니다. 우리 원본은 영업 zip 에 든 `_202603`(32쪽)입니다. 두 판의 텍스트를 비교하면 비즈보드 절만 바뀌었습니다.
   - 크기: `1029*258` → **`960*300(px)`**
   - 포맷: PNG-24 / PNG-32 → **PNG-24 하나**
   - 로고: 「썸네일 내 우측/상단 여백 8px, 사이즈 120x46px로 로고 삽입」 문구가 빠지고 **「지정 위치에 광고주 로고 필수 삽입」(PSD 템플릿)**으로 바뀜. 브리핑 「정해야 할 것 3」(로고 120×46 해석)과 직접 관련됩니다.
   - 새로 생긴 것: 카피 최소 240px·최대 526px, 카피와 오브젝트 간격 32px, 부가정보(Pretendard Regular 22pt #949494, 최대 526px)와 의무고지 문구 허용. 예전 「심의필 필요 시 집행 불가」는 「검수에 따라 노출이 어려울 수 있음」으로 완화. 「좌우 48px 영역 내 카피 사용 불가」 문구는 빠짐.
   - 나머지 규격(320×50 → 640×100 업로드, 320×100, 300×250, 320×480 → 640×960, 200KB)은 그대로입니다. 바뀐 것은 영상 용량 500MB → 300MB 정도입니다.
2. **카카오 CPT 용량이 비어 있음**: 공식 문서에는 배경 1290×258 **300KB 이내**, 텍스트 1029×258 **300KB 이내**로 나옵니다. 우리 `kakao-cpt-*` 는 `maxKB: null` 입니다. Safe Zone 937×222(우리 46/18px)와 텍스트 가로 290~576px, 간격 42px 는 같습니다.
3. **카카오 비즈보드 우상단 66×174px 영역**: AD 마크(필수)와 AI 활용 마크(선택) 자리라 광고주체나 주요 오브젝트를 두지 말라고 권장합니다. 우리 JSON 에는 이 내용이 없습니다. 카피 길이는 공식 문서가 글자 수가 아니라 px(최소 290/480px, 최대 796px 권장)로 잡습니다. 우리는 「메인카피 15자」처럼 글자 수로 관리합니다(480px 는 노트에만 있음).
4. **카카오 CPT 새 판 예고**: 「제작 가이드 (10/20 이후 버전)」 페이지가 따로 있습니다. 고딕 계열 폰트(프리텐다드 권장)와 브랜드 폰트를 허용하고, Bold 는 메인카피에만 쓸 수 있습니다. 10/20 뒤에 기존 판을 대체하는지 확인이 필요합니다.
5. **인스타그램**
   - 스토리: Meta 공식 문서는 **상단 14%·하단 35%·좌우 6%** 를 비우라고 합니다(1920 기준 약 269 / 672 / 65px). 우리 `instagram-story-1080x1920.safeArea` 는 「수치 없음」으로 비어 있습니다.
   - 피드: 공식 권장은 **4:5 1440×1800** 입니다. 우리 1080×1080(1:1)도 허용 범위(4:5~1.91:1) 안이라 위반은 아닙니다.
   - 용량: 공식 최대 30MB. 우리 「제한 없음」(null)과 충돌하지 않습니다.
6. **당근: 우리 값이 비어 있는데 공식 문서에는 있음**. 이미지 JPG/JPEG/PNG, 10MB 이하, **최소 200×200 1:1**, 광고 제목 최대 30자, 브랜드 이름 최대 20자, 심의필 58자입니다. 우리 두 규격은 크기·용량·포맷이 모두 null(「원본 가이드 필요」)입니다. 브리핑 「정해야 할 것 5」의 「당근 200×200」이 이 공식 최소 크기와 같습니다.
7. **일치 확인**
   - 구글 GDN: 5개 크기 모두 공식 허용 목록에 있음(580×400 큰 직사각형, 930×180 리더보드 등), 150KB ✓
   - 카카오 디스플레이: 1200×600·500KB·세이프존 40/40/90/40·프로필 300×300 여백 10px·글자수 20/25/45 ✓
   - 카카오 비즈보드: 1029×258·300KB ✓
   - 네이버 GFA 1250×560: 250KB·여백 50/35/240 은 대행사 글과 같습니다. 공식 원문으로는 대조하지 못했습니다.

## 못 찾은 매체와 대안
- **네이버 GFA**: 공식 광고주센터(ads.naver.com/help)가 있습니다. 다만 본문이 JS 로 그려지고, 이 환경의 WebFetch 와 브라우저 둘 다 접근이 막혀 소재 가이드 문서 URL 을 특정하지 못했습니다. 대안은 둘입니다. ① 사람이 광고주센터에서 「성과형 디스플레이 소재 가이드」 문서 URL 을 한 번 복사해 주면 감시 목록에 넣습니다. ② 영업 PDF(모바일DA·네이티브) 새 판을 받을 때마다 갱신합니다.
- **리멤버·알바몬·게임잡·잡다·스펙업**: 공개된 소재 가이드가 없고 영업 PDF/PSD 로만 받습니다. 대안은 영업 담당에게 「새 판이 나오면 보내 달라」고 요청하는 것입니다. 받은 자료는 `~/Downloads` zip 이 갱신될 때 파일명·날짜로 비교합니다(예: 리멤버 ver.2408, 잡코리아x알바몬 2025.08.22 ver).
- **에브리타임·자소설닷컴·캐치**: 공식 페이지는 있지만 규격 숫자는 없습니다(상품 안내·공지·소개서뿐). 상품이 새로 생기거나 없어지는 것, 소개서 새 판만 감지합니다. 에브리타임 상품소개서는 「2026-09-30까지 유효」라 곧 새 판이 나올 시점입니다.

## 감시 설계 메모
- GitBook(카카오·당근)은 URL 뒤에 `.md` 를 붙이면 Markdown 원문을 줍니다. 이미지 토큰 쿼리를 지우고 diff 하면 잡음이 거의 없습니다. `llms.txt` 문서 목록으로 새 페이지가 생긴 것도 잡을 수 있습니다.
- NAP DSP 는 파일 id 가 같은 채 내용이 새 판으로 바뀝니다. 먼저 HEAD 응답의 `content-disposition` 파일명(`…_YYYYMM.pdf`)만 비교하고, 바뀌었을 때만 받아 `pdftotext -layout` 으로 이전 판과 diff 합니다.
- Meta·Google 은 HTML 본문에서 기준 문구(「디자인 권장 사항」~「더 알아보기」, 크기 표) 사이만 잘라 비교합니다. 로케일에 따라 영어로 올 수 있으니 `Accept-Language: ko` 를 지정합니다.
- 흐름은 감지 → 바뀐 숫자를 규격 id 에 연결(`covers`) → 바꿀 값 제안 → `cases-lint` 로 사전 검증까지입니다. JSON 반영은 사람이 승인한 뒤에 합니다.
