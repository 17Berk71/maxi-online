"""Opt-in capture cleanup for solid-colour pilot garments; never changes source files."""
import cv2
import numpy as np


def remove_measurement_tape(im, rect):
    """Remove orange tape only inside an explicitly reviewed normalized rectangle.

    A rectangle is required: an orange print anywhere else is left intact.
    Returns the derived image and the removal mask for inspection.
    """
    h, w = im.shape[:2]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    mask = np.zeros((h, w), np.uint8)
    x0, y0, x1, y1 = [max(0, min(1, float(v))) for v in rect]
    region = np.zeros_like(mask); region[int(y0*h):int(y1*h), int(x0*w):int(x1*w)] = 1
    orange = (hsv[..., 0] >= 3) & (hsv[..., 0] <= 28) & (hsv[..., 1] > 100) & (hsv[..., 2] > 95)
    mask[orange & (region > 0)] = 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    # Fill black tick marks/letters inside the detected strip, then reconstruct
    # this occluded region from neighbouring cloth rows. Plain fabric only.
    for x in range(w):
        ys = np.where(mask[:, x] > 0)[0]
        if len(ys): mask[ys[0]:ys[-1]+1, x] = 255
    mask = cv2.dilate(mask, np.ones((15, 15), np.uint8))
    mask[region == 0] = 0
    out = im.copy()
    for x in range(w):
        ys = np.where(mask[:, x] > 0)[0]
        if not len(ys): continue
        a, b = int(ys[0]), int(ys[-1])
        above = np.median(im[max(0,a-9):max(1,a-3),x], axis=0)
        below = np.median(im[min(h-1,b+4):min(h,b+10),x], axis=0)
        t = np.linspace(0,1,b-a+1)[:,None]
        out[a:b+1,x] = ((1-t)*above+t*below).clip(0,255).astype(np.uint8)
    return out, mask



def neutralize_surface(im, mask, reduction=.72, detail=.8):
    """Reduce captured broad/mid-frequency lighting, keep colour and fine detail.

    This is a controlled approximation for explicitly tagged plain fabric,
    not recovery of physical albedo. Never enable automatically by category.
    Seams retain high-frequency contrast; prints/patterns require another path.
    """
    rgb = im.astype(np.float32) / 255
    luma = .0722*rgb[..., 0] + .7152*rgb[..., 1] + .2126*rgb[..., 2]
    inside = mask > 0
    if inside.sum() < 100: return im.copy()
    log_l = np.log(np.maximum(luma, .015))
    # Extend cloth at the silhouette before filtering so carpet/white paper
    # cannot affect the inferred illumination along the garment edge.
    filled = cv2.inpaint((np.clip(luma, 0, 1)*255).astype(np.uint8), (~inside).astype(np.uint8)*255, 7, cv2.INPAINT_TELEA).astype(np.float32)/255
    low = cv2.GaussianBlur(np.log(np.maximum(filled, .015)), (0, 0), max(4, im.shape[0]*.016))
    fine = log_l - cv2.GaussianBlur(log_l, (0, 0), 2)
    middle = log_l - low - fine
    target = float(np.median(low[inside]))
    corrected = log_l + np.clip(reduction, 0, .85)*(target-low-middle) + (np.clip(detail, .5, 1)-1)*fine
    gain = np.exp(corrected-log_l)
    # Limit amplification of dark seam/occlusion pixels. No invented detail.
    gain = np.clip(gain, .55, 1.8)
    out = np.clip(rgb * gain[..., None]*255, 0, 255).astype(np.uint8)
    out[~inside] = im[~inside]
    return out


def repair_regions(im, rectangles):
    """Reviewed capture-only occluders (e.g. inside-neck label); preserve originals."""
    h,w=im.shape[:2]; mask=np.zeros((h,w),np.uint8)
    for x0,y0,x1,y1 in rectangles:
        mask[int(y0*h):int(y1*h),int(x0*w):int(x1*w)]=255
    return cv2.inpaint(im,mask,7,cv2.INPAINT_TELEA)


def align_fabric_chroma(im, mask, reference=None, strength=.65):
    """Match near-neutral fabric hue across captures while retaining luminance.

    Opt-in for the solid pilots. Colourful outliers such as hardware are exempt.
    This is consistency between photos, not calibrated colour measurement.
    """
    rgb=im.astype(np.float32)+1
    lum=.0722*rgb[...,0]+.7152*rgb[...,1]+.2126*rgb[...,2]
    chroma=rgb/lum[...,None]
    ref=np.median(chroma[mask>0],axis=0) if reference is None else reference
    near=np.linalg.norm(chroma-ref,axis=2)<.5
    use=(mask>0)&near
    out=im.copy(); corrected=lum[...,None]*(chroma*(1-strength)+ref*strength)-1
    out[use]=corrected[use].clip(0,255).astype(np.uint8)
    return out,ref
