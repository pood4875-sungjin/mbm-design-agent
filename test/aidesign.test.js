// test/aidesign.test.js — 「AI 디자인」 칸(app/aidesign.js)의 순수 판단 + 가짜 서버(app/aidesign-stub.js). DOM·서버 없이.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiGate, isMoldSpec, etaText, fmtDur, freshVariants, isRejected, badgeOf, variantKey, stageIndex } from '../app/aidesign.js';
import { stubVariantHtml, stubQuick } from '../app/aidesign-stub.js';
import { validateFreeHtml, normalizeFreeHtml } from '../core/freetpl.js';

const H = { server: true, claudeCode: true, loggedIn: true, jobs: true };

test('칸 열기 판단 — 공개 앱·서버 없음·claude 없음·미로그인·옛 서버·규정 틀·키비주얼 없음 순서', () => {
  assert.equal(aiGate({ host: 'mbm.github.io', health: H }).kind, 'public');
  assert.equal(aiGate({ host: 'localhost', health: null }).kind, 'checking');
  assert.equal(aiGate({ host: 'localhost', health: { server: false } }).kind, 'noserver');
  assert.ok(aiGate({ health: { server: false } }).link, '설치 방법 링크');
  assert.equal(aiGate({ health: { ...H, claudeCode: false } }).kind, 'nocli');
  assert.equal(aiGate({ health: { ...H, loggedIn: false } }).kind, 'nologin');
  assert.equal(aiGate({ health: { ...H, loggedIn: null } }).kind, 'ok', 'loggedIn 모름(null)은 막지 않는다');
  assert.equal(aiGate({ health: { ...H, jobs: false } }).kind, 'oldserver');
  assert.equal(aiGate({ health: H, spec: { id: 'jasoseol-pc-main', medium: 'jasoseol' } }).kind, 'mold');
  const nokv = aiGate({ health: H, spec: { id: 'google-gdn-580x400', medium: 'google-gdn' }, hasKv: false });
  assert.equal(nokv.kind, 'nokv'); assert.equal(nokv.ok, true, '칸은 보이고 버튼만 막는다');
  assert.equal(aiGate({ health: H, spec: { id: 'google-gdn-580x400', medium: 'google-gdn' } }).ok, true);
});

test('규정 틀 매체 — 자소설·리멤버·카카오 비즈보드만', () => {
  assert.ok(isMoldSpec({ id: 'x', medium: 'jasoseol' }));
  assert.ok(isMoldSpec({ id: 'x', medium: 'remember' }));
  assert.ok(isMoldSpec({ id: 'kakao-bizboard-mo', medium: 'kakao' }));
  assert.ok(!isMoldSpec({ id: 'kakao-display-pc-promo', medium: 'kakao' }));
  assert.ok(!isMoldSpec({ id: 'google-gdn-580x400', medium: 'google-gdn' }));
  assert.ok(!isMoldSpec(null));
});

test('시간 줄 — 서버 etaMs 가 있으면 그 값, 없으면 모드별 목표(3안 4분·수정 1분)에서 경과를 뺀다', () => {
  assert.equal(fmtDur(45000), '45초'); assert.equal(fmtDur(72000), '1분 12초'); assert.equal(fmtDur(120000), '2분');
  const now = 1_000_000;
  assert.match(etaText({ mode: 'suggest', t0: now - 60000 }, now), /^1분 지남 · 남은 시간 ~3분$/);
  assert.match(etaText({ mode: 'suggest', t0: now - 60000, etaMs: 20000 }, now), /남은 시간 ~20초/);
  assert.match(etaText({ mode: 'revise', t0: now - 10000 }, now), /남은 시간 ~1분/);
  assert.match(etaText({ mode: 'suggest', t0: now - 300000 }, now), /곧 끝나요/, '목표를 넘기면 음수가 아니라 「곧」');
  assert.equal(stageIndex('design'), 1); assert.equal(stageIndex(undefined), -1, 'stage 없으면 단계 표시 없음');
});

test('도착분 — partial(끝난 순서) 먼저, result 는 중복 없이, partial 이 없으면 result 만', () => {
  const v = k => ({ id: k, html: `<div>${k}</div>`, style: { key: k } });
  const seen = new Set();
  const a = freshVariants({ partial: [v('b')] }, seen); assert.deepEqual(a.map(x => x.key), ['b']);
  seen.add('b');
  const b = freshVariants({ partial: [v('b'), v('a')], result: { variants: [v('a'), v('b'), v('c')], language: { motif: 'dots' } } }, seen);
  assert.deepEqual(b.map(x => x.key), ['a', 'c']);
  assert.deepEqual(b[1].vr.language, { motif: 'dots' }, 'result.language 를 안에 물려준다');
  const c = freshVariants({ result: { html: '<div>one</div>', notes: 'n' } }, new Set());
  assert.equal(c.length, 1); assert.equal(c[0].vr.html, '<div>one</div>', '옛 계약(html 하나)도 받는다');
  assert.equal(freshVariants({ status: 'running' }).length, 0);
  assert.equal(variantKey({ specId: 'gdn' }, 3), 'gdn'); assert.equal(variantKey({}, 3), '3');
});

test('가이드 위반 접기·배지 — rejected/valid false 는 카드로 안 올리고, 게이트 차단도 제외, 검수 필요는 경고', () => {
  assert.ok(isRejected({ rejected: true })); assert.ok(isRejected({ valid: { ok: false } })); assert.ok(!isRejected({ valid: { ok: true } }));
  assert.equal(badgeOf({ state: 'blocked' }), 'reject');
  assert.equal(badgeOf({ state: 'review', reasons: ['대비'] }), 'warn');
  assert.equal(badgeOf({ state: 'ready', reasons: [] }), 'pass');
  assert.equal(badgeOf({ state: 'draft', reasons: ['자유 배치'] }), 'pass', 'draft 의 등급 안내만 있으면 통과');
  assert.equal(badgeOf({ state: 'draft', reasons: ['자유 배치', '글자 수'] }), 'warn');
  assert.equal(badgeOf(null), 'pending');
});

test('가짜 서버 안 HTML — 자유 시안 계약(루트 크기·main·글꼴) 통과, 가로·세로·정사각 모두', () => {
  for (const [w, h] of [[580, 400], [1200, 628], [160, 600], [1080, 1080]]) {
    const html = normalizeFreeHtml(stubVariantHtml({ specId: 's', w, h, kv: 'data:image/png;base64,AAAA', logo: 'data:image/png;base64,BBBB', brief: { client: '마이다스', hiringType: '공개채용', startDate: '2026-10-01', deadline: '2026-10-31' } }, 'bright'), { specId: 's', w, h });
    const v = validateFreeHtml(html, { w, h, allowedFonts: ['Pretendard'] });
    assert.ok(v.ok, `${w}×${h}: ${v.errors.join(',')}`);
    assert.match(html, /10\.1 ~ 10\.31/);
  }
});

test('가짜 즉시 수정 — 해석되는 지시만 ok, 나머지는 ok:false(→ AI 수정)', () => {
  const html = stubVariantHtml({ specId: 's', w: 580, h: 400, brief: {} }, 'typo');
  const big = stubQuick(html, '메인 글자 더 크게');
  assert.ok(big.ok); const n0 = +html.match(/data-field="main" style="[^"]*?font-size:(\d+)px/)[1], n1 = +big.html.match(/data-field="main" style="[^"]*?font-size:(\d+)px/)[1];
  assert.ok(n1 > n0);
  assert.ok(stubQuick(html, '배경 밝게').ok);
  const no = stubQuick(html, '그래픽을 물결 패턴으로'); assert.equal(no.ok, false); assert.ok(no.reason);
});
