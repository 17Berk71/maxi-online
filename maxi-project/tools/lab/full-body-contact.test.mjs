import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildUpperSurface} from '../../src/shop/fitting/triangle-surface.js';
import {makeMeshBodyCollider} from '../../src/shop/fitting/mesh-body-collision.js';

test('full-body contact uses actual lower-leg triangles below the old torso cutoff',()=>{
 const box=new THREE.BoxGeometry(.1,.16,.1);box.translate(.1,.16,0);
 const surface=buildUpperSurface(box.attributes.position.array,box.index.array,1.7,0);
 assert.equal(surface.fullBody,true);assert.ok(surface.index.length>0);
 const empty={xmin:-1,ymin:0,step:.1,nx:30,ny:30,front:new Float32Array(900).fill(-1),back:new Float32Array(900).fill(1)},push=makeMeshBodyCollider({H:1.7,mhUpper:surface,mhField:empty,mhCore:empty,mhArmY:1.3},null,0),P=new Float64Array([.1,.16,0]);
 assert.equal(push(P,0,false),true);assert.ok(Math.hypot(P[0]-.1,P[1]-.16,P[2])>=.0569);
});
