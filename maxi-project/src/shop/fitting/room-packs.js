// Пакеты примерки: вещь из выгрузки магазина или фабрики (выкройка, вырезанное фото, мерки).
import {classify} from './classify.js';
import {W, persist, toItem} from './room-wardrobe.js';
let PACKS;

  // набор вещей с текстурами из фабрики (index.json + папки с front/back/sleeve.webp)
  // поля вещи из пакета примерки (фабрика tools/wardrobe или конвейер выгрузок tools/feeds/fitpack.py)
  function packFields(mt, dir) {
    const revision = mt.assetRevision ? '?v=' + encodeURIComponent(mt.assetRevision) : '';
    return {digitization: mt.digitization || null, materialTexture: mt.materialTexture || null, assetRevision: mt.assetRevision || null, photoLight: mt.photoLight || null, kind: mt.kind, fit: mt.fit, shape: mt.shape, sizesT: mt.sizes || null, states: mt.states, zip: mt.zip, collar: mt.collar, hood: !!mt.hood, pleats: !!mt.pleats, lining: mt.lining || null, puff: !!mt.puff, stand: !!mt.stand, drape: mt.drape || null,
      tex: {front: dir + 'front.webp' + revision, back: dir + 'back.webp' + revision, sleeve: mt.sleeve ? dir + 'sleeve.webp' + revision : null, fabric: mt.materialTexture ? dir + mt.materialTexture.file + revision : null, frontCut: dir + 'front_cut.webp' + revision, backCut: dir + 'back_cut.webp' + revision}};
  }
  export async function loadPack(it) {
    if (!it.pack || it.tex) return;
    try {
      const mt = await (PACKS[it.pack] = PACKS[it.pack] || fetch(it.pack + 'meta.json').then(r => r.ok ? r.json() : null).catch(() => null));
      if (!mt) { it.pack = null; return; }
      // картинки могут лежать в папке другого пакета (тот же снимок у товаров разных цветов/названий) — files
      const f = packFields(mt, mt.files ? it.pack.replace(/[^/]+\/$/, mt.files + '/') : it.pack); Object.assign(it, f, {sizesT: it.sizesT || f.sizesT});
      if (!it.state && it.states) it.state = it.states[0][0];
      const c = classify(it); if (c) it.slot = c.slot;
      persist();
    } catch (e) { it.pack = null; }
  }
  export async function addPack(base, shopName) {
    const r = await fetch(base + 'index.json'); if (!r.ok) throw new Error('нет ' + base);
    const list = await r.json(), s = {name: shopName || 'Мой гардероб', colHex: '#0e7490'};
    list.forEach(mt => {
      const dir = base + (mt.files || mt.id) + '/', p = Object.assign(packFields(mt, dir), {name: mt.name, color: mt.color, brand: mt.brand, note: mt.note, who: mt.who || '', id: 'w-' + mt.id, feed: true, pic: dir + 'front.webp' + (mt.assetRevision ? '?v=' + encodeURIComponent(mt.assetRevision) : '')});
      const it = toItem(p, s); if (!it) return; it.thumb = p.pic;
      const old = W.items.findIndex(i => i.id === it.id); if (old >= 0) W.items[old] = Object.assign(it, {state: W.items[old].state || it.state}); else W.items.push(it);
    });
    persist(); return list.length;
  }

// по порядку, при запуске
export function init() {

  // вещь из выгрузки магазина: пакет примерки (выкройка, вырезанное фото, сетка размеров) скачивается, когда вещь надевают
  PACKS = {};
}
