// Shared lightweight feed contract: no Three.js, photos, or mutable mall state.
import {catalogEvidence} from './catalog-evidence.js';
export function feedPath(input){
  if(typeof input!=='string'||!input||/[\\%?#\s]/.test(input)||input.startsWith('/')||input.split('/').some(x=>x==='.'||x==='..')||/^[a-z]+:/i.test(input))return null;
  return 'feeds/'+input;
}
export function catalogueProducts(feed){
  if(!feed||!Array.isArray(feed.depts))return [];
  const seen=new Set();
  return feed.depts.flatMap(d=>d?.hidden!==true&&Array.isArray(d?.items)?d.items.map(item=>({item,dept:d.title||d.key||'Товары'})):[])
    .filter(({item})=>item&&typeof item.id==='string'&&typeof item.name==='string'&&!seen.has(item.id)&&seen.add(item.id)&&item.hidden!==true)
    .map(({item,dept})=>{
      const evidence=catalogEvidence(item,feed);
      return {...item,deptTitle:dept,evidence,
        image:evidence.originalImage||(evidence.demo?feedPath(item.pic):null),
        price:typeof item.price==='number'&&Number.isFinite(item.price)&&item.price>=0?item.price:null,
        url:evidence.demo?null:evidence.sourceUrl,
      };
    });
}

// Keep empty imported departments empty; never refill withdrawn stock with demo goods.
export function visibleDepartments(feed){
  return (Array.isArray(feed?.depts)?feed.depts:[])
    .filter(d=>d&&d.hidden!==true&&Array.isArray(d.items))
    .map(d=>({...d,items:d.items.filter(item=>item&&item.hidden!==true)}))
    .filter(d=>d.items.length>0);
}
