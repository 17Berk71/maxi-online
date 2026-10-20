// MakeHuman CC0 graphical data + our own limited measurement adapter.
// No MakeHuman application code is included. See assets/makehuman/provenance.json.
import * as THREE from 'three';
import {buildUpperSurface} from './triangle-surface.js';
let DATA,loading;
export function loadMakeHuman() {
  return loading||(loading=import('./assets/makehuman/body-data.js').then(m=>{DATA=m.default;return DATA;}).catch(e=>{loading=null;throw e;}));
}

const smooth = t => { t=Math.max(0,Math.min(1,t));return t*t*(3-2*t); };
const at = (rows,y) => {
  if(y<=rows[0][0])return rows[0][1];
  for(let i=1;i<rows.length;i++)if(y<=rows[i][0]){
    const [a,u]=rows[i-1],[b,v]=rows[i];return u+(v-u)*smooth((y-a)/(b-a));
  }return rows[rows.length-1][1];
};
export function validateMakeHumanBody(b) {
  const limits={height:[140,210],weight:[40,140],chest:[70,150],waist:[50,140],hips:[70,150]};
  for(const [key,[lo,hi]] of Object.entries(limits))if(!Number.isFinite(b[key])||b[key]<lo||b[key]>hi)
    throw new Error('Проверь мерки: '+key+' вне диапазона '+lo+'–'+hi+'.');
  const h=b.height;
  if(b.chest/h<.40||b.chest/h>.74||b.waist/h<.30||b.waist/h>.70||b.hips/h<.42||b.hips/h>.80||
      b.waist/b.chest<.56||b.waist/b.chest>1.30||b.hips/b.waist<.85||b.hips/b.waist>1.70)
    throw new Error('Эта комбинация мерок пока вне диапазона модели MakeHuman. Проверь рост и обхваты или выбери прежний манекен.');
}

// Exact horizontal triangle intersections, excluding the arm-weighted surface.
// This measures the mesh, rather than assuming that a circular radius equals a girth.
export function sectionGirth(P,index,y,skin=DATA.skin) {
  let length=0;
  for(let q=0;q<index.length;q+=3){
    const ids=[index[q],index[q+1],index[q+2]];
    if(ids.some(v=>skin[v*12]+skin[v*12+1]+skin[v*12+2]+skin[v*12+6]+skin[v*12+7]+skin[v*12+8]>.25))continue;
    const hits=[];
    for(let k=0;k<3;k++){
      const a=ids[k]*3,b=ids[(k+1)%3]*3,ya=P[a+1],yb=P[b+1];
      if((ya<=y&&yb>y)||(yb<=y&&ya>y)){
        const t=(y-ya)/(yb-ya);hits.push([P[a]+t*(P[b]-P[a]),P[a+2]+t*(P[b+2]-P[a+2])]);
      }
    }if(hits.length===2)length+=Math.hypot(hits[1][0]-hits[0][0],hits[1][1]-hits[0][1]);
  }return length;
}

// Rasterize the actual posed triangles into front/back columns. Both the visible
// mesh and this collider originate from the same deformed positions. Resolution
// is ~7 mm at adult height; this is a conservative approximation, not exact SDF.
export function bodyColumns(P,index,H,core=false) {
  const step=H/260, xmin=-H*.43, ymin=-step, nx=226, ny=264;
  const front=new Float32Array(nx*ny).fill(-1e6),back=new Float32Array(nx*ny).fill(1e6);
  for(let q=0;q<index.length;q+=3){
    const a=index[q],b=index[q+1],c=index[q+2],ia=a*3,ib=b*3,ic=c*3;
    const cy=(P[ia+1]+P[ib+1]+P[ic+1])/3;
    if(core&&cy<.8*H-.07){let arm=0;for(const v of [a,b,c])for(const k of [0,1,2,6,7,8])arm+=DATA.skin[v*12+k];if(arm/3>.25)continue;}
    const ax=(P[ia]-xmin)/step,ay=(P[ia+1]-ymin)/step,
      bx=(P[ib]-xmin)/step,by=(P[ib+1]-ymin)/step,cx=(P[ic]-xmin)/step,cy_=(P[ic+1]-ymin)/step;
    const det=(by-cy_)*(ax-cx)+(cx-bx)*(ay-cy_);if(Math.abs(det)<1e-10)continue;
    const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx))),x1=Math.min(nx-1,Math.floor(Math.max(ax,bx,cx))),
      y0=Math.max(0,Math.ceil(Math.min(ay,by,cy_))),y1=Math.min(ny-1,Math.floor(Math.max(ay,by,cy_)));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const u=((by-cy_)*(x-cx)+(cx-bx)*(y-cy_))/det,v=((cy_-ay)*(x-cx)+(ax-cx)*(y-cy_))/det,w=1-u-v;
      if(u< -1e-5||v< -1e-5||w< -1e-5)continue;
      const z=u*P[ia+2]+v*P[ib+2]+w*P[ic+2],i=y*nx+x;
      front[i]=Math.max(front[i],z);back[i]=Math.min(back[i],z);
    }
  }return {front,back,nx,ny,xmin,ymin,step};
}

export function meshShoulderHeight(d,x) {
  const f=d.mhField;if(!f)return null;
  const ix=Math.round((Math.abs(x)-f.xmin)/f.step);if(ix<0||ix>=f.nx)return null;
  for(let iy=Math.min(f.ny-1,Math.floor((.88*d.H-f.ymin)/f.step));iy>=0;iy--){
    const y=f.ymin+iy*f.step;if(y<.77*d.H)break;
    const i=iy*f.nx+ix;if(f.front[i]>=0&&f.back[i]<=0)return y;
  }return null;
}

export function prepareMakeHuman(d) {
  if(d.b.model!=='makehuman')return d;
  validateMakeHumanBody(d.b);
  if(!DATA)throw new Error('Модель MakeHuman ещё не загружена.');
  const ref=DATA.models[d.m?'m':'f'],H=d.H,range=ref.high-ref.low;
  let zShift=0;
  const sourceJoint=name=>{const p=new THREE.Vector3(...ref.joints[name].map((v,k)=>k===1?(v-ref.low)/range*H:v/range*H));p.z-=zShift;return p;};
  const shoulder=sourceJoint('l-shoulder');
  // Align shoulder/neck to the existing garment coordinate system without stretching
  // the neck to compensate for an independently enlarged chest.
  const sy=shoulder.y/H,ymap=y=>{
    const f=y/H;
    const rows=[[0,0],[.50,.50],[sy,.80],[sy+.062,.856],[1,1]];
    for(let i=1;i<rows.length;i++)if(f<=rows[i][0]){
      const [a,u]=rows[i-1],[b,v]=rows[i];return (u+(v-u)*(f-a)/(b-a))*H;
    }return y;
  };
  const raw=new Float32Array(ref.positions.length);
  for(let i=0;i<raw.length;i+=3){raw[i]=ref.positions[i]/range*H;raw[i+1]=ymap((ref.positions[i+1]-ref.low)/range*H);raw[i+2]=ref.positions[i+2]/range*H;}
  // Garment front/back sectors use z=0. The upstream modelling origin is not
  // the centre of the ribcage: align it before fitting, using core vertices only.
  let front=-Infinity,back=Infinity;
  for(let v=0;v<raw.length/3;v++){
    let arm=0;for(const j of [0,1,2,6,7,8])arm+=DATA.skin[v*12+j];
    if(arm>.25||Math.abs(raw[v*3+1]-.72*H)>.008*H)continue;
    front=Math.max(front,raw[v*3+2]);back=Math.min(back,raw[v*3+2]);
  }
  zShift=(front+back)/2;for(let i=2;i<raw.length;i+=3)raw[i]-=zShift;
  const anchors=[.53,.625,.72],wanted=[d.b.hips,d.b.waist,d.b.chest].map(c=>c/100);
  const factors=anchors.map((y,i)=>wanted[i]/sectionGirth(raw,DATA.index,y*H));
  if(factors.some(v=>!Number.isFinite(v)||v<.55||v>1.8))throw new Error('Мерки выходят за пределы безопасного изменения формы тела.');
  const shoulderFactor=Math.max(.85,Math.min(1.35,factors[2]));
  const rows=[[0,1],[.43,factors[0]],[.53,factors[0]],[.625,factors[1]],[.72,factors[2]],[.8,shoulderFactor],[.856,1],[1,1]];
  const scaledJoint=name=>{const p=sourceJoint(name);p.y=ymap(p.y);p.x*=at(rows,p.y/H);p.z*=at(rows,p.y/H);return p;};
  const restJoint=name=>{const p=sourceJoint(name);p.y=ymap(p.y);return p;};
  // Real source skin weights blend torso, upper/lower limbs and hands. Each region
  // uses a bone-space transform; all vertices remain in one indexed mesh.
  const transforms=[],armAngle=d.armA||.16;
  d.mhArmX=scaledJoint('l-shoulder').x;d.mhArmY=.80*H;
  const bmi=d.b.weight/(H*H),limbScale=Math.max(.82,Math.min(1.28,.94+(bmi-21)*.018));
  for(const [side,sgn] of [['l',1],['r',-1]]){
    const names=['shoulder','elbow','hand','upper-leg','knee','ankle'],j=names.map(n=>restJoint(side+'-'+n));
    const armDir=new THREE.Vector3(sgn*Math.sin(armAngle),-Math.cos(armAngle),0),
      a0=new THREE.Vector3(sgn*d.mhArmX,d.mhArmY,0),a1=a0.clone().addScaledVector(armDir,H*.18),a2=a1.clone().addScaledVector(armDir,H*.155);
    const l0=new THREE.Vector3(sgn*d.legX,H*.50,0),l1=new THREE.Vector3(sgn*d.legX,H*.285,0),l2=new THREE.Vector3(sgn*d.legX,H*.055,0);
    const segment=(from,to,dest,end)=>{
      const v=to.clone().sub(from),w=end.clone().sub(dest),ratio=w.length()/v.length(),q=new THREE.Quaternion().setFromUnitVectors(v.clone().normalize(),w.clone().normalize());
      return {from,dest,q,axis:v.normalize(),along:ratio,thick:limbScale};
    };
    const ua=segment(j[0],j[1],a0,a1),la=segment(j[1],j[2],a1,a2),ul=segment(j[3],j[4],l0,l1),ll=segment(j[4],j[5],l1,l2);
    // Keep hands/feet at adult anatomical size; do not stretch fingers with chest girth.
    transforms.push(ua,la,{...la,from:j[2],dest:a2,along:1,thick:1},ul,ll,{...ll,from:j[5],dest:l2,along:1,thick:1});
  }
  const P=new Float32Array(raw.length),point=new THREE.Vector3(),offset=new THREE.Vector3();
  for(let v=0;v<P.length/3;v++){
    const i=v*3,k=at(rows,raw[i+1]/H);point.set(raw[i]*k,raw[i+1],raw[i+2]*k);
    let total=0,x=0,y=0,z=0;
    for(let j=0;j<12;j++){
      const w=DATA.skin[v*12+j];if(!w)continue;total+=w;const t=transforms[j];
      offset.set(raw[i],raw[i+1],raw[i+2]).sub(t.from);const a=offset.dot(t.axis);
      offset.multiplyScalar(t.thick).addScaledVector(t.axis,a*(t.along-t.thick)).applyQuaternion(t.q).add(t.dest);
      x+=w*offset.x;y+=w*offset.y;z+=w*offset.z;
    }
    P[i]=x+(1-total)*point.x;P[i+1]=y+(1-total)*point.y;P[i+2]=z+(1-total)*point.z;
  }
  // Recalibrate the three core cross sections after posing/blending. Smooth changes
  // affect torso weights only, avoiding thickness jumps along the arms.
  const correction=anchors.map((y,i)=>wanted[i]/sectionGirth(P,DATA.index,y*H));
  const cr=[[0,1],[.45,correction[0]],[.53,correction[0]],[.625,correction[1]],[.72,correction[2]],[.8,1],[.856,1],[1,1]];
  for(let v=0;v<P.length/3;v++){let arm=0;for(const j of [0,1,2,6,7,8])arm+=DATA.skin[v*12+j];const k=1+(at(cr,P[v*3+1]/H)-1)*(1-arm);P[v*3]*=k;P[v*3+2]*=k;}
  let floor=Infinity;for(let i=1;i<P.length;i+=3)floor=Math.min(floor,P[i]);
  const knee=.285*H;for(let i=1;i<P.length;i+=3)if(P[i]<knee)P[i]=(P[i]-floor)/(knee-floor)*knee;
  d.mhField=bodyColumns(P,DATA.index,H);d.mhCore=bodyColumns(P,DATA.index,H,true);
  d.mhUpper=buildUpperSurface(P,DATA.index,H,0);
  d.mhProfile={a:new Float32Array(128),b:new Float32Array(128)};
  for(let v=0;v<P.length/3;v++){
    let arm=0;for(const j of [0,1,2,6,7,8])arm+=DATA.skin[v*12+j];if(arm>.25)continue;
    const k=Math.max(0,Math.min(127,Math.round(P[v*3+1]/H*127)));
    d.mhProfile.a[k]=Math.max(d.mhProfile.a[k],Math.abs(P[v*3]));d.mhProfile.b[k]=Math.max(d.mhProfile.b[k],Math.abs(P[v*3+2]));
  }
  // Empty profile bands occur between mesh rings: interpolate, never create steps.
  for(const values of [d.mhProfile.a,d.mhProfile.b])for(let k=0;k<128;k++)if(!values[k]){
    let a=k-1,b=k+1;while(a>=0&&!values[a])a--;while(b<128&&!values[b])b++;
    values[k]=a>=0&&b<128?values[a]+(values[b]-values[a])*(k-a)/(b-a):a>=0?values[a]:values[b]||.01;
  }
  Object.defineProperty(d,'mhGeometry',{value:{positions:P,index:DATA.index},configurable:true});
  d.mhMeasures=Object.fromEntries(anchors.map((y,i)=>[['hips','waist','chest'][i],sectionGirth(P,DATA.index,y*H)*100]));
  d.mhPose=armAngle;
  return d;
}

export function makeHumanMesh(d,material) {
  if(!d.mhGeometry||d.mhPose!==(d.armA||.16))prepareMakeHuman(d);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(d.mhGeometry.positions.slice(),3));
  geometry.setIndex(d.mhGeometry.index);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material),g=new THREE.Group();mesh.name='MakeHuman CC0 adult mannequin';
  mesh.userData.bodyModel='makehuman';g.add(mesh);g.userData.bodyModel='makehuman';return {g,d};
}
