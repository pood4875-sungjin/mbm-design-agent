// 채널 렌더러 계약 (PRD §8-2): 모든 렌더러는 (context, style, spec) → html 문자열.
// 채널 추가 = registerRenderer 1회. 규격 추가 = SPECS 1줄.
// ⚠ 규격 수치는 파일럿 가정값 — PRD §9 "확정 필요" 해소 시 갱신.

export const SPECS = {
  'banner-300x250': { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image' },
  'banner-728x90':  { channel: 'banner', w: 728, h: 90,  unit: 'px', output: 'image' },
  'banner-160x600': { channel: 'banner', w: 160, h: 600, unit: 'px', output: 'image' },
  'edm-600':        { channel: 'edm', w: 600, unit: 'px', output: 'email-html' },
  'landing':        { channel: 'landing', unit: 'px', output: 'html' },
  // 인쇄 수치는 파일럿 가정값 ⚠확정 필요 (PRD §9)
  'poster-a2':          { channel: 'poster', wmm: 420, hmm: 594, bleed: 3, unit: 'mm', output: 'pdf' },
  'xbanner-600x1800':   { channel: 'xbanner', wmm: 600, hmm: 1800, bleed: 3, unit: 'mm', output: 'pdf' },
  'hyunsumak-4000x900': { channel: 'hyunsumak', wmm: 4000, hmm: 900, bleed: 10, unit: 'mm', output: 'pdf' },
};

const renderers = new Map();

export function registerRenderer(channel, fn) {
  renderers.set(channel, fn);
}

export function renderArtifact(specId, context, style) {
  const spec = SPECS[specId];
  if (!spec) throw new Error(`알 수 없는 스펙: ${specId}`);
  const fn = renderers.get(spec.channel);
  if (!fn) throw new Error(`렌더러 없음: ${spec.channel}`);
  return fn(context, style, spec);
}

export function _clearRenderers() {
  renderers.clear();
}
