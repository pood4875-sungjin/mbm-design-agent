# 다음 세션 이어하기 (2026-11-09 계정 이동)

사용자가 「이어서」라고만 말하면 이 파일부터 읽고 아래 「바로 할 일」을 이어 간다. 답은 한국어, 짧게, 결정과 근거 위주.

## 지금 상태 (11-09 밤, 계정 이동 직전)
- 공개 앱 배포 완료: https://pood4875-sungjin.github.io/mbm-design-agent/app/ — main 최신(이 기록 커밋)까지 push, 코드 최신 8f80b6b, Pages built.
- 테스트 766 전부 통과. 미커밋 = `_out/` 로컬 산출물뿐(커밋 금지).
- 로컬 앱: http://localhost:4795/app/ (`python3 scripts/serve.py 4795`, 이 폴더에서). AI 서버: `node server/server.mjs 4796`(키 `server/.env` — 새 계정·새 기기면 다시 넣어야 함).
- claude CLI 로그인: 새 계정이면 `claude auth login` 다시 해야 브리지(자유 디자인·AI 추가 제안·루프)가 돈다.

### 11-09 마지막 묶음 (이 계정, 전부 push)
- 7edc0b6 캠페인 같은 이름이면 `-2`·`-3` 으로 새로 쌓기(5개 이상) · 키비주얼 바꾸면 수동 배경을 자동으로 되돌림.
- 5ef872d 규정 차단 소재도 확인 창 → 내보내기(ZIP 은 `규정차단_확인필요/` 폴더). 확인 창은 화면으로 못 봄.
- 3defa0d 일괄은 왼쪽 패널(타이틀·서브·날짜·상세 각 한 칸, 줄바꿈 가능, 「모든 소재에서 빼기」), 개별은 캔버스(더블클릭 바로 편집, Delete 로 요소 빼기, 오른쪽 「뺀 요소 · 다시 넣기」). 컨텍스트 필드 `headline`·`subText`·`dateText`·`omit`.
- 05432e4 끌어 고른 글자만 오른쪽 패널 「고른 글자 · 칠」로 색(요소 전체 색 칸은 그동안 숨김).
- 8f80b6b 캔버스 Enter = 줄바꿈, Esc·바깥 클릭 = 저장, 상세 줄은 라벨별 제 칸.
- 기록: `history/2026-11-09_캔버스편집_마무리_계정이동.md`(앞 묶음은 `2026-11-09_사진지면_대각녹임_타이포시안.md` 끝).

### 이어서 바로 물어볼 것
- 검수기 녹임 기준(CANON 43~55%)을 피그마 시안 녹임(26~40%)에 맞출지 — 사용자 답 없음.
- 사용자가 캔버스 편집을 써 보고 줄 피드백(피그마 UI 와 다른 점).

## 11-09 대화 흐름
1. 「다른 계정 히스토리 파악」 → 11-06 작업(후보 네 축 다양성·AI 추가 제안 큐·틀 정렬 한 열·틀 구조 거름) 확인·보고.
2. 노션 컨시어지 대시보드(https://app.notion.com/p/kimhaewon/406615396ca480138af7dc9d7813d143) 15건 + 사용자 11/04 리스트업 → 하나씩 열어 이미지 확인·처리·검수 → 판정표 `docs/concierge-audit-2026-11-09.md`(✅13 🟡1 ⏸1), 원문 `docs/concierge-context-2026-11-09.md`.
   - 고침: 라벨 공고 메시지 파싱(MEDILINK), 시즌 마감일 유추 폐지, 자소설 PC메인 브리프 통일·글자색, 「채용」 지어 붙이기 제한, 비즈보드 좌측형(편집 패널 키비주얼 위치), 레이아웃 가이드 실제 줄 수, SVG 굵기(피그마는 굵기를 보통/굵게만 읽음 → PostScript 글꼴 이름 · 모양 다른 토막 <text> 분리, 피그마 개인 시험 파일 7U39oWTKk2xf77ugFUBy3W).
   - 사용자 「추천대로 진행」: NAP DSP 비즈보드 960×300 추가(1029는 참고), 서브 기본 문구 「○○에서 함께할 인재를 찾습니다」 폐지. 가이드 매체 한정은 안 함(요청 취지와 이미 맞음).
3. 사용자 피그마 시안 「자소설 키비주얼별 배경 활용」(컨시어지 파일 236:3767·3768·3771·3899·4293) 실측 → `docs/jasoseol-bg-rules-1109.md` → 틀 `bgRule` + 다른 매체 `autoBgRule`. 결정: 지면 기본은 그라데이션 유지.
4. 사용자 「push 해줘」 ×2 → 배포. 노션 상태값은 우리가 안 바꿈(담당자 몫).

## 바로 할 일 (사용자 결정 대기)
- **11-09 (6)** 11-09 저녁 작업 전부 main 2088d60(코드)·c689abb(기록)로 push(공개 앱 배포). 시안 브랜드 색 값은 공개 레포에서 뺐다. 최근 KV 검수는 `CASES_ROOT=_out/audit-recent/cases`. 결정: 지면색 기본은 「지금대로」(11-09 사용자) · 남은 결정 = 검수기 녹임 기준. 타이포 시안 비교 `_out/typo-1109/cmp.png`. 기록 2026-11-09_사진지면_대각녹임_타이포시안.md
- **11-09 (5) 이음·비중 검수 결정 3개**(보고서 https://claude.ai/artifact/9CGowKgsx5ChTqJxCsNng6 · 원본 _out/audit-1109/index.html · 기록 2026-11-09_글자범위색_이음비중_검수.md): 사진 지면 A′/브랜드색, 떠 있는 칸, 누끼 칸 밖 넘침. 결정 나면 core/field.js vividOf·틀 칸 처리 고치고 quality-audit 다시. 글자 범위 색 포함 push 됨.
0. **11-09 (4) 결정 4개**(보고서 https://claude.ai/artifact/2Mxaf7qKY6Dhs5L85hKkxv 5절 — 다른 계정 소유, 이 계정 사본 https://claude.ai/artifact/Vxv7GmmqL5kWr2SqmD2Mqj · 원본 _out/report-1109/index.html): 지면색 기본 브랜드색 / 누끼·이미지 칸 밖 넘침 / 레이아웃 가이드 매체 한정 / 1줄 틀 16자 기업명. + 회사 LLM 키 회수 대응(공개 앱 키 모달 숨김·로컬 Claude Code 모드 브리지) — 회사 계정 Claude Code 좌석 확인 후. eb0b332 까지 push 됨(11-09 저녁, 계정 한도로 이동).
1. **배경 시안 규칙 후속**: 그라데이션 변주색 규칙(시안은 밝게·어둡게·색상 이동 섞임 — 지금은 주색 → 진한 색), 안쪽 상자(카카오 PC 프로모·네이버 DA·구글 930)·둥근 칸(비즈보드) 시안 없음, 사용자가 앱에서 실제 캠페인으로 눈 확인.
2. ~~SVG 충실도 12건~~ 해결(검사기 회귀). 남은 의문: FIGMA_ASCENT 1.0em 이 Kakao Big Sans 등에서도 맞는지 피그마 실측.
3. **11-06 남은 것**: ~~AI 추가 제안 실제 1회~~(11분, 됨) → 방향 3종을 구성 축(전면형 / 어두운 지면+뱃지 / 타이포 강조+KV 작게)으로, `--model sonnet` 속도 비교, 루프 4·5점 → 자유 틀 자동 수확(공개 A안).
4. ~~캐치 메인 라지 기본안 그림 누락~~ MO 고침(moldNoSlot → 지면 전체). PC 합격 0(줄 수 차단)은 남음.
5. 합격 0인 규격(캐치 메인 라지 PC·알바몬 스플래시·M 메인·스펙업·알바몬 스카이), 21규격 전 그림 전수(2~6시간), 「다른 시안 보기」 모달 클릭 확인, AI 그림 판단 버튼 숨김·틀 위 스크림.

## 돌리는 법
- 전수(규격 지정): `node scripts/self-block.mjs --recipes --cases <목록> --briefs gs --specs <규격,..> --timeout 5400 --out <json>` → `node scripts/template-quality.mjs <json1,json2,..> 0.7 12`(쉼표로 여러 결과 합침). 11-05 입력: `_out/tpl-audit-1105/cases.txt`·`specs.txt`, 결과 result-1..4.json, 이전 목록 `templates-quality.before.js`.
- 판정 시트: `http://localhost:4795/_out/report-1105/judge.html?case=<케이스>&specs=<규격,..>&h=210&only=pass`.
- 눈 시트: `http://localhost:4795/scripts/lib/recipe-sheet.html?case=<케이스>&specs=<규격,..>&client=GS에너지&h=210`(헤드리스 --screenshot 은 iframe 안 그려짐 → 브라우저 패널).
- `npm test` 통과 때만 커밋. 전수 실행 중 `git stash` 금지(실행 중 파일이 되돌려짐).

## 지킬 것
- push 는 사용자가 말할 때만. 커밋은 로컬.
- 공개 레포: `app/config.local.js`·`server/.env`·키 금지, 고객사 문구·이미지·브랜드 색 금지(`ref/learned/figma-1102/` git 제외), `_out/` 커밋 금지.
- 피그마·노션 내용은 노드·데이터로 확인(눈대중 금지). 안 돌린 건 안 돌렸다고 말한다.
- 끝나면 history 날짜 파일 + README 인덱스 + 00_브리핑 갱신.
- 이전 대화 원문: `~/.claude/projects/-Users-kimsungjin/54dbcf9f-31b2-4ef9-aa67-e3f613a23a17.jsonl`
