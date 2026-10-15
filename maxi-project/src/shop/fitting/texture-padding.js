// Extend only transparent background RGB from the nearest opaque texel. The
// clothing mesh defines the cut edge; transparent photo background is not fabric.
// Opaque source pixels (including prints and calibrated colour) stay byte-identical.
export function padTransparentTexels(rgba, width, height) {
  const count=width*height,owner=new Int32Array(count).fill(-1),queue=new Int32Array(count);
  let tail=0,hasBackground=false;
  for(let i=0;i<count;i++){
    if(rgba[i*4+3]>=128){owner[i]=i;queue[tail++]=i;}else hasBackground=true;
  }
  if(!hasBackground||!tail)return false;
  const visit=(i,source)=>{if(owner[i]!==-1)return;owner[i]=source;queue[tail++]=i;};
  for(let head=0;head<tail;head++){
    const i=queue[head],x=i%width,source=owner[i];
    if(x>0)visit(i-1,source);if(x+1<width)visit(i+1,source);
    if(i>=width)visit(i-width,source);if(i+width<count)visit(i+width,source);
  }
  for(let i=0;i<count;i++)if(rgba[i*4+3]<128){
    const source=owner[i]*4;
    for(let k=0;k<3;k++)rgba[i*4+k]=rgba[source+k];rgba[i*4+3]=255;
  }
  return true;
}
