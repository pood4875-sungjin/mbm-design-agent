# 2026-11-10 (13) — 로컬 앱에서 개인 Claude 계정 연결(CLI) · 화면까지

사용자: 「API 빼고 CLI 로 개인 Claude 계정 연결해서 그 플랜 토큰 안에서」 → 「앱 내에서 연결 플로우까지」 → 「화면까지 같이」. 흐름 확인: ① 「Claude Code 연결」 클릭 → 설치·로그인 확인 ② 필요하면 `claude auth login` ③ `claude auth status` 로 「연결됨」 ④ 이후 앱이 뒤에서 CLI 호출 — 「이렇게 하려는 거지?」 → 그대로 만듦.

## 만든 것
- `server/claudelink.js`(새): `GET /api/claude/status`(설치·로그인·플랜·이메일) · `POST /api/claude/login`(`claude auth login --claudeai` 띄움, 10분 접기) · `POST /api/claude/logout` · `POST /api/claude/ask`(텍스트 질문) · `POST /api/kvjudge`(그림 종류 판단 — 트리 8칸: 캐릭터 1·여럿 / 오브젝트 1·여럿 / 실사·실사 인물 / 그래픽 오브젝트+배경·패턴 → 앱 kvTypeOverride, 그림 sha1 캐시 `_out/kvjudge-cache.json`) · 사람 말 오류(미설치·미로그인·한도 429·시간 초과).
- `server/design.js analyzeKvCli` — 「AI 그림 판단」(`/api/analyze`)이 API 키가 없으면 CLI 로.
- `server/freedesign.js runClaudeCode` 에 `system` 옵션(디자이너 역할 대신).
- `app/claudelink.js`(새): 위쪽 막대 「Claude Code 연결」 칩(확인 중 / 규칙만 / 설치 필요 / 연결 / 로그인 중 / 연결됨 · 플랜) + 연결 창(세 단계 · 계정 연결 · 다시 확인 · 연결 끊기 두 번 누르기 · 약관 안내) · 로그인 중 2초마다 상태 확인.
- `app/app.js`(연결 지점만): 칩 붙이기 · 「AI 그림 판단」 버튼이 Claude 연결 때도 보임 · 키비주얼 올릴 때(처음 입력·인스펙터 바꾸기) 규칙 판정 뒤 Claude 판단 → 다르면 유형 지정 + 알림(사람이 유형을 이미 골랐거나 그림이 바뀌었으면 안 건드림).
- `app/llm.js`: 키가 없고 Claude 가 연결돼 있으면 기획 해석을 `/api/claude/ask` 로.
- `MBM 시작.command`(새, 저장소 루트): 더블클릭 → 서버 패키지 없으면 설치 → 서버 켜기 → 브라우저로 앱.
- `docs/local-ai-setup.md` 새 흐름으로 다시 씀.

## 확인
- 실제 Claude(사용자 계정, max)로 그림 종류 판단 6장: 로켓 → 오브젝트 · 걷는 사람들 → 캐릭터 여럿 · 흐르는 곡선(desk-09) → **패턴**(규칙은 오브젝트+배경) · 소파 사진 → 실사 인물 · 쇼핑카트 → 오브젝트 여럿 · 별 앱 아이콘 → 그래픽 오브젝트+배경. 한 장 4~5초.
- 로컬 앱(포트 4797)에서: 칩 「Claude Code 연결됨 · max」 · 연결 창(세 단계 ✓) · 연결 안 된 상태 화면(응답만 바꿔서) · 앱 안에서 판단 호출 4초 · 콘솔 오류 0. **「계정 연결」 버튼(실제 로그인 창)은 이미 로그인된 계정이라 눌러 보지 않음** — 로그아웃한 컴퓨터에서 한 번 확인 필요.
- `npm test` 880 전부 통과(더한 것: `test/claudelink.test.js` 2).

## 남은 것
- 로그인 버튼 실제 시험(로그아웃 상태에서).
- A/B 디자인(트랙 B `/api/design`)은 아직 API 키 — 실험용이라 그대로.
- 메인 세션 서버(4796)는 이 브랜치가 합쳐진 뒤 다시 켜야 새 API 가 보임.
