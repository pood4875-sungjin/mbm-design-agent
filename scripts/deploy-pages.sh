#!/usr/bin/env bash
# GitHub Pages 배포 폴더(~/mbm-agent-pages) 갱신.
# 앱 + 브라우저용 core만 복사한다. docs/(과제 문서)와 노드 전용 파일, 키 파일은 넣지 않는다.
# push는 하지 않는다 — 마지막 줄의 안내대로 직접 실행한다(공개 주소로 나가는 일이라 사람이 누른다).
set -euo pipefail
# 10-12: GitHub Pages 원본이 이 저장소 main(/) 이다(gh api …/pages → source main /). main 을 push 하면 곧 배포다.
# ~/mbm-agent-pages 는 같은 원격 main 을 따로 쓰던 옛 배포 폴더라 push 하면 충돌한다 — 쓰지 않는다.
echo "배포 폴더 방식은 폐기됨 — 이 저장소 main 을 push 하면 https://pood4875-sungjin.github.io/mbm-design-agent/app/ 에 반영된다"; exit 0
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="${1:-$HOME/mbm-agent-pages}"

[ -d "$DST/.git" ] || { echo "배포 폴더가 없다: $DST (처음이면 git clone https://github.com/pood4875-sungjin/mbm-design-agent.git $DST)"; exit 1; }

rsync -a --delete --exclude 'config.local.js' "$SRC/app/" "$DST/app/"
rsync -a --delete --exclude 'export.js' --exclude 'campaign.js' --exclude 'search.js' "$SRC/core/" "$DST/core/"
# 규격 레퍼런스·검사 페이지는 문서가 아니라 도구다 — 같이 올린다 (과제 문서 CONCEPT/PRD/proposal은 제외)
mkdir -p "$DST/docs"
cp "$SRC/docs/media-rules.html" "$SRC/docs/media-check.html" "$DST/docs/"

if grep -rqE "sk-ant-api[A-Za-z0-9_-]{10,}" "$DST" --include='*.js' --include='*.html'; then
  echo "!!! 실제 API 키로 보이는 문자열이 있다 — 중단"; exit 2
fi

cd "$DST"
git add -A
if git diff --cached --quiet; then echo "변경 없음"; exit 0; fi
git commit -q -m "chore: sync app from $(git -C "$SRC" rev-parse --short HEAD)"
echo "커밋 완료 — 올리려면:  cd $DST && git push"
