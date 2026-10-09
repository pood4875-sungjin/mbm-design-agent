---
name: pages-deploy
description: 앱(app/)과 브라우저용 core 를 GitHub Pages 배포 폴더(~/mbm-agent-pages)로 동기화하고 그 폴더에 커밋까지 한다. push 는 사용자가 직접 한다(공개 주소). 사용자가 배포를 명시적으로 시켰을 때만. 트리거 - "배포해줘", "페이지에 올려줘", "GitHub Pages 갱신", "앱 반영", "deploy to pages", "sync the pages repo".
---

# pages-deploy — GitHub Pages 배포 폴더 동기화

공개 주소로 나가는 일이다. **사용자가 이번 대화에서 배포를 분명히 시켰을 때만** 돌린다(「커밋할지, 배포할지」는 브리핑의 결정 대기 항목이다).
스크립트가 배포 폴더(`~/mbm-agent-pages`, 별도 git)에 **커밋**한다. **push 는 하지 않는다** — 사용자가 직접.

## 1. 확인
```bash
cd ~/mbm-design-agent
git status --short | head -30          # 배포 대상(app/·core/)에 미커밋 변경이 있으면 그것도 올라간다 — 사용자에게 알린다
npm test 2>&1 | grep -E "^ℹ (pass|fail) "   # 실패가 있으면 멈춘다
ls -d ~/mbm-agent-pages/.git || echo "없음 → git clone https://github.com/pood4875-sungjin/mbm-design-agent.git ~/mbm-agent-pages"
```
- 커밋 메시지가 `sync app from <원본 HEAD>` 라서, 원본에 미커밋 변경이 있으면 메시지와 실제 내용이 다르다. 사용자에게 「원본 커밋 먼저 할지」 묻는다.

## 2. 돌리기
```bash
bash scripts/deploy-pages.sh            # 다른 폴더면: bash scripts/deploy-pages.sh <배포 폴더>
```
하는 일:
- `rsync --delete` 로 `app/`(config.local.js 제외) · `core/`(노드 전용 export.js·campaign.js·search.js 제외) 복사.
- 도구 페이지 `docs/media-rules.html`·`docs/media-check.html` 복사(과제 문서 CONCEPT/PRD/proposal 은 안 올림).
- API 키처럼 보이는 문자열(`sk-ant-api…`)이 있으면 **중단**(종료코드 2) — 그때는 원인을 찾아 사용자에게 알린다. 우회하지 않는다.
- 변경 없으면 「변경 없음」, 있으면 배포 폴더에 커밋하고 push 명령을 안내.

## 3. 보고 — 출력 계약
- 결과 줄(「커밋 완료」/「변경 없음」/중단 사유), 배포 폴더 `git -C ~/mbm-agent-pages show --stat HEAD | head -20`.
- 사용자가 칠 명령: `cd ~/mbm-agent-pages && git push` (Claude 가 대신 누르지 않는다).

## 함정
- `app/config.local.js` 는 키 파일이다. 절대 열거나 복사하거나 고치지 않는다(스크립트가 제외한다).
- core 의 노드 전용 파일을 새로 만들었다면(브라우저에서 못 도는 것) `deploy-pages.sh` 의 `--exclude` 에 더해야 한다 — 사용자 확인 후.
- 배포 폴더에서 `git reset`·`push --force` 같은 되돌릴 수 없는 일은 하지 않는다.
