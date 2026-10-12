// Package the existing fitting engine and two private pilot packs as a review stand.
// node tools/lab/review.mjs ABS_OUTPUT_DIR [BEFORE_PACK_DIR]
// Source photographs are never included. Use owner-private hosting for these packs.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './common.mjs';
import {bundle} from './esb.mjs';
const output=path.resolve(process.argv[2] || path.join(ROOT,'tools/lab/review-dist'));
const before=path.resolve(process.argv[3] || path.join(ROOT,'tools/wardrobe/out/stage3-source-backup'));
const after=path.join(ROOT,'tools/wardrobe/out');
const reviewCaption=process.env.REVIEW_STAGE==='construction' ? '«До» — форма этапа 3. «После» — длина, плечи и рукав футболки по разложенному фото. Новые параметры оценены приблизительно; ширина 54 см подтверждена лентой.' : '«До» — результат этапа 2. «После» — новые фото переда, очистка ленты, уменьшение светотени и согласование оттенка ткани между сторонами.';
const ids=['zolla-tee','barrel-jeans'];
fs.mkdirSync(output,{recursive:true});
for(const [version,dir] of [['before',before],['after',after]]){
 const list=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8')).filter(i=>ids.includes(i.id));
 if(list.length!==2)throw new Error('Need both pilot items in '+dir);
 const dest=path.join(output,'packs',version);fs.mkdirSync(dest,{recursive:true});
 for(const item of list){
  const out=path.join(dest,item.id);fs.mkdirSync(out,{recursive:true});
  for(const name of ['meta.json','front.webp','back.webp','front_cut.webp','back_cut.webp',...(item.sleeve?['sleeve.webp']:[])]) fs.copyFileSync(path.join(dir,item.id,name),path.join(out,name));
 }
 fs.writeFileSync(path.join(dest,'index.json'),JSON.stringify(list));
}
fs.copyFileSync(path.join(ROOT,'node_modules/three/build/three.min.js'),path.join(output,'three.min.js'));
const js=await bundle(`import {createFitting} from './shop/fitting.js';import {PREFS} from './core/settings.js';
window.REVIEW={createFitting,PREFS};`,path.join(ROOT,'src'));
fs.writeFileSync(path.join(output,'engine.js'),js);
const frameScript=`
const defaults={sex:'m',height:186,weight:82,chest:110,waist:82,hips:98,skin:0};
const FIT=REVIEW.createFitting({fmtPrice:x=>String(x),thumb:p=>p.pic||'',siteOf:()=>'',coarse:false,catalogOf:()=>[]});
let config={version:'after',items:['zolla-tee'],body:defaults,angle:0}, loaded='', opened=false, chain=Promise.resolve();
window.FIT=FIT;
function send(data){parent.postMessage({channel:'maxi-fitting-review',...data},location.origin);}
async function apply(update){
 const previousView=FIT.getView();
 config={...config,...update};
 if(!['before','after'].includes(config.version))return;
 config.items=config.items.filter(id=>['zolla-tee','barrel-jeans'].includes(id));
 send({state:'loading'});
 try{
  Object.assign(REVIEW.PREFS.body,config.body);FIT.setAnim(false);
  if(loaded!==config.version){await FIT.addPack('packs/'+config.version+'/');loaded=config.version;}
  FIT.wear(config.items.map(id=>'w-'+id),{});if(!opened){FIT.open();opened=true;}
  await FIT.ready();
  const camera=previousView ? FIT.getView()||previousView : null;
  FIT.setRot(camera ? camera.rot : config.angle);FIT.setZoom(camera ? camera.zoom : .60,camera ? camera.height : .5);
  send({state:'ready',notes:config.items.map(id=>FIT.fitNote('w-'+id).split(' |')[0])});
 }catch(error){send({state:'error',message:String(error.message||error)});document.querySelector('#error').textContent='Не удалось загрузить примерку. '+String(error.message||error);}
}
window.addEventListener('message',e=>{
 if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='maxi-fitting-review')return;
 const d=e.data;
 if(d.command==='angle'){config.angle=d.angle;FIT.setRot(d.angle);return;}
 if(d.command==='zoom'){FIT.setZoom(d.zoom,.5);return;}
 if(d.command==='configure')chain=chain.then(()=>apply(d.config));
});
const q=new URLSearchParams(location.search);config.version=q.get('version')==='before'?'before':'after';config.items=(q.get('items')||'zolla-tee').split(',');
chain=chain.then(()=>apply(config));
`;
fs.writeFileSync(path.join(output,'frame.js'),frameScript);
fs.writeFileSync(path.join(output,'frame.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#d6d1c9}#fitC{display:block;width:100%;height:100vh;touch-action:none}.hid{display:none}#error{position:absolute;bottom:10px;left:10px;color:#7b2020;font:14px system-ui}</style><body><div id="fitting"><canvas id="fitC"></canvas><div class="hid"><b id="fitShop"></b><button id="fitX"></button><div id="fitTabs"></div><div id="fitViews"></div><div id="fitBody"></div></div></div><p id="error"></p><script>window.__shadowMap=512;</script><script src="three.min.js"></script><script src="engine.js"></script><script src="frame.js"></script></body></html>`);
const pageScript=`
const choices={tee:['zolla-tee'],jeans:['barrel-jeans'],outfit:['zolla-tee','barrel-jeans']};
const cards=[...document.querySelectorAll('.card')];
function send(card,command,data={}){card.querySelector('iframe').contentWindow.postMessage({channel:'maxi-fitting-review',command,...data},location.origin);}
function configure(card){card.querySelector('.status').textContent='Расчёт примерки…';send(card,'configure',{config:{version:card.dataset.version,items:choices[card.querySelector('select').value]}});}
cards.forEach(card=>{
 card.querySelector('select').onchange=()=>configure(card);
 card.querySelectorAll('[data-version]').forEach(button=>button.onclick=()=>{card.dataset.version=button.dataset.version;card.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));configure(card);});
});
document.querySelectorAll('[data-all]').forEach(button=>button.onclick=()=>cards.forEach(card=>{const b=card.querySelector('[data-version="'+button.dataset.all+'"]');b.click();}));
document.querySelectorAll('[data-angle]').forEach(button=>button.onclick=()=>cards.forEach(card=>send(card,'angle',{angle:Number(button.dataset.angle)})));
document.querySelector('#apply-body').onclick=()=>{
 const body={sex:'m',skin:0};for(const input of document.querySelectorAll('#body input')){const n=Number(input.value);if(!Number.isFinite(n)||n<Number(input.min)||n>Number(input.max)){input.reportValidity();return;}body[input.name]=n;}
 cards.forEach(card=>{card.querySelector('.status').textContent='Пересчитываю фигуру…';send(card,'configure',{config:{body}});});
};
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.data?.channel!=='maxi-fitting-review')return;
 const card=cards.find(c=>c.querySelector('iframe').contentWindow===e.source);if(!card)return;
 const d=e.data;card.querySelector('.status').textContent=d.state==='ready'?'Можно вращать и приближать':d.state==='error'?'Ошибка: '+d.message:'Расчёт примерки…';
 if(d.state==='ready')card.querySelector('.notes').textContent=(d.notes||[]).filter(Boolean).join(' · ');
});
`;
fs.writeFileSync(path.join(output,'review.js'),pageScript);
const card=(title,value)=>`<article class="card" data-version="after"><div class="card-head"><label>${title}<select aria-label="Вещь на манекене"><option value="tee" ${value==='tee'?'selected':''}>Футболка Zolla</option><option value="jeans" ${value==='jeans'?'selected':''}>Джинсы RIMILLI</option><option value="outfit" ${value==='outfit'?'selected':''}>Футболка + джинсы</option></select></label><div class="switch"><button data-version="before" aria-pressed="false">До</button><button data-version="after" aria-pressed="true">После</button></div></div><iframe title="${title}: интерактивный манекен" src="frame.html?items=${choicesFor(value)}&version=after"></iframe><div class="status" role="status">Загрузка манекена…</div><p class="notes"></p></article>`;
function choicesFor(value){return value==='tee'?'zolla-tee':value==='jeans'?'barrel-jeans':'zolla-tee,barrel-jeans';}
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Maxi — стенд примерочной</title><link rel="stylesheet" href="review.css"></head><body><main><header><span class="eyebrow">MAXI / ПРИМЕРОЧНАЯ</span><h1>Одежда на твоей фигуре</h1><p>Три манекена. Выбирай вещи, переключай до/после и сравнивай результат.</p></header><section class="toolbar" aria-label="Управление сравнением"><div><button data-all="before">Все до</button><button data-all="after">Все после</button></div><div><button data-angle="0">Спереди</button><button data-angle="1.5707963267948966">Сбоку</button><button data-angle="3.141592653589793">Сзади</button></div><span>Перетаскивай для вращения · колесо или два пальца для приближения</span></section><section class="cards">${card('Манекен 1','tee')+card('Манекен 2','jeans')+card('Манекен 3','outfit')}</section><section id="body"><h2>Мерки фигуры</h2><div class="measurements">${[['height','Рост',186,140,210],['weight','Вес, кг',82,40,140],['chest','Грудь',110,70,150],['waist','Талия',82,50,140],['hips','Бёдра',98,70,150]].map(([name,label,val,min,max])=>`<label>${label}<input name="${name}" type="number" value="${val}" min="${min}" max="${max}" required></label>`).join('')}<button id="apply-body">Обновить фигуру</button></div><p>Размеры в сантиметрах, кроме веса. Футболка: 54 см между подмышками. Штанина: 38 см в месте замера.</p></section><footer><p><b>Что сравниваем:</b> ${reviewCaption}</p><p>Примерка приближённая: растяжимость и полная выкройка не измерены. Скрытые лентой участки восстановлены по соседней ткани. На телефоне три манекена расположены друг под другом.</p></footer></main><script src="review.js"></script></body></html>`);
fs.writeFileSync(path.join(output,'review.css'),`*{box-sizing:border-box}body{margin:0;background:#f3f1ec;color:#222b32;font:15px/1.5 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:28px}header{margin-bottom:22px}.eyebrow{font-size:12px;letter-spacing:.16em;color:#66717c}h1{font-size:clamp(26px,3vw,40px);line-height:1.15;margin:8px 0}header p{color:#5a6671;margin:0}.toolbar{display:flex;gap:15px;align-items:center;flex-wrap:wrap;margin-bottom:18px}.toolbar span{font-size:12px;color:#66717c}.toolbar div,.switch{display:flex;gap:6px}button,select,input{font:inherit}button{border:1px solid #c5cbc9;border-radius:9px;padding:9px 14px;background:white;cursor:pointer;color:#263847}button:hover{background:#e5eee9}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #198070;outline-offset:2px}button[aria-pressed=true],#apply-body{background:#1e665e;color:white;border-color:#1e665e}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.card{min-width:0;background:white;border:1px solid #d6d9d4;border-radius:16px;overflow:hidden}.card-head{padding:13px;display:flex;align-items:end;justify-content:space-between;gap:8px}.card-head label{color:#6a757c;font-size:11px}.card-head select{display:block;border:0;background:transparent;color:#263847;font-weight:650;max-width:100%;padding:5px 0}.switch button{font-size:12px;padding:7px 9px}iframe{display:block;width:100%;height:550px;border:0;background:#d6d1c9}.status{font-size:12px;padding:10px 14px;color:#176158}.notes{font-size:12px;color:#69747d;padding:0 14px;min-height:35px;margin:0 0 12px}#body{background:white;border:1px solid #d6d9d4;border-radius:16px;padding:20px;margin-top:20px}h2{font-size:18px;margin:0 0 12px}.measurements{display:flex;flex-wrap:wrap;gap:12px;align-items:end}.measurements label{font-size:12px;color:#69747d}.measurements input{display:block;width:90px;padding:8px;border:1px solid #c5cbc9;border-radius:8px;background:#fafbf9;color:#263847}#body p,footer{font-size:12px;color:#69747d}footer{margin-top:18px}footer p{margin:5px 0}@media(max-width:1000px){main{padding:18px}.card-head{display:block}.switch{margin-top:6px}iframe{height:460px}}@media(max-width:680px){.cards{grid-template-columns:1fr}.card-head{display:flex}iframe{height:540px}main{padding:14px}.toolbar span{width:100%}}`);
console.log(output);
