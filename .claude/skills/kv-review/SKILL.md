---
name: kv-review
description: 키비주얼(KV) 그림을 케이스 장부에 접수해 74개 광고 규격으로 렌더하고, 자동 검수(adcheck) + 눈 검수 후 문제마다 원인을 규칙 탓/그림 탓/오탐으로 가려 보고한다. 코드는 고치지 않는다. 트리거 - "키비주얼 검수해줘", "KV 넣어보고 깨지는 거 찾아줘", "이 그림들 테스트해줘", "intake 돌려줘", "_inbox에 넣었어", "KV review", "test these key visuals", "run intake".
---

# kv-review — 키비주얼 접수·검수

`~/mbm-design-agent` 에서 돈다. 규칙 코드(core/)는 **고치지 않는다** — 돌리고, 보고, 원인을 가려 보고한다.
고치는 일은 `rule-iterate` 스킬로 넘긴다. 같은 절차를 서브에이전트로 돌리려면 `.claude/agents/kv-reviewer.md` 를 쓴다.

## 0. 시작 전 확인
```bash
cd ~/mbm-design-agent
node scripts/cases.mjs list | tail -5          # 장부 상태, 기존 id
node scripts/round-diff.mjs --list 5           # 최근 라운드(다른 에이전트가 방금 돌렸는지)
git diff --stat core | tail -1                 # core 가 지금 바뀌는 중인지(다른 에이전트)
```
- 다른 에이전트가 core/ 를 고치는 중이면 결과가 흔들린다. 보고서에 시각과 `git diff --stat core` 한 줄을 적는다.

## 1. 접수 (자동)
1. 그림을 `ref/learned/cases/_inbox/` 에 **복사**한다(원본은 그대로). 파일 이름 = 케이스 id.
   - 로고가 있으면 `<같은이름>.logo.png` 로 같이 둔다(투명 PNG). 로고가 svg/ico/gif 면 아직 변환 스킬이 없다(보류) — 로고 없이 접수하고 보고서에 적는다.
   - id 가 장부에 이미 있으면(`cases.mjs list`) 뒤에 `-2` 를 붙인다. 영문 소문자·숫자·하이픈 권장.
   - 이미 Figma staging 폴더(manifest.json)로 받은 묶음이면 `figma-kv-extract` 스킬 4단계(add-from-manifest)로 넣는다 — primary·fields 가 따라간다.
2. 한 번에 접수·렌더·검수·보고서:
   ```bash
   node scripts/cases.mjs intake --round "intake: <한 줄 설명>"     # 수 분. Bash timeout 600000
   ```
   - add(누끼 투명 여백 자동 트림 `case-trim.py`·유형 측정) → 해당 케이스만 74규격 재렌더 → `core/adcheck.js` 검수 → 시트 스크린샷 → `_out/intake-<날짜>.md`.
   - 처리한 그림은 `_inbox/done/` 으로 옮겨진다.
   - 다른 폴더를 바로 쓰려면 `node scripts/cases.mjs intake <폴더> --round "…"`.
3. 읽을 것: `ref/learned/cases/_out/intake-<날짜>.md`, `_out/<id>.checks.json`.

## 2. 눈 검수 (자동 검수가 못 보는 것)
adcheck 는 6종만 본다: text-over-subject(글자-주인공 겹침) · logo-covered(로고 가림) · hard-cut(뚝 끊긴 변) · empty-band(빈 띠) · text-clipped(글자 잘림) · chip-overflow(알약 넘침).
지면 톤·KV 크기·블리드·로고 크기·매체 규정 위반·얼굴 잘림은 못 본다(9월 공채 비교에서 확인된 한계).

```bash
node scripts/case-review.mjs <id> [id …]          # → ref/learned/cases/_out/review/<id>.png
```
- 대표 4규격(google-gdn-580x400 가로형 · remember-main-top-mo 가로 띠 · google-gdn-300x600 세로형 · instagram-feed-1080 정사각) + 경고 난 규격(최대 8)을 한 장에. 경고 문장이 칸 위에 빨갛게 붙는다. `Read` 로 본다.
- 더 볼 규격: `--specs nap-dsp-band-320x50,albamon-pc-sky-recruit`.
- 74규격 전체 시트는 `_out/<id>.png`(2200px 폭). 부분만 보려면 축소본을 먼저 보고 좌표를 정해 자른다:
  `python3 -c "from PIL import Image; Image.open('<png>').crop((x0,y0,x1,y1)).save('<scratchpad>/c.png')"`
- 볼 것: 주인공(인물·캐릭터·제품) 얼굴/핵심부 잘림 · 글자 대비 · 위계(메인 카피가 가장 눈에 띄나) · KV 비중(너무 작거나 과함) · 로고 위치·크기 · 여백 쏠림 · 이음매.

## 3. 원인 가리기
**먼저 유형 판정(summary)이 그림과 맞는지 본다.** 틀리면 이후 배치가 전부 따라 틀린다(Design-Generator 29건 중 11건이 유형 오판이었다). 틀리면 그것부터 보고.

문제마다 하나로:
- **규칙 탓** — 같은 유형 다른 케이스에도 날 문제. 어느 층위인지 Grep 으로 짚는다:
  `core/kvtypes.js`(유형 판정·서브타입) · `core/palette.js`(측정) · `core/renderers/ad.js`(배치·타이포) · `core/field.js`(지면·열) · `core/canon.js`(공통 수치) · `core/layouts.js`(형태 문법) · `core/media/*.json`(매체 규정).
- **그림 탓** — 해상도 부족(트림 후 긴 변 < 1080 이면 인스타·스토리에서 흐림), 여백 없음, 피사체가 가장자리에 붙음, 흰 옷 + 흰 바탕 등. 디자이너에게 받을 대안을 적는다.
- **오탐** — 검수가 잘못 짚음. 잘라 본 근거를 적는다(예: 바닥 띠가 주인공 상자에 들어가 겹침으로 잡힘, 성긴 오브젝트 상자).

## 4. 보고 (한국어, 간결) — 출력 계약
```
## 요약
N건 접수 · 자동 경고 합계 X · 눈 검수 추가 문제 Y · 유형 오판 Z
## 케이스별
### <id> — <유형 summary> (판정 맞음/틀림)
| 규격 | 문제 | 출처(자동/눈) | 원인(규칙/그림/오탐) | 근거·짚은 코드 |
## 규칙 수정 후보 (우선순위 순)
1. <무엇을> — 영향 케이스 a,b — core/파일:분기
## 산출물
_out/intake-<날짜>.md · _out/index.html(장부) · _out/<id>.png · _out/review/<id>.png
```
- 추측으로 채우지 않는다. 못 본 것은 「못 봄」.
- 라운드 번호와 경고 합계는 `node scripts/round-diff.mjs --list 3` 에서 옮긴다.

## 함정
- `cases.mjs run <id…>` / intake 는 **그 케이스만** 라운드에 남긴다. 라운드 total 은 그 케이스들의 합이라 전체 라운드와 견주면 안 된다.
- rounds.json 의 `at` 은 UTC 다(KST = +9).
- 고정 대기 대신 프레임별 로드 대기(상한 20초)로 재므로 한 번에 많이 돌리면 느리다. 46케이스 전체 run 은 10분 가까이 걸릴 수 있다 → `run_in_background` 로.
- 누끼가 아닌데 투명 여백이 있으면 트림된다(원본은 케이스 폴더의 `kv-orig.*`).
- 브랜드색(primary)을 안 주면 KV 대표색이 브랜드가 된다 — 무채색 누끼는 회색 지면이 나온다. 아는 브랜드색이 있으면 `cases.mjs add … --primary #HEX` 로 넣는다.
