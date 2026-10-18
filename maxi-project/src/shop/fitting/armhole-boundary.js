// Follow the actual triangulated panel boundary, including diagonal staircase
// vertices which the old label-only selection skipped at the axilla.
export function armholeBoundary(C, panel, side, shoulderX, shoulderY, axillaX, axillaY) {
  const mesh=C.meshes.find(m=>m.verts[0]===panel.pts[0]?.g);
  if(!mesh)return null;
  const edges=new Map(),key=(a,b)=>a<b?a+':'+b:b+':'+a;
  for(let t=0;t<mesh.tris.length;t+=3)for(const [i,j] of [[0,1],[1,2],[2,0]]){
    const a=mesh.verts[mesh.tris[t+i]],b=mesh.verts[mesh.tris[t+j]],k=key(a,b),old=edges.get(k);
    if(old)old.count++;else edges.set(k,{a,b,count:1});
  }
  const adjacent=new Map(),points=new Map(panel.pts.map(p=>[p.g,p]));
  for(const {a,b,count} of edges.values())if(count===1){
    if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);
    adjacent.get(a).push(b);adjacent.get(b).push(a);
  }
  const nearest=(x,y)=>{
    let best=Infinity,id;
    for(const v of adjacent.keys()){const p=points.get(v);if(p.x*side<0)continue;
      const d=(p.x-side*x)**2+(p.y-y)**2;if(d<best){best=d;id=v;}}
    return id;
  };
  const start=nearest(shoulderX,shoulderY),end=nearest(axillaX,axillaY),dist=new Map([[start,0]]),previous=new Map(),pending=new Set(adjacent.keys());
  while(pending.size){
    let current,best=Infinity;for(const v of pending)if((dist.get(v)??Infinity)<best){current=v;best=dist.get(v);}
    if(current===undefined)return null;if(current===end)break;pending.delete(current);
    for(const next of adjacent.get(current)){if(!pending.has(next))continue;const a=points.get(current),b=points.get(next),d=best+Math.hypot(a.x-b.x,a.y-b.y);
      if(d<(dist.get(next)??Infinity)){dist.set(next,d);previous.set(next,current);}}
  }
  const path=[end];while(path[0]!==start){const v=previous.get(path[0]);if(v===undefined)return null;path.unshift(v);}
  return path.length>1?path:null;
}
