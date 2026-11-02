// 피그마식 그라데이션 편집기(11-02 Notion N3 · 사용자 「그라데이션은 직접 설정할 수 있는 기능을, 피그마와 동일한」)
//   종류(선형·방사형) · 각도(숫자·다이얼·90° 회전·뒤집기) · 막대(눌러 정지점 추가 · 끌어 옮기기 · Delete 삭제 · 화살표 1%/Shift 10%) · 정지점 목록(위치 %·색·헥스·삭제).
//   끄는 동안은 편집기 안 미리보기만 바뀌고(onInput), 놓을 때 한 번 onChange — 소재 전체를 다시 그리는 건 그때뿐이고 되돌리기 한 걸음도 그 한 번이다
import { normGradient, gradientCss, addStop, removeStop, moveStop, flipGradient, rotateGradient, normAngle, GRAD_MAX_STOPS } from '../core/gradient.js';

const barCss = g => `linear-gradient(90deg,${g.stops.map(s => `${s.color} ${s.pos}%`).join(',')})`;
let selected = 0;   // 다시 그려도 고른 정지점을 잃지 않게

function inner(g, id) {
  const sel = Math.min(selected, g.stops.length - 1);
  return `<div class="gtop">
      <div class="vseg gtype" role="group" aria-label="그라데이션 종류">${[['linear', '선형'], ['radial', '방사형']].map(([k, v]) => `<button type="button" data-gt="${k}" class="${g.type === k ? 'on' : ''}" aria-pressed="${g.type === k}">${v}</button>`).join('')}</div>
      <button type="button" class="gicon" data-ga="flip" title="색 순서 뒤집기" aria-label="색 순서 뒤집기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3"/></svg></button>
      ${g.type === 'linear' ? `<button type="button" class="gicon" data-ga="rot" title="90도 돌리기" aria-label="90도 돌리기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3"/></svg></button>` : ''}
    </div>
    ${g.type === 'linear' ? `<div class="grot"><span class="gdial" role="slider" tabindex="0" aria-label="각도" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${g.angle}" data-gdial><i style="transform:rotate(${g.angle}deg)"></i></span>
      <label class="gnum">각도<input type="number" min="0" max="359" step="1" value="${g.angle}" data-gang aria-label="각도(도)"><em>°</em></label></div>` : ''}
    <div class="gbar" data-gbar title="누르면 색 추가 · 끌어서 옮기기 · Delete 로 지우기" style="background:${barCss(g)}">
      ${g.stops.map((s, i) => `<button type="button" class="gpin ${i === sel ? 'on' : ''}" data-gp="${i}" style="left:${s.pos}%;--c:${s.color}" aria-label="색 ${i + 1} ${s.color} 위치 ${s.pos}%"></button>`).join('')}
    </div>
    <div class="ghead"><span>색 ${g.stops.length}개</span><button type="button" class="gicon" data-ga="add" ${g.stops.length >= GRAD_MAX_STOPS ? 'disabled' : ''} title="색 추가" aria-label="색 추가"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button></div>
    <div class="glist">${g.stops.map((s, i) => `<div class="grow2 ${i === sel ? 'on' : ''}" data-gr="${i}">
      <label class="gpos"><input type="number" min="0" max="100" step="1" value="${Math.round(s.pos)}" data-gpos="${i}" aria-label="색 ${i + 1} 위치"><em>%</em></label>
      <label class="gswatch" style="background:${s.color}"><input type="color" value="${s.color}" data-gcol="${i}" aria-label="색 ${i + 1} 고르기"></label>
      <input type="text" class="ghex" value="${s.color.slice(1)}" maxlength="7" spellcheck="false" data-ghex="${i}" aria-label="색 ${i + 1} 헥스">
      <button type="button" class="gicon" data-gdel="${i}" ${g.stops.length <= 2 ? 'disabled' : ''} title="이 색 지우기" aria-label="색 ${i + 1} 지우기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg></button>
    </div>`).join('')}</div>`;
}
export function gradientEditorHtml(gradient, id) {
  const g = normGradient(gradient); if (!g) return '';
  return `<div class="gedit" id="${id}Grad">${inner(g, id)}</div>`;
}
// onChange(gradient): 확정(놓음·입력 끝) · onPreview(css): 끄는 동안 바깥 미리보기(.bgprev)
export function bindGradientEditor(root, gradient, { id, onChange, onPreview }) {
  let g = normGradient(gradient); if (!root || !g) return;
  const paint = () => { root.innerHTML = inner(g, id); wire(); onPreview?.(gradientCss(g)); };
  const commit = (next, sel) => { g = normGradient(next) ?? g; if (sel != null && sel >= 0) selected = sel; onChange(g); };
  const live = () => {   // 끄는 중: 막대 색·손잡이 위치·목록 숫자만
    const bar = root.querySelector('[data-gbar]'); bar.style.background = barCss(g);
    g.stops.forEach((s, i) => { const p = bar.querySelector(`[data-gp="${i}"]`); if (p) { p.style.left = s.pos + '%'; p.style.setProperty('--c', s.color); p.classList.toggle('on', i === selected); } const n = root.querySelector(`[data-gpos="${i}"]`); if (n) n.value = Math.round(s.pos); const r = root.querySelector(`[data-gr="${i}"]`); if (r) { r.classList.toggle('on', i === selected); r.querySelector('.gswatch').style.background = s.color; r.querySelector('[data-gcol]').value = s.color; r.querySelector('[data-ghex]').value = s.color.slice(1); } });
    onPreview?.(gradientCss(g));
  };
  function wire() {
    const bar = root.querySelector('[data-gbar]');
    const posOf = e => { const r = bar.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    root.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => commit({ ...g, type: b.dataset.gt }));
    root.querySelector('[data-ga="flip"]').onclick = () => commit(flipGradient(g));
    const rot = root.querySelector('[data-ga="rot"]'); if (rot) rot.onclick = () => commit(rotateGradient(g, 90));
    root.querySelector('[data-ga="add"]').onclick = () => { const s = g.stops, i = Math.min(selected, s.length - 2), r = addStop(g, (s[i].pos + s[i + 1].pos) / 2); commit(r.gradient, r.index); };
    const ang = root.querySelector('[data-gang]');
    if (ang) ang.onchange = () => commit({ ...g, angle: normAngle(ang.value) });
    const dial = root.querySelector('[data-gdial]');
    if (dial) {
      const toAngle = e => { const r = dial.getBoundingClientRect(); let a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; a = normAngle(a); return e.shiftKey ? normAngle(Math.round(a / 45) * 45) : a; };
      dial.onpointerdown = e => { e.preventDefault(); dial.setPointerCapture(e.pointerId); dial.focus({ preventScroll: true });
        const mv = ev => { g = { ...g, angle: toAngle(ev) }; dial.firstElementChild.style.transform = `rotate(${g.angle}deg)`; ang.value = g.angle; dial.setAttribute('aria-valuenow', g.angle); onPreview?.(gradientCss(g)); };
        mv(e); dial.onpointermove = mv; dial.onpointerup = dial.onpointercancel = () => { dial.onpointermove = dial.onpointerup = dial.onpointercancel = null; commit(g); }; };
      dial.onkeydown = e => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]; if (d) { e.preventDefault(); commit({ ...g, angle: normAngle(g.angle + d * (e.shiftKey ? 15 : 1)) }); } };
    }
    bar.onpointerdown = e => {
      if (e.target.closest('[data-gp]')) return;
      const r = addStop(g, posOf(e)); if (r.index < 0) return; commit(r.gradient, r.index);
    };
    root.querySelectorAll('[data-gp]').forEach(p => {
      p.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); selected = +p.dataset.gp; p.setPointerCapture(e.pointerId); p.focus({ preventScroll: true }); live();
        let moved = false;
        p.onpointermove = ev => { moved = true; const r = moveStop(g, selected, posOf(ev)); g = r.gradient; selected = r.index; live(); };
        p.onpointerup = p.onpointercancel = () => { p.onpointermove = p.onpointerup = p.onpointercancel = null; if (moved) commit(g, selected); else paint(); }; };
      p.onkeydown = e => { const i = +p.dataset.gp, d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (d) { e.preventDefault(); const r = moveStop(g, i, g.stops[i].pos + d * (e.shiftKey ? 10 : 1)); commit(r.gradient, r.index); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && g.stops.length > 2) { e.preventDefault(); selected = Math.max(0, i - 1); commit(removeStop(g, i)); } };
    });
    root.querySelectorAll('[data-gpos]').forEach(n => n.onchange = () => { const r = moveStop(g, +n.dataset.gpos, Number(n.value)); commit(r.gradient, r.index); });
    root.querySelectorAll('[data-gcol]').forEach(c => { const i = +c.dataset.gcol;
      c.oninput = () => { g = { ...g, stops: g.stops.map((s, k) => k === i ? { ...s, color: c.value.toUpperCase() } : s) }; selected = i; live(); };
      c.onchange = () => commit(g, i); });
    root.querySelectorAll('[data-ghex]').forEach(t => { const i = +t.dataset.ghex;
      t.onchange = () => { let v = t.value.trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(v)) v = [...v].map(c => c + c).join(''); if (!/^[0-9a-f]{6}$/i.test(v)) { t.value = g.stops[i].color.slice(1); return; } commit({ ...g, stops: g.stops.map((s, k) => k === i ? { ...s, color: '#' + v.toUpperCase() } : s) }, i); }; });
    root.querySelectorAll('[data-gdel]').forEach(b => b.onclick = () => { const i = +b.dataset.gdel; selected = Math.max(0, i - 1); commit(removeStop(g, i)); });
    root.querySelectorAll('[data-gr]').forEach(r => r.addEventListener('pointerdown', () => { selected = +r.dataset.gr; live(); }));
  }
  wire();
}
