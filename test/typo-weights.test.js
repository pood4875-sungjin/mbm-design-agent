// 타이포 굵기 위계(10-09 「bold·semibold·medium 잘 활용해서 강약」) — core/canon.js weights · weightOf
// 메인 700 > 아이브로 600 > 슬로건·날짜 500 > 값 400, 라벨 700 · 칩·CTA 600. 매체 guide.weights(자소설 템플릿 실측)가 이긴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { CANON, weightOf } from '../core/canon.js';

const specs = adSpecEntries();
// 10-16: 카카오 PC디스플레이 1200×600 은 한국앤컴퍼니 샘플 틀(templateMold)이 생겼다 — 이 파일의 자유 배치 검증은 틀 뗀 사본으로(숫자·안전영역·글자 한도는 그대로)
specs['kakao-display-pc-promo'] = (e => { const c = structuredClone(e); delete c.rules.safeArea.measuredFromTemplate.mold; return c; })(specs['kakao-display-pc-promo']);
const fields = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', slogan: '자소서 없는 간편지원', role: '자유직무, 경영·제품·사업 분야', employType: '신입·경력', startDate: '2025-09-22', deadline: '2025-10-12' };
const ctx = createContext(fields, 'recruit');
const style = normalizeStyle({ colors: ['#00146E'] });
const fwIn = (html, role) => Number(html.match(new RegExp(`data-field="${role}" style="[^"]*?font-weight:(\\d+)`))?.[1]);
const W = CANON.weights;

test('스케일: 이웃 단계는 100 이상 차이 — 크고 중요한 것일수록 굵다', () => {
  const ladder = ['main', 'eyebrow', 'slogan', 'detailValue'];
  for (let i = 1; i < ladder.length; i++) assert.ok(W[ladder[i - 1]] - W[ladder[i]] >= 100, `${ladder[i - 1]} ${W[ladder[i - 1]]} vs ${ladder[i]} ${W[ladder[i]]}`);
  assert.ok(W.main - W.date >= 100, '날짜는 메인보다 한 단계 이상 가볍다');
  assert.ok(W.detailLabel - W.detailValue >= 100, '상세 라벨 굵게 : 값 가늘게');
  assert.ok(W.main - W.cta >= 100 && W.main - W.chip >= 100, 'CTA·칩은 메인보다 가볍다');
  assert.equal(W.accent, W.main, '두 톤 강조는 색만 — 굵기는 메인과 같다');
  for (const k of ['main', 'eyebrow', 'slogan', 'date', 'detailLabel', 'detailValue', 'chip', 'cta']) assert.ok([400, 500, 600, 700, 800].includes(W[k]), k);
});

test('weightOf: 어두운 지면 14px 미만은 500 하한, 매체 값엔 하한을 걸지 않는다', () => {
  assert.equal(weightOf('detailValue', { fs: 13, darkField: true }), 500);
  assert.equal(weightOf('detailValue', { fs: 13, darkField: false }), 400);
  assert.equal(weightOf('detailValue', { fs: 14, darkField: true }), 400);
  assert.equal(weightOf('main', { fs: 12, darkField: true }), 700, '하한은 올리기만 한다');
  const medium = { guide: { weights: { eyebrow: 700, detailValue: 400 } } };
  assert.equal(weightOf('eyebrow', { medium }), 700);
  assert.equal(weightOf('detailValue', { medium, fs: 13, darkField: true }), 400, '템플릿 실측 400이 하한을 이긴다');
  assert.equal(weightOf('slogan', { medium }), W.slogan, '매체가 안 정한 역할은 CANON');
  assert.equal(weightOf('없는역할'), 400);
});

test('렌더: 역할마다 스케일이 붙는다 (가이드 없는 정사각 1080 — 아이브로·메인·상세 라벨/값·칩)', () => {   // 10-15 저녁: 구글 580 은 ABL 틀 → 가이드 없는 정사각 자유 규격이 없어 인스타 1080 에서 guide 만 뺀 합성 규격
  const sq0 = specs['instagram-feed-1080'];
  const sq = { ...sq0, mediumRules: sq0.mediumRules ? { ...sq0.mediumRules, guide: undefined } : sq0.mediumRules, rules: sq0.rules ? { ...sq0.rules, guide: undefined } : sq0.rules };
  const html = renderAd(ctx, style, sq);
  assert.equal(fwIn(html, 'main'), W.main);
  assert.equal(fwIn(html, 'sub'), W.eyebrow, '메인 위 서브(아이브로) 600');
  assert.equal(fwIn(html, 'detail'), W.detailValue);
  const chip = html.match(/data-chip="1" style="[^"]*?font-weight:(\d+)/)?.[1];
  if (chip) assert.equal(Number(chip), W.chip);
});

test('렌더: 블라인드·카카오 — 메인 700 · 슬로건 500 · 날짜 500 (카카오 디자이너 Medium 2/2) · 블라인드 게시글은 틀(메인 800 · 날짜 500)', () => {
  { const html = renderAd(ctx, style, specs['blind-post-banner']); assert.equal(fwIn(html, 'main'), 800, '블라인드 게시글 틀: 템플릿 ExtraBold 56'); assert.equal(fwIn(html, 'date'), 500); }
  for (const sid of ['kakao-display-pc-promo']) {
    const html = renderAd(ctx, style, specs[sid]);
    assert.equal(fwIn(html, 'main'), W.main, sid);
    if (html.includes('data-field="sub"')) assert.equal(fwIn(html, 'sub'), W.slogan, sid + ' 슬로건');
    if (html.includes('data-field="date"')) assert.equal(fwIn(html, 'date'), W.date, sid + ' 날짜');
  }
});

test('렌더: 상세 라벨은 가로형에서도 굵다 — 라벨 700 · 값 400', () => {
  for (const [sid, s] of Object.entries(specs)) {
    const html = renderAd(ctx, style, s);
    const i = html.indexOf('data-field="detail"'); if (i < 0) continue;
    const block = html.slice(i, html.indexOf('</div></div>', i));
    const b = block.match(/<b style="font-weight:(\d+)/)?.[1];
    if (s.rules?.safeArea?.measuredFromTemplate?.mold) continue;   // 10-15 틀 규격은 샘플 실측 굵기 그대로(팝업·PC메인 상세는 라벨까지 Regular)
    if (b) assert.ok(Number(b) - fwIn(html, 'detail') >= 100, `${sid} 라벨 ${b} vs 값 ${fwIn(html, 'detail')}`);
  }
});

test('매체 실측이 이긴다: 자소설 메인 위 서브 700(템플릿 「굵게」) · 값 400', () => {
  const html = renderAd(ctx, style, specs['jasoseol-m-premium-popup-mo']);
  assert.equal(fwIn(html, 'main'), 700);
  assert.equal(fwIn(html, 'sub'), 700);
  if (html.includes('data-field="detail"')) assert.equal(fwIn(html, 'detail'), 400);
  // 같은 정사각·세로형이라도 자소설이 아니면 CANON 아이브로 600
  assert.equal(fwIn(renderAd(ctx, style, specs['instagram-feed-1080']), 'sub'), W.eyebrow);
});
