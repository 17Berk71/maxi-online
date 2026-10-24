import test from 'node:test';import assert from 'node:assert/strict';
import {createFavorites,FAVORITES_KEY,MAX_FAVORITES} from '../../src/shop/favorites.js';
import {createLookStore,STORAGE_KEY} from '../../src/shop/photo-looks/storage.js';
function setup(){const data=new Map();let fail=false;const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');data.set(k,v);}};return {data,storage,favorites:createFavorites(storage),fail:v=>fail=v};}
const product={id:'1',name:'Jacket',url:'https://example.org/jacket'},shop={name:'Shop'};
test('favorites restore independent snapshots after reload, including missing images',()=>{
 const f=setup();assert.equal(f.favorites.add(product,shop,'feeds/img/1.webp'),true);
 assert.equal(f.favorites.add({id:'2',name:'No photo'},shop,null),true);
 const restored=createFavorites(f.storage);assert.equal(restored.items().length,2);assert.equal(restored.items()[1].image,null);
 const copy=restored.items();copy[0].title='mutated';assert.equal(restored.items()[0].title,'Jacket');
 assert.equal(restored.remove(copy[0].id),true);assert.equal(createFavorites(f.storage).items().length,1);
});
test('favorite writes do not replace the current look or named collections',()=>{
 const f=setup(),look=createLookStore(f.storage);look.setDraft([{id:'look',title:'Look',image:'/photo.svg'}]);look.save('Look');
 const raw=f.data.get(STORAGE_KEY);f.favorites.add(product,shop,null);assert.equal(f.data.get(STORAGE_KEY),raw);assert(f.data.has(FAVORITES_KEY));
});
test('quota failures and concurrent tabs cannot remove existing favorites',()=>{
 const f=setup();f.favorites.add(product,shop,null);const raw=f.data.get(FAVORITES_KEY),other=createFavorites(f.storage);
 f.fail(true);assert.equal(f.favorites.remove(f.favorites.items()[0].id),false);assert.equal(f.data.get(FAVORITES_KEY),raw);
 f.fail(false);f.favorites.add({id:'2',name:'Second'},shop,null);assert.equal(other.remove(other.items()[0].id),false);assert.equal(createFavorites(f.storage).items().length,2);
});
test('demo URLs stay suppressed and favorite capacity never silently evicts earlier products',()=>{
 const f=setup();f.favorites.add({...product,demo:true},shop,'javascript:alert(1)');assert.equal(f.favorites.items()[0].sourceUrl,null);assert.equal(f.favorites.items()[0].image,null);
 for(let n=2;n<=MAX_FAVORITES;n++)assert.equal(f.favorites.add({id:String(n),name:'Product '+n},shop,null),true);
 assert.equal(f.favorites.add({id:'extra'},shop,null),false);assert.equal(f.favorites.items().length,MAX_FAVORITES);assert.equal(f.favorites.items()[0].title,'Jacket');
});

test('ambiguous demo flags in product and evidence never expose merchant URLs',()=>{
 const f=setup();
 for(const [n,flag] of [['2','true'],['3',1],['4','false']]){
  assert.equal(f.favorites.add({...product,id:n,demo:flag},shop,null),true);
 }
 assert.equal(f.favorites.add({...product,id:'5',evidence:{demo:'true'}},shop,null),true);
 const restored=createFavorites(f.storage).items();
 assert.equal(restored.length,4);
 for(const entry of restored){assert.equal(entry.demo,true);assert.equal(entry.sourceUrl,null);}
 assert.equal(f.favorites.add({...product,id:'6',demo:false,evidence:{demo:false}},shop,null),true);
 assert.equal(createFavorites(f.storage).items().at(-1).sourceUrl,product.url);
});

test('saved product identity distinguishes delimiter-bearing store names and SKUs without changing ordinary IDs',()=>{
 const f=setup();
 const a={name:'Store|North'},b={name:'Store'},c={name:'Store|North|Item'};
 const first={id:'Item',name:'Jacket'},second={id:'North|Item',name:'Jeans'},third={id:'X',name:'Shirt'};
 assert.equal(f.favorites.add(first,a,null),true);
 assert.equal(f.favorites.add(second,b,null),true);
 assert.equal(f.favorites.add(third,c,null),true);
 const items=createFavorites(f.storage).items();
 assert.equal(items.length,3);
 assert.equal(new Set(items.map(x=>x.id)).size,3,'different store/SKU tuples cannot overwrite each other');
 assert.deepEqual(items.map(x=>x.title),['Jacket','Jeans','Shirt']);
 assert.equal(f.favorites.has(first,a),true);
 assert.equal(f.favorites.has(second,b),true);
 assert.equal(f.favorites.has(third,c),true);
 assert.equal(f.favorites.add({id:'simple',name:'Plain'},{name:'Store'},null),true);
 assert.equal(f.favorites.items().at(-1).id,'Store|simple|','legacy identity stays stable for ordinary products');
 const restored=createFavorites(f.storage);
 assert.equal(restored.remove(items[0].id),true);
 assert.deepEqual(createFavorites(f.storage).items().map(x=>x.title),['Jeans','Shirt','Plain']);
});

test('encoded tuple identities cannot collide with ordinary legacy pipe IDs',()=>{
 const f=setup();
 // Prior raw JSON tuple IDs collided with the second, pipe-joined record.
 const tupleShop={name:'Store|North|Item'};
 const tupleProduct={id:'X',name:'Tuple item'};
 const plainShop={name:'tuple:["Store'};
 const plainProduct={id:'North',color:'Item","X",""]',name:'Plain item'};
 assert.equal(f.favorites.add(tupleProduct,tupleShop,null),true);
 assert.equal(f.favorites.add(plainProduct,plainShop,null),true);
 const items=createFavorites(f.storage).items();
 assert.equal(items.length,2);
 assert.notEqual(items[0].id,items[1].id);
 assert.equal(items[0].id.includes('|'),false,'encoded tuples cannot mimic pipe-joined IDs');
 assert.equal(items[1].id,'tuple:["Store|North|Item","X",""]');
 assert.equal(f.favorites.has(tupleProduct,tupleShop),true);
 assert.equal(f.favorites.has(plainProduct,plainShop),true);
 assert.equal(createFavorites(f.storage).remove(items[0].id),true);
 assert.deepEqual(createFavorites(f.storage).items().map(x=>x.title),['Plain item']);
 const malformed={name:'Bad\\uD800|Shop'};
 assert.equal(f.favorites.add({id:'X',name:'Malformed Unicode'},malformed,null),true);
 assert.equal(f.favorites.has({id:'X'},malformed),true);
});
