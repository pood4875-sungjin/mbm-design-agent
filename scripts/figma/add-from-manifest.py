#!/usr/bin/env python3
"""staging 폴더(manifest.json)의 KV 를 케이스 장부에 넣는다 — `node scripts/cases.mjs add` 를 건마다 부른다.
렌더·검수는 하지 않는다. 넣은 뒤 `node scripts/cases.mjs run <id…> --shots --round "…"` 로 돌린다(마지막 줄에 명령을 찍어 준다).

  python3 scripts/figma/add-from-manifest.py <staging 폴더> [--only id1,id2] [--fields client|full] [--note-prefix figma-dg] [--dry-run]

- --fields client (기본): cases.mjs 기본 채용 필드(한진정보통신…)에 client 만 manifest 값으로 바꾼다.
  디자이너 소재가 세미나·제품 마케팅이어도 recruit 맥락으로 렌더하기 때문이다(10-08 밤 Design-Generator 정책).
- --fields full: manifest fields 를 기본 필드 위에 그대로 덮는다(실카피 비교 — 9월 공채처럼 채용 소재일 때).
- primary 가 있으면 --primary 로 넘긴다. 없으면 cases.mjs 가 KV 대표색을 쓴다(누끼는 회색 반사광이 브랜드색이 될 수 있다 — 보고서에 적는다).
- 장부에 이미 있는 id 면 건너뛰고 알린다(덮어쓰려면 장부에서 먼저 지운다).
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEF = {"client": "한진정보통신", "role": "클라우드 플랫폼 엔지니어", "employType": "정규직", "location": "서울 여의도", "deadline": "2026-10-31", "applyUrl": "https://hanjin.example"}
a = sys.argv[1:]
if not a: print(__doc__); sys.exit(1)
D = os.path.abspath(a[0]); dry = '--dry-run' in a
o = lambda k, d=None: a[a.index(k) + 1] if k in a else d
only = set(o('--only', '').split(',')) - {''}
mode = o('--fields', 'client'); prefix = o('--note-prefix', os.path.basename(D))
man = json.load(open(os.path.join(D, 'manifest.json')))
ledger = json.load(open(os.path.join(ROOT, 'ref/learned/cases/cases.json')))
have = {c['id'] for c in ledger['cases']}
added = []
for e in man:
    if only and e['id'] not in only: continue
    if e['id'] in have: print('건너뜀(이미 장부에 있음):', e['id']); continue
    cmd = ['node', 'scripts/cases.mjs', 'add', os.path.join(D, e['file']), '--id', e['id'],
           '--note', f"{prefix} · {e.get('kind')} · {(e.get('source') or {}).get('page', '')}"]
    if e.get('logo') and os.path.exists(os.path.join(D, e['logo'])): cmd += ['--logo', os.path.join(D, e['logo'])]
    if e.get('primary'): cmd += ['--primary', e['primary']]
    f = e.get('fields') or {}
    if mode == 'full': cmd += ['--fields', json.dumps({**DEF, **{k: v for k, v in f.items() if v is not None}}, ensure_ascii=False)]
    elif f.get('client'): cmd += ['--fields', json.dumps({**DEF, 'client': f['client']}, ensure_ascii=False)]
    if dry: print(' '.join(json.dumps(x, ensure_ascii=False) if ' ' in x or '{' in x else x for x in cmd)); added.append(e['id']); continue
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    print(f"{(e.get('kind') or ''):8s} {r.stdout.strip()} {r.stderr.strip()[-200:]}")
    if r.returncode == 0: added.append(e['id'])
print(f"\n{'(dry-run) ' if dry else ''}{len(added)}건. 다음:\n  node scripts/cases.mjs run {' '.join(added)} --shots --round \"{prefix} {len(added)}건 접수 (규칙 변경 전)\"")
