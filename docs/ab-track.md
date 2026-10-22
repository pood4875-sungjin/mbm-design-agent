# A/B 비교 환경 — 규칙 렌더러(A) vs AI 디자인(B) vs 하이브리드(A+AI)

같은 키비주얼·문구·규격으로 세 방식을 나란히 보고 비교표를 남기는 환경입니다(2026-10-22).

## 하이브리드(A+AI) — 본선 후보
AI 는 **그림 판단만**(캠페인당 호출 1회), 그리기는 **규칙 렌더러 그대로**.

| | 누가 | 어떻게 |
|---|---|---|
| 텍스트(문구·역할·줄바꿈) | 규칙 | 문구 사다리 `copyFor` 그대로 — AI 손 안 댐 |
| 타이포(크기·굵기·색·행간·정렬) | 규칙 | 매체 규정·굵기 위계·글자색 문턱·틀 값 — AI 손 안 댐 |
| 로고 | 규칙 | 규정 매체는 틀 자리, 자유 매체는 규칙 크기·톤 |
| 비주얼(어디를·얼마나·어느 쪽) | **AI** | 유형·주인공·보존 요소·**얼굴 상자** + 모양 묶음(wide·tall·square·tower·strip)마다 **모양별 주인공(좁은 모양은 좁혀 크게)**·crop·**그림 상자(캔버스 몫)·녹일 변**. 얼굴은 걸쳐 잘리면 탈락. 렌더러 `aiBoxRender` 가 겹침·로고 가림을 재서 넘으면 축소 → 글자 끝선 맞춤 → 규칙 자리 |
| 배경 | **AI** + 규칙 | AI 가 지면 색 1~3개·각도·글자 톤·녹임 길이를 직접(`field`). 비우면 프리셋(bgFill) → 규칙. 글자색 대비·그라데이션 접기·녹임 상한은 규칙이 검사. 장식 없음 |
| 검수·게이트 | 규칙 | 그대로 |

흐름: `POST /api/analyze`(`server/design.js analyzeKv`, Sonnet 5.5 medium) → `core/trackb/analyze.js`(스키마 `ANALYSIS_SCHEMA` · 검증 `validateAnalysis`: 픽셀→비율, crop 이 주인공·보존 요소를 자르면 넓힘, 선택지 밖은 auto) → `app/hybrid.js`(모양 묶음마다 crop 사본 + 측정 + 프리셋 조각) → `renderArtifact`(규칙). 비용 캠페인당 **$0.02(≈30원)**, 20종 전부 포함.

- 비교 화면: 「A+AI 그림 판단 (API 1회)」 버튼 → 가운데 열. 모양 묶음별 판단 표·고친 것·프롬프트는 접힘 칸. 판단 JSON 내려받기/불러오기.
- 본 앱(`app/index.html`, B 서버로 열었을 때): 인스펙터 키비주얼 아래 「AI 그림 판단」 → 광고 규격 전부에 모양 묶음 값 적용(`overrides.style.aiShape` + 프리셋, crop 사본은 캠페인 `c.ai.groups` 에 모양별 5개만). 「AI 판단 해제」로 되돌림. Python 서버(4793)로 열면 버튼은 보이되 호출이 실패한다(서버 없음).
- 헤드리스: `node scripts/ab-run.mjs pin-28 pin-32` 가 A · A+AI(C) · B 를 다 그린다(`--no-b`·`--no-c`·`--cmodel`·`--ceffort`).


| | A 트랙 | B 트랙 |
|---|---|---|
| 방식 | 기존 규칙·템플릿 렌더러 `core/renderers/ad.js` + 매체 JSON `core/media/*.json` | Claude 가 키비주얼·로고·문구·고객사 요구·브랜드 색·매체 규격을 보고 **레이아웃 JSON** 을 설계 → 화면에서 그림 |
| 비용 | 없음(브라우저 렌더) | API 호출(「B 생성」 버튼을 누를 때만) |
| 키 | 없음 | 서버만 가짐(`server/.env` 또는 환경변수) — 저장소에 없음 |
| 코드 위치 | main | main(10-22 합침 — 처음엔 브랜치 `track-b-ai-design` · worktree `~/mbm-design-agent`) |

## 실행

A 트랙(기존 앱, main 원본):
```bash
cd ~/mbm-design-agent && python3 scripts/serve.py 4793
```
→ http://localhost:4793/app/

B·A+AI 트랙 + 비교 화면(서버가 키를 가짐). 처음 한 번 SDK 설치:
```bash
cd ~/mbm-design-agent/server && npm install
```
키 넣기(둘 중 하나 — 둘 다 gitignore):
```bash
cp ~/mbm-design-agent/server/.env.example ~/mbm-design-agent/server/.env
```
(열어서 `ANTHROPIC_API_KEY=sk-ant-…` 로 바꾼다. 또는 `app/config.local.js` 의 `MBM_API_KEY` 를 그대로 읽는다.)

서버 켜기:
```bash
cd ~/mbm-design-agent && node server/server.mjs 4796
```
→ http://localhost:4796/app/ab.html (포트 4791·4793·4794·4795 는 다른 작업이 쓰고 있어 4796)

비교 화면 쓰는 법: 샘플 버튼(pin-28 · pin-32) 또는 키비주얼·로고 올리기 → 규격 고르기 → 「A 그리기」(무료) → 「B 생성」(유료, 확인 창) → B 층 편집 → 「수정 완료」 → 「지금 결과를 표에 추가」 → 사람 평가 칸(품질·요구 반영 1~5) 입력 → 「Markdown 표 복사」.

헤드리스로 케이스 비교(PNG·JSON 을 `history/img/<날짜>_ab/` 에):
```bash
cd ~/mbm-design-agent && node scripts/ab-run.mjs pin-28 pin-32 --spec kakao-display-pc-promo
```
(키가 없으면 A 만 그린다. `--no-b` 로 B 를 끌 수 있고, `--model claude-sonnet-5-5 --effort medium` 으로 바꿀 수 있다.)

테스트:
```bash
cd ~/mbm-design-agent && node --test
```

## B 트랙 구조

```
server/server.mjs          정적 파일(캐시 없음, /v/ 접두 벗김) + GET /api/health + POST /api/design · 키 탐색(환경변수 → server/.env → app/config.local.js)
server/design.js           Claude 호출: 이미지(키비주얼·로고) + 프롬프트 → structured output(LAYOUT_SCHEMA) → 검증 → 위반이면 같은 대화에서 1회 재요청 → 사용량·비용·시간
core/trackb/prompt.js      고정 조건 buildFixed(매체 JSON 에서만 읽음) · 프롬프트 buildPrompt(문구는 A 와 같은 copyFor 사다리)
core/trackb/schema.js      레이아웃 JSON 스키마 + validateLayout(고정 조건 위반 고치기/재요청 사유)
core/trackb/render.js      레이아웃 JSON → HTML(A 와 같은 표식 data-ad/data-field/data-object/data-logo → 기존 검수기 그대로)
core/trackb/cost.js        단가표·비용 추정
app/ab.html · app/ab.js    비교 화면(A 렌더 · B 생성/불러오기 · 층 편집 · 검수 · 비교 기록)
scripts/ab-run.mjs         헤드리스 A/B(Chrome headless PNG)
test/trackb.test.js        순수 모듈 테스트 7건
```

### 레이아웃 JSON
```
{ background: { base:{kind:solid|linear|radial, colors:[#hex…], angle}, shapes:[{kind:rect|ellipse,x,y,w,h,color,opacity,radius,blur}] },
  images: [{ id:kv|logo, x,y,w,h, crop:{x,y,w,h}(0~1), opacity, fade:none|left|right|top|bottom }],
  texts:  [{ role:season|main|sub|period|role|slogan|notice|cta, text(\n 줄바꿈), x,y,w, size, weight, color, align, lineHeight, letterSpacing }],
  rationale: "왜 이렇게 놓았나" }
```
폰트는 JSON 에 없다 — 렌더러가 박는다(규정 매체는 Pretendard, 아니면 캠페인 폰트).

### AI 가 판단하는 것 / 못 바꾸는 것
- 판단: 정보 우선순위, 글자 크기·굵기·색·줄바꿈·위치·정렬, 키비주얼 크기·위치·crop·한 변 녹임, 배경색·그라데이션·도형·블러.
- 고정(서버가 고치거나 다시 요청): 캔버스 크기, 안전영역(매체 수치, 없으면 짧은 변 4%), 필수 문구(고객사 이름·접수 기간·고지), 지정 폰트와 보유 굵기, 로고 원본 비율, 글자 크기 범위(카카오 48~164 · 고지 24), 키비주얼 왜곡 금지(crop 비율 = 상자 비율), 줄 수 권장(경고).
- 배경 그래픽은 코드로 그릴 수 있는 것만. 이미지 생성 API 는 쓰지 않는다.

### 모델 · 비용
기본 `claude-opus-5-5`(effort high, 거절 시 서버 측 폴백 켬), 선택 `claude-sonnet-5-5`. 응답에 `usage`(토큰)·`cost`(단가표 추정 USD)·`calls`(요청 수)·`ms` 가 실린다.

## 대표 규격
B 트랙은 자유 매체 2개에서 켠다: 카카오 디스플레이 PC 1200×600(`kakao-display-pc-promo`, 안전영역·글자 크기·Pretendard 규정 있음) · 구글 GDN 580×400(`google-gdn-580x400`, 규정 거의 없음). 규정 매체(자소설 PC팝업 등)는 틀이 고정이라 B 의 차이가 안 드러난다.
