// 11-15 노션 「레이아웃 가이드 문구별 세분화」 — 대상 매체는 줄마다 한 칸(틀 칸 폭 · 실제 줄 위치), 렌더 기록이 없으면 틀 값을 규격 크기로 환산
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { adSpecEntries } from '../core/adspecs.js';
import { guideBoxes, traceOfHtml, lineGuideTarget } from '../core/layoutguide.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const E = adSpecEntries();
const st = normalizeStyle({ colors: ['#1B6FD8'] });
const SHORT = createContext({ client: '예시기업', hiringType: '신입 채용', role: '서버 개발', deadline: '2026-11-30' }, 'recruit');
const LONG = createContext({ client: '예시첨단산업진흥재단', hiringType: '예시 아카데미 5기 교육생 모집', role: 'SW개발, AI, ML, 보안위협분석, DevOps, QA, IT인프라운영, SRE', startDate: '2026-11-06', deadline: '2026-12-17' }, 'recruit');
const boxesOf = (id, ctx) => { const html = renderArtifact(id, ctx, st, {}); return { boxes: guideBoxes(E[id], traceOfHtml(html)), trace: traceOfHtml(html) }; };
const lines = (b, role) => b.filter(x => x.kind === 'line' && x.role === role);

test('대상 매체만 줄 띠: 네이버 모바일 DA·리멤버·자소설·잡다·카카오 비즈보드·에브리타임 커뮤니티 보드/홈 배너 — 구글 GDN·블라인드는 예전 칸', () => {
  for (const id of ['naver-gfa-mobile-da-1250x560', 'remember-main-top-pc', 'jasoseol-pc-calendar-pc', 'jobda-main-mo', 'kakao-bizboard-mo', 'nap-dsp-bizboard-960x300', 'everytime-community-board', 'everytime-home-banner']) assert.ok(lineGuideTarget(E[id]), id);
  for (const id of ['google-gdn-580x400', 'blind-feed-image', 'everytime-home-card-image', 'catch-mainlarge-image-pc']) assert.ok(!lineGuideTarget(E[id]), id);
  const g = boxesOf('google-gdn-580x400', SHORT).boxes;
  assert.ok(g.some(b => b.kind === 'text') && !g.some(b => b.kind === 'line'));
});

test('자소설 PC채용공고 160×600: 줄마다 한 칸, 칸 폭 = 틀 칸 130, 줄 수 = 실제 줄(최대 칸 아님), 이름표는 역할 첫 줄에만', () => {
  const { boxes, trace } = boxesOf('jasoseol-pc-standard-jobpost-pc', SHORT);
  for (const role of ['main', 'detail']) {
    const L = lines(boxes, role), n = trace.textBox.rows.filter(r => r.role === role).length;
    assert.equal(L.length, n, role); assert.ok(L.every(b => b.x === 15 && b.w === 130), JSON.stringify(L));
    assert.ok(L[0].label && L.slice(1).every(b => !b.label));
  }
  assert.ok(lines(boxes, 'main').length < 4, '최대 4줄 칸이 아니라 실제 줄');
  const m = lines(boxes, 'main'); for (let i = 1; i < m.length; i++) assert.ok(m[i].y >= m[i - 1].y + m[i - 1].h, '줄 띠가 서로 겹치지 않는다');
});

test('자소설 PC메인·M메인: 메인 2줄이면 상세 첫 줄은 메인 아래 다음 칸(가이드에서 사라지지 않고 메인과 겹치지 않는다)', () => {
  for (const id of ['jasoseol-pc-standard-main-pc', 'jasoseol-m-standard-main-mo']) {
    const { boxes } = boxesOf(id, SHORT);
    const m = lines(boxes, 'main'), d = lines(boxes, 'detail');
    assert.equal(m.length, 2, id); assert.ok(d.length >= 1, id);
    assert.ok(d[0].y >= m[1].y + m[1].h, `${id} 상세 ${d[0].y} · 메인 끝 ${m[1].y + m[1].h}`);
  }
  // PC메인 상세 틀 행 166/195/225 중 메인 2줄이면 195부터 — 줄 띠 가운데가 195 칸(높이 21) 가운데 근처
  const d = lines(boxesOf('jasoseol-pc-standard-main-pc', SHORT).boxes, 'detail');
  assert.ok(Math.abs((d[0].y + d[0].h / 2) - (195 + 10.5)) < 6, JSON.stringify(d[0]));
});

test('자소설 M팝업: 메인 2줄이면 상세가 틀 404.9 줄(1줄이면 335)에서 시작 — 산출물과 같은 위치', () => {
  const d = lines(boxesOf('jasoseol-m-premium-popup-mo', LONG).boxes, 'detail');
  assert.ok(Math.abs((d[0].y + d[0].h / 2) - (404.9 + 15.5)) < 8, JSON.stringify(d[0]));
});

test('자소설 PC달력 164×233: 메인 줄마다 + 날짜 칸, 전부 규격 안 · 렌더 기록이 없어도 328×466 틀 값을 반으로 환산', () => {
  const { boxes } = boxesOf('jasoseol-pc-calendar-pc', LONG);
  assert.ok(lines(boxes, 'main').length >= 2 && lines(boxes, 'date').length === 1);
  for (const b of boxes) assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 164.5 && b.y + b.h <= 233.5, JSON.stringify(b));
  const raw = guideBoxes(E['jasoseol-pc-calendar-pc'], null);
  const m = lines(raw, 'main'); assert.equal(m.length, 4);
  assert.ok(Math.abs(m[0].y - 19.45) < 0.2 && m[0].x === 26, JSON.stringify(m[0]));
  for (const b of raw) assert.ok(b.y + b.h <= 233.5, JSON.stringify(b));
});

test('잡다 PC 태그 칩 행도 칸 x 가 있다(메인 칸을 빌림) · 비즈보드 키비주얼 왼쪽이면 그림 칸도 실제 위치', () => {
  const t = lines(boxesOf('jobda-main-pc', LONG).boxes, 'tags');
  assert.equal(t.length, 1); assert.ok(Number.isFinite(t[0].x) && t[0].x === 50, JSON.stringify(t[0]));
  const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const html = renderArtifact('kakao-bizboard-mo', SHORT, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: { kind: 'object', field: { opaque: 0 } }, kvPlace: 'left' }), {});
  const img = guideBoxes(E['kakao-bizboard-mo'], traceOfHtml(html)).find(b => b.kind === 'image');
  const tr = traceOfHtml(html);
  if (tr?.mold?.image) assert.equal(img.x, tr.mold.image.x);
});
