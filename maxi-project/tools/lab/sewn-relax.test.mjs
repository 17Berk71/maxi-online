import test from 'node:test';
import assert from 'node:assert/strict';
import {relaxSewnCloth} from '../../src/shop/fitting/cloth-relax.js';

test('extension is corrected on the sewn graph without changing the physical rest lengths',()=>{
 const C={pin:[1,0,0,0],seams:[[1,2]],E:[0,1,.2,0,2,3,.2,1],meshes:[]},P=new Float32Array([0,0,0,.8,0,0,.8,0,0,1.5,0,0]),rest=C.E.slice();
 relaxSewnCloth(C,P,()=>false,100);
 assert.ok(P[3]<=.209);assert.ok(P[9]-P[6]<=.217);assert.deepEqual(Array.from(P.slice(3,6)),Array.from(P.slice(6,9)));assert.deepEqual(C.E,rest);assert.equal(P[0],0);
});

test('one collision projection is copied to every member of the sewn junction',()=>{
 const C={pin:[0,0],seams:[[0,1]],E:[],sector:[],contactSide:[1,1]},P=new Float32Array([0,0,-.01,0,0,-.01]);let side;
 relaxSewnCloth(C,P,(V,q,noArm,s)=>{side=s;V[q+2]=Math.max(.02,V[q+2]);},2);
 assert.ok(P[2]>=.0199);assert.equal(P[2],P[5]);assert.equal(side,1);
});
