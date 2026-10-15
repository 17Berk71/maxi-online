// Export real engine body/cloth geometry for offline QA; no browser UI claims.
// OUT=/absolute/private/path MODEL=makehuman|legacy ITEMS=zolla-tee,barrel-jeans BODY=JSON
import fs from 'node:fs';import path from 'node:path';import * as THREE from 'three';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {buildBody} from '../../src/shop/fitting/mannequin.js';
import {drapePrepare} from '../../src/shop/fitting/drape.js';
import {makeCollider} from '../../src/shop/fitting/collider.js';
import {runCloth} from '../../src/shop/fitting/sim.js';
import {PTEX} from '../../src/shop/fitting/photo-texture.js';
import {armSpread} from '../../src/shop/fitting/specs.js';
import {commitLayer} from '../../src/shop/fitting/simple-garment.js';
import {fit} from '../../src/shop/fitting/state.js';
import {QC} from '../../src/shop/fitting/qc.js';
import {loadMakeHuman} from '../../src/shop/fitting/makehuman-body.js';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
const packDir=path.join(ROOT,'tools/wardrobe/out'),out=process.env.OUT;
if(!out)throw new Error('OUT must be a private output directory');fs.mkdirSync(out,{recursive:true});
// Only material construction uses these canvases. Their contents are not rendered:
// the offline renderer samples the actual photo map and omits shader normal maps.
globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
const b={sex:'m',height:186,weight:82,chest:110,waist:82,hips:98,...JSON.parse(process.env.BODY||'{}'),model:process.env.MODEL||'makehuman'};
const ids=(process.env.ITEMS||'').split(',').filter(Boolean),catalog=JSON.parse(fs.readFileSync(packDir+'/index.json'));
const items=ids.map(id=>{
 const meta=JSON.parse(fs.readFileSync(path.join(packDir,id,'meta.json'))),entry=catalog.find(x=>x.id===id);
 const item={...entry,...meta,id,shape:meta.shape||entry.shape,sizesT:entry.sizes,size:(process.env.SIZE||'')||entry.sizes?.[0]?.name,tex:{}};
 for(const [name,file] of Object.entries({front:'front.webp',back:'back.webp',frontCut:'front_cut.webp',backCut:'back_cut.webp',sleeve:'sleeve.webp'})){
  const p=path.join(packDir,id,file);if(!fs.existsSync(p))continue;item.tex[name]=p;
  for(const suffix of ['','|corrected-v1','|flat','|flat|corrected-v1']){const t=new THREE.Texture();t.userData={offlinePath:p};PTEX[p+suffix]=t;}
 }return item;
});
const started=performance.now();if(b.model==='makehuman')await loadMakeHuman();const d=bodyDims(b);d.armA=armSpread(items,d);
const {g}=buildBody(b,new THREE.MeshStandardMaterial({color:0xeeeeee}),d),groups=[g],animation=[];
fit.UNDER=[];fit.UNDERZ=[];fit.BOT_YW=0;
try{for(const item of items){
 const under=fit.UNDER?{a:fit.UNDER.slice(),b:fit.UNDERZ.slice()}:null,job=drapePrepare(item,d,under);
 if(!job)throw new Error('Missing cloth job '+item.id);
 const o={rec:process.env.ANIMATION==='1'?'settle':false},P=runCloth(job.C,makeCollider(d,job.under,job.margin),job.fab,job.yPin,o);
 if(!Array.from(P).every(Number.isFinite))throw new Error('Non-finite cloth '+item.id);
 if(o.frames){for(let k=0;k<o.nf;k++)job.finishPoints(o.frames.subarray(k*P.length,(k+1)*P.length));animation.push({id:item.id,frames:o.nf,finite:Array.from(o.frames).every(Number.isFinite)});}
 const cloth=job.finish(P);if(o.frames){const last=o.frames.subarray((o.nf-1)*P.length),record=animation.at(-1);record.endpointMaxDifference=Math.max(...P.map((v,i)=>Math.abs(v-last[i])));if(record.endpointMaxDifference>1e-6)throw new Error('Settling endpoint mismatch '+item.id);}
 groups.push(cloth);commitLayer();
}}finally{fit.UNDER=fit.UNDERZ=null;fit.PEND=[];fit.PENDZ=[];}
const meshes=[];
for(const g of groups){g.updateMatrixWorld(true);g.traverse(m=>{
 if(!m.isMesh||!m.geometry.attributes.position)return;const geo=m.geometry,P=geo.attributes.position,p=[],v=new THREE.Vector3();
 for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m.matrixWorld);p.push(v.x,v.y,v.z);}
 const mat=Array.isArray(m.material)?m.material[0]:m.material;
 // Ignore backface-only duplicate shells in the offline geometry renderer.
 if(mat.side===THREE.BackSide)return;
 meshes.push({positions:p,index:geo.index?Array.from(geo.index.array):Array.from({length:P.count},(_,i)=>i),uv:geo.attributes.uv?Array.from(geo.attributes.uv.array):[],texture:mat.map?.userData?.offlinePath,color:mat.map?[255,255,255]:mat.color?.toArray().map(x=>Math.round(x*255))});
});}
const result={b,items:ids,meshes,measurements:d.mhMeasures||null,animation,qc:Object.fromEntries(ids.map(id=>[id,QC[id]])),elapsedMs:performance.now()-started};
fs.writeFileSync(path.join(out,'scene.json'),JSON.stringify(result));
console.log(JSON.stringify({b,items:ids,measurements:result.measurements,animation,qc:Object.fromEntries(ids.map(id=>[id,{score:QC[id]?.score,ok:QC[id]?.ok}])),elapsedMs:result.elapsedMs}));
