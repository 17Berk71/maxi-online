// A tee's bound neck edge bends more stiffly than its single-layer body fabric.
// Preserve its flat-pattern rest chords; no body-sized target is imposed.
export function bindNeckline(C,panel){
 const columns=new Map();
 for(const p of panel.pts)if(p.edge&&p.lab==='neck'){
  const old=columns.get(p.c);if(!old||p.y<old.y)columns.set(p.c,p);
 }
 const curve=[...columns.values()].sort((a,b)=>a.x-b.x);
 for(const step of [2,3,4])for(let i=0;i+step<curve.length;i++){
  const a=curve[i],b=curve[i+step];C.link(a.g,b.g,Math.hypot(a.x-b.x,a.y-b.y),4);
 }
 return curve.map(p=>p.g);
}
