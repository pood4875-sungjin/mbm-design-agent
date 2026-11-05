# 다음 세션 이어하기 (2026-11-05 계정 이동)

사용자가 「이어서」라고만 말하면 이 파일부터 읽고 아래 「바로 할 일」을 이어 간다. 답은 한국어, 짧게, 결정과 근거 위주.

## 지금 상태
- 공개 앱 배포 완료: https://pood4875-sungjin.github.io/mbm-design-agent/app/ (main 6cb9112까지 push, Pages 빌드 built, 공개 주소의 시안 틀 합격 목록 1,017 확인).
- 11-05 밤: 8e0b4dc(자유 디자인 2차 + 셀렉 루프 WIP)까지 push. 테스트 719 전부 통과(11-05 skip 3 살림). 미커밋 = `_out/` 아래 로컬 산출물뿐(커밋 금지).
- 로컬 앱: http://localhost:4795/app/ (이 폴더 루트를 서빙하는 python 서버. 꺼져 있으면 `python3 -m http.server 4795` 를 이 폴더에서).

## 지금까지 대화 흐름 (11-03 ~ 11-05)
1. 11-03~04: 시안 틀 품질(흐림 상한·떼 누끼·사물 분류), 타이포·여백 검사기(`core/typoaudit.js`), 전수 재시험으로 합격 514 → 466. 리뷰 문서 `docs/review-2026-11-05_시안생성_구조.html`.
2. 11-05 오전: 「시안 틀을 어떤 기준·흐름으로 만들고 고르는지, 지금 수준, 테스트 이미지를 HTML로」 → `~/Downloads/AX-003_시안틀_생성기준_판단흐름_1105.html`(고객사 그림 내장이라 레포 밖). 판정 시트 `_out/report-1105/judge.html`.
3. 11-05 오후: 사용자 「왜 정렬 이상한 거 추천해 주고 후보 모달로 안 뜨고 그래?」(캐치 메인 라지 MO 스크린샷).
   - 원인: 21규격은 합격 목록이 0이라 시안 틀·「다른 시안 보기」가 없고 정렬·지면 프리셋만 나감. 프리셋에는 품질 검사가 없었고, 틀 상세 줄 trace 가 정렬을 무시해 겹침을 놓침. 「키비주얼 왼쪽」 안은 그림 없이 섬.
   - 사용자 「둘 다 진행」 → 커밋 c061974(프리셋 거름: 기본안보다 못한 안 제외 · trace 정렬 반영 · self-block `--specs`), 6cb9112(21규격 전수 → 합격 466 → 1,017).
   - 사용자 「지금 push」 → 배포 완료.

## 바로 할 일 (사용자 결정 대기)
0-1. ~~셀렉 학습 루프 마무리~~(11-05 완료: skip 3 살림·loop.html 버그 2 수정·저장 확인, 커밋 eb02665·5f208cb, 기록 2026-11-05_셀렉루프_마무리.md). 남음: 사용자가 http://localhost:4796/app/loop.html 에서 18안 실제 평가(서버 `node server/server.mjs 4796`).
0. **자유 디자인 브리지 실측**(11-05 저녁 추가): 사용자가 `claude auth login` 한 뒤 `node scripts/freedesign-run.mjs sep-open-recruit google-gdn-580x400` → 소요·재시도·PNG 확인, 앱 패널(로컬 서버 `node server/server.mjs`)에서 실제 대화 뽑기 1회. 규칙은 docs/freedesign-rules.md(자간·장평만). 기록 2026-11-05_자유디자인_대화로_시안뽑기.md
1. **캐치 메인 라지 기본안 그림 누락**: 일러스트·사진·질감 KV 를 기본안이 안 그린다. 틀 글자 칸이 폭 전체라 `moldFreeRect`(`core/renderers/ad.js`)가 null(조건: 남은 폭 ≥ 20%, 남은 높이 ≥ 20%, 글자 상자와 안 겹침). 누끼만 cutCorner 로 모서리 칸을 얻는다. 이런 그림엔 시안 틀도 안 붙어 「가운데 정렬」「전체 배경」만 남음. 고칠지 물어보고 진행.
2. 합격 0인 규격 6개: 캐치 메인 라지 PC(줄 수 차단), NAP 비즈보드 1029×258(색·투명 차단), 알바몬 스플래시·M 메인(투명 지면), 스펙업 액티비티(미확인), 알바몬 스카이 120×600(비율 맞는 틀 없음). 새 규격들에서 사진 유형 합격 0.
3. 21규격 전수는 대표 24그림 × gs 문구 1종만 돌림. 전 그림·문구 2종 전수는 2~6시간(원하면 백그라운드).
4. 「다른 시안 보기」 모달은 앱에서 직접 클릭 확인 안 함(모듈 import 로 합격 1,017·캐치 MO fox-cutout 후보 12개만 확인).
5. 이전부터 대기: AI 그림 판단 버튼 숨김 여부, 틀 위 스크림 둘지.

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
