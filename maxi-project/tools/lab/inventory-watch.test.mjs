import test from 'node:test';import assert from 'node:assert/strict';
import {watchInventory,physicalStockText} from '../../src/shop/inventory-watch.js';
const base=Date.parse('2026-10-24T12:00:00Z'),raw={availability_status:'confirmed_in_stock',availability_scope:'physical_store_tula',availability_source:'https://example.org/stock',availability_checked_at:'2026-10-24T11:00:00Z',availability_expires_at:'2026-10-24T12:00:01Z'};
function environment(){let clock=base,scheduled,wake,active=true,unsubscribed=false;const changes=[];
 const options={now:()=>clock,isActive:()=>active,schedule:(fn,ms)=>{scheduled={fn,ms};return scheduled;},cancel:id=>{if(scheduled===id)scheduled=null;},subscribe:fn=>{wake=fn;return ()=>unsubscribed=true;}};
 return {options,changes,advance:value=>clock=value,fire:()=>scheduled.fn(),wake:()=>wake(),scheduled:()=>scheduled,deactivate:()=>active=false,unsubscribed:()=>unsubscribed};
}
test('confirmed stock expires without re-rendering or emitting unchanged evidence twice',()=>{
 const e=environment(),entry={raw},stop=watchInventory([entry],(item,evidence,previous)=>e.changes.push({item,evidence,previous}),e.options);
 assert.equal(e.changes[0].evidence.status,'confirmed_in_stock');assert.equal(e.scheduled().ms,1001);
 e.wake();assert.equal(e.changes.length,1);e.advance(base+1001);e.fire();assert.equal(e.changes.at(-1).evidence.status,'unknown');assert.equal(e.changes.at(-1).previous.status,'confirmed_in_stock');assert.equal(e.scheduled(),null);
 assert.equal(e.changes.at(-1).item,entry);stop();assert.equal(e.unsubscribed(),true);
});
test('returning to a throttled/background tab rechecks elapsed expiry immediately',()=>{
 const e=environment(),stop=watchInventory([{raw:{...raw,availability_status:'confirmed_out_of_stock'}}],(_item,evidence)=>e.changes.push(evidence),e.options);
 e.advance(base+90000);e.wake();assert.equal(e.changes.at(-1).status,'unknown');assert.equal(e.scheduled(),null);stop();
});
test('inactive view cancels timers/listeners; demo and invalid evidence never get expiry confirmation',()=>{
 const e=environment();watchInventory([{raw}],(_item,evidence)=>e.changes.push(evidence),e.options);e.deactivate();e.wake();assert.equal(e.scheduled(),null);assert.equal(e.unsubscribed(),true);
 const demo=environment(),stop=watchInventory([{raw:{...raw,demo:true}}],(_item,evidence)=>demo.changes.push(evidence),demo.options);assert.equal(demo.changes[0].status,'unknown');assert.equal(demo.scheduled(),undefined);stop();
 assert.match(physicalStockText({status:'confirmed_in_stock',scope:'online_store'}),/не подтверждено/);
});
