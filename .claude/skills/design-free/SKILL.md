---
name: design-free
description: 자유 디자인 — Claude(이 대화창)가 케이스 × 규격의 광고 한 장을 배경(2색 그라데이션·스크림·KV 합성)과 타이포까지 HTML/CSS 로 직접 설계하고, 헤드리스 Chrome 으로 PNG 렌더 + 검수(core/lint.js + 실측 + AI 티 검출)까지 돌린다. 앱의 POST /api/freedesign 과 같은 계약. 트리거 - "/design-free <케이스id> <규격,…> [요구사항]", "자유 디자인 해줘", "직접 배경 디자인", "free design".
---

# design-free — Claude 가 직접 디자인하는 자유 시안

`~/mbm-design-agent` 에서 돈다. 서버·API 키 없이 이 대화창의 Claude 가 설계한다(헤드리스 `claude -p` 브리지는 `scripts/freedesign-run.mjs`).
계약은 `server/freedesign.js` 머리말과 같다 — **바꾸지 않는다**. 취향 규칙은 `docs/freedesign-rules.md`(AI 티 금지)가 정본.

## 사용
`/design-free <케이스id> <규격,…> [요구사항]`  예) `/design-free sep-open-recruit google-gdn-580x400,instagram-feed-1080 글자 더 크게`

## 1. 재료 뽑기
```bash
node scripts/freedesign-brief.mjs <케이스id> <규격,…> _out/freedesign/<케이스id>/brief [--req "요구사항"]
```
규격마다 `<규격>.prompt.md`(규격 규칙·브리프 문구·KV 설명·디자인 원칙·취향 규칙·출력 형식)와 `<규격>.input.json` 이 생긴다.
**프롬프트를 읽고, KV·로고 그림을 Read 로 눈으로 본 뒤** 설계한다. 문구는 프롬프트의 「역할별 쓸 수 있는 문구」 중에서만.

## 2. 설계 — `_out/freedesign/<케이스id>/<규격>.json`
```json
{ "specId": "<규격>", "caseId": "<케이스id>", "html": "<div data-ad=\"1\" data-spec=\"<규격>\" data-free=\"1\" style=\"position:relative;width:{w}px;height:{h}px;overflow:hidden;font-family:'…'\">…</div>", "notes": "왜 이렇게 했는지 한 줄" }
```
- 그림은 `{{KV}}`·`{{LOGO}}` 자리표시(렌더 스크립트가 케이스 파일 file:// 로 치환). dataURL 을 적지 않는다.
- 글자는 `data-field="main|sub|date|detail|notice"` 한 역할 한 요소, 줄바꿈 `<br>`. KV 는 `data-object="1"`(background url) 또는 `<img data-kv="1">`, 로고 `<img data-logo="1">`.
- 글꼴은 `rules.fonts.allowed` 의 family 이름 그대로(@font-face 는 렌더가 넣는다). 외부 URL·script·link 금지.
- 지킬 것(검증기가 바로 잡는다): 양의 letter-spacing · uppercase · background-clip:text · backdrop-filter · filter:blur · box/text-shadow 금지. 배경은 단색 또는 같은 색상 2색 그라데이션. 왼쪽 여백 폭의 6~8%, 제목 2줄 Bold 자간 −0.035em, 서브 제목의 40~55%, 날짜는 라벨+값(알약은 하나·반지름 4~8px). 로고 폭 규격 폭의 12~18%(어두운 지면이면 `filter:brightness(0) invert(1)` 로 흰색).
- 규격별: 리멤버 = Pretendard 고정·로고 불가·메인 글자색 #000000(서브 #FFFFFF)·배경 금지색(#FFFFFF·#000000·#FF5414·#F7F7F0·#E8E7E0) → 밝은 유색 지면. 구글 GDN 580 = 150KB.

## 3. 렌더 + 검수
```bash
node scripts/freedesign-render.mjs _out/freedesign/<케이스id> _out/freedesign/<케이스id>
```
규격마다 `.html`(app/fonts @font-face 주입) · `.png`(제출 크기, exportScale 반영) · `.audit.json` 을 쓰고 표 한 줄씩 낸다:
`| 규격 | 판정(통과/lint 경고/lint 차단/계약✗) | 계약 검증 오류 | lint(core/lint.js: 치수·용량·글자수·줄수·안전영역·글자색·글꼴·금지 배경색·로고 수·투명) | 메인 px · r2 · 여백 · 그림 % · 청사진(core/template-norms.js) 벗어남 | 글자 대비<4.5 | KV 로드 · KB |`
PNG 를 Read 로 보고 배경 디자인·타이포 위계·여백을 한 줄씩 적는다. 걸린 것은 HTML 을 고쳐 다시 돌린다(최대 2회).

## 4. 보고
규격별 PNG 경로·판정·한 줄 평 · 고친 횟수. 커밋하지 않는다(`_out/` 은 git 제외). app/ 은 손대지 않는다.

## 헤드리스 브리지(참고)
`node scripts/freedesign-run.mjs <케이스id> <규격,…> [--engine claude-code|api] [--image-mode read|stream]` — `claude -p` 로 같은 프롬프트를 돌리고 렌더·검수까지. `claude auth status` 가 loggedIn:false 면 터미널에서 `claude auth login` 한 번.
