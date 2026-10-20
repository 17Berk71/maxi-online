import test from 'node:test';
import assert from 'node:assert/strict';
import {bottomSpec} from '../../src/shop/fitting/specs.js';
import {bodyDims} from '../../src/shop/fitting/body.js';

test('a sparse leg profile remains finite when hip or hem measurements modify its tail',()=>{
 const d=bodyDims({sex:'m',height:176,weight:74,chest:96,waist:78,hips:98});
 for(const leg of [undefined,[],[.6],[.6,.5]])for(const cm of [{hip:52},{hem:20}]){
  const spec=bottomSpec({kind:'pants',shape:{leg,cm}},d);assert.ok(spec.lw.length>=3);assert.ok(spec.lw.every(v=>Number.isFinite(v)&&v>0));
 }
});
