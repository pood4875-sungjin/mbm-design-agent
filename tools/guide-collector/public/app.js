const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (method, url, body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return r.json();
};
const prettyUrl = u => { try { return decodeURI(u); } catch { return u; } };
const fmt = iso => iso ? new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const fmtNext = iso => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:00`; };

const KIND = { size: '사이즈', width: '가로·세로', ratio: '비율', filesize: '용량', format: '포맷', limit: '최소·최대' };
const TYPE = { page: '웹페이지', crawl: '도움말 크롤링', pdf: 'PDF · OCR', notion: '노션' };
const GROUP_ORDER = ['채용포털', '디지털', '커뮤니티', 'ATS', '기타', '기타 참고'];
const PROBLEM = s => ['moved', 'blocked'].includes(s.status) || (s.status === 'error' && s.failures >= 1);
const EVENT = {
  changed: e => e.level === 'text' ? ['b-text', '문구 변경'] : ['b-spec', '규격 변경'],
  new: () => ['b-new', '새 문서'], removed: () => ['b-removed', '사라짐'],
  broken: () => ['b-broken', '수집 불가'], recovered: () => ['b-recovered', '복구됨'],
};

let S = null;
let selected = null;
let editing = null;       // 수집 설정을 고치는 중인 소스 id
let editType = null;
let testResult = null;
let onlyWithSpecs = true;
let polling = null;

async function load() {
  S = await api('GET', '/api/state');
  S.sources.forEach(labelDocs);
  if (!selected || !S.sources.find(s => s.id === selected)) selected = S.sources[0]?.id;
  render();
  if (S.job.running && !polling) polling = setInterval(load, 1500);
  if (!S.job.running && polling) { clearInterval(polling); polling = null; }
}

// 카카오 GitBook처럼 글 제목이 전부 "제작 가이드"인 곳은 주소 경로를 붙여 구분한다
function labelDocs(src) {
  const count = {};
  src.docs.forEach(d => (count[d.title] = (count[d.title] || 0) + 1));
  src.docs.forEach(d => {
    if (count[d.title] < 2) return (d.label = d.title);
    let parts = [];
    try { parts = prettyUrl(new URL(d.url).pathname).split('/').filter(p => p && !/^contents?-guide$/.test(p)); } catch {}
    d.label = `${d.title} · ${parts.slice(-2).join('/')}`;
  });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add('hidden'), 2600);
}

const extLink = (url, label = '원문', page) => url
  ? `<a class="btn sm" href="${esc(url)}${page ? '#page=' + page : ''}" target="_blank" rel="noopener" title="${esc(prettyUrl(url))}">${label}${page ? ` p.${page}` : ''} <span class="ext">↗</span></a>`
  : '';

function render() {
  renderTop();
  renderAlert();
  renderStats();
  renderSourceList();
  // 수정 폼을 입력하는 중에는 폴링으로 다시 그리지 않는다
  if (!(editing && document.activeElement?.closest?.('#editForm'))) renderDetail();
  renderSpecs();
  renderEvents();
  renderRuns();
}

function renderTop() {
  const sch = S.settings.schedule;
  $('#scheduleChip').innerHTML = sch.enabled
    ? `<span class="dot on"></span>자동 수집 <b>${sch.every === 'daily' ? '매일' : `매주 ${WEEKDAYS[sch.weekday]}`} ${String(sch.hour).padStart(2, '0')}:00</b> · 다음 ${fmtNext(S.settings.nextRun)}`
    : '<span class="dot"></span>자동 수집 <b>꺼짐</b>';
  const last = S.runs[0]?.at;
  $('#lastRun').textContent = last ? `마지막 수집 ${fmt(last)}` : '';
  $('#runAll').disabled = S.job.running;
  $('#runAll').textContent = S.job.running ? '수집 중…' : '지금 전체 수집';
  $('#progress').classList.toggle('hidden', !S.job.running);
  $('#progressText').classList.toggle('hidden', !S.job.running);
  if (S.job.running) {
    $('#progress .bar').style.width = (S.job.total ? (S.job.done / S.job.total) * 100 : 0) + '%';
    $('#progressText').textContent = `${S.job.trigger === 'auto' ? '자동 ' : ''}수집 중 ${S.job.done}/${S.job.total} · ${S.job.current}`;
  }
}

function renderAlert() {
  const bad = S.sources.filter(PROBLEM);
  $('#alert').innerHTML = bad.length ? `
    <div class="alert">
      <div class="alert-icon">!</div>
      <div>
        <b>수집 불가 ${bad.length}곳</b> — 위치가 바뀌었거나 막혔어요. 지난 정상 데이터는 그대로 두었습니다. 눌러서 수집 설정을 고칠 수 있어요.
        <div class="chips">${bad.map(s => `<span class="chip" data-fix="${s.id}">${esc(s.name)} · ${esc(s.label)}</span>`).join('')}</div>
      </div>
    </div>` : '';
}

const allSpecs = () => S.sources.flatMap(s => [
  ...s.docs.filter(d => !d.missing).flatMap(d => d.specs.map(sp => ({ ...sp, source: s, doc: d, manual: false }))),
  ...s.manualSpecs.map((sp, i) => ({ ...sp, source: s, doc: null, manual: true, index: i })),
]);

// 필수 매체는 이름 앞부분(자소설닷컴, 리멤버, 잡다, 캐치)으로 묶어서 센다
const brandOf = s => s.name.split(' · ')[0].split(' (')[0];

function renderStats() {
  const src = S.sources;
  const ok = src.filter(s => s.status === 'ok').length;
  const bad = src.filter(PROBLEM).length;
  const req = src.filter(s => s.required);
  const brands = [...new Set(req.map(brandOf))];
  const withSpecs = brands.filter(b => req.some(s => brandOf(s) === b && (s.docs.some(d => !d.missing && d.specs.length) || s.manualSpecs.length))).length;
  const changed = src.reduce((n, s) => n + s.docs.filter(d => d.changedUnseen).length, 0);
  $('#stats').innerHTML = [
    [src.length, '감시 중인 페이지'],
    [ok, '정상 수집'],
    [bad, '수집 불가', bad ? 'bad' : ''],
    [allSpecs().length, '추출된 규격'],
    [`${withSpecs}/${brands.length}`, '필수 매체 규격 확보'],
    [changed, '확인 안 한 변경', changed ? 'warn' : ''],
  ].map(([v, l, c]) => `<div class="stat ${c || ''}"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
  $('#evCount').textContent = changed || '';
}

function groupsOf(list) {
  const groups = {};
  list.forEach(s => (groups[s.group || '기타'] ||= []).push(s));
  const rank = g => { const i = GROUP_ORDER.indexOf(g); return i < 0 ? 99 : i; };
  return Object.entries(groups).sort((a, b) => rank(a[0]) - rank(b[0]));
}

function renderSourceList() {
  const q = $('#srcSearch').value.trim().toLowerCase();
  const list = S.sources.filter(s => !q || (s.name + s.group).toLowerCase().includes(q));
  $('#sourceList').innerHTML = groupsOf(list).map(([g, items]) => `
    <div class="group-title"><span>${esc(g)}</span>${items.some(s => s.required) ? '<span>필수</span>' : ''}</div>
    ${items.map(s => {
      const specs = s.docs.reduce((n, d) => n + (d.missing ? 0 : d.specs.length), 0) + s.manualSpecs.length;
      const changed = s.docs.filter(d => d.changedUnseen).length;
      return `<button class="src ${s.id === selected ? 'active' : ''}" data-id="${s.id}">
        <span class="dot ${s.status}"></span>
        <span style="min-width:0">
          <div class="name">${esc(s.name)}</div>
          <div class="meta">${PROBLEM(s) ? `<span style="color:var(--bad)">${esc(s.label)}</span>` : `규격 ${specs} · 문서 ${s.docs.filter(d => !d.missing).length}`}${changed ? ` · <span style="color:var(--warn)">변경 ${changed}</span>` : ''}</div>
        </span>
      </button>`;
    }).join('')}`).join('') || '<div class="empty">검색 결과가 없어요</div>';
}

function specChips(specs, cls = '') {
  return specs.map(s => `<span class="chip k-${s.kind} ${cls}" title="${esc(s.context)}"><span class="k">${esc(KIND[s.kind] || s.kind)}</span>${esc(s.value)}${s.page ? ` <span class="k">p.${s.page}</span>` : ''}</span>`).join('');
}

function describeMethod(s) {
  if (s.type === 'crawl') return `도움말 크롤링 · 링크 ${s.scanned ?? '-'}개 확인 → 관련 문서 ${s.docs.filter(d => !d.missing).length}개`;
  if (s.type === 'notion') return `공개 노션 API${s.subpages ? ' · 하위 페이지 포함' : ''} · 이미지 OCR`;
  if (s.type === 'pdf') return `PDF 내려받아 텍스트 + OCR${s.pdfPage ? ' · 목록 페이지에서 최신 파일 찾기' : ''}`;
  return `웹페이지${s.rendered ? ' · Chrome 렌더링' : ''}${s.trackLinks ? ' · 파일 링크 감시' : ''}`;
}

function renderDetail() {
  const s = S.sources.find(x => x.id === selected);
  if (!s) { $('#sourceDetail').innerHTML = '<div class="card empty">매체를 골라주세요</div>'; return; }
  const live = s.docs.filter(d => !d.missing);
  const docs = live.filter(d => !onlyWithSpecs || s.type !== 'crawl' || d.specs.length || d.changedUnseen)
    .sort((a, b) => (b.changedUnseen - a.changedUnseen) || (b.specs.length - a.specs.length));
  const hidden = live.length - docs.length;
  const b = s.baseline;

  $('#sourceDetail').innerHTML = `
    <div class="card card-body">
      <div class="src-head">
        <div>
          <h2>${esc(s.name)}</h2>
          <div class="badges">
            <span class="badge b-${s.status}">${esc(s.label)}</span>
            <span class="badge b-type">${TYPE[s.type] || s.type}</span>
            ${s.required ? '<span class="badge b-req">필수</span>' : ''}
            ${s.secondary ? '<span class="badge b-js">대행사 자료</span>' : ''}
            ${s.overridden ? '<span class="badge b-pending">설정 수정됨</span>' : ''}
          </div>
        </div>
        <div class="actions">
          ${extLink(s.url, '원본 열기')}
          <button class="btn sm" data-act="check" data-id="${s.id}" ${S.job.running ? 'disabled' : ''}>다시 수집</button>
          <button class="btn sm" data-act="edit" data-id="${s.id}">수집 설정 수정</button>
          ${s.custom ? `<button class="btn sm danger" data-act="remove" data-id="${s.id}">삭제</button>` : ''}
        </div>
      </div>
      <dl class="kv">
        <dt>주소</dt><dd><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(prettyUrl(s.url))}</a></dd>
        <dt>방식</dt><dd>${describeMethod(s)}</dd>
        <dt>마지막 수집</dt><dd>${fmt(s.lastCheck)}${s.httpStatus ? ` · HTTP ${s.httpStatus}` : ''}${s.error ? ` · ${esc(s.error)}` : ''}</dd>
        <dt>마지막 정상</dt><dd>${fmt(s.lastGood)}${s.failures ? ` · <span style="color:var(--bad)">연속 실패 ${s.failures}회</span>` : ''}</dd>
        ${b ? `<dt>정상 기준</dt><dd>문서 ${b.docs ?? '-'} · 링크 ${b.links ?? '-'} · 규격 ${b.specs ?? '-'} <span class="faint">(갑자기 0이 되면 위치 변경으로 봅니다)</span></dd>` : ''}
      </dl>
      ${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}
      ${PROBLEM(s) ? `<div class="warnbox"><span><b>${esc(s.label)}</b> — 아래 데이터는 지난번 정상 수집분입니다. 주소나 링크 규칙을 고쳐 다시 수집하세요.${s.suggest?.length ? ` 새 주소 후보 ${s.suggest.length}개를 찾았어요.` : ''}</span><button class="btn sm primary" data-act="edit" data-id="${s.id}">수집 설정 수정</button></div>` : ''}
    </div>

    ${editing === s.id ? renderEdit(s) : ''}

    <div class="card">
      <div class="card-head"><h3>직접 등록한 규격</h3><span class="sub">공개 가이드가 없으면 담당자에게 받은 규격을 적어두세요</span></div>
      <div class="card-body">
        <div class="chips" style="margin-top:0">${s.manualSpecs.map((m, i) => `<span class="chip k-${m.kind}" title="${esc(m.context)}"><span class="k">${esc(KIND[m.kind] || m.kind)}</span>${esc(m.value)}${m.context ? ` <span class="k">${esc(m.context)}</span>` : ''} <a href="#" data-act="delManual" data-i="${i}" title="삭제">×</a></span>`).join('') || '<span class="faint" style="font-size:13px">없음</span>'}</div>
        <form class="inline-form" id="manualForm">
          <select name="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
          <input name="value" placeholder="예: 1080×1080" required>
          <input name="context" placeholder="소재명 / 메모 (예: 메인 배너)">
          <button class="btn">등록</button>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>수집된 문서 ${docs.length}개</h3>
        ${s.type === 'crawl' ? `<label class="check"><input type="checkbox" id="onlySpecs" ${onlyWithSpecs ? 'checked' : ''}> 규격 있는 문서만${hidden ? ` (${hidden}개 숨김)` : ''}</label>` : ''}
      </div>
      ${docs.map(d => `
        <div class="doc">
          <div class="doc-main" data-key="${esc(d.key)}">
            <div class="doc-title">${esc(d.label)} ${d.changedUnseen ? `<span class="badge ${d.changeLevel === 'text' ? 'b-text' : 'b-spec'}">${d.changeLevel === 'text' ? '문구 변경' : '규격 변경'}</span>` : ''}</div>
            <div class="doc-meta">${d.pageDate ? `페이지 수정일 ${d.pageDate} · ` : ''}처음 수집 ${fmt(d.firstSeen)} · 마지막 변경 ${fmt(d.lastChanged)} · 버전 ${d.versions}</div>
            <div class="chips">${specChips(d.specs) || '<span class="faint" style="font-size:12px">추출된 규격 없음</span>'}</div>
          </div>
          <div class="doc-actions">${extLink(d.url, d.kind === 'pdf' ? 'PDF' : '원문')}</div>
        </div>`).join('') || `<div class="empty">${s.lastCheck ? '수집된 문서가 없습니다' : '아직 수집하지 않았습니다'}</div>`}
    </div>`;
}

// ---------- 수집 설정 수정 ----------

const FIELD_HELP = {
  url: ['주소', '가이드가 있는 페이지, PDF, 노션 주소'],
  match: ['글 링크 규칙', '목록 페이지에서 글 주소를 찾는 정규식'],
  follow: ['중간 목록 규칙', '(선택) 카테고리 페이지를 한 번 더 따라갈 때'],
  seeds: ['직접 훑을 주소', '(선택) 한 줄에 하나. {1..60}처럼 번호 범위 가능'],
  keywords: ['저장할 글 키워드', '이 정규식이 본문에 있는 글만 저장'],
  maxPages: ['최대 글 수', ''],
  trackLinks: ['감시할 파일 링크', '(선택) 이 정규식에 맞는 링크 목록도 감시 (소개서 PDF 등)'],
  pdfPage: ['PDF 목록 페이지', '(선택) 파일명에 버전이 붙으면, 이 페이지에서 최신 PDF를 찾음'],
  pdfMatch: ['PDF 링크 규칙', '목록 페이지에서 PDF를 찾는 정규식'],
  ignore: ['비교 제외 줄', '(선택) 매번 바뀌는 문구를 변경 비교에서 뺄 정규식'],
};
const FIELDS_BY_TYPE = {
  page: ['url', 'trackLinks', 'ignore'],
  crawl: ['url', 'match', 'follow', 'seeds', 'keywords', 'maxPages', 'ignore'],
  pdf: ['url', 'pdfPage', 'pdfMatch'],
  notion: ['url'],
};

function renderEdit(s) {
  const type = editType || s.type;
  const val = k => k === 'seeds' ? (s.seeds || []).join('\n') : (s[k] ?? '');
  return `
    <div class="card">
      <div class="card-head"><h3>수집 설정 수정</h3><span class="sub">테스트로 먼저 확인하고 저장하세요. 저장하면 바로 다시 수집합니다.</span></div>
      <div class="card-body">
        <form id="editForm" class="edit-grid">
          <label>수집 방식</label>
          <select name="type">${Object.entries(TYPE).map(([k, v]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${v}</option>`).join('')}</select>
          ${FIELDS_BY_TYPE[type].map(k => `
            <label>${FIELD_HELP[k][0]}</label>
            ${k === 'seeds' ? `<textarea name="seeds" rows="2">${esc(val(k))}</textarea>` : `<input name="${k}" value="${esc(val(k))}" ${k === 'url' ? 'required' : ''} class="${k === 'url' ? '' : 'mono'}">`}
            ${FIELD_HELP[k][1] ? `<div class="hint">${FIELD_HELP[k][1]}</div>` : ''}`).join('')}
          ${['page', 'crawl'].includes(type) ? `
            <label>렌더링</label>
            <select name="render">
              <option value="" ${!s.render ? 'selected' : ''}>자동 (막히면 Chrome)</option>
              <option value="chrome" ${s.render === 'chrome' ? 'selected' : ''}>항상 Chrome</option>
              <option value="none" ${s.render === 'none' ? 'selected' : ''}>Chrome 안 씀</option>
            </select>` : ''}
          ${type === 'notion' ? `<label>하위 페이지</label><label class="check"><input type="checkbox" name="subpages" ${s.subpages ? 'checked' : ''}> 하위 페이지도 함께 수집</label>` : ''}
        </form>
        ${s.suggest?.length ? `<div class="note"><b>새 주소 후보</b> — 없어진 페이지가 알려준 비슷한 주소예요. 누르면 주소 칸에 넣습니다.<div class="chips">${s.suggest.map(u => `<a href="#" class="chip" data-suggest="${esc(u)}">${esc(prettyUrl(u))}</a>`).join('')}</div></div>` : ''}
        ${s.overridden && s.original?.url && s.original.url !== s.url ? `<div class="note">원래 주소: ${esc(prettyUrl(s.original.url))}</div>` : ''}
        <div class="edit-actions">
          <button class="btn" data-act="test" data-id="${s.id}">테스트 (저장 안 함)</button>
          <button class="btn primary" data-act="saveEdit" data-id="${s.id}">저장하고 다시 수집</button>
          ${s.overridden ? `<button class="btn" data-act="resetEdit" data-id="${s.id}">기본값으로 되돌리기</button>` : ''}
          <button class="btn ghost" data-act="closeEdit">닫기</button>
        </div>
        <div id="testResult">${renderTest()}</div>
      </div>
    </div>`;
}

function renderTest() {
  if (!testResult) return '';
  if (testResult.loading) return '<div class="test-result muted">테스트 수집 중… (OCR이 있으면 1분 정도 걸릴 수 있어요)</div>';
  const t = testResult;
  if (t.error && !t.status) return `<div class="test-result" style="color:var(--bad)">${esc(t.error)}</div>`;
  const m = t.metrics || {};
  return `<div class="test-result">
    <div class="badges"><span class="badge b-${t.status}">${esc(t.label)}</span>${t.httpStatus ? `<span class="badge">HTTP ${t.httpStatus}</span>` : ''}
      <span class="muted">문서 ${m.docs ?? '-'} · 링크 ${m.links ?? '-'} · 규격 ${t.specCount}${t.baseline ? ` <span class="faint">(지난 정상: 문서 ${t.baseline.docs ?? '-'} · 링크 ${t.baseline.links ?? '-'} · 규격 ${t.baseline.specs ?? '-'})</span>` : ''}</span></div>
    ${(t.docs || []).map(d => `<div style="margin-top:10px"><div style="display:flex;gap:6px;align-items:center;justify-content:space-between"><b style="font-size:13px">${esc(d.title)}</b>${extLink(d.url)}</div><div class="chips">${specChips(d.specs) || '<span class="faint" style="font-size:12px">규격 없음</span>'}</div></div>`).join('')}
  </div>`;
}

function readEditForm() {
  const out = {};
  for (const el of $('#editForm').elements) {
    if (!el.name) continue;
    out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return out;
}

// ---------- 규격 모아보기 ----------

function filteredSpecs() {
  const g = $('#fGroup').value, k = $('#fKind').value, t = $('#fText').value.trim().toLowerCase();
  const req = $('#fRequired').checked, official = $('#fOfficial').checked;
  return allSpecs().filter(x =>
    (!g || x.source.group === g) && (!k || x.kind === k) && (!req || x.source.required) && (!official || !x.source.secondary) &&
    (!t || [x.value, x.context, x.source.name, x.doc?.title].join(' ').toLowerCase().includes(t)));
}

function renderSpecs() {
  const groups = groupsOf(S.sources).map(([g]) => g);
  const fg = $('#fGroup');
  if (fg.options.length - 1 !== groups.length) fg.innerHTML = '<option value="">모든 분류</option>' + groups.map(g => `<option>${esc(g)}</option>`).join('');
  const rows = filteredSpecs();
  $('#specTable').innerHTML = `
    <thead><tr><th>분류</th><th>매체</th><th>문서</th><th>항목</th><th>값</th><th>원문 내용</th><th>출처</th></tr></thead>
    <tbody>${rows.map(x => `<tr>
      <td class="nowrap">${esc(x.source.group)}</td>
      <td>${esc(x.source.name)}${x.source.required ? ' <span class="badge b-req">필수</span>' : ''}${x.source.secondary ? ' <span class="badge b-js">대행사</span>' : ''}</td>
      <td>${x.manual ? '<span class="badge">직접 등록</span>' : `<a href="#" data-key="${esc(x.doc.key)}" class="doc-link">${esc(x.doc.label)}</a>`}</td>
      <td class="nowrap">${esc(KIND[x.kind] || x.kind)}</td>
      <td class="val">${esc(x.value)}</td>
      <td class="ctx">${esc(x.context)}</td>
      <td class="nowrap">${x.manual ? '' : extLink(x.doc.url, x.doc.kind === 'pdf' ? 'PDF' : '원문', x.page)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">조건에 맞는 규격이 없습니다</td></tr>'}</tbody>`;
}

// ---------- 변경 이력 / 수집 기록 ----------

function renderEvents() {
  $('#eventList').innerHTML = S.events.map(e => {
    const [cls, text] = (EVENT[e.type] || (() => ['', e.type]))(e);
    const key = e.key || e.url;
    const known = S.sources.some(s => s.docs.some(d => d.key === key));
    return `<div class="card event">
      <div class="head">
        <span class="badge ${cls}">${text}</span>
        <b>${esc(e.sourceName)}</b>
        ${known && !['broken', 'recovered'].includes(e.type) ? `<a href="#" class="doc-link" data-key="${esc(key)}">${esc(e.title)}</a>` : `<span class="muted">${esc(e.reason || e.title)}</span>`}
        <span class="when">${fmt(e.at)}</span>
      </div>
      ${e.added?.length || e.removed?.length ? `<div class="chips">${specChips(e.added, 'added')}${specChips(e.removed, 'removed')}</div>` : ''}
      <div class="ev-actions">
        ${e.from ? `<button class="btn sm" data-act="eventDiff" data-key="${esc(key)}" data-from="${e.from}" data-to="${e.to}">본문 비교</button>` : ''}
        ${['broken', 'recovered'].includes(e.type) ? `<button class="btn sm" data-fix="${e.sourceId}">매체 보기</button>` : ''}
        ${extLink(e.url)}
      </div>
    </div>`;
  }).join('') || '<div class="card empty">아직 감지된 변경이 없습니다. 첫 수집은 기준을 잡는 단계예요. 문서를 열어 "변경 시뮬레이션"으로 감지 흐름을 시험해볼 수 있습니다.</div>';
}

function renderRuns() {
  $('#runTable').innerHTML = `
    <thead><tr><th>시각</th><th>방식</th><th>소요</th><th>대상</th><th>변경</th><th>수집 불가</th></tr></thead>
    <tbody>${S.runs.map(r => `<tr>
      <td class="nowrap">${fmt(r.at)}</td>
      <td><span class="badge ${r.trigger === 'auto' ? 'b-type' : ''}">${r.trigger === 'auto' ? '자동' : '수동'}</span></td>
      <td>${Math.round(r.ms / 1000)}초</td>
      <td>${r.sources}곳</td>
      <td>${r.changed ? `<b style="color:var(--warn)">${r.changed}</b>` : 0}</td>
      <td>${r.broken ? `<b style="color:var(--bad)">${r.broken}</b>` : 0}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">아직 수집 기록이 없어요</td></tr>'}</tbody>`;
}

// ---------- 모달 ----------

function openModal(html, narrow = false) {
  $('#modalBody').className = 'modal-body' + (narrow ? ' narrow' : '');
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
const closeModal = () => $('#modal').classList.add('hidden');

async function openDoc(key, from, to) {
  const d = await api('GET', '/api/doc?key=' + encodeURIComponent(key));
  if (d.error) return toast('문서를 찾을 수 없어요');
  const hist = d.history;
  to ||= hist[hist.length - 1].hash;
  from ||= hist.length > 1 ? hist[hist.length - 2].hash : null;
  openModal(`
    <div class="modal-head">
      <div style="min-width:0"><h2>${esc(d.title)}</h2><div class="muted" style="font-size:12px;word-break:break-all">${esc(prettyUrl(d.url))}</div></div>
      <div class="actions">${extLink(d.url, d.kind === 'pdf' ? 'PDF 열기' : '원문 열기')}<button class="btn ghost sm" data-act="close">닫기</button></div>
    </div>
    <div class="modal-content">
      <h4 style="margin-top:0">추출된 규격 ${d.specs.length}개</h4>
      ${d.specs.length ? `<div class="card table-wrap"><table><thead><tr><th>항목</th><th>값</th><th>원문 내용</th><th>출처</th></tr></thead><tbody>
        ${d.specs.map(s => `<tr><td class="nowrap">${esc(KIND[s.kind])}</td><td class="val">${esc(s.value)}</td><td class="ctx">${esc(s.context)}</td><td class="nowrap">${extLink(d.url, d.kind === 'pdf' ? 'PDF' : '원문', s.page)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="faint" style="font-size:13px">없음</div>'}
      <h4>버전 이력</h4>
      <div class="versions">${hist.map((h, i) => `<span class="chip">${i + 1}. ${fmt(h.at)} · 규격 ${h.specCount}${h.simulated ? ' (시뮬레이션)' : ''}</span>`).join('')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">
        <button class="btn sm" data-act="simulate" data-key="${esc(key)}">변경 시뮬레이션</button>
        <span class="faint" style="font-size:12px">저장된 기준본의 숫자를 일부러 바꿔둡니다. 다시 수집하면 실제 페이지와 달라서 변경으로 잡혀요.</span>
      </div>
      <h4>${from ? '이전 버전과 비교' : '수집된 본문'}</h4>
      <div id="docBody" class="${from ? 'diff' : 'text'}">불러오는 중…</div>
    </div>`);
  if (d.changedUnseen) { await api('POST', '/api/seen', { key }); load(); }
  if (from) {
    const { ops } = await api('GET', `/api/diff?from=${from}&to=${to}`);
    $('#docBody').innerHTML = renderDiff(ops);
  } else {
    $('#docBody').textContent = d.lines.join('\n');
  }
}

// 바뀐 줄 앞뒤 2줄만 보여주고 나머지는 접는다
function renderDiff(ops) {
  if (!ops.some(o => o.op !== 'same')) return '<span class="same">차이 없음</span>';
  const keep = ops.map((o, i) => o.op !== 'same' || ops.slice(Math.max(0, i - 2), i + 3).some(x => x.op !== 'same'));
  let out = '', skipped = 0;
  ops.forEach((o, i) => {
    if (!keep[i]) { skipped++; return; }
    if (skipped) { out += `<span class="gap">… ${skipped}줄 같음 …</span>`; skipped = 0; }
    out += `<span class="${o.op}">${o.op === 'add' ? '+ ' : o.op === 'del' ? '- ' : '  '}${esc(o.line)}</span>`;
  });
  if (skipped) out += `<span class="gap">… ${skipped}줄 같음 …</span>`;
  return out;
}

const schedule = { draft: null };
function drawSchedule() {
  const sch = schedule.draft;
  openModal(`
    <div class="modal-head"><h2>자동 수집</h2><button class="btn ghost sm" data-act="close">닫기</button></div>
    <div class="modal-content">
      <div class="form" style="max-width:none">
        <label>자동 수집<div class="seg"><button data-sch="enabled" data-v="1" class="${sch.enabled ? 'on' : ''}">켜기</button><button data-sch="enabled" data-v="0" class="${!sch.enabled ? 'on' : ''}">끄기</button></div></label>
        <label>주기<div class="seg"><button data-sch="every" data-v="weekly" class="${sch.every === 'weekly' ? 'on' : ''}">매주</button><button data-sch="every" data-v="daily" class="${sch.every === 'daily' ? 'on' : ''}">매일</button></div></label>
        ${sch.every === 'weekly' ? `<label>요일<select id="schWeekday">${WEEKDAYS.map((w, i) => `<option value="${i}" ${i === +sch.weekday ? 'selected' : ''}>${w}요일</option>`).join('')}</select></label>` : ''}
        <label>시각<select id="schHour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === +sch.hour ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></label>
        <div class="note" style="margin:0">이 서버가 켜져 있을 때 실행돼요. 꺼져 있다가 다시 켜지면 놓친 수집을 바로 따라잡습니다. 맥에 로그인할 때 서버가 자동으로 켜지게 하려면 터미널에서 <span class="mono">npm run agent:install</span>을 실행하세요.</div>
        <div><button class="btn primary" data-act="saveSchedule">저장</button></div>
      </div>
    </div>`, true);
}
const readScheduleSelects = () => {
  if ($('#schWeekday')) schedule.draft.weekday = +$('#schWeekday').value;
  if ($('#schHour')) schedule.draft.hour = +$('#schHour').value;
};

// ---------- 내보내기 ----------

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}
const specUrl = x => x.doc ? x.doc.url + (x.page ? '#page=' + x.page : '') : '';
$('#exportCsv').onclick = () => {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = filteredSpecs().map(x => [x.source.group, x.source.name, x.source.required ? 'Y' : '', x.source.secondary ? '대행사' : '공식', x.manual ? '직접 등록' : x.doc.label, specUrl(x), KIND[x.kind], x.value, x.context].map(q).join(','));
  download('design-specs.csv', '﻿분류,매체,필수,자료,문서,출처 URL,항목,값,원문\n' + rows.join('\n'), 'text/csv');
};
$('#exportJson').onclick = () => {
  const rows = filteredSpecs().map(x => ({ group: x.source.group, source: x.source.name, required: !!x.source.required, official: !x.source.secondary, doc: x.doc?.label || null, url: specUrl(x) || null, kind: x.kind, value: x.value, context: x.context }));
  download('design-specs.json', JSON.stringify(rows, null, 2), 'application/json');
};

// ---------- 이벤트 ----------

function showTab(name) {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-' + name));
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
['#fGroup', '#fKind', '#fText', '#fRequired', '#fOfficial'].forEach(id => $(id).addEventListener('input', renderSpecs));
$('#srcSearch').addEventListener('input', renderSourceList);
$('#runAll').onclick = async () => { await api('POST', '/api/check', {}); toast('전체 수집을 시작했어요'); load(); };
$('#scheduleChip').onclick = () => { schedule.draft = { ...S.settings.schedule }; drawSchedule(); };

function openFix(id) {
  selected = id; editing = id; editType = null; testResult = null;
  showTab('sources');
  renderSourceList(); renderDetail();
  $('#editForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('click', async e => {
  const sug = e.target.closest('[data-suggest]');
  if (sug) { e.preventDefault(); const i = $('#editForm input[name=url]'); if (i) { i.value = sug.dataset.suggest; i.focus(); } return; }
  const fix = e.target.closest('[data-fix]');
  if (fix) return openFix(fix.dataset.fix);
  const sch = e.target.closest('[data-sch]');
  if (sch) {
    e.preventDefault();
    readScheduleSelects();
    schedule.draft[sch.dataset.sch] = sch.dataset.sch === 'enabled' ? sch.dataset.v === '1' : sch.dataset.v;
    return drawSchedule();
  }
  const src = e.target.closest('.src');
  if (src) { selected = src.dataset.id; if (editing !== selected) { editing = null; testResult = null; } renderSourceList(); renderDetail(); return; }
  const link = e.target.closest('.doc-link');
  if (link) { e.preventDefault(); return openDoc(link.dataset.key); }
  if (!e.target.closest('a') && e.target.closest('.doc-main')) return openDoc(e.target.closest('.doc-main').dataset.key);

  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'close') closeModal();
  if (act === 'check') { await api('POST', '/api/check', { ids: [t.dataset.id] }); toast('다시 수집을 시작했어요'); load(); }
  if (act === 'remove' && confirm('이 소스를 삭제할까요?')) { await api('DELETE', '/api/sources?id=' + t.dataset.id); load(); }
  if (act === 'delManual') { e.preventDefault(); await api('DELETE', `/api/manual?sourceId=${selected}&index=${t.dataset.i}`); load(); }
  if (act === 'eventDiff') openDoc(t.dataset.key, t.dataset.from, t.dataset.to);
  if (act === 'edit') { editing = t.dataset.id; editType = null; testResult = null; renderDetail(); $('#editForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  if (act === 'closeEdit') { editing = null; testResult = null; renderDetail(); }
  if (act === 'test') {
    const fields = readEditForm();
    testResult = { loading: true }; $('#testResult').innerHTML = renderTest();
    testResult = await api('POST', '/api/sources/test', { id: t.dataset.id, fields });
    $('#testResult').innerHTML = renderTest();
  }
  if (act === 'saveEdit') {
    const r = await api('POST', '/api/sources/override', { id: t.dataset.id, fields: readEditForm() });
    if (r.error) return toast(r.error);
    editing = null; testResult = null; toast('저장했어요. 다시 수집 중입니다'); load();
  }
  if (act === 'resetEdit' && confirm('원래 설정으로 되돌릴까요?')) {
    await api('DELETE', '/api/sources/override?id=' + t.dataset.id);
    editing = null; testResult = null; toast('기본값으로 되돌리고 다시 수집 중입니다'); load();
  }
  if (act === 'simulate') {
    await api('POST', '/api/simulate', { key: t.dataset.key });
    closeModal(); toast('기준본을 바꿔뒀어요. 이 매체를 다시 수집하면 변경으로 잡혀요'); load();
  }
  if (act === 'saveSchedule') {
    readScheduleSelects();
    await api('POST', '/api/schedule', schedule.draft);
    closeModal(); toast('자동 수집 설정을 저장했어요'); load();
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'onlySpecs') { onlyWithSpecs = e.target.checked; renderDetail(); }
  if (e.target.name === 'type' && e.target.closest('#editForm')) { editType = e.target.value; renderDetail(); }
});

document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (e.target.id === 'manualForm') {
    await api('POST', '/api/manual', { sourceId: selected, kind: f.get('kind'), value: f.get('value'), context: f.get('context') });
    load();
  }
  if (e.target.id === 'addForm') {
    const r = await api('POST', '/api/sources', Object.fromEntries(f));
    $('#addMsg').textContent = r.error || '추가했어요. 수집이 끝나면 매체 탭에 나타납니다.';
    if (!r.error) { selected = r.id; e.target.reset(); }
    load();
  }
});

$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

load();
