// Local-only catalogue preparation/activation. No network calls and no deployment.
import * as fs from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {feedPath,isHidden} from '../../src/shop/catalog-feed.js';
import {auditCatalogue} from './audit-catalog.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const json=value=>Buffer.from(JSON.stringify(stable(value),null,2)+'\n');
const readJSON=path=>JSON.parse(fs.readFileSync(path,'utf8'));
function local(root,path){
 if(!feedPath(path))throw Error('Unsafe catalogue path: '+path);
 const absolute=resolve(root,path);if(!absolute.startsWith(resolve(root)+sep))throw Error('Path escapes catalogue');
 let current=resolve(root);
 for(const part of path.split('/')){current=join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Symlink is not a catalogue asset: '+path);}
 return absolute;
}
function rootPath(path){const root=resolve(path);if(fs.existsSync(root)&&fs.lstatSync(root).isSymbolicLink())throw Error('Catalogue root cannot be a symlink');return root;}
const canonicalPath=path=>path.replace(/^(?:releases\/[a-f0-9]{64}\/)+/,'');
function capture(root,{hide={},indexOverride=null}={}){
 root=rootPath(root);const index=structuredClone(indexOverride||readJSON(local(root,'index.json'))),files=new Map(),feeds=Object.create(null);
 delete index.catalogue_release;
 if(!index.shops||typeof index.shops!=='object'||Array.isArray(index.shops))throw Error('Invalid catalogue index');
 for(const name of Object.keys(hide))if(!Object.hasOwn(index.shops,name))throw Error('Unknown store in hide list: '+name);
 function put(path,bytes){if(['candidate.json','revision.json'].includes(path))throw Error('Reserved catalogue filename: '+path);if(files.has(path)&&!files.get(path).equals(bytes))throw Error('Conflicting catalogue paths: '+path);files.set(path,bytes);return path;}
 function asset(path){
  const source=local(root,path),dest=canonicalPath(path),stat=fs.lstatSync(source);
  if(stat.isDirectory()){
   for(const entry of fs.readdirSync(source))asset(path.replace(/\/$/,'')+'/'+entry);
  }else if(stat.isFile())put(dest,fs.readFileSync(source));else throw Error('Unsupported asset: '+path);
  return dest;
 }
 for(const [name,entry] of Object.entries(index.shops)){
  if(!entry||typeof entry.file!=='string')throw Error('Invalid store entry: '+name);
  const feed=readJSON(local(root,entry.file));if(!Array.isArray(feed.depts)||feed.depts.some(d=>!d||!Array.isArray(d.items)))throw Error('Invalid departments: '+name);
  feed.demo=!!(index.demo||feed.demo);
  const policy=hide[name],all=feed.depts.flatMap(d=>d.items);
  if(policy!==undefined&&policy!=='*'&&(!Array.isArray(policy)||policy.some(id=>typeof id!=='string')))throw Error('Invalid hide list: '+name);
  if(Array.isArray(policy))for(const id of policy)if(!all.some(p=>p?.id===id))throw Error('Unknown product in hide list: '+name+'/'+id);
  for(const item of all){
   if(!item||typeof item!=='object')throw Error('Invalid product: '+name);
   if(policy==='*'||Array.isArray(policy)&&policy.includes(item.id))item.hidden=true;
   if(item.pic)item.pic=asset(item.pic);
   if(item.fit)item.fit=asset(item.fit);
  }
  const visible=feed.depts.flatMap(d=>isHidden(d)?[]:d.items).filter(p=>!isHidden(p));
  if(!visible.length&&all.length)feed.catalogue_status='withdrawn';
  if(visible.length&&feed.catalogue_status==='withdrawn')throw Error('Withdrawn catalogue contains visible products: '+name);
  entry.n=visible.length;
  // Existing window entries lack product IDs: suppress them conservatively after any withdrawal.
  entry.win=feed.depts.some(isHidden)||all.some(isHidden)?[]:(entry.win||[]).map(w=>({...w,pic:asset(w.pic)}));
  const file=canonicalPath(entry.file);entry.file=file;feeds[file]=feed;put(file,json(feed));
 }
 put('index.json',json(index));
 const fingerprints=Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>[name,hash(bytes)]));
 return {index,feeds,files,fingerprint:hash(json(fingerprints)),fingerprints};
}
function review(graph,manifest,requireReal=false){const audit=auditCatalogue(graph.index,graph.feeds,manifest,{requireReal});if(!audit.technicalGatePassed)throw Error('Catalogue audit rejected: '+JSON.stringify(audit.issues));return audit;}
function writeFiles(dir,files){for(const [name,bytes] of files){const path=local(dir,name);fs.mkdirSync(resolve(path,'..'),{recursive:true});fs.writeFileSync(path,bytes,{flag:'wx'});}}
export function prepareCandidate({source,candidate,hide={},manifest={},requireReal=false}){
 const from=rootPath(source),out=rootPath(candidate);if(out===from||out.startsWith(from+sep)||from.startsWith(out+sep))throw Error('Candidate must be separate from source');
 if(fs.existsSync(out))throw Error('Candidate directory already exists');
 const graph=capture(from,{hide}),audit=auditCatalogue(graph.index,graph.feeds,manifest,{requireReal});
 fs.mkdirSync(out,{recursive:true});writeFiles(out,graph.files);
 fs.writeFileSync(join(out,'candidate.json'),json({version:1,fingerprint:graph.fingerprint,files:graph.fingerprints,audit}));
 return {fingerprint:graph.fingerprint,audit};
}
function candidateGraph(candidate){
 const root=rootPath(candidate),record=readJSON(local(root,'candidate.json')),graph=capture(root);
 if(record.version!==1||record.fingerprint!==graph.fingerprint||JSON.stringify(stable(record.files))!==JSON.stringify(stable(graph.fingerprints)))throw Error('Candidate changed after preparation');
 return graph;
}
export function indexHash(target){const path=local(rootPath(target),'index.json');return fs.existsSync(path)?hash(fs.readFileSync(path)):'missing';}
function materialize(graph,target){
 const id=graph.fingerprint,relative='releases/'+id,dir=local(target,relative),output=new Map(graph.files),index=structuredClone(graph.index);
 index.catalogue_release=id;
 for(const entry of Object.values(index.shops)){
  const feed=structuredClone(graph.feeds[entry.file]);
  for(const d of feed.depts)for(const item of d.items){if(item.pic)item.pic=relative+'/'+item.pic;if(item.fit)item.fit=relative+'/'+item.fit;}
  output.set(entry.file,json(feed));entry.file=relative+'/'+entry.file;entry.win=(entry.win||[]).map(w=>({...w,pic:relative+'/'+w.pic}));
 }
 output.set('index.json',json(index));
 const records=Object.fromEntries([...output].map(([path,bytes])=>[path,hash(bytes)]));
 if(fs.existsSync(dir)){
  for(const [path,digest] of Object.entries(records))if(hash(fs.readFileSync(local(dir,path)))!==digest)throw Error('Stored revision was modified');
 }else{
  fs.mkdirSync(local(target,'releases'),{recursive:true});const temporary=local(target,'releases/.tmp-'+randomUUID());fs.mkdirSync(temporary);
  try{writeFiles(temporary,output);fs.writeFileSync(join(temporary,'revision.json'),json({version:1,id,files:records}));fs.renameSync(temporary,dir);}finally{if(fs.existsSync(temporary))fs.rmSync(temporary,{recursive:true});}
 }
 return {id,index,bytes:output.get('index.json')};
}
function lock(target,expected,fn){
 target=rootPath(target);fs.mkdirSync(target,{recursive:true});const path=local(target,'.catalog-lock');fs.mkdirSync(path);
 try{if(indexHash(target)!==expected)throw Error('Active catalogue changed; inspect the current index hash');return fn(target);}finally{fs.rmdirSync(path);}
}
function switchIndex(target,bytes,expected){
 if(indexHash(target)!==expected)throw Error('Active catalogue changed during activation');
 const temporary=local(target,'.index-'+randomUUID()+'.tmp');fs.writeFileSync(temporary,bytes,{flag:'wx'});
 try{fs.renameSync(temporary,join(target,'index.json'));}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
export function activateCandidate({candidate,target,expectedIndexHash,expectedCandidateHash,manifest={},requireReal=false}){
 const graph=candidateGraph(candidate);if(graph.fingerprint!==expectedCandidateHash)throw Error('Candidate fingerprint differs from the reviewed revision');review(graph,manifest,requireReal);
 const candidatePath=rootPath(candidate),targetPath=rootPath(target);
 if(candidatePath===targetPath||candidatePath.startsWith(targetPath+sep)||targetPath.startsWith(candidatePath+sep))throw Error('Candidate and target must be separate');
 return lock(targetPath,expectedIndexHash,root=>{
  const previous=expectedIndexHash==='missing'?null:materialize(capture(root),root).id;
  const next=materialize(graph,root);switchIndex(root,next.bytes,expectedIndexHash);
  return {revision:next.id,previous,indexHash:indexHash(root)};
 });
}
export function rollbackCatalogue({target,revision,expectedIndexHash,manifest={},requireReal=false}){
 if(!/^[a-f0-9]{64}$/.test(revision))throw Error('Invalid revision');
 return lock(target,expectedIndexHash,root=>{
  const dir=local(root,'releases/'+revision),record=readJSON(local(dir,'revision.json'));
  if(record.version!==1||record.id!==revision)throw Error('Invalid revision record');
  for(const [path,digest] of Object.entries(record.files))if(hash(fs.readFileSync(local(dir,path)))!==digest)throw Error('Stored revision was modified');
  const index=readJSON(local(dir,'index.json')),graph=capture(root,{indexOverride:index});
  if(graph.fingerprint!==revision)throw Error('Revision fingerprint mismatch');review(graph,manifest,requireReal);
  const previous=expectedIndexHash==='missing'?null:materialize(capture(root),root).id;
  switchIndex(root,fs.readFileSync(local(dir,'index.json')),expectedIndexHash);return {revision,previous,indexHash:indexHash(root)};
 });
}
export function catalogueDiff({current,candidate}){
 const before=current?capture(rootPath(current)):null,after=candidateGraph(candidate),records=graph=>new Map(Object.entries(graph?.feeds||{}).flatMap(([file,feed])=>{
  const store=Object.entries(graph.index.shops).find(([,entry])=>entry.file===file)[0];return feed.depts.flatMap(d=>d.items.map(p=>[JSON.stringify([store,p.id]),{store,id:p.id,title:p.name,record:p,hidden:isHidden(d)||isHidden(p)}]));
 }));
 const old=records(before),next=records(after),diff={added:[],removed:[],changed:[],hidden:[],restored:[],unchanged:0,assets:{added:[],removed:[],changed:[]}};
 const assetNames=graph=>[...(graph?.files.keys()||[])].filter(name=>name!=='index.json'&&!Object.hasOwn(graph.feeds,name));
 for(const name of new Set([...assetNames(before),...assetNames(after)])){
  const a=before?.files.get(name),b=after.files.get(name);
  if(!a)diff.assets.added.push(name);else if(!b)diff.assets.removed.push(name);else if(!a.equals(b))diff.assets.changed.push(name);
 }
 for(const key of new Set([...old.keys(),...next.keys()])){
  const a=old.get(key),b=next.get(key),entry=b||a,summary={store:entry.store,id:entry.id,title:entry.title};
  if(!a)diff.added.push(summary);else if(!b)diff.removed.push(summary);
  else if(!a.hidden&&b.hidden)diff.hidden.push(summary);
  else if(a.hidden&&!b.hidden)diff.restored.push(summary);
  else if(!json(a.record).equals(json(b.record)))diff.changed.push(summary);else diff.unchanged++;
 }
 return diff;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [command,...args]=process.argv.slice(2),option=(flag,required=true)=>{const n=args.indexOf(flag);if(n<0||!args[n+1]||args[n+1].startsWith('--')){if(required)throw Error('Missing '+flag);return null;}return args[n+1];};
  const manifestPath=option('--manifest',false),manifest=manifestPath?readJSON(manifestPath):{},requireReal=args.includes('--require-real');let result;
  if(command==='prepare'){const hidePath=option('--hide',false);result=prepareCandidate({source:option('--source'),candidate:option('--candidate'),hide:hidePath?readJSON(hidePath):{},manifest,requireReal});if(!result.audit.technicalGatePassed)process.exitCode=1;}
  else if(command==='diff')result=catalogueDiff({current:option('--current',false),candidate:option('--candidate')});
  else if(command==='inspect')result={indexHash:indexHash(option('--target'))};
  else if(command==='activate')result=activateCandidate({candidate:option('--candidate'),target:option('--target'),expectedIndexHash:option('--expected'),expectedCandidateHash:option('--revision'),manifest,requireReal});
  else if(command==='rollback')result=rollbackCatalogue({target:option('--target'),revision:option('--revision'),expectedIndexHash:option('--expected'),manifest,requireReal});
  else throw Error('Use prepare, diff, inspect, activate or rollback');
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
