// Surface area weighted by seven barycentric samples. The cutout grid is a
// coarse source-coverage diagnostic; offscreen pixel passes are the visible test.
const SAMPLES=[[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6],[.5,.5,0],[0,.5,.5],[.5,0,.5]];
export function sourceAreaCoverage(C,P,dr) {
 let areaM2=0,missingAreaM2=0;const parts=[];
 for(const m of C.meshes){if(m.role!=='front'&&m.role!=='back')continue;const source=dr[m.role];
  if(!source?.grid){parts.push({role:m.role,status:'missing'});continue;}
  let area=0,missing=0;
  for(let t=0;t<m.tris.length;t+=3){const ids=m.tris.slice(t,t+3),a=m.verts[ids[0]]*3,b=m.verts[ids[1]]*3,c=m.verts[ids[2]]*3;
   const u=[0,1,2].map(k=>P[b+k]-P[a+k]),v=[0,1,2].map(k=>P[c+k]-P[a+k]);
   const face=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;area+=face;
   for(const weights of SAMPLES){const uv=[0,1].map(k=>ids.reduce((sum,id,i)=>sum+m.uv[id][k]*weights[i],0));
    const x=Math.floor(uv[0]*source.gw),y=Math.floor(uv[1]*source.gh);
    if(x<0||x>=source.gw||y<0||y>=source.gh||source.grid[y][x]!=='1')missing+=face/SAMPLES.length;}
  }
  parts.push({role:m.role,status:'measured',areaM2:area,missingAreaM2:missing,missingFraction:missing/Math.max(area,1e-12)});areaM2+=area;missingAreaM2+=missing;
 }
 return {areaM2,missingAreaM2,missingFraction:missingAreaM2/Math.max(areaM2,1e-12),parts};
}
