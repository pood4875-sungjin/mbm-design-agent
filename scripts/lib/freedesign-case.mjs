// 자유 디자인(freedesign) 케이스 입력 — 케이스 장부(ref/learned/cases) 한 건 + 규격 → POST /api/freedesign 계약 입력 JSON.
//   앱이 만드는 것과 같은 모양(rules 는 server/freedesign.js rulesForSpec). 스크립트(freedesign-brief · freedesign-run)와 스킬이 같이 쓴다.
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { rulesForSpec } from '../../server/freedesign.js';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const CASES = path.join(ROOT, 'ref/learned/cases');
export const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const mime = f => f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
export const dataUrlOf = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;

export function caseOf(caseId) {
  const c = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8')).cases.find(x => x.id === caseId);
  if (!c) throw new Error('케이스 없음: ' + caseId);
  const dir = path.join(CASES, caseId);
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const kvFile = path.join(dir, c.kv);
  const logoFile = c.logo && existsSync(path.join(dir, c.logo)) ? path.join(dir, c.logo) : null;
  return { c, dir, meta, kvFile, logoFile, fields: c.fields ?? DEFAULT_FIELDS };
}

// 계약 입력. assets:'data' 면 dataURL(서버/엔진용), 'file' 이면 file:// (렌더 전용 — HTML 이 가볍다)
export function caseInput(caseId, specId, { assets = 'data', engine = 'claude-code' } = {}) {
  const K = caseOf(caseId);
  const url = f => assets === 'file' ? pathToFileURL(f).href : dataUrlOf(f);
  const kvMeta = { kind: K.meta.field?.kind ?? null, ar: K.meta.ar, px: K.meta.px, colors: K.meta.colors ?? [], edge: K.meta.edge ?? null, focus: K.meta.field?.focus ?? null, field: { kind: K.meta.field?.kind ?? null, lum: K.meta.field?.lum ?? null, opaque: K.meta.field?.opaque ?? null } };
  const f = K.fields;
  return {
    specId,
    brief: { client: f.client, hiringType: f.hiringType ?? '', season: f.season ?? '', role: f.role ?? '', startDate: f.startDate ?? '', deadline: f.deadline ?? '', deadlineTime: f.deadlineTime ?? '', slogan: f.slogan ?? '', notice: f.notice ?? '' },
    kv: { dataUrl: url(K.kvFile), meta: kvMeta },
    logo: K.logoFile ? { dataUrl: url(K.logoFile), tone: K.c.logoMeta?.tone ?? 'dark' } : null,
    brand: { primary: K.c.primary ?? K.meta.colors?.[0] ?? null, secondary: null, accent: null },
    rules: rulesForSpec(specId),
    history: [], prev: null, engine, n: 1,
    _files: { kv: K.kvFile, logo: K.logoFile },
  };
}
