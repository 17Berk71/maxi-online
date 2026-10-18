import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildUpperSurface,makeUpperMeshCollider} from '../../src/shop/fitting/triangle-surface.js';
import {inspectShoulderContact,finishShoulderContact} from '../../src/shop/fitting/surface-contact.js';

test('warm contact bounds agree with fresh BVH searches after local motion and large jumps',()=>{
  const geo=new THREE.SphereGeometry(.2,32,20);geo.translate(.25,1.5,0);
  const surface=buildUpperSurface(geo.attributes.position.array,geo.index.array,1.7),warm=makeUpperMeshCollider(surface,.007),points=new Float64Array(3*32);
  for(let frame=0;frame<6;frame++)for(let i=0;i<32;i++){
    const a=(i+frame*.03)*Math.PI/16,r=frame===3?.5:.19+frame*.001,q=i*3;
    points[q]=.25+r*Math.cos(a);points[q+1]=1.5+r*Math.sin(a);points[q+2]=.015*Math.sin(a*2);
    const expected=points.slice(q,q+3),fresh=makeUpperMeshCollider(surface,.007);
    fresh(expected,0);warm(points,q);
    assert.ok(expected.every((v,k)=>Math.abs(v-points[q+k])<1e-8),'cached pruning changed a contact');
  }
});

// A closed box is an exact, non-spherical reference for the neutral seam plane.
test('neutral front/back seam stays on the body midplane and clears its section',()=>{
  const geo=new THREE.BoxGeometry(.2,.2,.2);geo.translate(.25,1.3,0);
  const surface=buildUpperSurface(geo.attributes.position.array,geo.index.array,1.7),push=makeUpperMeshCollider(surface,.007);
  for(const z of [-.08,.08]){const Q=new Float64Array([.34,1.3,z]);push(Q,0,2);assert.ok(Math.abs(Q[0]-.357)<1e-6);assert.equal(Q[2],0);}
  const Q=new Float64Array([.4,1.3,.08]);push(Q,0,2);assert.ok(Math.abs(Q[0]-.4)<1e-8);assert.equal(Q[2],0);
});

test('shoulder audit catches a triangle crossing the body with all vertices outside',()=>{
  const body=new THREE.BoxGeometry(.2,.2,.2);body.translate(.25,1.3,0);
  const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)};
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([.1,1.2,.15,.4,1.2,.15,.25,1.5,-.3],3));geometry.setIndex([0,1,2]);
  const mesh=new THREE.Mesh(geometry);mesh.userData.cm={};const g=new THREE.Group();g.add(mesh);
  const push=makeUpperMeshCollider(d.mhUpper,0),P=geometry.attributes.position.array;
  for(let q=0;q<P.length;q+=3){const Q=Float64Array.from(P.slice(q,q+3));push(Q,0);assert.ok(Q.every((v,k)=>Math.abs(v-P[q+k])<1e-8));}
  const report=inspectShoulderContact(g,d);assert.equal(report.tested,1);assert.equal(report.bad,1);assert.ok(report.maxDepth>.09);assert.equal(report.flaggedAreaM2,report.testedAreaM2);
});

test('a contact candidate that moves safe cloth into the body is rejected with its attributes restored',()=>{
  const body=new THREE.BoxGeometry(.2,.2,.2);body.translate(.25,1.3,0);
  const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)};
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([.36,1.25,-.02,.36,1.35,-.02,.36,1.3,.02],3));geometry.setIndex([0,1,2]);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry);mesh.userData.cm={mi:0,oriented:true,surfaceSide:[0,0,0],edges:[]};
  const g=new THREE.Group();g.add(mesh);g.userData.cloth={C:{pin:[0,0,0],seams:[],meshes:[{verts:[0,1,2]}]},sewnG:new Set()};
  g.userData.surfacePush=(P,q,noArm,hint)=>{if(hint!==2)return false;P[q]=.25;return true;};
  const P=geometry.attributes.position.array.slice(),N=geometry.attributes.normal.array.slice(),report=finishShoulderContact(g,d);
  assert.equal(report.before.bad,0);assert.equal(report.after.bad,0);assert.equal(report.neutralSeamsAccepted,false);assert.equal(g.userData.neutralSeams,false);
  assert.deepEqual(mesh.geometry.attributes.position.array,P);assert.deepEqual(mesh.geometry.attributes.normal.array,N);
});
