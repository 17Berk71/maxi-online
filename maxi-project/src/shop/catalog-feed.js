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
export function visibleDepartments(feed){
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
    return {...item,deptTitle:d.title||d.key||'Товары',evidence,
      image:evidence.originalImage||(evidence.demo?feedPath(item.pic):null),
      price:typeof item.price==='number'&&Number.isFinite(item.price)&&item.price>=0?item.price:null,
      url:evidence.demo?null:evidence.sourceUrl,
    };
  }));
}
