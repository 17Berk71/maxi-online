// Render actual before/after body meshes at identical cameras; no generated imagery.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,browser} from './common.mjs';
import {bundle} from './esb.mjs';
const [beforeSource,output]=process.argv.slice(2);
if(!beforeSource||!output)throw Error('Expected BEFORE_SRC OUTPUT');
fs.mkdirSync(output,{recursive:true});
const three=fs.readFileSync(path.join(ROOT,'node_modules/three/build/three.min.js'),'utf8');
const bodies=[{sex:'m',height:186,weight:82,chest:110,waist:82,hips:98},{sex:'m',height:160,weight:100,chest:130,waist:105,hips:110},{sex:'m',height:205,weight:80,chest:95,waist:75,hips:95}];
const b=await browser();
try{
 for(const [version,source]of[['before',beforeSource],['after',path.join(ROOT,'src')]]){
  const js=await bundle(`import {buildBody} from './shop/fitting/mannequin.js';window.buildBody=buildBody;`,path.resolve(source));
  const p=await b.newPage({viewport:{width:1100,height:760},deviceScaleFactor:1});
  await p.setContent('<html><body style="margin:0;background:#d6d1c9"><canvas></canvas></body></html>');
  await p.addScriptTag({content:three});await p.addScriptTag({content:js});
  await p.evaluate(bodies=>{
   const scene=new THREE.Scene();scene.background=new THREE.Color('#d6d1c9');
   const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1100,760);renderer.setPixelRatio(1);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;
   const camera=new THREE.OrthographicCamera(-1.55,1.55,1.1,-1.1,.1,20);camera.position.set(0,1.1,5);camera.lookAt(0,1.1,0);
   scene.add(new THREE.HemisphereLight(0xffffff,0x6c6760,1));const light=new THREE.DirectionalLight(0xffffff,.7);light.position.set(-2,4,4);scene.add(light);
   bodies.forEach((body,i)=>{const {g}=buildBody(body,new THREE.MeshStandardMaterial({color:0xf4f1e9,roughness:.7}));g.position.x=(i-1)*1.05;scene.add(g);});
   renderer.render(scene,camera);window.renderClose=()=>{camera.left=-1.55;camera.right=1.55;camera.top=.55;camera.bottom=-.55;camera.position.y=1.55;camera.lookAt(0,1.55,0);camera.updateProjectionMatrix();renderer.render(scene,camera);};
  },bodies);
  await p.locator('canvas').screenshot({path:path.join(output,version+'.png')});
  await p.evaluate(()=>renderClose());await p.locator('canvas').screenshot({path:path.join(output,version+'-shoulders.png')});await p.close();
 }
 fs.writeFileSync(path.join(output,'bodies.json'),JSON.stringify(bodies,null,2));
}finally{await b.close();}
