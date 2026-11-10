#!/bin/bash
# MBM 디자인 에이전트 — 로컬 앱 시작(더블클릭). 서버를 켜고 브라우저로 앱을 연다.
# Claude 계정 연결은 앱 위쪽 「Claude Code 연결」 칩에서 한다(docs/local-ai-setup.md).
cd "$(dirname "$0")" || exit 1
PORT=${PORT:-4796}
if ! command -v node >/dev/null 2>&1; then echo "Node.js 가 없어요 — https://nodejs.org 에서 설치한 뒤 다시 더블클릭해 주세요."; read -r -p "엔터를 누르면 닫혀요"; exit 1; fi
if [ ! -d server/node_modules ]; then echo "처음 한 번 준비 중(서버 패키지 설치)…"; (cd server && npm install --silent) || { echo "설치 실패"; read -r; exit 1; }; fi
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "이미 켜져 있어요 — 브라우저로 엽니다."
else
  echo "서버를 켭니다(포트 $PORT). 이 창을 닫으면 서버도 꺼져요."
  node server/server.mjs "$PORT" &
  SERVER=$!
  for i in $(seq 1 30); do lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && break; sleep 0.3; done
fi
open "http://localhost:$PORT/app/"
[ -n "$SERVER" ] && wait "$SERVER"
