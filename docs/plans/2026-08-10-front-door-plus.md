# 서브플랜 #3: 앞문 고도화 4종 Implementation Plan

> **For agentic workers:** superpowers:executing-plans로 태스크 단위 실행.

**Goal:** ① 실 LLM 파싱(BYOK, 폴백=정규식) ② 카드 인라인 편집 모달 ③ 자산 검색 뷰(localStorage 축적) ④ 레이아웃 베리에이션([다른 시안] 사이클).

**Architecture:** LLM은 onsite BYOK 패턴 이식(`anthropic-dangerous-direct-browser-access`, 키=localStorage, 없으면 정규식 폴백 — 데모 항상 동작). 베리에이션은 `artifact.variant` → 렌더러가 `spec.variant`로 수신(계약 유지). 검색은 승인 시 localStorage 축적 → 조건 해석(LLM 또는 규칙) → 필터.

### Task 1: 베리에이션 (core)
- banner v0 솔리드/키비주얼 · v1 화이트 반전 · v2 하단 컬러밴드 / print v1 중앙 정렬 / landing v1 라이트 히어로
- generate가 `artifact.variant`를 spec에 전달. 테스트: 각 variant 마커 + 전달 확인 → commit

### Task 2: app/llm.js (BYOK)
- getKey/setKey(`mbm-ai-key`) · parseBriefLLM(text)→JSON{코어 5필드+channels} · 코드펜스 제거+JSON 수리 최소판 · 실패 시 throw → app이 정규식 폴백

### Task 3: UI 통합 (app.js/index.html)
- 헤더: [AI 키] 설정 모달 · [자산 검색] 뷰 토글
- onBrief: 키 있으면 LLM 해석(대기 버블) → 실패 폴백
- 카드 [편집] → 모달(행사명·일시·장소·CTA override, 초기화) · [다른 시안] → variant 사이클
- approveAll → localStorage `mbm-campaigns` 축적(쿼터 초과 시 메타만)
- 검색 뷰: 자연어 입력 → 조건(연도·채널·키워드) 해석 → 결과 카드(썸네일·열기·다운로드)
- 브라우저 전 플로우 재검증 → commit
