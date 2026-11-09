# AI 디자인 쓰기 — 로컬 앱 설정 (한 번만)

AI 디자인(「AI 추가 제안」·말로 고치기·다른 규격으로 펼치기)은 **내 컴퓨터에서 켠 앱**에서만 됩니다.
API 키는 쓰지 않습니다. 회사 Claude 계정으로 로그인한 Claude Code(`claude`)를 서버가 대신 부릅니다.
공개 앱(github.io)에서는 규칙 3안만 쓸 수 있어요.

## 1. Claude Code 설치
터미널에서:

```sh
npm install -g @anthropic-ai/claude-code
claude --version   # 버전이 나오면 OK
```

## 2. 회사 계정으로 로그인

```sh
claude auth login
```

브라우저가 열리면 **회사 Claude 계정**으로 로그인합니다. 한 번 하면 계속 유지돼요.

## 3. 앱 서버 켜기
이 저장소 폴더에서:

```sh
cd server && npm install && cd ..   # 처음 한 번
node server/server.mjs 4796
```

## 4. 앱 열기
브라우저에서 **http://localhost:4796/app/** 를 엽니다.
소재를 고르면 오른쪽 패널 「레이아웃 안」 아래에 「AI 디자인」 칸이 보입니다.

## 안 될 때
| 칸에 뜨는 말 | 할 일 |
|---|---|
| 로컬 서버가 켜져 있어야 해요 | 3번(서버 켜기) — 주소가 `localhost:4796/app/` 인지 확인 |
| 이 컴퓨터에 Claude Code(claude)가 없어요 | 1번 설치 후 서버를 다시 켜기 |
| Claude 계정 로그인이 필요해요 | 2번 `claude auth login` |
| 서버가 예전 버전이에요 | `git pull` 후 서버 다시 켜기 |
| 규정 틀 매체라 AI 디자인 불가 | 자소설·리멤버·카카오 비즈보드는 틀이 정해져 있어 레이아웃 안에서 고릅니다 |
