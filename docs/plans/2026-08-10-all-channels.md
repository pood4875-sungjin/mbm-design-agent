# MBM Design Generator — 서브플랜 #2: 전 채널 + 전파·검색·로그 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 샘플 자료 없이 만들 수 있는 P0 기능 완성 — eDM·랜딩·인쇄 렌더러, 생성 파이프라인+로그, 변경 전파(overrides 보존·충돌 검출), 자산 검색, PNG/PDF 변환.

**Architecture:** 서브플랜 #1 계약 위에 렌더러만 추가(계약 불변). 전파는 "정보=시스템·표현=디자이너" 불변식을 `overrides` 필드로 구현. 변환은 macOS Chrome headless CLI — npm 의존성 0 유지.

**Tech Stack:** 동일 (바닐라 JS ESM · node --test · 파일 기반).

**이월:** F1 파싱·대화 앞문 (직전 MBM 샘플 필요), X1~X6.

---

### Task 1: SPECS 확장 (전 채널)

**Files:** Modify `core/contract.js` · Test `test/contract.test.js` (추가)

- [ ] 테스트 추가 — edm/landing/poster/xbanner/hyunsumak 스펙 존재, mm 규격·bleed 확인
- [ ] SPECS에 5개 항목 추가 (`edm-600`, `landing`, `poster-a2`, `xbanner-600x1800`, `hyunsumak-4000x900` — 인쇄 수치는 가정값 ⚠확정 필요)
- [ ] `npm test` PASS → commit `feat: extend channel specs to edm, landing, print`

### Task 2: eDM 렌더러 (이메일 호환)

**Files:** Create `core/renderers/edm.js` · Test `test/edm.test.js`

- [ ] 테스트: `<table` 레이아웃·`width="600"`·인라인 스타일만(외부 CSS·`<script>` 금지)·행사명/CTA 포함·발신자 표기
- [ ] 구현: 테이블 기반(아웃룩 호환), 히어로(키비주얼 `<img>` 또는 색면 셀), 정보 행, bulletproof CTA 버튼, 푸터(senderName)
- [ ] PASS → commit `feat: email-compatible edm renderer`

### Task 3: 랜딩 렌더러

**Files:** Create `core/renderers/landing.js` · Test `test/landing.test.js`

- [ ] 테스트: `<!doctype`·viewport 메타·행사명/일시/장소·등록 폼(입력 3개+제출)·자기완결(http 참조 없음)
- [ ] 구현: 단일 HTML(임베디드 CSS), 히어로(키비주얼/색면)+정보 카드+CTA+등록 폼, 반응형
- [ ] PASS → commit `feat: self-contained landing renderer`

### Task 4: 인쇄 렌더러 (poster·xbanner·현수막 공용)

**Files:** Create `core/renderers/print.js` · Test `test/print.test.js`

- [ ] 테스트: `@page size:426mm 600mm`(A2+bleed 3mm×2)·mm 단위 본문·행사명·스펙별 분기(가로형 현수막)
- [ ] 구현: (wmm+2×bleed)×(hmm+2×bleed) 페이지, 풀블리드 배경, mm 타이포 스케일(min(wmm,hmm) 비례), 세로/가로 레이아웃 분기
- [ ] PASS → commit `feat: print renderer with bleed for poster, x-banner, banner fabric`

### Task 5: 생성 파이프라인 + KPI 로그

**Files:** Create `core/generate.js` · Test `test/generate.test.js`

- [ ] 테스트: `channelSpecIds(['banner','edm'])` → 4개 spec / `generateArtifacts(campaign)` → artifacts에 specId·contextVersion·status:'draft'·html 채움 / overrides.core가 렌더에 반영 / `logEvent` 누적
- [ ] 구현: 채널→spec 매핑, 렌더러 일괄 등록(`registerAll()`), artifact 생성(overrides.core를 context 위에 덮은 유효 컨텍스트로 렌더), `logEvent(campaign, type, meta)` (+timestamp)
- [ ] PASS → commit `feat: generation pipeline with overrides and activity log`

### Task 6: 변경 전파

**Files:** Create `core/propagate.js` · Test `test/propagate.test.js`

- [ ] 테스트: patch 적용 시 전 artifact 재렌더·contextVersion 갱신 / override된 다른 필드는 보존 / **같은 필드 충돌 시 conflicts 목록 + 해당 artifact 미갱신(needsReview)** / impacted 목록 반환
- [ ] 구현: `propagate(campaign, corePatch)` → `{campaign, impacted, conflicts}` — 불변식 1 코드화
- [ ] PASS → commit `feat: context propagation preserving designer overrides`

### Task 7: 자산 검색

**Files:** Create `core/search.js` · Test `test/search.test.js`

- [ ] 테스트: 임시 폴더에 캠페인 2개 저장 → `searchCampaigns(dir, {year:'2026'})`·`{channel:'banner'}`·`{q:'서울'}` 필터 각각 동작
- [ ] 구현: campaigns 폴더 스캔(campaign.json), 연도(일시 프리픽스)·채널·키워드(행사명) 필터 → `[{id,name,date,channels}]`
- [ ] PASS → commit `feat: campaign asset search by year, channel, keyword`

### Task 8: PNG/PDF 변환 + 데모 확장

**Files:** Create `core/export.js`, Modify `scripts/demo.js`

- [ ] `findChrome()` — macOS Chrome/Chromium/Edge 경로 탐색. 없으면 변환 스킵(파일은 HTML로 유지)
- [ ] `exportPng(html경로, out, w, h)` = `--headless=new --screenshot --window-size` / `exportPdf` = `--print-to-pdf --no-pdf-header-footer`
- [ ] 데모: 전 채널 캠페인 1건 → out/에 HTML 전부 + (Chrome 있으면) 배너 PNG 3종·포스터 PDF → 브라우저 확인
- [ ] commit `feat: chrome-headless png/pdf export and full-channel demo`

## Self-Review

- **Coverage**: F5 전 채널(P0 채널 6종) ✓ F7 전파 ✓ F8 출력 ✓ F9 검색(조건 검색까지, 자연어 해석은 앞문 이월) ✓ F10 로그 ✓. F2 대화·F6 리뷰 UI는 앞문 서브플랜으로 이월 — 의도됨.
- **Type consistency**: 렌더러 시그니처 `(ctx, style, spec)` 전 채널 동일. `esc`는 banner.js에서 import 재사용.
- **Placeholder**: 세부 코드는 실행 시 본 문서 기준으로 작성 — 테스트 조건이 스펙 역할.
