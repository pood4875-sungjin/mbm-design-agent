// 타이포 시안 5묶음(11-09 사용자 「타이포에 대한 케이스도 레이아웃이나 타이포 패딩, 뱃지 스타일 등 추가 — 옵셔널하게 제시하는 그 시안」).
//   출처: 컨시어지 피그마 sZMBhkuLMEiyMLPPpGxvC1 250:24036 … 250:25118(구글 GDN 970×250·580×400·300×600·300×1050·250×250, 인스타 1080) 노드 실측.
//   templates-data.js(홍보사업셀 추출) 형식 + 선택 필드(ad-template.js 가 있을 때만 쓴다):
//     row.lh 행간(글자 크기 배) · row.ls 자간(em) · row.op 글자 불투명도 · row.join 메인 기업명·채용구분 사이(기본 줄바꿈) · row.withSeason 메인 첫 줄에 시즌
//     row.label.text 라벨 문구 · row.sep 라벨과 값 사이 막대(한 줄) · row.sepWrap 라벨 양옆 막대(라벨이 위) · row.stack 값(쉼표 목록)을 한 줄에 하나씩 · row.hashSpace 「# 값」
//     role 'client'(회사명 머리 — 있으면 메인은 채용구분만) · role 'slogan'(슬로건 — 없으면 줄 생략)
//     badge.alpha 알약 칠 불투명도 · badge.ink 알약 글자색(bg = 지면색 · fg = 글자색) · badge.px/py 알약 안쪽 여백(글자 크기 배) · badge.gap 해시 알약 사이(글자 크기 배)
//   고객사 문구·이미지·색 값은 넣지 않는다(색은 역할만: fg 글자색 · accent 브랜드 강조 · bg 지면색). curated: 사용자 시안이라 합격 목록(templates-quality) 없이 후보에 든다.
const pill = (x, y, w, h, o) => ({ x, y, w, h, r: Math.round(h / 2 * 10) / 10, fill: 'fg', stroke: false, ...o });
const T = (role, y, x, w, fs, wt, o = {}) => ({ role, x, y, w, fs, wt, al: 'left', color: 'fg', badge: null, lines: 1, ...o });

export const TYPO_FAMILIES = [
  {
    id: 'typo-1109-glasspill', source: 'TYPO', name: '반투명 일정 알약 · 막대 라벨', visual: 'right', typo: 'datebadge', align: 'left', font: 'NanumSquareNeo', curated: true,
    frames: [
      { w: 970, h: 250, id: '250:24036', tone: 'dark', bgDark: true, full: false, visual: 'right', slot: { x: 637, y: 43, w: 333, h: 207, r: 0 }, logo: { x: 875, y: 17, w: 43, h: 15 }, rows: [
        T('season', 46.7, 35.8, 125, 27, 700),
        T('main', 96.9, 35.8, 406, 44.9, 800, { join: ' ', span: 50 }),
        T('date', 157.7, 35.8, 343, 22.9, 800, { badge: pill(35.8, 135.5, 343.1, 44.4, { alpha: 0.2, ink: 'fg', px: 0.99, py: 0.42 }) }),
        T('role', 206.9, 47.1, 200, 20, 700, { label: { role: 'label', text: '모집직무', fs: 20, wt: 700, color: 'fg' }, sep: 'ㅣ' }),
      ] },
      { w: 580, h: 400, id: '250:25149', tone: 'dark', bgDark: true, full: false, visual: 'right', slot: { x: 283, y: 189, w: 297, h: 211, r: 0 }, logo: { x: 465, y: 33, w: 73, h: 26 }, rows: [
        T('season', 57.6, 27.2, 125, 27, 700),
        T('main', 133.7, 27.2, 267, 44.9, 800, { lines: 2, lh: 1.225, span: 110 }),
        T('date', 225.6, 27.2, 286, 20, 800, { badge: pill(27.2, 204.9, 286.4, 44.4, { alpha: 0.2, ink: 'fg', px: 0.66, py: 0.56 }) }),
        T('role', 276.7, 40.3, 190, 19, 700, { label: { role: 'label', text: '모집직무', fs: 19, wt: 700, color: 'fg' }, sep: 'ㅣ' }),
      ] },
      { w: 300, h: 600, id: '250:24386', tone: 'dark', bgDark: true, full: false, visual: 'bottom', slot: { x: 4, y: 405, w: 296, h: 195, r: 0 }, logo: { x: 231, y: 21, w: 48, h: 17 }, rows: [
        T('season', 68.3, 26.5, 126, 27.2, 700),
        T('main', 183.5, 26.5, 172, 45.2, 800, { lines: 3, lh: 1.25, span: 175 }),
        T('date', 305.6, 22.2, 250, 17, 800, { badge: pill(22.2, 289.7, 250.7, 35.1, { alpha: 0.2, ink: 'fg', px: 0.89, py: 0.47 }) }),
        T('role', 355.8, 30.5, 175, 17.5, 700, { label: { role: 'label', text: '모집직무', fs: 17.5, wt: 700, color: 'fg' }, sep: 'ㅣ' }),
      ] },
      { w: 300, h: 1050, id: '250:24737', tone: 'dark', bgDark: true, full: false, visual: 'bottom', slot: { x: 0, y: 822, w: 300, h: 228, r: 0 }, logo: { x: 108, y: 56, w: 83, h: 30 }, rows: [
        T('season', 189.6, 22.8, 142, 30.7, 700),
        T('main', 323.3, 22.8, 194, 51, 800, { lines: 3, lh: 1.41, span: 206 }),
        T('date', 472.2, 12.4, 274, 19, 800, { badge: pill(12.4, 451.1, 274.3, 41.2, { alpha: 0.2, ink: 'fg', px: 0.73, py: 0.53 }) }),
        T('role', 522.1, 22.8, 220, 22, 700, { label: { role: 'label', text: '모집직무', fs: 22, wt: 700, color: 'fg' }, sep: 'ㅣ' }),
      ] },
      { w: 1080, h: 1080, id: '250:25622', tone: 'dark', bgDark: true, full: false, visual: 'bottom', slot: { x: 354, y: 592, w: 726, h: 488, r: 0 }, logo: { x: 877, y: 70, w: 133, h: 47 }, rows: [
        T('season', 119.1, 73.7, 252, 54.5, 700),
        T('main', 283.4, 73.7, 537, 90.4, 800, { lines: 2, lh: 1.31, span: 219 }),
        T('date', 467, 71.7, 670, 45, 800, { badge: pill(71.7, 426.7, 669.7, 83.9, { alpha: 0.2, ink: 'fg', px: 0.8, py: 0.38 }) }),
        T('role', 583.1, 95, 352, 35.1, 700, { label: { role: 'label', text: '모집직무', fs: 35.1, wt: 800, color: 'fg' }, sep: '｜' }),
      ] },
    ],
  },
  {
    id: 'typo-1109-barlabel', source: 'TYPO', name: '영문 머리말 · 막대 라벨 정보', visual: 'right', typo: 'label', align: 'left', font: 'SUIT', curated: true,
    frames: [
      { w: 580, h: 400, id: '250:25595', tone: 'light', bgDark: false, full: false, visual: 'right', slot: { x: 53, y: 43, w: 527, h: 357, r: 0 }, logo: { x: 422, y: 38, w: 132, h: 29 }, rows: [
        T('season', 55.8, 32.4, 148, 16, 500, { lines: 2, lh: 1.19, ls: -0.1, op: 0.7 }),
        T('main', 130.1, 28.7, 491, 42, 700, { lines: 2, lh: 1.167, ls: -0.04, emph: { kind: 'color', on: 'client' }, span: 98 }),
        T('date', 214.1, 32.5, 262, 20, 500, { ls: -0.04, lh: 1.3, label: { role: 'label', text: '모집기간', fs: 20, wt: 500, color: 'fg' }, sep: '｜' }),
        T('role', 262.1, 32.5, 355, 20, 500, { lines: 2, ls: -0.04, lh: 1.3, label: { role: 'label', text: '모집직무', fs: 20, wt: 500, color: 'fg' }, sep: '｜' }),
      ] },
      { w: 970, h: 250, id: '250:25605', tone: 'light', bgDark: false, full: false, visual: 'right', slot: { x: 406, y: 0, w: 564, h: 250, r: 0 }, logo: { x: 834, y: 28, w: 103, h: 23 }, rows: [
        T('season', 37.3, 37.2, 308, 20, 500, { lh: 1.2, ls: -0.1, op: 0.7 }),
        T('main', 99.3, 36.2, 464, 39, 700, { lines: 2, lh: 1.18, ls: -0.04, emph: { kind: 'color', on: 'client' }, span: 92 }),
        T('date', 176.8, 37.2, 262, 20, 500, { ls: -0.04, lh: 1.3, label: { role: 'label', text: '모집기간', fs: 20, wt: 500, color: 'fg' }, sep: '｜' }),
        T('role', 211.9, 37.2, 553, 20, 500, { ls: -0.04, lh: 1.3, label: { role: 'label', text: '모집직무', fs: 20, wt: 500, color: 'fg' }, sep: '｜' }),
      ] },
      { w: 300, h: 600, id: '250:25614', tone: 'light', bgDark: false, full: false, visual: 'bottom', slot: { x: 0, y: 263, w: 300, h: 337, r: 0 }, logo: { x: 93, y: 36, w: 113, h: 25 }, rows: [
        T('season', 103.6, 66.4, 167, 18, 500, { al: 'center', lines: 2, lh: 1.1, ls: -0.1, op: 0.7 }),
        T('main', 196.5, 30.4, 238, 33, 700, { al: 'center', lines: 3, lh: 1.24, ls: -0.04, emph: { kind: 'color', on: 'client' }, span: 123 }),
        T('date', 303.7, 72.5, 155, 18, 500, { al: 'center', ls: -0.04, lh: 1.44, labelTop: true, label: { role: 'label', text: '모집기간', fs: 18, wt: 500, color: 'fg' }, sepWrap: '｜' }),
        T('role', 387.7, 30.5, 239, 18, 500, { al: 'center', lines: 3, ls: -0.04, lh: 1.44, labelTop: true, label: { role: 'label', text: '모집직무', fs: 18, wt: 500, color: 'fg' }, sepWrap: '｜' }),
      ] },
      { w: 300, h: 1050, id: '250:25586', tone: 'light', bgDark: false, full: false, visual: 'bottom', slot: { x: 0, y: 629, w: 300, h: 421, r: 0 }, logo: { x: 76, y: 54, w: 148, h: 33 }, rows: [
        T('season', 147.6, 57.5, 185, 20, 500, { al: 'center', lines: 2, lh: 1.2, ls: -0.1, op: 0.7 }),
        T('main', 278.7, 17, 266, 38, 700, { al: 'center', lines: 3, lh: 1.58, ls: -0.04, emph: { kind: 'color', on: 'client' }, span: 180 }),
        T('date', 440.9, 46.5, 206, 24, 500, { al: 'center', ls: -0.04, lh: 1.6, labelTop: true, label: { role: 'label', text: '모집기간', fs: 24, wt: 500, color: 'fg' }, sepWrap: '｜' }),
        T('role', 660, 75.5, 149, 24, 500, { al: 'center', lines: 5, ls: -0.04, lh: 1.96, labelTop: true, stack: true, label: { role: 'label', text: '모집직무', fs: 24, wt: 500, color: 'fg' }, sepWrap: '｜' }),
      ] },
    ],
  },
  {
    id: 'typo-1109-brandpill', source: 'TYPO', name: '회사명 머리 · 브랜드 알약', visual: 'right', typo: 'datebadge', align: 'left', font: 'GmarketSans', curated: true,
    frames: [
      { w: 580, h: 400, id: '250:25516', tone: 'light', bgDark: false, full: false, visual: 'right', slot: { x: 198, y: 0, w: 382, h: 400, r: 0 }, logo: { x: 402, y: 31, w: 145, h: 20 }, rows: [
        T('client', 86.9, 27.6, 179, 34, 700, { lh: 1.38, ls: -0.02 }),
        T('main', 168.9, 26.1, 314.5, 48.9, 700, { lines: 2, lh: 1.19, ls: -0.02, span: 117 }),
        T('slogan', 250, 28, 220, 19.2, 500, { ls: -0.02, op: 0.55 }),
        T('date', 329.5, 26.1, 190, 17.5, 500, { ls: -0.02, badge: pill(26.1, 307.5, 190.1, 43.9, { fill: 'accent', ink: 'bg', px: 1.2, py: 0.68 }) }),
      ] },
      { w: 970, h: 250, id: '250:25498', tone: 'light', bgDark: false, full: false, visual: 'right', slot: { x: 462, y: 0, w: 508, h: 250, r: 0 }, logo: { x: 835, y: 15, w: 120, h: 16 }, rows: [
        T('client', 48.5, 31.5, 169, 32.2, 700, { lh: 1.38, ls: -0.02 }),
        T('main', 125, 30.1, 450, 46.3, 700, { lines: 2, lh: 1.24, ls: -0.02, span: 115 }),
        T('slogan', 206.5, 32.3, 254, 22.2, 500, { ls: -0.02, op: 0.55 }),
        T('date', 210, 32.3, 206, 19, 500, { ls: -0.02, badge: pill(320.3, 179.8, 205.8, 47.5, { fill: 'accent', ink: 'bg', px: 1.2, py: 0.7 }) }),
      ] },
      { w: 300, h: 600, id: '250:25507', tone: 'light', bgDark: false, full: false, visual: 'bottom', slot: { x: 0, y: 373, w: 300, h: 227, r: 0 }, logo: { x: 86, y: 36, w: 129, h: 18 }, rows: [
        T('client', 97.4, 118, 69, 34.7, 700, { al: 'center', lh: 1.38, ls: -0.02 }),
        T('main', 194.5, 15, 275, 44.7, 700, { al: 'center', lines: 2, lh: 1.19, ls: -0.02, span: 107 }),
        T('slogan', 277.6, 40, 226, 19.7, 500, { al: 'center', ls: -0.02, op: 0.55 }),
        T('date', 351, 52.7, 194, 17.9, 500, { al: 'center', ls: -0.02, badge: pill(52.7, 328.6, 194.1, 44.8, { fill: 'accent', ink: 'bg', px: 1.2, py: 0.69 }) }),
      ] },
      { w: 300, h: 1050, id: '250:25525', tone: 'light', bgDark: false, full: false, visual: 'bottom', slot: { x: 0, y: 554, w: 300, h: 496, r: 0 }, logo: { x: 71, y: 61, w: 158, h: 22 }, rows: [
        T('client', 174.6, 31.7, 93, 46.9, 700, { lh: 1.38, ls: -0.02 }),
        T('main', 305, 30.1, 265, 57.6, 700, { lines: 3, lh: 1.19, ls: -0.02, span: 206 }),
        T('slogan', 444.9, 30.4, 239, 20.9, 500, { ls: -0.02, op: 0.55 }),
        T('date', 550.9, 37.2, 225, 20.7, 500, { ls: -0.02, badge: pill(37.2, 525, 224.6, 51.8, { fill: 'accent', ink: 'bg', px: 1.2, py: 0.7 }) }),
      ] },
    ],
  },
  {
    id: 'typo-1109-darkpill', source: 'TYPO', name: '시즌 머리 · 반전 알약', visual: 'right', typo: 'datebadge', align: 'left', font: 'Pretendard', curated: true,
    frames: [
      { w: 580, h: 400, id: '250:25560', tone: 'light', bgDark: false, full: false, visual: 'right', slot: { x: 327, y: 0, w: 253, h: 400, r: 0 }, logo: { x: 394, y: 30, w: 158, h: 15 }, rows: [
        T('season', 116, 31, 150, 25, 500, { ls: -0.02 }),
        T('main', 192, 28, 304, 42, 800, { lines: 2, lh: 1.31, ls: -0.02, span: 110 }),
        T('date', 277.5, 28, 207, 23, 700, { ls: -0.02, badge: pill(28, 258, 207, 39, { ink: 'bg', px: 0.7, py: 0.35 }) }),
      ] },
      { w: 970, h: 250, id: '250:25535', tone: 'light', bgDark: false, full: false, visual: 'right', slot: { x: 469, y: 0, w: 501, h: 250, r: 0 }, logo: { x: 791, y: 30, w: 147, h: 14 }, rows: [
        T('season', 48, 41, 150, 25, 500, { ls: -0.02 }),
        T('main', 114, 41, 273, 39, 800, { lines: 2, lh: 1.28, ls: -0.02, span: 100 }),
        T('date', 192.5, 41, 194, 21, 700, { ls: -0.02, badge: pill(41, 174, 194, 37, { ink: 'bg', px: 0.86, py: 0.38 }) }),
      ] },
      { w: 300, h: 600, id: '250:25548', tone: 'light', bgDark: false, full: false, visual: 'bottom', slot: { x: 0, y: 336, w: 300, h: 264, r: 0 }, logo: { x: 81, y: 556, w: 137, h: 13 }, rows: [
        T('season', 82, 77, 144, 24, 500, { al: 'center', ls: -0.02 }),
        T('main', 181, 24, 251, 40, 800, { al: 'center', lines: 3, lh: 1.2, ls: -0.02, span: 144 }),
        T('date', 290, 52, 194, 21, 700, { al: 'center', ls: -0.02, badge: pill(52, 272, 194.1, 36, { ink: 'bg', px: 0.75, py: 0.36 }) }),
      ] },
      { w: 300, h: 1050, id: '250:25573', tone: 'light', bgDark: false, full: false, visual: 'bottom', slot: { x: 0, y: 542, w: 300, h: 508, r: 0 }, logo: { x: 55, y: 987, w: 190, h: 18 }, rows: [
        T('season', 119, 60, 180, 30, 500, { al: 'center', ls: -0.02 }),
        T('main', 288, 24, 251, 51, 800, { al: 'center', lines: 4, lh: 1.24, ls: -0.02, span: 252 }),
        T('date', 468.5, 37, 227, 26, 700, { al: 'center', ls: -0.02, badge: pill(37, 445, 227, 47, { ink: 'bg', px: 0.6, py: 0.4 }) }),
      ] },
    ],
  },
  {
    id: 'typo-1109-hashpill', source: 'TYPO', name: '큰 제목 · 해시태그 알약', visual: 'right', typo: 'big', align: 'left', font: 'Pretendard', curated: true,
    frames: [
      { w: 970, h: 250, id: '250:25103', tone: 'dark', bgDark: true, full: false, visual: 'right', slot: { x: 531, y: 20, w: 363, h: 219, r: 0 }, logo: { x: 885, y: 19, w: 67, h: 13 }, rows: [
        T('main', 79.8, 36.1, 444, 46.1, 700, { lines: 2, lh: 1.19, withSeason: true, join: ' ', span: 110 }),
        T('date', 156.8, 38.9, 269, 22.2, 500),
        T('role', 210.3, 36.1, 183, 17.7, 600, { hash: true, hashSpace: true, badge: pill(36.1, 196.8, 87.2, 27.1, { ink: 'bg', px: 0.69, py: 0.17, gap: 0.52 }) }),
      ] },
      { w: 580, h: 400, id: '250:25134', tone: 'dark', bgDark: true, full: false, visual: 'right', slot: { x: 198, y: 167, w: 363, h: 219, r: 0 }, logo: { x: 494, y: 21, w: 67, h: 13 }, rows: [
        T('main', 101.1, 34.6, 258, 41.4, 700, { lines: 3, lh: 1.19, withSeason: true, span: 147 }),
        T('date', 196.6, 34.6, 241, 19.9, 500),
        T('role', 242, 34.6, 165, 15.9, 600, { hash: true, hashSpace: true, badge: pill(34.6, 229.9, 78.3, 24.3, { ink: 'bg', px: 0.7, py: 0.17, gap: 0.52 }) }),
      ] },
      { w: 250, h: 250, id: '250:25088', tone: 'dark', bgDark: true, full: false, visual: 'right', slot: { x: 55, y: 121, w: 185, h: 111, r: 0 }, logo: { x: 201, y: 13, w: 36, h: 7 }, rows: [
        T('main', 61.1, 15.3, 140, 22.5, 700, { lines: 3, lh: 1.2, withSeason: true, span: 81 }),
        T('date', 112.5, 15.3, 129, 10.6, 500),
        T('role', 137, 15.3, 88, 8.5, 600, { hash: true, hashSpace: true, badge: pill(15.3, 130.6, 41.6, 12.9, { ink: 'bg', px: 0.68, py: 0.15, gap: 0.52 }) }),
      ] },
      { w: 300, h: 600, id: '250:25118', tone: 'dark', bgDark: true, full: false, visual: 'bottom', slot: { x: 9, y: 350, w: 291, h: 184, r: 0 }, logo: { x: 113, y: 567, w: 75, h: 15 }, rows: [
        T('main', 137.5, 30.2, 240, 41.4, 700, { al: 'center', lines: 4, lh: 1.19, withSeason: true, span: 196 }),
        T('date', 259.9, 29.5, 241, 19.9, 500, { al: 'center' }),
        T('role', 300, 62.8, 165, 15.9, 600, { al: 'center', hash: true, hashSpace: true, badge: pill(62.8, 287.8, 78.3, 24.3, { ink: 'bg', px: 0.7, py: 0.17, gap: 0.52 }) }),
      ] },
    ],
  },
];
for (const f of TYPO_FAMILIES) for (const fr of f.frames) { fr.font = f.font; fr.name = f.name; }
