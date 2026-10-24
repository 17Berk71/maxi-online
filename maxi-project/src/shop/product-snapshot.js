import {safeHttpUrl} from './catalog-evidence.js';
import {imageUrl} from './photo-looks/storage.js';
import {productIdentity} from './product-identity.js';
export function productSnapshot(product,shop,image){
 // The 3D adapter prefixes its scene ID with f-, while quick cards keep the feed SKU.
 // Use the unmodified source SKU for saved identity in both views.
 const sku=product?.sourceProductId||product?.id||product?.name||'';
 const parts=[String(shop?.name||''),String(sku),String(product?.color||'')];
 const id=productIdentity(parts);
 // Untrusted feeds may serialize flags as strings or numbers. An ambiguous demo
 // marker must never expose an unverified outbound merchant link.
 const demo=Boolean(product?.demo||product?.evidence?.demo);
 return {id,title:String(product?.name||'Товар'),shop:String(shop?.name||''),image:imageUrl(image),sourceUrl:demo?null:safeHttpUrl(product?.url),demo};
}
