// 무료 폰트 묶음(10-14) — 카탈로그 모양 · 파일·라이선스 존재 · 매체 고정 게이팅 · lint 경고
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { FONTS, FONT_IDS, DEFAULT_FONT, isBundledFont, fontGroup, fontFiles, localFaceCss, embeddedFaceCss, fontInfoLine, fontRuleOf, effectiveFontId, fontIdOfName, fontLink } from '../core/fonts.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { lintArtifact } from '../core/lint.js';
import { MEDIA } from '../core/media.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const specs = adSpecEntries();
const ctx = createContext({ client: '한진정보통신', role: '백엔드 개발자', employType: '정규직', location: '서울 강남', deadline: '2026-10-31', applyUrl: 'https://example.com/apply' }, 'recruit');
const mediumOf = id => MEDIA.find(m => m.id === id);

test('every catalog entry has family, weights, license and a local folder; Paperlogy is the default (10-15: 규정 없는 매체 기본)', () => {
  assert.equal(DEFAULT_FONT, 'KakaoBigSans');   // 10-15 밤: 기본 카카오 빅산스(규정 없는 매체) — Pretendard 는 규정 매체
  assert.equal(fontGroup('KakaoBigSans'), 'default');
  assert.equal(fontGroup('Pretendard'), 'free');
  for (const id of FONT_IDS) {
    const f = FONTS[id];
    assert.ok(f.family && f.stack.includes(f.family), `${id}: 스택 첫 자리에 family`);
    assert.ok(Array.isArray(f.weights) && f.weights.length >= 3, `${id}: 굵기 목록`);
    assert.equal(f.license.name, 'SIL Open Font License 1.1', id);
    assert.ok(f.license.commercial && f.license.embed && /^https:\/\//.test(f.license.url), `${id}: 상업·임베딩 가능 + 출처 URL`);
    assert.ok(isBundledFont(id), id);
    assert.match(fontInfoLine(id), /상업 광고 가능 · 임베딩 가능 · 굵기/);
  }
  assert.deepEqual(FONT_IDS.filter(id => fontGroup(id) === 'free').slice(0, 7), ['Paperlogy', 'Pretendard', 'Freesentation', 'A2Z', 'NanumSquare', 'NanumSquareNeo', 'NanumSquareRound'], '사용자가 고른 넷이 무료 폰트 맨 앞');
});

test('bundled woff2 files and LICENSE.txt exist on disk, subset size stays small', () => {
  let total = 0;
  for (const id of FONT_IDS) {
    const files = fontFiles(id);
    assert.equal(files.length, FONTS[id].weights.length, id);
    for (const { path: rel, weight } of files) {
      const abs = path.join(ROOT, 'app', rel);
      assert.ok(existsSync(abs), `${id} ${weight}: ${rel}`);
      const n = statSync(abs).size; total += n;
      assert.ok(n > 20_000 && n < 400_000, `${id} ${weight}: ${n}B — 서브셋이 깨졌거나(너무 작음) 전체 글립이 들어갔다(너무 큼)`);
    }
    const lic = path.join(ROOT, 'app', FONTS[id].dir, 'LICENSE.txt');
    assert.ok(existsSync(lic), `${id}: LICENSE.txt`);
    assert.match(readFileSync(lic, 'utf8'), /SIL Open Font License, Version 1\.1/i, `${id}: OFL 전문`);
  }
  assert.ok(total < 14_000_000, `전체 ${total}B — 14MB 넘으면 다시 줄인다(10-15: 사용자 제공 Paperlogy·Freesentation·A2Z 9굵기씩 추가로 7MB → 14MB)`);
});

test('@font-face css: preview uses relative paths with the real family name; export uses data URLs', () => {
  const css = localFaceCss('NanumSquareNeo');
  assert.match(css, /font-family:'NanumSquare Neo';src:url\(fonts\/nanum-square-neo\/nanum-square-neo-700\.woff2\)/);
  assert.match(localFaceCss('KakaoBigSans', '../app/'), /url\(\.\.\/app\/fonts\/kakao-big-sans\/kakao-big-sans-400\.woff2\)/);
  const emb = embeddedFaceCss('NanumSquare', { 400: 'data:font/woff2;base64,AAAA', 700: 'data:font/woff2;base64,BBBB' });
  assert.match(emb, /font-family:'NanumSquare';src:url\(data:font\/woff2;base64,AAAA\)/);
  assert.ok(!/800/.test(emb), '받지 못한 굵기는 넣지 않는다');
  assert.equal(localFaceCss('nope'), '');
  // 랜딩·인쇄(fontLink): CDN css 가 없는 묶음 폰트는 상대 경로 @font-face
  assert.match(fontLink('KakaoBigSans'), /<style>.*Kakao Big Sans/);
  assert.equal(fontLink('KakaoBigSans', false), '');
});

test('medium rule: 자소설·카카오·리멤버 fix Pretendard; others are free; naver-gfa only recommends', () => {
  for (const id of ['jasoseol', 'kakao', 'remember']) {
    const r = fontRuleOf(mediumOf(id));
    assert.ok(r.fixed && r.required === 'Pretendard' && r.requiredId === 'Pretendard', id);
    assert.equal(effectiveFontId(mediumOf(id), 'NanumSquare'), 'Pretendard', id);
  }
  for (const id of ['google-gdn', 'instagram', 'blind', 'albamon', 'everytime', 'naver-gfa']) {
    assert.ok(!fontRuleOf(mediumOf(id)).fixed, id);
    assert.equal(effectiveFontId(mediumOf(id), 'NanumSquare'), 'NanumSquare', id);
  }
  assert.match(fontRuleOf(mediumOf('naver-gfa')).recommended, /나눔고딕/);
  // 10-28 컨시어지 #12: 카카오는 비즈보드만 Pretendard 고정, PC디스플레이는 규격 fonts.required:false 로 자유 — spec 이 매체를 덮는다
  const kakao = mediumOf('kakao'), kspec = id => kakao.specs.find(s => s.id === id);
  assert.ok(fontRuleOf(kakao, kspec('kakao-bizboard-mo')).fixed && fontRuleOf(kakao, kspec('kakao-bizboard-mo')).required === 'Pretendard');
  for (const id of ['kakao-display-pc-promo', 'kakao-display-pc-profile']) {
    assert.equal(fontRuleOf(kakao, kspec(id)).fixed, false, id);
    assert.equal(effectiveFontId(kakao, 'NanumSquare', kspec(id)), 'NanumSquare', id);
  }
  assert.equal(effectiveFontId(kakao, 'NanumSquare', kspec('kakao-bizboard-mo')), 'Pretendard');
  assert.equal(fontIdOfName('나눔고딕'), 'NanumGothic');
  assert.equal(fontIdOfName('Kakao Big Sans'), 'KakaoBigSans');
  // allowed 배열(아직 매체 JSON 에 없음)이 생기면 카탈로그에 있는 첫 폰트를 쓴다 — 값은 읽기만
  assert.equal(effectiveFontId({ fonts: { required: null, allowed: ['Gmarket Sans', 'Pretendard'] } }, 'SUIT'), 'GmarketSans');
  assert.equal(effectiveFontId({ fonts: { required: null, allowed: ['Comic Sans'] } }, 'SUIT'), 'SUIT');
  assert.equal(effectiveFontId(null, 'SUIT'), 'SUIT');
});

test('renderer: jasoseol renders Pretendard first regardless of the chosen font; google-gdn renders the chosen family', () => {
  const style = normalizeStyle({ colors: ['#0B3C8C'], fonts: { heading: 'NanumSquareNeo', body: 'NanumSquareNeo' } });
  const j = renderAd(ctx, style, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(j, /font-family:'Pretendard', 'NanumSquare Neo'/);
  const g = renderAd(ctx, style, specs['google-gdn-300x600']);
  assert.match(g, /font-family:'NanumSquare Neo'/);
  assert.doesNotMatch(g, /font-family:'Pretendard', 'NanumSquare Neo'/);
  assert.match(renderAd(ctx, normalizeStyle({ colors: ['#0B3C8C'], fonts: { heading: 'KakaoBigSans', body: 'KakaoBigSans' } }), specs['google-gdn-300x600']), /font-family:'Kakao Big Sans'/);
});

test('lint still warns when a fixed medium measures another family', () => {
  const spec = specs['jasoseol-pc-premium-popup-pc'];
  const base = { w: spec.rules.w, h: spec.rules.h, bytes: 1000, format: 'png', transparent: false, texts: [], logo: null };
  const bad = lintArtifact({ spec: spec.rules, medium: spec.mediumRules, measure: { ...base, fontFamily: 'NanumSquare Neo' } });
  assert.ok(bad.issues.some(i => i.code === 'font'), '고정 매체에 다른 서체 → 경고');
  const ok = lintArtifact({ spec: spec.rules, medium: spec.mediumRules, measure: { ...base, fontFamily: 'Pretendard' } });
  assert.ok(!ok.issues.some(i => i.code === 'font'));
  const free = specs['google-gdn-300x600'];
  const g = lintArtifact({ spec: free.rules, medium: free.mediumRules, measure: { ...base, w: free.rules.w, h: free.rules.h, fontFamily: 'NanumSquare Neo' } });
  assert.ok(!g.issues.some(i => i.code === 'font'), '자유 매체는 고른 서체 그대로');
});
