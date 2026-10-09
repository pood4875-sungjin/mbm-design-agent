---
name: history-log
description: 작업을 마친 뒤 history/ 폴더를 README 의 「쌓는 규칙」대로 갱신한다 — 날짜별 기록 파일 새로 쓰기, README 인덱스 표에 한 줄, 00_브리핑.md 의 「지금 어디」「정해야 할 것」「테스트 누적」 갱신. 수치는 rounds.json·npm test·git 에서만 옮긴다. 트리거 - "히스토리 남겨줘", "기록 정리해줘", "브리핑 갱신", "오늘 한 거 history에", "작업 로그 써줘", "update history", "write the work log", "update the briefing".
---

# history-log — 히스토리 쌓기

규칙의 원문은 `history/README.md` 「쌓는 규칙」이다. 먼저 그것과 `history/00_브리핑.md`, 가장 최근 날짜 기록을 읽는다.
사람(김성진)과 Claude 가 같이 읽는다 — **한국어로, 쉽게.** 결정·근거 위주, 짧은 문장, 표는 꼭 필요할 때만.

## 1. 수치 모으기 (추측 금지)
```bash
cd ~/mbm-design-agent
node scripts/round-diff.mjs --list 10                         # 라운드 번호·시각(KST)·케이스 수·경고 합계·note
node scripts/round-diff.mjs --from <작업 전 정식 라운드> --to <마지막 정식 라운드> --md   # 케이스별 전/후 표
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail) "                     # 테스트 건수
git diff --stat | tail -1; git status --short | wc -l          # 미커밋 파일 수(+/−)
node scripts/cases.mjs list | wc -l                            # 장부 케이스 수
```
- 「(중간)」 라운드는 표에 넣지 않거나 한 줄로만.
- 라운드 total 은 그 실행에 들어간 케이스만의 합이다(intake·일부 run). 합계를 말할 때는 케이스 수를 같이 쓴다.
- 「그린 광고 이미지 수」 = 라운드별 케이스 수 합 × 74 (브리핑에 쓰는 누적치):
  `node -e "const r=require('./ref/learned/cases/rounds.json');const s=r.reduce((a,x)=>a+Object.keys(x.cases).length,0);console.log(s, s*74)"`
- 그날 보고서(`ref/learned/cases/_out/*.md`)가 있으면 거기 수치를 쓰되, rounds.json 과 다르면 rounds.json 이 맞다.

## 2. 날짜별 기록 새로 쓰기
파일: `history/YYYY-MM-DD_<짧은 제목>.md` (밤샘이면 시작 날짜, 제목에 「(밤 → 다음날 새벽)」).
**한 번 쓴 기록은 고치지 않는다** — 같은 날 이어지면 새 파일(`…_2.md` 또는 다른 제목).
```
# YYYY-MM-DD — <제목>

**상태: 커밋 여부.** 테스트 n건 통과, 회귀 여부.

## 1. <한 일 덩어리>
- 무엇을, 왜. 보고서 링크(상대경로 ../ref/learned/cases/_out/…).
- 규칙을 바꿨으면: `파일:줄 · 이전 → 이후 · 근거 케이스`
## 2. …
## 라운드 기록
| 라운드 | 케이스 | 경고 | 내용 |
## 결정            ← 사용자가 정한 것: 「결정: …」 (있을 때만)
## 이미지          ← 갤러리 URL, _out 하위 폴더 링크
## 바뀐 파일       ← 코드 · 매체 JSON · 스크립트 · 테스트
```
- 이미지는 `ref/learned/cases/_out/`(git 밖, 로컬 전용). 링크는 **상대경로**.

## 3. README 인덱스 한 줄
`history/README.md` 「날짜별 기록」 표 끝에:
`| YYYY-MM-DD | [파일명](파일명) | 한 줄 요약(무엇 → 결과 수치) |`

## 4. 브리핑 갱신 (`history/00_브리핑.md`)
- 맨 위 `> 마지막 갱신: YYYY-MM-DD` 바꾸기.
- 「2. 지금까지의 길」 표에 시기 한 줄.
- 「3. 지금 어디」: 단계 그림(① ~ ④의 ✅/🔄/⏳)과 테스트 n건·미커밋 파일 수.
- 「4. 키비주얼 테스트 누적」: 묶음 표(묶음·그림 수·출처·라운드·경고 처음 → 지금)와 합계, 그린 장수.
- 「5. 정해야 할 것」: 새 질문 추가. **사용자가 결정한 것은 지우고** 날짜별 기록에 「결정: …」으로 옮긴다.
- 「6. 남은 문제」: 해결된 것 빼고 새로 생긴 것 넣기.
- 「7. 다시 돌리는 법」: 명령이 바뀌었으면.
- 대표 이미지를 바꿨으면 상대경로로.

## 출력 계약
- 바뀐 파일 3개(새 날짜 기록 · README · 브리핑)의 경로와, 브리핑에서 바뀐 절 목록을 사용자에게 알린다.
- 숫자마다 출처가 rounds.json·npm test·git 중 하나여야 한다. 못 잰 것은 「못 잼」.

## 함정
- rounds.json `at` 은 UTC — 히스토리에는 KST(round-diff 출력)를 쓴다.
- 다른 에이전트가 같은 시각에 라운드를 남겼을 수 있다(예: 「데스크탑 키비주얼 44건 접수」). 내 작업의 라운드만 골라 적고, 남의 라운드는 「다른 작업」으로 한 줄.
- 브리핑은 「쉽게 정리한 글」이다 — 파일:줄 같은 세부는 날짜별 기록에만.
