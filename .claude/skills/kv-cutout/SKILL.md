---
name: kv-cutout
description: 배경 있는 키비주얼(단색·그라데이션 바탕 위 사물·캐릭터, 사람 사진)에서 주인공만 투명 PNG 로 따낸다 — 바탕을 2차 곡면으로 맞춘 색 거리 + GrabCut, 사람은 Apple Vision 인물 분리 마스크. 두 바탕 미리보기로 눈 검수하고, 안 되는 그림은 원본 그대로 쓰고 사유를 남긴다. 외부 API 없음. 트리거 - "누끼 따줘", "배경 지워줘", "이 KV 누끼로도 테스트", "주인공만 따서 얹어봐", "cut out the subject", "remove background from the key visual", "make a cutout variant".
---

# kv-cutout — 키비주얼 누끼 따기

`~/mbm-design-agent` 에서 돈다. 원본 그림은 **고치지 않는다**(복사본·staging 에만 쓴다).
누끼를 딴 그림은 케이스 장부에 `<id>-cut` 으로 원본 케이스와 나란히 넣는다 — 같은 KV 의 「원본 그대로 / 누끼」 배치를 견주려는 것.

## 0. 누끼 후보 고르기
- 잘 되는 것: 단색·그라데이션 바탕 위 사물·캐릭터·3D(로켓·지구·유리 머리·캐릭터), 바탕과 색이 뚜렷이 다른 주인공.
- 사람 사진: `--person`(Apple Vision). 바탕이 단순하고 사람이 떨어져 있으면 된다.
- 안 되는 것(10-09 데스크탑에서 버린 5건): 링 글로우·빛 띠가 바탕과 이어진 것, 어두운 바탕에 어두운 얼굴·수염, 반투명 유리 화살표, 반사 바닥, 책상·노트북과 붙은 상반신(팔이 허공에 뜬다). → 원본 그대로만 쓰고 manifest `dropped_cut` 에 사유.
- 이미 배경이 투명한 PNG 는 딸 필요 없다(`cases.mjs add` 가 투명 여백만 자동 트림).

## 1. 따기
```bash
python3 scripts/kv-cutout.py <입력> <출력.png> --preview <미리보기.png> [옵션]
```
| 옵션 | 언제 | 10-09 예 |
|---|---|---|
| (없음) | 단색·그라데이션 바탕 사물 | 7dbb 지구본, 86de, fe38 |
| `--fill` | 속이 바탕색으로 비치는 사물(창·유리) 구멍 메우기 | 5ff1 로켓, 93f9 |
| `--largest 0.5` | 흩어진 부스러기·작은 장식 버리기 | 153f |
| `--erode 3 --fill` | 가장자리에 바탕 테가 남을 때 | 9912 |
| `--T 14` / `--T 40` | 주인공이 바탕과 비슷하면 낮추고, 바탕 무늬가 남으면 올린다 | — |
| `--rect x0,y0,x1,y1` | 테두리 장식·반사 띠를 뺄 자리(0~1) | — |
| `--skipedge bottom` | 주인공이 아래 변에 닿을 때 바탕 표본에서 그 변을 뺀다 | — |
| `--person` | 사람 사진(macOS, `scripts/kv-personseg.swift`) | f22f |
- 파이썬은 `-I` 없이 돌린다(numpy·cv2 가 사용자 site-packages 에 있다).
- 출력 줄 `T=… fg=…% bbox=…`: fg 가 1% 미만이거나 90% 넘으면 실패 — 옵션을 바꾼다.

## 2. 눈 검수 (필수)
- `--preview` 그림을 `Read` 로 본다: 남색·주황 두 바탕에 얹은 모습.
- 볼 것: 바탕 테(헤일로) · 잘려 나간 부분(손끝·안테나·반투명) · 남은 바탕 조각 · 구멍. 1:1 로 가장자리를 잘라 본다:
  `python3 -c "from PIL import Image; im=Image.open('<cut.png>').crop((x0,y0,x1,y1)); bg=Image.new('RGBA',im.size,(20,24,60,255)); bg.alpha_composite(im); bg.save('<scratchpad>/z.png')"`
- 두 번 고쳐도 안 되면 버린다(원본만). 억지 누끼는 원본보다 나쁜 소재를 만든다.

## 3. 장부에 넣기
```bash
node scripts/cases.mjs add <cut.png> --id <원본id>-cut --logo <로고.png> --primary "#HEX" \
  --note "desk · <원본파일> · <회사> · cutout" --fields '<원본과 같은 JSON>'
```
- `add` 가 투명 여백을 트림한다(원본은 케이스 폴더 `kv-orig.png`). 트림 후 긴 변이 1080 미만이면 인스타·스토리에서 흐리다(adcheck `low-res` 참고).
- 묶음이면 staging 폴더 `manifest.json` 에 `mode: "cutout"`, 쓴 옵션(`cutout_args`), 버린 것(`dropped_cut`)을 적는다 — 예: `ref/learned/cases/_staging/desk/manifest.json`.
- 렌더·검수는 `kv-review` 스킬(전체 라운드는 `rule-iterate`).

## 출력 계약
사용자에게: 딴 것 / 버린 것(사유) 수, 그림별 옵션, 미리보기 경로, 장부에 넣은 id.

## 함정
- 누끼가 되면 유형이 바뀐다(예: 그라데이션 일러스트 → 단일 사물 누끼). 배치가 크게 달라지니 원본 케이스와 꼭 같이 본다.
- 작은 원본(긴 변 < 800)을 따면 트림 후 더 작아진다(desk-37-cut 163px) — 큰 규격에서 흐림. 그림 탓으로 보고.
- 인물 마스크는 머리카락·손가락이 뭉개질 수 있다. 사람 사진은 원본 그대로(사진 전체형)가 더 나은 경우가 많다.
