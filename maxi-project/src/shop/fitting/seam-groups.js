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
    push(Q, 0, noArm);
    for (const v of group) for (let k = 0; k < 3; k++) P[v * 3 + k] = Q[k];
  }
}
