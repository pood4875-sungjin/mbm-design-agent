---
name: figma-frames-sync
description: Figma 가이드 파일 「MBM 디자인 에이전트 — 가이드·작업 프레임·제작물」(qhEEyEBDCjTmTho3tByBf1)을 저장소에서 다시 만들거나 일부만 갱신한다 — 매체 페이지(① 가이드 → ② 작업 프레임 가이드(규격 프레임 + 8항목 체크리스트 블록) → ③ 실제 제작물 SVG), 디자인 가이드 판정 흐름, 규칙 장부, 테스트 샘플 모음, 디자이너 소재 비교. 트리거 - "피그마 가이드 파일 다시 만들어", "Figma 프레임 갱신", "8항목 블록 다시 올려", "매체 페이지 다시 올려", "sync the Figma guide file", "rebuild figma frames".
---

# figma-frames-sync — Figma 가이드 파일 만들기·갱신

파일: https://www.figma.com/design/qhEEyEBDCjTmTho3tByBf1 (비공개 Drafts, 10-14~15 만듦). 원본은 저장소이고 Figma 는 **참고용 사본**이다 —
규칙·매체 JSON 을 고쳤으면 여기서 다시 올린다. 노드 id 장부는 `ref/learned/cases/_out/figma-frames/manifest.json`(`node scripts/figma/figma-frames-build.mjs manifest`).

## 0. 도구
```
ToolSearch  select:mcp__plugin_figma_figma__use_figma,mcp__plugin_figma_figma__upload_assets,mcp__plugin_figma_figma__get_screenshot,mcp__plugin_figma_figma__create_new_file
Skill       figma:figma-use                      ← use_figma 전에 필수. 새 파일이면 figma:figma-create-new-file 도
```
- use_figma 는 페이지 하나에 `setCurrentPageAsync` 한 번. 페이지가 다르면 호출을 **한 메시지에 병렬**로.
- 반환값 20KB 제한 — 큰 id 목록은 `join(',')` 한 문자열로, 그래도 크면 나눠 읽는다.
- 플러그인 샌드박스에 `fetch` 가 없다. 큰 데이터(ops JSON)는 **SVG `<text>` 에 실어 upload_assets 로 올린 뒤** use_figma 에서 `findAll(TEXT).characters` 를 JSON.parse 한다(「캐리어」). 쓰고 나면 `car.remove()`.

## 1. 저장소 쪽 산출물 (Figma 올리기 전에)
```bash
node scripts/figma/export-frames.mjs [--media a,b] [--png]      # ② zone.json·guide/*.json·③ SVG(+text.json)·샘플 PNG → _out/figma-frames/index.json
node scripts/figma/figma-frames-build.mjs prep <page>           # _code/<page>.<n>.js(Plugin API ops) + _plan/<page>.uploads.json
node scripts/figma/checklist8-figma.mjs                          # 8항목 블록 글감 → _plan/checklist.json + _code/ck.<매체>.ops.svg(캐리어)
```
page = `cover | flow | rules | samples | compare | <매체 id>`. 페이지 id 는 `_plan/pages.json`(`_file` = 파일 키). 섹션·컴포넌트 id 는 `_plan/<page>.keys.json`.
- 8항목 블록의 값·꼬리표 규칙은 `scripts/figma/checklist8-figma.mjs` 머리말: [규정] 매체 JSON / [템플릿] 템플릿 실측·샘플 중앙값 / [자유 · 우리 기본] 규정 없음 → 괄호 안에 대표 렌더(`<spec>/<case>.text.json`·`zone.json` trace)의 우리 기본값 / [확인 필요]. 보드 「자유」면 자유로 두되 값은 그대로 보여 준다.

## 2. Figma 에 올리기 (페이지마다)
1. **ops 캐리어**: `_code/<page>.<n>.ops.json` 을 SVG `<text xml:space="preserve">` 에 넣은 `.ops.svg`(이스케이프 `& < >`)를 `upload_assets`(count N, currentPageId 아무 페이지) → curl POST → `placedOnNodeId`.
2. **실행**: 러너 코드 = `const PAGE=..;const KEYS={…};const CARRIER="<id>";` + `figma-frames-build.mjs` 의 HELPER(`N` 을 KEYS 로 되살리는 판). 여러 조각은 `CARRIERS=[…]` 로 한 호출에 이어 붙여도 된다(같은 페이지). 반환 `keys` 를 `_plan/<page>.keys.json` 에 저장.
3. **그림**: PNG 는 `upload_assets`(nodeIds = 자리 사각형 id, 60개씩) → `node scripts/figma/figma-frames-upload.mjs <page> <urls.json>` (uploads.json 순서 = 사각형 생성 순서 — `root.findAll(RECTANGLE name^=img_)` 의 문서 순서와 같다. 러너는 `img_` 키를 사각형 이름으로 쓴다). SVG(제작물)는 nodeIds 없이 올리면 페이지에 새 프레임으로 들어온다 → `_plan/<page>.uploaded.json`.
4. **제작물 자리 옮기기·굵기 복원**: `figma-frames-build.mjs post <매체>` → `_code/<매체>.B.1.js`(mv + fx: Figma 가 SVG 600 굵기를 Bold, 자간을 0 으로 읽어 `text.json` 으로 다시 입힌다) → 실행(KEYS `prod`).
5. **8항목 블록**: `_code/ck.<매체>.ops.svg` 캐리어 → 러너(이 세션 `scratchpad/ck-runner.js` 와 같은 코드 — 규격 컴포넌트 오른쪽 `x = comp.x + max(w,460) + 32`, 폭 660, 행이 모자라면 아래 행 전부(②·③) 내려 밀고, ② 폭이 모자라면 ③ 을 오른쪽으로; ① 가이드 프레임 index 1 에 「8항목 요약」 + 꼬리표 범례). 프레임 없는 규격(카카오 CPT 3·스펙업 2)은 ② 맨 아래 「작업 프레임 없는 규격」 아래에.
6. 스크린샷으로 확인(`get_screenshot` 또는 `await node.screenshot()`), `figma-frames-build.mjs manifest`.

## 3. 자주 하는 부분 갱신
- 매체 규정·8항목만 바뀜 → `checklist8-figma.mjs` → 해당 매체 ② 의 `8항목 ·` 프레임과 ① 의 `8항목 요약` 삭제 → 2-5.
- 렌더(규칙)가 바뀜 → `export-frames.mjs --media <m>` → ③ 의 SVG 프레임 삭제 → 2-3(SVG)·2-4.
- 케이스가 늘었음 → `export-frames.mjs --png` → `prep samples` → 샘플 페이지 root 삭제 후 2-1~2-3.
- 디자이너 소재 비교 폴더가 늘었음(`_out/figma-sep-final`·`figma-spec-sample`·`t1014`) → `prep compare` → root 삭제 후 다시.

## 4. 한계 (파일 표지에도 적어 둠)
- Figma 는 SVG 의 자간·600 굵기·필터(로고 단색 변환)·그림자를 못 읽는다 — 굵기·자간은 B 단계로 복원, 필터는 PNG 대체(프레임 아래 「근사·대체」 줄).
- 문서 이름은 Plugin API 로 못 바꾼다(`figma.root.name` 불가) — 사람이 Figma 에서 「MBM 디자인 에이전트 — 가이드·작업 프레임·제작물 (2026-10-14)」로.
- Pretendard 는 Figma 에 설치돼 있어야 글자가 그대로 보인다(없으면 대체 글꼴로 표시되지만 글자·굵기 값은 유지).
