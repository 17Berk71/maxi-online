import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {topMeasures} from '../../src/shop/fitting/measures.js';
import {bottomSpec} from '../../src/shop/fitting/specs.js';
import {drapePrepare} from '../../src/shop/fitting/drape.js';
import {fitNote, recommendSize} from '../../src/shop/fitting/sizes.js';
import {interp} from '../../src/shop/fitting/geometry.js';
const base = {sex:'m',height:186,weight:82,chest:110,waist:82,hips:98};
const tee = {id:'test-tee',kind:'tee',shape:{tw:Array(16).fill(.76),cm:{chest:54,len:71}}};
const jeans = {id:'test-jeans',kind:'jeans',shape:{rise:.75,leg_len:1.6,leg:Array(16).fill(.8),cm:{waist:42,outseam:107,legWidth:38,legWidthAt:.43,leg:[[0,32],[.43,38],[1,29.5]]}}};
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('one measured tee retains its width and length across bodies',()=>{
 for (const chest of [90,110,130]) {const m=topMeasures(tee,bodyDims({...base,chest}));close(m.W,.54);close(m.L,.71);}
});
test('selected sizes keep distinct widths even when both are smaller than body',()=>{
 const sizesT=[{name:'M',cm:{chest:53}},{name:'L',cm:{chest:55}}];
 for(const [size,width] of [['M',.53],['L',.55]]) close(topMeasures({...tee,sizesT,size},bodyDims({...base,chest:130})).W,width);
});
test('measured waistband and leg anchor retain width across bodies',()=>{
 for(const waist of [70,82,110]) {const sp=bottomSpec(jeans,bodyDims({...base,waist,hips:waist+20}));close(sp.ww,.42);close(interp(sp.lw,.43),.38);}
});
test('actual pattern preparation does not expand measured waist or thigh',()=>{
 for(const waist of [70,110]) { const d=bodyDims({...base,waist,hips:waist+20}); const job=drapePrepare({...jeans,tex:{}},d,null); assert.ok(job); const mesh = job.finish(Float64Array.from(job.C.P)); close(mesh.userData.measures.WW,.42); close(mesh.userData.measures.TW,bottomSpec(jeans,bodyDims(base)).lw[0]); close(interp(mesh.userData.measures.sp.lw,.43),.38); }
});
test('real garments without a shop size table get an honest fit note',()=>{
 assert.match(fitNote(tee,base),/меньше груди на 2 см/);
 assert.match(fitNote(tee,base),/не измерена/);
 assert.match(fitNote(jeans,{...base,waist:95}),/пояс мал/);
});
test('bottom size recommendation checks hips as well as waist',()=>{
 const item={kind:'jeans',sizesT:[{name:'S',body:{waist:[70,84],hips:[88,96]}},{name:'M',body:{waist:[80,92],hips:[96,108]}}]};
 assert.equal(recommendSize(item,{...base,waist:82,hips:104}),'M');
 const measured={kind:'jeans',sizesT:[{name:'S',cm:{waist:42,hip:48}},{name:'M',cm:{waist:46,hip:54}}]};
 assert.equal(recommendSize(measured,{...base,waist:82,hips:104}),'M');
});
