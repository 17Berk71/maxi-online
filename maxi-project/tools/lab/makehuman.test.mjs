import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import * as THREE from 'three';
import {bodyDims,torsoR,sx,sz,armX,shoulderAxes,armCapAxes} from '../../src/shop/fitting/body.js';
import {buildBody} from '../../src/shop/fitting/mannequin.js';
import {prepareMakeHuman,validateMakeHumanBody,loadMakeHuman} from '../../src/shop/fitting/makehuman-body.js';
import {makeCollider,legR} from '../../src/shop/fitting/collider.js';
import {makeMeshBodyCollider} from '../../src/shop/fitting/mesh-body-collision.js';
import {makeUpperMeshCollider} from '../../src/shop/fitting/triangle-surface.js';
import {pushArmCap} from '../../src/shop/fitting/arm-cap-collision.js';
import {armJ,armRad} from '../../src/shop/fitting/geometry.js';

const bodies=[
 {sex:'m',height:186,weight:82,chest:110,waist:82,hips:98},
 {sex:'f',height:173,weight:56,chest:82,waist:62,hips:92},
 {sex:'m',height:150,weight:48,chest:78,waist:65,hips:82},
 {sex:'m',height:205,weight:130,chest:140,waist:120,hips:130},
 {sex:'f',height:155,weight:80,chest:110,waist:96,hips:118},
 {sex:'f',height:205,weight:90,chest:105,waist:82,hips:110},
];
await loadMakeHuman();
test('adult reference bodies preserve height and girths without disconnected limbs',()=>{
 for(const body of bodies){
  const d=bodyDims({...body,model:'makehuman'}),{g}=buildBody(d.b,new THREE.MeshBasicMaterial(),d);
  assert.equal(g.children.length,1);const geo=g.children[0].geometry,P=geo.attributes.position.array;
  assert.equal(geo.attributes.position.count,13380);assert.ok([...P].every(Number.isFinite));
  let lo=Infinity,hi=-Infinity;for(let i=1;i<P.length;i+=3){lo=Math.min(lo,P[i]);hi=Math.max(hi,P[i]);}
  assert.ok(Math.abs(lo)<1e-6);assert.ok(Math.abs(hi-d.H)<1e-5);
  for(const k of ['chest','waist','hips'])assert.ok(Math.abs(d.mhMeasures[k]-body[k])<.5,`${k}: ${d.mhMeasures[k]} vs ${body[k]}`);
  // A stretched shoulder seam must not create long spike triangles.
  const I=geo.index.array;let longest=0;
  for(let i=0;i<I.length;i+=3)for(let j=0;j<3;j++){const a=I[i+j]*3,b=I[i+(j+1)%3]*3;longest=Math.max(longest,Math.hypot(P[a]-P[b],P[a+1]-P[b+1],P[a+2]-P[b+2]));}
  assert.ok(longest<d.H*.08,`spike edge ${longest}`);
 }
});
test('unsupported combinations fail explicitly instead of silently changing garment/body measurements',()=>{
 assert.throws(()=>validateMakeHumanBody({...bodies[0],height:140,chest:150}),/комбинация/);
 assert.throws(()=>validateMakeHumanBody({...bodies[0],waist:NaN}),/мерки/);
 assert.throws(()=>validateMakeHumanBody({...bodies[0],height:210,waist:50}),/комбинация/);
});
test('final mesh and collision fields are rebuilt for the selected arm spread',()=>{
 const d=bodyDims({...bodies[0],model:'makehuman'}),old=d.mhField;d.armA=.35;prepareMakeHuman(d);
 assert.equal(d.mhPose,.35);assert.notEqual(d.mhField,old);
 const x=new Float32Array([0,.72*d.H,0]),push=makeCollider(d,null);assert.equal(push(x,0,true),true);assert.ok([...x].every(Number.isFinite));
 const before=x.slice();push(x,0,true);assert.ok(Math.hypot(...x.map((v,i)=>v-before[i]))<1e-5);
 assert.throws(()=>push.setArm(.2),/fixed-pose/);
});
test('mesh collider runs with cloned numeric fields in the actual worker serialization scheme',()=>{
 const d=bodyDims({...bodies[0],model:'makehuman'}),clone=structuredClone(d);assert.equal(clone.mhGeometry,undefined);
 const src=[torsoR,sx,sz,armRad,armX,armCapAxes,shoulderAxes,armJ,legR,pushArmCap,makeUpperMeshCollider,makeMeshBodyCollider,makeCollider].map(f=>/^function[\s*(]/.test(f.toString())?f.toString():'const '+f.name+' = '+f.toString()+';').join('\n');
 const sandbox={d:clone,P:new Float32Array([0,.72*d.H,0])};vm.runInNewContext(src+'\nmakeCollider(d,null)(P,0,true);',sandbox);
 const P=new Float32Array([0,.72*d.H,0]);makeCollider(d,null)(P,0,true);assert.deepEqual([...sandbox.P],[...P]);
});
