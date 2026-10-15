"""Build a small CC0-only browser asset from pinned MakeHuman data (no application code).

Usage: python tools/body/build-makehuman.py /path/to/downloaded-source
Required files: base.obj, male.target, female.target, weights.json, LICENSE.ASSETS.md.
The corresponding upstream paths and hashes are saved in provenance.json.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1])
OUT = ROOT / 'src/shop/fitting/assets/makehuman'
OUT.mkdir(parents=True, exist_ok=True)
vertices, groups, group = [], {}, ''
for line in (SRC / 'base.obj').read_text().splitlines():
    fields = line.split()
    if not fields:
        continue
    if fields[0] == 'v':
        vertices.append(list(map(float, fields[1:])))
    elif fields[0] == 'g':
        group = fields[1]
        groups[group] = []
    elif fields[0] == 'f':
        groups[group].append([int(x.split('/')[0]) - 1 for x in fields[1:]])
ids = sorted({v for face in groups['body'] for v in face})
remap = {v: i for i, v in enumerate(ids)}
triangles = []
for face in groups['body']:
    for i in range(1, len(face) - 1):
        triangles.extend(remap[v] for v in [face[0], face[i], face[i + 1]])
weights = json.loads((SRC / 'weights.json').read_text())
assert weights['license'] == 'CC0'
# Collapse native weights into rigid segment influences. Shoulder transitions retain
# their original weighted blend; topology is never split into separate body parts.
parts = ['upperarm', 'lowerarm', 'hand', 'upperleg', 'lowerleg', 'foot']
skin = [[0.0] * 12 for _ in ids]
for bone, rows in weights['weights'].items():
    if not bone.endswith(('.L', '.R')):
        continue
    name = bone[:-2]
    part = next((i for i, p in enumerate(parts) if name.startswith(p)), None)
    if name.startswith(('finger', 'metacarpal', 'wrist')):
        part = 2
    if name.startswith('toe'):
        part = 5
    if name.startswith('shoulder'):
        part = 0
    if part is None:
        continue
    k = part + (0 if bone.endswith('.L') else 6)
    for v, w in rows:
        if v in remap:
            skin[remap[v]][k] += w
for row in skin:
    total = sum(row)
    if total > 1:
        for i in range(12):
            row[i] /= total
models = {}
for sex in ['male', 'female']:
    coords = [v[:] for v in vertices]
    for line in (SRC / (sex + '.target')).read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        fields = line.split()
        i = int(fields[0])
        for j in range(3):
            coords[i][j] += float(fields[j + 1])
    joints = {}
    for side in ['l', 'r']:
        for name in ['shoulder', 'elbow', 'hand', 'upper-leg', 'knee', 'ankle']:
            js = sorted({v for face in groups['joint-' + side + '-' + name] for v in face})
            joints[side + '-' + name] = [sum(coords[v][j] for v in js) / len(js) for j in range(3)]
    low = min(coords[v][1] for v in ids)
    high = max(coords[v][1] for v in ids)
    models[sex[0]] = {'positions': [round(c, 5) for v in ids for c in coords[v]],
                      'joints': joints, 'low': low, 'high': high}
data = {'version': 1, 'models': models, 'index': triangles,
        'skin': [round(w, 4) for row in skin for w in row]}
(OUT / 'body-data.js').write_text('export default ' + json.dumps(data, separators=(',', ':')) + ';\n')
(OUT / 'LICENSE.CC0.txt').write_text((SRC / 'LICENSE.ASSETS.md').read_text())
upstream = {
    'base.obj': 'makehuman/data/3dobjs/base.obj',
    'male.target': 'makehuman/data/targets/macrodetails/caucasian-male-young.target',
    'female.target': 'makehuman/data/targets/macrodetails/caucasian-female-young.target',
    'weights.json': 'makehuman/data/rigs/default_weights.mhw',
    'LICENSE.ASSETS.md': 'LICENSE.ASSETS.md',
}
provenance = {'repository': 'https://github.com/makehumancommunity/makehuman',
              'commit': 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482', 'license': 'CC0-1.0',
              'sourceFiles': [{'path': path, 'sha256': hashlib.sha256((SRC / name).read_bytes()).hexdigest()}
                              for name, path in upstream.items()],
              'assetSha256': hashlib.sha256((OUT / 'body-data.js').read_bytes()).hexdigest(),
              'vertices': len(ids), 'triangles': len(triangles) // 3,
              'notes': 'Adult male/female reference shapes; body group only. Helpers removed. '
                       'No MakeHuman application code. Limited custom measurement deformation, not a body scan.'}
(OUT / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
print(json.dumps({'vertices': len(ids), 'triangles': len(triangles) // 3,
                  'bytes': (OUT / 'body-data.js').stat().st_size}))
