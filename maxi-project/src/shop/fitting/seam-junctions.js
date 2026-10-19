import {seamGroups} from './seam-groups.js';

// A raster-cut neckline can leave a 3–4 vertex gap at the meeting of hood,
// shoulder and body. Complete only these tiny sewn junctions. Garment openings
// (neck, face, hem, cuffs) are long loops and must remain open.
export function closeHoodJunctions(C) {
  if (!C.hood) return 0;
  const root=Array.from({length:C.pin.length},(_,i)=>i);
  for(const group of seamGroups(C))for(const v of group)root[v]=group[0];
  const edges=new Map(),adj=new Map();
  C.meshes.forEach((m,mi)=>{for(let t=0;t<m.tris.length;t+=3)for(let i=0;i<3;i++){
    const a=root[m.verts[m.tris[t+i]]],b=root[m.verts[m.tris[t+(i+1)%3]]],key=a<b?a+':'+b:b+':'+a;
    if(!edges.has(key))edges.set(key,{a,b,parts:[],n:0});const e=edges.get(key);e.n++;e.parts.push(mi);
  }});
  for(const e of edges.values())if(e.n===1){for(const [a,b]of [[e.a,e.b],[e.b,e.a]]){if(!adj.has(a))adj.set(a,[]);adj.get(a).push(b);}}
  const seen=new Set();let added=0;
  for(const start of adj.keys()){
    if(seen.has(start))continue;let prev=-1,v=start;const loop=[];
    do{seen.add(v);loop.push(v);const n=adj.get(v);if(n.length!==2)break;const next=n.find(x=>x!==prev);prev=v;v=next;}while(v!==start&&!seen.has(v));
    if(v!==start||loop.length<3||loop.length>4)continue;
    const parts=new Set();for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];for(const mi of edges.get(a<b?a+':'+b:b+':'+a).parts)parts.add(mi);}
    if(parts.size<2)continue;
    const mi=[...parts].find(i=>C.meshes[i].role==='hood')??[...parts][0],m=C.meshes[mi];
    const existing=loop.map(v=>m.verts.findIndex(x=>root[x]===v)).filter(k=>k>=0);
    const mean=name=>[0,1].map(j=>existing.reduce((s,k)=>s+(m[name]?.[k]?.[j]||0),0)/existing.length);
    const uv=mean('uv'),uvm=mean('uvm');
    const ids=loop.map(v=>{let k=m.verts.findIndex(x=>root[x]===v);if(k>=0)return k;k=m.verts.length;m.verts.push(v);m.uv.push(uv.slice());if(m.uvm)m.uvm.push(uvm.slice());return k;});
    for(let i=1;i+1<ids.length;i++){m.tris.push(ids[0],ids[i],ids[i+1]);added++;}
  }
  return added;
}
