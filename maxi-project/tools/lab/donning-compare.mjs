import fs from 'node:fs';
import path from 'node:path';
import {browser} from './common.mjs';
const [before,after,output]=process.argv.slice(2);if(!output)throw Error('Expected BEFORE AFTER OUTPUT');
const img=(dir,name)=>'data:image/png;base64,'+fs.readFileSync(path.join(dir,name)).toString('base64');
const b=await browser();try{const p=await b.newPage({viewport:{width:1040,height:900},deviceScaleFactor:1});
 await p.setContent(`<html lang="ru"><meta charset="utf-8"><style>body{margin:0;background:#faf9f6;color:#26343d;font:16px Arial}main{padding:20px}h1{font-size:25px;margin:0 0 10px}p{line-height:1.4}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.label{background:#25394b;color:white;padding:10px;font-weight:bold}img{display:block;width:100%}</style><main><h1>Плечи футболки: устранение выступов манекена</h1><p>Одинаковые фигура, одежда, камера и свет. Ширина футболки — 54 см.</p><div class="grid">${[[before,'ДО — части рук выступают через одежду'],[after,'ПОСЛЕ — поверхность огибает стык рук']].map(([dir,label])=>`<div><div class="label">${label}</div><img src="${img(dir,'settled.png')}"></div>`).join('')}</div><p>Проверка добавлена к расчётной сетке и к поверхности для показа. Анатомия и свойства ткани остаются приближёнными.</p></main></html>`);
 await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await p.screenshot({path:output,fullPage:true});
}finally{await b.close();}
