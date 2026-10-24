// FR-SAVE-002: versioned, transactional browser-only look snapshots.
import {parseIsoTimestamp, safeHttpUrl} from '../catalog-evidence.js';
export const LEGACY_KEY='maxi-photo-looks-v1';
export const STORAGE_KEY='maxi-photo-looks-v2';
export const MAX_ITEMS=24, MAX_LOOKS=30;
export function imageUrl(input){
  if(typeof input!=='string')return null;
  if(!/[\\\s\u0000-\u001f]/.test(input)){
    if(input.startsWith('/')&&!input.startsWith('//'))return input;
    // Imported previews are relative to the app root (including subdirectory deployments).
    if(/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(input)&&!input.split('/').some(x=>x==='..'||x==='.'))return input;
  }
  return safeHttpUrl(input);
}
function normalizeItems(input,maxItems=MAX_ITEMS,allowMissingImages=false){
  if(!Array.isArray(input))return [];
  const seen=new Set();
  return input.filter(x=>x && typeof x.id==='string' && typeof x.title==='string' && (imageUrl(x.image)||(allowMissingImages&&x.image===null)))
    .filter(x=>!seen.has(x.id)&&seen.add(x.id)).slice(0,maxItems).map(x=>({
      id:x.id,title:x.title,shop:typeof x.shop==='string'?x.shop:'',image:imageUrl(x.image),
      sourceUrl:x.demo===true?null:safeHttpUrl(x.sourceUrl),demo:x.demo===true,
    }));
}
const copy=x=>JSON.parse(JSON.stringify(x));
export function createLookStore(storage, {now=()=>new Date().toISOString(),newId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),key=STORAGE_KEY,legacyKey=LEGACY_KEY,maxItems=MAX_ITEMS,allowMissingImages=false}={}){
  let state={version:2,draft:[],looks:[]}, raw=null, blocked=false, warning='';
  try{
    raw=storage.getItem(key);
    if(raw!==null){
      const data=JSON.parse(raw);
      if(data?.version!==2||!Array.isArray(data.draft)||!Array.isArray(data.looks))throw Error('Unsupported storage');
      const ids=new Set();
      state={version:2,draft:normalizeItems(data.draft,maxItems,allowMissingImages),looks:data.looks.filter(x=>x && typeof x.id==='string' &&
        typeof x.name==='string' && typeof x.createdAt==='string' && Number.isFinite(parseIsoTimestamp(x.createdAt)) &&
        Array.isArray(x.items) && !ids.has(x.id) && ids.add(x.id)).slice(0,MAX_LOOKS)
        .map(x=>({id:x.id,name:x.name.slice(0,80),createdAt:x.createdAt,items:normalizeItems(x.items,maxItems,allowMissingImages)}))};
      // Never overwrite a partly recovered v2 snapshot: dropped entries, duplicate IDs or
      // truncated collections must remain recoverable from the untouched raw storage.
      if(state.draft.length!==data.draft.length||state.looks.length!==data.looks.length||
        state.looks.some((look,i)=>look.items.length!==data.looks[i].items.length))
        throw Error('Stored collection would lose entries during normalization');
    }else{
      const legacy=JSON.parse((legacyKey?storage.getItem(legacyKey):null)||'[]');
      if(!Array.isArray(legacy))throw Error('Invalid legacy storage');
      state.draft=normalizeItems(legacy,maxItems,allowMissingImages);
    }
  }catch{
    blocked=true;
    warning='Не удалось прочитать сохранённые образы. Исходные данные сохранены; запись отключена, чтобы их не потерять.';
  }
  function commit(next){
    if(blocked)return false;
    try{
      // Refuse stale-tab edits instead of overwriting another tab's saved work.
      if(storage.getItem(key)!==raw){warning='Образы изменены в другой вкладке. Перезагрузите страницу перед изменениями.';return false;}
      const encoded=JSON.stringify(next);
      storage.setItem(key,encoded);raw=encoded;state=next;warning='';return true;
    }catch{warning='Не удалось сохранить изменения. Проверьте настройки браузера.';return false;}
  }
  return {
    items:()=>copy(state.draft),looks:()=>copy(state.looks),message:()=>warning,
    setDraft(items){
      // Do not report success after silently discarding invalid, duplicate or excess items.
      // Callers must resolve the problem rather than losing products on the next write.
      const normalized=normalizeItems(items,maxItems,allowMissingImages);
      if(!Array.isArray(items)||normalized.length!==items.length){
        warning='Не удалось сохранить образ: список содержит повреждённые, повторяющиеся или лишние товары.';
        return false;
      }
      return commit({...state,draft:normalized});
    },
    save(name){
      name=typeof name==='string'?name.trim().slice(0,80):'';
      if(!name||!state.draft.length){warning='Добавьте товары и укажите название образа.';return false;}
      if(state.looks.length>=MAX_LOOKS){warning='Сохранено 30 образов. Удалите ненужный перед сохранением нового.';return false;}
      const id=newId(),createdAt=now();
      if(typeof id!=='string'||!id||state.looks.some(x=>x.id===id)||
         typeof createdAt!=='string'||!Number.isFinite(parseIsoTimestamp(createdAt))){
        warning='Не удалось сохранить образ: ошибка идентификатора или даты. Повторите попытку.';
        return false;
      }
      const look={id,name,createdAt,items:copy(state.draft)};
      return commit({...state,looks:[...state.looks,look]});
    },
    load(id){const look=state.looks.find(x=>x.id===id);return !!look&&commit({...state,draft:copy(look.items)});},
    remove(id){return commit({...state,looks:state.looks.filter(x=>x.id!==id)});},
  };
}
