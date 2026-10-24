// Synthetic imagery only; no private clothing photographs.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const out='docs/review-2026-10-24';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
try{
 for(const width of [390,1280])for(const variant of ['before','after']){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto('http://127.0.0.1:5173/tools/test/fixtures/photo-board.html');
  await page.evaluate(async variant=>{
   const mod=await import(variant==='before'?'/src/shop/photo-looks-baseline.js':'/src/shop/photo-looks.js');
   mod.addToPhotoLook({id:'1',name:'Тестовая куртка',demo:true},{name:'Демо-магазин A'},'/tools/test/fixtures/product.svg');
   mod.addToPhotoLook({id:'2',name:'Тестовые брюки',demo:true},{name:'Демо-магазин B'},'/tools/test/fixtures/product.svg');
   if(variant==='after'){const {favorites}=await import('/src/shop/favorites.js');favorites.add({id:'1',name:'Тестовая куртка',demo:true},{name:'Демо-магазин A'},'/tools/test/fixtures/product.svg');}
   mod.openPhotoLook();
  },variant);
  if(variant==='after'){
   await page.getByLabel('Название образа',{exact:true}).fill('Осенний образ');
   await page.getByRole('button',{name:'Сохранить образ',exact:true}).click();
  }
  await page.locator('#maxi-photo-look img').first().waitFor();
  await page.screenshot({path:`${out}/${variant}-${width}.png`});
  if(variant==='after'){await page.getByRole('region',{name:'Избранные товары',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/favorites-${width}.png`});}
  await page.close();
 }
}finally{await browser.close();}
