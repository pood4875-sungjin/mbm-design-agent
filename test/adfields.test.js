import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleOf, countChars, limitsByRole, estimateLines } from '../core/adfields.js';
import { MEDIA } from '../core/media.js';

// 매체 자료의 글자수 표는 필드 이름이 제각각이다(메인문구·메인카피·타이틀·대문구…).
// 렌더러와 검사기는 그 이름이 아니라 "역할"로 움직여야 매체가 늘어도 코드가 안 늘어난다.

test('field names from every medium map to a small set of roles', () => {
  const cases = {
    '메인문구': 'main', '메인카피': 'main', '메인 타이틀': 'main', '대문구': 'main', '타이틀 첫째줄': 'main',
    '메인 문구(메인 카피)': 'main', '제목 (이미지 밖 텍스트 필드)': 'main', '이미지 내 텍스트 — 2줄형': 'main',
    '서브문구': 'sub', '서브카피': 'sub', '소문구': 'sub', '서브 타이틀': 'sub',
    '상세문구': 'detail', '부가정보': 'detail', '본문': 'detail', '설명 (이미지 밖 텍스트 필드)': 'detail', '상세 문구(부가 설명)': 'detail',
    '기타문구 첫째 줄': 'extra', '+기타 문구': 'extra', '추가 문구(선택)': 'extra', '태그문구 (하단 태그 줄)': 'extra', '해시태그 (대외활동·공모전)': 'extra',
    '고지문구': 'notice', '심의필/고지 문구': 'notice', '의료광고 심의필 번호(해당 시)': 'notice', '심의필': 'notice',
    '랜딩버튼': 'cta', 'CTA 버튼명': 'cta', '카피형 CTA': 'cta', '행동 유도 문구 (이미지 밖 텍스트 필드)': 'cta', '버튼 (이미지 밖 텍스트 필드)': 'cta',
    '광고주명': 'advertiser', '브랜드 네임 (이미지 밖 텍스트 필드)': 'advertiser', '이름(광고주/브랜드명)': 'advertiser', '프로필 이름 (이미지 밖 텍스트 필드)': 'advertiser',
    '마감일': 'date', '날짜': 'date', '날짜 + 키워드': 'date', '서브문구(날짜 등)': 'date',
    '라벨(서브문구 칩, 예: 모집기간·접수기간)': 'label', '정보 라벨칩(예: 채용기간·모집직무)': 'label',
    '표시 URL': 'url',
  };
  for (const [field, role] of Object.entries(cases)) assert.equal(roleOf(field), role, field);
});

test('every textLimits field in the data resolves to a role — none falls through to "other" silently', () => {
  const unknown = [];
  for (const m of MEDIA) for (const s of m.specs) for (const t of s.textLimits ?? []) {
    if (roleOf(t.field) === 'other') unknown.push(`${s.id}: ${t.field}`);
  }
  // "특수문자"·"카피 전체 줄 수" 같은 규칙성 항목은 글자 슬롯이 아니라 other가 맞다 — 그 둘만 허용한다.
  const allowed = unknown.filter(x => !/특수문자|카피 전체 줄 수/.test(x));
  assert.deepEqual(allowed, [], '역할을 못 정한 필드:\n' + allowed.join('\n'));
});

test('character counting follows the medium rule, not a single global rule', () => {
  // 기본: 모든 글자(띄어쓰기·부호 포함) 1자 — 네이버가 명시한 규칙이고, 규칙이 없는 매체의 안전한 기본값이다.
  assert.equal(countChars('AB 가나!', 'all-1'), 6);
  // 자소설닷컴: 영문·특수문자 2글자 = 1글자, 띄어쓰기 = 1글자
  assert.equal(countChars('AB 가나!', 'half-latin'), 1 + 1 + 2 + 0.5);
  assert.equal(countChars('ABC', 'half-latin'), 1.5);
  assert.equal(countChars('', 'all-1'), 0);
  assert.equal(countChars(null, 'all-1'), 0);
});

test('limitsByRole folds per-line rows into one slot per role and keeps the strictest numbers', () => {
  const limits = [
    { field: '메인 문구 1', maxChars: 12, lines: 1 },
    { field: '메인 문구 2', maxChars: 12, lines: 1 },
    { field: '서브문구', maxChars: 10, lines: 2, original: '최대 2행, 행당 최대 10자' },   // 줄당으로 적힌 행
    { field: '기타문구 첫째 줄', maxChars: 10, lines: 1 },
    { field: '기타문구 둘째 줄', maxChars: 8, lines: 1 },
  ];
  const by = limitsByRole(limits);
  // 줄별로 쪼개진 행은 한 슬롯으로 접는다: 줄 수는 더하고, 줄당 글자수는 가장 작은 값을 쓴다.
  assert.deepEqual(by.main, { maxCharsPerLine: 12, lines: 2, maxChars: 24, fields: ['메인 문구 1', '메인 문구 2'] });
  assert.deepEqual(by.sub, { maxCharsPerLine: 10, lines: 2, maxChars: 20, fields: ['서브문구'] });
  assert.deepEqual(by.extra, { maxCharsPerLine: 8, lines: 2, maxChars: 18, fields: ['기타문구 첫째 줄', '기타문구 둘째 줄'] });
});

test('a total written as "줄당 N자 × M줄 = 총 T자" keeps T as the total and N per line', () => {
  const by = limitsByRole([{ field: '서브카피', maxChars: 36, lines: 3, note: '줄당 12자 × 3줄 = 총 36자' }]);
  assert.deepEqual(by.sub, { maxCharsPerLine: 12, lines: 3, maxChars: 36, fields: ['서브카피'] });
  // 원문이 없고 줄 수만 있으면 총량으로 본다 — 더 엄격한 쪽이 안전하다
  const c = limitsByRole([{ field: '메인 타이틀', maxChars: 17, lines: 2, original: '최대 17자' }]);
  assert.deepEqual(c.main, { maxCharsPerLine: 9, lines: 2, maxChars: 17, fields: ['메인 타이틀'] });
  // "10자×2줄" 표기
  const n = limitsByRole([{ field: '메인문구', maxChars: 10, lines: 2, note: "자리표시 '일이삼사오육칠팔구십 일이삼사오육칠팔구십'(10자×2줄)" }]);
  assert.deepEqual(n.main, { maxCharsPerLine: 10, lines: 2, maxChars: 20, fields: ['메인문구'] });
});

test('a row without numbers still claims the role so the renderer knows the slot exists', () => {
  const by = limitsByRole([{ field: '랜딩버튼', maxChars: null, lines: null }]);
  assert.ok(by.cta);
  assert.equal(by.cta.maxChars, null);
});

test('estimateLines wraps on spaces like keep-all and breaks only words longer than a line', () => {
  assert.equal(estimateLines('클라우드 플랫폼 엔지니어 채용', 6), 4);   // [클라우드][플랫폼][엔지니어][채용] — 엔지니어(4)+1+채용(2)=7>6
  assert.equal(estimateLines('한진정보통신 클라우드 플랫폼 엔지니어 채용', 6), 5);
  assert.equal(estimateLines('채용', 6), 1);
  assert.equal(estimateLines('가나다라마바사아자차', 4), 3);   // 한 단어 10자 → 4/4/2
});
