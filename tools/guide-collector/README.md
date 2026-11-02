# 채용 소재 가이드 트래커 (테스트)

채용포털·광고 매체가 공개한 이미지 규격(사이즈·비율·용량·포맷)을 모으고, 가이드가 바뀌거나 위치가 옮겨지면 알려주는 도구입니다.

```bash
npm start                 # 대시보드 http://localhost:4173
npm run agent:install     # 맥에 로그인하면 서버가 자동으로 켜지게 (해제: npm run agent:uninstall)
npm run collect           # 화면 없이 한 번 수집 (node cli.js run --only kakao-moment,daangn)
npm run status            # 소스별 상태
npm run specs -- --csv specs.csv --json specs.json   # 수집된 규격 내보내기
npm run pack              # 건네줄 묶음 dist/guide-collector.zip 만들기
```

CLI는 대시보드 서버가 같은 데이터 폴더로 떠 있으면 서버 API로 대신 돌립니다(같은 파일을 두 곳에서 쓰지 않게). `--data <폴더> --sources <json>` 을 주면 서버와 상관없이 따로 돕니다.

### 다른 프로젝트에서 쓰기

```js
import * as collector from './vendor/guide-collector/lib/index.js';

await collector.init({ dataDir: '.cache/guides', sources: [
  { id: 'kakao-bizboard', name: '카카오 비즈보드', type: 'page', render: 'none',
    url: 'https://kakaobusiness.gitbook.io/main/ad/moment/performance/talkboard/content-guide.md',
    expect: ['960 x 300', '300KB'] },          // 이 문구가 사라지면 값이 바뀐 신호
] });
const run = await collector.runCheckAndWait();  // { changed, broken, ... }
const state = await collector.getState();       // 소스별 상태·문서·규격·expect(found/missing)
const specs = await collector.exportSpecs();    // 규격 한 줄씩 (출처 URL 포함)
```

라이브러리만 다른 저장소에 복사하려면 `node scripts/pack.mjs --vendor <그 프로젝트>/vendor/guide-collector`. 의존성은 없고, Chrome 렌더링·OCR(macOS)은 있으면 씁니다.

Node 20 이상이면 되고, 설치할 의존성은 없습니다.
- **Chrome**이 깔려 있으면 JS로 그려지거나 봇을 막는 페이지(Meta, 캐치, 원티드)를 헤드리스 Chrome으로 렌더링합니다. 경로가 다르면 `CHROME_PATH`로 지정하세요.
- **OCR**은 macOS 기본 Vision 프레임워크를 씁니다. 처음 PDF·이미지를 읽을 때 `tools/pdf-ocr.swift`를 `data/bin/`에 한 번 컴파일합니다(약 1분). 같은 파일은 다시 읽지 않도록 캐시합니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 규격 수집 | 웹페이지·도움말 센터 크롤링·공개 노션·PDF에서 사이즈·비율·용량·포맷을 뽑습니다. 이미지·PDF 안의 글자는 OCR로 읽습니다 |
| 변경 감지 | 규격 값이 바뀌면 **규격 변경**, 문장만 바뀌면 **문구 변경**으로 알리고 이전 버전과 줄 단위로 비교합니다 |
| 자동 수집 | 기본 **매주 월요일 09:00**. 상단 칩에서 끄기·매일·요일·시각을 바꿉니다. 서버가 꺼져 있다가 켜지면 놓친 수집을 바로 따라잡습니다 |
| 수집 불가 감지 | 가이드 위치가 바뀌면 **수집 불가**로 표시하고 지난 정상 데이터는 그대로 둡니다(아래 참고) |
| 수집 설정 수정 | 화면에서 주소·링크 규칙을 고치고 **테스트(저장 안 함)** → **저장하고 다시 수집** → 필요하면 **기본값으로 되돌리기** |
| 출처 바로가기 | 모든 규격·문서·이벤트에 **원문 ↗** 버튼. PDF 규격은 해당 쪽(`#page=N`)으로 엽니다 |
| 직접 등록 | 공개 가이드가 없는 매체는 담당자에게 받은 규격을 손으로 등록합니다 |
| 내보내기 | 규격 표를 CSV·JSON으로 받습니다(출처 URL 포함) |

## 수집 불가(위치 변경) 감지

정상 수집 때마다 **정상 기준**(문서 수·링크 수·규격 수·최종 주소)을 저장하고, 다음 수집과 비교합니다.

| 상황 | 표시 |
|---|---|
| 404/410, "Not Found" 페이지 | 페이지 없음 (주소 변경 의심) |
| 목록에서 글·파일 링크를 하나도 못 찾음 (전에는 있었음) | 글·파일 링크가 사라짐 |
| 수집되는 문서가 0개가 됨 | 수집되는 문서가 없어짐 |
| 규격이 3개 이상이었는데 0개가 됨 (페이지는 열림) | 규격이 모두 사라짐 |
| 다른 주소로 리다이렉트됨 | 다른 주소로 이동됨 → 새 주소 |
| PDF 자리에 다른 응답이 옴 | PDF가 아닌 응답 |
| 노션 페이지가 지워지거나 비공개로 바뀜 | 노션 페이지 없음·비공개 |
| 서버 오류·접속 실패 | 일시적 오류로 보고 **2번 연속**일 때 알림 |

수집 불가가 되면 상단에 빨간 배너가 뜨고, 눌러서 바로 수집 설정을 고칠 수 있습니다. 고친 값은 `data/source-overrides.json`에 저장되고, 단일 페이지는 주소가 바뀌어도 같은 문서로 이어서 이전 버전과 비교합니다. 정상으로 돌아오면 **복구됨** 이벤트가 남습니다.

## 검토 결과 (2026-10-27 실제 수집 기준)

| 매체 | 수집 | 규격 확보 | 비고 |
|---|---|---|---|
| **자소설닷컴** (필수) | ✅ | ✅ | `/business/notices` 공지에 규격이 올라옵니다. 공고 이미지 가로 750px, 장당 5MB, PNG/JPG, 로고 가로 300px 이상. 배너상품 규격 변경(2000×300 → 1200×280) 공지도 있습니다 |
| **리멤버** (필수) | ✅ | ❌ | 채용솔루션·타깃광고 소개 페이지만 공개돼 있고 소재 규격은 없습니다 |
| **잡다** (필수) | ✅ | ❌ | 공개된 기업용 소재 가이드를 찾지 못했습니다 |
| **캐치** (필수) | ✅ (Chrome) | ❌ | 채용상품 페이지는 JS로만 그려지고 픽셀 규격은 없습니다 |
| **카카오톡** | ✅ | ✅ | 공식 GitBook 제작 가이드 18개 + 외부DSP 비즈보드. 비즈보드 1029×258 → 960×300 변경 안내 포함 |
| **네이버 GFA** | ✅ | 일부 | 공식 FAQ에는 픽셀 규격이 거의 없어서 지면별 px는 대행사(AMPM) 글로 보충합니다 |
| **NAP DSP** | ✅ | ❌ | 규격은 이미지 PDF 소개서에만 있습니다. 자료실의 NAP 소개서 파일 목록을 감시해서 새 버전이 올라오면 잡습니다 |
| **구글 GDN** | ✅ | ✅ | 업로드 이미지 광고 크기(alt 텍스트) + 반응형 권장사항 |
| **인스타그램** (Meta) | ✅ (Chrome) | ✅ | 피드 1440×1800(4:5), 스토리 1440×2560(9:16), 30MB |
| **에브리타임** | ✅ (Chrome) | ❌ | 공개된 광고·소재 안내가 없습니다. 담당자에게 받은 규격을 직접 등록해야 합니다 |
| **블라인드** | ✅ | 대행사 자료 | 아래 참고 |
| **당근** | ✅ | ✅ | 당근비즈니스 공식 GitBook 소재 가이드(200×200 1:1, 9:16·2:3, 가로 720px 등) |
| LinkedIn | ✅ | ✅ | |
| 나인하이어(잡코리아) | ✅ | ✅ | 글 265개 크롤링, 글마다 수정일이 있어 변경 감지가 깔끔합니다 |
| 그리팅 | ✅ | 일부 | 규격 대부분이 스크린샷 안에 있습니다 |
| 원티드 | ✅ (Chrome) | ❌ | 일반 요청은 Cloudflare 403 |

### 블라인드

| 소스 | 방식 | 얻는 것 |
|---|---|---|
| 공식 국문 광고 페이지 `teamblind.com/kr/ad-inquiry` | 웹페이지 + 파일 링크 감시 | 매체소개서·제작 가이드·노션 링크가 바뀌는지 |
| 공식 노션 "블라인드 광고｜Blind AD" | 노션 API + 이미지 OCR, 하위 페이지 14개 | 상품별 노출 방식·단가·CTR·타겟팅, 첨부 소개서 파일명(`…_2026_3Q.pdf` = 분기별 버전) |
| 공식 국문 매체소개서 PDF (38쪽) | PDF OCR | 상품·단가 (픽셀 규격 없음) |
| 대행사(AMPM) 글 | 웹페이지 | **픽셀 규격**: 로고 96×96·50KB, 피드 이미지 1200×628·100KB, 댓글 배너 1250×560·200KB |

픽셀 규격이 담긴 공식 **국문 제작 가이드**는 블라인드가 구글 드라이브에서 다운로드를 막아 둬서 수집하지 않습니다. 그래서 공식 자료로는 상품 구성과 소개서 버전 변화를 추적하고, 픽셀 규격은 대행사 자료와 직접 등록으로 채웁니다. 노션 페이지 이미지 OCR은 처음에 1분 정도 걸리고 이후엔 캐시를 씁니다.

## 변경 감지 방식

1. 문서마다 본문을 뽑아(`<article>` → `<main>` → `<body>`, 메뉴·스크립트 제외) 줄 단위로 저장합니다(`data/snapshots/<hash>.txt`). PDF는 쪽마다 `[p.N]` 표시를 넣습니다.
2. 비교는 원문이 아니라 **서명**으로 합니다. 줄·단어 순서와 문장 속 숫자(조회수 등)는 무시하고, 대신 **추출된 규격 값을 포함**합니다.
3. 크롤링 소스에서 목록에서 빠진 글은 직접 열어보고 404/410일 때만 **사라짐**으로 기록합니다.
4. 첫 수집은 기준을 잡는 단계라 알림을 내지 않습니다.
5. 서명 규칙을 바꾸면 `lib/tracker.js`의 `SIG_VERSION`을 올리세요. 다음 수집에서 알림 없이 기준만 새로 잡습니다.

검증(2026-10-27): 28개 소스 연속 수집에서 잘못된 알림 0건. 변경 시뮬레이션은 규격 변경으로 잡혔고, 주소를 망가뜨리면 수집 불가 → 되돌리면 복구됨까지 확인했습니다.

## 구조

```
server.js            HTTP 서버 + API + 자동 수집 시작
cli.js               화면 없이 수집·상태·내보내기
lib/index.js         라이브러리 공개 API (다른 프로젝트는 이것만 import)
lib/tracker.js       수집 흐름, 스냅샷, 변경·위치 변경 감지, 설정 수정, 자동 수집 일정
lib/fetchers.js      HTTP / Chrome 렌더링 / 파일 내려받기 / 링크 찾기
lib/notion.js        공개 노션 페이지 읽기 (토글 펼치기, 이미지 OCR, 첨부·하위 페이지)
lib/ocr.js           PDF·이미지 OCR 호출과 캐시
lib/extract.js       본문 추출, 규격 정규식, 페이지 수정일
lib/diff.js          줄 diff, 규격 diff
tools/pdf-ocr.swift  macOS Vision + PDFKit OCR
scripts/agent.sh     로그인 시 서버 자동 실행 (launchd)
scripts/pack.mjs     건네줄 묶음(dist/guide-collector.zip) · 다른 프로젝트에 라이브러리 복사(--vendor)
sources.json         감시 대상 목록
public/              대시보드 UI
data/                수집 결과·설정·캐시 (git 제외)
  state.json  settings.json  source-overrides.json  manual-specs.json  custom-sources.json
  snapshots/  files/(내려받은 PDF·이미지)  ocr-cache/  bin/
```

### 소스 정의 (`sources.json`)

```jsonc
{
  "id": "jasoseol", "name": "자소설닷컴", "group": "채용포털", "required": true,
  "type": "crawl",                       // page | crawl | pdf | notion
  "url": "https://jasoseol.com/business/notices",
  "match": "/?business/notices/\\d+",    // crawl: 글 링크 정규식
  "follow": "...",                       // crawl: (선택) 중간 목록 페이지 정규식
  "seeds": ["https://.../notices/{1..60}"], // crawl: (선택) 번호 범위로 직접 훑기
  "keywords": "이미지|배너|\\d\\s*px",      // crawl: 이 단어가 있는 글만 저장
  "render": "chrome",                    // (선택) 항상 Chrome으로 렌더링 / "none"이면 끔
  "ignore": "^#\\s",                     // (선택) 변경 비교에서 뺄 줄 (태그·랜덤 문구)
  "trackLinks": "https://...\\.pdf",     // page: (선택) 이 링크 목록도 감시 (소개서 PDF 버전 등)
  "pdfPage": "https://...", "pdfMatch": "...\\.pdf", // pdf: (선택) 목록 페이지에서 최신 PDF 찾기
  "subpages": true,                      // notion: 하위 페이지도 수집
  "titleFrom": "heading",                // (선택) <title>보다 본문 제목을 우선
  "expect": ["1029 x 258", "300KB"],     // (선택) 본문에 있어야 할 기준 문구. 빠지면 문서의 expect.missing 에 나옴
  "secondary": true                      // (선택) 대행사 등 2차 자료로 표시
}
```

GitBook 사이트(카카오, 당근)는 `https://<site>/~gitbook/site-index`가 모든 글의 경로를 JSON으로 주기 때문에 이걸 목록 페이지로 씁니다.

## 다음 단계 후보
- 스크린샷 화면의 기타 매체 추가: 스펙업, 알바몬, 게임잡
- NAP DSP 매체소개서 PDF도 `type: "pdf"` + `pdfPage`로 OCR (10MB, 첫 수집이 오래 걸림)
- 변경·수집 불가 시 슬랙·메일 알림
- 매체별 소재 규격을 실제 디자인 생성 템플릿 사이즈로 매핑
