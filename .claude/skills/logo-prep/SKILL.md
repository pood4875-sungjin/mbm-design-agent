---
name: logo-prep
description: 회사 로고 파일(svg·ico·gif·webp·jpg·png, 또는 기업명·로고파일 CSV 묶음)을 투명 여백을 잘라낸 PNG 로 바꾸고, 원하면 앱·케이스 장부와 같은 규칙(core/logo.js)으로 흰/단색 바탕까지 지운다. 변환 실패·파비콘급 작은 로고·흰 로고를 보고하고 밝은/어두운 칸 접촉 시트로 눈 검수한다. 트리거 - "로고 변환해줘", "로고 투명 png로", "svg 로고 png로", "로고 폴더 정리", "로고 누끼", "convert these logos", "prep the logos", "logo to transparent png".
---

# logo-prep — 로고 손질

`~/mbm-design-agent` 에서 돈다. 원본 로고 폴더는 **고치지 않는다** — 출력 폴더(보통 scratchpad 나 `ref/learned/cases/_staging/<묶음>/logos`)에만 쓴다.

## 두 단계로 나뉜다
| 단계 | 누가 | 하는 일 |
|---|---|---|
| ① 형식 변환 + 투명 여백 트림 | `scripts/logo-prep.py` | svg → 헤드리스 Chrome 으로 높이 400px 투명 PNG · ico → 가장 큰 크기 · gif/webp → 첫 프레임 · jpg/png 그대로 |
| ② 바탕 지우기 + 트림 + 실측 | `core/logo.js` (`prepLogoRGBA`·`logoMeta`) | 네 모서리(안 되면 테두리 60%)가 한 색이면 가장자리에서 이어진 바탕을 지우고, 글자 속 구멍(O·A·P 속)도 지운다(흰 상자·남색 상자·주황 상자) · 이미 투명(테두리 10% 이상 투명)이면 손대지 않음 · 톤(light/dark) · solid(타일 로고 ≥ 0.85) · colors(대표색 3) · px |
- ② 는 앱(로고 올리기)과 `cases.mjs add --logo` 가 자동으로 한다. 케이스 장부에 넣을 거면 ① 만 하면 된다.
- 장부 없이 PNG 만 필요하면 `--knockout` 으로 ② 까지(node 로 core/logo.js 를 부른다 — 규칙이 한 곳).

## 1. 돌리기
```bash
# 폴더 전체 + 표(데스크탑>로고 형식: 기업명,로고파일,주요색hex 리스트,브랜드사이트링크)
python3 scripts/logo-prep.py ~/Desktop/로고/logos <출력> --csv ~/Desktop/로고/index.csv --sheet <출력>/_sheet.png
# 몇 회사만, 바탕 지우기까지
python3 scripts/logo-prep.py ~/Desktop/로고/logos <출력> --csv ~/Desktop/로고/index.csv --only "동부건설,기아" --knockout
# 파일 하나
python3 scripts/logo-prep.py <로고.svg> <출력>
```
- 파이썬은 `-I` 없이. 200개 ≈ 30초(svg 마다 Chrome 한 번).
- 마지막 줄 `ok N / M · 형식 {…} · 작음 K` 와 실패 목록을 본다. 결과표 `<출력>/_conv.json`: 파일별 `size`·`from`·`primary`(표의 첫 색)·`warn`·(knockout 이면 `note`·`tone`).

## 2. 눈 검수 — 접촉 시트
`--sheet` 그림을 `Read` 로 본다. 로고마다 위 밝은 칸 / 아래 어두운 칸.
- **흰 로고**(어두운 칸에서만 보임 — 딜로이트·파르나스·제뉴원): 렌더러가 톤 `light` 로 받아 지면을 어둡게 하거나 밝은 지면에선 검정 단색으로 바꾼다. 정상.
- **흰/색 상자째 로고**(기아 남색, 제주항공 주황, jpg 흰 바탕): ② 가 지운다. 못 지우는 둥근 타일(앱 아이콘)은 `solid ≥ 0.85` 타일로 남아 원색 그대로 쓴다.
- **세로 로고**(실리콘투 폭/높이 0.21): 렌더러가 높이를 √(0.8÷비율)배(최대 1.8배) 키운다.
- **파비콘급**(긴 변 < 120px — ico 26개 중 22개가 16~46px): 큰 규격에서 흐리다(adcheck `low-res-logo` 참고). 사이트에서 큰 로고를 다시 받으라고 보고.
- **엉뚱한 그림**(사이트 머리띠 통째·회전된 글자): 그림 탓 — 사용자에게 알린다.

## 3. 장부에 넣기
변환한 PNG 를 `cases.mjs add <kv> --logo <png> --primary "<표의 첫 색>"` 로. 원본 로고는 staging `logos-orig/` 에 복사해 둔다(나란히 이미지의 「로고 원본」 칸).

## 출력 계약
사용자에게: 변환 ok/전체, 형식별 수, 실패(사유), 작은 로고 수, 흰 로고·상자 로고·세로 로고 눈에 띈 것, 시트 경로.

## 함정
- macOS 파일 이름은 NFD 다. CSV(NFC)와 그냥 비교하면 한글 이름이 전부 「없음」으로 나온다 — 스크립트가 NFC 로 맞춘다.
- 기업명에 `/` 가 있으면(「세아베스틸/세아창원특수강」) 출력 이름에서 `_` 로 바꾼다.
- 표에 행은 있는데 파일 칸이 빈 회사가 있다(10-12: 세아해암학술장학재단 1건) — 실패로 보고된다.
- svg 가 `<img>` 로 안 그려지는(외부 글꼴·스크립트 의존) 파일은 빈 그림 → `empty`.
- ② 는 10-12 부터 글자 속 구멍도 지운다(남기면 단색 변환 때 O 가 ● 로 메워졌다). 예전처럼 남기려면 `knockoutLogo(d, W, H, { holes: false })`.
- 로고 규칙(core/logo.js)을 바꾸면 장부 로고를 다시 손질한다: `node scripts/cases.mjs relogo [id …]`(원본 `logo-orig.*` 에서).
