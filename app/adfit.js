// 그리고 → 재고 → 판정하고, 안 맞으면 규칙 안에서 다시 시도한다.
//
// 렌더러는 한 번에 최선을 그리지만 용량은 그려 봐야 안다. 상한을 넘으면
//   ① 그라데이션 → 단색 배경(PNG가 가벼워진다)
//   ② 매체가 JPG를 허용하면 JPG로, 품질을 단계적으로 낮춰
// 순서로 다시 뽑는다. 문구·치수·색은 건드리지 않는다 — 그건 규칙이지 최적화 대상이 아니다.

import { renderAd } from '../core/renderers/ad.js';
import { lintArtifact } from '../core/lint.js';
import { measureArtifact } from './measure.js';

export async function renderFit(ctx, style, spec) {
  const attempts = [];
  const run = async (s, opts = {}, label = '기본') => {
    const html = renderAd(ctx, style, s);
    const measure = await measureArtifact(html, s, opts);
    const lint = lintArtifact({ spec: s.rules, medium: s.mediumRules, measure });
    attempts.push({ label, level: lint.level, bytes: measure.bytes, format: measure.format });
    return { html, measure, lint };
  };
  const over = r => r.lint.issues.some(i => i.code === 'weight');
  const under = r => r.lint.issues.some(i => i.code === 'weight-min');

  let r = await run(spec);
  if (under(r)) {
    // 하한(네이버 50KB)에 못 미치면 더 무거운 쪽으로 — JPG 최고 품질, 그래도 안 되면 허용 시 PNG
    const fmts = spec.format ?? [];
    if (fmts.some(f => /^jpe?g$/.test(f))) { const t = await run(spec, { format: 'jpg', quality: 1 }, 'JPG 최고 품질'); if (!under(t)) return { ...t, attempts }; r = t; }
    if (fmts.includes('png')) { const t = await run(spec, { format: 'png' }, 'PNG'); if (!under(t)) return { ...t, attempts }; r = t; }
  }
  if (!over(r)) return { ...r, attempts };

  const flat = { ...spec, flat: true };
  r = await run(flat, {}, '단색 배경');
  if (!over(r)) return { ...r, attempts };

  if ((spec.format ?? []).some(f => /^jpe?g$/.test(f))) {
    for (const q of [0.85, 0.72, 0.6]) {
      r = await run(flat, { format: 'jpg', quality: q }, `JPG 품질 ${q}`);
      if (!over(r)) return { ...r, attempts };
    }
  }
  return { ...r, attempts };
}
