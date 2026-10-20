import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintArtifact } from '../core/lint.js';

// 검사기는 순수 함수다. 측정(픽셀·바이트·글자·색)은 앱이 하고, 여기서는 규칙과 비교만 한다.
// 그래야 Node 테스트에서 매체 규칙 하나하나를 고정할 수 있다.

const medium = { id: 'm', name: '매체', textColors: null, fonts: null, textCounting: 'all-1' };
const spec = {
  id: 'm-a', name: '배너', w: 1000, h: 200, exportScale: 1, format: ['png', 'jpg'], maxKB: 150,
  textLimits: [{ field: '메인문구', maxChars: 10, lines: 2, original: '최대 2행, 행당 최대 10자' }],
  background: null, safeArea: null, logo: null,
};
const ok = {
  w: 1000, h: 200, bytes: 100 * 1024, format: 'png', transparent: false, fontFamily: 'Pretendard',
  texts: [{ role: 'main', text: '열글자짜리문구입니다', lines: 1, fontPx: 40, color: '#000000', bbox: { x: 40, y: 40, w: 400, h: 50 } }],
  logo: null,
};

const codes = r => r.issues.map(i => i.code);

test('a conforming artifact passes with no issues', () => {
  const r = lintArtifact({ spec, medium, measure: ok });
  assert.equal(r.level, 'pass');
  assert.deepEqual(r.issues, []);
});

test('size must match the submitted pixel size exactly — a 1px difference is a rejection', () => {
  const r = lintArtifact({ spec, medium, measure: { ...ok, w: 999 } });
  assert.equal(r.level, 'block');
  assert.ok(codes(r).includes('size'));
});

test('submitted size is canvas × exportScale unless the spec states a submit size', () => {
  const s2 = { ...spec, exportScale: 2 };
  assert.equal(lintArtifact({ spec: s2, medium, measure: { ...ok, w: 2000, h: 400 } }).level, 'pass');
  assert.ok(codes(lintArtifact({ spec: s2, medium, measure: ok })).includes('size'));
  const s3 = { ...spec, exportScale: 2, submitW: 1100, submitH: 800 };
  assert.equal(lintArtifact({ spec: s3, medium, measure: { ...ok, w: 1100, h: 800 } }).level, 'pass');
});

test('file weight over maxKB blocks, under minKB warns', () => {
  assert.ok(codes(lintArtifact({ spec, medium, measure: { ...ok, bytes: 151 * 1024 } })).includes('weight'));
  const r = lintArtifact({ spec: { ...spec, minKB: 50 }, medium, measure: { ...ok, bytes: 10 * 1024 } });
  assert.equal(r.level, 'warn');
  assert.ok(codes(r).includes('weight-min'));
});

test('format must be one the medium accepts; jpeg and jpg are the same thing', () => {
  assert.ok(codes(lintArtifact({ spec, medium, measure: { ...ok, format: 'gif' } })).includes('format'));
  assert.equal(lintArtifact({ spec, medium, measure: { ...ok, format: 'jpeg' } }).level, 'pass');
});

test('text over the character or line limit blocks, using the medium counting rule', () => {
  const over = { ...ok, texts: [{ ...ok.texts[0], text: '스물두글자가넘어가는아주긴메인문구입니다요오' }] };
  assert.ok(codes(lintArtifact({ spec, medium, measure: over })).includes('chars'));
  const lines = { ...ok, texts: [{ ...ok.texts[0], lines: 3 }] };
  assert.ok(codes(lintArtifact({ spec, medium, measure: lines })).includes('lines'));
  // 자소설식 계산이면 영문 22자는 11자다 — 통과
  const latin = { ...ok, texts: [{ ...ok.texts[0], text: 'ABCDEFGHIJKLMNOPQRSTUV' }] };
  assert.ok(codes(lintArtifact({ spec, medium, measure: latin })).includes('chars'));
  assert.equal(lintArtifact({ spec, medium: { ...medium, textCounting: 'half-latin' }, measure: latin }).level, 'pass');
});

test('text colors are enforced only where the spec itself defines them (bizboards), not from medium-wide notes', () => {
  const biz = { ...spec, textColors: { main: '#4C4C4C', sub: ['#555555', '#777777'] } };
  const wrong = { ...ok, texts: [{ ...ok.texts[0], color: '#777777' }] };
  const r = lintArtifact({ spec: biz, medium, measure: wrong });
  assert.ok(codes(r).includes('color'), '메인 글자색이 서브 색이면 반려된 실제 사례(안랩)');
  assert.equal(lintArtifact({ spec: biz, medium, measure: { ...ok, texts: [{ ...ok.texts[0], color: '#4c4c4c' }] } }).level, 'pass');
  // 매체 단위 textColors("비즈보드 전용"·"흑/백 택1" 메모가 붙은 참고값)는 다른 규격에 강제되지 않는다
  const noted = { ...medium, textColors: { main: '#4C4C4C', sub: ['#555555'], note: '비즈보드 전용' } };
  assert.equal(lintArtifact({ spec, medium: noted, measure: wrong }).level, 'pass');
});

test('required font is a warning, not a block — the eye cannot tell at a glance but the file can be fixed', () => {
  const r = lintArtifact({ spec, medium: { ...medium, fonts: { required: 'Pretendard' } }, measure: { ...ok, fontFamily: 'Noto Sans KR' } });
  assert.equal(r.level, 'warn');
  assert.ok(codes(r).includes('font'));
});

test('numeric safe area: any text or logo box crossing it blocks; note-only safe areas are skipped', () => {
  const s = { ...spec, safeArea: { top: 50, bottom: 35, left: 240, right: 240 } };
  const inside = { ...ok, texts: [{ ...ok.texts[0], bbox: { x: 240, y: 50, w: 500, h: 100 } }] };
  assert.equal(lintArtifact({ spec: s, medium, measure: inside }).level, 'pass');
  const crossing = { ...ok, texts: [{ ...ok.texts[0], bbox: { x: 230, y: 50, w: 500, h: 100 } }] };
  assert.ok(codes(lintArtifact({ spec: s, medium, measure: crossing })).includes('safe-area'));
  const noteOnly = { ...spec, safeArea: { note: '상하좌우 20px 안쪽' } };
  assert.equal(lintArtifact({ spec: noteOnly, medium, measure: crossing }).level, 'pass');
});

test('text height range from the medium is checked against the measured font size', () => {
  const s = { ...spec, textHeightPx: { min: 22, max: 52 } };
  assert.ok(codes(lintArtifact({ spec: s, medium, measure: { ...ok, texts: [{ ...ok.texts[0], fontPx: 18 }] } })).includes('text-height'));
  assert.equal(lintArtifact({ spec: s, medium, measure: { ...ok, texts: [{ ...ok.texts[0], fontPx: 30 }] } }).level, 'pass');
});

test('transparency requirement is checked when the spec states it', () => {
  const s = { ...spec, background: 'PNG 투명 배경' };
  assert.ok(codes(lintArtifact({ spec: s, medium, measure: { ...ok, transparent: false } })).includes('transparent'));
  assert.equal(lintArtifact({ spec: s, medium, measure: { ...ok, transparent: true } }).level, 'pass');
  const noT = { ...spec, background: '투명 배경 불가' };
  assert.ok(codes(lintArtifact({ spec: noT, medium, measure: { ...ok, transparent: true } })).includes('transparent'));
});

test('a truncated slot blocks — the copy is longer than the medium allows', () => {
  const r = lintArtifact({ spec, medium, measure: { ...ok, texts: [{ ...ok.texts[0], truncated: true }] } });
  assert.ok(codes(r).includes('overflow'));
});

test('an unmeasured value never fails — null means "could not measure", not "wrong"', () => {
  const r = lintArtifact({ spec, medium, measure: { ...ok, bytes: null, transparent: null, fontFamily: null } });
  assert.equal(r.level, 'pass');
});

test('banned background colours (medium.backgroundColors.banned) block when a sampled background pixel is within tolerance; unmeasured bgColors never fail', () => {
  const med = { ...medium, backgroundColors: { banned: ['#FFFFFF', '#000000', '#FF5414', '#F7F7F0', '#E8E7E0'] } };
  const r1 = lintArtifact({ spec, medium: med, measure: { ...ok, bgColors: ['#1E8BFF', '#1C7FE6'] } });
  assert.deepEqual(codes(r1), []);
  const r2 = lintArtifact({ spec, medium: med, measure: { ...ok, bgColors: ['#1E8BFF', '#FF5212'] } });   // 브랜드 주황 ±2
  assert.deepEqual(codes(r2), ['bg-banned']); assert.equal(r2.level, 'block');
  const r3 = lintArtifact({ spec, medium: med, measure: { ...ok, bgColors: null } });
  assert.deepEqual(codes(r3), []);
  // 금지색이 없는 매체는 검사하지 않는다
  assert.deepEqual(codes(lintArtifact({ spec, medium, measure: { ...ok, bgColors: ['#FFFFFF'] } })), []);
});

test('bg-banned boundary: ±12 per channel blocks, 13 passes; 3-digit hex is expanded; malformed colours are ignored, never a silent pass-as-violation', () => {
  const med = { ...medium, backgroundColors: { banned: ['#FF5414', '#FFFFFF', '#'] } };
  const run = bgColors => codes(lintArtifact({ spec, medium: med, measure: { ...ok, bgColors } }));
  assert.deepEqual(run(['#FF6014']), ['bg-banned']);          // +12
  assert.deepEqual(run(['#FF6114']), []);                      // +13
  assert.deepEqual(run(['#fff']), ['bg-banned']);              // #fff → #FFFFFF
  assert.deepEqual(run(['rgb(1,2,3)', '#12345', '']), []);     // 비정상 입력은 무시
});
