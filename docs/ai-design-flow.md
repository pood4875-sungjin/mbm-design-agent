# AI 디자인 트랙 — 플로우·계약 (2026-11-09 사용자 결정)

사용자: 「규격과 규칙 가이드만 지키고 키비주얼과 로고로 Claude 가 자유롭게 디자인. AI 추가 제안을 누르거나 자연어로 입력하면 해석해서 디자인을 새로 생성. 룰베이스 3안은 안정형, AI 는 키비주얼과 어울리는 패턴·그래픽·컬러·텍스트 강조까지 Claude 가. 로컬 앱 + Claude 계정 로그인(claude CLI) 토큰만, API 안 씀.」
검수 기준(사용자): ① 소재마다 시안 3개씩 ② AI 생성 퀄리티가 기존 피그마 시안 수준 ③ 가이드에 안 맞는 게 추천되지 않음 ④ 추천 시간이 너무 길지 않음(UX 로도 해결) ⑤ 자연어 수정 시간·해결.

## 두 트랙
| | 규칙·틀 트랙(안정) | AI 디자인 트랙(자유) |
|---|---|---|
| 어디서 | 공개 앱 + 로컬 | **로컬 앱만**(claude CLI 로그인) |
| 무엇 | 기본안 + 유형 고정 3시안(정렬↔비주얼 / 태그 강조 / 컬러 반전) | 키비주얼·내용에 맞춘 새 디자인 3안(배경 그래픽·패턴·컬러·강조) |
| 속도 | 즉시 | 첫 카드 목표 ≤ 90초, 3안 ≤ 4분 |
| 코드 | core/variants.js · core/recipes.js · core/renderers/* | server/freedesign*.js · server/freejobs.js · app/freedesign.js · app/aidesign*.js |

## AI 플로우 (사용자 화면)
1. 소재(산출물)를 고르면 인스펙터에 **「AI 디자인」** 칸: 버튼 「AI 추가 제안」 + 입력칸(「밝고 경쾌하게, 일정 강조」). 서버·로그인이 없으면 칸 대신 한 줄 안내(공개 앱: 「로컬 앱에서 회사 Claude 계정으로」).
2. 누르면 즉시 카드 자리 3개(스켈레톤)가 보이고 단계 표시(키비주얼 보는 중 → 설계 → 검수) + 예상 시간. 다른 작업 계속 가능. **3안은 병렬 3호출**이라 먼저 끝난 카드부터 차례로 채워진다.
3. 카드마다: 「쓰기」 · 「말로 고치기」 · 「다른 규격으로 펼치기」 · 검수 배지(규정·대비·간격). 가이드 위반 안은 카드에 오르기 전에 1회 자동 재요청, 그래도 위반이면 「검수 실패」로 접어서 숨김(추천하지 않음).
4. **말로 고치기**: 2단계로 빠르게.
   - **즉시 수정(0초, LLM 없음)**: 해석 가능한 지시(색 바꿔/글자 크게·작게/로고 크게/정렬/배경 밝게·어둡게/일정 강조 켜기)는 HTML 을 직접 고친다(`core/freequick.js`).
   - **AI 수정(목표 ≤ 60초)**: 그 밖은 이전 HTML + 지시만 보내는 짧은 프롬프트, 빠른 모델(sonnet), 자기 검토 생략, 검증기만.
5. **다른 규격으로 펼치기**: 고른 안에서 「캠페인 디자인 언어」(지면 색·그래픽 모티프 SVG·강조 방식·글꼴·글자색)를 뽑아, 다른 규격은 언어를 지키며 레이아웃만 생성(규격별 병렬, 진행률). 결과는 각 소재의 「다른 시안」 맨 앞.
6. 쓴 안은 기존 검수 게이트(lint·규정·대비) → 승인 → 내보내기 같은 길. 채택하면 평가 5점으로 기록(취향 학습 루프).

## 서버 계약 (`/api/freedesign/jobs`, 11-06 큐 확장)
POST body = 기존 freedesign 계약 + 아래 필드
- `mode`: `'suggest'`(기본, 3안) | `'revise'`(1안) | `'spread'`(규격 여러 개)
- `prompt`: 자연어(선택). suggest 에선 방향 힌트, revise 에선 수정 지시
- `prev`: `{ html }` (revise 필수)
- `language`: 캠페인 디자인 언어 객체(spread 필수, suggest 결과에 함께 옴)
- `specIds`: spread 대상 규격 목록
- `parallel`: 기본 true(3안·규격별 별도 claude 호출)
- `model`: `'opus'|'sonnet'`(기본: suggest=opus? 측정 후 결정, revise=sonnet)

GET `/api/freedesign/jobs/:id` → `{ id, status, mode, stage:'kv'|'design'|'review'|'done', progress:{done,total}, etaMs, partial:[variant…](끝난 순서), result?, error? }`
variant = `{ id, style:{key,name}, html, notes, review, valid:{ok,errors}, language?, ms }`
POST `/api/freedesign/quick` `{ html, instruction, specId }` → `{ ok, html, applied:[…] }` | `{ ok:false, reason }` (LLM 없음, 즉시)

### 구현 메모(11-09 서버 엔진 — 위 계약과 다른 점·더한 것)
- `styles` 를 안 보내면 서버가 KV 유형으로 **구성 3개**를 고른다(`pickCompositions`: 사진 = 전면·대각·카드 / 바탕 일러 = 전면·카드·타이포 / 질감 = 전면·타이포·모티프 / 누끼 = 모티프·전면·타이포, 캐릭터 누끼 = 가운데 축·모티프·전면 / 가로 띠 ≥ 3:1 은 가운데 축 → 타이포). 옛 앱이 보내던 `['typo','bright','dark']` 는 「지정 없음」으로 본다. 구성 id: `bleed·motif·typehero·diagonal·frame·axis`(`style.id`). `style` 은 `{ id, name }`(key 아님).
- `review`(자기 검토) 기본 **끔**(속도) — 대신 가이드 게이트: validateFreeHtml → 렌더 측정(헤드리스 Chrome CLI, `renderFreeAsync`: 매체 lint block(용량·포맷 제외) · 대비(24px 이상 3:1, 그 밖 4.5:1) · 3항 · 4항) → 걸리면 사유 + 방금 HTML 로 1회 재요청 → 그래도 걸리면 `rejected:true`, `valid.ok:false`(앱이 숨김). Chrome 이 없으면 측정 생략·validate 만.
- variant 에 더한 칸: `specId`, `rejected`, `ok`, `attempts`, `errors`, `gate:{measured,issues,contrast,verdict}`, `at`(작업 시작부터 ms), `language`(`core/freelang.js` 모양 — 모델 `LANGUAGE:` JSON 우선, 빈 칸은 HTML 추출).
- job 응답에 더한 칸: `specIds`(spread), `stats`(끝난 뒤: totalMs·firstMs·calls[{kind,ms,model}]·retries·rejected). stage 는 `queued`·`failed` 도 있다. 끝난 작업 파일에는 `result` 만(GET 하면 partial 을 result.variants 로 채움).
- `model` 기본: suggest = 로그인 계정 기본(환경변수 `FREEDESIGN_SUGGEST_MODEL`), revise = `sonnet`(`FREEDESIGN_REVISE_MODEL`). 병렬 상한 `FREEDESIGN_PARALLEL`(기본 3), `parallel:false` 면 하나씩.
- revise: `prompt`(없으면 history 마지막 사용자 말) + `prev.html` 필수. 그림을 안 보고(도구 없음) 규격 규칙 요약만, dataURL 은 자리표시로 바꿔 보내고 되돌린다.
- spread: `language`·`specIds` 필수, `rulesBySpec?:{[specId]:rules}`(없으면 서버 `rulesForSpec`). 결과 `variants[i].specId`.
- quick: body 에 `brand?:{primary}` 를 주면 「일정 태그·브랜드색」에 쓴다. 응답에 `ms`. 매체 규정(고정 글자색·로고 크기 고정·금지 배경색)은 `ok:false`.
- `GET /api/freedesign/stats` → `{ n, byMode:{suggest|revise|spread:{n,avgTotalMs,avgFirstMs,avgCallMs,avgRetryMs,avgRetries,avgRejected,models}}, recent }`(최근 50 작업, `_out/freedesign-jobs/stats.jsonl`).
- 속도 장치(11-09 실측으로 정함): 그림은 메시지에 직접(`FREEDESIGN_IMAGE_MODE=stream`, Read 왕복 없음) · `--effort` 설계 medium / 고치기 low(`FREEDESIGN_EFFORT`·`FREEDESIGN_FAST_EFFORT`) · `--strict-mcp-config --disable-slash-commands` + 짧은 디자이너 시스템 프롬프트(도구 없는 호출에서 모델이 스킬을 부르려다 HTML 없이 끝나던 것 — 3안 중 3) · 간격 위반(4항-1 gap-tight·gap-loose·overlap)은 **LLM 없이 측정 잉크 상자로 스택을 다시 쌓아**(`core/freequick.js fixStack`) 재측정 · 그 밖 위반은 「걸린 것만 고치기」 짧은 프롬프트 + 실측 줄 + `sonnet`(`FREEDESIGN_RETRY_MODEL`)으로 1회.
- 실측(fg-dn-park 사진 × 구글 580, opus-4-8 설계, 11-09): 첫 카드 **69s** · 3안 **107s**(호출 3, 재요청 0, 반려 0 — 간격 자동 고침 3/3) · AI 수정 **12~21s**(sonnet low) · 즉시 수정 **1~3ms**. 고치기 전(1차): 첫 카드 186s · 3안 216s · AI 수정 80s. 시트 `_out/ai-track/server-fg-dn-park-*.png`, 재현 `node scripts/freedesign-ai-bench.mjs`.
- **11-09 통합(5단계)에서 더한 것**: `DELETE /api/freedesign/jobs/:id` = 취소(queued 는 큐에서 빼고, running 은 AbortSignal 로 진행 중 `claude -p` 자식을 SIGTERM→2초 뒤 SIGKILL, 상태 `cancelled`) · job 응답 `firstEtaMs`(첫 안 전까지 최근 평균 기준 남은 시간 — 앱 「첫 안 ~N초 · 전부 ~M」) · spread `language:{fromHtml:true}` + `prev.html` 이면 원안 HTML 에서 언어를 뽑아 채움 · 언어에 `labels`(정보 라벨 칩 모양) 추가, 모티프는 모델 것 + HTML svg 합침, revise 결과 언어는 고친 HTML 로 다시 합침 · 게이트에 「글자 ↔ 사진(글자 지운 렌더로 실측 대비)·장식 겹침」(`core/typoaudit.js overlapAudit`, 렌더러 `measureOverlap`). 앱은 제안 본문에서 `n`(대화 창의 1)·`styles`·`review` 를 보내지 않는다(→ 3안·게이트만).
- `GET /api/health` 의 `freedesign.engines` = `['claude-code']` — API 키 경로는 `FREEDESIGN_API=1` 일 때만 목록에 오르고, 꺼져 있으면 `engine:'api'` 요청도 claude-code 로 돈다(앱은 `hasKey` 대신 `freedesign.engines` 를 볼 것).

## 최소 규칙 (docs/freedesign-rules.md 그대로 + 아래)
- 매체 규정(글자 수·안전영역·색·글꼴·로고·용량)은 검수기가 강제 — 위반 안은 추천하지 않는다.
- 자간 양수 금지 · 장평 금지 · 정보 블록 한 규칙 · 간격 하한/상한.
- 키비주얼: 비율 유지(늘이기 금지), 주인공 잘림 금지, 누끼는 누끼답게.
- 그 밖(그래픽·패턴·컬러·강조·글꼴 섞기)은 자유.

## 품질 기준(검증 루프)
- 피그마 시안 KV(`_out/figma-1109/staging` 16장 + 타이포 시안 5장)로 각 3안 생성 → 같은 규격 피그마 시안과 나란히 → 눈 검수 + 검수기.
- 합격선: 3안 모두 검수 통과 · 구성이 서로 다름 · 피그마 시안과 같은 수준(위계·여백·키비주얼 활용).
- 시간: 첫 카드·3안·즉시 수정·AI 수정 각각 측정해 기록.
