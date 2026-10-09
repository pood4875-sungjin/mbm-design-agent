#!/usr/bin/env python3
"""Figma MCP 에셋 내려받기·정리.

  python3 scripts/figma/assets.py fetch <폴더> <url|uuid> ...        원본 그림(rawImages) — 파일명 = 바이트 SHA-1 = Figma imageHash
  python3 scripts/figma/assets.py fetch <폴더> --named <목록.txt>    "이름 url|uuid" 줄마다 → <이름>.png (프레임 스크린샷·export)
  python3 scripts/figma/assets.py b64 <base64 파일|-> <out.png>      use_figma exportAsync 결과(base64)를 PNG로
  python3 scripts/figma/assets.py check <png> ...                    크기·모드·알파 범위·투명 비율

- download_assets 의 rawImages[].url 과 get_screenshot 의 image_url 은 https://www.figma.com/api/mcp/asset/<uuid>[.png] 다.
  uuid 만 줘도 된다. 받은 바이트의 SHA-1 이 곧 Plugin API 의 imageHash 라서, use_figma 로 찾은 해시 접두어로 파일을 짝짓는다.
- download_assets 의 export(노드 렌더)는 흰 바탕이 깔려 알파가 없다(로고가 흰 사각형이 된다). 투명 로고·누끼 렌더는
  use_figma 에서 node.exportAsync({format:'PNG', constraint:{type:'SCALE', value:4}}) → figma.base64Encode → b64 로 받는다.
- 에셋 URL 은 잠시 뒤 만료된다. 받은 즉시 내려받는다.
"""
import base64, hashlib, os, subprocess, sys
from PIL import Image

BASE = 'https://www.figma.com/api/mcp/asset/'


def url_of(s):
    return s if s.startswith('http') else BASE + s


def curl(url, dst):
    subprocess.run(['curl', '-sfL', '-o', dst, url], check=True)


def info(p):
    im = Image.open(p); mode = im.mode
    r = f'{im.size[0]}x{im.size[1]} {im.format} {mode}'
    if mode in ('RGBA', 'LA', 'P'):
        a = im.convert('RGBA').getchannel('A'); lo, hi = a.getextrema()
        h = a.histogram(); n = im.size[0] * im.size[1]
        r += f' 알파 {lo}~{hi} 투명 {round(sum(h[:11]) / n * 100)}%'
    return r


def fetch(dest, items, named=None):
    os.makedirs(dest, exist_ok=True)
    if named:
        for line in open(named):
            if not line.strip() or line.startswith('#'): continue
            name, u = line.split()[:2]
            out = os.path.join(dest, name if '.' in name else name + '.png')
            curl(url_of(u if u.startswith('http') or u.endswith('.png') else u + '.png'), out)
            print(name, info(out))
        return
    for u in items:
        tmp = os.path.join(dest, '_dl.tmp'); curl(url_of(u), tmp)
        h = hashlib.sha1(open(tmp, 'rb').read()).hexdigest()
        ext = {'PNG': '.png', 'JPEG': '.jpg', 'GIF': '.gif', 'WEBP': '.webp'}.get(Image.open(tmp).format, '.bin')
        out = os.path.join(dest, h + ext); os.replace(tmp, out)
        print(h[:12], info(out))


def b64(src, out):
    data = sys.stdin.read() if src == '-' else open(src).read()
    data = data.strip().strip('"')
    if data.startswith('{'):   # use_figma 결과 JSON 을 통째로 넣은 경우 {"b64": "..."}
        import json; data = json.loads(data).get('b64', '')
    open(out, 'wb').write(base64.b64decode(data)); print(out, info(out))


if __name__ == '__main__':
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    cmd = sys.argv[1]
    if cmd == 'fetch':
        args = sys.argv[3:]
        if '--named' in args: fetch(sys.argv[2], [], named=args[args.index('--named') + 1])
        else: fetch(sys.argv[2], args)
    elif cmd == 'b64': b64(sys.argv[2], sys.argv[3])
    elif cmd == 'check':
        for p in sys.argv[2:]: print(os.path.basename(p), info(p))
    else: print(__doc__); sys.exit(1)
