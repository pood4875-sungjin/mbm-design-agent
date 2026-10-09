// 10-09 figma-dg(Figma "Design-Generator" 에이치닷·마이다스 KV 29건)에서 채택한 규칙 — ref/learned/cases/_out/night-2-figma-dg.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kvTypeOf } from '../core/kvtypes.js';
import { fieldFromImage } from '../core/palette.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const col = arr => arr.map(bg => ({ bg }));
const specs = adSpecEntries();
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const styleOf = (kvMeta, primary = '#5828B8') => normalizeStyle({ colors: [primary], keyVisual: PNG, kvMeta, logo: PNG, logoTone: 'dark' });
const cutoutMeta = (focus, ar = 1, extra = {}) => ({ ar, px: [Math.round(ar * 1000), 1000], field: { kind: 'cutout', opaque: 0.1, lum: 0.3, sat: 0.4, semi: 0.02, focus: { parts: 1, others: [], ...focus }, edges: {}, cols: col(Array(32).fill(0.5)), rows: col(Array(32).fill(0.5)), ...extra } });
// 실측값(ref/learned/cases/<id>/meta.json 요약)
const SPEAKER = cutoutMeta({ x: 0.5, y: 0.52, w: 0.91, h: 0.96, density: 0.59 }, 0.74);
const ASTERISK = cutoutMeta({ x: 0.5, y: 0.5, w: 0.94, h: 0.94, density: 0.48 }, 0.95);
const FOLDER = cutoutMeta({ x: 0.5, y: 0.5, w: 0.94, h: 0.94, density: 0.79 }, 0.92);
const FOX = cutoutMeta({ x: 0.5, y: 0.5, w: 0.94, h: 0.93, density: 0.72 }, 1.10);
const SLAB_COLS = [0.9, 0.1, 0.2, 0.2, 0.3, 0.3, 0.4, 0.4, 0.3, 0.4, 0.5, 0.7, 0.6, 0.4, 0.7, 0.9, 0.8, 0.5, 0.4, 0.4, 0.5, 0.5, 0.4, 0.3, 0.3, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.9];
const SLAB = cutoutMeta({ x: 0.75, y: 0.5, w: 0.44, h: 0.88, density: 0.74, parts: 4, others: [{}, {}, {}] }, 1.86, { cols: col(SLAB_COLS), edges: { left: { opaque: 0.45 }, right: { opaque: 0.45 }, top: { opaque: 0 }, bottom: { opaque: 0 } }, lum: 0.19, sat: 0.93 });
const CROWD = { ar: 1.6, px: [1210, 753], field: { kind: 'photo', opaque: 1, lum: 0.2, sat: 0.41, flatEdges: 0, edges: {}, focus: { x: 0.5, y: 0.5, w: 1, h: 1, parts: 2, others: [], density: 0.38 } } };
const ILHWA_DARK = { ar: 1.4, px: [1400, 1000], field: { kind: 'photo', opaque: 1, lum: 0.22, sat: 0.4, flatEdges: 0, edges: {}, focus: { x: 0.46, y: 0.69, w: 0.81, h: 0.48, parts: 2, others: [], density: 0.17 } } };

test('캐릭터 깃발: 누끼는 상자 밀도 0.55~0.75만 — 별표 3D(0.48)·폴더(0.79)는 단일 사물, 연사(0.59)·여우(0.72)는 캐릭터', () => {
  assert.equal(kvTypeOf(SPEAKER).flags.character, true);
  assert.equal(kvTypeOf(FOX).flags.character, true);
  for (const m of [ASTERISK, FOLDER]) { const t = kvTypeOf(m); assert.equal(t.flags.character, false); assert.equal(t.flags.single, true); assert.equal(t.sub.id, 'cutout-object'); }
});

test('장식 프레임 누끼(가운데 빈 유리 슬랩): 캐릭터·떼가 아니라 cutout-frame, 지면 전체 + 어두운 브랜드 지면', () => {
  const t = kvTypeOf(SLAB);
  assert.equal(t.flags.frame, true); assert.equal(t.flags.character, false); assert.equal(t.flags.group, false); assert.equal(t.sub.id, 'cutout-frame');
  // 가운데가 차 있으면(떼) 프레임이 아니다
  assert.equal(kvTypeOf({ ...SLAB, field: { ...SLAB.field, cols: col(Array(32).fill(0.3)) } }).flags.frame, false);
  for (const id of ['google-gdn-580x400', 'instagram-feed-1080', 'google-gdn-300x600']) {
    const html = renderAd(ctx, styleOf(SLAB, '#080848'), specs[id]);
    assert.match(html, /data-kv-use="bg"/, id); assert.match(html, /data-field-source="kv-frame"/, id);
    assert.match(html, /url\('[^']+'\) right (center|bottom)\/\d+px auto/, id);
  }
});

test('현장·군중 사진(어둡고 주인공 없음)은 자동 사진 전체형 — 주인공 있는 어두운 사진(일화)은 그대로', () => {
  assert.equal(kvTypeOf(CROWD).flags.crowd, true); assert.equal(kvTypeOf(CROWD).sub.id, 'photo-crowd');
  assert.equal(kvTypeOf(ILHWA_DARK).flags.crowd, false);
  const html = renderAd(ctx, styleOf(CROWD), specs['google-gdn-580x400']);
  assert.match(html, /data-kv-use="full"/);
  assert.doesNotMatch(renderAd(ctx, styleOf(ILHWA_DARK), specs['google-gdn-580x400']), /data-kv-use="full"/);
  // '한쪽에 넣기'를 고르면 예전대로
  assert.doesNotMatch(renderAd(ctx, normalizeStyle({ colors: ['#5828B8'], keyVisual: PNG, kvMeta: CROWD, kvUse: 'part' }), specs['google-gdn-580x400']), /data-kv-use="full"/);
});

// 합성 그림 → fieldFromImage
const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };

test('대각 그라데이션 바탕(노랑→주황)의 주인공은 모서리 보간 바탕으로 가른다 — 주황 구석을 주인공으로 잡지 않는다', () => {
  const W = 240, H = 160;
  const rgba = img(W, H, (x, y) => {
    if (x > 80 && x < 170 && y > 50 && y < 120) return [245, 245, 250];   // 가운데 흰 카드
    const t = (x / W + y / H) / 2; return [252, 204 - 90 * t, 92 - 50 * t];
  });
  const f = fieldFromImage(rgba, W, H);
  assert.equal(f.kind, 'illust');
  assert.ok(f.focus && Math.abs(f.focus.x - 0.52) < 0.08 && Math.abs(f.focus.y - 0.53) < 0.1, JSON.stringify(f.focus));
});

test('단색조 추상(평평한 변 없음·색 퍼짐 ≤ 30·채도 ≥ 0.6)은 질감, 질감 위 색 있는 지면은 흰 글자가 먼저', () => {
  const W = 240, H = 160;
  const rgba = img(W, H, (x, y) => (((x + 2 * y) >> 3) % 2) ? [20, 90, 235] : [40, 120, 250]);   // 파란 사선 결
  const f = fieldFromImage(rgba, W, H);
  assert.equal(f.flatEdges, 0); assert.equal(f.kind, 'texture');
  const meta = { ar: 1.5, px: [1536, 1024], field: f, colors: ['#2170F6'] };
  const html = renderAd(ctx, styleOf(meta, '#080858'), specs['instagram-feed-1080']);
  assert.match(html, /data-kv-use="bg"/);
  assert.match(html, /<div data-field="main" style="[^"]*color:#FFFFFF/);
});

test('긴 단일 사물(비율 ≥ 1.8)은 폭이 넓은 세로형에서도 좌우 양쪽 블리드(정사각은 되돌림 — 기존 우하단)', () => {
  const DOME = cutoutMeta({ x: 0.5, y: 0.5, w: 0.99, h: 0.98, density: 0.27 }, 2.14, { lum: 0.55, sat: 0.61, semi: 0.57 });
  assert.equal(kvTypeOf(DOME).flags.single, true);
  for (const id of ['instagram-story-1080x1920', 'albamon-pc-main-board']) {
    const html = renderAd(ctx, styleOf(DOME, '#0E5A8A'), specs[id]);
    const left = Number(html.match(/data-bleed="1" style="position:absolute;left:(-?\d+)px/)?.[1]);
    assert.ok(left <= 0, `${id}: 왼쪽도 지면 밖(left ${left})`);
  }
  const sq = renderAd(ctx, styleOf(DOME, '#0E5A8A'), specs['instagram-feed-1080']);
  assert.ok(Number(sq.match(/data-bleed="1" style="position:absolute;left:(-?\d+)px/)?.[1]) > 0, '정사각은 왼쪽 경계(30%) 안');
});
