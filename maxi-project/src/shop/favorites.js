// FR-SAVE-001: independent, versioned local product snapshots, with or without images.
import {createLookStore} from './photo-looks/storage.js';
import {productSnapshot} from './product-snapshot.js';
export const FAVORITES_KEY='maxi-photo-favorites-v2';
export const MAX_FAVORITES=200;
export function createFavorites(storage){
 const store=createLookStore(storage,{key:FAVORITES_KEY,legacyKey:null,maxItems:MAX_FAVORITES,allowMissingImages:true});
 let limitMessage='';
 return {
  items:()=>store.items(),message:()=>limitMessage||store.message(),
  has(product,shop){return store.items().some(x=>x.id===productSnapshot(product,shop,null).id);},
  add(product,shop,image){
   limitMessage='';const entry=productSnapshot(product,shop,image),items=store.items().filter(x=>x.id!==entry.id);
   if(items.length>=MAX_FAVORITES){limitMessage='В избранном уже 200 товаров. Удалите ненужный перед добавлением.';return false;}
   return store.setDraft([...items,entry]);
  },
  remove(id){limitMessage='';return store.setDraft(store.items().filter(x=>x.id!==id));},
 };
}
export const favorites=createFavorites({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
