import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildUpperSurface,makeUpperMeshCollider} from '../../src/shop/fitting/triangle-surface.js';
import {drapePrepare} from '../../src/shop/fitting/drape.js';
import {PTEX} from '../../src/shop/fitting/photo-texture.js';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {loadMakeHuman} from '../../src/shop/fitting/makehuman-body.js';
import {refineClothSurface,clothUpdate} from '../../src/shop/fitting/cloth-mesh.js';

test('triangle contact on a sloped shoulder follows its outward normal without axis jumps',()=>{
  // The top of a closed tilted slab is y = 1.6 - x.
  const geo=new THREE.BoxGeometry(1,.4,1);geo.rotateZ(-Math.PI/4);geo.translate(0,1.6-.2*Math.SQRT2,0);
  const surface=buildUpperSurface(geo.attributes.position.array,geo.index.array,1),push=makeUpperMeshCollider(structuredClone(surface),.007);
  for(const x of [.10,.11,.12]){
    const p=Float32Array.from([x,1.6-x-.01,0]);assert.equal(push(p,0),true);
    const signed=(p[0]+p[1]-1.6)/Math.SQRT2;assert.ok(Math.abs(signed-.007)<1e-6);
    const old=p.slice();push(p,0);assert.ok(p.every((v,i)=>Math.abs(v-old[i])<1e-6));
  }
});

test('BVH contact keeps a curved closed shoulder surface outside its collision margin',()=>{
  const geo=new THREE.SphereGeometry(.2,32,20);geo.translate(0,1.5,0);
  const surface=buildUpperSurface(geo.attributes.position.array,geo.index.array,1.7),push=makeUpperMeshCollider(surface,.007);
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,p=Float32Array.from([.19*Math.cos(a),1.5+.19*Math.sin(a),.01]);push(p,0);
    assert.ok(Math.hypot(p[0],p[1]-1.5,p[2])>.204,'contact left the cloth inside the sphere');
    const old=p.slice();push(p,0);assert.ok(p.every((v,i)=>Math.abs(v-old[i])<1e-5));
  }
});

test('front/back surface hints preserve sleeve orientation around a closed arm surface',()=>{
  const geo=new THREE.SphereGeometry(.08,32,20);geo.translate(.25,1.4,0);
  const surface=buildUpperSurface(geo.attributes.position.array,geo.index.array,1.7),push=makeUpperMeshCollider(surface,.007);
  for(const side of [-1,1]){
    const p=Float32Array.from([.25,1.4,-side*.02]);push(p,0,side);
    assert.ok(p[2]*side>.08,'a front patch was projected behind the arm');
    const old=p.slice();push(p,0,side);assert.ok(p.every((v,i)=>Math.abs(v-old[i])<1e-6));
  }
  const outside=Float32Array.from([0,1.4,0]),old=outside.slice();push(outside,0,1);assert.deepEqual(outside,old);
});

await loadMakeHuman();
test('tee armholes match cap topology without rounding several contour points onto one sample',()=>{
  const url='synthetic-shoulder-test';PTEX[url]=new THREE.Texture();
  const item={id:'topology-test',kind:'tee',tex:{front:url,back:url,sleeve:url},shape:{tw:Array(16).fill(.75),cm:{chest:54},construction:{units:'cm',reference_width_cm:54,estimated:true,dimensions:{len:66,shoulder:43,sleeve:20,armDepth:23}}}};
  for(const body of [{sex:'m',height:186,weight:82,chest:110,waist:82,hips:98},{sex:'f',height:173,weight:56,chest:82,waist:62,hips:92}]){
    const d=bodyDims({...body,model:'makehuman'}),job=drapePrepare(item,d,null);
    assert.equal(job.sleeveChains.length,2);
    for(const ch of job.sleeveChains){
      assert.equal(ch.matchedCap,true);assert.equal(ch.ring.length,ch.lf.length+ch.lb.length-2);
      const ringSet=new Set(ch.ring),uses=new Map(ch.ring.map(v=>[v,0]));
      for(const [a,b] of job.C.seams)if(ringSet.has(b)&&!ringSet.has(a))uses.set(b,uses.get(b)+1);
      for(const [i,v] of ch.ring.entries())assert.equal(uses.get(v),i===0||i===ch.lf.length-1?2:1);
      // Every selected chain segment is a real edge of its panel, including
      // the diagonal step at the armpit; a label-only list can skip such edges.
      for(const chain of [ch.lf,ch.lb]){
        const part=job.C.meshes.find(m=>m.verts.includes(chain[0])&&!m.local),edgeSet=new Set();
        for(let t=0;t<part.tris.length;t+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){
          const i=part.verts[part.tris[t+a]],j=part.verts[part.tris[t+b]];edgeSet.add(i<j?i+':'+j:j+':'+i);
        }
        for(let k=1;k<chain.length;k++){const a=chain[k-1],b=chain[k];assert.ok(edgeSet.has(a<b?a+':'+b:b+':'+a));}
      }
    }
    assert.equal(job.C.meshes.find(m=>m.role==='front').uv.length>0,true);
  }
  delete PTEX[url];
});

test('extra surface samples remain defined during playback without changing source UVs',()=>{
  const geometry=new THREE.BufferGeometry(),P=Float32Array.from([0,1,0,1,1,0,0,2,0]);
  geometry.setAttribute('position',new THREE.BufferAttribute(P.slice(),3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));geometry.setIndex([0,1,2]);
  const part={verts:[0,1,2],tris:[0,1,2]},C={pin:[0,0,0],seams:[],E:[0,1,1,0,0,2,1,0],meshes:[part]};
  const mesh=new THREE.Mesh(geometry);mesh.userData.cm={mi:0,edges:[],straight:new Set()};
  const g=new THREE.Group();g.add(mesh);g.userData.cloth={C,flips:[false],sewnG:new Set()};
  const uv=geometry.attributes.uv.array.slice();refineClothSurface(g);
  assert.equal(geometry.attributes.position.count,6);assert.equal(geometry.index.count,12);
  const next=P.slice();next[2]=.1;clothUpdate(g,next);
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  assert.deepEqual(geometry.attributes.uv.array.slice(0,6),uv);
  assert.ok(Math.abs(geometry.attributes.position.array[3*3+2]-.05)<1e-7);
});
