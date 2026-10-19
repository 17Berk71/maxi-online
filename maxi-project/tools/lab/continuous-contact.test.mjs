import test from 'node:test';import assert from 'node:assert/strict';import *as THREE from 'three';
import{buildUpperSurface,makeUpperMeshCollider}from'../../src/shop/fitting/triangle-surface.js';
import{surfaceWelds,shareSurfaceNormals}from'../../src/shop/fitting/surface-weld.js';
import{makeSurfaceResolver}from'../../src/shop/fitting/surface-resolve.js';
import{inspectSurfaceIntersections}from'./surface-intersections.mjs';
import{clothUpdate}from'../../src/shop/fitting/cloth-mesh.js';
import{bakeClothFrames,showClothFrame}from'../../src/shop/fitting/cloth-frames.js';
import{inspectShoulderContact}from'../../src/shop/fitting/surface-contact.js';
function mesh(P,I=[0,1,2]){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from(P).flatMap((v,k)=>k%3===2?[]:[v]),2));geo.setIndex(I);geo.computeVertexNormals();const m=new THREE.Mesh(geo);m.userData.cm={mi:0,edges:[],surfaceSide:[1,1,1]};return m;}

test('long-edge acceptance and independent exact audit catch a crossing whose triangle centre is outside',()=>{
 const body=new THREE.BoxGeometry(.2,.2,.2);body.translate(.25,1.3,0);const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)},g=new THREE.Group();g.add(mesh([.1,1.25,0,.4,1.25,0,.8,1.5,0]));
 const centre=new Float64Array([(.1+.4+.8)/3,(1.25+1.25+1.5)/3,0]),copy=centre.slice();makeUpperMeshCollider(d.mhUpper,0)(copy,0);assert.deepEqual(copy,centre);
 assert.ok(inspectShoulderContact(g,d).bad>0);assert.ok(inspectSurfaceIntersections(g,d).intersectingPairs>0);
});

test('topological seam welding shares every subdivision normal without joining nearby unrelated cloth',()=>{
 const g=new THREE.Group(),A=mesh([0,1,0,1,1,0,0,2,0,.5,1,0,.25,1,0]),B=mesh([0,1,0,1,1,0,0,0,0,.5,1,0,.25,1,0]),separate=mesh([0,1,0,1,1,0,0,2,0]);
 A.userData.cm={mi:0,edges:[[0,1]],refinements:[{start:4,edges:[[0,3]]}]};B.userData.cm={mi:1,edges:[[0,1]],refinements:[{start:4,edges:[[0,3]]}]};separate.userData.cm={mi:2,edges:[]};
 g.add(A,B,separate);g.userData.cloth={C:{pin:Array(9).fill(0),seams:[[0,3],[1,4]],meshes:[{verts:[0,1,2]},{verts:[3,4,5]},{verts:[6,7,8]}]}};
 A.geometry.attributes.normal.array.fill(0);B.geometry.attributes.normal.array.fill(0);for(let k=0;k<5;k++){A.geometry.attributes.normal.array[k*3+2]=1;B.geometry.attributes.normal.array[k*3+1]=1;}
 const untouched=separate.geometry.attributes.normal.array.slice(),uv=A.geometry.attributes.uv.array.slice();assert.equal(surfaceWelds(g).length,4);shareSurfaceNormals(g);
 for(const k of [0,1,3,4]){assert.deepEqual(A.geometry.attributes.normal.array.slice(k*3,k*3+3),B.geometry.attributes.normal.array.slice(k*3,k*3+3));assert.ok(Math.abs(A.geometry.attributes.normal.array[k*3+1]-Math.SQRT1_2)<1e-6);}
 assert.deepEqual(separate.geometry.attributes.normal.array,untouched);assert.deepEqual(A.geometry.attributes.uv.array,uv);
});

test('surface constraints clear a curved body crossing while retaining UVs and physical rest data',()=>{
 const body=new THREE.SphereGeometry(.2,40,24);body.translate(.25,1.3,0);const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)},P=[];
 for(let k=0;k<3;k++){const a=k*2*Math.PI/3;P.push(.25+.07*Math.cos(a),1.3+.07*Math.sin(a),.195);}
 const g=new THREE.Group(),m=mesh(P);g.add(m);g.userData.cloth={C:{P:P.slice(),pin:[0,0,0],seams:[],meshes:[{verts:[0,1,2]}]}};
 const push=makeUpperMeshCollider(d.mhUpper,.007);g.userData.surfacePush=(P,q,noArm,side)=>push(P,q,side);const uv=m.geometry.attributes.uv.array.slice(),physical=g.userData.cloth.C.P.slice();
 assert.ok(inspectSurfaceIntersections(g,d).intersectingPairs>0);assert.equal(makeSurfaceResolver(g,d)(),true);assert.equal(inspectSurfaceIntersections(g,d).intersectingPairs,0);assert.equal(inspectShoulderContact(g,d).bad,0);
 assert.deepEqual(m.geometry.attributes.uv.array,uv);assert.deepEqual(g.userData.cloth.C.P,physical);
});

test('cached surface clearance remains equivalent to fresh contact after small motion and a large jump',()=>{
 const body=new THREE.SphereGeometry(.2,40,24);body.translate(.25,1.3,0);const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)};
 const group=z=>{const P=[];for(let k=0;k<3;k++){const a=k*2*Math.PI/3;P.push(.25+.07*Math.cos(a),1.3+.07*Math.sin(a),z);}const g=new THREE.Group(),m=mesh(P);g.add(m);g.userData.cloth={C:{pin:[0,0,0],seams:[],meshes:[{verts:[0,1,2]}]}};const push=makeUpperMeshCollider(d.mhUpper,.007);g.userData.surfacePush=(P,q,noArm,side)=>push(P,q,side);return g;};
 const warm=group(.23),resolve=makeSurfaceResolver(warm,d);
 for(const z of [.23,.2298,.2296,.195,.194,.215]){const fresh=group(z),source=fresh.children[0].geometry.attributes.position.array;warm.children[0].geometry.attributes.position.array.set(source);resolve();makeSurfaceResolver(fresh,d)();const got=warm.children[0].geometry.attributes.position.array,want=fresh.children[0].geometry.attributes.position.array;
  assert.ok(want.every((v,i)=>Math.abs(v-got[i])<1e-6),'temporal clearance skipped a needed contact');assert.equal(inspectSurfaceIntersections(warm,d).intersectingPairs,0);
 }
 const push=makeUpperMeshCollider(d.mhUpper,.007),Q=Float64Array.from([.25,1.3,.195]);push(Q,0);assert.ok(push.clearance<0,'reported clearance must describe the original input, before projection');
});


test('prepared playback retains exact corrected geometry and lighting, and restores the static mesh',async()=>{
 const g=new THREE.Group(),P=Float32Array.from([.2,1.2,.2,.3,1.2,.2,.25,1.3,.2]),m=mesh(P);g.add(m);
 const C={pin:[0,0,0],seams:[],E:[0,1,.1,3,0,2,.1,0],meshes:[{verts:[0,1,2],tris:[0,1,2]}]};
 g.userData.cloth={C,flips:[false],sewnG:new Set()};g.userData.resolveSurface=()=>false;
 const F=new Float32Array(P.length*3);for(let k=0;k<3;k++){F.set(P,k*P.length);F[k*P.length+2]+=.003*k;}const A={F,nf:3};g.userData.anim=A;
 const expected=[];for(let k=0;k<3;k++){clothUpdate(g,F.subarray(k*P.length,(k+1)*P.length));expected.push({P:m.geometry.attributes.position.array.slice(),N:m.geometry.attributes.normal.array.slice()});}
 clothUpdate(g,P);const final=m.geometry.attributes.position.array.slice(),uv=m.geometry.attributes.uv.array.slice();assert.equal(await bakeClothFrames(g,A),true);assert.deepEqual(m.geometry.attributes.position.array,final);
 for(const k of [2,0,1]){showClothFrame(g,k);assert.deepEqual(m.geometry.attributes.position.array,expected[k].P);assert.deepEqual(m.geometry.attributes.normal.array,expected[k].N);assert.deepEqual(m.geometry.attributes.uv.array,uv);}
 assert.ok(g.userData.bakedClothFrames.bytes>0);
});

test('dense edge contact resolves a narrow crossing between fixed face samples',()=>{
 const body=new THREE.BoxGeometry(.025,.03,.06);body.translate(.18,1.25,0);
 const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)},g=new THREE.Group(),P=[.1,1.25,.02,.4,1.25,.02,.8,1.5,.02],m=mesh(P);g.add(m);
 g.userData.cloth={C:{pin:[0,0,0],seams:[],meshes:[{verts:[0,1,2]}]}};
 const push=makeUpperMeshCollider(d.mhUpper,.007);g.userData.surfacePush=(P,q,noArm,side)=>push(P,q,side);
 assert.ok(inspectSurfaceIntersections(g,d).intersectingPairs>0);
 makeSurfaceResolver(g,d)();assert.equal(inspectSurfaceIntersections(g,d).intersectingPairs,0);
});
