// 11-17 노션 확인요청 화면 쪽 — N3 문구 요소를 골라도 왼쪽 칸 강조 안 함 · 오른쪽 「이 요소만」 문구 칸 / N2 토글 자리 / N1 앱 기본 폰트
//   브라우저 DOM 확인은 헤드리스 Chrome 으로 했다(_out/notion-verify-1117/new). 여기는 같은 판정을 소스에서 지킨다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const app = read('app/app.js'), artkv = read('app/artkv.js'), html = read('app/index.html');
const L0 = app.indexOf('function renderLeft()'), renderLeftSrc = app.slice(L0, app.indexOf('\nfunction ', L0 + 10));

test('N3 ①: 왼쪽 패널은 고른 요소(state.elSel)로 칸을 강조하거나 스크롤하지 않는다', () => {
  assert.doesNotMatch(renderLeftSrc, /state\.elSel/, 'renderLeft 가 고른 요소를 읽지 않는다');
  assert.doesNotMatch(renderLeftSrc, /lfld\$\{[^}]*' on'/, '문구 칸에 on 클래스를 붙이지 않는다');
  assert.doesNotMatch(renderLeftSrc, /scrollIntoView/, '고른 요소 칸으로 스크롤하지 않는다');
});

test('N3 ②: 오른쪽 「이 요소만」 패널 맨 위에 문구 칸 — 이 소재만(charText) · 고칠 수 있는 문구만', () => {
  assert.match(app, /const EL_TEXT_ROLES = new Set\(\['main', 'advertiser', 'sub', 'date', 'detail'\]\)/);
  assert.match(app, /return `\$\{elTextSecHtml\(a, id, it\)\}<section class="isec">\$\{head\}/, '글자 요소 패널 맨 위');
  assert.match(app, /<h3>문구 <span class="mode">이 소재만<\/span><\/h3>/);
  assert.match(app, /if \(ta\.value\.trim\(\) && ta\.value !== was\) charText\(a, id, ta\.value, was\)/, '바뀐 값만 캔버스 글자 고치기와 같은 길(이 소재 overrides.core)');
  assert.match(html, /\.eltext\{/);
});

test('N2: 토글 「이미지 대신 로고 사용」은 그림·로고 패널에, 비즈보드만(logoKvSpec), 키보드로 켜는 스위치', () => {
  assert.match(artkv, /if \(!logoKvSpec\(spec\) \|\| !eff\.logo\) return '';/);
  assert.match(artkv, /이미지 대신 로고 사용<\/span><input type="checkbox" role="switch" id="iElLogoKv"/);
  assert.equal((artkv.match(/\$\{logoKvHtml\(a\)\}/g) ?? []).length, 2, '그림 패널(이미지 칸 아래)·로고 패널 둘 다');
  assert.match(html, /\.fswitch input:focus-visible\{outline/);
});

test('N1: 앱 새 캠페인 기본 폰트는 DEFAULT_FONT(Pretendard) — 카카오 큰글씨를 직접 적지 않는다', () => {
  assert.doesNotMatch(app, /font: 'KakaoBigSans'/);
  assert.equal((app.match(/font: DEFAULT_FONT/g) ?? []).length, 2);
  assert.match(app, /if \(!fontId \|\| !isBundledFont\(fontId\)\) return '';/, '기본 폰트도 내보낼 때 바이트째 넣는다');
});
