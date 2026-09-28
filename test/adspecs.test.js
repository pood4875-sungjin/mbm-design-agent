import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adSpecEntries, registerAdSpecs } from '../core/adspecs.js';
import { SPECS } from '../core/contract.js';
import { MEDIA, specOf } from '../core/media.js';

// 매체 규격은 데이터(core/media)에 산다. 렌더러 계약(SPECS)에는 "그릴 수 있는 것"만 올린다:
// 치수가 있고, 우리가 만드는 이미지이고, 전달 자료만 넘기는 상품이 아닌 것.

test('every renderable media spec becomes an ad SPEC entry, others stay out', () => {
  const entries = adSpecEntries();
  const ids = Object.keys(entries);
  assert.ok(ids.length >= 60, `너무 적다: ${ids.length}`);
  for (const [id, e] of Object.entries(entries)) {
    assert.equal(e.channel, 'ad');
    assert.equal(e.track, 'online');
    assert.equal(e.unit, 'px');
    assert.equal(e.output, 'image');
    assert.ok(Number.isInteger(e.w) && Number.isInteger(e.h), id);
    assert.ok(e.medium && MEDIA.some(m => m.id === e.medium), id);
    assert.equal(specOf(id)?.id, id, '규격 id는 매체 데이터의 id 그대로');
    assert.ok(!e.recommended, '매체 규격은 기본 생성 세트에 자동으로 들어가지 않는다 — 매체를 고를 때 켠다');
  }
  // 전달 자료만 넘기는 상품, 텍스트 상품, HTML 이메일은 이미지 렌더 대상이 아니다
  assert.ok(!ids.includes('jasoseol-m-start-package-mo'));
  assert.ok(!ids.includes('albamon-pc-sub-bottom-text'));
  assert.ok(!ids.includes('albamon-email-target'));
});

test('submit size follows the medium: jasoseol exports at 2x, kakao bizboard at 1x', () => {
  const e = adSpecEntries();
  const pop = e['jasoseol-pc-premium-popup-pc'];
  assert.equal(pop.w, 550); assert.equal(pop.h, 400);
  assert.equal(pop.submitW, 1100); assert.equal(pop.submitH, 800);
  const biz = e['kakao-bizboard-mo'];
  assert.equal(biz.w, 1029); assert.equal(biz.h, 258);
  assert.equal(biz.submitW, 1029); assert.equal(biz.submitH, 258);
});

test('registerAdSpecs merges into SPECS without touching the event specs', () => {
  const before = Object.keys(SPECS).length;
  registerAdSpecs();
  assert.ok(Object.keys(SPECS).length > before);
  assert.equal(SPECS['banner-300x250'].channel, 'banner');
  assert.equal(SPECS['kakao-bizboard-mo'].channel, 'ad');
  // 두 번 불러도 늘지 않는다
  const n = Object.keys(SPECS).length; registerAdSpecs(); assert.equal(Object.keys(SPECS).length, n);
});

test('each entry carries what the renderer and linter need from the medium', () => {
  const e = adSpecEntries()['kakao-bizboard-mo'];
  assert.equal(e.mediumName, '카카오톡');
  assert.ok(Array.isArray(e.format) && e.format.includes('png'));
  assert.ok(e.rules, '규칙 원본(spec)을 참조로 들고 있어야 검사기가 쓴다');
  assert.equal(e.rules.id, 'kakao-bizboard-mo');
});
