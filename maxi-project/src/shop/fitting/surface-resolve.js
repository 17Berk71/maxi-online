import {makeUpperMeshCollider} from './triangle-surface.js';
import {surfaceWelds} from './surface-weld.js';

const SAMPLES=[[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]];
// Local display contact constraints on a well-resolved physical mesh. Shared
// samples move together; UVs and physical rest lengths are never rewritten.
export function makeSurfaceResolver(g,d,options={}){
 const parts=g.children.filter(m=>m.userData.cm).map(mesh=>({mesh,cm:mesh.userData.cm,adj:Array.from({length:mesh.geometry.attributes.position.count},()=>[])}));
 const faces=[];
 for(const part of parts){const P=part.mesh.geometry.attributes.position.array,I=part.mesh.geometry.index.array;
  for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2],y=(P[a*3+1]+P[b*3+1]+P[c*3+1])/3,x=(P[a*3]+P[b*3]+P[c*3])/3;
   if(!options.fullBody&&(y<.43*d.H||y>(options.neck?.89:.85)*d.H||(Math.abs(x)<.075*d.H&&(!options.neck||y<.78*d.H))))continue;
   const vs=[a,b,c],samples=SAMPLES.slice();
   // A stretched edge can cross an arm while its midpoint and face centre
   // remain outside. Resolve the same dense edge coverage used by acceptance.
   for(const [i,j]of [[0,1],[1,2],[2,0]]){const u=vs[i]*3,v=vs[j]*3,length=Math.hypot(P[v]-P[u],P[v+1]-P[u+1],P[v+2]-P[u+2]);if(length<.025)continue;
    const n=Math.min(64,Math.ceil(length/.004));for(let s=1;s<n;s++){const w=[0,0,0];w[i]=1-s/n;w[j]=s/n;samples.push(w);}}
   const id=faces.length;faces.push({part,vs,samples,cache:new Float64Array(samples.length*4).fill(NaN)});for(const v of [a,b,c])part.adj[v].push(id);
  }
 }
 const byMesh=new Map(parts.map(p=>[p.mesh,p])),welds=surfaceWelds(g),margin=options.neck?.006:.004,contact=makeUpperMeshCollider(d.mhUpper,margin),Q=new Float64Array(3);
 return ()=>{
  let active=new Set(faces.map((_,i)=>i)),changed=false;
  for(let pass=0;pass<32&&active.size;pass++){
   const acc=new Map(parts.map(part=>[part,{D:new Float64Array(part.mesh.geometry.attributes.position.array.length),W:new Float64Array(part.adj.length),moved:new Set()}]));let bad=0;
   for(const id of active){const {part,vs,samples,cache}=faces[id],P=part.mesh.geometry.attributes.position.array,{D,W}=acc.get(part);
    for(let sample=0;sample<samples.length;sample++){const weights=samples[sample],o=sample*4;
     for(let k=0;k<3;k++)Q[k]=P[vs[0]*3+k]*weights[0]+P[vs[1]*3+k]*weights[1]+P[vs[2]*3+k]*weights[2];
     const x=Q[0],y=Q[1],z=Q[2],travel=Math.hypot(x-cache[o],y-cache[o+1],z-cache[o+2]);
     // Signed distance is 1-Lipschitz on this fixed body. A previous outside
     // clearance minus sample travel remains a conservative lower bound.
     const safe=cache[o+3]-travel;cache[o]=x;cache[o+1]=y;cache[o+2]=z;
     if(safe>margin+.0001){cache[o+3]=safe;continue;}
     contact(Q,0);cache[o+3]=contact.clearance-1e-7;const dx=Q[0]-x,dy=Q[1]-y,dz=Q[2]-z,depth=Math.hypot(dx,dy,dz);
     if(depth<.00008)continue;bad++;const denom=weights.reduce((sum,w)=>sum+w*w,0);
     vs.forEach((v,j)=>{if(!weights[j])return;const w=weights[j]/denom;D[v*3]+=dx*w;D[v*3+1]+=dy*w;D[v*3+2]+=dz*w;W[v]++;});
    }
   }
   if(!bad)break;
   // Combine contact proposals before moving any copy of a sewn point.
   for(const refs of welds){let x=0,y=0,z=0,w=0;for(const {mesh,k}of refs){const a=acc.get(byMesh.get(mesh));x+=a.D[k*3];y+=a.D[k*3+1];z+=a.D[k*3+2];w+=a.W[k];}
    if(!w)continue;for(const {mesh,k}of refs){const a=acc.get(byMesh.get(mesh));a.D[k*3]=x;a.D[k*3+1]=y;a.D[k*3+2]=z;a.W[k]=w;}
   }
   for(const part of parts){const {D,W,moved}=acc.get(part),P=part.mesh.geometry.attributes.position.array;
    for(let v=0;v<W.length;v++)if(W[v]){const q=v*3,dx=D[q]/W[v],dy=D[q+1]/W[v],dz=D[q+2]/W[v],scale=Math.min(.75,.002/Math.max(1e-12,Math.hypot(dx,dy,dz)));
     P[q]+=dx*scale;P[q+1]+=dy*scale;P[q+2]+=dz*scale;
     g.userData.surfacePush(P,q,!part.cm.local,part.cm.surfaceSide?.[v]||0);moved.add(v);changed=true;
    }
   }
   // One collision result for each topological seam copy, including new samples.
   for(const refs of welds){const first=refs.find(({mesh,k})=>acc.get(byMesh.get(mesh)).moved.has(k));if(!first)continue;
    const P=first.mesh.geometry.attributes.position.array;for(const {mesh,k}of refs){const a=acc.get(byMesh.get(mesh)),V=mesh.geometry.attributes.position.array;for(let j=0;j<3;j++)V[k*3+j]=P[first.k*3+j];a.moved.add(k);}
   }
   active=new Set();for(const part of parts)for(const v of acc.get(part).moved)for(const id of part.adj[v])active.add(id);
  }
  return changed;
 };
}
