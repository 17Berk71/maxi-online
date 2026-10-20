import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {triangulatePanel,addConformingPanel} from '../../src/shop/fitting/panel-mesh.js';
import {makeCloth,addTube} from '../../src/shop/fitting/pattern.js';

test('concave sewing boundaries retain each corner, segment and exactly one opening',()=>{
 const poly=[[0,0],[.2,0],[.2,.08],[.15,.18],[.24,.27],[.24,.7],[-.24,.7],[-.24,.27],[-.15,.18],[-.2,.08],[-.2,0]];
 const {P,tris,boundary}=triangulatePanel(poly,poly.map((_,i)=>String(i)),.015),edges=new Map();
 for(let i=0;i<tris.length;i+=3)for(let j=0;j<3;j++){const a=tris[i+j],b=tris[i+(j+1)%3],k=[a,b].sort((x,y)=>x-y).join(':');edges.set(k,(edges.get(k)||0)+1);}
 assert.equal(P.length-edges.size+tris.length/3,1,'disk Euler characteristic');
 for(let i=0;i<poly.length;i++){assert.deepEqual(P[i],poly[i]);const row=[...boundary[i],(i+1)%poly.length];for(let j=1;j<row.length;j++)assert.equal(edges.get([row[j-1],row[j]].sort((a,b)=>a-b).join(':')),1);}
 assert.ok([...edges.values()].every(n=>n===1||n===2));
});

test('collinear original corners remain represented, not discarded by triangulation',()=>{
 const poly=[[0,0],[.1,0],[.2,0],[.2,.3],[0,.3]],m=triangulatePanel(poly,poly.map(()=> 'edge'),.02);
 for(let i=0;i<poly.length;i++)assert.ok(m.tris.includes(i));
});

test('panel rest metric stays flat when the initial drape is bent or stretched',()=>{
 const poly=[[0,0],[.2,0],[.2,.3],[0,.3]],a=makeCloth(),b=makeCloth();
 const args=[poly,poly.map(()=> 'sew'),.02];
 addConformingPanel(a,...args,(x,y)=>[x,y,0],(x,y)=>[x,y],null,'front');
 addConformingPanel(b,...args,(x,y)=>[Math.sin(x*10)*.1,y*3,Math.cos(x*10)*.1],(x,y)=>[x,y],null,'front');
 assert.deepEqual(a.E,b.E);assert.notDeepEqual(a.P,b.P);
});

test('sleeve material lengths do not change with cap placement or nonuniform angular sampling',()=>{
 const a=makeCloth(),b=makeCloth(),n=12,angles=Array.from({length:n},(_,i)=>2*Math.PI*(i/n)**1.15);
 const cap={center:new THREE.Vector3(0,1,0),ry:.12,rz:.07,angles,flatMetric:true};
 for(const [C,scale]of [[a,1],[b,3]])addTube(C,new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),.22,()=>.06,n,12,null,1,(u,v)=>[u,v],{...cap,ry:cap.ry*scale,rz:cap.rz*scale});
 assert.deepEqual(a.E,b.E);assert.notDeepEqual(a.P,b.P);
 const circ=a.E.filter((_,i)=>i%4===2&&a.E[i+1]===3).slice(0,n).reduce((s,v)=>s+v,0);
 assert.ok(Math.abs(circ-2*Math.PI*.06)<1e-10);
 assert.equal(a.meshes[0].uv[n][0],1,'UV seam closes without mapping last vertex to first texel');
});
