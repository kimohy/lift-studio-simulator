import { floorUsage } from './building.js';
import { FLOORS } from './controller.js';
import { Escalators } from './escalator.js';
import { GuestRoom } from './guest-room.js';
import { HotelNPCSystem } from './hotel-npcs.js';
import { FAST_TRAVEL_SPOTS, HotelStay } from './hotel-stay.js';
import { HotelWorld } from './hotel-world.js';
import { WalkingPlayer } from './player.js';
import { RooftopPool } from './rooftop-pool.js';
import { ServiceRobot } from './service-robot.js';
import { Stairwell } from './stairs.js';

const $ = (id) => document.getElementById(id);

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);

export class GameMode {
  constructor(view, controller) {
    this.view = view;
    this.controller = controller;
    view.game = this;

    this.stay = new HotelStay();
    this.room = new GuestRoom(this.stay);
    this.pool = new RooftopPool();
    this.stairs = new Stairwell();
    this.world = new HotelWorld();
    this.escalators = new Escalators();
    this.npcs = new HotelNPCSystem(this.world);
    this.robot = new ServiceRobot(this.room, {
      onNotify: (msg) => {
        if (this.active) {
          this.message(msg);
          this.messageUntil = performance.now() + 6500;
        }
      },
    });
    this.player = new WalkingPlayer(this.stairs, this.world, this.escalators, this.room, this.pool);

    this.startInLobby();
    this.active = false;
    this.keys = new Set();
    this.virtualKeys = new Set();
    this.dragging = false;
    this.pointerDownInfo = null;
    this.hoverTime = 0;
    this.cursor = { x: 0, y: 0 };
    this.currentHit = null;
    this.isTouch = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
    document.body.classList.toggle('touch-device', this.isTouch);
    this.previousView = 'lobby';

    for (const dialogId of ['keycard-dialog', 'concierge-dialog']) {
      const dialog = $(dialogId);
      if (dialog && $('viewport')) {
        $('viewport').append(dialog);
      }
    }

    const canvas = view.canvas;
    canvas.tabIndex = 0;

    window.addEventListener('keydown', (e) => {
      if (e.target.closest?.('input,select,textarea,[contenteditable="true"],dialog')) return;
      if (e.code === 'Tab' && this.view.ready && !e.repeat) {
        e.preventDefault();
        if (this.active) this.exit();
        else this.enter();
        return;
      }
      if (!this.active) return;
      if (e.code === 'Escape' && document.body.classList.contains('game-fullscreen')) {
        this.leaveFullscreen();
        return;
      }
      if (e.code === 'KeyG' && !e.repeat) {
        e.preventDefault();
        this.openConciergeGuide();
        return;
      }
      if ((e.code === 'KeyE' || e.code === 'KeyF') && !e.repeat) {
        e.preventDefault();
        this.triggerCurrentHit();
        return;
      }
      if (MOVE_KEYS.has(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
      }
    });

    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clearInput());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearInput();
    });

    document.addEventListener('pointerlockchange', () => {
      this.clearInput();
      const locked = document.pointerLockElement === canvas;
      document.body.classList.toggle('pointer-locked', locked);
      if ($('game-lock')) {
        $('game-lock').textContent = locked ? '마우스 해제 (Esc)' : '마우스 고정';
      }
    });

    canvas.addEventListener('contextmenu', (e) => {
      if (this.active) e.preventDefault();
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      if (e.pointerType === 'touch') {
        this.isTouch = true;
        document.body.classList.add('touch-device');
      }
      canvas.focus({ preventScroll: true });
      if (e.button === 2) {
        this.dragging = true;
        this.pointerDownInfo = {
          id: e.pointerId,
          button: 2,
          touch: false,
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 0 && document.pointerLockElement !== canvas && !this.pointerDownInfo) {
        this.pointerDownInfo = {
          id: e.pointerId,
          button: 0,
          touch: e.pointerType === 'touch',
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
        };
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (this.pointerDownInfo && e.pointerId === this.pointerDownInfo.id) {
        const wasTouch = this.pointerDownInfo.touch;
        this.dragging = false;
        this.pointerDownInfo = null;
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
        if (wasTouch) {
          this.cursor = { x: 0, y: 0 };
          this.updateHUD();
        }
      }
    });

    canvas.addEventListener('pointercancel', (e) => {
      if (this.pointerDownInfo && e.pointerId === this.pointerDownInfo.id) {
        this.dragging = false;
        this.pointerDownInfo = null;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const rect = canvas.getBoundingClientRect();
      if (e.pointerType !== 'touch') {
        this.cursor = {
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
      }

      if (document.pointerLockElement === canvas) {
        this.player.look(e.movementX, e.movementY);
        this.applyCamera();
        return;
      }

      if (this.pointerDownInfo && e.pointerId === this.pointerDownInfo.id) {
        const dx = e.clientX - this.pointerDownInfo.lastX;
        const dy = e.clientY - this.pointerDownInfo.lastY;
        this.pointerDownInfo.lastX = e.clientX;
        this.pointerDownInfo.lastY = e.clientY;
        const dragThreshold = this.pointerDownInfo.touch ? 10 : 5;

        if (
          !this.dragging &&
          Math.hypot(e.clientX - this.pointerDownInfo.startX, e.clientY - this.pointerDownInfo.startY) > dragThreshold
        ) {
          this.dragging = true;
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {}
        }

        if (this.dragging) {
          const sens = this.pointerDownInfo.touch ? 1.85 : 1.0;
          this.player.look((e.movementX || dx) * sens, (e.movementY || dy) * sens);
          this.applyCamera();
          if (this.pointerDownInfo.touch) {
            this.cursor = { x: 0, y: 0 };
          }
        }
      }
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.active) e.preventDefault();
      },
      { passive: false }
    );

    this.bindTouchControls();

    $('game-target')?.addEventListener('click', () => {
      if (this.active) this.triggerCurrentHit();
    });

    $('keycard-button')?.addEventListener('click', () => {
      if (this.stay.keycard) {
        this.clearInput();
        if (document.pointerLockElement) document.exitPointerLock();
        $('keycard-dialog')?.showModal();
      }
    });
    $('keycard-close')?.addEventListener('click', () => $('keycard-dialog')?.close());
    $('guide-button')?.addEventListener('click', () => this.openConciergeGuide());
    $('concierge-close')?.addEventListener('click', () => $('concierge-dialog')?.close());
    $('game-toggle')?.addEventListener('click', () => (this.active ? this.exit() : this.enter()));
    $('game-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.syncFullscreen());
    $('game-exit')?.addEventListener('click', () => this.exit());
    $('game-lock')?.addEventListener('click', () => {
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
        return;
      }
      try {
        Promise.resolve(canvas.requestPointerLock()).catch(() =>
          this.message('화면을 드래그하면 시점을 바꿀 수 있습니다.')
        );
      } catch {
        this.message('화면을 드래그해 시점을 바꿀 수 있습니다.');
      }
    });
  }

  openConciergeGuide() {
    const dialog = $('concierge-dialog');
    if (!dialog) return;
    this.clearInput();
    if (document.pointerLockElement) document.exitPointerLock();
    this.renderConciergeGuide();
    dialog.showModal?.();
  }

  renderConciergeGuide() {
    const status = this.stay.getChecklistStatus();
    if ($('concierge-progress')) {
      $('concierge-progress').textContent = `${status.doneCount} / ${status.totalCount} 완료 (${status.percent}%)`;
    }
    const listEl = $('concierge-checklist');
    if (listEl) {
      listEl.replaceChildren();
      for (const item of status.items) {
        const li = document.createElement('li');
        li.className = item.done ? 'done' : '';
        li.textContent = `${item.done ? '✓ ' : '○ '}${item.title}`;
        listEl.append(li);
      }
    }
    const spotsEl = $('concierge-spots');
    if (spotsEl && !spotsEl.children.length) {
      for (const spot of FAST_TRAVEL_SPOTS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fast-travel-btn';
        btn.dataset.spotId = spot.id;
        btn.innerHTML = `<strong>${spot.label}</strong><small>${spot.subtitle}</small>`;
        btn.addEventListener('click', () => {
          $('concierge-dialog')?.close?.();
          this.fastTravelTo(spot.id);
        });
        spotsEl.append(btn);
      }
    }
  }

  fastTravelTo(spotId) {
    const spot = FAST_TRAVEL_SPOTS.find((s) => s.id === spotId);
    if (!spot) return { ok: false, message: '이동할 위치를 찾을 수 없습니다.' };
    if (!this.active && this.view?.ready) {
      this.enter();
    }
    this.player.leaveDoorway();
    this.controller.setObstruction(false, 'player');

    if (spot.id === 'room-301') {
      if (!this.stay.keycard) {
        this.stay.checkIn('reception-a');
        if ($('keycard-button')) $('keycard-button').hidden = false;
      }
      this.room.target = 1;
      this.room.open = 1;
      this.stay.completeMilestone('room301');
    } else if (spot.id === 'rooftop-pool') {
      this.stay.completeMilestone('rooftopPool');
    }
    if (spot.floor !== 5) {
      this.stay.completeMilestone('verticalTransit');
    }

    Object.assign(this.player, {
      floor: spot.floor,
      zone: spot.zone,
      x: spot.x,
      z: spot.z,
      yaw: spot.yaw,
      pitch: spot.pitch,
      worldY: (spot.floor - 5) * 3.5,
      stairY: (spot.floor - 5) * 3.5,
      escalatorY: (spot.floor - 5) * 3.5,
    });
    this.view?.applyVisibility?.(this.controller);
    this.applyCamera();
    const msg = `✨ [${spot.label}](으)로 빠르게 이동했습니다.`;
    this.message(msg);
    this.messageUntil = performance.now() + 4500;
    this.updateHUD();
    return { ok: true, spot, message: msg };
  }

  triggerCurrentHit() {
    const ndc = document.pointerLockElement === this.view.canvas || this.isTouch ? { x: 0, y: 0 } : this.cursor;
    const hit = this.currentHit || this.view.getInteraction(ndc, 2.5);
    if (hit && hit.userData?.action) {
      this.view.onAction?.(hit.userData.action, hit.userData.floorIndex, hit.userData.direction, hit.userData);
      this.updateHUD();
    }
  }

  bindTouchControls() {
    for (const btn of document.querySelectorAll('[data-move]')) {
      const code = btn.dataset.move;
      const activePointers = new Set();
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.pointerType === 'touch') {
          this.isTouch = true;
          document.body.classList.add('touch-device');
        }
        activePointers.add(e.pointerId);
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {}
        this.virtualKeys.add(code);
        btn.classList.add('active');
      };
      const release = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 0) {
          this.virtualKeys.delete(code);
          btn.classList.remove('active');
        }
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
    }
  }

  isFullscreen() {
    return document.fullscreenElement === $('viewport') || document.body.classList.contains('game-fullscreen');
  }

  syncFullscreen() {
    const on = this.isFullscreen();
    if ($('game-fullscreen')) {
      $('game-fullscreen').textContent = on ? '전체화면 해제' : '전체화면';
      $('game-fullscreen').setAttribute('aria-pressed', String(on));
    }
    this.clearInput();
    if (this.active) this.view.canvas.focus({ preventScroll: true });
    requestAnimationFrame(() => this.view.resize());
  }

  leaveFullscreen() {
    document.body.classList.remove('game-fullscreen');
    if (document.fullscreenElement === $('viewport')) {
      document.exitFullscreen().catch(() => {});
    }
    this.syncFullscreen();
  }

  async toggleFullscreen() {
    if (!this.active || this.fullscreenPending) return;
    if (this.isFullscreen()) {
      this.leaveFullscreen();
      return;
    }
    this.fullscreenPending = true;
    try {
      if (!$('viewport').requestFullscreen) throw new Error('Fullscreen unavailable');
      await $('viewport').requestFullscreen();
      if (!this.active) this.leaveFullscreen();
    } catch {
      if (this.active) {
        document.body.classList.add('game-fullscreen');
        this.message('화면을 확장했습니다. Esc를 누르면 돌아갑니다.');
      }
    } finally {
      this.fullscreenPending = false;
      this.syncFullscreen();
    }
  }

  startInLobby() {
    Object.assign(this.player, { x: 0, z: 12, yaw: Math.PI, pitch: -0.04 });
  }

  clearInput() {
    this.keys.clear();
    this.virtualKeys.clear();
    this.dragging = false;
    this.pointerDownInfo = null;
    for (const btn of document.querySelectorAll('[data-move].active')) {
      btn.classList.remove('active');
    }
  }

  hasKey(code) {
    return this.keys.has(code) || this.virtualKeys.has(code);
  }

  message(text) {
    if ($('game-target')) $('game-target').textContent = text;
    this.messageUntil = performance.now() + 2200;
  }

  enter() {
    if (!this.view.ready) return;
    this.previousView = this.view.view === 'game' ? 'lobby' : this.view.view;
    this.active = true;
    this.clearInput();
    this.player.sync(this.controller);

    document.body.classList.add('game-active');
    $('game-hud').hidden = false;
    $('game-toggle').textContent = '관찰 모드';
    $('game-toggle').setAttribute('aria-pressed', 'true');

    $('time-scale').value = '1';
    $('time-scale').dispatchEvent(new Event('change'));
    $('time-scale').disabled = true;

    this.view.setView('game', this.controller);
    this.applyCamera();
    this.view.canvas.focus({ preventScroll: true });
    this.view.resize();
    this.message('호텔에 오신 것을 환영합니다. WASD/방향키 또는 터치 패드로 이동하고 직원·문·엘리베이터 버튼을 클릭하세요.');
    this.updateHUD();
  }

  exit() {
    if (!this.active) return;
    this.player.leaveDoorway();
    this.controller.setObstruction(false, 'player');
    this.active = false;
    this.clearInput();
    this.leaveFullscreen();

    if (document.pointerLockElement === this.view.canvas) {
      document.exitPointerLock();
    }
    document.body.classList.remove('game-active', 'pointer-locked');
    $('game-hud').hidden = true;
    $('game-toggle').textContent = '호텔 체험 시작';
    $('game-toggle').setAttribute('aria-pressed', 'false');
    $('time-scale').disabled = false;

    this.view.setView(this.previousView, this.controller);
    this.view.canvas.style.cursor = '';
    this.view.resize();
  }

  reset() {
    this.room.reset();
    this.pool.reset();
    this.player.reset();
    this.startInLobby();
    this.stairs.reset();
    this.npcs.reset(this.controller);
    this.robot.reset(this.controller);
    this.clearInput();
    this.controller.setObstruction(false, 'player');
    if (document.pointerLockElement === this.view.canvas) {
      document.exitPointerLock();
    }
    if (this.active) {
      this.view.setView('game', this.controller);
      this.applyCamera();
      this.updateHUD();
    }
  }

  beforeStep() {
    if (this.active) {
      this.player.sync(this.controller);
      this.controller.setObstruction(this.player.blocksDoor(this.controller), 'player');
    }
  }

  update(dt) {
    if (!this.active) return;
    const forward =
      Number(this.hasKey('KeyW') || this.hasKey('ArrowUp')) -
      Number(this.hasKey('KeyS') || this.hasKey('ArrowDown'));
    const strafe =
      Number(this.hasKey('KeyD') || this.hasKey('ArrowRight')) -
      Number(this.hasKey('KeyA') || this.hasKey('ArrowLeft'));
    const sprint = this.hasKey('ShiftLeft') || this.hasKey('ShiftRight');

    if (!this.controller.paused) this.stairs.update(dt, this.player);
    if (!this.controller.paused) this.room.update(dt, this.player);
    this.escalators.carry(this.player, dt, this.controller);
    this.player.move(forward, strafe, dt, this.controller, sprint);
    this.controller.setObstruction(this.player.blocksDoor(this.controller), 'player');
    this.applyCamera();

    if (this.player.floor !== 5) this.stay.completeMilestone('verticalTransit');
    if (this.player.zone === 'room') this.stay.completeMilestone('room301');
    if (this.player.zone === 'pool') this.stay.completeMilestone('rooftopPool');

    this.hoverTime += dt;
    if (this.hoverTime > 0.1) {
      this.hoverTime = 0;
      this.updateHUD();
    }
  }

  applyCamera() {
    const p = this.player;
    this.view.camera.position.set(p.x, p.eyeY(this.controller), p.z);
    this.view.camera.rotation.order = 'YXZ';
    this.view.camera.rotation.set(p.pitch, p.yaw, 0);
    this.view.camera.updateMatrixWorld();
  }

  accepts(data) {
    if (!this.active) return true;
    if (data.action === 'roomDoor' || data.action === 'roomPrivacy') {
      return this.player.floor === 7 && ['lobby', 'room'].includes(this.player.zone);
    }
    if (
      [
        'roomTV',
        'roomLight',
        'roomCurtain',
        'roomShower',
        'roomBed',
        'roomArmchair',
        'roomCoffee',
        'roomMinibar',
        'roomSafe',
        'roomWardrobe',
        'roomThermostat',
        'roomAudio',
        'roomMirror',
        'roomToilet',
        'roomPhone',
        'roomDiffuser',
        'roomSuitcase',
        'roomDeskWork',
        'roomServiceOrder',
        'roomFood',
      ].includes(data.action)
    ) {
      return this.player.floor === 7 && this.player.zone === 'room';
    }
    if (['poolSwim', 'poolJacuzzi', 'poolLight', 'poolSunbed', 'poolBar'].includes(data.action)) {
      return this.player.floor === 14 && ['lobby', 'pool'].includes(this.player.zone);
    }
    if (['cafeOrder', 'cafeSit', 'loungeSit'].includes(data.action)) {
      return this.player.floor === 5 && this.player.zone === 'lobby';
    }
    if (data.action === 'parkingCar') {
      return this.player.floor < 5 && this.player.floor === data.floorIndex && this.player.zone === 'lobby';
    }
    if (data.action === 'otherRoomDoor') return this.player.zone === 'lobby' && data.floorIndex === this.player.floor;
    if (data.action === 'staff') return this.player.zone === 'lobby' && this.player.floor === 5;
    if (data.action === 'npc') {
      const npc = this.npcs.getNPC(data.npcId);
      return !!npc && (npc.floor === this.player.floor || (npc.zone === 'cabin' && this.player.zone === 'cabin'));
    }
    if (data.action === 'robot') {
      return (
        this.robot.floor === this.player.floor ||
        (this.robot.zone === 'cabin' && this.player.zone === 'cabin')
      );
    }
    if (data.action === 'stairDoor') return this.player.zone !== 'cabin' && data.floorIndex === this.player.floor;
    if (data.action === 'hall') return this.player.zone === 'lobby' && data.floorIndex === this.player.floor;
    return (
      this.player.zone === 'cabin' ||
      (this.player.inDoorway() && this.controller.aligned() && this.controller.floor === this.player.floor)
    );
  }

  stepInsideCabinIfInDoorway() {
    if (!this.active || !this.player.inDoorway()) return;
    if (this.controller.aligned() && this.controller.floor === this.player.floor && this.controller.door > 0.5) {
      this.player.z = 0.42;
      this.player.zone = 'cabin';
      this.controller.setObstruction(false, 'player');
      this.applyCamera();
    }
  }

  talkToStaff(data) {
    if (!this.active || this.player.floor !== 5 || !data?.staffId) return;
    const card = this.stay.checkIn(data.staffId);
    if (card) {
      $('keycard-button').hidden = false;
      this.message('체크인되었습니다. 3층 301호 키카드를 받았습니다. Welcome to Grand Hotel.');
    } else {
      this.message(data.dialogue);
    }
    this.messageUntil = performance.now() + 6500;
    this.view.hotelScene?.waveStaff(data.staffId, this.controller.time);
  }

  talkToNPC(data) {
    if (!this.active || !data?.npcId) return;
    const reply = this.npcs.interact(data.npcId, this.player, this.controller.time);
    if (reply) {
      this.message(reply);
      this.messageUntil = performance.now() + 5500;
    }
  }

  talkToRobot() {
    if (!this.active) return;
    this.stay.completeMilestone('roomService');
    const reply = this.robot.interact(this.controller.time);
    if (reply) {
      this.message(reply);
      this.messageUntil = performance.now() + 6000;
    }
  }

  interactLobby(action, data) {
    if (!this.active || this.player.floor !== 5) return;
    if (action === 'cafeOrder') {
      const res = this.stay.orderCafe();
      this.message(res.message);
    } else if (action === 'cafeSit') {
      const res = this.stay.sitAtCafe(this.player, data?.seatX, data?.seatZ, data?.seatYaw ?? data?.yaw);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'loungeSit') {
      const res = this.stay.sitAtLounge(this.player, data?.seatX, data?.seatZ, data?.seatYaw ?? data?.yaw);
      this.applyCamera();
      this.message(res.message);
    }
    this.messageUntil = performance.now() + 5000;
  }

  interactParking(data) {
    if (!this.active || this.player.floor >= 5 || !data) return;
    const res = this.stay.inspectCar(data);
    this.view.hotelScene?.flashCarLights(data.carId, this.controller.time);
    this.message(res.message);
    this.messageUntil = performance.now() + 5000;
  }

  interactRoom(action) {
    if (!this.active || this.player.floor !== 7) return;
    if (action !== 'roomPrivacy' && this.player.zone !== 'room') return;
    this.stay.completeMilestone('room301');
    if (action === 'roomTV') {
      this.message(this.room.cycleTV().message);
    } else if (action === 'roomLight') {
      this.message(this.room.cycleLight().message);
    } else if (action === 'roomCurtain') {
      this.message(this.room.toggleCurtain().message);
    } else if (action === 'roomShower') {
      this.message(this.room.toggleShower().message);
    } else if (action === 'roomBed') {
      const res = this.room.restOnBed(this.player);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'roomArmchair') {
      const res = this.room.sitArmchair(this.player);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'roomDeskWork') {
      const res = this.room.sitDesk(this.player);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'roomCoffee') {
      this.message(this.room.brewCoffee().message);
    } else if (action === 'roomMinibar') {
      this.message(this.room.useMinibar().message);
    } else if (action === 'roomSafe') {
      this.message(this.room.toggleSafe().message);
    } else if (action === 'roomWardrobe') {
      this.message(this.room.toggleWardrobe().message);
    } else if (action === 'roomThermostat') {
      this.message(this.room.cycleThermostat().message);
    } else if (action === 'roomAudio') {
      this.message(this.room.cycleAudio().message);
    } else if (action === 'roomMirror') {
      this.message(this.room.toggleVanityMirror().message);
    } else if (action === 'roomToilet') {
      this.message(this.room.flushToilet().message);
    } else if (action === 'roomPhone') {
      this.message(this.room.callConciergePhone().message);
    } else if (action === 'roomDiffuser') {
      this.message(this.room.cycleDiffuser().message);
    } else if (action === 'roomSuitcase') {
      this.message(this.room.toggleSuitcase().message);
    } else if (action === 'roomPrivacy') {
      this.message(this.room.cyclePrivacySign().message);
    } else if (action === 'roomServiceOrder') {
      this.stay.completeMilestone('roomService');
      const res = this.robot.orderRoomService();
      this.message(res.message);
      this.messageUntil = performance.now() + 6500;
      return;
    } else if (action === 'roomFood') {
      this.stay.completeMilestone('roomService');
      this.message(this.room.consumeFood().message);
    }
    this.messageUntil = performance.now() + 4500;
  }

  interactPool(action, data) {
    if (!this.active || this.player.floor !== 14) return;
    this.stay.completeMilestone('rooftopPool');
    if (action === 'poolSwim') {
      const res = this.pool.toggleSwim(this.player);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'poolJacuzzi') {
      const res = this.pool.toggleJacuzzi(this.player);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'poolLight') {
      this.message(this.pool.cyclePoolLight().message);
    } else if (action === 'poolSunbed') {
      const res = this.pool.restOnSunbed(this.player, data?.restX, data?.restZ);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'poolBar') {
      this.message(this.pool.orderPoolDrink().message);
    }
    this.messageUntil = performance.now() + 5000;
  }

  toggleRoomDoor() {
    if (!this.active || this.player.floor !== 7) return;
    const result = this.room.toggle(this.player);
    if (this.player.zone === 'room') this.stay.completeMilestone('room301');
    this.message(result.message);
  }

  inspectOtherRoom(data) {
    if (!this.active || !data?.room) return;
    if (this.stay.keycard) {
      this.message(`${data.room}호는 다른 투숙객 전용 객실입니다. 배정된 객실은 3층 301호입니다.`);
    } else {
      this.message(`${data.room}호 객실입니다. 먼저 1층 리셉션에서 체크인해 배정 객실(301호) 키카드를 받으세요.`);
    }
  }

  toggleStairDoor(floor) {
    if (!this.active || floor !== this.player.floor || this.player.zone === 'cabin') return;
    const ok = this.stairs.toggleDoor(floor, this.player);
    this.message(
      !ok
        ? '출입문에서 조금 떨어진 뒤 닫아 주세요.'
        : this.stairs.doors[floor].target
          ? '계단실 문을 엽니다. WASD로 걸어서 이동하세요.'
          : '계단실 문을 닫습니다.'
    );
  }

  stairLocation() {
    const level = this.player.stairY / 3.5 + 5;
    const near = Math.round(level);
    if (Math.abs(level - near) < 0.025) {
      return `${FLOORS[near]}층 · ${floorUsage(near).ko} · 계단실`;
    }
    const lower = Math.floor(level);
    return `${FLOORS[lower]}층 ↔ ${FLOORS[lower + 1]}층 · 계단`;
  }

  getActionHint(d) {
    const p = this.player;
    switch (d.action) {
      case 'roomDoor':
        return `301호 · ${
          this.room.target ? '문 닫기' : this.stay.canAccess('301') || p.zone === 'room' ? '문 열기' : '키카드 필요'
        } · 클릭`;
      case 'roomTV':
        return `스마트 TV (현재: ${this.room.tvMode.toUpperCase()}) · 클릭해 채널/전원 전환`;
      case 'roomLight':
        return '객실 조명 스위치 · 클릭해 조명 분위기 전환';
      case 'roomCurtain':
        return `전동 커튼 · 클릭해 ${this.room.curtainTarget ? '닫기' : '열기'}`;
      case 'roomShower':
        return `욕실 수전/레인 샤워기 · 클릭해 ${this.room.showerOn ? '잠그기' : '물 틀기'}`;
      case 'roomBed':
        return '킹사이즈 침대 · 클릭해 편안히 휴식하기';
      case 'roomArmchair':
        return '창가 라운지 암체어 · 클릭해 앉아서 시티뷰 감상하기 🪑';
      case 'roomDeskWork':
        return `워크 데스크 & 노트북 (${this.room.workLaptopOn ? '켜짐' : '대기'}) · 클릭해 착석 및 워크스테이션 사용 💻`;
      case 'roomCoffee':
        return '에스프레소 캡슐 커피 머신 · 클릭해 스페셜티 커피 추출하기 ☕';
      case 'roomMinibar':
        return `미니바 냉장고 · 클릭해 ${this.room.minibarTarget ? '문 닫기' : '음료/와인 꺼내기 🥂'}`;
      case 'roomSafe':
        return `디지털 객실 금고 · 클릭해 ${this.room.safeTarget ? '잠그기 🔒' : '열기 🔐'}`;
      case 'roomWardrobe':
        return `오픈 옷장 · 클릭해 ${this.room.wearingRobe ? '외출복으로 갈아입기 👔' : '호텔 배스로브(가운) 착용하기 🥼'}`;
      case 'roomThermostat':
        return `스마트 온도조절기 (${this.room.acMode.temp}°C · ${this.room.acMode.mode}) · 클릭해 온도/모드 변경 🌡️`;
      case 'roomAudio':
        return `블루투스 스피커 (${this.room.audioTrack.label}) · 클릭해 음악 전환/정지 🎵`;
      case 'roomMirror':
        return `욕실 스마트 터치 거울 · 클릭해 김서림 방지 할로 LED 조명 ${this.room.mirrorLit ? '끄기' : '켜기'} 🪞`;
      case 'roomToilet':
        return '스마트 비데 양변기 · 클릭해 자동 물내림 & UV 살균 클리닝 🚽';
      case 'roomPhone':
        return '호텔 직통 내선 전화기 · 클릭해 프런트/하우스키핑/컨시어지 통화 ☎️';
      case 'roomDiffuser':
        return `아로마 스톤 디퓨저 (${this.room.diffuserScent.label}) · 클릭해 향기 미스트 전환 🌿`;
      case 'roomSuitcase':
        return `여행용 하드 캐리어 · 클릭해 ${this.room.suitcaseTarget ? '닫기' : '열어 짐 정리하기'} 🧳`;
      case 'roomPrivacy':
        return `객실 프라이버시 사인 (${this.room.privacyMode.label}) · 클릭해 방해금지(DND)/객실정비 전환 🔔`;
      case 'roomServiceOrder':
        return '스마트 컨시어지 태블릿 · 클릭해 룸서비스 로봇 배달 주문 🤖';
      case 'roomFood':
        return `룸서비스 트레이 (${this.room.foodItem}) · 클릭해 식사 즐기기 ☕🥐`;
      case 'poolSwim':
        return `루프탑 인피니티 풀 · 클릭해 ${this.pool.inPool(p.x, p.z) ? '데크로 나오기' : '수영장 입수하기 🏊'}`;
      case 'poolJacuzzi':
        return `루프탑 온수 자쿠지 스파 · 클릭해 ${this.pool.inJacuzzi(p.x, p.z) ? '월풀 버블 전환' : '온수 스파 입수 ♨️'}`;
      case 'poolLight':
        return `인피니티 풀 컨트롤 패널 (${this.pool.lightMode.label}) · 클릭해 수중 조명/분수 전환 ✨`;
      case 'poolSunbed':
        return '풀사이드 선베드 / 카바나 · 클릭해 누워서 시티뷰 휴식하기 🏖️';
      case 'poolBar':
        return '루프탑 스카이 풀 바 · 클릭해 트로피컬 칵테일/음료 주문하기 🍹';
      case 'cafeOrder':
        return `${d.cafeLabel || 'Grand Café 바 카운터'} · 클릭해 스페셜티 커피 & 베이커리 주문하기 ☕🥐`;
      case 'cafeSit':
        return `${d.cafeLabel || 'Grand Café 테이블'} · 클릭해 착석 후 커피 타임 즐기기 ☕`;
      case 'loungeSit':
        return `${d.loungeLabel || '로비 라운지 소파'} · 클릭해 착석해 휴식하기 🛋️`;
      case 'parkingCar':
        return `${d.carModel || '주차 차량'} (${d.bayLabel || '주차 구역'}) · 클릭해 스마트키 웰컴 라이트 & 상태 확인 🚗`;
      case 'otherRoomDoor':
        return `${d.room}호 · ${this.stay.keycard ? '배정된 객실 아님 (301호 배정)' : '체크인 필요'} · 클릭`;
      case 'staff':
        return `${d.staffName} · ${d.staffId.startsWith('reception-') ? '클릭해 체크인' : '클릭해 이야기하기'}`;
      case 'npc':
        return `${d.npcName} (${this.npcs.statusLabel(this.npcs.getNPC(d.npcId) || {})}) · 클릭해 대화하기`;
      case 'robot':
        return `${d.robotName} (${this.robot.statusLabel()}) · 클릭해 상호작용/룸서비스 요청`;
      case 'stairDoor':
        return `${FLOORS[d.floorIndex]}층 계단실 문 ${this.stairs.doors[d.floorIndex].target ? '닫기' : '열기'} · 왼쪽 클릭`;
      case 'hall':
        return `${FLOORS[d.floorIndex]}층 ${d.direction === 1 ? '올라가기' : '내려가기'} 호출 · 왼쪽 클릭`;
      case 'car':
        return `${FLOORS[d.floorIndex]}층 선택 · 왼쪽 클릭`;
      default:
        return `${{ open: '문 열림', close: '문 닫힘', alarm: '비상 호출' }[d.action]} · 왼쪽 클릭`;
    }
  }

  updateHUD() {
    const p = this.player;
    const c = this.controller;
    $('player-location').textContent =
      p.zone === 'cabin'
        ? `엘리베이터 안 · ${FLOORS[c.floor]}층${c.state === 'moving' ? ' 이동 중' : ''}`
        : p.zone === 'room'
          ? `3층 · 301호 객실${this.room.wearingRobe ? ' (호텔 가운 🥼)' : ''}${this.room.privacyMode.id === 'dnd' ? ' · 🔕 DND' : this.room.privacyMode.id === 'makeup' ? ' · 🧹 정비요청' : ''}`
          : p.zone === 'pool'
            ? this.pool.inPool(p.x, p.z)
              ? '10층 · 루프탑 인피니티 풀 (수영 중 🏊)'
              : this.pool.inJacuzzi(p.x, p.z)
                ? '10층 · 루프탑 온수 자쿠지 스파 ♨️'
                : '10층 · 루프탑 인피니티 풀 & 스카이 바'
            : p.zone === 'escalator'
              ? `${FLOORS[p.floor]}층 · 에스컬레이터`
              : p.zone === 'stairs'
                ? this.stairLocation()
                : `${FLOORS[p.floor]}층 · ${this.world.location(p)}`;

    $('game-lift-state').textContent = `엘리베이터 ${FLOORS[c.floor]}층 · ${
      c.state === 'moving' ? (c.direction > 0 ? '올라가는 중' : '내려가는 중') : c.door > 0 ? '문 열림' : '대기'
    }`;

    const guideBtn = $('guide-button');
    if (guideBtn) {
      const status = this.stay.getChecklistStatus();
      guideBtn.textContent = `호텔 가이드 · ${status.doneCount}/${status.totalCount}`;
    }

    const ndc =
      document.pointerLockElement === this.view.canvas || this.isTouch
        ? { x: 0, y: 0 }
        : this.cursor;
    const hit = this.view.getInteraction(ndc, 2.5);
    this.currentHit = hit;
    this.view.canvas.style.cursor = hit ? 'pointer' : this.dragging ? 'grabbing' : 'crosshair';
    $('game-crosshair')?.classList.toggle('targeted', !!hit);
    $('game-target')?.classList.toggle('actionable', !!hit);

    if (performance.now() < (this.messageUntil || 0)) return;

    let text;
    if (hit) {
      text = this.getActionHint(hit.userData);
    } else if (p.zone === 'ramp') {
      text = '차량용 경사로입니다. WASD로 주차장 층 사이를 이동할 수 있습니다.';
    } else if (p.zone === 'room') {
      text =
        '301호 객실입니다. TV·조명·커튼·침대·암체어·노트북·커피머신·미니바·금고·캐리어·전화기·디퓨저·욕실 거울·비데 등을 클릭해 보세요.';
    } else if (p.zone === 'pool') {
      text = this.pool.inPool(p.x, p.z)
        ? '🏊 루프탑 인피니티 풀에서 수영 중입니다! WASD로 헤엄치거나 사다리/수면을 클릭해 데크로 나올 수 있습니다.'
        : '10층 루프탑 수영장입니다. 인피니티 풀 입수·온수 자쿠지·선베드·스카이 풀 바·수중 조명 패널을 클릭해 즐겨 보세요.';
    } else if (p.zone === 'escalator') {
      text = '발판에 올라서면 자동 이동합니다. 출구에서 WASD로 복도로 이동하세요.';
    } else if (p.zone === 'stairs') {
      text = 'WASD로 계단을 오르내리세요. 층별 표지를 따라 복도 문을 열 수 있습니다.';
    } else if (p.inDoorway()) {
      text = '출입문 감지선 위치입니다. 문이 닫히고 출발하려면 엘리베이터 안쪽이나 승강장으로 한 걸음 이동하세요.';
    } else if (p.zone === 'cabin') {
      text =
        c.state === 'moving'
          ? '이동 중입니다. 도착해 문이 열리면 걸어서 내리세요.'
          : '내부 층 버튼을 클릭해 목적층을 선택하세요.';
    } else if (p.floor === 14) {
      text = '10층입니다. 정면 아치 통로로 걸어가면 루프탑 인피니티 풀 & 스카이 라운지로 이어집니다.';
    } else {
      text = '왼쪽 에스컬레이터 · 오른쪽 계단 · 뒤쪽 통로는 로비와 주차장입니다. [G/Tab] 호텔 가이드';
    }
    $('game-target').textContent = text;
  }
}
