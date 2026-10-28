// Figma 9월 공채 타이포 비교(ref/learned/cases/_out/figma-sep-typo.md)에서 채택한 규칙 A1~A7·B1 + 10-08 밤 충돌 조정(B2~B4)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { layoutFor } from '../core/layouts.js';
import { CANON } from '../core/canon.js';

const col = arr => arr.map(bg => ({ bg }));
const RING = { ar: 1.71, px: [1710, 1000], field: { kind: 'cutout', opaque: 0.04, lum: 0.48, sat: 0.3, semi: 0.157, focus: { x: 0.5, y: 0.49, w: 0.94, h: 0.86, parts: 1, others: [], density: 0.57 }, cols: col([1, 0.6, 0.4, 0.3, 0.3, 0.4, 0.5, 1]), rows: col([1, 0.6, 0.4, 0.3, 0.3, 0.4, 0.5, 1]) } };
const specs = adSpecEntries();
// 10-16: 카카오 PC디스플레이 1200×600 은 한국앤컴퍼니 샘플 틀(templateMold)이 생겼다 — 이 파일의 자유 배치 검증은 틀 뗀 사본으로(숫자·안전영역·글자 한도는 그대로)
specs['kakao-display-pc-promo'] = (e => { const c = structuredClone(e); delete c.rules.safeArea.measuredFromTemplate.mold; return c; })(specs['kakao-display-pc-promo']);
const fields = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', slogan: '자소서 없는 간편지원', role: '자유직무, 경영·제품·사업 분야', employType: '신입·경력', startDate: '2025-09-22', deadline: '2025-10-12' };
const ctx = createContext(fields, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const style = normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: RING, logo: PNG, logoTone: 'dark' });
const plain = normalizeStyle({ colors: ['#00146E'] });
const tagOf = (html, role) => html.match(new RegExp(`<div data-field="${role}" style="([^"]*)"`))?.[1] ?? null;
const textOf = (html, role) => html.match(new RegExp(`<div data-field="${role}"[^>]*>([\\s\\S]*?)</div>`))?.[1] ?? null;
// 상세 블록은 안에 줄마다 div가 있다 — 블록 시작부터 끝까지(다음 형제 전까지) 통째로
const detailOf = html => { const i = html.indexOf('<div data-field="detail"'); return i < 0 ? '' : html.slice(i, html.indexOf('</div></div>', i) + 12); };
const num = (css, k) => Number(css?.match(new RegExp(`${k}:(-?[\\d.]+)`))?.[1]);

test('A1 가로형 줄 간격: 메인 1.25 · 서브·상세 1.3 (디자이너 가로형 4/4가 1.2~1.25)', () => {
  for (const [w, h] of [[1200, 600], [2240, 360], [1029, 258]]) {
    const L = layoutFor(w, h);
    assert.equal(L.mainLine, 1.25); assert.equal(L.subLine, 1.3); assert.equal(L.detailLine, 1.3);
  }
  const css = tagOf(renderAd(ctx, style, specs['kakao-display-pc-promo']), 'main');
  assert.equal(num(css, 'line-height'), 1.25);
});

test('A2 세로형·정사각 메인 줄 간격 1.28 — 구글 가이드 1.22·세로 띠 1.4는 그대로', () => {
  assert.equal(layoutFor(600, 880).mainLine, 1.28);
  assert.equal(layoutFor(1080, 1080).mainLine, 1.28);
  assert.equal(layoutFor(160, 600).mainLine, 1.4);
  assert.equal(num(tagOf(renderAd(ctx, style, specs['google-gdn-300x600']), 'main'), 'line-height'), 42);   // 10-16 저녁 사용자 수정본: 메인 32 행간 130% → 42   // 10-16: 비씨월드 300×600 메인 Bold 33 lh118% → 38.9   // 10-15 저녁: 구글 300×600 은 ABL 틀 — 메인 32px × 124.7% = 39.9px(가이드 1.22 대신)
  assert.equal(num(tagOf(renderAd(ctx, style, specs['jasoseol-m-premium-popup-mo']), 'main'), 'line-height'), 69.6);   // 10-15 틀: 템플릿 28:1072 메인 줄 간격 69.6px(50px × 1.39)
});

test('A3 메인 자간 −2.5%(28px 이상) — 자소설·에브리타임(템플릿 실측 0%)과 작은 메인은 0', () => {
  assert.deepEqual(CANON.tracking, { main: -0.025, mainMinPx: 28 });
  let on = 0, off = 0;
  for (const [id, sp] of Object.entries(specs)) {
    if (sp.rules?.safeArea?.measuredFromTemplate?.mold) continue;   // 10-15 틀(mold) 규격은 템플릿 실측 자간(리멤버 -2.2%/-4.5%/-2.5%/-3.5%/1%)을 그대로 쓴다 — 일반 규칙 대상 아님
    const html = renderAd(ctx, style, sp); const css = tagOf(html, 'main'); if (!css) continue;
    const fs = num(css, 'font-size'), ls = css.match(/letter-spacing:([^;]+)/)?.[1] ?? null;
    if (['jasoseol', 'everytime'].includes(sp.medium) || fs < 28) { assert.equal(ls, null, `${id}: ${fs}px 메인 자간 없음`); off++; }
    else { assert.equal(ls, '-0.025em', `${id}: ${fs}px 메인 자간 −2.5%`); on++; }
    // 메인 밖 글자는 자간을 건드리지 않는다
    for (const role of ['sub', 'date', 'detail']) assert.doesNotMatch(tagOf(html, role) ?? '', /letter-spacing/, `${id} ${role}`);
  }
  assert.ok(on > 10 && off > 10, `켜짐 ${on} · 꺼짐 ${off}`);
});

test('A4 상세 블록은 text-wrap:pretty, 끝 어절 2자 이하(「분야」)는 앞 어절에 붙는다 — 가운뎃점 묶음도 끊기지 않는다', () => {
  const html = renderAd(ctx, style, specs['jasoseol-pc-standard-jobpost-pc']);
  assert.match(detailOf(html), /text-wrap:pretty/);   // 10-15 틀(mold): 상세 블록 안쪽 묶음에 pretty
  const det = detailOf(html);
  assert.match(det, /사업 분야/, '「사업 분야」 붙임');
  assert.match(det, /경영⁠·⁠제품⁠·⁠사업/, '가운뎃점 양쪽 결합');
  // 메인은 붙이지 않는다(균형 줄바꿈·줄 수 어림이 맡는다)
  assert.doesNotMatch(textOf(renderAd(createContext({ ...fields, hiringType: '정규직 채용' }, 'recruit'), plain, specs['google-gdn-300x600']), 'main') ?? '', / /);
});

test('A5 쌓기 값은 쉼표로만 나눈다 — 「경영·제품·사업 분야」는 한 항목', () => {
  const ctx2 = createContext({ ...fields, startDate: null, deadline: null }, 'recruit');   // 날짜가 없으면 정사각 쌓기 첫 항목이 모집직무
  // 10-12 매체별 규격정리: 인스타 피드는 샘플 9장에 알약 칩이 없어(guide.detailLabels inline) 쌓지 않는다 — 쌓기 문법은 에브리타임 홈 카드(보드 1-884 코엑스)로 본다
  const html = renderAd(ctx2, plain, specs['albamon-pc-sky-job']);   // 10-15: 에브리타임 홈 카드는 틀(mold) 규격이 됐다 → 쌓기 문법은 알바몬 PC 스카이(560×700)로 본다
  const det = detailOf(html);
  assert.match(det, /data-chip="1"/, '쌓기(알약 + 값)');
  assert.match(det, /자유직무ㅣ​경영⁠·⁠제품/);
  assert.doesNotMatch(det, /경영ㅣ|제품ㅣ/);
});

test('A7 혼자 선 날짜 줄은 라벨 없이(디자이너 12/12) — 상세 목록 안에서는 「접수기간」 라벨 유지', () => {
  for (const id of ['blind-post-banner', 'kakao-display-pc-promo']) {
    const html = renderAd(ctx, style, specs[id]);
    assert.doesNotMatch(html, /data-field="(date|sub)"[^>]*>접수기간/, id);
    assert.match(html, /data-field="(date|sub)"[^>]*>9\.22\(월\) - 10\.12\(일\)</, id);
  }
  // 10-12 매체별 규격정리: 자소설 PC메인배너(1200×280)는 템플릿 구조(서브 = 시즌·슬로건, 상세 = 채용일정·모집직무 — 현대케피코 408:37780)라 날짜가 상세 목록 안에 라벨과 함께 선다
  assert.match(detailOf(renderAd(ctx, style, specs['jasoseol-pc-standard-main-pc'])), /모집일정 :<\/b> 9\.22/);   // 10-15 틀: 라벨은 샘플 실측 「채용일정 :」(현대케피코 28:1002) → 10-28 사용자 결정(컨시어지 #10) 자소설 전 규격 「모집일정 :」 통일, 굵은 라벨에 콜론까지
  assert.match(detailOf(renderAd(ctx, style, specs['jasoseol-m-premium-popup-mo'])), /모집일정 :<\/b> 9\.22/);   // 10-15 틀: 「모집일정 :」
});

test('B1 메인 두 톤 강조는 스타일이 강조색을 줬고 지면 대비 4.5:1일 때만 — 기본 꺼짐, 자소설 꺼짐, 색을 짐작하지 않는다', () => {
  const acc = normalizeStyle({ colors: ['#00146E'], accent: '#00ffe2', keyVisual: PNG, kvMeta: RING, logo: PNG, logoTone: 'dark' });
  assert.equal(acc.accent, '#00FFE2');
  assert.equal(style.accent, null, '입력이 없으면 강조색 없음(palette.accent 자동 생성색을 쓰지 않는다)');
  const on = renderAd(ctx, acc, specs['kakao-display-pc-promo']);   // 10-15 저녁: 블라인드 게시글·피드도 공식 템플릿 틀 — 자유 배치 픽스처는 카카오 디스플레이·인스타
  assert.match(on, /data-field="main"[^>]*>[^]*?<span data-accent="1" style="color:#00FFE2">대규모 공개채용<\/span>/);
  assert.doesNotMatch(renderAd(ctx, style, specs['kakao-display-pc-promo']), /data-accent/);
  assert.doesNotMatch(renderAd(ctx, acc, specs['blind-post-banner']), /data-accent/, '블라인드 게시글은 틀 — 두 톤 강조 없음');
  assert.doesNotMatch(renderAd(ctx, acc, specs['jasoseol-m-premium-popup-mo']), /data-accent/, '자소설 단색');
  // 밝은 지면에서 대비가 모자라는 강조색은 켜지 않는다
  const pale = normalizeStyle({ colors: ['#00146E'], accent: '#C5ECFF' });
  assert.doesNotMatch(renderAd(ctx, pale, specs['google-gdn-580x400']), /data-accent/);
});

test('B2 좁은 세로 띠(폭 ≤ 320)의 단일 사물은 좌우 양쪽 + 아래로 흘린다', () => {
  assert.equal(CANON.objectBleed.narrow.maxW, 320);
  // 10-15 저녁: 구글 300 세로형은 ABL 틀(templateMold) — 좁은 세로 띠 블리드(가이드 objectBleed)는 틀 그림 칸 안에서 쓰지 않는다. 가이드 objectBleed 를 가진 매체는 구글뿐이라 규칙 값만 남긴다
  for (const id of ['google-gdn-300x1050', 'google-gdn-300x600']) {
    const html = renderAd(ctx, style, specs[id]);
    assert.doesNotMatch(html, /data-bleed="1"/, `${id}: 틀 규격은 블리드 없음`);
    assert.match(html, /data-mold="1"/, id);
  }
});

test('B3 카카오 3줄 = 메인 1(회사 + 채용구분) + 슬로건 1 + 날짜 1 — 서브가 회사·시즌으로 밀려나지 않는다', () => {
  const html = renderAd(ctx, style, specs['kakao-display-pc-promo']);
  assert.match(textOf(html, 'main'), /^마이다스 대규모 공개채용$/);
  assert.equal(textOf(html, 'sub'), '자소서 없는 간편지원');
  assert.match(html, /data-field="date"[^>]*>9\.22\(월\) - 10\.12\(일\)</);
  assert.match(tagOf(html, 'main'), /-webkit-line-clamp:1;.*width:\d+px;max-width:none/, '메인 한 줄이 그림 열 위까지');
  // 카카오 「이미지 내 텍스트 48~164px」 — 보조 줄도 48px 이상
  for (const role of ['main', 'sub']) assert.ok(num(tagOf(html, role), 'font-size') >= 48, role);
});

test('B4 인스타 1080 — 틀(사용자 수정본 10-16): 날짜는 혼자 한 줄 Regular 43 · 모집직무는 라벨 없이 값만 Bold 43 가운데(블리드 옆 좁은 상세 열 줄이기는 틀이 대신한다)', () => {   // 10-16 전: 자유 배치에서 날짜 줄 + 상세 26~34px 인라인(샘플 7/9) — 틀 135:1185 가 생겨 줄 값 고정
  const html = renderAd(ctx, style, specs['instagram-feed-1080']);
  const css = tagOf(html, 'detail');
  // 10-12 매체별 규격정리: 인스타 샘플 7/9 가 날짜를 혼자 한 줄(43px)에 둔다 — 수정본 틀도 날짜 줄 43 Regular(afterMain 108)
  assert.match(html, /data-field="date"[^>]*font-size:43px;line-height:64px;font-weight:400;[^"]*text-align:center[^>]*>9\.22\(월\) - 10\.12\(일\)</, '날짜 줄(필수) Regular 43 가운데');
  assert.equal(num(css, 'font-size'), 43, '상세 43 Bold(틀)'); assert.equal(num(css, 'font-weight'), 700); assert.match(css, /text-align:center/);
  assert.doesNotMatch(detailOf(html), /<b/, '모집직무 값만(valuesOnly) — 라벨 없음');
});
