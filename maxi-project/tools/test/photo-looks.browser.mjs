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
      mod.addToPhotoLook({id:'one',name:'Jacket',url:'https://example.org/jacket'},{name:'Shop A'},'https://example.org/jacket.jpg');
      mod.addToPhotoLook({id:'two',name:'Trousers'},{name:'Shop B'},'https://example.org/trousers.jpg');
      mod.openPhotoLook();
    });
    await page.locator('#maxi-photo-look').waitFor({timeout:15000});
    assert.equal(await page.locator('#maxi-photo-look article').count(),2);
    assert.equal(await page.locator('#maxi-photo-look article img').count(),2);
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
