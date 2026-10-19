// Offscreen source-coverage passes. These measure visible projected area, not
// triangle counts, and keep opaque colour filling from hiding missing source.
import * as THREE from 'three';
import {coverageMetrics} from './quality-masks.js';
const sources=new Map();
function sourceImage(url){
 if(!url)return Promise.resolve(null);
 if(!sources.has(url))sources.set(url,new Promise(resolve=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;}));
 return sources.get(url);
}
export async function inspectViewCoverage(renderer,camera,g,{width=600,height=900}={}) {
 const parts=g.children.filter(m=>m.userData.cm),scene=new THREE.Scene(),target=new THREE.WebGLRenderTarget(width,height,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
 const materials=[],textures=[],missingSources=[],pixels=new Uint8Array(width*height*4),opaque=new Uint8Array(width*height),covered=new Uint8Array(width*height);
 g.updateWorldMatrix(true,true);
 try{
  for(const part of parts){
   const original=part.material,url=original.userData.photoSource,image=await sourceImage(url),map=original.map;
   if(!image)missingSources.push(part.userData.cm.mi);
   const texture=image?new THREE.Texture(image):null;
   if(texture){if(map){texture.wrapS=map.wrapS;texture.wrapT=map.wrapT;texture.repeat.copy(map.repeat);texture.offset.copy(map.offset);texture.center.copy(map.center);texture.rotation=map.rotation;texture.flipY=map.flipY;}
    texture.needsUpdate=true;texture.updateMatrix();textures.push(texture);}
   const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{source:{value:texture},hasSource:{value:!!texture},masked:{value:false},uvMatrix:{value:texture?.matrix||new THREE.Matrix3()}},
    vertexShader:'varying vec2 sourceUV; uniform mat3 uvMatrix; void main(){sourceUV=(uvMatrix*vec3(uv,1.)).xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 sourceUV; uniform sampler2D source; uniform bool hasSource; uniform bool masked; void main(){if(masked&&(!hasSource||texture2D(source,sourceUV).a<.5))discard;gl_FragColor=vec4(1.);}',toneMapped:false});
   const mesh=new THREE.Mesh(part.geometry,material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(part.matrixWorld);mesh.frustumCulled=false;scene.add(mesh);materials.push(material);
  }
  const oldTarget=renderer.getRenderTarget(),oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha(),autoClear=renderer.autoClear;
  const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  try{
   renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);renderer.setClearColor(0,1);renderer.autoClear=true;
   for(const [masked,out]of [[false,opaque],[true,covered]]){materials.forEach(m=>m.uniforms.masked.value=masked);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    for(let p=0;p<out.length;p++)out[p]=pixels[p*4]>127?1:0;}
  }finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldClear,oldAlpha);renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
  const coverage=coverageMetrics(opaque,covered,width,height);
  return {coverage:missingSources.length?{...coverage,status:'missing',missingSources}:coverage,
   scope:'isolated-garment-visible-source-alpha',note:'Does not certify colour, print semantics, or textile realism'};
 }finally{materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());target.dispose();}
}
