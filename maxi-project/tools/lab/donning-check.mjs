// Actual fitting engine, fixed animation frames and dimensions; output stays private.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {ROOT,WWW,browser} from './common.mjs';
const output=path.resolve(process.env.OUT||'tools/wardrobe/out/baselines/donning');
fs.mkdirSync(output,{recursive:true});
const env={...process.env};delete env.OUT;
execFileSync(process.execPath,['tools/lab/make.mjs'],{cwd:ROOT,env});
const server=http.createServer((req,res)=>{try{const p=path.resolve(WWW,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(WWW+path.sep)&&p!==WWW)throw Error('path');const f=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'image/webp');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await browser();const errors=[],rows=[];
try{const page=await b.newPage({viewport:{width:620,height:920},deviceScaleFactor:1});page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{localStorage.clear();window.__shadowMap=512;Object.assign(PREFS.body,{sex:'m',height:186,weight:82,chest:110,waist:82,hips:98,skin:0});await FIT.addPack('wardrobe/');FIT.open();});
 for(const animated of [false,true]){
  const result=await page.evaluate(async animated=>{FIT.setAnim(animated);FIT.replay();FIT.wear(['w-zolla-tee'],{});await FIT.ready();const frames=animated?FIT._frame(0):0;FIT.setRot(0);FIT.setZoom(.55,.77);return {frames,qc:FIT.qc('w-zolla-tee'),playing:FIT.playing()};},animated);
  if(animated&&!result.frames)throw Error('Animation was not recorded');
  for(const k of animated?[8,25,35]:[-1]){
   if(k>=0)await page.evaluate(k=>FIT._frame(k),k);await page.waitForTimeout(150);
   const name=(animated?'animation-'+k:'static')+'.png';await page.locator('#fitC').screenshot({path:path.join(output,name)});rows.push({animated,k,...result,shot:name});
  }
  if(animated){await page.evaluate(()=>FIT.setAnim(false));await page.waitForTimeout(150);if(await page.evaluate(()=>FIT.playing()))throw Error('Animation off did not settle');await page.locator('#fitC').screenshot({path:path.join(output,'settled.png')});}
  if(!animated&&process.env.ABLATE){
   await page.evaluate(()=>{FIT._avatar().traverse(m=>{const cm=m.userData.cm;if(!cm)return;const p=m.geometry.attributes.position,a=p.array,n=m.parent.userData.cloth.C.meshes[cm.mi].verts.length;cm.edges.forEach(([i,j],k)=>{for(let q=0;q<3;q++)a[(n+k)*3+q]=(a[i*3+q]+a[j*3+q])/2;});p.needsUpdate=true;});});
   await page.waitForTimeout(150);await page.locator('#fitC').screenshot({path:path.join(output,'linear.png')});
   await page.evaluate(()=>FIT._avatar().traverse(m=>{if(!m.userData.cm)return;m.material.map=null;m.material.color.set('#767676');m.material.needsUpdate=true;}));
   await page.waitForTimeout(150);await page.locator('#fitC').screenshot({path:path.join(output,'linear-solid.png')});
   await page.evaluate(()=>{FIT._avatar().children[0].children[0].visible=false;});
   await page.waitForTimeout(150);await page.locator('#fitC').screenshot({path:path.join(output,'no-body.png')});
   await page.evaluate(()=>{FIT._avatar().children[0].children[0].visible=true;FIT._avatar().traverse(m=>{if(m.userData.edge)m.visible=false;});});
   await page.waitForTimeout(150);await page.locator('#fitC').screenshot({path:path.join(output,'no-edge.png')});
   for(const part of ['sh','arm','torso']){
    await page.evaluate(part=>FIT._avatar().children[0].children[0].traverse(m=>{if(m.userData.part)m.visible=m.userData.part!==part;}),part);
    await page.waitForTimeout(150);await page.locator('#fitC').screenshot({path:path.join(output,'no-'+part+'.png')});
   }
  }
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({rows,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
 console.log(output);
}finally{await b.close();await new Promise(r=>server.close(r));}
