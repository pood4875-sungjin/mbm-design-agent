// 11-06 사용자: 틀 후보에서 「텍스트 스타일이 다르고(시즌 400 ↔ 메인 800) 연도가 뜬금없는 자리(시즌 → 날짜 → 메인)」 — 서브 굵기 하한 600, 날짜 끼인 프레임 제외
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameIssues, frameFor, familyById } from '../core/recipes.js';
import { TEMPLATE_FAMILIES } from '../core/templates-data.js';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { adSpecEntries } from '../core/adspecs.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

test('frameIssues: 날짜 줄이 시즌과 메인 사이면 date-between — gdn-21402-170 의 970×250 프레임만 걸리고, 그 규격에선 이 가족이 빠진다', () => {
  const f = familyById('gdn-21402-170'); assert.ok(f);
  const bad = f.frames.find(fr => fr.w === 970); assert.deepEqual(frameIssues(bad), ['date-between'], '970×250 프레임만 결함');
  assert.ok(f.frames.filter(fr => fr.w !== 970).every(fr => !frameIssues(fr).length), '다른 프레임은 정상');
  assert.equal(frameFor(f, adSpecEntries()['google-gdn-970x250']), null, '970 규격엔 이 가족의 프레임이 없다(비율 맞는 다른 프레임도 없음)');
  assert.ok(frameFor(f, adSpecEntries()['google-gdn-580x400']), '580 규격은 그대로');
  const hit = TEMPLATE_FAMILIES.flatMap(x => x.frames).filter(fr => frameIssues(fr).length).length;
  assert.ok(hit >= 1 && hit <= 8, `결함 프레임 ${hit} — 규칙이 너무 넓으면 안 된다`);
});

test('시즌(서브) 굵기 하한: 메인 700 이상인데 시즌 400 인 틀(gdn2-18846-138)은 서브를 600 으로 그린다', () => {
  const f = familyById('gdn2-18846-138'); assert.ok(f);
  const spec = adSpecEntries()['google-gdn-970x250']; const fr = frameFor(f, spec); assert.ok(fr);
  assert.ok((fr.rows.find(r => r.role === 'season')?.wt ?? 700) < 500, '원본 시즌은 얇다');
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  const ctx = createContext({ client: '한진정보통신', role: '클라우드', employType: '신입 공채', location: '', deadline: '2026-10-31', season: '2026년' }, 'recruit');
  const prof = (n, g) => Array.from({ length: n }, (_, i) => ({ bg: g(i / (n - 1)) }));
  const PHOTO = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.4, sat: 0.3, focus: { x: 0.6, y: 0.5, w: 0.5, h: 0.8, parts: 1, others: [] }, cols: prof(32, () => 0.4), rows: prof(32, () => 0.4) } };
  const style = normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: PHOTO, logo: PNG, logoMeta: { px: [1043, 304], tone: 'dark' }, tpl: f.id, fonts: { heading: f.font, body: f.font } });
  const html = renderArtifact('google-gdn-970x250', ctx, style);
  const m = /<div data-field="sub"[^>]*font-weight:(\d+)/.exec(html); assert.ok(m, '서브 줄');
  assert.equal(+m[1], 600);
});
