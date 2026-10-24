// Synthetic stock evidence only: expiry must remove claims in an already-open view.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const base=process.env.MAXI_URL||'http://127.0.0.1:5173';
function stock(status,scope,expiry){return {availability_status:status,availability_scope:scope,availability_source:'https://example.org/synthetic-stock',availability_checked_at:new Date(Date.now()-60000).toISOString(),availability_expires_at:new Date(Date.now()+expiry).toISOString()};}
async function advance(page){await page.evaluate(()=>{window.__originalNow=Date.now;Date.now=()=>window.__originalNow()+660000;document.dispatchEvent(new Event('visibilitychange'));});}
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
  let short=true;
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:false,shops:{'Gloria Jeans':{file:'stock.json',win:[]}}}}));
  await page.route('**/feeds/stock.json',r=>r.fulfill({json:{demo:false,source:'Synthetic test contract only',depts:[{key:'tshirts',type:'tshirts',title:'Test',items:[
   {id:'in',name:'Synthetic in-stock',price:null,pickup:true,url:'https://example.org/product',original_image_url:base+'/tools/test/fixtures/product.svg',...stock('confirmed_in_stock','physical_store_tula',short?2000:600000)},
   {id:'out',name:'Synthetic out-of-stock',original_image_url:base+'/tools/test/fixtures/product.svg',...stock('confirmed_out_of_stock','physical_store_tula',short?2000:600000)},
   {id:'online',name:'Synthetic online',original_image_url:base+'/tools/test/fixtures/product.svg',...stock('confirmed_in_stock','online_store',short?2000:600000)}
  ]}]}}));
  await page.goto(base+'/?catalog=1');await page.getByRole('button',{name:'Gloria Jeans',exact:true}).click();
  await page.getByText('Подтверждено наличие в магазине Тулы.',{exact:true}).waitFor();
  assert.equal(await page.getByText('Подтверждено отсутствие в магазине Тулы.',{exact:true}).count(),1);
  assert.equal(await page.getByText('Наличие именно в ТРЦ «Макси» не подтверждено.',{exact:true}).count(),1,'online proof never means local stock');
  const favorite=page.getByRole('button',{name:'Сохранить товар в избранное',exact:true}).first();await favorite.focus();
  await page.evaluate(()=>window.__favoriteNode=document.querySelector('#quick-catalog article button'));
  await page.waitForFunction(()=>[...document.querySelectorAll('#quick-catalog article p')].filter(e=>e.textContent==='Наличие именно в ТРЦ «Макси» не подтверждено.').length===3);
  assert.equal(await favorite.evaluate(e=>e===document.activeElement&&e===window.__favoriteNode),true,'timer expiry preserves card/focus');
  short=false;await page.reload();await page.getByRole('button',{name:'Gloria Jeans',exact:true}).click();await page.getByText('Подтверждено наличие в магазине Тулы.',{exact:true}).waitFor();
  await advance(page);assert.equal(await page.getByText('Подтверждено наличие в магазине Тулы.',{exact:true}).count(),0);
  assert.equal(await page.getByText('Наличие именно в ТРЦ «Макси» не подтверждено.',{exact:true}).count(),3);
  await page.evaluate(()=>Date.now=window.__originalNow);
  await page.goto(base+'/?debug&calm=1&fx=0',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__maxi?.loaded,null,{timeout:120000});
  await page.evaluate(async()=>{const T=window.__maxi,s=T.S.find(s=>s.name==='Gloria Jeans');await T.loadFeed(s);T.setFloor(s.floor);T.enterShop(s);});
  await page.locator('#shopCat').click();await page.locator('#shop .sh-card').first().click();
  const pickup=page.getByRole('link',{name:'Уточнить самовывоз ↗',exact:true});await pickup.waitFor();await pickup.focus();
  await page.evaluate(()=>{window.__originalImage=document.querySelector('#shop .pv-photo');window.__favoriteNode=document.querySelector('#shop .sh-detail button');});
  await advance(page);
  assert.equal(await pickup.isHidden(),true);
  assert.match(await page.locator('#shop .sh-stock').textContent(),/не подтверждено/);
  assert.equal(await page.getByRole('link',{name:'Открыть товар на сайте ↗',exact:true}).evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('#shop .pv-photo').evaluate(e=>e===window.__originalImage),true);
  await page.getByRole('button',{name:'Сохранить товар в избранное',exact:true}).click();await page.getByText('Товар сохранён в этом браузере. Избранное доступно в «Мои фотообразы».',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS live evidence expiry, wake revalidation, pickup removal and preserved UI (${width}px)`);
 }
}finally{await browser.close();}
