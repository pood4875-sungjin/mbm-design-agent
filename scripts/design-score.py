#!/usr/bin/env python3
"""디자이너 산출물(이미지) vs 우리 렌더 — 같은 자(OCR·픽셀)로 재서 규격별 구조 일치를 매긴다(10-14 t1014 「동일하게 나오는지」 검수).

  python3 scripts/design-score.py --frames ref/learned/cases/_staging/t1014/frames.json --ours <render-ours 출력 폴더>[,<폴더2>] \
      --out <score.json> [--md <표.md>] [--clients "t1014-abl=ABL생명,…"]

잰 것(양쪽 같은 방법 — 디자이너 쪽은 레이어가 없어 그림에서 잰다):
  · 글자 줄: Apple Vision OCR(scripts/ocr-text.swift) → 역할(main·sub·date·label·detail·tag) — 메인 = 가장 큰 글자 줄(최대의 82% 이상)
  · 로고: 회사명 낱말이 든 줄이 모서리(위·아래 22% 띠)에 있으면 로고(OCR 이 로고 글자를 읽는다) · 우리 쪽은 DOM 로고 상자(measure.json)
  · KV 면적: 바탕 대표색(테두리 띠 최빈 색)과 멀거나 결이 있는 픽셀 몫 — 글자·로고 상자 제외 · KV 쪽 = 그 픽셀 무게중심
  · 지면 톤: 테두리 띠 대표색 밝기 — light(≥0.72) · dark(≤0.3) · mid
판정 7항: 역할 구조(main·date·detail 유무) · 메인 px 비 ±15% · KV 면적 ±5%p · KV 쪽 · 로고 모서리 · 지면 톤 · 왼쪽 여백 ±10%(또는 폭의 1%)
  일치 = 잴 수 있는 항목 전부 · 근접 = 하나 또는 둘 어긋남(역할 구조는 맞음) · 차이 = 그 밖
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--frames', required=True); ap.add_argument('--ours', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--md', default=None); ap.add_argument('--clients', default='')
ap.add_argument('--annot', default=None, help='디자이너 눈 판정 JSON(「case|spec[|alt]」 → logo·kv·ab) — 있으면 로고 모서리·KV 쪽은 이 값')
a = ap.parse_args()
STG = os.path.dirname(os.path.abspath(a.frames))
F = [f for f in json.load(open(a.frames))['frames'] if f.get('spec')]
OURS = a.ours.split(',')
CLIENT = dict(x.split('=') for x in a.clients.split(',') if '=' in x)
ANN = json.load(open(a.annot)) if a.annot else {}

def ocr(paths):
    res = {}
    for i in range(0, len(paths), 20):
        chunk = paths[i:i + 20]
        r = subprocess.run(['swift', os.path.join(ROOT, 'scripts/ocr-text.swift'), *chunk], capture_output=True, text=True)
        for d in json.loads(r.stdout or '[]'): res[d['file']] = d
    return res

DATE = re.compile(r'\d{1,2}\s?[./월]\s?\d{1,2}|\(\s?[월화수목금토일]\s?[)\]]|~\s?\d|\d{1,2}:\d{2}|\d+시')
LABEL = re.compile(r'^(모집\s?(직무|분야|부문|기간)|접수\s?기간|채용\s?(일정|직무)|지원\s?기간)\s*:?$')
DETAIL = re.compile(r'모집\s?(직무|분야|부문)|\(신입\)|\(경력\)|[,|ㅣ·]|직$|채용$')
TAG = re.compile(r'^#|\*|^•|BRINGING|INNOVATION', re.I)

def logo_words(case):
    c = CLIENT.get(case, '')
    words = {c, c.replace('㈜', '')} if c else set()
    extra = {'t1014-bionote-dog': ['BIONOTE'], 't1014-bionote-cat': ['BIONOTE'], 't1014-hanssem': ['HANSSEM', 'HANSSEN'], 't1014-hanssem-blocks': ['HANSSEM', 'HANSSEN'], 't1014-jeil': ['JEIL'], 't1014-abl': ['ABL'], 't1014-gs2025': ['GS'], 't1014-gs2026': ['GS'], 't1014-lt': ['LT'], 't1014-lt-v2': ['LT'], 't1014-lt-v3': ['LT'], 't1014-asan-illust': ['Asan', 'Medical'], 't1014-asan-photo': ['Asan', 'Medical']}
    return [w for w in words if w] + extra.get(case, [])

def structure(d, case, logo_box=None):
    W, H = d['w'], d['h']
    # 글자로 읽힌 줄만 — 신뢰도 0.5 이상, 한글·영숫자·문장부호만(제품 포장 글씨 「Maxim. 2x⅜£」 같은 그림 속 글자는 버린다)
    OK = re.compile(r'^[가-힣A-Za-z0-9\s()\[\]/.,:~\-·|&!?%#*•ㅣ\'"㈜+]+$')
    L = [l for l in d.get('lines', []) if l['conf'] >= 0.5 and l['h'] > 4 and OK.match(l['text'].strip())]
    def inbox(l, b):
        if not b: return False
        x, y, w, h = b; cx, cy = l['x'] + l['w'] / 2, l['y'] + l['h'] / 2
        return x - 4 <= cx <= x + w + 4 and y - 4 <= cy <= y + h + 4
    logo = None; rest = []
    words = logo_words(case)
    mx0 = max((l['h'] for l in L), default=0)
    for l in L:
        corner = (l['y'] + l['h'] / 2 < H * 0.22 or l['y'] + l['h'] / 2 > H * 0.78) and (l['x'] + l['w'] / 2 < W * 0.4 or l['x'] + l['w'] / 2 > W * 0.6 or l['y'] + l['h'] / 2 > H * 0.78)
        small = l['h'] < mx0 * 0.75 or len(L) == 1
        if inbox(l, logo_box) or (logo_box is None and corner and small and any(w and w.replace(' ', '') in l['text'].replace(' ', '') for w in words) and len(l['text'].replace(' ', '')) <= max(len(w) for w in words) + 4):
            if logo is None: logo = [l['x'], l['y'], l['w'], l['h']]
            continue
        rest.append(l)
    if logo_box is not None: logo = logo_box
    roles = {}
    if rest:
        mx = max(l['h'] for l in rest)
        for l in rest:
            t = l['text'].strip()
            r = 'main' if l['h'] >= mx * 0.72 and not LABEL.match(t) and not DATE.search(t) else 'label' if LABEL.match(t) else 'date' if DATE.search(t) else 'tag' if TAG.search(t) else 'detail' if DETAIL.search(t) and l['h'] < mx * 0.7 else 'sub'
            l['role'] = r; roles.setdefault(r, []).append(l)
    mainH = float(np.median([l['h'] for l in roles.get('main', [])])) if roles.get('main') else None
    left = min((l['x'] for l in roles.get('main', [])), default=None)   # 왼쪽 여백 = 메인 줄의 왼쪽 끝(가운데 정렬이면 그 줄의 시작)
    corner = None
    if logo:
        cx, cy = (logo[0] + logo[2] / 2) / W, (logo[1] + logo[3] / 2) / H
        corner = 'center' if (0.3 < cy < 0.7 and 0.3 < cx < 0.7) else ('top' if cy < 0.5 else 'bottom') + '-' + ('left' if cx < 0.4 else 'right' if cx > 0.6 else 'center')
    return {'roles': {k: len(v) for k, v in roles.items()}, 'mainH': mainH, 'mainText': ' / '.join(l['text'] for l in roles.get('main', [])), 'left': left, 'logo': logo, 'corner': corner, 'boxes': [[l['x'], l['y'], l['w'], l['h']] for l in rest] + ([logo] if logo else [])}

def kv_tone(path, boxes):
    im = Image.open(path).convert('RGBA'); W, H = im.size
    s = 240 / max(W, H); im = im.resize((max(1, int(W * s)), max(1, int(H * s))))
    a = np.array(im).astype(float); w, h = im.size
    alpha = a[..., 3] > 20
    rgb = a[..., :3]
    band = max(2, int(min(w, h) * 0.04))
    edge = np.concatenate([rgb[:band].reshape(-1, 3), rgb[-band:].reshape(-1, 3), rgb[:, :band].reshape(-1, 3), rgb[:, -band:].reshape(-1, 3)])
    q = (edge // 24).astype(int); keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
    vals, cnt = np.unique(keys, return_counts=True); k = vals[np.argmax(cnt)]
    sel = keys == k; bg = edge[sel].mean(0)
    lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255
    tone = 'light' if lum >= 0.72 else 'dark' if lum <= 0.3 else 'mid'
    if not alpha[:band].any() and not alpha[-band:].any(): tone = 'transparent'
    # 줄마다 왼쪽·오른쪽 끝 색을 이은 바탕 모형(가로 그라데이션 지면) — 대표색 하나와의 거리만 보면 그라데이션 지면이 KV 로 잡힌다
    Lc = np.median(rgb[:, :band], axis=1); Rc = np.median(rgb[:, -band:], axis=1)
    t = np.linspace(0, 1, w)[None, :, None]
    model = Lc[:, None, :] * (1 - t) + Rc[:, None, :] * t
    dist = np.minimum(np.sqrt(((rgb - bg) ** 2).sum(-1)), np.sqrt(((rgb - model) ** 2).sum(-1))) / 255
    edgeBusy = float(np.mean(np.abs(np.diff(edge.mean(-1)))) / 255)
    gy = np.abs(np.diff(rgb.mean(-1), axis=0, prepend=rgb.mean(-1)[:1])); gx = np.abs(np.diff(rgb.mean(-1), axis=1, prepend=rgb.mean(-1)[:, :1]))
    m = ((dist > 0.18) | ((gx + gy) > 40)) & alpha
    for (x, y, bw, bh) in boxes:
        x0, y0 = int(max(0, (x - 6) * s)), int(max(0, (y - 6) * s)); x1, y1 = int(min(w, (x + bw + 6) * s)), int(min(h, (y + bh + 6) * s))
        m[y0:y1, x0:x1] = False
    # 잡티(글자 주변 찌꺼기) 빼기 — 3×3 이웃 과반
    from PIL import ImageFilter
    mm = np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MedianFilter(5))) > 0
    area = float(mm.mean())
    if edgeBusy > 0.06: area = max(area, 0.9)   # 테두리부터 결이 있는 그림 = 사진·그림이 지면 전체(전면 배경)
    side = None
    if area > 0.02:
        ys, xs = np.nonzero(mm); cx, cy = xs.mean() / w, ys.mean() / h
        side = 'full' if area > 0.7 else ('right' if cx > 0.6 else 'left' if cx < 0.4 else '') + ('bottom' if cy > 0.6 else 'top' if cy < 0.4 else '') or 'center'
    return {'tone': tone, 'bgLum': round(float(lum), 2), 'kvArea': round(area, 3), 'kvSide': side}

def side_match(a, b):
    if a is None or b is None: return None
    if a == b: return True
    if 'full' in (a, b): return False
    return bool(set(re.findall('right|left|bottom|top', a)) & set(re.findall('right|left|bottom|top', b)))

designer = [os.path.join(STG, f['frame']) for f in F]
ours = {o: [os.path.join(o, f['case'], f['spec'] + '.png') for f in F] for o in OURS}
O = ocr(designer + [p for v in ours.values() for p in v if os.path.exists(p)])
MEAS = {}
for o in OURS:
    for f in F:
        mp = os.path.join(o, f['case'], 'measure.json')
        if os.path.exists(mp) and (o, f['case']) not in MEAS: MEAS[(o, f['case'])] = json.load(open(mp))
rows = []
for i, f in enumerate(F):
    dp = designer[i]; dd = O.get(dp, {'w': 1, 'h': 1, 'lines': []})
    ds = structure(dd, f['case']); dk = kv_tone(dp, ds['boxes'])
    an = ANN.get('|'.join([f['case'], f['spec']] + ([f['alt']] if f.get('alt') else [])))
    if an: ds['corner'] = an.get('logo'); dk['kvSide'] = an.get('kv'); ds['ab'] = an.get('ab'); ds['abWhy'] = an.get('why')
    if dk['kvSide'] == 'full': dk['kvArea'] = None
    row = {'case': f['case'], 'spec': f['spec'], 'alt': f.get('alt'), 'proxy': bool(f.get('proxy')), 'designer': {**ds, **dk}, 'ours': {}}
    for o in OURS:
        op = ours[o][i]
        if not os.path.exists(op): continue
        m = MEAS.get((o, f['case']), {}).get('specs', {}).get(f['spec']) or {}
        lb = m.get('logo')[0] if m.get('logo') else None
        od = O.get(op, {'w': 1, 'h': 1, 'lines': []})
        os_ = structure(od, f['case'], logo_box=lb if lb else None); ok = kv_tone(op, os_['boxes'])
        if lb is None: os_['corner'] = None; os_['logo'] = None
        elif os_['corner']:   # 가운데 띠(0.4~0.6)는 center
            pass
        use = (m.get('ad') or {}).get('data-kv-use')
        if use in ('full', 'bg'): ok['kvSide'] = 'full'; ok['kvArea'] = None
        W = dd['w']
        chk = {}
        kr = lambda S: (bool(S['roles'].get('main')), bool(S['roles'].get('date')), bool(S['roles'].get('detail') or S['roles'].get('label')))
        chk['structure'] = kr(ds) == kr(os_)
        chk['mainPx'] = (abs(os_['mainH'] / ds['mainH'] - 1) <= 0.15) if (ds['mainH'] and os_['mainH']) else None
        chk['kvArea'] = (abs(ok['kvArea'] - dk['kvArea']) <= 0.05) if (dk['tone'] != 'transparent' and ok['kvArea'] is not None and dk['kvArea'] is not None) else None
        chk['kvSide'] = side_match(dk['kvSide'], ok['kvSide'])
        chk['logo'] = (ds['corner'] == os_['corner']) if (ds['corner'] or os_['corner']) else None
        chk['tone'] = dk['tone'] == ok['tone']
        chk['pad'] = (abs(os_['left'] - ds['left']) <= max(W * 0.01, ds['left'] * 0.10)) if (ds['left'] is not None and os_['left'] is not None) else None
        app = {k: v for k, v in chk.items() if v is not None}
        miss = [k for k, v in app.items() if not v]
        verdict = '일치' if not miss else '근접' if (len(miss) <= 2 and chk['structure']) else '차이'
        row['ours'][o] = {**os_, **ok, 'check': chk, 'miss': miss, 'verdict': verdict, 'score': f"{len(app) - len(miss)}/{len(app)}"}
    for r in (row['designer'],) + tuple(row['ours'].values()): r.pop('boxes', None)
    rows.append(row)
json.dump(rows, open(a.out, 'w'), ensure_ascii=False, indent=1)
if a.md:
    names = [os.path.basename(o.rstrip('/')) for o in OURS]
    L = ['| 케이스 | 규격 | ' + ' | '.join(f'{n} 판정 · 어긋난 항목' for n in names) + ' | 디자이너 메인 | 우리 메인(마지막) |', '|---|---|' + '---|' * len(names) + '---|---|']
    for r in rows:
        cells = []
        for o in OURS:
            x = r['ours'].get(o)
            cells.append(f"{x['verdict']} {x['score']} · {', '.join(x['miss']) or '—'}" if x else '-')
        last = r['ours'].get(OURS[-1], {})
        L.append(f"| {r['case'].replace('t1014-', '')} | {r['spec']}{' ' + r['alt'] if r['alt'] else ''}{' (대리)' if r['proxy'] else ''} | " + ' | '.join(cells) + f" | {r['designer']['mainText'][:30]} | {last.get('mainText', '')[:30]} |")
    open(a.md, 'w').write('\n'.join(L) + '\n')
for o in OURS:
    c = {}
    for r in rows:
        if o in r['ours'] and not r['proxy']: c[r['ours'][o]['verdict']] = c.get(r['ours'][o]['verdict'], 0) + 1
    print(os.path.basename(o.rstrip('/')), c)
