---
name: typo-compare
description: 디자이너 Figma 소재의 글자 스타일(getStyledTextSegments - 서체·굵기·크기·행간·자간·색·정렬·줄바꿈)을 우리 렌더의 getComputedStyle 실측과 역할(메인·서브·날짜·상세·해시태그·CTA)별로 견주고, 타이포 규칙 제안(A 일반화 / B 옵션 / C 일회성)을 낸다. 코드는 고치지 않는다. 트리거 - "타이포 비교", "글자 스타일 비교해줘", "행간 자간 디자이너랑 비교", "폰트 크기 위계 비교", "typography compare", "compare text styles with Figma".
---

# typo-compare — 디자이너 vs 우리 타이포그래피

산출: `ref/learned/cases/_out/<묶음>-typo.md` + `_out/<묶음>-typo/<spec>.png`(왼쪽 Figma · 오른쪽 우리, 글자 영역 크롭).
선례: `_out/figma-sep-typo.md`(28프레임 → 규칙 A1~A7, 옵션 B1~B3 → night-1 에서 채택).
KV·지면·로고까지 보는 전체 비교는 `figma-design-compare`. 이 스킬은 그 1단계(프레임↔spec 매핑, 케이스 접수)가 끝난 뒤 글자만 깊게 본다.

## 1. 디자이너 글자 읽기
도구 로딩은 `figma-kv-extract` 0단계와 같다. 프레임 id 목록은 매핑 표에서.
```bash
node scripts/figma/plugin-code.mjs text-styles '{"pageId":"1151:3968","frameIds":["1148:5837","1309:4192"]}'
```
→ use_figma. 프레임이 많으면 13·15개씩 나눠 부른다(응답 잘림). 결과를 `<작업폴더>/figma-text.json` 으로 저장.
- `hidden:true` 노드는 뺀다(숨긴 칩 사본이 findAll 에 걸린다 — 조상까지 visible 확인 결과).
- TEXT 0개인 프레임 = 글자가 아웃라인(VECTOR)이거나 납작한 이미지 → 「측정 불가」로 적고 같은 카피의 텍스트판 프레임을 찾는다(카카오 1151:5021 → 1212:49).
- 표기 환산: Bold 700 · ExtraBold 800 · SemiBold 600 · Medium 500 · Regular 400. 행간 AUTO ≈ 1.2(Pretendard, 노드 높이 ÷ 크기로 확인), % 는 크기 대비. 자간 % = em(−3% = −0.03em).
- 한 노드 안 혼합 스타일(두 톤 강조색, 앞절 축소, 라벨 Bold + 값 Regular)은 세그먼트별로 센다.

## 2. 우리 글자 재기
```bash
node scripts/figma/render-ours.mjs --case <id> --out <작업폴더>/ours --specs <spec,spec,…>
```
`measure.json` 의 `specs[spec].fields[]` = 역할(role) · fs · fw · lh · ls · ff(계산된 첫 서체) · tw(text-wrap) · al · color · bold(라벨 굵기) · **lines**(글자별 Range top 으로 복원한 실제 줄).
- `fontOK` 가 false 면 Pretendard 가 안 떴다(CDN) — 다시 찍는다. 수치를 믿지 않는다.
- 측정 시각(`measuredAt`, UTC)과 `git diff --stat core` 를 기록한다 — core 가 바뀌면 수치가 바뀐다.

## 3. 나란히 크롭
글자 영역 좌표(우리 1x 기준)를 정해:
```bash
python3 scripts/figma/side-by-side.py --out ref/learned/cases/_out/<묶음>-typo/<spec>.png --stack h --crop x0,y0,x1,y1 \
  "Figma(디자이너)=<frames>/<spec>.png" "우리(현재 core)=<작업폴더>/ours/<spec>.png"
```
크롭 예(9월 공채): blind-post-banner 60,80,760,480 · kakao-display-pc-promo 30,60,900,480 · instagram-feed-1080 50,60,860,620 · google-gdn-300x600 0,60,300,520.
주의: 크롭의 Figma 쪽이 텍스트를 잰 프레임과 다른 변형일 수 있다 — 표의 수치는 노드 실측 기준이라고 적는다.

## 4. 비교 (역할별) — 보고서 절
1. 디자이너 텍스트 스타일 표(spec·노드 · 역할 · 서체/굵기 · 크기 · 행간 · 자간 · 색 · 정렬 · 줄바꿈) + 혼합 스타일 빈도(n/N).
2. 우리 측정 표(spec · 메인 px/굵기/행간/줄 · 서브 · 상세) + 공통(서체·word-break·자간·정렬·글자색).
3. 비교: 3.1 서체·굵기 · 3.2 크기 위계(보조 ÷ 메인 비율, 중앙값) · 3.3 행간(형태별: 가로형/세로·정사각/세로 띠) · 3.4 자간 · 3.5 줄바꿈(어느 의미 단위를 한 줄로 묶나, 고아 단어) · 3.6 숫자·날짜 표기(범위 기호, 라벨 유무, 구분자).
4. 주요 불일치(영향 큰 순, 몇 규격에 걸리나).
5. 규칙 제안:
   - **(A) 일반화** — 표: `# · 규칙 · 대상 파일:줄 · 지금 값 · 제안 값 · 근거(n/N)`. 타이포 값의 자리: `core/layouts.js`(형태별 mainLine·sub 비율), `core/canon.js`(tracking·weights), `core/renderers/ad.js`(T() 스타일·nb()/glue 줄바꿈·copyLadder 라벨), `core/renderers/banner.js`(WRAP), 매체 `guide`(템플릿 실측 매체는 tracking 0 등).
   - **(B) 옵션 후보** — 토큰·스위치로 열어 둘 것(입력 필요, 사용자 결정).
   - **(C) 일회성 표현** — 규칙으로 만들지 않음(범위 기호 혼용, 이상값, 같은 캠페인 안에서도 흔들리는 값).
6. 미검증·한계(아웃라인 글자, 문구가 달라 1:1 불가한 매체, 레퍼런스 실측 주석과 충돌하는 값 → 사용자 확인).

## 출력 계약
- 보고서 md 1개 + 크롭 PNG(규격 수만큼). 사용자에게는 불일치 상위 3~5개와 A/B/C 개수, 결정이 필요한 것.
- 숫자는 실측만. 「≈」는 환산값에만 쓴다.

## 함정
- 자간이 생기면 폭 추정(`textWidth*fs*1.04`)은 보수적이 된다 — 넘치지는 않지만 맞춤 크기가 약간 작아진다(제안에 적기).
- 레퍼런스 실측 주석(예: layouts.js 「1.33 세아제강·한미 실측」)과 디자이너 값이 어긋나면 덮어쓰지 말고 「사용자 확인 필요」로.
- `ㅣ`(U+3163)를 구분자로 쓰면 화면낭독기가 「이」로 읽을 수 있다 — 접근성 메모(미검증 표시).
