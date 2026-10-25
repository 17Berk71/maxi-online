// Photo-first, source-image-only outfit board (PRD FR-LOOK-001/002/003).
// It intentionally does not manipulate product pixels or simulate fit.
import {productSnapshot} from './product-snapshot.js';
import {favorites} from './favorites.js';
import {createLookStore, imageUrl, MAX_ITEMS} from './photo-looks/storage.js';
const store=createLookStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
export const photoLookItems=()=>store.items();
export const savedPhotoLooks=()=>store.looks();
export const photoLookMessage=()=>store.message();
export const savePhotoLook=name=>store.save(name);
export const loadPhotoLook=id=>store.load(id);
export const deletePhotoLook=id=>store.remove(id);
export function addToPhotoLook(product,shop,image){
  if(!imageUrl(image))return false;
  const entry=productSnapshot(product,shop,image);
  const id=entry.id;
  const next=store.items().filter(x=>x.id!==id);
  if(next.length>=MAX_ITEMS)return false;
  return store.setDraft([...next,entry]);
}
export function removeFromPhotoLook(id){return store.setDraft(store.items().filter(x=>x.id!==id));}
export function movePhotoLook(id,dir){
  const items=store.items(),n=items.findIndex(x=>x.id===id),m=n+dir;
  if(![-1,1].includes(dir)||n<0||m<0||m>=items.length)return false;
  [items[n],items[m]]=[items[m],items[n]];
  return store.setDraft(items);
}
export function openPhotoLook(){
  const existing=document.getElementById('maxi-photo-look');if(existing){existing.querySelector('[data-close-photo-look]')?.click();return;}
  const root=document.createElement('section');root.id='maxi-photo-look';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Сопоставить фотографии товаров');
  const style=document.createElement('style');style.textContent=`
    #maxi-photo-look *{box-sizing:border-box}
    #maxi-photo-look button,#maxi-photo-look input{font:inherit;min-height:44px;padding:8px 12px;border:1px solid #aaa;border-radius:8px}
    #maxi-photo-look button{cursor:pointer;background:#fff;color:#222}
    #maxi-photo-look button:disabled{cursor:default;opacity:.5}
    #maxi-photo-look :focus-visible{outline:3px solid #4538be;outline-offset:3px}
    #maxi-photo-look h2{font-size:clamp(20px,4vw,28px)}
    #maxi-photo-look a,#maxi-photo-look h3{overflow-wrap:anywhere}
    #maxi-photo-look .photo-look-save,#maxi-photo-look .photo-look-saved-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}
    #maxi-photo-look input{max-width:100%;min-width:0}
    #maxi-photo-look .photo-look-saved-row span{overflow-wrap:anywhere;max-width:100%}
  `;
  document.head.append(style);
  Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'99999',background:'#f8f8fa',colorScheme:'light',overflowY:'auto',padding:'20px',color:'#222',fontFamily:'system-ui,sans-serif'});
  const previousFocus=document.activeElement;
  const background=[...document.body.children].map(el=>[el,el.inert]);
  for(const [el] of background)el.inert=true;
  root.addEventListener('keydown',e=>e.stopPropagation());
  const dismiss=()=>{document.removeEventListener('keydown',handleEscape,true);root.remove();style.remove();for(const [el,inert] of background)el.inert=inert;if(previousFocus?.isConnected)previousFocus.focus();};
  const handleEscape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();return;}
    if(e.key==='Tab') {const controls=[...root.querySelectorAll('button,a[href],input')].filter(x=>!x.disabled);
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}
    }
  };
  document.addEventListener('keydown',handleEscape,true);
  // Keep the live region mounted across edits. Replacing an already-populated
  // status element can prevent screen readers from announcing the update.
  const head=document.createElement('header');Object.assign(head.style,{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'center'});
  const h=document.createElement('h2');h.textContent='Мой образ · фотографии товаров';const close=document.createElement('button');close.textContent='Закрыть ×';close.dataset.closePhotoLook='true';close.onclick=dismiss;head.append(h,close);
  const note=document.createElement('p');note.textContent='Это сопоставление изображений из товарных каталогов, иногда обработанных для витрин. Не является примеркой: размеры, пропорции и посадка не прогнозируются.';
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const body=document.createElement('div');
  root.append(head,note,status,body);
  const render=(focusId=null,focusAction=null,notice='')=>{
    const items=store.items();
    // Rebuilding the form after a reorder/delete must not erase an unsaved name.
    const pendingName=root.querySelector('#photo-look-name')?.value||'';
    body.replaceChildren();
    status.textContent=notice||store.message();
    const saveForm=document.createElement('form');saveForm.className='photo-look-save';
    const label=document.createElement('label');label.textContent='Название образа';label.htmlFor='photo-look-name';
    const name=document.createElement('input');name.id='photo-look-name';name.maxLength=80;name.required=true;name.placeholder='Например, прогулка осенью';name.value=pendingName;
    const save=document.createElement('button');save.type='submit';save.textContent='Сохранить образ';save.disabled=!items.length;
    saveForm.append(label,name,save);saveForm.onsubmit=e=>{e.preventDefault();
      if(!savePhotoLook(name.value)){status.textContent=store.message();return;}
      name.value='';render(null,null,'Образ сохранён в этом браузере.');root.querySelector('#photo-look-name')?.focus();
    };body.append(saveForm);
    const saved=document.createElement('section');saved.setAttribute('aria-label','Сохранённые образы');
    const heading=document.createElement('h3');heading.textContent='Сохранённые образы';saved.append(heading);
    const privacy=document.createElement('p');privacy.textContent='Хранятся только в этом браузере. Очистка данных браузера удалит образы. Это снимки каталога: товары, фото и ссылки могли измениться; проверьте актуальность у продавца.';saved.append(privacy);
    const savedLooks=store.looks();
    for(const [lookIndex,look] of savedLooks.entries()){
      const row=document.createElement('div');row.className='photo-look-saved-row';
      const title=document.createElement('span');title.textContent=look.name+' · '+look.items.length+' шт. · '+new Date(look.createdAt).toLocaleDateString('ru-RU');
      const load=document.createElement('button');load.textContent='Открыть';load.setAttribute('aria-label','Открыть образ «'+look.name+'»');
      load.onclick=()=>{if(!loadPhotoLook(look.id)){status.textContent=store.message();return;}render(null,null,'Образ открыт. Текущая композиция заменена сохранённой.');root.querySelector('[data-close-photo-look]')?.focus();};
      const remove=document.createElement('button');remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить сохранённый образ «'+look.name+'»');
      remove.dataset.savedLookId=look.id;
      remove.onclick=()=>{
        const neighbor=savedLooks[lookIndex+1]||savedLooks[lookIndex-1];
        if(!deletePhotoLook(look.id)){status.textContent=store.message();return;}
        render(null,null,'Сохранённый образ удалён.');
        // Keep focus in the saved-look list when another entry remains.
        const target=neighbor?[...root.querySelectorAll('button[data-saved-look-id]')].find(b=>b.dataset.savedLookId===neighbor.id):null;
        (target||root.querySelector('#photo-look-name'))?.focus();
      };
      row.append(title,load,remove);saved.append(row);
    }
    if(!items.length){const empty=document.createElement('p');empty.textContent='Добавь вещи из карточек разных магазинов.';body.append(empty);}
    const grid=document.createElement('div');Object.assign(grid.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:'14px'});
    for(const [index,it] of items.entries()){
      const card=document.createElement('article');Object.assign(card.style,{border:'1px solid #ddd',borderRadius:'12px',padding:'12px',background:'white'});
      const img=document.createElement('img');img.src=it.image;img.alt=it.title;img.loading='lazy';img.onerror=()=>{img.replaceWith(Object.assign(document.createElement('p'),{textContent:it.sourceUrl?'Изображение недоступно. Откройте страницу товара.':'Изображение недоступно. Ссылка на товар не подтверждена.'}));};Object.assign(img.style,{display:'block',width:'100%',height:'240px',objectFit:'contain'});
      const title=document.createElement('h3');title.textContent=it.title;const shop=document.createElement('p');shop.textContent=it.shop;
      // Make the ordering understandable without relying on visual card positions.
      const position=document.createElement('p');position.className='photo-look-position';position.textContent=`Позиция ${index+1} из ${items.length}`;
      const controls=document.createElement('div');Object.assign(controls.style,{display:'flex',gap:'8px',flexWrap:'wrap'});
      for(const [action,label,fn] of [['left','←',()=>movePhotoLook(it.id,-1)],['right','→',()=>movePhotoLook(it.id,1)],['remove','Удалить',()=>removeFromPhotoLook(it.id)]]){
        const b=document.createElement('button');b.textContent=label;
        b.dataset.photoLookId=it.id;b.dataset.photoLookAction=action;
        b.disabled=(action==='left'&&index===0)||(action==='right'&&index===items.length-1);
        b.setAttribute('aria-label',action==='left'?'Переместить «'+it.title+'» влево':action==='right'?'Переместить «'+it.title+'» вправо':'Удалить «'+it.title+'»');
        b.onclick=()=>{
          const neighbor=items[index+1]||items[index-1];
          if(fn()===false){status.textContent=store.message();return;}
          const focusId=action==='remove'?neighbor?.id:it.id;
          const focusAction=action==='remove'?'remove':action==='left'?(index===1?'right':'left'):(index===items.length-2?'left':'right');
          render(focusId,focusAction,action==='remove'?'Товар удалён из образа.':`Позиция товара «${it.title}»: ${index+(action==='left'?-1:1)+1} из ${items.length}.`);
        };
        controls.append(b);
      }
      card.append(img,title,shop,position,controls);
      if(it.demo){const demo=document.createElement('p');demo.textContent='Демонстрационный товар';card.append(demo);}
      if(it.sourceUrl){const link=document.createElement('a');link.href=it.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Страница товара ↗';card.append(link);}
      grid.append(card);
    }
    const favoritesSection=document.createElement('section');favoritesSection.setAttribute('aria-label','Избранные товары');
    const favoritesTitle=document.createElement('h3');favoritesTitle.textContent='Избранные товары';favoritesSection.append(favoritesTitle);
    const favoritesNote=document.createElement('p');favoritesNote.textContent='Сохранённые снимки товаров в этом браузере. Наличие, фото и ссылки могли измениться.';favoritesSection.append(favoritesNote);
    const favoriteItems=favorites.items();
    for(const [favoriteIndex,entry] of favoriteItems.entries()){
      const row=document.createElement('div');row.className='photo-look-saved-row';
      const title=document.createElement('span');title.textContent=entry.title+' · '+entry.shop+(entry.demo?' · демонстрация':'');row.append(title);
      const add=document.createElement('button');add.textContent='В образ';add.disabled=!entry.image;add.setAttribute('aria-label','Добавить «'+entry.title+'» из избранного в образ');add.dataset.favoriteAddId=entry.id;
      add.onclick=()=>{
        const next=store.items().filter(x=>x.id!==entry.id);
        if(next.length>=MAX_ITEMS){status.textContent='В образе может быть не больше 24 вещей.';return;}
        if(!store.setDraft([...next,entry])){status.textContent=store.message();return;}
        render(null,null,'Товар из избранного добавлен в образ.');
        // Adding a favorite rebuilds the list but does not remove the favorite.
        // Restore its action instead of unexpectedly jumping to Close.
        const target=[...root.querySelectorAll('button[data-favorite-add-id]')].find(b=>b.dataset.favoriteAddId===entry.id&&!b.disabled);
        (target||root.querySelector('[data-close-photo-look]'))?.focus();
      };
      const remove=document.createElement('button');remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить «'+entry.title+'» из избранного');
      remove.dataset.favoriteId=entry.id;
      remove.onclick=()=>{
        const neighbor=favoriteItems[favoriteIndex+1]||favoriteItems[favoriteIndex-1];
        if(!favorites.remove(entry.id)){status.textContent=favorites.message();return;}
        render(null,null,'Товар удалён из избранного.');
        // Prefer the next (or previous) favorite instead of jumping away from
        // the list after the focused removal button disappears.
        const target=neighbor?[...root.querySelectorAll('button[data-favorite-id]')].find(b=>b.dataset.favoriteId===neighbor.id):null;
        (target||root.querySelector('[data-close-photo-look]'))?.focus();
      };
      row.append(add,remove);
      if(!entry.image){const missing=document.createElement('span');missing.textContent='Исходное фото недоступно.';row.append(missing);}
      if(entry.sourceUrl){const link=document.createElement('a');link.href=entry.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Страница товара ↗';row.append(link);}
      favoritesSection.append(row);
    }
    if(favorites.message()){const warning=document.createElement('p');warning.textContent=favorites.message();favoritesSection.append(warning);}
    body.append(grid,saved,favoritesSection);
    if(focusId){
      const target=[...root.querySelectorAll('button')].find(b=>b.dataset.photoLookId===focusId&&b.dataset.photoLookAction===focusAction&&!b.disabled);
      (target||root.querySelector('[data-close-photo-look]'))?.focus();
    }else if(focusAction==='remove'){
      // Removing the last draft item destroys the focused button. Keep keyboard
      // focus inside the dialog instead of dropping it onto the inert page.
      root.querySelector('[data-close-photo-look]')?.focus();
    }
  };

  document.body.append(root);render();closeFocus();
  function closeFocus(){root.querySelector('button')?.focus();}
}
