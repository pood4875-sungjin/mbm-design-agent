// 오래 걸리는 작업의 진행 표시(11-02 사용자 「생성되고 있는지 프로세스 알려줘야 할 듯」) — 지금 단계 · n/전체 · 막대 · 남은 시간 어림 · 취소
export class ProgressCancelled extends Error {}
export function showProgress({ title, total, onCancel = null }) {
  document.getElementById('progressBox')?.remove();
  const box = document.createElement('div');
  box.id = 'progressBox'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.innerHTML = `<div class="ptop"><b></b><span class="pn"></span><button type="button" class="pcancel">취소</button></div>
    <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><div class="plabel"></div>`;
  document.body.appendChild(box);
  const q = s => box.querySelector(s), started = performance.now();
  let n = 0, cancelled = false, max = Math.max(1, total);
  q('.ptop b').textContent = title;
  const paint = label => {
    const pct = Math.min(100, Math.round(n / max * 100));
    q('.pn').textContent = `${n} / ${max}`; q('.pbar i').style.width = pct + '%'; q('.pbar').setAttribute('aria-valuenow', pct);
    const left = n >= 3 ? Math.round((performance.now() - started) / n * (max - n) / 1000) : null;
    q('.plabel').textContent = `${label ?? ''}${left != null && left >= 2 ? ` · 약 ${left >= 60 ? `${Math.round(left / 60)}분` : `${left}초`} 남음` : ''}`;
  };
  q('.pcancel').onclick = () => { cancelled = true; q('.pcancel').disabled = true; q('.plabel').textContent = '취소하는 중…'; onCancel?.(); };
  paint('준비 중');
  const api = {
    // 한 건 시작 — 취소됐으면 여기서 멈춘다. 화면이 그려질 틈을 준다(렌더가 이어지면 막대가 안 움직인다)
    async step(label) { if (cancelled) throw new ProgressCancelled(); paint(label); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); },
    tick() { n = Math.min(max, n + 1); paint(q('.plabel').textContent.split(' · 약')[0]); },
    grow(by) { max += by; paint(q('.plabel').textContent.split(' · 약')[0]); },
    phase(label) { q('.ptop b').textContent = label; },
    done(msg) { q('.ptop b').textContent = msg; n = max; paint(''); q('.pn').textContent = ''; q('.pcancel').remove(); q('.plabel').remove(); box.classList.add('ok'); setTimeout(() => box.remove(), 3500); },
    close() { box.remove(); },
  };
  return api;
}
