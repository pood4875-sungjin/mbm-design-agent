#!/usr/bin/env python3
"""로고 파일(svg·ico·gif·webp·jpg·png) → 투명 여백을 잘라낸 PNG. 10-09 데스크탑 로고 200개 변환 스크립트를 인자형으로 옮긴 것(.claude/skills/logo-prep).

  python3 scripts/logo-prep.py <파일|폴더> <출력폴더> [옵션]
    --csv <index.csv>     기업명·로고파일 표(데스크탑>로고 형식). 주면 출력 이름 = 기업명, 보고에 주요색을 붙인다
    --only 기업A,기업B    표에서 이 회사들만
    --knockout            단색 바탕 지우기 + 트림까지(core/logo.js prepLogoRGBA — 앱·케이스 장부와 같은 규칙. node 필요)
    --sheet <png>         결과 접촉 시트(밝은·어두운 칸 두 줄, 눈 검수용)

- svg: 헤드리스 Chrome 으로 높이 400px 에 그려 투명 PNG 로 찍는다(PIL 은 svg 를 못 연다).
- ico: 들어 있는 크기 중 가장 큰 것. gif·webp: 첫 프레임. jpg: 그대로(흰 바탕은 --knockout 이나 cases.mjs add 가 지운다).
- 결과 보고 `<출력>/_conv.json`: 파일별 [w,h] 또는 실패 사유. 8px 미만·완전 투명은 'empty'.
- 파일 이름의 한글은 NFC 로 맞춘다(macOS 파일 이름은 NFD 라 CSV 와 그대로 비교하면 어긋난다).
"""
import os, sys, json, csv, subprocess, tempfile, argparse, unicodedata, urllib.parse
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
NFC = lambda s: unicodedata.normalize('NFC', s)
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--csv'); ap.add_argument('--only'); ap.add_argument('--knockout', action='store_true'); ap.add_argument('--sheet')
o = ap.parse_args()
OUT = os.path.abspath(o.out); os.makedirs(OUT, exist_ok=True)

# 입력 목록: (원본 경로, 출력 이름, 표 행)
srcdir = o.src if os.path.isdir(o.src) else os.path.dirname(os.path.abspath(o.src))
files = {NFC(f): os.path.join(srcdir, f) for f in os.listdir(srcdir) if not f.startswith('.')}
jobs = []
if o.csv:
    only = set(NFC(x.strip()) for x in o.only.split(',')) if o.only else None
    for r in csv.DictReader(open(o.csv, encoding='utf-8-sig')):
        co = NFC(r['기업명']); lf = NFC(r['로고파일'])
        if only and co not in only: continue
        jobs.append((files.get(lf), co, r, lf))
elif os.path.isdir(o.src):
    jobs = [(p, os.path.splitext(n)[0], None, n) for n, p in sorted(files.items())]
else:
    n = NFC(os.path.basename(o.src)); jobs = [(o.src, os.path.splitext(n)[0], None, n)]

def trim(im):
    im = im.convert('RGBA'); bb = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(bb) if bb else None

def svg_png(p):
    td = tempfile.mkdtemp(); html = os.path.join(td, 't.html'); shot = os.path.join(td, 't.png')
    open(html, 'w').write(f'<html><body style="margin:0;background:transparent"><img src="file://{urllib.parse.quote(os.path.abspath(p))}" '
                          'style="height:400px;max-width:1550px;object-fit:contain;display:block;margin:20px"></body></html>')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                    '--default-background-color=00000000', '--window-size=1600,450', '--screenshot=' + shot, 'file://' + html],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
    return Image.open(shot)

def knockout(im):
    """core/logo.js prepLogoRGBA 를 node 로 — 앱과 같은 바탕 지우기·트림"""
    im = im.convert('RGBA'); W, H = im.size
    js = ("import { prepLogoRGBA } from " + json.dumps('file://' + os.path.join(ROOT, 'core/logo.js')) + ";"
          "const c=[];for await (const x of process.stdin) c.push(x);const b=Buffer.concat(c);"
          f"const r=prepLogoRGBA(new Uint8ClampedArray(b.buffer,b.byteOffset,b.length),{W},{H});"
          "process.stderr.write(JSON.stringify({w:r.w,h:r.h,note:r.note,tone:r.meta.tone}));process.stdout.write(Buffer.from(r.rgba.buffer,r.rgba.byteOffset,r.rgba.byteLength));")
    p = subprocess.run(['node', '--input-type=module', '-e', js], input=im.tobytes(), capture_output=True)
    if p.returncode: raise RuntimeError(p.stderr.decode()[-200:])
    info = json.loads(p.stderr.decode().strip().splitlines()[-1])
    return Image.frombytes('RGBA', (info['w'], info['h']), p.stdout), info

res = {}
for p, name, row, lf in jobs:
    key = name
    if not p: res[key] = 'ERR 표에 있는 파일이 폴더에 없음(' + (lf or '빈칸') + ')'; continue
    ext = os.path.splitext(p)[1].lower(); dst = os.path.join(OUT, name.replace('/', '_') + '.png')   # 「세아베스틸/세아창원특수강」처럼 이름에 / 가 있다
    try:
        if ext == '.svg': im = svg_png(p)
        elif ext == '.ico':
            im = Image.open(p); sizes = im.info.get('sizes') or [im.size]
            try: im = im.ico.getimage(max(sizes, key=lambda s: s[0] * s[1]))
            except Exception: im = Image.open(p)
        else:
            im = Image.open(p)
            if getattr(im, 'n_frames', 1) > 1: im.seek(0)
        t = trim(im)
        if t is None or t.size[0] < 8 or t.size[1] < 8: res[key] = 'empty'; continue
        entry = {'size': list(t.size), 'from': ext[1:]}
        if o.knockout:
            t, info = knockout(t); entry.update(size=[info['w'], info['h']], note=info['note'], tone=info['tone'])
        if row: entry['primary'] = (row.get('주요색hex 리스트') or '').split(';')[0] or None
        if max(entry['size']) < 120: entry['warn'] = '작음(긴 변 < 120px — 파비콘급, 큰 규격에서 흐림)'
        t.save(dst); res[key] = entry
    except Exception as e:
        res[key] = 'ERR ' + str(e)[:80]
json.dump(res, open(os.path.join(OUT, '_conv.json'), 'w'), ensure_ascii=False, indent=1)

ok = {k: v for k, v in res.items() if isinstance(v, dict)}
bad = {k: v for k, v in res.items() if not isinstance(v, dict)}
small = [k for k, v in ok.items() if v.get('warn')]
from collections import Counter
print(f"ok {len(ok)} / {len(res)} · 형식 {dict(Counter(v['from'] for v in ok.values()))} · 작음 {len(small)}")
for k, v in bad.items(): print('  실패', k, v)
if o.sheet and ok:
    C, R = 8, (len(ok) + 7) // 8; cw, ch = 200, 70
    sh = Image.new('RGB', (C * cw, R * ch * 2), '#ffffff')
    for i, k in enumerate(ok):
        im = Image.open(os.path.join(OUT, k.replace('/', '_') + '.png')).convert('RGBA'); im.thumbnail((cw - 20, ch - 16))
        x, y = (i % C) * cw, (i // C) * ch * 2
        for j, bgc in enumerate(['#f2f2f2', '#1d2433']):
            bg = Image.new('RGBA', (cw, ch), bgc); bg.alpha_composite(im, ((cw - im.width) // 2, (ch - im.height) // 2)); sh.paste(bg.convert('RGB'), (x, y + j * ch))
    sh.save(o.sheet); print('sheet', o.sheet)
