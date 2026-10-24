// Baseline uses the actual pre-pagination module from 75573e2, with synthetic products.
import {chromium} from 'playwright';import {mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
mkdirSync('docs/review-catalog-pages',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
try{
 for(const width of [390,1280])for(const variant of ['before','after']){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:true,shops:{'Демо-магазин':{file:'large.json',win:[]}}}}));
  await page.route('**/feeds/large.json',r=>r.fulfill({json:{demo:true,depts:[{title:'Одежда',items:Array.from({length:1000},(_,n)=>({id:String(n),name:'Товар '+String(n).padStart(4,'0'),pic:'img/product.svg',price:null}))}]}}));
  await page.route('**/feeds/img/product.svg',r=>r.fulfill({path:'tools/test/fixtures/product.svg',contentType:'image/svg+xml'}));
  await page.goto('http://127.0.0.1:5173/tools/test/fixtures/photo-board.html');
  await page.evaluate(async variant=>{const mod=await import(variant==='before'?'/src/shop/quick-catalog-baseline.js':'/src/shop/quick-catalog.js');await mod.openQuickCatalog();},variant);
  await page.getByRole('button',{name:'Демо-магазин · демонстрация',exact:true}).click();await page.getByRole('heading',{name:'Товар 0000',exact:true}).waitFor();
  assert.equal(await page.locator('#quick-catalog article').count(),variant==='before'?1000:40);
  await page.screenshot({path:`docs/review-catalog-pages/${variant}-${width}.png`});
  if(variant==='after'){await page.getByLabel('Поиск в каталоге',{exact:true}).fill('0999');await page.getByRole('heading',{name:'Товар 0999',exact:true}).waitFor();await page.screenshot({path:`docs/review-catalog-pages/search-${width}.png`});}
  await page.close();
 }
}finally{await browser.close();}
