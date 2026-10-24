// Search -> public door action -> real movement -> store entry. No position writes.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600});page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/feeds/index.json',r=>r.fulfill({json:{demo:true,shops:{}}}));
  // Prevent catalogue-less 3D thumbnails from blocking door navigation on the software renderer.
  await page.goto((process.env.MAXI_URL||'http://127.0.0.1:5173')+'/?debug&calm=1&fx=0',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__maxi?.loaded,null,{timeout:120000});
  for(const name of ['Gloria Jeans','Синема Парк']){
   await page.getByRole('button',{name:'Найти магазин',exact:true}).click();await page.locator('#q').fill(name);
   const result=page.locator('#results').getByRole('button',{name:new RegExp('^'+name+' ·')});await result.focus();await page.keyboard.press('Enter');
   await page.locator('#card').waitFor({state:'visible'});
   assert.equal(await page.locator('#cName').textContent(),name);
   await page.getByRole('button',{name:name==='Синема Парк'?'Войти в кинотеатр':'Войти в магазин',exact:true}).click();
   console.log('At door',name,await page.evaluate(name=>{const T=window.__maxi,s=T.S.find(x=>x.name===name),d=s.door;return {floor:T.floor,mode:T.mode,x:T.player.x,z:T.player.z,yaw:T.player.yaw,gap:d.gap,door:[d.c.x,d.c.z],normal:[d.n.x,d.n.z]};},name));
   // Observe debug state, but never mutate player coordinates or enterShop directly.
   if(width<600){
    const session=await page.context().newCDPSession(page),box=await page.locator('#joy').boundingBox();assert(box,'Mobile joystick visible');
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:box.y+8}]});
    try{await page.waitForFunction(()=>window.__maxi.mode==='store',null,{timeout:45000});}finally{await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
   }else{
    await page.keyboard.down('w');try{await page.waitForFunction(()=>window.__maxi.mode==='store',null,{timeout:45000});}catch(error){console.log('Navigation failure',name,await page.evaluate(()=>({mode:window.__maxi.mode,floor:window.__maxi.floor,player:window.__maxi.player,keys:window.__maxi.keys,anim:window.__maxi.anim})));throw error;}finally{await page.keyboard.up('w');}
   }
   assert.equal(await page.locator('#shopHudName').textContent().then(x=>x.startsWith(name)),true);
   if(name==='Синема Парк')assert.equal(await page.evaluate(()=>window.__maxi.floor),2);
   if(width>=600){await page.keyboard.press('Escape');await page.waitForFunction(()=>document.pointerLockElement===null);}
   await page.locator('#shopOut').click();await page.waitForFunction(()=>window.__maxi.mode==='walk');
   console.log(`PASS search/door/${width<600?'touch joystick':'W key'}/entry/exit: ${name} (${width}px)`);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
