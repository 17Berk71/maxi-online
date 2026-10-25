import test from 'node:test';
import assert from 'node:assert/strict';
import {feedCatalog,feedIndexReady,feedPhotoKey,loadFeed,winKeys} from '../../src/shop/feeds.js';
import {PHOTOS} from '../../src/shop/photos.js';
import {catalogueProducts} from '../../src/shop/catalog-feed.js';
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
   'Store A':{file:'a.json'},'Store B':{file:'b.json'}
  }})};
  if(url==='feeds/a.json'||url==='feeds/b.json')return {ok:true,json:async()=>({demo:true,depts:[{key:'tops',type:'generic',items:[{
   id:'same-sku',name:'Synthetic top',pic:url==='feeds/a.json'?'img/a.webp':'img/b.webp',cut:true
  }]}]})};
  throw Error('Unexpected request '+url);
 };
 try{
  await feedIndexReady();
  assert.equal(winKeys('Fixture').length,1);
  const store={name:'Fixture'};
  assert.equal(await loadFeed(store),false);
  assert.equal(await loadFeed({name:'Store A'}),true);
  assert.equal(await loadFeed({name:'Store B'}),true);
  assert.equal(PHOTOS[feedPhotoKey('Store A','same-sku')].url,'feeds/img/a.webp');
  assert.equal(PHOTOS[feedPhotoKey('Store B','same-sku')].url,'feeds/img/b.webp');
  assert.deepEqual(requests,['feeds/index.json','feeds/a.json','feeds/b.json']);
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
