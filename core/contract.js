// 채널 렌더러 계약 (PRD §8-2): 모든 렌더러는 (context, style, spec) → html 문자열.
// 채널 추가 = registerRenderer 1회. 규격 추가 = SPECS 1줄.
// ⚠ 규격 수치는 파일럿 가정값 — PRD §9 "확정 필요" 해소 시 갱신.
//
// SPECS 엔트리의 표시·선택용 필드:
//   title        산출물 이름. 없으면 앱이 채널 이름을 쓴다 — 한 채널에 규격이 둘 이상이라
//                이름이 겹칠 때만 적는다(예: 포토부스 렌더러를 공유하는 "포토월").
//   label        규격 통칭(Google Ads 규격명 등). 고를 때 무엇인지 알아보게 하는 부제.
//   recommended  기본 생성 세트에 들어가는가. false면 아트보드의 "+ 산출물 추가"로만 켠다.
//                왜 나누나: 규격을 다 켜면 첫 화면에 20장이 깔리고 승인해야 할 장 수가 3배가 된다.
//   device       'mobile' — 모바일 지면 전용 규격(선택 UI에서 구분해 보여 준다).

export const SPECS = {
  /* ── 온라인 배너 — Google Ads 디스플레이 표준 규격 ──
     지원 규격 원본: https://support.google.com/google-ads/answer/1722096 (이미지 광고 규격)
     실적 상위 세트: https://support.google.com/adsense/answer/6002621
       Google이 "실적이 가장 좋다"고 명시한 넷 = 300×250 · 336×280 · 728×90 · 300×600.
       여기에 모바일 대표 규격 320×100(라지 모바일 배너, 320×50의 두 배 높이)을 더한 5종이 기본 세트다.
     나머지는 recommended:false — 매체사 요구가 있을 때만 켠다. */
  'banner-300x250': { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image', label: '인라인 렉탱글', recommended: true },
  'banner-336x280': { channel: 'banner', w: 336, h: 280, unit: 'px', output: 'image', label: '라지 렉탱글', recommended: true },
  'banner-728x90':  { channel: 'banner', w: 728, h: 90,  unit: 'px', output: 'image', label: '리더보드', recommended: true },
  'banner-300x600': { channel: 'banner', w: 300, h: 600, unit: 'px', output: 'image', label: '하프페이지', recommended: true },
  'banner-320x100': { channel: 'banner', w: 320, h: 100, unit: 'px', output: 'image', label: '라지 모바일 배너', recommended: true, device: 'mobile' },
  // ↓ 선택 규격 — 인벤토리는 있지만 기본으로 만들지는 않는다
  'banner-160x600':  { channel: 'banner', w: 160, h: 600,  unit: 'px', output: 'image', label: '와이드 스카이스크래퍼' },
  'banner-300x1050': { channel: 'banner', w: 300, h: 1050, unit: 'px', output: 'image', label: '포트레이트' },
  'banner-970x250':  { channel: 'banner', w: 970, h: 250,  unit: 'px', output: 'image', label: '빌보드' },
  'banner-970x90':   { channel: 'banner', w: 970, h: 90,   unit: 'px', output: 'image', label: '라지 리더보드' },
  'banner-468x60':   { channel: 'banner', w: 468, h: 60,   unit: 'px', output: 'image', label: '배너' },
  'banner-250x250':  { channel: 'banner', w: 250, h: 250,  unit: 'px', output: 'image', label: '스퀘어' },
  'banner-200x200':  { channel: 'banner', w: 200, h: 200,  unit: 'px', output: 'image', label: '스몰 스퀘어' },
  'banner-320x50':   { channel: 'banner', w: 320, h: 50,   unit: 'px', output: 'image', label: '모바일 리더보드', device: 'mobile' },
  'banner-300x50':   { channel: 'banner', w: 300, h: 50,   unit: 'px', output: 'image', label: '모바일 배너', device: 'mobile' },
  'gwthumb-374x271': { channel: 'gwthumb', w: 374, h: 271, unit: 'px', output: 'image', recommended: true }, // 그룹웨어 홍보 썸네일
  'edm-600':        { channel: 'edm', w: 600, unit: 'px', output: 'email-html', recommended: true },
  'landing':        { channel: 'landing', unit: 'px', output: 'html', recommended: true },
  // 인쇄 수치는 파일럿 가정값 ⚠확정 필요 (PRD §9)
  'poster-a2':          { channel: 'poster', wmm: 420, hmm: 594, bleed: 3, unit: 'mm', output: 'pdf', recommended: true },
  'xbanner-600x1800':   { channel: 'xbanner', wmm: 600, hmm: 1800, bleed: 3, unit: 'mm', output: 'pdf', recommended: true },
  'hyunsumak-4000x900': { channel: 'hyunsumak', wmm: 4000, hmm: 900, bleed: 10, unit: 'mm', output: 'pdf', recommended: true },
  'badge-110x140':      { channel: 'badge', wmm: 110, hmm: 140, bleed: 2, unit: 'mm', output: 'pdf', perPerson: true, recommended: true },  // 엔솔 MBM 템플릿 실측
  // 포토부스 백드롭 — 2024 MIDAS WEEK 포토존 시안은 정확히 2:1(1553.39×776.69pt)이었다.
  // 비율만 실측이고 실물 mm는 시안에 없다 ⚠확정 필요 — 아래는 2:1을 지키는 일반 백드롭 규격.
  'photobooth-4000x2000': { channel: 'photobooth', wmm: 4000, hmm: 2000, bleed: 10, unit: 'mm', output: 'pdf', title: '포토부스', recommended: true },
  // 포토월 — 포토부스(백드롭)와 쓰임이 다르다. 포토부스는 카메라 정면의 넓고 낮은 배경이고,
  // 포토월은 입구·무대 옆에 세워 사람이 그 앞에 서는 벽면이라 세로가 훨씬 길다.
  // 3000×2500mm은 국내 행사 렌탈사(라온부스)가 "포토존/포토월/백월" 표준 상품으로 파는 실측 규격이다.
  //   https://raonbooth.com/product/포토존-포토월-백월-전시부스-셀프설치-3000-x-2500-사이즈/14/
  //   같은 업체가 3000×2000도 함께 판다 — 아래 SIZE_PRESETS에 둘 다 넣었다.
  // 렌더러는 포토부스 것을 그대로 쓴다(채널 photobooth). 도형 레이어는 2:1 패널 좌표계라
  // 1.2:1 지면에서는 늘어나지 않고 좌우가 잘린다(preserveAspectRatio="slice") — 의도된 동작이다.
  // 기본 생성에는 넣지 않는다(recommended 없음) — 포토부스와 포토월을 둘 다 찍는 행사는 드물다.
  'photowall-3000x2500': { channel: 'photobooth', wmm: 3000, hmm: 2500, bleed: 10, unit: 'mm', output: 'pdf', title: '포토월' },
};

const renderers = new Map();

export function registerRenderer(channel, fn) {
  renderers.set(channel, fn);
}

// 사이니지 용도 — 같은 규격이라도 현장에서 쓰임이 다르다 (세트로 함께 나감)
export const PURPOSES = [
  { id: 'main',      label: '메인 홍보',        channels: ['xbanner', 'hyunsumak', 'poster'] },
  { id: 'way',       label: '방향 안내',        channels: ['xbanner'], needsArrow: true },
  { id: 'agenda',    label: '프로그램 안내',    channels: ['xbanner', 'poster'] },
  { id: 'reception', label: '사전등록 · 안내데스크', channels: ['xbanner', 'poster'] },
];
export const ARROWS = { up: '↑', down: '↓', left: '←', right: '→', none: '' };   // none = 화살표 없이 정보만

// 규격 프리셋 — 캠페인에서 골라 조정 (실측 발주 이력 확보 시 갱신)
// 키는 채널 이름이 기본이고, 한 채널에 성격이 다른 규격이 섞이면 스펙 id로도 둔다
// (포토부스 2:1 ↔ 포토월 1.2:1 — 같은 렌더러지만 고를 수 있는 치수가 아예 다르다).
export const SIZE_PRESETS = {
  poster:    [{ label: 'A2 420×594', wmm: 420, hmm: 594 }, { label: 'A1 594×841', wmm: 594, hmm: 841 }, { label: 'A3 297×420', wmm: 297, hmm: 420 }],
  xbanner:   [{ label: '600×1800', wmm: 600, hmm: 1800 }, { label: '600×1600', wmm: 600, hmm: 1600 }, { label: '800×1800', wmm: 800, hmm: 1800 }],
  // 앞의 셋은 파일럿 가정값, 뒤의 둘은 엔솔 오프라인 MBM 템플릿 실측이다 —
  //   2980×2300 = "Wall 현수막"(Figma 441:1605, 845×652pt ×3.528), 무대 뒤 벽면용이라 거의 정사각.
  //   1800×750  = "데스크 가림 현수막"(441:1804, 510×213pt), 안내데스크 앞면 가림막.
  hyunsumak: [{ label: '4000×900 (가로)', wmm: 4000, hmm: 900 }, { label: '3000×700 (가로)', wmm: 3000, hmm: 700 }, { label: '5000×1000 (가로)', wmm: 5000, hmm: 1000 },
              { label: '2980×2300 (벽면 · 템플릿)', wmm: 2980, hmm: 2300 }, { label: '1800×750 (데스크 가림 · 템플릿)', wmm: 1800, hmm: 750 }],
  // 가로 규격은 H.Solution Day 명찰 자체인쇄 실측(Figma 258:2023, 284×255pt ×0.3528 → 100.2×90.0mm).
  // 가로 규격을 고르면 renderBadge가 variant와 상관없이 가로형 레이아웃으로 넘어간다.
  badge:     [{ label: '110×140 (템플릿)', wmm: 110, hmm: 140 }, { label: '90×120 (세로)', wmm: 90, hmm: 120 }, { label: '100×90 (가로)', wmm: 100, hmm: 90 }],
  // 시안 비율 2:1을 유지하는 세 규격. 벗어난 비율을 넣으면 도형이 늘어나지 않고 잘린다.
  photobooth: [{ label: '4000×2000 (2:1)', wmm: 4000, hmm: 2000 }, { label: '3000×1500 (2:1)', wmm: 3000, hmm: 1500 }, { label: '2400×1200 (2:1)', wmm: 2400, hmm: 1200 }],
  // 포토월 — 앞의 둘은 렌탈사 표준 상품 실측(3000×2500 · 3000×2000, 위 SPECS 주석의 출처),
  // 4000×2500은 같은 높이로 폭만 넓힌 와이드안이다 ⚠확정 필요(발주 이력 확보 시 갱신).
  'photowall-3000x2500': [{ label: '3000×2500 (표준)', wmm: 3000, hmm: 2500 }, { label: '3000×2000', wmm: 3000, hmm: 2000 }, { label: '4000×2500 (와이드)', wmm: 4000, hmm: 2500 }],
};

export function purposesFor(channel) {
  return PURPOSES.filter(p => p.channels.includes(channel));
}

// 채널의 규격을 기본 세트와 선택 세트로 나눈다.
// generate.js는 "채널 → 그 채널의 모든 규격"으로 전개하므로, 어디까지를 기본으로 볼지는
// 여기(계약)에서 정하고 실제로 빼는 일은 앱이 한다.
export function specIdsOf(channels, pick = null) {
  return Object.entries(SPECS)
    .filter(([, s]) => channels.includes(s.channel) && (pick === null || !!s.recommended === pick))
    .map(([id]) => id);
}
export function defaultSpecIds(channels) { return specIdsOf(channels, true); }
export function optionalSpecIds(channels) { return specIdsOf(channels, false); }

// opts: { variant, purpose, arrow, size:{wmm,hmm}, program, topics, heading } — size는 캠페인별 규격 조정
//   program = [{time,title,presenter}] 프로그램 안내 표 (없으면 렌더러가 플레이스홀더를 낸다)
//   topics  = ['Solution','Geotechnical'] 메인 홍보의 헤어라인 토픽 칩 (없으면 칩 자체가 안 나온다)
export function renderArtifact(specId, context, style, opts = {}) {
  const base = SPECS[specId];
  if (!base) throw new Error(`알 수 없는 스펙: ${specId}`);
  const fn = renderers.get(base.channel);
  if (!fn) throw new Error(`렌더러 없음: ${base.channel}`);
  const spec = { ...base, variant: opts.variant ?? 0, purpose: opts.purpose ?? 'main', arrow: opts.arrow ?? null, roster: opts.roster ?? null, dest: opts.dest ?? null, program: opts.program ?? null, topics: opts.topics ?? null, heading: opts.heading ?? null };
  if (opts.size?.wmm) { spec.wmm = opts.size.wmm; spec.hmm = opts.size.hmm; }
  if (opts.size?.w) { spec.w = opts.size.w; spec.h = opts.size.h; }
  return fn(context, style, spec);
}

export function _clearRenderers() {
  renderers.clear();
}
