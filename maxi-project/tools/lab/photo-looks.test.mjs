import test from 'node:test';
import assert from 'node:assert/strict';
import {createLookStore, STORAGE_KEY, LEGACY_KEY} from '../../src/shop/photo-looks/storage.js';
const item=n=>({id:String(n),title:'Товар '+n,shop:'Shop',image:'/image.svg',sourceUrl:'https://example.org/'+n,demo:false});
function fixture(initial={}){
  const data=new Map(Object.entries(initial));let refuse=false;
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(refuse)throw Error('quota');data.set(k,v);}};
  let n=0;const options={now:()=> '2026-10-24T08:00:00.000Z',newId:()=>String(++n)};
  return {data,store:createLookStore(storage,options),reload:()=>createLookStore(storage,options),refuse:v=>refuse=v};
}
test('legacy board migrates on successful write, preserving original backup and order',()=>{
 const legacy=JSON.stringify([item(2),item(1)]),f=fixture({[LEGACY_KEY]:legacy});
 assert.deepEqual(f.store.items().map(x=>x.id),['2','1']);
 assert.equal(f.store.save('Осень'),true);
 assert.equal(f.data.get(LEGACY_KEY),legacy);
 const restored=f.reload();assert.equal(restored.looks()[0].createdAt,'2026-10-24T08:00:00.000Z');
 assert.deepEqual(restored.items(),[item(2),item(1)]);
});
test('named snapshots remain independent from draft edits, loading and deletion survive reload',()=>{
 const f=fixture();f.store.setDraft([item(1),item(2)]);f.store.save('Первый');
 f.store.setDraft([item(3)]);f.store.save('Второй');
 const looks=f.store.looks();looks[0].items[0].title='tampered';assert.equal(f.store.looks()[0].items[0].title,item(1).title);
 assert.equal(f.store.load(looks[0].id),true);assert.deepEqual(f.store.items(),[item(1),item(2)]);
 f.store.remove(looks[0].id);assert.deepEqual(f.reload().looks().map(x=>x.name),['Второй']);
});
test('quota failure is atomic for draft, save, load and delete',()=>{
 const f=fixture();f.store.setDraft([item(1)]);f.store.save('Первый');f.store.setDraft([item(2)]);
 const raw=f.data.get(STORAGE_KEY);f.refuse(true);
 for(const attempt of [()=>f.store.setDraft([]),()=>f.store.save('Не сохранён'),()=>f.store.load('1'),()=>f.store.remove('1')]){
  assert.equal(attempt(),false);assert.equal(f.data.get(STORAGE_KEY),raw);assert.deepEqual(f.store.items(),[item(2)]);assert.equal(f.store.looks().length,1);
 }
});
test('corrupt or future-version data is never overwritten',()=>{
 for(const raw of ['{broken',JSON.stringify({version:3,draft:[],looks:[]})]){
  const f=fixture({[STORAGE_KEY]:raw});assert.equal(f.store.setDraft([item(1)]),false);assert.equal(f.data.get(STORAGE_KEY),raw);assert.match(f.store.message(),/запись отключена/);
 }
});
test('untrusted restored images, duplicate IDs and demo merchant URLs are sanitized',()=>{
 const f=fixture({[LEGACY_KEY]:JSON.stringify([item(1),item(1),{...item(2),image:'javascript:alert(1)'},{...item(3),sourceUrl:'javascript:alert(1)'},{...item(4),image:'/\\evil.test/a'},{...item(5),demo:true}])});
 assert.deepEqual(f.store.items().map(x=>x.id),['1','3','5']);assert.equal(f.store.items()[1].sourceUrl,null);assert.equal(f.store.items()[2].sourceUrl,null);
});
test('stale tab refuses to overwrite another tabs work',()=>{
 const f=fixture(),other=f.reload();f.store.setDraft([item(1)]);
 assert.equal(other.setDraft([item(2)]),false);assert.match(other.message(),/другой вкладке/);assert.deepEqual(f.reload().items(),[item(1)]);
});
test('empty saves fail and collection limit preserves existing snapshots',()=>{
 const f=fixture();assert.equal(f.store.save('Пустой'),false);f.store.setDraft([item(1)]);assert.equal(f.store.save('  '),false);
 for(let n=0;n<30;n++)assert.equal(f.store.save('Образ '+n),true);
 assert.equal(f.store.save('Лишний'),false);assert.equal(f.reload().looks().length,30);
});

test('public board API preserves reorder semantics and refuses overflow without evicting earlier items',async()=>{
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const mod=await import('../../src/shop/photo-looks.js');
 const add=n=>mod.addToPhotoLook({id:String(n),name:'Item '+n},{name:'Shop'},'/image.svg');
 add(1);add(2);const id=mod.photoLookItems()[1].id;
 assert.equal(mod.movePhotoLook(id,-1),true);assert.equal(mod.movePhotoLook(id,0.5),false);
 assert.equal(mod.photoLookItems()[0].title,'Item 2');
 const snapshot=mod.photoLookItems();snapshot[0].title='mutated';assert.equal(mod.photoLookItems()[0].title,'Item 2');
 for(let n=3;n<=24;n++)assert.equal(add(n),true);
 assert.equal(mod.addToPhotoLook({id:'1',name:'Item 1'},{name:'Shop'},'feeds/img/1.webp'),true);
 assert.equal(mod.photoLookItems().at(-1).image,'feeds/img/1.webp');
 assert.equal(add(25),false);assert.equal(mod.photoLookItems().length,24);assert.equal(mod.photoLookItems()[0].title,'Item 2');
 assert.equal(mod.addToPhotoLook({id:'bad'},{name:'Shop'},'javascript:alert(1)'),false);
});


test('partially damaged v2 drafts and named looks are readable but never silently overwritten',()=>{
 const snapshot={version:2,draft:[item(1),{...item(2),image:'javascript:alert(1)'}],
   looks:[{id:'look-1',name:'Сохранённый',createdAt:'2026-10-24T08:00:00.000Z',
     items:[item(3),{...item(4),image:'javascript:alert(1)'}]}]};
 for(const damage of [
   snapshot,
   {...snapshot,draft:[item(1)],looks:[snapshot.looks[0],{...snapshot.looks[0]}]},
   {...snapshot,draft:[item(1)],looks:[{...snapshot.looks[0],createdAt:'not-a-date',items:[item(3)]}],},
   {...snapshot,draft:[...Array.from({length:25},(_,i)=>item(i))],looks:[]},
 ]){
   const raw=JSON.stringify(damage),f=fixture({[STORAGE_KEY]:raw});
   assert.equal(f.store.setDraft([item(9)]),false);
   assert.equal(f.store.save('Не перезаписывать'),false);
   assert.equal(f.data.get(STORAGE_KEY),raw);
   assert.match(f.store.message(),/запись отключена/);
 }
});

test('draft writes refuse invalid, duplicate and over-limit products without truncation',()=>{
 const f=fixture();assert.equal(f.store.setDraft([item(1)]),true);
 const raw=f.data.get(STORAGE_KEY);
 const attempts=[
  [item(2),item(2)],
  [item(2),{...item(3),image:'javascript:alert(1)'}],
  Array.from({length:25},(_,i)=>item(i)),
  null,
 ];
 for(const entries of attempts){
  assert.equal(f.store.setDraft(entries),false);
  assert.match(f.store.message(),/Не удалось сохранить образ/);
  assert.equal(f.data.get(STORAGE_KEY),raw);
  assert.deepEqual(f.store.items(),[item(1)]);
 }
 assert.equal(f.store.setDraft([item(2)]),true,'valid retry must remain possible');
 assert.deepEqual(f.reload().items(),[item(2)]);
});
