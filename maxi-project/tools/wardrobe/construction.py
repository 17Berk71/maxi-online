"""Reviewed flat-photo landmarks -> estimated garment construction in cm."""
import math
import json
import hashlib
from pathlib import Path


def estimate_construction(recipe, width, height):
    def point(p):
        if len(p) != 2 or not all(math.isfinite(v) and 0 <= v <= 1 for v in p):
            raise ValueError('Landmarks must be normalized finite coordinates')
        return (p[0] * width, p[1] * height)

    def distance(pair):
        a, b = map(point, pair)
        return math.hypot(a[0] - b[0], a[1] - b[1])

    reference = recipe['reference_width_cm']
    span = distance(recipe['landmarks']['width'])
    if not math.isfinite(reference) or reference <= 0 or span < width * .1:
        raise ValueError('A valid measured width and visible reference span are required')
    scale = reference / span
    marks = recipe['landmarks']
    dims = {key: round(distance(marks[key]) * scale, 1) for key in ['len', 'shoulder', 'armDepth'] if key in marks}
    if marks.get('sleeves'):
        dims['sleeve'] = round(sum(distance(pair) for pair in marks['sleeves']) / len(marks['sleeves']) * scale, 1)
    return {'units': 'cm', 'estimated': True, 'source_method': 'reviewed-flat-landmarks',
            'reference_width_cm': reference, 'dimensions': dims,
            'uncertainty_cm': recipe.get('uncertainty_cm', {}),
            'limitations': ['Photo plane and landmark positions are approximate; these are not tape measurements.',
                            'Construction applies only to the captured garment size.']}


def attach_construction(meta, recipe_path):
    import numpy as np
    from PIL import Image
    recipe_path = Path(recipe_path)
    if not recipe_path.exists():
        return meta
    recipe = json.loads(recipe_path.read_text())
    source = Path(recipe['source'])
    if not source.is_file():
        matches = list((recipe_path.parent / 'raw').glob(recipe['source'] + '*'))
        if len(matches) != 1:
            raise ValueError('Landmark source must resolve to exactly one photograph')
        source = matches[0]
    with Image.open(source) as photo:
        image = np.asarray(photo.convert('RGB'))
    # Match photo_io.load's black-border crop and maximum-height resize.
    rows = np.where(image.max(axis=(1, 2)) > 18)[0]
    if not len(rows):
        raise ValueError('Photograph is empty')
    h, w = int(rows[-1] - rows[0] + 1), image.shape[1]
    if h > 1400:
        w, h = int(w * 1400 / h), 1400
    construction = estimate_construction(recipe, w, h)
    construction.update(source_photo='raw/' + source.name,
                        source_sha256=hashlib.sha256(source.read_bytes()).hexdigest())
    meta['shape']['construction'] = construction
    return meta
