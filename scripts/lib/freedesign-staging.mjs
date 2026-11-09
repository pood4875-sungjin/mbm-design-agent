// 피그마 staging KV(_out/figma-1109/staging) → freedesign 계약 입력. scripts/freedesign-ai-loop.mjs(6단계 검증 루프)·점검 스크립트가 같이 쓴다.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, dataUrlOf } from './freedesign-case.mjs';
import { rulesForSpec } from '../../server/freedesign.js';
export const ST = path.join(ROOT, '_out/figma-1109/staging');
export const MAN = JSON.parse(readFileSync(path.join(ST, 'manifest.json'), 'utf8'));
export function stagingInput(id, spec, { campaignId = null } = {}) {
  const man = MAN.find(c => c.id === id); if (!man) throw new Error('staging 에 없음: ' + id);
  const meta = JSON.parse(readFileSync(path.join(ST, id + '.meta.json'), 'utf8'));
  const f = man.fields ?? {};
  const kvMeta = { kind: meta.field?.kind ?? man.kind ?? null, ar: meta.ar, px: meta.px, colors: meta.colors ?? [], edge: meta.edge ?? null, focus: meta.field?.focus ?? null, field: { ...meta.field } };
  return {
    specId: spec,
    brief: { client: f.client, hiringType: f.hiringType ?? '', season: f.season ?? '', role: f.role ?? '', startDate: f.startDate ?? '', deadline: f.deadline ?? '', deadlineTime: f.deadlineTime ?? '', slogan: f.slogan ?? '', notice: f.notice ?? '' },
    kv: { dataUrl: dataUrlOf(path.join(ST, man.file)), meta: kvMeta },
    logo: man.logo ? { dataUrl: dataUrlOf(path.join(ST, man.logo)), tone: man.logoMeta?.tone ?? 'dark', colors: (man.logoMeta?.colors ?? []).slice(0, 3) } : null,
    brand: { primary: man.primary ?? meta.colors?.[0] ?? null, secondary: null, accent: null },
    rules: rulesForSpec(spec), history: [], prev: null, engine: 'claude-code', campaignId: campaignId ?? `staging-${id}-${spec}`,
    _files: { kv: path.join(ST, man.file), logo: man.logo ? path.join(ST, man.logo) : null }, _meta: kvMeta,
  };
}
