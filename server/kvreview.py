#!/usr/bin/env python3
"""누끼 검수용 비교 그림(11-10 저녁) — 원본 | 결과 위 남색 | 결과 위 주황 을 같은 크기로 나란히(칸 긴 변 640).
server/kvedit.js 가 Claude 검수에 넘긴다. 칸당 420px 미리보기로는 지워진 다리·남은 하늘 띠를 놓쳤다(실측).
  python3 server/kvreview.py <원본> <누끼 PNG> <출력 PNG>
"""
import sys
from PIL import Image, ImageDraw

src, cut, dst = sys.argv[1:4]
S = 640
a = Image.open(src).convert('RGBA'); b = Image.open(cut).convert('RGBA')
k = S / max(a.width, a.height); w, h = max(1, round(a.width * k)), max(1, round(a.height * k))
a = a.resize((w, h), Image.LANCZOS); b = b.resize((w, h), Image.LANCZOS)
pad, lab = 8, 22
sheet = Image.new('RGB', (w * 3 + pad * 4, h + pad * 2 + lab), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for i, (name, bg) in enumerate([('1 원본', None), ('2 결과 / 남색', (20, 24, 60)), ('3 결과 / 주황', (255, 140, 0))]):
    x = pad + i * (w + pad)
    if bg is None: tile = Image.new('RGBA', (w, h), (255, 255, 255, 255)); tile.alpha_composite(a)
    else: tile = Image.new('RGBA', (w, h), bg + (255,)); tile.alpha_composite(b)
    sheet.paste(tile.convert('RGB'), (x, pad + lab))
    d.text((x, pad), name.split(' ', 1)[0], fill=(0, 0, 0))
sheet.save(dst)
print(dst)
