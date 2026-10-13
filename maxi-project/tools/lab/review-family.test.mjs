import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('generated review switches garment-specific sizes and preserves the explicit choice',()=>{
 const messages=[],select={value:'tee'},size={value:'',options:[],replaceChildren(...options){this.options=options;this.value='';},add(option){this.options.push(option);},addEventListener(type,fn){this[type]=fn;}};
 const status={},notes={},frame={contentWindow:{postMessage:m=>messages.push(m)}},card={dataset:{version:'after'},querySelector:s=>s==='select'?select:s==='.size'?size:s==='.status'?status:s==='iframe'?frame:notes,querySelectorAll:()=>[]};
 const controls={},document={querySelectorAll:s=>s==='.card'?[card]:[],querySelector:s=>s==='#body-sex'?{value:'f'}:controls[s]||=( {addEventListener(){}})};
 const sandbox={document,location:{origin:'https://review.invalid'},window:{addEventListener(){}},Option:function(label,value){this.label=label;this.value=value;}};
 vm.runInNewContext(fs.readFileSync('tools/lab/review-dist/review.js','utf8'),sandbox);
 select.value='dr-marsala';select.onchange();assert(size.options.some(o=>o.value==='M'&&o.label.includes('приблизительно')));
 size.value='M';size.change();let c=messages.at(-1).config;assert.equal(c.items[0],'dr-marsala');assert.equal(c.sizes['w-dr-marsala'],'M');
 select.value='tj-baggy';select.onchange();assert(size.options.some(o=>o.value==='34/XL'&&!o.label.includes('приблизительно')));assert.equal(size.value,'');
 controls['#apply-body'].onclick();assert.equal(messages.at(-1).config.body.sex,'f');
});
