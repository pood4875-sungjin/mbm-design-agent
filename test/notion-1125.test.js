// 11-25 노션 대시보드(업데이트 요청 20 + 개발중 8) — history/2026-11-25_노션_UI요청_28건_반영.md
import { test } from 'node:test';
import assert from 'node:assert/strict';

const setup = async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js');
  return { renderArtifact, createContext, normalizeStyle };
};
const trace = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
const px = (h, f) => { const m = h.match(new RegExp(`data-field="${f}"[^>]*font-size:([\\d.]+)px`)); return m ? +m[1] : null; };

test('[공통] 가이드 범위 초과(11-23 추가) — 자소설·리멤버·잡다는 적은 문구가 넘쳐도 메인 글자 크기는 가이드 그대로, 뒷부분만 숨김', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup();
  const base = { client: '세방그룹', hiringType: '신입·인턴·경력 정기채용', season: '2026년 4분기', startDate: '2026-11-06', deadline: '2026-11-15', role: '인사·경영지원, 영업, 회계 등' };
  const st = normalizeStyle({ colors: ['#2B6CA3'] });
  for (const sid of ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-standard-main-pc', 'jasoseol-pc-premium-jobpost-pc', 'remember-main-top-pc', 'remember-main-mid-pc', 'jobda-main-pc', 'jobda-main-mo']) {
    const a = renderArtifact(sid, createContext(base, 'recruit'), st);
    const b = renderArtifact(sid, createContext({ ...base, headline: 'SEBANG 하반기 마지막 신입 · 채용연계형 인턴 · 경력 대규모 공개채용' }, 'recruit'), st);
    assert.equal(px(b, 'main'), px(a, 'main'), `${sid}: 넘쳐도 가이드 크기`);
    assert.ok(trace(b).textCut?.some(c => c.role === 'main'), `${sid}: 잘림 기록(확인 필요)`);
  }
});

test('[자소설닷컴] PC채용공고 상세 — 어절이 통째로 넘어가는 줄까지 세어 6줄 모두(「보안성 검토」가 잘리던 것), 「R/D」는 한 항목', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup();
  const st = normalizeStyle({ colors: ['#2B6CA3'] });
  const gs = trace(renderArtifact('jasoseol-pc-premium-jobpost-pc', createContext({ client: 'GS리테일', hiringType: '경력사원 채용', startDate: '2026-11-20', deadline: '2026-12-02', role: '정보보안부문 보안전략운영팀 보안성 검토' }, 'recruit'), st)).mold.rows.detail;
  const job = gs.items.find(i => i.label === '모집직무');
  assert.equal(job.value, '정보보안부문 보안전략운영팀 보안성 검토');
  assert.equal(gs.items.reduce((n, i) => n + i.rows, 0), 6, '라벨 2 + 날짜 1 + 직무 3');
  const { wordRows } = await import('../core/renderers/banner.js');
  assert.equal(wordRows('정보보안부문 보안전략운영팀 보안성 검토', 13, 130), 3);
});

test('[잡다] 가이드 고정 · 하단 태그 편집 — 정렬 잠금(mold), core.tags 는 그 순서 그대로 칩, 빈 배열이면 태그 없음', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup();
  const { alignLockOf } = await import('../core/alignrule.js'); const { SPECS } = await import('../core/contract.js');
  for (const id of ['jobda-main-pc', 'jobda-main-mo']) assert.equal(alignLockOf(SPECS[id]).locked, true);
  const base = { client: '한화세미텍', hiringType: '채용전제형 인턴·경력 통합 채용', startDate: '2026-11-09', deadline: '2026-11-22', role: '(인턴) 영업, 글로벌CS, QA, 재무, 양산 구매' };
  const st = normalizeStyle({ colors: ['#2B6CA3'] });
  const items = over => trace(renderArtifact('jobda-main-pc', createContext({ ...base, ...over }, 'recruit'), st)).mold?.rows?.tags?.items ?? null;
  assert.ok(items({}).length >= 3, '기본은 직무에서');
  assert.deepEqual(items({ tags: ['QA', '재무', '신입 환영'] }), ['QA', '재무', '신입 환영']);
  assert.equal(items({ tags: [] }), null);
});

test('[공통] 이미지 그라데이션 조정 — 50% = 그대로, 0% = 그 변 녹임 없음, 100% = 두 배(상한 100%)', async () => {
  const { scaleMaskGradients, withKvFade } = await import('../core/renderers/ad.js');
  const g = 'linear-gradient(to right,transparent 0%,rgba(0,0,0,0.16) 5%,#000 30%)';
  assert.equal(scaleMaskGradients(g, { left: 50 }), g);
  assert.equal(scaleMaskGradients(g, { left: 0 }), 'linear-gradient(#000,#000)');
  assert.match(scaleMaskGradients(g, { left: 100 }), /#000 60%/);
  assert.equal(scaleMaskGradients(g, { right: 0 }), g, '다른 변은 그대로');
  const h = `<div data-object="1" style="-webkit-mask-image:${g};mask-image:${g};"></div>`;
  assert.equal(withKvFade(h, {}), h);
  assert.equal((withKvFade(h, { kvFade: { left: 0 } }).match(/#000,#000/g) ?? []).length, 2);
  const { normalizeStyle, normKvFade } = await import('../core/style.js');
  assert.equal(normKvFade({ all: 50 }), null, '모두 50 이면 없는 것과 같다(기본 그림 바이트 동일)');
  assert.deepEqual(normalizeStyle({ colors: ['#2456D6'], kvFade: { all: 20, top: 0 } }).kvFade, { top: 0, right: 20, bottom: 20, left: 20 });
});

test('[공통] 패키지 묶음·소재 타이틀 — 패키지 = 규격 이름 「 - 」 앞(NAP 은 매체 전체), 타이틀 = 파일명에서 기업명·매체명·날짜를 뺀 것', async () => {
  const { packageOf, boardTitleOf, adFileNameOf, adSpecEntries } = await import('../core/adspecs.js');
  const S = adSpecEntries();
  assert.equal(packageOf(S['jasoseol-pc-premium-popup-pc']), 'PC프리미엄패키지');
  assert.equal(packageOf(S['jasoseol-pc-premium-jobpost-pc']), 'PC프리미엄패키지');
  assert.equal(packageOf(S['remember-main-top-mo']), '메인 상단 배너');
  assert.equal(packageOf(S['nap-dsp-band-320x50']), packageOf(S['nap-dsp-full-300x250']));
  const t = id => boardTitleOf(S[id], adFileNameOf({ client: 'ACME PLAZA', mediumName: S[id].mediumName, spec: S[id] }), { client: 'ACME PLAZA' });
  assert.equal(t('jasoseol-pc-premium-popup-pc'), 'PC프리미엄패키지 · PC팝업배너');
  assert.equal(t('remember-main-top-pc'), '메인상단배너 · PC');
  assert.doesNotMatch(t('kakao-bizboard-mo'), /ACME|카카오/);
});

test('[공통] 검수 알림 명칭 — 가이드 위반 · 확인 필요 · 문제 없음 세 단계', async () => {
  const { STATE_LABEL, STATE_TIER, TIER_LABEL } = await import('../core/gate.js');
  assert.equal(STATE_LABEL.blocked, '가이드 위반'); assert.equal(STATE_LABEL.review, '확인 필요'); assert.equal(STATE_LABEL.ready, '문제 없음'); assert.equal(STATE_LABEL.draft, '확인 필요');
  assert.deepEqual(Object.values(TIER_LABEL), ['가이드 위반', '확인 필요', '문제 없음']);
  assert.equal(STATE_TIER.pending, undefined, '검사 중은 셈에서 뺀다');
});

test('[공통] 제작한 캠페인 삭제 — 저장소에서 지우면 목록에서 빠진다(localStorage 저장 장치)', async () => {
  const { createCampStore, localBackend } = await import('../core/campstore.js');
  const mem = new Map(); const ls = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  const st = createCampStore({ open: async () => localBackend(ls, 'k') });
  await st.ready;
  await st.put({ id: 'a', savedAt: 1, artifacts: [] }); await st.put({ id: 'b', savedAt: 2, artifacts: [] });
  assert.equal(st.list().length, 2);
  await st.remove('a');
  assert.deepEqual(st.list().map(r => r.id), ['b']);
  const st2 = createCampStore({ open: async () => localBackend(ls, 'k') }); await st2.ready;
  assert.deepEqual(st2.list().map(r => r.id), ['b'], '다시 열어도 지운 채');
});
