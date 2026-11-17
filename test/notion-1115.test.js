// 11-15 노션 컨시어지 — 비즈보드 썸네일 칸 고정·여백 43/39·광고주체 표기 가이드 · 자소설 상세 기호 그대로 · SVG 그림 해상도
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { specOf } from '../core/media.js';
import { moldImageGuides } from '../core/guideboxes.js';
import { svgImgScale } from '../core/svgexport.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAAABJRU5ErkJggg==';
const photo = (extra = {}) => ({ ar: 1.5, px: [3000, 2000], field: { kind: 'photo', opaque: 1, edges: {} }, ...extra });
const cut = { ar: 1.1, px: [860, 783], field: { kind: 'cutout', opaque: 0.07, edges: {} } };
const ctx = createContext({ client: 'GS에너지', hiringType: '2025년 신입 공채', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const BIZ = ['kakao-bizboard-mo', 'nap-dsp-bizboard-960x300'];
const imgBox = h => { const m = h.match(/<div data-object="1"[^>]*style="[^"]*left:([\d.]+)px;top:([\d.]+)px;width:([\d.]+)px;height:([\d.]+)px/); return m ? m.slice(1, 5).map(Number) : null; };

test('비즈보드 여백: 썸네일형 글자 쪽 43 · 썸네일 쪽 39, 오브젝트형 좌우 43(좌측형은 좌우 대칭)', () => {
  for (const id of BIZ) {
    const m = specOf(id).safeArea.measuredFromTemplate.mold;
    assert.equal(m.x, 43, id); assert.equal(m.rows.main.x, 43); assert.equal(m.rows.sub.x, 43);
    assert.equal(960 - m.image.x - m.image.w, 39, id + ' 썸네일 오른쪽 39');
    assert.equal(960 - m.imageCutout.x - m.imageCutout.w, 43, id + ' 오브젝트 오른쪽 43');
    for (const [kv, place, want, textX] of [[photo(), null, [601, 39, 320, 222], 43], [photo(), 'left', [39, 39, 320, 222], 391], [cut, null, [603, 0, 314, 300], 43], [cut, 'left', [43, 0, 314, 300], 391]]) {
      const tr = traceOf(renderArtifact(id, ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: kv, ...(place ? { kvPlace: place } : {}) }), {}));
      const t = tr.place.tImage; assert.deepEqual([t.x, t.y, t.w, t.h], want, `${id} ${place ?? 'right'} ${kv.field.kind}`);
      assert.ok(tr.textBox.rows.every(r => r.x === textX), `${id} 글자 x ${textX}`);
      if (place === 'left') assert.ok(tr.textBox.rows.every(r => r.x + 526 <= 960 - 43), '좌측형 글자 칸 오른쪽 여백 43');
    }
  }
});

test('비즈보드 썸네일 칸 320×222 고정: 보여 줄 영역을 지정해도(가로형·세로형 키비주얼) 칸이 줄지 않는다', () => {
  for (const id of BIZ) for (const [px, region] of [[[3936, 2624], { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }], [[1200, 1500], { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }], [[891, 1260], { x: 0.2, y: 0.1, w: 0.6, h: 0.8 }]]) {
    const h = renderArtifact(id, ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: photo({ ar: px[0] / px[1], px, manual: { region } }) }), {});
    assert.match(h, /data-kv-region="1"/, id + ' 영역 반영');
    assert.deepEqual(imgBox(h), [601, 39, 320, 222], `${id} ${px.join('×')}`);
  }
});

test('레이아웃 가이드 그림 칸·광고주체 표기 칸은 실제 그린 칸을 따른다(썸네일 8·8 안쪽 120×46 · 오브젝트 칸 위 200×46)', () => {
  const sp = specOf('kakao-bizboard-mo');
  const g = (kv, place) => moldImageGuides(sp, traceOf(renderArtifact(sp.id, ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: kv, ...(place ? { kvPlace: place } : {}) }), {})));
  const pick = (a, k) => { const b = a.find(x => x.kind === k); return [b.x, b.y, b.w, b.h]; };
  assert.deepEqual(pick(g(photo()), 'logo'), [609, 47, 120, 46]);
  assert.deepEqual(pick(g(photo(), 'left'), 'image'), [39, 39, 320, 222]);
  assert.deepEqual(pick(g(photo(), 'left'), 'logo'), [47, 47, 120, 46]);
  assert.deepEqual(pick(g(cut), 'logo'), [603, 21, 200, 46]);
  assert.deepEqual(pick(g(cut, 'left'), 'logo'), [43, 21, 200, 46]);
  assert.match(g(photo()).find(x => x.kind === 'logo').label, /광고주체 표기/);
  // 기록이 없으면 틀 기본 칸
  assert.deepEqual(pick(moldImageGuides(sp, null), 'image'), [601, 39, 320, 222]);
  // 그림 칸을 정하지 않은 틀은 예전처럼 없음
  assert.deepEqual(moldImageGuides(specOf('google-gdn-300x250') ?? { rules: {} }, null).filter(b => b.label === '광고주체 표기 120×46'), []);
});

test('자소설 상세: 입력한 「/」·「·」·「 · 」를 쉼표로 바꾸지 않는다 — 줄일 때도 입력 기호 그대로', () => {
  const ids = ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-standard-main-pc', 'jasoseol-pc-standard-jobpost-pc', 'jasoseol-m-premium-popup-mo', 'jasoseol-m-standard-main-mo'];
  const textOf = h => h.replace(/<[^>]+>/g, ' ').replace(/⁠/g, '').replace(/\u00A0/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');   // 11-17: 구분 기호 앞 NBSP(줄머리 금칙)는 띄어쓰기로 본다
  for (const role of ['인사·경영/지원, 영업·포워딩, 물류운영, 품질·안전', '인사 · 경영 / 지원 · 영업 · 포워딩 · 물류운영 · 품질 · 안전']) {
    const c = createContext({ client: '세방그룹', hiringType: '신입·인턴·경력 정기채용', role, startDate: '2026-11-06', deadline: '2026-11-15' }, 'recruit');
    for (const id of ids) {
      const t = textOf(renderArtifact(id, c, normalizeStyle({ colors: ['#1B6FD8'] }), {}));
      assert.doesNotMatch(t, /인사, 경영|경영, 지원|영업, 포워딩 등/, `${id} 기호가 쉼표로`);
      assert.match(t, /인사 ?· ?경영 ?\/ ?지원/, `${id} 모집직무가 빠지지 않고 기호 그대로(${role})`);
    }
  }
});

test('SVG 그림 해상도: 표시 1배의 3배 × 제출 배수(자소설 2배 → 6배), 1배 규격은 그대로 3배', () => {
  assert.equal(svgImgScale(1200, 2400), 6);
  assert.equal(svgImgScale(960, 960), 3);
  assert.equal(svgImgScale(960, null), 3);
  assert.equal(svgImgScale(100, 1000), 12);   // 상한 4배수
});
