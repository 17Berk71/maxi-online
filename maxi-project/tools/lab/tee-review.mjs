// Private browser QA of the actual fitting room; no live deployment.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {execFileSync} from 'node:child_process';import {ROOT,WWW,browser} from './common.mjs';
const out=process.env.QA_OUT;if(!out)throw Error('QA_OUT required');fs.mkdirSync(out,{recursive:true});
execFileSync(process.execPath,['tools/lab/make.mjs'],{cwd:ROOT,env:process.env});
const server=http.createServer((req,res)=>{try{const p=path.resolve(WWW,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(WWW+path.sep)&&p!==WWW)throw Error('path');const f=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'image/webp');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let b;const errors=[];
try{b=await browser();const p=await b.newPage({viewport:{width:620,height:920},deviceScaleFactor:1});p.setDefaultTimeout(180000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log(m.text().slice(0,300));});
await p.addInitScript(()=>{window.__shadowMap=512;window.__keep=true;});
await p.goto('http://127.0.0.1:'+server.address().port+'/');console.log('loaded');
const result=await p.evaluate(async ({body,items,animated})=>{localStorage.clear();Object.assign(PREFS.body,body);await FIT.addPack('wardrobe/');FIT.setAnim(animated);FIT.open();const start=performance.now();FIT.wear(items.map(id=>'w-'+id),{});await FIT.ready();const frames=animated?FIT._frame(15):0;FIT.setRot(0);FIT.setZoom(.55,.77);if(items.some(id=>!FIT.qc('w-'+id)))throw Error('ready returned before the outfit was built');if(animated&&!frames)throw Error('No recorded playback frames');const prepared=[];FIT._avatar().traverse(g=>{if(g.userData.bakedClothFrames)prepared.push({frames:g.userData.bakedClothFrames.frames.length,bytes:g.userData.bakedClothFrames.bytes});});return {prepared,qc:Object.fromEntries(items.map(id=>[id,FIT.qc('w-'+id)])),body:PREFS.body,fitMs:performance.now()-start,frames};},{body:JSON.parse(process.env.BODY),items:(process.env.ITEMS||'zolla-tee').split(','),animated:process.env.QA_ANIMATION==='1'});console.log('fit ready',JSON.stringify(result));
for(const yaw of (process.env.VIEWS||'0,1.57,3.14').split(',').map(Number)){await p.evaluate(yaw=>FIT.setRot(yaw),yaw);await p.waitForTimeout(200);await p.locator('#fitC').screenshot({path:path.join(out,'view-'+yaw+'.png'),timeout:60000});console.log('shot',yaw);}
if(result.frames){for(const k of [10,25,35]){await p.evaluate(k=>{FIT.setRot(0);FIT._frame(k);},k);await p.waitForTimeout(100);await p.locator('#fitC').screenshot({path:path.join(out,'frame-'+k+'.png'),timeout:60000});console.log('frame',k);}await p.evaluate(()=>FIT.setAnim(false));await p.waitForFunction(()=>!FIT.playing(),{},{timeout:15000});}
if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
}finally{if(b)await b.close();await new Promise(r=>server.close(r));}
