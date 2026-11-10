// 11-10 파서·디자인 규칙 정리(docs/parser-rules.md) — 연도 한 번(D1): 채용 구분·타이틀에 시즌 연도가 이미 있으면 메인·서브에 시즌을 또 붙이지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyLadder } from '../core/renderers/ad.js';

const L = core => copyLadder({ kind: 'recruit', core });
const twice = s => (String(s).match(/20\d{2}/g) ?? []).length > 1;

test('공고명에 연도가 있으면 가로형 메인에 시즌을 또 붙이지 않는다', () => {
  const l = L({ client: '삼성전자', season: '2026년 하반기', hiringType: '2026년 하반기 3급 신입사원 채용' });
  for (const k of ['main', 'mainWide', 'mainNarrow']) for (const s of l[k]) assert.ok(!twice(s), `${k}: ${s}`);
  assert.ok(!l.sub.includes('2026년 하반기'), '메인에 연도가 있으니 서브에 시즌 없음');
  assert.equal(l.mainWide[0], '삼성전자 2026년 하반기 3급 신입사원 채용');
});

test('채용 구분에 연도가 없으면 그대로 — 가로형 메인 앞 시즌(서브엔 시즌 안 씀, 11-10 입력 개편)', () => {
  const l = L({ client: 'GS에너지', season: '2025년', hiringType: '신입 공채' });
  assert.equal(l.mainWide[0], '2025년 GS에너지 신입 공채');
  assert.ok(!l.sub.includes('2025년'));
});

test('결정 ②: 채용 구분에 든 직무는 상세·라벨에 또 안 씀', () => {
  const l = L({ client: '현대오일터미널 주식회사', hiringType: '생산전문직 채용', role: '생산전문직', deadline: '2026-11-08' });
  assert.ok(!l.details.some(d => d.label === '모집직무'));
  assert.ok(!l.label.some(t => /모집직무/.test(t)));
  const k = L({ client: 'GS에너지', hiringType: '신입 공채', role: '사업, 재무', deadline: '2026-07-02' });
  assert.ok(k.details.some(d => d.label === '모집직무' && d.value === '사업, 재무'));
});

test('파서 11-10: 회사 + 채용 구분만 · 전각 물결 · 월 생략 · 오후 · 마감일 라벨 · 목록 줄 · 자격 속 경력 · 체험형 인턴 모집', async () => {
  const { extractRecruit } = await import('../core/brief.js');
  const N = new Date(2026, 10, 10);
  assert.equal(extractRecruit('마이다스아이티 신입 채용, 11/1 ~ 11/15', N).client, '마이다스아이티');
  assert.equal(extractRecruit('마이다스아이티 신입 채용. 접수 11.1(일)～11.15(일)', N).deadline, '2026-11-15');
  const r = extractRecruit('마이다스아이티 신입 채용. 11월 1일부터 15일까지', N); assert.equal(r.startDate, '2026-11-01'); assert.equal(r.deadline, '2026-11-15');
  assert.equal(extractRecruit('마이다스아이티 신입 채용. 11월 1일(일) ~ 11월 15일(일) 오후 6시', N).deadlineTime, '18:00');
  assert.equal(extractRecruit('마이다스아이티 신입 채용. 서류접수 시작 11월 1일, 마감일: 11월 15일', N).deadline, '2026-11-15');
  assert.equal(extractRecruit('마이다스아이티 신입 채용\n모집분야\n- 영업\n- 연구개발\n접수 11/1 ~ 11/15', N).role, '영업, 연구개발');
  assert.equal(extractRecruit('마이다스아이티 채용 공고. 지원자격: 경력 3년 이상. 11/1 ~ 11/15', N).hiringType, undefined);
  assert.equal(extractRecruit('마이다스아이티 체험형 인턴 모집. 11/1 ~ 11/15. 모집분야: 마케팅', N).hiringType, '체험형 인턴 모집');
});

test('타이틀(headline)에 연도가 있으면 서브(회사·구분)에 시즌을 안 붙인다', () => {
  const l = L({ client: '한독', season: '2026', hiringType: '신입/경력', headline: '2026 한독 신입/경력 공채' });
  assert.deepEqual(l.main, ['2026 한독 신입/경력 공채']);
  for (const s of l.sub) assert.ok(!/2026/.test(s), s);
});

test('11-10 사용자 「응」: 자소설만 — 추가 문구가 비면 시즌을 서브로, 메인엔 연도 없음 · 메인에 연도가 있으면 서브 시즌 없음', async () => {
  const { createContext } = await import('../core/context.js');
  const { renderAd } = await import('../core/renderers/ad.js');
  const { adSpecEntries } = await import('../core/adspecs.js');
  const { normalizeStyle } = await import('../core/style.js');
  const S = adSpecEntries(), st = normalizeStyle({ colors: ['#1E5BE6'] });
  const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  const base = { client: '세아제강', season: '2026년 하반기', hiringType: '신입/경력사원', deadline: '2026-11-20' };
  const a = tr(renderAd(createContext(base, 'recruit'), st, S['jasoseol-pc-premium-popup-pc'])).copy;
  assert.equal(a.sub, '2026년 하반기'); assert.ok(!/2026/.test(a.main), a.main);
  const b = tr(renderAd(createContext({ ...base, hiringType: '2026년 하반기 신입 채용' }, 'recruit'), st, S['jasoseol-pc-premium-popup-pc'])).copy;
  assert.ok(!/2026/.test(String(b.sub ?? '')), String(b.sub));
  const g = tr(renderAd(createContext(base, 'recruit'), st, S['google-gdn-580x400'])).copy;
  assert.ok(!/하반기/.test(String(g.sub ?? '')), '자소설 밖은 서브에 시즌 안 씀');
});

test('11-10 AI 층 결정: 글자–키비주얼 10%·낱말 안 줄바꿈은 참고(반려 안 함) · 로고 폭 > 메인 × 2.4 는 ✗ + 자동 축소', async () => {
  const { typoAuditNorms } = await import('../core/typoaudit.js');
  const { fixLogoSize } = await import('../core/freequick.js');
  const rows = [{ role: 'main', px: 40, x: 40, y: 100, w: 300, h: 100, ink: { x: 40, y: 100, w: 300, h: 96 }, wb: true }];
  const far = typoAuditNorms({ W: 580, H: 400, rows, kv: { x: 520, y: 100, w: 50, h: 100 }, specId: 'google-gdn-580x400' });
  assert.ok(!far.fails.some(f => ['asset-loose', 'word-break'].includes(f.code)), JSON.stringify(far.fails));
  assert.ok(far.m.notes.some(n => /asset-loose/.test(n)) && far.m.notes.some(n => /word-break/.test(n)));
  const big = typoAuditNorms({ W: 580, H: 400, rows, logo: { x: 400, y: 20, w: 140, h: 30 }, specId: 'google-gdn-580x400' });
  assert.ok(big.fails.some(f => f.code === 'logo-big'));
  const ok = typoAuditNorms({ W: 580, H: 400, rows, logo: { x: 400, y: 20, w: 90, h: 20 }, specId: 'google-gdn-580x400' });
  assert.ok(!ok.fails.some(f => f.code === 'logo-big'));
  const html = '<div data-ad="1" style="position:relative;width:580px;height:400px;overflow:hidden"><img data-logo="1" src="x" style="position:absolute;right:20px;top:20px;width:140px"><div data-field="main" style="position:absolute;left:40px;top:100px;font-size:40px">A</div></div>';
  const r = fixLogoSize(html, { x: 420, y: 20, w: 140, h: 30 }, 96);
  assert.match(r.html, /width:96px/); assert.match(r.html, /right:20px/);
});

test('11-10 지면 = 그림 비중 색(질감·평평한 바탕 없는 그림) · 흰 로고여도 브랜드 딥보다 먼저 · 너무 어둡게 안 함', async () => {
  const { resolveField, kvShareColor } = await import('../core/field.js');
  const { normalizeStyle } = await import('../core/style.js');
  const tex = { kind: 'texture', opaque: 1, lum: 0.45, sat: 0.8, flatEdges: 0, edges: {} };
  const f = resolveField(normalizeStyle({ colors: ['#080858'], keyVisual: 'x.png', kvMeta: { field: tex, colors: ['#1F6CF3', '#042FA1'] }, logoTone: 'light' }));
  assert.equal(f.source, 'kv-share'); assert.equal(f.stops[0], '#1F6CF3');
  assert.equal(kvShareColor(['#87CAF9']), '#87CAF9', '밝은 하늘색은 진하게 안 바꾸고 그대로(글자를 어둡게)');
  assert.equal(kvShareColor(['#9A9A9A']), null, '무채색뿐이면 이 규칙 안 씀');
});
