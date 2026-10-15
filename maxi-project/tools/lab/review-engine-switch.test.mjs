import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const dir=process.env.REVIEW_DIR||'tools/lab/review-anatomy-dist';
const script=fs.readFileSync(dir+'/frame.js','utf8');
test('engine reload restores body and camera within the same iframe',async()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 function boot(search){let camera=null,handler,replaced;
  const fit={getView:()=>camera&&({...camera}),setAnim(){},addPack:async()=>{},wear(){},open(){camera={rot:0,zoom:.6,height:.5};},fitNote:()=>'',qc:()=>null,ready:async()=>{},setRot:r=>{camera={...(camera||{}),rot:r};},setZoom:(z,h)=>{camera={...(camera||{}),zoom:z,height:h};}};
  const parent={postMessage(){}},location={origin:'https://review.invalid',href:'https://review.invalid/frame.html'+search,search,replace:u=>{replaced=String(u);}};
  const sandbox={REVIEW:{createFitting:()=>fit,PREFS:{body:{}}},parent,location,sessionStorage:storage,document:{querySelector:()=>({textContent:''})},URL,URLSearchParams,window:{name:'tee',addEventListener:(_,fn)=>{handler=fn;}}};
  vm.createContext(sandbox);vm.runInContext(script,sandbox);
  return{sandbox,ready:()=>vm.runInContext('chain',sandbox),camera:()=>camera,move:v=>{camera=v;},replaced:()=>replaced,send:config=>handler({source:parent,origin:location.origin,data:{channel:'maxi-fitting-review',command:'configure',config}})};
 }
 const old=boot('?version=after');await old.ready();old.move({rot:1.2,zoom:.73,height:.61});old.send({body:{height:195}});await old.ready();old.send({version:'before'});await old.ready();
 assert.match(old.replaced(),/version=before/);assert.ok(saved.has('maxi-review-tee'));assert.ok(!saved.has('maxi-review-jeans'));
 const next=boot('?version=before');await next.ready();assert.deepEqual(next.camera(),{rot:1.2,zoom:.73,height:.61});assert.equal(next.sandbox.REVIEW.PREFS.body.height,195);assert.equal(saved.size,0);
});
test('boot selects the frozen engine for before and current engine for after',()=>{
 for(const [version,expected] of [['before','engine-before.js'],['after','engine.js']]){
  const appended=[],document={createElement:()=>({}),body:{append:x=>appended.push(x)}};
  vm.runInNewContext(fs.readFileSync(dir+'/boot.js','utf8'),{document,location:{search:'?version='+version},URLSearchParams});
  assert.equal(appended[0].src,expected);appended[0].onload();assert.equal(appended[1].src,'frame.js');
 }
});
