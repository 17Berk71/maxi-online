import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadMakeHuman} from '../../src/shop/fitting/makehuman-body.js';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {buildBody} from '../../src/shop/fitting/mannequin.js';
import {drapePrepare} from '../../src/shop/fitting/drape.js';
import {inspectPatternBoundary} from '../../src/shop/fitting/surface-weld.js';
import {buildUpperSurface} from '../../src/shop/fitting/triangle-surface.js';
import {makeMeshBodyCollider} from '../../src/shop/fitting/mesh-body-collision.js';
import {seamGroups,pruneCollapsedSeams} from '../../src/shop/fitting/seam-groups.js';
import {createFitting} from '../../src/shop/fitting/ui.js';
import {toItem} from '../../src/shop/fitting/room-wardrobe.js';
import {garmentAssetKey} from '../../src/shop/fitting/asset-key.js';
import {fit} from '../../src/shop/fitting/state.js';
import {armJ} from '../../src/shop/fitting/geometry.js';
import {topMeasures} from '../../src/shop/fitting/measures.js';
import {clothMeshes,clothUpdate} from '../../src/shop/fitting/cloth-mesh.js';
import {inspectSurfaceSeams} from '../../src/shop/fitting/surface-weld.js';
import {inspectShoulderContact} from '../../src/shop/fitting/surface-contact.js';

test('sweaters, open jackets and hoodies have manifold sewn armholes and only intended openings',async()=>{
 await loadMakeHuman();const b={sex:'f',height:173,weight:56,chest:82,waist:62,hips:92,model:'makehuman'},d=bodyDims(b);
 buildBody(b,new THREE.MeshStandardMaterial(),d);fit.UNDER=[];fit.UNDERZ=[];
 for(const [kind,state,count] of [['tee','',4],['sweater','loose',4],['jacket','open',3],['jacket','closed',4],['hoodie','closed',4]]){
  const j=drapePrepare({id:kind,kind,state,tex:{},shape:{cm:{chest:48,len:65,shoulder:40,sleeve:58}}},d);
  assert.ok(j.C.P.every(Number.isFinite),'measurement-only input generated invalid cloth');
  assert.ok(j.C.orientedSleeves);const q=inspectPatternBoundary({userData:{cloth:{C:j.C}}});
  assert.equal(q.nonmanifold,0,kind);assert.equal(q.collapsed,0,kind);assert.equal(q.loops.length,count,kind);
  assert.ok(q.loops.every(l=>l.degree===0),kind);
 }
});

test('forearm contact uses the visible triangle surface on either side, below the former shoulder cutoff',()=>{
 const body=new THREE.BoxGeometry(.1,.2,.1);body.translate(.3,.9,0);
 const empty={xmin:-1,ymin:0,step:.1,nx:30,ny:30,front:new Float32Array(900).fill(-1),back:new Float32Array(900).fill(1)};
 const d={H:1.73,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.73),mhField:empty,mhCore:empty,mhArmY:1.38};
 const push=makeMeshBodyCollider(d,null,0);
 for(const side of [-1,1]){const Q=new Float64Array([.3,.9,0]);assert.ok(push(Q,0,false,side));assert.ok(Math.abs(Q[2]-side*.057)<1e-6);}
});

test('contact acceptance includes the inner axilla where a shared side seam can flip onto the front',()=>{
 const body=new THREE.BoxGeometry(.08,.12,.08);body.translate(.13,1.3,0);
 const d={H:1.7,mhUpper:buildUpperSurface(body.attributes.position.array,body.index.array,1.7)},geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute([.115,1.29,-.06,.145,1.29,.06,.13,1.31,.03],3));geo.setIndex([0,1,2]);
 const m=new THREE.Mesh(geo);m.userData.cm={};const g=new THREE.Group();g.add(m);
 const report=inspectShoulderContact(g,d);assert.equal(report.tested,1);assert.equal(report.bad,1);
});

test('inferred long cuffs finish at the wrist; explicit sleeve lengths remain garment measurements',async()=>{
 await loadMakeHuman();const b={sex:'m',height:176,weight:74,chest:96,waist:78,hips:98,model:'makehuman'},d=bodyDims(b);
 buildBody(b,new THREE.MeshStandardMaterial(),d);fit.UNDER=[];fit.UNDERZ=[];
 const item={id:'sweater',kind:'sweater',tex:{},shape:{cm:{chest:50,len:65,shoulder:42}}},j=drapePrepare(item,d),arm=armJ(d);
 for(const chain of j.sleeveChains){const row=chain.rings.at(-1),x=row.reduce((s,v)=>s+j.C.P[v*3],0)/row.length,y=row.reduce((s,v)=>s+j.C.P[v*3+1],0)/row.length;
  assert.ok(Math.abs(Math.abs(x)-(arm.x+Math.sin(arm.th)*.335*d.H*.98))<1e-6);
  assert.ok(Math.abs(y-(arm.y-Math.cos(arm.th)*.335*d.H*.98))<1e-6);
 }
 assert.equal(topMeasures({...item,shape:{cm:{...item.shape.cm,sleeve:70}}},d).SL,.7);
});


test('neckline groups update when a stand adds seams; coincident sewn fins are removed on both panels',()=>{
 const C={pin:[0,0,0,0,0,0],seams:[[0,3]],meshes:[],E:[]};assert.equal(seamGroups(C)[0].length,2);
 C.seams.push([1,4],[2,5]);assert.equal(seamGroups(C).length,3);
 C.meshes=[{verts:[0,1,2],tris:[0,1,2]},{verts:[3,4,5],tris:[0,1,2]}];
 assert.equal(pruneCollapsedSeams(C).triangles,2);assert.ok(C.meshes.every(m=>m.tris.length===0));
});

test('pack import retains light preprocessing and material scale, and scale changes invalidate cached garments',()=>{
 globalThis.document={getElementById:()=>({}),querySelectorAll:()=>[]};globalThis.addEventListener=()=>{};
 createFitting({thumb:p=>p.pic||'',siteOf:()=>''});
 const p={id:'top',feed:true,kind:'sweater',name:'Свитер',assetRevision:'v2',photoLight:'corrected-v1',materialTexture:{file:'fabric.webp',widthM:.15,heightM:.18,sleeveDesign:'reviewed-plain'}};
 p.qualityEvidence={constructionReviewed:true};
 const item=toItem(p,{name:'Shop'});assert.deepEqual(item.qualityEvidence,p.qualityEvidence);
 assert.notEqual(garmentAssetKey(item),garmentAssetKey({...item,qualityEvidence:null}));assert.deepEqual(item.materialTexture,p.materialTexture);assert.equal(item.photoLight,p.photoLight);assert.equal(item.assetRevision,p.assetRevision);
 assert.notEqual(garmentAssetKey(item),garmentAssetKey({...item,materialTexture:{...item.materialTexture,widthM:.2}}));
});

test('fold thickness keeps directly shared hood/body particles and their edge samples joined in playback',()=>{
 const P=new Float32Array([0,1,-.1,.1,1,-.1,0,1.1,-.1,.1,.9,-.1]),mat=new THREE.MeshStandardMaterial();
 const part=(verts,role)=>({verts,role,uv:[[0,0],[1,0],[0,1]],uvm:[[0,0],[.1,0],[0,.1]],tris:[0,1,2],mat});
 const C={P:Array.from(P),pin:[0,0,0,0],E:[],seams:[],meshes:[part([0,1,2],'back'),{...part([1,0,3],'hood'),backLayerDepth:.006}]};
 const g=clothMeshes(C,P,1.7);assert.equal(inspectSurfaceSeams(g).maxGap,0);
 clothUpdate(g,P);assert.equal(inspectSurfaceSeams(g).maxGap,0);
});

// Flared hems are not horizontal: their higher side corners must stay free.
test('curved dress hem stays one regular opening instead of sewing its higher corners together',async()=>{
 await loadMakeHuman();const b={sex:'f',height:173,weight:56,chest:82,waist:62,hips:92,model:'makehuman'},d=bodyDims(b);
 buildBody(b,new THREE.MeshStandardMaterial(),d);fit.UNDER=[];fit.UNDERZ=[];
 const item={id:'dress-hem',kind:'dress',puff:true,tex:{},shape:{cm:{chest:48,len:100,shoulder:37,sleeve:25},tw:[.6,.6,.55,.5,.4,.4,.5,.6,.7,.8,.9,1,1.1,1.2,1.3,1.4]}};
 const j=drapePrepare(item,d),q=inspectPatternBoundary({userData:{cloth:{C:j.C}}});
 assert.equal(q.loops.length,4);assert.equal(q.nonmanifold,0);assert.ok(q.loops.every(l=>l.degree===0));
});
