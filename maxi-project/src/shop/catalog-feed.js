// Shared lightweight feed contract: no Three.js, photos, or mutable mall state.
import {catalogEvidence} from './catalog-evidence.js';
export function feedPath(input){
  if(typeof input!=='string'||!input||/[\\%?#\s]/.test(input)||input.startsWith('/')||input.split('/').some(x=>x==='.'||x==='..')||/^[a-z]+:/i.test(input))return null;
  return 'feeds/'+input;
}
// One visibility/identity policy for the lightweight catalogue and the 3D shop.
// A hidden or malformed record must not reserve an ID ahead of a valid product.
// Treat ambiguous truthy hide markers as hidden rather than accidentally publishing them.
export const isHidden = record => Boolean(record?.hidden);
// An index-level hidden store must not be advertised or fetched by either UI.
// Treat ambiguous truthy flags as hidden, preserving legacy entries without a flag.
export const visibleStoreEntry = entry => Boolean(entry && !isHidden(entry) && feedPath(entry.file));
// A withdrawn feed is not publishable even if stale or malformed input still
// contains unhidden items. This applies to both 3D and lightweight catalogues.
export function visibleDepartments(feed){
  // Legacy feeds omit status. Explicit non-active/unknown states must not leak
  // products from staged, malformed or partially withdrawn catalogues.
  if(feed?.catalogue_status !== undefined && feed.catalogue_status !== 'active')return [];
  const seen=new Set();
  return (Array.isArray(feed?.depts)?feed.depts:[])
    .filter(d=>d&&!isHidden(d)&&Array.isArray(d.items))
    .map(d=>({...d,items:d.items.filter(item=>{
      if(!item||isHidden(item)||typeof item.id!=='string'||!item.id.trim()||
         typeof item.name!=='string'||!item.name.trim()||seen.has(item.id))return false;
      seen.add(item.id);return true;
    })}))
    .filter(d=>d.items.length>0);
}
export function catalogueProducts(feed){
  return visibleDepartments(feed).flatMap(d=>d.items.map(item=>{
    const evidence=catalogEvidence(item,feed);
    // Do not let an untrusted feed override the canonical SKU used for saved identity.
    return {...item,sourceProductId:item.id,deptTitle:d.title||d.key||'Товары',evidence,
      // Demo records are not proof of permission to embed third-party source photos.
      // Use only the local, explicitly labelled preview; real records keep originals.
      image:evidence.demo?feedPath(item.pic):evidence.originalImage,
      price:typeof item.price==='number'&&Number.isFinite(item.price)&&item.price>=0?item.price:null,
      url:evidence.demo?null:evidence.sourceUrl,
    };
  }));
}
