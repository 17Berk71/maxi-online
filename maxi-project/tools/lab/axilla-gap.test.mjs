import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildUpperSurface,makeUpperMeshCollider} from '../../src/shop/fitting/triangle-surface.js';
import {blendContactSide} from '../../src/shop/fitting/cloth-mesh.js';

test('front/back orientation hints do not fill a genuinely empty concave body gap',()=>{
 const P=[],I=[];
 for(const z of [-.16,.16]){const box=new THREE.BoxGeometry(.2,.2,.1);box.translate(0,1.2,z);const offset=P.length/3;P.push(...box.attributes.position.array);I.push(...Array.from(box.index.array,v=>v+offset));}
 const surface=buildUpperSurface(Float32Array.from(P),Uint32Array.from(I),1.7),push=makeUpperMeshCollider(surface,.007);
 for(const side of [-1,1]){const Q=new Float64Array([0,1.2,-side*.02]),before=Q.slice();assert.equal(push(Q,0,side),false);assert.deepEqual(Q,before);}
});

test('neutral seam samples retain a plane; adjacent front and back samples keep their own side',()=>{
 assert.equal(blendContactSide(2,2),2);assert.equal(blendContactSide(2,-1),-1);assert.equal(blendContactSide(1,2),1);
 assert.equal(blendContactSide(-1,1),0);
});
