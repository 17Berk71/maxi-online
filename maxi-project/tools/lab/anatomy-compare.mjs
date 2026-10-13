import fs from 'node:fs';
import path from 'node:path';
import {browser} from './common.mjs';
const dir=process.argv[2];if(!dir)throw Error('Expected anatomy baseline directory');
const img=name=>'data:image/png;base64,'+fs.readFileSync(path.join(dir,name)).toString('base64');
const b=await browser();
try{const p=await b.newPage({viewport:{width:940,height:1550},deviceScaleFactor:1});
 await p.setContent(`<html lang="ru"><meta charset="utf-8"><style>body{margin:0;background:#faf9f6;color:#26343d;font:16px Arial}main{padding:20px}h1{font-size:26px;margin:0 0 12px}p{line-height:1.4}.label{background:#25394b;color:white;padding:10px;font-weight:bold}img{width:900px;display:block}.figures{display:flex;justify-content:space-around;padding:10px;font-size:14px}</style><main><h1>Манекен: шея, трапеция и плечи</h1><p>Слева — 186 см / грудь 110 см. В центре — 160 см / 130 см.<br>Справа — 205 см / 95 см. Камера, свет и мерки одинаковые.</p>${[['before-shoulders.png','ДО — пропущенная шея и расширение возле трапеции'],['after-shoulders.png','ПОСЛЕ — связная шея и более ровный переход к плечам']].map(([name,label])=>`<div class="label">${label}</div><img src="${img(name)}">`).join('')}<p>Форма остаётся процедурной и приблизительной. Нужна дальнейшая работа над соединением рук, туловищем и ногами.</p></main></html>`);
 await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await p.screenshot({path:path.join(dir,'before-after-anatomy.png'),fullPage:true});
}finally{await b.close();}
