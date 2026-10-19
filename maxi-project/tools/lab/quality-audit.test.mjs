import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {qualityDecision,geometryAcceptance,caseAcceptance,failedQualityAudit,runtimeQuality} from '../../src/shop/fitting/quality-policy.js';
import {coverageMetrics,compareProfiles} from '../../src/shop/fitting/quality-masks.js';
import {sourceAreaCoverage} from '../../src/shop/fitting/quality-source-area.js';
import {inspectStrain,inspectSleeves} from '../../src/shop/fitting/quality-metrics.js';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {armJ} from '../../src/shop/fitting/geometry.js';

const geometry=()=>({expectedLoops:4,finite:true,intersections:{tested:100,intersectingTriangles:0},seams:{maxGap:0},boundary:{nonmanifold:0,collapsed:0,loops:Array.from({length:4},()=>({irregularVertices:0}))},quality:{checks:[{code:'fixture',status:'pass'}]}});
const goodCase=()=>({geometry:[geometry()],views:['front','angle','back'].map(view=>({view,garments:[{coverage:{status:'measured',interiorPixels:5000,missingFraction:0,largestPatchFraction:0,regions:[]}}]}))});

test('missing, nonfinite and malformed geometry cannot receive acceptance',()=>{
 for(const value of [NaN,Infinity,-1,undefined]){const g=geometry();g.seams.maxGap=value;assert.equal(geometryAcceptance([g]).accepted,false);}
 assert.equal(geometryAcceptance([{}]).accepted,false);const g=geometry();g.expectedLoops=undefined;assert.equal(geometryAcceptance([g]).accepted,false);
});
test('an unresolved material or print review blocks approval without pretending it is a geometric failure',()=>{
 assert.equal(qualityDecision([]).accepted,false);const c=goodCase();c.geometry[0].quality.checks.push({code:'material-evidence',status:'review'});
 const q=caseAcceptance(c);assert.equal(q.status,'review');assert.equal(q.geometryAccepted,true);assert.equal(q.accepted,false);
 c.geometry[0].quality.checks.push({code:'sleeve-routing',status:'fail'});assert.equal(caseAcceptance(c).status,'rejected');
});
test('front alone, empty view inventories and NaN coverage cannot approve an outfit',()=>{
 const c=goodCase();assert.equal(caseAcceptance(c).accepted,true);c.views.pop();assert.equal(caseAcceptance(c).accepted,false);
 c.views=goodCase().views;c.views[1].garments=[];assert.equal(caseAcceptance(c).accepted,false);
 c.views=goodCase().views;c.views[0].garments[0].coverage.missingFraction=NaN;assert.equal(caseAcceptance(c).status,'rejected');
});
test('a bad or missing animation frame cannot be hidden by a good final surface',()=>{
 const c=goodCase();c.animationRequested=true;c.requestedAnimationFrames=[10,25];c.animationFrames=[{frame:10,geometry:[geometry()]}];
 assert.equal(caseAcceptance(c).accepted,false);const bad=geometry();bad.intersections.intersectingTriangles=1;c.animationFrames.push({frame:25,geometry:[bad]});
 const q=caseAcceptance(c);assert.equal(q.status,'rejected');assert.ok(q.checks.some(x=>x.frame===25&&x.status==='fail'));
});
test('pixel coverage weighs area, isolates a large connected patch and retains local errors',()=>{
 const w=100,h=100,E=new Uint8Array(w*h).fill(1),A=E.slice();for(let y=10;y<20;y++)for(let x=10;x<20;x++)A[y*w+x]=0;
 const q=coverageMetrics(E,A,w,h);assert.equal(q.missingPixels,100);assert.equal(q.largestPatchPixels,100);assert.equal(q.patches,1);
 assert.ok(q.regions.some(r=>r.missingFraction>q.missingFraction));
 const c=goodCase();c.views[0].garments[0].coverage=q;assert.equal(caseAcceptance(c).status,'rejected');
});
test('one antialiasing boundary pixel is excluded, a real interior hole is retained',()=>{
 const E=new Uint8Array(25).fill(1),A=E.slice();A[0]=0;assert.equal(coverageMetrics(E,A,5,5).missingPixels,0);
 A[12]=0;assert.equal(coverageMetrics(E,A,5,5).missingPixels,1);
});
test('source area is independent of mesh density; a tiny missing triangle is not half the garment',()=>{
 const C={meshes:[{role:'front',verts:[0,1,2,3,4,5],tris:[0,1,2,3,4,5],uv:[[.25,.5],[.25,.5],[.25,.5],[.75,.5],[.75,.5],[.75,.5]]}]};
 const P=[0,0,0,2,0,0,0,1,0,4,0,0,4.01,0,0,4,.01,0],dr={front:{grid:['10'],gw:2,gh:1}};
 const q=sourceAreaCoverage(C,P,dr);assert.ok(q.missingFraction<.0001);assert.ok(Math.abs(q.areaM2-1.00005)<1e-9);
});
test('a local silhouette defect cannot be diluted by 31 good sections',()=>{
 const reference=Array(32).fill(1),model=reference.slice();model[17]=1.3;const q=compareProfiles(model,reference);
 assert.ok(q.mean<.08);assert.ok(q.worst>.15);assert.equal(compareProfiles([1,2],[1,2]).status,'missing');
});
test('stretch is separated by panel and direction instead of averaged across the whole garment',()=>{
 const C={meshes:[{role:'front',verts:[0,1]},{role:'back',verts:[2,3]}],E:[0,1,1,0,2,3,1,3]},P=[0,0,0,1.4,0,0,0,1,0,1,1,0];
 const q=inspectStrain(C,P,'jacket');assert.equal(q.parts.length,2);assert.equal(q.parts.find(p=>p.role==='front').overFraction,1);assert.equal(q.parts.find(p=>p.role==='back').overFraction,0);
});

function sleeveFixture(offset=0,length=.45){
 const d=bodyDims({sex:'m',height:176,weight:74,chest:96,waist:78,hips:98}),j=armJ(d),D=[Math.sin(j.th),-Math.cos(j.th),0],U=[Math.cos(j.th),Math.sin(j.th),0],verts=[],P=[],rings=[];
 for(let r=0;r<8;r++){const ring=[];for(let k=0;k<16;k++){const a=k/16*Math.PI*2,v=P.length/3;ring.push(v);verts.push(v);P.push(j.x+D[0]*length*r/7+U[0]*Math.cos(a)*.06+offset,j.y+D[1]*length*r/7+U[1]*Math.cos(a)*.06,Math.sin(a)*.06);}rings.push(ring);}
 const mesh=new THREE.Mesh(new THREE.BufferGeometry());mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(P,3));mesh.userData.cm={mi:0};
 const g=new THREE.Group();g.add(mesh);g.userData.cloth={C:{meshes:[{verts}]}};
 return {g,d,chains:[{side:1,rings,expectedCuff:[j.x+D[0]*length,j.y+D[1]*length,0]}]};
}
test('a floating sleeve with no body crossings is rejected by arm enclosure',()=>{
 const a=sleeveFixture();let q=inspectSleeves(a.g,a.d,a.chains,true)[0];assert.equal(q.missed,0);assert.ok(q.cuffErrorM<1e-6);
 const b=sleeveFixture(.2);q=inspectSleeves(b.g,b.d,b.chains,true)[0];assert.ok(q.missingEnclosureFraction>.05);
});
test('a deliberately long measured sleeve is tested against its own cuff position, not shortened to a wrist',()=>{
 const a=sleeveFixture(0,.7),q=inspectSleeves(a.g,a.d,a.chains,true)[0];assert.ok(q.cuffErrorM<1e-6);assert.equal(q.missed,0);
});

test('an empty triangle audit, an omitted finite check or an audit exception cannot approve quality',()=>{
 const g=geometry();g.intersections.tested=0;assert.equal(geometryAcceptance([g]).accepted,false);
 g.intersections.tested=100;delete g.finite;assert.equal(geometryAcceptance([g]).accepted,false);
 assert.equal(failedQualityAudit().status,'rejected');assert.equal(qualityDecision([{code:'malformed'}]).status,'rejected');
});

test('a local runtime screen cannot claim the full independent three-view acceptance',()=>{
 const local=qualityDecision([{code:'fixture',status:'pass'}]);assert.equal(local.accepted,true);
 assert.equal(runtimeQuality(local).status,'review');
 assert.equal(runtimeQuality(qualityDecision([{code:'fixture',status:'fail'}])).status,'rejected');
});
