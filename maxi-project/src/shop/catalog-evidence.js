// PRD FR-CAT-002/004, FR-DATA-004: explicit provenance and stock evidence.
// Pure functions, usable in browser and Node tests. Missing evidence is never stock confirmation.
export const AVAILABILITY = Object.freeze({
  IN_STOCK: 'confirmed_in_stock',
  OUT_OF_STOCK: 'confirmed_out_of_stock',
  UNKNOWN: 'unknown',
});
const confirmed = new Set([AVAILABILITY.IN_STOCK, AVAILABILITY.OUT_OF_STOCK]);
const scopes = new Set(['physical_store_tula', 'online_store', 'unspecified']);
export function safeHttpUrl(input) {
  if (typeof input !== 'string') return null;
  try { const u = new URL(input); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null; }
  catch { return null; }
}
export function inventoryEvidence(raw = {}, now = Date.now()) {
  const e = raw && typeof raw === 'object' ? raw : {};
  let status = confirmed.has(e.availability_status) ? e.availability_status : AVAILABILITY.UNKNOWN;
  const scope = scopes.has(e.availability_scope) ? e.availability_scope : 'unspecified';
  const stamp = typeof e.availability_checked_at === 'string' ? Date.parse(e.availability_checked_at) : NaN;
  const expires = typeof e.availability_expires_at === 'string' ? Date.parse(e.availability_expires_at) : NaN;
  const source = safeHttpUrl(e.availability_source);
  const demo = e.demo === true;
  // Only a time-bounded direct stock claim may be confirmed; catalogue presence is NOT store stock.
  if (demo || !source || !Number.isFinite(stamp) || !Number.isFinite(expires) ||
      stamp > now || expires <= now || expires <= stamp || scope === 'unspecified') status = AVAILABILITY.UNKNOWN;
  return {status, scope, checkedAt: Number.isFinite(stamp) ? new Date(stamp).toISOString() : null, source};
}
export function catalogEvidence(product = {}, feed = {}, now = Date.now()) {
  const p = product && typeof product === 'object' ? product : {};
  const f = feed && typeof feed === 'object' ? feed : {};
  const sourceUrl = safeHttpUrl(p.source_url || p.url);
  const demo = Boolean(p.demo || f.demo);
  const image = typeof p.original_image_url === 'string' ? safeHttpUrl(p.original_image_url) : null;
  const stamp = p.last_checked_at || f.last_checked_at || null;
  const importStamp=p.imported_at||f.imported_at||f.updated;
  const imported=typeof importStamp==='string'?Date.parse(importStamp):NaN;
  const parsed = typeof stamp === 'string' ? Date.parse(stamp) : NaN;
  return {
    demo,
    sourceUrl,
    originalImage: image,
    importedAt: Number.isFinite(imported)&&imported<=now ? new Date(imported).toISOString() : null,
    lastCheckedAt: Number.isFinite(parsed)&&parsed<=now ? new Date(parsed).toISOString() : null,
    sourceType: typeof p.source_type === 'string' ? p.source_type : (f.source ? 'feed' : 'unknown'),
    availability: inventoryEvidence({...p, demo}, now),
  };
}
