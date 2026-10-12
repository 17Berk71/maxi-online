// После укладки оката сглаживание не должно оставлять растянутые связи.
// Окат закреплён на пройме; исходные длины выкройки не меняются.
export function relaxSleeves(C, P, chains, push, passes = 48) {
  const movable = new Set(), fixed = new Set(chains.flatMap(ch => ch.ring));
  chains.forEach(ch => (ch.rings || []).flat().forEach(i => { if (!fixed.has(i)) movable.add(i); }));
  const edges = [];
  for (let e = 0; e < C.E.length; e += 4) {
    const i = C.E[e], j = C.E[e + 1], kind = C.E[e + 3];
    if ((kind === 0 || kind === 3) && (movable.has(i) || movable.has(j))) edges.push(e);
  }
  for (let pass = 0; pass < passes; pass++) {
    for (const e of edges) {
      const i = C.E[e], j = C.E[e + 1], a = i * 3, b = j * 3;
      const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
      const len = Math.hypot(dx, dy, dz), limit = C.E[e + 2] * 1.10;
      if (len <= limit) continue;
      const wa = movable.has(i) ? 1 : 0, wb = movable.has(j) ? 1 : 0;
      const k = (len - limit) / len / (wa + wb);
      for (const [q, w] of [[a, wa], [b, -wb]]) {
        P[q] += dx * k * w; P[q + 1] += dy * k * w; P[q + 2] += dz * k * w;
      }
    }
    movable.forEach(i => push(P, i * 3));
  }
}
