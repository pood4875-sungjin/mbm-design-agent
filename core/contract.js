// 채널 렌더러 계약 (PRD §8-2): 모든 렌더러는 (context, style, spec) → html 문자열.
// 채널 추가 = registerRenderer 1회. 규격 추가 = SPECS 1줄.
// ⚠ 규격 수치는 파일럿 가정값 — PRD §9 "확정 필요" 해소 시 갱신.

export const SPECS = {
  'banner-300x250': { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image' },
  'banner-728x90':  { channel: 'banner', w: 728, h: 90,  unit: 'px', output: 'image' },
  'banner-160x600': { channel: 'banner', w: 160, h: 600, unit: 'px', output: 'image' },
  'banner-320x100': { channel: 'banner', w: 320, h: 100, unit: 'px', output: 'image' },  // 모바일 리더보드
  'banner-336x280': { channel: 'banner', w: 336, h: 280, unit: 'px', output: 'image' },  // 라지 렉탱글
  'gwthumb-374x271': { channel: 'gwthumb', w: 374, h: 271, unit: 'px', output: 'image' }, // 그룹웨어 홍보 썸네일
  'edm-600':        { channel: 'edm', w: 600, unit: 'px', output: 'email-html' },
  'landing':        { channel: 'landing', unit: 'px', output: 'html' },
  // 인쇄 수치는 파일럿 가정값 ⚠확정 필요 (PRD §9)
  'poster-a2':          { channel: 'poster', wmm: 420, hmm: 594, bleed: 3, unit: 'mm', output: 'pdf' },
  'xbanner-600x1800':   { channel: 'xbanner', wmm: 600, hmm: 1800, bleed: 3, unit: 'mm', output: 'pdf' },
  'hyunsumak-4000x900': { channel: 'hyunsumak', wmm: 4000, hmm: 900, bleed: 10, unit: 'mm', output: 'pdf' },
  'badge-110x140':      { channel: 'badge', wmm: 110, hmm: 140, bleed: 2, unit: 'mm', output: 'pdf', perPerson: true },  // 엔솔 MBM 템플릿 실측
  // 포토부스 백드롭 — 2024 MIDAS WEEK 포토존 시안은 정확히 2:1(1553.39×776.69pt)이었다.
  // 비율만 실측이고 실물 mm는 시안에 없다 ⚠확정 필요 — 아래는 2:1을 지키는 일반 백드롭 규격.
  'photobooth-4000x2000': { channel: 'photobooth', wmm: 4000, hmm: 2000, bleed: 10, unit: 'mm', output: 'pdf' },
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
export const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

// 규격 프리셋 — 캠페인에서 골라 조정 (실측 발주 이력 확보 시 갱신)
export const SIZE_PRESETS = {
  poster:    [{ label: 'A2 420×594', wmm: 420, hmm: 594 }, { label: 'A1 594×841', wmm: 594, hmm: 841 }, { label: 'A3 297×420', wmm: 297, hmm: 420 }],
  xbanner:   [{ label: '600×1800', wmm: 600, hmm: 1800 }, { label: '600×1600', wmm: 600, hmm: 1600 }, { label: '800×1800', wmm: 800, hmm: 1800 }],
  hyunsumak: [{ label: '4000×900 (가로)', wmm: 4000, hmm: 900 }, { label: '3000×700 (가로)', wmm: 3000, hmm: 700 }, { label: '5000×1000 (가로)', wmm: 5000, hmm: 1000 }],
  // 가로 규격은 H.Solution Day 명찰 자체인쇄 실측(Figma 258:2023, 284×255pt ×0.3528 → 100.2×90.0mm).
  // 가로 규격을 고르면 renderBadge가 variant와 상관없이 가로형 레이아웃으로 넘어간다.
  badge:     [{ label: '110×140 (템플릿)', wmm: 110, hmm: 140 }, { label: '90×120 (세로)', wmm: 90, hmm: 120 }, { label: '100×90 (가로)', wmm: 100, hmm: 90 }],
  // 시안 비율 2:1을 유지하는 세 규격. 벗어난 비율을 넣으면 도형이 늘어나지 않고 잘린다.
  photobooth: [{ label: '4000×2000 (2:1)', wmm: 4000, hmm: 2000 }, { label: '3000×1500 (2:1)', wmm: 3000, hmm: 1500 }, { label: '2400×1200 (2:1)', wmm: 2400, hmm: 1200 }],
};

export function purposesFor(channel) {
  return PURPOSES.filter(p => p.channels.includes(channel));
}

// opts: { variant, purpose, arrow, size:{wmm,hmm} } — size는 캠페인별 규격 조정
export function renderArtifact(specId, context, style, opts = {}) {
  const base = SPECS[specId];
  if (!base) throw new Error(`알 수 없는 스펙: ${specId}`);
  const fn = renderers.get(base.channel);
  if (!fn) throw new Error(`렌더러 없음: ${base.channel}`);
  const spec = { ...base, variant: opts.variant ?? 0, purpose: opts.purpose ?? 'main', arrow: opts.arrow ?? null, roster: opts.roster ?? null, dest: opts.dest ?? null };
  if (opts.size?.wmm) { spec.wmm = opts.size.wmm; spec.hmm = opts.size.hmm; }
  if (opts.size?.w) { spec.w = opts.size.w; spec.h = opts.size.h; }
  return fn(context, style, spec);
}

export function _clearRenderers() {
  renderers.clear();
}
