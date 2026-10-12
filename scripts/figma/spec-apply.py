#!/usr/bin/env python3
"""규격별 샘플 실측(figma-spec-measure.json)을 매체 JSON(core/media/<id>.json)의 spec.sampleText 로 적는다 — 「템플릿 실측」 층.
우선순위는 매체 규정(textLimits·fontSizes) > 이 값(sampleText) > 매체 가이드(guide) > CANON 이다. 렌더러(core/renderers/ad.js)는
규정 표에 없는 역할만 여기서 더하고, 매체가 글자 크기를 밝히지 않은 역할만 여기 px 를 쓴다.

  python3 scripts/figma/spec-apply.py ref/learned/cases/_staging/figma-spec [--dry-run]
  → 이어서 node scripts/build-media.mjs
"""
import json, os, sys, glob

d = sys.argv[1]; dry = '--dry-run' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FM = json.load(open(os.path.join(d, 'figma-spec-measure.json')))
M = json.load(open(os.path.join(d, 'manifest.json')))
FILEKEY = M.get('fileKey', 'gD8RsVVg5iWAvQ0VbV2Wbz')
by_spec = {}
for r in M['frames']:
    if r.get('spec') and not r.get('template'): by_spec.setdefault(r['spec'], []).append(r)
import statistics as st
def pooled(spec_ids):
    """여러 규격의 프레임을 합쳐 spec-measure 와 같은 요약을 다시 만든다."""
    fr = [FM['frames'][fid] for sid in spec_ids for fid in FM['specs'][sid]['frames'] if fid in FM['frames']]
    roles = {}
    for r in fr:
        for ro, items in r['roles'].items():
            R = roles.setdefault(ro, {'n': 0, 'px': [], 'lines': [], 'weight': []})
            R['n'] += 1; R['px'].append(max(x['px'] for x in items)); R['lines'].append(sum(x['lines'] for x in items)); R['weight'].append(max(x['weight'] for x in items))
    n = len(fr)
    return {'n': n, 'frames': [r['frameId'] for r in fr], 'w': fr[0]['w'] if fr else None, 'summary': {
        'roles': {ro: {'share': round(R['n'] / n, 2), 'px': round(st.median(R['px']), 1), 'lines': round(st.median(R['lines']), 1), 'weight': int(st.median(R['weight']))} for ro, R in roles.items()},
        'lineBudget': round(st.median([r['lineBudget'] for r in fr]), 1), 'kvArea': round(st.median([r['kvArea'] for r in fr]), 3), 'kvBg': sum(1 for r in fr if r['kvUse'] == 'bg'),
        'logoShare': round(sum(1 for r in fr if r['logo']) / n, 2), 'padXr': round(st.median([r['padXr'] for r in fr]), 3), 'padTopr': round(st.median([r['padTopr'] for r in fr]), 3), 'mainPxR': round(st.median([r['mainPxR'] for r in fr]), 4)}}
n_written = 0
for mf in sorted(glob.glob(os.path.join(ROOT, 'core/media/*.json'))):
    media = json.load(open(mf)); changed = False
    for s in media['specs']:
        S = FM['specs'].get(s['id'])
        if not S: continue
        # 쌍둥이 규격(같은 크기·같은 규정표): 샘플을 합친다
        twins = [t['id'] for t in media['specs'] if t['id'] != s['id'] and t.get('w') == s.get('w') and t.get('h') == s.get('h') and t.get('textLimits') == s.get('textLimits') and t['id'] in FM['specs']]
        if twins: S = pooled([s['id'], *twins])
        summ = S['summary']; frames = [f for sid in [s['id'], *twins] for f in by_spec.get(sid, [])]
        frames = sorted(frames, key=lambda f: tuple(int(x) for x in f['frameId'].split(':')))   # 쌍둥이끼리 같은 문자열이 되게 정렬
        # 2배 프레임(자소설 달력 328×466 ↔ 164×233)은 규격 캔버스 기준으로 환산
        k = (s['w'] / S['w']) if s.get('w') and S.get('w') and abs(s['w'] - S['w']) > 2 else 1
        roles = {}
        for ro, R in summ['roles'].items():
            roles[ro] = {'share': R['share'], 'lines': R['lines'], 'px': round(R['px'] * k, 1), 'weight': R['weight']}
        block = {
            'measuredFromSamples': {
                'n': S['n'],
                'roles': roles,
                'lineBudget': summ['lineBudget'],
                'kvArea': summ['kvArea'], 'kvBg': summ['kvBg'], 'logoShare': summ['logoShare'],
                'padXr': summ['padXr'], 'padTopr': summ['padTopr'], 'mainPxR': summ['mainPxR'],
                'frameScale': k,
                'source': f"figma:{FILEKEY} 매체별 규격정리 — " + ' / '.join(f"{f['frameId']} {f['client']}" for f in frames),
                'measuredAt': '2026-10-12',
                'note': '디자이너 샘플 프레임의 글자 역할(share = 그 역할이 있는 프레임 비율)·줄 수·fontSize(px, 규격 캔버스 기준)·굵기 중앙값. 규정이 정하지 않은 역할·크기만 렌더러가 쓴다(scripts/figma/spec-apply.py)',
                'confidence': '확인필요' if S['n'] < 3 else '확정(샘플 3+)',
            }
        }
        if s.get('sampleText') != block: s['sampleText'] = block; changed = True; n_written += 1
    if changed and not dry:
        json.dump(media, open(mf, 'w'), ensure_ascii=False, indent=2); open(mf, 'a').write('\n')
        print('wrote', os.path.relpath(mf, ROOT))
print('specs with sampleText:', n_written, '(dry-run)' if dry else '')
