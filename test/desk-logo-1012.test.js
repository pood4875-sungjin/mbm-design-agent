// 10-12 데스크탑 키비주얼 마무리 — 로고 색 = 지면 색이면 단색(CANON logoClash), 로고 대표색 실측, 글자 속 구멍 지우기,
// 꽉 찬 투명 PNG 로고를 바탕으로 오판하지 않기, 앱 스타일 변경 때 로고 실측 유지.
// history/2026-10-12_데스크탑_키비주얼_로고_테스트.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoColors, logoMeta, knockoutLogo, prepLogoRGBA } from '../core/logo.js';
import { CANON } from '../core/canon.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
// 10-16: 카카오 PC디스플레이 1200×600 은 한국앤컴퍼니 샘플 틀(templateMold)이 생겼다 — 이 파일의 자유 배치 검증은 틀 뗀 사본으로(숫자·안전영역·글자 한도는 그대로)
specs['kakao-display-pc-promo'] = (e => { const c = structuredClone(e); delete c.rules.safeArea.measuredFromTemplate.mold; return c; })(specs['kakao-display-pc-promo']);
const ctx = createContext({ client: '동부건설', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
// desk-37 실측(주황 그라데이션 위 흰 캐릭터 735×386 — ~/Desktop/키비주얼 ae6e…jpg)
const DESK37 = {"ar":1.9041450777202074,"px":[735,386],"edge":"#F08842","field":{"edges":{"top":{"hex":"#D35501","from":"#E45C01","to":"#C24E01","opaque":1,"rough":0.001,"std":12,"flat":true},"bottom":{"hex":"#FDB686","from":"#FCA66B","to":"#FDC6A1","opaque":1,"rough":0.001,"std":19,"flat":false},"left":{"hex":"#FE6C0A","from":"#FF6702","to":"#FD7112","opaque":1,"rough":0.001,"std":9,"flat":true},"right":{"hex":"#F1A979","from":"#E58544","to":"#FECEAD","opaque":1,"rough":0.002,"std":48,"flat":false}},"opaque":1,"flatEdges":2,"kind":"illust","lum":0.64,"lumSpread":0.17,"sat":0.68,"semi":0,"texture":{"rough":0.0047,"sharp":0.0098,"spread":48},"quadrants":{"tl":"#F56D11","tr":"#EB8946","bl":"#FD944C","br":"#FDC49E"},"focus":{"x":0.5,"y":0.6,"w":1,"h":0.8,"parts":1,"others":[],"density":0.64},"rows":[{"hex":"#C34E01","bg":1},{"hex":"#C65001","bg":1},{"hex":"#F26402","bg":1},{"hex":"#FB6702","bg":0.92},{"hex":"#FC6702","bg":0.63},{"hex":"#FE6701","bg":0.46},{"hex":"#FE6702","bg":0.42},{"hex":"#FE6802","bg":0.4},{"hex":"#FD6804","bg":0.4},{"hex":"#FD6907","bg":0.36},{"hex":"#FD6D0D","bg":0.31},{"hex":"#FD7213","bg":0.27},{"hex":"#FD791F","bg":0.24},{"hex":"#FD802B","bg":0.21},{"hex":"#FD8431","bg":0.06},{"hex":null,"bg":0}],"cols":[{"hex":"#FE6702","bg":0.9},{"hex":"#FE6702","bg":0.9},{"hex":"#FE6702","bg":0.9},{"hex":"#FD6702","bg":0.83},{"hex":"#FC6702","bg":0.7},{"hex":"#FB6701","bg":0.61},{"hex":"#F66401","bg":0.46},{"hex":"#D35601","bg":0.33},{"hex":"#DF5B01","bg":0.32},{"hex":"#ED6102","bg":0.32},{"hex":"#E35D02","bg":0.27},{"hex":"#E85E03","bg":0.25},{"hex":"#D95902","bg":0.22},{"hex":"#C65101","bg":0.21},{"hex":"#C65101","bg":0.25},{"hex":"#C45002","bg":0.26}],"room":{"corner":"tl","x0":0,"y0":0,"x1":0.375,"y1":0.625,"w":0.375,"h":0.625,"hex":"#FA6704","lum":0.5,"cornersBg":{"tl":1,"tr":1,"bl":0.16,"br":0}}},"colors":["#F0660A","#FDB687"]};
// 10-12: 채도 높은 주황 지면은 이제 흰 글자(CANON vividWhite)라 로고도 흰 단색이 된다 — 색 겹침 규칙(밝은 지면·검정 글자)을 보려고 지면색을 직접 고른다(직접 고른 색에는 vividWhite 를 걸지 않는다)
const styleOf = colors => normalizeStyle({ colors: ['#E86800'], keyVisual: PNG, kvMeta: DESK37, background: { color: '#FE6C0A' }, logo: PNG, logoTone: 'dark', logoMeta: { px: [128, 128], solid: 0.63, lum: 0.5, sat: 0.93, colors } });
const filters = html => [...html.matchAll(/<img data-logo="1"[^>]*style="([^"]*)"/g)].map(m => (m[1].match(/filter:[^;]*/) ?? ['none'])[0]);
const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };

test('로고 대표색: 불투명 픽셀의 넓은 색 순서와 면적 몫(투명은 세지 않는다)', () => {
  const W = 100, H = 40;
  const d = img(W, H, (x, y) => x < 70 ? [232, 104, 0, 255] : x < 90 ? [20, 20, 20, 255] : [0, 0, 0, 0]);
  const c = logoColors(d, W, H);
  assert.equal(c[0].hex.slice(0, 3), '#E8');
  assert.ok(Math.abs(c[0].share - 0.78) < 0.03, JSON.stringify(c));
  assert.ok(c[1].share > 0.2 && c[1].share < 0.25);
  assert.ok(Array.isArray(logoMeta(d, W, H).colors), 'logoMeta 에 colors 가 실린다');
});

test('로고 색이 지면과 같으면(주황 로고 × 주황 지면, 검정 글자) 원색 대신 검정 단색 — 다른 색 로고는 원색 그대로', () => {
  assert.deepEqual(CANON.logoClash, { minContrast: 1.6, share: 0.5 });
  const spec = specs['kakao-display-pc-promo'];
  const same = filters(renderAd(ctx, styleOf([{ hex: '#F07020', share: 0.8 }, { hex: '#FFFFFF', share: 0.2 }]), spec));
  const navy = filters(renderAd(ctx, styleOf([{ hex: '#1428A0', share: 0.9 }]), spec));
  assert.ok(same.length && same.every(f => f === 'filter:brightness(0)'), same.join());
  assert.ok(navy.length && navy.every(f => f === 'none'), navy.join());
});

test('겹치는 색이 로고 면적의 절반 미만이면(여러 색 로고의 한 조각) 원색을 지킨다', () => {
  const html = renderAd(ctx, styleOf([{ hex: '#1428A0', share: 0.6 }, { hex: '#F07020', share: 0.4 }]), specs['kakao-display-pc-promo']);
  assert.ok(filters(html).every(f => f === 'none'));
});

test('타일 로고·실측 없는 로고에는 걸지 않는다(예전 그대로)', () => {
  const spec = specs['kakao-display-pc-promo'];
  const tile = normalizeStyle({ colors: ['#E86800'], keyVisual: PNG, kvMeta: DESK37, background: { color: '#FE6C0A' }, logo: PNG, logoTone: 'dark', logoMeta: { px: [128, 128], solid: 0.95, colors: [{ hex: '#F07020', share: 1 }] } });
  assert.ok(filters(renderAd(ctx, tile, spec)).every(f => f === 'none'));
  const bare = normalizeStyle({ colors: ['#E86800'], keyVisual: PNG, kvMeta: DESK37, background: { color: '#FE6C0A' }, logo: PNG, logoTone: 'dark' });
  assert.ok(filters(renderAd(ctx, bare, spec)).every(f => f === 'none'));
});

test('앱: 스타일을 바꿔도(restyle) 로고 실측이 남고, 로고를 갈면 실측을 다시 잰다', () => {
  const src = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  const restyle = src.slice(src.indexOf('const restyle = '), src.indexOf('...patch,', src.indexOf('const restyle = ')));
  assert.match(restyle, /logoMeta: c\.style\.logoMeta/);
  assert.match(src, /const logoMeta = await logoMetaOfUrl\(ink\)/);   // 10-12 결정 12: 잉크(글자 속을 지운 사본)로 잰다 — 이전 logoMetaOfUrl(src)
});

test('글자 속 구멍(O 속)은 단색 변환용(holes:true)에서만 지운다 — 기본은 속의 흰색을 남긴다(10-12 결정 12, 이전: 기본이 지움)', () => {
  const W = 120, H = 60;
  // 흰 바탕 + 검정 고리(가운데 흰 구멍)
  const ring = () => img(W, H, (x, y) => { const r = Math.hypot(x - 60, y - 30); return (r < 20 && r > 10) ? [0, 0, 0, 255] : [255, 255, 255, 255]; });
  const a = ring(); const k = knockoutLogo(a, W, H, { holes: true });
  assert.ok(k && k.holes > 0, JSON.stringify(k));
  assert.equal(a[(30 * W + 60) * 4 + 3], 0, '고리 속 가운데가 투명');
  assert.equal(a[(30 * W + 75) * 4 + 3], 255, '고리 자체는 그대로');
  const b = ring(); const kb = knockoutLogo(b, W, H);
  assert.equal(kb.holes, 0);
  assert.equal(b[(30 * W + 60) * 4 + 3], 255, '기본은 속을 남긴다');
});

test('글자가 세 모서리에 닿은 투명 PNG 로고는 바탕이 없다 — 검정 글자를 바탕으로 보고 통째로 지우지 않는다(desk-08 KMA)', () => {
  const W = 200, H = 60;
  // 검정 글자 막대가 왼쪽·오른쪽 아래 모서리에 닿고, 나머지는 투명
  const d = img(W, H, (x, y) => (x < 40 || x > 160 || (y > 40 && x > 90 && x < 110)) ? [0, 0, 1, 255] : [0, 0, 0, 0]);
  assert.equal(knockoutLogo(new Uint8ClampedArray(d), W, H), null);
  const p = prepLogoRGBA(new Uint8ClampedArray(d), W, H);
  assert.ok(p.meta.solid > 0.3, JSON.stringify(p.meta));
});
