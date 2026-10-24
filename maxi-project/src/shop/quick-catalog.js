// NFR-006 / FR-MALL-005: a catalogue path that never imports the 3D application.
import {catalogueProducts,feedPath} from './catalog-feed.js';
import {addToPhotoLook,openPhotoLook,photoLookMessage} from './photo-looks.js';
import {favorites} from './favorites.js';
import {AVAILABILITY} from './catalog-evidence.js';
const el=(tag,text)=>Object.assign(document.createElement(tag),text===undefined?{}:{textContent:text});
async function read(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(url,{cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timer);}
}
export async function openQuickCatalog(reason=''){
 document.getElementById('quick-catalog')?.remove();
 const root=el('main');root.id='quick-catalog';
 const style=el('style');style.textContent=`
 #quick-catalog{position:fixed;inset:0;overflow:auto;z-index:9998;padding:clamp(16px,4vw,40px);background:#f8f8fa;color:#222;color-scheme:light;font:16px/1.5 system-ui,sans-serif}
 #quick-catalog *{box-sizing:border-box}#quick-catalog h1{font-size:clamp(24px,4vw,36px);margin:0}
 #quick-catalog nav,#quick-catalog .quick-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0}
 #quick-catalog button,#quick-catalog a{font:inherit;min-height:44px;padding:8px 12px;border:1px solid #aaa;border-radius:8px;background:white;color:#222;text-decoration:none}
 #quick-catalog :focus-visible{outline:3px solid #4538be;outline-offset:3px}
 #quick-catalog article{border:1px solid #ddd;border-radius:12px;padding:16px;background:white;overflow-wrap:anywhere}
 #quick-catalog img{display:block;width:100%;height:240px;object-fit:contain}
 #quick-catalog .quick-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px}
 #quick-catalog [role=status]{min-height:24px}#quick-catalog .quick-store{display:block;text-align:left;width:100%}
 `;root.append(style);
 const title=el('h1','MAXI Online · быстрый каталог');root.append(title);
 const nav=el('nav');nav.setAttribute('aria-label','Каталог');
 const mall=el('a','Открыть 3D-ТРЦ');const mallUrl=new URL(location.href);mallUrl.searchParams.delete('catalog');mall.href=mallUrl.href;
 const looks=el('button','Мои фотообразы');looks.onclick=openPhotoLook;nav.append(mall,looks);root.append(nav);
 root.append(el('p',reason||'Каталог доступен без загрузки 3D.'));
 root.append(el('p','Магазины перечислены по доступным файлам каталога. Это не подтверждение партнёрства или наличия в Туле.'));
 const status=el('p','Загрузка магазинов…');status.setAttribute('role','status');root.append(status);
 const content=el('section');content.setAttribute('aria-label','Магазины и товары');root.append(content);
 // Remove inaccessible background from keyboard/screen reader navigation.
 for(const child of document.body.children)if(child.id!=='quick-catalog')child.inert=true;
 document.body.append(root);title.tabIndex=-1;title.focus();
 let request=0;
 async function showStores(){
  const token=++request;content.replaceChildren();status.textContent='Загрузка магазинов…';
  try{
   const index=await read('feeds/index.json');if(token!==request)return;
   const stores=Object.entries(index?.shops||{}).filter(([,entry])=>entry&&feedPath(entry.file));
   status.textContent=stores.length?'Выберите магазин.':'Нет доступных каталогов.';
   for(const [name,entry] of stores){
    const button=el('button',name+(index.demo===true?' · демонстрация':''));button.className='quick-store';button.onclick=()=>showStore(name,entry,index);content.append(button);
   }
  }catch{if(token!==request)return;status.textContent='Не удалось загрузить список магазинов. Повторите попытку.';const retry=el('button','Повторить загрузку');retry.onclick=showStores;content.append(retry);}
 }
 async function showStore(name,entry,index){
  const token=++request;content.replaceChildren();status.textContent='Загрузка каталога…';
  const back=el('button','← К магазинам');back.onclick=showStores;content.append(back);
  try{
   const feed=await read(feedPath(entry.file));if(token!==request)return;
   // Index-level demo flag applies even if the individual feed omits it.
   const products=catalogueProducts({...feed,demo:feed.demo===true||index.demo===true});
   const h=el('h2',name);h.tabIndex=-1;content.append(h);h.focus();
   content.append(el('p',feed.demo===true||index.demo===true?'Демонстрационный каталог: товары, цены и ссылки тестовые.':'Данные каталога поставщика; сведения и права требуют отдельной проверки.'));
   status.textContent=products.length?`Товаров: ${products.length}`:'В каталоге нет доступных товаров.';
   const grid=el('div');grid.className='quick-grid';content.append(grid);
   for(const product of products){
    const card=el('article');card.append(el('h3',product.name),el('p',product.deptTitle));
    if(product.image){const image=el('img');image.src=product.image;image.alt=product.name;image.loading='lazy';image.onerror=()=>image.replaceWith(el('p','Изображение недоступно.'));card.append(image);}
    else card.append(el('p','Исходное изображение не подтверждено.'));
    card.append(el('p',product.price===null?'Цена не указана':new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(product.price)));
    const evidence=product.evidence,stock=evidence.availability;
    card.append(el('p',evidence.demo?'Демонстрационный товар':'Источник: '+(feed.source||evidence.sourceType)));
    card.append(el('p','Дата проверки: '+(evidence.lastCheckedAt?new Date(evidence.lastCheckedAt).toLocaleDateString('ru-RU'):'не указана')+'. Дата проверки каталога не подтверждает остатки.'));
    const local=stock.scope==='physical_store_tula'&&stock.status!==AVAILABILITY.UNKNOWN;
    card.append(el('p',local?(stock.status===AVAILABILITY.IN_STOCK?'Подтверждено наличие в магазине Тулы.':'Подтверждено отсутствие в магазине Тулы.'):'Наличие именно в ТРЦ «Макси» не подтверждено.'));
    const controls=el('div');controls.className='quick-controls';
    const favorite=el('button','Сохранить товар в избранное');favorite.onclick=()=>{
     if(favorites.add(product,{name},product.image)){favorite.textContent='Сохранено в избранное ✓';status.textContent='Товар сохранён в этом браузере. Избранное доступно в «Мои фотообразы».';}
     else status.textContent=favorites.message();
    };controls.append(favorite);
    if(product.image){const add=el('button','Добавить изображение в образ');add.onclick=()=>{
     if(addToPhotoLook(product,{name},product.image)){status.textContent='Товар добавлен в образ.';openPhotoLook();}
     else status.textContent=photoLookMessage()||'Не удалось добавить товар. Лимит образа — 24 вещи.';
    };controls.append(add);}
    if(product.url){const link=el('a','Страница товара у продавца ↗');link.href=product.url;link.target='_blank';link.rel='noopener noreferrer';controls.append(link);}
    card.append(controls);grid.append(card);
   }
  }catch{if(token!==request)return;status.textContent='Не удалось загрузить каталог магазина. Повторите попытку или выберите другой магазин.';const retry=el('button','Повторить загрузку каталога');retry.onclick=()=>showStore(name,entry,index);content.append(retry);}
 }
 await showStores();
}
