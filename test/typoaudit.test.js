// 11-03 시안 틀 타이포·여백 검사기(core/typoaudit.js) — 사용자 「폰트가 타이틀보다 서브 비중이 크고, 패딩이 이상하고 … 싹 다 잡아내라」.
//   상한은 청사진 188프레임 분포(서브/메인 p90 .77 → .78, 날짜 뱃지 글자 p90 .66 · 높이 p90 1.10)에서 왔고 세트 값 ×1.15 와 작은 쪽을 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { typoAudit, blueprintOf, fingerprintOf, fpDistance, nearDuplicate, auditFromTrace, BP } from '../core/typoaudit.js';
import { TEMPLATE_FAMILIES } from '../core/templates-data.js';
import { TEMPLATE_PASS } from '../core/templates-quality.js';
import { familiesFor, familyStyle, familyById, frameFor, kvKeyOf } from '../core/recipes.js';
import { renderArtifact } from '../core/contract.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', season: '2025 상반기', startDate: '2025-06-20', deadline: '2025-07-02' }, 'recruit');
const PHOTO = JSON.parse(readFileSync(new URL('../ref/learned/cases/ilhwa-photo/meta.json', import.meta.url), 'utf8'));   // 사진(전면 시안)
const styleOf = kvMeta => normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta, logo: PNG, logoMeta: { px: [1000, 300], tone: 'dark' } });

test('순수 판정: 서브가 메인보다 크거나 굵으면·뱃지 글자가 상한을 넘으면·로고가 글자에 얹히면 ✗, 청사진 그대로면 통과', () => {
  const frame = { w: 1200, h: 628, visual: 'right', full: false, slot: { x: 736, y: 196, w: 447, h: 399 }, rows: [
    { role: 'main', x: 71, y: 221, w: 665, fs: 91, wt: 800, lines: 3 },
    { role: 'date', x: 92, y: 425, w: 453, fs: 44, wt: 700, lines: 1, badge: { h: 70, fill: 'accent' } },
    { role: 'role', x: 93, y: 497, w: 539, fs: 39, wt: 700, lines: 1 }] };
  const bp = blueprintOf(frame);
  assert.equal(+bp.ratio.date.toFixed(2), 0.48); assert.equal(+bp.badgeH.date.toFixed(2), 0.77);
  const good = { W: 1200, H: 628, frame, align: 'left', rows: [
    { role: 'main', px: 91, wt: 800, lines: 3, x: 71, y: 50, w: 600, h: 328, badge: false },
    { role: 'date', px: 44, wt: 700, lines: 1, x: 71, y: 392, w: 440, h: 77, badge: true },
    { role: 'detail', px: 39, wt: 700, lines: 1, x: 71, y: 490, w: 500, h: 51, badge: false }] };
  assert.equal(typoAudit(good).ok, true, JSON.stringify(typoAudit(good).fails));
  const codes = r => typoAudit(r).fails.map(f => f.code);
  assert.ok(codes({ ...good, rows: good.rows.map(r => r.role === 'date' ? { ...r, px: 95 } : r) }).includes('hier-px'), '날짜 > 메인');
  assert.ok(codes({ ...good, rows: good.rows.map(r => r.role === 'main' ? { ...r, wt: 400 } : r) }).includes('hier-wt'), '서브가 더 굵음');
  assert.ok(codes({ ...good, rows: good.rows.map(r => r.role === 'date' ? { ...r, px: 72, h: 110 } : r) }).some(c => c === 'badge-px' || c === 'badge-h'), '뱃지 글자 .79 > 상한');
  assert.ok(codes({ ...good, rows: good.rows.map(r => ({ ...r, x: 200 })) }).includes('pad-x'), '왼쪽 패딩이 청사진에서 벗어남');
  assert.ok(codes({ ...good, logo: { x: 60, y: 110, w: 200, h: 60 } }).includes('logo-overlap'));
  assert.ok(codes({ ...good, kv: { x: 500, y: 300, w: 400, h: 300 }, kvCutout: true }).includes('kv-overlap'));
  assert.ok(BP.sub <= 0.8 && BP.badgePx.date <= 0.7 && BP.badgeH.date <= 1.2, '상한은 청사진 분포 p90 근처');
});

test('렌더 trace 로 잰다: 합격 목록의 사진 시안(1250×560·580×400)은 위계·뱃지·패딩 ✗ 가 없고, 세트 비율(서브/메인)은 전역 상한 안', () => {
  let n = 0;
  for (const id of ['naver-gfa-mobile-da-1250x560', 'google-gdn-580x400', 'blind-feed-image']) {
    for (const f of familiesFor(specs[id], PHOTO)) {
      const html = renderArtifact(id, ctx, { ...styleOf(PHOTO), ...familyStyle(f) }, {}); if (!html) continue;
      const tr = JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"')); if (tr.tpl.unfit) continue;
      const a = auditFromTrace(html, specs[id], frameFor(f, specs[id])); n++;
      assert.ok(a, `${id} ${f.id}: trace 에 rows 가 있다`);
      assert.ok(!a.fails.some(x => ['hier-px', 'hier-wt', 'badge-px', 'badge-h', 'ratio', 'pad-x', 'logo-overlap', 'clip'].includes(x.code)), `${id} ${f.id}: ${JSON.stringify(a.fails)}`);
      const main = tr.tpl.rows.find(r => r.role === 'main'), bp = blueprintOf(frameFor(f, specs[id]));
      for (const r of tr.tpl.rows) if (r !== main) assert.ok(r.px < main.px && r.px / main.px <= 0.8, `${id} ${f.id} ${r.role} ${r.px}/${main.px}`);   // 청사진이 .83(블라인드 날짜)인 세트도 전역 상한(.78)으로
    }
  }
  assert.ok(n >= 5, `잰 그림 ${n}`);
});

test('지문: 글자 상자 몇 px 차이는 같은 안, 뱃지·굵기·역할이 다르면 다른 안 — 합격 목록 안의 사진 시안끼리는 거의 같은 안이 없다', () => {
  const tr = { tpl: { align: 'left', rows: [{ role: 'main', px: 60, wt: 800, x: 50, y: 100, w: 500, h: 140, badge: false }, { role: 'date', px: 30, wt: 700, x: 50, y: 260, w: 300, h: 50, badge: true }], kv: null } };
  const a = fingerprintOf(tr, 1250, 560);
  const b = fingerprintOf({ tpl: { ...tr.tpl, rows: tr.tpl.rows.map(r => ({ ...r, x: r.x + 8, y: r.y + 10 })) } }, 1250, 560);
  assert.ok(nearDuplicate(a, b), `거리 ${fpDistance(a, b)}`);
  const c = fingerprintOf({ tpl: { ...tr.tpl, rows: tr.tpl.rows.map(r => r.role === 'date' ? { ...r, badge: false } : r) } }, 1250, 560);
  assert.ok(fpDistance(a, c) >= 1, '뱃지 유무가 다르면 다른 안');
  const d = fingerprintOf({ tpl: { ...tr.tpl, rows: tr.tpl.rows.map(r => r.role === 'main' ? { ...r, y: 300 } : r) } }, 1250, 560);
  assert.ok(!nearDuplicate(a, d));
  // 합격 목록(중복 제거 뒤)의 같은 규격·유형 안끼리
  const id = 'naver-gfa-mobile-da-1250x560', fps = [];
  for (const f of familiesFor(specs[id], PHOTO)) {
    const html = renderArtifact(id, ctx, { ...styleOf(PHOTO), ...familyStyle(f) }, {}); const t = JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"')); if (t.tpl.unfit) continue;
    const fp = fingerprintOf(t, 1250, 560); assert.ok(!fps.some(x => nearDuplicate(x.fp, fp)), `${f.id} 는 ${fps.find(x => nearDuplicate(x.fp, fp))?.id} 와 같은 안`); fps.push({ id: f.id, fp });
  }
  assert.ok(fps.length >= 2);
  assert.ok(TEMPLATE_PASS.size > 0 && TEMPLATE_FAMILIES.length >= 30 && kvKeyOf(PHOTO) === 'photo');
});
