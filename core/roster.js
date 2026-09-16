// 참석자 명단 — 엑셀에서 복사한 표(TSV), CSV, 또는 이름만 나열한 텍스트를 모두 받는다.
// 엑셀 파일(.xlsx) 자체는 파싱하지 않는다 — 시트를 복사해 붙여넣거나 CSV로 저장해서 올린다.

const HEAD = {
  name: ['이름', '성명', '참석자', 'name', 'attendee'],
  org: ['소속', '회사', '기관', '부서', 'org', 'company', 'affiliation'],
  role: ['직급', '직책', '역할', 'title', 'role', 'position'],
};

function splitRows(text) {
  return text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
}
function splitCells(line) {
  return line.includes('\t') ? line.split('\t') : line.split(',');
}
function matchHead(cell) {
  const v = cell.trim().toLowerCase();
  for (const [key, names] of Object.entries(HEAD)) if (names.some(n => n.toLowerCase() === v)) return key;
  return null;
}

export function parseRoster(text) {
  const rows = splitRows(text);
  if (!rows.length) return [];
  const first = splitCells(rows[0]);
  const mapped = first.map(matchHead);
  const hasHeader = mapped.some(Boolean);

  // 헤더가 없고 열이 하나뿐이면 이름만 나열한 목록으로 본다
  if (!hasHeader && first.length === 1) {
    return rows.map(name => ({ name: name.trim(), org: '', role: '' })).filter(p => p.name);
  }

  const cols = hasHeader
    ? mapped
    : ['name', 'org', 'role'].slice(0, first.length);   // 헤더 없으면 이름·소속·직급 순으로 가정
  const body = hasHeader ? rows.slice(1) : rows;

  return body.map(line => {
    const cells = splitCells(line);
    const p = { name: '', org: '', role: '' };
    cols.forEach((key, i) => { if (key && cells[i] != null) p[key] = cells[i].trim(); });
    return p;
  }).filter(p => p.name);
}
