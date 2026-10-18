import {clothUpdate} from './cloth-mesh.js';
import {edgeUpdate} from './edges.js';
const ATTRS=['position','normal','color','wrk'];

// Exact prepared display frames for fixed-pose tees. This trades bounded CPU
// memory for cheap playback; the geometric finishing still runs once per frame.
export async function bakeClothFrames(g,A,alive=()=>true){
 if(!g.userData.resolveSurface||g.userData.cloth.C.collar||g.userData.cloth.C.lining||g.userData.decor?.length)return true;
 const meshes=g.children.filter(m=>m.userData.cm),snapshot=()=>meshes.map(mesh=>({attributes:ATTRS.map(name=>mesh.geometry.attributes[name]?.array.slice()||null),sphere:mesh.geometry.boundingSphere?.clone()})),saved=snapshot(),frames=[];
 const restore=frame=>meshes.forEach((mesh,i)=>{ATTRS.forEach((name,j)=>{if(frame[i].attributes[j]){mesh.geometry.attributes[name].array.set(frame[i].attributes[j]);mesh.geometry.attributes[name].needsUpdate=true;}});if(frame[i].sphere)mesh.geometry.boundingSphere=frame[i].sphere.clone();});
 try{const n=A.F.length/A.nf;for(let k=0;k<A.nf;k++){
  if(!alive())return false;clothUpdate(g,A.F.subarray(k*n,(k+1)*n));frames.push(snapshot());
  if(k%4===3)await new Promise(resolve=>setTimeout(resolve,0));
 }}finally{restore(saved);g.children.forEach(m=>{if(m.userData.edge)edgeUpdate(m);});}
 const bytes=frames.reduce((sum,frame)=>sum+frame.reduce((sum,m)=>sum+m.attributes.reduce((sum,a)=>sum+(a?.byteLength||0),0),0),0);
 g.userData.bakedClothFrames={meshes,frames,bytes};return true;
}

export function showClothFrame(g,k){
 const baked=g.userData.bakedClothFrames;
 if(!baked){const A=g.userData.anim,n=A.F.length/A.nf;clothUpdate(g,A.F.subarray(k*n,(k+1)*n));return;}
 const frame=baked.frames[k];
 baked.meshes.forEach((mesh,i)=>{ATTRS.forEach((name,j)=>{const values=frame[i].attributes[j];if(values){mesh.geometry.attributes[name].array.set(values);mesh.geometry.attributes[name].needsUpdate=true;}});if(frame[i].sphere)mesh.geometry.boundingSphere.copy(frame[i].sphere);});
 g.children.forEach(m=>{if(m.userData.edge)edgeUpdate(m);});
}
