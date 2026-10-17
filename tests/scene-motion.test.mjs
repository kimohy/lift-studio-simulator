import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { WalkingPlayer } from '../src/player.js';
import { LiftScene } from '../src/scene.js';

function scene() {
  const v = Object.create(LiftScene.prototype);
  v.scene = new THREE.Scene();
  v.ready = true;
  v.view = 'game';
  v.game = { active: true, player: new WalkingPlayer() };
  v.game.player.zone = 'cabin';
  for (const name of ['car', 'cabinet', 'weight']) v[name] = new THREE.Group();
  v.parts = [];
  v.pickables = [];
  v.landings = Array.from({ length: 15 }, (_, floorIndex) => {
    const o = new THREE.Group();
    o.userData.floorIndex = floorIndex;
    return o;
  });
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
      }),
    }),
  };
  try {
    v.makeGameRoom();
  } finally {
    globalThis.document = previous;
  }
  return v;
}

test('adjacent landing stays visible across a floor indicator change', () => {
  const v = scene();
  v.game.player.floor = 5;
  v.applyVisibility({ floor: 5, position: 5.49 * 3.5 });
  assert.equal(v.landings[6].visible, true);
  v.game.player.floor = 6;
  v.applyVisibility({ floor: 6, position: 5.51 * 3.5 });
  assert.equal(v.landings[5].visible, true);
});

test('lobby geometry never teleports when a passenger changes floor', () => {
  const v = scene();
  v.game.player.floor = 5;
  v.applyVisibility({ floor: 5, position: 5.49 * 3.5 });
  const before = v.gameRoom.position.y;
  v.game.player.floor = 6;
  v.applyVisibility({ floor: 6, position: 5.51 * 3.5 });
  assert.equal(v.gameRoom.position.y, before);
});

test('waiting player keeps their landing even while car travels away', () => {
  const v = scene();
  v.game.player.zone = 'lobby';
  v.game.player.floor = 5;
  v.applyVisibility({ floor: 14, position: 49 });
  assert.equal(v.landings[5].visible, true);
  assert.equal(v.landings[14].visible, false);
});

test('all landing indicators share the live cabin floor display', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }) };
  try {
    const v = Object.create(LiftScene.prototype);
    v.model = new THREE.Group();
    v.car = new THREE.Group();
    v.cabinet = new THREE.Group();
    v.landings = [];
    for (let floorIndex = 0; floorIndex < 15; floorIndex++) {
      const indicator = new THREE.Mesh();
      indicator.name = `Landing_indicator_${floorIndex}`;
      indicator.userData = { simRole: 'landing', floorIndex };
      indicator.position.set(0, 2.47 + (floorIndex - 5) * 3.5, 1.261);
      v.model.add(indicator);
      v.landings.push(indicator);
    }
    v.makeDisplay();
    const displays = v.landings.filter((o) => o.name.startsWith('Live_landing_display'));
    assert.equal(displays.length, 15);
    for (const d of displays) {
      assert.equal(d.material.map, v.floorTex);
      assert.equal(d.rotation.y, 0);
      assert.equal(d.position.y, 2.47 + (d.userData.floorIndex - 5) * 3.5);
      assert.ok(d.position.z > 1.281);
    }
  } finally {
    globalThis.document = previous;
  }
});

test('other guest room doors on guest floors register interactive metadata', () => {
  const v = scene();
  const otherDoors = v.pickables.filter((o) => o.userData.action === 'otherRoomDoor');
  // 9 guest floors (2F..10F = 18 doors) minus Room 301 = 17 doors (each has door panel + handle = 34 pickables)
  assert.equal(otherDoors.length, 34);
  assert.ok(otherDoors.some((o) => o.userData.room === '201' && o.userData.floorIndex === 6));
  assert.ok(otherDoors.some((o) => o.userData.room === '302' && o.userData.floorIndex === 7));
  assert.ok(!otherDoors.some((o) => o.userData.room === '301'));
});
