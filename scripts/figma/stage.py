#!/usr/bin/env python3
"""Figma 에서 고른 KV 후보를 staging 폴더로 모으고 manifest.json 을 쓴다(접수 전 단계 — cases.mjs 는 돌리지 않는다).

  python3 scripts/figma/stage.py <candidates.json> [--out ref/learned/cases/_staging/<이름>] [--dry-run]

candidates.json:
{
  "out": "ref/learned/cases/_staging/figma-dg",          (--out 이 우선)
  "raw": "<원본 폴더 — assets.py fetch 결과, 파일명 = imageHash>",
  "frames": "<디자이너 프레임 스크린샷 폴더 — 파일명 = nodeId 의 ':'→'-' + .png>",
  "logos": { "hdot": "<투명 로고 png>" },
  "frameInfo": { "446:440840": [641, 460, "Banner_641x460"], ... },    (선택 — 프레임 크기·이름)
  "candidates": [
    { "id": "hdot-wave", "hash": "14beb9d8", "kind": "cutout|photo|illust|texture",
      "page": "페이지 이름", "nodeId": "KV 노드 id", "frames": ["446:440840", ...],
      "logo": "hdot" | null, "primary": "#2878D8" | null,
      "fields": { "client": "에이치닷", ... }, "note": "무엇이고 어디에 쓰였나" } ]
}

출력(<out>/):
  <id>.png            원본(JPEG 은 PNG 로 다시 저장 — 무손실 컨테이너)
  <id>.logo.png       로고(있을 때) — cases.mjs intake 가 같은 이름 그림의 로고로 붙인다
  frames/<id>/<nodeId>.png   디자이너 프레임(비교용)
  manifest.json       [{id, file, logo, source{page, frameIds, nodeId, imageHash}, kind, note, primary, fields, designerFrames[{nodeId,w,h,name}], size, alpha}]
"""
import glob, json, os, shutil, sys
from PIL import Image

args = sys.argv[1:]
if not args: print(__doc__); sys.exit(1)
C = json.load(open(args[0]))
out = args[args.index('--out') + 1] if '--out' in args else C.get('out')
dry = '--dry-run' in args
if not out: sys.exit('--out 또는 candidates.json 의 "out" 이 필요하다')
base = os.path.dirname(os.path.abspath(args[0]))
rel = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
RAW, FR = rel(C['raw']), rel(C.get('frames', 'frames'))
FI = C.get('frameInfo', {})
ids = [c['id'] for c in C['candidates']]
if len(ids) != len(set(ids)): sys.exit('id 가 겹친다: ' + ', '.join(sorted({i for i in ids if ids.count(i) > 1})))

man, problems = [], []
if not dry: os.makedirs(out, exist_ok=True)
for c in C['candidates']:
    hits = glob.glob(os.path.join(RAW, c['hash'] + '*'))
    if len(hits) != 1: problems.append(f"{c['id']}: 해시 {c['hash']} 원본 {len(hits)}개"); continue
    src = hits[0]; im = Image.open(src)
    full = os.path.basename(src).split('.')[0]
    logo = None
    if c.get('logo'):
        lp = rel(C['logos'][c['logo']]); logo = f"{c['id']}.logo.png"
        if not dry: shutil.copyfile(lp, os.path.join(out, logo))
    dfs = []
    for fid in c.get('frames', []):
        fp = os.path.join(FR, fid.replace(':', '-') + '.png')
        if not os.path.exists(fp): problems.append(f"{c['id']}: 프레임 스크린샷 없음 {fid}"); continue
        w, h, name = (FI.get(fid) or [*Image.open(fp).size, ''])[:3]
        dfs.append({'nodeId': fid, 'w': w, 'h': h, 'name': name})
        if not dry:
            os.makedirs(os.path.join(out, 'frames', c['id']), exist_ok=True)
            shutil.copyfile(fp, os.path.join(out, 'frames', c['id'], os.path.basename(fp)))
    if not dry:
        dst = os.path.join(out, c['id'] + '.png')
        if im.format == 'PNG': shutil.copyfile(src, dst)
        else: im.save(dst)
    man.append({'id': c['id'], 'file': c['id'] + '.png', 'logo': logo,
                'source': {'page': c.get('page'), 'frameIds': c.get('frames', []), 'nodeId': c.get('nodeId'), 'imageHash': full},
                'kind': c.get('kind'), 'note': c.get('note', ''), 'primary': c.get('primary'), 'fields': c.get('fields'),
                'designerFrames': dfs, 'size': list(im.size), 'alpha': im.mode in ('RGBA', 'LA')})
    print(f"{c['id']:22s} {c.get('kind') or '':8s} {im.size[0]}x{im.size[1]} {'A' if im.mode in ('RGBA','LA') else '-'} 프레임 {len(dfs)} 로고 {'Y' if logo else 'N'} {c.get('primary') or ''}")
if not dry: json.dump(man, open(os.path.join(out, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print(f"{'(dry-run) ' if dry else ''}{len(man)}건 → {out}")
for p in problems: print('!', p)
if problems: sys.exit(2)
