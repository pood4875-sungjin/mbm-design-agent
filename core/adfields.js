// 매체 글자수 표의 필드 이름 → 역할(role).
//
// 자료마다 같은 슬롯을 다른 이름으로 부른다(메인문구·메인카피·타이틀·대문구·제목…).
// 렌더러와 검사기는 이름이 아니라 역할로 움직인다 — 매체가 늘어도 코드가 늘지 않는다.
// 역할을 못 정하면 'other'다. 'other'는 글자 슬롯이 아닌 규칙성 항목(특수문자 계산법 등)에만 남아야 하고,
// 그 밖의 것이 other로 떨어지면 테스트가 잡는다.

const RULES = [
  // 순서가 중요하다 — 앞에 있는 규칙이 먼저 맞는다.
  ['notice',     /고지|심의필/],
  ['cta',        /CTA|버튼|행동 유도/i],
  ['url',        /URL/i],
  ['advertiser', /광고주|브랜드 네임|브랜드명|프로필 이름|^이름/],
  ['label',      /라벨|칩/],
  ['date',       /마감|날짜|일정/],
  ['extra',      /기타|추가|태그|해시/],
  ['sub',        /서브|상세|소문구|부가|설명|본문|세부/],
  ['main',       /메인|타이틀|대문구|제목|이미지 내 텍스트|광고 문구|카피|문구|텍스트|모집직무|메시지 내용|카드 내용|뱃지 내용|앱/],
];

// "이미지 밖 텍스트 필드"는 매체 시스템이 이미지 옆에 따로 보여 주는 글자다 — 소재 안에 그리지도, 소재 검사에 쓰지도 않는다.
export const inImage = t => !/이미지 밖/.test(String(t?.field ?? ''));

export function roleOf(field) {
  const f = String(field ?? '');
  for (const [role, re] of RULES) if (re.test(f)) return role;
  return 'other';
}

// 글자수 세는 법은 매체마다 다르다. 자료에 명시된 두 방식만 구현한다.
//   all-1      띄어쓰기·부호·특수문자 모두 1자 (네이버 GFA 명시 · 규칙 없는 매체의 기본값)
//   half-latin 영문·특수문자 2글자 = 1글자, 띄어쓰기 = 1글자 (자소설닷컴 보드 메모)
export function countChars(text, mode = 'all-1') {
  const s = String(text ?? '');
  if (mode !== 'half-latin') return [...s].length;
  let n = 0;
  for (const ch of s) {
    if (/\s/.test(ch)) n += 1;
    else if (/[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-｠]/.test(ch)) n += 1;
    else n += 0.5;
  }
  return n;
}

// textLimits 행들을 역할별 슬롯 하나로 접는다.
// "메인 문구 1 / 메인 문구 2"처럼 줄마다 행이 따로 있으면 줄 수는 더하고, 줄당 글자수는 가장 엄격한 값을 쓴다.
//
// 자료의 maxChars는 매체마다 뜻이 다르다 — 자소설 "행당 최대 15자"(줄당)와 네이버 "줄당 12자 × 3줄 = 총 36자"(총량)가
// 같은 칸에 들어 있다. 원문(original/note)에서 줄당 수치를 읽어 둘을 가른다. 원문이 없으면 총량으로 본다(더 엄격한 쪽).
const PER_LINE_RE = /(?:행당|줄당|1줄당|한 줄|한줄)\s*(?:공백\s*(?:\(띄어쓰기\)\s*)?포함\s*)?(?:최대\s*)?(\d+)\s*자/;
const TIMES_RE = /(\d+)\s*자\s*[×x*]\s*(\d+)\s*줄/;

export function perLineOf(t) {
  const text = `${t.original ?? ''} ${t.note ?? ''}`;
  const m = text.match(PER_LINE_RE) ?? text.match(TIMES_RE);
  return m ? Number(m[1]) : null;
}

export function limitsByRole(limits = []) {
  const by = {};
  for (const t of limits) {
    const role = roleOf(t.field);
    if (role === 'other') continue;
    const slot = by[role] ??= { maxCharsPerLine: null, lines: 0, maxChars: null, fields: [] };
    slot.fields.push(t.field);
    const lines = t.lines ?? (t.maxChars != null ? 1 : 0);
    slot.lines += lines;
    if (t.maxChars == null) continue;
    const perLine = perLineOf(t) ?? (lines > 1 ? Math.ceil(t.maxChars / lines) : t.maxChars);
    // 기록된 maxChars가 줄당 값과 같으면 "줄당"으로 적힌 행이다 → 총량은 줄당 × 줄 수. 아니면 이미 총량이다.
    const total = (lines > 1 && t.maxChars === perLine) ? perLine * lines : t.maxChars;
    slot.maxCharsPerLine = slot.maxCharsPerLine == null ? perLine : Math.min(slot.maxCharsPerLine, perLine);
    slot.maxChars = (slot.maxChars ?? 0) + total;
  }
  for (const slot of Object.values(by)) if (slot.lines === 0) slot.lines = null;
  return by;
}

// keep-all 줄바꿈으로 몇 줄이 되는지 추정한다 — 단어(띄어쓰기) 단위로 접고, 한 단어가 한 줄보다 길면 그 안에서 쪼개진다.
// 글자 "수"가 아니라 매체 계산법(countChars)으로 센다. 렌더러가 사다리에서 문구를 고를 때 쓴다.
export function estimateLines(text, perLine, mode = 'all-1') {
  if (!(perLine > 0)) return 1;
  let lines = 1, cur = 0;
  for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    const n = countChars(word, mode);
    if (n > perLine) { lines += (cur > 0 ? 1 : 0) + Math.ceil(n / perLine) - 1; cur = n % perLine || perLine; continue; }
    const need = cur > 0 ? cur + 1 + n : n;
    if (need > perLine) { lines += 1; cur = n; } else cur = need;
  }
  return lines;
}
