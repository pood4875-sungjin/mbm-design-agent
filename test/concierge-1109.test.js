// 11-09 컨시어지(노션 대시보드 11/03·11/04 갱신분) — 메시지 라벨 공고 · 시즌 지어 넣지 않음 · 자소설 브리프 통일 · 비즈보드 좌측형 · 틀 실제 줄 수
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractRecruit } from '../core/brief.js';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { placeAvail } from '../core/editlayout.js';
import { adSpecEntries } from '../core/adspecs.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const NOW = new Date('2026-11-09');
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('메시지: [기관명]·「채용명」 라벨 공고와 「2026.11.06. (금) ~ 12.17.(목) 자정까지」 — 고객사·채용 구분·접수 시작·마감·직무를 다 채운다', () => {
  const r = extractRecruit(`[대구경북첨단의료산업진흥재단]
- 채용명 MEDILINK 아카데미 5기 교육생 모집
- 공고 진행 일자 (시작일 및 시작 시간 / 종료일 및 종료 시간) : 2026.11.06. (금) ~ 12.17.(목) 자정까지
- 공고 모집 직무 : 의료기기 설계 / 의료기기 인허가(RA)`, NOW);
  assert.equal(r.client, '대구경북첨단의료산업진흥재단');
  assert.equal(r.hiringType, 'MEDILINK 아카데미 5기 교육생 모집');
  assert.equal(r.startDate, '2026-11-06'); assert.equal(r.deadline, '2026-12-17');
  assert.equal(r.role, '의료기기 설계 / 의료기기 인허가(RA)');
  // 10-28 예시 네 건은 그대로
  assert.equal(extractRecruit('인천국제공항보안 2026-6 일반직 직원 채용 공고\n2026.10.27(화) ~ 11.9(월) 13:00까지\n모집분야: 전산, 안전/보건', NOW).client, '인천국제공항보안');
  assert.equal(extractRecruit('피에스케이 2026년 전문연구요원 채용. 2026년 10월 27일 00:00~2026년 12월 31일 23:50. 모집분야: 전장설계, 공정개발, 기구설계', NOW).startDate, '2026-10-27');
});

const med = createContext({ client: '대구경북첨단의료산업진흥재단', hiringType: 'MEDILINK 아카데미 5기 교육생 모집', role: 'SW개발, AI, ML, 보안위협분석, DevOps, QA, IT인프라운영, SRE', startDate: '2026-11-06', deadline: '2026-12-17' }, 'recruit');
const st = normalizeStyle({ colors: ['#1B6FD8'] });
const JASO = ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-standard-main-pc', 'jasoseol-pc-standard-jobpost-pc', 'jasoseol-m-premium-popup-mo', 'jasoseol-m-standard-main-mo'];

test('시즌을 적지 않으면 어느 자소설 규격에도 「2026 하반기」가 들어가지 않는다(마감일 유추 폐지)', () => {
  for (const id of JASO) assert.doesNotMatch(renderArtifact(id, med, st, {}), /하반기/, id);
});

test('자소설 전 규격이 브리프 그대로: 메인 = 채용명, 서브 = 기업명(PC메인배너 1200×280 만 「…재단 채용」이던 것) · 「채용」을 지어 붙이지 않는다 · 글자색 한 색', () => {
  const colors = new Set();
  for (const id of JASO) {
    const t = traceOf(renderArtifact(id, med, st, {}));
    assert.equal(String(t.copy.main).replace(/\n/g, ' '), 'MEDILINK 아카데미 5기 교육생 모집', id);
    assert.equal(t.copy.sub, '대구경북첨단의료산업진흥재단', id);
    colors.add(t.text.mainFg);
  }
  assert.equal(colors.size, 1, [...colors].join(','));
});

test('카카오 비즈보드 좌측형: 「키비주얼 왼쪽」이면 그림 칸 x41 · 카피 x393(틀째 좌우), 다른 틀 규격은 여전히 못 고른다', () => {
  const meta = JSON.parse(readFileSync(new URL('../ref/learned/cases/fig-28/meta.json', import.meta.url), 'utf8'));
  const ctx = createContext({ client: '하나증권', hiringType: '채용연계형 인턴십', deadline: '2026-12-17' }, 'recruit');
  const base = traceOf(renderArtifact('kakao-bizboard-mo', ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: meta.kv ?? meta }), {}));
  const left = traceOf(renderArtifact('kakao-bizboard-mo', ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: meta.kv ?? meta, kvPlace: 'left' }), {}));
  assert.equal(base.place.tImage.x, 599); assert.equal(left.place.tImage.x, 41);
  assert.ok(left.textBox.rows.every(r => r.x === 393), JSON.stringify(left.textBox.rows));
  assert.ok(left.rules.includes('templateMold.sideSwap'));
  const E = adSpecEntries();
  assert.equal(placeAvail(E['kakao-bizboard-mo'], 'left', { gate: { hasKv: true, template: true } }).ok, true);
  assert.equal(placeAvail(E['jasoseol-pc-standard-main-pc'], 'left', { gate: { hasKv: true, template: true } }).ok, false);
});

test('틀 글자 행 기록은 실제 줄 수 — 메인은 칸 폭에서 접힌 줄까지, 서브는 쓴 줄만(레이아웃 가이드가 이 행을 그린다)', () => {
  const t = traceOf(renderArtifact('jasoseol-pc-standard-jobpost-pc', med, st, {}));
  const n = role => t.textBox.rows.filter(r => r.role === role).length;
  assert.ok(n('main') >= 2, `메인 ${n('main')}줄 — 130px 칸에 접힌 줄`);
  const one = traceOf(renderArtifact('jasoseol-pc-standard-jobpost-pc', createContext({ client: '토스플레이스', hiringType: '신입 채용', season: '채용 공고', role: '서버 개발', deadline: '2026-11-30' }, 'recruit'), st, {}));
  assert.equal(one.textBox.rows.filter(r => r.role === 'sub').length, 1, '서브 1줄이면 칸도 1줄');
});

test('SVG 글꼴 이름: Figma 가 굵기를 읽도록 PostScript 이름을 앞에(「Pretendard-Medium, Pretendard」) — 정적 글꼴 묶음만', async () => {
  const { psFamily } = await import('../core/svgexport.js');
  assert.equal(psFamily('Pretendard', 500), 'Pretendard-Medium, Pretendard');
  assert.equal(psFamily("'Pretendard', sans-serif", 600), 'Pretendard-SemiBold, Pretendard');
  assert.equal(psFamily('Pretendard', 400), 'Pretendard-Regular, Pretendard');
  assert.equal(psFamily('Kakao Big Sans', 700), 'Kakao Big Sans', '규칙을 모르는 글꼴은 그대로');
});
