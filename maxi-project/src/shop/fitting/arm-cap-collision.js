import {armCapAxes, armX} from './body.js';

// Верхняя половина видимого купола руки в системе повёрнутого сустава.
export function pushArmCap(P, i, arm, radius, height) {
  const x=P[i]-arm.x0,y=P[i+1]-arm.y0,z=P[i+2],t=x*arm.dx+y*arm.dy;
  if(t>=0)return false;
  const rx=x-arm.dx*t,ry=y-arm.dy*t;
  const q=(rx*rx+ry*ry+z*z)/(radius*radius)+t*t/(height*height);
  if(q>=1)return false;
  const s=1/Math.sqrt(Math.max(q,1e-8));
  P[i]=arm.x0+x*s;P[i+1]=arm.y0+y*s;P[i+2]=z*s;
  return true;
}

// Подразделённая поверхность тоже проверяется: хорда между безопасными
// вершинами расчётной сетки может срезать маленький выпуклый купол руки.
export function capSurfaceCollider(d) {
  const cap=armCapAxes(d),th=d.armA||.16,x=armX(d);
  const arms=[-1,1].map(side=>({x0:side*x,y0:.8*d.H,dx:side*Math.sin(th),dy:-Math.cos(th)}));
  return (P,i)=>{let hit=false;for(const arm of arms){
    const t=(P[i]-arm.x0)*arm.dx+(P[i+1]-arm.y0)*arm.dy;
    if(t<0){hit=pushArmCap(P,i,arm,cap.radius+.007,cap.height+.007)||hit;continue;}
    const u=t/(.335*d.H);if(u>.14)continue;
    // Реальный профиль видимой руки, без большого сферического шарнира.
    const radius=(u<.07?.042+(.05-.042)*u/.07:.05+(.046-.05)*(u-.07)/.07)*d.k*d.s+.007;
    const cx=arm.x0+arm.dx*t,cy=arm.y0+arm.dy*t,rx=P[i]-cx,ry=P[i+1]-cy,z=P[i+2],len=Math.hypot(rx,ry,z);
    if(len<radius&&len>1e-8){const s=radius/len;P[i]=cx+rx*s;P[i+1]=cy+ry*s;P[i+2]=z*s;hit=true;}
  }return hit;};
}
