// Project extension on the sewn graph, keeping flat-pattern rest lengths.
import {seamGroups} from './seam-groups.js';

export function relaxSewnCloth(C,P,push,passes=160){
 const root=Array.from({length:C.pin.length},(_,i)=>i),groups=seamGroups(C);
 for(const group of groups)for(const v of group)root[v]=group[0];
 const members=new Map();root.forEach((r,v)=>{if(!members.has(r))members.set(r,[]);members.get(r).push(v);});
 const fixed=new Set();for(const [r,row]of members){if(row.some(v=>C.pin[v]))fixed.add(r);
  for(let k=0;k<3;k++){const mean=row.reduce((s,v)=>s+P[v*3+k],0)/row.length;P[r*3+k]=mean;}
 }
 const edges=[];for(let e=0;e<C.E.length;e+=4){const kind=C.E[e+3];if(kind!==0&&kind!==1&&kind!==3)continue;
  const a=root[C.E[e]],b=root[C.E[e+1]];if(a!==b)edges.push([a,b,C.E[e+2]*(kind===1?1.08:1.04)]);
 }
 const sector=new Map();for(const row of C.sector||[]){const r=root[row[0]];if(!sector.has(r))sector.set(r,[]);sector.get(r).push(row);}
 const write=()=>{for(const [r,row]of members)for(const v of row)if(v!==r)for(let k=0;k<3;k++)P[v*3+k]=P[r*3+k];};
 for(let pass=0;pass<passes;pass++){
  for(let i=0;i<edges.length;i++){const [a,b,limit]=edges[pass%2?edges.length-1-i:i],q=a*3,t=b*3,dx=P[t]-P[q],dy=P[t+1]-P[q+1],dz=P[t+2]-P[q+2],length=Math.hypot(dx,dy,dz);
   if(length<=limit)continue;const wa=fixed.has(a)?0:1,wb=fixed.has(b)?0:1;if(!wa&&!wb)continue;const w=(length-limit)/length/(wa+wb)*.9;
   P[q]+=dx*w*wa;P[q+1]+=dy*w*wa;P[q+2]+=dz*w*wa;P[t]-=dx*w*wb;P[t+1]-=dy*w*wb;P[t+2]-=dz*w*wb;
  }
  for(const [r,row]of members){if(fixed.has(r))continue;const q=r*3;
   const rules=sector.get(r)||[],signs=new Set(rules.map(v=>v[1]).filter(Boolean));
   if(signs.size===1){const sign=[...signs][0];if(P[q+2]*sign<-.003)P[q+2]=-.003*sign;}
   const sides=new Set(row.map(v=>C.contactSide?.[v]).filter(Boolean)),side=sides.size===1?[...sides][0]:0;
   push(P,q,false,side);
  }
 }
 write();return P;
}
