import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyDims,armCapAxes,armX} from '../../src/shop/fitting/body.js';
import {makeCollider} from '../../src/shop/fitting/collider.js';
import {runCloth} from '../../src/shop/fitting/sim.js';
import * as THREE from 'three';
import {capSurfaceCollider} from '../../src/shop/fitting/arm-cap-collision.js';
import {clothProject} from '../../src/shop/fitting/cloth-mesh.js';

test('visible upper-arm dome is protected above both rotated shoulder joints',()=>{
 for(const height of [160,186,205])for(const chest of [90,110,130])for(const angle of [.13,.22]){
  const d=bodyDims({sex:'m',height,weight:82,chest,waist:82,hips:98});d.armA=angle;
  const cap=armCapAxes(d),push=makeCollider(d),joint=armX(d);
  for(const side of[-1,1])for(const u of[.2,.5,.8,1])for(let j=0;j<16;j++){
   const phi=j*Math.PI/8,r=cap.radius*Math.sqrt(1-u*u),up=cap.height*u;
   const dx=side*Math.sin(angle),dy=-Math.cos(angle),rx=Math.cos(angle)*r*Math.cos(phi),ry=side*Math.sin(angle)*r*Math.cos(phi);
   const P=new Float32Array([side*joint-dx*up+rx,.8*d.H-dy*up+ry,r*Math.sin(phi)]);
   push(P,0);
   const t=(P[0]-side*joint)*dx+(P[1]-.8*d.H)*dy;
   if(t>=0)continue;
   const x=P[0]-side*joint-dx*t,y=P[1]-.8*d.H-dy*t;
   const q=(x*x+y*y+P[2]*P[2])/((cap.radius+.007)**2)+t*t/((cap.height+.007)**2);
   assert.ok(q>.998,'a rendered cap vertex remains inside its cloth collider');
  }
 }
});
test('short settling ends at exactly the same solver positions as static fitting',()=>{
 const C={P:[0,1,0,.1,1,0,0,1.1,0],pin:[0,0,0],E:[0,1,.1,0,0,2,.1,0,1,2,Math.sqrt(.02),0],seams:[],meshes:[]};
 const push=(p,q)=>{if(p[q+1]<.004){p[q+1]=.004;return true;}return false;};
 const fab={stretch:.8,comp:.3,bend:.1},o={rec:'settle'};
 const still=runCloth(C,push,fab,0),animated=runCloth(C,push,fab,0,o);
 assert.deepEqual(animated,still);assert.equal(o.nf,37);assert.ok([...o.frames].every(Number.isFinite));assert.ok([...o.meta].every(x=>x===0));
 assert.deepEqual(o.frames.slice(-still.length),still);
});

test('rendered intermediate vertices clear cap and upper-arm surfaces in every frame',()=>{
 const d=bodyDims({sex:'m',height:186,weight:82,chest:110,waist:82,hips:98});d.armA=.13;
 const x=armX(d),th=d.armA,L=.335*d.H,cap=armCapAxes(d),points=[];
 for(const side of[-1,1])for(const t of[-cap.height*.5,L*.07]){
  const dx=side*Math.sin(th),dy=-Math.cos(th);
  points.push(side*x+dx*t+Math.cos(th)*.015,.8*d.H+dy*t+side*Math.sin(th)*.015,.005);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const mesh=new THREE.Mesh(geo);mesh.userData.cm={};const group=new THREE.Group();group.add(mesh);group.userData.surfacePush=capSurfaceCollider(d);
 const original=geo.attributes.position.array.slice();clothProject(group);const projected=geo.attributes.position.array.slice();
 assert.ok(projected.some((v,i)=>Math.abs(v-original[i])>.002));
 clothProject(group);assert.ok(geo.attributes.position.array.every((v,i)=>Math.abs(v-projected[i])<1e-6));
});
