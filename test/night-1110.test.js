// 11-10 밤샘 루프에서 고친 규칙들(history/2026-11-10_밤샘루프_계획.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('인물 상자: 색 덩어리 상자가 그림 거의 전체(80%↑)면 주인공이 아니다 — 인물 상자를 쓴다(desk-32 소파 두 사람)', async () => {
  const { personFocus } = await import('../core/palette.js');
  const field = { kind: 'photo', focus: { x: 0.5, y: 0.5, w: 0.92, h: 1, parts: 1, others: [], density: 0.58 } };
  const person = { x0: 0.158, x1: 0.742, y0: 0.245, y1: 1, area: 0.243, fill: 0.551 };
  const f = personFocus(field, person);
  assert.equal(f.focus.source, 'person'); assert.ok(f.focus.w < 0.7 && f.focus.h < 0.8);
  // 색 상자가 진짜 주인공(작고 진함)이면 그대로
  const g = personFocus({ kind: 'photo', focus: { x: 0.3, y: 0.4, w: 0.3, h: 0.4, density: 0.7 } }, person);
  assert.notEqual(g.focus.source, 'person');
});

test('알바몬 스플래시 = 가이드 틀(위 240 안 가운데 문구 · 88 아래 오브젝트 칸) · 바탕 있는 그림이면 로고가 오브젝트 칸으로 · 채용 구분은 「채용 공고」로 안 떨어짐', async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js');
  const ctx = createContext({ client: '마이다스아이티', hiringType: '신입/경력 공개채용', startDate: '2026-11-12', deadline: '2026-11-25' }, 'recruit');
  const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const LOGO = 'data:image/png;base64,iVBORw0KGgo=';
  const photo = normalizeStyle({ colors: ['#D02820'], keyVisual: LOGO, kvMeta: { ar: 1.5, field: { kind: 'photo', opaque: 1, focus: { x: 0.5, y: 0.5, w: 0.5, h: 0.6 } } }, logo: LOGO, logoMeta: { px: [437, 128], tone: 'dark' } });
  const t = tr(renderArtifact('albamon-m-splash', ctx, photo));
  assert.equal(t.mode ?? t.place?.mode, 'templateMold'); assert.ok(t.rules.includes('templateMold.logoAsObject'), t.rules.join(','));
  assert.equal(t.copy.main, '신입/경력 공개채용');
  for (const sid of ['albamon-m-main', 'albamon-pc-sky-recruit', 'google-gdn-300x600']) assert.notEqual(tr(renderArtifact(sid, ctx, photo)).copy.main, '채용 공고', sid);
});

test('날짜 자리가 따로 없는 규격에서 서브가 비면 마감 일정이 서브 자리로 — 타이틀 아래 · 상세에 접수기간이 있으면 안 넣음 · 띠는 안 넣음', async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js'); const { extractRecruit } = await import('../core/brief.js');
  const ctx = createContext(extractRecruit('마이다스아이티 2026년 하반기 신입/경력 공개채용. 접수 11월 12일(목) ~ 11월 25일(수) 18:00. 모집분야: 연구개발, 기술영업, 경영지원. 근무지: 판교', new Date(2026, 10, 10)), 'recruit');
  const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const st = normalizeStyle({ colors: ['#1428A0'] });
  const h = renderArtifact('albamon-pc-main-board', ctx, st), t = tr(h);
  assert.ok(t.rules.includes('subAsDate') && /11\.12/.test(t.copy.sub), JSON.stringify(t.copy));
  assert.ok(h.indexOf('data-field="main"') < h.indexOf('data-field="sub"'), '날짜는 타이틀 아래');
  for (const sid of ['instagram-story-1080x1920', 'albamon-pc-sub-bottom']) assert.ok(!tr(renderArtifact(sid, ctx, st)).rules.includes('subAsDate'), sid);
});

test('가로형 짝 규칙에 「회사 / 채용」 없음 — 채용 구분이 빠지지 않는다(알바몬 320×155)', async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js');
  const ctx = createContext({ client: '마이다스아이티', hiringType: '신입/경력 공개채용', startDate: '2026-11-12', deadline: '2026-11-25' }, 'recruit');
  const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const st = normalizeStyle({ colors: ['#1428A0'] });
  for (const sid of ['albamon-pc-search-right', 'specup-right-big-pc', 'gamejob-community-pick-mo']) { const c = tr(renderArtifact(sid, ctx, st)).copy; assert.ok(String(c.main + ' ' + (c.sub ?? '')).replace(/\s/g, '').includes('신입/경력공개채용'), `${sid} ${JSON.stringify(c)}`); }
});

test('생성 하한(하위 10%와 중앙 사이) — 인스타 스토리 상세 ≥ 타이틀 42% · 라벨만 선 줄 없이 뱃지 꼴 · 뱃지 글자도 하한 뒤 크기', async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js'); const { extractRecruit } = await import('../core/brief.js');
  const ctx = createContext(extractRecruit('마이다스아이티 2026년 하반기 신입/경력 공개채용. 접수 11월 12일(목) ~ 11월 25일(수) 18:00. 모집분야: 연구개발, 기술영업, 경영지원. 근무지: 판교', new Date(2026, 10, 10)), 'recruit');
  const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const h = renderArtifact('instagram-story-1080x1920', ctx, normalizeStyle({ colors: ['#1428A0'] })), t = tr(h);
  assert.ok(t.fonts.detail.px / t.fonts.main.px >= 0.42 - 0.005, JSON.stringify(t.fonts.detail));
  assert.doesNotMatch(h, /<b style="font-weight:\d+;display:block">/, '라벨만 선 줄 없음');
});

test('20자 붙임 회사명: 띠·가로형은 줄 제한에 잘리지 않게 채용 구분 든 후보로 · 구글 580 틀은 회사명만 남지 않고 채용 구분', async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js'); const { extractRecruit } = await import('../core/brief.js');
  const ctx = createContext(extractRecruit('한국마이다스아이티글로벌엔지니어링솔루션 2026년 하반기 신입/경력 공개채용. 접수 11월 12일(목) ~ 11월 25일(수) 18:00. 모집분야: 연구개발, 기술영업. 근무지: 판교', new Date(2026, 10, 10)), 'recruit');
  const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const { readFileSync } = await import('node:fs');
  const meta = JSON.parse(readFileSync(new URL('../ref/learned/cases/ex-rocket-cut/meta.json', import.meta.url), 'utf8'));
  const st = normalizeStyle({ colors: ['#1428A0'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: meta, logo: 'data:image/png;base64,iVBORw0KGgo=', logoMeta: { px: [437, 128], tone: 'dark' } });
  assert.match(tr(renderArtifact('google-gdn-580x400', ctx, st)).copy.main, /신입\/경력 공개채용/);
  const sb = tr(renderArtifact('albamon-pc-sub-bottom', ctx, st));
  assert.ok(!/^한국마이다스아이티글로벌엔지니어링솔루션 신입/.test(sb.copy.main) || sb.rules.includes('mainWrapGuard'), sb.copy.main);
});
