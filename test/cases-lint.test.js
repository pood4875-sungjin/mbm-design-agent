import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraChecks, coverageOf, decodeDump } from '../scripts/lib/lint-extra.mjs';
import { adSpecEntries } from '../core/adspecs.js';

// 매체 규정 전수 검사(scripts/cases-lint.mjs)의 Node 쪽 보조 규칙. core/lint.js 가 보지 않는 로고·템플릿 글자 px·오브젝트 상자를 같은 측정값으로 본다.

const codes = r => r.map(i => i.code);
const entry = (rules, extra = {}) => ({ rules: { w: 1000, h: 300, ...rules }, mediumRules: { textCounting: 'all-1' }, exportScale: 1, ...extra });
const text = (role, fontPx = 30) => ({ role, text: '문구', lines: 1, fontPx, color: '#000000', bbox: { x: 10, y: 10, w: 100, h: 40 } });

test('dump-dom 직렬화를 되돌린다 — &nbsp; 는 U+00A0 이라 글자수에 5자가 더해지면 안 된다', () => {
  assert.equal(decodeDump('MIDAS&nbsp;IT &quot;a&quot; &lt;b&gt; &amp;amp; &#39;x&#x41;'), 'MIDAS IT "a" <b> &amp; \'xA');
});

test('로고 삽입 불가 규격(count 0)에 로고가 있으면 차단', () => {
  const r = extraChecks(entry({ logo: { count: 0, w: null, h: null, note: '로고 삽입 불가' } }), { texts: [], logo: { bbox: { x: 0, y: 0, w: 100, h: 30 } } });
  assert.ok(codes(r).includes('logo-forbidden'));
  assert.equal(r[0].level, 'block');
  assert.deepEqual(extraChecks(entry({ logo: { count: 0 } }), { texts: [], logo: null }), []);
});

test('템플릿 로고 영역(w·h)보다 큰 로고는 경고 — 별도 파일로 내는 규격(블라인드 96×96)과 로고 파일 자체가 제출물인 규격은 제외', () => {
  const big = { texts: [], logo: { bbox: { x: 0, y: 0, w: 200, h: 40 } } };
  assert.ok(codes(extraChecks(entry({ logo: { count: 1, w: 150, h: 31 } }), big)).includes('logo-size'));
  assert.deepEqual(extraChecks(entry({ logo: { count: 1, w: 150, h: 31 } }), { texts: [], logo: { bbox: { x: 0, y: 0, w: 150, h: 31 } } }), []);
  assert.deepEqual(extraChecks(entry({ logo: { count: 1, w: 96, h: 96, note: '로고는 별도 파일(blind-brand-logo)로 제출' } }), big), []);
  assert.deepEqual(extraChecks(entry({ w: 300, h: 180, logo: { count: 1, w: 300, h: 180, note: '로고 파일 자체가 제출물' } }), big), []);
});

test('로고 높이 범위(hRange)는 로고가 메인 카피를 대신할 때만 — 메인 글자가 있으면 보지 않는다', () => {
  const rules = { logo: { count: null, hRange: [35, 45] } };
  const low = { texts: [], logo: { bbox: { x: 0, y: 0, w: 100, h: 20 } } };
  assert.ok(codes(extraChecks(entry(rules), low)).includes('logo-hrange'));
  assert.deepEqual(extraChecks(entry(rules), { ...low, texts: [text('main')] }), []);
  assert.deepEqual(extraChecks(entry(rules), { texts: [], logo: { bbox: { x: 0, y: 0, w: 100, h: 40 } } }), []);
});

test('매체가 역할별 글자 px 를 박아 둔 규격(자소설 fontSizes)은 실측 px 와 다르면 경고 — 2배 프레임 기준 값은 비교하지 않는다', () => {
  const fs = { '서브문구': 22, '메인문구': 35, '상세문구': 17, unit: 'px (550×400 캔버스 기준)' };
  const r = extraChecks(entry({ fontSizes: fs }), { texts: [text('main', 35), text('sub', 20), text('detail', 17)], logo: null });
  assert.deepEqual(codes(r), ['font-template']);
  assert.equal(r[0].role, 'sub');
  const twice = { '메인문구': 40, unit: 'px (피그마 템플릿 328×466 = 2배 프레임 기준)' };
  assert.deepEqual(extraChecks(entry({ fontSizes: twice }), { texts: [text('main', 20)], logo: null }), []);
});

test('오브젝트 상자(에브리타임 zone)는 누끼일 때만 — 너비 220~320, 오른쪽 기준 40~360px 구역', () => {
  const ob = { side: 'right', wMin: 220, wMax: 320, zone: [40, 360], gap: 19 };
  const e = entry({ w: 1029, h: 258, objectBox: ob });
  const m = w0 => ({ texts: [], logo: null, cutout: true, objects: [{ bbox: { x: 1029 - 360 + Math.round((320 - w0) / 2), y: 40, w: w0, h: 178 } }] });
  assert.deepEqual(extraChecks(e, m(260)), []);
  assert.ok(codes(extraChecks(e, m(180))).includes('object-width'));
  assert.ok(codes(extraChecks(e, { ...m(260), objects: [{ bbox: { x: 100, y: 40, w: 260, h: 178 } }] })).includes('object-zone'));
  assert.deepEqual(extraChecks(e, { ...m(180), cutout: false }), []);   // 배경 있는 그림은 상자 규정 밖
});

test('coverageOf — 규격마다 검사할 규정 데이터가 있는지(없으면 통과가 아니라 미검사)', () => {
  const c = coverageOf(entry({ textLimits: [{ field: '메인 문구', maxChars: 24, lines: 1 }, { field: '제목 (이미지 밖 텍스트 필드)', maxChars: 15, lines: 1 }], safeArea: { note: '메모만' }, logo: { count: null } }));
  assert.deepEqual(c.chars, ['main']);
  assert.deepEqual(c.lines, ['main']);
  assert.equal(c.safeArea, false); assert.equal(c.safeAreaMemoOnly, true);
  assert.equal(c.logoCount, false); assert.equal(c.logoPosition, false); assert.equal(c.fontRange, false);
  const d = coverageOf(entry({ safeArea: { top: 40, right: 40, bottom: 90, left: 40 }, textHeightPx: { min: 22, max: 52 }, logo: { count: 1, w: 150, h: 31 }, objectBox: {} }));
  assert.equal(d.safeArea, true); assert.equal(d.fontRange, true); assert.equal(d.logoCount, true); assert.equal(d.logoSize, true); assert.equal(d.objectBox, true);
});

test('실제 매체 규격에 대해 coverageOf 가 모두 계산되고, 글자수 한도가 있는 규격이 절반 안팎이다(규정 데이터 공백을 보고서가 밝힌다)', () => {
  const entries = Object.values(adSpecEntries());
  const cov = entries.map(coverageOf);
  assert.ok(cov.every(c => typeof c.size === 'boolean'));
  const withChars = cov.filter(c => c.chars.length).length;
  assert.ok(withChars > 0 && withChars < entries.length);
  assert.ok(cov.every(c => c.logoPosition === false));
});

// ── 10-12 전수 검사에서 잡힌 렌더러 버그: 잡다 PC 라벨 칩 4자 한도에 "신입·경력"(5자)이 그대로 그려졌다(sep-open-recruit).
//    라벨 칩은 사다리가 짧아(모집직무 : …, 고용형태) 한도 안 문구가 없으면 비운다 — 지어내지 않는다
import { renderAd } from '../core/renderers/ad.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { countChars } from '../core/adfields.js';
test('라벨 칩이 매체 글자수 한도(잡다 라벨 4자)를 넘는 문구뿐이면 그리지 않는다', () => {
  const specs = adSpecEntries();
  const ctx = createContext({ client: '마이다스', role: '자유직무, 경영·제품·사업 분야', employType: '신입·경력', deadline: '2025-10-12', season: '2025 하반기', hiringType: '대규모 공개채용' }, 'recruit');
  const html = renderAd(ctx, normalizeStyle({ colors: ['#1428A0'] }), specs['jobda-main-pc']);
  const labels = [...html.matchAll(/data-field="label"[^>]*>([^<]*)</g)].map(m => m[1]);
  assert.ok(labels.every(t => countChars(t) <= 4), `라벨 ${JSON.stringify(labels)}`);
  // 한도 안에 드는 고용형태는 그대로 — 규칙이 라벨을 통째로 없애는 게 아니다
  const ok = renderAd(createContext({ client: '마이다스', role: '엔지니어', employType: '정규직', deadline: '2025-10-12' }, 'recruit'), normalizeStyle({ colors: ['#1428A0'] }), specs['jobda-main-pc']);
  // 10-12 매체별 규격정리: 날짜가 있으면 라벨 칩은 「접수기간」(4자, 잡다 샘플 5/5 「모집기간」 칩)이 먼저 — 고용형태는 날짜가 없을 때
  assert.ok(/data-field="label"[^>]*>접수기간</.test(ok));
  const noDate = renderAd(createContext({ client: '마이다스', role: '엔지니어', employType: '정규직' }, 'recruit'), normalizeStyle({ colors: ['#1428A0'] }), specs['jobda-main-pc']);
  assert.ok(/data-field="label"[^>]*>정규직</.test(noDate));
});
