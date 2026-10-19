// Engineering screening limits, not measured textile mechanics or fit accuracy.
export const QUALITY_POLICY = Object.freeze({
 version: 'garment-quality-v2', seamGapM: .0005,
 coverage: {missingFraction: .005, largestPatchFraction: .001, localMissingFraction: .02, minPixels: 1000},
 silhouette: {mean: .08, worst: .15, sections: 32},
 sleeve: {missingEnclosureFraction: .05, measuredCuffErrorM: .02, estimatedCuffErrorM: .04},
 placement: {measuredHemErrorM: .025, estimatedHemErrorM: .04},
 strain: {
  knit: {extension: .25, overFraction: .01}, woven: {extension: .12, overFraction: .005},
  structured: {extension: .10, overFraction: .005},
  grossExtension: .50, compressionRatio: .45, compressedFraction: .25,
 },
});

export function qualityDecision(checks) {
 if(!checks.length)checks=[{code:'missing-checks',status:'review'}];
 if(checks.some(c=>!['pass','fail','review'].includes(c.status)))checks=[...checks,{code:'invalid-quality-check',status:'fail'}];
 const failures=checks.filter(c=>c.status==='fail'),review=checks.filter(c=>c.status==='review');
 return {policy:QUALITY_POLICY.version,status:failures.length?'rejected':review.length?'review':'passed',
  accepted:failures.length===0&&review.length===0,failures,review,checks};
}

export const failedQualityAudit=()=>qualityDecision([{code:'audit-error',status:'fail',why:'Автопроверка не завершена; качество не подтверждено'}]);

// A quick runtime screen has no independent full-body/three-view evidence.
export const runtimeQuality=local=>qualityDecision([...local.checks,{code:'full-case-audit',status:'review',why:'Полная проверка ракурсов и пересечений ещё не подтверждена'}]);

// Never use a numerical score to compensate for an individual failed check.
export function geometryAcceptance(garments) {
 const problems=[];
 if(!Array.isArray(garments)||!garments.length)return {accepted:false,problems:[{garment:null,message:'missing-garments'}]};
 garments.forEach((g,i)=>{
  const add=message=>problems.push({garment:i,message});
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  if(!g?.intersections||!g.seams||!g.boundary||!Array.isArray(g.boundary.loops)) {add('incomplete-geometry');return;}
  const nums=[g.intersections.intersectingTriangles,g.intersections.tested,g.seams.maxGap,g.boundary.nonmanifold,g.boundary.collapsed,g.expectedLoops];
  if(nums.some(v=>!finite(v)||v<0)||g.boundary.loops.some(l=>!finite(l.irregularVertices)||l.irregularVertices<0))add('invalid-geometry-report');
  if(g.finite!==true)add('unverified-finite-surface');
  if(!(g.intersections.tested>0))add('empty-surface-audit');
  if(g.intersections.intersectingTriangles>0)add('body-intersections');
  if(g.seams.maxGap>QUALITY_POLICY.seamGapM)add('open-seam');
  if(g.boundary.nonmanifold||g.boundary.collapsed)add('invalid-topology');
  if(g.boundary.loops.some(l=>l.irregularVertices))add('irregular-boundary');
  if(g.boundary.loops.length!==g.expectedLoops)add('unexpected-opening');
 });
 return {accepted:problems.length===0,problems};
}

export function caseAcceptance(result,{requireViews=true}={}) {
 const geometry=geometryAcceptance(result.geometry),checks=[];
 checks.push({code:'geometry',status:geometry.accepted?'pass':'fail',details:geometry.problems});
 if(result.items&&result.items.length!==(result.geometry||[]).length)checks.push({code:'incomplete-outfit',status:'fail'});
 for(const [i,g]of (result.geometry||[]).entries()){
  if(!g.quality?.checks?.length)checks.push({code:'missing-quality-audit',garment:i,status:'review'});
  else checks.push(...g.quality.checks.map(c=>({...c,garment:i})));
 }
 const views=result.views||[];
 if(requireViews){
  const labels=new Set(views.map(v=>v.view));
  for(const view of ['front','angle','back'])if(!labels.has(view))checks.push({code:'missing-view',view,status:'review'});
  for(const view of views){
   if(!Array.isArray(view.garments)||view.garments.length!==(result.geometry||[]).length){checks.push({code:'incomplete-view',view:view.view,status:'review'});continue;}
   for(const [i,garment]of view.garments.entries()){
   if(garment.id!==result.geometry[i].id){checks.push({code:'wrong-view-garment',view:view.view,garment:i,status:'fail'});continue;}
   if(garment.coverage?.status==='missing')checks.push({code:'missing-texture-coverage',view:view.view,garment:i,status:'review'});
   else if(garment.coverage){
    const c=garment.coverage,l=QUALITY_POLICY.coverage;
    if(![c.missingFraction,c.largestPatchFraction,c.interiorPixels].every(v=>Number.isFinite(v)&&v>=0)||!Array.isArray(c.regions)||c.regions.some(r=>!Number.isFinite(r.missingFraction)||r.missingFraction<0)){
     checks.push({code:'invalid-view-coverage',view:view.view,garment:i,status:'fail'});continue;}
    const fail=c.missingFraction>l.missingFraction||c.largestPatchFraction>l.largestPatchFraction||c.regions.some(r=>r.missingFraction>l.localMissingFraction);
    checks.push({code:'texture-coverage',view:view.view,garment:i,status:c.interiorPixels<l.minPixels?'review':fail?'fail':c.clipped?'review':'pass',metrics:c});
   }else checks.push({code:'missing-texture-coverage',view:view.view,garment:i,status:'review'});
   }
  }
 }
 if(result.animationRequested){
  const requested=result.requestedAnimationFrames||[];
  if(!requested.length)checks.push({code:'missing-animation-audit',status:'review'});
  for(const frame of requested)if(!(result.animationFrames||[]).some(f=>f.frame===frame))checks.push({code:'missing-animation-frame',frame,status:'review'});
 }
 for(const frame of result.animationFrames||[]){
  const decision=caseAcceptance({...frame,animationFrames:[]},{requireViews:false});
  checks.push(...decision.checks.map(c=>({...c,frame:frame.frame})));
 }
 return {...qualityDecision(checks),geometryAccepted:geometry.accepted};
}
