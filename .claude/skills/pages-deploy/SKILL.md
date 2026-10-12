---
name: pages-deploy
description: 앱(app/)을 GitHub Pages 공개 주소에 반영한다. Pages 원본이 이 저장소 main(/)이라 main 을 push 하면 곧 배포다. 사용자가 배포·푸시를 명시적으로 시켰을 때만. 트리거 - "배포해줘", "페이지에 올려줘", "GitHub Pages 갱신", "앱 반영", "푸시해줘", "deploy to pages".
---

# pages-deploy — GitHub Pages 반영

**배포 = 이 저장소 main 을 push 하는 것.** 2026-10-12 확인한 Pages 설정은 다음과 같다.
```bash
gh api repos/pood4875-sungjin/mbm-design-agent/pages   # source: {branch: main, path: /}
```
- 공개 주소: https://pood4875-sungjin.github.io/mbm-design-agent/app/ (루트 `index.html`은 `./app/`으로 넘긴다)
- 옛 배포 폴더 `~/mbm-agent-pages`는 **폐기**했다. 같은 원격 main 을 따로 쓰던 이력이라 push 하면 거부되고, 강제로 밀면 main 소스 전체를 덮어쓴다. **절대 force push 하지 않는다.** `scripts/deploy-pages.sh`는 안내만 찍고 끝난다.

공개 주소로 나가는 일이므로 **사용자가 이번 대화에서 배포나 푸시를 분명히 시켰을 때만** 한다.

## 1. 확인
```bash
cd ~/mbm-design-agent
npm test 2>&1 | grep -E "^ℹ (pass|fail) "      # 실패가 있으면 멈춘다
git status --short | head -30
git check-ignore app/config.local.js            # 반드시 무시돼야 한다(API 키)
grep -rqE "sk-ant-api[A-Za-z0-9_-]{10,}" app core docs index.html && echo "키 의심 — 중단"
```

## 2. 커밋·푸시
```bash
git add -A && git commit -m "…"   # 메시지 끝에 Co-Authored-By 줄
git push origin main
```
- 거부(fetch first)되면 `git fetch` 후 원격에만 있는 커밋을 보고 합친다. 내용이 같고 해시만 다르면 `git merge -s ours origin/main`으로 이력만 합친다. 판단이 서지 않으면 사용자에게 묻는다.

## 3. 확인
```bash
gh api repos/pood4875-sungjin/mbm-design-agent/pages/builds/latest --jq .status   # built
curl -s -o /dev/null -w "%{http_code}\n" https://pood4875-sungjin.github.io/mbm-design-agent/app/
```
- 빌드에는 1~2분 걸린다. 반영된 주소를 사용자에게 알린다.
