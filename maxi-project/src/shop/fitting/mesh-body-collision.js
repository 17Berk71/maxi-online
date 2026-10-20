// Worker-safe lookup over front/back columns rasterized from the visible body.
// Four-neighbour support is conservative by at most one grid cell (~7 mm).
import {makeUpperMeshCollider} from './triangle-surface.js';
export function makeMeshBodyCollider(d,under,margin) {
  const full=d.mhField,core=d.mhCore,m=.007+(margin||0),H=d.H;
  const upper=d.mhUpper?makeUpperMeshCollider(d.mhUpper,m):null;
  const upperPoint=new Float64Array(3);
  let front,back;
  const sample=(f,x,y)=>{
    const fx=(x-f.xmin)/f.step,fy=(y-f.ymin)/f.step,ix=Math.floor(fx),iy=Math.floor(fy);
    front=-1e6;back=1e6;
    if(ix<0||iy<0||ix>=f.nx-1||iy>=f.ny-1)return false;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
      const i=(iy+dy)*f.nx+ix+dx;
      if(f.front[i]>=f.back[i]){front=Math.max(front,f.front[i]);back=Math.min(back,f.back[i]);}
    }return front>=back;
  };
  const push=(P,i,noArm,sideHint=0)=>{
    let x=P[i],y=P[i+1],z=P[i+2],hit=false;
    if(y<.004){y=.004;hit=true;}
    const f=noArm&&y<d.mhArmY-.07?core:full;
    if(upper&&(d.mhUpper.fullBody||y>H*.43)){
      upperPoint[0]=x;upperPoint[1]=y;upperPoint[2]=z;hit=upper(upperPoint,0,sideHint===2?2:Math.abs(x)>.08*H&&y<.81*H?sideHint:0,P,i)||hit;
      x=upperPoint[0];y=upperPoint[1];z=upperPoint[2];
    }else if(sample(f,x,y)&&z<front+m&&z>back-m){
      const up=front+m-z,down=z-(back-m);let distance=Math.min(up,down),axis=2,dir=up<down?1:-1;
      // Front/back columns also need a lateral escape: a sewn side seam near
      // z=0 must move to the flank, not split between front and back surfaces.
      // Upward escape is restricted to the shoulder, where it supports fabric.
      {
        const directions=y>.77*H&&y<.88*H?[[1,1],[0,1],[0,-1]]:[[0,1],[0,-1]];
        const max=Math.min(48,Math.ceil(distance/f.step)+1);
        search:for(let k=1;k<=max;k++)for(const [ax,sgn] of directions){
          const xx=x+(ax===0?sgn*k*f.step:0),yy=y+(ax===1?k*f.step:0);
          if(!sample(f,xx,yy)||z<back-m||z>front+m){const dist=k*f.step+m;if(dist<distance){distance=dist;axis=ax;dir=sgn;}if(axis!==2)break search;}
        }
      }
      if(axis===0)x+=distance*dir;else if(axis===1)y+=distance;else z+=distance*dir;
      hit=true;
    }
    if(under){
      const k=Math.max(0,Math.min(100,Math.round(y/H*100))),a=(under.a[k]||0)+m,b=(under.b[k]||0)+m;
      if(a>m&&b>m){const q=(x/a)**2+(z/b)**2;if(q<1){const s=1/Math.sqrt(Math.max(q,1e-6));if(q<1e-6)z=b;else{x*=s;z*=s;}hit=true;}}
    }
    P[i]=x;P[i+1]=y;P[i+2]=z;return hit;
  };
  // This adapter supports the existing settling animation (fixed body pose).
  // Dynamic arm posing requires re-rasterizing the mesh and is deliberately gated.
  push.setArm=delta=>{if(Math.abs(delta)>1e-7)throw new Error('MakeHuman: use fixed-pose settling animation');};
  return push;
}
