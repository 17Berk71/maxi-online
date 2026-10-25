import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';import assert from 'node:assert/strict';
import * as fs from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {prepareCandidate,activateCandidate as activate,rollbackCatalogue,indexHash,catalogueDiff} from '../feeds/catalog-workspace.mjs';
const activateCandidate=options=>activate({...options,expectedCandidateHash:JSON.parse(fs.readFileSync(join(options.candidate,'candidate.json'))).fingerprint});
const write=(path,value)=>{fs.mkdirSync(join(path,'..'),{recursive:true});fs.writeFileSync(path,typeof value==='string'?value:JSON.stringify(value));};
function fixture(t){const root=fs.mkdtempSync(join(tmpdir(),'maxi-catalog-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const source=join(root,'source'),target=join(root,'target');
 write(join(source,'index.json'),{demo:true,shops:{A:{file:'a.json',win:[{pic:'img/a.svg'}]}}});
 write(join(source,'a.json'),{depts:[{key:'test',items:[{id:'1',name:'One',price:null,pic:'img/a.svg'},{id:'2',name:'Two',price:12.5,pic:'img/a.svg'}]}]});
 write(join(source,'img/a.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
 return {root,source,target,candidate:n=>join(root,'candidate-'+n)};
}
function activeFeed(target){const index=JSON.parse(fs.readFileSync(join(target,'index.json')));return JSON.parse(fs.readFileSync(join(target,index.shops.A.file)));}
test('prepare is read-only for source; activation creates immutable assets and idempotent snapshots',t=>{
 const f=fixture(t),before=fs.readFileSync(join(f.source,'index.json'));
 const stage=prepareCandidate({source:f.source,candidate:f.candidate(1)});assert(stage.audit.technicalGatePassed);assert.deepEqual(fs.readFileSync(join(f.source,'index.json')),before);assert.equal(indexHash(f.target),'missing');
 const active=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'});assert.equal(active.revision,stage.fingerprint);assert.equal(active.previous,null);
 const feed=activeFeed(f.target);assert.equal(feed.demo,true);assert.match(feed.depts[0].items[0].pic,/^releases\/[a-f0-9]{64}\/img\/a.svg$/);assert(fs.existsSync(join(f.target,feed.depts[0].items[0].pic)));
 const repeated=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:active.indexHash});assert.equal(repeated.revision,active.revision);assert.equal(repeated.indexHash,active.indexHash);
});
test('hide preview, full withdrawal and rollback preserve both revisions and known price values',t=>{
 const f=fixture(t);prepareCandidate({source:f.source,candidate:f.candidate(1)});const a=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'});
 prepareCandidate({source:f.target,candidate:f.candidate(2),hide:{A:'*'}});
 const diff=catalogueDiff({current:f.target,candidate:f.candidate(2)});assert.deepEqual(diff.hidden.map(p=>p.id),['1','2']);assert.equal(diff.added.length,0);assert.equal(diff.changed.length,0);
 const b=activateCandidate({candidate:f.candidate(2),target:f.target,expectedIndexHash:a.indexHash});const feed=activeFeed(f.target);assert(feed.depts[0].items.every(p=>p.hidden));assert.equal(feed.catalogue_status,'withdrawn');
 assert.deepEqual(JSON.parse(fs.readFileSync(join(f.target,'index.json'))).shops.A.win,[]);
 const restored=rollbackCatalogue({target:f.target,revision:a.revision,expectedIndexHash:b.indexHash});assert.equal(restored.previous,b.revision);assert.equal(activeFeed(f.target).depts[0].items[0].hidden,undefined);assert.equal(activeFeed(f.target).depts[0].items[0].price,null);
 assert(fs.existsSync(join(f.target,'releases',b.revision,'index.json')));
});
test('legacy active files remain untouched and can be snapshotted for rollback',t=>{
 const f=fixture(t);fs.cpSync(f.source,f.target,{recursive:true});const raw=fs.readFileSync(join(f.target,'a.json'));
 prepareCandidate({source:f.source,candidate:f.candidate(1),hide:{A:['1']}});
 const a=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:indexHash(f.target)});assert(a.previous);assert.deepEqual(fs.readFileSync(join(f.target,'a.json')),raw);
 rollbackCatalogue({target:f.target,revision:a.previous,expectedIndexHash:a.indexHash});assert.equal(activeFeed(f.target).depts[0].items.some(p=>p.hidden),false);
});
test('tampered candidate, stale expected hash, missing asset and wrong hide ID cannot replace active index',t=>{
 const f=fixture(t);prepareCandidate({source:f.source,candidate:f.candidate(1)});const a=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'}),raw=fs.readFileSync(join(f.target,'index.json'));
 assert.throws(()=>activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'}),/changed/);
 write(join(f.candidate(1),'img/a.svg'),'tampered');assert.throws(()=>activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:a.indexHash}),/changed/);assert.deepEqual(fs.readFileSync(join(f.target,'index.json')),raw);
 assert.throws(()=>prepareCandidate({source:f.source,candidate:f.candidate(2),hide:{A:['unknown']}}),/Unknown product/);
 fs.unlinkSync(join(f.source,'img/a.svg'));assert.throws(()=>prepareCandidate({source:f.source,candidate:f.candidate(3)}));
});
test('invalid rights metadata fails activation even when someone edits the saved audit report',t=>{
 const f=fixture(t),index=JSON.parse(fs.readFileSync(join(f.source,'index.json')));index.demo=false;write(join(f.source,'index.json'),index);
 const stage=prepareCandidate({source:f.source,candidate:f.candidate(1)});assert.equal(stage.audit.technicalGatePassed,false);
 const record=JSON.parse(fs.readFileSync(join(f.candidate(1),'candidate.json')));record.audit.technicalGatePassed=true;write(join(f.candidate(1),'candidate.json'),record);
 assert.throws(()=>activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'}),/audit rejected/);assert.equal(indexHash(f.target),'missing');
});
test('rollback rejects corrupted revisions; competing locks refuse updates',t=>{
 const f=fixture(t);prepareCandidate({source:f.source,candidate:f.candidate(1)});const a=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'});
 fs.mkdirSync(join(f.target,'.catalog-lock'));assert.throws(()=>activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:a.indexHash}));fs.rmdirSync(join(f.target,'.catalog-lock'));
 const feed=activeFeed(f.target);write(join(f.target,feed.depts[0].items[0].pic),'corrupted');assert.throws(()=>rollbackCatalogue({target:f.target,revision:a.revision,expectedIndexHash:a.indexHash}),/modified/);assert.equal(indexHash(f.target),a.indexHash);
});
test('asset edits appear in preview and unsafe paths or symlink assets are rejected',t=>{
 const f=fixture(t);prepareCandidate({source:f.source,candidate:f.candidate(1)});activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'});
 write(join(f.source,'img/a.svg'),'changed pixels');prepareCandidate({source:f.source,candidate:f.candidate(2)});assert.deepEqual(catalogueDiff({current:f.target,candidate:f.candidate(2)}).assets.changed,['img/a.svg']);
 fs.unlinkSync(join(f.source,'img/a.svg'));fs.symlinkSync(join(f.target,'index.json'),join(f.source,'img/a.svg'));assert.throws(()=>prepareCandidate({source:f.source,candidate:f.candidate(3)}),/Symlink/);
});

test('activation is bound to the reviewed candidate fingerprint and requires an explicit target hash',t=>{
 const f=fixture(t),a=prepareCandidate({source:f.source,candidate:f.candidate(1)});
 assert.throws(()=>activate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing',expectedCandidateHash:'0'.repeat(64)}),/reviewed revision/);
 assert.throws(()=>activate({candidate:f.candidate(1),target:f.target,expectedCandidateHash:a.fingerprint}),/changed/);
 assert.equal(indexHash(f.target),'missing');
});

test('a filesystem failure while storing a revision leaves the active index intact',t=>{
 const f=fixture(t);fs.cpSync(f.source,f.target,{recursive:true});prepareCandidate({source:f.source,candidate:f.candidate(1),hide:{A:['1']}});
 const expected=indexHash(f.target),raw=fs.readFileSync(join(f.target,'index.json'));write(join(f.target,'releases'),'occupied path');
 assert.throws(()=>activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:expected}));
 assert.deepEqual(fs.readFileSync(join(f.target,'index.json')),raw);assert.equal(fs.existsSync(join(f.target,'.catalog-lock')),false);
});

test('CLI review -> inspect -> guarded activation works and rejects omitted revision arguments',t=>{
 const f=fixture(t),tool=fileURLToPath(new URL('../feeds/catalog-workspace.mjs',import.meta.url));
 const run=(...args)=>spawnSync(process.execPath,[tool,...args],{encoding:'utf8'});
 const prepared=run('prepare','--source',f.source,'--candidate',f.candidate(1));assert.equal(prepared.status,0,prepared.stderr);
 const revision=JSON.parse(prepared.stdout).fingerprint;
 const diff=run('diff','--candidate',f.candidate(1));assert.equal(JSON.parse(diff.stdout).added.length,2);
 const missing=run('activate','--candidate',f.candidate(1),'--target',f.target,'--expected','missing');assert.equal(missing.status,1);assert.match(missing.stderr,/Missing --revision/);assert.equal(indexHash(f.target),'missing');
 const activated=run('activate','--candidate',f.candidate(1),'--target',f.target,'--expected','missing','--revision',revision);assert.equal(activated.status,0,activated.stderr);
 assert.equal(JSON.parse(run('inspect','--target',f.target).stdout).indexHash,JSON.parse(activated.stdout).indexHash);
});

test('activation reevaluates current approval rather than trusting a previously passing candidate report',t=>{
 const f=fixture(t),stamp=new Date(Date.now()-60000).toISOString();
 write(join(f.source,'index.json'),{demo:false,shops:{A:{file:'a.json',win:[]}}});
 write(join(f.source,'a.json'),{depts:[{items:[{id:'1',name:'Synthetic reviewed contract',source_url:'https://merchant.example/1',original_image_url:'https://photos.example/1.jpg',last_checked_at:stamp}]}]});
 const manifest={stores:{A:{approved_for_publication:true,permission_reference:'synthetic test record only',reviewed_at:stamp,category:'clothing',allowed_source_hosts:['merchant.example'],allowed_image_hosts:['photos.example']}}};
 const prepared=prepareCandidate({source:f.source,candidate:f.candidate(1),manifest});assert.equal(prepared.audit.technicalGatePassed,true);
 manifest.stores.A.approved_for_publication=false;
 assert.throws(()=>activate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing',expectedCandidateHash:prepared.fingerprint,manifest}),/rights_review_missing/);assert.equal(indexHash(f.target),'missing');
});

test('hidden department withdrawal removes store count and window previews, with reversible diff',t=>{
 const f=fixture(t);
 prepareCandidate({source:f.source,candidate:f.candidate(1)});
 const first=activateCandidate({candidate:f.candidate(1),target:f.target,expectedIndexHash:'missing'});
 const sourceFeed=JSON.parse(fs.readFileSync(join(f.source,'a.json'),'utf8'));
 sourceFeed.depts[0].hidden='true';
 write(join(f.source,'a.json'),sourceFeed);
 const stage=prepareCandidate({source:f.source,candidate:f.candidate(2)});
 assert.equal(stage.audit.technicalGatePassed,true);
 const index=JSON.parse(fs.readFileSync(join(f.candidate(2),'index.json'),'utf8'));
 const candidateFeed=JSON.parse(fs.readFileSync(join(f.candidate(2),'a.json'),'utf8'));
 assert.equal(index.shops.A.n,0);
 assert.deepEqual(index.shops.A.win,[]);
 assert.equal(candidateFeed.catalogue_status,'withdrawn');
 assert.deepEqual(catalogueDiff({current:f.target,candidate:f.candidate(2)}).hidden.map(p=>p.id),['1','2']);
 const second=activateCandidate({candidate:f.candidate(2),target:f.target,expectedIndexHash:first.indexHash});
 assert.equal(activeFeed(f.target).catalogue_status,'withdrawn');
 rollbackCatalogue({target:f.target,revision:first.revision,expectedIndexHash:second.indexHash});
 assert.equal(activeFeed(f.target).depts[0].hidden,undefined);
});
