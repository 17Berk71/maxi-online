import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:true,shops:{'Synthetic store':{file:'large.json',win:[]}}}}));
  await page.route('**/feeds/large.json',r=>r.fulfill({json:{demo:true,depts:[{title:'Одежда',items:[...Array.from({length:1000},(_,n)=>({id:String(n),name:'Товар '+String(n).padStart(4,'0'),pic:'img/product.svg',price:null})),{id:'hidden',name:'Скрытый товар',hidden:true}]}]}}));
  await page.route('**/feeds/img/product.svg',r=>r.fulfill({path:'tools/test/fixtures/product.svg',contentType:'image/svg+xml'}));
  await page.goto((process.env.MAXI_URL||'http://127.0.0.1:5173')+'/?catalog=1');
  await page.getByRole('button',{name:'Synthetic store · демонстрация',exact:true}).click();await page.getByRole('heading',{name:'Товар 0000',exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),40);
  assert.equal(await page.getByText('Обработанное демонстрационное превью, не исходная фотография.',{exact:true}).count(),40,'demo previews must never be presented as source originals');
  assert.equal(await page.getByRole('button',{name:'Предыдущая страница',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Следующая страница',exact:true}).click();await page.getByRole('heading',{name:'Товар 0040',exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),40);assert.equal(await page.getByRole('button',{name:'Следующая страница',exact:true}).evaluate(e=>e===document.activeElement),true);
  for(let n=0;n<23;n++)await page.getByRole('button',{name:'Следующая страница',exact:true}).click();
  await page.getByRole('heading',{name:'Товар 0960',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Следующая страница',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Предыдущая страница',exact:true}).evaluate(e=>e===document.activeElement),true);
  const search=page.getByLabel('Поиск в каталоге',{exact:true});await search.fill('Товар 0999');await page.getByRole('heading',{name:'Товар 0999',exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),1);assert.equal(await search.evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.getByText('Цена не указана',{exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Следующая страница',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Сохранить товар в избранное',exact:true}).click();
  await page.getByRole('button',{name:'Добавить изображение в образ',exact:true}).click();assert.equal(await page.locator('#maxi-photo-look article h3').textContent(),'Товар 0999');await page.keyboard.press('Escape');
  await search.fill('Скрытый товар');await page.getByText('По запросу ничего не найдено.',{exact:true}).waitFor();assert.equal(await page.locator('#quick-catalog article').count(),0);
  await search.fill('');await page.getByRole('heading',{name:'Товар 0000',exact:true}).waitFor();assert.equal(await page.locator('#quick-catalog article').count(),40);
  assert.equal(await page.locator('#quick-catalog').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS 1000-item catalogue: bounded 40 cards, full search, focus and last-item save (${width}px)`);
 }
}finally{await browser.close();}
