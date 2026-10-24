// Bounded presentation of an already normalized catalogue; source order is preserved.
import {isHidden} from './catalog-feed.js';
export const CATALOG_PAGE_SIZE=40;
const text=value=>String(value||'').toLowerCase().replaceAll('ё','е');
export function cataloguePage(products,{query='',page=0,pageSize=CATALOG_PAGE_SIZE}={}){
 const size=Number.isInteger(pageSize)?Math.max(1,Math.min(100,pageSize)):CATALOG_PAGE_SIZE;
 const words=text(query).trim().split(/\s+/).filter(Boolean);
 const matches=(Array.isArray(products)?products:[]).filter(p=>p&&!isHidden(p)&&words.every(word=>text([p.name,p.deptTitle,p.colorName].filter(Boolean).join(' ')).includes(word)));
 const pageCount=Math.max(1,Math.ceil(matches.length/size)),current=Math.max(0,Math.min(pageCount-1,Number.isInteger(page)?page:0));
 return {items:matches.slice(current*size,(current+1)*size),total:matches.length,page:current,pageCount,pageSize:size};
}
