import {seamGroups} from './seam-groups.js';
const cache=new WeakMap();

// Topological identities, not proximity welding: distant seam copies must still
// refer to one point; nearby but unrelated folds must remain separate.
export function surfaceWelds(g){
 const signature=g.children.filter(m=>m.userData.cm).map(m=>m.geometry.attributes.position.count).join(',');
 const cached=cache.get(g);if(cached?.signature===signature)return cached.welds;
 const C=g.userData.cloth.C,root=Array.from({length:C.pin.length},(_,i)=>i);
 for(const group of seamGroups(C))for(const i of group)root[i]=group[0];
 const nodes=new Map(),edges=new Map();let next=C.pin.length;
 const midpoint=(a,b)=>{const key=a<b?a+':'+b:b+':'+a;if(!edges.has(key))edges.set(key,next++);return edges.get(key);};
 for(const mesh of g.children){const cm=mesh.userData.cm;if(!cm)continue;
  const ids=C.meshes[cm.mi].verts.map(v=>root[v]);
  for(const [a,b] of cm.edges)ids.push(midpoint(ids[a],ids[b]));
  for(const layer of cm.refinements||[])for(const [a,b] of layer.edges)ids.push(midpoint(ids[a],ids[b]));
  ids.forEach((id,k)=>{if(!nodes.has(id))nodes.set(id,[]);nodes.get(id).push({mesh,k});});
 }
 const welds=[...nodes.values()].filter(refs=>refs.length>1);cache.set(g,{signature,welds});return welds;
}
export function inspectSurfaceSeams(g){
 let maxGap=0,bad=0;const examples=[];
 for(const refs of surfaceWelds(g)){const first=refs[0],P=first.mesh.geometry.attributes.position.array,q=first.k*3;
  for(const {mesh,k} of refs.slice(1)){const V=mesh.geometry.attributes.position.array,gap=Math.hypot(...[0,1,2].map(j=>P[q+j]-V[k*3+j]));maxGap=Math.max(maxGap,gap);if(gap>.0005){bad++;if(examples.length<8)examples.push({gap,a:Array.from(P.slice(q,q+3)),b:Array.from(V.slice(k*3,k*3+3)),parts:[first.mesh.userData.cm.mi,mesh.userData.cm.mi]});}}
 }return {maxGap,bad,examples};
}
export function inspectPatternBoundary(g){
 const C=g.userData.cloth.C,root=Array.from({length:C.pin.length},(_,i)=>i);for(const group of seamGroups(C))for(const i of group)root[i]=group[0];
 const E=new Map();let collapsed=0;
 for(const m of C.meshes)for(let t=0;t<m.tris.length;t+=3){const face=m.tris.slice(t,t+3).map(k=>root[m.verts[k]]);if(new Set(face).size<3){collapsed++;continue;}for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],key=a<b?a+':'+b:b+':'+a;E.set(key,(E.get(key)||0)+1);}}
 const boundary=[...E].filter(([k,n])=>n===1).map(([k])=>k.split(':').map(Number)),adj=new Map();for(const [a,b]of boundary){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
 const used=new Set(),loops=[];for(const start of adj.keys()){if(used.has(start))continue;const stack=[start],vs=[];while(stack.length){const a=stack.pop();if(used.has(a))continue;used.add(a);vs.push(a);stack.push(...adj.get(a));}loops.push({count:vs.length,vertices:vs,degree:vs.filter(v=>adj.get(v).length!==2).length});}
 return {collapsed,nonmanifold:[...E.values()].filter(n=>n>2).length,loops};
}

// The extra render subdivisions belong to the same sewn surface too. Sharing
// only solver-node normals leaves alternating dark stitches along the seam.
export function shareSurfaceNormals(g){
 for(const refs of surfaceWelds(g)){
  const sum=[0,0,0];for(const {mesh,k}of refs){const N=mesh.geometry.attributes.normal.array;for(let j=0;j<3;j++)sum[j]+=N[k*3+j];}
  const len=Math.hypot(...sum)||1;
  for(const {mesh,k}of refs){const normal=mesh.geometry.attributes.normal;for(let j=0;j<3;j++)normal.array[k*3+j]=sum[j]/len;normal.needsUpdate=true;}
 }
}
