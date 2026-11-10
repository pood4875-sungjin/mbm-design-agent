// 11-10 입력 구조 개편 — 사용자 「서브 문구가 반영되는 곳이 별로 없어서 2025년을 쓰면 타이틀에도 쓸 때 중복」·「상세 쓴 건 어디에도 안 나와서 … 행을 추가한다는 개념으로」·「파싱되는 거랑 매칭을 잘 해서」
//   ① 연도 한 번 ② 서브 = 추가 문구(subText) ③ 상세 = 접수기간·모집직무·추가 행(rows) ④ 고용형태·근무지 칸 → 추가 행(옛 데이터 이전) ⑤ 파서가 새 구조로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecruit } from '../core/brief.js';
import { createContext, migrateRecruitCore, mergeRows, cleanRows } from '../core/context.js';
import { renderAd, copyLadder } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { normalizeStyle } from '../core/style.js';
import { lintArtifact } from '../core/lint.js';
import { normalize, scriptedTurn } from '../app/agent.js';
import { EXTRACT } from '../core/media.js';

const NOW = new Date(2026, 10, 10);
const S = adSpecEntries();
const st = normalizeStyle({ colors: ['#1E5BE6'] });
const traceOf = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
const textOf = h => h.replace(/data-trace="[^"]*"/g, '').replace(/<[^>]+>/g, ' ').replace(/[⁠​]/g, '');

test('파서: 공고의 「라벨: 값」은 추가 행으로(라벨 정규화), 직무·기간·고객사·채용명은 제 칸 — 한 항목 한 곳', () => {
  const r = extractRecruit(`[대구경북첨단의료산업진흥재단]
- 채용명: 2026년 제5차 직원 채용
- 접수기간: 2026.11.06. (금) ~ 12.17.(목) 자정까지
- 모집분야: 연구직, 행정직
- 근무 지역: 대구 동구
- 고용 형태: 정규직
- 전형 절차: 서류전형 → 필기전형 → 면접전형`, NOW);
  assert.equal(r.client, '대구경북첨단의료산업진흥재단'); assert.equal(r.hiringType, '2026년 제5차 직원 채용'); assert.equal(r.role, '연구직, 행정직');
  assert.equal(r.startDate, '2026-11-06'); assert.equal(r.deadline, '2026-12-17');
  assert.deepEqual(r.rows, [{ label: '근무지', value: '대구 동구' }, { label: '고용형태', value: '정규직' }], '11-10 사용자 결정 ③ 「결과값만」 — 전형절차는 파서가 행으로 안 만든다');
  assert.equal(r.employType, undefined); assert.equal(r.location, undefined);
  const h = extractRecruit('한빛소프트 2026년 하반기 신입사원 공개채용\n접수기간: 2026.11.12 ~ 2026.11.25 18:00\n모집분야: 게임기획, 서버개발\n근무지: 서울 강남\n지원방법: 홈페이지 온라인 접수\n우대사항: 관련 전공자\n슬로건 "게임의 내일을 함께"', NOW);
  assert.deepEqual(h.rows.map(x => x.label), ['근무지'], '지원방법·우대사항은 안 읽음(결정 ③)');
  assert.equal(h.subText, '게임의 내일을 함께', '슬로건 → 추가 문구'); assert.equal(h.slogan, undefined);
  assert.equal(h.season, '2026년 하반기');
  // 한 줄에 이어 적은 라벨 — 직무 뒤 근무지가 직무에 섞이지 않는다
  const one = extractRecruit('마이다스아이티 신입 채용. 10/1 ~ 10/31. 모집분야: 전산, 보안, 근무지: 판교', NOW);
  assert.equal(one.role, '전산, 보안'); assert.deepEqual(one.rows, [{ label: '근무지', value: '판교' }]);
  // 채용 구분에 이미 든 말은 행으로 또 넣지 않는다
  assert.equal(extractRecruit('제일약품 2026년 ETC 영업 채용(전국), ~1/18(일) 23:59까지. 모집직무 ETC 영업.', NOW).rows, undefined);
});

test('옛 데이터 이전: 고용형태·근무지(·자격·전형) 칸 → 같은 라벨 행, 슬로건 → 추가 문구 · createContext 가 자동으로', () => {
  const m = migrateRecruitCore({ client: 'A', employType: '정규직', location: '판교', slogan: '함께 가요', rows: [{ label: '근무지', value: '서울' }, { label: '전형절차', value: '서류' }] });
  assert.deepEqual(m.rows, [{ label: '근무지', value: '판교' }, { label: '전형절차', value: '서류' }, { label: '고용형태', value: '정규직' }], '같은 라벨은 칸 값으로 바꾸고 자리는 그대로');
  assert.equal(m.employType, null); assert.equal(m.location, null); assert.equal(m.subText, '함께 가요'); assert.equal(m.slogan, null);
  const same = { client: 'A', rows: [{ label: '근무지', value: '판교' }] }; assert.equal(migrateRecruitCore(same), same, '바꿀 게 없으면 그대로');
  const ctx = createContext({ client: 'A', employType: '정규직', location: '판교' }, 'recruit');
  assert.deepEqual(ctx.core.rows, [{ label: '근무지', value: '판교' }, { label: '고용형태', value: '정규직' }]);
  assert.deepEqual(mergeRows([{ label: '근무지', value: '서울' }], [{ label: '근무 지', value: '' }, { label: '근무지', value: '판교' }, { label: '문의', value: '02' }]), [{ label: '근무지', value: '판교' }, { label: '문의', value: '02' }]);
  assert.deepEqual(cleanRows([{ label: ' ', value: 'x' }, { label: 'a', value: ' ' }]), []);
});

test('연도 한 번: 49규격 어디에도 같은 연도가 두 번 안 나온다(채용 구분에 연도 + 시즌) · 서브 자리 없는 리멤버는 메인 앞에 연도', () => {
  const dup = createContext({ client: 'GS에너지', hiringType: '2025년 신입 공채', startDate: '2026-06-20', deadline: '2026-07-02', role: '사업, 재무', season: '2025년', employType: '정규직', location: '판교' }, 'recruit');
  const plain = createContext({ client: 'GS에너지', hiringType: '신입 공채', startDate: '2026-06-20', deadline: '2026-07-02', role: '사업, 재무', season: '2025년' }, 'recruit');
  let n = 0;
  for (const id of EXTRACT.ids) {
    const t = textOf(renderAd(dup, st, S[id]));
    assert.ok((t.match(/2025년/g) ?? []).length <= 1, `${id}: ${t.replace(/\s+/g, ' ').slice(0, 160)}`); n++;
  }
  assert.ok(n >= 40);
  for (const id of ['remember-main-top-pc', 'remember-main-top-mo', 'remember-job-top-pc']) {
    const tr = traceOf(renderAd(plain, st, S[id]));
    assert.match(tr.copy.main.replace(/\n/g, ' '), /^2025년 GS에너지/, `${id} 메인 앞 연도`);
  }
  // 11-10 사용자 결정(「응」): 자소설만 — 추가 문구가 비면 서브 = 시즌, 메인엔 연도 없음
  for (const id of ['jasoseol-pc-premium-popup-pc', 'jasoseol-m-standard-main-mo']) {
    const tr = traceOf(renderAd(plain, st, S[id]));
    assert.equal(tr.copy.sub, '2025년', id); assert.doesNotMatch(tr.copy.main, /2025/, id);
  }
  // 추가 문구를 적으면 서브 자리 있는 규격에 그 문구
  const ex = createContext({ ...plain.core, subText: '2025 하반기 정기 공채' }, 'recruit');
  assert.equal(traceOf(renderAd(ex, st, S['jasoseol-pc-premium-popup-pc'])).copy.sub, '2025 하반기 정기 공채');
  assert.equal(copyLadder(ex).sub[0], '2025 하반기 정기 공채');
});

test('추가 행: 모집직무 다음 같은 모양으로, 상세 자리가 있는 규격에만 · 넘치면 뒤 행부터 빠지고 rows-dropped 경고', () => {
  const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', startDate: '2026-06-20', deadline: '2026-07-02', role: '사업, 재무', rows: [{ label: '근무지', value: '판교' }, { label: '전형절차', value: '서류→면접→최종' }, { label: '우대사항', value: '관련 전공자, 해외 거주 경험자, 자격증 소지자' }] }, 'recruit');
  const L = copyLadder(ctx);
  assert.deepEqual(L.details.map(d => d.label), ['접수기간', '모집직무', '근무지', '전형절차', '우대사항']);
  // 자소설 PC 채용공고 160×600(상세 6줄 틀): 근무지가 모집직무 뒤에 선다
  const h = renderAd(ctx, st, S['jasoseol-pc-premium-jobpost-pc']), tr = traceOf(h);
  assert.ok(tr.copy.details.includes('근무지'), JSON.stringify(tr.copy.details));
  assert.ok(tr.copy.details.indexOf('근무지') > tr.copy.details.indexOf('모집직무'));
  // 뒤 행부터 빠진다 — 빠진 행 다음 행이 들어가는 일은 없다(순서 지킴)
  for (const id of EXTRACT.ids) {
    const t = traceOf(renderAd(ctx, st, S[id])), shown = (t.copy?.details ?? []).filter(l => ['근무지', '전형절차', '우대사항'].includes(l)), drop = t.rowsDropped ?? [];
    const order = ['근무지', '전형절차', '우대사항'];
    if (drop.length) assert.ok(shown.every(l => order.indexOf(l) < Math.min(...drop.map(d => order.indexOf(d)))), `${id} 보인 ${shown} / 빠짐 ${drop}`);
  }
  // 리멤버(틀 상세 = 접수기간 한 줄)·비즈보드(상세 없음)는 추가 행을 안 넣고 경고도 없다
  for (const id of ['remember-main-top-pc', 'kakao-bizboard-mo', 'nap-dsp-bizboard-960x300']) {
    const t = traceOf(renderAd(ctx, st, S[id]));
    assert.ok(!(t.copy?.details ?? []).some(l => ['근무지', '전형절차', '우대사항'].includes(l)), id);
    assert.deepEqual(t.rowsDropped ?? [], [], id);
  }
  const li = lintArtifact({ spec: S['google-gdn-300x1050'].rules, medium: S['google-gdn-300x1050'].mediumRules, measure: { rowsDropped: ['전형절차', '우대사항'] } });
  assert.equal(li.level, 'warn'); assert.ok(li.issues.some(i => i.code === 'rows-dropped' && /전형절차·우대사항/.test(i.msg)));
});

test('고용형태는 메인 「○○ 정규직 채용」 재료가 아니다 — 행에 있으면 상세에만(한 항목 한 곳)', () => {
  const ctx = createContext({ client: '한진정보통신', role: '백엔드', employType: '정규직', deadline: '2026-10-31' }, 'recruit');
  const L = copyLadder(ctx);
  assert.equal(L.main[0], '한진정보통신'); assert.ok(!L.sub.includes('정규직')); assert.ok(L.details.some(d => d.label === '고용형태'));
});

test('AI 답·규칙 진행자도 같은 모양: 옛 칸(location·slogan)으로 답해도 rows·subText 로, 고치는 말은 라벨별로 합친다', () => {
  const st0 = { kind: 'recruit', phase: 'target', fields: { client: 'A', rows: [{ label: '근무지', value: '서울' }] }, briefDone: false };
  const r = normalize({ say: 'ok', patch: { kind: 'recruit', fields: { location: '부산', employType: '정규직', slogan: '함께', process: '서류→면접' } } }, st0);
  assert.deepEqual(r.patch.fields.rows, [{ label: '고용형태', value: '정규직' }, { label: '전형절차', value: '서류→면접' }], '이미 있는 근무지는 브리프 확정 전엔 안 덮는다');
  assert.equal(r.patch.fields.subText, '함께');
  const fix = scriptedTurn({ state: { kind: 'recruit', phase: 'style', fields: { client: 'A', rows: [{ label: '근무지', value: '서울' }, { label: '고용형태', value: '정규직' }] }, briefDone: true, styleDone: false }, userText: '근무지: 판교', now: NOW });
  assert.deepEqual(fix.patch.fields.rows, [{ label: '근무지', value: '판교' }]);
});
