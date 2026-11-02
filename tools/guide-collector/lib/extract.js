// HTML → 본문 텍스트 줄 목록, 그리고 디자인 규격(사이즈·비율·용량·포맷) 추출

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', times: '×', bull: '•', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', rarr: '→', larr: '←', laquo: '«', raquo: '»' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const clean = s => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// 사람인·자소설닷컴처럼 <title>이 사이트명뿐인 곳이 있어서 본문 제목을 우선한다.
// preferHeading이면 <title>보다 본문 제목을 먼저 쓴다 (네이버 FAQ처럼 <title>이 모든 글에서 같을 때)
export function getTitle(html, preferHeading = false) {
  const main = pickMain(html);
  const candidates = [
    ...[...main.matchAll(/<h[1-3]\b[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m => clean(m[1])),
    ...[...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => clean(m[1])),
    clean(main.match(/<[a-z0-9]+\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([^<]{3,120})</i)?.[1] || ''),
    ...[...main.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => clean(m[1])),
  ];
  const heading = candidates.find(h => h.length > 2 && h.length < 120 && !/로그인|log ?in|sign ?in/i.test(h));
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1];
  const pageTitle = clean(t || og || '');
  if (preferHeading && heading) return heading;
  // <title>에 내용이 충분하면(사이트명 + 실제 제목) 그대로 쓴다
  if (pageTitle && pageTitle.split(/\s[|\-–]\s/)[0].length > 12) return pageTitle;
  return heading || pageTitle;
}

const textLength = s => s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;

// 가장 본문다운 영역을 고른다: <article> → <main> → <body>
// 관련 글 카드를 <article>로 그리는 블로그가 있어서, 본문 글자 수의 40% 이상인 article만 본문으로 본다
function pickMain(html) {
  const body = html.match(/<body\b[\s\S]*<\/body>/i)?.[0] || html;
  const bodyLen = textLength(body) || 1;
  const articles = [...html.matchAll(/<article\b[\s\S]*?<\/article>/gi)].map(m => m[0]);
  const article = articles.sort((a, b) => b.length - a.length)[0];
  if (article && textLength(article) / bodyLen >= 0.4) return article;
  const main = html.match(/<main\b[\s\S]*?<\/main>/i);
  if (main && main[0].length > 500) return main[0];
  return body;
}

export function htmlToLines(html) {
  let s = pickMain(html)
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // 규격이 이미지 대체 텍스트에만 적힌 경우가 많아서(예: Google Ads) alt도 본문으로 살린다
    .replace(/<img\b[^>]*\balt=["']([^"']{4,})["'][^>]*>/gi, '\n[이미지] $1\n')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/td|\/th|\/section|\/blockquote|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.split('\n')
    .map(l => l.replace(/[\s⠀​]+/g, ' ').trim())
    .filter(l => l && l.length > 1);
}

// 페이지에 적힌 수정일(메타 태그, JSON, 본문 날짜 표기 순서로 찾는다)
export function getPageDate(html, lines) {
  const meta = html.match(/(?:article:modified_time|dateModified|"updated_at"|"updatedAt")["']?\s*[:=]?\s*(?:content=)?["']([0-9]{4}-[0-9]{2}-[0-9]{2}[^"']*)/i);
  if (meta) return meta[1].slice(0, 10);
  for (const l of lines.slice(0, 40)) {
    const m = l.match(/(20\d{2})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  return null;
}

const KNOWN_RATIOS = new Set(['1:1', '4:5', '5:4', '9:16', '16:9', '1.91:1', '2:1', '1:2', '3:2', '2:3', '4:3', '3:4', '21:9']);

export function extractSpecs(lines) {
  const out = [];
  const seen = new Set();
  const add = (kind, value, context) => {
    const key = kind + '|' + value;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, value, context: context.slice(0, 200) });
  };

  for (const line of lines) {
    for (const m of line.matchAll(/(\d{2,4}(?:,\d{3})?)\s*(?:px|픽셀)?\s*[x×X*]\s*(\d{2,4}(?:,\d{3})?)\s*(px|픽셀|pixels?)?/g)) {
      const w = +m[1].replace(',', ''), h = +m[2].replace(',', '');
      // 표 칸처럼 「• 1200x300」만 있는 짧은 줄도 크기로 본다
      const pxContext = m[3] || /px|픽셀|pixel|사이즈|크기|해상도|size|dimension|권장|recommend|최소|최대|min|max/i.test(line) || (line.length <= 40 && w >= 50 && h >= 50);
      if (w >= 16 && h >= 16 && pxContext) add('size', `${w}×${h}`, line);
    }
    for (const m of line.matchAll(/(?<![\d:.])(\d{1,2}(?:\.\d{1,2})?)\s*:\s*(\d{1,2})(?![\d:])/g)) {
      const r = `${m[1]}:${m[2]}`;
      const after = line.slice(m.index + m[0].length, m.index + m[0].length + 6);
      // "1:1 문의", "1:1 채팅" 같은 상담 문구와 "09:00~18:00" 같은 시간은 비율이 아니다
      if (KNOWN_RATIOS.has(r) && !/^\s*(문의|상담|채팅|대화|인터뷰|코칭|매칭|멘토)/.test(after) && !/\d{1,2}:\d{2}\s*[~-]/.test(line)) add('ratio', r, line);
    }
    for (const m of line.matchAll(/(\d+(?:\.\d+)?)\s*(MB|KB|GB)\b/gi)) {
      add('filesize', `${m[1]}${m[2].toUpperCase()}`, line);
    }
    for (const m of line.matchAll(/(가로|세로|너비|높이|폭|width|height)\s*(?:는|:)?\s*(\d{2,5})\s*(px|픽셀)/gi)) {
      add('width', `${m[1]} ${m[2]}px`, line);
    }
    for (const m of line.matchAll(/(최대|최소|max(?:imum)?|min(?:imum)?)[^\d\n]{0,12}(\d{2,4})\s*px/gi)) {
      add('limit', `${m[1]} ${m[2]}px`, line);
    }
    if (/형식|포맷|확장자|format|file type|파일 유형/i.test(line)) {
      for (const m of line.matchAll(/\b(JPE?G|PNG|GIF|WEBP|SVG|MP4|MOV|PDF)\b/gi)) add('format', m[1].toUpperCase(), line);
    }
  }
  return out;
}
