// Render a labelled screenshot comparison without changing either source image.
// Usage: node tools/lab/compare.mjs BEFORE_DIR AFTER_DIR OUTPUT.png [garment ids joined by _]
import fs from 'node:fs';
import path from 'node:path';
import {browser} from './common.mjs';
const [before, after, output, id='zolla-tee_barrel-jeans'] = process.argv.slice(2);
if (!output) throw new Error('Expected BEFORE_DIR AFTER_DIR OUTPUT.png');
const img = (dir,angle) => 'data:image/png;base64,'+fs.readFileSync(path.join(dir,id+'_'+angle+'.png')).toString('base64');
const b=await browser();
try {
 const p=await b.newPage({viewport:{width:1020,height:1160},deviceScaleFactor:1});
 await p.setContent(`<html lang="ru"><meta charset="utf-8"><style>
 body{margin:0;background:#faf9f6;color:#242424;font:18px Arial} main{padding:24px} h1{font-size:25px;margin:0 0 8px} p{margin:0 0 15px;font-size:15px;color:#555}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px} .label{grid-column:1/-1;background:#25394b;color:white;padding:8px 12px;font-weight:bold} img{display:block;width:100%;height:456px;object-fit:contain;background:#eeede8} figcaption{text-align:center;font-size:14px;margin:4px} figure{margin:0}
 </style><main><h1>Примерочная: до и после сохранения мерок</h1><p>Одинаковые фигура, камера и свет. Рост 186 см · грудь 110 см · талия 82 см · бёдра 98 см</p><div class="grid">${[[before,'ДО — выкройка расширялась под тело'],[after,'ПОСЛЕ — ширина футболки 54 см, штанины 38 см']].map(([dir,label])=>`<div class="label">${label}</div>`+['front','side','back'].map((angle,i)=>`<figure><img src="${img(dir,angle)}"><figcaption>${['Спереди','Сбоку','Сзади'][i]}</figcaption></figure>`).join('')).join('')}</div><p style="margin-top:12px">Это исправление мерок. Фототекстуры и физика ткани ещё требуют отдельной доработки.</p></main></html>`);
 await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await p.screenshot({path:path.resolve(output),fullPage:true});
 console.log(path.resolve(output));
} finally {await b.close();}
