import {makeUpperMeshCollider} from './triangle-surface.js';
import {clothProject} from './cloth-mesh.js';

// Test displayed triangle centres and stretched edges, not just solver nodes. Uses the same body
// mesh: this is extra geometric coverage, not independent evidence of accuracy.
export function inspectShoulderContact(g,d,tolerance=.0005) {
  const badTriangles=new Map();let tested=0,bad=0,maxDepth=0,testedAreaM2=0,flaggedAreaM2=0;
  if(!d.mhUpper)return {tested,bad,maxDepth,testedAreaM2,flaggedAreaM2,badTriangles};
  const push=makeUpperMeshCollider(d.mhUpper,0),Q=new Float64Array(3);
  for(const mesh of g.children){if(!mesh.userData.cm)continue;
    const P=mesh.geometry.attributes.position.array,I=mesh.geometry.index.array,triangles=new Set();
    for(let t=0;t<I.length;t+=3){
      for(let k=0;k<3;k++)Q[k]=(P[I[t]*3+k]+P[I[t+1]*3+k]+P[I[t+2]*3+k])/3;
      if(Q[1]<d.H*.63||Q[1]>d.H*.84||Math.abs(Q[0])<d.H*.07)continue;
      const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
      const area=Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)/2;testedAreaM2+=area;
      tested++;let depth=0;
      const sample=()=>{const x=Q[0],y=Q[1],z=Q[2];push(Q,0);depth=Math.max(depth,Math.hypot(Q[0]-x,Q[1]-y,Q[2]-z));};
      sample();
      // A misrouted shared seam can span the arm/torso gap: its triangle
      // centre is outside while an edge crosses the body. Sample stretched
      // edges densely; ordinary well-resolved cloth does not pay this cost.
      for(const [i,j]of [[a,b],[b,c],[c,a]]){
        const length=Math.hypot(P[j]-P[i],P[j+1]-P[i+1],P[j+2]-P[i+2]);if(length<.025)continue;
        const n=Math.min(64,Math.ceil(length/.004));for(let s=1;s<n;s++){for(let k=0;k<3;k++)Q[k]=P[i+k]+(P[j+k]-P[i+k])*s/n;sample();}
      }
      maxDepth=Math.max(maxDepth,depth);
      if(depth>tolerance){bad++;flaggedAreaM2+=area;triangles.add(t);}
    }badTriangles.set(mesh,triangles);
  }return {tested,bad,maxDepth,testedAreaM2,flaggedAreaM2,badTriangles};
}

// Select once for the fixed body pose; playback reuses this policy. A midplane
// seam is only a stabilization candidate: it must improve both depth and the
// area of flagged triangles, otherwise keep ordinary nearest-surface contact.
export function finishShoulderContact(g,d) {
  const summary=({badTriangles,...report})=>report;
  const raw=g.children.filter(m=>m.userData.cm).map(mesh=>[mesh,mesh.geometry.attributes.position.array.slice()]);
  g.userData.neutralSeams=false;clothProject(g);const before=inspectShoulderContact(g,d);
  if(!before.bad)return {before:summary(before),after:summary(before),neutralSeamsAccepted:false,toleranceMm:.5};
  const saved=[];g.traverse(mesh=>{if(mesh.isMesh)saved.push([mesh,mesh.geometry.clone()]);});
  for(const [mesh,P] of raw)mesh.geometry.attributes.position.array.set(P);
  g.userData.neutralSeams=true;clothProject(g);const candidate=inspectShoulderContact(g,d);
  const accepted=(candidate.maxDepth<before.maxDepth-1e-7||candidate.flaggedAreaM2<before.flaggedAreaM2-1e-10)&&candidate.maxDepth<=before.maxDepth+1e-7&&candidate.flaggedAreaM2<=before.flaggedAreaM2+1e-10;
  if(!accepted){g.userData.neutralSeams=false;for(const [mesh,geometry] of saved){mesh.geometry.dispose();mesh.geometry=geometry;}}
  else for(const [,geometry] of saved)geometry.dispose();
  return {before:summary(before),after:summary(accepted?candidate:before),neutralSeamsAccepted:accepted,toleranceMm:.5};
}
