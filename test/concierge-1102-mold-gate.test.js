// 11-02 Notion 컨시어지(박진화) 「[자소설닷컴] 규정 미준수 소재 검수 승인 오류」 재조사 — 채용공고 160×600 · PC메인 1200×280 문구 조합별 틀 줄 y(docs/jasoseol-mold.md ②·③) + 틀 검사(MOLD_RULES) + 승인 게이트(needsGuide)
//   · 조합: 서브 1·2줄 × 메인 1~4줄 — 렌더러가 「서브 2줄/메인 4줄」로 고정돼 나오는지(data-trace mold.rows·mainN·subN)
//   · 게이트: 가이드 측정 전(guide null)엔 ready 가 아니라 pending, 측정 실패는 review, 틀 ✗ 는 blocked(디자인 검수는 동기·가이드 측정은 비동기 큐라 그 사이 「승인 가능」이 먼저 떴다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { guideFor } from '../core/canon.js';
import { shapeOf } from '../core/layouts.js';
import { kvTypeOf } from '../core/kvtypes.js';
import { MOLD_RULES, MOLD_BLOCK_MEDIA, evaluate, guideContext, blockingRows } from '../core/guidecheck.js';
import { approvalGate } from '../core/gate.js';

const SPECS = adSpecEntries();
const style = normalizeStyle({ colors: ['#1C256A'] });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const base = { role: '백엔드 개발자', employType: '정규직', deadline: '2026-10-31' };
const JOB = 'jasoseol-pc-premium-jobpost-pc', JOB2 = 'jasoseol-pc-standard-jobpost-pc', MAIN = 'jasoseol-pc-standard-main-pc';
const render = (sid, f) => { const html = renderAd(createContext({ ...base, ...f }, 'recruit'), style, SPECS[sid]); return { html, tr: traceOf(html) }; };
const r1 = n => Math.round(n * 10) / 10;

// docs/jasoseol-mold.md ② — 담당자 6유형(11-02, 컨시어지 sZMBhkuLMEiyMLPPpGxvC1 30:1056·1198·1331·1455·1588·1712 실측): 서브 81.9(2줄째 104.5) · 메인 y = 서브 1줄 117.5 / 2줄 141, +34씩 · 상세 = 마지막 메인 줄 + 57
//   실측 상세 y(Figma 글상자 top): 서브2×메인4 299.1 · 서브2×메인3 265.5 · 서브2×메인2 231.9 · 서브1×메인4 276.4 · 서브1×메인3 242.8 · 서브1×메인2 209.2 — 렌더는 전부 ±1
const MAIN_Y = { 1: 117.5, 2: 141 };
const FIGMA = { '2x4': { node: '30:1056', detail: 299.1 }, '2x3': { node: '30:1198', detail: 265.5 }, '2x2': { node: '30:1331', detail: 231.9 }, '1x4': { node: '30:1455', detail: 276.4 }, '1x3': { node: '30:1588', detail: 242.8 }, '1x2': { node: '30:1712', detail: 209.2 } };
const COMBOS = [
  { name: '서브 2 × 메인 1', f: { client: '현대오일터미널 주식회사', hiringType: '신입채용', season: '' }, sub: 2, main: 1 },   // 12자 기업명 → 서브 줄(2줄), 메인은 채용구분만 — 6유형 밖(메인 1줄), 수식만
  { name: '서브 1 × 메인 2', f: { client: '한진정보통신', hiringType: '정규직 채용', season: '2026 하반기' }, sub: 1, main: 2 },
  { name: '서브 1 × 메인 3', f: { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기' }, sub: 1, main: 3 },
  { name: '서브 1 × 메인 4', f: { client: '케피코', hiringType: '신입 및 경력사원 대규모 공개채용', season: '2026' }, sub: 1, main: 4 },
  { name: '서브 2 × 메인 2', f: { client: '세아제강', hiringType: '신입채용', season: '2026 하반기 정기 공개채용 시즌' }, sub: 2, main: 2 },
  { name: '서브 2 × 메인 3', f: { client: '한국산업단지공단', hiringType: '신입 및 경력사원 공개채용', season: '2026 하반기' }, sub: 2, main: 3 },
  { name: '서브 2 × 메인 4', f: { client: '세아제강', hiringType: '신입 및 경력사원 대규모 공개채용', season: '2026 하반기' }, sub: 2, main: 4 },
];

test('채용공고 160×600 조합 — 서브·메인 줄 수가 문구 따라 바뀌고(2줄/4줄 고정 아님), 메인 y = 서브 1줄 117.5 / 2줄 141 · 상세 y = 메인 y + (메인 줄−1)×34 + 57 (담당자 6유형, docs/jasoseol-mold.md ②)', () => {
  const seen = new Set();
  for (const c of COMBOS) {
    const { tr } = render(JOB, c.f); const R = tr.mold.rows;
    assert.equal(tr.mode, 'templateMold', c.name);
    assert.equal(tr.mold.mainN, c.main, `${c.name}: 메인 줄 수 — ${JSON.stringify(R.main.text)}`);
    assert.equal(tr.mold.subN, c.sub, `${c.name}: 서브 줄 수 — ${JSON.stringify(R.sub?.text)}`);
    assert.equal(R.sub.y, 81.9, c.name); assert.equal(R.sub.px, 16); assert.equal(R.sub.weight, 700);
    assert.equal(R.main.y, MAIN_Y[c.sub], `${c.name}: 메인 첫 줄 y 는 서브 줄 수 따라(1줄 117.5 · 2줄 141)`); assert.equal(R.main.pitch, 34); assert.equal(R.main.weight, 700);
    assert.equal(r1(R.detail.y), r1(MAIN_Y[c.sub] + (c.main - 1) * 34 + 57), `${c.name}: 상세 블록 y`);
    const fg = FIGMA[`${c.sub}x${c.main}`];
    if (fg) { seen.add(fg.node); assert.ok(Math.abs(R.detail.y - fg.detail) <= 1, `${c.name}: 상세 y ${R.detail.y} vs Figma ${fg.node} ${fg.detail} (±1)`); }
    assert.equal(R.detail.px, 13); assert.equal(R.detail.pitch, 21.8);
    // 틀 칸 용량(rows.*.lines)은 템플릿 값(서브 2·메인 4)이지 실제 줄 수가 아니다 — 실제 줄 수는 subN·mainN
    assert.equal(R.sub.lines, 2); assert.equal(R.main.lines, 4);
  }
  assert.equal(seen.size, 6, '6유형 전부 실제 문구로 재현');
  // 스탠다드 채용공고는 같은 틀
  const a = render(JOB, COMBOS[2].f).tr.mold, b = render(JOB2, COMBOS[2].f).tr.mold;
  assert.deepEqual([a.rows.main.y, a.rows.detail.y, a.mainN, a.subN], [b.rows.main.y, b.rows.detail.y, b.mainN, b.subN]);
});

test('PC메인 1200×280 — 서브 Medium 22 y43 · 메인 Bold 32 y81(1줄이면 상세 166, 2줄이면 195 — 「메인 두 줄이면 상세 1행 입력 불가」) (docs/jasoseol-mold.md ③)', () => {
  const two = render(MAIN, { client: '세아제강', hiringType: '신입/경력사원 채용', season: '2026 하반기' });
  const R2 = two.tr.mold.rows;
  assert.equal(two.tr.mold.mainN, 2); assert.equal(R2.sub.y, 43); assert.equal(R2.sub.px, 22); assert.equal(R2.sub.weight, 500, '서브는 Medium(케피코 28:1002)');
  assert.equal(R2.main.y, 81); assert.equal(R2.main.px, 32); assert.equal(R2.main.weight, 700); assert.equal(R2.detail.y, 195);
  assert.match(two.html, /<div data-field="sub"[^>]*font-size:22px;line-height:26px;font-weight:500/, 'SVG 내보내기(core/svgexport.js)는 이 계산 스타일(font-weight 500)을 그대로 적는다');
  // 메인 1줄: 틀은 「회사 / 채용구분」을 두 줄로 나누므로 1줄은 기업명 없는 문구(9자 → 생략 규칙은 채용공고 clientLen 만, PC메인은 회사명 두 줄 분리) — 상세 y 로 조합을 본다
  const one = render(MAIN, { client: '세아', hiringType: '채용', season: '2026 하반기' });
  assert.ok(one.tr.mold.mainN >= 1);
  assert.equal(one.tr.mold.rows.detail.y, one.tr.mold.mainN === 1 ? 166 : 195);
});

// 실측(guidemeasure texts)을 렌더 추적(mold.rows top·px·pitch·weight)에서 되짚어 만든다 — headless Chrome 없이 틀 검사(MOLD_RULES)의 수식을 돈다
function measureFromTrace(tr) {
  const used = tr.mold.rows; const texts = [];
  for (const role of ['sub', 'main', 'detail']) {
    const r = used[role]; if (!r) continue;
    const n = role === 'main' ? tr.mold.mainN : role === 'sub' ? tr.mold.subN : (r.items ?? []).reduce((a, i) => a + i.rows, 0) || 1;
    texts.push({ role, box: { x: r.x, y: r.top, w: r.w, h: r.pitch * n }, ink: { x: r.x, y: r.top, w: r.w, h: r.pitch * n }, fs: r.px, fw: String(r.weight), lh: r.pitch, lines: Array.from({ length: n }, (_, i) => `줄${i + 1}`) });
  }
  return { frame: { w: 160, h: 600 }, ad: {}, trace: tr, texts, objects: [], logo: null };
}
const ctxOf = (sid, tr, m) => { const sp = SPECS[sid]; return guideContext({ spec: sp, trace: tr, m, meta: null, kt: kvTypeOf(null), guide: guideFor(sp.mediumRules ?? {}), shape: shapeOf(sp.w, sp.h), kind: 'recruit', hasDate: true }); };

test('틀 검사(MOLD_RULES) — 조합마다 줄 y·x·px·굵기 ✓, 글자를 10px 내린 소재는 mold.*.y ✗(level block) → approvalGate blocked', () => {
  assert.ok(MOLD_BLOCK_MEDIA.has('jasoseol'));
  for (const c of COMBOS) {
    const { tr } = render(JOB, c.f);
    const good = evaluate(ctxOf(JOB, tr, measureFromTrace(tr)), MOLD_RULES);
    const checked = good.filter(r => r.ok !== null);
    assert.ok(checked.length >= 9, `${c.name}: 검사 줄 ${checked.length}`);
    assert.deepEqual(blockingRows(good).map(r => r.id), [], `${c.name}: ${blockingRows(good).map(r => `${r.id} ${r.expect}→${r.actual}`).join(' · ')}`);
    assert.ok(good.filter(r => r.id.startsWith('mold.')).every(r => r.level === 'block'), '자소설은 틀 규칙이 전부 block 등급(evaluate 가 붙이는 human.* 줄은 등급 없음)');
    assert.equal(approvalGate({ grade: 'A', lint: { level: 'pass', issues: [] }, design: { warnings: [] }, guide: good, needsGuide: true }).state, 'ready');
    // 일부러 어긋난 소재 — 편집으로 메인·서브를 10px 아래로 옮긴 것처럼
    const m = measureFromTrace(tr); for (const t of m.texts) if (t.role !== 'detail') t.box.y += 10;
    const bad = evaluate(ctxOf(JOB, tr, m), MOLD_RULES);
    const ids = blockingRows(bad).map(r => r.id);
    assert.ok(ids.includes('mold.main.y') && ids.includes('mold.sub.y'), `${c.name}: ${ids.join(',')}`);
    const g = approvalGate({ grade: 'A', lint: { level: 'pass', issues: [] }, design: { warnings: [] }, guide: { rows: bad }, needsGuide: true });
    assert.equal(g.state, 'blocked'); assert.match(g.reasons.join(' '), /틀 main 줄 y/);
    // 글자 크기를 줄인 소재(mainShrink 가 아닌 편집 배율)도 px ✗
    const m2 = measureFromTrace(tr); m2.texts.find(t => t.role === 'main').fs -= 3;
    assert.ok(blockingRows(evaluate(ctxOf(JOB, tr, m2), MOLD_RULES)).some(r => r.id === 'mold.main.px'));
  }
});

test('승인 게이트 — 틀 규격은 가이드 측정 전엔 pending(ready 로 새지 않음), 측정 실패는 review, 틀 매체가 아니면 guide 없이도 ready', () => {
  const ok = { grade: 'A', lint: { level: 'pass', issues: [] }, design: { warnings: [] } };
  assert.equal(approvalGate({ ...ok, guide: null, needsGuide: true }).state, 'pending');
  assert.equal(approvalGate({ ...ok, guide: undefined, needsGuide: true }).state, 'pending');
  assert.equal(approvalGate({ ...ok, guide: { error: 'no root', rows: [] }, needsGuide: true }).state, 'review');
  assert.equal(approvalGate({ ...ok, guide: { rows: [] }, needsGuide: true }).state, 'ready');
  assert.equal(approvalGate({ ...ok, guide: null, needsGuide: false }).state, 'ready');
  // 규정 차단이 먼저, 그다음 틀 ✗, 그다음 측정 전
  assert.equal(approvalGate({ ...ok, lint: { level: 'block', issues: [{ level: 'block', msg: 'x' }] }, guide: null, needsGuide: true }).state, 'blocked');
  assert.equal(approvalGate({ ...ok, lint: null, guide: [{ level: 'block', ok: false, id: 'mold.main.y', name: '틀 main 줄 y' }], needsGuide: true }).state, 'blocked');
  // 넘김(guideSkips)은 게이트가 보지 않는다 — 틀 ✗ 를 넘겨도 차단
  assert.equal(approvalGate({ ...ok, guide: [{ level: 'block', ok: false, id: 'mold.sub.y', name: '틀 sub 줄 y' }], needsGuide: true }).state, 'blocked');
});
