// AI 디자인 트랙 7단계(11-09) — 3안 보장 = 과생성(서로 다른 구성 4안 병렬 → 게이트 통과 안 중 먼저 끝난 3안만 노출, 3안 차면 남은 호출 끊기)
//   + 스택 후보(붙는 쪽·장애물·글자 한 단계 축소)로 잉크 겹침·행 간격 미달을 LLM 없이 푼다. claude 호출 없음(run·measure stub).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeDesign, rulesForSpec, KV_PLACEHOLDER, LOGO_PLACEHOLDER, SPARE, cancelError } from '../server/freedesign.js';
import { statsRowOf } from '../server/freejobs.js';
import { fixStackCandidates } from '../core/freequick.js';

const brief = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', role: '자유직무', startDate: '2025-09-22', deadline: '2025-10-12', slogan: '', notice: '' };
const KV = 'data:image/png;base64,iVBORw0KGgo=', LOGO = 'data:image/png;base64,iVBORw0KGgoA';
const input = (extra = {}) => ({ specId: 'google-gdn-580x400', brief, kv: { dataUrl: KV, meta: { kind: 'photo', ar: 0.74, field: { kind: 'photo', lum: 0.48, opaque: 1 } } }, logo: { dataUrl: LOGO, tone: 'dark' }, brand: { primary: '#2A75CE' }, rules: rulesForSpec('google-gdn-580x400'), history: [], prev: null, engine: 'claude-code', spare: 1, ...extra });   // 예비 1 고정(기본 SPARE 는 2)
const html = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard';background:#0B1440">
<div data-object="1" style="position:absolute;left:290px;top:20px;width:240px;height:360px;background:url('${KV_PLACEHOLDER}') center/cover no-repeat"></div>
<img data-logo="1" src="${LOGO_PLACEHOLDER}" style="position:absolute;left:30px;top:24px;width:80px;height:22px">
<div data-field="main" style="position:absolute;left:30px;top:133px;font-size:32px;line-height:38px;font-weight:800;color:#fff">마이다스<br>대규모 공개채용</div>
<div data-field="date" style="position:absolute;left:30px;top:280px;font-size:15px;line-height:20px;color:#fff"><span style="background:#2A75CE;padding:2px 6px">모집기간</span> 9.22(월) ~ 10.12(일)</div>
</div>`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reply = () => ({ text: '```html\n' + html + '\n```\nNOTES: 메모', usage: { input_tokens: 1, output_tokens: 1 }, model: 'stub-model' });
const idOf = p => /## 구성: [^(]+\((\w+)\)/.exec(p)?.[1];
// 신호를 듣는 stub — 끊으면 cancelError(실제 runClaudeCode 와 같음)
const runWith = delay => (p, o = {}) => new Promise((ok, no) => { const id = idOf(p); const t = setTimeout(() => ok(reply()), delay[id] ?? 5); o.signal?.addEventListener?.('abort', () => { clearTimeout(t); no(cancelError()); }, { once: true }); });

test('과생성(eager) — 구성 4개를 동시에, 게이트 통과 3안이 먼저 차면 노출 3 · 남은 예비 호출은 끊고 센다', async () => {
  assert.equal(SPARE, 2);
  const delay = { bleed: 10, diagonal: 20, frame: 30, typehero: 400 };
  const shown = [];
  const out = await freeDesign(input({ spareMode: 'eager' }), { run: runWith(delay), measure: async () => ({ issues: [] }), onVariant: v => shown.push(v.style.id) });
  assert.deepEqual(shown, ['bleed', 'diagonal', 'frame'], '먼저 통과한 3안');
  assert.equal(out.variants.length, 3); assert.ok(out.variants.every(v => v.ok));
  assert.equal(out.planned, 4); assert.equal(out.cut.length, 1); assert.equal(out.cut[0].style.id, 'typehero');
  const cc = out.calls.filter(c => c.cancelled); assert.equal(cc.length, 1, '끊은 호출도 기록'); assert.ok(cc[0].ms < 200, '오래 기다리지 않음');
  const row = statsRowOf({ id: 'x', mode: 'suggest', status: 'done', startedAt: 0, finishedAt: 1, progress: { total: 3 }, result: out });
  assert.equal(row.cut, 1); assert.equal(row.retries, 0);
});

test('과생성 — 반려 안은 숨겨 두고 예비가 메운다 · 모자라면 반려를 보내 「N안 제외」 안내 · 방향 지정·1안은 예비 없음', async () => {
  const delay = { bleed: 5, diagonal: 10, frame: 15, typehero: 30 };
  const shown = [];
  const out = await freeDesign(input({ thirdTry: false }), { run: runWith(delay), measure: async (h, dir) => ({ issues: dir.id === 'diagonal' ? ['대비 main 2.1:1 < 3:1'] : [] }), onVariant: v => shown.push(`${v.style.id}:${v.ok ? 'ok' : 'rej'}`) });
  assert.deepEqual(shown, ['bleed:ok', 'frame:ok', 'typehero:ok'], '반려(diagonal)는 안 보이고 예비(typehero)가 3안째');
  assert.equal(out.spares.length, 1); assert.equal(out.spares[0].style.id, 'diagonal'); assert.equal(out.rejected, 0);
  const shown2 = [];
  const out2 = await freeDesign(input({ thirdTry: false }), { run: runWith(delay), measure: async (h, dir) => ({ issues: ['frame', 'diagonal'].includes(dir.id) ? ['대비 main 2.1:1 < 3:1'] : [] }), onVariant: v => shown2.push(v.ok) });
  assert.deepEqual(shown2, [true, true, false], '통과 2 + 반려 1(숨김 카드) = 3칸');
  assert.equal(out2.variants.length, 3); assert.equal(out2.spares.length, 1);
  const calls = [];
  await freeDesign(input({ styles: ['bleed', 'frame', 'diagonal'] }), { run: (p, o) => { calls.push(idOf(p)); return runWith({})(p, o); }, measure: async () => ({ issues: [] }) });
  assert.equal(calls.length, 3, '방향 지정 = 예비 없음');
});

test('과생성(staged, 기본) — 3안 먼저 · 첫 시도가 걸리면 예비를 깨우고, 아무도 안 걸리면 예비는 안 띄운다(호출 3)', async () => {
  const delay = { bleed: 5, diagonal: 10, frame: 15, typehero: 10 };
  const ids = [];
  const run = (p, o) => { const id = idOf(p); if (id) ids.push(id); return runWith(delay)(p, o); };
  const out = await freeDesign(input(), { run, measure: async () => ({ issues: [] }) });
  assert.deepEqual(ids.sort(), ['bleed', 'diagonal', 'frame'], '예비 안 띄움'); assert.equal(out.planned, 4); assert.equal(out.made, 3); assert.equal(out.cut[0].notStarted, true); assert.equal(out.spareMode, 'staged');
  const ids2 = [];
  const out2 = await freeDesign(input({ thirdTry: false }), { run: (p, o) => { const id = idOf(p); if (id) ids2.push(id); return runWith(delay)(p, o); }, measure: async (h, dir, i, k) => ({ issues: dir.id === 'frame' && k === 1 ? ['대비 main 2.1:1 < 3:1'] : [] }) });
  assert.ok(ids2.includes('typehero'), '첫 시도 걸림 → 예비 띄움'); assert.equal(out2.spareStarts[0].why, 'retry');
  assert.equal(out2.variants.length, 3); assert.ok(out2.variants.every(v => v.ok));
});

test('스택 후보 — 바닥이 막히면 글자 한 단계 축소 · 아래 장애물에 걸친 덩어리는 위로 · 흐름 배치는 후보 없음', () => {
  const rules = { gapSubMain: 0.3, gapMainInfo: 0.8, gapInfoRow: 0.6 };
  const doc = `<div data-ad="1" data-free="1" style="position:relative;width:580px;height:400px"><div data-field="sub" style="position:absolute;left:30px;top:280px;font-size:20px;line-height:24px">서브</div><div data-field="main" style="position:absolute;left:30px;top:300px;font-size:40px;line-height:46px">메인</div><div data-field="date" style="position:absolute;left:30px;top:350px;font-size:16px;line-height:22px">날짜</div></div>`;
  // 위(로고 아래 장애물)·아래(지면 끝)가 막혀 지금 크기로는 벌릴 자리가 없다 → 메인 0.9 후보가 있어야
  const rows = [{ role: 'sub', px: 20, y: 280, h: 24, ink: { x: 30, y: 278, w: 60, h: 28 } }, { role: 'main', px: 40, y: 300, h: 46, ink: { x: 30, y: 298, w: 200, h: 52 } }, { role: 'date', px: 16, y: 350, h: 22, ink: { x: 30, y: 350, w: 120, h: 24 } }];
  const c = fixStackCandidates(doc, rows, { rules, hi: 40, H: 400, obstacles: [{ x: 20, y: 230, w: 100, h: 30 }], want: 20, minPx: 11 });
  assert.ok(c.length >= 1, '후보 있음'); assert.ok(c.every(x => x.moves.some(m => m.scale)), '전부 축소 후보(지금 크기론 안 들어감)');
  assert.ok(/font-size:36px/.test(c[0].html) && /line-height:41.4px/.test(c[0].html), '메인 0.9 — 폭·left 는 그대로');
  // 사진 면(아래 절반)에 이미 걸친 덩어리 → 위로 올린다
  const rows2 = [{ role: 'main', px: 40, y: 150, h: 92, ink: { x: 30, y: 148, w: 300, h: 96 } }, { role: 'date', px: 16, y: 248, h: 22, ink: { x: 30, y: 246, w: 120, h: 24 } }];
  const doc2 = doc.replace(/<div data-field="sub"[^]*?<\/div>/, '');
  const c2 = fixStackCandidates(doc2, rows2, { rules, hi: 40, H: 400, obstacles: [{ x: 0, y: 240, w: 580, h: 160 }], want: 20 });
  assert.ok(c2.length && c2[0].moves.every(m => m.scale || m.dy < 0), '위로');
  assert.deepEqual(fixStackCandidates(doc.replace(/position:absolute;left:30px;top:\d+px;/g, ''), rows, { rules, hi: 40, H: 400 }), [], '흐름 배치');
});
