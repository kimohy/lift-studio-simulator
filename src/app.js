import { HotelAnnouncements } from './announcements.js';
import { floorMeta } from './building.js';
import { computeCabinLoad, FLOORS, LiftController, PITCH } from './controller.js';
import { computeElevatorAudioGain, HotelSoundEffects } from './elevator-audio.js';
import { EmergencyAlarm } from './emergency-alarm.js';
import { GameMode } from './game-mode.js';
import { LiftScene } from './scene.js';

const $ = (id) => document.getElementById(id);

const controller = new LiftController();
let view;
let game;
let rate = 1;
let sound = false;
let audioContext;

function getElevatorAudioGain() {
  return computeElevatorAudioGain(
    {
      gameActive: !!game?.active,
      player: game?.player ?? null,
      view: view?.view ?? 'lobby',
      stairs: game?.stairs ?? null,
    },
    controller
  );
}

const names = {
  idle: '대기 중',
  moving: '운행 중',
  opening: '문 여는 중',
  open: '문 열림',
  closing: '문 닫는 중',
};

const clock = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function say(text) {
  $('control-hint').textContent = text;
}

const emergencyAlarm = new EmergencyAlarm();
const chimes = new Set();

function stopChime() {
  for (const osc of chimes) {
    try {
      osc.stop();
    } catch {}
  }
  chimes.clear();
}

function beep() {
  if (!sound || !audioContext || announcer.volume === 0) return;
  const level = announcer.volume * getElevatorAudioGain();
  if (level <= 0.001) return;
  const t = audioContext.currentTime;
  [880, 659.25].forEach((hz, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    chimes.add(osc);
    osc.onended = () => {
      chimes.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.type = 'sine';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0, t + i * 0.22);
    gain.gain.linearRampToValueAtTime(0.1 * level, t + i * 0.22 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.22 + 0.65);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(t + i * 0.22);
    osc.stop(t + i * 0.22 + 0.7);
  });
}

const announcer = new HotelAnnouncements({
  onCaption: ({ ko, en }) => {
    $('voice-ko').textContent = ko;
    $('voice-en').textContent = en;
  },
  onStatus: (text) => {
    $('voice-status').textContent = text;
  },
  onChime: beep,
  getProximityGain: getElevatorAudioGain,
});

const sfx = new HotelSoundEffects(
  () => audioContext,
  () => announcer.volume,
  () => sound
);

function act(action, floor, direction, data) {
  if (action === 'roomDoor') {
    sfx.playKeycard(game?.stay?.canAccess('301') || game?.player?.zone === 'room');
    game?.toggleRoomDoor();
    return;
  }
  if (
    ['roomTV', 'roomLight', 'roomCurtain', 'roomShower', 'roomBed', 'roomServiceOrder', 'roomFood'].includes(
      action
    )
  ) {
    if (action === 'roomShower') sfx.playWater();
    else if (action === 'roomServiceOrder') sfx.playRobot();
    else sfx.playButton();
    game?.interactRoom(action);
    return;
  }
  if (['poolSwim', 'poolJacuzzi', 'poolLight', 'poolSunbed', 'poolBar'].includes(action)) {
    if (action === 'poolSwim' || action === 'poolJacuzzi') sfx.playWater();
    else sfx.playButton();
    game?.interactPool(action, data);
    return;
  }
  if (['cafeOrder', 'cafeSit', 'loungeSit'].includes(action)) {
    sfx.playButton();
    game?.interactLobby(action, data);
    return;
  }
  if (action === 'parkingCar') {
    sfx.playKeycard(true);
    game?.interactParking(data);
    return;
  }
  if (action === 'otherRoomDoor') {
    sfx.playKeycard(false);
    game?.inspectOtherRoom(data);
    return;
  }
  if (action === 'staff') {
    sfx.playKeycard(true);
    game?.talkToStaff(data);
    return;
  }
  if (action === 'npc') {
    sfx.playButton();
    game?.talkToNPC(data);
    return;
  }
  if (action === 'robot') {
    sfx.playRobot();
    game?.talkToRobot();
    return;
  }
  if (action === 'stairDoor') {
    sfx.playButton();
    game?.toggleStairDoor(floor);
    return;
  }
  if (action === 'car') {
    sfx.playButton();
    game?.stepInsideCabinIfInDoorway();
    controller.callCar(floor);
    say(`${FLOORS[floor]}층 목적지가 등록되었습니다.`);
  }
  if (action === 'hall') {
    sfx.playButton();
    controller.callHall(floor, direction);
    say(
      controller.vipMode
        ? `VIP 직통 모드가 켜져 있어 승강장 호출이 보류됩니다.`
        : `${FLOORS[floor]}층 ${direction === 1 ? '상행' : '하행'} 호출이 등록되었습니다.`
    );
  }
  if (action === 'open') {
    sfx.playButton();
    say(controller.openDoor() ? '문을 열고 대기 시간을 연장합니다.' : '운행 중에는 문을 열 수 없습니다.');
  }
  if (action === 'close') {
    sfx.playButton();
    game?.stepInsideCabinIfInDoorway();
    say(
      controller.closeDoor()
        ? '문을 닫습니다.'
        : controller.obstruction
          ? '감지선이 차단되어 문을 닫을 수 없습니다.'
          : '문이 열려 있을 때 사용할 수 있습니다.'
    );
  }
  if (action === 'alarm') {
    controller.toggleAlarm();
    emergencyAlarm.setEnabled(controller.alarm);
    say(
      controller.alarm
        ? '비상 경보가 울립니다. 버튼을 다시 누르면 해제됩니다.'
        : '비상 호출 신호를 해제했습니다.'
    );
  }
  announcer.observe(controller);
  updateUI();
}

const rowButtons = [];
const rowElements = [];
const carButtons = [];

for (let i = 14; i >= 0; i--) {
  const meta = floorMeta(i, FLOORS[i]);
  const row = document.createElement('div');
  row.className = 'floor-row' + (i < 5 ? ' basement' : '');
  row.dataset.floor = i;
  row.title = meta.title;
  row.innerHTML = `<span class="floor-name">${FLOORS[i]}<small>F</small><small class="floor-purpose">${meta.badge}</small></span><span class="floor-track"><span class="car-marker"></span></span><div class="hall-controls"></div>`;

  for (const dir of [1, -1]) {
    const b = document.createElement('button');
    b.textContent = dir === 1 ? '▲' : '▼';
    b.disabled = (dir === 1 && i === 14) || (dir === -1 && i === 0);
    b.setAttribute('aria-label', `${FLOORS[i]}층 ${dir === 1 ? '상행' : '하행'} 호출`);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => act('hall', i, dir));
    row.querySelector('.hall-controls').append(b);
    rowButtons.push({ b, i, dir });
  }
  const marker = row.querySelector('.car-marker');
  rowElements.push({ row, floor: i, marker });
  $('floor-list').append(row);
}

for (const i of [12, 13, 14, 9, 10, 11, 6, 7, 8, 3, 4, 5, 0, 1, 2]) {
  const meta = floorMeta(i, FLOORS[i]);
  const b = document.createElement('button');
  b.textContent = FLOORS[i];
  b.dataset.carFloor = i;
  b.title = meta.title;
  b.className = i === 5 ? 'home' : '';
  b.setAttribute('aria-label', `${FLOORS[i]}층 목적지`);
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => act('car', i));
  $('car-buttons').append(b);
  carButtons.push({ b, i });
}

$('open-door').onclick = () => act('open');
$('close-door').onclick = () => act('close');
$('alarm').onclick = () => act('alarm');

if ($('vip-mode')) {
  $('vip-mode').onclick = () => {
    sfx.playButton();
    const vip = controller.toggleVipMode();
    say(
      vip
        ? 'VIP 직통 운행 모드가 켜졌습니다. 카 내부 목적층 호출만 직통으로 처리합니다.'
        : 'VIP 직통 운행 모드를 해제했습니다. 승강장 호출을 정상 처리합니다.'
    );
    updateUI();
  };
}

function handleCycleTimeOfDay() {
  if (!view) return;
  sfx.playButton();
  const mode = view.cycleTimeOfDay();
  const label = `${mode.icon} ${mode.label}`;
  setText('time-of-day', label);
  setText('game-time-of-day', label);
  say(`호텔 시간대 조명을 '${mode.label}' 모드로 전환했습니다.`);
  if (game?.active) {
    game.message(`시간대 분위기 전환: ${mode.icon} ${mode.label}`);
    game.messageUntil = performance.now() + 3500;
  }
}

if ($('time-of-day')) $('time-of-day').onclick = handleCycleTimeOfDay;
if ($('game-time-of-day')) $('game-time-of-day').onclick = handleCycleTimeOfDay;
if ($('topbar-guide')) {
  $('topbar-guide').onclick = () => {
    if (!game?.active) game?.enter();
    game?.openConciergeGuide(true);
  };
}

$('obstruction').onclick = () => {
  controller.setObstruction(!controller.obstructionSources.has('manual'));
  say(
    controller.obstructionSources.has('manual')
      ? '감지선을 차단했습니다. 문이 닫히면 다시 열립니다.'
      : `감지선이 복구되었습니다. ${controller.doorDwellSeconds}초 후 문이 닫힙니다.`
  );
  updateUI();
};

$('pause').onclick = () => {
  controller.paused = !controller.paused;
  if (controller.paused) stopChime();
  announcer.observe(controller);
  updateUI();
};

$('time-scale').onchange = (e) => {
  rate = Number(e.target.value);
};

$('sound').onclick = () => {
  sound = !sound;
  if (!sound) stopChime();
  announcer.setEnabled(sound, controller);
  $('voice-panel').hidden = !sound;
  $('sound').textContent = sound ? '음성 안내 끄기' : '음성 안내 켜기';
  $('sound').setAttribute('aria-pressed', String(sound));
  if (sound) {
    try {
      audioContext ??= new AudioContext();
      audioContext.resume().catch(() => {});
    } catch {}
  }
  updateUI();
};

$('voice-volume').oninput = (e) => {
  announcer.volume = Number(e.target.value) / 100;
  announcer.syncProximity();
  $('voice-volume-value').textContent = e.target.value + '%';
};

if ($('voice-extend-dwell')) {
  $('voice-extend-dwell').onchange = (e) => {
    announcer.setExtendDoorTiming(e.target.checked, controller);
    updateUI();
  };
}

document.addEventListener('visibilitychange', () => {
  stopChime();
  announcer.reset(controller);
});

$('reset').onclick = () => {
  controller.reset();
  emergencyAlarm.stop();
  stopChime();
  announcer.reset(controller);
  rate = 1;
  $('time-scale').value = '1';
  game?.reset();
  if (view && !game?.active) view.setView(view.view, controller);
  say('1층 대기 상태로 초기화했습니다.');
  updateUI();
};

const captions = {
  exterior: '호텔 외관 · 로비와 주차장 진입로',
  lobby: '승강장 · 카 위치 따라가기',
  cabin: '탑승 시점 · 내부 버튼 직접 조작',
  shaft: 'B5—10F · 승강로와 균형추',
  controller: '제어반 · 운행 상태 실시간 연동',
};

const viewButtons = [...document.querySelectorAll('[data-view]')];
for (const b of viewButtons) {
  b.onclick = () => {
    for (const btn of viewButtons) {
      btn.classList.toggle('selected', btn === b);
      btn.setAttribute('aria-pressed', String(btn === b));
    }
    view?.setView(b.dataset.view, controller);
    $('view-caption').textContent = captions[b.dataset.view];
  };
}

let queueKey = '';
let eventKey = '';

function setText(id, value) {
  const el = $(id);
  if (el && el.textContent !== value) el.textContent = value;
}

function updateUI() {
  const c = controller;
  const arrow = c.direction === 1 ? '↑' : c.direction === -1 ? '↓' : '—';

  setText('big-floor', FLOORS[c.floor]);
  setText('panel-floor', FLOORS[c.floor]);
  setText('big-direction', arrow);
  setText('panel-direction', arrow);

  setText('state-badge', c.paused ? '일시정지' : names[c.state]);
  $('state-badge').classList.toggle('moving', c.state === 'moving');

  setText(
    'panel-state',
    c.alarm
      ? 'ALARM'
      : c.paused
        ? 'PAUSED'
        : c.state === 'moving'
          ? c.direction > 0
            ? 'GOING UP'
            : 'GOING DOWN'
          : c.state === 'idle'
            ? 'READY'
            : c.state.toUpperCase()
  );

  $('speed-value').innerHTML = `${Math.abs(c.velocity).toFixed(2)} <small>m/s</small>`;
  setText('target-value', c.target !== null ? FLOORS[c.target] + 'F' : '—');
  setText('door-value', c.door === 0 ? '닫힘' : c.door === 1 ? '열림' : `${Math.round(c.door * 100)}%`);

  setText('interlock', c.door === 0 ? '잠금' : '해제');
  setText('drive', c.state === 'moving' ? (c.direction > 0 ? '상행 구동' : '하행 구동') : '대기');
  setText('brake', c.state === 'moving' ? '해제' : '체결');
  setText('sensor', c.obstruction ? '차단 감지' : '정상');
  setText('logic-state', c.state.toUpperCase());

  $('sensor').classList.toggle('warn', c.obstruction);
  $('interlock').classList.toggle('warn', c.door > 0);
  $('controller-led').style.background = c.alarm ? 'var(--red)' : 'var(--cyan)';

  $('pause').textContent = c.paused ? '▶' : 'Ⅱ';
  $('pause').setAttribute('aria-pressed', String(c.paused));
  $('pause').setAttribute('aria-label', c.paused ? '시뮬레이션 재생' : '시뮬레이션 일시정지');
  document.body.classList.toggle('paused', c.paused);

  for (const { b, i } of carButtons) {
    const active = c.car.has(i);
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  }

  for (const { b, i, dir } of rowButtons) {
    const active = (dir === 1 ? c.up : c.down).has(i);
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  }

  const continuousFloor = c.position / PITCH;
  const subFloorOffset = continuousFloor - c.floor;
  for (const { row, floor, marker } of rowElements) {
    const isCurrent = floor === c.floor;
    row.classList.toggle('current', isCurrent);
    if (isCurrent && marker) {
      marker.style.transform = `translateY(${(-subFloorOffset * 100).toFixed(1)}%)`;
    }
  }

  const load = computeCabinLoad({
    gameActive: !!game?.active,
    player: game?.player ?? null,
    npcs: game?.npcs ?? null,
    robot: game?.robot ?? null,
  });
  setText('cabin-load', load.summary);
  setText('load-sensor', `${load.weightKg}kg (${load.percent}%)`);
  $('load-sensor')?.classList.toggle('warn', load.percent >= 80);

  for (const [id, on] of [
    ['obstruction', c.obstructionSources.has('manual')],
    ['alarm', c.alarm],
    ['vip-mode', c.vipMode],
  ]) {
    if ($(id)) {
      $(id).classList.toggle('active', on);
      $(id).setAttribute('aria-pressed', String(on));
    }
  }

  const pending = c.pending();
  const q = pending.map((n) => `${n}:${c.car.has(n)}:${c.up.has(n)}:${c.down.has(n)}`).join(',');
  if (queueKey !== q || !$('queue').children.length) {
    queueKey = q;
    $('queue').replaceChildren();
    if (!pending.length) {
      const e = document.createElement('span');
      e.className = 'empty';
      e.textContent = '등록된 호출이 없습니다.';
      $('queue').append(e);
    } else {
      for (const n of pending) {
        const e = document.createElement('span');
        e.className = 'queue-chip';
        e.textContent = FLOORS[n] + 'F' + (c.up.has(n) ? ' ↑' : '') + (c.down.has(n) ? ' ↓' : '');
        $('queue').append(e);
      }
    }
  }

  const ek = c.events
    .slice(0, 3)
    .map((e) => `${e.time}${e.message}`)
    .join('|');
  if (ek !== eventKey) {
    eventKey = ek;
    $('events').replaceChildren();
    for (const event of c.events.slice(0, 3)) {
      const e = document.createElement('div');
      e.className = 'event ' + event.type;
      const t = document.createElement('time');
      t.textContent = clock(event.time);
      const text = document.createElement('span');
      text.textContent = event.message;
      e.append(t, text);
      $('events').append(e);
    }
  }
  if (sound) {
    const prox = getElevatorAudioGain();
    setText(
      'voice-status',
      prox <= 0.001
        ? '엘리베이터와 멀어져 안내 음성이 들리지 않습니다.'
        : prox < 0.99
          ? `엘리베이터 근처 · 음량 ${Math.round(prox * 100)}%`
          : 'AI로 제작한 고정 안내 음성입니다.'
    );
  }
  setText('event-clock', clock(c.time));
}

try {
  view = new LiftScene($('scene'), act);
  game = new GameMode(view, controller);
  view
    .load()
    .then(() => {
      $('game-toggle').disabled = false;
      game.enter();
    })
    .catch((error) => {
      console.error(error);
      $('loading').innerHTML =
        '<strong>3D 모델을 불러오지 못했습니다.</strong><span>페이지를 새로고침해 주세요. 조작반은 계속 사용할 수 있습니다.</span>';
    });
} catch (error) {
  console.error(error);
  $('loading').innerHTML =
    '<strong>3D 화면을 시작할 수 없습니다.</strong><span>브라우저의 그래픽 가속을 확인해 주세요.</span>';
}

// Public inspection API for the simulator; no external machinery or network control.
window.liftStudio = {
  controller,
  announcer,
  emergencyAlarm,
  sfx,
  getElevatorAudioGain,
  get view() {
    return view;
  },
  get modelReady() {
    return !!view?.ready;
  },
  get game() {
    return game;
  },
  version: '2.1.0',
};

let last = performance.now();
let uiElapsed = 0;

function frame(now) {
  const dt = document.hidden ? 0 : Math.min((now - last) / 1000, 0.1);
  last = now;
  game?.beforeStep();
  game?.npcs?.update(dt * rate, controller, game?.active ? game.player : null);
  game?.robot?.update(dt * rate, controller);
  controller.tick(dt * rate);
  const proximityGain = getElevatorAudioGain();
  emergencyAlarm.setProximityGain(proximityGain);
  announcer.syncProximity();
  announcer.observe(controller);
  game?.update(dt);
  uiElapsed += dt;
  view?.update(controller);
  view?.render();
  if (uiElapsed > 0.08) {
    updateUI();
    uiElapsed = 0;
  }
  requestAnimationFrame(frame);
}

updateUI();
requestAnimationFrame(frame);
