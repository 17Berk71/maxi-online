import test from 'node:test';
import assert from 'node:assert/strict';
import {feedCatalog,feedIndexReady,loadFeed,winKeys} from '../../src/shop/feeds.js';

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
  if(url==='feeds/index.json')return {ok:true,json:async()=>({shops:{Fixture:{file:'../private.json',win:[{pic:'../private.webp'},{pic:'img/safe.webp'}]}}})};
  throw Error('Unexpected request '+url);
 };
 try{
  await feedIndexReady();
  assert.equal(winKeys('Fixture').length,1);
  const store={name:'Fixture'};
  assert.equal(await loadFeed(store),false);
  assert.deepEqual(requests,['feeds/index.json']);
 }finally{globalThis.fetch=original;}
});
