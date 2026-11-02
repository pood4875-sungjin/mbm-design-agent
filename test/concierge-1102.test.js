// 11-02 담당자 요청(Notion 컨시어지 리스트 2차) — 리멤버 오브젝트형 칸 · 틀 누끼 잘림 없음 · 비즈보드 서브 글자 수 사다리 · SVG 그림 해상도 상한 · 보조색 그라데이션
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { resolveField } from '../core/field.js';
import { SVG_IMG_MAX_PX } from '../core/svgexport.js';
import { lintArtifact } from '../core/lint.js';
import { specOf } from '../core/media.js';

const specs = adSpecEntries();
const col = arr => arr.map(bg => ({ bg }));
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const CUT = { ar: 1.1, px: [860, 770], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.6, semi: 0.1, focus: { x: 0.5, y: 0.5, w: 0.9, h: 0.9, parts: 1, others: [], density: 0.6 }, cols: col([1, 0.5, 0.3, 0.3, 0.5, 1]), rows: col([1, 0.5, 0.3, 0.3, 0.5, 1]) } };
const fields = { client: 'GS에너지', hiringType: '신입 공채', season: '2025년', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00' };
const ctx = createContext(fields, 'recruit');
const cut = normalizeStyle({ colors: ['#1E4FD8'], keyVisual: PNG, kvMeta: CUT, logo: PNG, logoTone: 'dark' });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"'));

test('리멤버 누끼 → 오브젝트형 칸(mold.imageCutout) 6규격: 칸 그대로 center/contain · 블리드 없음 · 썸네일 열 아님', () => {
  const Z = { 'remember-main-top-pc': [1316, 38, 844, 284], 'remember-main-top-mo': [605, 28, 346, 304], 'remember-main-mid-pc': [1303, 24, 880, 192], 'remember-main-mid-mo': [605, 28, 346, 304], 'remember-job-top-pc': [1303, 24, 880, 192], 'remember-job-side-pc': [689, 12, 412, 252] };
  for (const [id, [x, y, w, h]] of Object.entries(Z)) {
    const html = renderAd(ctx, cut, specs[id]); const tr = traceOf(html);
    assert.ok(tr.rules.includes('templateMold.cutoutZone'), id);
    assert.match(html, new RegExp(`data-object="1" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;[^"]*center\\/contain`), id + ' 오브젝트형 칸');
    assert.doesNotMatch(html, /data-bleed="1"|--kv-bleed:1/, id + ' 블리드 없음');
  }
});

test('틀 그림 칸의 누끼는 블리드 없이 칸 안에 통째로(자소설 PC팝업 550·M메인 750·구글 580) — 11-02 「누끼 잘림 최소화」', () => {
  for (const id of ['jasoseol-pc-premium-popup-pc', 'jasoseol-m-standard-main-mo', 'google-gdn-580x400']) {
    const html = renderAd(ctx, cut, specs[id]); const tr = traceOf(html);
    assert.equal(tr.gate.singleObj, false, id); assert.ok(!tr.rules.includes('templateMold.slotBleed') && !tr.rules.includes('objectBleed'), id);
    assert.doesNotMatch(html, /data-bleed="1"|--kv-bleed:1/, id);
    assert.match(html, /data-object="1" style="[^"]*\/(contain|auto \d+px) no-repeat/, id + ' contain');
  }
});

test('카카오 비즈보드 960×300 서브: 글자수 규정이 없다(공식 최대 526px) — 접수기간이 그대로 38pt 한 줄 · 고지 문구가 길어도 잘리지 않게', () => {
  const html = renderAd(ctx, normalizeStyle({ colors: ['#1E4FD8'], logo: PNG, logoTone: 'dark' }), specs['kakao-bizboard-mo']);
  const sub = html.match(/data-field="sub"[^>]*>([^<]*)</)?.[1];
  assert.ok(sub && /17시/.test(sub), '시각까지: ' + sub);
  assert.match(html, /data-field="sub"[^>]*font-size:38px/);
});

test('카카오 비즈보드 안전영역 48px vs 템플릿 글자 상자 x46 — 틀 규격은 2.5px 봐준다(safe-area 차단 아님)', () => {
  const spec = specOf('kakao-bizboard-mo');
  const r = lintArtifact({ spec, medium: 'kakao', measure: { texts: [{ role: 'main', text: 'GS에너지 신입 공채', bbox: { x: 46, y: 68, w: 491, h: 59 } }] } });
  assert.ok(!JSON.stringify(r).includes('safe-area'), JSON.stringify(r).slice(0, 300));
});

test('SVG 안 그림 조각 긴 변 상한 3,600px(전 1,600) — 11-02 「SVG 화질 저하」', () => { assert.equal(SVG_IMG_MAX_PX, 3600); });

test('보조색: 그라데이션 고정 + 손으로 고른 색이면 두 번째 정지점은 보조색(11-02 「보조색 변화 없음」) · 단색이면 주색 하나', () => {
  const g = resolveField({ palette: { primary: '#1E4FD8', secondary: '#E55927' }, colorsManual: true, background: { mode: 'gradient' } }, { facing: 'left' });
  assert.deepEqual(g.stops.map(s => s.toUpperCase()), ['#1E4FD8', '#E55927']);
  const s1 = resolveField({ palette: { primary: '#1E4FD8', secondary: '#E55927' }, colorsManual: true, background: { mode: 'solid' } }, { facing: 'left' });
  assert.equal(s1.stops.length, 1);
});
