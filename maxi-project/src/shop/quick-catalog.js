// NFR-006 / FR-MALL-005: a catalogue path that never imports the 3D application.
import {cataloguePage} from './catalog-page.js';
import {catalogueProducts,feedPath,visibleStoreEntry,validFeedDocument} from './catalog-feed.js';
import {addToPhotoLook,openPhotoLook,photoLookMessage} from './photo-looks.js';
import {favorites} from './favorites.js';
import {watchInventory,physicalStockText} from './inventory-watch.js';
const el=(tag,text)=>Object.assign(document.createElement(tag),text===undefined?{}:{textContent:text});
async function read(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(url,{cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timer);}
}
let disposePrevious=()=>{};
export async function openQuickCatalog(reason=''){
 disposePrevious();
 document.getElementById('quick-catalog')?.remove();
 const root=el('main');root.id='quick-catalog';
 const style=el('style');style.textContent=`
 #quick-catalog{position:fixed;inset:0;overflow:auto;z-index:9998;padding:clamp(16px,4vw,40px);background:#f8f8fa;color:#222;color-scheme:light;font:16px/1.5 system-ui,sans-serif}
 #quick-catalog *{box-sizing:border-box}#quick-catalog h1{font-size:clamp(24px,4vw,36px);margin:0}
 #quick-catalog nav,#quick-catalog .quick-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0}
 #quick-catalog button,#quick-catalog a,#quick-catalog input{font:inherit;min-height:44px;padding:8px 12px;border:1px solid #aaa;border-radius:8px;background:white;color:#222;text-decoration:none}
 #quick-catalog :focus-visible{outline:3px solid #4538be;outline-offset:3px}
 #quick-catalog .quick-pagination{gap:8px}#quick-catalog .quick-pagination button{min-width:44px}
 #quick-catalog input{width:min(100%,420px);min-width:0}#quick-catalog label{display:block}
 #quick-catalog article{border:1px solid #ddd;border-radius:12px;padding:16px;background:white;overflow-wrap:anywhere}
 #quick-catalog img{display:block;width:100%;height:240px;object-fit:contain}
 #quick-catalog .quick-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px}
 #quick-catalog [role=status]{min-height:24px}#quick-catalog .quick-store{display:block;text-align:left;width:100%}
 `;root.append(style);
 const title=el('h1','MAXI Online · быстрый каталог');root.append(title);
 const nav=el('nav');nav.setAttribute('aria-label','Каталог');
 const mall=el('a','Открыть 3D-ТРЦ');const mallUrl=new URL(location.href);mallUrl.searchParams.delete('catalog');mall.href=mallUrl.href;
 const looks=el('button','Мои фотообразы');looks.onclick=openPhotoLook;nav.append(mall,looks);root.append(nav);
 root.append(el('p',reason||'Выберите магазин и соберите образ.'));
 const about=el('details'),aboutTitle=el('summary','Откуда данные');about.append(aboutTitle,el('p','Магазины перечислены по доступным файлам каталога. Это не подтверждение партнёрства или наличия в Туле.'));root.append(about);
 const status=el('p','Загрузка магазинов…');status.setAttribute('role','status');root.append(status);
 const content=el('section');content.setAttribute('aria-label','Магазины и товары');root.append(content);
 // Remove inaccessible background from keyboard/screen reader navigation.
 for(const child of document.body.children)if(child.id!=='quick-catalog')child.inert=true;
 root.addEventListener('keydown',event=>event.stopPropagation());
 document.body.append(root);title.tabIndex=-1;title.focus();
 let request=0,stopInventory=()=>{};disposePrevious=()=>stopInventory();
 async function showStores(focusName=null){
  stopInventory();const token=++request;content.replaceChildren();status.textContent='Загрузка магазинов…';
  if(focusName)title.focus();
  try{
   const index=await read('feeds/index.json');if(token!==request)return;
   // A malformed index is a loading error, not evidence of an empty mall.
   // Keep the retry control instead of silently reporting no catalogues.
   if(!index || !index.shops || typeof index.shops!=='object' || Array.isArray(index.shops))throw Error('Invalid catalogue index');
   const stores=Object.entries(index.shops).filter(([,entry])=>visibleStoreEntry(entry));
   status.textContent=stores.length?'Выберите магазин.':'Нет доступных каталогов.';
   for(const [name,entry] of stores){
    const button=el('button',name+(Boolean(index.demo)?' · демонстрация':''));button.className='quick-store';button.onclick=()=>showStore(name,entry,index);content.append(button);
    if(focusName===name)button.focus();
   }
  }catch{if(token!==request)return;status.textContent='Не удалось загрузить список магазинов. Повторите попытку.';const retry=el('button','Повторить загрузку');retry.onclick=()=>showStores(focusName);content.append(retry);}
 }
 async function showStore(name,entry,index){
  stopInventory();const token=++request;content.replaceChildren();status.textContent='Загрузка каталога…';
  const back=el('button','← К магазинам');back.onclick=()=>showStores(name);content.append(back);back.focus();
  try{
   const feed=await read(feedPath(entry.file));if(token!==request)return;
   if(!validFeedDocument(feed))throw Error('Invalid catalogue document');
   // Index-level demo flag applies even if the individual feed omits it.
   const isDemo=Boolean(feed.demo||index.demo);
   const products=catalogueProducts({...feed,demo:isDemo});
   const h=el('h2',name);h.tabIndex=-1;content.append(h);h.focus();
   content.append(el('p',isDemo?'Демонстрационный каталог: товары, цены и ссылки тестовые.':'Данные каталога поставщика; сведения и права требуют отдельной проверки.'));
   status.textContent=products.length?`Товаров: ${products.length}`:'В каталоге нет доступных товаров.';
   const search=el('input');search.type='search';search.id='quick-product-query';search.placeholder='Название, категория или цвет';
   const label=el('label','Поиск в каталоге');label.htmlFor=search.id;
   const pagination=el('nav');pagination.setAttribute('aria-label','Страницы товаров');pagination.className='quick-pagination';
   const previous=el('button','←'),next=el('button','→'),pageLabel=el('span');previous.setAttribute('aria-label','Предыдущая страница');next.setAttribute('aria-label','Следующая страница');pagination.append(previous,pageLabel,next);
   if(products.length)content.append(label,search,pagination);
   const grid=el('div');grid.className='quick-grid';content.append(grid);
   let currentPage=0;
   const render=()=>{
    if(token!==request)return;
    const selected=cataloguePage(products,{query:search.value,page:currentPage});currentPage=selected.page;
    previous.disabled=currentPage===0;next.disabled=currentPage>=selected.pageCount-1;
    pageLabel.textContent=`Страница ${currentPage+1} из ${selected.pageCount}`;
    status.textContent=!products.length?'В каталоге нет доступных товаров.':!selected.total?'По запросу ничего не найдено.':`Товаров: ${selected.total} · ${pageLabel.textContent}`;
    stopInventory();const stockEntries=[];grid.replaceChildren();
    for(const product of selected.items){
    const card=el('article');card.append(el('h3',product.name),el('p',product.deptTitle));
    if(product.image){const image=el('img');image.src=product.image;image.alt=product.name;image.loading='lazy';image.onerror=()=>image.replaceWith(el('p','Изображение недоступно.'));
    const imageLabel=product.image===product.evidence.originalImage
      ? 'Фото по исходной ссылке из каталога. Права на использование не подтверждены.'
      : 'Обработанное демонстрационное превью, не исходная фотография.';
    card.append(image,el('p',imageLabel));}
    else card.append(el('p','Исходное изображение не подтверждено.'));
    card.append(el('p',product.price===null?'Цена не указана':new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(product.price)));
    const evidence=product.evidence;
    card.append(el('p',evidence.demo?'Демонстрационный товар':'Источник: '+(feed.source||evidence.sourceType)));
    card.append(el('p','Дата проверки: '+(evidence.lastCheckedAt?new Date(evidence.lastCheckedAt).toLocaleDateString('ru-RU'):'не указана')+'. Дата проверки каталога не подтверждает остатки.'));
    const stockNote=el('p');card.append(stockNote);stockEntries.push({raw:{...product,demo:evidence.demo},note:stockNote});
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
    stopInventory=watchInventory(stockEntries,(entry,stock,previous)=>{entry.note.textContent=physicalStockText(stock);if(previous?.scope==='physical_store_tula'&&previous.status!=='unknown'&&stock.status==='unknown'){const notice='Подтверждение наличия устарело. Уточните наличие у продавца.';if(status.textContent!==notice)status.textContent=notice;}},{isActive:()=>root.isConnected&&token===request});
   };
   previous.onclick=()=>{currentPage--;render();(previous.disabled?next:previous).focus();pagination.scrollIntoView({block:'start'});};
   next.onclick=()=>{currentPage++;render();(next.disabled?previous:next).focus();pagination.scrollIntoView({block:'start'});};
   search.oninput=()=>{currentPage=0;render();};
   render();
  }catch{if(token!==request)return;status.textContent='Не удалось загрузить каталог магазина. Повторите попытку или выберите другой магазин.';const retry=el('button','Повторить загрузку каталога');retry.onclick=()=>showStore(name,entry,index);content.append(retry);if(document.activeElement===back)retry.focus();}
 }
 await showStores();
}
