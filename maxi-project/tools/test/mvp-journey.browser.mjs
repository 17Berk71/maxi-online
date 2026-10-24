// Actual mall entry point and product UI, using intercepted synthetic feeds.
// Does not validate rights, live inventory, human device performance or photorealism.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600});
  page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=(process.env.MAXI_URL||'http://127.0.0.1:5173').replace(/\/$/,'');
  // All catalogue photos are synthetic: never take screenshots of private assets.
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:true,shops:{'Gloria Jeans':{file:'gloria-jeans.json',win:[]},Ostin:{file:'ostin.json',win:[]}}}}));
  await page.route('**/feeds/*-jeans.json',r=>r.fulfill({json:feed('jacket','Тестовая куртка','tshirt')}));
  await page.route('**/feeds/ostin.json',r=>r.fulfill({json:feed('pants','Тестовые брюки','pants')}));
  // Synthetic permitted-source contract, intercepted locally; never represents a real merchant.
  await page.context().route('https://example.org/product-*',r=>r.fulfill({body:'Synthetic merchant fixture'}));
  await page.goto(base+'/?debug&calm=1&fx=0',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__maxi?.loaded,null,{timeout:120000});
  await page.getByRole('button',{name:'Мои фотообразы',exact:true}).click();
  assert.equal(await page.locator('#maxi-photo-look').isVisible(),true);
  await page.keyboard.press('Escape');
  // Exercise the actual store scene/catalogue and product controls; debug only positions the visitor.
  for(const name of ['Gloria Jeans','Ostin']){
   await page.evaluate(async name=>{
    const T=window.__maxi,s=T.S.find(x=>x.name===name);if(!s?.door)throw Error('Missing store door '+name);
    await T.loadFeed(s);T.setFloor(s.floor);T.enterShop(s);
   },name);
   assert.equal(await page.evaluate(()=>window.__maxi.mode),'store');
   await page.locator('#shopCat').click();
   await page.locator('#shop .sh-card').first().click();
   assert.equal(await page.locator('#shop .sh-name').textContent(),name==='Ostin'?'Тестовые брюки':'Тестовая куртка');
   assert.equal(await page.getByText('Наличие именно в ТРЦ «Макси» не подтверждено.',{exact:false}).count()>0,true);
   assert.equal(await page.locator('#shop .pv-photo').getAttribute('src'),'http://127.0.0.1:5173/tools/test/fixtures/product.svg');
   assert.equal(await page.getByText('Проверка каталога: дата не указана. Импорт не является проверкой наличия.',{exact:true}).count(),1);
   if(name==='Ostin'){
    await page.locator('#shop .pv-photo').evaluate(img=>img.dispatchEvent(new Event('error')));
    assert.equal(await page.getByText('Фото недоступно. Сведения о товаре и сохранение остаются доступны.',{exact:true}).count(),1);
   }
   await page.getByRole('button',{name:'Сохранить товар в избранное',exact:true}).click();
   if(name==='Ostin')assert.equal(await page.locator('#shop .sh-price').textContent(),'Цена не указана');
   await page.getByRole('button',{name:'Добавить изображение в образ',exact:true}).click();
   assert.equal(await page.locator('#maxi-photo-look article').count(),name==='Ostin'?2:1);
   await page.keyboard.press('Escape');
   await page.evaluate(()=>window.__maxi.exitShop());
  }
  await page.getByRole('button',{name:'Мои фотообразы',exact:true}).click();
  await page.getByLabel('Название образа',{exact:true}).fill('Маршрут по двум магазинам');
  await page.getByRole('button',{name:'Сохранить образ',exact:true}).click();
  assert.equal(await page.locator('#maxi-photo-look').getByRole('status').textContent(),'Образ сохранён в этом браузере.');
  await page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__maxi?.loaded,null,{timeout:120000});
  await page.getByRole('button',{name:'Мои фотообразы',exact:true}).click();
  await page.getByRole('button',{name:'Открыть образ «Маршрут по двум магазинам»',exact:true}).click();
  assert.equal(await page.locator('#maxi-photo-look article').count(),2);
  assert.equal(await page.getByRole('region',{name:'Избранные товары',exact:true}).locator('.photo-look-saved-row').count(),2);
  assert.deepEqual(await page.locator('#maxi-photo-look article h3').allTextContents(),['Тестовая куртка','Тестовые брюки']);
  const link=page.locator('#maxi-photo-look article a').first();
  assert.equal(await link.getAttribute('href'),'https://example.org/product-jacket');
  assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
  const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;
  await popup.waitForLoadState();assert.equal(popup.url(),'https://example.org/product-jacket');await popup.close();
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS integrated mall -> two store catalogues -> photo look -> save/reload -> synthetic merchant (${width}px)`);
 }
}finally{await browser.close();}
function feed(id,name,type){return {demo:false,source:'Synthetic test fixture, not a real catalogue',updated:'2026-10-24',depts:[{key:type,title:'Тестовый отдел',type,who:'adult',items:[{id,name,price:id==='pants'?null:100,color:'#345678',sizes:['M'],pic:'../tools/test/fixtures/product.svg',cut:false,url:`https://example.org/product-${id}`,original_image_url:'http://127.0.0.1:5173/tools/test/fixtures/product.svg'}]}]};}
