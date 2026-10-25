// Fast catalogue works without WebGL or loading the heavy mall module.
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const width of [390,1280])for(const fallback of [false,true,'startup']){
  const page=await browser.newPage({viewport:{width,height:844}});const errors=[],requested=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requested.push(r.url()));
  if(fallback===true)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.startsWith('webgl')?null:get.call(this,kind,...args);};});
  if(fallback==='startup')await page.route('**/src/app.js',r=>r.fulfill({contentType:'application/javascript',body:"export async function startApp(){throw new Error('Synthetic async startup failure');}"}));
  let brokenIndex=true,brokenFeed=true;
  // Index-only and feed-only truthy demo markers must both suppress merchant links.
  const indexDemo=fallback===true?false:'true',feedDemo=fallback===true?'true':false;
  await page.route('**/feeds/index.json',r=>brokenIndex===true?r.fulfill({status:503,body:'unavailable'}):brokenIndex==='invalid'?r.fulfill({json:{shops:[]}}):r.fulfill({json:{demo:indexDemo,shops:{'Тестовый магазин':{file:'test.json'},'Unsafe':{file:'../secret.json'},'Hidden store':{file:'hidden.json',hidden:'true'}}}}));
  await page.route('**/feeds/img/test.svg',r=>r.fulfill({path:'tools/test/fixtures/product.svg',contentType:'image/svg+xml'}));
  await page.route('**/feeds/test.json',r=>brokenFeed?r.fulfill({status:503,body:'unavailable'}):r.fulfill({json:{demo:feedDemo,updated:'2026-10-24',depts:[{title:'Тестовые товары',items:[{id:'1',name:'Тестовый товар',pic:'img/test.svg',url:'https://example.org/fake',original_image_url:'https://images.example.org/unreviewed.jpg'},{id:'2',name:'Товар без исходного фото',price:null}]}]}}));
  await page.goto((process.env.MAXI_URL||'http://127.0.0.1:5173')+(fallback?'/':'/?catalog=1'),{waitUntil:'domcontentloaded'});
  const root=page.locator('#quick-catalog');await root.waitFor();
  await root.getByRole('button',{name:'Повторить загрузку',exact:true}).waitFor();
  brokenIndex='invalid';await root.getByRole('button',{name:'Повторить загрузку',exact:true}).click();
  await root.getByRole('button',{name:'Повторить загрузку',exact:true}).waitFor();
  assert.equal(await root.getByText('Нет доступных каталогов.',{exact:true}).count(),0,
    'malformed index must show retry rather than claiming an empty catalogue');
  brokenIndex=false;await root.getByRole('button',{name:'Повторить загрузку',exact:true}).click();
  assert.equal(await root.getByRole('button',{name:'Unsafe',exact:false}).count(),0);
  assert.equal(await root.getByRole('button',{name:'Hidden store',exact:false}).count(),0,'index-hidden stores must not appear in quick catalogue');
  await root.getByRole('button',{name:'Тестовый магазин'+(indexDemo?' · демонстрация':''),exact:true}).click();
  const retryFeed=root.getByRole('button',{name:'Повторить загрузку каталога',exact:true});await retryFeed.waitFor();
  assert.equal(await retryFeed.evaluate(e=>e===document.activeElement),true,'failed store load should focus retry');
  brokenFeed=false;await root.getByRole('button',{name:'Повторить загрузку каталога',exact:true}).click();
  try{await root.getByRole('heading',{name:'Тестовый товар',exact:true}).waitFor({timeout:12000});}
  catch(error){
   const diagnostic=await root.evaluate(el=>({status:el.querySelector('[role="status"]')?.textContent,
    headings:[...el.querySelectorAll('h2,h3')].map(x=>x.textContent),
    content:el.querySelector('section[aria-label="Магазины и товары"]')?.textContent?.slice(0,700)}));
   throw new Error('Quick catalogue retry did not render: '+JSON.stringify({diagnostic,errors,feedRequests:requested.filter(x=>x.includes('/feeds/'))}),{cause:error});
  }
  assert.equal(await root.locator('article').count(),2);
  assert.equal(requested.filter(u=>u.includes('/feeds/test.json')).length>=2,true,'failed and retried store requests must reach the configured feed');
  assert.equal(await root.locator('article img').first().getAttribute('src'),'feeds/img/test.svg',
    'demo card must use local preview even when an external original URL is present');
  assert.equal(requested.some(url=>url.includes('images.example.org/unreviewed.jpg')),false,
    'demo page must not request an unreviewed third-party original');
  assert.equal(await root.getByText('Демонстрационный каталог: товары, цены и ссылки тестовые.',{exact:true}).count(),1);
  assert.equal(await root.getByText('Демонстрационный товар',{exact:true}).count(),2);
  assert.equal(await root.getByText('Цена не указана',{exact:true}).count(),2);
  assert.equal(await root.getByRole('link',{name:'Страница товара у продавца ↗',exact:true}).count(),0);
  assert.equal(await root.getByText('Наличие именно в ТРЦ «Макси» не подтверждено.',{exact:true}).count(),2);
  if(fallback===true&&process.env.MAXI_SCREENSHOTS==='1'){
   mkdirSync('docs/review-2026-10-24',{recursive:true});
   await root.locator('img').evaluate(img=>img.complete?null:new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}));
   await page.screenshot({path:`docs/review-2026-10-24/catalog-${width}.png`});
  }
  await root.getByRole('button',{name:'Сохранить товар в избранное',exact:true}).first().click();
  await root.getByRole('button',{name:'Сохранить товар в избранное',exact:true}).click();
  await root.getByRole('button',{name:'Добавить изображение в образ',exact:true}).click();
  assert.equal(await page.locator('#maxi-photo-look article').count(),1);
  await page.getByLabel('Название образа',{exact:true}).fill('Без WebGL');
  await page.getByRole('button',{name:'Сохранить образ',exact:true}).click();
  await page.keyboard.press('Escape');
  assert.equal(requested.some(u=>u.includes('/src/app.js')),fallback==='startup');
  assert.equal(requested.some(u=>u.includes('/feeds/hidden.json')),false,'hidden store feed must not be fetched');
  assert.equal(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);
  await root.getByRole('button',{name:'Мои фотообразы',exact:true}).click();
  assert.equal(await page.locator('#maxi-photo-look').isVisible(),true);await page.keyboard.press('Escape');
  await root.getByRole('button',{name:'← К магазинам',exact:true}).click();
  const storeButton=root.getByRole('button',{name:'Тестовый магазин'+(indexDemo?' · демонстрация':''),exact:true});
  await storeButton.waitFor();
  assert.equal(await storeButton.evaluate(e=>e===document.activeElement),true,'Back must restore focus to selected store');
  await page.keyboard.press('Enter');
  const storeHeading=root.getByRole('heading',{name:'Тестовый магазин',exact:true});await storeHeading.waitFor();
  assert.equal(await storeHeading.evaluate(e=>e===document.activeElement),true,'Store entry must focus its heading');
  await root.getByRole('button',{name:'← К магазинам',exact:true}).focus();await page.keyboard.press('Enter');
  await storeButton.waitFor();
  assert.equal(await storeButton.evaluate(e=>e===document.activeElement),true,'Keyboard Back must restore focus');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#quick-catalog').getByRole('button',{name:'Мои фотообразы',exact:true}).click();
  const favorites=page.getByRole('region',{name:'Избранные товары',exact:true});
  assert.equal(await favorites.locator('.photo-look-saved-row').count(),2);
  assert.equal(await favorites.getByRole('button',{name:'Добавить «Товар без исходного фото» из избранного в образ',exact:true}).isDisabled(),true);
  await favorites.getByRole('button',{name:'Добавить «Тестовый товар» из избранного в образ',exact:true}).click();
  assert.equal(await page.locator('#maxi-photo-look article').count(),1);
  await page.evaluate(()=>{window.__favoriteWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};});
  await favorites.getByRole('button',{name:'Удалить «Тестовый товар» из избранного',exact:true}).click();
  assert.equal(await favorites.locator('.photo-look-saved-row').count(),2);
  assert.equal(await page.locator('#maxi-photo-look').getByRole('status').textContent(),'Не удалось сохранить изменения. Проверьте настройки браузера.');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__favoriteWrite;delete window.__favoriteWrite;});
  await favorites.getByRole('button',{name:'Удалить «Тестовый товар» из избранного',exact:true}).click();
  assert.equal(await favorites.locator('.photo-look-saved-row').count(),1);
  assert.equal(await page.locator('#maxi-photo-look article').count(),1);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS quick catalogue (${width}px, WebGL fallback=${fallback}) including failed fetch/retry`);
 }
}finally{await browser.close();}
