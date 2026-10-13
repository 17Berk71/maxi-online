// Metadata-only migration. Original photos and derived textures are never rewritten.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {legacyContract,validateDigitization} from '../../src/shop/fitting/digitization.js';
const root=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'tools/wardrobe/out'),write=process.argv.includes('--write');
const list=JSON.parse(fs.readFileSync(path.join(root,'index.json'))),report=[],pending=[];
for(const row of list){
  const file=path.join(root,row.id,'meta.json'),item=JSON.parse(fs.readFileSync(file));
  // Existing catalogue recipe documents this table as garment measurements.
  if(item.id==='tj-baggy')item.sizeMeasurementSource='catalog-garment';
  const views=Object.fromEntries(['front','back'].map(side=>[side,{asset:side+'.webp',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,item.files||item.id,side+'.webp'))).digest('hex'),source:'existing-processed-photo'}]));
  item.digitization ||= legacyContract(item,views);
  for(const s of item.sizes||[])s.estimated=item.digitization.sizes.find(r=>r.name===s.name)&&Object.values(item.digitization.sizes.find(r=>r.name===s.name).measurements).some(r=>r.estimated);
  const checks=validateDigitization(item);
  for(const side of ['front','back'])if(item.digitization.views?.[side]?.sha256!==views[side].sha256)checks.errors.push('stale-view-evidence:'+side);
  report.push({id:item.id,family:item.digitization.pattern.family,...checks,review:item.digitization.review});
  if(checks.errors.length)throw new Error(item.id+': '+checks.errors.join(', '));
  pending.push({file,item,row});
}
// Validate the entire batch before mutating any package.
if(write){for(const {file,item,row}of pending){fs.writeFileSync(file,JSON.stringify(item,null,1)+'\n');Object.assign(row,item);}fs.writeFileSync(path.join(root,'index.json'),JSON.stringify(list,null,1)+'\n');}
console.log(JSON.stringify({schema_version:1,write,items:list.length,rows:report},null,2));
