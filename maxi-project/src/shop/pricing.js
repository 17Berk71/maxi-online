// Missing/invalid catalogue prices never mean free merchandise.
export function fmtPrice(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0
    ?value.toLocaleString('ru-RU')+' ₽':'Цена не указана';
}
