import test from 'node:test';
import assert from 'node:assert/strict';
import {feedCatalog,feedIndexReady,feedPhotoKey,loadFeed,winKeys} from '../../src/shop/feeds.js';
import {PHOTOS} from '../../src/shop/photos.js';
import {catalogueProducts} from '../../src/shop/catalog-feed.js';
import {catalogOf} from '../../src/shop/catalog.js';
import {productSnapshot} from '../../src/shop/product-snapshot.js';

const DEPT={generic:{icon:'box',model:'box',lay:'wall'}};
test('3D feed catalogue rejects unsafe preview/fit paths and matches normalized visible items',()=>{
 const feed={demo:true,depts:[{key:'a',type:'generic',title:'Test',items:[
  {id:'same',name:'Hidden first',hidden:true},
  {id:'same',name:'Valid',pic:'img/valid.webp',fit:'packs/valid.json',cut:true},
  {id:'unsafe',name:'Unsafe',pic:'../private.webp',fit:'../private.json',cut:true},
  {id:'same',name:'Duplicate'},
  {id:'invalid',name:' '},
 ]}]};
 const departments=feedCatalog({_feed:feed},DEPT);
 assert.equal(departments.length,1);
 assert.deepEqual(departments[0].items.map(p=>p.name),['Valid','Unsafe']);
 assert.equal(departments[0].items[0].pic,'feeds/img/valid.webp');
 assert.equal(departments[0].items[0].fitPack,'feeds/packs/valid.json');
 assert.equal(departments[0].items[1].pic,null);
 assert.equal(departments[0].items[1].photo,null);
 assert.equal(departments[0].items[1].fitPack,null);
});
test('3D index ignores unsafe window photos and never fetches a traversal feed',async()=>{
 const original=globalThis.fetch,requests=[];
 globalThis.fetch=async url=>{
  requests.push(url);
  if(url==='feeds/index.json')return {ok:true,json:async()=>({shops:{
   Fixture:{file:'../private.json',win:[{pic:'../private.webp'},{pic:'img/safe.webp'}]},
   Hidden:{file:'hidden.json',hidden:'true',win:[{pic:'img/hidden.webp'}]},
   Broken:{file:'broken.json'},
   NullEntry:null,
   'Store A':{file:'a.json'},'Store B':{file:'b.json'}
  }})};
  if(url==='feeds/broken.json')return {ok:false,status:503};
  if(url==='feeds/a.json'||url==='feeds/b.json')return {ok:true,json:async()=>({demo:true,depts:[{key:'tops',type:'generic',items:[{
   id:'same-sku',name:'Synthetic top',pic:url==='feeds/a.json'?'img/a.webp':'img/b.webp',cut:true
  }]}]})};
  throw Error('Unexpected request '+url);
 };
 try{
  await feedIndexReady();
  assert.equal(winKeys('Fixture').length,0,'unsafe feed entries must not register window photos');
  assert.equal(winKeys('Hidden').length,0,'a hidden index store must not register window photos');
  const store={name:'Fixture'};
  assert.equal(await loadFeed(store),false);
  const hiddenStore={name:'Hidden',id:123,cat:'wear'};
  assert.equal(await loadFeed(hiddenStore),false,'hidden index stores must not request their feed');
  assert.equal(hiddenStore._catalogueUnavailable,true);
  assert.deepEqual(catalogOf(hiddenStore),[],'a hidden feed must not be replaced with generated legacy demo products');
  assert.deepEqual(catalogOf(store),[],'an unsafe index feed must not be replaced with generated demo products');
  const nullEntry={name:'NullEntry',id:126,cat:'wear'};
  assert.equal(await loadFeed(nullEntry),false);
  assert.deepEqual(catalogOf(nullEntry),[],'a null configured index entry must not fall back to generated goods');
  const broken={name:'Broken',id:125,cat:'wear'};
  assert.equal(await loadFeed(broken),false);
  assert.equal(broken._catalogueUnavailable,true);
  assert.deepEqual(catalogOf(broken),[],'failed configured feeds must not silently show synthetic goods');
  assert.equal(await loadFeed({name:'Store A'}),true);
  assert.equal(await loadFeed({name:'Store B'}),true);
  assert.equal(PHOTOS[feedPhotoKey('Store A','same-sku')].url,'feeds/img/a.webp');
  assert.equal(PHOTOS[feedPhotoKey('Store B','same-sku')].url,'feeds/img/b.webp');
  assert.deepEqual(requests,['feeds/index.json','feeds/broken.json','feeds/a.json','feeds/b.json']);
 }finally{globalThis.fetch=original;}
});

test('3D feed product links, original photos and prices obey the same evidence policy as quick catalogue',()=>{
 const source={id:'real',name:'Unknown price',source_url:'https://user:secret@merchant.example/item',
   original_image_url:'https://user:secret@merchant.example/original.jpg'};
 const valid={id:'valid',name:'Valid',price:0,source_url:'https://merchant.example/item',
   original_image_url:'https://merchant.example/original.jpg'};
 const feed={demo:false,depts:[{key:'a',type:'generic',items:[source,valid]}]};
 const [unsafe,allowed]=feedCatalog({_feed:feed},DEPT)[0].items;
 assert.equal(unsafe.price,null,'missing prices must not become zero');
 assert.equal(unsafe.url,null,'credential-bearing merchant URLs are not exposed');
 assert.equal(unsafe.originalImageUrl,null,'credential-bearing source photos are not exposed');
 assert.equal(allowed.price,0,'a real numeric zero remains valid');
 assert.equal(allowed.url,'https://merchant.example/item');
 assert.equal(allowed.originalImageUrl,'https://merchant.example/original.jpg');
 const [demo]=feedCatalog({_feed:{...feed,demo:true}},DEPT)[0].items;
 assert.equal(demo.url,null,'demo products never expose outbound purchase links');
 assert.equal(source.source_url,'https://user:secret@merchant.example/item','source data stays untouched');
});

test('3D feed photo IDs are isolated per shop even when product IDs overlap',()=>{
 const feed={demo:true,depts:[{key:'tops',type:'generic',items:[{id:'sku-1',name:'Test top',pic:'img/top.webp',cut:true}]}]};
 const first=feedCatalog({name:'Store A',_feed:feed},DEPT)[0].items[0];
 const second=feedCatalog({name:'Store B',_feed:feed},DEPT)[0].items[0];
 assert.equal(first.photo,feedPhotoKey('Store A','sku-1'));
 assert.equal(second.photo,feedPhotoKey('Store B','sku-1'));
 assert.notEqual(first.photo,second.photo,'one shop must not overwrite another shop photo');
 assert.equal(first.pic,second.pic,'the preview URL remains unchanged');
 assert.notEqual(feedPhotoKey('A:B','C'),feedPhotoKey('A','B:C'),'punctuation must not cause collisions');
 assert.doesNotThrow(()=>feedPhotoKey('Malformed',String.fromCharCode(0xD800)),'unpaired Unicode must not crash catalogue loading');
});


test('3D and quick cards save the same source SKU without conflating f-prefixed SKUs',()=>{
 const feed={demo:true,depts:[{key:'tops',type:'generic',items:[
  {id:'f-42',name:'Synthetic top',color:'#345678',sourceProductId:'forged-sku'},
  {id:'42',name:'Another synthetic top',color:'#345678'},
 ]}]};
 const shop={name:'Store A'};
 const quick=catalogueProducts(feed);
 const scene=feedCatalog({...shop,_feed:feed},DEPT)[0].items;
 assert.deepEqual(scene.map(p=>p.id),['f-f-42','f-42'],'internal scene IDs remain unchanged');
 assert.deepEqual(scene.map(p=>p.sourceProductId),['f-42','42']);
 assert.deepEqual(quick.map(p=>p.sourceProductId),['f-42','42'],'untrusted feed metadata cannot override the actual SKU');
 assert.deepEqual(scene.map(p=>productSnapshot(p,shop,null).id),quick.map(p=>productSnapshot(p,shop,null).id));
 assert.deepEqual(scene.map(p=>productSnapshot(p,shop,null).id),['Store A|f-42|#345678','Store A|42|#345678']);
 assert.notEqual(productSnapshot(scene[0],shop,null).id,productSnapshot(scene[0],{name:'Store B'},null).id);
 assert.equal(productSnapshot({id:'legacy',name:'Standalone'},shop,null).id,'Store A|legacy|','non-feed IDs retain their previous format');
});

test('withdrawn feed cannot resurface stale products in 3D or quick catalogue',()=>{
 const feed={catalogue_status:'withdrawn',demo:true,depts:[{key:'old',type:'generic',items:[
  {id:'stale',name:'Withdrawn item',pic:'img/stale.webp',cut:true}
 ]}]};
 assert.deepEqual(feedCatalog({name:'Synthetic',_feed:feed},DEPT),[]);
 assert.deepEqual(catalogueProducts(feed),[]);
 assert.equal(feed.depts[0].items[0].hidden,undefined,'withdrawal must not mutate source');
});


test('3D feed adapter does not expose draft or unknown-status catalogue products',()=>{
 const feed={demo:true,depts:[{key:'tops',type:'generic',items:[{id:'sku',name:'Not approved',pic:'img/sku.webp'}]}]};
 for(const status of ['draft','pending_review','withdrawn',null,'ACTIVE']){
  assert.deepEqual(feedCatalog({name:'Synthetic',_feed:{...feed,catalogue_status:status}},DEPT),[],String(status));
 }
 assert.equal(feedCatalog({name:'Synthetic',_feed:{...feed,catalogue_status:'active'}},DEPT)[0].items.length,1);
});


test('3D catalogue fails closed when feed index is unreachable or malformed',async()=>{
 const original=globalThis.fetch;
 try{
  for(const [label,response] of [
   ['unreachable',{ok:false,status:503}],
   ['invalid-json',{ok:true,json:async()=>{throw Error('Invalid JSON');}}],
   ['missing-shops',{ok:true,json:async()=>({demo:false})}],
   ['array-shops',{ok:true,json:async()=>({shops:[]})}],
  ]){
   const requests=[];
   globalThis.fetch=async url=>{requests.push(url);return response;};
   // Each ESM module instance has its own cached index request, as in a fresh page.
   const fresh=await import('../../src/shop/feeds.js?index-failure='+label);
   const store={name:'Possibly configured store',id:250,cat:'wear'};
   assert.equal(await fresh.loadFeed(store),false,label);
   assert.equal(store._catalogueUnavailable,true,label);
   assert.deepEqual(catalogOf(store),[],label+': no fabricated fallback assortment');
   assert.deepEqual(requests,['feeds/index.json'],label+': never request unknown feed paths');
  }
  globalThis.fetch=async url=>{
   assert.equal(url,'feeds/index.json');
   return {ok:true,json:async()=>({shops:{}})};
  };
  const legacy=await import('../../src/shop/feeds.js?index-failure=valid-empty');
  const store={name:'Unconfigured legacy store',id:251,cat:'wear'};
  assert.equal(await legacy.loadFeed(store),false);
  assert.notEqual(store._catalogueUnavailable,true,'an available index may explicitly have no feed for a store');
 }finally{globalThis.fetch=original;}
});


test('configured 3D feeds reject malformed successful responses without demo fallback',async()=>{
 const original=globalThis.fetch;
 try{
  const samples=[['missing-depts',{}],['non-array-depts',{depts:{}}],['array-root',[]],['null-root',null]];
  for(const [label,body] of samples){
   const requests=[];
   globalThis.fetch=async url=>{
    requests.push(url);
    if(url==='feeds/index.json')return {ok:true,json:async()=>({shops:{'Malformed store':{file:'malformed.json'}}})};
    if(url==='feeds/malformed.json')return {ok:true,json:async()=>body};
    throw Error('Unexpected request '+url);
   };
   const fresh=await import('../../src/shop/feeds.js?malformed-document='+label);
   const store={name:'Malformed store',id:400,cat:'wear'};
   assert.equal(await fresh.loadFeed(store),false,label);
   assert.equal(store._catalogueUnavailable,true,label);
   assert.deepEqual(catalogOf(store),[],label+': do not invent demo items');
   assert.deepEqual(requests,['feeds/index.json','feeds/malformed.json'],label);
  }
  globalThis.fetch=async url=>url==='feeds/index.json'
   ?{ok:true,json:async()=>({shops:{'Empty store':{file:'empty.json'}}})}
   :{ok:true,json:async()=>({depts:[]})};
  const valid=await import('../../src/shop/feeds.js?malformed-document=valid-empty');
  const store={name:'Empty store',id:401,cat:'wear'};
  assert.equal(await valid.loadFeed(store),true,'an explicitly empty feed is a valid loaded catalogue');
  assert.equal(store._catalogueUnavailable,false);
  assert.deepEqual(valid.feedCatalog(store,DEPT),[]);
 }finally{globalThis.fetch=original;}
});

test('3D catalogue retries a failed index without inventing fallback products',async()=>{
 const original=globalThis.fetch,requests=[];
 let unavailable=true;
 globalThis.fetch=async url=>{
  requests.push(url);
  if(url==='feeds/index.json')return unavailable
   ?{ok:false,status:503}
   :{ok:true,json:async()=>({shops:{'Recovered store':{file:'recovered.json'}}})};
  if(url==='feeds/recovered.json')return {ok:true,json:async()=>({demo:true,depts:[{key:'tops',type:'generic',items:[{id:'sku',name:'Recovered synthetic item'}]}]})};
  throw Error('Unexpected request '+url);
 };
 try{
  const fresh=await import('../../src/shop/feeds.js?retry-index-3d');
  const store={name:'Recovered store',id:501,cat:'wear'};
  assert.equal(await fresh.loadFeed(store),false);
  assert.equal(store._catalogueUnavailable,true);
  assert.deepEqual(catalogOf(store),[],'network failure must not create demo goods');
  unavailable=false;
  assert.equal(await fresh.retryFeed(store),true);
  assert.equal(store._catalogueUnavailable,false);
  assert.deepEqual(catalogOf(store)[0].items.map(x=>x.name),['Recovered synthetic item']);
  assert.deepEqual(requests,['feeds/index.json','feeds/index.json','feeds/recovered.json']);
 }finally{globalThis.fetch=original;}
});

test('3D retry does not treat a newly valid empty index as a network error',async()=>{
 const original=globalThis.fetch;
 let unavailable=true;
 globalThis.fetch=async url=>{
  assert.equal(url,'feeds/index.json');
  return unavailable?{ok:false,status:503}:{ok:true,json:async()=>({shops:{}})};
 };
 try{
  const fresh=await import('../../src/shop/feeds.js?retry-empty-index-3d');
  const store={name:'Legacy unconfigured store',id:502,cat:'wear'};
  assert.equal(await fresh.loadFeed(store),false);
  assert.equal(store._catalogueUnavailable,true);
  unavailable=false;
  assert.equal(await fresh.retryFeed(store),false);
  assert.equal(store._catalogueUnavailable,false,'explicitly unconfigured stores may use legacy demo mode');
 }finally{globalThis.fetch=original;}
});
