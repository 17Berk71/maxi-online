// Static upper-body triangle surface. Only typed numeric data crosses the worker.
// The lower body retains its existing collider in this iteration.
export function buildUpperSurface(P, index, H) {
  const normals=new Float32Array(P.length),ids=[],centres=new Float32Array(index.length);
  for(let t=0;t<index.length/3;t++){
    const a=index[t*3]*3,b=index[t*3+1]*3,c=index[t*3+2]*3;
    const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for(const v of [a,b,c]){normals[v]+=nx;normals[v+1]+=ny;normals[v+2]+=nz;}
    if(Math.max(P[a+1],P[b+1],P[c+1])<H*.60)continue;
    ids.push(t);for(let k=0;k<3;k++)centres[t*3+k]=(P[a+k]+P[b+k]+P[c+k])/3;
  }
  for(let i=0;i<normals.length;i+=3){const n=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;for(let k=0;k<3;k++)normals[i+k]/=n;}
  const nodes=[],ordered=[];
  const build=faces=>{
    const node=nodes.length/10,offset=nodes.length;nodes.push(Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity,-1,-1,0,0);
    for(const f of faces)for(let j=0;j<3;j++){const v=index[f*3+j]*3;for(let k=0;k<3;k++){nodes[offset+k]=Math.min(nodes[offset+k],P[v+k]);nodes[offset+3+k]=Math.max(nodes[offset+3+k],P[v+k]);}}
    if(faces.length<=8){nodes[offset+8]=ordered.length/3;nodes[offset+9]=faces.length;for(const f of faces)ordered.push(index[f*3],index[f*3+1],index[f*3+2]);}
    else{let axis=0;for(let k=1;k<3;k++)if(nodes[offset+3+k]-nodes[offset+k]>nodes[offset+3+axis]-nodes[offset+axis])axis=k;
      faces.sort((a,b)=>centres[a*3+axis]-centres[b*3+axis]);const half=faces.length>>1;
      const left=build(faces.slice(0,half)),right=build(faces.slice(half));nodes[offset+6]=left;nodes[offset+7]=right;
    }return node;
  };
  build(ids);return {positions:P,normals,index:Uint32Array.from(ordered),nodes:Float32Array.from(nodes)};
}

// Self-contained for the existing toString-based Web Worker bundle.
export function makeUpperMeshCollider(surface,margin) {
  const {positions:P,normals:N,index:I,nodes:B}=surface,stack=[];
  let rayFront,rayBack;
  const bound=(node,x,y,z)=>{
    const o=node*10,dx=Math.max(B[o]-x,0,x-B[o+3]),dy=Math.max(B[o+1]-y,0,y-B[o+4]),dz=Math.max(B[o+2]-z,0,z-B[o+5]);
    return dx*dx+dy*dy+dz*dz;
  };
  const inside=(x,y,z)=>{
    // Ray parity distinguishes the empty axilla gap from the body. A nearest
    // smoothed normal alone is ambiguous around that concave junction.
    x+=1.3e-7;y+=.7e-7;let hits=0;rayFront=-Infinity;rayBack=Infinity;stack.length=0;stack.push(0);
    while(stack.length){const node=stack.pop(),o=node*10;
      if(x<B[o]||x>B[o+3]||y<B[o+1]||y>B[o+4]||z>=B[o+5])continue;
      if(B[o+9]===0){stack.push(B[o+6],B[o+7]);continue;}
      for(let f=B[o+8];f<B[o+8]+B[o+9];f++){
        const a=I[f*3]*3,b=I[f*3+1]*3,c=I[f*3+2]*3;
        const det=(P[b+1]-P[c+1])*(P[a]-P[c])+(P[c]-P[b])*(P[a+1]-P[c+1]);
        if(Math.abs(det)<1e-14)continue;
        const u=((P[b+1]-P[c+1])*(x-P[c])+(P[c]-P[b])*(y-P[c+1]))/det;
        const v=((P[c+1]-P[a+1])*(x-P[c])+(P[a]-P[c])*(y-P[c+1]))/det,w=1-u-v;
        if(u<0||v<0||w<0)continue;
        const depth=u*P[a+2]+v*P[b+2]+w*P[c+2];
        if(depth>z){hits++;rayFront=Math.max(rayFront,depth);rayBack=Math.min(rayBack,depth);}
      }
    }return (hits&1)===1;
  };
  const project=(Q,q,sideHint)=>{
    const x=Q[q],y=Q[q+1],z=Q[q+2];let best=Infinity,bestFace=-1,bu=0,bv=0,bw=0,cx=0,cy=0,cz=0;
    if(sideHint){
      inside(x,y,-Infinity);const shell=sideHint>0?rayFront:rayBack;
      if(Number.isFinite(shell)){
        if((z-shell)*sideHint<margin-1e-7){Q[q+2]=shell+sideHint*margin;return true;}
        return false;
      }
    }
    stack.length=0;stack.push(0);
    while(stack.length){
      const node=stack.pop(),o=node*10;if(bound(node,x,y,z)>best)continue;
      if(B[o+9]===0){const a=B[o+6],b=B[o+7],da=bound(a,x,y,z),db=bound(b,x,y,z);
        if(da<db){if(db<=best)stack.push(b);if(da<=best)stack.push(a);}else{if(da<=best)stack.push(a);if(db<=best)stack.push(b);}continue;
      }
      for(let f=B[o+8];f<B[o+8]+B[o+9];f++){
        const a=I[f*3]*3,b=I[f*3+1]*3,c=I[f*3+2]*3;
        const abx=P[b]-P[a],aby=P[b+1]-P[a+1],abz=P[b+2]-P[a+2],acx=P[c]-P[a],acy=P[c+1]-P[a+1],acz=P[c+2]-P[a+2];
        const apx=x-P[a],apy=y-P[a+1],apz=z-P[a+2],d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
        let u,v,w;
        if(d1<=0&&d2<=0){u=1;v=w=0;}
        else{
          const bpx=x-P[b],bpy=y-P[b+1],bpz=z-P[b+2],d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
          if(d3>=0&&d4<=d3){v=1;u=w=0;}
          else{const vc=d1*d4-d3*d2;
            if(vc<=0&&d1>=0&&d3<=0){v=d1/(d1-d3);u=1-v;w=0;}
            else{const cpx=x-P[c],cpy=y-P[c+1],cpz=z-P[c+2],d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
              if(d6>=0&&d5<=d6){w=1;u=v=0;}
              else{const vb=d5*d2-d1*d6;
                if(vb<=0&&d2>=0&&d6<=0){w=d2/(d2-d6);u=1-w;v=0;}
                else{const va=d3*d6-d5*d4;
                  if(va<=0&&d4-d3>=0&&d5-d6>=0){w=(d4-d3)/((d4-d3)+(d5-d6));v=1-w;u=0;}
                  else{const den=va+vb+vc;if(Math.abs(den)<1e-20)continue;v=vb/den;w=vc/den;u=1-v-w;}
                }
              }
            }
          }
        }
        const px=u*P[a]+v*P[b]+w*P[c],py=u*P[a+1]+v*P[b+1]+w*P[c+1],pz=u*P[a+2]+v*P[b+2]+w*P[c+2],distance=(x-px)**2+(y-py)**2+(z-pz)**2;
        if(distance<best){best=distance;bestFace=f;bu=u;bv=v;bw=w;cx=px;cy=py;cz=pz;}
      }
    }
    if(bestFace<0)return false;
    const a=I[bestFace*3]*3,b=I[bestFace*3+1]*3,c=I[bestFace*3+2]*3;
    let nx=bu*N[a]+bv*N[b]+bw*N[c],ny=bu*N[a+1]+bv*N[b+1]+bw*N[c+1],nz=bu*N[a+2]+bv*N[b+2]+bw*N[c+2];
    const abx=P[b]-P[a],aby=P[b+1]-P[a+1],abz=P[b+2]-P[a+2],acx=P[c]-P[a],acy=P[c+1]-P[a+1],acz=P[c+2]-P[a+2];
    const faceSign=(x-cx)*(aby*acz-abz*acy)+(y-cy)*(abz*acx-abx*acz)+(z-cz)*(abx*acy-aby*acx);
    // Interior face projections have an unambiguous oriented half-space. Use
    // ray parity only at edges/vertices, where a smoothed normal is ambiguous.
    const len=Math.sqrt(best),sign=Math.min(bu,bv,bw)>1e-6?(faceSign<0?-1:1):(inside(x,y,z)?-1:1);
    if(sign>=0&&len>=margin-1e-7)return false;
    if(len>1e-9){const s=(sign<0?-1:1)/len;nx=(x-cx)*s;ny=(y-cy)*s;nz=(z-cz)*s;}
    else{const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;}
    Q[q]=cx+margin*nx;Q[q+1]=cy+margin*ny;Q[q+2]=cz+margin*nz;return true;
  };
  return (Q,q,sideHint=0)=>{let hit=false;for(let i=0;i<5;i++){if(!project(Q,q,sideHint))break;hit=true;}return hit;};
}
