import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  floorUsage,
  MALL_MAX_FLOOR,
  MALL_VALID_FLOORS,
  mallFloorMeta,
  normalizeMallFloor,
} from '../src/building.js';
import { FLOORS, LiftController, PITCH } from '../src/controller.js';
import { Escalators } from '../src/escalator.js';
import { EscalatorView } from '../src/escalator-view.js';
import { GameMode } from '../src/game-mode.js';
import { HotelScene } from '../src/hotel-scene.js';
import {
  HotelStay,
  MALL_CINEMA_MOVIES,
  MALL_DJ_TRACKS,
  MALL_FAST_TRAVEL_SPOTS,
} from '../src/hotel-stay.js';
import { HotelWorld, MALL_LIFT_X, MALL_LIFT_2_X, MALL_LIFT_Z } from '../src/hotel-world.js';
import { MALL_ROOF_Y, MALL_STORY_H, MallScene } from '../src/mall-scene.js';
import { WalkingPlayer } from '../src/player.js';
import { LiftScene } from '../src/scene.js';

function withMockCanvas(fn) {
  const prev = globalThis.document;
  globalThis.document = {
    getElementById: () => null,
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
        clearRect() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        bezierCurveTo() {},
        stroke() {},
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

test('double-height mall floor mapping allocates 2 hotel floors per 1 mall story up to M5F Cinema', () => {
  assert.deepEqual(MALL_VALID_FLOORS, [0, 1, 2, 3, 4, 5, 7, 9, 11, 13]);
  assert.equal(MALL_MAX_FLOOR, 13);
  assert.equal(MALL_STORY_H, 7.0);
  assert.equal(MALL_ROOF_Y, 35.0);
  assert.equal(normalizeMallFloor(6), 5);
  assert.equal(normalizeMallFloor(8), 7);
  assert.equal(normalizeMallFloor(14), 13);
  assert.equal(floorUsage(5).kind, 'lobby');
  assert.equal(floorUsage(14).kind, 'guest');
  assert.equal(MALL_FAST_TRAVEL_SPOTS.length, 4);

  assert.equal(mallFloorMeta(5).mallCode, 'M1F');
  assert.equal(mallFloorMeta(13).mallCode, 'M5F');
  assert.equal(mallFloorMeta(13).zone, 'cinema');

  const world = new HotelWorld();
  assert.equal(world.isMallArea(-32, 10, 5), true);
  assert.equal(world.isMallArea(-32, 10, 6), false); // 2F void belongs to double-height M1F
  assert.equal(world.isMallArea(-28, 13.5, 13), true); // M5F Cinema
  assert.equal(world.isMallArea(0, 2.65, 6), false);
});

test('1F hotel lobby opens wide directly into Mall M1F atrium and central mall escalators match double-height levels', () => {
  withMockCanvas(() => {
    const pickables = [];
    const world = new HotelWorld();
    const hs = new HotelScene(new THREE.Scene(), world, pickables);
    hs.root.updateMatrixWorld(true);
    // Open portal at x = -12 across z ∈ [10.0, 22.0] has zero wall obstruction
    assert.equal(cast(hs.floors[5], [-10.0, 1.5, 16.0], [-1, 0, 0], 4.0)[0], undefined);

    const view = new EscalatorView(new THREE.Scene());
    view.root.updateMatrixWorld(true);
    for (const f of [0, 4, 5, 7, 9, 11, 13]) {
      const y = (f - 5) * PITCH + 1.4;
      const eastPortalHit = cast(view.root, [-27.2, y, 20.9], [1, 0, 0], 2.0)[0];
      const westPortalHit = cast(view.root, [-34.8, y, 20.9], [-1, 0, 0], 2.0)[0];
      assert.equal(eastPortalHit, undefined, `expected central escalator east portal open on floor ${FLOORS[f]}`);
      assert.equal(westPortalHit, undefined, `expected central escalator west portal open on floor ${FLOORS[f]}`);
    }
    for (const f of [6, 8, 10, 12, 14]) {
      const y = (f - 5) * PITCH + 1.4;
      const eastClosed = cast(view.root, [-27.2, y, 20.9], [1, 0, 0], 2.0)[0];
      const westClosed = cast(view.root, [-34.8, y, 20.9], [-1, 0, 0], 2.0)[0];
      assert.equal(eastClosed?.object.name, 'Escalator_inner_wall');
      assert.equal(westClosed?.object.name, 'Escalator_outer_wall');
    }
  });

  // Walk straight across 1F Open Lobby Connection (z = 16.0) from Hotel Lobby to Mall M1F
  const world = new HotelWorld();
  const hotelCtrl = new LiftController();
  const mallCtrl = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    startFloor: 5,
    allowedFloors: MALL_VALID_FLOORS,
  });
  const player = new WalkingPlayer(null, world, null, null, null, mallCtrl);
  player.floor = 5;
  player.zone = 'lobby';
  player.x = -6.0;
  player.z = 16.0;
  player.yaw = Math.PI / 2;
  for (let i = 0; i < 60; i++) player.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
  assert.ok(player.x < -18.0, `expected player inside Mall M1F via open lobby, got x=${player.x}`);

  // Walk out of Mall-Center Escalator onto M2F (floor 7) East Gallery Bridge & East Gallery
  const escalators = new Escalators();
  const escPlayer = new WalkingPlayer(null, world, escalators, null, null, mallCtrl);
  escPlayer.floor = 7;
  escPlayer.zone = 'escalator';
  escPlayer.escalatorY = (7 - 5) * PITCH;
  escPlayer.worldY = escPlayer.escalatorY;
  escPlayer.x = -26.5;
  escPlayer.z = 20.9;
  escPlayer.yaw = -Math.PI / 2;
  for (let i = 0; i < 4; i++) escPlayer.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
  assert.ok(escPlayer.x > -26.2 && escPlayer.x < -22.0, `expected player on M2F east bridge, got x=${escPlayer.x}`);
  for (let i = 0; i < 10; i++) escPlayer.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
  assert.ok(escPlayer.x >= -22.0 && escPlayer.x <= -14.0, `expected player on M2F east gallery, got x=${escPlayer.x}`);
  assert.equal(escPlayer.zone, 'lobby');
  assert.equal(escPlayer.floor, 7);
});

test('unified underground parking aligns aisles and west portals consistently on B5 through B1', () => {
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

    assert.equal(cast(g, [-13.2, 1.5, 16.0], [-1, 0, 0], 1.5)[0], undefined);
    assert.equal(cast(g, [-13.2, 1.5, 21.8], [-1, 0, 0], 1.5)[0], undefined);
    assert.ok(g.getObjectByName('Garage_west_cross_aisle'));
  }

  const world = new HotelWorld();
  assert.equal(world.canOccupy(3, -14.0, 21.8), true);
  assert.equal(world.canOccupy(3, -14.0, 11.2), false);

  const hotelCtrl = new LiftController();
  const mallCtrl = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    startFloor: 5,
    allowedFloors: MALL_VALID_FLOORS,
  });
  const player = new WalkingPlayer(null, world, null, null, null, mallCtrl);
  player.floor = 3;
  player.zone = 'lobby';
  player.worldY = (3 - 5) * PITCH;
  player.x = 0.0;
  player.z = 21.8;
  player.yaw = Math.PI / 2;
  for (let i = 0; i < 90; i++) player.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
  assert.ok(player.x < -20, `player should walk down unified z=21.8 parking aisle into mall, got x=${player.x}`);
  assert.match(world.location(player), /통합 지하주차장/);
});

test('mall elevator buttons pass 3D raycast interaction and ride independently to M5F Cinema', () => {
  const mallCtrl = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    label: '몰 전망 엘리베이터',
    startFloor: 5,
    allowedFloors: MALL_VALID_FLOORS,
  });
  const hotelCtrl = new LiftController();

  assert.equal(mallCtrl.isValidFloor(13), true);
  assert.equal(mallCtrl.isValidFloor(6), false);
  assert.equal(mallCtrl.isValidFloor(14), false);

  // Ten-key 1..5 maps to double-height Mall levels M1F..M5F
  assert.equal(mallCtrl.pressTenKey('5').ok, true);
  assert.equal(mallCtrl.car.has(13), true);
  mallCtrl.clearCarCalls();
  mallCtrl.reset();

  // Verify LiftScene.getInteraction actually returns Mall Hall & Car buttons (not swallowed by occlusion)
  withMockCanvas(() => {
    const ls = Object.create(LiftScene.prototype);
    ls.scene = new THREE.Scene();
    ls.camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 200);
    ls.ray = new THREE.Raycaster();
    ls.pickables = [];
    ls.ready = true;
    ls.world = new HotelWorld();
    ls.mallScene = new MallScene(ls.scene, ls.world, ls.pickables);
    ls.mallScene.updateVisibility('game', 5, true);
    ls.mallScene.update(mallCtrl, 0, { floor: 5, x: MALL_LIFT_X, z: 8.5 });
    ls.rebuildOcclusionCache();

    // Stand facing M1F Mall Hall UP button (at bx+0.88, fy+1.32, bz+1.27)
    ls.camera.position.set(MALL_LIFT_X + 0.88, 1.32, MALL_LIFT_Z + 2.4);
    ls.camera.lookAt(MALL_LIFT_X + 0.88, 1.32, MALL_LIFT_Z + 1.27);
    ls.camera.updateMatrixWorld(true);
    ls.scene.updateMatrixWorld(true);

    const hallHit = ls.getInteraction({ x: 0, y: 0 }, 2.5);
    assert.equal(hallHit?.userData?.action, 'mallHall');

    // Verify Dual Transparent Elevators, Open Concourse Cutouts, & Horizontal Accessible Side COP
    assert.equal(ls.mallScene.mallCars.length, 2);
    assert.equal(ls.mallScene.mallCars[0].position.x, MALL_LIFT_X);
    assert.equal(ls.mallScene.mallCars[1].position.x, MALL_LIFT_2_X);
    assert.ok(ls.mallScene.m.crystalGlass.opacity <= 0.2, 'Expected ultra-transparent crystalGlass for dual elevators');
    for (const f of [7, 9, 11, 13]) {
      const fy = (f - 5) * PITCH;
      for (const sx of [MALL_LIFT_X, MALL_LIFT_2_X]) {
        const floorCutCheck = cast(ls.mallScene.root, [sx, fy + 0.5, MALL_LIFT_Z], [0, -1, 0], 1.2)[0];
        assert.equal(floorCutCheck, undefined, `expected clear shaft opening without floor slab at ${FLOORS[f]} x=${sx}`);
      }
    }

    // Inside cabin facing horizontal wheelchair-accessible side COP ♿ toggle at (MALL_LIFT_X + 0.975, 0.94, MALL_LIFT_Z + 0.43)
    ls.camera.position.set(MALL_LIFT_X + 0.1, 0.96, MALL_LIFT_Z + 0.43);
    ls.camera.lookAt(MALL_LIFT_X + 0.975, 0.94, MALL_LIFT_Z + 0.43);
    ls.camera.updateMatrixWorld(true);
    const accHit = ls.getInteraction({ x: 0, y: 0 }, 2.5);
    assert.equal(accHit?.userData?.action, 'cabinAccessible');
    assert.equal(accHit?.userData?.mall, true);

    // Horizontal accessible side floor button row
    ls.camera.position.set(MALL_LIFT_X + 0.1, 0.99, MALL_LIFT_Z + 0.26);
    ls.camera.lookAt(MALL_LIFT_X + 0.975, 0.99, MALL_LIFT_Z + 0.26);
    ls.camera.updateMatrixWorld(true);
    const accFloorHit = ls.getInteraction({ x: 0, y: 0 }, 2.5);
    assert.equal(accFloorHit?.userData?.action, 'mallCar');
    assert.equal(accFloorHit?.userData?.accessible, true);

    // Inside cabin facing front jamb COP panel at (MALL_LIFT_X + 0.78, 1.25, MALL_LIFT_Z + 0.82)
    ls.camera.position.set(MALL_LIFT_X + 0.1, 1.25, MALL_LIFT_Z);
    ls.camera.lookAt(MALL_LIFT_X + 0.78, 1.25, MALL_LIFT_Z + 0.82);
    ls.camera.updateMatrixWorld(true);
    const carHit = ls.getInteraction({ x: 0, y: 0 }, 2.5);
    assert.ok(carHit, 'Expected raycast inside Mall cabin to hit COP button');
    assert.ok(['mallCar', 'mallOpen', 'mallClose', 'mallAlarm'].includes(carHit.userData.action));
  });

  // Ride Mall Elevator from M1F to M5F (floor 13, 28m up) independently from Hotel Elevator
  const world = new HotelWorld();
  const player = new WalkingPlayer(null, world, null, null, null, mallCtrl);
  player.floor = 5;
  player.zone = 'lobby';
  player.x = MALL_LIFT_X;
  player.z = MALL_LIFT_Z + 2.0;
  player.yaw = 0;

  mallCtrl.callHall(5, 1);
  advanceLift(mallCtrl, 1.5);
  assert.ok(mallCtrl.door >= 0.95);
  for (let i = 0; i < 20; i++) player.move(1, 0, 0.1, hotelCtrl, false, mallCtrl);
  assert.equal(player.zone, 'mallCabin');

  player.z = MALL_LIFT_Z;
  mallCtrl.callCar(13);
  mallCtrl.closeDoor();
  advanceLift(mallCtrl, 22.2);
  player.sync(hotelCtrl, mallCtrl);
  assert.equal(mallCtrl.floor, 13);
  assert.equal(player.floor, 13);
  assert.equal(hotelCtrl.floor, 5); // Hotel elevator unaffected
  assert.ok(mallCtrl.door >= 0.95);

  player.yaw = Math.PI;
  for (let i = 0; i < 20; i++) player.move(1, 0, 0.1, hotelCtrl, false, mallCtrl);
  assert.equal(player.zone, 'lobby');
  assert.equal(player.floor, 13);
});

test('mall includes floor-themed shops, M5F Grand Cinema Multiplex, and 30+ animated crowd visitors', () => {
  const world = new HotelWorld();
  // Atrium void on M2F (7); East/West escalator bridges on M3F (9) & M4F (11); Cinema & twin lightwells on M5F (13); open rear concourse around dual shafts
  assert.equal(world.isMallArea(-31, 15, 7), false);
  assert.equal(world.isMallArea(-24, 20, 9), true);
  assert.equal(world.isMallArea(-38, 20, 11), true);
  assert.equal(world.isMallArea(-28, 7.0, 5), true);
  assert.equal(world.isMallArea(-44.5, 25, 13), true); // M5F IMAX auditorium floor
  assert.equal(world.isMallArea(-37.9, 20, 13), false); // West Lightwell
  assert.equal(world.isMallArea(-24.1, 20, 13), false); // East Lightwell

  withMockCanvas(() => {
    const scene = new THREE.Scene();
    const pickables = [];
    const mall = new MallScene(scene, world, pickables);
    const mallCtrl = new LiftController({
      minFloor: 0,
      maxFloor: MALL_MAX_FLOOR,
      id: 'mall',
      startFloor: 5,
      allowedFloors: MALL_VALID_FLOORS,
    });

    // Storefronts on every floor + M5F Grand Cinema Multiplex
    const shopCount = pickables.filter((p) => ['mallShop', 'mallFood'].includes(p.userData?.action)).length;
    assert.ok(shopCount >= 20, `expected populated storefront pickables, got ${shopCount}`);
    assert.ok(mall.root.getObjectByName('Mall_store_MAISON_CHANEL'));
    assert.ok(mall.root.getObjectByName('Mall_store_GENTLE_MONSTER'));
    assert.ok(mall.root.getObjectByName('Mall_store_APPLE_GRAND_ATRIUM'));
    assert.ok(mall.root.getObjectByName('Mall_store_GORDON_RAMSAY_BURGER'));
    assert.ok(mall.root.getObjectByName('Mall_IMAX_screen'));
    assert.ok(pickables.some((p) => p.userData?.action === 'mallCinemaTicket'));
    assert.ok(pickables.some((p) => p.userData?.action === 'mallCinemaSnack'));
    assert.ok(pickables.some((p) => p.userData?.action === 'mallCinemaSeat'));

    // 30+ animated Mall crowd people
    assert.ok(mall.mallPeople.length >= 30, `expected 30+ mall people, got ${mall.mallPeople.length}`);
    const p0x = mall.mallPeople[0].x;
    mall.update(mallCtrl, 1.5, { floor: 5, x: -32, z: 36.2 });
    assert.notEqual(mall.mallPeople[0].x, p0x);
  });

  const stay = new HotelStay();
  const p = { floor: 13, x: -42, z: 20, yaw: 0, pitch: 0, zone: 'lobby' };
  const seatRes = stay.interactMall('mallCinemaSeat', { seatX: -44.6, seatZ: 25.25, seatYaw: Math.PI, floorIndex: 13 }, p);
  assert.equal(seatRes.ok, true);
  assert.equal(p.x, -44.6);
  const npcRes = stay.interactMall('mallPerson', { personId: 'crowd-1', personName: '지우', roleLabel: '쇼퍼', quote: '좋아요!' });
  assert.equal(npcRes.ok, true);
  assert.equal(stay.socialContacts.has('mallPerson:crowd-1'), true);
});

test('experiential mall attractions span spiral slide, kinetic show, arcade bowling, teamLab, sushi belt, 4DX cinema, & hand viewmodels', () => {
  const world = new HotelWorld();
  const mallCtrl = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    startFloor: 5,
    allowedFloors: MALL_VALID_FLOORS,
  });

  withMockCanvas(() => {
    const scene = new THREE.Scene();
    const pickables = [];
    const mall = new MallScene(scene, world, pickables);

    assert.ok(mall.root.getObjectByName('Mall_spiral_slide'));
    assert.ok(mall.root.getObjectByName('Mall_grand_piano'));
    assert.ok(mall.root.getObjectByName('Mall_photo_booth'));
    assert.ok(mall.root.getObjectByName('Mall_dj_booth'));
    assert.ok(mall.root.getObjectByName('Mall_bowling_lane'));
    assert.ok(mall.root.getObjectByName('Mall_arcade_claw'));
    assert.ok(mall.root.getObjectByName('Mall_teamlab_room'));
    assert.ok(mall.root.getObjectByName('Mall_robot_dog'));
    assert.ok(mall.root.getObjectByName('Mall_sushi_belt'));
    assert.ok(mall.root.getObjectByName('Mall_teppanyaki_grill'));
    assert.ok(mall.root.getObjectByName('Mall_glamping_campfire'));
    assert.ok(mall.root.getObjectByName('Mall_wishing_fountain'));
    assert.ok(mall.root.getObjectByName('Mall_supercar_testdrive'));
    assert.ok(mall.kineticOrbs.length >= 16);
    assert.ok(mall.fountainJets.length >= 6);
    assert.ok(mall.sushiPlates.length >= 8);
    assert.ok(mall.bowlingPins.length >= 6);

    // Animations & triggered shows execute smoothly without throwing
    const plate0X = mall.sushiPlates[0].position.x;
    mall.triggerFountainShow(1.0);
    mall.triggerKineticShow(1.0);
    mall.triggerBowlingStrike(1.0);
    mall.triggerTeppanyakiFlame(1.0);
    mall.triggerRobotDogTrick(1.0);
    mall.setCinemaMovie(1);
    mall.update(mallCtrl, 1.8, { floor: 9, x: -27.5, z: 31.0 });
    assert.notEqual(mall.sushiPlates[0].position.x, plate0X);
    assert.notEqual(mall.bowlingBall.position.x, -38.0);
  });

  // Stay rewards, mode cycling, spiral slide descent & first-person viewmodel item tracking
  const stay = new HotelStay();
  const p = { floor: 13, x: -37.2, z: 14.9, yaw: 0, pitch: 0, zone: 'lobby', worldY: 28 };
  const slideRes = stay.interactMall('mallSpiralSlide', { floorIndex: 13 }, p);
  assert.equal(slideRes.ok, true);
  assert.equal(p.floor, 5);
  assert.equal(p.worldY, 0);
  assert.equal(slideRes.slideRide.startFloor, 13);

  const pbRes = stay.interactMall('mallPhotoBooth', { floorIndex: 7 }, p);
  assert.equal(pbRes.photoFlash, true);
  assert.equal(stay.heldMallItem, 'photocard');

  stay.interactMall('mallCinemaSnack', { floorIndex: 13 }, p);
  assert.equal(stay.heldMallItem, 'popcorn');

  stay.interactMall('mallMatchaCone', { floorIndex: 11 }, p);
  assert.equal(stay.heldMallItem, 'matcha');

  stay.interactMall('mallArcade', { floorIndex: 9 }, p);
  assert.equal(stay.gachaCount, 1);
  assert.equal(stay.heldMallItem, 'bag');

  stay.interactMall('mallBowling', { floorIndex: 9 }, p);
  assert.equal(stay.bowlingStrikes, 1);

  const movRes = stay.interactMall('mallCinemaSwitch', { floorIndex: 13 }, p);
  assert.equal(movRes.cinemaMovieIndex, 1 % MALL_CINEMA_MOVIES.length);

  const djRes = stay.interactMall('mallDjBooth', { floorIndex: 7 }, p);
  assert.equal(djRes.djTrackIndex, 1 % MALL_DJ_TRACKS.length);
});
