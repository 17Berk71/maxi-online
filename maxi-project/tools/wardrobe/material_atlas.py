"""Build a photo-derived sleeve swatch; never infer sleeve prints or measured fabric.

Opt in only after reviewing that sleeves are plain. --clean-border-chroma is for
reviewed single-colour garments: it removes chromatic background leaks connected
to the cut edge, preserving interior graphics. Reports and source crops are kept.
"""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np


def clean_border_chroma(rgba):
    h, w = rgba.shape[:2]
    opaque = rgba[:, :, 3] >= 128
    lab = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_BGR2LAB).astype(float)
    centre = opaque.copy()
    centre[:int(h * .30)] = False
    centre[int(h * .70):] = False
    centre[:, :int(w * .35)] = False
    centre[:, int(w * .65):] = False
    samples = lab[centre, 1:]
    if len(samples) < 100:
        return rgba.copy(), 0
    ref = np.median(samples, axis=0)
    spread = np.median(np.linalg.norm(samples - ref, axis=1))
    chroma = np.linalg.norm(lab[:, :, 1:] - ref, axis=2)
    ref_l = np.median(lab[centre, 0])
    spread_l = np.median(np.abs(lab[centre, 0] - ref_l))
    yy, xx = np.mgrid[:h, :w]
    # Pale blue room/background against a dark hoodie: primarily a luminance
    # outlier. Protect the central fastening and upper collar/graphics.
    pale_edge = (lab[:, :, 0] > ref_l + max(50, spread_l * 6)) & (chroma > max(3, spread * 3)) & (yy > h*.4) & (np.abs(xx/w-.5) > .18)
    far = ((chroma > max(10, spread * 5)) | pale_edge) & opaque
    far = cv2.morphologyEx(far.astype('uint8'), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    edge = opaque & (cv2.erode(opaque.astype('uint8'), np.ones((5, 5), np.uint8), borderType=cv2.BORDER_CONSTANT, borderValue=0) == 0)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(far)
    removed = np.zeros_like(opaque)
    for k in range(1, count):
        comp = labels == k
        if stats[k, cv2.CC_STAT_AREA] < opaque.sum() * .0007:
            continue
        if (comp & edge).sum() >= 6 and (comp & edge).sum() / comp.sum() > .015:
            removed |= comp
    if removed.sum() > opaque.sum() * .12:
        raise ValueError('Ambiguous multicolour cutout: review its mask instead of removing fabric')
    out = rgba.copy()
    out[removed, 3] = 0
    return out, int(removed.sum())


def fabric_patch(rgba, anchor, width_m=.5, length_m=.65):
    h, w = rgba.shape[:2]
    cx, hw = anchor.get('cx', .5), anchor.get('hw', .28)
    pw, ph = max(12, round(w * hw * .30)), max(24, round(h * .14))
    lab = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_BGR2LAB).astype(float)
    ref = np.median(lab[int(h*.3):int(h*.7), int(w*(cx-hw*.3)):int(w*(cx+hw*.3))], axis=(0, 1))
    candidates = []
    for v in np.linspace(.36, .66, 9):
        for u in [cx - hw*.52, cx - hw*.34, cx + hw*.34, cx + hw*.52]:
            x, y = round(u*w-pw/2), round(v*h-ph/2)
            patch = rgba[y:y+ph, x:x+pw]
            if patch.shape[:2] != (ph, pw) or (patch[:, :, 3] >= 240).mean() < .999:
                continue
            colour = lab[y:y+ph, x:x+pw]
            low = cv2.GaussianBlur(colour[:, :, 0], (0, 0), max(3, pw*.18))
            score = low.std() + np.linalg.norm(colour[:, :, 1:] - ref[1:], axis=2).mean() * 2
            candidates.append((score, x, y))
    if not candidates:
        raise ValueError('No reliable plain-fabric region: supply a reviewed material crop')
    _, x, y = min(candidates)
    crop = rgba[y:y+ph, x:x+pw, :3].copy()
    # Separate broad photographic illumination from fine thread contrast.
    lum = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32) + 1
    broad = cv2.GaussianBlur(lum, (0, 0), max(4, pw*.20))
    factor = np.clip(np.median(broad) / broad, .80, 1.25)
    crop = np.clip(crop.astype(float) * factor[:, :, None], 0, 255).astype('uint8')
    top = np.concatenate([crop, crop[:, ::-1]], axis=1)
    tile = np.concatenate([top, top[::-1]], axis=0)
    return tile, dict(crop=[x, y, pw, ph], widthM=round(2*pw/w*width_m/(2*hw), 4),
                      heightM=round(2*ph/h*length_m, 4), scale='estimated',
                      source='front-cut-photo', sleeveDesign='reviewed-plain')


def prepare_pack(root, ids, clean=False):
    index = json.loads((root/'index.json').read_text())
    reports = []
    for item in index:
        if item['id'] not in ids:
            continue
        folder = root/item['id']
        removed = {}
        for side in ['front', 'back']:
            p = folder/f'{side}_cut.webp'
            rgba = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
            if clean:
                rgba, n = clean_border_chroma(rgba)
                removed[side] = n
                if n:
                    cv2.imwrite(str(p), rgba, [cv2.IMWRITE_WEBP_QUALITY, 96])
                    silhouette = item['drape'][side]
                    mask = cv2.resize((rgba[:, :, 3] >= 128).astype(np.float32),
                                      (silhouette['gw'], silhouette['gh']), interpolation=cv2.INTER_AREA) > .5
                    silhouette['grid'] = [''.join('1' if value else '0' for value in row) for row in mask]
        front = cv2.imread(str(folder/'front_cut.webp'), cv2.IMREAD_UNCHANGED)
        tile, spec = fabric_patch(front, item['drape']['front']['a'])
        cv2.imwrite(str(folder/'fabric.webp'), tile, [cv2.IMWRITE_WEBP_QUALITY, 96])
        item['materialTexture'] = dict(file='fabric.webp', **spec)
        digest = hashlib.sha256(b''.join((folder/f).read_bytes() for f in ['front_cut.webp', 'back_cut.webp', 'fabric.webp']))
        digest.update(json.dumps(spec, sort_keys=True).encode())
        item['assetRevision'] = 'stage15-' + digest.hexdigest()[:16]
        (folder/'meta.json').write_text(json.dumps(item, ensure_ascii=False, indent=2)+'\n')
        reports.append(dict(id=item['id'], removedBackgroundPixels=removed, materialTexture=item['materialTexture']))
    (root/'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n')
    return reports


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pack', type=Path)
    parser.add_argument('ids', nargs='+')
    parser.add_argument('--clean-border-chroma', action='store_true')
    args = parser.parse_args()
    print(json.dumps(prepare_pack(args.pack, args.ids, args.clean_border_chroma), ensure_ascii=False, indent=2))
