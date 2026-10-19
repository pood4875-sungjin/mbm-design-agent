// 키비주얼 유형 — 올라온 그림을 측정값(core/palette.js fieldFromImage)으로 유형 나누고, 유형마다 "어떻게 넣는가"를 한 곳에 적는다.
// 렌더러(ad.js·field.js)의 분기와 사람이 읽는 가이드(docs/kv-types.html), 앱의 진단 문장, 케이스 장부(scripts/cases.mjs)가 모두 여기를 본다.
// 10-06 사용자: "첨부한 키비주얼이 어떤 유형인지 유형화하고, 이 유형일 때는 어떻게 넣는 게 좋은지·비율은·글씨랑 겹치는지 검수까지 규칙으로. 요청할 때마다 축적."
//
// 숫자는 지금까지 본 케이스(보드 예시 136장 + 기하 3D·삼성 3D·그라데이션·여우 3D·코엑스 건물)에서 귀납한 값 — 케이스가 늘면 바뀐다. 바꿀 때는 scripts/cases.mjs run 으로 전 케이스 회귀.

import { CANON } from './canon.js';

export const KV_TYPES = [
  {
    id: 'cutout', name: '배경 없는 오브젝트(누끼)',
    detect: '투명 픽셀이 절반 넘음(opaque < 0.5)',
    place: [
      '자리에 맞춰 넣는다(contain) — 자르지도 녹이지도 않는다',
      '가로로 긴 누끼(건물·3D)는 열 높이에 맞추고 우하단에 붙여 폭 130%까지 지면 밖으로(코엑스 1-884 건물 문법), 그 이상이면 그냥 맞춰 넣기(캐릭터 떼 반 잘림 금지)',
      '정사각 규격(가이드 없음)은 우하단 모서리 상자 58%×55%에 두고 메인이 그 위를 쓴다',
      '오른쪽 열은 로고 띠 아래부터(로고를 가리지 않는다)',
      '투명 배경 규격엔 그대로 나간다(유일하게 허용되는 유형)',
    ],
    field: '지면은 누끼의 대표색을 화사하게(kv-vivid: 채도·명도 맞춘 뒤 흰 글자 4.5:1까지만 어둡힘, 10-16·채도 .7 10-19). 누끼 원본에 바탕 팔레트가 있으면 그 분위기(kv-mood). 브랜드색은 포인트에만. 흰색 로고만 있고 그림이 지면을 못 정하면 어두운 브랜드색',
    text: '글자는 누끼와 겹치지 않게 열을 나눈다(가로형 그림 겹침 상한 표 참고). 누끼 상자의 왼쪽 위는 비어 있어 값 줄이 28%까지 흘러도 된다',
    checks: ['글자-주인공 겹침', '로고 가림', '빈 여백'],
  },
  {
    id: 'texture', name: '그라데이션·질감(주인공 없음)',
    detect: '날카로운 경계 0.3% 미만 · 거칠기 0.5% 미만 · 색 퍼짐 6 이상(2px 이웃 차이)',
    place: [
      '지면 전체에 깐다(center/cover) — 잘라 붙일 주인공이 없다',
      '오브젝트 상자(카카오 썸네일)·누끼 슬롯(알바몬 스플래시·NAP) 매체엔 질감 조각이 무의미 — 글자만, 누끼가 필요하면 오브젝트 누끼 슬롯',
    ],
    field: '그림 자체가 지면. 글자색은 왼쪽 위 사분면 밝기로(밝으면 검정·어두우면 흰색), 대비 3:1 못 넘으면 글자 뒤 스크림',
    text: '글자 덩어리를 세로 가운데에(아래가 비어 보이지 않게)',
    checks: ['대비', '빈 여백'],
  },
  {
    id: 'photo', name: '실사 사진',
    detect: '불투명이고 평평한 변이 하나도 없음(네 변 색 편차 ≥ 15)',
    place: [
      '한쪽(오른쪽 열·아래 띠)에 덮고(cover) 글자 쪽 변을 30~38% 길게 녹인다(리멤버 사진 예시) — 짧게 자르면 "급하게 끊긴" 느낌',
      '주인공(사람·건물)이 그림의 일부면 주인공으로 당겨 채운다, 머리를 자르면 머리 기준',
      '사진 전체형(kvUse full): 지면 전체 + 글자 뒤 스크림 — 사람이 고를 때만',
      '사진이 오른쪽 열인 가로형·오른쪽 열 규격은 로고를 글자 쪽 지면(좌상단)에 — 사진 위 로고는 지면 기준 색(흰 반전)이라 밝은 벽·하늘에서 사라진다(10-09 데스크탑 사진 10건). 세로형·정사각 아래 띠는 로고가 지면 위라 그대로',
    ],
    field: '지면은 사진의 글자 쪽 변 색을 화사하게(kv-vivid-photo) — 사진 변 색 그대로가 아니라 채도·명도를 맞춘 색 + 흰 글자. 어두운 사진은 분위기 그대로(kv-mood-dark). 브랜드색은 포인트에만(10-16)',
    text: '글자는 녹인 쪽에. 사진 위 글자는 스크림 없이는 금지',
    checks: ['글자-주인공 겹침', '이음매 길이', '대비'],
  },
  {
    id: 'illust', name: '배경 있는 일러스트·3D',
    detect: '불투명이고 평평한 변이 하나 이상(보드 예시의 53%)',
    place: [
      '그림이 지면과 맞닿는 변의 색이 곧 지면색(kv-edge) — 그 변이 그라데이션이면 지면도 같은 그라데이션으로 잇는다(join)',
      '오브젝트 자리는 그림 전체가 아니라 주인공으로 채운다 — 통째보다 1.25배 이상 당겨질 때만, 원본 125%까지(흐려짐 방지)',
      '창의 글자 쪽 변은 다른 덩어리를 가르지 않는 바탕 줄에서 끊는다(창 밀기·띠 배율 완화) — 바탕 95% 이상이면 10%, 85~95%면 20%, 그 밖엔 30% 녹임',
      '배경형(flags.room): 주인공이 한쪽을 감싸고 다른 쪽이 비어 있고(빈 자리 ≥ 42%w·38%h) 캔버스 비율이 그림의 0.6~1.7배면 통째로 깔고 빈 자리에 글자, 자리가 모자라면 그림을 아래로 민다',
      '캐릭터(flags.character): 가운데 맞춤이 머리를 2% 넘게 자르면 머리 기준 + 숨 4%, 발을 자른다. 로고 띠 아래서 시작하는 열의 윗줄이 바탕이 아니면 윗변도 22% 녹임',
      '투명 배경 규격엔 넣지 않는다(바탕이 네모로 뜬다) — 글자만',
    ],
    field: '가장자리 색(kv-edge). 밝은 크림·흰 바탕이 흔하다 → 글자는 브랜드색(4.5:1 넘을 때) 아니면 검정',
    text: '글자는 주인공 위로 올라가지 않는다(귀 위 글자 금지). 상세 라벨 알약은 비치는 틴트',
    checks: ['글자-주인공 겹침', '뚝 끊긴 변', '로고 가림', '빈 여백'],
  },
];

// 세분 유형 — 측정값으로 가르고, 서브타입마다 "이 그림이면 이렇게 넣어야 더 좋다"를 적는다(10-06 사용자: "PNG면 아이소메트릭인지 캐릭터인지, 3D면 오브젝트 느낌인지 배경과 엮이는지, 사진이면 밝은지 어두운지 여백이 있어 녹는지").
// 숫자는 케이스 장부(scripts/cases.mjs) 16건에서 귀납. 깃발만으로 못 가르는 것(아이소메트릭 vs 일반 일러스트)은 주인공 상자 비율·밀도로 근사한다.
export const KV_SUBTYPES = {
  cutout: [
    { id: 'cutout-frame', name: '장식 프레임 누끼(가운데가 빈 유리 슬랩)', when: f => f.frame, why: '가로로 길고(≥ 1.6) 좌우 변에 불투명이 붙고 가운데 열이 비어 있다',
      guide: ['주인공이 아니라 바탕 장식 — 지면 전체에 깔고(사진 전체형처럼) 글자는 그 위에', '오른쪽 끝을 기준으로 크게(지면 폭의 1.7배) 잘라 바깥 슬랩이 지면 오른쪽을 채우게 한다 — 세로형은 아래에', '지면은 어두운 브랜드색(디자이너 9/9), 글자 쪽에서 시작하는 브랜드색 스크림', '맞춰 넣기 금지 — 작게 들어가면 장난감처럼 보인다'] },
    // 10-08 Figma 9월 공채(유리 행성) 한 건에서 — 사용자 결정: 케이스 하나여도 채택, 예외가 나오면 조정
    { id: 'cutout-glass', name: '반사·유리·크롬 누끼', when: f => f.glass, why: '무채(채도 < 0.35)·중간 밝기(lum 0.35~0.6) + 반투명 가장자리(보이는 픽셀의 10% 이상이 10<α<230)',
      guide: ['지면은 어두운 브랜드색 — 매체의 밝은 지면(구글 lightField·자소설 bgLight)보다 먼저(디자이너 13/13 다크). 밝은 틴트 위에선 회색으로 탁해진다', '매체가 금지한 색·규정(자소설 형광·분할 배경 불가, 리멤버 #000000)은 그대로 지킨다', '반사광이 브랜드색이 아니다 — KV 대표색을 지면색으로 쓰지 않는다'] },
    { id: 'cutout-character', name: '캐릭터·인물 누끼', when: f => f.character, why: '주인공이 세로로 서 있다(상자 높이 ≥ 55%, 그림 비율 ≤ 1.05)',
      guide: ['열에 세운다 — 발은 지면 바닥에, 머리는 자르지 않는다(머리 위 숨 4%)', '가로형에선 오른쪽 열 폭의 60~70%를 캐릭터에, 세로형에선 아래 띠 높이의 45~55%', '글자는 캐릭터 몸 위로 올리지 않는다 — 어깨선 위 여백만 허용', '지면은 브랜드색(어두운 매체)·브랜드 틴트(밝은 매체), 발밑에 옅은 그림자 없음(누끼 그대로)'] },
    { id: 'cutout-group', name: '여러 오브젝트·캐릭터 떼', when: f => f.group, why: '덩어리가 둘 이상(parts > 1) — 맞닿은 떼는 열 투명 프로필의 봉우리 둘 이상(틈 열 ≥ 75%)',
      guide: ['얼굴·몸통을 가르지 않는다 — 자르기 선은 캐릭터 사이 틈(열 투명 ≥75%)에서만("틈 창"), 틈이 없으면 통째로 맞춰 넣기', '오른쪽 열은 넓혀 키 70%까지, 세로 띠·정사각은 틈 창으로 두세 명을 크게', '정사각 규격은 모서리 상자 대신 폭 전체 아래 띠(30~55%)'] },
    // 덩어리가 여럿일 때만 장면 — 덩어리 하나에 속이 빈 것(고리·링·프레임: 유리 행성 density 0.57)은 성글어도 단일 사물(10-08 Figma 9월 공채)
    { id: 'cutout-scene', name: '장면·건물 누끼(아이소메트릭)', when: f => f.wide && (f.density ?? 1) < 0.6 && f.multi, why: '가로로 넓고(비율 > 1.3) 상자 안이 성글고(밀도 < 0.6) 덩어리가 여럿(parts > 1 또는 열 봉우리 ≥ 2)',
      guide: ['오른쪽 아래에 크게 두고 지면 밖으로 잘라도 된다 — 폭 130%까지(코엑스 카드 건물 문법)', '오른쪽 열에선 열을 넓혀 키를 열 높이의 70%까지(글자 칸 42%는 남긴다) — 맞춰 넣으면 위아래가 빈다', '세로 띠·정사각 띠에선 자르기 선이 캐릭터 사이 틈(열 투명 ≥75%)에 떨어지는 "틈 창"만 보여 준다(배율 1.15~2.4) — 틈이 없으면 가운데 맞춤 1.3~1.8배. 상세는 그림 바로 위에', '글자는 띠 안에서 누끼 위로 비는 부분까지만 겹친다(떼는 낮게 서니 허용, 캐릭터 하나면 0)', '밝은 사물이 많으면 지면은 어두운 브랜드색이 낫다(대비)'] },
    { id: 'cutout-object', name: '단일 사물 누끼', when: () => true, also: f => f.single, why: '덩어리 하나(parts 1·열 봉우리 < 2)이고 캐릭터가 아닌 누끼 — 속이 빈 고리·링 포함',
      guide: ['크게, 우하단으로 블리드(CANON objectBleed): 오브젝트의 70% 이상은 보이고 오른쪽·아래 변으로만 30%까지 잘린다. 핵심부(주인공 상자 가운데 60%)는 캔버스 안', '목표 면적: 가로형 캔버스의 20~30%, 정사각·세로형 22~27% — 글자 칸은 안쪽 폭 42% 이상', '상자 왼쪽 위는 비어 있어 값 줄이 28%까지 흘러도 된다', '사물이 작아 보이면 지면색 블록 없이 그대로 — 그림자·받침 추가 금지(AI 티)'] },
  ],
  illust: [
    { id: 'illust-character', name: '바탕 있는 캐릭터', when: f => f.character, why: '세로로 선 주인공(캐릭터·인물)이 바탕 위에 있다',
      guide: ['바탕 색(가장자리)이 지면 — 이음매 없이 잇는다', '가운데 맞춤이 머리를 2% 넘게 자르면 머리 기준 + 숨 4%(발을 자른다)', '로고 띠 아래에서 시작하는 열의 윗줄이 바탕이 아니면 윗변 22% 녹임', '글자는 귀·머리 위로 올리지 않는다'] },
    { id: 'illust-grad-bg', name: '그라데이션 바탕 일러스트·3D', when: f => f.gradEdge, why: '평평한 변인데 양 끝 색이 다르다(바탕이 그라데이션)',
      guide: ['지면을 같은 그라데이션으로 잇는다(이음매 줄의 색 → 지면 끝 색)', '녹임은 20~30% — 그라데이션 위 직선 이음매는 바로 보인다', '글자색은 지면의 가장 불리한 곳에서 4.5:1'] },
    { id: 'illust-room', name: '배경형(빈 자리 있는 바탕 그림)', when: f => f.room, why: '주인공이 한쪽을 감싸고 다른 쪽 모서리가 비어 있다(빈 자리 ≥ 42%w·38%h)',
      guide: ['캔버스 비율이 그림의 0.6~1.7배면 통째로 깔고 빈 자리에 글자(잘라 붙인 번짐이 없어 가장 자연스럽다)', '자리가 모자라면 윗변이 바탕일 때 그림을 아래로 밀어 글자 자리를 62%(정사각)·58%(가로형)까지', '띠·열에서는 주인공만 당겨 넣는다'] },
    { id: 'illust-object', name: '오브젝트 느낌 3D·일러스트', when: f => f.subject, why: '주인공이 그림의 일부(상자 면적 < 60%) — 바탕이 넓다',
      guide: ['오브젝트 자리는 주인공으로 채운다(통째보다 1.25배 이상 당겨질 때, 원본 125%까지)', '창의 글자 쪽 변은 다른 덩어리를 가르지 않는 바탕 줄에서 끊고 10~30% 녹임', '바탕이 단톤이면 지면도 그 색 — 흰 패치가 뜨면 안 된다'] },
    { id: 'illust-scene', name: '배경과 엮인 장면 일러스트·3D', when: () => true, why: '주인공이 그림의 60% 이상 — 바탕과 분리되지 않는 장면',
      guide: ['통째로 한쪽에 덮고(cover) 글자 쪽 변만 30% 녹인다 — 주인공을 당기면 장면이 깨진다', '가로형은 오른쪽 열 45~55%, 세로형은 아래 띠 55~64%', '세로 띠에선 머리·윗부분을 지키는 위치(cover 위치)'] },
  ],
  photo: [
    { id: 'photo-crowd', name: '현장·군중 사진(주인공 없음)', when: f => f.crowd, why: '어둡고(lum < 0.4) 주인공 상자를 못 가른다(≥ 85%) — 세미나홀·청중·도시 빌딩숲',
      guide: ['지면 전체에 깔고(사진 전체형) 글자 쪽에서 시작하는 브랜드색 스크림 위에 흰 글자(디자이너 10/10)', '한쪽 열에 잘라 녹이지 않는다 — 머리·사람이 조각나 보인다', '로고는 스크림 쪽(글자 쪽)'] },
    { id: 'photo-portrait', name: '인물 사진', when: f => f.character, why: '세로로 선 주인공(인물)',
      guide: ['얼굴 쪽에 글자 금지, 머리를 자르지 않는다', '어깨 아래로 지면에 녹인다(아래 띠 30%)', '지면은 브랜드 딥 컬러 + 흰 글자'] },
    { id: 'photo-dark', name: '어두운 사진', when: f => (f.lum ?? 0.5) < 0.4, why: '평균 밝기 < 0.4',
      guide: ['지면은 어두운 브랜드색(같은 색상 명도 그라데이션), 글자·로고 흰색', '사진 위 글자는 스크림 없이도 되지만 4.5:1 확인', '녹임 38%(어두운 사진은 이음매가 더 잘 보인다)'] },
    { id: 'photo-bright', name: '밝은 사진', when: f => (f.lum ?? 0.5) >= 0.6, why: '평균 밝기 ≥ 0.6',
      guide: ['지면은 브랜드 틴트→흰색, 글자는 브랜드색/검정', '사진 위 글자는 스크림 필수', '녹임 30%'] },
    { id: 'photo-roomy', name: '여백 있는 사진(하늘·벽)', when: f => (f.subjectArea ?? 1) < 0.45 || f.roomAny, why: '주인공이 작고(상자 < 45%) 바탕이 넓다 — 하늘·벽이 있어 지면으로 잘 녹는다',
      guide: ['여백 쪽 변으로 지면에 녹인다(30%) — 여백이 지면색으로 이어져 그라데이션 티가 안 난다', '글자는 여백 쪽에, 주인공과 겹치지 않게', '밝은 사진이면 브랜드 틴트→흰 지면, 어두우면 브랜드 딥'] },
    { id: 'photo-busy', name: '꽉 찬 사진', when: () => true, why: '여백 없이 디테일이 가득(그 밖의 사진)',
      guide: ['글자 영역을 사진에서 분리한다 — 글자 쪽 변 38% 녹임 + 지면 블록, 글자가 사진 위로 겹치지 않는다(겹침 0)', '사진 전체형은 스크림 필수', '로고는 사진 위 밝은 구석에만'] },
  ],
  texture: [
    { id: 'texture-dark', name: '어두운 질감', when: f => (f.lum ?? 0.5) < 0.45, why: '평균 밝기 < 0.45',
      guide: ['지면 전체에 깔고 글자·로고 흰색', '스크림 없이 4.5:1이면 그대로'] },
    { id: 'texture-light', name: '밝은 질감', when: () => true, why: '밝은 그라데이션·블러',
      guide: ['지면 전체에 깔고 글자는 검정/브랜드색(왼쪽 위 사분면 밝기 기준)', '대비 3:1 못 넘으면 글자 뒤 스크림', '오브젝트 상자·누끼 슬롯 매체엔 글자만(질감 조각은 무의미)'] },
  ],
};

const dist = (a, b) => {
  const h = x => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
  if (!/^#[0-9A-Fa-f]{6}$/.test(a ?? '') || !/^#[0-9A-Fa-f]{6}$/.test(b ?? '')) return 0;
  const [r1, g1, b1] = h(a), [r2, g2, b2] = h(b);
  return Math.sqrt(((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) / 3) / 255;
};

// 열 투명 프로필(cols)의 봉우리 수 — 틈 열(투명 ≥ 75%)로 갈린 불투명 덩어리(최소 투명 < 60%)가 몇 개인가.
// 캐릭터끼리 맞닿아 연결 성분(parts)이 하나로 잡히는 떼(ABL)를 가른다. 가장자리 빈 열은 세지 않는다.
export function colHumps(cols) {
  if (!cols?.length) return 0;
  let humps = 0, inRun = false, solid = false;
  for (const c of cols) {
    const bg = c?.bg ?? 1;
    if (bg >= 0.75) { if (inRun && solid) humps++; inRun = false; solid = false; }
    else { inRun = true; if (bg < 0.6) solid = true; }
  }
  if (inRun && solid) humps++;
  return humps;
}

// 측정값 → 유형 + 깃발. kvMeta가 없으면 null(그림 없음).
export function kvTypeOf(kvMeta) {
  const f = kvMeta?.field; if (!f) return null;
  const kind = f.kind ?? ((f.opaque ?? 1) < 0.5 ? 'cutout' : f.flatEdges === 0 ? 'photo' : 'illust');
  const type = KV_TYPES.find(t => t.id === kind) ?? KV_TYPES[3];
  const focus = f.focus, ar = kvMeta.ar ?? 1;
  const subjectArea = focus ? Math.round(focus.w * focus.h * 100) / 100 : null;
  const room = f.room;
  const edges = f.edges ?? {};
  // 맞닿은 사람 떼(어깨동무 ABL — 연결 성분 하나·틈 열 없음): 누끼 윗선 봉우리가 많고 가로로 넓다(CANON crowdPeaks, 10-14 t1014)
  const CP = CANON.crowdPeaks;
  const crowdTop = !!(kind === 'cutout' && CP && (f.topPeaks ?? 0) >= CP.peaks && ar >= CP.minAr);
  const flags = {
    room: !!(kind === 'illust' && room && (room.corner === 'tl' || room.corner === 'tr') && room.w >= 0.42 && room.h >= 0.38),   // 배경형 후보(캔버스 비율은 규격마다 따로 본다)
    subject: subjectArea != null && subjectArea < 0.6,                 // 주인공이 그림의 일부 → 당겨 채움 대상
    // 세로로 선 주인공(캐릭터·인물) → 머리 보존이 중요. 누끼는 그림 전체 비율이 아니라 주인공 상자 비율로 본다 — 여백을 트림하면 그림 비율이 바뀐다(여우 0.95 → 1.10)
    // 바탕 있는 그림은 주인공 상자가 바탕 일부를 품을 수 있어(삼성 3D 호) 예전대로 그림 비율로
    // 누끼는 상자 밀도도 본다(10-09 figma-dg): 사람·캐릭터 0.59~0.72(연사 둘·동서 모델·여우) — 별표 3D 0.48(팔이 뻗은 사물)·폴더·책 0.79~0.92(네모난 사물)는 캐릭터가 아니다
    // 사진은 인물 상자(Apple Vision 인물 분리, palette.js personFocus)로 잡은 주인공일 때만 인물 — 색 덩어리는 사람인지 모른다(10-12 hr-doctor·AI 간호사)
    character: !!(focus && focus.h >= 0.55 && (kind === 'photo' ? (focus.source === 'person' || focus.source === 'override') : true) && (kind === 'photo' ? true : kind === 'cutout' ? (focus.w * ar) / focus.h < 1.2 && (focus.density ?? 0.65) >= 0.55 && (focus.density ?? 0.65) < 0.75 : ar < 1.05)),
    group: !!(focus && ((focus.parts ?? 1) > 1 || (focus.others?.length ?? 0) > 0 || (kind === 'cutout' && colHumps(f.cols) >= 2) || crowdTop)),   // 덩어리 여럿(캐릭터 떼·호 + 글로우, 맞닿은 누끼 떼는 열 봉우리) → 창이 덩어리를 가르면 안 됨
    // 장면 판정용 「덩어리 여럿」 — 연결 성분이 둘 이상이거나 열 봉우리 둘 이상(덩어리 하나에 속이 빈 고리는 아니다)
    multi: !!(focus && ((focus.parts ?? 1) > 1 || (kind === 'cutout' && colHumps(f.cols) >= 2))),   // 맞닿은 사람 떼(crowdTop)는 장면이 아니라 떼 — 장면의 「누끼 위 빈 곳까지 글자 겹침 허용」을 받으면 머리 위로 상세가 올라갔다(10-14 ABL 580×400·300×250)
    // 반사·유리·크롬 누끼 — 무채·중간 밝기 + 반투명 가장자리 ≥ 10%. 어두운 브랜드 지면이 매체의 밝은 지면보다 먼저(ad.js lightProfile)
    glass: !!(kind === 'cutout' && f.lum != null && f.lum >= 0.35 && f.lum <= 0.6 && (f.sat ?? 1) < 0.35 && (f.semi ?? 0) >= 0.10),
    gradEdge: ['top', 'bottom', 'left', 'right'].some(k => edges[k]?.flat && dist(edges[k].from, edges[k].to) > 0.035),   // 평평하지만 그라데이션인 변 → 지면 잇기
    wide: ar > 1.3, tall: ar < 0.8,
    // 어두움: 바탕 있는 그림은 가장자리 색, 누끼·사진·질감은 그림 전체 밝기(lum)
    dark: kind === 'cutout' ? (f.lum != null && f.lum < 0.4) : (f.lum != null ? f.lum < 0.45 : !!(kvMeta.edge && (() => { const [r, g, b] = [1, 3, 5].map(i => parseInt(kvMeta.edge.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45; })())),
    roomAny: !!(room && room.w >= 0.3 && room.h >= 0.3),
    density: focus?.density ?? null,
    lum: f.lum ?? null,
  };
  // 장식 프레임 누끼(10-09 figma-dg 마이다스 유리 슬랩 2종): 가로로 길고(≥ 1.6) 왼쪽·오른쪽 변에 불투명이 붙어 있고(변 불투명 ≥ 0.3) 가운데 열이 비어 있다(가운데 1/8 투명 ≥ 0.6, 바깥 1/4은 ≤ 0.5).
  // 주인공이 아니라 바탕 위에 얹는 장식 — 디자이너 9/9가 어두운 브랜드 지면 위에 한쪽(오른쪽)을 크게 잘라 깔고 글자는 빈 쪽에. 캐릭터·떼로 보면 작게 맞춰 넣어 장식이 장난감처럼 된다
  flags.frame = (() => {
    if (kind !== 'cutout' || ar < 1.6) return false;
    const cols = f.cols, n = cols?.length ?? 0; if (n < 16) return false;
    const mean = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += cols[i]?.bg ?? 1; return s / Math.max(1, b - a); };
    const q = Math.floor(n / 4), m0 = Math.floor(n * 7 / 16), m1 = Math.ceil(n * 9 / 16);
    return (edges.left?.opaque ?? 0) >= 0.3 && (edges.right?.opaque ?? 0) >= 0.3 && mean(m0, m1) >= 0.6 && mean(1, q) <= 0.5 && mean(n - q, n - 1) <= 0.5;
  })();
  if (flags.frame) { flags.character = false; flags.group = false; flags.multi = false; }
  // 위아래로 쌓인 누끼 덩어리(focus.stacked — 공 위 반구 아이콘 desk-20-cut)는 떼가 아니라 한 사물 — 단일 사물 블리드로 크게(10-12 남은 문제). 바탕 있는 그림은 예전대로
  if (kind === 'cutout' && focus?.stacked && !(focus.others?.length) && colHumps(f.cols) < 2) { flags.group = false; flags.multi = false; flags.character = false; }   // 사람·캐릭터가 아니라 쌓인 사물 — 캐릭터 상자(64%×72%)가 아니라 단일 사물 블리드
  // 현장·군중 사진(10-09 figma-dg 에이치닷 세미나·청중): 어둡고(lum < 0.4) 주인공을 못 가른다(주인공 상자 ≥ 85% 또는 없음) — 디자이너 10/10이 지면 전체에 깔고 브랜드색을 덮었다(사진 전체형).
  // 한쪽 열에 잘라 녹이면 사람 머리가 조각나고, 로고가 사진 위에 얹힌다
  flags.crowd = kind === 'photo' && f.lum != null && f.lum < 0.4 && (!focus || subjectArea >= 0.85);
  // 단일 사물 누끼 — 캐릭터도 떼도 아닌 덩어리 하나. 크게·우하단 블리드(CANON objectBleed)의 대상
  flags.single = kind === 'cutout' && !!focus && !flags.character && !flags.group && !flags.frame;
  // 사람이 유형을 직접 지정했으면(applyKvTypeOverride) 그 세분 유형이 걸리는 깃발을 켠다 — 렌더러 분기는 모두 이 깃발을 본다
  const ov = kvMeta.typeOverride ? overrideOf(kvMeta.typeOverride) : null;
  if (ov?.sub) Object.assign(flags, OVERRIDE_FLAGS[ov.sub.id] ?? {});
  const ctx = { ...flags, subjectArea, ar };
  // 서브타입은 겹칠 수 있다(어두운 + 여백 있는 사진) — 맞는 것을 다 모으고 첫 번째가 대표. 마지막 항목(그 밖의)은 아무것도 안 맞을 때만
  const list = KV_SUBTYPES[type.id] ?? [];
  let subs = list.slice(0, -1).filter(st => { try { return st.when(ctx); } catch { return false; } });
  const last = list[list.length - 1];
  if (last && (!subs.length || (last.also && (() => { try { return last.also(ctx); } catch { return false; } })()))) subs = [...subs, last];   // also: 다른 서브타입과 함께여도 붙는다(유리 + 단일 사물)
  if (ov?.sub) subs = [ov.sub, ...subs.filter(st => st.id !== ov.sub.id && st !== last)];   // 지정한 세분 유형이 대표
  const pick = st => ({ id: st.id, name: st.name, why: st.why, guide: st.guide });
  return { id: type.id, name: type.name, type, flags, subjectArea, ar: Math.round(ar * 100) / 100, sub: subs.length ? pick(subs[0]) : null, subs: subs.map(pick), override: kvMeta.typeOverride ?? null };
}

// ── 유형 직접 지정(10-12 결정 5) ──────────────────────────────────────────────
// 측정으로 판정이 안 되는 그림(흰 가운 × 흰 배경 의사 사진 등)은 디자이너가 유형·세분 유형을 고른다. 기본은 「자동」.
//   style.kvTypeOverride(앱) · cases.json typeOverride(케이스 장부) → normalizeStyle 이 kvMeta 에 입혀(applyKvTypeOverride) 렌더러·검수가 모두 같은 답을 본다.
//   값: 유형 id(cutout·texture·photo·illust — 세분은 자동) 또는 세분 유형 id(photo-portrait …). null·'auto' = 자동
// 세분 유형을 고르면 그 세분이 걸리는 깃발을 켜고 맞서는 깃발은 끈다(렌더러 분기는 깃발을 본다). 누끼 문법(투명 픽셀 기준)은 그림에 투명이 있어야 다 걸린다
const OVERRIDE_FLAGS = {
  'cutout-frame': { frame: true, character: false, group: false, multi: false, single: false },
  'cutout-glass': { glass: true },
  'cutout-character': { character: true, group: false, multi: false, frame: false, single: false },
  'cutout-group': { group: true, multi: true, character: false, frame: false, single: false },
  'cutout-scene': { wide: true, multi: true, group: true, character: false, frame: false, single: false },
  'cutout-object': { single: true, character: false, group: false, multi: false, frame: false },
  'illust-character': { character: true, group: false },
  'illust-grad-bg': { gradEdge: true },
  'illust-room': { room: true },
  'illust-object': { subject: true },
  'illust-scene': { subject: false, room: false, character: false },
  'photo-crowd': { crowd: true, character: false },
  'photo-portrait': { character: true, crowd: false, group: false },
  'photo-dark': { dark: true },
  'photo-bright': { dark: false },
  'photo-roomy': { roomAny: true },
  'photo-busy': {},
  'texture-dark': { dark: true },
  'texture-light': { dark: false },
};
function overrideOf(id) {
  if (!id || id === 'auto') return null;
  const t = KV_TYPES.find(x => x.id === id);
  if (t) return { type: t, sub: null };
  for (const [tid, list] of Object.entries(KV_SUBTYPES)) { const st = list.find(x => x.id === id); if (st) return { type: KV_TYPES.find(x => x.id === tid), sub: st }; }
  return null;
}
// 고를 수 있는 값 — 앱 선택 상자·cases.mjs type 명령이 쓴다. [{ id, name, subs: [{ id, name }] }]
export function kvTypeChoices() {
  return KV_TYPES.map(t => ({ id: t.id, name: t.name, subs: (KV_SUBTYPES[t.id] ?? []).map(st => ({ id: st.id, name: st.name })) }));
}
export function isKvTypeOverride(id) { return !!overrideOf(id); }
// 지정을 벗긴 측정값(자동) — 입힌 적이 없으면 그대로
export function baseKvMeta(kvMeta) {
  if (!kvMeta?.typeOverride) return kvMeta ?? null;
  const { typeOverride, ...rest } = kvMeta;
  const f = rest.field?.auto ? (({ auto, ...g }) => ({ ...g, kind: auto.kind, focus: auto.focus }))(rest.field) : rest.field;
  return { ...rest, field: f };
}
// 측정값에 유형 지정을 입힌다 — 지정이 없거나 모르는 값이면 자동(측정값 그대로). 여러 번 입혀도 같은 답(먼저 벗긴다)
export function applyKvTypeOverride(kvMeta, id) {
  const base = baseKvMeta(kvMeta);
  const ov = overrideOf(id);
  if (!base?.field || !ov) return base;
  const f = base.field, kind = ov.type.id;
  let focus = f.focus ?? null;
  if (kind === 'texture') focus = null;   // 질감은 주인공이 없다
  // 인물·캐릭터를 골랐는데 주인공 상자를 모르면(앱 — 인물 분리 없음) 위쪽 90%를 사람으로 본다: 머리는 위, 자를 땐 아래(발·몸)부터
  if ((ov.sub?.id === 'photo-portrait' || ov.sub?.id === 'illust-character' || ov.sub?.id === 'cutout-character') && !focus) focus = { x: 0.5, y: 0.5, w: 0.7, h: 0.9, parts: 1, others: [], density: 0.65, source: 'override' };
  if (ov.sub?.id === 'photo-portrait' && focus && focus.source !== 'person' && focus.source !== 'override') focus = { ...focus, parts: 1, others: [], source: 'override' };
  return { ...base, typeOverride: id, field: { ...f, kind, focus, auto: { kind: f.kind, focus: f.focus ?? null } } };
}

// 사람이 읽는 한 줄 — 앱 진단·케이스 장부
export function kvTypeSummary(kvMeta) {
  const t = kvTypeOf(kvMeta); if (!t) return '그림 없음';
  const F = t.flags, tags = [];
  if (F.room) tags.push('배경형 가능');
  if (F.subject) tags.push(`주인공 ${Math.round((t.subjectArea ?? 0) * 100)}%`);
  if (F.character) tags.push('캐릭터(머리 보존)');
  if (F.group) tags.push('덩어리 여럿');
  if (F.gradEdge) tags.push('가장자리 그라데이션');
  if (F.dark) tags.push('어두운 바탕');
  if (F.glass || F.frame) tags.push('어두운 지면 우선');
  if (F.crowd || F.frame) tags.push('전면 배경');
  tags.push(F.wide ? '가로형' : F.tall ? '세로형' : '정사각형');
  if (t.override) tags.push('유형 직접 지정');
  return `${t.subs?.length ? t.subs.map(x => x.name).join('+') : t.name} · ${tags.join(' · ')}`;
}
