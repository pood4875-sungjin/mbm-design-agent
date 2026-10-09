---
name: results-gallery
description: 테스트·비교 결과 이미지를 한 페이지 갤러리(ref/learned/cases/_out/gallery.html)로 만들거나 섹션을 더한다 — 반응형 격자, 다크 모드, 클릭/키보드로 원본 확대, 케이스별 유형 요약과 「경고 전 → 후」 캡션. 로컬 서버로 연다. 트리거 - "갤러리 만들어줘", "결과 이미지 한 페이지로", "갤러리에 추가해줘", "비교 이미지 모아 보기", "results gallery", "add a section to the gallery".
---

# results-gallery — 결과 갤러리

갤러리 = `ref/learned/cases/_out/gallery.html`, 설정 = `ref/learned/cases/_out/gallery.json`(섹션 목록).
HTML 을 손으로 고치지 않는다 — 설정을 고치고 다시 만든다. `_out` 은 git 밖(로컬 전용).

## 1. 넣을 이미지 준비
- 섹션 하나 = `_out/` 아래 폴더 하나(예: `figma-sep-final/`, `figma-dg/`). 폴더 안 PNG 가 칸이 된다.
- 비교 이미지는 `scripts/figma/side-by-side.py` 로 만든다:
  ```bash
  # 디자이너 vs 우리 (한 규격)
  python3 scripts/figma/side-by-side.py --out ref/learned/cases/_out/<폴더>/<spec>.png "디자이너=<frame.png>" "우리=<ours.png>"
  # 케이스마다 디자이너 프레임 여러 장 / 규칙 전 / 규칙 후 (위아래)
  python3 scripts/figma/side-by-side.py --out ref/learned/cases/_out/<폴더>/<id>.png --stack v --max-w 1400 \
    "디자이너(Figma)=$(ls ref/learned/cases/_staging/<묶음>/frames/<id>/*.png | head -4 | paste -sd+ -)" \
    "규칙 전(r<a>)=<before>/<id>.png" "규칙 후(r<b>)=ref/learned/cases/_out/review/<id>.png"
  ```
  - 「전」 이미지는 규칙을 바꾸기 **전에** 떠 둬야 한다: `node scripts/case-review.mjs <id…> --out <scratchpad>/before`.
  - 파일 이름을 케이스 id 로 하면 캡션에 유형 요약과 경고 수가 자동으로 붙는다.

## 2. 섹션 더하기 / 바꾸기
```bash
node scripts/gallery.mjs add --id dg2 --nav "③ 데스크탑 KV" --title "③ 데스크탑 KV 44건 — 위: 규칙 전 · 아래: 규칙 후" \
  --desc "대표 규격 + 경고 규격. 경고 수는 74규격 기준." --dir desktop-kv --caption case --rounds 30,31 \
  [--manifest ../_staging/<묶음>/manifest.json] [--files a.png,b.png] --subtitle "10-09 · 라운드 31"
node scripts/gallery.mjs                    # 설정 그대로 다시 만들기(라운드·요약이 바뀌었을 때)
node scripts/gallery.mjs --dry-run          # 섹션·그림 수만 확인(쓰지 않음)
node scripts/gallery.mjs remove --id dg2
```
- `--caption file`: 파일 이름만. `--caption case`: `<b>id</b> · kind(manifest 있으면)<br>유형 요약<br>경고 a → b`.
- `--rounds a,b` 가 있으면 rounds.json 의 두 라운드 경고 수, 없으면 지금 `_out/<id>.checks.json` 의 경고 수.
- 같은 id 로 add 하면 그 섹션을 바꾼다. 순서는 설정의 순서(①②③ 번호는 제목에 직접).
- 시험으로 다른 파일에 쓰려면 `--out ref/learned/cases/_out/gallery.preview.html`(그림 경로가 `_out` 기준이라 `_out` 안에 둔다). 확인 후 지운다.

## 3. 열기
```bash
lsof -nP -iTCP:4791 -sTCP:LISTEN || (cd ~/mbm-design-agent && python3 scripts/serve.py 4791 &)
```
→ http://localhost:4791/ref/learned/cases/_out/gallery.html
- 4791 이 이미 떠 있으면 **누가** 띄웠는지 본다(`ps -o command= -p <PID>`; `lsof -p <PID> | grep cwd`). `.claude/launch.json` 의 handover-latest 도 4791 을 쓴다 — 그게 떠 있으면 다른 폴더라 404 가 난다. 그때는 `python3 scripts/serve.py 4792` 로 다른 포트.
- serve.py 는 캐시를 끄는 정적 서버다(고친 결과가 바로 보인다). 127.0.0.1 에만 묶인다.

## 4. 확인 (접근성·반응형·다크)
- 폭 375(모바일)에서 가로 스크롤이 없어야 한다: 브라우저 창에서 `document.documentElement.scrollWidth === innerWidth`.
  (헤드리스 Chrome `--window-size=390` 스크린샷은 최소 폭 때문에 넘친 것처럼 보일 수 있다 — 실제 브라우저/뷰포트 에뮬레이션으로 본다.)
- 다크 모드: 시스템 다크에서 바탕·글자 토큰이 바뀐다(`prefers-color-scheme`).
- 키보드: Tab 으로 그림 버튼에 초점(파란 테두리) → Enter 로 확대 → Esc 로 닫고 초점 복귀.

## 출력 계약
사용자에게: 갤러리 URL, 섹션별 그림 수(`gallery.mjs` 출력), 새로 더한 섹션, 서버를 켰는지 여부. 없는 그림 경고가 나오면 그 목록.

## 함정
- 갤러리는 다른 에이전트도 고칠 수 있다. 손으로 고친 흔적(설정에 없는 섹션)이 있으면 덮어쓰기 전에 `gallery.json` 에 그 섹션을 먼저 add 한다(지금 HTML 과 `--dry-run` 섹션 수를 견준다).
- 큰 PNG(시트 2200×6000)를 그대로 넣으면 무겁다 — side-by-side `--max-w 1400`.
- `figma-dg/` 처럼 manifest 순서가 있는 묶음은 `--manifest` 를 주면 그 순서로 놓인다(없으면 파일 이름순).
