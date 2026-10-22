// Photo-first, source-image-only outfit board (PRD FR-LOOK-001/002/003).
// It intentionally does not manipulate product pixels or simulate fit.
import {safeHttpUrl} from './catalog-evidence.js';
const KEY='maxi-photo-looks-v1';
const MAX=24;
function imageUrl(input){return typeof input==='string' && input.startsWith('/') && !input.startsWith('//') ? input : safeHttpUrl(input);}
function read() {
  try {const p=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(p)?p.filter(valid).slice(0,MAX):[];}
  catch{return [];}
}
function valid(x){return x && typeof x.id==='string' && typeof x.title==='string' && typeof x.image==='string' &&
  Boolean(imageUrl(x.image));}
function persist(items){try{localStorage.setItem(KEY,JSON.stringify(items));return true;}catch{return false;}}
let items=read();
export function photoLookItems(){return items.slice();}
export function addToPhotoLook(product,store,image){
  if(!imageUrl(image))return false;
  const id=String(store?.name||'')+'|'+String(product?.id||product?.name||'')+'|'+String(product?.color||'');
  const entry={id,title:String(product?.name||'Товар'),shop:String(store?.name||''),image,sourceUrl:safeHttpUrl(product?.url)||null};
  if(!valid(entry))return false;
  const next=[...items.filter(x=>x.id!==id),entry].slice(-MAX);
  if(!persist(next))return false;
  items=next;return true;
}
export function removeFromPhotoLook(id){
  const next=items.filter(x=>x.id!==id);
  if(!persist(next))return false;
  items=next;return true;
}
export function movePhotoLook(id,dir){
  const n=items.findIndex(x=>x.id===id),m=n+dir;
  if(n<0||m<0||m>=items.length)return false;
  const next=items.slice();[next[n],next[m]]=[next[m],next[n]];
  if(!persist(next))return false;
  items=next;return true;
}
export function openPhotoLook(){
  const existing=document.getElementById('maxi-photo-look');if(existing){existing.querySelector('[data-close-photo-look]')?.click();return;}
  const root=document.createElement('section');root.id='maxi-photo-look';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Сопоставить фотографии товаров');
  Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'99999',background:'#f8f8fa',overflowY:'auto',padding:'20px',color:'#222',fontFamily:'system-ui,sans-serif'});
  const previousFocus=document.activeElement;
  const dismiss=()=>{document.removeEventListener('keydown',handleEscape,true);root.remove();if(previousFocus?.isConnected)previousFocus.focus();};
  const handleEscape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}};
  document.addEventListener('keydown',handleEscape,true);
  const render=()=>{
    root.replaceChildren();
    const head=document.createElement('header');Object.assign(head.style,{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'center'});
    const h=document.createElement('h2');h.textContent='Мой образ · фотографии товаров';const close=document.createElement('button');close.textContent='Закрыть ×';close.dataset.closePhotoLook='true';close.onclick=dismiss;head.append(h,close);root.append(head);
    const note=document.createElement('p');note.textContent='Это сопоставление изображений из товарных каталогов, иногда обработанных для витрин. Не является примеркой: размеры, пропорции и посадка не прогнозируются.';root.append(note);
    if(!items.length){const empty=document.createElement('p');empty.textContent='Добавь вещи из карточек разных магазинов.';root.append(empty);}
    const grid=document.createElement('div');Object.assign(grid.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:'14px'});
    for(const it of items){
      const card=document.createElement('article');Object.assign(card.style,{border:'1px solid #ddd',borderRadius:'12px',padding:'12px',background:'white'});
      const img=document.createElement('img');img.src=it.image;img.alt=it.title;img.loading='lazy';Object.assign(img.style,{display:'block',width:'100%',height:'240px',objectFit:'contain'});
      const title=document.createElement('h3');title.textContent=it.title;const shop=document.createElement('p');shop.textContent=it.shop;
      const controls=document.createElement('div');Object.assign(controls.style,{display:'flex',gap:'8px',flexWrap:'wrap'});
      for(const [label,fn] of [['←',()=>movePhotoLook(it.id,-1)],['→',()=>movePhotoLook(it.id,1)],['Удалить',()=>removeFromPhotoLook(it.id)]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{fn();render();};controls.append(b);}
      card.append(img,title,shop,controls);
      if(it.sourceUrl){const link=document.createElement('a');link.href=it.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Страница товара ↗';card.append(link);}
      grid.append(card);
    }
    root.append(grid);
  };

  document.body.append(root);render();closeFocus();
  function closeFocus(){root.querySelector('button')?.focus();}
}
