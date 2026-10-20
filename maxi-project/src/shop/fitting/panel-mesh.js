// Constrained material-space triangulation. Boundary corners and sewing
// segments survive refinement; 3D placement cannot change physical rest lengths.
import {ShapeUtils,Vector2} from 'three';

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
const pointKey=p=>p.map(v=>Math.round(v*1e10)).join(':');
const triangle=(a,b,c,P)=>cross(P[a],P[b],P[c])<0?[a,b,c]:[a,c,b];

export function triangulatePanel(poly,labels,cell){
 if(!(cell>0)||poly.length<3||labels.length<poly.length||poly.some(p=>p.length!==2||!p.every(Number.isFinite)))throw Error('Invalid panel');
 const P=poly.map(p=>p.slice()),boundary=poly.map((_,i)=>[i]),known=new Map(P.map((p,i)=>[pointKey(p),i]));
 let T=ShapeUtils.triangulateShape(P.map(p=>new Vector2(...p)),[]).filter(t=>Math.abs(cross(...t.map(i=>P[i])))>1e-14).map(t=>triangle(...t,P));
 const insert=(p,existing)=>{
  const key=pointKey(p);if(existing==null&&known.has(key))return known.get(key);
  let hit=-1,split=null;
  for(let t=0;t<T.length;t++){
   const f=T[t],s=f.map((v,j)=>cross(P[v],P[f[(j+1)%3]],p));
   if(s.some(v=>v>1e-11))continue;
   hit=t;const e=s.findIndex(v=>Math.abs(v)<1e-11);if(e>=0)split=[f[e],f[(e+1)%3]];break;
  }
  if(hit<0)throw Error('Uncovered panel point');
  const id=existing??P.length;if(existing==null)P.push(p);known.set(key,id);
  if(split){const [a,b]=split,selected=[];
   for(let t=0;t<T.length;t++)if(T[t].includes(a)&&T[t].includes(b))selected.push(t);
   for(const t of selected){const c=T[t].find(v=>v!==a&&v!==b);T[t]=triangle(a,id,c,P);T.push(triangle(id,b,c,P));}
  }else{const [a,b,c]=T[hit];T[hit]=triangle(a,b,id,P);T.push(triangle(b,c,id,P),triangle(c,a,id,P));}
  return id;
 };
 const usedCorners=new Set(T.flat());for(let i=0;i<poly.length;i++)if(!usedCorners.has(i))insert(P[i],i);
 // Begin from the original corners: Earcut may omit collinear samples. Insert
 // every requested boundary sample explicitly into its incident triangle(s).
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/cell));
  for(let j=1;j<n;j++)boundary[i].push(insert(a.map((v,k)=>v+(b[k]-v)*j/n)));
 }
 const inside=(x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;
 }return c;};
 const lo=poly.reduce((a,p)=>a.map((v,k)=>Math.min(v,p[k])),[Infinity,Infinity]),hi=poly.reduce((a,p)=>a.map((v,k)=>Math.max(v,p[k])),[-Infinity,-Infinity]);
 for(let r=Math.ceil(lo[1]/cell);r*cell<hi[1]-1e-9;r++)for(let c=Math.ceil(lo[0]/cell);c*cell<hi[0]-1e-9;c++){
  const p=[c*cell,r*cell];if(!inside(...p))continue;
  const near=poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
   return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<cell*.22;});
  if(!near)insert(p);
 }
 // Lawson flips: prevent long triangulation fans crossing concave armholes.
 const angle=(a,b,c)=>{const u=[a[0]-c[0],a[1]-c[1]],v=[b[0]-c[0],b[1]-c[1]];return Math.atan2(Math.abs(u[0]*v[1]-u[1]*v[0]),u[0]*v[0]+u[1]*v[1]);};
 for(let pass=0;pass<512;pass++){
  const edges=new Map();T.forEach((f,t)=>f.forEach((a,j)=>{const b=f[(j+1)%3],key=edgeKey(a,b);if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(t);}));
  const used=new Set();let flipped=0;
  for(const {a,b,faces}of edges.values()){
   if(faces.length!==2||faces.some(t=>used.has(t)))continue;
   const [u,v]=faces,c=T[u].find(i=>i!==a&&i!==b),d=T[v].find(i=>i!==a&&i!==b);
   if(cross(P[c],P[d],P[a])*cross(P[c],P[d],P[b])>=-1e-18)continue;
   if(angle(P[a],P[b],P[c])+angle(P[a],P[b],P[d])<=Math.PI+1e-8)continue;
   T[u]=triangle(c,d,a,P);T[v]=triangle(d,c,b,P);used.add(u);used.add(v);flipped++;
  }
  if(!flipped)break;if(pass===511)throw Error('Panel refinement did not converge');
 }
 const edges=new Map();let area=0;
 for(const f of T){const a=-cross(...f.map(i=>P[i]))/2;if(a<1e-14)throw Error('Degenerate panel triangle '+JSON.stringify(f.map(i=>P[i])));area+=a;
  f.forEach((v,j)=>{const w=f[(j+1)%3],key=edgeKey(v,w);edges.set(key,(edges.get(key)||0)+1);});}
 const expected=Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-p[1]*q[0];},0))/2;
 if(Math.abs(area-expected)>1e-8*Math.max(1,expected))throw Error('Panel area mismatch');
 const boundaryKeys=new Set();boundary.forEach((row,i)=>{const line=[...row,(i+1)%poly.length];for(let j=1;j<line.length;j++)boundaryKeys.add(edgeKey(line[j-1],line[j]));});
 for(const [key,n]of edges)if(n!==(boundaryKeys.has(key)?1:2))throw Error('Nonconforming panel boundary');
 for(const key of boundaryKeys)if(edges.get(key)!==1)throw Error('Missing sewing segment');
 for(const key of edges.keys()){const [a,b]=key.split(':').map(Number);if(Math.hypot(P[a][0]-P[b][0],P[a][1]-P[b][1])>cell*3)throw Error('Unresolved panel edge');}
 const tags=new Map();boundary.forEach((row,i)=>[...row,(i+1)%poly.length].forEach(id=>{if(!tags.has(id))tags.set(id,new Set());tags.get(id).add(labels[i]);}));
 return {P,tris:T.flat(),boundary,tags};
}

export function addConformingPanel(C,poly,labels,cell,place,uvf,mat,role,restScale){
 const mesh=triangulatePanel(poly,labels,cell),pts=mesh.P.map(([x,y],k)=>({x,y,k,r:Math.round(y/cell),c:Math.round(x/cell),g:C.add(...place(x,y)),edge:mesh.tags.has(k),labs:mesh.tags.get(k)||new Set()}));
 for(const p of pts)p.lab=[...p.labs][0];
 const pairs=new Set();for(let t=0;t<mesh.tris.length;t+=3)for(let j=0;j<3;j++){
  const a=mesh.tris[t+j],b=mesh.tris[t+(j+1)%3],key=edgeKey(a,b);if(pairs.has(key))continue;pairs.add(key);
  const u=pts[a],v=pts[b],dx=v.x-u.x,dy=v.y-u.y,kind=Math.abs(dy)<1e-9?3:Math.abs(dx)<1e-9?0:1;
  C.link(u.g,v.g,Math.hypot(dx,dy),kind,restScale?restScale((u.x+v.x)/2,(u.y+v.y)/2):1);
 }
 // Opposite vertices across an interior edge provide bending resistance.
 const adjacent=new Map();for(let t=0;t<mesh.tris.length;t+=3)for(let j=0;j<3;j++){
  const a=mesh.tris[t+j],b=mesh.tris[t+(j+1)%3],v=mesh.tris[t+(j+2)%3],key=edgeKey(a,b);
  if(adjacent.has(key)){const u=adjacent.get(key),p=pts[u],q=pts[v];C.link(p.g,q.g,Math.hypot(p.x-q.x,p.y-q.y),2);}else adjacent.set(key,v);
 }
 // Long-range limits stop gravity from accumulating extension down a column.
 if(C.tether){const tops=new Map();for(const p of pts){const old=tops.get(p.c);if(!old||p.y<old.y)tops.set(p.c,p);}
  for(const p of pts){const a=tops.get(p.c);if(p.y-a.y>cell*2)C.tether.push(p.g,a.g,Math.hypot(p.x-a.x,p.y-a.y)*1.02);}
 }
 C.meshes.push({verts:pts.map(p=>p.g),uv:pts.map(p=>uvf(p.x,p.y)),uvm:mesh.P,tris:mesh.tris,mat,role});
 return {pts,conforming:true,boundary:mesh.boundary.map(row=>row.map(k=>pts[k])),at:(r,c)=>pts.find(p=>p.r===r&&p.c===c)};
}
