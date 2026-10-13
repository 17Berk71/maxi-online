// Versioned construction recipes. Shared solvers remain prototypes, not manufacturer patterns.
export const PATTERN_FAMILIES = Object.freeze({
  'knit-top': {version:1, topology:'top', kinds:['tee','sweater'], fabric:null, flare:false, rib:true},
  'hooded-top': {version:1, topology:'top', kinds:['hoodie'], fabric:'hoodie', flare:false, rib:true, hood:true},
  'woven-trousers': {version:1, topology:'legs', kinds:['jeans','pants','shorts'], fabric:null},
  'elastic-trousers': {version:1, topology:'legs', kinds:['pants'], fabric:'pants', elastic:true},
  'plain-skirt': {version:1, topology:'skirt', kinds:['skirt'], fabric:'skirt', pleats:false},
  'pleated-skirt': {version:1, topology:'skirt', kinds:['skirt'], fabric:'skirtP', pleats:true, review:true},
  'puff-dress': {version:1, topology:'top', kinds:['dress'], fabric:'dress', flare:true, puff:true, review:true},
  'plain-dress': {version:1, topology:'top', kinds:['dress'], fabric:'dress', flare:true},
  'structured-outer': {version:1, topology:'top', kinds:['jacket','coat','puffer','shirt'], fabric:null, review:true},
});
export function inferFamily(item) {
  if(item.kind==='skirt')return item.pleats?'pleated-skirt':'plain-skirt';
  if(item.kind==='dress')return item.puff?'puff-dress':'plain-dress';
  if(item.kind==='hoodie')return 'hooded-top';
  if(['tee','sweater'].includes(item.kind))return 'knit-top';
  if(item.kind==='pants'&&item.shape?.elastic)return 'elastic-trousers';
  if(['jeans','pants','shorts'].includes(item.kind))return 'woven-trousers';
  if(['jacket','coat','puffer','shirt'].includes(item.kind))return 'structured-outer';
  return null;
}
export function patternRecipe(item) {
  const declared=item.digitization?.pattern, id=declared?.family||inferFamily(item), recipe=PATTERN_FAMILIES[id];
  if(!recipe)return {id, supported:false, reason:'unknown-family'};
  if(declared&&declared.version!==recipe.version)return {id,supported:false,reason:'pattern-version'};
  if(!recipe.kinds.includes(item.kind))return {id,supported:false,reason:'kind-family-mismatch'};
  // Contradictory features must go to review rather than silently losing construction.
  if((recipe.pleats===false&&item.pleats)||(id==='plain-dress'&&item.puff))return {id,supported:false,reason:'feature-family-mismatch'};
  return {...recipe,id,supported:true,flare:recipe.flare??item.kind==='coat',rib:recipe.rib&&(item.kind!=='tee')};
}
