// Real WebGL regression: source alpha coverage, arbitrary garment colour,
// missing inputs, and renderer-state restoration after offscreen passes.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {ROOT,browser} from './common.mjs';import {bundle} from './esb.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'maxi-quality-'));
const js=await bundle(`import *as THREE from 'three';import{inspectViewCoverage}from'./shop/fitting/quality-view.js';
window.check=async()=>{const canvas=document.createElement('canvas'),renderer=new THREE.WebGLRenderer({canvas}),cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);renderer.setSize(128,128);cam.position.z=2;cam.updateMatrixWorld();
const saved={colour:0x123456,alpha:.3};renderer.setClearColor(saved.colour,saved.alpha);renderer.setViewport(3,4,91,92);renderer.setScissor(1,2,70,80);renderer.setScissorTest(true);
const make=(colour,hole)=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle=colour;x.fillRect(0,0,64,64);if(hole)x.clearRect(24,24,16,16);const m=new THREE.MeshBasicMaterial({color:colour});m.userData.photoSource=c.toDataURL();const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),m);mesh.userData.cm={mi:0};const g=new THREE.Group();g.add(mesh);return g;};
const clean=await inspectViewCoverage(renderer,cam,make('#000000',false),{width:128,height:128}),hole=await inspectViewCoverage(renderer,cam,make('#ffffff',true),{width:128,height:128});
const absent=make('#000000',false);delete absent.children[0].material.userData.photoSource;const missing=await inspectViewCoverage(renderer,cam,absent,{width:128,height:128});
const state={colour:renderer.getClearColor(new THREE.Color()).getHex(),alpha:renderer.getClearAlpha(),target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()).toArray(),scissor:renderer.getScissor(new THREE.Vector4()).toArray(),test:renderer.getScissorTest()};renderer.dispose();return {clean,hole,missing,state};};`,path.join(ROOT,'src'));
fs.writeFileSync(path.join(dir,'index.html'),`<script src="three.js"></script><script>${js.replace(/<\/script/gi,'<\\/script')}</script>`);fs.copyFileSync(path.join(ROOT,'node_modules/three/build/three.min.js'),path.join(dir,'three.js'));
const server=http.createServer((req,res)=>{const p=req.url==='/three.js'?'three.js':'index.html';res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(path.join(dir,p)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let b;
try{b=await browser();const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);const q=await page.evaluate(()=>check());
 assert.equal(q.clean.coverage.missingPixels,0);assert.ok(q.hole.coverage.missingFraction>.04);assert.equal(q.hole.coverage.patches,1);assert.equal(q.missing.coverage.status,'missing');
 assert.deepEqual(q.state,{colour:0x123456,alpha:.3,target:null,viewport:[3,4,91,92],scissor:[1,2,70,80],test:true});assert.deepEqual(errors,[]);console.log('PASS real WebGL coverage, connected patch, missing source and renderer restoration');
}finally{if(b)await b.close();server.close();fs.rmSync(dir,{recursive:true,force:true});}
