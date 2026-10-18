import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AutomaticDoorSystem } from '../src/automatic-doors.js';
import { floorMeta, floorUsage } from '../src/building.js';
import { FLOORS, LiftController } from '../src/controller.js';
import { GameMode } from '../src/game-mode.js';

// Mock minimal DOM and Scene for headless testing of GameMode floor directory and interactions
function createMockGame() {
  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) {
      const el = {
        id,
        textContent: '',
        innerHTML: '',
        classList: {
          toggle: () => {},
          add: () => {},
          remove: () => {},
          contains: () => false,
        },
        children: [],
        replaceChildren(...items) {
          this.children = items;
        },
        append(child) {
          this.children.push(child);
        },
        querySelector: () => null,
        addEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        dispatchEvent: () => {},
        showModal: () => {},
        close: () => {},
        style: {},
      };
      elements.set(id, el);
    }
    return elements.get(id);
  };

  globalThis.document = {
    getElementById: getEl,
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      children: [],
      append(child) {
        this.children.push(child);
      },
      replaceChildren(...items) {
        this.children = items;
      },
      querySelector: () => ({ addEventListener: () => {} }),
      addEventListener: () => {},
      style: {},
      dataset: {},
    }),
    body: {
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false }),
  };

  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

  const mockCamera = {
    position: { set: () => {} },
    rotation: { set: () => {}, order: 'YXZ' },
    fov: 65,
    updateMatrixWorld: () => {},
    updateProjectionMatrix: () => {},
  };

  const mockView = {
    ready: true,
    view: 'lobby',
    canvas: {
      tabIndex: 0,
      focus: () => {},
      addEventListener: () => {},
      style: {},
    },
    camera: mockCamera,
    resize: () => {},
    setView: () => {},
    applyVisibility: () => {},
    getInteraction: () => null,
  };

  const controller = new LiftController();
  const game = new GameMode(mockView, controller);
  return { game, controller, mockCamera, elements };
}

test('all 15 floors have rich directory metadata and usage info', () => {
  for (let f = 0; f < 15; f++) {
    const usage = floorUsage(f);
    assert.ok(usage.ko && usage.en, `Floor ${f} should have ko and en labels`);
    const meta = floorMeta(f, FLOORS[f]);
    assert.ok(meta.title && meta.desc && meta.badge, `Floor ${f} should have meta details`);
  }
});

test('fastTravelToFloor teleports player to exact floor and updates position and state', () => {
  const { game } = createMockGame();
  game.enter();

  // Test guest room floor (3F, index 7)
  const r3 = game.fastTravelToFloor(7);
  assert.equal(r3.ok, true);
  assert.equal(game.player.floor, 7);
  assert.equal(game.player.zone, 'lobby');

  // Test rooftop pool floor (10F, index 14)
  const r10 = game.fastTravelToFloor(14);
  assert.equal(r10.ok, true);
  assert.equal(game.player.floor, 14);
  assert.equal(game.player.zone, 'pool');
  assert.equal(game.stay.completed.has('rooftopPool'), true);

  // Test basement parking floor (B3, index 2)
  const rb3 = game.fastTravelToFloor(2);
  assert.equal(rb3.ok, true);
  assert.equal(game.player.floor, 2);
  assert.equal(game.player.zone, 'lobby');
});

test('telescope zoom toggles field of view and resets on exit', () => {
  const { game, mockCamera } = createMockGame();
  game.enter();
  game.fastTravelToFloor(14);

  assert.equal(game.telescopeZoom, false);
  assert.equal(mockCamera.fov, 65);

  game.interactPool('poolTelescope');
  assert.equal(game.telescopeZoom, true);
  assert.equal(mockCamera.fov, 22);

  game.interactPool('poolTelescope');
  assert.equal(game.telescopeZoom, false);
  assert.equal(mockCamera.fov, 65);

  // Toggling on, then exiting game mode restores fov 65
  game.interactPool('poolTelescope');
  assert.equal(game.telescopeZoom, true);
  game.exit();
  assert.equal(game.telescopeZoom, false);
  assert.equal(mockCamera.fov, 65);
});

test('cafe ordering sets holdingCoffee and subsequent interaction sips coffee', () => {
  const { game } = createMockGame();
  game.enter();
  game.fastTravelToFloor(5); // 1F Lobby

  assert.equal(game.holdingCoffee, false);

  // Order coffee
  game.interactLobby('cafeOrder');
  assert.equal(game.holdingCoffee, true);
  assert.ok(game.stay.lastCafeItem);

  // Sip coffee
  game.interactLobby('cafeOrder');
  assert.equal(game.holdingCoffee, false);
});

test('escalator emergency stop toggles stopped flag on game instance', () => {
  const { game } = createMockGame();
  assert.equal(game.escalators.stopped, false);

  const stopped = game.toggleEscalatorStop();
  assert.equal(stopped, true);
  assert.equal(game.escalators.stopped, true);

  const resumed = game.toggleEscalatorStop();
  assert.equal(resumed, false);
  assert.equal(game.escalators.stopped, false);
});

test('telescope zoom auto-resets when player moves or steps away', () => {
  const { game, mockCamera } = createMockGame();
  game.enter();
  game.fastTravelToFloor(14); // 10F Rooftop Pool
  game.player.x = 7.4;
  game.player.z = 25.1;

  // Zoom in
  game.interactPool('poolTelescope');
  assert.equal(game.telescopeZoom, true);
  assert.equal(mockCamera.fov, 22);

  // Pressing KeyW and updating frame immediately resets zoom
  game.keys.add('KeyW');
  game.update(0.016);
  assert.equal(game.telescopeZoom, false);
  assert.equal(mockCamera.fov, 65);
  game.keys.clear();

  // Zoom in again, then step away (> 2.2m from 7.4, 25.1)
  game.interactPool('poolTelescope');
  assert.equal(game.telescopeZoom, true);
  assert.equal(mockCamera.fov, 22);

  game.player.x = 0;
  game.player.z = 10;
  game.update(0.016);
  assert.equal(game.telescopeZoom, false);
  assert.equal(mockCamera.fov, 65);
});

test('10F rooftop stair door automatically opens on approach and closes on retreat', () => {
  const { game } = createMockGame();
  game.enter();
  game.fastTravelToFloor(14);
  const stairDoor = game.stairs.doors[14];
  assert.equal(stairDoor.target, 0);

  // Approach 10F stair doorway (x = 2.54, z = 2.35)
  game.player.x = 2.54;
  game.player.z = 2.35;
  game.stairs.update(0.016, game.player);
  assert.equal(stairDoor.target, 1);

  // Step away to pool area
  game.player.x = 7.0;
  game.player.z = 15.0;
  game.stairs.update(0.016, game.player);
  assert.equal(stairDoor.target, 0);
});

test('AutomaticDoorSystem opens sliding leaves when player approaches and closes on exit', () => {
  const scene = new THREE.Scene();
  const pickables = [];
  const autoDoors = new AutomaticDoorSystem(scene, null, pickables);
  assert.equal(autoDoors.doors.length, 2);

  const rooftopDoor = autoDoors.doors.find((d) => d.id === 'rooftop_pool_door');
  assert.ok(rooftopDoor);
  assert.equal(rooftopDoor.currentOpen, 0);

  // Player at 10F near rooftop pool sliding door (x = 0, z = 8.0)
  const player = {
    floor: 14,
    zone: 'pool',
    x: 0,
    z: 8.0,
  };

  // Run update for 0.5s to fully open
  for (let i = 0; i < 30; i++) {
    autoDoors.update(0.016, player);
  }
  assert.ok(rooftopDoor.currentOpen > 0.95);
  assert.ok(rooftopDoor.leftLeaf.position.x < rooftopDoor.leftBaseX);
  assert.ok(rooftopDoor.rightLeaf.position.x > rooftopDoor.rightBaseX);

  // Player leaves the area
  player.z = 20.0;
  for (let i = 0; i < 30; i++) {
    autoDoors.update(0.016, player);
  }
  assert.ok(rooftopDoor.currentOpen < 0.05);
});

