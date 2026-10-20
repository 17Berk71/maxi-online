// Отложной воротник (поло, рубашка) объёмом: на фото он лежал плоско и был нарисован на ткани. Здесь — отдельная деталь
// по линии горловины: стойка вверх вдоль шеи, сгиб и отлёт вниз, на плечи; спереди концы воротника уголками,
// у середины — разрез планки. Цвет и рисунок — с фото (место воротника у горловины). Деталь не считается в расчёте
// ткани: держится за точки горловины и в кадрах анимации едет вместе с ними.
import * as THREE from 'three';

// профиль поперёк воротника: [вверх от горловины (доля стойки), наружу (м), доля отлёта (для фото)]
const PROF = [[0, 0, 0], [0, 0, 0.05], [0, 0, 0.16], [0, 0, 0.45], [0, 0, 0.75], [0, 0, 1]];   // шесть рядов поперёк воротника; третье число — доля отлёта (для фото)

export function buildCollar(g, C, P, N, mat) {
  const cl = C.collar; if (!cl || !cl.ring || cl.ring.length < 6) return;
  // точки горловины по кругу: угол от середины переда (0) через бок (±π/2) к середине спинки (±π)
  const ring = [...new Set(cl.ring)].map(i => [i, Math.atan2(P[i * 3], P[i * 3 + 2])]).sort((a, b) => a[1] - b[1]);
  const gap = 0.05;   // разрез у середины переда (рад): концы воротника по сторонам планки
  const pts = ring.filter(([, th]) => Math.abs(th) > gap);
  // от левого края разреза вокруг спины к правому: углы −π..−gap и gap..π — склеиваем через спину (±π)
  const left = pts.filter(([, th]) => th < 0), right = pts.filter(([, th]) => th > 0);
  const order = right.concat(left.map(([i, th]) => [i, th + 2 * Math.PI]));   // gap…π, π…2π−gap
  const K = order.length, R = PROF.length, n = K * R;
  const geo = new THREE.BufferGeometry(), uv = new Float32Array(n * 2), uvm = new Float32Array(n * 2), idx = [];
  const a = cl.a || {cx: 0.5, hw: 0.3}, [pu, pv] = collarUV(mat.map, a);
  // цвет воротника — одна точка фото (воротник однотонный; рисунок фото у горловины — тень и края ткани, полосы), фактура — от шейдера ткани
  order.forEach(([, th], k) => { PROF.forEach(([, , f], r) => { const q = r * K + k; uv[q * 2] = pu; uv[q * 2 + 1] = 1 - pv; uvm[q * 2] = th * 0.07; uvm[q * 2 + 1] = f * 0.06; }); });
  for (let r = 0; r < R - 1; r++) for (let k = 0; k < K - 1; k++) { const A = r * K + k, B = A + 1, Cc = A + K, D = Cc + 1; idx.push(A, Cc, B, B, Cc, D); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('uvm', new THREE.Float32BufferAttribute(uvm, 2));
  geo.setAttribute('wrk', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  geo.setIndex(idx);
  const m = mat.clone(); m.side = THREE.DoubleSide; if (mat.onBeforeCompile) m.onBeforeCompile = mat.onBeforeCompile; m.userData = Object.assign({}, mat.userData);
  // воротник другого цвета: на фото его убрали с ткани (drape_cut.find_collar) — цвет из выкройки, как у материала по фото
  // (основной цвет ×0.7 и немного свечения), фактура — от шейдера ткани
  if (a.collar && a.collar.rgb) { const c = new THREE.Color(a.collar.rgb).convertSRGBToLinear(); m.map = null; m.emissiveMap = null; m.color.copy(c).multiplyScalar(0.7 * 1.25); m.emissive.copy(c); m.needsUpdate = true; }
  const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.collar = {order, K, hs: cl.hs || 0.028, fw: cl.fw || 0.042}; collarUpdate(mesh, P, N); g.add(mesh);
}
// A contrasting collar requires the observed a.collar.rgb metadata. Bright
// hangers, skin and background near the neckline are not colour evidence.
export function sampleBodyColour(D,W,H,a={}){
  const clamp=v=>Math.max(.02,Math.min(.98,v)),cx=Number.isFinite(a.cx)?a.cx:.5,hw=Number.isFinite(a.hw)?a.hw:.3,body=[clamp(cx+hw*.3),.4],samples=[];
  for(let v=.3;v<.68;v+=.035)for(let u=-.5;u<=.5;u+=.1){const x=clamp(cx+u*hw),i=(Math.min(H-1,Math.floor(v*H))*W+Math.min(W-1,Math.floor(x*W)))*4;
    if(D[i+3]>=240)samples.push({uv:[x,v],rgb:[D[i],D[i+1],D[i+2]]});
  }
  if(!samples.length)return body;
  const median=[0,1,2].map(k=>samples.map(p=>p.rgb[k]).sort((x,y)=>x-y)[samples.length>>1]);
  let best=samples[0],distance=Infinity;for(const p of samples){const delta=Math.hypot(...p.rgb.map((v,k)=>v-median[k]));if(delta<distance){distance=delta;best=p;}}
  return best.uv;
}
function collarUV(tex,a){
  const fallback=sampleBodyColour([],1,1,a),im=tex&&tex.image;if(!im||!im.width)return fallback;
  const W=64,H=Math.max(8,Math.round(W*im.height/im.width)),cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const g=cv.getContext('2d');try{g.drawImage(im,0,0,W,H);return sampleBodyColour(g.getImageData(0,0,W,H).data,W,H,a);}catch{return fallback;}
}
// по точкам горловины P и нормалям ткани N (кадр анимации или итог): стойка — вверх вдоль шеи, отлёт — по поверхности
// ткани вниз от горловины (на грудь, плечи, спину) с зазором на толщину, а не горизонтально в воздух
export function collarUpdate(mesh, P, N) {
  const {order, K, hs, fw} = mesh.userData.collar, pos = mesh.geometry.attributes.position.array, col = mesh.geometry.attributes.color.array;
  let cx = 0, cz = 0; order.forEach(([i]) => { cx += P[i * 3]; cz += P[i * 3 + 2]; }); cx /= K; cz /= K;
  order.forEach(([i, th], k) => { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], ox = x - cx, oz = z - cz, l = Math.hypot(ox, oz) || 1, rx = ox / l, rz = oz / l;
    let nx = N ? N[i * 3] : rx, ny = N ? N[i * 3 + 1] : 0.3, nz = N ? N[i * 3 + 2] : rz; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    if (nx * rx + nz * rz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    // от горловины по ткани: наружу и вниз, без составляющей вдоль нормали
    let tx = rx, ty = -0.8, tz = rz; const dn = tx * nx + ty * ny + tz * nz; tx -= dn * nx; ty -= dn * ny; tz -= dn * nz; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const c = Math.cos(th), front = Math.max(0, c), tip = c > 0.8 ? Math.pow((c - 0.8) / 0.2, 2) : 0, w = fw * (1 + 0.9 * front + 0.8 * tip), hs_ = hs * (1 - 0.45 * tip);   /* спереди отлёт шире (на фото он лежит ниже горловины), у концов стойка ниже */
    // [вверх (доля стойки), по ткани от горловины (доля ширины отлёта), над тканью (м)]
    const rows = [[0, 0, 0.002], [0.92, 0, 0.001], [1.04, 0, 0.005], [0.55, 0.12, 0.008], [0.12, 0.55, 0.008], [0, 1, 0.006]];
    rows.forEach(([u, t, o], r) => { const q = (r * K + k) * 3;
      const inw = r < 3 ? 0.002 * u : 0;   // стойка чуть к шее
      pos[q] = x + t * w * tx + o * nx - rx * inw; pos[q + 1] = y + u * hs_ + t * w * ty + o * ny; pos[q + 2] = z + t * w * tz + o * nz - rz * inw;
      col[q] = col[q + 1] = col[q + 2] = r < 2 ? 0.8 : 1; }); });
  mesh.geometry.computeVertexNormals(); mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.normal.needsUpdate = true; mesh.geometry.attributes.color.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}
