import { floorMeta, floorUsage } from './building.js';
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
    this.holdingCoffee = false;
    this.telescopeZoom = false;
    this.escalatorSoundTimer = 0;
    this.walkBobPhase = 0;
    this.footstepDist = 0;
    this.isMoving = false;
    this.camOffset = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    this.lastKnownVipTierId = this.stay.vipTier?.id || 'classic';
    this.toastUntil = 0;

    for (const dialogId of ['keycard-dialog', 'concierge-dialog', 'floor-directory-dialog']) {
      const dialog = $(dialogId);
      if (dialog && $('viewport')) {
        $('viewport').append(dialog);
      }
    }

    $('floor-directory-button')?.addEventListener('click', () => {
      this.openFloorDirectory();
    });
    $('game-minimap-wrap')?.addEventListener('click', () => {
      this.openFloorDirectory();
    });
    $('game-weather')?.addEventListener('click', () => {
      this.cycleWeatherMode();
    });
    $('floor-directory-close')?.addEventListener('click', () => {
      $('floor-directory-dialog')?.close?.();
    });

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
      if (e.code === 'KeyM' && !e.repeat) {
        e.preventDefault();
        this.openFloorDirectory();
        return;
      }
      if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        this.triggerCurrentHit();
        return;
      }
      if (e.code === 'KeyF' && !e.repeat) {
        e.preventDefault();
        if (this.currentHit) {
          this.triggerCurrentHit();
        } else {
          this.openFloorDirectory();
        }
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
    const questStatus = this.stay.getQuestStatus?.();
    if (questStatus) {
      if ($('concierge-quest-progress')) {
        $('concierge-quest-progress').textContent = `${this.stay.vipTier.badge} · ${this.stay.points} PTS (${questStatus.doneCount}/${questStatus.totalCount} 퀘스트)`;
      }
      const questListEl = $('concierge-quests');
      if (questListEl) {
        questListEl.replaceChildren();
        for (const q of questStatus.items) {
          const li = document.createElement('li');
          li.className = q.done ? 'done' : '';
          li.innerHTML = `<strong>${q.done ? '✓ ' : '🎯 '}${q.title} <em>+${q.rewardPoints}P</em></strong><small>${q.desc}</small>`;
          questListEl.append(li);
        }
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

  openFloorDirectory() {
    const dialog = $('floor-directory-dialog');
    if (!dialog) return;
    this.clearInput();
    if (document.pointerLockElement) document.exitPointerLock();
    this.renderFloorDirectory();
    dialog.showModal?.();
  }

  renderFloorDirectory() {
    const listEl = $('floor-directory-list');
    if (!listEl) return;
    listEl.replaceChildren();

    const currentLiftFloor = this.controller.floor;
    const isMoving = this.controller.state === 'moving';
    const liftDir = this.controller.direction > 0 ? '▲ 상행' : this.controller.direction < 0 ? '▼ 하행' : '대기';
    const playerFloor = this.player.floor;

    for (let f = 14; f >= 0; f--) {
      const meta = floorMeta(f, FLOORS[f]);
      const usage = floorUsage(f);
      const row = document.createElement('div');
      row.className = 'directory-row' + (f < 5 ? ' basement' : '') + (f === playerFloor ? ' player-here' : '');

      const badges = [];
      if (f === playerFloor) {
        badges.push('<span class="dir-badge player">👤 현재 내 위치</span>');
      }
      if (f === currentLiftFloor) {
        badges.push(`<span class="dir-badge lift">🛗 승강기 (${isMoving ? liftDir : this.controller.door > 0 ? '문 열림' : '대기'})</span>`);
      }

      row.innerHTML = `
        <div class="dir-floor-badge">${FLOORS[f]}<small>F</small></div>
        <div class="dir-floor-info">
          <div class="dir-floor-title">
            <strong>${usage.ko}</strong>
            <span class="dir-en">${usage.en}</span>
          </div>
          <div class="dir-floor-desc">${meta.desc}</div>
          ${badges.length ? `<div class="dir-badges">${badges.join(' ')}</div>` : ''}
        </div>
        <div class="dir-actions">
          <button type="button" class="dir-teleport-btn" data-floor="${f}">이동</button>
        </div>
      `;

      row.querySelector('.dir-teleport-btn')?.addEventListener('click', () => {
        $('floor-directory-dialog')?.close?.();
        this.fastTravelToFloor(f);
      });

      listEl.append(row);
    }
  }

  fastTravelToFloor(floorIndex) {
    if (!this.active && this.view?.ready) {
      this.enter();
    }
    this.player.leaveDoorway();
    this.controller.setObstruction(false, 'player');

    let targetX = 0;
    let targetZ = 8.5;
    let zone = 'lobby';
    let yaw = Math.PI;

    if (floorIndex === 7) {
      targetX = -1.5;
      targetZ = 6.0;
    } else if (floorIndex === 14) {
      targetX = 6.0;
      targetZ = 2.0;
      zone = 'pool';
      this.stay.completeMilestone('rooftopPool');
    } else if (floorIndex < 5) {
      targetX = 0;
      targetZ = 6.0;
    }

    if (floorIndex !== 5) {
      this.stay.completeMilestone('verticalTransit');
    }

    Object.assign(this.player, {
      floor: floorIndex,
      zone,
      x: targetX,
      z: targetZ,
      yaw,
      pitch: -0.04,
      worldY: (floorIndex - 5) * 3.5,
      stairY: (floorIndex - 5) * 3.5,
      escalatorY: (floorIndex - 5) * 3.5,
    });

    this.view?.applyVisibility?.(this.controller);
    this.applyCamera();
    const floorLabel = FLOORS[floorIndex] + 'F';
    const msg = `✨ [${floorLabel} · ${floorUsage(floorIndex).ko}](으)로 빠르게 이동했습니다.`;
    this.message(msg);
    this.messageUntil = performance.now() + 4500;
    this.updateHUD();
    return { ok: true, floor: floorIndex, message: msg };
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
    this.message('그랜드 호텔에 오신 것을 환영합니다. WASD 이동 · 클릭/E 상호작용');
    this.updateHUD();
  }

  exit() {
    if (!this.active) return;
    this.player.leaveDoorway();
    this.controller.setObstruction(false, 'player');
    this.active = false;
    this.clearInput();
    this.leaveFullscreen();
    if (this.telescopeZoom) {
      this.telescopeZoom = false;
      if (this.view.camera) {
        this.view.camera.fov = 65;
        this.view.camera.updateProjectionMatrix();
      }
    }

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
    this.holdingCoffee = false;
    if (this.telescopeZoom) {
      this.telescopeZoom = false;
      if (this.view.camera) {
        this.view.camera.fov = 65;
        this.view.camera.updateProjectionMatrix();
      }
    }
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

  captureCameraPose() {
    const p = this.player;
    return {
      x: p.x,
      y: p.eyeY(this.controller),
      z: p.z,
      yaw: p.yaw,
      pitch: p.pitch,
    };
  }

  commitCameraLerp(prev) {
    if (!prev) return;
    const p = this.player;
    const curY = p.eyeY(this.controller);
    this.camOffset = {
      x: Math.max(-2.5, Math.min(2.5, prev.x - p.x)),
      y: Math.max(-1.5, Math.min(1.5, prev.y - curY)),
      z: Math.max(-2.5, Math.min(2.5, prev.z - p.z)),
      yaw: 0,
      pitch: Math.max(-0.4, Math.min(0.4, prev.pitch - p.pitch)),
    };
  }

  detectSurfaceMaterial() {
    const p = this.player;
    if (p.zone === 'pool' && this.pool?.isWater(p.x, p.z, p.floor)) return 'water';
    if (p.zone === 'room' || p.zone === 'pool') return 'wood';
    if (p.zone === 'cabin' || p.zone === 'escalator' || p.zone === 'stairs') return 'metal';
    if (p.floor < 5 || p.zone === 'ramp') return 'concrete';
    return 'marble';
  }

  notifyQuestProgress(newlyCompletedQuests = []) {
    if (newlyCompletedQuests && newlyCompletedQuests.length > 0) {
      this.view.sfx?.playQuestComplete?.();
      const q = newlyCompletedQuests[0];
      this.showToast({
        badge: '🏆 CONCIERGE QUEST COMPLETE',
        title: q.title,
        subtitle: `+${q.rewardPoints} VIP PTS 획득 · 현재 ${this.stay.vipTier.badge} (${this.stay.points} PTS)`,
      });
    }
    const curTier = this.stay?.vipTier;
    if (curTier && this.lastKnownVipTierId && curTier.id !== this.lastKnownVipTierId) {
      this.lastKnownVipTierId = curTier.id;
      this.view.sfx?.playQuestComplete?.();
      this.showToast({
        badge: '👑 VIP MEMBERSHIP TIER UP!',
        title: `${curTier.badge} 등급 승급을 축하합니다!`,
        subtitle: `${curTier.perk || '호텔 전 층 VIP 컨시어지 특전이 활성화되었습니다.'}`,
      });
    }
  }

  showToast({ badge = '🏆 GRAND HOTEL VIP', title = '', subtitle = '', duration = 4200 } = {}) {
    const toastEl = $('game-toast');
    if (toastEl) {
      if ($('game-toast-badge')) $('game-toast-badge').textContent = badge;
      if ($('game-toast-title')) $('game-toast-title').textContent = title;
      if ($('game-toast-sub')) $('game-toast-sub').textContent = subtitle;
      toastEl.hidden = false;
    }
    this.toastUntil = performance.now() + duration;
  }

  cycleWeatherMode() {
    if (!this.view?.cycleWeather) return null;
    const mode = this.view.cycleWeather(this.controller);
    this.view.sfx?.playWeatherChime?.();
    if ($('game-weather')) {
      $('game-weather').textContent = mode.label;
    }
    this.message(`${mode.label} · ${mode.desc}`);
    this.messageUntil = performance.now() + 4000;
    return mode;
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

    const prevX = this.player.x;
    const prevZ = this.player.z;

    if (!this.controller.paused) this.stairs.update(dt, this.player);
    if (!this.controller.paused) this.room.update(dt, this.player);
    this.escalators.carry(this.player, dt, this.controller);
    this.player.move(forward, strafe, dt, this.controller, sprint);
    this.controller.setObstruction(this.player.blocksDoor(this.controller), 'player');

    const stepMoved = Math.hypot(this.player.x - prevX, this.player.z - prevZ);
    this.isMoving = (forward !== 0 || strafe !== 0) && stepMoved > 1e-4;
    if (this.isMoving && !this.controller.paused) {
      this.walkBobPhase = (this.walkBobPhase || 0) + stepMoved * (sprint ? 4.2 : 3.5);
      this.footstepDist = (this.footstepDist || 0) + stepMoved;
      const stepStride = sprint ? 1.05 : 0.78;
      if (this.footstepDist >= stepStride) {
        this.footstepDist %= stepStride;
        this.view.sfx?.playFootstep?.(this.detectSurfaceMaterial(), sprint);
      }
    } else if (!this.isMoving) {
      this.footstepDist = 0;
    }

    if (this.camOffset) {
      const decay = Math.exp(-Math.max(0, dt) * 11);
      this.camOffset.x *= decay;
      this.camOffset.y *= decay;
      this.camOffset.z *= decay;
      this.camOffset.pitch *= decay;
      if (
        Math.abs(this.camOffset.x) < 1e-4 &&
        Math.abs(this.camOffset.y) < 1e-4 &&
        Math.abs(this.camOffset.z) < 1e-4
      ) {
        this.camOffset.x = 0;
        this.camOffset.y = 0;
        this.camOffset.z = 0;
        this.camOffset.pitch = 0;
      }
    }

    this.applyCamera();

    // Auto-reset telescope zoom if walking or stepped away
    if (this.telescopeZoom) {
      const moved = forward !== 0 || strafe !== 0;
      const distFromTelescope = Math.hypot(this.player.x - 7.4, this.player.z - 25.1);
      const farFromTelescope =
        this.player.floor !== 14 ||
        !['pool', 'lobby'].includes(this.player.zone) ||
        distFromTelescope > 2.2;
      if (moved || farFromTelescope) {
        this.telescopeZoom = false;
        if (this.view.camera) {
          this.view.camera.fov = 65;
          this.view.camera.updateProjectionMatrix();
        }
        this.view.sfx?.playOpticZoom?.();
        this.message('🔭 망원경에서 물러나 시야가 기본 배율로 복귀했습니다.');
        this.messageUntil = performance.now() + 3000;
      }
    }

    if (this.player.zone === 'escalator' && !this.escalators.stopped && !this.controller.paused) {
      this.escalatorSoundTimer = (this.escalatorSoundTimer || 0) + dt;
      if (this.escalatorSoundTimer >= 0.5) {
        this.escalatorSoundTimer = 0;
        this.view.sfx?.playEscalatorRoll?.();
      }
    } else {
      this.escalatorSoundTimer = 0;
    }

    if (this.player.floor !== 5) this.stay.completeMilestone('verticalTransit');
    if (this.player.zone === 'room') this.stay.completeMilestone('room301');
    if (this.player.zone === 'pool') this.stay.completeMilestone('rooftopPool');

    this.hoverTime += dt;
    if (this.hoverTime > 0.12) {
      this.hoverTime = 0;
      this.updateHUD();
    }
  }

  applyCamera() {
    const p = this.player;
    const ox = this.camOffset?.x || 0;
    const oy = this.camOffset?.y || 0;
    const oz = this.camOffset?.z || 0;
    const opitch = this.camOffset?.pitch || 0;
    const bobY = this.isMoving ? Math.sin((this.walkBobPhase || 0) * 2) * 0.018 : 0;
    const bobRoll = this.isMoving ? Math.cos(this.walkBobPhase || 0) * 0.0035 : 0;

    this.view.camera.position.set(p.x + ox, p.eyeY(this.controller) + oy + bobY, p.z + oz);
    this.view.camera.rotation.order = 'YXZ';
    this.view.camera.rotation.set(p.pitch + opitch, p.yaw, bobRoll);
    this.view.camera.updateMatrixWorld();
  }

  accepts(data) {
    if (!this.active) return true;
    if (data.action === 'floorAmenity') {
      return this.player.zone !== 'cabin' && data.floorIndex === this.player.floor;
    }
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
    if (['poolSwim', 'poolJacuzzi', 'poolLight', 'poolSunbed', 'poolBar', 'poolTelescope', 'poolSwimmer'].includes(data.action)) {
      return this.player.floor === 14 && ['lobby', 'pool'].includes(this.player.zone);
    }
    if (data.action === 'escalatorStop') {
      return true;
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
    if (data.action === 'automaticDoor') return this.player.zone !== 'cabin' && data.floorIndex === this.player.floor;
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

  interactFloorAmenity(floorIndex) {
    if (!this.active) return;
    const f = floorIndex ?? this.player.floor;
    const res = this.stay.useFloorAmenity(f);
    this.notifyQuestProgress(res.newlyCompletedQuests);
    this.message(res.message);
    this.messageUntil = performance.now() + 5500;
    this.updateHUD();
    return res;
  }

  talkToStaff(data) {
    if (!this.active || this.player.floor !== 5 || !data?.staffId) return;
    const card = this.stay.checkIn(data.staffId);
    const quests = this.stay.recordSocial?.(`staff:${data.staffId}`);
    this.notifyQuestProgress(quests);
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
    const quests = this.stay.recordSocial?.(`npc:${data.npcId}`);
    this.notifyQuestProgress(quests);
    if (reply) {
      this.message(reply);
      this.messageUntil = performance.now() + 5500;
    }
  }

  talkToRobot() {
    if (!this.active) return;
    this.stay.completeMilestone('roomService');
    const quests = this.stay.evaluateQuests?.();
    this.notifyQuestProgress(quests);
    const reply = this.robot.interact(this.controller.time);
    if (reply) {
      this.message(reply);
      this.messageUntil = performance.now() + 6000;
    }
  }

  interactLobby(action, data) {
    if (!this.active || this.player.floor !== 5) return;
    if (action === 'cafeOrder') {
      if (this.holdingCoffee) {
        this.holdingCoffee = false;
        this.stay.addEnergy?.(8);
        const msg = `☕ [${this.stay.lastCafeItem || '스페셜티 커피'}]를 한 모금 음미합니다. 깊고 풍부한 아로마와 부드러운 여운이 감돕니다.`;
        this.message(msg);
      } else {
        const res = this.stay.orderCafe();
        this.holdingCoffee = true;
        this.message(res.message);
      }
    } else if (action === 'cafeSit') {
      const prev = this.captureCameraPose();
      const res = this.stay.sitAtCafe(this.player, data?.seatX, data?.seatZ, data?.seatYaw ?? data?.yaw);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'loungeSit') {
      const prev = this.captureCameraPose();
      const res = this.stay.sitAtLounge(this.player, data?.seatX, data?.seatZ, data?.seatYaw ?? data?.yaw);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    }
    this.messageUntil = performance.now() + 5000;
  }

  interactParking(data) {
    if (!this.active || this.player.floor >= 5 || !data) return;
    if (typeof data.carX === 'number' && typeof data.carZ === 'number') {
      const prev = this.captureCameraPose();
      const sideOffset = data.carX < 0 ? 1.55 : -1.55;
      const targetX = data.carX + sideOffset;
      const targetZ = data.carZ;
      if (this.world.canOccupy(this.player.floor, targetX, targetZ, this.player.zone)) {
        this.player.x = targetX;
        this.player.z = targetZ;
        this.player.yaw = Math.atan2(this.player.x - data.carX, this.player.z - data.carZ);
        this.player.pitch = -0.08;
        this.commitCameraLerp(prev);
        this.applyCamera();
      }
    }
    const res = this.stay.inspectCar(data);
    this.notifyQuestProgress(this.stay.evaluateQuests?.());
    this.view.sfx?.playCarIgnition?.();
    this.view.hotelScene?.flashCarLights(data.carId, this.controller.time);
    this.message(res.message);
    this.messageUntil = performance.now() + 5000;
  }

  interactRoom(action) {
    if (!this.active || this.player.floor !== 7) return;
    if (action !== 'roomPrivacy' && this.player.zone !== 'room') return;
    this.stay.completeMilestone('room301');
    const newlyCompleted = this.stay.recordRoomAction?.(action);
    this.notifyQuestProgress(newlyCompleted);
    if (action === 'roomTV') {
      this.message(this.room.cycleTV().message);
    } else if (action === 'roomLight') {
      this.message(this.room.cycleLight().message);
    } else if (action === 'roomCurtain') {
      this.message(this.room.toggleCurtain().message);
    } else if (action === 'roomShower') {
      this.message(this.room.toggleShower().message);
    } else if (action === 'roomBed') {
      const prev = this.captureCameraPose();
      const res = this.room.restOnBed(this.player);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'roomArmchair') {
      const prev = this.captureCameraPose();
      const res = this.room.sitArmchair(this.player);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'roomDeskWork') {
      const prev = this.captureCameraPose();
      const res = this.room.sitDesk(this.player);
      this.commitCameraLerp(prev);
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
      const res = this.room.callConciergePhone();
      if (res.turndown) {
        this.stay.addPoints?.(60, 'room:vipTurndown');
        this.stay.addEnergy?.(25);
        this.showToast({
          badge: '🥂 VIP TURNDOWN SERVICE',
          title: '301호 나이트 턴다운 & 그랑 크뤼 샴페인 세팅',
          subtitle: '무드 조명 · 재즈 트리오 · 라벤더 아로마 · 샴페인 트레이 준비 완료',
        });
      }
      this.message(res.message);
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
    const newlyCompleted = this.stay.recordRooftopAction?.(action);
    this.notifyQuestProgress(newlyCompleted);
    if (action === 'poolSwim') {
      const prev = this.captureCameraPose();
      const res = this.pool.toggleSwim(this.player);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'poolJacuzzi') {
      const prev = this.captureCameraPose();
      const res = this.pool.toggleJacuzzi(this.player);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'poolLight') {
      this.message(this.pool.cyclePoolLight().message);
    } else if (action === 'poolSunbed') {
      const prev = this.captureCameraPose();
      const res = this.pool.restOnSunbed(this.player, data?.restX, data?.restZ);
      this.commitCameraLerp(prev);
      this.applyCamera();
      this.message(res.message);
    } else if (action === 'poolBar') {
      this.message(this.pool.orderPoolDrink().message);
    } else if (action === 'poolTelescope') {
      this.telescopeZoom = !this.telescopeZoom;
      if (this.view.camera) {
        this.view.camera.fov = this.telescopeZoom ? 22 : 65;
        this.view.camera.updateProjectionMatrix();
      }
      this.view.sfx?.playOpticZoom?.();
      this.message(
        this.telescopeZoom
          ? '🔭 [스카이라인 전망 망원경] 3배 고배율 줌 렌즈로 시티 파노라마 전경을 관측합니다! (이동하거나 재클릭 시 기본 시야 복귀)'
          : '🔭 망원경에서 물러나 루프탑 스카이풀 전경으로 시야를 복귀합니다.'
      );
    } else if (action === 'poolSwimmer') {
      const res = this.view.rooftopPoolView?.interactSwimmer(data?.swimmerId, this.player);
      this.stay.recordSocial?.(`swimmer:${data?.swimmerId}`);
      if (res?.message) {
        this.message(res.message);
      }
    }
    this.messageUntil = performance.now() + 5000;
  }

  toggleEscalatorStop() {
    return this.escalators.toggleStop();
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

  interactCabin(action) {
    if (!this.active) return;
    this.stepInsideCabinIfInDoorway();
    if (action === 'cabinLight') {
      this.message(this.controller.cycleCabinLight().message);
    } else if (action === 'cabinFan') {
      this.message(this.controller.cycleCabinFan().message);
    } else if (action === 'cabinMusic') {
      this.message(this.controller.cycleCabinMusic().message);
    } else if (action === 'cabinIntercom') {
      this.message(this.controller.callIntercom().message);
    } else if (action === 'cabinAccessible') {
      this.message(this.controller.toggleAccessibleMode().message);
    } else if (action === 'cabinVip') {
      const vip = this.controller.toggleVipMode();
      this.message(
        vip
          ? '★ 엘리베이터 VIP 직통 운전 모드가 켜졌습니다. 내부 선택 층으로 논스톱 직행합니다.'
          : '☆ 엘리베이터 VIP 직통 운전 모드를 해제했습니다.'
      );
    } else if (action === 'cabinMirror') {
      const robeText = this.room.wearingRobe
        ? '구김 없는 순면 호텔 배스로브(가운) 차림이 아주 편안해 보입니다. 🥼'
        : '단정한 호텔 투어 복장이 엘리베이터 크리스탈 거울에 비칩니다. ✨';
      this.message(`🪞 엘리베이터 전면 거울을 바라보며 옷매무새를 정돈합니다. ${robeText}`);
    }
    this.messageUntil = performance.now() + 4500;
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
      case 'floorAmenity':
        return `✨ ${d.amenityName || '층별 컨시어지'} · 이용하기`;
      case 'roomDoor':
        return `301호 · ${
          this.room.target ? '문 닫기' : this.stay.canAccess('301') || p.zone === 'room' ? '문 열기' : '키카드 필요 (1F 체크인)'
        }`;
      case 'roomTV':
        return `스마트 TV (${this.room.tvMode.toUpperCase()}) · 채널/전원 전환`;
      case 'roomLight':
        return '객실 조명 · 분위기 전환';
      case 'roomCurtain':
        return `전동 커튼 · ${this.room.curtainTarget ? '닫기' : '열기'}`;
      case 'roomShower':
        return `레인 샤워기 · ${this.room.showerOn ? '잠그기' : '물 틀기'}`;
      case 'roomBed':
        return '킹사이즈 침대 · 휴식하기';
      case 'roomArmchair':
        return '라운지 암체어 · 시티뷰 감상 🪑';
      case 'roomDeskWork':
        return `워크 데스크 (${this.room.workLaptopOn ? '켜짐' : '대기'}) · 노트북 사용 💻`;
      case 'roomCoffee':
        return '에스프레소 머신 · 커피 추출 ☕';
      case 'roomMinibar':
        return `미니바 냉장고 · ${this.room.minibarTarget ? '문 닫기' : '음료 꺼내기 🥂'}`;
      case 'roomSafe':
        return `디지털 금고 · ${this.room.safeTarget ? '잠그기 🔒' : '열기 🔐'}`;
      case 'roomWardrobe':
        return `옷장 · ${this.room.wearingRobe ? '외출복 환복 👔' : '배스로브 착용 🥼'}`;
      case 'roomThermostat':
        return `온도조절기 (${this.room.acMode.temp}°C · ${this.room.acMode.mode}) 🌡️`;
      case 'roomAudio':
        return `블루투스 스피커 (${this.room.audioTrack.label}) 🎵`;
      case 'roomMirror':
        return `욕실 터치 거울 · 조명 ${this.room.mirrorLit ? '끄기' : '켜기'} 🪞`;
      case 'roomToilet':
        return '스마트 비데 · 물내림 & UV 살균 🚽';
      case 'roomPhone':
        return '컨시어지 직통 전화 · 서비스 요청 ☎️';
      case 'roomDiffuser':
        return `아로마 디퓨저 (${this.room.diffuserScent.label}) 🌿`;
      case 'roomSuitcase':
        return `여행용 캐리어 · ${this.room.suitcaseTarget ? '닫기' : '열기'} 🧳`;
      case 'roomPrivacy':
        return `객실 사인 (${this.room.privacyMode.label}) 전환 🔔`;
      case 'roomServiceOrder':
        return '컨시어지 태블릿 · 룸서비스 로봇 주문 🤖';
      case 'roomFood':
        return `룸서비스 (${this.room.foodItem}) · 식사하기 ☕🥐`;
      case 'poolSwim':
        return `인피니티 풀 · ${this.pool.inPool(p.x, p.z) ? '데크로 나오기' : '입수하기 🏊'}`;
      case 'poolJacuzzi':
        return `온수 자쿠지 · ${this.pool.inJacuzzi(p.x, p.z) ? '버블 전환' : '입수하기 ♨️'}`;
      case 'poolLight':
        return `풀 컨트롤 (${this.pool.lightMode.label}) · 조명/분수 전환 ✨`;
      case 'poolSunbed':
        return '선베드 / 카바나 · 휴식하기 🏖️';
      case 'poolBar':
        return '스카이 풀 바 · 칵테일/음료 주문 🍹';
      case 'poolTelescope':
        return `🔭 전망 망원경 · ${this.telescopeZoom ? '기본 시야 복귀' : '파노라마 줌 관측'}`;
      case 'poolSwimmer':
        return `${d.swimmerName} (${d.statusLabel || '수영 중'}) · 대화하기 🏊`;
      case 'cafeOrder':
        return this.holdingCoffee
          ? `☕ [${this.stay.lastCafeItem || '커피'}] 마시기`
          : `${d.cafeLabel || 'Grand Café'} · 커피 & 베이커리 주문 ☕`;
      case 'escalatorStop':
        return `🚨 비상정지 스위치 · ${this.escalators.stopped ? '재가동' : '정지'}`;
      case 'cafeSit':
        return `${d.cafeLabel || '카페 테이블'} · 착석하기 ☕`;
      case 'loungeSit':
        return `${d.loungeLabel || '라운지 소파'} · 휴식하기 🛋️`;
      case 'parkingCar':
        return `${d.carModel || '주차 차량'} (${d.bayLabel || '주차장'}) · 스마트키 확인 🚗`;
      case 'otherRoomDoor':
        return `${d.room}호 · ${this.stay.keycard ? '배정 객실: 3층 301호' : '1F 체크인 필요'}`;
      case 'staff':
        return `${d.staffName} · ${d.staffId.startsWith('reception-') ? '체크인' : '대화하기'}`;
      case 'npc':
        return `${d.npcName} (${this.npcs.statusLabel(this.npcs.getNPC(d.npcId) || {})}) · 대화하기`;
      case 'robot':
        return `${d.robotName} (${this.robot.statusLabel()}) · 상호작용`;
      case 'stairDoor':
        return `${FLOORS[d.floorIndex]}층 계단 문 · ${this.stairs.doors[d.floorIndex].target ? '닫기' : '열기'}`;
      case 'automaticDoor':
        return '자동 슬라이딩 도어 · 접근 시 자동 개폐 🚪';
      case 'hall':
        return `${FLOORS[d.floorIndex]}층 ${d.direction === 1 ? '▲ 상행' : '▼ 하행'} 호출`;
      case 'car':
        return `${d.accessible ? '♿ ' : ''}${FLOORS[d.floorIndex]}층 ${this.controller.car.has(d.floorIndex) ? '선택 취소' : '선택'}`;
      case 'tenKey': {
        const k = d.key;
        const desc =
          k === 'B'
            ? '지하(B1~B5) 접두키'
            : k === 'ENT'
              ? '입력 확정'
              : k === 'CLR'
                ? '초기화 / 호출 취소'
                : k === '0'
                  ? '10층 선택'
                  : k === '1'
                    ? '1층 (1→0: 10층)'
                    : `${k}층 선택/취소`;
        return `🔢 10키 [${k}] · ${desc}`;
      }
      case 'cabinAccessible':
        return `♿ 장애인 배려 모드 (${this.controller.accessibleMode ? '켜짐' : '꺼짐'})`;
      case 'cabinLight':
        return `💡 무드 조명 (${this.controller.cabinLightMode.label})`;
      case 'cabinFan':
        return `🌀 청정 환기 (${this.controller.cabinFanMode.label})`;
      case 'cabinMusic':
        return `🎵 라운지 오디오 (${this.controller.cabinMusicTrack.label})`;
      case 'cabinIntercom':
        return '🎙️ 컨시어지 인터폰 통화';
      case 'cabinVip':
        return `★ VIP 직통 운행 (${this.controller.vipMode ? '켜짐' : '꺼짐'})`;
      case 'cabinMirror':
        return '🪞 엘리베이터 거울 확인';
      default:
        return `${d.accessible ? '♿ ' : d.tenKey ? '🔢 ' : ''}${{ open: '문 열림', close: '문 닫힘', alarm: '비상 호출' }[d.action]}`;
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

    if ($('vip-tier-badge')) {
      $('vip-tier-badge').textContent = `${this.stay.vipTier.badge} · ${this.stay.points} PTS · ⚡${this.stay.energy}%`;
    }
    if ($('vip-quest-tracker')) {
      const qs = this.stay.getQuestStatus?.();
      if (qs) {
        $('vip-quest-tracker').textContent =
          qs.doneCount >= qs.totalCount
            ? `👑 전 퀘스트 마스터 달성! (${qs.doneCount}/${qs.totalCount})`
            : `🎯 미션 (${qs.doneCount}/${qs.totalCount}): ${qs.activeQuest?.title || ''}`;
      }
    }

    const now = performance.now();
    if (this.toastUntil && now >= this.toastUntil) {
      this.toastUntil = 0;
      if ($('game-toast')) $('game-toast').hidden = true;
    }

    if (now - (this.lastMinimapAt || 0) > 220) {
      this.lastMinimapAt = now;
      this.renderMinimap();
    }

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
    } else if (p.inDoorway()) {
      text = '출입문 감지선 · 안쪽이나 승강장으로 한 걸음 이동하세요';
    } else if (p.zone === 'cabin') {
      text =
        c.state === 'moving'
          ? `${FLOORS[c.target ?? c.floor]}층으로 이동 중`
          : '층 버튼 · 10키 패드 · 편의 버튼을 클릭하세요';
    } else if (p.zone === 'room') {
      text = '301호 스위트 · 객실 내 가구와 스마트 기기를 클릭해 이용하세요';
    } else if (p.zone === 'pool') {
      text = this.pool.inPool(p.x, p.z)
        ? '🏊 수영 중 · 사다리나 수면을 클릭하면 데크로 나옵니다'
        : '10F 루프탑 풀 & 스카이 바 · 시설을 클릭해 이용하세요';
    } else if (p.zone === 'escalator') {
      text = '에스컬레이터 자동 이동 중';
    } else if (p.zone === 'stairs') {
      text = '계단실 · WASD로 층간 이동';
    } else if (p.zone === 'ramp') {
      text = '차량 경사로 · WASD로 주차 층간 이동';
    } else {
      text = '대상을 바라보고 클릭 또는 [E] 키로 상호작용';
    }
    $('game-target').textContent = text;
  }

  renderMinimap() {
    const p = this.player;
    const c = this.controller;
    const f = p.zone === 'cabin' ? c.floor : p.floor;
    if ($('minimap-caption')) {
      $('minimap-caption').textContent = `${FLOORS[f]}F · ${floorUsage(f).ko} RADAR`;
    }
    const canvas = $('game-minimap');
    const ctx = canvas?.getContext?.('2d');
    if (!ctx?.fillRect || !ctx?.arc) return;

    const W = canvas.width || 144;
    const H = canvas.height || 144;
    ctx.clearRect?.(0, 0, W, H);
    ctx.fillStyle = '#0b141a';
    ctx.fillRect(0, 0, W, H);

    // Coordinate transform: world (x in [-14..12], z in [-2..28]) -> minimap pixels
    const mapX = (wx) => W / 2 - wx * 4.6;
    const mapZ = (wz) => 22 + wz * 3.8;

    // 1. Floor zone background
    ctx.strokeStyle = '#284556';
    ctx.lineWidth = 1.5;
    if (f === 5) {
      // 1F Grand Lobby
      ctx.fillStyle = '#142630';
      ctx.fillRect(mapX(11.6), mapZ(1.2), 23.2 * 4.6, 25 * 3.8);
      ctx.strokeRect(mapX(11.6), mapZ(1.2), 23.2 * 4.6, 25 * 3.8);
      // Reception & Grand Cafe
      ctx.fillStyle = '#2e4957';
      ctx.fillRect(mapX(-2.5), mapZ(20.8), 6.2 * 4.6, 1.2 * 3.8);
      ctx.fillStyle = '#3b5848';
      ctx.fillRect(mapX(9.2), mapZ(14.5), 4.0 * 4.6, 3.2 * 3.8);
    } else if (f === 14) {
      // 10F Rooftop Pool
      ctx.fillStyle = '#132836';
      ctx.fillRect(mapX(10.5), mapZ(1.2), 21 * 4.6, 24 * 3.8);
      ctx.fillStyle = '#1c5d78';
      ctx.fillRect(mapX(5.8), mapZ(14.2), 11.6 * 4.6, 8.2 * 3.8);
    } else if (f < 5) {
      // B5-B1 Parking
      ctx.fillStyle = '#161e24';
      ctx.fillRect(mapX(10.5), mapZ(1.2), 24 * 4.6, 26 * 3.8);
    } else {
      // Guest floor corridor
      ctx.fillStyle = '#162832';
      ctx.fillRect(mapX(2.45), mapZ(1.2), 4.9 * 4.6, 2.7 * 3.8);
      if (f === 7) {
        // Room 301
        ctx.fillStyle = '#1f3b34';
        ctx.fillRect(mapX(2.28), mapZ(4.05), 4.56 * 4.6, 9.6 * 3.8);
        ctx.strokeRect(mapX(2.28), mapZ(4.05), 4.56 * 4.6, 9.6 * 3.8);
      }
    }

    // 2. Elevator shaft & cabin
    ctx.fillStyle = c.floor === f ? '#d4b26f' : '#2a3e4a';
    ctx.fillRect(mapX(0.95), mapZ(-0.9), 1.9 * 4.6, 1.8 * 3.8);

    // 3. Escalator & Stairwell wings
    ctx.fillStyle = '#25424c';
    ctx.fillRect(mapX(-2.5), mapZ(0.2), 3.2 * 4.6, 2.8 * 3.8);
    ctx.fillRect(mapX(4.5), mapZ(-0.8), 2.1 * 4.6, 3.8 * 3.8);

    // 4. Floor Amenity Station marker
    const ax = f >= 6 && f <= 13 ? 0 : 2.18;
    const az = f >= 6 && f <= 13 ? 3.55 : 2.55;
    ctx.fillStyle = '#f5d076';
    ctx.beginPath();
    ctx.arc(mapX(ax), mapZ(az), 3, 0, Math.PI * 2);
    ctx.fill();

    // 5. NPCs on this floor
    for (const npc of this.npcs?.npcs ?? []) {
      const nf = npc.zone === 'cabin' ? c.floor : npc.floor;
      if (nf === f) {
        ctx.fillStyle = '#70d6ff';
        ctx.beginPath();
        ctx.arc(mapX(npc.x), mapZ(npc.z), 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. DELI Service Robot
    if (this.robot) {
      const rf = this.robot.zone === 'cabin' ? c.floor : this.robot.floor;
      if (rf === f) {
        ctx.fillStyle = '#7ef7e1';
        ctx.beginPath();
        ctx.arc(mapX(this.robot.x), mapZ(this.robot.z), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Player position & FOV cone
    const px = mapX(p.x);
    const pz = mapZ(p.z);
    const dirX = Math.sin(p.yaw);
    const dirZ = -Math.cos(p.yaw);
    const screenAngle = Math.atan2(dirZ * 3.8, -dirX * 4.6);

    ctx.fillStyle = 'rgba(118, 232, 199, 0.24)';
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.arc(px, pz, 16, screenAngle - 0.52, screenAngle + 0.52);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#56f0c8';
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}
