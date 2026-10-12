#!/usr/bin/env python3
"""규격별 「디자이너 샘플 vs 우리 렌더」 비교 — 글자 밀도(역할·줄)·위계(px 비)·KV 비중·로고·여백을 표로 만들고 나란히 이미지를 찍는다.

  python3 scripts/figma/spec-compare.py --staging ref/learned/cases/_staging/figma-spec --ours <render-groups 출력 폴더> \
      --out ref/learned/cases/_out/figma-spec-sample [--label 우리] [--ours2 <폴더> --label2 후] [--json <비교.json>] [--md <표.md>]

- staging: manifest.json · figma-spec-measure.json(spec-measure.py) · frames/<id>.png
- ours: <spec>.png + measure-all.json(render-ours measure 를 규격별로 합친 것)
- 출력: <out>/<spec>.png (디자이너 최대 3장 | 우리 [| 우리 후]) · 비교 JSON · 마크다운 표
"""
import argparse, json, os, subprocess, statistics as st

ap = argparse.ArgumentParser()
ap.add_argument('--staging', required=True); ap.add_argument('--ours', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--label', default='우리'); ap.add_argument('--ours2', default=None); ap.add_argument('--label2', default='우리(후)')
ap.add_argument('--json', default=None); ap.add_argument('--md', default=None); ap.add_argument('--no-images', action='store_true')
a = ap.parse_args()
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SBS = os.path.join(ROOT, 'scripts/figma/side-by-side.py')
M = json.load(open(os.path.join(a.staging, 'manifest.json')))
FM = json.load(open(os.path.join(a.staging, 'figma-spec-measure.json')))
O = json.load(open(os.path.join(a.ours, 'measure-all.json')))
O2 = json.load(open(os.path.join(a.ours2, 'measure-all.json'))) if a.ours2 else None
os.makedirs(a.out, exist_ok=True)
SPECW = json.loads(subprocess.run(['node', '-e', "import('./core/media.js').then(m=>console.log(JSON.stringify([].concat(...m.MEDIA.map(x=>(x.specs||[]).map(s=>({id:s.id,w:s.w,h:s.h})))))))"], cwd=ROOT, capture_output=True, text=True).stdout or '[]')

ROLE_MAP = {'main': 'main', 'sub': 'sub', 'date': 'date', 'detail': 'detail', 'label': 'label', 'extra': 'detail', 'cta': 'cta', 'advertiser': 'sub', 'notice': 'detail', 'url': 'detail'}
def ours_struct(m):
    if not m: return None
    roles = {}
    for f in m['fields']:
        r = ROLE_MAP.get(f['role'], f['role'])
        R = roles.setdefault(r, {'px': 0, 'lines': 0, 'weight': 0, 'text': []})
        R['px'] = max(R['px'], f['fs']); R['lines'] += max(1, len(f['lines'])); R['weight'] = max(R['weight'], int(f['fw']) if str(f['fw']).isdigit() else 700)
        R['text'].append(f['text'])
    # 우리 상세 블록: 라벨 줄이 따로 있는지(세로 띠)는 lines 에 이미 들어 있다
    total = sum(R['lines'] for R in roles.values())
    logo = m.get('logo') or []
    return {'roles': roles, 'lineBudget': total, 'logo': bool(logo), 'kvUse': (m.get('ad') or {}).get('data-kv-use'), 'mainPx': roles.get('main', {}).get('px')}

rows = []; cmp = {}
specs_all = [r['spec'] for r in M['frames'] if r.get('spec')]
specs = []
for s in specs_all:
    if s not in specs: specs.append(s)
for sid in specs:
    frames = [r for r in M['frames'] if r.get('spec') == sid and not r.get('template')]
    fs = FM['specs'].get(sid); summ = fs['summary'] if fs else None
    # 디자이너 프레임이 2배 프레임(자소설 달력 328×466 ↔ 규격 164×233)이면 px 를 규격 기준으로 환산
    if summ and frames:
        k = frames[0]['w'] / fs['w'] if fs.get('w') else 1
        specw = next((x['w'] for x in SPECW if x['id'] == sid), None)
        if specw and fs.get('w') and abs(specw - fs['w']) > 2:
            k = specw / fs['w']; summ = json.loads(json.dumps(summ))
            for R in summ['roles'].values(): R['px'] = round(R['px'] * k, 1)
            summ['scaled'] = k
    o = ours_struct(O.get(sid)); o2 = ours_struct(O2.get(sid)) if O2 else None
    # 이미지
    if not a.no_images:
        fr_imgs = [os.path.join(a.staging, 'frames', f['frameId'].replace(':', '-') + '.png') for f in frames[:3]]
        fr_imgs = [p for p in fr_imgs if os.path.exists(p)]
        panels = [f"디자이너(Figma)={'+'.join(fr_imgs)}" if len(fr_imgs) > 1 else f"디자이너(Figma)={fr_imgs[0]}"] if fr_imgs else []
        if os.path.exists(os.path.join(a.ours, sid + '.png')): panels.append(f"{a.label}={os.path.join(a.ours, sid + '.png')}")
        if a.ours2 and os.path.exists(os.path.join(a.ours2, sid + '.png')): panels.append(f"{a.label2}={os.path.join(a.ours2, sid + '.png')}")
        if len(panels) >= 2:
            # 기준 칸(첫 한 장짜리)을 우리 쪽으로 — 디자이너 칸이 여러 장일 때 비율 기준이 없어지지 않게 우리 이미지를 앞에 두고 라벨 순서만 유지
            subprocess.run(['python3', '-I', SBS, '--out', os.path.join(a.out, sid + '.png'), '--thumb', '420', *panels], check=False, capture_output=True)
    # 표
    def fmt_roles(S):
        if not S: return '-'
        order = ['sub', 'main', 'date', 'label', 'detail', 'hashtag', 'cta']
        return ' · '.join(f"{r} {S[r]['lines']:g}줄/{S[r]['px']:g}px" + (f"({int(S[r]['share']*100)}%)" if 'share' in S[r] and S[r]['share'] < 1 else '') for r in order if r in S)
    fr_roles = summ['roles'] if summ else None
    o_roles = {r: {'lines': R['lines'], 'px': R['px']} for r, R in o['roles'].items()} if o else None
    measurable = bool(summ)
    verdict = '측정 안 함'
    gap = None
    oj = o2 or o   # 판정은 「후」가 있으면 후 기준
    if summ and oj:
        gap = round(summ['lineBudget'] - oj['lineBudget'], 1)
        missing = [r for r, R in fr_roles.items() if R['share'] >= 0.6 and r not in oj['roles'] and r != 'hashtag' and r != 'cta']
        mainF = fr_roles.get('main', {}).get('px'); mainO = oj['mainPx']
        pxr = round(mainO / mainF, 2) if mainF and mainO else None
        verdict = '맞음' if gap <= 1 and not missing and (pxr is None or 0.75 <= pxr <= 1.3) else '차이'
        why = []
        if gap > 1: why.append(f'글자 줄 {oj["lineBudget"]} < 샘플 {summ["lineBudget"]}')
        if missing: why.append('없는 역할 ' + ','.join(missing))
        if pxr is not None and not (0.75 <= pxr <= 1.3): why.append(f'메인 px 비 {pxr}')
        verdict_why = '; '.join(why)
    else:
        verdict_why = '디자이너 프레임이 이미지뿐(글자 실측 불가)' if not summ else '우리 렌더 없음'
    row = {'spec': sid, 'n': len(frames), 'clients': [f['client'] for f in frames], 'F': summ, 'O': o, 'O2': o2, 'gap': gap, 'verdict': verdict, 'why': verdict_why}
    cmp[sid] = row
    rows.append(row)

if a.json: json.dump(cmp, open(a.json, 'w'), ensure_ascii=False, indent=1)
md = ['| spec | 샘플 n | 글자 구조 F (역할 줄/px) | 글자 구조 O | 줄 F/O | 메인 px F/O | KV F/O | 로고 F/O | 여백 F padX | 판정 |', '|---|---|---|---|---|---|---|---|---|---|']
for r in rows:
    F, O_ = r['F'], r['O']
    fr = fmt_roles(F['roles']) if F else '-'
    orr = fmt_roles({k: {'lines': v['lines'], 'px': v['px']} for k, v in O_['roles'].items()}) if O_ else '-'
    o2r = ''
    if r['O2']: o2r = ' → ' + fmt_roles({k: {'lines': v['lines'], 'px': v['px']} for k, v in r['O2']['roles'].items()})
    lines = f"{F['lineBudget'] if F else '-'} / {O_['lineBudget'] if O_ else '-'}" + (f" → {r['O2']['lineBudget']}" if r['O2'] else '')
    mainpx = f"{F['roles'].get('main', {}).get('px', '-') if F else '-'} / {O_['mainPx'] if O_ else '-'}" + (f" → {r['O2']['mainPx']}" if r['O2'] else '')
    kv = f"{int(F['kvArea']*100)}%{'(배경 ' + str(F['kvBg']) + ')' if F and F['kvBg'] else ''} / {O_['kvUse'] if O_ else '-'}" if F else f"- / {O_['kvUse'] if O_ else '-'}"
    logo = f"{int(F['logoShare']*100)}% / {'있음' if O_ and O_['logo'] else '없음'}" if F else f"- / {'있음' if O_ and O_['logo'] else '없음'}"
    pad = f"{F['padXr']:.2f}" if F else '-'
    md.append(f"| {r['spec']} | {r['n']} ({', '.join(r['clients'][:3])}) | {fr} | {orr}{o2r} | {lines} | {mainpx} | {kv} | {logo} | {pad} | **{r['verdict']}** {r['why']} |")
if a.md: open(a.md, 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
print('\n판정:', {v: sum(1 for r in rows if r['verdict'] == v) for v in ('맞음', '차이', '측정 안 함')})
