#!/usr/bin/env python3
"""Inventory local private inputs without rebuilding or changing garment packages."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy


def inventory(root):
    items = runpy.run_path(str(root / 'items.py'))['ITEMS']
    raw = root / 'raw'
    packages = root / 'out'
    index = json.loads((packages / 'index.json').read_text())
    indexed = {item['id']: item for item in index}
    rows, warnings, referenced = [], [], set()
    for item in items:
        refs = {}
        keys = {'front': item['front'], 'back': item['back']}
        if item.get('flat'):
            keys['flat'] = item['flat']
        keys.update({f'worn:{n}': key for n, key in enumerate(item.get('worn', []))})
        keys.update({f'state:{state}': key for state, key in item.get('worn_states', {}).items()})
        for role, key in keys.items():
            matches = sorted(raw.glob(key + '*'))
            refs[role] = [p.name for p in matches]
            referenced.update(p.name for p in matches)
            if len(matches) != 1:
                warnings.append({'id': item['id'], 'role': role, 'key': key, 'matches': len(matches)})
        meta_file = packages / item['id'] / 'meta.json'
        meta = json.loads(meta_file.read_text()) if meta_file.exists() else None
        if meta != indexed.get(item['id']):
            warnings.append({'id': item['id'], 'issue': 'index/meta mismatch'})
        folder = packages / (meta.get('files', item['id']) if meta else item['id'])
        required = ['front.webp', 'back.webp', 'front_cut.webp', 'back_cut.webp']
        if meta and meta.get('sleeve'):
            required.append('sleeve.webp')
        missing = [name for name in required if not (folder / name).is_file()]
        if missing:
            warnings.append({'id': item['id'], 'missing_assets': missing})
        a, b = folder / 'front.webp', folder / 'back.webp'
        rows.append({'id': item['id'], 'name': item['name'], 'kind': item['kind'],
                     'photos': refs, 'input_cm': item.get('cm', {}),
                     'sizes': item.get('sizes', []), 'note': item.get('note', ''),
                     'identical_front_back': a.is_file() and b.is_file() and a.read_bytes() == b.read_bytes()})
    files = [{'path': p.name, 'bytes': p.stat().st_size,
              'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(raw.iterdir()) if p.is_file()]
    return {'schema_version': 1, 'raw_count': len(files), 'item_count': len(rows),
            'files': files, 'items': rows, 'unassigned_photos': sorted(set(f['path'] for f in files) - referenced),
            'warnings': warnings}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    output = args.output or root / 'out' / 'inventory.json'
    result = inventory(root)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"{result['item_count']} items, {result['raw_count']} photos, {len(result['warnings'])} warnings → {output}")
