#!/usr/bin/env python3
"""나란히 비교 이미지 — 디자이너 Figma | 우리(전) | 우리(후) 처럼 칸마다 이름표를 단다.

  python3 scripts/figma/side-by-side.py --out <png> [--stack auto|h|v] [--crop x0,y0,x1,y1] [--thumb N] \
      "디자이너=frames/blind.png" "우리=ours/blind-post-banner.png" ["후=after/blind.png"]

- 칸 하나 = "이름=그림" 또는 "이름=a.png+b.png+c.png"(여러 장을 가로로 늘어놓은 한 칸, 디자이너 프레임 여러 장 등).
- --crop 은 맞춘 뒤의 첫 칸 좌표로 모든 한 장짜리 칸을 같은 영역으로 자른다(타이포 비교 크롭).
- 기준 크기 = 첫 '한 장짜리' 칸. 비율이 같으면(±3%) 그 크기로, 다르면 위아래 쌓기는 폭·좌우는 높이만 맞춘다.
- --stack auto: 기준 칸이 가로로 1.6배 이상 길면 위아래(v), 아니면 좌우(h).
- --max-w N: 결과 폭 상한(갤러리용으로 줄일 때).
- --thumb N: 여러 장 칸의 각 그림 긴 변 상한(기본 340).
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True); ap.add_argument('--stack', default='auto', choices=['auto', 'h', 'v'])
ap.add_argument('--crop', default=None); ap.add_argument('--thumb', type=int, default=340)
ap.add_argument('--gap', type=int, default=16); ap.add_argument('--max-w', type=int, default=0); ap.add_argument('panels', nargs='+')
a = ap.parse_args()

FONT = None
for f in ['/System/Library/Fonts/AppleSDGothicNeo.ttc', '/System/Library/Fonts/Supplemental/AppleGothic.ttf']:
    if os.path.exists(f):
        FONT = ImageFont.truetype(f, 18); break
LAB = 30
BG = (245, 245, 243)


def load(p):
    im = Image.open(p)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
    return im.convert('RGB')


panels = []
for spec in a.panels:
    if '=' not in spec: ap.error(f'"이름=그림" 형식이 아니다: {spec}')
    name, paths = spec.split('=', 1)
    panels.append((name, [p for p in paths.split('+') if p]))

singles = [ps[0] for _, ps in panels if len(ps) == 1]
RW, RH = load(singles[0]).size if singles else (0, 0)   # 기준 = 첫 한 장짜리 칸
stack = a.stack
if stack == 'auto': stack = 'v' if RW >= RH * 1.6 else 'h'
crop = tuple(int(v) for v in a.crop.split(',')) if a.crop else None
imgs = []
for name, paths in panels:
    if len(paths) == 1:
        im = load(paths[0])
        w, h = im.size
        if (w, h) != (RW, RH):
            if abs(w / h - RW / RH) < 0.03 * RW / RH: im = im.resize((RW, RH), Image.LANCZOS)   # 같은 규격, 배율만 다름
            elif stack == 'v': im = im.resize((RW, round(h * RW / w)), Image.LANCZOS)
            else: im = im.resize((round(w * RH / h), RH), Image.LANCZOS)
        if crop: im = im.crop(crop)
    else:
        parts = []
        for p in paths:
            t = load(p)
            if t.size[1] > 2.2 * t.size[0]: t = t.crop((0, 0, t.size[0], int(t.size[0] * 1.6)))   # 아주 긴 eDM 등은 윗부분만
            t.thumbnail((a.thumb, a.thumb)); parts.append(t)
        W = sum(t.size[0] for t in parts) + 10 * (len(parts) - 1); H = max(t.size[1] for t in parts)
        im = Image.new('RGB', (W, H), BG); x = 0
        for t in parts: im.paste(t, (x, 0)); x += t.size[0] + 10
    imgs.append((name, im))

if stack == 'h':
    W = sum(im.size[0] for _, im in imgs) + a.gap * (len(imgs) - 1); H = max(im.size[1] for _, im in imgs) + LAB
else:
    W = max(im.size[0] for _, im in imgs); H = sum(im.size[1] + LAB for _, im in imgs) + a.gap * (len(imgs) - 1)
cv = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(cv); x = y = 0
for name, im in imgs:
    d.text((x + 4, y + 5), name, fill=(20, 20, 20), font=FONT)
    cv.paste(im, (x, y + LAB))
    if stack == 'h': x += im.size[0] + a.gap
    else: y += im.size[1] + LAB + a.gap
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
if a.max_w and cv.size[0] > a.max_w: cv = cv.resize((a.max_w, round(cv.size[1] * a.max_w / cv.size[0])), Image.LANCZOS)
cv.save(a.out); print(a.out, cv.size)
