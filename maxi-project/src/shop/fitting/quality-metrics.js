import {QUALITY_POLICY as Q,qualityDecision} from './quality-policy.js';
import {armJ} from './geometry.js';
import {itemCm} from './sizes.js';
import {inspectSurfaceSeams,inspectPatternBoundary} from './surface-weld.js';
import {compareProfiles} from './quality-masks.js';

export function inspectStrain(C,P,kind) {
 const family=['tee','sweater','hoodie'].includes(kind)?'knit':['jacket','coat','puffer'].includes(kind)?'structured':'woven',limit=Q.strain[family],parts=new Map();
 const owner=new Map();C.meshes.forEach((m,i)=>m.verts.forEach(v=>{if(!owner.has(v))owner.set(v,{part:i,role:m.role||'sleeve'});}));
 for(let e=0;e<C.E.length;e+=4){const direction=C.E[e+3];if(direction!==0&&direction!==3&&direction!==1)continue;
  const a=C.E[e],b=C.E[e+1],rest=C.E[e+2];if(!(rest>0))continue;
  const who=owner.get(a)||{part:-1,role:'unknown'},key=who.part+':'+direction;
  if(!parts.has(key))parts.set(key,{...who,direction:direction===3?'weft':direction===1?'bias':'warp',length:0,overLength:0,compressedLength:0,maxExtension:0,count:0});
  const p=parts.get(key),ratio=Math.hypot(...[0,1,2].map(k=>P[b*3+k]-P[a*3+k]))/rest;
  p.length+=rest;p.count++;p.maxExtension=Math.max(p.maxExtension,ratio-1);
  if(ratio>1+limit.extension)p.overLength+=rest;if(ratio<Q.strain.compressionRatio)p.compressedLength+=rest;
 }
 return {family,limit,parts:[...parts.values()].map(p=>({...p,overFraction:p.overLength/p.length,compressedFraction:p.compressedLength/p.length}))};
}

// Nonuniform arc samples must not bias the reported sleeve centre.
export function perimeterCentre(ring){
 const sum=[0,0,0];let length=0;
 ring.forEach((p,i)=>{const q=ring[(i+1)%ring.length],w=Math.hypot(...p.map((v,k)=>v-q[k]));length+=w;for(let k=0;k<3;k++)sum[k]+=(p[k]+q[k])*.5*w;});
 return sum.map(v=>v/(length||1));
}

export function displayedPositions(g,C,P){
 const V=Float64Array.from(P),seen=new Set();
 for(const mesh of g.children){const cm=mesh.userData.cm;if(!cm)continue;const positions=mesh.geometry.attributes.position.array;
  C.meshes[cm.mi].verts.forEach((v,k)=>{if(seen.has(v))return;seen.add(v);for(let j=0;j<3;j++)V[v*3+j]=positions[k*3+j];});
 }
 return V;
}

export function backSourceStatus(item,dr){
 const front=item.digitization?.front,back=item.digitization?.back;
 const hash=v=>v?.sourceSha256||v?.sha256||v?.sourceHash;
 if(!dr.back||!item.tex?.back||item.tex.back===item.tex.front)return 'missing';
 if(hash(front)&&hash(front)===hash(back))return 'duplicate';
 if(back?.coverage==='material-only'||back?.viewCoverage==='partial'||back?.materialOnly===true)return 'partial';
 return 'independent';
}

function insidePolygon(points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const [x,y]=points[i],[xx,yy]=points[j];if((y>0)!==(yy>0)&&0<(xx-x)*(-y)/(yy-y)+x)inside=!inside;
 }return inside;}

// Tests the displayed ring, so a sleeve outside the arm cannot pass merely
// because none of its triangles intersects the body. Ignore the shaped cap.
export function inspectSleeves(g,d,chains,measured=false) {
 const C=g.userData.cloth.C,positions=new Map();
 for(const mesh of g.children){const cm=mesh.userData.cm;if(!cm)continue;const P=mesh.geometry.attributes.position.array;
  C.meshes[cm.mi].verts.forEach((v,i)=>{if(!positions.has(v))positions.set(v,[P[i*3],P[i*3+1],P[i*3+2]]);});}
 const j=armJ(d),s=Math.sin(j.th),c=Math.cos(j.th),out=[];
 for(const chain of chains){const {side,expectedCuff}=chain;if(!side||!expectedCuff){out.push({status:'missing'});continue;}
  const D=[side*s,-c,0],U=[c,side*s,0],origin=[side*j.x,j.y,0],rows=[];
  for(let r=Math.max(2,Math.ceil(chain.rings.length*.2));r<chain.rings.length;r++){
   const ring=chain.rings[r].map(v=>positions.get(v));if(ring.some(p=>!p)){rows.push({valid:false,missing:true});continue;}
   const centre=perimeterCentre(ring),along=centre.reduce((sum,v,k)=>sum+(v-origin[k])*D[k],0);
   const axis=origin.map((v,k)=>v+D[k]*along),poly=ring.map(p=>[p.reduce((sum,v,k)=>sum+(v-axis[k])*U[k],0),p[2]-axis[2]]);
   // An intentionally extended cuff can lie beyond the hand. Its length is
   // checked against the garment measurement, not clamped to the wrist.
   const applicable=along>=.02&&along<=j.L*1.02;
   const areaM2=Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
   rows.push({row:r,along,applicable,areaM2,valid:areaM2>1e-6&&centre[0]*side>0&&(!applicable||insidePolygon(poly))});
  }
  const cuff=chain.rings.at(-1).map(v=>positions.get(v)),centre=cuff.every(Boolean)?perimeterCentre(cuff):[NaN,NaN,NaN];
  const cuffErrorM=Math.abs(centre.reduce((sum,v,k)=>sum+(v-expectedCuff[k])*D[k],0)),tested=rows.filter(r=>r.applicable||r.missing),missed=rows.filter(r=>!r.valid);
  out.push({status:'measured',side,rows,tested:tested.length,missed:missed.length,missingEnclosureFraction:missed.length/Math.max(1,tested.length),
   cuffErrorM,cuffToleranceM:measured?Q.sleeve.measuredCuffErrorM:Q.sleeve.estimatedCuffErrorM});
 }
 return out;
}

// Both views, 32 sections, plus worst local deviation. Unmatched hanging/flat
// photographs remain a review proxy, not a ground-truth worn silhouette.
export function inspectSilhouettes(C,P,d,item,dr,info,top) {
 const out=[];if(!top)return out;
 for(const role of ['front','back']){
  const source=dr[role],panel=C.meshes.filter(m=>m.role===role),points=panel.flatMap(m=>m.verts);
  if(!source?.grid||!source.a||!points.length){out.push({role,status:'missing'});continue;}
  const {grid,gw,gh}=source,a=source.a,cc=Math.max(0,Math.min(gw-1,Math.round(a.cx*gw))),run=r=>{
   const row=grid[Math.max(0,Math.min(gh-1,r))];if(row[cc]!=='1')return 0;let l=cc,h=cc;while(l>0&&row[l-1]==='1')l--;while(h<gw-1&&row[h+1]==='1')h++;return h-l+1;};
  const start=Math.min(gh-1,Math.floor(((a.arm||.3)+.03)*gh));let end=start;while(end+1<gh&&run(end+1)>run(start)*.75)end++;
  const y0=.858*d.H+.012-info.AD-.02,y1=Math.min(...points.map(v=>P[v*3+1])),model=[],reference=[];
  for(let n=0;n<Q.silhouette.sections;n++){const t=(n+.5)/Q.silhouette.sections,y=y0+(y1-y0)*t;let lo=Infinity,hi=-Infinity;
   for(const m of panel)for(let e=0;e<m.tris.length;e+=3){const vs=m.tris.slice(e,e+3).map(k=>m.verts[k]);for(let k=0;k<3;k++){
    const v=vs[k]*3,w=vs[(k+1)%3]*3;if((P[v+1]>y)===(P[w+1]>y))continue;const f=(y-P[v+1])/(P[w+1]-P[v+1]),x=P[v]+f*(P[w]-P[v]);lo=Math.min(lo,x);hi=Math.max(hi,x);}}
   model.push(hi>lo?hi-lo:0);reference.push(run(Math.round(start+(end-start)*t))/gw);
  }
  out.push({role,...compareProfiles(model,reference),poseMatched:item.qualityEvidence?.silhouettePoseMatched===true});
 }
 return out;
}

export function auditGarment(g,d,{item,dr,info,top,chains,P}) {
 const C=g.userData.cloth.C,checks=[],add=(code,status,metrics,why)=>checks.push({code,status,metrics,why});
 const finite=P.every(Number.isFinite)&&C.E.every(Number.isFinite)&&g.children.filter(m=>m.userData.cm).every(m=>m.geometry.attributes.position.array.every(Number.isFinite));
 add('finite-surface',finite?'pass':'fail',null,'В сетке есть недопустимые координаты');
 if(!finite)return qualityDecision(checks);
 if(g.userData.contactQA)add('body-contact',g.userData.contactQA.after.bad?'fail':'pass',g.userData.contactQA.after,'Поверхность одежды пересекает тело');
 const b=inspectPatternBoundary(g),seams=inspectSurfaceSeams(g),expected=g.userData.pattern.expectedOpenings;
 add('seams',seams.maxGap<=Q.seamGapM?'pass':'fail',seams,'Шов разошёлся');
 add('topology',!b.collapsed&&!b.nonmanifold&&b.loops.length===expected&&b.loops.every(l=>!l.degree)?'pass':'fail',
  {collapsed:b.collapsed,nonmanifold:b.nonmanifold,loops:b.loops.map(l=>({count:l.count,irregularVertices:l.degree})),expected},'Лишнее отверстие или неверное соединение деталей');
 const cm=itemCm(item,d.b);
 for(const [stage,points]of [['solver',P],['displayed',displayedPositions(g,C,P)]]){
 const strain=inspectStrain(C,points,item.kind);
 for(const part of strain.parts){
  const gross=part.maxExtension>Q.strain.grossExtension,over=part.overFraction>strain.limit.overFraction;
  add('strain',gross?'fail':over?'review':'pass',{...part,stage,family:strain.family,limit:strain.limit},'Сильное локальное растяжение ткани');
  if(part.compressedFraction>Q.strain.compressedFraction)add('compression','review',part,'Сильное локальное сжатие; нужно проверить складки');
 }
 }
 const sleeves=inspectSleeves(g,d,chains,!!cm.sleeve);
 for(const sleeve of sleeves){const bad=sleeve.status==='measured'&&(sleeve.missingEnclosureFraction>Q.sleeve.missingEnclosureFraction||sleeve.cuffErrorM>sleeve.cuffToleranceM);
  add('sleeve-routing',sleeve.status==='missing'?'review':bad?'fail':'pass',sleeve,'Рукав проходит мимо руки или неверно расположена манжета');}
 if(top&&!info.noSleeve&&!sleeves.length)add('sleeve-routing','review',null,'Нет данных для проверки положения рукавов');
 if(top&&item.state!=='tucked'){
  const ys=C.meshes.filter(m=>m.role==='front'||m.role==='back').flatMap(m=>m.verts.map(v=>P[v*3+1])),want=.858*d.H+.012-(info.L0||info.L),error=Math.abs(Math.min(...ys)-want),tol=cm.len?Q.placement.measuredHemErrorM:Q.placement.estimatedHemErrorM;
  add('hem-placement',error>tol?'review':'pass',{errorM:error,toleranceM:tol,measured:!!cm.len},'Высота подола отличается от заданной; нужно проверить крой');
 }
 const silhouettes=inspectSilhouettes(C,P,d,item,dr,info,top);
 for(const silhouette of silhouettes){const bad=silhouette.status==='measured'&&(silhouette.mean>Q.silhouette.mean||silhouette.worst>Q.silhouette.worst);
  add('silhouette',silhouette.status==='missing'||!silhouette.poseMatched?'review':bad?'fail':'pass',silhouette,
   silhouette.poseMatched?'Силуэт отличается от исходного фото':'Нет сопоставимого эталона надетого силуэта');}
 if(!top)add('silhouette','review',null,'Силуэт низа требует отдельного сопоставления с фото');
 const evidence=item.qualityEvidence||{};
 if(evidence.constructionReviewed!==true)add('construction-evidence','review',null,'Крой ещё не подтверждён');
 if(evidence.textureReviewed!==true)add('texture-evidence','review',null,'Сохранность принтов и фактуры ещё не подтверждена');
 if(evidence.materialMeasured!==true)add('material-evidence','review',null,'Растяжимость материала не измерена');
 const backStatus=backSourceStatus(item,dr);
 if(backStatus!=='independent')add('back-source','review',{status:backStatus},'Нет полного независимого изображения спинки');
 return qualityDecision(checks);
}
