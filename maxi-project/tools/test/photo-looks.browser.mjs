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
    await page.getByRole('button',{name:'Удалить'}).first().click();
    assert.equal(await page.locator('#maxi-photo-look article').count(),1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('maxi-photo-looks-v1')).length),1);
    const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
    assert.equal(horizontal,false,`Unexpected horizontal page overflow at ${width}px`);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#maxi-photo-look').count(),0);
    assert.deepEqual(errors,[]);
    await page.close();
  }
} finally {await browser.close();}
