import test from 'node:test';
import assert from 'node:assert/strict';

let saved = '[]';
let refuseWrites = false;
globalThis.localStorage = {
  getItem: () => saved,
  setItem: (_key, value) => {
    if (refuseWrites) throw new Error('Storage unavailable');
    saved = value;
  },
};
const {addToPhotoLook, removeFromPhotoLook, movePhotoLook, photoLookItems} =
  await import('../../src/shop/photo-looks.js');

test('photo board persists source images and reorder operations', () => {
  assert.equal(addToPhotoLook({id:'1',name:'Куртка'}, {name:'Shop'}, 'https://example.org/1.jpg'), true);
  assert.equal(addToPhotoLook({id:'2',name:'Брюки'}, {name:'Shop'}, 'https://example.org/2.jpg'), true);
  assert.deepEqual(photoLookItems().map(x=>x.title), ['Куртка','Брюки']);
  const id = photoLookItems()[1].id;
  assert.equal(movePhotoLook(id,-1), true);
  assert.deepEqual(photoLookItems().map(x=>x.title), ['Брюки','Куртка']);
  assert.deepEqual(JSON.parse(saved).map(x=>x.title), ['Брюки','Куртка']);
});

test('failed persistence never changes visible photo board state', () => {
  const before = photoLookItems();
  refuseWrites = true;
  assert.equal(removeFromPhotoLook(before[0].id), false);
  assert.equal(movePhotoLook(before[0].id,1), false);
  assert.equal(addToPhotoLook({id:'3',name:'Юбка'}, {name:'Shop'}, 'https://example.org/3.jpg'), false);
  assert.deepEqual(photoLookItems(), before);
  assert.deepEqual(JSON.parse(saved), before);
  refuseWrites = false;
});

test('unsafe image URL cannot be added', () => {
  assert.equal(addToPhotoLook({id:'4',name:'X'}, {name:'Shop'}, 'javascript:alert(1)'),false);
});
