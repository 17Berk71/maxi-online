// Numeric engine audit of every private package, state, size and three body shapes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {bodyDims} from '../../src/shop/fitting/body.js';
import {armSpread} from '../../src/shop/fitting/specs.js';
import {drapePrepare} from '../../src/shop/fitting/drape.js';
import {fitNote} from '../../src/shop/fitting/sizes.js';
import {fit} from '../../src/shop/fitting/state.js';
const output=process.argv[2]||'tools/wardrobe/out/audit-stage9-before';fs.mkdirSync(output,{recursive:true});
const index=JSON.parse(fs.readFileSync('tools/wardrobe/out/index.json'));
const bodies={m:[{sex:'m',height:165,weight:60,chest:90,waist:72,hips:90},{sex:'m',height:186,weight:82,chest:110,waist:82,hips:98},{sex:'m',height:205,weight:110,chest:130,waist:110,hips:120}],f:[{sex:'f',height:160,weight:48,chest:78,waist:58,hips:86},{sex:'f',height:173,weight:56,chest:82,waist:62,hips:92},{sex:'f',height:186,weight:85,chest:110,waist:96,hips:116}]};
const rows=[];
const source=crypto.createHash('sha256');
function sources(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,entry.name);if(entry.isDirectory())sources(p);else if(p.endsWith('.js'))source.update(p).update(fs.readFileSync(p));}}
sources('src');const source_sha256=source.digest('hex');
for(const original of index){
 const selected=original.sizes?.length?original.sizes.map(s=>s.name):[null];
 const states=original.states?.length?original.states.map(s=>s[0]):[''];
 for(const [bodyIndex,b]of bodies[original.who==='women'?'f':'m'].entries())for(const size of selected)for(const state of states){
  const item=structuredClone(original);item.tex={};item.sizesT=item.sizes;item.size=size;item.state=state;
  fit.UNDER=fit.UNDERZ=null;fit.BOT_YW=0;fit.PEND=[];fit.PENDZ=[];
  const start=performance.now();let row={id:item.id,kind:item.kind,bodyIndex,body:b,size,state};
  try{const d=bodyDims(b);d.armA=armSpread([item],d);const job=drapePrepare(item,d);if(!job)throw Error('No pattern');const g=job.run();
   const m=g.userData.measures;row={...row,qc:g.userData.qc,pattern:g.userData.pattern,measures:Object.fromEntries(Object.entries(m||{}).filter(([k,v])=>typeof v==='number')),note:fitNote(item,b),vertices:job.C.P.length/3,finite:g.children.filter(m=>m.geometry?.attributes.position).every(m=>[...m.geometry.attributes.position.array].every(Number.isFinite))};
   g.traverse(m=>m.geometry?.dispose());
  }catch(e){row.error=String(e.stack||e);}
  row.elapsed_ms=Math.round(performance.now()-start);rows.push(row);
 }
 fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify({schema_version:1,source_sha256,index_sha256:crypto.createHash('sha256').update(JSON.stringify(index)).digest('hex'),bodies,rows},null,2));
 console.log(original.id,rows.filter(r=>r.id===original.id).length,'cases');
}
console.log(JSON.stringify({items:index.length,cases:rows.length,errors:rows.filter(r=>r.error||!r.finite).length,qc_failures:rows.filter(r=>r.qc&&!r.qc.ok).length}));
