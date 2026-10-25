// Search -> public door action -> real movement -> store entry. No position writes.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const width of (process.env.MAXI_NAV_DESKTOP_ONLY==='1'?[1280]:[1280,390])){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600});page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:true,shops:{}}}));
  // Prevent catalogue-less 3D thumbnails from blocking door navigation on the software renderer.
  await page.goto((process.env.MAXI_URL||'http://127.0.0.1:5173')+'/?debug&calm=1&fx=0',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__maxi?.loaded,null,{timeout:120000});
  await page.getByRole('button',{name:'Найти магазин',exact:true}).click();await page.locator('#q').fill('Gloria Jeans');
  await page.locator('#results button').first().focus();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#search').isHidden(),true);
  assert.equal(await page.locator('#bSearch').evaluate(e=>e===document.activeElement),true);
  for(const name of ['Gloria Jeans','Синема Парк']){
   await page.getByRole('button',{name:'Найти магазин',exact:true}).click();await page.locator('#q').fill(name);
   const result=page.locator('#results').getByRole('button',{name:new RegExp('^'+name+' ·')});
   if(name==='Синема Парк')await page.locator('#q').press('Enter');else{await result.focus();await page.keyboard.press('Enter');}
   await page.locator('#card').waitFor({state:'visible'});
   assert.equal(await page.locator('#cName').textContent(),name);
   await page.getByRole('button',{name:name==='Синема Парк'?'Войти в кинотеатр':'Войти в магазин',exact:true}).click();
   // Observe debug state, but never mutate player coordinates or enterShop directly.
   if(width<600){
    const session=await page.context().newCDPSession(page),box=await page.locator('#joy').boundingBox();assert(box,'Mobile joystick visible');
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:box.y+8}]});
    try{await page.waitForFunction(()=>window.__maxi.mode==='store',null,{timeout:45000});}finally{await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
   }else{
    // The browser's pointer-lock transition may blur the page and clear held keys.
    await page.waitForFunction(()=>window.__maxi.locked);
    // SwiftShader can advance movement at very few frames per second. Use the real
    // sprint control for the second door, not debug-position writes or direct enterShop.
    const sprint=name==='Синема Парк';
    if(sprint)await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    try{
     await page.waitForFunction(()=>window.__maxi.mode==='store',null,{timeout:60000,polling:100});
    }catch(error){
     // Under SwiftShader, page scripts can be starved until the timeout fires.
     // CI #212 timed out while the debug snapshot already showed mode='store'.
     // Recheck actual application state; never turn a genuine failed entry green.
     const snapshot=await page.evaluate(()=>({mode:window.__maxi.mode,floor:window.__maxi.floor,player:window.__maxi.player,keys:window.__maxi.keys,anim:window.__maxi.anim}));
     if(snapshot.mode!=='store'){console.error('Navigation failure',name,snapshot);throw error;}
     console.warn('Store entry confirmed on timeout recheck:',name);
    }finally{await page.keyboard.up('w');if(sprint)await page.keyboard.up('Shift');}
   }
   const entered=await page.locator('#shopHudName').textContent();
   assert.equal(entered.startsWith(name),true,`Expected ${name}, got ${entered}`);
   if(name==='Синема Парк')assert.equal(await page.evaluate(()=>window.__maxi.floor),2);
   if(width>=600){await page.keyboard.press('Escape');await page.waitForFunction(()=>document.pointerLockElement===null);}
   await page.locator('#shopOut').click();await page.waitForFunction(()=>window.__maxi.mode==='walk');
   console.log(`PASS search/door/${width<600?'touch joystick':'W key'}/entry/exit: ${name} (${width}px)`);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
