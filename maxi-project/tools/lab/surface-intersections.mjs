// Independent triangle/triangle intersection audit against the posed body mesh.
// This checks segment/face crossings, rather than the collision projector's samples.
import {buildUpperSurface} from '../../src/shop/fitting/triangle-surface.js';
const fullSurfaces=new WeakMap();
function segmentTriangle(P,a,b,T,i,j,k){
 const dx=P[b]-P[a],dy=P[b+1]-P[a+1],dz=P[b+2]-P[a+2],ux=T[j]-T[i],uy=T[j+1]-T[i+1],uz=T[j+2]-T[i+2],vx=T[k]-T[i],vy=T[k+1]-T[i+1],vz=T[k+2]-T[i+2];
 const hx=dy*vz-dz*vy,hy=dz*vx-dx*vz,hz=dx*vy-dy*vx,det=ux*hx+uy*hy+uz*hz;if(Math.abs(det)<1e-14)return false;
 const sx=P[a]-T[i],sy=P[a+1]-T[i+1],sz=P[a+2]-T[i+2],u=(sx*hx+sy*hy+sz*hz)/det;if(u<1e-8||u>1-1e-8)return false;
 const qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dx*qx+dy*qy+dz*qz)/det;if(v<1e-8||u+v>1-1e-8)return false;
 const t=(vx*qx+vy*qy+vz*qz)/det;return t>1e-8&&t<1-1e-8;
}
export function inspectSurfaceIntersections(g,d,options={}){
 let surface=d.mhUpper;if(options.fullBody){if(!d.mhGeometry)throw Error('Full body geometry required');surface=fullSurfaces.get(d.mhGeometry);if(!surface){surface=buildUpperSurface(d.mhGeometry.positions,d.mhGeometry.index,0);fullSurfaces.set(d.mhGeometry,surface);}}
 const {positions:B,index:I,nodes:N}=surface;let tested=0,pairs=0;const triangles=new Set(),examples=[];
 for(const mesh of g.children){if(!mesh.userData.cm)continue;const P=mesh.geometry.attributes.position.array,F=mesh.geometry.index.array;
  for(let t=0;t<F.length;t+=3){const vs=[F[t]*3,F[t+1]*3,F[t+2]*3],lo=[0,1,2].map(k=>Math.min(...vs.map(v=>P[v+k]))),hi=[0,1,2].map(k=>Math.max(...vs.map(v=>P[v+k])));
   if(!options.fullBody&&(hi[1]<.63*d.H||lo[1]>.84*d.H||Math.max(Math.abs(lo[0]),Math.abs(hi[0]))<.09*d.H))continue;tested++;const stack=[0];
   while(stack.length){const node=stack.pop()*10;if(lo.some((v,k)=>v>N[node+3+k]||hi[k]<N[node+k]))continue;
    if(!N[node+9]){stack.push(N[node+6],N[node+7]);continue;}
    for(let f=N[node+8];f<N[node+8]+N[node+9];f++){const bs=[I[f*3]*3,I[f*3+1]*3,I[f*3+2]*3];
     if(lo.some((v,k)=>v>Math.max(...bs.map(v=>B[v+k]))||hi[k]<Math.min(...bs.map(v=>B[v+k]))))continue;
     let hit=false;for(let e=0;e<3&&!hit;e++)hit=segmentTriangle(P,vs[e],vs[(e+1)%3],B,...bs)||segmentTriangle(B,bs[e],bs[(e+1)%3],P,...vs);
     if(hit){pairs++;triangles.add(mesh.uuid+':'+t);if(examples.length<5)examples.push({part:mesh.userData.cm.mi,triangle:t/3,bodyFace:f});}
    }
   }
  }
 }
 return {tested,intersectingTriangles:triangles.size,intersectingPairs:pairs,examples,coplanarContactsExcluded:true};
}
