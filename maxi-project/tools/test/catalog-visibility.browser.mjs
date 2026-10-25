// Both catalogue adapters must respect a withdrawal, including a fully empty shop.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
  let withdraw=false,withdrawStatus=false,draftStatus=false;
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:true,shops:{'Gloria Jeans':{file:'fixture.json',win:[]}}}}));
  await page.route('**/feeds/fixture.json',r=>r.fulfill({json:{demo:false,catalogue_status:withdrawStatus?'withdrawn':draftStatus?'draft':'active',depts:[{key:'tshirts',type:'tshirts',title:'Test',items:[
   {id:'shown',name:'Visible synthetic item',hidden:withdraw?'true':false,pic:'../tools/test/fixtures/product.svg',url:'https://example.org/fake'},
   {id:'hidden',name:'WITHDRAWN ITEM',hidden:'true',pic:'../tools/test/fixtures/product.svg'}
  ]},{key:'paused',type:'tshirts',title:'Paused',hidden:'true',items:[{id:'paused-product',name:'PAUSED DEPARTMENT ITEM'}]}]}}));
  const base=process.env.MAXI_URL||'http://127.0.0.1:5173';
  async function openStore(){
   await page.goto(base+'/?debug&calm=1&fx=0',{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>window.__maxi?.loaded,null,{timeout:120000});
   await page.evaluate(async()=>{const T=window.__maxi,s=T.S.find(s=>s.name==='Gloria Jeans');await T.loadFeed(s);T.setFloor(s.floor);T.enterShop(s);});
   await page.locator('#shopCat').click();
  }
  await openStore();assert.equal(await page.locator('#shop .sh-card').count(),1);
  assert.equal(await page.getByText('WITHDRAWN ITEM',{exact:true}).count(),0);
  assert.equal(await page.getByText('PAUSED DEPARTMENT ITEM',{exact:true}).count(),0);
  await page.locator('#shop .sh-card').click();
  assert.equal(await page.locator('#shop .sh-buy a').count(),0,'index demo flag must suppress fabricated product links');
  withdraw=true;await openStore();
  assert.equal(await page.locator('#shop .sh-card').count(),0);
  assert.equal(await page.evaluate(()=>window.__maxi.SHOP.cat.length),0);
  await page.getByText('В каталоге пока нет доступных товаров. Демонстрационные товары не подставляются.',{exact:true}).waitFor();
  await page.goto(base+'/?catalog=1',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Gloria Jeans · демонстрация',exact:true}).click();
  await page.getByText('В каталоге нет доступных товаров.',{exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),0);
  assert.equal(await page.getByText('PAUSED DEPARTMENT ITEM',{exact:true}).count(),0);
  // A feed-level withdrawal must also block stale items whose individual hidden flags
  // were accidentally reset. Exercise the actual quick catalogue on both viewports.
  withdraw=false;withdrawStatus=true;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Gloria Jeans · демонстрация',exact:true}).click();
  await page.getByText('В каталоге нет доступных товаров.',{exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),0);
  assert.equal(await page.getByText('Visible synthetic item',{exact:true}).count(),0);
  // Staged feeds must remain invisible even when every item is unhidden.
  withdrawStatus=false;draftStatus=true;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Gloria Jeans · демонстрация',exact:true}).click();
  await page.getByText('В каталоге нет доступных товаров.',{exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),0);
  assert.equal(await page.getByText('Visible synthetic item',{exact:true}).count(),0);
  // When the index itself is unreachable, a 3D store must not invent a legacy
  // assortment merely because it cannot discover which real feed was configured.
  await page.route('**/feeds/index.json',route=>route.fulfill({status:503,body:'temporarily unavailable'}));
  await openStore();
  assert.equal(await page.locator('#shop .sh-card').count(),0);
  await page.getByText('В каталоге пока нет доступных товаров. Демонстрационные товары не подставляются.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__maxi.SHOP.cat.length),0);
  assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS hidden products and fully withdrawn shop stay empty in 3D/quick catalogues (${width}px)`);
 }
}finally{await browser.close();}
