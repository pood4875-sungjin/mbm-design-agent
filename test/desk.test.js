// 10-09 데스크탑 키비주얼 36장 × 로고 36개(~/Desktop/키비주얼·로고) 테스트에서 채택한 규칙 — history/2026-10-09_데스크탑_키비주얼_로고_테스트.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knockoutLogo, trimBox, logoToneOf, prepLogoRGBA } from '../core/logo.js';
import { fieldFromImage } from '../core/palette.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { textWidth } from '../core/renderers/banner.js';

const specs = adSpecEntries();
const ctxOf = client => createContext({ client, role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const ctx = ctxOf('한진정보통신');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };
const PHOTO = { ar: 1.4, px: [1400, 1000], field: { kind: 'photo', opaque: 1, lum: 0.55, sat: 0.3, flatEdges: 0, edges: {}, focus: { x: 0.6, y: 0.55, w: 0.6, h: 0.8, parts: 1, others: [], density: 0.5 } } };
const CUT = { ar: 1, px: [1000, 1000], field: { kind: 'cutout', opaque: 0.3, lum: 0.6, sat: 0.4, semi: 0.02, focus: { x: 0.5, y: 0.5, w: 0.9, h: 0.9, parts: 1, others: [], density: 0.7 }, edges: {}, cols: Array(32).fill({ bg: 0.4 }), rows: Array(32).fill({ bg: 0.4 }) } };
const styleOf = (kvMeta, extra = {}, primary = '#5828B8') => normalizeStyle({ colors: [primary], keyVisual: PNG, kvMeta, logo: PNG, logoTone: 'dark', ...extra });
const logoImgs = html => [...html.matchAll(/<img data-logo="1"[^>]*style="([^"]*)"/g)].map(m => m[1]);

test('로고 바탕 지우기: 흰 상자 로고는 상자를 지우고, 글자가 두 모서리에 닿아도(아모레퍼시픽 JPG) 테두리 대부분이 한 색이면 지운다', () => {
  // 흰 상자 + 가운데 검정 글자
  const W = 200, H = 80;
  const box = img(W, H, (x, y) => (x > 40 && x < 160 && y > 25 && y < 55) ? [10, 10, 10] : [255, 255, 255]);
  const k = knockoutLogo(box, W, H); assert.ok(k && k.removed > 50, JSON.stringify(k));
  assert.equal(box[3], 0);   // 모서리 투명
  // 글자가 아래 두 모서리에 닿는 경우(네 모서리가 갈림)
  const touch = img(W, H, (x, y) => ((y > 50 && (x < 50 || x > 150)) || (x > 80 && x < 120 && y > 20 && y < 60)) ? [5, 5, 5] : [255, 255, 255]);
  assert.ok(knockoutLogo(touch, W, H), '테두리 60% 이상이 흰색이면 지운다');
  // 이미 투명 배경이면 그대로
  assert.equal(knockoutLogo(img(W, H, (x, y) => (x > 50 && x < 150) ? [0, 0, 0, 255] : [0, 0, 0, 0]), W, H), null);
  // 남색 상자 + 흰 글자(기아) → 지우고 나면 흰색 로고
  const navy = img(W, H, (x, y) => (x > 40 && x < 160 && y > 25 && y < 55) ? [250, 250, 250] : [5, 16, 24]);
  const p = prepLogoRGBA(navy, W, H);
  assert.equal(p.changed, true); assert.equal(p.meta.tone, 'light'); assert.ok(p.w < W && p.h < H, '여백 트림');
});

test('로고 톤은 바탕을 지운 뒤 잰다 — 흰 상자 위 검정 글자는 dark, 투명 흰 글자는 light', () => {
  const W = 120, H = 40;
  const box = img(W, H, (x, y) => (x > 40 && x < 80 && y > 15 && y < 25) ? [0, 0, 0] : [255, 255, 255]);
  assert.equal(logoToneOf(box, W, H), 'light');   // 지우기 전엔 흰 상자가 밝기를 끌어올린다(흰색 로고로 오판)
  assert.equal(prepLogoRGBA(box, W, H).meta.tone, 'dark');
  assert.equal(logoToneOf(img(W, H, (x, y) => (y > 10 && y < 30) ? [255, 255, 255, 255] : [0, 0, 0, 0]), W, H), 'light');
  assert.deepEqual(trimBox(img(W, H, (x, y) => (x >= 30 && x < 90 && y >= 10 && y < 30) ? [0, 0, 0, 255] : [0, 0, 0, 0]), W, H) && true, true);
});

test('타일 로고(불투명 ≥ 85%)는 어두운 지면에서 반전하지 않는다 — 흰 네모가 되지 않게. 워드마크는 그대로 흰색 반전', () => {
  const spec = specs['instagram-feed-1080'];
  const tile = renderAd(ctx, styleOf(CUT, { logoMeta: { px: [180, 180], solid: 0.96 } }, '#3010A0'), spec);
  const word = renderAd(ctx, styleOf(CUT, { logoMeta: { px: [600, 120], solid: 0.3 } }, '#3010A0'), spec);
  assert.ok(logoImgs(word).some(s => /invert\(1\)/.test(s)), '워드마크는 반전(지면이 어두운지 확인)');
  assert.ok(logoImgs(tile).length && logoImgs(tile).every(s => !/invert/.test(s)), '타일은 원색');
});

test('세로로 긴 로고(폭÷높이 < 0.8)는 로고 칸 높이를 √(0.8÷비율)배(최대 1.8)로 키운다', () => {
  const spec = specs['kakao-display-pc-promo'];   // 10-15 저녁: 구글·NAP·네이버 DA 는 틀(templateMold) — 자유 배치 픽스처는 카카오 디스플레이 PC
  const hOf = html => { const m = html.match(/data-logo-slot="1" style="[^"]*height:(\d+)px/) ?? html.match(/<img data-logo="1"[^>]*height:(\d+)px/); return m ? +m[1] : null; };
  const wide = hOf(renderAd(ctx, styleOf(CUT, { logoMeta: { px: [600, 150], solid: 0.4 } }), spec));
  const tall = hOf(renderAd(ctx, styleOf(CUT, { logoMeta: { px: [36, 172], solid: 0.5 } }), spec));
  assert.ok(wide && tall, `${wide} ${tall}`);
  assert.ok(tall >= wide * 1.7 && tall <= wide * 1.85, `${wide} → ${tall}`);
});

test('사진이 오른쪽 열인 가로형은 로고를 글자 쪽(좌상단)에 — 사진 위에 얹지 않는다', () => {
  const html = renderAd(ctx, styleOf(PHOTO), specs['kakao-display-pc-promo']);   // 10-15 저녁: 구글GDN 은 ABL 틀(templateMold) — 자유 배치 픽스처는 다른 매체로
  const slot = html.match(/data-logo-slot="1" style="([^"]*)"/)?.[1] ?? '';
  assert.match(slot, /left:\d+px;justify-content:flex-start/, slot);
});

test('색 퍼짐 ≤ 25인 그림은 평평한 변이 없어도(압축 노이즈로 거칠기가 올라가도) 질감', () => {
  const W = 240, H = 160;
  // 파스텔 블롭 + JPG 노이즈 흉내
  const rgba = img(W, H, (x, y) => { const d = Math.hypot(x - 120 - 60 * Math.sin(y / 30), y - 80); const n = ((x * 7 + y * 13) % 5) - 2; return [150 + d * 0.2 + n, 200 + n, 240 - d * 0.1 + n]; });
  const f = fieldFromImage(rgba, W, H);
  assert.equal(f.flatEdges, 0);
  assert.ok(f.texture.spread <= 25, String(f.texture.spread));
  assert.equal(f.kind, 'texture');
});

test('질감은 GDN 580×400에서 지면에만 깐다 — 우하단 모서리 상자에 같은 그림을 또 넣지 않는다', () => {
  const W = 240, H = 160;
  const rgba = img(W, H, (x, y) => [140 + x * 0.2, 190, 235 - y * 0.1]);
  const meta = { ar: 1.5, px: [1200, 800], field: fieldFromImage(rgba, W, H), colors: ['#9BC0EB'] };
  assert.equal(meta.field.kind, 'texture');
  const html = renderAd(ctx, styleOf(meta), specs['instagram-feed-1080']);   // 10-15 저녁: 구글GDN 은 ABL 틀(templateMold) — 자유 배치 픽스처는 다른 매체로
  assert.match(html, /data-kv-use="bg"/);
  assert.doesNotMatch(html, /data-object="1"/);
});

test('긴 회사명 메인은 줄 수 상한을 넘지 않는다 — 「정규직…」으로 잘리지 않게 글자를 줄이거나 회사 뒤에서 나눈다', () => {
  for (const client of ['한국산업단지공단', '에스디바이오센서', '시청자미디어재단']) {
    let dbg = null; globalThis.__adDebug = d => { if (d.spec === 'google-gdn-580x400') dbg = d; };
    renderAd(ctxOf(client), styleOf(PHOTO), specs['google-gdn-580x400']);
    globalThis.__adDebug = null;
    assert.ok(dbg, client);
    const W = dbg.textW; const sp = textWidth(' ');
    const lines = String(dbg.main).split('\n').reduce((n, t) => { let k = 1, cur = 0; for (const wd of t.split(' ')) { const ww = textWidth(wd) * dbg.mainFs * 1.04; if (cur > 0 && cur + sp * dbg.mainFs + ww > Math.max(W, dbg.textW)) { k++; cur = ww; } else cur += (cur > 0 ? sp * dbg.mainFs : 0) + ww; } return n + k; }, 0);
    assert.ok(lines <= dbg.mainLines, `${client}: ${dbg.main} ${dbg.mainFs}px ${lines}줄 > ${dbg.mainLines}`);
  }
});
