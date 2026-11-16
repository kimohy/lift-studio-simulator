import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { floorUsage, MALL_MAX_FLOOR, mallFloorMeta } from '../src/building.js';
import { FLOORS, LiftController, PITCH } from '../src/controller.js';
import { Escalators } from '../src/escalator.js';
import { EscalatorView } from '../src/escalator-view.js';
import { HotelScene } from '../src/hotel-scene.js';
import { HotelStay, MALL_FAST_TRAVEL_SPOTS } from '../src/hotel-stay.js';
import { HotelWorld, MALL_LIFT_X, MALL_LIFT_Z } from '../src/hotel-world.js';
import { MallScene } from '../src/mall-scene.js';
import { WalkingPlayer } from '../src/player.js';

function withMockCanvas(fn) {
  const prev = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 512,
      height: 192,
      getContext: () => ({
        fillStyle: '',
        strokeStyle: '',
        font: '',
        textAlign: '',
        fillRect() {},
        strokeRect() {},
        fillText() {},
      }),
    }),
  };
  try {
    return fn();
  } finally {
    globalThis.document = prev;
  }
}

const cast = (obj, pos, dir, far = 20) =>
  new THREE.Raycaster(new THREE.Vector3(...pos), new THREE.Vector3(...dir), 0, far).intersectObjects(
    obj.children ?? [obj],
    true
  );

function advanceLift(ctrl, seconds, stepDt = 1 / 60) {
  const steps = Math.ceil(seconds / stepDt);
  for (let i = 0; i < steps; i++) ctrl.tick(stepDt);
}

test('mall placement and metadata cover hotel left wing B5 through 6F without breaking hotel usage', () => {
  assert.equal(MALL_MAX_FLOOR, 10);
  assert.equal(floorUsage(5).kind, 'lobby');
  assert.equal(floorUsage(14).kind, 'guest');
  assert.equal(MALL_FAST_TRAVEL_SPOTS.length, 4);

  const meta1f = mallFloorMeta(5, '1');
  const meta6f = mallFloorMeta(10, '6');
  assert.equal(meta1f.zone, 'atrium');
  assert.equal(meta6f.zone, 'forest');
  assert.equal(mallFloorMeta(0, 'B5').isParking, true);

  const world = new HotelWorld();
  // Front-left (-X) belongs to mall across B5..6F
  assert.equal(world.isMallArea(-32, 10, 5), true);
  assert.equal(world.isMallArea(-28, 13.5, 10), true);
  // Hotel upper guest floors (+X / x = 0) never turn into mall area
  assert.equal(world.isMallArea(0, 2.65, 6), false);
  assert.equal(world.isExtendedArea(0, 2.65, 6), false);
});

test('escalator side portal connects hotel escalator return corridor to mall bridge across B5 through 6F', () => {
  withMockCanvas(() => {
    const view = new EscalatorView(new THREE.Scene());
    view.root.updateMatrixWorld(true);
    for (const f of [0, 4, 5, 7, 10]) {
      const y = (f - 5) * PITCH + 1.4;
      // Side doorway through west escalator wall (x = -10.88, z = 6.4) is open to mall
      const portalHit = cast(view.root, [-9.5, y, 6.4], [-1, 0, 0], 2.5)[0];
      assert.equal(portalHit, undefined, `expected escalator west portal open on floor ${FLOORS[f]}`);
      // Forward section of outer wall remains solid
      const solidHit = cast(view.root, [-9.5, y, 3.2], [-1, 0, 0], 2.5)[0];
      assert.equal(solidHit?.object.name, 'Escalator_outer_wall');
    }
    // Hotel-only 8F (floor 12 > MALL_MAX_FLOOR) outer wall remains closed
    const topWall = cast(view.root, [-9.5, (12 - 5) * PITCH + 1.4, 6.4], [-1, 0, 0], 2.5)[0];
    assert.equal(topWall?.object.name, 'Escalator_outer_wall');
  });

  // Player walks seamlessly west across x = -10.8 from hotel escalator onto mall bridge & back
  const world = new HotelWorld();
  const escalators = new Escalators();
  const hotelCtrl = new LiftController();
  const mallCtrl = new LiftController({ minFloor: 0, maxFloor: MALL_MAX_FLOOR, id: 'mall', startFloor: 5 });
  const player = new WalkingPlayer(null, world, escalators, null, null, mallCtrl);

  for (const f of [5, 7]) {
    player.floor = f;
    player.zone = 'escalator';
    player.escalatorY = (f - 5) * PITCH;
    player.worldY = player.escalatorY;
    player.x = -9.5;
    player.z = 6.4;
    player.yaw = Math.PI / 2; // +forward goes toward -X (West)

    for (let i = 0; i < 45; i++) player.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
    assert.ok(player.x < -14.5, `player should walk across escalator bridge into mall on floor ${f}, got x=${player.x}`);
    assert.equal(player.floor, f);
    assert.equal(player.zone, 'lobby');

    // Return east back onto escalator return landing
    player.yaw = -Math.PI / 2;
    for (let i = 0; i < 45; i++) player.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
    assert.ok(player.x > -10.5, `player should walk back onto escalator landing on floor ${f}, got x=${player.x}`);
    assert.equal(player.zone, 'escalator');
  }
});

test('underground parking connects hotel basement to mall parking via west portals on B5 through B1', () => {
  const mat = new THREE.MeshBasicMaterial();
  for (let f = 0; f < 5; f++) {
    const hs = Object.create(HotelScene.prototype);
    const g = new THREE.Group();
    hs.m = new Proxy({}, { get: () => mat });
    hs.world = new HotelWorld();
    hs.ramps = [];
    hs.sign = () => {};
    hs.rail = () => {};
    hs.car = () => {};
    hs.parking(g, f);
    g.updateMatrixWorld(true);

    // Portals at z = 15.9 and z = 22.3 are clear through x = -14
    assert.equal(cast(g, [-13.2, 1.5, 15.9], [-1, 0, 0], 1.5)[0], undefined);
    assert.equal(cast(g, [-13.2, 1.5, 22.3], [-1, 0, 0], 1.5)[0], undefined);
    // Solid sections of west wall still block outside portals
    assert.equal(cast(g, [-13.2, 1.5, 11.2], [-1, 0, 0], 1.5)[0]?.object.name, 'Garage_outer_wall');
  }

  const world = new HotelWorld();
  assert.equal(world.canOccupy(3, -14.0, 22.3), true);
  assert.equal(world.canOccupy(3, -14.0, 11.2), false);

  const hotelCtrl = new LiftController();
  const mallCtrl = new LiftController({ minFloor: 0, maxFloor: MALL_MAX_FLOOR, id: 'mall', startFloor: 5 });
  const player = new WalkingPlayer(null, world, null, null, null, mallCtrl);
  player.floor = 3; // B2
  player.zone = 'lobby';
  player.worldY = (3 - 5) * PITCH;
  player.x = -11.5;
  player.z = 22.3;
  player.yaw = Math.PI / 2; // Walk West through x = -14 portal

  for (let i = 0; i < 40; i++) player.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
  assert.ok(player.x < -16, `expected player inside mall B2 garage, got x=${player.x}`);
  assert.match(world.location(player), /그랜드 몰/);
});

test('mall elevator operates independently of hotel elevator between B5 and 6F and carries player', () => {
  const hotelCtrl = new LiftController();
  const mallCtrl = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    label: '몰 전망 엘리베이터',
    startFloor: 5,
  });

  // Bounds verification
  assert.equal(mallCtrl.isValidFloor(10), true);
  assert.equal(mallCtrl.isValidFloor(11), false);
  assert.equal(mallCtrl.callCar(14), false);
  assert.equal(mallCtrl.callHall(10, 1), false);

  // Independence: send hotel elevator to 10F while mall stays at 1F
  hotelCtrl.callCar(14);
  advanceLift(hotelCtrl, 20);
  advanceLift(mallCtrl, 1);
  assert.equal(hotelCtrl.floor, 14);
  assert.equal(mallCtrl.floor, 5);
  assert.equal(mallCtrl.state, 'idle');

  // Player boards mall elevator on 1F only after opening doors
  const world = new HotelWorld();
  const player = new WalkingPlayer(null, world, null, null, null, mallCtrl);
  player.floor = 5;
  player.zone = 'lobby';
  player.worldY = 0;
  player.x = MALL_LIFT_X;
  player.z = MALL_LIFT_Z + 2.0; // z = 8.2 on North concourse landing
  player.yaw = 0; // Facing -Z into Mall elevator doorway

  // Closed door blocks entry
  for (let i = 0; i < 15; i++) player.move(1, 0, 0.1, hotelCtrl, false, mallCtrl);
  assert.notEqual(player.zone, 'mallCabin');

  // Call & open Mall elevator on 1F
  mallCtrl.callHall(5, 1);
  advanceLift(mallCtrl, 1.5);
  assert.ok(mallCtrl.door >= 0.95);

  for (let i = 0; i < 20; i++) player.move(1, 0, 0.1, hotelCtrl, false, mallCtrl);
  assert.equal(player.zone, 'mallCabin');

  // Wait for doors to close and ride up to 6F Sounds Forest
  player.z = MALL_LIFT_Z; // step inside clear of doorway
  mallCtrl.callCar(10);
  mallCtrl.closeDoor();
  advanceLift(mallCtrl, 18);
  player.sync(hotelCtrl, mallCtrl);
  assert.equal(mallCtrl.floor, 10);
  assert.equal(player.floor, 10);
  assert.equal(hotelCtrl.floor, 14); // Hotel remains undisturbed at 10F
  assert.ok(mallCtrl.door >= 0.95);

  // Exit Mall elevator onto 6F concourse
  player.yaw = Math.PI; // Face +Z toward 6F garden
  for (let i = 0; i < 20; i++) player.move(1, 0, 0.1, hotelCtrl, false, mallCtrl);
  assert.equal(player.zone, 'lobby');
  assert.equal(player.floor, 10);
  assert.ok(player.z > MALL_LIFT_Z + 1.6);
});

test('mall architecture features atrium voids, 3F/5F skybridges, 6F sounds forest lightwells, waterfall, library, and auto doors', () => {
  const world = new HotelWorld();
  // Atrium void open on 2F/4F but bridged on 3F (floor 7) and 5F (floor 9)
  assert.equal(world.isMallArea(-31, 20, 6), false);
  assert.equal(world.isMallArea(-31, 20, 7), true);
  assert.equal(world.isMallArea(-31, 20, 8), false);
  assert.equal(world.isMallArea(-31, 20, 9), true);
  // 6F Sounds Forest promenade & twin lightwells
  assert.equal(world.isMallArea(-28, 20, 10), true);
  assert.equal(world.isMallArea(-35, 20, 10), false);
  assert.equal(world.isMallArea(-21.5, 20, 10), false);

  withMockCanvas(() => {
    const scene = new THREE.Scene();
    const pickables = [];
    const mall = new MallScene(scene, world, pickables);
    const mallCtrl = new LiftController({ minFloor: 0, maxFloor: MALL_MAX_FLOOR, id: 'mall', startFloor: 5 });

    assert.ok(mall.root.getObjectByName('Mall_Starfield_Atrium_Library'));
    assert.ok(mall.root.getObjectByName('Mall_12m_Waterfall_Garden'));
    assert.ok(mall.exterior.getObjectByName('Mall_anamorphic_media_facade'));
    assert.ok(mall.exterior.getObjectByName('Mall_skylight_glass_roof'));
    assert.ok(mall.mallCarButtons.length > 10);
    assert.ok(mall.mallHallButtons.length >= 20);
    assert.ok(pickables.some((m) => m.userData?.action === 'mallWaterfall'));
    assert.ok(pickables.some((m) => m.userData?.action === 'mallLibrary'));
    assert.ok(pickables.some((m) => m.userData?.action === 'mallForest'));
    assert.ok(pickables.some((m) => m.userData?.action === 'mallSkybridge'));

    // Auto sliding doors open as player approaches south entrance (x = -32, z = 36)
    const closedDoorX = mall.entranceDoors[0].position.x;
    for (let i = 0; i < 20; i++) mall.update(mallCtrl, i * 0.1, { floor: 5, x: -32, z: 36.2 });
    assert.notEqual(mall.entranceDoors[0].position.x, closedDoorX);
  });

  const stay = new HotelStay();
  const basePts = stay.points;
  const r = stay.interactMall('mallForest', { floorIndex: 10 });
  assert.equal(r.ok, true);
  assert.ok(stay.points > basePts);
});
