import test from 'node:test';import assert from 'node:assert/strict';
import {floorUsage} from '../src/building.js';
test('all basement floors are parking, 1F is lobby and 2–10F are guest rooms',()=>{
 for(let f=0;f<5;f++)assert.deepEqual(floorUsage(f),{kind:'parking',ko:'주차장',en:'PARKING'});
 assert.deepEqual(floorUsage(5),{kind:'lobby',ko:'로비',en:'LOBBY'});
 for(let f=6;f<15;f++)assert.deepEqual(floorUsage(f),{kind:'guest',ko:'호텔 객실',en:'GUEST ROOMS'});
});
