---
name: figma-design-compare
description: 같은 KV 로 디자이너가 만든 Figma 광고 소재와 우리 에이전트 렌더를 규격별로 견준다 — 프레임↔spec 매핑, KV 면적%·블리드·메인 글자 px·로고 크기·지면 톤 실측, 나란히 이미지, 차이를 층위(kvtypes/canon/ad.js/field.js/layouts/매체 JSON)에 매핑하고 일반화할 규칙과 디자이너 표현을 가른다. 코드는 고치지 않는다. 트리거 - "디자이너 소재랑 비교해줘", "Figma 소재 vs 우리 렌더", "이 피그마랑 우리 결과 차이 분석", "갭 분석", "compare designer Figma ads with our renders", "design gap analysis".
---

# figma-design-compare — 디자이너 Figma vs 우리 렌더 갭 분석

산출: `ref/learned/cases/_out/<묶음>-compare.md`(보고서) + `_out/<묶음>/<spec>.png`(나란히 이미지).
규칙 코드는 **고치지 않는다**. 제안까지만 — 채택은 `rule-iterate`. 타이포만 깊게 볼 때는 `typo-compare`.
선례: `ref/learned/cases/_out/figma-sep-compare.md`(9월 공채, 13규격, 규칙 12개 제안 → 10개 채택).

## 0. 준비
- Figma 도구 로딩·스니펫 사용법은 `figma-kv-extract` 0단계와 같다(ToolSearch select 목록 → `Skill figma:figma-use` → `node scripts/figma/plugin-code.mjs <스니펫> '<ARGS>'`).
- 받은 노드가 TEXT 일 수 있다 → `locate` 로 페이지까지 올라가 그 페이지의 광고 프레임 전부를 대상으로 잡고, 그렇게 했다고 보고서 첫머리에 적는다.
- KV 가 아직 장부에 없으면 `figma-kv-extract` 로 원본(알파)을 받아 **실카피**로 접수한다:
  `node scripts/cases.mjs add <kv.png> --id <id> --logo <logo.png> --primary <#HEX 알면> --fields '<실카피 JSON>'`
  - 실카피 키: client · role · employType · season · hiringType · startDate · deadline · slogan · location · applyUrl(소재에 없으면 넣지 않는다 — 추측 금지). headline 은 매체마다 문구가 다르면 비운다.
- core 가 다른 에이전트 손에 있으면 측정 시각과 `git diff --stat core` 를 기록한다.

## 1. 프레임 → spec 매핑
1. 섹션·프레임 목록: `frame-boxes`(또는 get_metadata)로 섹션별 프레임 id·크기.
2. 우리 규격 목록에서 짝을 찾는다:
   ```bash
   node -e "import('./core/media.js').then(m=>{for(const x of m.MEDIA)for(const s of x.specs||[])console.log(s.id,s.w+'x'+s.h,s.name)})" | grep -i <매체>
   ```
3. 표로 남긴다: 섹션 · 프레임(id) · 크기 · 우리 spec. 짝이 없는 상품(예: 네이버 브랜드검색)은 「우리 매체 목록에 없음」.
4. `map.json` = `{ "<spec>": "<frameId>" }` (규격당 대표 프레임 하나).
5. 디자이너 프레임 1x 스크린샷을 `<작업폴더>/frames/<spec>.png` 로 받는다(`get_screenshot` maxDimension = 프레임 긴 변 → `assets.py fetch --named`).

## 2. 실측
**우리 쪽** (1x, DOM 실측 + 실루엣):
```bash
W=<scratchpad>/<묶음>
node scripts/figma/render-ours.mjs --case <id> --out $W/ours --specs $(node -e "console.log(Object.keys(require('$W/map.json')).join(','))") --sil
# 브랜드색 가정 판도 한 번 더(지면 톤 비교용):
node scripts/figma/render-ours.mjs --case <id> --out $W/ours-brand --specs <…> --primary '#00146E'
```
→ `measure.json`: 글자 역할별 px·굵기·행간·자간·줄, 로고 상자, data-* (kv-use 등), 지면 background.

**디자이너 쪽**:
- `frame-boxes` → 글자(크기·굵기·색), 로고 상자, 바탕 채우기, KV 이미지 노드 상자·불투명도·blend.
- `kv-transforms`(ARGS: pageId, frameIds, hashPrefixes=[KV 해시 앞 4~8자]) → 결과 JSON 을 `$W/kv-transforms.json` 으로 저장.
  - 여기서 KV 필터(노출·채도·색온도)·회전·마스크 덧칠도 본다.

**KV 면적·블리드**:
```bash
python3 scripts/figma/kv-area.py --kv <Figma 원본 KV(트림 전)> --transforms $W/kv-transforms.json --map $W/map.json --ours $W/ours --out $W/metrics.json
```
- area = 캔버스 대비 보이는 KV %, bbox(%), bleed = 잘린 변(L/T/R/B), shown = 디자이너 오브젝트가 캔버스 안에 들어온 비율.
- `--kv` 는 **트림 전 원본**이어야 한다(Figma 노드 상자가 원본 전체에 대응). 케이스 폴더의 `kv-orig.png` 가 있으면 그것.
- 알파 없는 KV(사진·바탕 있는 그림)는 면적이 무의미 → 「측정 안 함」.

**나란히 이미지**:
```bash
python3 scripts/figma/side-by-side.py --out ref/learned/cases/_out/<묶음>/<spec>.png "디자이너(Figma)=$W/frames/<spec>.png" "우리=$W/ours/<spec>.png" ["우리(브랜드색)=$W/ours-brand/<spec>.png"]
```
가로로 긴 규격은 자동으로 위아래, 나머지는 좌우.

## 3. 비교 표 (규격별)
| spec | KV 면적 F / O | KV bbox·블리드 F | O | 메인 F / O | 로고 F / O | 지면 F / O |
- 메인: px · 줄 수 · 보조줄(날짜·슬로건·CTA) 유무. 로고: w×h · 위치. 지면: 단색 hex / 그라데이션 / 질감.
- 매체 규정 위반도 짚는다: `core/media/<매체>.json` 의 textLimits·fontSizeRange·objectBox·logo.count 와 우리 값을 견준다.
- 마지막에 「요약」 3줄: 템플릿 실측 매체는 맞는지, 가이드로 정해지는 매체는 어디서 벌어지는지, 디자이너 공통 패턴(예: 13/13 다크 지면).

## 4. 차이 → 규칙 (층위 매핑)
각 차이마다 `층위 · 지금 값(file:line) · 제안 값 · 근거(디자이너 n/N, 실측)`:
| 층위 | 파일 | 무엇을 정하나 |
|---|---|---|
| KV 유형 | core/kvtypes.js, core/palette.js | 유형·서브타입 판정(측정 임계값), 유형별 배치·지면 가이드 |
| 공통 수치 | core/canon.js | objectBleed·fill.maxObject·tracking·keepInfo·required 등 |
| 형태 문법 | core/layouts.js | 가로형/세로형/정사각/세로 띠별 메인 크기·행간·로고 높이 |
| 배치 | core/renderers/ad.js | 열 폭·사다리(무엇을 버리나)·로고 자리·맞춤 루프 |
| 지면 | core/field.js | 지면 톤(tint/brand/dark)·스크림 |
| 매체 규정 | core/media/*.json → `node scripts/build-media.mjs` | 글자 크기 띠·오브젝트 상자·로고 개수 |
| 정보 | core/context.js | recruit 필드(tags·cta 등) |

**(a) 일반화할 규칙**(우선순위 순)과 **(b) 디자이너 표현 — 규칙으로 만들지 않음**을 나눈다. 가르는 기준:
- (a): 같은 캠페인 여러 규격에서 반복(n/N 로 셈), 매체 규정과 맞음, 다른 KV 에도 의미가 있음.
- (b): 일회성 연출(별밭·글로우 겹치기, 이미지 필터, 규격마다 다른 회전·반전), 카피 선택(질문형/제목형), 매체 규정과 어긋나는 것(그 경우 우리 규칙 유지라고 적는다).
- 빈도는 높지만 입력이 필요한 것(두 톤 강조색 등)은 **(B) 옵션 후보**로 따로 — 사용자 결정 필요.
- 각 제안에 미검증 항목(회귀 안 해 봄, 근거 케이스 1개)을 붙인다.

## 5. 보고서 — 출력 계약 (`_out/<묶음>-compare.md`)
```
# Figma 「<이름>」 디자이너 소재와 우리 에이전트 비교 — YYYY-MM-DD
- 원본 fileKey·노드(받은 노드가 무엇이었고 범위를 어떻게 잡았나) · 케이스 id · 비교 이미지 위치 · 실측 방법
## 1. 찾은 프레임 (섹션·프레임 id·크기·우리 spec)
## 2. KV 추출 (해시·원본 크기·알파·로고·보조 그림·디자이너 필터)
## 3. 접수 + 자동 검수 (유형 판정 맞음/틀림 · 경고 n/74 · 자동 검수가 못 잡은 큰 문제)
## 4. 규격별 비교 (표 + 요약)
## 5. 차이 → 필요한 규칙 ((a) 일반화 · (b) 표현)
## 6. 열린 질문 / 못 본 것
## 산출물
```
그리고 사용자에게: 핵심 차이 3개, 제안 규칙 수(a/b), 결정이 필요한 것.

## 함정
- 우리 시트 `_out/<id>.png` 는 0.5배 축소본 — 비교에는 render-ours 1x 를 쓴다.
- 디자이너 프레임 스크린샷 배율이 1x 가 아닐 수 있다(side-by-side 가 비율 같으면 맞춰 줌).
- 리멤버처럼 프레임이 아니라 납작한 이미지 사각형인 소재는 글자·KV 실측 불가 → 「측정 안 함」.
- 글자가 아웃라인(VECTOR)인 프레임은 frame-boxes 에 TEXT 가 없다 → 같은 카피의 텍스트판 프레임을 찾는다.
- KV 해시는 변형(인스타용 등)이 따로 있을 수 있다 — hashPrefixes 에 둘 다 넣는다.
- 브랜드색을 모르면 KV 대표색이 브랜드가 된다 → `--primary` 가정판을 꼭 같이 찍어 「지면 톤 차이가 색 입력 탓인지 규칙 탓인지」 가른다.
