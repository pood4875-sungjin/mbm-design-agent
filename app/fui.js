// 피그마 UI3 식 편집 컨트롤(11-02 사용자 「이전에 피그마처럼 만들었던 걸 최대한 반영」) — hub/panel.js · hub/fui/ 에서 앱으로 옮긴 부품.
//   hub 를 불러오지 않는다: 앱은 hub 와 따로 배포·수정되므로 쓰는 것만 옮겼다. CSS 는 app/index.html 「피그마 UI3 편집 컨트롤」 묶음(앱 토큰 사용).
//   · 아이콘(hub/fui/icons3.js 중 쓰는 것) · 색 행(hub colorRow) · 숫자 칸(hub field + 수치 입력: 식 · 화살표 · Shift 10 · Enter 확정)
//   값 저장은 기존 입력(input[type=color]·숫자 칸)의 onchange 그대로 — 여기선 칸끼리 맞추고 이벤트만 흘려 보낸다.

const s = body => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">${body}</svg>`;
const L = 'stroke="currentColor" stroke-width="1" stroke-linecap="round"';
const ICONS = {
  rot: s(`<path d="M3.5 7.5a4.5 4.5 0 018.5-2M12.5 8.5a4.5 4.5 0 01-8.5 2" ${L}/><path d="M12 2.5v3h-3M4 13.5v-3h3" ${L}/>`),
  'flip-h': s(`<path d="M8 2v12" ${L} stroke-dasharray="1.5 1.5"/><path d="M6 4L2.5 8 6 12zM10 4l3.5 4-3.5 4z" ${L} stroke-linejoin="round"/>`),
  plus: s(`<path d="M8 3v10M3 8h10" ${L}/>`),
  minus: s(`<path d="M3 8h10" ${L}/>`),
  swap: s(`<path d="M3 6h9l-2.5-2.5M13 10H4l2.5 2.5" ${L}/>`),
  'ta-l': s(`<path d="M2.5 3.5h11M2.5 6.5h7M2.5 9.5h11M2.5 12.5h7" ${L}/>`),
  'ta-c': s(`<path d="M2.5 3.5h11M4.5 6.5h7M2.5 9.5h11M4.5 12.5h7" ${L}/>`),
  'ta-r': s(`<path d="M2.5 3.5h11M6.5 6.5h7M2.5 9.5h11M6.5 12.5h7" ${L}/>`),
};
export const ic = name => ICONS[name] ?? '';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 아이콘 버튼(hub .ib.s) — 글자 없는 버튼이라 이름은 꼭 받는다
export const iconBtn = (name, label, attrs = '') => `<button type="button" class="fib" title="${esc(label)}" aria-label="${esc(label)}" ${attrs}>${ic(name)}</button>`;

// 색 행(hub colorRow) — 색 칩 · 헥스 · (이름). after 는 행 끝 아이콘 버튼. idle = 아직 지정 안 함(헥스 칸은 비우고 값은 흐리게)
export function colorRowHtml({ id = '', value, label, tail = '', after = '', disabled = false, idle = false }) {
  const v = String(value ?? '#000000').toUpperCase();
  return `<div class="fcrow${disabled ? ' off' : ''}${idle ? ' idle' : ''}"><div class="fcin"><span class="fsw"><i style="background:${esc(v)}"></i><input type="color" ${id ? `id="${esc(id)}"` : ''} value="${esc(v.toLowerCase())}" aria-label="${esc(label)} 고르기" ${disabled ? 'disabled' : ''}></span><input type="text" class="fhex" value="${idle ? '' : esc(v.slice(1))}" placeholder="${esc(v.slice(1))}" maxlength="7" spellcheck="false" aria-label="${esc(label)} 헥스" ${disabled ? 'disabled' : ''}>${tail ? `<span class="ft">${esc(tail)}</span>` : ''}</div>${after}</div>`;
}

// 숫자 칸(hub field) — 앞 글자(W·H)나 뒤 단위(%·°)를 칸 안에
export const numField = ({ id = '', value, label, prefix = '', unit = '', attrs = '' }) =>
  `<div class="fin${unit ? ' unit' : ''}${prefix ? ' pre' : ''}">${prefix ? `<span class="k" aria-hidden="true">${esc(prefix)}</span>` : ''}<input type="text" inputmode="decimal" class="fnum" ${id ? `id="${esc(id)}"` : ''} value="${esc(value)}" aria-label="${esc(label)}" ${attrs}>${unit ? `<span class="u" aria-hidden="true">${esc(unit)}</span>` : ''}</div>`;

// 수치 입력(hub panel.js num): 숫자 또는 사칙 식(100+20). 못 읽으면 fallback
export function evalNum(raw, fallback = 0) {
  const t = String(raw).trim();
  if (/^[-+]?\d*\.?\d+([-+*/]\d*\.?\d+)*$/.test(t)) {
    const parts = t.match(/[-+*/]?[^-+*/]+/g).map(p => /^[*/]/.test(p) ? [p[0], +p.slice(1)] : ['+', +p]);
    let sum = 0, cur = 0;   // 곱·나눗셈 먼저(사용자가 칸에 적는 식은 짧다)
    for (const [op, n] of parts) { if (op === '*') cur *= n; else if (op === '/') cur = n ? cur / n : cur; else { sum += cur; cur = n; } }
    const r = Math.round((sum + cur) * 100) / 100;
    if (Number.isFinite(r)) return r;
  }
  const n = parseFloat(t);
  return Number.isNaN(n) ? fallback : n;
}
// 헥스 칸 글자 → #RRGGBB(3자리도). 못 읽으면 null
export function parseHex(raw) {
  let v = String(raw).trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(v)) v = [...v].map(c => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toUpperCase() : null;
}

// 숫자 칸 조작: 누르면 전체 선택 · Enter 확정 · Esc 취소 · ↑↓ 1 · Shift 10 · 식 계산. change 를 흘려 보낸다(기존 onchange 가 저장)
function wireNum(inp) {
  let start = inp.value;
  inp.addEventListener('focus', () => { start = inp.value; inp.select(); });
  inp.addEventListener('change', () => { inp.value = String(evalNum(inp.value, evalNum(start))); start = inp.value; }, true);   // 값을 먼저 정리 — 기존 onchange 보다 앞(capture)
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    else if (e.key === 'Escape') { e.stopPropagation(); inp.value = start; inp.blur(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      inp.value = String(evalNum(inp.value, 0) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}
// 헥스 칸 조작: 색 칩 ↔ 헥스를 맞추고, 헥스를 고치면 칩의 input·change 를 그대로 흘린다(칩에 걸린 기존 처리 재사용)
function wireColorRow(row) {
  const col = row.querySelector('input[type=color]'), hex = row.querySelector('.fhex'), sw = row.querySelector('.fsw i');
  if (!col || !hex) return;
  const paint = () => { if (sw) sw.style.background = col.value; row.classList.remove('idle'); hex.value = col.value.slice(1).toUpperCase(); };
  col.addEventListener('input', paint);
  let start = hex.value;
  hex.addEventListener('focus', () => { start = hex.value; hex.select(); });
  hex.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); hex.blur(); }
    else if (e.key === 'Escape') { e.stopPropagation(); hex.value = start; hex.blur(); }
  });
  hex.addEventListener('change', () => {
    const v = parseHex(hex.value);
    if (!v) { hex.value = start; return; }
    hex.value = v.slice(1); col.value = v.toLowerCase(); start = hex.value;
    col.dispatchEvent(new Event('input', { bubbles: true }));
    col.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
// 다시 그릴 때마다 부른다. 같은 칸을 두 번 묶지 않는다
export function wireFui(root) {
  if (!root) return;
  root.querySelectorAll('.fcrow').forEach(r => { if (!r.dataset.fw) { r.dataset.fw = '1'; wireColorRow(r); } });
  root.querySelectorAll('input.fnum').forEach(i => { if (!i.dataset.fw) { i.dataset.fw = '1'; wireNum(i); } });
}
