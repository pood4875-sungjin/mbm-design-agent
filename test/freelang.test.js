// 캠페인 디자인 언어(core/freelang.js, 11-09) — HTML 에서 지면·팔레트·모티프(SVG)·강조·글꼴·글자색 뽑기, 모델 LANGUAGE JSON 파싱(여러 줄·깨짐), 합치기, spread 프롬프트 문장.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languageFromHtml, parseLanguageBlock, mergeLanguage, languageOf, languageLines, colorsIn, outerAt } from '../core/freelang.js';

const H = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard';background:linear-gradient(135deg,#0B1440,#17296B)">
<svg style="position:absolute;left:0;top:0" width="580" height="400"><circle cx="500" cy="80" r="60" fill="#2A75CE"/><path d="M0 0L10 10" stroke="#FFD600"/></svg>
<div style="position:absolute;left:-40px;top:200px;width:200px;height:200px;border-radius:50%;background:radial-gradient(#2A75CE,rgba(42,117,206,0))"></div>
<div data-object="1" style="position:absolute;left:-10px;top:0;width:590px;height:400px;background:url('{{KV}}') center/cover no-repeat"></div>
<div data-field="main" style="position:absolute;left:38px;top:146px;font-size:40px;font-weight:800;color:#FFFFFF;text-align:left">마이다스 <span style="color:#FFD600">공개채용</span></div>
<div data-field="date" style="position:absolute;left:38px;top:270px;font-size:16px;color:#FFFFFF;font-family:'Gmarket Sans'"><span style="background:#2A75CE;color:#fff">모집기간</span>~10.12</div>
</div>`;

test('languageFromHtml — 지면 CSS·팔레트(많이 쓴 순)·SVG/도형 모티프·강조(태그 > 색)·글꼴·글자색·KV 처리', () => {
  const L = languageFromHtml(H, { composition: { id: 'motif', name: '그래픽 모티프 지면' } });
  assert.equal(L.source, 'html'); assert.equal(L.ground.css, 'linear-gradient(135deg,#0B1440,#17296B)'); assert.deepEqual(L.ground.colors, ['#0B1440', '#17296B']);
  assert.equal(L.palette[0], '#0B1440'); assert.ok(L.palette.includes('#2A75CE') && L.palette.includes('#FFFFFF'));
  assert.equal(L.motifs.length, 2); assert.equal(L.motifs[0].kind, 'svg'); assert.ok(L.motifs[0].svg.startsWith('<svg') && L.motifs[0].svg.endsWith('</svg>')); assert.equal(L.motifs[1].kind, 'shape'); assert.ok(/border-radius:50%/.test(L.motifs[1].css) && !/left:/.test(L.motifs[1].css));
  assert.equal(L.emphasis.kind, 'tag'); assert.equal(L.emphasis.color, '#2A75CE');
  assert.deepEqual(L.fonts.families.sort(), ['Gmarket Sans', 'Pretendard']); assert.equal(L.fonts.mainWeight, 800); assert.equal(L.fonts.align, 'left');
  assert.equal(L.textColors.main, '#FFFFFF'); assert.equal(L.kvTreatment.fit, 'cover'); assert.equal(L.kvTreatment.bleed, true); assert.equal(L.composition.id, 'motif');
  assert.ok(!JSON.stringify(L).includes('data:image'), 'dataURL 은 넣지 않는다');
  const noTag = languageFromHtml(H.replace('background:#2A75CE;color:#fff', 'color:#fff')); assert.equal(noTag.emphasis.kind, 'color'); assert.equal(noTag.emphasis.color, '#FFD600');
  assert.deepEqual(colorsIn('rgba(1,2,3,.5) #abc rgba(0,0,0,0)'), ['#AABBCC', '#010203']);
  assert.ok(outerAt(H, H.indexOf('<svg')).endsWith('</svg>'));
});

test('parseLanguageBlock — 한 줄·여러 줄 JSON, 문자열 안 괄호, 깨지면 null · mergeLanguage 는 모델 우선 + 빈 칸은 HTML', () => {
  const t1 = 'NOTES: x\nLANGUAGE: {"ground":"#111","palette":["#111","#FF5414"],"emphasis":{"kind":"color","color":"#FF5414"},"motifs":[{"note":"원 {반복}","svg":"<svg></svg>"}]}';
  const o = parseLanguageBlock(t1); assert.equal(o.ground, '#111'); assert.equal(o.motifs[0].note, '원 {반복}');
  assert.ok(parseLanguageBlock('LANGUAGE: {\n "palette": ["#000"],\n "fonts": {"families": ["Pretendard"]}\n}\n끝').fonts);
  assert.equal(parseLanguageBlock('LANGUAGE: {"a": '), null); assert.equal(parseLanguageBlock('없음'), null);
  const m = mergeLanguage(o, languageFromHtml(H)); assert.equal(m.source, 'mixed'); assert.equal(m.ground.css, '#111'); assert.deepEqual(m.palette, ['#111111', '#FF5414']); assert.equal(m.emphasis.kind, 'color'); assert.equal(m.fonts.mainWeight, 800, '모델이 안 준 칸은 HTML 에서'); assert.equal(m.motifs[0].kind, 'svg');
  const viaText = languageOf('```html\n' + H + '\n```\nNOTES: n\nLANGUAGE: {깨짐', H); assert.equal(viaText.source, 'html', '파싱 실패면 HTML 추출');
  const lines = languageLines(m).join('\n');
  for (const s of ['## 캠페인 디자인 언어', 'background: #111', '#FF5414', '<svg></svg>', '색 한 단어', 'Pretendard']) assert.ok(lines.includes(s), s);
  assert.deepEqual(languageLines(null), []);
});
