import test from 'node:test';
import assert from 'node:assert/strict';
import {garmentAssetKey,garmentKey} from '../../src/shop/fitting/asset-key.js';
const item={id:'shirt',shape:{cm:{chest:54}},tex:{front:'same-url'},state:'open',size:'L'};
test('updating content at a retained URL invalidates the garment cache',()=>{
 assert.notEqual(garmentAssetKey({...item,assetRevision:'before'}),garmentAssetKey({...item,assetRevision:'after'}));
});
test('measurement, silhouette and preprocessing changes invalidate geometry',()=>{
 for(const change of [{shape:{cm:{chest:55}}},{drape:{front:{grid:['11']}}},{photoLight:'corrected-v1'},{tex:{front:'new-url'}}]) assert.notEqual(garmentAssetKey(item),garmentAssetKey({...item,...change}));
});
test('size/state still invalidate, display names do not trigger another simulation',()=>{
 assert.notEqual(garmentKey(item),garmentKey({...item,size:'M'}));
 assert.notEqual(garmentKey(item),garmentKey({...item,state:'closed'}));
 assert.equal(garmentKey(item),garmentKey({...item,name:'renamed'}));
});
