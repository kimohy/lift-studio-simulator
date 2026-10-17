import assert from 'node:assert/strict';
import test from 'node:test';
import { LiftController } from '../src/controller.js';
import { HotelNPCSystem } from '../src/hotel-npcs.js';
import { HotelWorld } from '../src/hotel-world.js';
import { WalkingPlayer } from '../src/player.js';

test('NPC walks to elevator, calls hall button, boards cabin, presses car button, rides to target floor, and exits', () => {
  const world = new HotelWorld();
  const c = new LiftController();
  const npcs = new HotelNPCSystem(world);
  const doyun = npcs.getNPC('guest-doyun');

  assert.ok(doyun);
  assert.equal(doyun.floor, 5);
  assert.equal(doyun.state, 'walking_to_lift');
  assert.equal(doyun.targetFloor, 12);

  let calledHall = false;
  let boardedCabin = false;
  let pressedCarButton = false;
  let blockedDoorwayDuringTransit = false;
  let exitedAtTarget = false;

  for (let i = 0; i < 6000; i++) {
    const dt = 1 / 60;
    npcs.update(dt, c, null);
    if (c.up.has(5)) calledHall = true;
    c.tick(dt);

    if (c.obstructionSources.has('npc-guest-doyun')) {
      blockedDoorwayDuringTransit = true;
    }
    if (doyun.state === 'riding' && doyun.zone === 'cabin') {
      boardedCabin = true;
      if (c.car.has(12)) pressedCarButton = true;
    }
    if (doyun.floor === 12 && doyun.zone === 'lobby' && doyun.state === 'roaming') {
      exitedAtTarget = true;
      break;
    }
  }

  assert.equal(calledHall, true, 'NPC should press the hall call button on 1F');
  assert.equal(boardedCabin, true, 'NPC should board the elevator cabin');
  assert.equal(pressedCarButton, true, 'NPC should press destination floor 8F (index 12) car button');
  assert.equal(blockedDoorwayDuringTransit, true, 'NPC should trigger doorway safety sensor while crossing');
  assert.equal(exitedAtTarget, true, 'NPC should arrive at 8F (index 12), exit cabin, and roam on 8F');
  assert.equal(c.obstructionSources.has('npc-guest-doyun'), false, 'Doorway sensor should be cleared after exit');
});

test('NPCs roam around the hotel, yield politely when player is very close, and respond to interaction with wave and dialogue', () => {
  const world = new HotelWorld();
  const c = new LiftController();
  const npcs = new HotelNPCSystem(world);
  const player = new WalkingPlayer(null, world);
  player.floor = 5;
  player.x = 0;
  player.z = 12;

  const emily = npcs.getNPC('guest-emily');
  assert.ok(emily);
  const startX = emily.x;
  const startZ = emily.z;

  for (let i = 0; i < 120; i++) {
    npcs.update(1 / 60, c, player);
  }
  assert.ok(Math.hypot(emily.x - startX, emily.z - startZ) > 0.5, 'Roaming NPC should walk along waypoints');

  // When player stands directly in front of the roaming NPC (< 0.72m), NPC politely yields
  player.x = emily.x;
  player.z = emily.z - 0.4;
  npcs.update(1 / 60, c, player);
  assert.equal(emily.moving, false, 'Roaming NPC should yield when player stands right in front of them');

  const reply = npcs.interact('guest-emily', player, 10);
  assert.match(reply, /에밀리/);
  assert.ok(emily.waveUntil > 10, 'Interacting with NPC should trigger wave animation');
  assert.ok(emily.talkPauseTimer > 0, 'Interacting with NPC should pause them to face the player');
});

test('NPC riding inside elevator gives boarding/riding dialogue when spoken to', () => {
  const world = new HotelWorld();
  const c = new LiftController();
  const npcs = new HotelNPCSystem(world);
  const player = new WalkingPlayer(null, world);

  const npc = npcs.getNPC('guest-doyun');
  npc.state = 'riding';
  npc.zone = 'cabin';
  npc.targetFloor = 12;

  const reply = npcs.interact('guest-doyun', player, 5);
  assert.match(reply, /8층/);
  assert.match(reply, /Going to 8F/);
});

test('NPCView builds articulated 3D NPC rigs, registers interactive pickables, and updates visibility by floor and zone', async () => {
  const THREE = await import('three');
  const { NPCView } = await import('../src/npc-view.js');
  const scene = new THREE.Scene();
  const world = new HotelWorld();
  const npcs = new HotelNPCSystem(world);
  const pickables = [];

  const view = new NPCView(scene, npcs, pickables);
  assert.equal(view.rigs.length, npcs.npcs.length);
  assert.ok(pickables.some((p) => p.userData.action === 'npc' && p.userData.npcId === 'guest-doyun'));
  assert.equal(view.root.userData.dynamic, true);

  // Update on 1F (floor 5) in game view
  view.update(2.5, 5, 'game');
  const doyunRig = view.rigs.find((r) => r.npc.id === 'guest-doyun');
  assert.equal(doyunRig.root.visible, true);

  // When viewing 10F (floor 14) while doyun is on 1F lobby -> hidden, unless in cabin
  view.update(2.5, 14, 'game');
  assert.equal(doyunRig.root.visible, false);

  doyunRig.npc.zone = 'cabin';
  view.update(2.5, 14, 'game');
  assert.equal(doyunRig.root.visible, true, 'NPC inside cabin should remain visible with the elevator car');
});

test('elevator never deadlocks even when all 6 NPCs wait at 1F simultaneously or over long simulation runs', () => {
  const world = new HotelWorld();
  const c = new LiftController();
  const npcs = new HotelNPCSystem(world, { maxConcurrentRiders: 2 });

  // Force all 6 NPCs to wait for the elevator on 1F at the exact same time
  for (const [i, npc] of npcs.npcs.entries()) {
    npc.floor = 5;
    npc.zone = 'lobby';
    npc.x = npc.waitSlot.x;
    npc.z = npc.waitSlot.z;
    npc.state = 'waiting_for_lift';
    npc.targetFloor = 6 + (i % 8);
  }

  let departedFrom1F = false;
  let maxNonMovingTime = 0;
  let currentNonMovingTime = 0;

  for (let i = 0; i < 3600; i++) {
    const dt = 1 / 60;
    npcs.update(dt, c, null);
    c.tick(dt);

    if (c.state === 'moving' && c.floor !== 5) {
      departedFrom1F = true;
    }
    if (c.pending().length > 0 && c.state !== 'moving') {
      currentNonMovingTime += dt;
      maxNonMovingTime = Math.max(maxNonMovingTime, currentNonMovingTime);
    } else {
      currentNonMovingTime = 0;
    }
  }

  assert.equal(departedFrom1F, true, 'Elevator must close doors and depart even when extra NPCs are waiting on the landing');
  assert.ok(
    maxNonMovingTime < 15,
    `Elevator should never stall with pending calls (max non-moving time was ${maxNonMovingTime.toFixed(2)}s)`
  );
});


