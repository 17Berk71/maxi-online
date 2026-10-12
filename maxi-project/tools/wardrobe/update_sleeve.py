"""Apply reviewed sleeve finish settings without touching image assets."""
import json
import sys
from pathlib import Path

root = Path(__file__).parent
index_path = root / 'out' / 'index.json'
index = json.loads(index_path.read_text())
for ident in sys.argv[1:]:
    if ident not in {item['id'] for item in index}:
        raise ValueError('Unknown garment: ' + ident)
    recipe = json.loads((root / (ident + '-capture.json')).read_text())
    path = root / 'out' / ident / 'meta.json'
    meta = json.loads(path.read_text())
    if recipe.get('sleeve_finish') == 'relax-v1':
        meta['shape']['sleeveFinish'] = 'relax-v1'
    else:
        meta['shape'].pop('sleeveFinish', None)
    path.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
    index = [meta if item['id'] == ident else item for item in index]
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
