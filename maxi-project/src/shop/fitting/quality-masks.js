// Deterministic area/connected-patch measurements on silhouette masks. No RGB
// threshold: a black garment, white fabric and the background stay distinct.
export function coverageMetrics(expected,covered,width,height) {
 if(expected.length!==width*height||covered.length!==width*height)throw Error('Mask dimensions disagree');
 const missing=new Uint8Array(expected.length),interior=new Uint8Array(expected.length),regions=Array.from({length:6},(_,i)=>({region:i,pixels:0,missing:0}));
 let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(expected[y*width+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 let pixels=0,miss=0;
 // Remove one raster boundary pixel, where antialiasing alone can differ.
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const p=y*width+x;if(!expected[p])continue;
  let full=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!expected[p+dy*width+dx])full=false;
  if(!full)continue;interior[p]=1;pixels++;
  const band=Math.min(2,Math.floor((y-y0)/Math.max(1,y1-y0+1)*3)),side=x<(x0+x1)/2?0:1,r=regions[band*2+side];r.pixels++;
  if(!covered[p]){missing[p]=1;miss++;r.missing++;}
 }
 let largest=0,patches=0;const seen=new Uint8Array(missing.length),queue=new Int32Array(missing.length);
 for(let start=0;start<missing.length;start++)if(missing[start]&&!seen[start]){
  let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);
   for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,q=yy*width+xx;
    if(xx<0||xx>=width||yy<0||yy>=height||!missing[q]||seen[q])continue;seen[q]=1;queue[tail++]=q;}}
  patches++;largest=Math.max(largest,tail);
 }
 return {status:pixels?'measured':'missing',clipped:x0===0||y0===0||x1===width-1||y1===height-1,width,height,interiorPixels:pixels,missingPixels:miss,missingFraction:miss/Math.max(1,pixels),
  largestPatchPixels:largest,largestPatchFraction:largest/Math.max(1,pixels),patches,
  regions:regions.filter(r=>r.pixels>=50).map(r=>({...r,missingFraction:r.missing/r.pixels}))};
}

export function compareProfiles(model,reference) {
 if(model.length!==reference.length||model.length<8||[...model,...reference].some(v=>!Number.isFinite(v)||v<=0))return {status:'missing'};
 const m=model[0],r=reference[0],errors=model.map((v,i)=>Math.abs(v/m-reference[i]/r));
 return {status:'measured',mean:errors.reduce((s,v)=>s+v,0)/errors.length,worst:Math.max(...errors),errors,model,reference};
}
