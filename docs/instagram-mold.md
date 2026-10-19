# 인스타그램 피드 1080 틀 (2026-10-16 저녁 — 사용자 피그마 수정본 기준)

정본 `core/media/instagram.json` → `instagram-feed-1080.safeArea.measuredFromTemplate.mold`. 보드 sZMBhkuLMEiyMLPPpGxvC1 페이지 133:44 섹션 「인스타그램 · 1규격(수정)」 135:1183 안 프레임 135:1185(사용자가 오토레이아웃으로 패딩·간격을 명시).
전엔 틀 없음(자유 배치 정사각 — 규정 수치 없음, 템플릿 3종 갈림). 사용자 수정본이 처음 기준.

| 역할 | 서체 | 자리 | 간격 |
|---|---|---|---|
| 글자 칸 | 가운데 정렬 | (89,131) 폭 934 | — |
| 메인 2줄 | Kakao Big Sans Bold 72, 행간 130%(94), 자간 −1.8px(−2.5%) | y 131 | |
| 날짜 | Regular 43, 행간 auto 64 | 메인 마지막 줄 + 108(= 94 + gap 14) → 2줄이면 333 | gap 14 |
| 모집직무 **값만**(라벨 없음) | Bold 43, 2줄, 행간 64 | 메인 마지막 줄 + 212(= 94+14+64+40) → 437(끝 565, 키비주얼 칸 587 위) | gap 40 |
| 로고 | — | (835,45) 195×39 오른쪽 위(여백 50) | |
| 키비주얼 칸 | 누끼 contain 바닥 맞춤(`kv: slot`) | (262,587) 786×493 오른쪽 아래(오른 여백 32, 바닥 맞닿음) | |

- 렌더러: 상세 `valuesOnly: true` 신설 — 라벨 없이 값만, 가운데 2줄은 `text-wrap:balance` + 쉼표 항목 안에서는 안 끊음(「상품/계리/리스크」). `mold.seasonMain: true` — 정사각 틀도 시즌 포함 메인(mainWide)을 먼저 쓰고 회사명 뒤에서 줄을 나눔 → 「2024 ABL생명 / 신입사원 공개채용」(수정본과 동일).
- 배경·글자색: 기존 지면 규칙(kv-vivid) + 흰 글자(colorDark).
- 반영 렌더 r4 = 154:44(수정 섹션 아래). r1 연도 빠짐 → r2 시즌 메인 → r3 직무 쉼표 단위 줄바꿈 → r4 상세 afterMain 212(키비주얼과 안 겹침).
- 테스트: 인스타 1080 을 자유 규격 픽스처로 쓰던 19건은 자유 규격(albamon-m-splash 등)으로 이관.

## 개정(10-19) 우측 여백
- 사용자 「우측에 여백 생기는 거 수정」: 수정본 키비주얼 칸 (262,587) 786×493 은 오른쪽 끝이 1048(여백 32) — 렌더는 그 칸을 그대로 그려(누끼 `right bottom/contain`, 사진 cover) 그림이 1048 에서 끝났다. 칸을 **폭 818(x+w = 1080)** 로 오른쪽 가장자리까지 넓힘(`instagram.json mold.image`, `node scripts/build-media.mjs` 로 `core/media.js` 재생성).
- 칸이 모서리에 닿으면 NAP·블라인드식 단일 누끼 블리드(`templateMold.slotBleed`)가 걸리는데 인스타는 수정본 「누끼 contain 바닥 맞춤」 그대로 두려고 `mold.image.bleed: false` 옵션 신설(렌더러 `singleObj` 게이트, 기본값은 기존 동작). 전/후: `ref/learned/cases/_out/cmp-1016/insta_gap_before.png` · `insta_gap_after.png`.
- 남는 틈은 누끼 PNG 자체의 투명 여백(ABL 원본 오른쪽 52/2400 → 17px · 유리 111/3929 → 22px) — 자산 다듬기(알파 트림) 몫. 전수조사는 `docs/kv-gap-audit.md`.
