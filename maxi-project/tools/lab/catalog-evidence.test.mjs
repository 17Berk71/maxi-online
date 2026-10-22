import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryEvidence, catalogEvidence, safeHttpUrl, AVAILABILITY} from '../../src/shop/catalog-evidence.js';
const NOW = Date.parse('2026-10-22T12:00:00Z');
const valid = {availability_status: AVAILABILITY.IN_STOCK, availability_scope:'physical_store_tula',
 availability_checked_at:'2026-10-22T11:00:00Z', availability_expires_at:'2026-10-22T13:00:00Z',
 availability_source:'https://partner.example/stock/42'};
test('invalid, missing and stale stock evidence always become unknown', () => {
 for (const change of [{availability_source:null},{availability_checked_at:null},
   {availability_expires_at:'2026-10-22T11:30:00Z'},
   {availability_scope:'unspecified'}, {availability_checked_at:'2026-10-23T00:00:00Z'},
   {availability_status:'in_stock'}]) {
   assert.equal(inventoryEvidence({...valid,...change}, NOW).status, AVAILABILITY.UNKNOWN);
 }
 assert.equal(inventoryEvidence(valid, NOW).status, AVAILABILITY.IN_STOCK);
});
test('online stock is not local physical stock', () => {
 const r=inventoryEvidence({...valid,availability_scope:'online_store'},NOW);
 assert.equal(r.status, AVAILABILITY.IN_STOCK);
 assert.equal(r.scope,'online_store');
});
test('demo catalogue never claims inventory', () => {
 const r=catalogEvidence({...valid,pic:'original.webp',url:'https://shop.example/item'}, {demo:true,updated:'2026-10-12'},NOW);
 assert.equal(r.availability.status, AVAILABILITY.UNKNOWN);
 assert.equal(r.demo,true);
 assert.equal(r.originalImage,'original.webp');
});
test('javascript and data URLs cannot be outbound product links', () => {
 assert.equal(safeHttpUrl('javascript:alert(1)'), null);
 assert.equal(safeHttpUrl('data:text/html,test'), null);
 assert.equal(safeHttpUrl('https://example.com/item'),'https://example.com/item');
});
