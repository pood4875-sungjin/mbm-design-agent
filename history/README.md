# history — 작업 히스토리

이 프로젝트에서 무엇을 했고, 왜 했고, 지금 어디까지 왔는지를 쌓아 두는 폴더입니다.
사람(김성진)과 Claude가 같이 봅니다. **Claude는 새 작업을 시작할 때 이 폴더부터 읽습니다.**

## 읽는 순서
1. [00_브리핑.md](00_브리핑.md): 처음부터 지금까지를 쉽게 정리한 글. **지금 어느 단계인지**와 **정해야 할 것**이 들어 있습니다. 작업이 끝날 때마다 고쳐 씁니다.
2. 날짜별 기록 `YYYY-MM-DD_제목.md`: 그날 한 일, 바꾼 규칙, 테스트 결과, 남은 문제. 한 번 쓴 기록은 고치지 않고 새 파일로 이어 씁니다.

## 날짜별 기록
| 날짜 | 기록 | 한 줄 요약 |
|---|---|---|
| 2026-08-10 ~ 10-07 | [2026-08-10_시작부터_10-07까지.md](2026-08-10_시작부터_10-07까지.md) | 뼈대 → 매체 규칙 15개 채널 → 실제 키비주얼 검증 → 케이스 장부 13라운드 |
| 2026-10-08 | [2026-10-08_자동검수_Figma비교_규칙화.md](2026-10-08_자동검수_Figma비교_규칙화.md) | 자동 검수 장치, Figma 2개 파일 비교, 규칙 20개 + 타이포, 46케이스 |
| 2026-10-09 | [2026-10-09_타이포_굵기_위계.md](2026-10-09_타이포_굵기_위계.md) | 굵기 위계 표(메인 700 > 아이브로 600 > 슬로건·날짜 500 > 값 400, 칩·CTA 600), 자소설 실측 우선, 테스트 6건 |
| 2026-10-12 | [2026-10-12_데스크탑_키비주얼_로고_테스트.md](2026-10-12_데스크탑_키비주얼_로고_테스트.md) | 데스크탑 KV 37장(누끼 9)·로고 198개 → 데스크탑 44건 경고 191 → 24, 로고 규칙 4개(색 겹침 단색·글자 속 구멍·투명 PNG 오판·앱 실측 유지), 92케이스 r35 경고 56, 기존 46 회귀 0, 스킬 kv-cutout·logo-prep |
| 2026-10-12 | [2026-10-12_흰글자_그라데이션_이음.md](2026-10-12_흰글자_그라데이션_이음.md) | 사용자 피드백 12건 → 규칙 7묶음(채도 지면 흰 글자·녹임 길이/곡선·배경형 위 띠 버그·분위기 KV 배경 > 브랜드 지면·질감 진정·누끼는 명확할 때만·쌓인 덩어리 한 주인공), r39 경고 56 → 50, 회귀 0, 테스트 320 |
| 2026-10-12 | [2026-10-12_결정반영_남은문제.md](2026-10-12_결정반영_남은문제.md) | 결정 15건 반영(유형 직접 지정·에브리타임 메인 800·글자 속은 단색 때만, 나머지 유지·브랜드색 보류) + 남은 문제(인물 상자로 의사·간호사, MIDAS IT 줄바꿈, 가로 띠 녹임, 좁은 세로 띠, 쌓인 누끼) → r42 경고 50 → 32, 테스트 334 |

## 쌓는 규칙 (Claude용)
- 작업을 마치면 다음 세 가지를 합니다.
  1. 날짜별 기록을 새로 만듭니다.
  2. 위 표에 한 줄을 추가합니다.
  3. `00_브리핑.md`의 「지금 어디」「정해야 할 것」「테스트 누적」을 갱신합니다.
- 한국어로, 쉽게 씁니다. 규칙을 바꿨으면 `파일:줄 · 이전 → 이후 · 근거 케이스`를 남깁니다.
- 테스트 수치는 `ref/learned/cases/rounds.json`(라운드 기록)에서 옮깁니다. 추측으로 채우지 않습니다.
- 이미지는 `ref/learned/cases/_out/`에 있습니다. 이 폴더는 git에 올라가지 않는 로컬 전용입니다. 링크는 상대경로로 겁니다.
- 사용자 결정이 나면 브리핑의 「정해야 할 것」에서 지우고, 날짜별 기록에 「결정: …」으로 남깁니다.

## 스킬 (`.claude/skills/`)
되풀이하는 작업을 절차로 묶어 둔 것입니다. Claude 에게 오른쪽 말처럼 시키면 해당 스킬대로 돕니다.
| 스킬 | 하는 일 | 이렇게 말하면 |
|---|---|---|
| [kv-review](../.claude/skills/kv-review/SKILL.md) | KV 접수 → 74규격 렌더 → 자동·눈 검수 → 원인(규칙/그림/오탐) 보고 | 「키비주얼 검수해줘」 |
| [figma-kv-extract](../.claude/skills/figma-kv-extract/SKILL.md) | Figma 전 페이지에서 KV 후보를 해시로 골라 원본·로고·실카피·프레임을 staging 에 | 「이 피그마에서 KV 뽑아줘」 |
| [figma-design-compare](../.claude/skills/figma-design-compare/SKILL.md) | 디자이너 Figma 소재 vs 우리 렌더 실측 비교 → 층위별 규칙 제안 | 「디자이너 소재랑 비교해줘」 |
| [typo-compare](../.claude/skills/typo-compare/SKILL.md) | 글자 스타일(크기·행간·자간·줄바꿈) 역할별 비교 → 타이포 규칙 제안 | 「타이포 비교해줘」 |
| [rule-iterate](../.claude/skills/rule-iterate/SKILL.md) | 규칙 채택 → 전 케이스 라운드 → 이전 라운드와 비교·회귀 처리 → 테스트 → 가이드 | 「이 규칙 반영해서 돌려봐」 |
| [history-log](../.claude/skills/history-log/SKILL.md) | 이 폴더를 쌓는 규칙대로 갱신(수치는 rounds.json 에서) | 「히스토리 남겨줘」 |
| [results-gallery](../.claude/skills/results-gallery/SKILL.md) | 결과 이미지 갤러리(`_out/gallery.html`) 만들기·섹션 추가 | 「갤러리에 추가해줘」 |
| [guide-export](../.claude/skills/guide-export/SKILL.md) | 키비주얼 디자인 가이드·광고소재 가이드를 ~/Downloads 새 날짜 폴더로 | 「가이드 최신판 뽑아줘」 |
| [pages-deploy](../.claude/skills/pages-deploy/SKILL.md) | 공개 앱 반영 = 이 저장소 main push (Pages 원본이 main /). 옛 ~/mbm-agent-pages 폐기 | 「배포해줘」 |
| [verdict-sheet](../.claude/skills/verdict-sheet/SKILL.md) | 사람 판정 시트 열기 → 판정 JSON 기록·요약 | 「판정 시트 열어줘」 |
| [kv-cutout](../.claude/skills/kv-cutout/SKILL.md) | KV 누끼 따기(바탕 곡면 + GrabCut, 사람은 Apple Vision) → 두 바탕 미리보기 → `<id>-cut` 케이스 | 「이 KV 누끼 따서 얹어봐」 |
| [logo-prep](../.claude/skills/logo-prep/SKILL.md) | 로고 svg·ico·gif·webp·jpg → 투명 PNG(+바탕·글자 속 지우기), 실패·작은 로고 보고, 접촉 시트 | 「로고 폴더 변환해줘」 |

- 보조 스크립트: `scripts/figma/`(Figma 플러그인 코드·에셋 받기·staging·1x 렌더 실측·KV 면적·나란히 이미지), `scripts/case-review.mjs`(눈 검수 한 장), `scripts/round-diff.mjs`(라운드 비교), `scripts/gallery.mjs`(갤러리), `scripts/kv-cutout.py`·`scripts/kv-personseg.swift`(누끼), `scripts/kv-person.swift`(인물 상자 — 주인공 상자만, 오려 내지 않음), `scripts/logo-prep.py`(로고 변환), `node scripts/cases.mjs relogo`(로고 규칙을 바꿨을 때 장부 로고 다시 손질), `node scripts/cases.mjs type <id> <유형|auto>`(유형 직접 지정).
