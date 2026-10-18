import assert from 'node:assert/strict';
import { test } from 'node:test';
import { floorMeta, floorUsage } from '../src/building.js';
import { computeCabinLoad, LiftController } from '../src/controller.js';
import { HotelSoundEffects } from '../src/elevator-audio.js';
import { FAST_TRAVEL_SPOTS, GRAND_CAFE_MENU, HotelStay, TOUR_CHECKLIST } from '../src/hotel-stay.js';
import { LiftScene, TIME_OF_DAY_MODES } from '../src/scene.js';

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
