// test/freedesign.test.js — 자유 디자인(server/freedesign.js): 프롬프트 조립·HTML 추출/검증·자리표시 치환·「AI 티」 검출·mock 엔진으로 재요청 흐름. claude 호출은 하지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFreePrompt, rulesForSpec, copyOptions, extractHtml, extractNotes, validateFreeHtml, substituteAssets, stripAssets, aiTellIssues, freeDesign, loadFreeRules, KV_PLACEHOLDER, LOGO_PLACEHOLDER } from '../server/freedesign.js';

const brief = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', role: '자유직무, 경영·제품·사업 분야', startDate: '2025-09-22', deadline: '2025-10-12', deadlineTime: '', slogan: '자소서 없는 간편지원', notice: '' };
const KV = 'data:image/png;base64,iVBORw0KGgo=', LOGO = 'data:image/png;base64,iVBORw0KGgoA';
const input = (specId, extra = {}) => ({ specId, brief, kv: { dataUrl: KV, meta: { kind: 'cutout', ar: 1.708, px: [2555, 1496], colors: ['#5F8AA3'], focus: { x: 0.5, y: 0.49, w: 0.94, h: 0.86 } } }, logo: { dataUrl: LOGO, tone: 'dark' }, brand: { primary: null }, rules: rulesForSpec(specId), history: [], prev: null, engine: 'claude-code', ...extra });
const goodGdn = (kv = KV, logo = LOGO) => `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard',sans-serif;background:linear-gradient(135deg,#0B1440,#17296B)">
<div data-object="1" style="position:absolute;right:-150px;top:28px;width:560px;height:350px;background:url('${kv}') center/contain no-repeat"></div>
<img data-logo="1" src="${logo}" style="position:absolute;left:38px;top:34px;width:88px">
<div data-field="sub" style="position:absolute;left:38px;top:118px;font-size:16px;letter-spacing:-0.01em">2025 하반기</div>
<div data-field="main" style="position:absolute;left:38px;top:146px;font-size:42px;font-weight:700;letter-spacing:-0.035em">마이다스<br>대규모 공개채용</div>
<div data-field="date" style="position:absolute;left:38px;top:270px;font-size:16px">모집기간 9.22(월) ~ 10.12(일)</div>
</div>`;

test('rulesForSpec — 계약 rules 모양: 리멤버는 Pretendard 고정·로고 불가·금지 배경색·글자색, 인스타는 로고 1', () => {
  const r = rulesForSpec('remember-main-top-pc');
  assert.equal(r.w, 2240); assert.equal(r.h, 360);
  assert.deepEqual(r.fonts.allowed, ['Pretendard']); assert.equal(r.fonts.required, 'Pretendard');
  assert.equal(r.logo.count, 0); assert.ok(r.logo.forbidden);
  assert.ok(r.backgroundBanned.includes('#FFFFFF')); assert.equal(r.textColors.main, '#000000');
  assert.deepEqual(r.textLimits.map(t => t.role), ['main', 'detail']);
  const i = rulesForSpec('instagram-feed-1080');
  assert.equal(i.logo.count, 1); assert.ok(i.fonts.allowed.length > 3); assert.equal(i.fonts.required, null);
  assert.throws(() => rulesForSpec('없는-규격'));
});

test('프롬프트 조립 — 규격·브리프 문구·KV 경로(Read)·자리표시·취향 규칙 문서·출력 형식이 들어간다', () => {
  const p = buildFreePrompt(input('google-gdn-580x400'), { images: { kv: '/tmp/x/kv.png', logo: '/tmp/x/logo.png' } });
  for (const s of ['580×400px', 'google-gdn-580x400', '「마이다스 대규모 공개채용」', '자소서 없는 간편지원', '/tmp/x/kv.png', 'Read', KV_PLACEHOLDER, LOGO_PLACEHOLDER, 'data-field="main|sub|date|detail|notice"', 'data-free="1"', 'NOTES:', '과거 통과 소재 131건']) assert.ok(p.includes(s), s);
  assert.ok(!p.includes(KV), 'dataURL 은 프롬프트에 넣지 않는다');
  const doc = loadFreeRules(); assert.ok(doc.length > 200 && p.includes(doc.slice(0, 80)), 'docs/freedesign-rules.md 본문이 그대로 들어간다');
  assert.ok(p.includes('AI 티'));
  const r = buildFreePrompt(input('remember-main-top-pc'), { images: { inline: true } });
  assert.ok(r.includes('Pretendard 고정') && r.includes('삽입 불가') && r.includes('#FF5414') && r.includes('첫 번째 이미지'));
  const fix = buildFreePrompt(input('google-gdn-580x400', { prev: { html: '<div data-ad="1">x</div>' }, history: [{ role: 'user', text: '글자 더 크게' }] }), { retryErrors: ['main 이 없음'] });
  assert.ok(fix.includes('수정 모드') && fix.includes('글자 더 크게') && fix.includes('main 이 없음'));
});

test('copyOptions — 사다리에서 역할별 문구(사용자 v2 예시의 「2025 하반기」 서브·「모집기간 ~」 날짜도 허용)', () => {
  const c = copyOptions(brief);
  assert.ok(c.main.includes('마이다스 대규모 공개채용') && c.sub.includes('2025 하반기') && c.date.some(d => d.startsWith('모집기간')) && c.detail.includes('모집직무 자유직무, 경영·제품·사업 분야'));
});

test('extractHtml/extractNotes — 코드펜스 안 루트 div 만, 뒤의 NOTES 분리', () => {
  const text = '설명\n```html\n' + goodGdn() + '\n```\nNOTES: 누끼를 오른쪽으로.';
  const h = extractHtml(text);
  assert.ok(h.startsWith('<div data-ad="1"') && h.endsWith('</div>') && !h.includes('NOTES'));
  assert.equal(extractNotes(text), '누끼를 오른쪽으로.');
  assert.equal(extractHtml('html 없음'), null);
});

test('치환 — {{KV}}/{{LOGO}} ↔ 실제 URL 왕복', () => {
  const raw = goodGdn(KV_PLACEHOLDER, LOGO_PLACEHOLDER);
  const sub = substituteAssets(raw, { kv: KV, logo: LOGO });
  assert.ok(sub.includes(KV) && sub.includes(LOGO) && !sub.includes('{{'));
  assert.equal(stripAssets(sub, { kv: KV, logo: LOGO }), raw);
});

test('검증 — 좋은 HTML 통과, 계약 위반(크기·역할 중복·외부 URL·지어낸 문구·로고 불가·글꼴·자리표시)은 사유 명시', () => {
  const inp = input('google-gdn-580x400');
  assert.deepEqual(validateFreeHtml(goodGdn(), inp).errors, []);
  const e1 = validateFreeHtml(goodGdn().replace('height:400px', 'height:401px').replace('<div data-field="sub"', '<div data-field="main"'), inp).errors;
  assert.ok(e1.some(e => /580×400/.test(e)) && e1.some(e => /main.*2개/.test(e)));
  const e2 = validateFreeHtml(goodGdn().replace('마이다스<br>대규모 공개채용', '지금 바로 지원하세요').replace("url('" + KV, "url('https://x.com/a.png"), inp).errors;
  assert.ok(e2.some(e => /외부 URL/.test(e)) && e2.some(e => /브리프 문구가 아님/.test(e)) && e2.some(e => /고객사 이름/.test(e)));
  const e3 = validateFreeHtml(goodGdn(KV_PLACEHOLDER), inp).errors; assert.ok(e3.some(e => /치환되지 않음/.test(e)));
  const e4 = validateFreeHtml(goodGdn().replace('2025 하반기', '{sub}'), inp).errors; assert.ok(e4.some(e => /자리표시/.test(e)));
  const rem = input('remember-main-top-pc');
  const remHtml = goodGdn().replace('google-gdn-580x400', 'remember-main-top-pc').replace('width:580px;height:400px', 'width:2240px;height:360px').replace("'Pretendard'", "'Kakao Big Sans'");
  const e5 = validateFreeHtml(remHtml, rem).errors;
  assert.ok(e5.some(e => /로고 삽입 불가/.test(e)) && e5.some(e => /Kakao Big Sans/.test(e)) && e5.some(e => /Pretendard 고정/.test(e)));
});

test('AI 티 검출(11-05 사용자: 자간·장평 둘뿐) — 양의 자간·scaleX·font-stretch 는 위반, uppercase·그라데이션 글자·유리 칩·블러·그림자·음수 자간은 자유', () => {
  const bad = '<div style="letter-spacing:0.12em;transform:scaleX(.9);font-stretch:condensed"></div>';
  assert.equal(aiTellIssues(bad).length, 2);
  assert.deepEqual(aiTellIssues('<div style="letter-spacing:-0.03em;letter-spacing:0;text-transform:uppercase;-webkit-background-clip:text;backdrop-filter:blur(8px);filter:blur(40px);box-shadow:0 2px 4px #000;transform:rotate(-14deg)"></div>'), []);
  const e = validateFreeHtml(goodGdn().replace('letter-spacing:-0.01em', 'letter-spacing:0.1em;transform:scaleX(.9)'), input('google-gdn-580x400')).errors;
  assert.ok(e.some(x => /AI 티 위반.*자간/.test(x)) && e.some(x => /장평/.test(x)));
});

test('freeDesign — mock 엔진: 1차 AI 티 위반 → 사유를 담아 1회 재요청 → 2차 통과(치환·notes·attempts)', async () => {
  const calls = [];
  const run = async (prompt) => {
    calls.push(prompt);
    const html = calls.length === 1 ? goodGdn(KV_PLACEHOLDER, LOGO_PLACEHOLDER).replace('letter-spacing:-0.01em', 'letter-spacing:0.1em') : goodGdn(KV_PLACEHOLDER, LOGO_PLACEHOLDER);
    return { text: '```html\n' + html + '\n```\nNOTES: 시도 ' + calls.length, usage: { input_tokens: 10, output_tokens: 5 }, model: 'mock' };
  };
  const out = await freeDesign(input('google-gdn-580x400'), { run });
  assert.equal(out.attempts, 2); assert.ok(out.ok); assert.deepEqual(out.errors, []);
  assert.ok(calls[1].includes('AI 티 위반') && calls[1].includes('다시 —'), '재요청 프롬프트에 사유');
  assert.ok(out.html.includes(KV) && out.html.includes(LOGO) && !out.html.includes('{{'));
  assert.equal(out.notes, '시도 2'); assert.equal(out.engine, 'claude-code'); assert.equal(out.model, 'mock');
  assert.deepEqual(out.usage, { input_tokens: 20, output_tokens: 10 });
  assert.ok(typeof out.ms === 'number');
  await assert.rejects(freeDesign(input('google-gdn-580x400'), { run: async () => ({ text: 'html 없음' }) }), /HTML 을 받지 못함/);
});
