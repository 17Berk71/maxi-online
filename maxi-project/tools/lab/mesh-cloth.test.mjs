import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeMeshBodyCollider} from '../../src/shop/fitting/mesh-body-collision.js';
import {shareSeamValues,projectSeams} from '../../src/shop/fitting/seam-groups.js';
import {clothProject} from '../../src/shop/fitting/cloth-mesh.js';
import {padTransparentTexels} from '../../src/shop/fitting/texture-padding.js';

test('front/back copies of a flank seam escape to the same side without a depth split',()=>{
  const nx=61,ny=201,front=new Float32Array(nx*ny).fill(-1e6),back=new Float32Array(nx*ny).fill(1e6);
  for(let y=0;y<ny;y++)for(let x=10;x<=50;x++){front[y*nx+x]=.12;back[y*nx+x]=-.12;}
  const field={nx,ny,front,back,xmin:-.3,ymin:0,step:.01},d={H:2,mhArmY:1.6,mhField:field,mhCore:field};
  const push=makeMeshBodyCollider(d,null,0);
  for(const side of [-1,1]){
    const a=new Float32Array([side*.195,1.2,.001]),b=new Float32Array([side*.195,1.2,-.001]);
    push(a,0,true);push(b,0,true);
    assert.ok(a[0]*side>.21);assert.ok(b[0]*side>.21);
    assert.ok(Math.abs(a[2]-b[2])<.003,'seam was separated across the chest depth');
    const old=a.slice();push(a,0,true);assert.deepEqual(a,old,'projection must settle');
  }
});

test('three-way seam normals count each face once, independent of seam order and duplicates',()=>{
  for(const seams of [[[0,1],[1,2]],[[1,2],[0,1]],[[0,1],[0,1],[2,1]]]){
    const N=Float32Array.from([1,0,0,0,2,0,0,0,3,7,8,9]);
    shareSeamValues({seams},N,3);
    assert.deepEqual([...N],[1,2,3,1,2,3,1,2,3,7,8,9]);
  }
});

test('one collision decision closes a mixed sleeve/body seam without changing pattern or UV data',()=>{
  const C={seams:[[0,1],[1,2]],meshes:[{verts:[0,1]},{verts:[2],local:true}],E:[0,3,.1,0]},E=C.E.slice();
  const P=Float32Array.from([0,1,0,.03,1,0,.06,1,0,1,2,3]);let calls=0;
  projectSeams(C,P,(p,i,noArm)=>{calls++;assert.equal(noArm,false);p[i+2]=.2;});
  assert.equal(calls,1);assert.deepEqual([...P.slice(0,3)],[...P.slice(3,6)]);assert.deepEqual([...P.slice(0,3)],[...P.slice(6,9)]);
  assert.deepEqual([...P.slice(9)],[1,2,3]);assert.deepEqual(C.E,E);
});

test('collision finishing refreshes lighting normals while preserving texture coordinates',()=>{
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,1,0,1,1,0,0,2,0],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));geometry.setIndex([0,1,2]);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry);mesh.userData.cm={mi:0,edges:[],straight:new Set()};
  const g=new THREE.Group();g.add(mesh);g.userData.cloth={C:{pin:[0,0,0],seams:[],meshes:[{verts:[0,1,2]}]},sewnG:new Set()};
  g.userData.surfacePush=(P,i)=>{if(P[i+1]>1.5&&P[i+2]<.5){P[i+2]=.5;return true;}return false;};
  const uv=geometry.attributes.uv.array.slice();clothProject(g);
  const normal=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,0);
  const a=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,0),b=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,1),c=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,2);
  assert.ok(Math.abs(normal.dot(c.sub(a)))<1e-6);assert.ok(Math.abs(normal.dot(b.sub(a)))<1e-6);
  assert.ok(Math.abs(normal.length()-1)<1e-6);assert.deepEqual(geometry.attributes.uv.array,uv);
});

test('corrected photo edge padding preserves opaque colours and prints byte for byte',()=>{
  const pixels=Uint8ClampedArray.from([255,0,20,255,0,0,0,0,0,0,0,0,0,30,255,255]),original=pixels.slice();
  assert.equal(padTransparentTexels(pixels,4,1),true);
  assert.deepEqual(pixels.slice(0,4),original.slice(0,4));assert.deepEqual(pixels.slice(12),original.slice(12));
  assert.deepEqual([...pixels.slice(4,8)],[255,0,20,255]);assert.deepEqual([...pixels.slice(8,12)],[0,30,255,255]);
  const empty=new Uint8ClampedArray(16);assert.equal(padTransparentTexels(empty,2,2),false);assert.ok(empty.every(v=>v===0));
  const opaque=Uint8ClampedArray.from([3,6,9,255]);assert.equal(padTransparentTexels(opaque,1,1),false);assert.deepEqual([...opaque],[3,6,9,255]);
});
