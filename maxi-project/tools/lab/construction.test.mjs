import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {topMeasures} from '../../src/shop/fitting/measures.js';
import {constructionCm} from '../../src/shop/fitting/construction.js';

const item={kind:'tee',shape:{tw:Array(16).fill(.75),cm:{chest:54},construction:{units:'cm',reference_width_cm:54,estimated:true,dimensions:{len:66,shoulder:43,sleeve:20,armDepth:23}}}};
const body={sex:'m',height:186,weight:82,chest:110,waist:82,hips:98};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('captured construction stays constant across height and chest changes',()=>{
 for(const height of [160,186,205])for(const chest of [90,110,130]){
  const m=topMeasures(item,bodyDims({...body,height,chest}));
  for(const [key,value] of Object.entries({W:.54,L:.66,S:.43,SL:.20,AD:.23}))close(m[key],value);
 }
});
test('explicit measurements override photo estimates even on a worn reference',()=>{
 const measured={...item,shape:{...item.shape,worn:true,hem_waist:.2,cm:{chest:54,len:70,shoulder:45,sleeve:22,armDepth:25}}};
 const m=topMeasures(measured,bodyDims(body));
 for(const [key,value] of Object.entries({L:.70,S:.45,SL:.22,AD:.25}))close(m[key],value);
});
test('estimates for one captured size are not borrowed by another selected size',()=>{
 assert.deepEqual(constructionCm(item,{chest:58}),{});
 assert.equal(constructionCm(item,{chest:54}).len,66);
 assert.deepEqual(constructionCm({...item,shape:{construction:{units:'cm',dimensions:{len:NaN,shoulder:-1,sleeve:Infinity}}}},{}),{});
});
