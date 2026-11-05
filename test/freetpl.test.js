// 자유 시안 틀(11-05 「대화로 시안 뽑기」) — 치환 → 복원 왕복, 그림 없는 복원, 서버 계약 모양 검사
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTemplate, fillTemplate, roundTrips, validateFreeHtml, normalizeFreeHtml, textsOf, fontNamesIn, xmlSafe } from '../core/freetpl.js';
import { renderAd } from '../core/renderers/ad.js';
import { registerAll } from '../core/generate.js';
import { SPECS } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const KV = 'data:image/png;base64,AAAAKV', LOGO = 'data:image/png;base64,BBBBLOGO';
const HTML = `<div data-ad="1" data-spec="x" data-free="1" style="width:300px;height:250px;position:relative;overflow:hidden;font-family:'Paperlogy',sans-serif;background:linear-gradient(135deg,#0A3D91,#11095F)">
<div data-object="1" style="position:absolute;right:0;bottom:0;width:140px;height:140px"><img data-kv="1" src="${KV}" alt="" style="width:100%;height:100%;object-fit:cover"/></div>
<div data-field="main" style="position:absolute;left:20px;top:24px;font-size:28px;font-weight:800;color:#fff">GS에너지<br/>2025년 신입 공채</div>
<div data-field="sub" style="position:absolute;left:20px;top:96px;font-size:14px;color:#fff">함께할 인재를 찾습니다 &amp; 더</div>
<div data-field="date" style="position:absolute;left:20px;top:120px;font-size:13px;color:#fff">6/20(금) - 7/2(수) 17시</div>
<img data-logo="1" src="${LOGO}" alt="" style="position:absolute;left:20px;bottom:20px;height:24px"/>
</div>`;

test('freetpl: 글자·키비주얼·로고를 자리표시로 바꾸고 되돌리면 원본과 같다', () => {
  const { tpl, texts, leftover } = toTemplate(HTML, { kv: KV, logo: LOGO });
  assert.ok(!tpl.includes(KV) && !tpl.includes(LOGO), '그림 data URL 이 틀에 남지 않는다');
  assert.ok(tpl.includes('src="{kv}"') && tpl.includes('src="{logo}"') && tpl.includes('>{main}<') && tpl.includes('>{sub}<') && tpl.includes('>{date}<'));
  assert.equal(leftover, 0);
  assert.equal(texts.main, 'GS에너지\n2025년 신입 공채', '줄바꿈은 \\n 으로');
  assert.equal(texts.sub, '함께할 인재를 찾습니다 & 더', '엔티티는 풀어서');
  assert.ok(roundTrips(HTML, { kv: KV, logo: LOGO }), '치환 → 복원 = 원본');
  assert.deepEqual(textsOf(fillTemplate(tpl, { texts: { main: 'A<b>', sub: '', date: 'D' }, kv: KV, logo: LOGO })), { main: 'A<b>', sub: '', date: 'D' }, '다른 글감으로 채우면 그 글감(태그는 글자로)');
});

test('freetpl: 그림이 없으면 img 를 빼고, 글감이 없으면 빈 칸으로 채운다', () => {
  const { tpl } = toTemplate(HTML, { kv: KV, logo: LOGO });
  const html = fillTemplate(tpl, { texts: { main: '메인' } });
  assert.ok(!html.includes('<img'), 'kv·logo 없음 → img 없음(깨진 그림 아이콘 방지)');
  assert.ok(!html.includes('{kv}') && !html.includes('{logo}') && !html.includes('{sub}'), '자리표시가 남지 않는다');
  assert.ok(html.includes('data-field="sub"'), '빈 역할도 data-field 는 남는다(검수기가 본다)');
  assert.deepEqual(fontNamesIn(html), ['Paperlogy']);
  // 렌더러 분기: style.free.tpl 이 있으면 틀을 그대로 채운다(규칙 렌더 안 거침) — texts 없으면 문구 사다리
  registerAll();
  const specId = Object.keys(SPECS).find(id => SPECS[id].channel === 'ad' && SPECS[id].w === 300 && SPECS[id].h === 250) ?? Object.keys(SPECS).find(id => SPECS[id].channel === 'ad');
  const ctx = createContext({ client: '테스트사', hiringType: '신입 공채', deadline: '2026-07-02', role: '영업' }, 'recruit');
  const style = { ...normalizeStyle({ colors: ['#0A3D91'], keyVisual: KV, logo: LOGO }), free: { id: 'f1', tpl } };   // 앱은 overrides.style 을 캠페인 스타일 위에 펼친다(normalizeStyle 은 모르는 키를 버린다)
  const out = renderAd(ctx, style, SPECS[specId]);
  assert.ok(out.includes('data-free="1"') && out.includes(KV) && out.includes(LOGO), '틀에 캠페인 그림이 들어간다');
  assert.match(textsOf(out).main, /테스트사/, '문구 사다리로 메인을 채운다');
});

test('freetpl: 서버 계약 모양 검사 — 루트·크기·금지 요소·글꼴, normalize 가 속성을 보장한다', () => {
  const ok = validateFreeHtml(HTML, { w: 300, h: 250, allowedFonts: ['Paperlogy', 'Pretendard'] });
  assert.ok(ok.ok, ok.errors.join(' / '));
  const bad = validateFreeHtml(HTML.replace('width:300px', 'width:320px').replace(/<\/div>$/, '<script>x()</script><img src="https://x/y.png"></div>'), { w: 300, h: 250, allowedFonts: ['Pretendard'] });
  assert.ok(!bad.ok);
  assert.ok(bad.errors.some(e => /320×250/.test(e)) && bad.errors.some(e => /script/.test(e)) && bad.errors.some(e => /http/.test(e)) && bad.errors.some(e => /Paperlogy/.test(e)), bad.errors.join(' / '));
  assert.ok(!validateFreeHtml('<div style="width:1px">x</div>', { w: 1, h: 1 }).ok, '루트 없음 → 실패');
  const n = normalizeFreeHtml('```html\n<div data-ad="1" style="width:10px;height:10px;background:#000">\n<div data-field="main">x</div></div>\n```', { specId: 'sp-1', w: 300, h: 250 });
  assert.ok(/^<div data-ad="1"[^>]*data-free="1"/.test(n) && /data-spec="sp-1"/.test(n) && /style="width:300px;height:250px;position:relative;overflow:hidden;background:#000"/.test(n) && !n.includes('```'), n.slice(0, 200));
  assert.ok(validateFreeHtml(n, { w: 300, h: 250 }).ok);
  // 내보내기(SVG foreignObject)용 XML 안전화 — 빈 태그 닫기, HTML 전용 엔티티, 맨 & — 그림 data URL 의 base64 는 손대지 않는다
  assert.equal(xmlSafe('<img src="data:image/png;base64,AB+/=" alt=""><br><b>A &amp; B & C&nbsp;D&#8230;</b>'), '<img src="data:image/png;base64,AB+/=" alt=""/><br/><b>A &amp; B &amp; C&#160;D&#8230;</b>');
});
