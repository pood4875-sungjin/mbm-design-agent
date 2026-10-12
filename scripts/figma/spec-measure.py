#!/usr/bin/env python3
"""「매체별 규격정리」 디자이너 샘플 프레임의 실측(measure-figma.json: use_figma 로 읽은 글자·이미지·로고 상자)을
역할(main·sub·date·label·detail·hashtag·cta)별 구조로 정리하고, 규격(spec)별로 모아 「템플릿 실측」 요약을 만든다.

  python3 scripts/figma/spec-measure.py ref/learned/cases/_staging/figma-spec \
      --out ref/learned/cases/_staging/figma-spec/figma-spec-measure.json

입력: <dir>/manifest.json (frames[{frameId,name,w,h,spec,measurable,client}]) · <dir>/measure-figma.json ({frameId:{wh,bg,items}})
  items: ['T',[x,y,w,h],[[text,px,style,color,lh],...]] · ['I',name,[x,y,w,h],opacity] · ['L',[x,y,w,h]] · ['S',[x,y,w,h],[fills]]
출력: { frames: {frameId: {spec, client, roles:{role:[{text,px,weight,lines,color,box}]}, kvUse, kvArea, logo, pad, bg}},
        specs: {spec: {n, frames, roles:{role:{n, px:[..], lines:[..], weight:[..]}}, kvArea:[..], logo:n, padX:[..], padTop:[..], lineBudget:[..]}} }
"""
import argparse, json, os, re, statistics as st

ap = argparse.ArgumentParser()
ap.add_argument('dir'); ap.add_argument('--out', default=None)
a = ap.parse_args()
M = json.load(open(os.path.join(a.dir, 'manifest.json')))
F = json.load(open(os.path.join(a.dir, 'measure-figma.json')))

WEIGHT = {'thin': 100, 'extralight': 200, 'light': 300, 'regular': 400, 'medium': 500, 'semibold': 600, 'demibold': 600, 'bold': 700, 'extrabold': 800, 'extra-bold': 800, 'heavy': 800, 'hv': 800, 'black': 900, 'b': 700, 'bd': 700}
def weight_of(style):
    s = re.sub(r'[\s\-_]', '', str(style).lower())
    s = re.sub(r'^\d+', '', s)   # "7 Bold" · "05 Bd" (숫자 접두)
    for k in sorted(WEIGHT, key=len, reverse=True):
        if k.replace('-', '') in s: return WEIGHT[k]
    return 400

PLACEHOLDER = re.compile(r'이미지 영역|^로고$|로고 영역|^반려$|비노출|최대 \d+글자|입력하세요|일이삼사')
LABEL = re.compile(r'^(모집\s?기간|접수\s?기간|모집\s?직무|모집\s?분야|모집\s?부문|채용\s?일정|채용\s?기간|대상\s?직무|모집\s?대상|지원\s?방법|모집\s?일정|모집\s?회사|지원\s?자격|서류\s?접수)')
DATE = re.compile(r'(\d{1,4}[./]\s?\d{1,2}|~\s?\d|\d+월\s?\d+일|\(\s?[월화수목금토일]\s?\))')
CTA = re.compile(r'지원하기|신청하기|바로가기|Click|지금 지원')
SEASON = re.compile(r'^(20\d\d)?\s?(년)?\s?(상반기|하반기|\d+월|\d+기|\d+차)?\s?$')

def lines_of(box, segs):
    h = box[3]; px = max(s[1] for s in segs)
    lh = None
    for s in segs:
        v = s[4]
        if isinstance(v, (int, float)): lh = v; break
        if isinstance(v, str) and v.endswith('%'): lh = px * float(v[:-1]) / 100; break
    lh = lh or px * 1.25
    n = max(1, round(h / lh))
    # 글자 안에 줄바꿈('/')이 있고 h 가 두 줄 이상이면 그 수를 믿는다
    return n

def frame_roles(fid, fr, meta):
    W, H = fr['wh']; area = W * H
    texts = []
    for it in fr['items']:
        if it[0] != 'T': continue
        box, segs = it[1], it[2]
        txt = ''.join(s[0] for s in segs).strip()
        if not txt or PLACEHOLDER.search(txt): continue
        px = max(s[1] for s in segs)
        wt = max(weight_of(s[2]) for s in segs)
        texts.append({'text': txt[:60], 'px': round(px, 1), 'weight': wt, 'lines': lines_of(box, segs), 'color': segs[0][3], 'box': box, 'segs': len(segs)})
    if not texts: return None
    mx = max(t['px'] for t in texts)
    roles = {}
    def put(r, t): roles.setdefault(r, []).append({k: v for k, v in t.items() if k != 'segs'})
    main_y = None
    for t in texts:
        if t['px'] >= mx * 0.85 and not DATE.search(t['text']) and not t['text'].startswith('#'):
            put('main', t); main_y = t['box'][1] if main_y is None else min(main_y, t['box'][1])
    for t in texts:
        if any(t is x or t['text'] == x['text'] and t['box'] == x['box'] for x in roles.get('main', [])): continue
        s = t['text']
        if s.startswith('#'): put('hashtag', t)
        elif CTA.search(s) and len(s) <= 14: put('cta', t)
        elif LABEL.match(s) and len(s) <= 7: put('label', t)
        elif LABEL.match(s): put('detail', t)      # 「모집직무 : 값」 한 줄
        elif DATE.search(s) and len(s) <= 40: put('date', t)
        elif main_y is not None and t['box'][1] < main_y and t['px'] < mx: put('sub', t)   # 메인 위 작은 글자 = 아이브로(시즌·슬로건)
        else: put('detail', t)
    # 이미지·로고·KV
    logo = None; kvboxes = []; bgimg = False
    for it in fr['items']:
        if it[0] == 'L': logo = it[1]
        elif it[0] == 'I':
            name, b, op = it[1], it[2], it[3]
            if re.search(r'logo|로고|CI_|_CI', name, re.I) or (b[2] * b[3] < area * 0.03 and b[1] < H * 0.25): logo = logo or b; continue
            x0, y0 = max(0, b[0]), max(0, b[1]); x1, y1 = min(W, b[0] + b[2]), min(H, b[1] + b[3])
            if x1 <= x0 or y1 <= y0: continue
            cov = (x1 - x0) * (y1 - y0) / area
            if cov >= 0.9 and (op < 1 or re.search(r'texture|배경|bg', name, re.I)): bgimg = True; continue
            if cov >= 0.9: bgimg = True
            kvboxes.append((x0, y0, x1, y1))
    # 합집합 면적(겹침은 큰 상자만)
    kvarea = 0
    if kvboxes:
        kvboxes.sort(key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))
        big = kvboxes[0]; kvarea = (big[2] - big[0]) * (big[3] - big[1]) / area
    txs = [t['box'] for t in texts]
    padX = min(b[0] for b in txs); padTop = min(b[1] for b in txs)
    bottom = max(b[1] + b[3] for b in txs)
    total_lines = sum(sum(x['lines'] for x in v) for v in roles.values())
    return {'spec': meta['spec'], 'client': meta['client'], 'frameId': fid, 'w': W, 'h': H, 'bg': fr['bg'],
            'roles': roles, 'kvUse': 'bg' if bgimg else ('part' if kvboxes else 'none'), 'kvArea': round(kvarea, 3), 'logo': logo,
            'padX': padX, 'padXr': round(padX / W, 3), 'padTop': padTop, 'padTopr': round(padTop / H, 3), 'textBottomr': round(bottom / H, 3),
            'lineBudget': total_lines, 'mainPxR': round(mx / (W if H / W >= 1.2 else (W * H) ** 0.5), 4)}

out = {'frames': {}, 'specs': {}}
for meta in M['frames']:
    fid = meta['frameId']; fr = F.get(fid)
    if not fr or fr.get('template') or not meta.get('spec'): continue
    r = frame_roles(fid, fr, meta)
    if not r: continue
    out['frames'][fid] = r
    S = out['specs'].setdefault(meta['spec'], {'n': 0, 'frames': [], 'roles': {}, 'kvArea': [], 'kvUse': [], 'logo': 0, 'padXr': [], 'padTopr': [], 'lineBudget': [], 'mainPxR': [], 'w': meta['w'], 'h': meta['h']})
    S['n'] += 1; S['frames'].append(fid)
    for role, items in r['roles'].items():
        R = S['roles'].setdefault(role, {'n': 0, 'px': [], 'lines': [], 'weight': [], 'nodes': []})
        R['n'] += 1; R['px'].append(max(x['px'] for x in items)); R['lines'].append(sum(x['lines'] for x in items)); R['weight'].append(max(x['weight'] for x in items)); R['nodes'].append(len(items))
    S['kvArea'].append(r['kvArea']); S['kvUse'].append(r['kvUse']); S['logo'] += 1 if r['logo'] else 0
    S['padXr'].append(r['padXr']); S['padTopr'].append(r['padTopr']); S['lineBudget'].append(r['lineBudget']); S['mainPxR'].append(r['mainPxR'])
for sid, S in out['specs'].items():
    S['summary'] = {
        'roles': {ro: {'share': round(R['n'] / S['n'], 2), 'px': round(st.median(R['px']), 1), 'lines': round(st.median(R['lines']), 1), 'weight': int(st.median(R['weight']))} for ro, R in S['roles'].items()},
        'lineBudget': round(st.median(S['lineBudget']), 1), 'kvArea': round(st.median(S['kvArea']), 3), 'kvBg': S['kvUse'].count('bg'), 'logoShare': round(S['logo'] / S['n'], 2),
        'padXr': round(st.median(S['padXr']), 3), 'padTopr': round(st.median(S['padTopr']), 3), 'mainPxR': round(st.median(S['mainPxR']), 4)}
o = a.out or os.path.join(a.dir, 'figma-spec-measure.json')
json.dump(out, open(o, 'w'), ensure_ascii=False, indent=1)
print('frames', len(out['frames']), 'specs', len(out['specs']), '→', o)
for sid, S in sorted(out['specs'].items()):
    s = S['summary']
    print(f"{sid:36s} n={S['n']} lines={s['lineBudget']:>4} kv={s['kvArea']:.2f}(bg {s['kvBg']}) logo={s['logoShare']:.2f} padX={s['padXr']:.3f} " + ' '.join(f"{ro}:{R['share']:.1f}×{R['lines']}L/{R['px']}px/{R['weight']}" for ro, R in s['roles'].items()))
