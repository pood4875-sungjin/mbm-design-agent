// 11-12 노션 「[자소설닷컴] PC채용공고배너 상세문구」: 상세가 최대 5줄까지만 생성됨 → 가이드 기준 최대 6줄
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('자소설 PC 채용공고: 날짜 한 줄 + 모집직무 3줄까지 6행을 다 쓴다 · 「R/D」는 한 항목', async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js'); const { extractRecruit } = await import('../core/brief.js');
  const ctx = createContext(extractRecruit('제너시스BBQ그룹 2026년 하반기 신입/경력직 공개채용. 접수 11월 9일 ~ 11월 22일. 모집부문: 슈퍼바이저, 가맹점점포개발, R/D, 전략기획', new Date(2026, 10, 1)), 'recruit');
  for (const sid of ['jasoseol-pc-standard-jobpost-pc', 'jasoseol-pc-premium-jobpost-pc']) {
    const h = renderArtifact(sid, ctx, normalizeStyle({ colors: ['#C8102E'] }));
    const det = h.slice(h.indexOf('data-field="detail"'));
    assert.match(det, /11\.9\(월\)/, sid + ' 날짜 그대로');
    assert.match(det, /R\/\u2060?D, 전략기획/, sid + ' 모집직무 전부(짧은 「~ 등」으로 줄이지 않음)');
    assert.doesNotMatch(det, /R, ?\u2060?D 등/, sid + ' R/D 를 쪼개지 않음');
  }
});
