import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryEvidence, catalogEvidence, safeHttpUrl, AVAILABILITY, parseIsoTimestamp} from '../../src/shop/catalog-evidence.js';
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
 assert.equal(r.originalImage,null);
});
test('javascript and data URLs cannot be outbound product links', () => {
 assert.equal(safeHttpUrl('javascript:alert(1)'), null);
 assert.equal(safeHttpUrl('data:text/html,test'), null);
 assert.equal(safeHttpUrl('https://example.com/item'),'https://example.com/item');
});

test('verified original image URL is distinct from processed preview', () => {
 const r=catalogEvidence({pic:'derived.webp',original_image_url:'https://example.com/source.jpg'}, {demo:false}, NOW);
 assert.equal(r.originalImage,'https://example.com/source.jpg');
});
test('demo products cannot claim stock even with complete-looking evidence', () => {
 assert.equal(inventoryEvidence({...valid,demo:true},NOW).status, AVAILABILITY.UNKNOWN);
});

test('verification timestamps reject impossible dates and timezone ambiguity, with leap years and offsets preserved',()=>{
 for(const value of ['2026-02-30T12:00:00Z','2025-02-29T12:00:00Z','2100-02-29T12:00:00Z','2026-04-31T12:00:00Z','2026-10-22','2026-10-22T12:00:00','2026-10-22T24:00:00Z','2026-10-22T12:60:00Z','2026-10-22T12:00:00+24:00'])assert(Number.isNaN(parseIsoTimestamp(value)),value);
 for(const value of ['2024-02-29T12:00:00Z','2000-02-29T12:00:00Z','2026-10-22T15:00:00+03:00'])assert.equal(parseIsoTimestamp(value),Date.parse(value));
 assert.equal(catalogEvidence({last_checked_at:'2026-02-30T12:00:00Z'},{},NOW).lastCheckedAt,null);
 assert.equal(inventoryEvidence({...valid,availability_checked_at:'2026-02-30T12:00:00Z'},NOW).status,AVAILABILITY.UNKNOWN);
 assert.equal(inventoryEvidence(valid,NaN).status,AVAILABILITY.UNKNOWN);
 assert.equal(catalogEvidence({},{updated:'2026-02-30'},NOW).importedAt,null);
 assert.equal(catalogEvidence({},{updated:'2026-10-21'},NOW).importedAt,'2026-10-21T00:00:00.000Z');
});
