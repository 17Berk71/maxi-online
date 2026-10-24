import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:800}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.MAXI_URL||'http://127.0.0.1:5173').replace(/\/$/,'')+'/tools/test/fixtures/photo-board.html',{waitUntil:'domcontentloaded'});
    // Isolated photo board exercise: we need not wait for heavy mall WebGL rendering.
    await page.evaluate(async ()=>{
      const mod=await import('/src/shop/photo-looks.js');
      localStorage.removeItem('maxi-photo-looks-v1');
      // Start with an empty board in this clean CI browser context.
      mod.addToPhotoLook({id:'one',name:'Jacket',url:'https://example.org/jacket'},{name:'Shop A'},'/tools/test/fixtures/product.svg');
      mod.addToPhotoLook({id:'two',name:'Trousers'},{name:'Shop B'},'/tools/test/fixtures/product.svg');
      mod.openPhotoLook();
    });
    await page.locator('#maxi-photo-look').waitFor({timeout:15000});
    assert.equal(await page.locator('#maxi-photo-look article').count(),2);
    assert.equal(await page.locator('#maxi-photo-look article img').count(),2);
    // Focus cannot escape a modal dialog through either direction of Tab navigation.
    await page.locator('#maxi-photo-look [data-close-photo-look]').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>{const a=[...document.querySelectorAll('#maxi-photo-look button,#maxi-photo-look a[href]')];return document.activeElement===a[a.length-1];}),true);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#maxi-photo-look [data-close-photo-look]').evaluate(e=>e===document.activeElement),true);
    // Missing catalogue images must show a textual fallback rather than a blank item.
    await page.locator('#maxi-photo-look article img').first().evaluate(img=>img.dispatchEvent(new Event('error')));
    assert.equal(await page.getByText('Изображение недоступно. Откройте страницу товара.').count(),1);
    // Reordering keeps focus on the moved item's available control.
    await page.getByRole('button',{name:'Переместить «Jacket» вправо'}).click();
    assert.equal(await page.locator('#maxi-photo-look article h3').first().textContent(),'Trousers');
    assert.equal(await page.getByRole('button',{name:'Переместить «Jacket» влево'}).evaluate(e=>e===document.activeElement),true);
    assert.equal(await page.getByRole('status').textContent(),'Порядок товаров изменён.');
    assert.equal(await page.getByRole('button',{name:'Переместить «Trousers» влево'}).isDisabled(),true);
    // A failed localStorage write must leave the board unchanged and announce the failure.
    await page.evaluate(()=>{
      window.__photoBoardSetItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};
    });
    await page.getByRole('button',{name:'Удалить «Trousers»'}).click();
    assert.equal(await page.locator('#maxi-photo-look article').count(),2);
    assert.equal(await page.getByRole('status').textContent(),'Не удалось сохранить изменения. Проверьте настройки браузера.');
    await page.evaluate(()=>{Storage.prototype.setItem=window.__photoBoardSetItem;delete window.__photoBoardSetItem;});
    await page.getByRole('button',{name:'Удалить «Trousers»'}).click();
    assert.equal(await page.getByRole('button',{name:'Удалить «Jacket»'}).evaluate(e=>e===document.activeElement),true);
    assert.equal(await page.getByRole('status').textContent(),'Товар удалён из образа.');

    assert.equal(await page.locator('#maxi-photo-look article').count(),1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('maxi-photo-looks-v1')).length),1);
    const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
    assert.equal(horizontal,false,`Unexpected horizontal page overflow at ${width}px`);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#maxi-photo-look').count(),0);
    assert.deepEqual(errors,[]);
    // Treat browser storage as untrusted: reject malformed image URLs and strip unsafe merchant links.
    await page.evaluate(()=>{
      localStorage.setItem('maxi-photo-looks-v1',JSON.stringify([
        {id:'safe',title:'Safe item',shop:'Test',image:'/tools/test/fixtures/product.svg',sourceUrl:'javascript:alert(1)'},
        {id:'bad',title:'Bad item',image:'/'+String.fromCharCode(92)+'evil.example/image.jpg'}
      ]));
    });
    await page.reload({waitUntil:'domcontentloaded'});
    const restored=await page.evaluate(async ()=>{
      const mod=await import('/src/shop/photo-looks.js');
      const snapshot=mod.photoLookItems();
      snapshot[0].title='Mutated externally';
      mod.openPhotoLook();
      return mod.photoLookItems();
    });
    assert.equal(restored.length,1);
    assert.equal(restored[0].title,'Safe item');
    assert.equal(restored[0].sourceUrl,null);
    assert.equal(await page.locator('#maxi-photo-look article').count(),1);
    assert.equal(await page.locator('#maxi-photo-look a[href]').count(),0);
    await page.keyboard.press('Escape');
    await page.close();
  }
} finally {await browser.close();}
