import assert from 'node:assert/strict';
import test from 'node:test';
import { floorPhrase, HotelAnnouncements } from '../src/announcements.js';
import { LiftController } from '../src/controller.js';

function fixture() {
  const spoken = [];
  let canceled = 0;
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synth = {
    getVoices: () => [
      { lang: 'ko-KR', name: 'Korean Natural' },
      { lang: 'en-US', name: 'English Natural' },
    ],
    speak: (u) => spoken.push(u),
    cancel: () => canceled++,
    addEventListener() {},
  };
  const captions = [];
  const a = new HotelAnnouncements({ synth, Utterance, gap: 0, onCaption: (x) => captions.push(x) });
  const c = new LiftController();
  return {
    a,
    c,
    spoken,
    captions,
    get canceled() {
      return canceled;
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 5));

test('all basement and above-ground floor names use proper bilingual ordinals', () => {
  assert.deepEqual(floorPhrase(4), ['지하 1층입니다.', 'First basement floor.']);
  assert.deepEqual(floorPhrase(5), ['1층입니다.', 'First floor.']);
  assert.deepEqual(floorPhrase(14), ['10층입니다.', 'Tenth floor.']);
  assert.equal(floorPhrase(0)[1], 'Fifth basement floor.');
});

test('speaks Korean then English with separate language voices', async () => {
  const { a, c, spoken } = fixture();
  a.setEnabled(true, c);
  a.clear();
  c.state = 'moving';
  c.direction = 1;
  a.observe(c);
  assert.equal(spoken.at(-1).text, '올라갑니다.');
  assert.equal(spoken.at(-1).lang, 'ko-KR');
  spoken.at(-1).onend();
  await flush();
  assert.equal(spoken.at(-1).text, 'Going up.');
  assert.equal(spoken.at(-1).lang, 'en-US');
  a.clear();
});

test('arrival announces floor once, then door opening, never pass-through floor', () => {
  const { a, c, captions } = fixture();
  a.setEnabled(true, c);
  a.clear();
  c.state = 'moving';
  c.direction = -1;
  a.observe(c);
  const count = captions.length;
  c.floor = 4;
  a.observe(c);
  assert.equal(captions.length, count);
  c.stops.push(4);
  c.state = 'opening';
  a.observe(c);
  assert.match(captions.at(-1).ko, /지하 1층/);
  assert.match(captions.at(-1).en, /First basement floor/);
  assert.match(captions.at(-1).ko, /문이 열립니다/);
  const n = captions.length;
  a.observe(c);
  assert.equal(captions.length, n);
  a.clear();
});

test('reopening cancels obsolete closing speech and stale callback', async () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  f.a.clear();
  f.c.state = 'closing';
  f.a.observe(f.c);
  const stale = f.spoken.at(-1);
  f.c.state = 'opening';
  f.a.observe(f.c);
  assert.match(f.spoken.at(-1).text, /다시 열립니다/);
  const count = f.spoken.length;
  stale.onend();
  await flush();
  assert.equal(f.spoken.length, count);
  f.a.clear();
});

test('mute immediately cancels and restores normal door timing', () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  assert.equal(f.c.doorCloseSeconds, 5);
  f.a.setEnabled(false, f.c);
  assert.equal(f.c.doorCloseSeconds, 1.7);
  const n = f.spoken.length;
  f.c.state = 'closing';
  f.a.observe(f.c);
  assert.equal(f.spoken.length, n);
  assert.ok(f.canceled > 0);
});

test('setExtendDoorTiming allows keeping standard mechanical door speed while voice is active', () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  assert.equal(f.c.doorCloseSeconds, 5);
  assert.equal(f.c.doorDwellSeconds, 9);

  f.a.setExtendDoorTiming(false, f.c);
  assert.equal(f.c.doorCloseSeconds, 1.7);
  assert.equal(f.c.doorDwellSeconds, 3);

  f.a.setExtendDoorTiming(true, f.c);
  assert.equal(f.c.doorCloseSeconds, 5);
  assert.equal(f.c.doorDwellSeconds, 9);
  f.a.setEnabled(false, f.c);
});

test('pause and reset discard speech without replaying old arrivals', () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  f.c.paused = true;
  f.a.observe(f.c);
  assert.equal(f.a.active, null);
  f.c.reset();
  f.a.reset(f.c);
  assert.equal(f.a.active, null);
  assert.equal(f.c.doorCloseSeconds, 5);
  f.a.setEnabled(false, f.c);
});

test('audio failures preserve bilingual captions without blocking car', () => {
  const c = new LiftController();
  const caps = [];
  const a = new HotelAnnouncements({ synth: null, Utterance: null, onCaption: (x) => caps.push(x) });
  a.setEnabled(true, c);
  c.state = 'moving';
  c.direction = 1;
  a.observe(c);
  assert.equal(caps.at(-1).en, 'Going up.');
  assert.equal(c.paused, false);
  a.clear();
});

test('arrival completes floor KO/EN and opening KO/EN in sequence', async () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  f.a.clear();
  f.spoken.length = 0;
  f.c.floor = 0;
  f.c.stops.push(0);
  f.c.state = 'opening';
  f.a.observe(f.c);
  await flush();
  for (let i = 0; i < 4; i++) {
    f.spoken.at(-1).onend();
    await flush();
  }
  assert.deepEqual(
    f.spoken.map((u) => u.text),
    ['지하 5층입니다.', 'Fifth basement floor.', '문이 열립니다.', 'The door is opening.']
  );
  assert.equal(f.a.active, null);
  f.a.clear();
});

test('failed Korean voice advances to English instead of blocking queue', async () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  f.spoken.at(-1).onerror();
  await flush();
  assert.equal(f.spoken.at(-1).lang, 'en-US');
  f.a.clear();
});

test('voice timing allows full announcement but never gates movement on audio', () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  f.a.clear();
  f.c.callCar(6);
  let arrived = false;
  for (let i = 0; i < 2400; i++) {
    f.c.tick(1 / 60);
    f.a.observe(f.c);
    if (f.c.floor === 6 && f.c.state === 'open') {
      arrived = true;
      assert.ok(f.c.dwell >= 8.9);
      break;
    }
  }
  assert.equal(arrived, true);
  f.a.clear();
});

test('open button and doorway clearance retain bilingual dwell time', () => {
  const f = fixture();
  f.a.setEnabled(true, f.c);
  f.c.state = 'open';
  f.c.door = 1;
  f.c.dwell = 9;
  f.c.openDoor();
  assert.equal(f.c.dwell, 9);
  f.c.setObstruction(true, 'player');
  f.c.setObstruction(false, 'player');
  assert.equal(f.c.dwell, 9);
  f.a.setEnabled(false, f.c);
  f.c.openDoor();
  assert.equal(f.c.dwell, 3);
});
