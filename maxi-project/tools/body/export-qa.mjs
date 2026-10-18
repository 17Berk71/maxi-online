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
import {classify} from '../../src/shop/fitting/classify.js';
import {clothMeshes,clothUpdate} from '../../src/shop/fitting/cloth-mesh.js';
import {inspectSurfaceIntersections} from '../lab/surface-intersections.mjs';
import {inspectSurfaceSeams,inspectPatternBoundary} from '../../src/shop/fitting/surface-weld.js';
import {inspectShoulderContact} from '../../src/shop/fitting/surface-contact.js';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
const packDir=path.join(ROOT,'tools/wardrobe/out'),out=process.env.OUT;
if(!out)throw new Error('OUT must be a private output directory');fs.mkdirSync(out,{recursive:true});
if(process.env.POINT_STAGE&&process.env.ANIMATION==='1')throw new Error('Point-stage snapshots require static export');
// Only material construction uses these canvases. Their contents are not rendered:
// the offline renderer samples the actual photo map and omits shader normal maps.
globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
const b={sex:'m',height:186,weight:82,chest:110,waist:82,hips:98,...JSON.parse(process.env.BODY||'{}'),model:process.env.MODEL||'makehuman'};
const ids=(process.env.ITEMS||'').split(',').filter(Boolean),catalog=JSON.parse(fs.readFileSync(packDir+'/index.json'));
const order={shoes:0,bottom:1,dress:2,top:3,outer:4};
const items=ids.map(id=>{
 const meta=JSON.parse(fs.readFileSync(path.join(packDir,id,'meta.json'))),entry=catalog.find(x=>x.id===id);
 const item={...entry,...meta,id,shape:meta.shape||entry.shape,sizesT:entry.sizes,size:(process.env.SIZE||'')||entry.sizes?.[0]?.name,tex:{}};
 for(const [name,file] of Object.entries({front:'front.webp',back:'back.webp',frontCut:'front_cut.webp',backCut:'back_cut.webp',sleeve:'sleeve.webp'})){
  const p=path.join(packDir,id,file);if(!fs.existsSync(p))continue;item.tex[name]=p;
  for(const suffix of ['','|corrected-v1','|flat','|flat|corrected-v1']){const t=new THREE.Texture();t.userData={offlinePath:p};PTEX[p+suffix]=t;}
 }return item;
}).sort((a,b)=>order[classify(a)?.slot]-order[classify(b)?.slot]);
const started=performance.now();if(b.model==='makehuman')await loadMakeHuman();const d=bodyDims(b);d.armA=armSpread(items,d);
const {g}=buildBody(b,new THREE.MeshStandardMaterial({color:0xeeeeee}),d),groups=[g],animation=[],surfaceContact={};
fit.UNDER=[];fit.UNDERZ=[];fit.BOT_YW=0;
try{for(const item of items){
 const under=fit.UNDER?{a:fit.UNDER.slice(),b:fit.UNDERZ.slice()}:null,job=drapePrepare(item,d,under);
 if(!job)throw new Error('Missing cloth job '+item.id);
 const o={rec:process.env.ANIMATION==='1'?'settle':false},P=runCloth(job.C,makeCollider(d,job.under,job.margin),job.fab,job.yPin,o);
 if(!Array.from(P).every(Number.isFinite))throw new Error('Non-finite cloth '+item.id);
 if(o.frames){let maxSeamGap=0;for(let k=0;k<o.nf;k++){
  const frame=o.frames.subarray(k*P.length,(k+1)*P.length);job.finishPoints(frame);
  for(const [a,b] of job.C.seams)maxSeamGap=Math.max(maxSeamGap,Math.hypot(frame[a*3]-frame[b*3],frame[a*3+1]-frame[b*3+1],frame[a*3+2]-frame[b*3+2]));
 }animation.push({id:item.id,frames:o.nf,finite:Array.from(o.frames).every(Number.isFinite),maxSeamGap});}
 let captured;
 if(process.env.POINT_STAGE)job.finishPoints(P,(name,points)=>{if(name===process.env.POINT_STAGE)captured=points.slice();});
 const cloth=captured?clothMeshes(job.C,captured,d.H):job.finish(P);if(o.frames){const last=o.frames.subarray((o.nf-1)*P.length),record=animation.at(-1);record.endpointMaxDifference=Math.max(...P.map((v,i)=>Math.abs(v-last[i])));if(record.endpointMaxDifference>1e-6)throw new Error('Settling endpoint mismatch '+item.id);}
 if(o.frames&&process.env.SURFACE_ANIMATION_QA==='1'&&cloth.userData.contactQA){
  const saved=[];cloth.traverse(m=>{if(m.isMesh)saved.push([m,m.geometry.clone()]);});
  const checks=[];
  try{for(let k=0;k<o.nf;k++){
   const updateStart=performance.now();clothUpdate(cloth,o.frames.subarray(k*P.length,(k+1)*P.length));const updateMs=performance.now()-updateStart;
   if(process.env.QA_PROGRESS&&k%10===0)console.error(item.id+' display frame '+k+'/'+o.nf+' update '+updateMs.toFixed(1)+' ms');
   const {badTriangles,...report}=inspectShoulderContact(cloth,d);checks.push({frame:k,updateMs,...report,seams:inspectSurfaceSeams(cloth),...(process.env.EXACT_CONTACT_QA?{intersections:inspectSurfaceIntersections(cloth,d)}:{})});
  }}finally{for(const [m,geometry] of saved){m.geometry.dispose();m.geometry=geometry;}}
  animation.at(-1).surfaceContact=checks;
 }
 if(cloth.userData.contactQA){surfaceContact[item.id]=cloth.userData.contactQA;if(process.env.EXACT_CONTACT_QA)surfaceContact[item.id].intersections=inspectSurfaceIntersections(cloth,d);surfaceContact[item.id].seams=inspectSurfaceSeams(cloth);const boundary=inspectPatternBoundary(cloth);surfaceContact[item.id].topology={boundaryLoops:boundary.loops.length,nonmanifold:boundary.nonmanifold,collapsed:boundary.collapsed,irregularBoundaryVertices:boundary.loops.reduce((n,l)=>n+l.degree,0)};}
 groups.push(cloth);commitLayer();
}}finally{fit.UNDER=fit.UNDERZ=null;fit.PEND=[];fit.PENDZ=[];}
const meshes=[];
for(const g of groups){g.updateMatrixWorld(true);g.traverse(m=>{
 if(!m.isMesh||!m.geometry.attributes.position)return;const geo=m.geometry,P=geo.attributes.position,p=[],v=new THREE.Vector3();
 for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m.matrixWorld);p.push(v.x,v.y,v.z);}
 const mat=Array.isArray(m.material)?m.material[0]:m.material;
 // Ignore backface-only duplicate shells in the offline geometry renderer.
 if(mat.side===THREE.BackSide)return;
 meshes.push({positions:p,index:geo.index?Array.from(geo.index.array):Array.from({length:P.count},(_,i)=>i),uv:geo.attributes.uv?Array.from(geo.attributes.uv.array):[],texture:mat.map?.userData?.offlinePath,color:mat.map?[255,255,255]:mat.color?.toArray().map(x=>Math.round(x*255)),...(process.env.CONTACT_DEBUG?{contactSide:m.userData.cm?.surfaceSide,role:m.userData.role||'sleeve'}:{})});
});}
const result={b,items:items.map(i=>i.id),requestedItems:ids,meshes,measurements:d.mhMeasures||null,animation,surfaceContact,qc:Object.fromEntries(ids.map(id=>[id,QC[id]])),elapsedMs:performance.now()-started};
fs.writeFileSync(path.join(out,'scene.json'),JSON.stringify(result));
console.log(JSON.stringify({b,items:ids,measurements:result.measurements,animation,surfaceContact,qc:Object.fromEntries(ids.map(id=>[id,{score:QC[id]?.score,ok:QC[id]?.ok}])),elapsedMs:result.elapsedMs}));
