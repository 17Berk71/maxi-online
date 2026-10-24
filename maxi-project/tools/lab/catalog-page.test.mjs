import test from 'node:test';import assert from 'node:assert/strict';
import {cataloguePage,CATALOG_PAGE_SIZE} from '../../src/shop/catalog-page.js';
const products=Array.from({length:1000},(_,n)=>({id:String(n),name:'Товар '+String(n).padStart(4,'0'),deptTitle:n%2?'Обувь':'Одежда',colorName:n%3?'Синий':'Зелёный',price:n%2?null:10}));
test('thousand-product catalogue is bounded while every item remains reachable in source order',()=>{
 const visited=[];for(let page=0;page<25;page++){const result=cataloguePage(products,{page});assert.equal(result.items.length,CATALOG_PAGE_SIZE);visited.push(...result.items.map(p=>p.id));}
 assert.deepEqual(visited,products.map(p=>p.id));assert.equal(new Set(visited).size,1000);
 assert.equal(cataloguePage(products,{page:999}).page,24);assert.equal(cataloguePage(products,{page:-1}).page,0);
});
test('search uses all products and only source attributes, preserving unknown prices',()=>{
 const found=cataloguePage(products,{query:'ТОВАР 0999'});assert.equal(found.total,1);assert.equal(found.items[0].id,'999');assert.equal(found.items[0].price,null);
 const green=cataloguePage(products,{query:'зеленый обувь'});assert(green.total>0);assert(green.items.every(p=>p.colorName==='Зелёный'&&p.deptTitle==='Обувь'));
 assert.equal(cataloguePage(products,{query:'unavailable label'}).total,0);
 assert.equal(products[999].price,null);
});
test('hidden items and invalid paging cannot escape the rendering bound',()=>{
 const data=[{name:'Hidden',hidden:true},null,...products];assert.equal(cataloguePage(data).total,1000);
 for(const pageSize of [0,-1,Infinity,'1000',10000]){const result=cataloguePage(data,{pageSize,page:NaN});assert(result.items.length<=100);assert.equal(result.page,0);}
 assert.deepEqual(cataloguePage([]).items,[]);
});

test('paged catalogue treats ambiguous withdrawal markers as hidden even with raw products',()=>{
 const input=[
  {id:'private-string',name:'Do not show',hidden:'true'},
  {id:'private-number',name:'Do not show',hidden:1},
  {id:'private-ambiguous',name:'Do not show',hidden:'false'},
  {id:'public',name:'Visible',hidden:false},
  {id:'public-zero',name:'Also visible',hidden:0},
 ];
 assert.deepEqual(cataloguePage(input).items.map(p=>p.id),['public','public-zero']);
 assert.equal(cataloguePage(input,{query:'Do not show'}).total,0);
 assert.equal(input[0].hidden,'true','source withdrawal flags are not mutated');
});
