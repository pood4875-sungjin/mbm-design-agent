import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECS, SIZE_PRESETS, renderArtifact, registerRenderer, _clearRenderers, defaultSpecIds, optionalSpecIds, specIdsOf } from '../core/contract.js';

test('SPECS defines pilot banner sizes', () => {
  assert.equal(SPECS['banner-300x250'].w, 300);
  assert.equal(SPECS['banner-300x250'].h, 250);
  assert.equal(SPECS['banner-300x250'].channel, 'banner');
  assert.equal(SPECS['banner-728x90'].channel, 'banner');
});

test('SPECS covers all pilot channels', () => {
  assert.equal(SPECS['edm-600'].channel, 'edm');
  assert.equal(SPECS['edm-600'].w, 600);
  assert.equal(SPECS['landing'].channel, 'landing');
  assert.equal(SPECS['poster-a2'].wmm, 420);
  assert.equal(SPECS['poster-a2'].hmm, 594);
  assert.equal(SPECS['poster-a2'].bleed, 3);
  assert.equal(SPECS['xbanner-600x1800'].hmm, 1800);
  assert.equal(SPECS['hyunsumak-4000x900'].channel, 'hyunsumak');
});

test('renderArtifact routes spec to its channel renderer', () => {
  _clearRenderers();
  registerRenderer('banner', (ctx, style, spec) => `<div>${ctx.core.name}/${spec.w}</div>`);
  const html = renderArtifact('banner-300x250',
    { core: { name: 'MBM' } },
    {},
  );
  assert.equal(html, '<div>MBM/300</div>');
});

test('renderArtifact throws on unknown spec or missing renderer', () => {
  _clearRenderers();
  assert.throws(() => renderArtifact('nope', {}, {}), /스펙/);
  assert.throws(() => renderArtifact('banner-300x250', {}, {}), /렌더러/);
});

/* ── Google Ads 표준 규격 세트 ──
   출처: https://support.google.com/google-ads/answer/1722096 (지원 규격)
        https://support.google.com/adsense/answer/6002621 (실적 상위) */

test('the default banner set is exactly the sizes Google calls top performing', () => {
  // Google이 실적 상위로 안내하는 넷 + 모바일 대표 규격 하나. 여기에 더 넣으면 기본 생성이 과해진다.
  assert.deepEqual(defaultSpecIds(['banner']), [
    'banner-300x250', 'banner-336x280', 'banner-728x90', 'banner-300x600', 'banner-320x100',
  ]);
  for (const id of defaultSpecIds(['banner'])) assert.equal(SPECS[id].recommended, true);
});

test('the rest of the standard inventory is available but off by default', () => {
  const optional = optionalSpecIds(['banner']);
  for (const id of ['banner-160x600', 'banner-970x250', 'banner-320x50', 'banner-300x1050']) {
    assert.ok(optional.includes(id), `${id}는 선택 규격으로 존재해야 한다`);
    assert.ok(!SPECS[id].recommended);
  }
  // 기본 + 선택 = 그 채널의 전부. 어느 한쪽에도 없는 규격이 생기면 UI에서 영영 못 고른다.
  assert.equal(defaultSpecIds(['banner']).length + optional.length, specIdsOf(['banner']).length);
});

test('every banner spec carries a px size and a Google size name', () => {
  for (const id of specIdsOf(['banner'])) {
    const s = SPECS[id];
    assert.equal(s.unit, 'px');
    assert.ok(s.w > 0 && s.h > 0, id);
    assert.ok(s.label, `${id}에 규격 통칭이 없다 — 14종이 되면 숫자만으로는 못 고른다`);
    assert.match(id, new RegExp(`banner-${s.w}x${s.h}$`), 'id와 치수가 어긋나면 라벨이 거짓말을 한다');
  }
});

test('mobile-only sizes are marked so the picker can say so', () => {
  const mobile = specIdsOf(['banner']).filter(id => SPECS[id].device === 'mobile');
  assert.deepEqual(mobile, ['banner-320x100', 'banner-320x50', 'banner-300x50']);
});

/* ── 포토월 ── */

test('photo wall is its own spec on the photobooth renderer', () => {
  const w = SPECS['photowall-3000x2500'];
  assert.equal(w.channel, 'photobooth', '렌더러는 포토부스 것을 재사용한다');
  assert.equal(w.title, '포토월', '같은 채널에 두 산출물이 있으므로 이름이 달라야 한다');
  assert.equal(w.output, 'pdf');
  assert.equal(w.unit, 'mm');
  // 렌탈사 표준 상품 실측(3000×2500) — 포토부스(2:1)와 달리 세로가 길다
  assert.equal(w.wmm, 3000);
  assert.equal(w.hmm, 2500);
  assert.ok(w.hmm / w.wmm > 0.6, '포토부스처럼 납작하면 포토월이 아니다');
  assert.ok(!w.recommended, '포토부스와 함께 기본 생성되면 안 된다 — 둘 다 찍는 행사는 드물다');
});

test('photo wall keeps its own size presets, apart from the 2:1 photobooth ones', () => {
  const presets = SIZE_PRESETS['photowall-3000x2500'];
  assert.ok(presets?.length, '채널 프리셋(2:1)을 물려받으면 포토월이 납작해진다');
  assert.deepEqual(presets.map(p => `${p.wmm}×${p.hmm}`), ['3000×2500', '3000×2000', '4000×2500']);
  for (const p of presets) assert.ok(p.hmm / p.wmm > 0.6);
});
