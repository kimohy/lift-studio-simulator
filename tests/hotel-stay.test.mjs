import {test} from 'node:test';import assert from 'node:assert/strict';import {HOTEL_ROOMS,HotelStay,getHotelRoomSpec} from '../src/hotel-stay.js';
test('only reception checks in and issues one consistent keycard',()=>{const stay=new HotelStay();assert.equal(stay.checkIn('barista'),null);assert.equal(stay.keycard,null);const card=stay.checkIn('reception-a');assert.deepEqual(card,{room:'301',floor:'3',hotel:'GRAND HOTEL'});assert.equal(stay.checkIn('reception-b'),card);});

test('reception allows selective room assignment across all 15 rooms (201..802 + full-floor 901)', () => {
  assert.equal(HOTEL_ROOMS.length, 15);
  const pentSpec = getHotelRoomSpec('901');
  assert.equal(pentSpec?.floorIndex, 13);
  assert.equal(pentSpec?.doorX, 0);
  assert.equal(getHotelRoomSpec('902'), null);

  const stay = new HotelStay();
  const card901 = stay.checkIn('reception-a', '901');
  assert.deepEqual(card901, { room: '901', floor: '9', hotel: 'GRAND HOTEL' });
  assert.equal(stay.canAccess('901'), true);
  assert.equal(stay.canAccess('301'), false);
  assert.equal(stay.getCheckedInRoomSpec()?.room, '901');

  const card502 = stay.checkIn('reception-b', '502');
  assert.deepEqual(card502, { room: '502', floor: '5', hotel: 'GRAND HOTEL' });
  assert.equal(stay.canAccess('502'), true);
  assert.equal(stay.canAccess('901'), false);

  assert.equal(stay.checkIn('reception-a', '999'), null);
  assert.equal(stay.keycard.room, '502');
});
