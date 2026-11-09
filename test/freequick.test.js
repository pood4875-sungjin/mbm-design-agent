// 즉시 수정(core/freequick.js, 11-09) — 한국어 지시 → HTML 직접 수정(LLM 없음). 지시 15개 이상 · 못 알아들으면 ok:false · 규격 규정(고정 글자색·로고 크기·금지 배경색) 거절 · 결과는 모양 검사 통과.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyQuick, parseClause, splitClauses, colorFrom, contrast } from '../core/freequick.js';
import { validateFreeHtml } from '../core/freetpl.js';
import { quickFix, handleFreeExtra } from '../server/freejobs.js';

const H = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard';background:linear-gradient(135deg,#0B1440,#17296B)">
<svg style="position:absolute;left:0;top:0" width="580" height="400"><circle cx="500" cy="80" r="60" fill="#2A75CE"/></svg>
<div data-object="1" style="position:absolute;left:300px;top:40px;width:260px;height:320px;background:url('data:image/png;base64,AAAA') center/contain no-repeat"></div>
<img data-logo="1" src="data:image/png;base64,BBBB" style="position:absolute;left:38px;top:34px;width:88px;height:24px">
<div data-field="sub" style="position:absolute;left:38px;top:118px;font-size:16px;line-height:22px;color:#fff">2025 하반기</div>
<div data-field="main" style="position:absolute;left:38px;top:146px;font-size:40px;line-height:48px;font-weight:700;color:#fff">마이다스<br>공개채용</div>
<div data-field="date" style="position:absolute;left:38px;top:270px;font-size:16px;line-height:24px;color:#fff"><span style="display:inline-block;width:70px;background:#fff;color:#111;font-size:13px">모집기간</span><span style="color:#fff">~10.12</span></div>
<div data-field="detail" style="position:absolute;left:38px;top:300px;font-size:16px;line-height:24px;color:#fff"><span style="display:inline-block;width:70px;background:#fff;color:#111;font-size:13px">모집직무</span><span style="color:#fff">엔지니어</span></div>
</div>`;
const field = (html, role) => new RegExp(`<div data-field="${role}"[^>]*>`).exec(html)[0];
const decl = (tag, p) => new RegExp(`(?:^|[;"])\\s*${p}\\s*:\\s*([^;"]+)`).exec(tag)?.[1]?.trim() ?? null;
const ok = (instr, opts) => { const r = applyQuick(H, instr, opts); assert.ok(r.ok, `${instr}: ${r.reason}`); assert.ok(validateFreeHtml(r.html, { w: 580, h: 400 }).ok); return r; };

test('글자 크기 — 메인 크게(+10%, 아래 글자 밀기) · 서브 작게 · 날짜 20% 크게 · 글자 전체 조금 크게 · 상세 많이 작게', () => {
  let r = ok('메인 글자 크게');
  assert.equal(decl(field(r.html, 'main'), 'font-size'), '44px'); assert.equal(decl(field(r.html, 'main'), 'line-height'), '52.8px');
  assert.equal(decl(field(r.html, 'date'), 'top'), '279.6px', '메인 2줄 × 48px × 10% 만큼 아래 글자를 민다'); assert.equal(decl(field(r.html, 'sub'), 'top'), '118px', '위 글자는 그대로');
  r = ok('서브 작게'); assert.equal(decl(field(r.html, 'sub'), 'font-size'), '14.5px');
  r = ok('날짜 20% 크게'); assert.equal(decl(field(r.html, 'date'), 'font-size'), '19.2px'); assert.ok(r.html.includes('width:84px'), '라벨 칩 폭도 같이'); assert.ok(r.html.includes('font-size:15.6px'));
  r = ok('글자 전체 조금 크게'); assert.equal(decl(field(r.html, 'main'), 'font-size'), '42px'); assert.equal(decl(field(r.html, 'sub'), 'font-size'), '16.8px');
  r = ok('상세 많이 작게'); assert.equal(decl(field(r.html, 'detail'), 'font-size'), '13.3px');
});

test('글자색 — 이름·hex·역할 지정 · 뱃지 글자색은 그대로 · 고정 글자색 규격은 거절', () => {
  let r = ok('글자색 노란색으로'); for (const f of ['main', 'sub', 'date']) assert.equal(decl(field(r.html, f), 'color'), '#FFD600'); assert.ok(r.html.includes('background:#fff;color:#111'), '뱃지 글자는 둔다');
  r = ok('메인 글자색 #ff5414'); assert.equal(decl(field(r.html, 'main'), 'color'), '#FF5414'); assert.equal(decl(field(r.html, 'sub'), 'color'), '#fff');
  r = ok('서브 색 하늘색'); assert.equal(decl(field(r.html, 'sub'), 'color'), '#4FC3F7');
  r = ok('메인 글자색 브랜드색으로', { brand: { primary: '#2a75ce' } }); assert.equal(decl(field(r.html, 'main'), 'color'), '#2A75CE');
  const no = applyQuick(H, '글자색 흰색으로', { rules: { textColors: { main: '#000000' } } }); assert.ok(!no.ok && /글자색 고정/.test(no.reason));
});

test('배경 — 밝게·어둡게(지면·장식 색만, 글자·그림은 그대로) · 단색 지정 · 금지 배경색 거절', () => {
  let r = ok('배경 밝게'); const bg = /background:linear-gradient\(135deg,(#[0-9A-F]{6}),/.exec(r.html)[1]; assert.ok(contrast(bg, '#000000') > contrast('#0B1440', '#000000'), bg); assert.ok(!r.html.includes('fill="#2A75CE"'), 'SVG 장식도'); assert.ok(r.html.includes("url('data:image/png;base64,AAAA')"));
  r = ok('배경 어둡게'); assert.ok(r.html.includes('linear-gradient(135deg,#09'), r.html.slice(0, 300));
  r = ok('배경 남색으로'); assert.ok(/data-ad="1"[^>]*background:#1A237E/.test(r.html) && !/data-ad="1"[^>]*linear-gradient/.test(r.html));
  const no = applyQuick(H, '배경 흰색으로', { rules: { backgroundBanned: ['#FFFFFF'] } }); assert.ok(!no.ok && /금지색/.test(no.reason));
});

test('로고·키비주얼 크기 · 정렬 3종 · 일정 강조/태그 · 여러 절 한 번에', () => {
  let r = ok('로고 크게'); assert.ok(/data-logo="1"[^>]*width:96.8px;height:26.4px/.test(r.html) && /left:38px;top:34px/.test(r.html), '모서리 기준');
  assert.ok(!applyQuick(H, '로고 크게', { rules: { logo: { w: 100, h: 30 } } }).ok, '로고 크기 고정 규격');
  r = ok('키비주얼 20% 크게'); assert.ok(/data-object="1" style="position:absolute;left:274px;top:8px;width:312px;height:384px/.test(r.html), '가운데 기준');
  r = ok('그림 작게'); assert.ok(/data-object="1"[^>]*width:236.4px/.test(r.html));
  r = ok('가운데 정렬'); for (const f of ['main', 'sub', 'date', 'detail']) { const t = field(r.html, f); assert.equal(decl(t, 'text-align'), 'center'); assert.equal(decl(t, 'width'), '504px'); }
  r = ok('오른쪽 정렬'); assert.equal(decl(field(r.html, 'main'), 'right'), '38px'); assert.equal(decl(field(r.html, 'main'), 'left'), null);
  r = ok('왼쪽으로 정렬'); assert.equal(decl(field(r.html, 'main'), 'text-align'), 'left');
  r = ok('일정 강조'); assert.equal(decl(field(r.html, 'date'), 'font-weight'), '800'); assert.equal(decl(field(r.html, 'date'), 'font-size'), '18.4px'); assert.ok(r.html.includes('background:#fff;color:#111;font-size:15px'), '뱃지는 굵기 안 바꿈');
  r = ok('일정을 태그로'); const t = field(r.html, 'date'); assert.equal(decl(t, 'background'), '#2A75CE', '장식에서 채도 높은 색'); assert.equal(decl(t, 'color'), '#FFFFFF'); assert.equal(decl(t, 'left'), '28px');
  r = ok('일정 태그로', { brand: { primary: '#FFD600' } }); assert.equal(decl(field(r.html, 'date'), 'color'), '#111111', '밝은 브랜드색이면 검정 글자');
  r = ok('메인 크게 하고 로고 작게, 배경 어둡게'); assert.equal(r.applied.length, 3); assert.deepEqual(r.applied.map(a => a.kind), ['size', 'logo', 'bg']);
});

test('못 알아들으면 ok:false(통째로) · 절 나누기 · 색 이름 · 가로형 정보 블록은 정렬 거절 · 서버 quick 라우트', async () => {
  for (const q of ['더 세련되게', '메인 크게 하고 분위기 고급스럽게', '', '배경에 패턴 넣어줘']) { const r = applyQuick(H, q); assert.equal(r.ok, false, q); assert.ok(r.reason); }
  assert.equal(applyQuick('<div>x</div>', '메인 크게').ok, false);
  assert.deepEqual(splitClauses('메인 크게 하고 서브 작게, 로고 크게 그리고 배경 밝게'), ['메인 크게', '서브 작게', '로고 크게', '배경 밝게']);
  assert.equal(colorFrom('빨간색'), '#E53935'); assert.equal(colorFrom('#abc'), '#AABBCC'); assert.equal(colorFrom('그냥'), null);
  assert.equal(parseClause('메인 크게').kind, 'size'); assert.equal(parseClause('가운데로').kind, 'align'); assert.equal(parseClause('사진 크게').kind, 'kv');
  const row = H.replace('left:38px;top:300px', 'left:240px;top:270px'); const r = applyQuick(row, '가운데 정렬'); assert.ok(!r.ok && /같은 줄/.test(r.reason));
  // 라우트
  const q = quickFix({ html: H, instruction: '메인 크게', specId: 'google-gdn-580x400' }); assert.ok(q.ok && q.ms >= 0 && q.applied[0].kind === 'size');
  const rem = quickFix({ html: H.replace('google-gdn-580x400', 'remember-main-top-pc'), instruction: '글자색 흰색', specId: 'remember-main-top-pc' }); assert.ok(!rem.ok && /글자색 고정/.test(rem.reason), '리멤버는 글자색 규정');
  const res = {}; const json = (r, c, b) => { r.code = c; r.body = b; };
  await handleFreeExtra({ method: 'POST', _body: { html: H, instruction: '로고 작게', specId: 'google-gdn-580x400' } }, res, { pathname: '/api/freedesign/quick' }, { json, readBody: req => Promise.resolve(Buffer.from(JSON.stringify(req._body))) });
  assert.equal(res.code, 200); assert.ok(res.body.ok && res.body.html.includes('width:80px'));
  assert.equal(await handleFreeExtra({ method: 'GET' }, {}, { pathname: '/api/other' }, { json }), false);
});
