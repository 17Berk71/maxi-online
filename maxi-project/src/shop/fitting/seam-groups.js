// A seam can join more than two vertices (front/back/sleeve, unequal sampling).
// Treat its connected component once; pairwise sums depend on seam order.
const cache = new WeakMap();
export function seamGroups(C) {
  if (cache.has(C)) return cache.get(C);
  const parent = new Map(), find = i => {
    if (!parent.has(i)) parent.set(i, i);
    let r = i;
    while (parent.get(r) !== r) r = parent.get(r);
    while (parent.get(i) !== i) { const next = parent.get(i); parent.set(i, r); i = next; }
    return r;
  };
  for (const [a, b] of C.seams) parent.set(find(a), find(b));
  const groups = new Map();
  for (const i of parent.keys()) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
  const result = [...groups.values()]; cache.set(C, result); return result;
}

// Sum each original area-weighted normal exactly once, then share it across
// the sewn component. UV coordinates and garment photographs stay untouched.
export function shareSeamValues(C, values, stride, average = false) {
  for (const group of seamGroups(C)) for (let k = 0; k < stride; k++) {
    let sum = 0;
    for (const i of group) sum += values[i * stride + k];
    if (average) sum /= group.length;
    for (const i of group) values[i * stride + k] = sum;
  }
}

// Finish a sewn junction as one physical point, with one collision decision.
// A sleeve/body junction must use the full arm surface for every copy.
export function projectSeams(C, P, push) {
  const sleeve = new Set();
  for (const mesh of C.meshes) if (mesh.local) for (const v of mesh.verts) sleeve.add(v);
  const Q = new Float32Array(3);
  for (const group of seamGroups(C)) {
    Q.fill(0); let noArm = true;
    for (const v of group) { for (let k = 0; k < 3; k++) Q[k] += P[v * 3 + k] / group.length; if (sleeve.has(v)) noArm = false; }
    push(Q, 0, noArm, C.contactSide?.[group[0]]||0);
    for (const v of group) for (let k = 0; k < 3; k++) P[v * 3 + k] = Q[k];
  }
}

// Unequal panel corner sampling can identify two corners of a tiny face as
// the same sewn point. Such a face has zero area after sewing; its internal
// spring also has no physical length and must not fight the seam constraint.
export function pruneCollapsedSeams(C){
 const root=Array.from({length:C.pin.length},(_,i)=>i);for(const group of seamGroups(C))for(const i of group)root[i]=group[0];
 let triangles=0,links=0;
 for(const m of C.meshes){const tris=[];for(let t=0;t<m.tris.length;t+=3){const face=m.tris.slice(t,t+3),ids=face.map(k=>root[m.verts[k]]);if(new Set(ids).size<3)triangles++;else tris.push(...face);}m.tris=tris;}
 const edges=[];for(let e=0;e<C.E.length;e+=4){if(root[C.E[e]]===root[C.E[e+1]])links++;else edges.push(C.E[e],C.E[e+1],C.E[e+2],C.E[e+3]);}C.E=edges;
 return {triangles,links};
}
