// Размеры: подбор по таблице, мерки вещи, «как сядет» простыми словами.
import {TOPK} from './specs.js';
import {constructionCm} from './construction.js';

// ---------- размеры из таблицы магазина ----------
// item.sizesT: [{name, ru, cm:{len, chest | waist, hip, inseam, outseam, hem}, body:{chest:[от,до], waist, hips}}]; item.size — выбранный (или подбор по фигуре)
export function recommendSize(item, b) {
  const S = (item.sizesT || []).filter(sz=>!sz.estimated); if (!S.length) return null;
  const top = TOPK.has(item.kind);
  const fits = sz => {
    if (sz.body) { const keys = top ? ['chest'] : ['waist', 'hips']; const known = keys.filter(key => sz.body[key]); return known.length > 0 && known.every(key => b[key] <= sz.body[key][1]); }
    if (top && sz.cm.chest) return sz.cm.chest * 2 >= b.chest + 6;
    if (!top && sz.cm.waist) return sz.cm.waist * 2 >= b.waist - 1 && (!sz.cm.hip || sz.cm.hip * 2 >= b.hips + 2);
    return false;
  };
  return (S.find(fits) || S[S.length - 1]).name;
}
export const sizeOf = (item, b) => item.sizesT ? item.sizesT.find(z => z.name === (item.size || recommendSize(item, b))) || item.sizesT[0] : null;
export function itemCm(item, b) { const sz = b && sizeOf(item, b); return Object.assign({}, (item.shape && item.shape.cm) || {}, sz ? sz.cm : {}); }
// как сядет: сравнение мерок вещи с фигурой (простыми словами)
export function fitNote(item, b) {
  const sz = sizeOf(item, b);
  const c = itemCm(item, b), out = [], top = TOPK.has(item.kind);
  const construction = constructionCm(item, c);
  if (sz?.estimated) out.push('примерная размерная модель; мерки этого размера не подтверждены');
  if (sz && sz.body && sz.body.chest && top) { const [lo, hi] = sz.body.chest; out.push(b.chest > hi ? 'мало в груди по таблице (' + lo + '–' + hi + ' см)' : b.chest < lo - 4 ? 'велико по таблице' : 'твой размер по таблице магазина'); }
  if (top && c.chest) { const e = c.chest * 2 - b.chest; out.push(e < 0 ? 'обхват вещи меньше груди на ' + Math.round(-e) + ' см; растяжимость ткани не измерена' : e < 8 ? 'по фигуре' : e < 18 ? 'свободно' : 'оверсайз'); }
  if (!top && c.waist) { const e = c.waist * 2 - b.waist; out.push(e < -2 ? 'пояс мал (' + c.waist * 2 + ' см при талии ' + b.waist + ')' : e <= 4 ? 'пояс по талии' : 'пояс свободный — с ремнём'); }
  if (!top && c.hip) { const e = c.hip * 2 - b.hips; out.push(e < 0 ? 'мало в бёдрах на ' + Math.round(-e) + ' см' : e > 25 ? 'очень свободно в бёдрах' : e > 10 ? 'свободно в бёдрах' : 'по бёдрам'); }
  if (!top && c.outseam) { const need = b.height * 0.595 - 2, dl = Math.round(c.outseam - need); out.push(dl > 4 ? 'длинные: ~' + dl + ' см ложится на обувь' : dl < -6 ? 'укороченные' : 'до обуви'); }
  if (top && !c.len && construction.len) out.push('длина по фото ≈ ' + Math.round(construction.len) + ' см');
  if (!top && c.outseam && !c.inseam) out.push('посадка по шагу приблизительная');
  return out.join(' · ');
}
