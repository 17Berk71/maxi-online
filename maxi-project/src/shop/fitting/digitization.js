import {inferFamily, patternRecipe} from './families.js';
export const DIGITIZATION_VERSION=1;
const SOURCES=['user-tape','catalog-garment','photo-estimate','body-chart-derived'];
const WIDTHS=new Set(['chest','waist','hip','hem','legWidth','knee']);
export function measurement(value,key,source){return {value,unit:'cm',basis:WIDTHS.has(key)?'flat-width':'length',source,estimated:!['user-tape','catalog-garment'].includes(source)};}
// Conservative migration: legacy numeric fields keep working; explicit records carry their evidence.
export function legacyContract(item,views={}){
  const derived=(item.sizes||[]).some(s=>s.body)&&item.sizeMeasurementSource!=='catalog-garment';
  const measurements={};
  for(const [key,value]of Object.entries(item.shape?.cm||{}))if(typeof value==='number'&&key!=='legWidthAt'){
    const evidence=item.shape?.calibration?.measurements?.[key];
    const tape=evidence?.method==='user-tape'&&evidence.value_cm===value;
    measurements[key]=measurement(value,key,tape?'user-tape':'photo-estimate');
    if(key==='legWidth')measurements[key].at=item.shape.cm.legWidthAt;
  }
  for(const [key,value]of Object.entries(item.shape?.construction?.dimensions||{}))if(typeof value==='number'&&!measurements[key]){measurements[key]=measurement(value,key,'photo-estimate');measurements[key].uncertainty=item.shape.construction.uncertainty_cm?.[key];}
  const family=inferFamily(item), recipe=patternRecipe(item);
  return {version:1,pattern:{family,version:1,status:'prototype'},views,
    material:{preset:recipe.fabric||item.kind,source:'category-preset',measured:false},measurements,
    profiles:item.shape?.cm?.leg?{leg:{points:item.shape.cm.leg,unit:'cm',axis:'crotch-to-hem',source:'photo-estimate',estimated:true}}:{},
    sizes:(item.sizes||[]).map(s=>({name:s.name,body:s.body||null,measurements:Object.fromEntries(Object.entries(s.cm||{}).map(([k,v])=>[k,measurement(v,k,derived?'body-chart-derived':item.sizeMeasurementSource||'photo-estimate')]))})),
    review:{status:'needs-review',reasons:[...(!Object.keys(measurements).length?['missing-base-measurements']:[]),...(derived?['estimated-size-grading']:[]),...(recipe.review?['complex-construction']:[]),...(views.front?.sha256&&views.front.sha256===views.back?.sha256?['back-view-reused']:[]),'material-unmeasured']}};
}
export function validateDigitization(item){
  const d=item.digitization, errors=[],warnings=[];
  if(!d)return {errors:['missing-contract'],warnings};
  if(d.version!==1)errors.push('contract-version');
  const recipe=patternRecipe(item);if(!recipe.supported)errors.push(recipe.reason);
  if(d.pattern?.status!=='prototype'&&d.pattern?.status!=='verified')errors.push('pattern-status');
  if(!d.material||typeof d.material.measured!=='boolean')errors.push('material-provenance');
  if(!d.material?.measured)warnings.push('material-unmeasured');
  const names=new Set();
  const check=(records,label)=>{for(const [key,r]of Object.entries(records||{})){
    if(!Number.isFinite(r.value)||r.value<=0||r.value>400)errors.push(label+':'+key+':value');
    if(r.unit!=='cm'||r.basis!==(WIDTHS.has(key)?'flat-width':'length'))errors.push(label+':'+key+':unit-basis');
    if(!SOURCES.includes(r.source)||r.estimated!==!['user-tape','catalog-garment'].includes(r.source))errors.push(label+':'+key+':provenance');
    if(r.at!=null&&(!Number.isFinite(r.at)||r.at<0||r.at>1))errors.push(label+':'+key+':location');
  }};
  check(d.measurements,'base');
  for(const [key,r]of Object.entries(d.measurements||{}))if(item.shape?.cm?.[key]!=null&&item.shape.cm[key]!==r.value)errors.push('base:'+key+':legacy-mismatch');
  for(const s of d.sizes||[]){if(!s.name||names.has(s.name))errors.push('duplicate-or-empty-size');names.add(s.name);check(s.measurements,'size:'+s.name);
    for(const range of Object.values(s.body||{}))if(!Array.isArray(range)||range.length!==2||!range.every(Number.isFinite)||range[0]<=0||range[1]<range[0])errors.push('body-range:'+s.name);
  }
  for(const side of ['front','back'])if(!/^[a-f0-9]{64}$/.test(d.views?.[side]?.sha256||''))warnings.push('missing-view-evidence:'+side);
  if(d.views?.front?.sha256&&d.views.front.sha256===d.views.back?.sha256)warnings.push('back-view-reused');
  if(recipe.review)warnings.push('complex-construction');
  if((d.sizes||[]).some(s=>Object.values(s.measurements||{}).some(r=>r.estimated)))warnings.push('estimated-size-grading');
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
