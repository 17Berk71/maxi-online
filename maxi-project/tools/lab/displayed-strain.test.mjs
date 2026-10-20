import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {inspectStrain,displayedPositions,backSourceStatus,perimeterCentre} from '../../src/shop/fitting/quality-metrics.js';

test('a display correction cannot hide extension behind a relaxed solver state',()=>{
 const C={meshes:[{verts:[0,1],role:'sleeve'}],E:[0,1,1,1]},P=[0,0,0,1,0,0],g=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BufferGeometry());
 mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1.8,0,0],3));mesh.userData.cm={mi:0};g.add(mesh);
 assert.equal(inspectStrain(C,P,'tee').parts[0].maxExtension,0);
 const part=inspectStrain(C,displayedPositions(g,C,P),'tee').parts[0];assert.ok(part.maxExtension>.79);assert.equal(part.direction,'bias');assert.equal(part.overFraction,1);
 assert.deepEqual(P,[0,0,0,1,0,0]);
});

test('duplicate files at different URLs and material-only back crops are not complete views',()=>{
 const item={tex:{front:'front.webp',back:'back.webp'},digitization:{front:{sourceSha256:'same'},back:{sourceSha256:'same'}}},dr={back:{}};
 assert.equal(backSourceStatus(item,dr),'duplicate');item.digitization.back={sourceSha256:'other',coverage:'material-only'};assert.equal(backSourceStatus(item,dr),'partial');
 item.digitization.back={sourceSha256:'other'};assert.equal(backSourceStatus(item,dr),'independent');
 item.tex.back=item.tex.front;assert.equal(backSourceStatus(item,dr),'missing');
});

test('adding collinear samples on one ring edge does not move the reported centre',()=>{
 const a=[[0,0,0],[2,0,0],[2,2,0],[0,2,0]],b=[[0,0,0],[.1,0,0],[.2,0,0],[1,0,0],...a.slice(1)];
 assert.deepEqual(perimeterCentre(a),[1,1,0]);assert.deepEqual(perimeterCentre(b),[1,1,0]);
});
