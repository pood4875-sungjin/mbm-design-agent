// 그리고 → 재고 → 판정하고, 안 맞으면 규칙 안에서 다시 시도한다.
//
// 렌더러는 한 번에 최선을 그리지만 용량은 그려 봐야 안다. 상한을 넘으면
//   ① 디자인 그대로 JPG 품질 사다리 / PNG 재양자화(app/raster.js posterize)
//   ② 그라데이션 → 단색 배경(PNG가 가벼워진다) → 다시 JPG 사다리 / PNG 재양자화
// 순서로 다시 뽑는다(10-28 용량 다운그레이드). 문구·치수·색은 건드리지 않는다 — 그건 규칙이지 최적화 대상이 아니다.

import { renderAd } from '../core/renderers/ad.js';
import { lintArtifact } from '../core/lint.js';
import { measureArtifact } from './measure.js';

// post(html) — 렌더 결과에 내보내기용 @font-face 를 끼우는 자리(app.js, 묶은 무료 폰트 10-14). 재는 것·검사는 그 HTML 로 한다
export async function renderFit(ctx, style, spec, post = h => h) {
  const attempts = [];
  const run = async (s, opts = {}, label = '기본') => {
    const html = post(renderAd(ctx, style, s));
    const measure = await measureArtifact(html, s, opts);
    const lint = lintArtifact({ spec: s.rules, medium: s.mediumRules, measure, ctx });   // ctx: 고객사명(카카오 비즈보드 메인 광고주 노출 검사, 10-28 A 에이전트)
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

  // ── 용량 상한 초과(10-28 담당자 「용량 초과로 미통과 시 사이트에서 다운그레이드」) — 디자인을 덜 건드리는 순서로
  //   ① 디자인 그대로 JPG 품질 사다리 0.92→0.85→0.75→0.65 (매체가 JPG 허용 · 알파 없을 때)
  //   ② 디자인 그대로 PNG 재양자화 64→32→16단계 (PNG 만 허용하거나 알파가 있을 때)
  //   ③ 단색 배경(그라데이션 → 단색) → ④ 단색 + JPG 사다리 → ⑤ 단색 + PNG 재양자화
  //   맞춘 단계는 attempts 마지막 항목 · fitted 로 알린다(카드 「용량 맞춤」 배지 · 내보내기 로그)
  const fmts = spec.format ?? [];
  const jpgOk = fmts.some(f => /^jpe?g$/.test(f)), pngOk = fmts.includes('png');
  const alpha = r.measure.transparent === true;
  const done = x => ({ ...x, attempts, fitted: attempts[attempts.length - 1] });
  if (jpgOk && !alpha) for (const q of [0.92, 0.85, 0.75, 0.65]) { r = await run(spec, { format: 'jpg', quality: q }, `JPG 품질 ${q}`); if (!over(r)) return done(r); }
  if (pngOk && (!jpgOk || alpha)) for (const lv of [64, 32, 16]) { r = await run(spec, { format: 'png', quantize: lv }, `PNG 색 ${lv}단계`); if (!over(r)) return done(r); }

  const flat = { ...spec, flat: true };
  r = await run(flat, {}, '단색 배경');
  if (!over(r)) return done(r);
  if (jpgOk && !alpha) for (const q of [0.85, 0.72, 0.6, 0.5]) { r = await run(flat, { format: 'jpg', quality: q }, `단색 배경 + JPG 품질 ${q}`); if (!over(r)) return done(r); }
  if (pngOk && (!jpgOk || alpha)) for (const lv of [32, 16, 8]) { r = await run(flat, { format: 'png', quantize: lv }, `단색 배경 + PNG 색 ${lv}단계`); if (!over(r)) return done(r); }
  return { ...r, attempts, fitted: null };   // 끝까지 못 맞춤 — lint 'weight' 차단 그대로
}
