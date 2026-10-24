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
