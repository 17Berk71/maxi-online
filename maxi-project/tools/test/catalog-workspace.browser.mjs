// Serve real generated immutable revisions to the real quick catalogue, using synthetic imagery.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
import * as fs from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';
import {prepareCandidate,activateCandidate,rollbackCatalogue,catalogueDiff} from '../feeds/catalog-workspace.mjs';
const root=fs.mkdtempSync(join(tmpdir(),'maxi-workspace-browser-')),source=join(root,'source'),target=join(root,'target');
const write=(path,data)=>{fs.mkdirSync(resolve(path,'..'),{recursive:true});fs.writeFileSync(path,JSON.stringify(data));};
write(join(source,'index.json'),{demo:true,shops:{'Synthetic store':{file:'store.json',win:[]}}});
write(join(source,'store.json'),{demo:true,depts:[{title:'Test',items:[{id:'one',name:'Synthetic product',pic:'img/product.svg',price:null}]}]});
fs.mkdirSync(join(source,'img'));fs.copyFileSync('tools/test/fixtures/product.svg',join(source,'img/product.svg'));
const candidate=join(root,'candidate'),prepared=prepareCandidate({source,candidate});
let active=activateCandidate({candidate,target,expectedIndexHash:'missing',expectedCandidateHash:prepared.fingerprint});
const shot=async(page,name)=>{if(process.env.MAXI_SCREENSHOTS==='1'){fs.mkdirSync('docs/review-catalog-workspace',{recursive:true});await page.screenshot({path:'docs/review-catalog-workspace/'+name+'.png'});}};
const first=active.revision,browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/feeds/**',route=>{const relative=decodeURIComponent(new URL(route.request().url()).pathname.split('/feeds/')[1]);const path=resolve(target,relative);if(!path.startsWith(target+sep))throw Error('Fixture path escaped');return route.fulfill({path});});
  async function show(){await page.goto((process.env.MAXI_URL||'http://127.0.0.1:5173')+'/?catalog=1');await page.getByRole('button',{name:'Synthetic store · демонстрация',exact:true}).click();}
  await show();await page.getByRole('heading',{name:'Synthetic product',exact:true}).waitFor();
  const image=page.locator('#quick-catalog img');assert((await image.getAttribute('src')).includes('releases/'+first+'/'));
  await page.waitForFunction(()=>document.querySelector('#quick-catalog img')?.naturalWidth>0);
  await shot(page,'before-withdrawal-'+width);
  const hiddenCandidate=join(root,'withdrawn-'+width),hidden=prepareCandidate({source:target,candidate:hiddenCandidate,hide:{'Synthetic store':'*'}});
  assert.equal(catalogueDiff({current:target,candidate:hiddenCandidate}).hidden.length,1);
  active=activateCandidate({candidate:hiddenCandidate,target,expectedIndexHash:active.indexHash,expectedCandidateHash:hidden.fingerprint});
  await show();await page.getByText('В каталоге нет доступных товаров.',{exact:true}).waitFor();assert.equal(await page.locator('#quick-catalog article').count(),0);
  await shot(page,'after-withdrawal-'+width);
  active=rollbackCatalogue({target,revision:first,expectedIndexHash:active.indexHash});
  await show();await page.getByRole('heading',{name:'Synthetic product',exact:true}).waitFor();assert.equal(await page.locator('#quick-catalog article').count(),1);
  await shot(page,'after-rollback-'+width);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS generated catalogue revision -> withdrawal -> rollback with loadable versioned imagery (${width}px)`);
 }
}finally{await browser.close();fs.rmSync(root,{recursive:true,force:true});}
