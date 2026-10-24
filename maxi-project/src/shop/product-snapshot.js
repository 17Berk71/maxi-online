import {safeHttpUrl} from './catalog-evidence.js';
import {imageUrl} from './photo-looks/storage.js';
export function productSnapshot(product,shop,image){
 const id=String(shop?.name||'')+'|'+String(product?.id||product?.name||'')+'|'+String(product?.color||'');
 const demo=product?.demo===true||product?.evidence?.demo===true;
 return {id,title:String(product?.name||'Товар'),shop:String(shop?.name||''),image:imageUrl(image),sourceUrl:demo?null:safeHttpUrl(product?.url),demo};
}
