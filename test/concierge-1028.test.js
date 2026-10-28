// 10-28 컨시어지 요청(Notion 「마케팅 에이전트 대시보드」, docs/concierge-requests-2026-10-28.md) — 렌더러 글자·틀 검사 5건
//   #1 긴 기업명(한희하) · #3 리멤버 PC-MO 메인 통일 · #10 자소설 라벨 통일 · #9 자소설 틀 실측 게이트 · #2 소재 이미지 크롭·녹임(김혜원)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd, copyLadder, syllableChunks, softBreakLong, sharedMainMedium } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { estimateLines } from '../core/adfields.js';
import { subjectCrop } from '../core/field.js';
import { CANON } from '../core/canon.js';
import { approvalGate } from '../core/gate.js';
import { MOLD_RULES, evaluate, blockingRows, MOLD_TOL } from '../core/guidecheck.js';
import { specOf } from '../core/media.js';

const specs = adSpecEntries();
const style = normalizeStyle({ colors: ['#0B3C8C'] });
const strip = s => s.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/[⁠​]/g, '').replace(/ /g, ' ').replace(/&amp;/g, '&').trim();
const fieldOf = (html, role) => { const m = html.match(new RegExp(`<div data-field="${role}"[^>]*>([\\s\\S]*?)</div>`)); return m ? strip(m[1]) : ''; };
const rulesOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')).rules;
const ctxOf = f => createContext(f, 'recruit');

const HANMI = { client: '한미글로벌&터너앤타운젠드코리아', hiringType: '신입/경력 채용', role: 'CM/PM', deadline: '2026-11-10', season: '2026 하반기' };
const HDOIL = { client: '현대오일터미널 주식회사', hiringType: '', role: '생산전문직', deadline: '2026-11-05' };
const ICN = { client: '인천국제공항보안', hiringType: '일반직 채용', role: '보안검색', deadline: '2026-11-02' };
const PSK = { client: '피에스케이', hiringType: '전문연구요원', role: '연구개발', deadline: '2026-10-27' };

test('#1 긴 기업명 — 띄어쓰기 없는 16자 「한미글로벌&터너앤타운젠드코리아」가 GDN·잡다 MO·리멤버·달력에서 통째로 생략되지 않는다(줄바꿈·줄임이 먼저, 생략은 마지막)', () => {
  const ctx = ctxOf(HANMI);
  for (const id of ['google-gdn-300x600', 'google-gdn-970x250', 'google-gdn-580x400', 'jobda-main-mo', 'jasoseol-pc-calendar-pc', 'remember-job-side-pc', 'remember-main-top-mo']) {
    const main = fieldOf(renderAd(ctx, style, specs[id]), 'main');
    assert.ok(main.includes('한미글로벌&터너앤타운젠드코리아'), `${id}: 메인에 기업명 — 「${main}」`);
  }
  // GDN 300×600 2줄 틀: 기업명 + 채용구분(한 줄 더 · 줄임) — 채용구분까지 남는다
  const g = renderAd(ctx, style, specs['google-gdn-300x600']);
  assert.match(fieldOf(g, 'main'), /신입\/경력 채용/); assert.ok(rulesOf(g).includes('templateMold.mainExtraLine') || rulesOf(g).includes('templateMold.mainShrink'));
  // 음절 줄바꿈 자리(U+200B)가 긴 낱말 안에 — & 뒤가 먼저
  assert.match(g, /한미글로벌&amp;\u200B터너앤타운/, '& 뒤 줄바꿈 자리(U+200B)');
});

test('#1 (a) 음절 덩어리 — syllableChunks 고른 길이 · softBreakLong 은 빗금·& 뒤 우선 · estimateLines 는 적어 둔 줄바꿈을 센다', () => {
  assert.deepEqual(syllableChunks('터너앤타운젠드코리아', 6), ['터너앤타운', '젠드코리아']);
  assert.deepEqual(syllableChunks('도레이첨단소재', 6), ['도레이첨', '단소재']);
  assert.equal(softBreakLong('한미글로벌&터너앤타운젠드코리아 채용', 9), '한미글로벌&​터너앤타운​젠드코리아 채용');
  assert.equal(softBreakLong('세아제강 채용', 9), '세아제강 채용');
  assert.equal(estimateLines('한미글로벌&터너앤타운젠드코리아\n채용', 10), 3);
  assert.equal(estimateLines('세아제강\n신입/경력사원 채용', 15), 2);
});

test('#1 (b) 자소설 PC채용공고 160×600 기업명 글자수 기준(mold.clientLen): 6자 이하 메인 두 줄 · 7~8·10~15자 서브로 · 9·16자↑ 생략(로고가 대신)', () => {
  const sp = specs['jasoseol-pc-premium-jobpost-pc'];
  assert.deepEqual(specOf('jasoseol-pc-standard-jobpost-pc').safeArea.measuredFromTemplate.mold.clientLen, sp.rules.safeArea.measuredFromTemplate.mold.clientLen);
  const run = client => { const h = renderAd(ctxOf({ client, hiringType: '신입/경력 채용', role: '영업', deadline: '2026-11-20', season: '2026 하반기' }), style, sp); return { main: fieldOf(h, 'main'), sub: fieldOf(h, 'sub'), rules: rulesOf(h) }; };
  const r4 = run('세아제강'); assert.equal(r4.main, '세아제강\n신입/경력 채용'); assert.equal(r4.sub, '2026 하반기');
  const r8 = run('인천국제공항보안'); assert.equal(r8.main, '신입/경력 채용'); assert.ok(r8.sub.includes('인천국제공항보안'), r8.sub); assert.ok(r8.rules.includes('templateMold.clientToSub'));
  const r9 = run('인천국제공항보안공'); assert.equal(r9.main, '신입/경력 채용'); assert.ok(!r9.sub.includes('인천국제공항보안공')); assert.ok(r9.rules.includes('templateMold.clientDropped'));
  const r12 = run('현대오일터미널 주식회사'); assert.equal(r12.main, '신입/경력 채용'); assert.ok(r12.sub.includes('현대오일터미널'), r12.sub);
  const r16 = run('한미글로벌&터너앤타운젠드코리아'); assert.equal(r16.main, '신입/경력 채용'); assert.equal(r16.sub, '2026 하반기'); assert.ok(r16.rules.includes('templateMold.clientDropped'));
});

test('#1 (d) 채용 구분이 비면 「채용」을 지어 넣지 않는다 — 「현대오일터미널 주식회사」 그대로, 직무도 「생산전문직」(채용 없이). 고용형태가 있으면 「정규직 채용」은 그대로', () => {
  const L = copyLadder(ctxOf(HDOIL));
  assert.equal(L.main[0], '현대오일터미널 주식회사'); assert.ok(!L.main.some(c => /^현대오일터미널 주식회사 채용$/.test(c)) && L.main.includes('생산전문직'));
  for (const id of ['jasoseol-pc-standard-main-pc', 'google-gdn-300x600', 'jasoseol-pc-calendar-pc']) assert.doesNotMatch(fieldOf(renderAd(ctxOf(HDOIL), style, specs[id]), 'main'), /채용/, id);
  assert.equal(fieldOf(renderAd(ctxOf(HDOIL), style, specs['jasoseol-pc-premium-jobpost-pc']), 'main'), '생산전문직');
  assert.equal(copyLadder(ctxOf({ client: 'A', employType: '정규직' })).main[0], 'A 정규직 채용');
  // 사례: 인천국제공항보안(8자)·피에스케이 — 채용구분이 있으면 그대로
  assert.equal(fieldOf(renderAd(ctxOf(ICN), style, specs['jasoseol-pc-standard-main-pc']), 'main'), '인천국제공항보안\n일반직 채용');
  assert.equal(fieldOf(renderAd(ctxOf(PSK), style, specs['jasoseol-pc-premium-jobpost-pc']), 'main'), '피에스케이\n전문연구요원 채용');
});

test('#3 리멤버 PC-MO 메인 통일 — 매체 규정 「PC와 동일한 문구」를 읽어 캠페인 공통 메인 한 벌(낱말 동일, 줄바꿈만 다름). 다른 매체는 그대로', () => {
  assert.ok(sharedMainMedium(specs['remember-job-side-pc'].mediumRules)); assert.ok(!sharedMainMedium(specs['jasoseol-pc-premium-popup-pc'].mediumRules));
  const REM = ['remember-main-top-pc', 'remember-main-top-mo', 'remember-main-mid-pc', 'remember-main-mid-mo', 'remember-job-top-pc', 'remember-job-top-mo', 'remember-job-side-pc', 'remember-job-side-mo'];
  for (const f of [HANMI, ICN, PSK, { client: '세아제강', hiringType: '신입/경력사원 채용', deadline: '2026-11-20', season: '2026 하반기' }]) {
    const ctx = ctxOf(f);
    const mains = REM.map(id => { const h = renderAd(ctx, style, specs[id]); assert.ok(rulesOf(h).includes('sharedMainCopy'), id); return fieldOf(h, 'main').replace(/\n/g, ' '); });
    assert.equal(new Set(mains).size, 1, `${f.client}: ${JSON.stringify(mains)}`);
    assert.ok(mains[0].includes(f.client), mains[0]);
  }
});

test('#10 자소설 텍스트 통일 — 캠페인 안 모든 자소설 규격 라벨·기호 「모집일정 : 」「모집직무 : 」(PC메인 「채용일정」·M메인 「ㅣ」 폐지)', () => {
  const ctx = ctxOf({ client: '세아제강', hiringType: '신입/경력사원 채용', role: '영업, 생산', startDate: '2026-11-01', deadline: '2026-11-20', season: '2026 하반기' });
  for (const id of ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-standard-main-pc', 'jasoseol-m-premium-popup-mo', 'jasoseol-m-standard-main-mo']) {
    const h = renderAd(ctx, style, specs[id]);
    assert.match(h, /모집일정/, id); assert.doesNotMatch(h, /채용일정|접수기간 ㅣ|ㅣ<\/b>/, id);
    assert.match(h, /모집직무/, id);
  }
});

test('#9 자소설 틀 실측 게이트 — guidecheck mold.* 18규칙(level block, ±2px) · 어긋나면 approvalGate 가 차단', () => {
  assert.equal(MOLD_RULES.length, 18); assert.ok(MOLD_RULES.every(r => r.level === 'block')); assert.equal(MOLD_TOL, 2);
  const rules = specs['jasoseol-pc-premium-jobpost-pc'].rules;
  const texts = (dy = 0, px = 24, fw = '700') => [
    { role: 'sub', box: { x: 15, y: 81.9 - (22.6 - 16 * 1.2) / 2, w: 130, h: 22.6 }, fs: 16, fw: '700', lh: 22.6, lines: ['2026 하반기'], bolds: [] },
    { role: 'main', box: { x: 15, y: 141 + dy - (34.1 - px * 1.2) / 2, w: 130, h: 68.2 }, fs: px, fw, lh: 34.1, lines: ['세아제강', '신입/경력사원 채용'], bolds: [] },
  ];
  const C = (t, extra = {}) => ({ spec: { id: 'jasoseol-pc-premium-jobpost-pc', w: 160, h: 600, shape: 'tower', medium: 'jasoseol' }, guide: {}, mr: {}, rules, trace: { mode: 'templateMold', rules: [] }, m: { texts: t, logo: { box: { x: 26, y: 29, w: 107, h: 17 } }, objects: [{ clip: { x: 0, y: 405, w: 160, h: 195 } }], ...extra }, meta: null, kt: null });
  const ok = evaluate(C(texts()), MOLD_RULES); assert.ok(ok.length >= 10); assert.equal(blockingRows(ok).length, 0, JSON.stringify(blockingRows(ok)));
  const bad = evaluate(C(texts(5)), MOLD_RULES); assert.ok(blockingRows(bad).some(r => r.id === 'mold.main.y'), '메인 줄 y 5px 어긋남 → ✗');
  const badPx = evaluate(C(texts(0, 20)), MOLD_RULES); assert.ok(blockingRows(badPx).some(r => r.id === 'mold.main.px'));
  const badW = evaluate(C(texts(0, 24, '500')), MOLD_RULES); assert.ok(blockingRows(badW).some(r => r.id === 'mold.main.weight'));
  const badLogo = evaluate(C(texts(), { logo: { box: { x: 10, y: 10, w: 140, h: 40 } } }), MOLD_RULES); assert.ok(blockingRows(badLogo).some(r => r.id === 'mold.logo.box'));
  const badImg = evaluate(C(texts(), { objects: [{ clip: { x: 0, y: 380, w: 160, h: 220 } }] }), MOLD_RULES); assert.ok(blockingRows(badImg).some(r => r.id === 'mold.image.box'), '그림이 칸 위로');
  const pass = { level: 'pass', issues: [] };
  assert.equal(approvalGate({ grade: 'A', lint: pass, design: { warnings: [] }, samples: 0, guide: ok }).state, 'ready');
  const g = approvalGate({ grade: 'A', lint: pass, design: { warnings: [] }, samples: 0, guide: bad }); assert.equal(g.state, 'blocked'); assert.ok(g.reasons.some(r => /^틀: /.test(r)));
  assert.equal(approvalGate({ grade: 'A', lint: pass, design: { warnings: [] }, samples: 0, guide: { rows: bad } }).state, 'blocked');
});

test('#2 소재 이미지 — 주인공 당김은 주인공 상자의 60% 가 보이는 배율까지(CANON.kvCrop.minVisible) · 녹임은 주인공을 덮지 않는다(CANON.melt.subject, meltFix.subject)', () => {
  assert.equal(CANON.kvCrop.minVisible, 0.6); assert.deepEqual(CANON.melt.subject, { intrude: 0.25, min: 0.15, maxShare: 0.8 });
  // 일화 사옥: 주인공 띠(폭 96%·높이 57%)를 1.17:1 칸에 — 예전 1.9배(주인공 폭 50%) → 1.4배 안팎
  const ilhwa = { ar: 4096 / 2920, px: [4096, 2920], field: { kind: 'photo', opaque: 1, focus: { x: 0.52, y: 0.71, w: 0.96, h: 0.57 } } };
  const c = subjectCrop({ kvMeta: ilhwa }, 235, 200); assert.ok(c && c.gain >= 1.25 && c.gain <= 1.45, JSON.stringify(c));
  // 비율이 맞는 작은 주인공은 그대로 당긴다
  const small = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, focus: { x: 0.8, y: 0.5, w: 0.2, h: 0.3 } } };
  assert.ok(subjectCrop({ kvMeta: small }, 300, 250).gain > 2);
  // 자소설 팝업 모서리 칸(사진 cover): 주인공이 칸 안에 다 보이면 글자 쪽 녹임이 주인공 쪽으로 25% 넘게 들어가지 않는다
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  const photo = normalizeStyle({ colors: ['#0B3C8C'], keyVisual: PNG, kvMeta: { ar: 1.36, px: [1360, 1000], field: { kind: 'photo', opaque: 1, lum: 0.8, sat: 0.1, focus: { x: 0.62, y: 0.55, w: 0.5, h: 0.5 }, edges: { left: { hex: '#F2F2F2' }, top: { hex: '#F2F2F2' } }, cols: Array.from({ length: 8 }, () => ({ bg: 0.2 })), rows: Array.from({ length: 8 }, () => ({ bg: 0.2 })) } } });
  const h = renderAd(ctxOf(PSK), photo, specs['jasoseol-pc-premium-popup-pc']);
  const melt = Number(h.match(/data-object="1"[^>]*data-melt="([\d.]+)"/)?.[1]);
  assert.ok(Number.isFinite(melt) && melt <= 40, `왼변 녹임 ${melt}% — 주인공(칸 가운데)을 덮지 않는다`);
});
