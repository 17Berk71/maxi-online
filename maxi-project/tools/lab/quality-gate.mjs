// Geometry acceptance is independent of the legacy aggregate QC score.
export function geometryAcceptance(garments) {
 const problems=[];
 if(!garments.length)problems.push({garment:null,message:'missing-garments'});
 garments.forEach((g,i)=>{
  const add=message=>problems.push({garment:i,message});
  if(g.intersections.intersectingTriangles)add('body-intersections');
  if(g.seams.maxGap>.0005)add('open-seam');
  if(g.boundary.nonmanifold||g.boundary.collapsed)add('invalid-topology');
  if(g.boundary.loops.some(l=>l.irregularVertices))add('irregular-boundary');
  if(g.expectedLoops!=null&&g.boundary.loops.length!==g.expectedLoops)add('unexpected-opening');
 });
 return {accepted:problems.length===0,problems};
}
