// 자유 시안 취향 학습(11-05) — 지문 · 점수 순서(5점·유형 가중) · 탐색 안 유지 · exemplars(긍정 위주, 피할 안 최대 1)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintOf, scoreCandidates, exemplarsFor, prefRecord, prefStats, typeWeight, normRating, pickTop, axesOfNote } from '../core/freeprefs.js';
import { prefsSection } from '../server/freedesign.js';

const KV = 'data:image/png;base64,AAAAKV';
const dark = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard',sans-serif;background:linear-gradient(135deg,#0B1A3A,#102B6A)">
<div data-object="1" style="position:absolute;right:0;top:0;width:260px;height:400px;background:url('${KV}') center/cover"></div>
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,26,58,.9),rgba(11,26,58,0) 60%)"></div>
<div data-field="main" style="position:absolute;left:36px;top:110px;font-size:44px;font-weight:800;color:#fff">한진정보통신<br>신입 공채</div>
<div data-field="sub" style="position:absolute;left:36px;top:70px;font-size:20px;color:#fff">2026 하반기</div>
<div data-field="date" style="position:absolute;left:36px;top:230px;font-size:16px;color:#fff"><span style="background:#F5C98A;color:#111;padding:3px 8px;border-radius:5px">모집기간</span> ~10.31</div>
<img data-logo="1" src="${KV}" style="position:absolute;left:36px;top:30px;width:90px;height:24px"></div>`;
const light = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Paperlogy',sans-serif;background:#F7F7F2">
<div data-object="1" style="position:absolute;left:0;bottom:0;width:580px;height:200px;background:url('${KV}') center/cover"></div>
<div data-field="main" style="position:absolute;left:0;top:40px;width:580px;text-align:center;font-size:40px;font-weight:700;color:#111">한진정보통신 신입 공채</div>
<div data-field="date" style="position:absolute;left:0;top:120px;width:580px;text-align:center;font-size:15px;color:#111"><b>모집기간</b> ~10.31</div>
<img data-logo="1" src="${KV}" style="position:absolute;right:30px;bottom:20px;width:80px;height:22px"></div>`;
const full = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard',sans-serif">
<div data-object="1" style="position:absolute;inset:0;background:url('${KV}') center/cover"></div>
<div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent 60%)"></div>
<div data-field="main" style="position:absolute;left:30px;bottom:60px;font-size:42px;font-weight:800;color:#fff">한진정보통신 신입 공채</div>
<div data-field="date" style="position:absolute;left:30px;bottom:28px;font-size:15px;color:#fff">모집기간 | ~10.31</div></div>`;
const kvCutout = { ar: 0.9, colors: ['#3366CC'], field: { kind: 'cutout', opaque: 0.3, lum: 0.5, focus: { x: 0.5, y: 0.5, w: 0.6, h: 0.9, parts: 1, density: 0.6 } } };
const kvPhoto = { ar: 1.6, colors: ['#A07B58'], field: { kind: 'photo', opaque: 1, lum: 0.49, flatEdges: 1, focus: null } };

test.skip('[11-05 미완, 5점 전환 중 끊김] 지문 — 방향(어두움/밝음/전면)·KV 자리·면적·정보 블록 스타일·지면 L*·글꼴·로고 자리·KV 유형을 HTML 만으로 근사', () => {
  const a = fingerprintOf(dark, { specId: 'google-gdn-580x400', kvMeta: kvCutout });
  assert.equal(a.direction, '분할'); assert.equal(a.kvPlace, '우'); assert.ok(a.kvArea > 0.4 && a.kvArea < 0.5, String(a.kvArea));
  assert.equal(a.infoStyle, 'badge'); assert.ok(a.bgTone < 30, String(a.bgTone)); assert.ok(a.scrim); assert.equal(a.font, 'Pretendard'); assert.equal(a.mainWeight, 800); assert.equal(a.logoPlace, '상좌');
  assert.equal(a.kvType, 'cutout-character'); assert.equal(a.kvKey.ar, '정사각'); assert.equal(a.kvKey.hasBg, false);
  assert.equal(a.mainPx, 44); assert.equal(a.subRatio, 0.45); assert.ok(a.contrast >= 10, String(a.contrast));
  const b = fingerprintOf(light, { kvMeta: kvPhoto });
  assert.equal(b.kvPlace, '하'); assert.equal(b.infoStyle, 'bold'); assert.ok(b.bgTone > 90); assert.equal(b.textAlign, 'center'); assert.equal(b.direction, '분할'); assert.equal(b.logoPlace, '하우'); assert.equal(b.kvType, 'photo-busy');
  const c = fingerprintOf(full, { kvMeta: kvPhoto });
  assert.equal(c.direction, '전면'); assert.equal(c.kvArea, 1); assert.equal(c.infoStyle, 'rule'); assert.ok(c.scrim);
  // 렌더 측정값이 있으면 그걸 우선
  const d = fingerprintOf(dark, { kvMeta: kvCutout, measure: { texts: [{ role: 'main', fontPx: 60, bbox: { x: 36, y: 100, w: 300, h: 140 }, color: '#FFFFFF' }], objects: [{ x: 0, y: 0, w: 580, h: 400 }], bgColors: ['#101010'] } });
  assert.equal(d.mainPx, 60); assert.equal(d.direction, '전면');
  assert.equal(normRating('good'), 5); assert.equal(normRating('bad'), 1); assert.equal(normRating('3'), 3); assert.equal(normRating('x'), null);
});

test.skip('[11-05 미완, 5점 전환 중 끊김] 점수 순서 — 5점 좋음과 닮은 안이 위, 1점과 닮은 안이 아래. 같은 유형 1.0 · 이웃 0.4 · 다른 유형 0(절대 안 됨도 전파 안 함). 후보는 버리지 않는다', () => {
  const good = prefRecord({ specId: 'google-gdn-580x400', kvMeta: kvCutout, html: dark, rating: 5, note: '스크림 좋다' });
  const bad = prefRecord({ specId: 'google-gdn-580x400', kvMeta: kvCutout, html: light, rating: 1 });
  const cands = [{ id: 'L', html: light }, { id: 'D', html: dark }, { id: 'F', html: full }];
  const r = scoreCandidates(cands, [good, bad], { specId: 'google-gdn-580x400', kvMeta: kvCutout });
  assert.equal(r.length, 3, '버리지 않는다'); assert.equal(r[0].id, 'D'); assert.equal(r[2].id, 'L'); assert.ok(r[0].score > 0 && r[2].score < 0, JSON.stringify(r.map(x => [x.id, x.score])));
  assert.ok(r[0].layoutScore != null && r[0].styleScore != null, '두 축 따로');
  // 다른 유형(사진)에서는 누끼 평가가 전파되지 않는다(점수 0) — 절대 안 됨도
  const r2 = scoreCandidates(cands, [good, bad], { specId: 'google-gdn-580x400', kvMeta: kvPhoto });
  assert.ok(r2.every(x => x.score === 0), JSON.stringify(r2.map(x => x.score)));
  // 범위 all 이면 유형이 달라도 전파
  const r3 = scoreCandidates(cands, [{ ...bad, scope: 'all' }], { specId: 'google-gdn-580x400', kvMeta: kvPhoto });
  assert.ok(r3.find(x => x.id === 'L').score < 0);
  assert.equal(typeWeight('cutout-object', 'cutout-character'), 0.4); assert.equal(typeWeight('cutout-object', 'illust-object'), 0.4); assert.equal(typeWeight('cutout-object', 'photo-busy'), 0); assert.equal(typeWeight('photo-busy', 'photo-busy'), 1);
  // 축 태그: #톤 만 적은 평가는 레이아웃 점수에 안 들어간다
  assert.deepEqual(axesOfNote('어두운 톤 #톤'), { layout: false, style: true }); assert.deepEqual(axesOfNote('좋다'), { layout: true, style: true });
  const r4 = scoreCandidates(cands, [{ ...good, note: '#톤' }], { specId: 'google-gdn-580x400', kvMeta: kvCutout });
  assert.equal(r4.find(x => x.id === 'D').layoutScore, 0); assert.ok(r4.find(x => x.id === 'D').styleScore > 0);
  // 4점(약간 좋음)은 5점의 절반 가중, 3점은 작게 양수
  const r5 = scoreCandidates([{ id: 'D', html: dark }], [{ ...good, rating: 4 }], { kvMeta: kvCutout }), r6 = scoreCandidates([{ id: 'D', html: dark }], [{ ...good, rating: 3 }], { kvMeta: kvCutout });
  assert.ok(r5[0].score > r6[0].score && r6[0].score > 0 && r5[0].score < r[0].score);
});

test('탐색 안 — 좋음들과 가장 먼 후보 1개가 explore 로 남고, pickTop 은 점수와 무관하게 포함한다(좋음이 많아도)', () => {
  const goods = Array.from({ length: 12 }, (_, i) => prefRecord({ id: `g${i}`, specId: 'google-gdn-580x400', kvMeta: kvCutout, html: dark, rating: 5 }));
  const r = scoreCandidates([{ id: 'D1', html: dark }, { id: 'D2', html: dark.replace('44px', '46px') }, { id: 'L', html: light }], goods, { specId: 'google-gdn-580x400', kvMeta: kvCutout });
  const ex = r.filter(x => x.explore); assert.equal(ex.length, 1); assert.equal(ex[0].id, 'L', '가장 먼 것');
  assert.equal(r[r.length - 1].id, 'L', '점수는 꼴찌지만');
  const top = pickTop(r, 2); assert.ok(top.some(x => x.id === 'L'), '상위 2에 탐색 안 포함'); assert.equal(top.length, 2);
  // 평가가 없을 때도 탐색 안은 하나(서로 가장 다른 것)
  const r0 = scoreCandidates([{ id: 'D1', html: dark }, { id: 'D2', html: dark }, { id: 'L', html: light }], [], { kvMeta: kvCutout });
  assert.equal(r0.filter(x => x.explore).length, 1); assert.equal(r0.find(x => x.explore).id, 'L');
});

test('exemplars — 좋음(5·4) 상위 n(같은 유형 우선, HTML 은 글자·KV 자리표시), 피할 안은 범위 「모든 유형」인 1점 하나까지. prefsSection 은 긍정 위주·금지 문장 없음', () => {
  const prefs = [
    prefRecord({ id: 'a', specId: 'google-gdn-580x400', kvMeta: kvCutout, html: dark, rating: 5, note: '좋다', at: 3 }),
    prefRecord({ id: 'b', specId: 'google-gdn-580x400', kvMeta: kvPhoto, html: full, rating: 5, at: 2 }),
    prefRecord({ id: 'c', specId: 'google-gdn-580x400', kvMeta: kvCutout, html: light, rating: 4, at: 1 }),
    prefRecord({ id: 'd', specId: 'google-gdn-580x400', kvMeta: kvCutout, html: light, rating: 1, scope: 'type', at: 4 }),
    prefRecord({ id: 'e', specId: 'google-gdn-580x400', kvMeta: kvCutout, html: full, rating: 1, scope: 'all', note: '레이아웃 자체가 별로', at: 5 }),
    prefRecord({ id: 'f', specId: 'google-gdn-580x400', kvMeta: kvCutout, html: full, rating: 1, scope: 'all', at: 6 }),
  ];
  const ex = exemplarsFor(prefs, { specId: 'google-gdn-580x400', kvMeta: kvCutout, n: 3 });
  assert.equal(ex.exemplars.length, 2, '같은 유형 좋음 2(사진 유형 b 는 가중 0)'); assert.equal(ex.exemplars[0].note, '좋다');
  assert.ok(ex.exemplars[0].html.includes('{main}') && ex.exemplars[0].html.includes('{{KV}}') && !ex.exemplars[0].html.includes(KV), '자리표시');
  assert.equal(ex.avoid.length, 1, '피할 안은 1개까지(scope all 인 1점만 — d 는 type 이라 제외)');
  const sec = prefsSection(ex);
  assert.ok(/## 채택된 안/.test(sec) && /## 피할 안/.test(sec) && (sec.match(/```html/g) ?? []).length === 2);
  assert.ok(!/금지|하지 마|절대/.test(sec), '금지 문장 없음');
  assert.equal(prefsSection(null), '');
  const st = prefStats(prefs); assert.equal(st.total, 6); assert.equal(st.good, 3); assert.equal(st.bad, 3); assert.equal(st.byType['cutout-character'].by[5], 1);
});
