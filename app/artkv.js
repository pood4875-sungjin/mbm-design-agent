// 이미지 요소(키비주얼·로고) 패널 — hub/pro 의 「이미지 레이어 고름」(11-10 이식 1·2단계, docs/hub-to-app-plan.md §2-1·§2-2).
//   1단계 채움: 이 소재만 그림·로고 바꾸기(core/artasset.js → overrides.style) · 맞춤(kvUse) · 이 소재 색도 맞춤 · 영역 지정 · 캔버스에 파일 끌어 놓기
//   2단계 외관: 정렬 6 · 비율 고정(그림은 늘 비율대로) · 불투명도 · 모서리 · 뒤집기(누끼만) → overrides.elements.kv|logo { op, hid, r, flip }(core/elementedit.js patchBox)
//   혼합·효과·선은 넣지 않는다(11-10 총괄 결정 4 — 섹션도 숨김). 회전은 SVG 내보내기 충실도 때문에 아직 없음.
//   app.js 의 지역 함수는 D 로 받는다(elselect.js 와 같은 방식).
import { withArtKv, clearArtKv, withArtKvColors, withArtKvUse, withArtLogo, clearArtLogo, hasArtKv, hasArtLogo, isCutoutMeta, ART_ASSET_KEYS } from '../core/artasset.js';
import { withElementEdit } from '../core/elementedit.js';
import { mountKvFocus, withManual } from './kvfocus.js';

const PREF = 'mbm.artKvColors';
// 틀이 정한 칸인가(app editor partsOf — 그 몫이 manualLayout 으로 안 움직이고 이유가 있으면)
const moldWhy = (P, kind) => (!P?.[kind] ? P?.why?.[kind] ?? null : null);
const readPref = () => { try { return localStorage.getItem(PREF) === '1'; } catch { return false; } };
const writePref = v => { try { localStorage.setItem(PREF, v ? '1' : '0'); } catch {} };
const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(f); });

export function createArtKv(D) {
  // D: { state, SPECS, refOf, escH, ic, iconBtn, numField, elCommit(a,patch,label,coalesce), live(a,{elements}), liveStop(), select(key,el), partsOf(a), EL,
  //      prepKv, analyzeKeyVisual, rolesFromAssets, paletteOf(roles), prepLogo, logoToneOf, logoMetaOfUrl, toast, frames, campaignKvFile() }
  const { escH, ic, iconBtn, numField } = D;
  const effOf = a => ({ ...D.state.campaign.style, ...(a.overrides?.style ?? {}) });
  const save = (a, st, label) => D.elCommit(a, { style: st }, label);

  /* ── 잠금 판단(이유 한 줄) ── */
  function looks(a, kind, it) {
    const spec = D.SPECS[a.specId], eff = effOf(a), full = it.box.w >= spec.w - 1 && it.box.h >= spec.h - 1;
    const cut = isCutoutMeta(eff.kvMeta);
    return {
      flip: kind !== 'kv' ? '로고는 뒤집지 않아요' : cut ? '' : '사진·배경 있는 그림은 뒤집으면 녹임·스크림 층과 어긋나요 — 누끼(투명 PNG)만 뒤집을 수 있어요',
      r: kind !== 'kv' ? '로고엔 모서리를 쓰지 않아요' : /bizboard/.test(spec.id ?? a.specId) ? '비즈보드는 그림 칸 모서리가 매체 규정이에요' : full ? '지면 전체에 깐 그림이라 모서리가 보이지 않아요' : '',
      use: moldWhy(D.partsOf(a), 'kv') ? '틀이 정한 그림 칸 — 맞춤은 틀이 정해요' : spec.medium === 'jasoseol' ? '자소설은 그림 칸이 규정이에요' : '',
    };
  }

  /* ── 2단계: 정렬 · 크기(비율 고정) · 외관 ── */
  const ALIGN = [['l', 'al-l', '왼쪽'], ['c', 'al-c', '가로 가운데'], ['r', 'al-r', '오른쪽'], ['t', 'al-t', '위'], ['m', 'al-m', '세로 가운데'], ['b', 'al-b', '아래']];
  // 틀이 정한 칸(자소설·리멤버 등 시안 틀 · 매체 틀)은 정렬을 잠근다 — 칸 자체가 매체 규정이라 한 번에 크게 옮기면 글자와 겹친다(위치 칸·끌기는 예전처럼 열고 경고)
  const alignHtml = lock => `<div class="falign" role="group" aria-label="프레임 기준 정렬"${lock ? ` title="${escH(lock)}"` : ''}>${ALIGN.map(([k, icn, n], i) => `${i === 3 ? '<i class="fsep" aria-hidden="true"></i>' : ''}<button type="button" class="fib" data-elal="${k}" title="${lock ? escH(lock) : `프레임 ${n} 정렬`}" aria-label="프레임 ${n} 정렬" ${lock ? 'disabled' : ''}>${ic(icn)}</button>`).join('')}</div>`;
  const ratioBtn = kind => iconBtn('lock', `${kind === 'kv' ? '그림' : '로고'}은 비율을 지켜 커져요(늘림 없음)`, 'id="iElRatio" aria-pressed="true" disabled');
  function lookHtml(a, kind, it) {
    const ed = a.overrides.elements?.[kind] ?? {}, L = looks(a, kind, it);
    const op = ed.hid ? 0 : ed.op ?? 100, r = ed.r ?? 0, rMax = Math.max(1, Math.floor(Math.min(it.box.w, it.box.h) / 2));
    const fl = ed.flip ?? '';
    const slider = (id, v, max, dis, label) => `<input type="range" class="fslider" id="${id}" min="0" max="${max}" value="${Math.min(v, max)}" style="--p:${Math.round(Math.min(v, max) / max * 100)}%" aria-label="${label}" ${dis ? 'disabled' : ''}>`;
    return `<section class="isec" id="iElLookSec"><h3>외관</h3>
      <div class="flab sub"><span>불투명도</span></div>
      <div class="frow3">${numField({ id: 'iElKvOp', value: op, label: '불투명도(%)', icon: 'opacity', unit: '%' })}${slider('iElKvOpR', op, 100, false, '불투명도 슬라이더')}${iconBtn(ed.hid ? 'eye-off' : 'eye', ed.hid ? '보이기' : '숨기기(이 소재에서 안 보이게)', `id="iElKvEye" aria-pressed="${!!ed.hid}"`)}</div>
      ${kind === 'kv' ? `<div class="flab sub"><span>모서리</span></div>
      <div class="frow3"${L.r ? ` title="${escH(L.r)}"` : ''}>${numField({ id: 'iElKvR', value: r, label: '모서리 반경(px)', icon: 'radius', attrs: L.r ? 'disabled' : '' })}${slider('iElKvRR', r, rMax, !!L.r, '모서리 슬라이더')}<span></span></div>
      <div class="flab sub"><span>뒤집기</span></div>
      <div class="fline2"${L.flip ? ` title="${escH(L.flip)}"` : ''}>${iconBtn('flip-h', L.flip || '좌우 뒤집기', `id="iElFlipH" aria-pressed="${fl.includes('h')}" ${L.flip ? 'disabled' : ''}`)}${iconBtn('flip-v', L.flip || '상하 뒤집기', `id="iElFlipV" aria-pressed="${fl.includes('v')}" ${L.flip ? 'disabled' : ''}`)}</div>
      ${[L.r, L.flip].filter(Boolean).length ? `<div class="fnote">${[L.r, L.flip].filter(Boolean).map(escH).join(' · ')}</div>` : ''}` : ''}
    </section>`;
  }

  /* ── 1단계: 채움(이 소재만 그림·로고) ── */
  function kvFillHtml(a, it) {
    const c = D.state.campaign, eff = effOf(a), own = hasArtKv(a), L = looks(a, 'kv', it);
    const use = a.overrides.style?.kvUse ?? 'auto', photo = eff.kvMeta?.field?.kind === 'photo';
    const opts = [['auto', `자동${c.style.kvUse && c.style.kvUse !== 'auto' ? '(공통 따름)' : ''}`], ...(photo ? [['full', '전체에 깔기']] : []), ['part', '칸 안에']];
    const colorsOn = own ? !!a.overrides.style?.kvOwnColors : readPref();
    const why = moldWhy(D.partsOf(a), 'kv');
    return `<section class="isec" id="iElFillSec"><h3>채움 <span class="mode">이 소재만</span>${own ? `<button type="button" class="ovr" id="iElKvReset" title="모든 소재 공통 키비주얼로 되돌리기" aria-label="이 소재 그림을 공통 키비주얼로 되돌리기">개별 ${ic('swap')}</button>` : ''}</h3>
      <div class="fimgrow"><span class="fimgsw" style="background-image:url(${eff.keyVisual ? D.refOf(eff.keyVisual) : ''})" role="img" aria-label="${own ? '이 소재 그림' : '공통 키비주얼'}"></span>
        <select id="iElKvUse" aria-label="그림 맞춤" ${L.use ? `disabled title="${escH(L.use)}"` : ''}>${opts.map(([k, n]) => `<option value="${k}" ${use === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        ${iconBtn('img', '그림 바꾸기 — 이 소재만', 'id="iElKvPick"')}</div>
      <input type="file" id="iElKvFile" accept="image/*" style="display:none">
      ${eff.keyVisual && eff.kvMeta ? `<div class="kvthumb" id="iElKvThumb" style="width:100%;height:120px;margin-top:8px;background-image:url(${D.refOf(eff.keyVisual)})" title="끌어서 이 소재에 보여 줄 영역 지정"></div>` : ''}
      <label class="fchk"><input type="checkbox" id="iElKvColors" ${colorsOn ? 'checked' : ''}> 이 소재 색도 새 그림에 맞춤</label>
      <div class="fnote">${own ? '이 소재만 다른 그림이에요 · 가로형/세로형 그림은 이 소재엔 안 쓰여요' : '바꾸면 이 소재만 다른 그림이 돼요. 색은 캠페인 색 그대로(체크하면 새 그림 색)'}${why ? ' · 틀이 정한 칸이라 칸은 그대로, 그림만 바뀌어요' : ''}${L.use ? ` · ${escH(L.use)}` : ''}</div>
      <button type="button" class="lnk" data-goall="kv" style="margin-top:6px">모든 소재 키비주얼 바꾸기 →</button>
    </section>`;
  }
  function logoFillHtml(a) {
    const eff = effOf(a), own = hasArtLogo(a);
    const sw = (id, v, label, dark) => `<div class="fimgrow"><span class="fimgsw logo${dark ? ' dark' : ''}" style="background-image:url(${v ? D.refOf(v) : ''})" role="img" aria-label="${label}"></span><span class="fimgname">${label}${v ? '' : ' — 없음'}</span>${iconBtn('img', `${label} 바꾸기 — 이 소재만`, `id="${id}Pick"`)}</div><input type="file" id="${id}File" accept="image/*" style="display:none">`;
    return `<section class="isec" id="iElFillSec"><h3>채움 <span class="mode">이 소재만</span>${own ? `<button type="button" class="ovr" id="iElLogoReset" title="공통 로고로 되돌리기" aria-label="이 소재 로고를 공통 로고로 되돌리기">개별 ${ic('swap')}</button>` : ''}</h3>
      ${sw('iElLogo', eff.logo, '원색 로고', false)}${sw('iElLogoLight', eff.logoLight, '흰색 로고', true)}
      <div class="fnote">지면 밝기에 따라 원색/흰색은 렌더러가 고르고, 매체 로고 규정(크기 상한·공식 칸)은 그대로예요</div>
      <button type="button" class="lnk" data-goall="logo" style="margin-top:6px">모든 소재 로고 바꾸기 →</button>
    </section>`;
  }

  // 요소 패널 위쪽(이름 · 정렬 · 위치 · 크기) — app.js elementPanelHtml 의 그림·로고 갈래
  function boxHtml(a, it, head, posRow, sizeRow, whyNote) {
    const kind = it.kind;
    return `<section class="isec">${head}
      <div class="flab sub"><span>정렬</span></div>${alignHtml(moldWhy(D.partsOf(a), kind) ? '틀이 정한 칸이라 정렬은 잠겨 있어요(위치 칸으로 조금씩은 옮길 수 있어요)' : '')}
      <div class="flab sub"><span>위치</span></div>${posRow}
      <div class="flab sub"><span>크기</span></div><div class="frow3 wh">${sizeRow}${ratioBtn(kind)}</div>
      ${whyNote}
      </section>${lookHtml(a, kind, it)}${kind === 'kv' ? kvFillHtml(a, it) : logoFillHtml(a)}`;
  }

  /* ── 바꾸기 실행 ── */
  async function replaceKv(a, dataUrl) {
    const c = D.state.campaign;
    const kv = await D.prepKv(dataUrl);
    let meta = null, readability = null, suggests = [];
    try { ({ meta, readability, suggests } = await D.analyzeKeyVisual(kv)); } catch {}
    let palette = null;
    const want = readPref();
    if (want) { try { const eff = effOf(a); const { roles } = await D.rolesFromAssets({ logo: eff.logo, keyVisual: kv, kvMeta: meta, mode: c.style.mode, kvColors: suggests }); if (roles) palette = D.paletteOf(roles); } catch {} }
    save(a, withArtKv(a.overrides?.style, { keyVisual: kv, kvOrig: dataUrl, kvMeta: meta, kvReadability: readability, palette }), '이 소재 그림 바꾸기');
    D.toast(`이 소재만 그림을 바꿨어요${palette ? ` — 색도 새 그림에 맞춤(주색 ${palette.primary})` : ' — 색은 캠페인 그대로'} · 되돌리기 ⌘Z`);
  }
  async function replaceLogo(a, key, dataUrl) {
    const c = D.state.campaign;
    const p = await D.prepLogo(dataUrl), src = p.changed ? p.dataUrl : dataUrl;
    let meta = null, tone = null;
    if (key === 'logo') { const ink = p.monoDataUrl ?? src; tone = await D.logoToneOf(ink).catch(() => 'dark'); meta = await D.logoMetaOfUrl(ink).catch(() => null); }
    save(a, withArtLogo(a.overrides?.style, key, { src, orig: dataUrl, mono: p.monoDataUrl ?? null, meta, tone }, c.style), key === 'logo' ? '이 소재 로고 바꾸기' : '이 소재 흰색 로고 바꾸기');
    D.toast(`이 소재만 ${key === 'logo' ? '로고' : '흰색 로고'}를 바꿨어요${p.changed ? ` · ${p.note}` : ''}`);
  }

  /* ── 묶기 ── */
  function bind(insp, a, id) {
    const q = s => insp.querySelector(s), kind = id === 'logo' ? 'logo' : 'kv', key = a.key ?? a.specId;
    const it = D.EL.find(a, id); if (!it) return;
    const spec = D.SPECS[a.specId];
    const edit = (patch, label, coalesce = false) => D.elCommit(a, { elements: withElementEdit(a.overrides.elements, kind, patch) }, `${kind === 'kv' ? '키비주얼' : '로고'} ${label}`, coalesce);
    const live = patch => D.live(a, { elements: withElementEdit(a.overrides.elements, kind, patch) });
    // 정렬 — 프레임 기준(안전영역 밖이면 놓을 때 안쪽으로 — elselect settle)
    insp.querySelectorAll('[data-elal]').forEach(b => b.onclick = () => {
      const cur = D.EL.find(a, id); if (!cur) return; const B = cur.box, k = b.dataset.elal;
      const x = { l: 0, c: (spec.w - B.w) / 2, r: spec.w - B.w }[k], y = { t: 0, m: (spec.h - B.h) / 2, b: spec.h - B.h }[k];
      D.EL.setXY(a, id, x ?? null, y ?? null);
    });
    // 불투명도 · 숨김
    const opN = q('#iElKvOp'), opR = q('#iElKvOpR');
    const opOf = v => { const n = Math.round(Math.max(0, Math.min(100, v))); return n >= 100 ? { op: null, hid: null } : { op: n, hid: null }; };
    if (opN) opN.addEventListener('change', () => { const v = parseFloat(opN.value); if (Number.isFinite(v)) edit(opOf(v), '불투명도'); });
    if (opR) { opR.oninput = () => { opR.style.setProperty('--p', `${opR.value}%`); if (opN) opN.value = opR.value; live(opOf(+opR.value)); }; opR.onchange = () => edit(opOf(+opR.value), '불투명도'); }
    q('#iElKvEye')?.addEventListener('click', () => { const h = !a.overrides.elements?.[kind]?.hid; edit({ hid: h ? 1 : null }, h ? '숨기기' : '보이기'); });
    // 모서리
    const rN = q('#iElKvR'), rR = q('#iElKvRR');
    const rOf = v => ({ r: Math.round(Math.max(0, v)) || null });
    if (rN && !rN.disabled) rN.addEventListener('change', () => { const v = parseFloat(rN.value); if (Number.isFinite(v)) edit(rOf(v), '모서리'); });
    if (rR && !rR.disabled) { rR.oninput = () => { rR.style.setProperty('--p', `${Math.round(rR.value / rR.max * 100)}%`); if (rN) rN.value = rR.value; live(rOf(+rR.value)); }; rR.onchange = () => edit(rOf(+rR.value), '모서리'); }
    // 뒤집기(누끼만)
    for (const [sel, axis] of [['#iElFlipH', 'h'], ['#iElFlipV', 'v']]) {
      const b = q(sel); if (!b || b.disabled) continue;
      b.onclick = () => { const f = a.overrides.elements?.kv?.flip ?? ''; const next = (f.includes(axis) ? f.replace(axis, '') : f + axis).split('').sort().join(''); edit({ flip: next || null }, axis === 'h' ? '좌우 뒤집기' : '상하 뒤집기'); };
    }
    // 채움 — 키비주얼
    const kvIn = q('#iElKvFile');
    if (kvIn) {
      q('#iElKvPick').onclick = () => kvIn.click();
      kvIn.onchange = async () => { const f = kvIn.files[0]; if (!f) return; await replaceKv(a, await readFile(f)); };
      const use = q('#iElKvUse'); if (use && !use.disabled) use.onchange = () => save(a, withArtKvUse(a.overrides?.style, use.value), '이 소재 그림 맞춤');
      const chk = q('#iElKvColors');
      if (chk) chk.onchange = async () => {
        writePref(chk.checked);
        if (!hasArtKv(a)) return;   // 아직 이 소재 그림이 없으면 다음 바꾸기에 쓴다
        if (!chk.checked) { save(a, withArtKvColors(a.overrides.style, null), '이 소재 색 캠페인으로'); return; }
        const eff = effOf(a), c = D.state.campaign;
        try { const { roles } = await D.rolesFromAssets({ logo: eff.logo, keyVisual: eff.keyVisual, kvMeta: eff.kvMeta, mode: c.style.mode }); if (roles) save(a, withArtKvColors(a.overrides.style, D.paletteOf(roles)), '이 소재 색 새 그림에 맞춤'); } catch { D.toast('그림에서 색을 읽지 못했어요'); }
      };
      q('#iElKvReset')?.addEventListener('click', () => save(a, clearArtKv(a.overrides.style), '이 소재 그림 공통으로'));
      // 이 소재에 보여 줄 영역(kvMeta.manual) — 캠페인 영역 지정과 같은 위젯, 값은 이 소재 kvMeta 사본
      const th = q('#iElKvThumb'), eff = effOf(a);
      if (th) th.onclick = () => kvIn.click();   // 썸네일 「교체」 = 이 소재 그림 바꾸기
      if (th && eff.kvMeta) mountKvFocus(th, { kvMeta: eff.kvMeta, onChange: m => { save(a, { ...(a.overrides.style ?? {}), kvMeta: withManual(structuredClone(eff.kvMeta), m) }, m ? '이 소재 보여 줄 영역' : '이 소재 영역 자동'); } });
    }
    // 채움 — 로고(원색·흰색)
    for (const [pre, k] of [['iElLogo', 'logo'], ['iElLogoLight', 'logoLight']]) {
      const inp = q(`#${pre}File`); if (!inp) continue;
      q(`#${pre}Pick`).onclick = () => inp.click();
      inp.onchange = async () => { const f = inp.files[0]; if (!f) return; await replaceLogo(a, k, await readFile(f)); };
    }
    q('#iElLogoReset')?.addEventListener('click', () => save(a, clearArtLogo(a.overrides.style), '이 소재 로고 공통으로'));
    void key;
  }

  /* ── 캔버스에 파일 끌어 놓기: 프레임 위 = 그 소재 그림 바꾸기, 빈 곳 = 모든 소재(확인) ── */
  function bindDrop(host) {
    const isFile = e => [...(e.dataTransfer?.types ?? [])].includes('Files');
    let hot = null;
    const mark = f => { if (hot === f) return; hot?.classList.remove('drop-kv'); hot = f; hot?.classList.add('drop-kv'); };
    host.addEventListener('dragover', e => { if (!isFile(e) || !D.state.campaign) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; mark(e.target.closest?.('.frame') ?? null); });
    host.addEventListener('dragleave', e => { if (!host.contains(e.relatedTarget)) mark(null); });
    host.addEventListener('drop', async e => {
      if (!isFile(e) || !D.state.campaign) return;
      e.preventDefault(); const f = [...e.dataTransfer.files].find(x => /^image\//.test(x.type)); const fr = e.target.closest?.('.frame'); mark(null);
      if (!f) { D.toast('그림 파일만 놓을 수 있어요'); return; }
      const a = fr ? D.state.campaign.artifacts.find(x => (x.key ?? x.specId) === fr.dataset.key) : null;
      if (a && a.channel === 'ad') {
        D.select(fr.dataset.key, 'kv');
        if (!D.EL.find(a, 'kv')) { D.toast('이 규격엔 키비주얼 자리가 없어요(로고만·글자만 규격)'); return; }
        await replaceKv(a, await readFile(f));
        return;
      }
      if (!confirm('모든 소재의 키비주얼을 이 그림으로 바꿀까요? (소재 하나만 바꾸려면 프레임 위에 놓으세요)')) return;
      D.campaignKvFile(f);
    });
  }

  return { boxHtml, bind, bindDrop, replaceKv, replaceLogo, ownKeys: ART_ASSET_KEYS };
}
