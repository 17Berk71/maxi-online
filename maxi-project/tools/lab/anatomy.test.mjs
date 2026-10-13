import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {bodyDims,shoulderAxes,torsoR,sz} from '../../src/shop/fitting/body.js';
import {buildBody} from '../../src/shop/fitting/mannequin.js';
import {bodyAB} from '../../src/shop/fitting/geometry.js';
import {makeCollider} from '../../src/shop/fitting/collider.js';

test('neck is attached and carries the scale used by body painting',()=>{
 const {g,d}=buildBody({sex:'m',height:186,weight:82,chest:110,waist:82,hips:98},new THREE.MeshBasicMaterial());
 const neck=g.children.find(x=>x.userData.part==='neck');assert.ok(neck);assert.equal(neck.userData.s,d.s);
});
test('shoulder render and collision axes share a bounded envelope across body controls',()=>{
 for(const height of [140,160,186,210])for(const chest of [70,110,150])for(const weight of [40,82,140]){
  const body={sex:'m',height,chest,weight,waist:82,hips:98},d=bodyDims(body),a=shoulderAxes(d);
  assert.ok(torsoR(d,.842)<=torsoR(d,.826)+1e-12,'trapezius must not flare into a collar shelf');
  assert.ok(a.y<=d.H*.038+1e-12);assert.ok(a.x>0&&a.z>0);
  const {g}=buildBody(body,new THREE.MeshBasicMaterial(),d),sh=g.children.find(x=>x.userData.part==='sh');
  for(const key of ['x','y','z'])assert.ok(Math.abs(sh.scale[key]-a[key]*.97)<1e-12);
  const ab=bodyAB(d,.8);assert.ok(Math.abs(ab.b-Math.max(torsoR(d,.8)*sz(d,.8),a.z))<1e-12);
  const P=new Float32Array([a.x*.5,d.H*.8,0]);makeCollider(d,null)(P,0);assert.ok([...P].every(Number.isFinite));
 }
});
