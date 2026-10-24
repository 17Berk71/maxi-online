import {safeHttpUrl} from './catalog-evidence.js';
import {imageUrl} from './photo-looks/storage.js';
export function productSnapshot(product,shop,image){
 const parts=[String(shop?.name||''),String(product?.id||product?.name||''),String(product?.color||'')];
 // Keep existing IDs for ordinary catalogue records, so previously saved
 // favorites/looks continue to match. Pipe-containing values need a tuple
 // encoding: naive joining can make different stores/products share one ID.
 const id=parts.some(part=>part.includes('|'))?'tuple:'+JSON.stringify(parts):parts.join('|');
 // Untrusted feeds may serialize flags as strings or numbers. An ambiguous demo
 // marker must never expose an unverified outbound merchant link.
 const demo=Boolean(product?.demo||product?.evidence?.demo);
 return {id,title:String(product?.name||'Товар'),shop:String(shop?.name||''),image:imageUrl(image),sourceUrl:demo?null:safeHttpUrl(product?.url),demo};
}
