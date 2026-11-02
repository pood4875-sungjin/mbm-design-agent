#!/bin/bash
# 맥에 로그인하면 트래커 서버가 자동으로 켜지게 한다 (launchd LaunchAgent).
# 서버가 켜져 있어야 자동 수집 일정(기본: 매주 월 09:00)이 돈다.
#   ./scripts/agent.sh install     등록하고 바로 시작
#   ./scripts/agent.sh uninstall   해제
#   ./scripts/agent.sh status      상태 확인
set -euo pipefail

LABEL="kr.recruit-guide-tracker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"

case "${1:-}" in
  install)
    mkdir -p "$HOME/Library/LaunchAgents" "$DIR/data"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$DIR/server.js</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/data/server.log</string>
  <key>StandardErrorPath</key><string>$DIR/data/server.log</string>
</dict>
</plist>
EOF
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    echo "등록했어요: $PLIST"
    echo "http://localhost:4173 · 로그: $DIR/data/server.log"
    ;;
  uninstall)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "해제했어요"
    ;;
  status)
    launchctl list | grep "$LABEL" || echo "등록돼 있지 않아요"
    ;;
  *)
    echo "사용법: $0 install | uninstall | status"
    exit 1
    ;;
esac
