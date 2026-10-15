# 2026-10-15 저녁 — 사용자 제공 폰트 3종 탑재 · 기본 글꼴 Paperlogy

## 요청
사용자: 「Paperlogy 추가하고, 폰트 규정 없는 건 이 폰트로 제작」 → 「에이전트에 폰트로도 탑재」 → Freesentation zip, 에이투지체(OTF) zip 추가 → 「문자열(폰트) 규칙 확실한 건 사실 조사해 보면 몇 개 없어 — 확인해봐」.

## 한 일
1. **탑재**(`scripts/fonts-subset.py` 에 로컬 zip 항목 `local_zip` + `--only` 때 manifest 병합 + name13 라이선스에 OFL 전문 보강): `app/fonts/paperlogy`·`freesentation`·`a2z` 각 9굵기(100~900) woff2 서브셋 + LICENSE.txt. 라이선스는 셋 다 폰트 name 테이블 ID 13/14 = **SIL OFL 1.1**(PT&/Lee Juim). 전체 묶음 9.5MB(테스트 예산 7 → 14MB).
2. **카탈로그** `core/fonts.js`: Paperlogy(group default) · Freesentation · A2Z(free, 사용자 네 폰트 앞) 추가, `DEFAULT_FONT = 'Paperlogy'`, Pretendard 는 free 로. `core/style.js` 기본 heading/body Paperlogy, `app/app.js` 인테이크 기본 폰트 Paperlogy. 별칭(FAMILY_ALIAS) 페이퍼로지·프리젠테이션·에이투지체.
3. **렌더 하네스 4개**(render-ours·export-frames·svg-check·cases.mjs)에 번들 @font-face(파일 경로) 주입 — Pretendard CDN 만 불러 Paperlogy 가 시스템 글꼴로 대체되던 것 수정. 확인: 구글 580 렌더 ff = Paperlogy, fontOK 700/800 true.
4. **폰트 규정 전수 조사**(core/media/*.json `fonts`): **required 가 있는 매체는 자소설닷컴·카카오(비즈보드)·리멤버 셋뿐**(전부 Pretendard). 네이버GFA 권장(나눔고딕·고딕계열), NAP 비즈보드 「템플릿 내 폰트만」(이름 자료 없음), 알바몬·게임잡은 PSD 표기만(규정 아님), 구글·인스타·블라인드·에브리타임·캐치·잡다·당근·스펙업 없음 → 이 매체들은 기본 Paperlogy 로 나간다. 구글 ABL 샘플이 Paperlogy 라 구글 틀 수치 환산 문제도 사라짐.
5. 테스트 기대 갱신(fonts·fonts-bundled·style). `docs/fonts.md` 표·규칙 갱신.

## 주의
- Figma 로 올리는 SVG 글자는 Paperlogy 로 지정된다 — 사용자 Figma 에 Paperlogy 가 설치돼 있어야 그대로 보인다(없으면 대체 글꼴, 값은 유지).
- 폰트 규정 셋(자소설·카카오·리멤버)은 그대로 Pretendard 강제.
