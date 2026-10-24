import {safeHttpUrl} from './catalog-evidence.js';
import {imageUrl} from './photo-looks/storage.js';
export function productSnapshot(product,shop,image){
 const parts=[String(shop?.name||''),String(product?.id||product?.name||''),String(product?.color||'')];
 // Keep existing IDs for ordinary catalogue records, so previously saved
 // favorites/looks continue to match. Pipe-containing values need a tuple
 // encoding: naive joining can make different stores/products share one ID.
 // Encode the tuple so it cannot impersonate a legacy pipe-joined ID. A raw
 // JSON tuple can contain pipes and collide with a different ordinary record
 // whose store/SKU/color happen to spell the tuple text.
 // JSON.stringify escapes lone surrogates before encodeURIComponent runs.
 const id=parts.some(part=>part.includes('|'))?'tuple:'+encodeURIComponent(JSON.stringify(parts)):parts.join('|');
 // Untrusted feeds may serialize flags as strings or numbers. An ambiguous demo
 // marker must never expose an unverified outbound merchant link.
 const demo=Boolean(product?.demo||product?.evidence?.demo);
 return {id,title:String(product?.name||'Товар'),shop:String(shop?.name||''),image:imageUrl(image),sourceUrl:demo?null:safeHttpUrl(product?.url),demo};
}
