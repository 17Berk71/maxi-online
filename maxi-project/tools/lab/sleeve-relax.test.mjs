import test from 'node:test';
import assert from 'node:assert/strict';
import {relaxSleeves} from '../../src/shop/fitting/sleeve-relax.js';
import {garmentAssetKey} from '../../src/shop/fitting/asset-key.js';

test('relaxation preserves the armhole, unrelated vertices and pattern rest lengths', () => {
 const C={E:[0,1,.1,0,1,2,.1,0]}, P=new Float32Array([0,0,0,.3,0,0,.6,0,0,9,8,7]);
 const rest=C.E.slice(), fixed=P.slice(0,3), unrelated=P.slice(9);
 relaxSleeves(C,P,[{ring:[0],rings:[[0],[1],[2]]}],()=>{});
 assert.deepEqual(C.E,rest);assert.deepEqual(P.slice(0,3),fixed);assert.deepEqual(P.slice(9),unrelated);
 assert.ok(P[3]-P[0]<.111);assert.ok(P[6]-P[3]<.111);
});
test('collision projection follows every pass and leaves anchored cap unchanged', () => {
 const C={E:[0,1,.1,0]},P=new Float32Array([0,0,0,.3,-.1,0]);let calls=0;
 relaxSleeves(C,P,[{ring:[0],rings:[[0],[1]]}],(p,q)=>{calls++;p[q+1]=Math.max(0,p[q+1]);},12);
 assert.equal(calls,12);assert.equal(P[4],0);assert.deepEqual([...P.slice(0,3)],[0,0,0]);
});
test('pilot finish selection invalidates the garment cache',()=>{
 assert.notEqual(garmentAssetKey({shape:{}}),garmentAssetKey({shape:{sleeveFinish:'relax-v1'}}));
});
