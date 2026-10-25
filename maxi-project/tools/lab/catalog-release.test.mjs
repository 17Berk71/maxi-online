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


test('malformed categories and non-timestamp review dates never pass the real pilot gate',()=>{
 for(const category of [{label:'clothing'},42,'  ']){
   const f=fixture();f.manifest.stores.A.category=category;
   const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
   assert.equal(report.technicalGatePassed,false);
   assert(report.issues.some(x=>x.code==='store_category_missing'));
 }
 for(const reviewedAt of ['2026-10-24','tomorrow','2026-10-24T08:00:00']){
   const f=fixture();f.manifest.stores.A.reviewed_at=reviewedAt;
   const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
   assert(report.issues.some(x=>x.code==='rights_review_missing'),reviewedAt);
 }
 for(const expiresAt of ['', '2026-10-25', '2026-10-23T08:00:00Z']){
   const f=fixture();f.manifest.stores.A.expires_at=expiresAt;
   const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
   assert(report.issues.some(x=>x.code==='rights_review_expired'),expiresAt);
 }
});

test('intentional withdrawn catalogues may be empty but do not satisfy real-pilot store counts',()=>{
 const f=fixture();for(const feed of Object.values(f.feeds)){feed.catalogue_status='withdrawn';feed.depts[0].items.forEach(p=>p.hidden=true);}
 assert.equal(auditCatalogue(f.index,f.feeds,f.manifest,{now}).technicalGatePassed,true);
 assert(auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true}).issues.some(x=>x.code==='real_multicategory_pilot_missing'));
 f.feeds['a.json'].depts[0].items[0].hidden=false;
 assert(auditCatalogue(f.index,f.feeds,f.manifest,{now}).issues.some(x=>x.code==='withdrawn_catalogue_has_visible_products'));
});

test('calendar-invalid rights review/expiry dates fail even when JavaScript normalizes them',()=>{
 const f=fixture();f.manifest.stores.A.reviewed_at='2026-02-30T12:00:00Z';
 assert(auditCatalogue(f.index,f.feeds,f.manifest,{now}).issues.some(x=>x.code==='rights_review_missing'));
 f.manifest.stores.A.reviewed_at='2026-10-24T08:00:00Z';f.manifest.stores.A.expires_at='2027-02-30T12:00:00Z';
 assert(auditCatalogue(f.index,f.feeds,f.manifest,{now}).issues.some(x=>x.code==='rights_review_expired'));
});

test('hidden departments are not counted or published by the real-pilot gate',()=>{
 const f=fixture();
 f.feeds['a.json'].depts.unshift({key:'private',hidden:true,items:[{id:'unreviewed',name:'Hidden item',price:-1,source_url:'javascript:alert(1)'}]});
 const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
 assert.equal(report.technicalGatePassed,true);
 assert.equal(report.stores.find(s=>s.name==='A').products,1);
 assert(!report.issues.some(x=>x.item==='unreviewed'));
 f.feeds['a.json'].depts[1].hidden=true;
 const withdrawn=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
 assert(withdrawn.issues.some(x=>x.code==='empty_catalogue'));
 assert(withdrawn.issues.some(x=>x.code==='real_multicategory_pilot_missing'));
});
test('a real-pilot catalogue cannot count demo-labelled products as verified assortment',()=>{
 const f=fixture();
 f.feeds['a.json'].depts[0].items[0].demo=true;
 const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
 assert.equal(report.technicalGatePassed,false);
 assert(report.issues.some(x=>x.code==='demo_product_in_real_catalogue'&&x.store==='A'));
 assert(report.issues.some(x=>x.code==='real_multicategory_pilot_missing'));
 assert.equal(report.stores.find(s=>s.name==='A').containsDemoProducts,true);
 f.feeds['a.json'].depts[0].items[0].demo='true';
 assert(auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true}).issues.some(x=>x.code==='demo_product_in_real_catalogue'));
});

test('publication audit excludes truthy hidden departments and products',()=>{
 const f=fixture();
 f.feeds['a.json'].depts.unshift({hidden:'true',items:[{id:'private',name:'Private',price:-10}]});
 f.feeds['a.json'].depts[1].items.push({id:'also-private',name:'Private',hidden:'true',price:-10});
 const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
 assert.equal(report.technicalGatePassed,true);
 assert.equal(report.stores.find(s=>s.name==='A').products,1);
 assert(!report.issues.some(x=>x.item==='private'||x.item==='also-private'));
 f.feeds['a.json'].depts[1].hidden=1;
 const withdrawn=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
 assert(withdrawn.issues.some(x=>x.code==='empty_catalogue'&&x.store==='A'));
 assert(withdrawn.issues.some(x=>x.code==='real_multicategory_pilot_missing'));
});


test('publication audit rejects staged/unknown feed status and excludes it from real pilot',()=>{
 for(const status of ['draft','pending_review','withdrawn ',null,false,'ACTIVE']){
  const f=fixture();f.feeds['a.json'].catalogue_status=status;
  const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
  assert.equal(report.technicalGatePassed,false,String(status));
  assert(report.issues.some(x=>x.code==='catalogue_status_invalid'&&x.store==='A'),String(status));
  assert(report.issues.some(x=>x.code==='real_multicategory_pilot_missing'),String(status));
  assert.equal(report.stores.find(x=>x.name==='A').products,0,String(status));
 }
 const active=fixture();active.feeds['a.json'].catalogue_status='active';
 assert.equal(auditCatalogue(active.index,active.feeds,active.manifest,{now,requireReal:true}).technicalGatePassed,true);
});

test('index-hidden stores never count toward the real multicategory pilot',()=>{
 const f=fixture();f.index.shops.A.hidden='true';
 const report=auditCatalogue(f.index,f.feeds,f.manifest,{now,requireReal:true});
 assert.equal(report.technicalGatePassed,false);
 assert(report.issues.some(x=>x.code==='real_multicategory_pilot_missing'));
 assert.equal(report.stores.find(x=>x.name==='A').products,0);
 assert.equal(report.stores.find(x=>x.name==='A').hidden,true);
 const restored=fixture();restored.index.shops.A.hidden=false;
 assert.equal(auditCatalogue(restored.index,restored.feeds,restored.manifest,{now,requireReal:true}).technicalGatePassed,true);
});
