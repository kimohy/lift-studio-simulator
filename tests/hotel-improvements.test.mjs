import assert from 'node:assert/strict';
import { test } from 'node:test';
import { floorMeta, floorUsage } from '../src/building.js';
import { computeCabinLoad, LiftController } from '../src/controller.js';
import { HotelSoundEffects } from '../src/elevator-audio.js';
import {
  FAST_TRAVEL_SPOTS,
  FLOOR_AMENITY_SPECS,
  GRAND_CAFE_MENU,
  HOTEL_QUESTS,
  HotelStay,
  TOUR_CHECKLIST,
  VIP_TIERS,
} from '../src/hotel-stay.js';
import { LiftScene, TIME_OF_DAY_MODES, WEATHER_MODES } from '../src/scene.js';

test('floorMeta identifies floor 14 as rooftop pool while floorUsage stays backward-compatible', () => {
  assert.equal(floorUsage(14).kind, 'guest');
  assert.equal(floorMeta(14, '10').badge, '루프탑 풀');
  assert.match(floorMeta(14, '10').title, /루프탑/);
  assert.equal(floorMeta(5, '1').kind, 'lobby');
});

test('LiftController vipMode bypasses hall calls when car calls exist and restores hall calls when toggled off', () => {
  const c = new LiftController();
  c.callHall(8, 1);
  c.toggleVipMode(true);
  assert.equal(c.vipMode, true);
  assert.deepEqual(c.pending(), []);
  c.callCar(10);
  assert.deepEqual(c.pending(), [10]);
  c.toggleVipMode(false);
  assert.equal(c.vipMode, false);
  assert.deepEqual(c.pending(), [8, 10]);
});

test('computeCabinLoad sums player, cabin NPCs, and delivery robot weight accurately', () => {
  const empty = computeCabinLoad({ gameActive: false });
  assert.equal(empty.passengers, 0);
  assert.equal(empty.weightKg, 0);

  const loaded = computeCabinLoad({
    gameActive: true,
    player: { zone: 'cabin' },
    npcs: { npcs: [{ zone: 'cabin' }, { zone: 'lobby' }, { zone: 'cabin' }] },
    robot: { zone: 'cabin' },
  });
  assert.equal(loaded.passengers, 3);
  assert.equal(loaded.robotInCabin, true);
  assert.equal(loaded.weightKg, 70 + 2 * 68 + 45);
  assert.equal(loaded.percent, Math.round((251 / 1000) * 100));
});

test('HotelStay tracks 6 tour checklist milestones, Grand Café orders, seating, and car inspections', () => {
  const stay = new HotelStay();
  assert.equal(stay.getChecklistStatus().totalCount, TOUR_CHECKLIST.length);
  assert.equal(stay.getChecklistStatus().doneCount, 0);

  stay.checkIn('reception-a');
  assert.equal(stay.completed.has('checkIn'), true);

  const cafeRes = stay.orderCafe();
  assert.equal(cafeRes.item, GRAND_CAFE_MENU[0]);
  assert.equal(stay.completed.has('cafeLounge'), true);

  const player = { floor: 5, x: 0, z: 0, yaw: 0, pitch: 0 };
  const sitRes = stay.sitAtCafe(player, -2.5, 4.1, 1.2);
  assert.equal(player.x, -2.5);
  assert.equal(player.z, 4.1);
  assert.match(sitRes.message, /테이블/);

  const loungeRes = stay.sitAtLounge(player, 2.2, 3.8, -0.5);
  assert.equal(player.x, 2.2);
  assert.match(loungeRes.message, /소파/);

  const carRes = stay.inspectCar({ carName: '전기 세단', floorLabel: 'B2' });
  assert.match(carRes.message, /전기 세단/);
  assert.equal(FAST_TRAVEL_SPOTS.length, 5);
});

test('TIME_OF_DAY_MODES defines day, sunset, and night presets and LiftScene cycles through them', () => {
  assert.equal(TIME_OF_DAY_MODES.length, 3);
  const proto = Object.create(LiftScene.prototype);
  proto.timeOfDayIndex = 0;
  proto.scene = { background: { setHex() {} }, fog: { color: { setHex() {} } } };
  proto.renderer = {};
  proto.lights = {
    hemisphere: { color: { setHex() {} }, groundColor: { setHex() {} }, intensity: 1 },
    key: { color: { setHex() {} }, intensity: 1 },
    rim: { intensity: 1 },
  };
  const next = proto.cycleTimeOfDay();
  assert.equal(next.id, 'sunset');
  const night = proto.cycleTimeOfDay();
  assert.equal(night.id, 'night');
  const day = proto.cycleTimeOfDay();
  assert.equal(day.id, 'day');
});

test('HotelSoundEffects safely no-ops when sound is disabled or AudioContext is absent', () => {
  const sfx = new HotelSoundEffects(() => null, () => 0.5, () => false);
  assert.doesNotThrow(() => {
    sfx.playButton();
    sfx.playKeycard(true);
    sfx.playKeycard(false);
    sfx.playRobot();
    sfx.playWater();
  });
});

test('resting on sunbeds or cabana keeps player in a walkable position where WASD movement works freely', async () => {
  const { RooftopPool } = await import('../src/rooftop-pool.js');
  const { WalkingPlayer } = await import('../src/player.js');
  const pool = new RooftopPool();
  // Register actual sunbed and cabana obstacles as RooftopPoolView does
  for (const bx of [-4.2, -2.0, 2.0, 4.2]) {
    pool.addObstacle(bx - 0.41, bx + 0.41, 11.6 - 0.975, 11.6 + 0.975);
  }
  pool.addObstacle(8.4 - 1.4, 8.4 + 1.4, 11.4 - 1.3, 11.4 + 1.3);

  const c = new LiftController();
  const player = new WalkingPlayer(null, null, null, null, pool);
  player.floor = 14;
  player.zone = 'pool';

  for (const [rx, rz] of [
    [-4.2, 12.85],
    [-2.0, 12.85],
    [2.0, 12.85],
    [4.2, 12.85],
    [8.4, 13.0],
  ]) {
    pool.restOnSunbed(player, rx, rz);
    assert.equal(pool.canOccupy(player.x, player.z, player, c), true);
    const startZ = player.z;
    player.move(1, 0, 0.2, c, false); // walk forward (+z since yaw=PI)
    assert.ok(player.z > startZ, `player should walk freely from sunbed at (${rx}, ${rz})`);
  }
});

test('HotelStay tracks VIP membership tiers, energy, floor amenities across all 15 floors, and 6 concierge quests', () => {
  const stay = new HotelStay();
  assert.equal(VIP_TIERS.length, 5);
  assert.equal(HOTEL_QUESTS.length, 6);
  assert.equal(Object.keys(FLOOR_AMENITY_SPECS).length, 15);
  assert.equal(stay.vipTier.id, 'classic');
  assert.equal(stay.energy, 85);

  // Quest 1: check-in + room301 milestone
  stay.checkIn('reception-a');
  stay.completeMilestone('room301');
  assert.ok(stay.completedQuests.has('quest-checkin'));

  // Quest 2: cafe order + sit at lounge
  stay.orderCafe();
  const player = { floor: 5, x: 0, z: 0, yaw: 0, pitch: 0 };
  stay.sitAtLounge(player, 2.2, 3.8, -0.5);
  assert.ok(stay.completedQuests.has('quest-gourmet'));

  // Quest 3: room comfort (3 distinct room actions)
  stay.recordRoomAction('roomTV');
  stay.recordRoomAction('roomBed');
  const qRoom = stay.recordRoomAction('roomCoffee');
  assert.ok(stay.completedQuests.has('quest-suite'));
  assert.ok(qRoom.some((q) => q.id === 'quest-suite'));

  // Quest 4: DELI room service
  stay.completeMilestone('roomService');
  assert.ok(stay.completedQuests.has('quest-deli'));

  // Quest 5: rooftop resort (poolSwim + poolBar)
  stay.recordRooftopAction('poolSwim');
  stay.recordRooftopAction('poolBar');
  assert.ok(stay.completedQuests.has('quest-rooftop'));

  // Quest 6: floor explorer & social
  const am1 = stay.useFloorAmenity(6);
  assert.equal(am1.ok, true);
  assert.ok(am1.pointsAdded > 0);
  stay.useFloorAmenity(10);
  stay.useFloorAmenity(13);
  stay.recordSocial('npc-0');
  stay.recordSocial('robot');
  assert.ok(stay.completedQuests.has('quest-explorer'));

  const status = stay.getQuestStatus();
  assert.equal(status.doneCount, 6);
  assert.equal(status.totalCount, 6);
  assert.equal(stay.vipTier.id, 'royal');
  assert.equal(stay.energy, 100);
});

test('decorateFloor registers interactive floorAmenity station on guest, lobby, rooftop, and parking floors', async () => {
  const THREE = await import('three');
  const { decorateFloor } = await import('../src/floor-interiors.js');
  const prevDoc = globalThis.document;
  if (!globalThis.document) {
    globalThis.document = {
      createElement: () => ({
        width: 256,
        height: 128,
        getContext: () => ({
          fillRect() {},
          strokeRect() {},
          fillText() {},
        }),
      }),
    };
  }
  try {
    for (const floorIndex of [0, 3, 5, 7, 13, 14]) {
      const room = new THREE.Group();
      const pickables = [];
      decorateFloor(room, floorIndex, { expanded: floorIndex === 5, pickables });
      const amenities = pickables.filter((p) => p.userData.action === 'floorAmenity');
      assert.ok(amenities.length >= 1, `floor ${floorIndex} should have a floorAmenity pickable`);
      assert.equal(amenities[0].userData.floorIndex, floorIndex);
    }
  } finally {
    globalThis.document = prevDoc;
  }
});

test('HotelSoundEffects supports footstep surface synthesis, amenity chimes, and quest fanfare', () => {
  const sfx = new HotelSoundEffects(() => null, () => 0.5, () => false);
  assert.doesNotThrow(() => {
    sfx.playFootstep('marble', false);
    sfx.playFootstep('wood', true);
    sfx.playFootstep('water', false);
    sfx.playAmenity();
    sfx.playQuestComplete();
  });
});

test('GameMode supports floorAmenity interaction, surface detection, and smooth camera lerp', async () => {
  const { GameMode } = await import('../src/game-mode.js');
  const { WalkingPlayer } = await import('../src/player.js');
  const c = new LiftController();
  const stay = new HotelStay();
  const player = new WalkingPlayer(stay, null, null, null, null);
  const game = Object.create(GameMode.prototype);
  game.active = true;
  game.controller = c;
  game.stay = stay;
  game.player = player;
  game.pool = { isWater: () => false };
  game.camOffset = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  game.walkBobPhase = 0;
  game.isMoving = false;
  game.holdingCoffee = false;
  game.view = {
    camera: {
      position: { x: 0, y: 1.65, z: 4, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      rotation: { order: 'YXZ', x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      updateMatrixWorld() {},
    },
    updateViewmodel() {},
  };
  const messages = [];
  game.message = (msg) => messages.push(msg);
  game.notifyQuestProgress = () => {};
  game.updateHUD = () => {};

  player.floor = 5;
  player.zone = 'lobby';
  assert.equal(game.detectSurfaceMaterial(), 'marble');
  player.floor = 2;
  assert.equal(game.detectSurfaceMaterial(), 'concrete');
  player.floor = 7;
  player.zone = 'room';
  assert.equal(game.detectSurfaceMaterial(), 'wood');
  player.zone = 'cabin';
  assert.equal(game.detectSurfaceMaterial(), 'metal');

  const res = game.interactFloorAmenity(8);
  assert.equal(res.ok, true);
  assert.equal(res.floorIndex, 8);
  assert.ok(messages.some((m) => m.includes('4F')));

  player.x = 0;
  player.z = 4.0;
  const prevPose = game.captureCameraPose();
  player.x = 2.0;
  player.z = 4.0;
  game.commitCameraLerp(prevPose);
  assert.ok(Math.abs(game.camOffset.x - -2.0) < 1e-6);
});

test('WEATHER_MODES defines 4 atmospheric presets and LiftScene cycles through them', () => {
  assert.equal(WEATHER_MODES.length, 4);
  const proto = Object.create(LiftScene.prototype);
  proto.weatherIndex = 0;
  proto.ready = false;
  proto.weatherMaterial = {
    color: { setHex() {} },
    size: 0.14,
    opacity: 0.45,
  };
  const starlight = proto.cycleWeather();
  assert.equal(starlight.id, 'starlight');
  const rain = proto.cycleWeather();
  assert.equal(rain.id, 'rain');
  const blossom = proto.cycleWeather();
  assert.equal(blossom.id, 'blossom');
  const clear = proto.cycleWeather();
  assert.equal(clear.id, 'clear');
});

test('GuestRoom supports VIP night turndown service via activateVipTurndown and 5th concierge phone call', async () => {
  const { GuestRoom } = await import('../src/guest-room.js');
  const stay = new HotelStay();
  const room = new GuestRoom(stay);
  const res = room.activateVipTurndown();
  assert.equal(res.ok, true);
  assert.equal(room.lightMode, 'warm');
  assert.equal(room.audioTrack.id, 'jazz');
  assert.equal(room.diffuserScent.id, 'lavender');
  assert.match(room.foodItem, /샴페인/);

  room.reset();
  for (let i = 0; i < 4; i++) {
    assert.equal(room.callConciergePhone().turndown, false);
  }
  const fifth = room.callConciergePhone();
  assert.equal(fifth.turndown, true);
  assert.match(room.foodItem, /샴페인/);
});

test('HotelSoundEffects supports playCarIgnition and playWeatherChime safely', () => {
  const sfx = new HotelSoundEffects(() => null, () => 0.5, () => false);
  assert.doesNotThrow(() => {
    sfx.playCarIgnition();
    sfx.playWeatherChime();
  });
});

test('GameMode supports radar minimap rendering, weather cycling, and smart-key car inspection pose', async () => {
  const { GameMode } = await import('../src/game-mode.js');
  const { WalkingPlayer } = await import('../src/player.js');
  const c = new LiftController();
  const stay = new HotelStay();
  const world = { canOccupy: () => true, location: () => '지하 주차장' };
  const player = new WalkingPlayer(stay, world, null, null, null);
  const game = Object.create(GameMode.prototype);
  game.active = true;
  game.controller = c;
  game.stay = stay;
  game.world = world;
  game.player = player;
  game.camOffset = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  game.view = {
    camera: {
      position: { x: 0, y: 1.65, z: 4, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      rotation: { order: 'YXZ', x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      updateMatrixWorld() {},
    },
    cycleWeather: () => WEATHER_MODES[2],
    sfx: { playWeatherChime() {}, playCarIgnition() {} },
    hotelScene: { flashCarLights() {} },
  };
  const messages = [];
  game.message = (msg) => messages.push(msg);
  game.notifyQuestProgress = () => {};

  const prevDoc = globalThis.document;
  let arcCalls = 0;
  globalThis.document = {
    getElementById: (id) => {
      if (id === 'game-minimap') {
        return {
          width: 144,
          height: 144,
          getContext: () => ({
            clearRect() {},
            fillRect() {},
            strokeRect() {},
            beginPath() {},
            moveTo() {},
            arc() { arcCalls++; },
            closePath() {},
            fill() {},
            stroke() {},
          }),
        };
      }
      return { textContent: '', hidden: true };
    },
  };
  try {
    player.floor = 5;
    game.renderMinimap();
    assert.ok(arcCalls >= 2, 'minimap should draw amenity and player markers');

    const wMode = game.cycleWeatherMode();
    assert.equal(wMode.id, 'rain');

    player.floor = 4; // B1
    player.x = 0;
    player.z = 14;
    game.interactParking({
      carId: 'Parked_car_0',
      carName: '그랜드 리무진 세단',
      floorLabel: 'B1층',
      carX: -4.8,
      carZ: 15.0,
    });
    assert.ok(Math.abs(player.x - (-4.8 + 1.55)) < 1e-6);
    assert.equal(player.z, 15.0);
  } finally {
    globalThis.document = prevDoc;
  }
});

test('LiftController pressTenKey controls all 15 floors (B5..10F), 1/10F disambiguation, and CLR cancellation', () => {
  const c = new LiftController();

  // Direct single-digit floor 3F (floorIndex = 7)
  const r3 = c.pressTenKey('3');
  assert.equal(r3.ok, true);
  assert.equal(r3.floor, 7);
  assert.equal(c.car.has(7), true);

  // Pressing 3 again cancels 3F
  const r3Cancel = c.pressTenKey('3');
  assert.equal(r3Cancel.action, 'cancelled');
  assert.equal(c.car.has(7), false);

  // Basement floor B2 (floorIndex = 3)
  const rb = c.pressTenKey('B');
  assert.equal(rb.action, 'buffer');
  assert.equal(c.tenKeyBuffer, 'B');
  const rb2 = c.pressTenKey('2');
  assert.equal(rb2.ok, true);
  assert.equal(rb2.floor, 3);
  assert.equal(c.car.has(3), true);

  // Invalid basement floor B8
  c.pressTenKey('B');
  const rbInvalid = c.pressTenKey('8');
  assert.equal(rbInvalid.ok, false);
  assert.equal(c.tenKeyDisplay, 'ERR');

  // 10F via '1' -> '0' (floorIndex = 14)
  const r1Buf = c.pressTenKey('1');
  assert.equal(r1Buf.action, 'buffer');
  assert.equal(c.tenKeyBuffer, '1');
  const r10 = c.pressTenKey('0');
  assert.equal(r10.ok, true);
  assert.equal(r10.floor, 14);
  assert.equal(c.car.has(14), true);

  // 1F via '1' -> 'ENT' (floorIndex = 5)
  c.floor = 8;
  c.position = 8 * 3.5;
  c.pressTenKey('1');
  const r1Ent = c.pressTenKey('ENT');
  assert.equal(r1Ent.ok, true);
  assert.equal(r1Ent.floor, 5);
  assert.equal(c.car.has(5), true);

  // CLR clears all active car calls
  const rClr = c.pressTenKey('CLR');
  assert.equal(rClr.action, 'cleared_calls');
  assert.equal(c.car.size, 0);

  // Auto-commit '1' after 1.1s in step(dt)
  c.pressTenKey('1');
  assert.equal(c.car.has(5), false);
  for (let i = 0; i < 60; i++) c.step(0.02); // 1.2s elapsed
  assert.equal(c.car.has(5), true);
});

test('10F excludes rooms 1001/1002 and Room 301 TV has unobstructed line-of-sight free of wall clipping', async () => {
  const THREE = await import('three');
  const { decorateFloor } = await import('../src/floor-interiors.js');
  const { GuestRoom } = await import('../src/guest-room.js');
  const { GuestRoomView } = await import('../src/guest-room-view.js');
  const { EscalatorView } = await import('../src/escalator-view.js');

  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 256,
      height: 256,
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        bezierCurveTo() {},
        stroke() {},
        createLinearGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };

  try {
    // 1. 10F (floor 14) must not create 1001 or 1002 doors
    const floor10Group = new THREE.Group();
    const floor10Pickables = [];
    decorateFloor(floor10Group, 14, { expanded: false, pickables: floor10Pickables });
    assert.equal(
      floor10Pickables.some((p) => p.userData.action === 'otherRoomDoor'),
      false,
      '10F should not have any guest room doors (1001/1002 removed)'
    );
    assert.equal(floor10Group.getObjectByName('Floor_side_sign_10'), undefined);
    assert.equal(
      floor10Group.getObjectByName('Lobby_reception_desk'),
      undefined,
      '10F pool entrance must not spawn a reception desk barrier'
    );

    // 2. Escalator back wall stays <= -2.50 (never protruding into Room 301 west wall at -2.31)
    const scene = new THREE.Scene();
    const escView = new EscalatorView(scene);
    const room = new GuestRoom(new HotelStay());
    const roomPickables = [];
    const roomView = new GuestRoomView(scene, room, roomPickables);
    scene.updateMatrixWorld(true);

    const escFloor7 = escView.root.children.find((g) => g.userData.floorIndex === 7);
    const escBackWall = escFloor7.getObjectByName('Escalator_back_wall');
    const escBox = new THREE.Box3().setFromObject(escBackWall);
    assert.ok(escBox.max.x <= -2.49, `Escalator_back_wall max.x (${escBox.max.x}) must not protrude past -2.50 into Room 301`);

    // 3. Room 301 TV and screen sit cleanly inside the room (> -2.25) and raycast from bed/center hits TV directly
    const tvScreen = roomView.root.getObjectByName('TV_welcome');
    assert.ok(tvScreen, 'TV_welcome screen should exist in Room 301');
    assert.ok(tvScreen.position.x > -2.2, 'TV_welcome should be mounted in front of the west wall');

    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 7 + 1.65, 8.6),
      new THREE.Vector3(-1, 0, 0),
      0,
      5
    );
    const hits = raycaster.intersectObjects([ escFloor7, roomView.root ], true);
    assert.ok(hits.length > 0, 'Raycast toward west wall at z=8.6 should hit TV');
    assert.ok(
      hits[0].object.name === 'TV_welcome' || hits[0].object.name === 'Wall_TV',
      `First hit should be TV_welcome or Wall_TV, got ${hits[0].object.name}`
    );

    // 4. Redundant interior wall signs are removed
    assert.equal(roomView.root.getObjectByName('Wardrobe_label'), undefined);
    assert.equal(roomView.root.getObjectByName('Coffee_bar_sign'), undefined);
  } finally {
    globalThis.document = prevDoc;
  }
});

test('lobby lighting anti-glare calibration and frame-rate optimizations (culling & zero-upload particles)', async () => {
  const THREE = await import('three');
  const { HotelScene } = await import('../src/hotel-scene.js');
  const { HotelWorld } = await import('../src/hotel-world.js');

  const day = TIME_OF_DAY_MODES.find((m) => m.id === 'day');
  assert.ok(day.exposure <= 0.85, 'Daytime exposure should be calibrated to prevent lobby glare');
  assert.ok(day.keyIntensity <= 1.1 && day.hemiIntensity <= 0.85, 'Daytime key/hemi lights should be balanced');

  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 256,
      height: 256,
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        bezierCurveTo() {},
        stroke() {},
      }),
    }),
  };
  try {
    const hs = new HotelScene(new THREE.Scene(), new HotelWorld(), []);
    assert.ok(hs.m.marble.roughness >= 0.45, 'Lobby marble should have satin roughness (>=0.45) to avoid specular glare');
    assert.ok(hs.m.warm.emissiveIntensity <= 0.35, 'Recessed ceiling downlights should have soft emissive intensity');

    // When player is inside 1F main lobby, B1 underground parking (floor 4) is culled
    hs.updateVisibility(5, true, false, { zone: 'lobby', x: 0, z: 12 });
    assert.equal(hs.floors[5].visible, true, '1F lobby should be visible');
    assert.equal(hs.floors[4].visible, false, 'B1 parking garage should be culled while player is inside 1F main lobby');

    // When player approaches the ramp on 1F, B1 parking becomes visible for seamless ramp descent
    hs.updateVisibility(5, true, false, { zone: 'lobby', x: 14, z: 30 });
    assert.equal(hs.floors[4].visible, true, 'B1 parking garage becomes visible when approaching vehicle ramp');

    // Weather particles animate via group transform without per-frame vertex buffer upload
    const proto = Object.create(LiftScene.prototype);
    proto.scene = new THREE.Scene();
    proto.weatherIndex = 2; // rain
    proto.setupWeatherParticles.call(proto);
    const posAttr = proto.weatherPoints.geometry.getAttribute('position');
    const initialVersion = posAttr.version;
    proto.updateWeatherParticles(2.5);
    assert.equal(posAttr.version, initialVersion, 'updateWeatherParticles should not re-upload vertex buffer every frame');
    assert.ok(proto.weatherPoints.position.y < 0, 'weatherPoints should animate via group Y offset');
  } finally {
    globalThis.document = prevDoc;
  }
});

test('expanded guest lounges, walk-in suites 201-902, and presidential 9F suites support door opening and interior exploration', async () => {
  const THREE = await import('three');
  const { HotelWorld } = await import('../src/hotel-world.js');
  const { decorateFloor } = await import('../src/floor-interiors.js');

  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 256,
      height: 256,
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        bezierCurveTo() {},
        stroke() {},
        createLinearGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };

  try {
    // 1. Inspect built 3D geometry for 5F-6F Executive Club Lounges, unified 9F Penthouse 901 (floor 13), and sealed non-executive floors
    const floor9Group = new THREE.Group();
    const pick9 = [];
    decorateFloor(floor9Group, 9, { expanded: false, pickables: pick9 });
    assert.ok(floor9Group.getObjectByName('Executive_lounge_5'));
    assert.ok(floor9Group.getObjectByName('West_lounge_bar_top_5'));
    assert.ok(floor9Group.getObjectByName('West_lounge_window_5'));
    assert.ok(pick9.some((o) => o.userData?.action === 'hotelLounge' && o.userData?.floorIndex === 9));

    const floor10Group = new THREE.Group();
    const pick10 = [];
    decorateFloor(floor10Group, 10, { expanded: false, pickables: pick10 });
    assert.ok(floor10Group.getObjectByName('Executive_lounge_6'));
    assert.ok(floor10Group.getObjectByName('West_lounge_bar_top_6'));
    assert.ok(floor10Group.getObjectByName('West_lounge_window_6'));
    assert.ok(pick10.some((o) => o.userData?.action === 'hotelLounge' && o.userData?.floorIndex === 10));

    const floor6Group = new THREE.Group();
    decorateFloor(floor6Group, 6, { expanded: false, pickables: [] });
    assert.equal(floor6Group.getObjectByName('Executive_lounge_2'), undefined);
    assert.ok(floor6Group.getObjectByName('West_wall_art_frame_2'));

    const floor13Group = new THREE.Group();
    const pick13 = [];
    decorateFloor(floor13Group, 13, { expanded: false, pickables: pick13 });
    assert.equal(floor13Group.getObjectByName('Executive_lounge_9'), undefined);
    assert.ok(floor13Group.getObjectByName('West_wall_art_frame_9'));
    assert.ok(floor13Group.getObjectByName('Door_pivot_901'));
    assert.ok(floor13Group.getObjectByName('Door_pivot_901_R'));
    assert.equal(floor13Group.getObjectByName('Door_pivot_902'), undefined);
    assert.ok(floor13Group.getObjectByName('Suite_interior_901'));
    assert.equal(floor13Group.getObjectByName('Suite_interior_902'), undefined);
    assert.ok(floor13Group.getObjectByName('Suite_grand_piano_901'));
    assert.ok(floor13Group.getObjectByName('Suite_spa_tub_901'));
    assert.ok(floor13Group.getObjectByName('Suite_fireplace_901'));
    assert.ok(floor13Group.getObjectByName('Suite_bar_body_901'));
    assert.ok(floor13Group.getObjectByName('Suite_dining_table_901'));
    assert.ok(floor13Group.getObjectByName('Suite_chandelier_901'));
    assert.ok(pick13.some((o) => o.userData?.action === 'suiteAmenity' && o.userData?.room === '901'));

    const floor7Group = new THREE.Group();
    const pick7 = [];
    decorateFloor(floor7Group, 7, { expanded: false, pickables: pick7 });
    assert.equal(floor7Group.getObjectByName('Executive_lounge_3'), undefined);
    assert.ok(floor7Group.getObjectByName('West_wall_art_frame_3'));
    assert.ok(floor7Group.getObjectByName('Suite_interior_302'));
    assert.ok(floor7Group.getObjectByName('Suite_exit_302'));
    assert.ok(pick7.some((o) => o.userData?.action === 'suiteExit' && o.userData?.room === '302'));

    // 2. HotelWorld restricts West Executive Club Lounge to 5F (9) & 6F (10) and enforces door state for suites/penthouse
    const world = new HotelWorld();
    assert.equal(world.canOccupy(9, -6.0, 5.0), true, '5F West Executive Club Lounge should be walkable');
    assert.equal(world.canOccupy(10, -6.0, 5.0), true, '6F West Executive Club Lounge should be walkable');
    for (const nonExecFloor of [6, 7, 8, 11, 12, 13, 14]) {
      assert.equal(world.canOccupy(nonExecFloor, -6.0, 5.0), false, `floor ${nonExecFloor} should not have a West Executive Lounge`);
      assert.equal(world.canOccupy(nonExecFloor, -2.54, 2.35), false, `floor ${nonExecFloor} west doorway should be sealed`);
    }
    assert.equal(world.canOccupy(13, 0.0, 13.0), false, 'Closed 901 Penthouse should block occupancy until opened');
    world.setRoomOpen('901', true);
    assert.equal(world.canOccupy(13, 0.0, 13.0), true, 'Opened 901 Penthouse center salon should be walkable');
    assert.equal(world.canOccupy(13, -9.0, 12.0), true, 'Opened 901 Penthouse west master sanctuary should be walkable');
    assert.equal(world.canOccupy(13, 9.0, 18.0), true, 'Opened 901 Penthouse east banquet dining wing should be walkable');
    assert.equal(world.canOccupy(13, 0.0, 5.0), true, 'Opened 901 marble foyer should be walkable');
    assert.equal(world.canOccupy(7, 9.5, 6.0), false, 'Closed 302 Family Twin should block occupancy until opened');
    world.setRoomOpen('302', true);
    assert.equal(world.canOccupy(7, 9.5, 6.0), true, 'Opened 302 Family Twin east suite should be walkable');

    // 3. HotelStay suite & lounge interactions reward VIP points and advance player to lounge/suite spot
    const stay = new HotelStay();
    const loungeGuest = { floor: 10, x: -3.5, z: 4.5, yaw: Math.PI, pitch: 0, zone: 'lobby' };
    const loungeRes = stay.interactHotelLounge({ floorIndex: 10, loungeType: 'bar', seatX: -6.2, seatZ: 6.1, seatYaw: 0 }, loungeGuest);
    assert.equal(loungeRes.ok, true);
    assert.equal(loungeGuest.x, -6.2);
    assert.ok(stay.points >= 70);

    const pentGuest = { floor: 13, x: 0, z: 4.8, yaw: Math.PI, pitch: 0, zone: 'lobby' };
    for (const amenityType of ['spa', 'piano', 'fireplace', 'dining']) {
      const suiteRes = stay.interactSuite({ room: '901', floorIndex: 13, tier: 'presidential', amenityType, seatX: -4.6, seatZ: 16.6, seatYaw: Math.PI }, pentGuest);
      assert.equal(suiteRes.ok, true, `expected ${amenityType} interaction on 901 to succeed`);
    }
    assert.ok(stay.completedQuests.has('quest-explorer'));
  } finally {
    globalThis.document = prevDoc;
  }
});

test('selective room check-in UI elements, counter pickable, and keycard mismatch feedback work cleanly', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  for (const id of [
    'checkin-dialog',
    'checkin-category-tabs',
    'checkin-room-grid',
    'checkin-confirm-btn',
    'checkin-confirm-go-btn',
    'keycard-go-room',
    'keycard-change-room',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `expected #${id} in dist/index.html`);
  }

  const { GuestRoom } = await import('../src/guest-room.js');
  const stay = new HotelStay();
  stay.checkIn('reception-a', '901');
  const room = new GuestRoom(stay);
  const blocked = room.toggle({ floor: 7, zone: 'lobby', x: -1.38, z: 2.9 });
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /901호/);

  const THREE = await import('three');
  const { HotelWorld } = await import('../src/hotel-world.js');
  const { HotelScene } = await import('../src/hotel-scene.js');
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 256,
      height: 256,
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        bezierCurveTo() {},
        stroke() {},
        createLinearGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };
  try {
    const pickables = [];
    const hs = new HotelScene(new THREE.Scene(), new HotelWorld(), pickables);
    const counter = hs.floors[5]?.getObjectByName('Reception_counter');
    assert.equal(counter?.userData?.action, 'staff');
    assert.equal(counter?.userData?.staffId, 'reception-a');
    assert.ok(pickables.includes(counter));
  } finally {
    globalThis.document = prevDoc;
  }
});

test('hotel guest room door number plaques stay attached and swing with opened doors across 201-902', async () => {
  const THREE = await import('three');
  const { decorateFloor } = await import('../src/floor-interiors.js');
  const { GuestRoomView } = await import('../src/guest-room-view.js');
  const { GuestRoom } = await import('../src/guest-room.js');
  const { batchStaticMeshes } = await import('../src/render-optimization.js');

  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 256,
      height: 256,
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        bezierCurveTo() {},
        stroke() {},
        createLinearGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };

  try {
    const pickables = [];
    for (let floor = 6; floor <= 13; floor++) {
      const floorGroup = new THREE.Group();
      decorateFloor(floorGroup, floor, { expanded: false, pickables });
      batchStaticMeshes(floorGroup);

      const doorsForFloor =
        floor === 13
          ? [{ number: 901, closedCenterX: -0.46, rightLeaf: true }]
          : [-1.38, 1.38]
              .map((closedCenterX, i) => ({ number: (floor - 4) * 100 + i + 1, closedCenterX, rightLeaf: false }))
              .filter((d) => d.number !== 301);

      for (const { number, closedCenterX, rightLeaf } of doorsForFloor) {
        const pivot = floorGroup.getObjectByName(`Door_pivot_${number}`);
        const doorMesh = floorGroup.getObjectByName(`Guest_room_door_${number}`);
        const signMesh = floorGroup.getObjectByName(`Room_number_${number}`);
        assert.ok(pivot && doorMesh && signMesh, `missing door hierarchy on ${number}`);
        assert.equal(signMesh.parent, pivot, `Room_number_${number} must be parented to Door_pivot_${number}`);
        assert.equal(signMesh.userData.dynamic, true);
        assert.equal(signMesh.userData.action, 'otherRoomDoor');
        assert.ok(pickables.includes(signMesh), `Room_number_${number} should be pickable`);

        // Closed pose matches corridor front of the door panel
        floorGroup.updateMatrixWorld(true);
        const closedSignPos = new THREE.Vector3();
        signMesh.getWorldPosition(closedSignPos);
        assert.ok(Math.abs(closedSignPos.x - closedCenterX) < 0.01);
        assert.ok(Math.abs(closedSignPos.z - 3.53) < 0.01);

        // Open door 90 degrees and verify plaque swings flush with the door panel
        pivot.rotation.y = -Math.PI / 2;
        if (rightLeaf) {
          const pivotR = floorGroup.getObjectByName(`Door_pivot_${number}_R`);
          assert.ok(pivotR, `missing right double door pivot on ${number}`);
          pivotR.rotation.y = Math.PI / 2;
        }
        floorGroup.updateMatrixWorld(true);
        const openDoorPos = new THREE.Vector3();
        const openSignPos = new THREE.Vector3();
        doorMesh.getWorldPosition(openDoorPos);
        signMesh.getWorldPosition(openSignPos);
        assert.ok(
          Math.hypot(openSignPos.x - openDoorPos.x, openSignPos.z - openDoorPos.z) <= 0.04,
          `Room_number_${number} drifted from open door leaf: dist=${Math.hypot(openSignPos.x - openDoorPos.x, openSignPos.z - openDoorPos.z).toFixed(3)}`
        );
        assert.ok(
          closedSignPos.distanceTo(openSignPos) > 0.55,
          `Room_number_${number} remained stuck in closed doorway`
        );
      }
    }

    // Also verify Room 301 plaque on GuestRoomView swings with pivot
    const room = new GuestRoom(new HotelStay());
    const view301 = new GuestRoomView(new THREE.Scene(), room, []);
    const door301 = view301.door.getObjectByName('Guest_room_door_301');
    const sign301 = view301.door.getObjectByName('Room_301_number');
    assert.equal(sign301?.parent, view301.door);
    room.open = 1;
    view301.update();
    view301.root.updateMatrixWorld(true);
    const door301Pos = new THREE.Vector3();
    const sign301Pos = new THREE.Vector3();
    door301.getWorldPosition(door301Pos);
    sign301.getWorldPosition(sign301Pos);
    assert.ok(Math.hypot(sign301Pos.x - door301Pos.x, sign301Pos.z - door301Pos.z) <= 0.04);
  } finally {
    globalThis.document = prevDoc;
  }
});
