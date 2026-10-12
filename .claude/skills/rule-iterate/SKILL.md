---
name: rule-iterate
description: 디자인 규칙(core/ 의 kvtypes·canon·layouts·ad.js·field.js·매체 JSON)을 바꾸고 전 케이스×74규격을 다시 돌려 라운드를 남기고, 케이스별로 이전 라운드와 견줘 회귀를 고치거나 되돌리고, 테스트를 더하고, 디자인 가이드를 새 날짜 폴더로 다시 뽑는 반복 루프. 트리거 - "규칙 반영해줘", "이 제안 채택해서 돌려봐", "규칙화", "라운드 돌려", "회귀 확인", "경고 줄여줘", "adopt these rules", "run a round", "check regressions".
---

# rule-iterate — 규칙 채택 루프

입력: 규칙 제안 목록(보통 `figma-design-compare`·`typo-compare`·`kv-review` 보고서의 「규칙 수정 후보」).
출력: 코드 변경 + 라운드 기록 + 테스트 + 가이드 + 보고서(`_out/<작업명>.md`). **커밋하지 않는다**(사용자 승인 대기).

## 정책 (10-08 밤에 정함)
- 근거 케이스가 **하나여도 채택**한다. 다른 케이스와 부딪히면 조정한다. 깔끔히 안 풀리면 **그 규칙만 되돌리고** 기록한다.
- 기존 미커밋 변경은 그대로 두고 그 위에 쌓는다. `git stash`·`checkout` 금지.
- 손대지 않는 파일: `app/config.local.js`(키), `core/media.js`·`core/design.js`(생성물 — 원본 JSON 을 고치고 빌드).

## 1. 기준선
```bash
cd ~/mbm-design-agent
B=<scratchpad>/base-$(date +%m%d-%H%M); mkdir -p $B
cp ref/learned/cases/_out/*.checks.json ref/learned/cases/rounds.json ref/learned/cases/cases.json $B/
cp ref/learned/cases/_out/trace/summary.json $B/trace-summary.json 2>/dev/null   # 가이드 대조표 기준선(✗ 목록)
node scripts/round-diff.mjs --list 5          # 마지막 정식 라운드 번호 = 비교 기준
npm test 2>&1 | tail -5                       # 시작 시 통과 수
git diff --stat | tail -1
```
- 다른 에이전트가 같은 시각에 core 나 장부를 만지는지 확인(`round-diff --list` 에 낯선 라운드, `git diff --stat core` 변화). 겹치면 사용자에게 알리고 기다린다.

## 2. 규칙 하나(또는 묶음)씩 넣기
- 값은 데이터 자리에 둔다: 공통 수치 → `core/canon.js`, 형태별 → `core/layouts.js`, 유형 판정 → `core/kvtypes.js`(측정은 `core/palette.js`), 배치 → `core/renderers/ad.js`, 지면 → `core/field.js`, 매체 규정 → `core/media/<매체>.json` 후 **`node scripts/build-media.mjs`**(core/media.js 재생성).
- 주석에 근거를 남긴다: `// 10-09 <묶음>: 디자이너 n/N … (_out/<보고서>.md §x)`.
- 측정 규칙(kvtypes/palette)을 바꿨으면 장부의 유형을 다시 잰다: `node scripts/cases.mjs remeasure`.
- **규칙을 넣거나 바꾸면 `ref/learned/rules.json` 에 한 줄 추가·수정하고 `node scripts/rules-ledger.mjs --md` 로 검사한다**(형식·id 중복·코드 위치 파일 존재 + `history/규칙장부.md` 표 재생성). 되돌린 규칙은 지우지 말고 `status: "reverted"`, 근거 케이스가 하나면 `"single-evidence"`.

## 3. 라운드 돌리기 (전 케이스)
```bash
node scripts/cases.mjs run --round "<무엇을 바꿨나> (중간)"      # 중간 실행이면 note 끝에 (중간)
node scripts/cases.mjs run --round "<묶음> 규칙화"                # 마지막 정식 라운드
```
- **id 없이 전체를 돌린다** — `run <id…>` 는 그 케이스만 라운드에 남아 total 이 다른 라운드와 견줄 수 없다.
- 46케이스 × 74규격이 몇 분~10분. Bash `timeout: 600000` 또는 `run_in_background`. `--shots` 는 시트 PNG 가 필요할 때만(느려진다 — 마지막 라운드에만).
- 중간 실행이 여러 번이면 각 note 에 「(중간)」을 붙인다. 보고서·히스토리에는 정식 라운드만 표로, 중간은 한 줄로.

## 4. 견주기 — 회귀 찾기
```bash
node scripts/round-diff.mjs --from <기준 라운드> --to <방금 라운드>        # 케이스별 경고 수·종류 변화, 「회귀」가 위로
node scripts/round-diff.mjs --from <기준> --checks $B                     # 규격 단위: + 새 경고 · − 사라짐 · ~ 수치 바뀜
```
- 회귀(경고 늘어남, 새 경고)마다: 시트로 확인 → `node scripts/case-review.mjs <id> --specs <규격>` 으로 눈으로 본다.
  - 조정으로 풀리면 조정하고 다시 3단계.
  - 안 풀리면 **그 규칙만 되돌리고** 「되돌림: 무엇을·왜(어느 케이스 어느 규격이 어떻게 깨졌나)」를 기록.
- 경고 수가 같아도 내용이 바뀌었을 수 있다(`~`). 참고(info) 등급 변화는 따로 적는다(합계에 안 들어감).
- 개선만 보지 말고 **기존 케이스의 회귀 0** 을 확인한다(예: 「기존 17 = 10, 라운드 25 와 규격·문장까지 같음」).
- **가이드 대조표**(10-12): 마지막 정식 라운드는 `run --round "…" --trace` 로(또는 `node scripts/guide-trace.mjs`) 돌려 `_out/trace/index.html` 을 열고 「✗ 규칙별 모음」을 보고서 §5 에 옮긴다. 바꾼 규칙의 ✗ 가 줄었는지(기준 라운드의 `_out/trace/summary.json` 을 백업해 두고 견준다), 다른 규칙에 새 ✗ 가 생기지 않았는지 본다. ✗ 가 「가이드 문장이 코드보다 느슨」한 것이면 rules.json 문장을 고친다(코드가 아니라). 판정 논리만 고쳤으면 `--reeval`.

## 5. 테스트
- 새 규칙마다 테스트를 더한다: `test/<묶음>.test.js`(예: `test/figma-dg.test.js`, `test/figma-sep-typo.test.js`). 형식은 `node:test` + `assert/strict`, 실측 meta 를 축약해 넣고 `renderAd`/`kvTypeOf` 결과를 단언.
- 규칙이 바뀌어 기존 기대값이 틀려진 테스트는 고치고 `file:줄 · 이전 → 이후` 로 기록.
```bash
npm test 2>&1 | tail -8           # 전부 통과해야 끝
```

## 6. 디자인 가이드 다시 뽑기 (새 날짜 폴더)
```bash
node scripts/kv-guide.mjs "$HOME/Downloads/키비주얼 디자인 가이드_$(date +%m%d)"
# 같은 날 두 번째면 이름에 꼬리표: "…_1009-밤(타이포)"
```
- **이미 전달한 폴더는 덮어쓰지 않는다**(`ls ~/Downloads | grep 가이드` 로 확인). 가이드 문서에 새 절이 필요하면 `scripts/kv-guide.mjs` 를 고친다(값은 core 에서 읽게).
- 매체 규정 가이드(광고소재 가이드)가 바뀐 경우는 `guide-export` 스킬.

## 7. 보고서 — 출력 계약 (`ref/learned/cases/_out/<작업명>.md`)
```
# <작업명> — <묶음> (YYYY-MM-DD)
- 근거 문서 · 정책 · 커밋 안 함 · 손 안 댄 파일
- 결과: npm test a/a 통과(+새 n) · 라운드 X → Y, 경고 p → q, 새 경고 r건
## 1. 규칙별 변경 (# · file:line · 이전 → 이후 · 근거 케이스)
## 2. 테스트 (새 파일·건수, 고친 기존 테스트)
## 3. 라운드 (케이스 | r기준 | r최종 | 바뀐 것)  ← round-diff --md 를 붙인다. 중간 라운드는 한 줄
## 4. (비교 대상이 있으면) 디자이너와 전/후
## 5. 충돌 — 해결 / 미해결 / 되돌림 · 가이드 대조표 ✗(규칙별, 전/후)
## 6. 사용자 확인이 필요한 것 (근거 1건뿐인 수치, 레퍼런스와 충돌하는 값)
## 7. 산출물 (코드·테스트·rounds 번호·가이드 폴더·비교 이미지)
```
끝나면 `history-log` 스킬로 히스토리를 쌓고, 비교 이미지가 있으면 `results-gallery` 로 갤러리에 섹션을 더한다.

## 함정
- rounds.json `at` 은 UTC. 보고서에는 KST 로(round-diff 가 바꿔 찍는다).
- `cases.mjs run` 은 `_out/<id>.checks.json` 을 덮어쓴다 — 기준선 백업 없이 돌리면 규격 단위 비교를 못 한다.
- 자동 검수가 「개선」이라 해도 눈으로 봐야 한다: 빈 띠 경고를 없애려 KV 를 키우면 글자와 겹치는 식의 맞바꿈이 생긴다(R8 정사각 확장·상반신 55% 확대가 그래서 되돌려졌다).
- 매체 JSON 을 고치고 build-media 를 안 돌리면 렌더에 반영되지 않는다(테스트도 옛 값).
