// Точка входа Vite: шрифты, стили, данные карты обоих этажей → startApp (app.js).
import './core/fonts.js';
import './style.css';
import data from './data/maxi-data.json';
import floor2 from './data/maxi-floor2.json';
// Keep the usable catalogue outside the heavy 3D module graph.
async function launch(){
  const fallback=async reason=>{const {openQuickCatalog}=await import('./shop/quick-catalog.js');await openQuickCatalog(reason);};
  if(new URLSearchParams(location.search).has('catalog')){await fallback();return;}
  let gl;
  try{const probe=document.createElement('canvas');gl=probe.getContext('webgl2')||probe.getContext('webgl');}catch{}
  if(!gl){await fallback('3D недоступно в этом браузере. Вы можете выбрать товары и сохранить образ в каталоге.');return;}
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  try{const {startApp}=await import('./app.js');await startApp(data,floor2);}
  catch(error){console.error('3D startup failed',error);await fallback('Не удалось запустить 3D. Каталог остаётся доступен.');}
}
launch();

// контакт для правообладателей: VITE_CONTACT в .env (почта или ссылка на Telegram); пусто — строка скрыта
{
  const c = (import.meta.env && import.meta.env.VITE_CONTACT || '').trim();
  const p = document.getElementById('contactP'), a = document.getElementById('contactA');
  if (c && p && a) { a.textContent = c.replace(/^mailto:/, '').replace(/^https?:\/\//, ''); a.href = /^(https?:|mailto:)/.test(c) ? c : (c.includes('@') ? 'mailto:' + c : '#'); p.hidden = false; }
}
