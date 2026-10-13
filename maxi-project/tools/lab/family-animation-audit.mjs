// Every existing garment: real solver frames, finishing/collision pass, exact static endpoint.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {armSpread} from '../../src/shop/fitting/specs.js';
import {drapePrepare} from '../../src/shop/fitting/drape.js';
import {makeCollider} from '../../src/shop/fitting/collider.js';
import {runCloth} from '../../src/shop/fitting/sim.js';
import {fit} from '../../src/shop/fitting/state.js';
const output=process.argv[2]||'tools/wardrobe/out/animation-stage9';fs.mkdirSync(output,{recursive:true});
const rows=[],items=JSON.parse(fs.readFileSync('tools/wardrobe/out/index.json'));
for(const original of items){
 const item=structuredClone(original);item.tex={};item.sizesT=item.sizes;item.state=item.states?.[0]?.[0]||'';item.size=item.sizes?.[0]?.name||null;
 const b=item.who==='women'?{sex:'f',height:173,weight:56,chest:82,waist:62,hips:92}:{sex:'m',height:186,weight:82,chest:110,waist:82,hips:98};
 fit.UNDER=fit.UNDERZ=null;fit.BOT_YW=0;fit.PEND=[];fit.PENDZ=[];
 const d=bodyDims(b);d.armA=armSpread([item],d);const job=drapePrepare(item,d),o={rec:'settle'};
 const still=runCloth(job.C,makeCollider(d,null,job.margin),job.fab,job.yPin);
 const animated=runCloth(job.C,makeCollider(d,null,job.margin),job.fab,job.yPin,o);
 assert.deepEqual(animated,still,item.id+': static endpoint');
 const n=still.length;assert.deepEqual(o.frames.slice(-n),still,item.id+': final recorded frame');
 let finite=true;for(let k=0;k<o.nf;k++){const frame=o.frames.slice(k*n,(k+1)*n);job.finishPoints(frame);finite&&=frame.every(Number.isFinite);}
 assert(finite,item.id+': nonfinite frame');
 rows.push({id:item.id,body:b,size:item.size,state:item.state,frames:o.nf,finite,endpoint_exact:true,scope:'solver and finishing pass; not a visual animation review'});
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({schema_version:1,rows},null,2));console.log(item.id,o.nf,'finite frames, endpoint exact');
}
