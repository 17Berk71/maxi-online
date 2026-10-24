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
  try { const u = new URL(input); return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password ? u.href : null; }
  catch { return null; }
}
// Verification records require a real calendar date and an explicit timezone.
// Date.parse alone normalizes e.g. 30 February into March.
export function parseIsoTimestamp(value){
  if(typeof value!=='string')return NaN;
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if(!m)return NaN;
  const [year,month,day,hour,minute,second]=m.slice(1,7).map(Number);
  const leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59||m[8]&&(Number(m[9])>23||Number(m[10])>59))return NaN;
  return Date.parse(value);
}
export function inventoryEvidence(raw = {}, now = Date.now()) {
  const e = raw && typeof raw === 'object' ? raw : {};
  let status = confirmed.has(e.availability_status) ? e.availability_status : AVAILABILITY.UNKNOWN;
  const scope = scopes.has(e.availability_scope) ? e.availability_scope : 'unspecified';
  const stamp = parseIsoTimestamp(e.availability_checked_at);
  const expires = parseIsoTimestamp(e.availability_expires_at);
  const source = safeHttpUrl(e.availability_source);
  // Any non-empty demo marker is a conservative block on stock claims.
  const demo = Boolean(e.demo);
  // Only a time-bounded direct stock claim may be confirmed; catalogue presence is NOT store stock.
  if (!Number.isFinite(now) || demo || !source || !Number.isFinite(stamp) || !Number.isFinite(expires) ||
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
  const imported=parseIsoTimestamp(typeof importStamp==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(importStamp)?importStamp+'T00:00:00Z':importStamp);
  const parsed = parseIsoTimestamp(stamp);
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
