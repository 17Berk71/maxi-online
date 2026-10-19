// Actual fitting-room renders and independent displayed-surface audits. Outputs
// contain private photographs: QA_OUT and PACK_DIR must be private directories.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {geometryAcceptance,caseAcceptance} from './quality-gate.mjs';
import {bundle} from './esb.mjs';import {ROOT,browser} from './common.mjs';
const out=process.env.QA_OUT;if(!out)throw Error('QA_OUT required');fs.mkdirSync(out,{recursive:true});
const pack=path.resolve(process.env.PACK_DIR||path.join(ROOT,'tools/wardrobe/out'));
const www=path.join(out,'www');fs.mkdirSync(www,{recursive:true});
fs.copyFileSync(path.join(ROOT,'node_modules/three/build/three.min.js'),path.join(www,'three.min.js'));
if(!fs.existsSync(path.join(www,'wardrobe')))fs.symlinkSync(pack,path.join(www,'wardrobe'));
const js=await bundle(`import *as F from './shop/fitting.js';import{PREFS}from'./core/settings.js';import{R}from'./shop/fitting/room-scene.js';
import{inspectSurfaceSeams,inspectPatternBoundary}from'./shop/fitting/surface-weld.js';
import{inspectSurfaceIntersections}from'../tools/lab/surface-intersections.mjs';
import{inspectViewCoverage}from'./shop/fitting/quality-view.js';
import{showClothFrame}from'./shop/fitting/cloth-frames.js';
window.PREFS=PREFS;window.FIT=F.createFitting({fmtPrice:x=>x+'',thumb:p=>p.pic||'',siteOf:()=>'',coarse:false,catalogOf:()=>[]});
window.familyFrameNumber=()=>R.play?.k;window.familyReport=frame=>R.rig.children.filter(g=>g.userData.cloth).map(g=>{const b=inspectPatternBoundary(g);return {id:g.userData.qualityContext.item.id,quality:g.userData.auditQuality(frame),finite:g.children.filter(m=>m.userData.cm).every(m=>m.geometry.attributes.position.array.every(Number.isFinite)),pattern:g.userData.pattern,expectedLoops:g.userData.pattern.expectedOpenings,seams:inspectSurfaceSeams(g),boundary:{loops:b.loops.map(l=>({vertices:l.count,irregularVertices:l.degree})),collapsed:b.collapsed,nonmanifold:b.nonmanifold},intersections:inspectSurfaceIntersections(g,R.d,{fullBody:true})};});
window.familyViewReport=async()=>{const garments=[];for(const g of R.rig.children.filter(g=>g.userData.cloth))garments.push({id:g.userData.qualityContext.item.id,...await inspectViewCoverage(R.renderer,R.cam,g)});return garments;};
window.familyAuditFrame=k=>{for(const g of R.rig.children.filter(g=>g.userData.anim))showClothFrame(g,k);return familyReport(k);};`,path.join(ROOT,'src'));
fs.writeFileSync(path.join(www,'index.html'),`<!doctype html><meta charset=utf-8><style>body{margin:0}#fitC{width:600px;height:900px;display:block}.hid{display:none}</style><div id=fitting><canvas id=fitC></canvas><div class=hid><b id=fitShop></b><button id=fitX></button><div id=fitTabs></div><div id=fitViews></div><div id=fitBody></div></div></div><script src="three.min.js"></script><script>${js.replace(/<\/script/gi,'<\\/script')}</script>`);
const m={sex:'m',height:176,weight:74,chest:96,waist:78,hips:98,model:'makehuman'},f={sex:'f',height:173,weight:56,chest:82,waist:62,hips:92,model:'makehuman'};
const defaults=[{id:'knit-polo',items:['knit-polo'],body:m},{id:'ami-zip',items:['ami-zip'],body:m},{id:'blazer',items:['blazer'],body:f},{id:'skirt',items:['rib-long','sk-pleat'],body:f},{id:'dr-marsala',items:['dr-marsala'],body:f},{id:'glo-tee',items:['glo-tee'],body:m}];
const requestedCases=process.env.CASES?JSON.parse(process.env.CASES):defaults;
const cases=requestedCases.flatMap(c=>c.variants?.length?c.variants.map(v=>({...c,...v,id:c.id+'-'+v.label,body:{...c.body,...v.body},states:{...c.states,...v.states},sizes:{...c.sizes,...v.sizes},variants:undefined})):c);
if(!cases.length||new Set(cases.map(c=>c.id)).size!==cases.length)throw Error('Cases must be nonempty with unique ids');
const server=http.createServer((req,res)=>{try{const p=path.resolve(www,'.'+new URL(req.url,'http://local').pathname);if(p!==www&&!p.startsWith(www+path.sep))throw Error('path');const file=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'image/webp');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let b;let rejected=0;
try{b=await browser();for(const c of cases){console.log('START',c.id);const errors=[],page=await b.newPage({viewport:{width:600,height:900},deviceScaleFactor:1});page.setDefaultTimeout(240000);page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.__shadowMap=512;window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),200);window.cancelAnimationFrame=clearTimeout;});
await page.goto('http://127.0.0.1:'+server.address().port+'/');
const result=await page.evaluate(async c=>{localStorage.clear();Object.assign(PREFS.body,c.body);FIT.setAnim(!!c.animation);await FIT.addPack('wardrobe/');for(const id of c.items){const item=FIT.items.find(i=>i.id==='w-'+id);if(!item)throw Error('Unknown garment '+id);const size=c.sizes?.['w-'+id];if(size&&!item.sizesT?.some(s=>s.name===size))throw Error('Unknown garment size '+id+': '+size);}FIT.wear(c.items.map(id=>'w-'+id),c.states||{},c.sizes||{});FIT.open();const start=performance.now();await FIT.ready();if(c.items.some(id=>!FIT.qc('w-'+id)))throw Error('Incomplete outfit');
const full=c.items.some(id=>['dr-marsala','sk-pleat','barrel-jeans'].includes(id));FIT.setZoom(full?.82:.58,full?.56:.73);
const diagnostics=familyReport();return {body:c.body,items:c.items,states:c.states||{},sizes:c.sizes||{},fitMs:performance.now()-start,qc:Object.fromEntries(c.items.map(id=>[id,FIT.qc('w-'+id)])),geometry:diagnostics,qualityMessages:Array.from(document.querySelectorAll('[data-qc]')).filter(e=>!e.hidden).map(e=>e.textContent),animationRequested:!!c.animation,frames:c.animation?FIT._frame(35):0};},c);
await page.waitForTimeout(400);
result.views=[];for(const [label,angle]of [['front',0],['angle',.85],['back',Math.PI]]){await page.evaluate(a=>FIT.setRot(a),angle);await page.waitForTimeout(300);await page.locator('#fitC').screenshot({path:path.join(out,c.id+'-'+label+'.png'),timeout:90000});result.views.push({view:label,angle,garments:await page.evaluate(()=>familyViewReport())});}
if(c.animation){
 const requested=process.env.QA_ALL_FRAMES==='1'?Array.from({length:result.frames},(_,i)=>i):(c.auditFrames||[10,25,35]);
 result.requestedAnimationFrames=requested;result.animationFrames=[];
 for(const frame of requested){if(!Number.isInteger(frame)||frame<0||frame>=result.frames)throw Error('Requested animation frame unavailable: '+frame);
  result.animationFrames.push({frame,geometry:await page.evaluate(k=>familyAuditFrame(k),frame)});}
 await page.evaluate(()=>FIT.setAnim(false));await page.waitForFunction(()=>!FIT.playing());
}
if(errors.length)throw Error(errors.join('\n'));result.geometryAcceptance=geometryAcceptance(result.geometry);result.acceptance=caseAcceptance(result);if(!result.acceptance.accepted)rejected++;fs.writeFileSync(path.join(out,c.id+'.json'),JSON.stringify(result,null,2));console.log('DONE',c.id,JSON.stringify(result.geometry.map(g=>({nonmanifold:g.boundary.nonmanifold,seamGapMm:g.seams.maxGap*1000,crossings:g.intersections.intersectingTriangles,status:g.quality.status,failures:g.quality.failures.map(c=>c.code)}))));await page.close();}}
finally{if(b)await b.close();server.close();}

if(process.env.QA_STRICT==='1'&&rejected)throw Error(rejected+' garment cases did not pass strict quality acceptance');
