// 11-09 성능: 키비주얼·로고 data URL 을 렌더 HTML 에 넣지 않고 짧은 참조(blob:)로 그린다(core/assetref.js).
//   참조를 되돌리면(resolveRefs) data URL 로 그린 HTML 과 바이트 동일해야 한다 — 내보내기·래스터가 같은 바이트를 받는다.
//   편집 경로의 안 후보 지연 계산(generateArtifacts variants:false → computeVariants)도 즉시 계산과 같은 안 목록이어야 한다.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { registerAll, generateArtifacts, computeVariants } from '../core/generate.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { adSpecEntries } from '../core/adspecs.js';
import { applyKvTypeOverride } from '../core/kvtypes.js';
import { htmlHash } from '../core/variants.js';
import { refStyle, resolveRefs, setRefMaker, refOf, hasRefs } from '../core/assetref.js';

const ROOT = new URL('../', import.meta.url).pathname;
const CASES = JSON.parse(readFileSync(ROOT + 'ref/learned/cases/cases.json', 'utf8')).cases;
const dataUrlOf = f => `data:image/${f.endsWith('.jpg') ? 'jpeg' : 'png'};base64,${readFileSync(f).toString('base64')}`;
const SPECS = adSpecEntries();
const EX = JSON.parse(readFileSync(ROOT + 'core/media/_extract.json', 'utf8')).extract.filter(id => SPECS[id] && SPECS[id].channel !== 'asset');
let n = 0;
const blobLike = () => `blob:http://127.0.0.1:4799/00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
after(() => setRefMaker(null));

function campaignOf(id) {
  const c = CASES.find(x => x.id === id), dir = ROOT + `ref/learned/cases/${id}/`;
  const meta = JSON.parse(readFileSync(dir + 'meta.json', 'utf8')); const m = applyKvTypeOverride(meta, c?.typeOverride ?? null);
  const kvFile = existsSync(dir + 'kv.png') ? dir + 'kv.png' : dir + 'kv.jpg';
  const logo = existsSync(dir + 'logo.png') ? dataUrlOf(dir + 'logo.png') : null;
  const style = normalizeStyle({ colors: [c?.primary ?? '#1428A0'], keyVisual: dataUrlOf(kvFile), kvMeta: m.kv ?? m, logo, logoLight: logo, logoTone: c?.logoMeta?.tone ?? 'dark', logoMeta: c?.logoMeta ?? null, kvOrig: dataUrlOf(kvFile).replace('base64,', 'base64,AAAA') });
  const fields = c?.fields ?? { client: 'GS에너지', hiringType: '신입 공채', role: '영업', deadline: '2026-07-02' };
  return { id: 'perf-' + id, kind: 'recruit', context: createContext(fields, 'recruit'), style, channels: [], adSpecIds: EX, artifacts: [], log: [] };
}
const vsOf = c => c.artifacts.map(a => JSON.stringify({ k: a.key, v: a.variants ?? null, s: a.variantSel ?? null }));

test('assetref: 큰 data URL 만 참조로, 작은 것·다른 값은 그대로 · 같은 그림은 같은 참조', () => {
  setRefMaker(blobLike);
  const big = 'data:image/png;base64,' + 'A'.repeat(5000), small = 'data:image/png;base64,AAAA';
  const st = { keyVisual: big, logo: small, kvVariants: { wide: { keyVisual: big } }, palette: { primary: '#000' }, list: [big] };
  const r = refStyle(st);
  assert.match(r.keyVisual, /^blob:/); assert.equal(r.logo, small); assert.equal(r.kvVariants.wide.keyVisual, r.keyVisual); assert.equal(r.list[0], r.keyVisual);
  assert.equal(r.palette, st.palette, '바꿀 것 없는 하위 객체는 같은 객체');
  assert.equal(st.keyVisual, big, '원본 스타일은 그대로');
  assert.equal(refStyle(st), r, '같은 스타일은 같은 사본');
  st.keyVisual = 'data:image/png;base64,' + 'B'.repeat(5000);   // 제자리 고침(로고 손질)
  assert.notEqual(refStyle(st).keyVisual, r.keyVisual, '제자리에서 바꾼 그림은 새 참조');
  assert.equal(refOf(big), r.keyVisual);
  const html = `<div style="background:url('${r.keyVisual}')"></div><img src="${r.keyVisual}">`;
  assert.ok(hasRefs(html));
  assert.equal(resolveRefs(html), `<div style="background:url('${big}')"></div><img src="${big}">`);
  assert.equal(resolveRefs('<p>x</p>'), '<p>x</p>');
  assert.equal(htmlHash(html), htmlHash(resolveRefs(html)), '그림 지문은 참조·data URL 이 같다');
});

test('assetref: node 기본(참조를 못 만드는 환경)은 data URL 그대로 — 결과 동일', () => {
  setRefMaker(null);
  const big = 'data:image/png;base64,' + 'C'.repeat(5000);
  assert.equal(refStyle({ keyVisual: big }).keyVisual, big);
});

// 5 케이스(누끼·인물 사진·일러스트·그라데이션·질감) × 추출 규격 — 기본안 렌더
for (const id of ['fox-cutout', 'dongsuh-model', 'bc-illust', 'gradient', 'texture-dark']) {
  test(`assetref: ${id} × ${EX.length}규격 — 참조로 그린 HTML 을 되돌리면 data URL 렌더와 바이트 동일`, () => {
    registerAll(); setRefMaker(blobLike);
    const A = campaignOf(id), B = campaignOf(id);
    generateArtifacts(A, { variants: false });
    generateArtifacts(B, { variants: false, ref: refStyle });
    assert.equal(A.artifacts.length, B.artifacts.length);
    let same = 0, small = 0;
    for (let i = 0; i < A.artifacts.length; i++) {
      const a = A.artifacts[i].html, b = B.artifacts[i].html;
      if (b.length < a.length) small++;
      assert.equal(resolveRefs(b), a, `${A.artifacts[i].key}: 되돌린 HTML 이 다르다`);
      same++;
    }
    assert.equal(same, A.artifacts.length);
    assert.ok(small > 0, '참조 HTML 이 작아야(그림 바이트 없음)');
    assert.ok(B.artifacts.every(a => !a.html.includes(B.style.keyVisual.slice(0, 200))), '참조 HTML 에 KV 바이트가 없다');
  });
}

// 즉시 계산(data URL)은 큰 그림이면 케이스당 수십 초라 작은 실사진(desk-03 67KB · desk-03-cut 누끼 446KB)으로 — 참조 여부만 다르고 같은 코드 길이다
test('assetref + 지연 안 계산: 안 목록이 즉시 계산(data URL)과 같다 — 2 케이스', () => {
  registerAll(); setRefMaker(blobLike);
  for (const id of ['desk-03', 'desk-03-cut']) {
    const A = campaignOf(id), B = campaignOf(id);
    generateArtifacts(A);   // 예전 그대로: data URL · 안 후보 즉시
    generateArtifacts(B, { variants: false, ref: refStyle });
    assert.ok(B.artifacts.filter(a => a.channel === 'ad').every(a => a.variantsStale), '편집 경로는 안을 미룬다');
    for (const a of B.artifacts) computeVariants(B, a, { ref: refStyle });
    assert.ok(B.artifacts.every(a => !a.variantsStale));
    assert.deepEqual(vsOf(B), vsOf(A), `${id}: 안 목록(라벨·프리셋·지문·선택)이 다르다`);
    for (let i = 0; i < A.artifacts.length; i++) assert.equal(resolveRefs(B.artifacts[i].html), A.artifacts[i].html);
    // 고른 안 유지: 프리셋 안을 고른 뒤 다시 그려도(지연) 같은 안
    const a = B.artifacts.find(x => (x.variants?.length ?? 0) > 1), ai = A.artifacts.find(x => x.key === a.key);
    for (const [C, x] of [[A, ai], [B, a]]) { x.variantSel = 1; x.overrides.style = { ...x.variants[1].style }; }
    generateArtifacts(A); generateArtifacts(B, { variants: false, ref: refStyle }); computeVariants(B, a, { ref: refStyle });
    assert.equal(a.variantSel, ai.variantSel); assert.deepEqual(a.variants, ai.variants);
    assert.equal(resolveRefs(a.html), ai.html);
  }
});

test('assetref: 앞부분이 같은 참조(ref-1 · ref-10)도 섞이지 않게 통째로 되돌린다', () => {
  let k = 0; setRefMaker(() => `blob:http://x/ref-${++k}`);
  const ds = Array.from({ length: 11 }, (_, i) => 'data:image/png;base64,' + String.fromCharCode(65 + i).repeat(5000));
  const rs = ds.map(refOf);
  assert.equal(rs[9], 'blob:http://x/ref-10');
  const html = rs.map(r => `<img src="${r}"><i style="background:url(&quot;${r}&quot;)"></i>`).join('');
  assert.equal(resolveRefs(html), ds.map(d => `<img src="${d}"><i style="background:url(&quot;${d}&quot;)"></i>`).join(''));
  setRefMaker(blobLike);
});
