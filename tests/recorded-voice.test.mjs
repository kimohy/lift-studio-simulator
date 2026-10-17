import assert from 'node:assert/strict';
import test from 'node:test';
import { createSimulatorServer } from '../server.mjs';
import { RecordedUtterance, RecordedVoice } from '../src/recorded-voice.js';
import { VOICE_CLIPS as clips } from '../src/voice-catalog.js';

const made = [];
class Audio {
  constructor(src) {
    this.src = src;
    made.push(this);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  removeAttribute() {
    this.src = '';
  }
  load() {}
}

test('all 42 prompts resolve to fixed files, without system voices', () => {
  const voice = new RecordedVoice({ clips, AudioClass: Audio });
  for (const c of clips) {
    const u = new RecordedUtterance(c.text);
    u.lang = c.lang;
    voice.speak(u);
    assert.equal(made.at(-1).src, './assets/voice/' + c.file);
    assert.equal(made.at(-1).playbackRate, 1.2);
    assert.equal(made.at(-1).preservesPitch, true);
  }
  voice.cancel();
});

test('cancel stops the file and ignores previous completion callbacks', () => {
  const voice = new RecordedVoice({ clips, AudioClass: Audio });
  const u = new RecordedUtterance(clips[0].text);
  u.lang = clips[0].lang;
  let ended = 0;
  u.onend = () => ended++;
  voice.speak(u);
  const a = made.at(-1);
  const stale = a.onended;
  voice.cancel();
  stale();
  assert.equal(ended, 0);
  assert.equal(a.paused, true);
});

test('missing recording produces an error, never a system TTS fallback', async () => {
  const voice = new RecordedVoice({ clips, AudioClass: Audio });
  const u = new RecordedUtterance('missing');
  let error;
  u.onerror = (e) => (error = e.error);
  voice.speak(u);
  await Promise.resolve();
  assert.equal(error, 'missing-recording');
});

test('simulator server supports ETag 304, HTTP Range 206, and Gzip compression', async () => {
  const server = createSimulatorServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    // 1. Standard GET with Gzip
    const res1 = await fetch(`${base}/index.html`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    assert.equal(res1.status, 200);
    const etag = res1.headers.get('etag');
    assert.ok(etag);
    const html = await res1.text();
    assert.match(html, /Grand Hotel/);

    // 2. Conditional GET with If-None-Match -> 304
    const res304 = await fetch(`${base}/index.html`, {
      headers: { 'If-None-Match': etag },
    });
    assert.equal(res304.status, 304);

    // 3. Range GET on audio clip -> 206 Partial Content
    const res206 = await fetch(`${base}/assets/voice/welcome-ko.mp3`, {
      headers: { Range: 'bytes=0-99' },
    });
    assert.equal(res206.status, 206);
    assert.match(res206.headers.get('content-range') || '', /^bytes 0-99\/\d+$/);
    const buf = await res206.arrayBuffer();
    assert.equal(buf.byteLength, 100);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
