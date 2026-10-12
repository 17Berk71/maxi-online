// Photo-derived construction belongs to the captured garment size, not the body.
// Explicit catalogue measurements take precedence in the calling code.
export function constructionCm(item, cm) {
  const c = item.shape && item.shape.construction;
  if (!c || c.units !== 'cm' || !c.dimensions) return {};
  if (cm.chest && c.reference_width_cm && Math.abs(cm.chest - c.reference_width_cm) > 0.01) return {};
  const out = {};
  for (const key of ['len', 'shoulder', 'sleeve', 'armDepth']) {
    const value = c.dimensions[key];
    if (Number.isFinite(value) && value > 0) out[key] = value;
  }
  return out;
}
