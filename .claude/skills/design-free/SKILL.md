---
name: design-free
description: 자유 디자인 — Claude(이 대화창)가 케이스 × 규격의 광고 한 장을 배경(2색 그라데이션·스크림·KV 합성)과 타이포까지 HTML/CSS 로 직접 설계하고, 헤드리스 Chrome 으로 PNG 렌더 + 검수(core/lint.js + 실측 + AI 티 검출)까지 돌린다. 앱의 POST /api/freedesign 과 같은 계약. 트리거 - "/design-free <케이스id> <규격,…> [요구사항]", "자유 디자인 해줘", "직접 배경 디자인", "free design".
---

# design-free — Claude 가 직접 디자인하는 자유 시안

`~/mbm-design-agent` 에서 돈다. 서버·API 키 없이 이 대화창의 Claude 가 설계한다(헤드리스 `claude -p` 브리지는 `scripts/freedesign-run.mjs`).
계약은 `server/freedesign.js` 머리말과 같다 — **바꾸지 않는다**. 규칙은 `docs/freedesign-rules.md`(1·2항 AI 티 금지 · 3항 정보 블록 · 4항 간격)가 정본.
**요청 1회 = 안 3개**: 스타일 방향 `STYLE_DIRECTIONS`(server/freedesign.js) 기본 세트 ① typo 타이포 강조형 ② bright 밝은 비주얼형 ③ dark 어두운 비주얼형 — 규격마다 방향 3개를 각각 설계·렌더·검수·자기 검토한다(`--styles typo,dark` 처럼 사용자가 고르면 그것만).

## 사용
`/design-free <케이스id> <규격,…> [요구사항] [--styles typo,bright,dark]`  예) `/design-free sep-open-recruit google-gdn-580x400,instagram-feed-1080 글자 더 크게`

## 1. 재료 뽑기
```bash
node scripts/freedesign-brief.mjs <케이스id> <규격,…> _out/freedesign/<케이스id>/brief [--req "요구사항"]
```
규격마다 `<규격>.prompt.md`(규격 규칙·브리프 문구·KV 설명·디자인 원칙·규칙 1~4항·간격 규칙 수치·정보 블록 프리셋 3종·출력 형식)와 `<규격>.input.json` 이 생긴다. 방향별 지시 한 줄은 `STYLE_DIRECTIONS[].hint` 를 프롬프트 「## 스타일 방향」에 그대로 더해 읽는다.
**프롬프트를 읽고, KV·로고 그림을 Read 로 눈으로 본 뒤** 설계한다. 문구는 프롬프트의 「역할별 쓸 수 있는 문구」 중에서만.

## 2. 설계 — `_out/freedesign/<케이스id>/<규격>--<style>.json` (방향 3개, `name` 에 `<규격>--<style>`)
```json
{ "specId": "<규격>", "caseId": "<케이스id>", "name": "<규격>--typo", "style": "typo", "html": "<div data-ad=\"1\" data-spec=\"<규격>\" data-free=\"1\" style=\"position:relative;width:{w}px;height:{h}px;overflow:hidden;font-family:'…'\">…</div>", "notes": "왜 이렇게 했는지 한 줄" }
```
- 그림은 `{{KV}}`·`{{LOGO}}` 자리표시(렌더 스크립트가 케이스 파일 file:// 로 치환). dataURL 을 적지 않는다.
- 글자는 `data-field="main|sub|date|detail|notice"` 한 역할 한 요소, 줄바꿈 `<br>`. KV 는 `data-object="1"`(background url) 또는 `<img data-kv="1">`, 로고 `<img data-logo="1">`.
- 글꼴은 `rules.fonts.allowed` 의 family 이름 그대로(@font-face 는 렌더가 넣는다). 외부 URL·script·link 금지.
- 지킬 것(검증기가 바로 잡는다): 양의 letter-spacing · 장평(1·2항). **정보 블록(3항)**: date·detail·notice 는 프롬프트의 프리셋 3종(뱃지형 2행 / 볼드 라벨형 2행 / 세로 구분선형 가로 1행) 중 하나를 통째로 — 라벨 스타일 하나, 라벨 고정 폭, 값 시작 x 같게, 행 간격 ≥ 0.6em. **간격(4항)**: 서브→메인 ≥ 0.3em · 메인→정보 ≥ 0.8em · 정보 행 ≥ 0.6em · 모든 쌍 ≤ 분포 상위10%×메인 px · 글자↔누끼 주인공/로고 겹침 0·거리 ≥ 메인 0.5배·키비주얼은 긴 변 10% 이하 · 잘림/낱말 안 줄바꿈 0. 여백·메인 크기·서브/메인 비는 프롬프트의 「참고 분포」를 따르되 검증하지 않는다. 로고 폭 규격 폭의 12~18%(어두운 지면이면 `filter:brightness(0) invert(1)` 로 흰색).
- 규격별: 리멤버 = Pretendard 고정·로고 불가·메인 글자색 #000000(서브 #FFFFFF)·배경 금지색(#FFFFFF·#000000·#FF5414·#F7F7F0·#E8E7E0) → 밝은 유색 지면. 구글 GDN 580 = 150KB.

## 3. 렌더 + 검수
```bash
node scripts/freedesign-render.mjs _out/freedesign/<케이스id> _out/freedesign/<케이스id>
```
렌더·측정·판정은 `scripts/lib/freedesign-renderer.mjs`(서버 selfReview 와 같은 모듈). 규격·방향마다 `.html`(app/fonts @font-face 주입) · `.png`(제출 크기, exportScale 반영) · `.audit.json`(측정값 `free`: 잉크 상자·행간·낱말 안 줄바꿈·라벨·KV 실제 상자) 을 쓰고 표 한 줄씩 낸다:
`| 규격 | 판정(통과/lint 경고/lint 차단/계약✗) | 계약 검증 오류 | lint(core/lint.js) | 메인 px · r2 · 여백 · 그림 % · 청사진 벗어남 | 정보 블록(3항) ✓/✗ 사유 | 타이포 규칙(4항 간격·거리·잘림) ✓/✗ 사유 | 글자 대비<4.5 | KV 로드 · KB |`
걸린 것(계약·3항·4항)은 HTML 을 고쳐 다시 돌린다(최대 2회).

## 3-2. 자기 검토 1회(서버 `review:true` 와 같은 단계)
방향마다 렌더 PNG 를 **Read 로 보고** 체크리스트(`REVIEW_CHECKLIST`: ① 위계 메인>서브>상세 ② 간격 균일 ③ 정렬 기준선 ④ 라벨 일관성 ⑤ 여백 균형 ⑥ 키비주얼 잘림/작음 ⑦ 이음 + 4항 간격 규칙)로 스스로 지적을 「ISSUES: - …」로 적고(없으면 「ISSUES: 없음」), 지적이 있으면 HTML 을 고쳐 재렌더한다(**최대 1회**). 고친 뒤에도 남는 지적은 보고에 적는다.

## 4. 보고
규격 × 방향별 PNG 경로·판정·정보 블록/4항 ✗·자기 검토 지적(issues·fixed)·한 줄 평 · 고친 횟수. 방향 3개를 한 줄에 나란히 놓은 시트(PIL)를 `_out/freedesign/<케이스id>/_sheet-3styles.jpg` 로. 커밋하지 않는다(`_out/` 은 git 제외). app/ 은 손대지 않는다.

## 헤드리스 브리지(참고)
`node scripts/freedesign-run.mjs <케이스id> <규격,…> [--engine claude-code|api] [--image-mode read|stream] [--styles typo,bright,dark] [--no-review]` — `claude -p` 로 같은 프롬프트를 방향마다 1회씩 돌리고(각각 검증·자기 검토) 렌더·검수까지. 결과 `<규격>--<style>.json`. `claude auth status` 가 loggedIn:false 면 터미널에서 `claude auth login` 한 번.
