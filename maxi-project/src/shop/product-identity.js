// Stable saved-product identities shared by favorites and the photo board.
// Keep the pipe-joined format for ordinary existing records.
export function productIdentity(parts){
  return parts.some(part=>part.includes('|'))
    ? 'tuple:'+encodeURIComponent(JSON.stringify(parts))
    : parts.join('|');
}

// A short-lived experimental version stored raw JSON tuple IDs. Upgrade only
// when the stored shop agrees with the parsed tuple and the old representation
// is canonical; otherwise leave the identifier untouched. No storage writes
// happen during reading, so damaged or ambiguous snapshots remain recoverable.
export function migrateLegacyProductId(id,shop){
  if(typeof id!=='string'||!id.startsWith('tuple:['))return id;
  const raw=id.slice('tuple:'.length);
  try{
    const parts=JSON.parse(raw);
    if(!Array.isArray(parts)||parts.length!==3||
       !parts.every(part=>typeof part==='string')||
       !parts.some(part=>part.includes('|'))||
       parts[0]!==shop||JSON.stringify(parts)!==raw)return id;
    return productIdentity(parts);
  }catch{return id;}
}
