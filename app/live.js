// 끄는 동안 실시간 미리보기(11-02 사용자 「실시간으로 반영되는 게 보이는 게 나을 듯」).
//   iframe 을 다시 적재(srcdoc)하면 깜빡이고 onload → 검수까지 돈다. 대신 새로 그린 html 을 기존 문서에 「달라진 곳만」 입힌다.
//   같은 src·style 은 건드리지 않으니 그림을 다시 해독하지 않아 깜빡임이 없다.
//   데이터(campaign·되돌리기·저장)는 건드리지 않는다 — 놓을 때 한 번 정식 재렌더(restyleWith)가 그 일을 한다.

// 속성 맞추기 — 바뀐 것만 쓴다(data: URL 이 든 긴 문자열도 같으면 그대로)
function syncAttrs(cur, next) {
  for (const { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (const { name, value } of next.attributes) if (cur.getAttribute(name) !== value) cur.setAttribute(name, value);
}
function morphChildren(cur, next, doc) {
  let a = cur.firstChild, b = next.firstChild;
  while (a && b) {
    const na = a.nextSibling, nb = b.nextSibling;
    if (a.nodeType === b.nodeType && a.nodeName === b.nodeName) {
      if (a.nodeType === 1) { syncAttrs(a, b); morphChildren(a, b, doc); }
      else if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    } else cur.replaceChild(doc.importNode(b, true), a);
    a = na; b = nb;
  }
  while (a) { const n = a.nextSibling; cur.removeChild(a); a = n; }
  while (b) { cur.appendChild(doc.importNode(b, true)); b = b.nextSibling; }
}
// 문서 전체(previewDoc 결과)를 기존 iframe 문서에 입힌다. 머리(글꼴 선언)가 다르면 못 한다 → false(호출한 쪽이 srcdoc 으로)
export function morphDoc(doc, html) {
  if (!doc?.body || doc.readyState === 'loading' || !html) return false;
  if (doc.__liveHtml === html) return true;   // 끌다 놓으면 정식 그림이 마지막 미리보기와 같다 — 파싱할 것도 없다(새 srcdoc 은 새 문서라 자동 무효)
  const next = new DOMParser().parseFromString(html, 'text/html');
  if (doc.head.innerHTML !== next.head.innerHTML) return false;
  syncAttrs(doc.body, next.body);
  morphChildren(doc.body, next.body, doc);
  doc.__liveHtml = html;
  return true;
}

// 화면에 보이는 프레임부터 돌아가며 갱신. 한 프레임(rAF)에 budget ms 만 쓰고 넘긴다 — 손잡이·피커가 끊기지 않게.
//   새 값이 오면 지금 값은 버리되 순번(cursor)은 이어 간다 → 끄는 내내 멈추지 않아도 모든 프레임이 차례로 따라온다.
//   deps: list() → 보이는 프레임 [{ key, apply(value) }] · onTick(ms, n)
export function createLiveScheduler({ list, budget = 14, onTick }) {
  let value = null, gen = 0, doneGen = new Map(), cursor = 0, raf = 0, active = false, idle = 0;
  const step = () => {
    raf = 0;
    if (value == null) return;
    const items = list();
    const t0 = performance.now(); let n = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[(cursor + i) % items.length];
      if (doneGen.get(it.key) === gen) continue;
      it.apply(value); doneGen.set(it.key, gen); n++;
      if (performance.now() - t0 > budget) { cursor = (cursor + i + 1) % items.length; break; }
    }
    if (n) onTick?.(performance.now() - t0, n);
    if (items.some(it => doneGen.get(it.key) !== gen)) raf = requestAnimationFrame(step);
  };
  return {
    push(v) { value = v; gen++; active = true; clearTimeout(idle); idle = setTimeout(() => { active = false; }, 2000); if (!raf) raf = requestAnimationFrame(step); },
    stop() { value = null; active = false; clearTimeout(idle); doneGen = new Map(); if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    get active() { return active; },
  };
}
