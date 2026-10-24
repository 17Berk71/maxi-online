import {safeHttpUrl} from './catalog-evidence.js';
import {imageUrl} from './photo-looks/storage.js';
import {productIdentity} from './product-identity.js';
export function productSnapshot(product,shop,image){
 const parts=[String(shop?.name||''),String(product?.id||product?.name||''),String(product?.color||'')];
 const id=productIdentity(parts);
 // Untrusted feeds may serialize flags as strings or numbers. An ambiguous demo
 // marker must never expose an unverified outbound merchant link.
 const demo=Boolean(product?.demo||product?.evidence?.demo);
 return {id,title:String(product?.name||'Товар'),shop:String(shop?.name||''),image:imageUrl(image),sourceUrl:demo?null:safeHttpUrl(product?.url),demo};
}
