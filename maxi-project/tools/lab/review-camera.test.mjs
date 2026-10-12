// Exercise the generated frame's actual message handler, including a drag during loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const script=fs.readFileSync(path.resolve(process.env.REVIEW_DIST || 'tools/lab/review-dist','frame.js'),'utf8');
test('version/body replacement preserves rotation, zoom and camera height',async()=>{
 let camera=null, dragDuringLoad=false, handler;
 const fit={getView:()=>camera&&({...camera}),setAnim(){},addPack:async()=>{},wear(){},open(){camera={rot:.35,zoom:1,height:.55};},fitNote:()=>'',
 ready:async()=>{if(dragDuringLoad)camera={rot:1.12,zoom:.73,height:.61};},
 setRot:r=>{camera={...(camera||{}),rot:r};},setZoom:(z,h)=>{camera={...(camera||{}),zoom:z,height:h};}};
 const parent={postMessage(){}};
 const sandbox={REVIEW:{createFitting:()=>fit,PREFS:{body:{}}},parent,location:{origin:'https://review.invalid',search:''},document:{querySelector:()=>({textContent:''})},URLSearchParams,window:{addEventListener:(_,fn)=>{handler=fn;}}};
 vm.createContext(sandbox);vm.runInContext(script,sandbox);await vm.runInContext('chain',sandbox);
 assert.deepEqual(camera,{rot:0,zoom:.60,height:.5});
 camera={rot:.86,zoom:.68,height:.64};
 handler({source:parent,origin:sandbox.location.origin,data:{channel:'maxi-fitting-review',command:'configure',config:{version:'before'}}});
 await vm.runInContext('chain',sandbox);assert.deepEqual(camera,{rot:.86,zoom:.68,height:.64});
 dragDuringLoad=true;
 handler({source:parent,origin:sandbox.location.origin,data:{channel:'maxi-fitting-review',command:'configure',config:{body:{height:180}}}});
 await vm.runInContext('chain',sandbox);assert.deepEqual(camera,{rot:1.12,zoom:.73,height:.61});
});
