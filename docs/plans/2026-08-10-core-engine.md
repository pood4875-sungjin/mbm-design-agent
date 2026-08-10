# MBM Design Generator — 서브플랜 #1: 코어 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campaign Context(정보) + Campaign Style(표현) → 채널 렌더러 계약 → 배너 산출물 HTML 생성·파일 저장까지 도는 최소 엔진.

**Architecture:** PRD §7~8 그대로 — Context/Style 분리, 모든 렌더러는 `(context, style, spec) → html` 동일 계약, HTML 단일 소스. onsite-web-generator에서 개념만 선별 이식(코드 복사 없음, 통째 포크 금지).

**Tech Stack:** 바닐라 JS(ESM), Node 18+ 내장 `node --test`, 빌드 도구 없음, 파일 기반 저장(JSON). PRD 열린 질문 4·5는 기본 가정 채택: 로컬 파일 + 이후 로컬 웹앱.

**저장 위치 관례:** 엔진 = `core/`, 렌더러 = `core/renderers/`, 테스트 = `test/`, 데모 산출물 = `out/` (git 제외).

---

### Task 1: 프로젝트 골격

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `test/smoke.test.js`

- [ ] **Step 1: git 초기화 + 골격 파일 작성**

```bash
cd ~/mbm-design-agent && git init
```

`package.json`:
```json
{
  "name": "mbm-design-agent",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test test/"
  }
}
```

`.gitignore`:
```
out/
node_modules/
.DS_Store
```

- [ ] **Step 2: 스모크 테스트 작성**

`test/smoke.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: 테스트 실행 확인**

Run: `cd ~/mbm-design-agent && npm test`
Expected: `# pass 1`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold project with node test runner"
```

---

### Task 2: Campaign Context 스키마

**Files:**
- Create: `core/context.js`
- Test: `test/context.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/context.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContext, missingFields, updateContext, CORE_FIELDS } from '../core/context.js';

test('createContext fills core fields and version', () => {
  const ctx = createContext({ name: '2026 ONSITE MBM 서울' });
  assert.equal(ctx.core.name, '2026 ONSITE MBM 서울');
  assert.equal(ctx.core.date, null);
  assert.equal(ctx.version, 1);
});

test('missingFields lists empty core fields', () => {
  const ctx = createContext({ name: 'MBM', date: '2026-10-15' });
  const missing = missingFields(ctx, []);
  assert.deepEqual(missing.map(m => m.field).sort(), ['audience', 'cta', 'venue']);
});

test('missingFields includes channel fields for selected channels only', () => {
  const ctx = createContext({ name: 'MBM', date: 'd', venue: 'v', audience: 'a', cta: 'c' });
  const missing = missingFields(ctx, ['edm']);
  assert.deepEqual(missing, [
    { channel: 'edm', field: 'senderName' },
    { channel: 'edm', field: 'subject' },
  ]);
});

test('updateContext patches core and bumps version', () => {
  const ctx = createContext({ name: 'MBM' });
  const next = updateContext(ctx, { core: { venue: '킨텍스' } });
  assert.equal(next.core.venue, '킨텍스');
  assert.equal(next.core.name, 'MBM');
  assert.equal(next.version, 2);
});

test('CORE_FIELDS is the contract', () => {
  assert.deepEqual(CORE_FIELDS, ['name', 'date', 'venue', 'audience', 'cta']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../core/context.js'`

- [ ] **Step 3: 구현**

`core/context.js`:
```js
// Campaign Context — 정보는 시스템 소유 (PRD 불변식 1)
// 빈칸은 추측하지 않는다: missingFields()가 되물을 목록을 만든다 (불변식 3)

export const CORE_FIELDS = ['name', 'date', 'venue', 'audience', 'cta'];

export const CHANNEL_FIELDS = {
  edm: ['senderName', 'subject'],
  landing: ['formFields'],
  banner: [],
  poster: ['printSize'],
  xbanner: ['printSize'],
  hyunsumak: ['printSize'],
};

export function createContext(partial = {}) {
  const core = {};
  for (const f of CORE_FIELDS) core[f] = partial[f] ?? null;
  return { core, channelFields: {}, version: 1 };
}

export function missingFields(ctx, selectedChannels = []) {
  const missing = [];
  for (const f of CORE_FIELDS) {
    if (ctx.core[f] == null || ctx.core[f] === '') missing.push({ field: f });
  }
  for (const ch of selectedChannels) {
    for (const f of CHANNEL_FIELDS[ch] ?? []) {
      const v = ctx.channelFields[ch]?.[f];
      if (v == null || v === '') missing.push({ channel: ch, field: f });
    }
  }
  return missing;
}

export function updateContext(ctx, patch = {}) {
  return {
    core: { ...ctx.core, ...(patch.core ?? {}) },
    channelFields: mergeChannelFields(ctx.channelFields, patch.channelFields),
    version: ctx.version + 1,
  };
}

function mergeChannelFields(base, patch = {}) {
  const out = { ...base };
  for (const [ch, fields] of Object.entries(patch)) {
    out[ch] = { ...(out[ch] ?? {}), ...fields };
  }
  return out;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS (context 5건 + smoke 1건)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: campaign context schema with missing-field detection"
```

---

### Task 3: Campaign Style 정규화

**Files:**
- Create: `core/style.js`
- Test: `test/style.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/style.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle } from '../core/style.js';

test('normalizeStyle produces the standard structure from designer input', () => {
  const s = normalizeStyle({
    keyVisual: 'assets/kv.png',
    colors: ['#0A3D91', '#F5F7FA'],
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    logo: 'assets/logo.svg',
    mood: ['테크', '신뢰'],
  });
  assert.equal(s.keyVisual, 'assets/kv.png');
  assert.deepEqual(s.palette, { primary: '#0A3D91', bg: '#F5F7FA', ink: '#1A1A1A' });
  assert.equal(s.fonts.heading, 'Pretendard');
  assert.deepEqual(s.mood, ['테크', '신뢰']);
});

test('normalizeStyle applies defaults for omitted fields', () => {
  const s = normalizeStyle({ colors: ['#FF5500'] });
  assert.equal(s.keyVisual, null);
  assert.equal(s.palette.primary, '#FF5500');
  assert.equal(s.palette.bg, '#FFFFFF');
  assert.equal(s.fonts.heading, 'Pretendard');
});

test('normalizeStyle rejects invalid hex colors', () => {
  assert.throws(() => normalizeStyle({ colors: ['blue'] }), /hex/i);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../core/style.js'`

- [ ] **Step 3: 구현**

`core/style.js`:
```js
// Campaign Style — 3경로(업로드·프리셋·AI 생성 추후) 어디서 와도 이 구조 하나로 정규화 (PRD 불변식 2)

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function normalizeStyle(input = {}) {
  const colors = input.colors ?? [];
  for (const c of colors) {
    if (!HEX.test(c)) throw new Error(`hex 컬러 형식이 아님: ${c}`);
  }
  return {
    keyVisual: input.keyVisual ?? null,
    palette: {
      primary: colors[0] ?? '#2456D6',
      bg: colors[1] ?? '#FFFFFF',
      ink: colors[2] ?? '#1A1A1A',
    },
    fonts: {
      heading: input.fonts?.heading ?? 'Pretendard',
      body: input.fonts?.body ?? 'Pretendard',
    },
    logo: input.logo ?? null,
    mood: input.mood ?? [],
    presetId: input.presetId ?? null,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: campaign style normalization with palette defaults"
```

---

### Task 4: 채널 스펙 + 렌더러 계약

**Files:**
- Create: `core/contract.js`
- Test: `test/contract.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/contract.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECS, renderArtifact, registerRenderer, _clearRenderers } from '../core/contract.js';

test('SPECS defines pilot banner sizes', () => {
  assert.equal(SPECS['banner-300x250'].w, 300);
  assert.equal(SPECS['banner-300x250'].h, 250);
  assert.equal(SPECS['banner-300x250'].channel, 'banner');
  assert.equal(SPECS['banner-728x90'].channel, 'banner');
});

test('renderArtifact routes spec to its channel renderer', () => {
  _clearRenderers();
  registerRenderer('banner', (ctx, style, spec) => `<div>${ctx.core.name}/${spec.w}</div>`);
  const html = renderArtifact('banner-300x250',
    { core: { name: 'MBM' } },
    {},
  );
  assert.equal(html, '<div>MBM/300</div>');
});

test('renderArtifact throws on unknown spec or missing renderer', () => {
  _clearRenderers();
  assert.throws(() => renderArtifact('nope', {}, {}), /스펙/);
  assert.throws(() => renderArtifact('banner-300x250', {}, {}), /렌더러/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../core/contract.js'`

- [ ] **Step 3: 구현**

`core/contract.js`:
```js
// 채널 렌더러 계약 (PRD §8-2): 모든 렌더러는 (context, style, spec) → html 문자열.
// 채널 추가 = registerRenderer 1회. 규격 추가 = SPECS 1줄.
// ⚠ 규격 수치는 파일럿 가정값 — PRD §9 "확정 필요" 해소 시 갱신.

export const SPECS = {
  'banner-300x250': { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image' },
  'banner-728x90':  { channel: 'banner', w: 728, h: 90,  unit: 'px', output: 'image' },
  'banner-160x600': { channel: 'banner', w: 160, h: 600, unit: 'px', output: 'image' },
};

const renderers = new Map();

export function registerRenderer(channel, fn) {
  renderers.set(channel, fn);
}

export function renderArtifact(specId, context, style) {
  const spec = SPECS[specId];
  if (!spec) throw new Error(`알 수 없는 스펙: ${specId}`);
  const fn = renderers.get(spec.channel);
  if (!fn) throw new Error(`렌더러 없음: ${spec.channel}`);
  return fn(context, style, spec);
}

export function _clearRenderers() {
  renderers.clear();
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: channel specs and renderer contract"
```

---

### Task 5: 배너 렌더러

**Files:**
- Create: `core/renderers/banner.js`
- Test: `test/banner.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/banner.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBanner } from '../core/renderers/banner.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });
const spec = { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image' };

test('renderBanner emits fixed-size self-contained html', () => {
  const html = renderBanner(ctx, style, spec);
  assert.match(html, /width:300px/);
  assert.match(html, /height:250px/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /사전등록/);
  assert.match(html, /#0A3D91/);
  assert.doesNotMatch(html, /http/, '외부 의존 금지 — 자기완결');
});

test('renderBanner uses key visual as background when present', () => {
  const withKv = normalizeStyle({ keyVisual: 'kv.png', colors: ['#0A3D91'] });
  assert.match(renderBanner(ctx, withKv, spec), /kv\.png/);
});

test('renderBanner escapes html in context values', () => {
  const bad = createContext({ name: '<script>x</script>', date: 'd', venue: 'v', audience: 'a', cta: 'c' });
  assert.doesNotMatch(renderBanner(bad, style, spec), /<script>/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../core/renderers/banner.js'`

- [ ] **Step 3: 구현**

`core/renderers/banner.js`:
```js
// 배너 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
// 키비주얼은 cover 크롭(안전 크롭), 없으면 색면 배경 (PRD F5 비율 대응 규칙).

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function renderBanner(ctx, style, spec) {
  const { name, date, venue, cta } = ctx.core;
  const p = style.palette;
  const bg = style.keyVisual
    ? `background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat`
    : `background:${p.primary}`;
  const compact = spec.h < 120;
  return `<div style="position:relative;width:${spec.w}px;height:${spec.h}px;${bg};overflow:hidden;font-family:'${esc(style.fonts.heading)}',sans-serif;color:#fff;display:flex;flex-direction:${compact ? 'row' : 'column'};align-items:${compact ? 'center' : 'flex-start'};justify-content:space-between;padding:${compact ? '0 16px' : '18px'};box-sizing:border-box">
  <div>
    <div style="font-size:${compact ? 15 : 18}px;font-weight:700;line-height:1.3">${esc(name)}</div>
    <div style="font-size:11px;opacity:.85;margin-top:4px">${esc(date)} · ${esc(venue)}</div>
  </div>
  <div style="background:#fff;color:${p.primary};font-size:12px;font-weight:700;padding:8px 14px;border-radius:6px;white-space:nowrap">${esc(cta)}</div>
</div>`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: banner renderer with cover-crop key visual and color-field fallback"
```

---

### Task 6: 캠페인 저장/로드

**Files:**
- Create: `core/campaign.js`
- Test: `test/campaign.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/campaign.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCampaign, saveCampaign, loadCampaign } from '../core/campaign.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

test('campaign round-trips through disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mbm-'));
  const c = createCampaign({
    id: 'mbm-2026-seoul',
    context: createContext({ name: 'MBM 서울' }),
    style: normalizeStyle({ colors: ['#0A3D91'] }),
    channels: ['banner'],
  });
  saveCampaign(dir, c);
  const loaded = loadCampaign(dir, 'mbm-2026-seoul');
  assert.deepEqual(loaded, c);
});

test('createCampaign starts with empty artifacts and log', () => {
  const c = createCampaign({ id: 'x', context: createContext({}), style: normalizeStyle({}), channels: [] });
  assert.deepEqual(c.artifacts, []);
  assert.deepEqual(c.log, []);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../core/campaign.js'`

- [ ] **Step 3: 구현**

`core/campaign.js`:
```js
// 캠페인 저장 = 폴더 1개 + campaign.json (자기완결·파일 기반, PRD §10)

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function createCampaign({ id, context, style, channels }) {
  return { id, context, style, channels, artifacts: [], log: [] };
}

export function saveCampaign(baseDir, campaign) {
  const dir = join(baseDir, campaign.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'campaign.json'), JSON.stringify(campaign, null, 2));
  return dir;
}

export function loadCampaign(baseDir, id) {
  return JSON.parse(readFileSync(join(baseDir, id, 'campaign.json'), 'utf8'));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: file-based campaign persistence"
```

---

### Task 7: 데모 — 배너 3규격 생성 스크립트

**Files:**
- Create: `scripts/demo.js`

- [ ] **Step 1: 데모 스크립트 작성**

`scripts/demo.js`:
```js
// 코어 엔진 데모: 가짜 MBM 1건 → 배너 3규격 HTML을 out/에 생성
import { mkdirSync, writeFileSync } from 'node:fs';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS, registerRenderer, renderArtifact } from '../core/contract.js';
import { renderBanner } from '../core/renderers/banner.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'], mood: ['테크', '신뢰'] });

registerRenderer('banner', renderBanner);
mkdirSync('out', { recursive: true });

const parts = [];
for (const specId of Object.keys(SPECS)) {
  const html = renderArtifact(specId, ctx, style);
  writeFileSync(`out/${specId}.html`, html);
  parts.push(`<h3 style="font:600 13px sans-serif">${specId}</h3>${html}`);
}
writeFileSync('out/index.html',
  `<body style="background:#eee;padding:24px;display:flex;flex-direction:column;gap:16px">${parts.join('')}</body>`);
console.log(`generated ${Object.keys(SPECS).length + 1} files in out/`);
```

- [ ] **Step 2: 실행 확인**

Run: `node scripts/demo.js`
Expected: `generated 4 files in out/`

- [ ] **Step 3: 브라우저 검증**

`out/index.html`을 브라우저 프리뷰로 열어 배너 3규격이 각각 300×250 / 728×90 / 160×600 크기로, 캠페인명·일시·CTA가 보이는지 확인. 728×90은 가로 배치(compact)여야 함.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: demo script rendering three banner specs"
```

---

## Self-Review 결과

- **Spec coverage**: 이 서브플랜은 PRD F2(부분: 스키마+빈칸 검출)·F4(정규화)·F5(배너 1채널)·저장 기반을 커버. F1(파싱)·F6~F10은 서브플랜 #2+로 명시적 이월 — 의도된 범위.
- **Placeholder scan**: 없음. 전 태스크 실코드 포함.
- **Type consistency**: `createContext`/`normalizeStyle`/`renderArtifact` 시그니처 Task 2~7 전체 일치 확인. `esc` export는 Task 5 내 정의·사용.
