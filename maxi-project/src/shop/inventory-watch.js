// Revalidate time-bounded evidence on expiry and when returning to a tab.
import {inventoryEvidence,parseIsoTimestamp,AVAILABILITY} from './catalog-evidence.js';
export function physicalStockText(stock){
 const local=stock.scope==='physical_store_tula'&&stock.status!==AVAILABILITY.UNKNOWN;
 return local?(stock.status===AVAILABILITY.IN_STOCK?'Подтверждено наличие в магазине Тулы.':'Подтверждено отсутствие в магазине Тулы.'):'Наличие именно в ТРЦ «Макси» не подтверждено.';
}
function subscribeWake(callback){
 const visible=()=>{if(!document.hidden)callback();};
 document.addEventListener('visibilitychange',visible);window.addEventListener('focus',callback);
 return ()=>{document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',callback);};
}
export function watchInventory(entries,onChange,{isActive=()=>true,now=()=>Date.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),subscribe=subscribeWake}={}){
 let stopped=false,timer=null,unsubscribe=()=>{};const previous=new Map();
 function stop(){stopped=true;if(timer!==null)cancel(timer);timer=null;unsubscribe();}
 function refresh(){
  if(stopped)return;if(!isActive()){stop();return;}
  if(timer!==null)cancel(timer);timer=null;
  const stamp=now();let next=Infinity;
  for(const entry of entries){
   const evidence=inventoryEvidence(entry.raw,stamp),old=previous.get(entry),key=JSON.stringify(evidence);
   if(old?.key!==key){onChange(entry,evidence,old?.evidence||null);previous.set(entry,{key,evidence});}
   if(evidence.status!==AVAILABILITY.UNKNOWN){const expiry=parseIsoTimestamp(entry.raw.availability_expires_at);if(expiry>stamp)next=Math.min(next,expiry);}
  }
  if(Number.isFinite(next))timer=schedule(refresh,Math.max(1,Math.min(2147483647,next-stamp+1)));
 }
 unsubscribe=subscribe(refresh)||(()=>{});refresh();return stop;
}
