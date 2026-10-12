"""Apply reviewed construction without recompressing existing image assets."""
import json
import sys
from pathlib import Path
from construction import attach_construction

root = Path(__file__).parent / 'out'
index = json.loads((root / 'index.json').read_text())
for ident in sys.argv[1:]:
    item_path = root / ident / 'meta.json'
    meta = attach_construction(json.loads(item_path.read_text()), Path(__file__).parent / (ident + '-landmarks.json'))
    item_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
    index = [meta if it['id'] == ident else it for it in index]
    print(ident, meta['shape'].get('construction', {}).get('dimensions'))
(root / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
