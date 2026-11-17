// 11-17 노션 확인요청 N1 「[공통] 기본 폰트 수정 — 카카오 큰글씨 → Pretendard」
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FONT, FONTS, fontGroup, effectiveFontId, fontRuleOf } from '../core/fonts.js';
import { normalizeStyle } from '../core/style.js';
import { renderAd } from '../core/renderers/ad.js';
import { createContext } from '../core/context.js';
import { adSpecEntries } from '../core/adspecs.js';

const specs = adSpecEntries();
const ctx = createContext({ client: '한진정보통신', role: '백엔드 개발자', employType: '정규직', deadline: '2026-10-31' }, 'recruit');

test('N1: 기본 폰트 = Pretendard, 「기본」 묶음에는 Pretendard 하나', () => {
  assert.equal(DEFAULT_FONT, 'Pretendard');
  assert.deepEqual(Object.keys(FONTS).filter(id => fontGroup(id) === 'default'), ['Pretendard']);
  const s = normalizeStyle({ colors: ['#0B3C8C'] });
  assert.equal(s.fonts.heading, 'Pretendard');
  assert.equal(s.fonts.body, 'Pretendard');
});

test('N1: 규정 없는 매체(구글 GDN)도 폰트를 안 고르면 Pretendard 로 그린다', () => {
  const gdn = specs['google-gdn-300x600'];
  assert.ok(gdn, 'google-gdn-300x600 규격');
  assert.equal(!!fontRuleOf(gdn.mediumRules).fixed, false, '구글은 폰트 규정 없음');
  const html = renderAd(ctx, normalizeStyle({ colors: ['#0B3C8C'] }), gdn);
  assert.match(html, /font-family:'Pretendard'/);
  assert.doesNotMatch(html, /Kakao Big Sans/);
});

test('N1: 고르면 여전히 고른 폰트(카카오 큰글씨도 선택지로 남음), 규정 매체는 Pretendard', () => {
  assert.ok(FONTS.KakaoBigSans, '카카오 큰글씨는 목록에 남는다');
  const html = renderAd(ctx, normalizeStyle({ colors: ['#0B3C8C'], fonts: { heading: 'KakaoBigSans', body: 'KakaoBigSans' } }), specs['google-gdn-300x600']);
  assert.match(html, /font-family:'Kakao Big Sans'/);
  const biz = specs['kakao-bizboard-mo'];
  assert.equal(effectiveFontId(biz.mediumRules, 'KakaoBigSans', biz.rules), 'Pretendard');
});
