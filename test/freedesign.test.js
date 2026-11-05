// test/freedesign.test.js — 자유 디자인(server/freedesign.js): 프롬프트 조립·HTML 추출/검증·자리표시 치환·「AI 티」 검출·mock 엔진으로 재요청 흐름. claude 호출은 하지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFreePrompt, rulesForSpec, copyOptions, extractHtml, extractNotes, validateFreeHtml, substituteAssets, stripAssets, aiTellIssues, freeDesign, loadFreeRules, KV_PLACEHOLDER, LOGO_PLACEHOLDER, infoBlockIssues, infoLabelOf, INFO_PRESETS, STYLE_DIRECTIONS, DEFAULT_STYLES, typoRuleLines, buildReviewPrompt, extractIssues, REVIEW_CHECKLIST } from '../server/freedesign.js';
import { typoAuditNorms, typoNormsFor } from '../core/typoaudit.js';

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
  const out = await freeDesign(input('google-gdn-580x400', { styles: ['typo'], review: false }), { run });
  assert.equal(out.attempts, 2); assert.equal(out.variants.length, 1); assert.equal(out.variants[0].style.id, 'typo'); assert.equal(out.review, null); assert.ok(out.ok); assert.deepEqual(out.errors, []);
  assert.ok(calls[1].includes('AI 티 위반') && calls[1].includes('다시 —'), '재요청 프롬프트에 사유');
  assert.ok(out.html.includes(KV) && out.html.includes(LOGO) && !out.html.includes('{{'));
  assert.equal(out.notes, '시도 2'); assert.equal(out.engine, 'claude-code'); assert.equal(out.model, 'mock');
  assert.deepEqual(out.usage, { input_tokens: 20, output_tokens: 10 });
  assert.ok(typeof out.ms === 'number');
  await assert.rejects(freeDesign(input('google-gdn-580x400', { review: false }), { run: async () => ({ text: 'html 없음' }) }), /HTML 을 받지 못함/);
});

test('프롬프트 — 스타일 방향·정보 블록 프리셋 3종·4항 간격 규칙(규격 수치)·참고 분포가 들어간다', () => {
  assert.deepEqual(DEFAULT_STYLES, ['typo', 'bright', 'dark']); assert.ok(STYLE_DIRECTIONS.length >= 6 && STYLE_DIRECTIONS.every(s => s.id && s.name && s.hint));
  const p = buildFreePrompt(input('google-gdn-580x400'), { images: { kv: '/tmp/x/kv.png' }, style: 'dark' });
  assert.ok(p.includes('## 스타일 방향: 어두운 비주얼형(dark)') && p.includes('스크림'));
  for (const pr of INFO_PRESETS) assert.ok(p.includes(pr.html) && p.includes(pr.name), pr.id);
  assert.ok(p.includes('서브→메인 ≥ 0.3em') && p.includes('정보 블록 행 ≥ 0.6em') && p.includes('참고 분포(검증하지 않음') && p.includes('규격 분포 n=131'));
  const lines = typoRuleLines('jasoseol-pc-premium-popup-pc', rulesForSpec('jasoseol-pc-premium-popup-pc')); assert.ok(lines.join('\n').includes('전 규격 합산 중앙값'));
  const N = typoNormsFor('google-gdn-580x400'); assert.equal(N.gap.hi, 0.996); assert.equal(N.padL.lo, 0.06);
});

test('infoBlockIssues — 라벨 섞임 ✗(뱃지+볼드) · 행 간격 ✗(렌더 측정 0.6배 미만) · 한 규칙 ✓(둘 다 뱃지·같은 폭·같은 값 x·간격 넉넉)', () => {
  const badge = (role, t) => `<div data-field="${role}" style="font-size:20px"><span style="background:#111;color:#fff;font-weight:700">${t[0]}</span>${t[1]}</div>`;
  const bold = (role, t) => `<div data-field="${role}" style="font-size:20px"><b style="font-weight:700">${t[0]}</b>${t[1]}</div>`;
  const mixed = badge('date', ['모집기간', '~10.31(토)']) + bold('detail', ['모집직무', '엔지니어']);
  const r1 = infoBlockIssues(mixed);
  assert.ok(!r1.ok && r1.issues.length === 1 && /라벨 스타일 섞임.*date=뱃지.*detail=볼드 라벨/.test(r1.issues[0]), r1.issues.join());
  assert.equal(infoLabelOf('<b>모집직무</b>x').kind, '볼드 라벨'); assert.equal(infoLabelOf('<span style="border-left:1px solid #000">모집직무</span>x').kind, '구분선'); assert.equal(infoLabelOf('모집직무 x'), null);
  const same = badge('date', ['모집기간', '~10.31(토)']) + badge('detail', ['모집직무', '엔지니어']);
  const free = (gap, lw2 = 70, vx2 = 100) => ({ free: { fields: {
    date: { fontPx: 20, ink: { x: 40, y: 200, w: 300, h: 26 }, label: { bbox: { x: 40, y: 200, w: 70, h: 26 }, bg: true, weight: 700, border: false }, valueX: 100 },
    detail: { fontPx: 20, ink: { x: 40, y: 226 + gap, w: 300, h: 26 }, label: { bbox: { x: 40, y: 226 + gap, w: lw2, h: 26 }, bg: true, weight: 700, border: false }, valueX: vx2 } } } });
  const r2 = infoBlockIssues(same, free(6));
  assert.ok(!r2.ok && r2.issues.length === 1 && /행 간격 date→detail 6px < 글자 0.6배\(12px\)/.test(r2.issues[0]), r2.issues.join());
  const r3 = infoBlockIssues(same, free(14));
  assert.ok(r3.ok && r3.issues.length === 0 && r3.labels.every(l => l.kind === '뱃지'), r3.issues.join());
  const r4 = infoBlockIssues(same, free(14, 90, 120)); assert.ok(r4.issues.some(i => /라벨 폭 다름/.test(i)) && r4.issues.some(i => /값 시작 x 다름/.test(i)));
  assert.ok(infoBlockIssues(badge('date', ['모집기간', '~10.31'])).ok, 'date 하나면 통과');
});

test('typoAuditNorms(4항, 간격만) — 붙음·벙벙·그림 겹침·잘림은 ✗, 여백·메인 크기·r2 는 참고값(m)만', () => {
  const W = 580, H = 400;
  const rows = [
    { role: 'sub', px: 20, lines: 1, x: 34, y: 84, w: 300, h: 24, ink: { x: 34, y: 84, w: 200, h: 24 } },
    { role: 'main', px: 46, lines: 2, x: 34, y: 116, w: 420, h: 100, ink: { x: 34, y: 116, w: 400, h: 100 } },
    { role: 'date', px: 17, lines: 1, x: 34, y: 232, w: 300, h: 22, ink: { x: 34, y: 232, w: 250, h: 22 } },
    { role: 'detail', px: 13, lines: 1, x: 34, y: 262, w: 300, h: 18, ink: { x: 34, y: 262, w: 250, h: 18 } },
  ];
  const ok = typoAuditNorms({ W, H, rows, specId: 'google-gdn-580x400', logo: { x: 34, y: 30, w: 90, h: 25 }, kv: { x: 460, y: 150, w: 120, h: 250 } });
  assert.deepEqual(ok.fails, []); assert.equal(ok.m.padL, 0.085); assert.ok(ok.m.r2 === 0.435 && ok.m.gaps['main>date'] === 16);
  // 붙음: 메인→date 5px(<0.8×17=13.6) · 벙벙: date→detail 60px(>0.996×46) · 그림 겹침 · 잘림
  const bad = rows.map(r => ({ ...r })); bad[2].y = 221; bad[2].ink = { ...bad[2].ink, y: 221 }; bad[3].y = 303; bad[3].ink = { ...bad[3].ink, y: 303 }; bad[0].clip = true;
  const r = typoAuditNorms({ W, H, rows: bad, specId: 'google-gdn-580x400', kv: { x: 200, y: 250, w: 200, h: 150 } });
  const codes = r.fails.map(f => f.code);
  assert.ok(codes.includes('gap-tight') && codes.includes('gap-loose') && codes.includes('kv-overlap') && codes.includes('clip'), codes.join());
  // 여백이 분포 밖이어도 fail 아님(참고값)
  const far = rows.map(r => ({ ...r, x: r.x + 100, ink: { ...r.ink, x: r.ink.x + 100 } }));
  assert.ok(typoAuditNorms({ W, H, rows: far, specId: 'google-gdn-580x400' }).ok);
});

test('freeDesign — 3방향 × 자기 검토(mock): 방향마다 생성 1회 + 검토 1회, 검증기 자동 지적이 검토 프롬프트에, 고친 HTML 채택(review.fixed) · 검토가 「없음」이면 fixed:false', async () => {
  const calls = [];
  const run = async (prompt) => {
    calls.push(prompt);
    if (/자기 검토/.test(prompt)) {
      const dark = /방향 어두운 비주얼형/.test(prompt);
      return { text: dark ? 'ISSUES: 없음\nNOTES: 그대로' : 'ISSUES:\n- 날짜·직무 라벨이 섞임\n- 메인→날짜 붙음\n```html\n' + goodGdn(KV_PLACEHOLDER, LOGO_PLACEHOLDER).replace('top:270px', 'top:280px') + '\n```\nNOTES: 간격 손봄', usage: { input_tokens: 3, output_tokens: 1 }, model: 'mock' };
    }
    return { text: '```html\n' + goodGdn(KV_PLACEHOLDER, LOGO_PLACEHOLDER) + '\n```\nNOTES: 초안', usage: { input_tokens: 10, output_tokens: 5 }, model: 'mock' };
  };
  const renders = [];
  const render = async (html, dir) => { renders.push(dir.id); return { png: null, measure: null, free: null, auto: ['3항 라벨 스타일 섞임: date=뱃지 · detail=볼드 라벨'] }; };
  const out = await freeDesign(input('google-gdn-580x400'), { run, render });
  assert.equal(out.variants.length, 3); assert.deepEqual(out.variants.map(v => v.style.id), ['typo', 'bright', 'dark']); assert.deepEqual(renders, ['typo', 'bright', 'dark']);
  assert.equal(calls.length, 6, '방향 3 × (생성 1 + 검토 1)');
  assert.ok(calls[0].includes('타이포 강조형') && calls[2].includes('밝은 비주얼형') && calls[4].includes('어두운 비주얼형'));
  for (const c of REVIEW_CHECKLIST) assert.ok(calls[1].includes(c));
  assert.ok(calls[1].includes('검증기가 이미 잡은 것') && calls[1].includes('라벨 스타일 섞임') && calls[1].includes('## 현재 HTML') && calls[1].includes(KV_PLACEHOLDER));
  const v0 = out.variants[0];
  assert.deepEqual(v0.review.issues, ['날짜·직무 라벨이 섞임', '메인→날짜 붙음']); assert.equal(v0.review.fixed, true); assert.ok(v0.html.includes('top:280px') && v0.html.includes(KV)); assert.equal(v0.notes, '간격 손봄');
  assert.deepEqual(v0.review.auto, ['3항 라벨 스타일 섞임: date=뱃지 · detail=볼드 라벨']);
  const v2 = out.variants[2]; assert.deepEqual(v2.review.issues, []); assert.equal(v2.review.fixed, false); assert.ok(v2.html.includes('top:270px'));
  assert.equal(out.html, v0.html); assert.equal(out.review, v0.review); assert.deepEqual(out.usage, { input_tokens: 39, output_tokens: 18 });
  assert.deepEqual(extractIssues('ISSUES: 없음'), []); assert.deepEqual(extractIssues('ISSUES:\n- a\n- b\nNOTES: x'), ['a', 'b']);
  const rp = buildReviewPrompt(input('google-gdn-580x400'), { html: '<div data-ad="1"></div>', png: '/tmp/r.png', auto: [], style: 'typo' });
  assert.ok(rp.includes('/tmp/r.png') && rp.includes('Read') && rp.includes('ISSUES: 없음'));
});
