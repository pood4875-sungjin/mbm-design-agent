---
name: figma-kv-extract
description: Figma 파일(또는 노드 링크)의 모든 페이지를 훑어 키비주얼로 쓸 만한 그림을 imageHash 로 중복 제거해 고르고(로고·아이콘·장식·UI 제외), 알파를 살린 원본·투명 로고·실카피·브랜드색·디자이너 프레임 스크린샷을 staging 폴더에 manifest.json 과 함께 모은다. 트리거 - "Figma에서 KV 뽑아줘", "이 피그마 파일 키비주얼 추출", "디자이너 소재에서 그림 가져와", "figma.com/design/... 링크", "extract key visuals from Figma", "stage Figma KVs".
---

# figma-kv-extract — Figma 에서 KV 후보 뽑아 staging

결과물은 `ref/learned/cases/_staging/<묶음 이름>/` 이다. **접수(cases.mjs add/run)는 하지 않는다** — 사용자가 시키거나
`kv-review`·`rule-iterate` 로 넘어갈 때 4단계를 돌린다. 이 폴더는 git 밖 로컬 자료다.

## 0. 도구 불러오기 (한 번에)
```
ToolSearch  select:mcp__plugin_figma_figma__get_metadata,mcp__plugin_figma_figma__get_screenshot,mcp__plugin_figma_figma__get_design_context,mcp__plugin_figma_figma__download_assets,mcp__plugin_figma_figma__use_figma
Skill       figma:figma-use          ← use_figma 를 부르기 전에 반드시(필수 선행)
```
- Figma 플러그인 MCP 가 안 되면 `mcp__figma-desktop__*`(데스크톱 앱 열려 있어야 함)로 대신한다.
- URL `https://www.figma.com/design/<fileKey>/<이름>?node-id=470-158376` → fileKey, nodeId `470:158376`(하이픈 → 콜론).
- use_figma 는 **읽기만** 한다(노드를 만들거나 바꾸지 않는다). 매 호출에 `skillNames: "figma-use"`, 짧은 description.

플러그인 코드는 저장소에 있다. ARGS 를 채워 code 로 넣는다:
```bash
node scripts/figma/plugin-code.mjs locate '{"nodeId":"470:158376"}'     # 출력 전체를 use_figma code 로
```
| 스니펫 | 하는 일 |
|---|---|
| `locate` | 노드 → PAGE 까지 조상 사슬 + 전체 페이지 목록 |
| `page-inventory` | 페이지 최상위 노드 + 이미지 채우기 imageHash 별 사용 횟수·원본 크기·예시 노드 |
| `frame-boxes` | 프레임별 글자(크기·굵기·색)·이미지·도형·로고 상자, 바탕색 → 실카피·브랜드색 |
| `export-node` | 노드를 투명 PNG(base64)로 — 로고·벡터 KV |

## 1. 범위 정하기
1. `locate` 로 받은 노드의 위치를 본다. **받은 노드가 TEXT·이미지 사각형일 수 있다**(9월 공채: 1148:5860 = 제목 TEXT). 사슬을 PAGE 까지 올라가 그 페이지(또는 사용자가 「모든 페이지」라 했으면 파일 전체)를 범위로 잡고, 그렇게 잡았다고 보고한다.
2. 페이지마다 `page-inventory`(큰 파일은 페이지당 한 번 — 한 번에 다 돌리면 응답이 잘린다).
   - 건너뛸 페이지: 쓰레기통·테스트·빈 페이지·구분선·흐름도·일정. 건너뛴 것도 목록에 적는다.
3. 섹션·프레임 모양은 `get_screenshot`(fileKey, nodeId, maxDimension)으로 본다. 결과의 `image_url` 은 바로 내려받아 Read 한다(만료됨):
   ```bash
   python3 scripts/figma/assets.py fetch <scratchpad>/fr --named <목록.txt>    # 줄마다 "446-440840 <uuid>"
   ```

## 2. 후보 고르기
- 넣는 것: 누끼 PNG(3D 오브젝트·캐릭터·인물), 사진, 일러스트(바탕 포함 장면), 주인공 있는 질감·바탕.
- 빼는 것(이유와 함께 목록에): 로고, UI 아이콘·UI 스크린샷, 단색·그라데이션, 별밭·글로우 오버레이, 장식 조각, 해상도 아주 낮은 썸네일(긴 변 < 600).
- **imageHash 로 중복 제거** — 같은 그림이 프레임 수십 곳에 쓰여도 후보 하나. 변형(색·크롭)은 메모에 해시만 남긴다.
- 후보마다: 고객/캠페인, 쓰인 프레임 id(비교용 최대 4~9개), kind(cutout|photo|illust|texture), 로고 유무, 브랜드색(프레임 바탕·강조 글자 hex), 실카피(헤드라인·날짜·장소·CTA).
  - 실카피·색은 `frame-boxes`(ARGS: pageId, frameIds 6개씩, logoPattern)로 읽는다. 로고 그룹 이름은 파일마다 다르다 — 한 프레임을 먼저 보고 패턴을 정한다.
  - 소재에 없는 정보(근무지·지원 URL 등)는 **비워 둔다**(추측 금지).
- 디자이너가 KV 에 건 이미지 필터·회전·마스크 덧칠은 메모에 적는다(나중에 「표현」으로 분류).

## 3. 내보내기
1. **원본 바이트**: `download_assets(fileKey, nodeId=<KV가 들어 있는 프레임>)` → 결과의 `rawImages[].url` 이 원본(알파 유지)이다.
   ```bash
   python3 scripts/figma/assets.py fetch <scratchpad>/raw <url-or-uuid> <url-or-uuid> …
   ```
   파일명 = 바이트 SHA-1 = Figma imageHash. 그래서 inventory 의 해시 접두어로 짝짓는다. 출력에 크기·모드·알파 범위가 찍힌다.
   - `export.url` 은 프레임 렌더(흰 바탕)라 KV 원본으로 쓰지 않는다.
2. **로고**: download_assets export 는 흰 바탕이 깔려 알파가 없다(10-08 실제로 흰 사각형이 됨). `export-node`(ARGS: pageId, nodeId, scale 4)로 받아:
   ```bash
   # use_figma 결과의 b64 문자열을 파일로 저장한 뒤
   python3 scripts/figma/assets.py b64 <scratchpad>/logo.b64 <scratchpad>/logo_<브랜드>.png    # "알파 0~255" 여야 정상
   ```
   - 흰색 로고(Light)와 검정 로고가 둘 다 있으면 둘 다 받는다. svg/ico/gif 변환은 **logo-prep 스킬(보류 중)** 몫 — 지금은 PNG 경로만.
3. **벡터·그룹 KV**(비트맵이 아닌 것): `export-node` scale 2 로 투명 PNG.
4. **디자이너 프레임 스크린샷**: `get_screenshot(maxDimension=프레임 긴 변)` → `assets.py fetch … --named`. 파일명은 nodeId 의 `:` 를 `-` 로(`446-440840.png`).
5. 누끼 알파 확인: `python3 scripts/case-trim.py <png> <scratchpad>/x.png` → `from WxH to WxH` 면 투명 여백이 있다(정상). `keep` 은 불투명 그림.

## 4. staging 으로 모으기
candidates.json 을 쓴다(형식은 `scripts/figma/stage.py` 머리말). 핵심:
```json
{ "out": "ref/learned/cases/_staging/<묶음>", "raw": "<scratchpad>/raw", "frames": "<scratchpad>/fr",
  "logos": {"hdot": "<scratchpad>/logo_hdot.png"}, "frameInfo": {"446:440840": [641, 460, "Banner_641x460"]},
  "candidates": [{"id": "hdot-wave", "hash": "14beb9d8", "kind": "texture", "page": "…", "nodeId": "…",
                  "frames": ["446:440840"], "logo": "hdot", "primary": "#2878D8",
                  "fields": {"client": "에이치닷", "headline": "…"}, "note": "무엇이고 어디 쓰였나"}] }
```
```bash
python3 scripts/figma/stage.py <candidates.json> --dry-run     # 해시·프레임 누락 확인(문제 있으면 종료코드 2)
python3 scripts/figma/stage.py <candidates.json>
```
- id 는 장부(`node scripts/cases.mjs list`)와 겹치지 않게. 로고가 「분명히 보이는」 후보에만 logo 를 단다(같은 고객이라도 소재에 로고가 없으면 null).

(접수를 시켰을 때만) 장부에 넣기:
```bash
python3 scripts/figma/add-from-manifest.py ref/learned/cases/_staging/<묶음> --dry-run
python3 scripts/figma/add-from-manifest.py ref/learned/cases/_staging/<묶음> [--fields client|full]
# 마지막 줄에 찍힌 명령으로 렌더·검수:  node scripts/cases.mjs run <id…> --shots --round "<묶음> N건 접수 (규칙 변경 전)"
```
- `--fields client`(기본): 채용 기본 필드 + client 만 — 디자이너 소재가 세미나·제품이어도 recruit 맥락으로 렌더.
- `--fields full`: 실카피로 — 채용 소재를 1:1 비교할 때(figma-design-compare).

## 5. 보고 — 출력 계약
1. 페이지 표(페이지 · 최상위 노드/서로 다른 이미지 수 · 내용 · 건너뜀 여부).
2. 후보 표(id · kind · 원본 크기 · 알파 · 프레임 수 · 로고 · primary · 출처 페이지 · 메모).
3. 제외 목록(해시 접두어 · 이유).
4. 로고(파일 · 크기 · 알파 확인 결과).
5. staging 경로 · manifest 건수 · 용량(`du -sh`).
6. 못 한 것·불확실한 것(인물이 누구인지 확정 못 함, 해상도 낮음 등).

## 함정
- 에셋 URL(`/api/mcp/asset/<uuid>`)은 금방 만료된다 — 응답 받자마자 내려받는다.
- 이미지 노드의 `getSizeAsync()` 가 실패하는 해시가 있다(삭제된 그림) — 후보에서 뺀다.
- 숨김(visible=false) 노드와 인스턴스 속 숨김 자식은 inventory 에서 빠진다(`skipInvisibleInstanceChildren`).
- JPEG 원본은 stage.py 가 PNG 로 다시 저장한다(cases.mjs 는 png/jpg/webp 를 받지만 장부 일관성 때문).
- 용량: 29건 + 프레임 70장이 233MB 였다. 프레임은 후보당 4~9장으로 제한.
