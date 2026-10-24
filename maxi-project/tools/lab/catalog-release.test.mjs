import test from 'node:test';import assert from 'node:assert/strict';
import {auditCatalogue} from '../feeds/audit-catalog.mjs';
import {fmtPrice} from '../../src/shop/pricing.js';
const now=Date.parse('2026-10-24T12:00:00Z');
const product={id:'1',name:'Fixture',price:null,source_url:'https://merchant.example/1',original_image_url:'https://images.example/1.jpg',last_checked_at:'2026-10-24T08:00:00Z'};
const approval=category=>({approved_for_publication:true,permission_reference:'synthetic fixture only',reviewed_at:'2026-10-24T08:00:00Z',category,allowed_source_hosts:['merchant.example'],allowed_image_hosts:['images.example']});
const fixture=()=>({index:{shops:{A:{file:'a.json'},B:{file:'b.json'}}},feeds:{'a.json':{depts:[{items:[{...product}]}]},'b.json':{depts:[{items:[{...product}]}]}},manifest:{stores:{A:approval('clothing'),B:approval('accessories')}}});
test('unknown/invalid prices never render as free, known zero stays explicit',()=>{
 for(const value of [null,undefined,NaN,Infinity,-1,'100'])assert.equal(fmtPrice(value),'Цена не указана');
 assert.equal(fmtPrice(0),'0 ₽');assert.equal(fmtPrice(1250.5),'1 250,5 ₽');
});
test('real pilot gate validates explicit per-store review records across categories',()=>{
 const f=fixture();assert.equal(auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true}).technicalGatePassed,true);
 const noRights=auditCatalogue(f.index,f.feeds,{}, {now,requireReal:true});assert.equal(noRights.technicalGatePassed,false);assert(noRights.issues.some(x=>x.code==='rights_review_missing'));
});
test('demo fixture audit cannot be used as real catalogue evidence',()=>{
 const f=fixture();f.index.demo=true;
 assert.equal(auditCatalogue(f.index,f.feeds,{}, {now}).technicalGatePassed,true);
 const report=auditCatalogue(f.index,f.feeds,{}, {now,requireReal:true});assert.equal(report.technicalGatePassed,false);assert(report.issues.some(x=>x.code==='real_multicategory_pilot_missing'));
});
test('duplicates, hidden records, bad source hosts, future checks and unsupported stock fail closed',()=>{
 const f=fixture(),p=f.feeds['a.json'].depts[0].items[0];
 p.original_image_url='https://unreviewed.example/img.jpg';p.last_checked_at='2030-01-01';p.availability_status='confirmed_in_stock';p.price=-10;
 f.feeds['a.json'].depts[0].items.push({...p},{id:'hidden',hidden:true});
 const report=auditCatalogue(f.index,f.feeds,f.manifest,{now});
 for(const code of ['duplicate_product_id','image_host_not_reviewed','catalogue_check_date_missing','unsupported_inventory_claim','invalid_price'])assert(report.issues.some(x=>x.code===code),code);
 assert(!report.issues.some(x=>x.item==='hidden'));
});
test('import time is distinct from manual catalogue verification',async()=>{
 const {catalogEvidence}=await import('../../src/shop/catalog-evidence.js');
 const evidence=catalogEvidence({imported_at:'2026-10-24T08:00:00Z'},{updated:'2026-10-24'},now);
 assert.equal(evidence.lastCheckedAt,null);assert.equal(evidence.importedAt,'2026-10-24T08:00:00.000Z');
});

test('empty or malformed indexes cannot pass even the fixture audit',()=>{assert.equal(auditCatalogue({},{}).technicalGatePassed,false);assert.equal(auditCatalogue({shops:{}},{}).technicalGatePassed,false);});
