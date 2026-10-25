// Товары из выгрузок магазинов (готовит tools/feeds/import_feed.py → feeds/index.json и feeds/<магазин>.json).
// Если выгрузки у магазина нет или файлы недоступны, остаётся демо-каталог из catalog.js.
import {PHOTOS} from './photos.js';
import {visibleDepartments,feedPath,visibleStoreEntry} from './catalog-feed.js';
import {catalogEvidence} from './catalog-evidence.js';

export const FEED_BASE = 'feeds/';
// Photo keys must include the shop: different feeds can reuse the same product ID.
// JSON tuple encoding keeps punctuation and even malformed Unicode IDs collision-safe.
export const feedPhotoKey = (shopName, productId) =>
  'feed:' + JSON.stringify([String(shopName ?? ''), String(productId ?? '')]);
let indexP = null;
const WIN = {};
export const winKeys = name => WIN[name] || [];
function loadIndex() {
  if (!indexP) indexP = fetch(FEED_BASE + 'index.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null).then(idx => {
    // несколько вещей на магазин — для витрин в галерее (они собираются сразу при запуске)
    if (idx && idx.shops && typeof idx.shops === 'object') Object.entries(idx.shops).forEach(([name, e]) => {
      if (!visibleStoreEntry(e)) return;
      WIN[name] = (Array.isArray(e?.win) ? e.win : []).flatMap((w, i) => {
        const path = feedPath(w?.pic);
        if (!path) return [];
        const k = 'win:' + name + ':' + i;
        PHOTOS[k] = {url: path, aspect: w.aspect, h: w.h, color: w.color, colorName: '', items: []};
        return [k];
      });
    });
    return idx;
  });
  return indexP;
}
export function feedIndexReady() { return loadIndex(); }

// загрузить выгрузку магазина один раз; true — если у магазина появились товары из выгрузки
export async function loadFeed(s) {
  if (!s || s._feedTried) return !!(s && s._feed);
  if (s._feedP) return s._feedP;
  s._feedP = (async () => {
    const idx = await loadIndex(); const e = idx && idx.shops && idx.shops[s.name];
    // A configured but hidden, unsafe or unreachable feed must not fall back to generated demo goods.
    if (e && !visibleStoreEntry(e)) { s._catalogueUnavailable = true; s._cat = null; s._feedTried = true; return false; }
    const path = visibleStoreEntry(e) ? feedPath(e.file) : null;
    if (!path) { s._feedTried = true; return false; }
    s._catalogueUnavailable = true;
    try {
      const r = await fetch(path, {cache: 'no-cache'}); if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      data.demo=!!(idx.demo||data.demo);
      // фото с вырезанным фоном регистрируем как обычные фото товаров: дальше их вешает на вешала тот же код
      visibleDepartments(data).forEach(d => d.items.forEach(it => {
        const photo = feedPath(it.pic);
        if (photo && it.cut) PHOTOS[feedPhotoKey(s.name, it.id)] = {url: photo, aspect: it.aspect, h: it.h || 0.7, color: it.color, colorName: it.colorName, items: []};
      }));
      s._feed = data; s._catalogueUnavailable = false; s._cat = null; s._ph = null;
    } catch (err) { console.warn('выгрузка не загрузилась', s.name, err); }
    s._feedTried = true; return !!s._feed;
  })();
  return s._feedP;
}

// каталог магазина из выгрузки: отделы «для кого × тип», у каждого товара фото, размеры, ссылка
export function feedCatalog(s, DEPT) {
  const F = s._feed;
  return visibleDepartments(F).map(d => {
    const base = DEPT[d.type] || DEPT.generic;
    const items = d.items.map(it => {
      const preview = feedPath(it.pic);
      const evidence = catalogEvidence(it, F);
      return ({
      name: it.name, price: typeof it.price === 'number' && Number.isFinite(it.price) && it.price >= 0 ? it.price : null, oldPrice: it.oldPrice, color: it.color, colorName: it.colorName, icon: base.icon, dept: d.key, deptTitle: d.title,
      model: base.model, scale: d.who === 'kids' ? 0.72 : 1, photo: preview && it.cut ? feedPhotoKey(s.name, it.id) : null, pic: preview,
      sizes: it.sizes, url: evidence.demo ? null : evidence.sourceUrl, desc: it.desc || '', pickup: !!it.pickup, feed: true, id: 'f-' + it.id, sourceProductId: it.id,
      evidence,
      originalImageUrl: evidence.originalImage,
      stockEvidence: {availability_status: it.availability_status, availability_scope: it.availability_scope,
        availability_source: it.availability_source, availability_checked_at: it.availability_checked_at,
        availability_expires_at: it.availability_expires_at},
      fitPack: feedPath(it.fit),   // пакет примерки (tools/feeds/fitpack.py): только безопасный относительный путь
    });});
    // в зале мест больше, чем товаров в маленькой выгрузке, — товары повторяются по кругу
    return {key: d.key, title: d.title, icon: base.icon, model: base.model, lay: base.lay, items, itemAt(i) { return items[i % items.length]; }, feed: true};
  });
}
export const feedInfo = s => s && s._feed ? {updated: s._feed.updated, demo: !!s._feed.demo, source: s._feed.source || ''} : null;
