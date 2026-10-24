// Offline publication gate. Validates evidence records, never authenticates contracts or live stock.
import {catalogEvidence,AVAILABILITY} from '../../src/shop/catalog-evidence.js';
import {feedPath} from '../../src/shop/catalog-feed.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function auditCatalogue(index,feeds,manifest={}, {now=Date.now(),requireReal=false}={}){
 const issues=[],stores=[];const report=(code,store,item=null)=>issues.push({code,store,item});
 if(!index?.shops||typeof index.shops!=='object'||Array.isArray(index.shops))report('catalogue_index_invalid',null);
 for(const [name,entry] of Object.entries(index?.shops||{})){
  if(!entry||!feedPath(entry.file)){report('unsafe_feed_path',name);continue;}
  const feed=feeds[entry.file];if(!feed||!Array.isArray(feed.depts)){report('feed_unreadable',name);continue;}
  const demo=!!(index.demo||feed.demo),approval=manifest?.stores?.[name];
  const category=typeof approval?.category==='string'&&approval.category.trim()?approval.category.trim():null;
  const isoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;
  const products=feed.depts.flatMap(d=>Array.isArray(d?.items)?d.items:[]).filter(p=>p?.hidden!==true);
  const summary={name,demo,category,products:products.length};stores.push(summary);
  if(!products.length)report('empty_catalogue',name);
  if(!demo){
   const stamp=isoDate(approval?.reviewed_at);
   if(approval?.approved_for_publication!==true||typeof approval?.permission_reference!=='string'||!approval.permission_reference.trim()||!Number.isFinite(stamp)||stamp>now)report('rights_review_missing',name);
   if(!category)report('store_category_missing',name);
   if(approval&&Object.hasOwn(approval,'expires_at')&&approval.expires_at!==null && !(isoDate(approval.expires_at)>now))report('rights_review_expired',name);
  }
  const ids=new Set();
  for(const product of products){
   if(!product||typeof product.id!=='string'||!product.id||typeof product.name!=='string'||!product.name.trim()){report('product_identity_missing',name,product?.id);continue;}
   if(ids.has(product.id))report('duplicate_product_id',name,product.id);ids.add(product.id);
   if(product.price!==null&&product.price!==undefined&&(typeof product.price!=='number'||!Number.isFinite(product.price)||product.price<0))report('invalid_price',name,product.id);
   if(demo)continue;
   const evidence=catalogEvidence(product,feed,now);
   if(!evidence.sourceUrl)report('product_source_missing',name,product.id);
   if(!evidence.originalImage)report('original_photo_missing',name,product.id);
   if(!evidence.lastCheckedAt)report('catalogue_check_date_missing',name,product.id);
   for(const [url,hosts,code] of [[evidence.sourceUrl,approval?.allowed_source_hosts,'source_host_not_reviewed'],[evidence.originalImage,approval?.allowed_image_hosts,'image_host_not_reviewed']]){
    if(url&&(!Array.isArray(hosts)||!hosts.includes(new URL(url).hostname)))report(code,name,product.id);
   }
   if([AVAILABILITY.IN_STOCK,AVAILABILITY.OUT_OF_STOCK].includes(product.availability_status)&&evidence.availability.status===AVAILABILITY.UNKNOWN)report('unsupported_inventory_claim',name,product.id);
  }
 }
 if(!stores.length)report('no_catalogue_stores',null);
 const real=stores.filter(s=>!s.demo),categories=new Set(real.map(s=>s.category).filter(Boolean));
 if(requireReal&&(real.length<2||categories.size<2))report('real_multicategory_pilot_missing',null);
 return {technicalGatePassed:issues.length===0,checkedAt:new Date(now).toISOString(),mode:requireReal?'real-pilot':'fixture-audit',
  limitations:['Offline validation only; source URLs, contracts, image identity and live stock need human/network verification.','No source freshness TTL is assumed; a recorded check date does not establish current availability.'],stores,issues};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),option=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
  const root=resolve(option('--root','public/feeds')),index=JSON.parse(readFileSync(resolve(root,'index.json'),'utf8')),feeds={};
  for(const entry of Object.values(index.shops||{}))if(entry&&feedPath(entry.file))try{feeds[entry.file]=JSON.parse(readFileSync(resolve(root,entry.file),'utf8'));}catch{}
  const manifestPath=option('--manifest',null),manifest=manifestPath?JSON.parse(readFileSync(manifestPath,'utf8')):{};
  const report=auditCatalogue(index,feeds,manifest,{requireReal:args.includes('--require-real')});
  const json=JSON.stringify(report,null,2)+'\n',out=option('--report',null);if(out)writeFileSync(out,json);else process.stdout.write(json);
  if(!report.technicalGatePassed)process.exitCode=1;
 }catch(error){console.error('Catalogue audit failed:',error.message);process.exitCode=1;}
}
