import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleBodyColour} from '../../src/shop/fitting/collar3d.js';

test('a white hanger near the neckline cannot turn a dark garment collar white',()=>{
 const W=100,H=100,D=new Uint8Array(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,value=y<15?245:35;D.set([value,value,value,255],i);}
 const [u,v]=sampleBodyColour(D,W,H,{cx:.5,hw:.3}),i=(Math.floor(v*H)*W+Math.floor(u*W))*4;
 assert.equal(D[i],35);assert.ok(v>=.3);
});

test('a small chest graphic is not selected as the dominant body colour',()=>{
 const W=100,H=100,D=new Uint8Array(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,value=y>40&&y<46?250:28;D.set([value,value,value,255],i);}
 const [u,v]=sampleBodyColour(D,W,H,{cx:.5,hw:.3}),i=(Math.floor(v*H)*W+Math.floor(u*W))*4;assert.equal(D[i],28);
});

test('transparent or missing image data returns finite bounded coordinates',()=>{
 for(const a of [{},{cx:NaN,hw:NaN},{cx:5,hw:10}]){const uv=sampleBodyColour([],100,100,a);assert.ok(uv.every(v=>Number.isFinite(v)&&v>0&&v<1));}
});
