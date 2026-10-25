import test from 'node:test';import assert from 'node:assert/strict';
import {catalogueProducts,feedPath,visibleDepartments} from '../../src/shop/catalog-feed.js';
test('feed resources remain relative to the catalogue directory',()=>{
 assert.equal(feedPath('store.json'),'feeds/store.json');assert.equal(feedPath('img/a.webp'),'feeds/img/a.webp');
 for(const path of ['https://evil.test/f.json','//evil.test/a','../private.json','/x','a\\b','x?y','%2e%2e/x'])assert.equal(feedPath(path),null,path);
});
test('feed normalization rejects hidden, malformed and duplicate products without inventing prices or originals',()=>{
 const p={id:'1',name:'Test',pic:'img/1.webp',url:'https://example.org/1'};
 const products=catalogueProducts({depts:[{title:'Test',items:[p,p,{...p,id:'hidden',hidden:true},{...p,id:'2',price:'999'},null]}]});
 assert.equal(products.length,2);assert.equal(products[0].price,null);assert.equal(products[1].price,null);assert.equal(products[0].image,null);
});
test('demo links are suppressed; real originals are distinct from processed previews',()=>{
 const p={id:'1',name:'Test',pic:'img/1.webp',url:'https://example.org/1',original_image_url:'https://example.org/original.jpg'};
 const feed={depts:[{items:[p]}]};const real=catalogueProducts(feed)[0];assert.equal(real.image,p.original_image_url);assert.equal(real.url,p.url);
 const demo=catalogueProducts({...feed,demo:true})[0];assert.equal(demo.url,null);assert.equal(demo.evidence.availability.status,'unknown');
 assert.equal(demo.image,'feeds/img/1.webp','demo must not fetch an unreviewed external original');
 assert.equal(demo.evidence.originalImage,p.original_image_url,'provenance is retained without displaying the URL');
 assert.equal(catalogueProducts({...feed,demo:'true',depts:[{items:[{...p,pic:null}]}]})[0].image,null,
  'a demo without a local preview must not fall back to an external image');
 assert.equal(catalogueProducts({demo:true,depts:[{items:[{...p,original_image_url:null}]}]})[0].image,'feeds/img/1.webp');
});

test('3D feed departments omit hidden items without mutating raw imported records',()=>{
 const hidden={id:'hidden',name:'Hidden',hidden:true},shown={id:'shown',name:'Shown'};
 const input={depts:[{key:'a',items:[hidden,shown]},{key:'b',items:[hidden]},null]};
 assert.deepEqual(visibleDepartments(input),[{key:'a',items:[shown]}]);
 assert.equal(input.depts[0].items.length,2);assert.deepEqual(visibleDepartments({depts:[{items:[hidden]}]}),[]);
});

test('a hidden department never exposes its products in either catalogue adapter',()=>{
 const visible={id:'shown',name:'Visible'},concealed={id:'concealed',name:'Not for publication'};
 const feed={depts:[{key:'hidden',hidden:true,items:[concealed]},{key:'visible',items:[visible]}]};
 assert.deepEqual(catalogueProducts(feed).map(p=>p.id),['shown']);
 assert.deepEqual(visibleDepartments(feed).map(d=>d.key),['visible']);
 assert.equal(feed.depts[0].items[0],concealed,'source records are not mutated');
});

test('hidden or malformed duplicates cannot suppress a valid later product in either view',()=>{
 const hidden={id:'same',name:'Hidden',hidden:true};
 const valid={id:'same',name:'Visible',pic:'img/visible.webp'};
 const feed={demo:true,depts:[
  {key:'concealed',hidden:true,items:[{id:'private',name:'Private'}]},
  {key:'first',items:[hidden,{id:'',name:'Empty ID'},{id:'bad',name:' '}]},
  {key:'second',items:[valid,{...valid,name:'Duplicate'},null,{id:'last',name:'Last'}]},
 ]};
 assert.deepEqual(catalogueProducts(feed).map(p=>p.name),['Visible','Last']);
 assert.deepEqual(visibleDepartments(feed).map(d=>[d.key,...d.items.map(p=>p.name)]),[['second','Visible','Last']]);
 assert.equal(feed.depts[1].items[0],hidden,'normalization must not mutate source data');
 assert.equal(feed.depts[2].items.length,4);
});

test('ambiguous truthy hide markers cannot leak products or reserve their IDs',()=>{
 const feed={demo:true,depts:[
  {key:'private',hidden:'true',items:[{id:'same',name:'Private'}]},
  {key:'visible',items:[{id:'hidden',name:'Private',hidden:1},{id:'same',name:'Public',hidden:false},{id:'last',name:'Last',hidden:''}]},
 ]};
 assert.deepEqual(visibleDepartments(feed).map(d=>d.items.map(p=>p.name)),[['Public','Last']]);
 assert.deepEqual(catalogueProducts(feed).map(p=>p.name),['Public','Last']);
 assert.equal(feed.depts[0].hidden,'true','source flags remain unchanged');
});

test('withdrawn feed status suppresses stale visible items without mutating source',()=>{
 const item={id:'still-visible',name:'Should not be published',pic:'img/old.webp'};
 const feed={catalogue_status:'withdrawn',depts:[{key:'old',items:[item]}]};
 assert.deepEqual(visibleDepartments(feed),[]);
 assert.deepEqual(catalogueProducts(feed),[]);
 assert.equal(feed.depts[0].items[0],item);
 assert.deepEqual(catalogueProducts({...feed,catalogue_status:'active'}).map(p=>p.id),['still-visible']);
});


test('only active or legacy-status feeds may expose products',()=>{
 const item={id:'sku',name:'Synthetic visible item'};
 const feed={demo:true,depts:[{key:'a',items:[item]}]};
 for(const status of ['draft','pending_review','withdrawn','withdrawn ',null,false,1,'ACTIVE',{}]){
  assert.deepEqual(visibleDepartments({...feed,catalogue_status:status}),[],String(status));
  assert.deepEqual(catalogueProducts({...feed,catalogue_status:status}),[],String(status));
 }
 assert.deepEqual(catalogueProducts(feed).map(p=>p.id),['sku'],'legacy feeds remain readable');
 assert.deepEqual(catalogueProducts({...feed,catalogue_status:'active'}).map(p=>p.id),['sku']);
 assert.equal(item.hidden,undefined,'status gate does not mutate raw items');
});
