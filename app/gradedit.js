// 피그마식 그라데이션 편집기(11-02 Notion N3 · 사용자 「그라데이션은 직접 설정할 수 있는 기능을, 피그마와 동일한」)
//   모양은 피그마 UI3(hub/fui/ui3.css 치수 · app/fui.js 부품): 종류 드롭다운 · 각도 칸(칸 안 다이얼) · 90° · 뒤집기 / 막대 / 정지점 행(위치 %·색 칩·헥스·빼기). hub 에는 그라데이션 구현이 없어 행 구조만 옮겼다.
//   조작: 막대를 눌러 정지점 추가 · 끌어 옮기기 · Delete 삭제 · 화살표 1%/Shift 10% · 숫자 칸 ↑↓·식(app/fui.js).
//   끄는 동안은 편집기 안 미리보기만 바뀌고(onInput), 놓을 때 한 번 onChange — 소재 전체를 다시 그리는 건 그때뿐이고 되돌리기 한 걸음도 그 한 번이다
import { normGradient, gradientCss, addStop, removeStop, moveStop, flipGradient, rotateGradient, normAngle, GRAD_MAX_STOPS } from '../core/gradient.js';
import { ic, iconBtn, numField, parseHex, wireFui } from './fui.js';

const barCss = g => `linear-gradient(90deg,${g.stops.map(s => `${s.color} ${s.pos}%`).join(',')})`;
let selected = 0;   // 다시 그려도 고른 정지점을 잃지 않게
let refocus = null; // 확정하면 인스펙터 전체가 다시 그려진다 — 키보드로 하던 칸으로 돌아오게(화살표를 연달아 눌러도 끊기지 않게)

function inner(g, id) {
  const sel = Math.min(selected, g.stops.length - 1);
  return `<div class="gtop${g.type === 'linear' ? '' : ' radial'}">
      <select class="fsel" data-gt aria-label="그라데이션 종류">${[['linear', '선형'], ['radial', '방사형']].map(([k, v]) => `<option value="${k}"${g.type === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
      ${g.type === 'linear' ? `<div class="fin unit gang"><span class="gdial" role="slider" tabindex="0" title="끌어서 각도 · Shift 45° 단위" aria-label="각도 다이얼" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${g.angle}" data-gdial><i style="transform:rotate(${g.angle}deg)"></i></span><input type="text" inputmode="decimal" class="fnum" value="${g.angle}" data-gang aria-label="각도(도)"><span class="u" aria-hidden="true">°</span></div>
      ${iconBtn('rot', '90도 돌리기', 'data-ga="rot"')}` : ''}
      ${iconBtn('flip-h', '색 순서 뒤집기', 'data-ga="flip"')}
    </div>
    <div class="gbar" data-gbar title="누르면 색 추가 · 끌어서 옮기기 · Delete 로 지우기" style="background:${barCss(g)}">
      ${g.stops.map((s, i) => `<button type="button" class="gpin ${i === sel ? 'on' : ''}" data-gp="${i}" style="left:${s.pos}%;--c:${s.color}" aria-label="색 ${i + 1} ${s.color} 위치 ${s.pos}%"></button>`).join('')}
    </div>
    <div class="ghead"><span>색 ${g.stops.length}개</span>${iconBtn('plus', '색 추가', `data-ga="add" ${g.stops.length >= GRAD_MAX_STOPS ? 'disabled' : ''}`)}</div>
    <div class="gstops">${g.stops.map((s, i) => `<div class="gstop ${i === sel ? 'on' : ''}" data-gr="${i}">
      ${numField({ value: Math.round(s.pos), label: `색 ${i + 1} 위치`, unit: '%', attrs: `data-gpos="${i}"` })}
      <div class="fcin"><span class="fsw"><i style="background:${s.color}"></i><input type="color" value="${s.color.toLowerCase()}" data-gcol="${i}" aria-label="색 ${i + 1} 고르기"></span><input type="text" class="fhex" value="${s.color.slice(1)}" maxlength="7" spellcheck="false" data-ghex="${i}" aria-label="색 ${i + 1} 헥스"></div>
      ${iconBtn('minus', `색 ${i + 1} 지우기`, `data-gdel="${i}" ${g.stops.length <= 2 ? 'disabled' : ''}`)}
    </div>`).join('')}</div>`;
}
export function gradientEditorHtml(gradient, id) {
  const g = normGradient(gradient); if (!g) return '';
  return `<div class="gedit" id="${id}Grad">${inner(g, id)}</div>`;
}
// 지금 칸을 다시 찾을 수 있는 선택자(정지점 손잡이는 순서가 바뀌므로 「고른 것」)
function keyOf(el) {
  if (el.closest?.('[data-gp]')) return 'pin';
  for (const a of ['data-gt', 'data-gang', 'data-gdial', 'data-ga', 'data-gpos', 'data-gcol', 'data-ghex', 'data-gdel']) { const n = el.closest?.(`[${a}]`); if (n) return `[${a}="${n.getAttribute(a)}"]`; }
  return null;
}
const hold = el => { refocus = keyOf(el); setTimeout(() => { refocus = null; }, 0); };   // 이번 입력에서 다시 그려질 때만 유효

// onChange(gradient): 확정(놓음·입력 끝) · onPreview(css): 끄는 동안 바깥 미리보기(.bgprev) · onLive(gradient): 끄는 동안 보드 소재(저장·되돌리기 없음)
export function bindGradientEditor(root, gradient, { id, onChange, onPreview, onLive }) {
  let g = normGradient(gradient); if (!root || !g) return;
  const restore = () => {
    if (!refocus) return;
    const el = root.querySelector(refocus === 'pin' ? `[data-gp="${Math.min(selected, g.stops.length - 1)}"]` : refocus);
    if (el && !el.disabled) { el.focus({ preventScroll: true }); if (el.select) el.select(); }
  };
  const paint = () => { root.innerHTML = inner(g, id); wire(); onPreview?.(gradientCss(g)); restore(); };
  const commit = (next, sel) => { g = normGradient(next) ?? g; if (sel != null && sel >= 0) selected = sel; onChange(g); };
  const live = (toBoard = true) => {   // 끄는 중: 막대 색·손잡이 위치·목록 숫자만(toBoard: 값이 바뀐 때만 보드까지)
    const bar = root.querySelector('[data-gbar]'); bar.style.background = barCss(g);
    g.stops.forEach((s, i) => { const p = bar.querySelector(`[data-gp="${i}"]`); if (p) { p.style.left = s.pos + '%'; p.style.setProperty('--c', s.color); p.classList.toggle('on', i === selected); } const n = root.querySelector(`[data-gpos="${i}"]`); if (n) n.value = Math.round(s.pos); const r = root.querySelector(`[data-gr="${i}"]`); if (r) { r.classList.toggle('on', i === selected); r.querySelector('.fsw i').style.background = s.color; r.querySelector('[data-gcol]').value = s.color.toLowerCase(); r.querySelector('[data-ghex]').value = s.color.slice(1); } });
    onPreview?.(gradientCss(g)); if (toBoard) onLive?.(g);
  };
  function wire() {
    const bar = root.querySelector('[data-gbar]');
    const posOf = e => { const r = bar.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    root.querySelector('[data-gt]').onchange = e => commit({ ...g, type: e.target.value });
    root.querySelector('[data-ga="flip"]').onclick = () => commit(flipGradient(g));
    const rot = root.querySelector('[data-ga="rot"]'); if (rot) rot.onclick = () => commit(rotateGradient(g, 90));
    root.querySelector('[data-ga="add"]').onclick = () => { const s = g.stops, i = Math.min(selected, s.length - 2), r = addStop(g, (s[i].pos + s[i + 1].pos) / 2); commit(r.gradient, r.index); };
    const ang = root.querySelector('[data-gang]');
    if (ang) ang.onchange = () => commit({ ...g, angle: normAngle(ang.value) });
    const dial = root.querySelector('[data-gdial]');
    if (dial) {
      const toAngle = e => { const r = dial.getBoundingClientRect(); let a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; a = normAngle(a); return e.shiftKey ? normAngle(Math.round(a / 45) * 45) : a; };
      dial.onpointerdown = e => { e.preventDefault(); dial.setPointerCapture(e.pointerId); dial.focus({ preventScroll: true });
        const mv = ev => { g = { ...g, angle: toAngle(ev) }; dial.firstElementChild.style.transform = `rotate(${g.angle}deg)`; ang.value = g.angle; dial.setAttribute('aria-valuenow', g.angle); onPreview?.(gradientCss(g)); onLive?.(g); };
        mv(e); dial.onpointermove = mv; dial.onpointerup = dial.onpointercancel = () => { dial.onpointermove = dial.onpointerup = dial.onpointercancel = null; refocus = '[data-gdial]'; setTimeout(() => { refocus = null; }, 0); commit(g); }; };
      dial.onkeydown = e => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]; if (d) { e.preventDefault(); commit({ ...g, angle: normAngle(g.angle + d * (e.shiftKey ? 15 : 1)) }); } };
    }
    bar.onpointerdown = e => {
      if (e.target.closest('[data-gp]')) return;
      const r = addStop(g, posOf(e)); if (r.index < 0) return;
      refocus = 'pin'; setTimeout(() => { refocus = null; }, 0);   // 막 찍은 정지점을 바로 Delete·화살표로
      e.preventDefault(); commit(r.gradient, r.index);
    };
    root.querySelectorAll('[data-gp]').forEach(p => {
      p.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); selected = +p.dataset.gp; p.setPointerCapture(e.pointerId); p.focus({ preventScroll: true }); live(false);
        let moved = false;
        p.onpointermove = ev => { moved = true; const r = moveStop(g, selected, posOf(ev)); g = r.gradient; selected = r.index; live(); };
        p.onpointerup = p.onpointercancel = () => { p.onpointermove = p.onpointerup = p.onpointercancel = null; refocus = 'pin'; setTimeout(() => { refocus = null; }, 0); if (moved) commit(g, selected); else paint(); }; };
      p.onkeydown = e => { const i = +p.dataset.gp, d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (d) { e.preventDefault(); const r = moveStop(g, i, g.stops[i].pos + d * (e.shiftKey ? 10 : 1)); commit(r.gradient, r.index); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && g.stops.length > 2) { e.preventDefault(); selected = Math.max(0, i - 1); commit(removeStop(g, i)); } };
    });
    root.querySelectorAll('[data-gpos]').forEach(n => n.onchange = () => { const r = moveStop(g, +n.dataset.gpos, Number(n.value)); commit(r.gradient, r.index); });
    root.querySelectorAll('[data-gcol]').forEach(c => { const i = +c.dataset.gcol;
      c.oninput = () => { g = { ...g, stops: g.stops.map((s, k) => k === i ? { ...s, color: c.value.toUpperCase() } : s) }; selected = i; live(); };
      c.onchange = () => commit(g, i); });
    root.querySelectorAll('[data-ghex]').forEach(t => { const i = +t.dataset.ghex;
      t.onfocus = () => t.select();
      t.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); t.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); t.value = g.stops[i].color.slice(1); t.blur(); } };
      t.onchange = () => { const v = parseHex(t.value); if (!v) { t.value = g.stops[i].color.slice(1); return; } commit({ ...g, stops: g.stops.map((s, k) => k === i ? { ...s, color: v } : s) }, i); }; });
    root.querySelectorAll('[data-gdel]').forEach(b => b.onclick = () => { const i = +b.dataset.gdel; selected = Math.max(0, i - 1); commit(removeStop(g, i)); });
    root.querySelectorAll('[data-gr]').forEach(r => r.addEventListener('pointerdown', e => { selected = +r.dataset.gr; live(false);
      if (!e.target.closest('input,button')) { e.preventDefault(); root.querySelector(`[data-gp="${selected}"]`)?.focus({ preventScroll: true }); } }));   // 행 빈 곳을 누르면 그 손잡이로 — 바로 Delete·화살표
    wireFui(root);
  }
  // 키보드·버튼으로 확정하면 그 칸을 기억해 뒀다가 다시 그린 뒤 돌려준다(capture: 칸의 처리보다 먼저)
  root.addEventListener('keydown', e => { if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'Tab'].includes(e.key)) hold(e.target); }, true);
  root.addEventListener('click', e => { if (e.target.closest('button')) hold(e.target); }, true);
  root.addEventListener('change', e => { if (e.target.matches('select')) hold(e.target); }, true);
  wire();
  restore();
}
