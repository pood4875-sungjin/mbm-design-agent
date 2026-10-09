---
name: guide-export
description: 사람에게 전달할 가이드 문서를 ~/Downloads 의 새 날짜 폴더로 뽑는다 — 키비주얼 유형별 디자인 가이드 + 케이스 테스트 데이터(kv-guide.mjs)와, 서버 없이 더블클릭으로 열리는 광고소재 가이드 3종(export-guides.mjs). 이미 전달한 폴더는 덮어쓰지 않는다. 트리거 - "가이드 뽑아줘", "디자인 가이드 최신판", "가이드 다시 만들어", "전달용 가이드", "Downloads에 가이드", "export the guides", "regenerate the design guide".
---

# guide-export — 전달용 가이드 내보내기

두 종류다. 무엇이 바뀌었는지에 따라 하나 또는 둘 다.
| 무엇 | 명령 | 내용 | 언제 |
|---|---|---|---|
| 키비주얼 디자인 가이드 | `node scripts/kv-guide.mjs <폴더>` | 유형·서브타입·넣는 법(core/kvtypes.js) + 공통 조형 기준(canon.js) + 타이포 + 검수 항목 + 케이스 장부·라운드·규격별 검수 CSV + 대표 4규격 렌더 PNG | 디자인 규칙(kvtypes·canon·layouts·ad.js)이나 케이스가 바뀌었을 때 |
| 광고소재 가이드 3종 | `node scripts/export-guides.mjs [폴더]` | docs/media-rules.html · design-guide.html · media-check.html 을 모듈까지 묶은 단일 HTML(파일 하나로 열림) | 매체 규정(core/media/*.json)·디자인 프로필이 바뀌었을 때 |

## 1. 폴더 이름 정하기 (덮어쓰기 금지)
```bash
ls ~/Downloads | grep -E "가이드"          # 이미 있는 폴더
```
- 키비주얼: `~/Downloads/키비주얼 디자인 가이드_MMDD` (같은 날 두 번째면 꼬리표: `_1008-밤(타이포)`).
- 광고소재: 기본값이 `~/Downloads/광고소재 가이드_MMDD`(인자 없이 돌리면 오늘 날짜).
- **이미 전달한 폴더**(예: `광고소재·디자인 가이드_1008/` — 안에 `1_광고소재 가이드`·`2_디자인 가이드`)는 덮어쓰지 않는다. 사용자가 「그 폴더를 갱신해」라고 하면 그때만 그 경로를 출력 폴더로 준다.

## 2. 뽑기
```bash
cd ~/mbm-design-agent
node scripts/kv-guide.mjs "$HOME/Downloads/키비주얼 디자인 가이드_$(date +%m%d)"      # 케이스 수에 비례(90건 ≈ 수 분) — timeout 600000
node scripts/export-guides.mjs                                                        # → ~/Downloads/광고소재 가이드_MMDD
```
- kv-guide 는 케이스마다 헤드리스 Chrome 으로 대표 4규격을 찍는다. 렌더 전에 마지막 라운드가 최신인지(`node scripts/round-diff.mjs --list 3`) 본다 — 「남은 경고」 문장과 CSV 는 `_out/<id>.checks.json` 에서 읽는다.
- 마지막 줄 `ok → <폴더> 케이스 N 라운드 M` 을 확인.
- 가이드에 새 절이 필요하면 `scripts/kv-guide.mjs` 를 고친다. 값은 하드코딩하지 말고 core 에서 읽게 한다(예: 타이포 표는 layouts.js·canon.js 에서).

## 3. 확인
- `키비주얼 유형별 디자인 가이드.html` 과 `테스트 데이터 정리.html` 을 브라우저로 열어 본다(file:// 로 열림). `렌더/` PNG 수 = 케이스 수.
- 광고소재 3종은 서버 없이 더블클릭으로 열려야 한다(글꼴만 CDN — 오프라인이면 시스템 글꼴).

## 출력 계약
사용자에게: 만든 폴더 경로(들), 안의 주요 파일, 케이스·라운드 수, 이전 판과 달라진 절. 이전 폴더를 덮어쓰지 않았다는 것.

## 함정
- kv-guide 는 `_out` 의 파일을 `시트/` 로 통째로 복사한다(하위 폴더 제외) — `_out` 에 큰 파일이 많으면 폴더가 커진다.
- 다른 에이전트가 장부에 케이스를 넣는 중이면(`round-diff --list` 에 접수 라운드) 그 케이스도 가이드에 들어간다. 원하지 않으면 끝난 뒤 뽑는다.
- GitHub Pages 배포는 별개 — `pages-deploy` 스킬.
