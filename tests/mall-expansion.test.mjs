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
import { Escalators, ESCALATOR_STOPS } from '../src/escalator.js';
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
import { cinemaRowMetrics, MALL_ROOF_Y, MALL_STORY_H, MallScene } from '../src/mall-scene.js';
import { buildStylizedHuman } from '../src/character-builder.js';
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
    // Framed 3.6m Glass Connecting Vestibule at z ∈ [14.2, 17.8] is open at center z = 16.0 while enclosed north & south
    assert.equal(cast(hs.floors[5], [-10.0, 1.5, 16.0], [-1, 0, 0], 4.0)[0], undefined);
    assert.ok(cast(hs.floors[5], [-10.0, 1.5, 11.5], [-1, 0, 0], 4.0)[0], 'expected 1F west wall enclosed at z=11.5');
    assert.ok(cast(hs.floors[5], [-10.0, 1.5, 20.5], [-1, 0, 0], 4.0)[0], 'expected 1F west wall enclosed at z=20.5');
    assert.equal(world.isMallArea(-13.0, 16.0, 5), true);
    assert.equal(world.isMallArea(-13.0, 11.5, 5), false);
    assert.equal(world.isMallArea(-13.0, 20.5, 5), false);

    const view = new EscalatorView(new THREE.Scene());
    view.root.updateMatrixWorld(true);
    const stopSet = new Set(view.root.children.map((g) => g.userData.floorIndex));
    assert.deepEqual(
      [...stopSet].sort((a, b) => a - b),
      [...ESCALATOR_STOPS]
    );
    for (const f of [0, 4, 5, 7, 9, 11, 13]) {
      const y = (f - 5) * PITCH + 1.4;
      const eastPortalHit = cast(view.root, [-23.2, y, 20.9], [1, 0, 0], 2.0)[0];
      assert.equal(eastPortalHit, undefined, `expected central escalator east portal open on floor ${FLOORS[f]}`);
      if (f < 13) {
        const westPortalHit = cast(view.root, [-38.8, y, 20.9], [-1, 0, 0], 2.0)[0];
        assert.equal(westPortalHit, undefined, `expected central escalator west portal open on floor ${FLOORS[f]}`);
      } else {
        const northFoyerHit = cast(view.root, [-38.2, y, 18.0], [0, 0, -1], 2.0)[0];
        assert.equal(northFoyerHit, undefined, 'expected M5F west escalator landing north foyer portal open');
      }
    }
    for (const mezz of [6, 8, 10, 12, 14]) {
      assert.equal(stopSet.has(mezz), false, `expected no mid-air mezzanine landing on floor ${FLOORS[mezz]}`);
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

  // Walk out of long direct Escalator East landing onto M2F (floor 7) East Gallery
  const escalators = new Escalators();
  const escPlayer = new WalkingPlayer(null, world, escalators, null, null, mallCtrl);
  escPlayer.floor = 7;
  escPlayer.zone = 'escalator';
  escPlayer.escalatorY = (7 - 5) * PITCH;
  escPlayer.worldY = escPlayer.escalatorY;
  escPlayer.x = -23.0;
  escPlayer.z = 20.9;
  escPlayer.yaw = -Math.PI / 2;
  for (let i = 0; i < 8; i++) escPlayer.move(1, 0, 0.1, hotelCtrl, true, mallCtrl);
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
  // Atrium void on M2F (7); East/West escalator landings on M3F (9) & M4F (11); Cinema & twin lightwells on M5F (13); open rear concourse around dual shafts
  assert.equal(world.isMallArea(-31, 15, 7), false);
  assert.equal(world.isMallArea(-24, 20, 9), true);
  assert.equal(world.isMallArea(-38, 20, 11), true);
  assert.equal(world.isMallArea(-28, 7.0, 5), true);
  assert.equal(world.isMallArea(-44.5, 25, 13), true); // M5F IMAX auditorium floor
  assert.equal(world.isMallArea(-33.0, 14.5, 13), false); // West Lightwell
  assert.equal(world.isMallArea(-24.0, 14.5, 13), false); // East Lightwell

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

    // Suspended Atrium banners have ceiling hanger rods & Roastery canopy has grounded columns
    for (const bannerName of ['Mall_M1F_directory_sign', 'Mall_M2F_sign', 'Mall_M5F_banner']) {
      const banner = mall.root.getObjectByName(bannerName);
      assert.ok(banner, `expected ${bannerName}`);
      assert.ok(
        banner.children.some((c) => c.name === `${bannerName}_hanger`),
        `expected ceiling suspension hangers on ${bannerName}`
      );
    }
    assert.ok(mall.root.getObjectByName('Mall_roastery_post'), 'expected grounded posts under M1F Roastery canopy');

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

test('cinema requires kiosk ticketing and concession flow with QR gate inspection before auditorium entry', () => {
  const world = new HotelWorld();
  const mallCtrl = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    startFloor: 13,
    allowedFloors: MALL_VALID_FLOORS,
  });

  withMockCanvas(() => {
    const scene = new THREE.Scene();
    const pickables = [];
    const mall = new MallScene(scene, world, pickables);

    assert.ok(mall.root.getObjectByName('Cinema_ticket_kiosk_0'));
    assert.ok(mall.root.getObjectByName('Cinema_snack_kiosk_0'));
    assert.ok(mall.root.getObjectByName('Cinema_popcorn_warmer'));
    assert.ok(mall.root.getObjectByName('Cinema_soda_fountain'));
    assert.ok(mall.root.getObjectByName('Cinema_ticket_gate'));
    assert.ok(mall.root.getObjectByName('Cinema_projection_window'));
    assert.ok(mall.root.getObjectByName('Cinema_stage_deck'));
    assert.ok(pickables.some((o) => o.userData?.action === 'mallCinemaGate'));

    // Before ticketing: gate and acoustic walls block direct entry into Hall 1
    assert.equal(world.canOccupy(13, -41.9, 13.6), false);
    assert.equal(world.canOccupy(13, -39.6, 20.0), false);

    const stay = new HotelStay();
    const guest = { floor: 13, x: -41.9, z: 11.4, yaw: Math.PI, pitch: 0, zone: 'lobby' };

    const deniedGate = stay.interactMall('mallCinemaGate', { floorIndex: 13 }, guest);
    assert.equal(deniedGate.ok, false);
    assert.equal(deniedGate.gateBlocked, true);

    const deniedSeat = stay.interactMall(
      'mallCinemaSeat',
      { seatX: -44.6, seatZ: 25.25, seatYaw: Math.PI, floorIndex: 13 },
      guest
    );
    assert.equal(deniedSeat.ok, false);
    assert.equal(deniedSeat.gateBlocked, true);

    // 1) Self-Ticketing Kiosk order
    const ticketRes = stay.interactMall('mallCinemaTicket', { floorIndex: 13 }, guest);
    assert.equal(ticketRes.ok, true);
    assert.equal(stay.heldMallItem, 'ticket');
    assert.equal(stay.cinemaTicket?.seat, 'VIP B열 3번');
    assert.equal(stay.cinemaGateOpen, false);

    // 2) Self-Order Concession Kiosk snack pickup
    const snackRes = stay.interactMall('mallCinemaSnack', { floorIndex: 13 }, guest);
    assert.equal(snackRes.ok, true);
    assert.equal(stay.heldMallItem, 'popcorn');
    assert.ok(stay.cinemaSnack);

    // 3) Smart QR Ticket Inspection at Entrance Gate opens flaps & advances guest inside
    const gateRes = stay.interactMall('mallCinemaGate', { floorIndex: 13 }, guest);
    assert.equal(gateRes.ok, true);
    assert.equal(stay.cinemaGateOpen, true);
    assert.ok(guest.z > 14.0, `expected guest inside auditorium, got z=${guest.z}`);

    world.cinemaGateOpen = Boolean(stay.cinemaGateOpen);
    assert.equal(world.canOccupy(13, -41.9, 13.6), true);

    mall.setCinemaGateState(stay.cinemaGateOpen, stay.cinemaTicket);
    mall.update(mallCtrl, 0, guest);
    assert.ok(mall.cinemaGateDoors.left.position.x < -43.0);
    assert.ok(mall.cinemaGateDoors.right.position.x > -40.7);

    // 4) Guest can now sit in VIP recliner seat inside auditorium
    const seatRes = stay.interactMall(
      'mallCinemaSeat',
      { seatX: -44.6, seatZ: 25.25, seatYaw: Math.PI, floorIndex: 13 },
      guest
    );
    assert.equal(seatRes.ok, true);
    assert.equal(guest.x, -44.6);
  });
});

test('mall visitors always face their direction of travel across patrol cycles', () => {
  withMockCanvas(() => {
    const scene = new THREE.Scene();
    const pickables = [];
    const mall = new MallScene(scene, new HotelWorld(), pickables);
    const mallCtrl = new LiftController({
      minFloor: 0,
      maxFloor: MALL_MAX_FLOOR,
      id: 'mall',
      startFloor: 5,
      allowedFloors: MALL_VALID_FLOORS,
    });
    const verifiedForward = new Set();
    const verifiedReturn = new Set();
    for (const t of [0.5, 1.5, 2.5, 4.0, 6.5, 9.0, 12.0, 15.5]) {
      const dt = 0.002;
      mall.update(mallCtrl, t, { floor: 5, x: -32, z: 36.2 });
      const snap = mall.mallPeople.map((p) => ({
        x: p.root.position.x,
        z: p.root.position.z,
        yaw: p.root.rotation.y,
      }));
      mall.update(mallCtrl, t + dt, { floor: 5, x: -32, z: 36.2 });
      for (let i = 0; i < mall.mallPeople.length; i++) {
        const person = mall.mallPeople[i];
        if (person.seat) continue;
        const dx = person.root.position.x - snap[i].x;
        const dz = person.root.position.z - snap[i].z;
        const step = Math.hypot(dx, dz);
        if (step < 1e-5) continue;
        // Skip only if dt straddled a waypoint reversal cusp between t and t+dt
        const yawDiff = Math.abs(Math.atan2(Math.sin(person.root.rotation.y - snap[i].yaw), Math.cos(person.root.rotation.y - snap[i].yaw)));
        if (yawDiff > 0.1) continue;
        const fwdX = Math.sin(snap[i].yaw);
        const fwdZ = Math.cos(snap[i].yaw);
        const dot = (dx / step) * fwdX + (dz / step) * fwdZ;
        assert.ok(dot > 0.99, `expected ${person.id} walking forward at t=${t}, got dot=${dot.toFixed(3)}`);
        const abx = person.bx - person.ax;
        const abz = person.bz - person.az;
        if (dx * abx + dz * abz > 0) verifiedForward.add(person.id);
        else verifiedReturn.add(person.id);
      }
    }
    assert.ok(verifiedForward.size >= 25, `expected most patrol visitors tested forward, got ${verifiedForward.size}`);
    assert.ok(verifiedReturn.size >= 25, `expected most patrol visitors tested returning, got ${verifiedReturn.size}`);
  });
});

test('dual mall elevators A and B run, light indicators, and board independently', () => {
  const world = new HotelWorld();
  const hotelCtrl = new LiftController();
  const mallCtrlA = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall',
    startFloor: 5,
    allowedFloors: MALL_VALID_FLOORS,
  });
  const mallCtrlB = new LiftController({
    minFloor: 0,
    maxFloor: MALL_MAX_FLOOR,
    id: 'mall-b',
    startFloor: 9,
    allowedFloors: MALL_VALID_FLOORS,
  });

  withMockCanvas(() => {
    const mall = new MallScene(new THREE.Scene(), world, []);
    mall.update(mallCtrlA, 1.0, null, mallCtrlB);
    assert.equal(mall.mallCars[0].position.y, 0);
    assert.equal(mall.mallCars[1].position.y, 14);

    // Call A to M5F (13) — B stays stationary at M3F (9)
    mallCtrlA.callCar(13);
    advanceLift(mallCtrlA, 22.0);
    mall.update(mallCtrlA, 23.0, null, mallCtrlB);
    assert.equal(mallCtrlA.floor, 13);
    assert.equal(mallCtrlB.floor, 9);
    assert.ok(mall.mallCars[0].position.y > 27.5);
    assert.equal(mall.mallCars[1].position.y, 14);
  });

  // Board Car B independently on M3F while Car A remains parked on M5F
  const player = new WalkingPlayer(null, world, null, null, null, mallCtrlA, mallCtrlB);
  player.floor = 9;
  player.zone = 'lobby';
  player.x = MALL_LIFT_2_X;
  player.z = MALL_LIFT_Z + 2.0;
  player.yaw = 0;

  mallCtrlB.callHall(9, -1);
  advanceLift(mallCtrlB, 1.5);
  assert.ok(mallCtrlB.door >= 0.95);
  for (let i = 0; i < 20; i++) player.move(1, 0, 0.1, hotelCtrl, false, mallCtrlA, mallCtrlB);
  assert.equal(player.zone, 'mallCabin');
  assert.equal(player.activeMallCar, 'B');

  player.z = MALL_LIFT_Z;
  mallCtrlB.callCar(5);
  mallCtrlB.closeDoor();
  advanceLift(mallCtrlB, 15.0);
  player.sync(hotelCtrl, mallCtrlA, mallCtrlB);
  assert.equal(mallCtrlB.floor, 5);
  assert.equal(player.floor, 5);
  assert.equal(mallCtrlA.floor, 13);
});

test('mall basement parking visibility prevents stacked lower-level bleed-through from M1F and B3', () => {
  withMockCanvas(() => {
    const world = new HotelWorld();
    const mall = new MallScene(new THREE.Scene(), world, []);
    mall.updateVisibility('game', 5, true);
    const visM1F = mall.floors.map((fg) => [fg.userData.floorIndex, fg.visible]);
    assert.equal(visM1F.find(([f]) => f === 4)?.[1], true);
    assert.equal(visM1F.find(([f]) => f === 5)?.[1], true);
    assert.equal(visM1F.find(([f]) => f === 13)?.[1], true);
    for (const f of [0, 1, 2, 3]) {
      assert.equal(visM1F.find(([idx]) => idx === f)?.[1], false, `expected floor ${f} hidden on M1F`);
    }

    mall.updateVisibility('game', 2, true);
    const visB3 = mall.floors.map((fg) => [fg.userData.floorIndex, fg.visible]);
    assert.equal(visB3.find(([f]) => f === 0)?.[1], false);
    assert.equal(visB3.find(([f]) => f === 1)?.[1], true);
    assert.equal(visB3.find(([f]) => f === 2)?.[1], true);
    assert.equal(visB3.find(([f]) => f === 3)?.[1], true);
    assert.equal(visB3.find(([f]) => f === 4)?.[1], false);
    assert.equal(visB3.find(([f]) => f === 5)?.[1], true);
  });
});

test('seated cinema audience sits flush on terraced chairs with bent knees and grounded shoes', () => {
  const standingRig = buildStylizedHuman({ seated: false, facingDir: 1 });
  standingRig.root.updateMatrixWorld(true);
  const standingSoles = [];
  standingRig.root.traverse((o) => {
    if (o.isMesh && o.name === 'Char_shoe_sole') {
      standingSoles.push(new THREE.Box3().setFromObject(o));
    }
  });
  assert.equal(standingSoles.length, 2);
  for (const box of standingSoles) {
    assert.ok(Math.abs(box.min.y) <= 0.005, `expected standing sole min.y near 0, got ${box.min.y}`);
  }

  withMockCanvas(() => {
    const world = new HotelWorld();
    const scene = new THREE.Scene();
    const mall = new MallScene(scene, world, []);
    scene.updateMatrixWorld(true);

    const seatedPeople = mall.mallPeople.filter((p) => p.seat);
    assert.ok(seatedPeople.length >= 3, `expected at least 3 seated viewers across rows, got ${seatedPeople.length}`);
    const coveredRows = new Set(seatedPeople.map((p) => p.seatRow));
    assert.deepEqual([...coveredRows].sort((a, b) => a - b), [0, 1, 2]);

    for (const person of seatedPeople) {
      const { sz, riserTop, seatTop } = cinemaRowMetrics(person.seatRow);
      const baseY = person.baseY;
      let pelvisBox = null;
      let torsoBox = null;
      const soles = [];
      const calves = [];

      person.root.traverse((o) => {
        if (!o.isMesh) return;
        const box = new THREE.Box3().setFromObject(o);
        if (o.name === 'Char_pelvis') pelvisBox = box;
        if (o.name === 'Char_torso') torsoBox = box;
        if (o.name === 'Char_shoe_sole') soles.push(box);
        if (o.name === 'Char_calf') calves.push(box);
      });

      assert.ok(pelvisBox && torsoBox && soles.length === 2 && calves.length === 2);
      assert.ok(
        pelvisBox.min.y >= baseY + seatTop - 0.06 && pelvisBox.min.y <= baseY + seatTop + 0.01,
        `${person.id} pelvis min.y=${pelvisBox.min.y.toFixed(3)} not flush with seatTop=${(baseY + seatTop).toFixed(3)}`
      );
      assert.ok(pelvisBox.max.y > baseY + seatTop, `${person.id} pelvis should sit atop seatTop`);

      for (const soleBox of soles) {
        assert.ok(
          Math.abs(soleBox.min.y - (baseY + riserTop)) <= 0.015,
          `${person.id} sole min.y=${soleBox.min.y.toFixed(3)} not grounded on riserTop=${(baseY + riserTop).toFixed(3)}`
        );
      }
      for (const calfBox of calves) {
        assert.ok(calfBox.min.y < pelvisBox.min.y - 0.25, `${person.id} calf should bend down below seat`);
        assert.ok(
          calfBox.min.z >= sz + 0.22,
          `${person.id} calf min.z=${calfBox.min.z.toFixed(3)} clips cushion front ${(sz + 0.23).toFixed(3)}`
        );
      }
      assert.ok(
        torsoBox.min.z >= sz - 0.215,
        `${person.id} torso min.z=${torsoBox.min.z.toFixed(3)} clips backrest front ${(sz - 0.21).toFixed(3)}`
      );
    }
  });
});

test('player can walk seamlessly outdoors between Mall exterior plaza and Hotel entrance plaza', () => {
  withMockCanvas(() => {
    const world = new HotelWorld();
    const scene = new THREE.Scene();
    new HotelScene(scene, world, []);
    new MallScene(scene, world, []);

    assert.equal(world.canOccupy(5, -13.85, 41.0), true);

    const ctrl = new LiftController();
    const mallCtrlA = new LiftController({
      minFloor: 0,
      maxFloor: MALL_MAX_FLOOR,
      id: 'mall',
      startFloor: 5,
      allowedFloors: MALL_VALID_FLOORS,
    });
    const player = new WalkingPlayer(null, world, null, null, null, mallCtrlA, null);
    player.floor = 5;
    player.zone = 'lobby';
    player.x = -32.0;
    player.z = 34.5;

    // 1. Walk South out through the Mall automatic glass entrance (z = 36) onto Mall outdoor plaza
    player.yaw = Math.PI;
    for (let i = 0; i < 33; i++) player.move(1, 0, 0.05, ctrl, false, mallCtrlA);
    assert.ok(player.z >= 37.5 && player.z <= 38.2, `expected Mall outdoor plaza around z=37.8, got z=${player.z}`);

    // 2. Turn East and walk outdoors across the x = -14.0..-13.7 plaza seam straight onto Hotel outdoor plaza
    player.yaw = -Math.PI / 2;
    for (let i = 0; i < 160; i++) player.move(1, 0, 0.1, ctrl, false, mallCtrlA);
    assert.ok(player.x >= -2.0, `expected Hotel outdoor plaza x >= -2, got x=${player.x}`);

    // 3. Walk North through Hotel main entrance (z = 26) into Hotel lobby
    player.yaw = 0;
    for (let i = 0; i < 80; i++) player.move(1, 0, 0.1, ctrl, false, mallCtrlA);
    assert.ok(player.z <= 22.5, `expected inside Hotel lobby z <= 22.5, got z=${player.z}`);
    assert.equal(player.floor, 5);

    // 4. Walk back from Hotel outdoor plaza West across the seam onto Mall outdoor plaza
    player.x = -5.0;
    player.z = 45.5;
    player.yaw = Math.PI / 2;
    for (let i = 0; i < 120; i++) player.move(1, 0, 0.1, ctrl, false, mallCtrlA);
    assert.ok(player.x <= -28.0, `expected back on Mall outdoor plaza x <= -28, got x=${player.x}`);
  });
});
