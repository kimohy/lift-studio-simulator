import assert from 'node:assert/strict';
import test from 'node:test';
import { HotelAnnouncements } from '../src/announcements.js';
import { LiftController, PITCH } from '../src/controller.js';
import { computeElevatorAudioGain } from '../src/elevator-audio.js';
import { EmergencyAlarm } from '../src/emergency-alarm.js';
import { WalkingPlayer } from '../src/player.js';
import { Stairwell } from '../src/stairs.js';

test('elevator audio is 100% audible inside cabin and at the landing, attenuates in corridor, and is silent far away', () => {
  const c = new LiftController(); // Starts at 1F (floor 5, position = 17.5)
  const stairs = new Stairwell();
  const player = new WalkingPlayer(stairs);

  // 1. Inside cabin -> 1.0
  player.zone = 'cabin';
  player.x = 0;
  player.z = 0;
  assert.equal(computeElevatorAudioGain({ gameActive: true, player, stairs }, c), 1);

  // 2. Standing in front of elevator on 1F landing (z = 2.5) -> 1.0
  player.zone = 'lobby';
  player.floor = 5;
  player.x = 0;
  player.z = 2.5;
  assert.equal(computeElevatorAudioGain({ gameActive: true, player, stairs }, c), 1);

  // 3. Halfway down the 1F connecting corridor (z = 6.0) -> attenuated (between 0 and 1)
  player.z = 6.0;
  const corridorGain = computeElevatorAudioGain({ gameActive: true, player, stairs }, c);
  assert.ok(corridorGain > 0 && corridorGain < 1, `Expected attenuated gain in corridor, got ${corridorGain}`);

  // 4. Far in the 1F Grand Lobby (z = 15), Reception (z = 21), or Cafe (x = 8, z = 15) -> 0
  player.z = 15;
  assert.equal(computeElevatorAudioGain({ gameActive: true, player, stairs }, c), 0);
  player.x = 8;
  player.z = 15;
  assert.equal(computeElevatorAudioGain({ gameActive: true, player, stairs }, c), 0);

  // 5. Inside Room 301 -> 0
  player.floor = 7;
  player.zone = 'room';
  player.x = -1.5;
  player.z = 5.5;
  c.floor = 7;
  c.position = 7 * PITCH;
  assert.equal(computeElevatorAudioGain({ gameActive: true, player, stairs }, c), 0);

  // 6. Standing on 1F landing when elevator cabin is far away on 10F -> 0
  player.floor = 5;
  player.zone = 'lobby';
  player.x = 0;
  player.z = 2.2;
  c.floor = 14;
  c.position = 14 * PITCH;
  assert.equal(computeElevatorAudioGain({ gameActive: true, player, stairs }, c), 0);
});

test('HotelAnnouncements suppresses chime and audio playback when player is far from elevator and scales volume when near', () => {
  const spoken = [];
  let chimes = 0;
  let currentVolume = 1;
  let proximity = 0;

  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synth = {
    speak: (u) => spoken.push(u),
    cancel() {},
    setVolume: (v) => {
      currentVolume = v;
    },
  };

  const c = new LiftController();
  const a = new HotelAnnouncements({
    synth,
    Utterance,
    gap: 0,
    onChime: () => chimes++,
    getProximityGain: () => proximity,
  });

  // Enabled while player is far away in the lobby (proximity = 0) -> no sound played
  a.setEnabled(true, c);
  assert.equal(spoken.length, 0);
  assert.equal(chimes, 0);

  // Arrival while player is far away -> no chime, no spoken utterance
  c.stops.push(5);
  c.state = 'opening';
  a.observe(c);
  assert.equal(chimes, 0);
  assert.equal(spoken.length, 0);

  // Player walks near the elevator (proximity = 0.5) -> closing announcement plays at scaled volume
  proximity = 0.5;
  c.state = 'closing';
  a.observe(c);
  assert.equal(spoken.length, 1);
  assert.ok(Math.abs(spoken[0].volume - a.volume * 0.5) < 1e-6);

  // Player walks away mid-announcement -> syncProximity mutes active playback
  proximity = 0;
  a.syncProximity();
  assert.equal(currentVolume, 0);
  a.clear();
});

test('EmergencyAlarm scales gain by proximity to the elevator', () => {
  const made = [];
  const node = () => {
    const n = {
      frequency: { value: 0 },
      gain: { value: 0 },
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
    };
    made.push(n);
    return n;
  };
  const alarm = new EmergencyAlarm(() => ({
    currentTime: 0,
    destination: {},
    resume: () => Promise.resolve(),
    createOscillator: node,
    createGain: node,
  }));

  alarm.setProximityGain(0);
  alarm.setEnabled(true);
  assert.equal(alarm.gainNode.gain.value, 0);
  assert.equal(alarm.depthNode.gain.value, 0);

  alarm.setProximityGain(1);
  assert.ok(Math.abs(alarm.gainNode.gain.value - 0.09) < 1e-6);
  assert.ok(Math.abs(alarm.depthNode.gain.value - 0.08) < 1e-6);
  alarm.stop();
});
