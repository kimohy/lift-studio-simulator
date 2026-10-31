import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { floorUsage } from './building.js';
import { FLOORS } from './controller.js';
import { EscalatorView } from './escalator-view.js';
import { decorateFloor } from './floor-interiors.js';
import { GuestRoomView } from './guest-room-view.js';
import { HotelScene } from './hotel-scene.js';
import { NPCView } from './npc-view.js';
import { batchStaticMeshes } from './render-optimization.js';
import { RooftopPoolView } from './rooftop-pool-view.js';
import { ServiceRobotView } from './service-robot-view.js';
import { StairwellView } from './stairwell-view.js';
import { AutomaticDoorSystem } from './automatic-doors.js';

export const TIME_OF_DAY_MODES = [
  {
    id: 'day',
    label: '☀️ 주간',
    sky: 0x9ab0be,
    hemiSky: 0xd2e0eb,
    hemiGround: 0x2a3136,
    hemiIntensity: 0.78,
    keyColor: 0xffe6c2,
    keyIntensity: 1.05,
    fillColor: 0x9ec0de,
    fillIntensity: 0.45,
    exposure: 0.82,
    bloomStrength: 0.08,
  },
  {
    id: 'sunset',
    label: '🌅 노을',
    sky: 0xc27e63,
    hemiSky: 0xf0be95,
    hemiGround: 0x322527,
    hemiIntensity: 0.72,
    keyColor: 0xff934f,
    keyIntensity: 0.95,
    fillColor: 0xc48da9,
    fillIntensity: 0.42,
    exposure: 0.8,
    bloomStrength: 0.12,
  },
  {
    id: 'night',
    label: '🌙 야간',
    sky: 0x0d1824,
    hemiSky: 0x4f729c,
    hemiGround: 0x161f29,
    hemiIntensity: 0.52,
    keyColor: 0x82b0ff,
    keyIntensity: 0.48,
    fillColor: 0x416788,
    fillIntensity: 0.35,
    exposure: 0.78,
    bloomStrength: 0.16,
  },
];

export const WEATHER_MODES = [
  {
    id: 'clear',
    label: '✨ 맑음',
    desc: '청명한 스카이라인과 은은한 햇살 파티클이 감도는 쾌청한 날씨입니다.',
    particleColor: 0xffe9b5,
    particleSize: 0.14,
    particleOpacity: 0.45,
    fallSpeed: 0.25,
    swayAmp: 0.8,
  },
  {
    id: 'starlight',
    label: '🌌 별빛·오로라',
    desc: '루프탑과 통유리 외벽 너머로 반짝이는 별빛과 반딧불이 파티클이 유영합니다.',
    particleColor: 0x7ef7e1,
    particleSize: 0.22,
    particleOpacity: 0.88,
    fallSpeed: 0.18,
    swayAmp: 1.5,
  },
  {
    id: 'rain',
    label: '🌧️ 센티멘털 레인',
    desc: '촉촉한 빗방울이 루프탑 인피니티 풀과 호텔 광장 위로 감성적으로 내립니다.',
    particleColor: 0xa8d4ff,
    particleSize: 0.18,
    particleOpacity: 0.72,
    fallSpeed: 6.8,
    swayAmp: 0.15,
  },
  {
    id: 'blossom',
    label: '🌸 골든 페탈',
    desc: '황금빛과 핑크빛 꽃잎이 봄바람을 타고 호텔 테라스와 수영장 위로 흩날립니다.',
    particleColor: 0xffbfd6,
    particleSize: 0.24,
    particleOpacity: 0.85,
    fallSpeed: 0.95,
    swayAmp: 2.1,
  },
];

export class LiftScene {
  constructor(canvas, onAction) {
    this.canvas = canvas;
    this.onAction = onAction;
    this.view = 'lobby';
    this.ready = false;
    this.followY = 0;
    this.lastFloor = -1;
    this.timeOfDayIndex = 0;
    this.weatherIndex = 0;
    this.postProcessingEnabled = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 220);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.15));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.setClearColor(0x111b23, 0);
    this.renderer.shadowMap.enabled = false;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.maxDistance = 100;
    this.controls.minDistance = 0.4;
    this.controls.maxPolarAngle = Math.PI * 0.94;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(env, 0.04).texture;
    env.dispose();
    pmrem.dispose();
    this.scene.environmentIntensity = 0.55;

    this.hemiLight = new THREE.HemisphereLight(0xd2e0eb, 0x2a3136, 0.78);
    this.scene.add(this.hemiLight);
    this.keyLight = new THREE.DirectionalLight(0xffe6c2, 1.05);
    this.keyLight.position.set(12, 28, 18);
    this.keyLight.castShadow = false;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x9ec0de, 0.45);
    this.fillLight.position.set(-5, 3, -5);
    this.scene.add(this.fillLight);

    this.cabinLight = new THREE.PointLight(0xffe8c5, 9, 5, 2);
    this.cabinLight.position.set(0, 2, 0);
    this.scene.add(this.cabinLight);

    this.setupPostProcessing();
    this.buildViewmodel();
    this.setupWeatherParticles();

    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pickables = [];
    this.landings = [];
    this.doors = [];
    this.parts = [];
    this.ropes = [];
    this.cachedStaticOcclusionMeshes = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();

    let down = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        down = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' };
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || e.pointerId !== down.id) return;
      const maxMove = down.touch ? 18 : 6;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (e.button !== 0 || moved > maxMove || !this.ready) {
        return;
      }
      const r = canvas.getBoundingClientRect();
      const point =
        document.pointerLockElement === canvas
          ? { x: 0, y: 0 }
          : {
              x: ((e.clientX - r.left) / r.width) * 2 - 1,
              y: -((e.clientY - r.top) / r.height) * 2 + 1,
            };
      const hit = this.getInteraction(point, this.game?.active ? 2.5 : Infinity);
      if (hit) {
        this.onAction(hit.userData.action, hit.userData.floorIndex, hit.userData.direction, hit.userData);
      }
    });

    this.setView('lobby');
  }

  setupPostProcessing() {
    try {
      const w = this.canvas?.clientWidth || 800;
      const h = this.canvas?.clientHeight || 600;
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.2, 0.45, 0.84);
      this.composer.addPass(this.bloomPass);

      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
    } catch {
      this.composer = null;
      this.bloomPass = null;
    }
  }

  buildViewmodel() {
    if (!this.camera) return;
    this.viewmodelGroup = new THREE.Group();
    this.viewmodelGroup.name = 'First_person_viewmodel';
    this.viewmodelGroup.position.set(0.24, -0.2, -0.44);
    this.viewmodelGroup.visible = false;
    this.camera.add(this.viewmodelGroup);

    // 1. Specialty Coffee Cup viewmodel
    this.vmCoffee = new THREE.Group();
    this.vmCoffee.name = 'VM_coffee_cup';
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.45 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.78 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x20282c, roughness: 0.35 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4b272, metalness: 0.75, roughness: 0.25 });

    const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.027, 0.105, 18), cupMat);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0345, 0.031, 0.044, 18), sleeveMat);
    sleeve.position.y = -0.004;
    const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 18), goldMat);
    goldBand.position.y = 0.012;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.037, 0.014, 18), lidMat);
    lid.position.y = 0.056;
    this.vmCoffee.add(cupBody, sleeve, goldBand, lid);
    this.vmCoffee.rotation.set(0.15, -0.35, 0.08);
    this.viewmodelGroup.add(this.vmCoffee);

    // 2. VIP Keycard viewmodel
    this.vmKeycard = new THREE.Group();
    this.vmKeycard.name = 'VM_vip_keycard';
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x162d28,
      metalness: 0.45,
      roughness: 0.25,
      emissive: 0x0d241e,
      emissiveIntensity: 0.25,
    });
    const cardBody = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.054, 0.003), cardMat);
    const cardBorder = new THREE.Mesh(new THREE.BoxGeometry(0.089, 0.057, 0.002), goldMat);
    const cardChip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.011, 0.004), goldMat);
    cardChip.position.set(-0.024, 0.004, 0.001);
    this.vmKeycard.add(cardBorder, cardBody, cardChip);
    this.vmKeycard.rotation.set(0.28, -0.42, 0.12);
    this.viewmodelGroup.add(this.vmKeycard);
  }

  updateViewmodel(time = 0) {
    if (!this.viewmodelGroup) return;
    const game = this.game;
    if (!game?.active || this.view !== 'game' || game.telescopeZoom) {
      this.viewmodelGroup.visible = false;
      return;
    }

    const showCoffee = Boolean(game.holdingCoffee);
    const nearRoomDoor =
      game.player?.floor === 7 &&
      Math.hypot((game.player?.x ?? 0) - -1.38, (game.player?.z ?? 0) - 3.5) < 2.6;
    const showKeycard =
      !showCoffee &&
      Boolean(game.stay?.keycard) &&
      (nearRoomDoor || game.currentHit?.userData?.action === 'roomDoor' || game.currentHit?.userData?.action === 'cabinVip');

    if (!showCoffee && !showKeycard) {
      this.viewmodelGroup.visible = false;
      return;
    }

    this.viewmodelGroup.visible = true;
    this.vmCoffee.visible = showCoffee;
    this.vmKeycard.visible = showKeycard;

    const bobPhase = game.walkBobPhase || 0;
    const moveAmp = game.isMoving ? 1 : 0.18;
    const swayX = Math.cos(bobPhase * 0.5) * 0.008 * moveAmp;
    const swayY = Math.abs(Math.sin(bobPhase)) * 0.01 * moveAmp + Math.sin(time * 2.2) * 0.0025;
    this.viewmodelGroup.position.set(0.23 + swayX, -0.195 - swayY, -0.42);
  }

  setupWeatherParticles() {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = Math.random() * 44 - 2;
      positions[i * 3 + 2] = Math.random() * 34 - 2;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mode = WEATHER_MODES[0];
    this.weatherMaterial = new THREE.PointsMaterial({
      color: mode.particleColor,
      size: mode.particleSize,
      transparent: true,
      opacity: mode.particleOpacity,
      depthWrite: false,
    });
    this.weatherPoints = new THREE.Points(geo, this.weatherMaterial);
    this.weatherPoints.name = 'Weather_particles';
    this.weatherPoints.userData = { seeds, lastTime: 0 };
    this.scene.add(this.weatherPoints);
  }

  updateWeatherParticles(time = 0) {
    if (!this.weatherPoints || !this.weatherPoints.visible) return;
    const mode = this.weather;
    const fallOffset = (time * mode.fallSpeed) % 18;
    this.weatherPoints.position.y = -fallOffset;
    this.weatherPoints.position.x = Math.sin(time * 0.85) * (mode.swayAmp * 0.35);
  }

  isVisible(o) {
    while (o) {
      if (!o.visible) return false;
      o = o.parent;
    }
    return true;
  }

  updateCameraFOV() {
    const aspect = this.camera.aspect || 1.6;
    if (this.view === 'game') {
      const baseFov = 58;
      if (aspect > 1.8) {
        this.camera.fov = baseFov * Math.pow(1.8 / aspect, 0.45);
      } else if (aspect < 1.0) {
        this.camera.fov = Math.min(82, baseFov * Math.pow(1.0 / Math.max(0.45, aspect), 0.45));
      } else {
        this.camera.fov = baseFov;
      }
    } else if (this.view === 'cabin') {
      this.camera.fov = aspect < 1.0 ? Math.min(84, 66 * Math.pow(1.0 / Math.max(0.5, aspect), 0.35)) : 66;
    } else {
      this.camera.fov = aspect < 1.0 ? Math.min(64, 44 * Math.pow(1.0 / Math.max(0.5, aspect), 0.4)) : 44;
    }
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pr = Math.min(devicePixelRatio, 1.15, Math.sqrt(1550000 / (r.width * r.height)));
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(r.width, r.height, false);
    if (this.composer && this.postProcessingEnabled) {
      this.composer.setPixelRatio?.(pr);
      this.composer.setSize(r.width, r.height);
    }
    this.camera.aspect = r.width / r.height;
    this.updateCameraFOV();
  }

  async load() {
    const gltf = await new GLTFLoader().loadAsync('./assets/elevator.glb', (e) => {
      if (e.total) {
        document.querySelector('#loading-detail').textContent = `모델 연결 ${Math.round((e.loaded / e.total) * 100)}%`;
      }
    });
    this.model = gltf.scene;
    this.scene.add(this.model);

    this.model.traverse((o) => {
      const d = o.userData;
      const role = d.simRole;
      if (role === 'carRoot') this.car = o;
      if (role === 'weightRoot') this.weight = o;
      if (role === 'controllerRoot') this.cabinet = o;
      if (role === 'carDoor' || role === 'landingDoor') this.doors.push(o);
      const staticLandingDisplay = /^Landing[ _]display[ _]/.test(o.name);
      if ((role === 'landing' || role === 'landingDoor') && !staticLandingDisplay) {
        this.landings.push(o);
      }
      if (staticLandingDisplay) o.visible = false;
      if (role === 'shaft' || role === 'mechanism') this.parts.push(o);
      if (role === 'staticDisplay' || role === 'controllerStaticText' || role === 'controllerDisplay') {
        o.visible = false;
      }
      if (d.action) this.pickables.push(o);
      if (o.name.startsWith('Car_suspension_rope') || o.name.startsWith('Weight_suspension_rope')) {
        this.ropes.push({
          o,
          baseScale: o.scale.clone(),
          basePos: o.position.clone(),
          car: o.name.startsWith('Car_'),
        });
      }
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) {
          if (m.isMeshStandardMaterial) {
            m.envMapIntensity = 0.65;
            if (m.name.includes('Rear mirror')) m.roughness = 0.14;
            if (m.emissiveIntensity > 0.8) m.emissiveIntensity = 0.75;
          }
        }
      }
    });

    if (!this.car || !this.cabinet || this.doors.length !== 32) {
      throw new Error('필수 모델 구성이 누락되었습니다.');
    }

    this.carBase = this.car.position.clone();
    this.weightBase = this.weight.position.clone();
    this.makeDisplay();
    this.makeGameRoom();
    this.buttonPickables = this.pickables.filter(
      (o) => o.isMesh && o.material?.color && o.material?.emissive && ['car', 'hall', 'alarm'].includes(o.userData.action)
    );

    for (const s of this.hotelScene?.staff ?? []) s.root.userData.dynamic = true;
    for (const d of this.stairwellView?.doors ?? []) d.userData.dynamic = true;
    if (this.guestRoomView) this.guestRoomView.door.userData.dynamic = true;

    for (const root of [
      ...(this.hotelScene?.floors ?? []),
      this.hotelScene?.exterior,
      ...(this.gameRoom?.children ?? []),
      ...(this.stairwellView?.root.children ?? []),
      ...(this.escalatorView?.root.children ?? []),
      this.rooftopPoolView?.root,
      this.guestRoomView?.root,
      this.automaticDoors?.root,
    ]) {
      if (root) batchStaticMeshes(root);
    }

    this.ready = true;
    this.applyVisibility();
    const loadingEl = document.querySelector('#loading');
    if (loadingEl) {
      loadingEl.hidden = true;
      loadingEl.style.display = 'none';
    }
  }

  rebuildOcclusionCache() {
    const meshes = [];
    for (const root of [
      this.model,
      this.gameRoom,
      this.guestRoomView?.root,
      this.rooftopPoolView?.root,
      this.stairwellView?.root,
      this.escalatorView?.root,
      this.automaticDoors?.root,
      this.hotelScene?.root,
    ]) {
      root?.traverseVisible((o) => {
        if (o.isMesh) meshes.push(o);
      });
    }
    this.cachedStaticOcclusionMeshes = meshes;
  }

  getInteraction(ndc, maxDistance = Infinity) {
    if (!this.ready) return null;
    const candidates = this.pickables.filter(
      (o) => o.visible && this.isVisible(o) && (!this.game?.active || this.game.accepts(o.userData))
    );
    if (!candidates.length) return null;

    if (!this.renderer) this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(ndc, this.camera);
    this.ray.far = maxDistance;

    const actionable = this.ray.intersectObjects(candidates, true);
    if (!actionable.length) return null;

    // Limit occlusion raycast distance to the furthest actionable candidate for fast bounding-sphere culling.
    const maxHitDist = actionable[actionable.length - 1].distance + 0.05;
    this.ray.far = Math.min(maxDistance, maxHitDist);

    if (!this.cachedStaticOcclusionMeshes) {
      this.rebuildOcclusionCache();
    }
    const meshes = this.cachedStaticOcclusionMeshes;
    const dynamicMeshes = [];
    for (const root of [this.npcView?.root, this.robotView?.root]) {
      root?.traverseVisible((o) => {
        if (o.isMesh) dynamicMeshes.push(o);
      });
    }

    const surfaces = this.ray.intersectObjects(
      dynamicMeshes.length ? meshes.concat(dynamicMeshes) : meshes,
      false
    );
    const first = surfaces.find((h) => this.isVisible(h.object));
    if (!first) return null;

    const hit = actionable.find(
      (h) =>
        this.isVisible(h.object) &&
        h.distance <= first.distance + 0.02 &&
        (!this.game?.active || this.game.accepts(h.object.userData))
    );
    return hit?.object ?? null;
  }

  makeGameRoom() {
    const room = new THREE.Group();
    room.name = 'Walkable_lobby';
    this.gameRoom = new THREE.Group();
    this.gameRoom.name = 'Fixed_floor_lobbies';
    this.scene.add(this.gameRoom);

    const wall = new THREE.MeshStandardMaterial({ color: 0x344951, roughness: 0.85 });
    const ceiling = new THREE.MeshStandardMaterial({ color: 0xa7b1b3, roughness: 0.8 });
    const box = (size, pos, material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      m.position.set(...pos);
      room.add(m);
      return m;
    };

    box([0.12, 3.2, 0.77], [-2.54, 1.6, 1.415], wall);
    box([0.12, 3.2, 0.83], [-2.54, 1.6, 3.315], wall);
    box([0.12, 0.9, 1.1], [-2.54, 2.75, 2.35], wall);
    box([0.12, 3.2, 0.77], [2.54, 1.6, 1.415], wall);
    box([0.12, 3.2, 0.83], [2.54, 1.6, 3.315], wall);
    box([0.12, 0.9, 1.1], [2.54, 2.75, 2.35], wall);
    box([5.2, 3.2, 0.12], [0, 1.6, 3.68], wall).name = 'Vestibule_back_wall';
    box([5.2, 0.12, 2.7], [0, 3.16, 2.38], ceiling);
    box([1.3, 0.025, 0.32], [0, 3.087, 2.3], new THREE.MeshBasicMaterial({ color: 0xffefd9 }));

    // Fixed geometry at each landing, sharing meshes/materials. No travelling room or light.
    const wallColors = { parking: 0x89918e, lobby: 0xc2b69d, guest: 0x8a8172 };
    const wallMaterials = Object.fromEntries(
      Object.entries(wallColors).map(([kind, color]) => [
        kind,
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
      ])
    );

    for (let floor = 0; floor < FLOORS.length; floor++) {
      const lobby = room.clone();
      lobby.position.y = (floor - 5) * 3.5;
      lobby.userData.floorIndex = floor;
      lobby.traverse((o) => {
        if (o.isMesh && o.material === wall) {
          o.material = wallMaterials[floorUsage(floor).kind];
        }
      });
      const expanded = !!this.game?.world && floor <= 5;
      if (floor === 7) {
        const back = lobby.getObjectByName('Vestibule_back_wall');
        lobby.remove(back);
        for (const [x, width] of [
          [-2.255, 0.69],
          [0.875, 3.45],
        ]) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(width, 3.2, 0.12), wallMaterials.guest);
          m.position.set(x, 1.6, 3.68);
          lobby.add(m);
        }
        const header = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.0, 0.12), wallMaterials.guest);
        header.position.set(-1.38, 2.7, 3.68);
        lobby.add(header);
      } else if (floor === 14) {
        const back = lobby.getObjectByName('Vestibule_back_wall');
        lobby.remove(back);
        for (const x of [-2.42, 2.42]) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 0.12), wallMaterials.guest);
          m.position.set(x, 1.6, 3.68);
          lobby.add(m);
        }
        const header = new THREE.Mesh(new THREE.BoxGeometry(5.08, 0.48, 0.12), wallMaterials.guest);
        header.position.set(0, 2.96, 3.68);
        lobby.add(header);
      }
      if (expanded) {
        const back = lobby.getObjectByName('Vestibule_back_wall');
        lobby.remove(back);
      }
      decorateFloor(lobby, floor, { expanded, pickables: this.pickables });
      this.gameRoom.add(lobby);
    }

    this.gameRoom.visible = false;
    if (this.game?.room) this.guestRoomView = new GuestRoomView(this.scene, this.game.room, this.pickables);
    if (this.game?.pool) this.rooftopPoolView = new RooftopPoolView(this.scene, this.game.pool, this.pickables);
    if (this.game?.escalators) this.escalatorView = new EscalatorView(this.scene, this.pickables);
    if (this.game?.world) this.hotelScene = new HotelScene(this.scene, this.game.world, this.pickables);
    if (this.game?.stairs) this.stairwellView = new StairwellView(this.scene, this.game.stairs, this.pickables);
    if (this.game?.npcs) this.npcView = new NPCView(this.scene, this.game.npcs, this.pickables);
    if (this.game?.robot) this.robotView = new ServiceRobotView(this.scene, this.game.robot, this.pickables);
    this.automaticDoors = new AutomaticDoorSystem(this.scene, this.sfx, this.pickables);
  }

  makeDisplay() {
    this.lcd = document.createElement('canvas');
    this.lcd.width = 768;
    this.lcd.height = 180;
    this.lcdctx = this.lcd.getContext('2d');
    this.lcdtex = new THREE.CanvasTexture(this.lcd);
    this.lcdtex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.15),
      new THREE.MeshBasicMaterial({ map: this.lcdtex })
    );
    screen.position.set(0, 0.94, 0.074);
    this.cabinet.add(screen);

    this.floorCanvas = document.createElement('canvas');
    this.floorCanvas.width = 512;
    this.floorCanvas.height = 128;
    this.floorCtx = this.floorCanvas.getContext('2d');
    this.floorTex = new THREE.CanvasTexture(this.floorCanvas);
    this.floorTex.colorSpace = THREE.SRGBColorSpace;
    const floorScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.39, 0.1),
      new THREE.MeshBasicMaterial({ map: this.floorTex })
    );
    floorScreen.position.set(0, 2.27, 0.771);
    floorScreen.rotation.y = Math.PI;
    this.car.add(floorScreen);

    // Every landing shows the same live car position and travel direction.
    const landingMaterial = new THREE.MeshBasicMaterial({ map: this.floorTex });
    for (const indicator of [...this.landings]) {
      if (!/^Landing[ _]indicator[ _]/.test(indicator.name)) continue;
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.1), landingMaterial);
      display.name = `Live_landing_display_${indicator.userData.floorIndex}`;
      display.userData = { simRole: 'landing', floorIndex: indicator.userData.floorIndex };
      display.position.copy(indicator.position);
      display.position.z += 0.023;
      indicator.parent.add(display);
      this.landings.push(display);
    }

    this.decorateCabinAmenities();
  }

  decorateCabinAmenities() {
    if (!this.car) return;
    this.pickables ??= [];
    this.cabinLeds = [];
    this.car.traverse((o) => {
      if (o.isMesh && o.name.startsWith('Linear_ceiling_LED')) {
        o.material = o.material.clone();
        this.cabinLeds.push(o);
      }
      if (o.isMesh && o.name === 'Rear_mirror') {
        o.userData = { ...o.userData, action: 'cabinMirror', dynamic: true };
        if (!this.pickables.includes(o)) this.pickables.push(o);
      }
    });

    // 1. COP Smart Touch Infotainment Display (above floor buttons on the right COP panel)
    this.copInfoCanvas = document.createElement('canvas');
    this.copInfoCanvas.width = 384;
    this.copInfoCanvas.height = 192;
    this.copInfoCtx = this.copInfoCanvas.getContext('2d');
    this.copInfoTex = new THREE.CanvasTexture(this.copInfoCanvas);
    this.copInfoTex.colorSpace = THREE.SRGBColorSpace;
    if (this.copInfoCtx?.fillRect) {
      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.135, 0.014),
        new THREE.MeshStandardMaterial({ color: 0x162129, roughness: 0.25, metalness: 0.8 })
      );
      bezel.position.set(0.69, 1.615, 0.774);
      this.car.add(bezel);

      const infoScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.23, 0.115),
        new THREE.MeshBasicMaterial({ map: this.copInfoTex })
      );
      infoScreen.name = 'Cabin_COP_info_screen';
      infoScreen.position.set(0.69, 1.615, 0.766);
      infoScreen.rotation.y = Math.PI;
      infoScreen.userData = { action: 'cabinMusic', dynamic: true };
      this.car.add(infoScreen);
      this.pickables.push(infoScreen);
    }

    // 2. 3D COP Smart Amenity Buttons (Light, Fan, Music, Intercom, VIP)
    this.cabinAmenityButtons = {};
    const btnSpecs = [
      { action: 'cabinLight', x: 0.79, y: 0.565, color: 0x2c3c48, glow: 0xffd27d },
      { action: 'cabinFan', x: 0.69, y: 0.565, color: 0x2c3c48, glow: 0x6ae8d4 },
      { action: 'cabinMusic', x: 0.59, y: 0.565, color: 0x2c3c48, glow: 0xb998ff },
      { action: 'cabinIntercom', x: 0.74, y: 0.48, color: 0x3a2a2e, glow: 0xff7b6b },
      { action: 'cabinVip', x: 0.64, y: 0.48, color: 0x3b3322, glow: 0xf5c869 },
    ];
    const btnGeo = new THREE.BoxGeometry(0.068, 0.048, 0.018);
    for (const spec of btnSpecs) {
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.3,
        metalness: 0.65,
        emissive: spec.glow,
        emissiveIntensity: 0.2,
      });
      const btn = new THREE.Mesh(btnGeo, mat);
      btn.name = `Cabin_button_${spec.action}`;
      btn.position.set(spec.x, spec.y, 0.765);
      btn.userData = { action: spec.action, glowColor: spec.glow, dynamic: true };
      this.car.add(btn);
      this.pickables.push(btn);
      this.cabinAmenityButtons[spec.action] = btn;
    }

    // 3. Ceiling HEPA Air Purifier Diffuser & Rotating Turbine Ring
    const diffuserRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.22, 0.018, 24),
      new THREE.MeshStandardMaterial({
        color: 0x22303a,
        roughness: 0.3,
        metalness: 0.75,
      })
    );
    diffuserRing.name = 'Cabin_ceiling_purifier';
    diffuserRing.position.set(0, 2.362, -0.59);
    diffuserRing.userData = { action: 'cabinFan', dynamic: true };
    this.car.add(diffuserRing);
    this.pickables.push(diffuserRing);

    this.cabinFanRotor = new THREE.Group();
    this.cabinFanRotor.position.set(0, 2.352, -0.59);
    const bladeGeo = new THREE.BoxGeometry(0.32, 0.006, 0.032);
    this.cabinFanLedMat = new THREE.MeshStandardMaterial({
      color: 0x8deee0,
      emissive: 0x56d8c4,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(bladeGeo, this.cabinFanLedMat);
      blade.rotation.y = (i * Math.PI) / 3;
      this.cabinFanRotor.add(blade);
    }
    this.car.add(this.cabinFanRotor);

    // 4. Right Side Wall Horizontal Accessible COP (장애인용 가로형 조작반, 휠체어 눈높이 y ≈ 0.92m)
    this.buildAccessibleHorizontalCOP();

    // 4-B. Opposite Front Wall 10-Key Keypad COP (엘리베이터 버튼 반대편 10키 디지털 조작반, x = -0.69)
    this.buildTenKeyCOP();

    // 5. Multi-beam Infrared Safety Curtain Sensor Strips on Door Jambs
    this.safetySensorMat = new THREE.MeshStandardMaterial({
      color: 0x33ee66,
      emissive: 0x22cc55,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const stripGeo = new THREE.BoxGeometry(0.014, 2.08, 0.016);
    this.safetyStrips = [];
    for (const sx of [-0.485, 0.485]) {
      const strip = new THREE.Mesh(stripGeo, this.safetySensorMat);
      strip.name = `Cabin_safety_strip_${sx < 0 ? 'L' : 'R'}`;
      strip.position.set(sx, 1.1, 0.69);
      this.car.add(strip);
      this.safetyStrips.push(strip);
    }
  }

  buildAccessibleHorizontalCOP() {
    if (!this.car) return;
    // Mounted on the +x side wall: the passenger's right-hand side when walking in through the door (facing -z).
    // y = 1.08 keeps the panel bottom (~1.0m) clear of the side handrail (top 0.92m).
    this.accessibleToggleButtons = [];
    const panelGroup = new THREE.Group();
    panelGroup.name = 'Accessible_horizontal_COP_R';
    panelGroup.position.set(0.866, 1.08, 0.04);
    panelGroup.rotation.y = -Math.PI / 2;

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.165, 0.014),
      new THREE.MeshStandardMaterial({ color: 0x2a3944, roughness: 0.26, metalness: 0.82 })
    );
    plate.name = 'Accessible_COP_faceplate_R';
    panelGroup.add(plate);

    // Wheelchair emblem toggle button
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 256;
    const bctx = badgeCanvas.getContext('2d');
    const canDraw = Boolean(bctx?.fillRect);
    if (canDraw) {
      bctx.fillStyle = '#0d5cab';
      bctx.fillRect(0, 0, 256, 256);
      bctx.strokeStyle = '#8fd4ff';
      bctx.lineWidth = 10;
      bctx.strokeRect(10, 10, 236, 236);
      bctx.fillStyle = '#ffffff';
      bctx.font = 'bold 118px sans-serif';
      bctx.textAlign = 'center';
      bctx.fillText('♿', 128, 148);
      bctx.font = 'bold 28px sans-serif';
      bctx.fillText('장애인용 · 연장', 128, 212);
    }
    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    const badgeBtn = new THREE.Mesh(
      new THREE.BoxGeometry(0.105, 0.115, 0.022),
      new THREE.MeshStandardMaterial({
        map: canDraw ? badgeTex : null,
        color: 0x1b75d0,
        emissive: 0x1b75d0,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      })
    );
    badgeBtn.name = 'Accessible_mode_button_R';
    badgeBtn.position.set(-0.38, 0, 0.008);
    badgeBtn.userData = { action: 'cabinAccessible', dynamic: true };
    panelGroup.add(badgeBtn);
    this.pickables.push(badgeBtn);
    this.accessibleToggleButtons.push(badgeBtn);

    // Floor buttons: row 0 = 1F..8F, row 1 = B5..B1, 9F, 10F. One shared 8×2 label atlas.
    const rows = [
      [5, 6, 7, 8, 9, 10, 11, 12],
      [0, 1, 2, 3, 4, 13, 14],
    ];
    const CW = 96;
    const CH = 80;
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = CW * 8;
    atlasCanvas.height = CH * 2;
    const actx = atlasCanvas.getContext('2d');
    if (canDraw && actx?.fillRect) {
      rows.forEach((row, r) =>
        row.forEach((floorIndex, col) => {
          const ox = col * CW;
          const oy = r * CH;
          actx.fillStyle = '#18242c';
          actx.fillRect(ox, oy, CW, CH);
          actx.strokeStyle = floorIndex === 5 ? '#56d8c4' : '#536878';
          actx.lineWidth = 4;
          actx.strokeRect(ox + 3, oy + 3, CW - 6, CH - 6);
          actx.fillStyle = floorIndex === 5 ? '#7ef7e1' : '#eef5f9';
          actx.font = 'bold 34px sans-serif';
          actx.textAlign = 'center';
          actx.fillText(FLOORS[floorIndex], ox + CW / 2, oy + 46);
          actx.fillStyle = '#8fa6b5';
          actx.font = '14px monospace';
          actx.fillText('⠇⠋', ox + CW / 2, oy + 68);
        })
      );
    }
    const atlasTex = new THREE.CanvasTexture(atlasCanvas);
    atlasTex.colorSpace = THREE.SRGBColorSpace;
    const capMat = new THREE.MeshBasicMaterial({ map: atlasTex });
    const btnGeo = new THREE.BoxGeometry(0.056, 0.046, 0.02);

    rows.forEach((row, r) =>
      row.forEach((floorIndex, col) => {
        const btn = new THREE.Mesh(
          btnGeo,
          new THREE.MeshStandardMaterial({ color: 0x8e9aa3, roughness: 0.32, metalness: 0.55 })
        );
        btn.name = `Accessible_Button_${FLOORS[floorIndex]}_R`;
        btn.position.set(-0.265 + col * 0.066, r === 0 ? 0.036 : -0.036, 0.008);
        btn.userData = { action: 'car', floorIndex, accessible: true, ownMaterial: true, dynamic: true };
        panelGroup.add(btn);
        this.pickables.push(btn);

        if (canDraw) {
          const capGeo = new THREE.PlaneGeometry(0.05, 0.04);
          const uv = capGeo.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            uv.setXY(i, (col + uv.getX(i)) / 8, 1 - (r + 1 - uv.getY(i)) / 2);
          }
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.set(0, 0, 0.011);
          // Not added to pickables: the recursive raycast on `btn` already reaches it.
          cap.userData = { action: 'car', floorIndex, accessible: true, dynamic: true };
          btn.add(cap);
        }
      })
    );

    const auxSpecs = [
      { action: 'open', x: 0.305, y: 0.036, color: 0x26483f },
      { action: 'close', x: 0.385, y: 0.036, color: 0x293844 },
      { action: 'alarm', x: 0.305, y: -0.036, color: 0xa83025 },
      { action: 'cabinIntercom', x: 0.385, y: -0.036, color: 0x3b2c44 },
    ];
    for (const spec of auxSpecs) {
      const abtn = new THREE.Mesh(
        new THREE.BoxGeometry(0.068, 0.046, 0.02),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.32, metalness: 0.5 })
      );
      abtn.name = `Accessible_Aux_${spec.action}_R`;
      abtn.position.set(spec.x, spec.y, 0.008);
      abtn.userData = { action: spec.action, accessible: true, ownMaterial: true, dynamic: true };
      panelGroup.add(abtn);
      this.pickables.push(abtn);
    }

    this.car.add(panelGroup);
  }

  buildTenKeyCOP() {
    if (!this.car) return;
    // Mounted on the front return wall opposite the main COP button column (x = -0.69 vs +0.69, facing -z).
    this.tenKeyButtons = [];
    const panelGroup = new THREE.Group();
    panelGroup.name = 'TenKey_COP_L';
    panelGroup.position.set(-0.69, 1.16, 0.766);
    panelGroup.rotation.y = Math.PI;

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.255, 0.54, 0.014),
      new THREE.MeshStandardMaterial({ color: 0x1d2830, roughness: 0.25, metalness: 0.85 })
    );
    plate.name = 'TenKey_COP_faceplate_L';
    panelGroup.add(plate);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.263, 0.548, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xc8a968, roughness: 0.3, metalness: 0.75 })
    );
    trim.position.z = -0.002;
    panelGroup.add(trim);

    // Digital status screen at top of 10-key panel
    this.tenKeyCanvas = document.createElement('canvas');
    this.tenKeyCanvas.width = 256;
    this.tenKeyCanvas.height = 112;
    this.tenKeyCtx = this.tenKeyCanvas.getContext('2d');
    const canDraw = Boolean(this.tenKeyCtx?.fillRect);
    this.tenKeyTex = new THREE.CanvasTexture(this.tenKeyCanvas);
    this.tenKeyTex.colorSpace = THREE.SRGBColorSpace;
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.215, 0.094),
      new THREE.MeshBasicMaterial({ map: canDraw ? this.tenKeyTex : null, color: canDraw ? 0xffffff : 0x102822 })
    );
    screenMesh.name = 'TenKey_COP_screen_L';
    screenMesh.position.set(0, 0.185, 0.009);
    panelGroup.add(screenMesh);

    // 4×3 keypad grid: [1, 2, 3], [4, 5, 6], [7, 8, 9], [B, 0, ENT]
    const keyRows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['B', '0', 'ENT'],
    ];
    const KW = 96;
    const KH = 84;
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = KW * 3;
    atlasCanvas.height = KH * 4;
    const kctx = atlasCanvas.getContext('2d');
    if (canDraw && kctx?.fillRect) {
      keyRows.forEach((row, r) =>
        row.forEach((key, col) => {
          const ox = col * KW;
          const oy = r * KH;
          kctx.fillStyle = key === 'B' ? '#243442' : key === 'ENT' ? '#1c3b33' : '#18222a';
          kctx.fillRect(ox, oy, KW, KH);
          kctx.strokeStyle = key === 'ENT' ? '#56d8c4' : key === 'B' ? '#e5c478' : '#536878';
          kctx.lineWidth = 4;
          kctx.strokeRect(ox + 3, oy + 3, KW - 6, KH - 6);
          kctx.fillStyle = key === 'ENT' ? '#7ef7e1' : key === 'B' ? '#f5d488' : '#f2f7fa';
          kctx.font = key === 'ENT' ? 'bold 28px sans-serif' : 'bold 36px sans-serif';
          kctx.textAlign = 'center';
          kctx.fillText(key === 'ENT' ? '↵ 확인' : key, ox + KW / 2, oy + 48);
          kctx.fillStyle = '#8fa6b5';
          kctx.font = '13px sans-serif';
          const sub =
            key === 'B' ? '지하 B1~5' : key === '0' ? '10F (1→0)' : key === 'ENT' ? 'ENTER' : `${key}층`;
          kctx.fillText(sub, ox + KW / 2, oy + 70);
        })
      );
    }
    const keyAtlasTex = new THREE.CanvasTexture(atlasCanvas);
    keyAtlasTex.colorSpace = THREE.SRGBColorSpace;
    const keyCapMat = new THREE.MeshBasicMaterial({ map: keyAtlasTex });
    const keyGeo = new THREE.BoxGeometry(0.064, 0.052, 0.02);

    keyRows.forEach((row, r) =>
      row.forEach((key, col) => {
        const btn = new THREE.Mesh(
          keyGeo,
          new THREE.MeshStandardMaterial({ color: 0x8e9aa3, roughness: 0.3, metalness: 0.58 })
        );
        btn.name = `TenKey_Button_${key}_L`;
        btn.position.set((col - 1) * 0.074, 0.092 - r * 0.068, 0.009);
        btn.userData = { action: 'tenKey', key, tenKey: true, ownMaterial: true, dynamic: true };
        panelGroup.add(btn);
        this.pickables.push(btn);
        this.tenKeyButtons.push(btn);

        if (canDraw) {
          const capGeo = new THREE.PlaneGeometry(0.058, 0.046);
          const uv = capGeo.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            uv.setXY(i, (col + uv.getX(i)) / 3, 1 - (r + 1 - uv.getY(i)) / 4);
          }
          const cap = new THREE.Mesh(capGeo, keyCapMat);
          cap.position.set(0, 0, 0.011);
          cap.userData = { action: 'tenKey', key, tenKey: true, dynamic: true };
          btn.add(cap);
        }
      })
    );

    // Bottom utility row: CLR (취소), OPEN (문열림), CLOSE (문닫힘)
    const utilSpecs = [
      { name: 'CLR', action: 'tenKey', key: 'CLR', x: -0.074, color: 0x5c2c2c },
      { name: 'OPEN', action: 'open', key: 'OPEN', x: 0, color: 0x26483f },
      { name: 'CLOSE', action: 'close', key: 'CLOSE', x: 0.074, color: 0x293844 },
    ];
    for (const spec of utilSpecs) {
      const ubtn = new THREE.Mesh(
        new THREE.BoxGeometry(0.064, 0.042, 0.018),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.32, metalness: 0.5 })
      );
      ubtn.name = `TenKey_Aux_${spec.name}_L`;
      ubtn.position.set(spec.x, -0.198, 0.009);
      ubtn.userData = {
        action: spec.action,
        key: spec.key,
        tenKey: true,
        ownMaterial: true,
        dynamic: true,
      };
      panelGroup.add(ubtn);
      this.pickables.push(ubtn);
    }

    this.car.add(panelGroup);
  }

  setView(view, c) {
    this.view = view;
    const y = c ? c.position - 17.5 : 0;
    this.followY = y;
    this.controls.enabled = view !== 'game';
    this.updateCameraFOV();
    if (view === 'game') {
      if (this.ready) this.applyVisibility(c);
      return;
    }
    this.controls.minDistance = view === 'cabin' ? 0.12 : 0.4;
    this.controls.maxDistance = view === 'shaft' || view === 'exterior' ? 110 : 15;

    const presets = {
      exterior: { p: [44, 24, 64], t: [3, 15, 16] },
      lobby: { p: [3.1, 2.7, 6.8], t: [0, 1.18, 0.5] },
      cabin: { p: [-0.52, 1.62, -0.62], t: [0.26, 1.3, 0.79] },
      shaft: { p: [38, 19, 68], t: [0, 8.5, 0] },
      controller: { p: [5.2, 1.8, 3.4], t: [3.46, 0.97, 0] },
    };
    const v = presets[view];
    this.camera.position.fromArray(v.p);
    this.controls.target.fromArray(v.t);
    if (view === 'lobby' || view === 'cabin') {
      this.camera.position.y += y;
      this.controls.target.y += y;
    }
    this.controls.update();
    if (this.ready) this.applyVisibility(c);
  }

  get timeOfDay() {
    return TIME_OF_DAY_MODES[this.timeOfDayIndex ?? 0] || TIME_OF_DAY_MODES[0];
  }

  setTimeOfDay(idOrIndex, c = null) {
    const idx =
      typeof idOrIndex === 'number'
        ? ((idOrIndex % TIME_OF_DAY_MODES.length) + TIME_OF_DAY_MODES.length) % TIME_OF_DAY_MODES.length
        : TIME_OF_DAY_MODES.findIndex((m) => m.id === idOrIndex);
    if (idx < 0) return this.timeOfDay;
    this.timeOfDayIndex = idx;
    const mode = this.timeOfDay;
    if (this.hemiLight) {
      this.hemiLight.color.setHex(mode.hemiSky);
      this.hemiLight.groundColor.setHex(mode.hemiGround);
      this.hemiLight.intensity = mode.hemiIntensity;
    }
    if (this.keyLight) {
      this.keyLight.color.setHex(mode.keyColor);
      this.keyLight.intensity = mode.keyIntensity;
    }
    if (this.fillLight) {
      this.fillLight.color.setHex(mode.fillColor);
      this.fillLight.intensity = mode.fillIntensity;
    }
    if (this.renderer) {
      this.renderer.toneMappingExposure = mode.exposure;
    }
    if (this.bloomPass) {
      this.bloomPass.strength = mode.bloomStrength ?? 0.24;
    }
    this.guestRoomView?.setTimeOfDay?.(mode.id);
    if (this.ready) this.applyVisibility(c);
    return mode;
  }

  cycleTimeOfDay(c = null) {
    return this.setTimeOfDay((this.timeOfDayIndex ?? 0) + 1, c);
  }

  get weather() {
    return WEATHER_MODES[this.weatherIndex ?? 0] || WEATHER_MODES[0];
  }

  setWeather(idOrIndex, c = null) {
    const idx =
      typeof idOrIndex === 'number'
        ? ((idOrIndex % WEATHER_MODES.length) + WEATHER_MODES.length) % WEATHER_MODES.length
        : WEATHER_MODES.findIndex((m) => m.id === idOrIndex);
    if (idx < 0) return this.weather;
    this.weatherIndex = idx;
    const mode = this.weather;
    if (this.weatherMaterial) {
      this.weatherMaterial.color.setHex(mode.particleColor);
      this.weatherMaterial.size = mode.particleSize;
      this.weatherMaterial.opacity = mode.particleOpacity;
    }
    if (this.ready) this.applyVisibility(c);
    return mode;
  }

  cycleWeather(c = null) {
    return this.setWeather((this.weatherIndex ?? 0) + 1, c);
  }

  applyVisibility(c) {
    if (!this.ready) return;
    const floor = this.game?.active ? this.game.player.floor : (c?.floor ?? 5);
    const v = this.view;
    const tod = this.timeOfDay;
    this.guestRoomView?.updateVisibility(floor, v === 'game');
    this.rooftopPoolView?.updateVisibility(floor, v === 'game', v === 'exterior' || v === 'shaft');
    this.escalatorView?.updateVisibility(floor, v === 'game');
    this.stairwellView?.updateVisibility(floor, v === 'game');
    this.hotelScene?.updateVisibility(floor, v === 'game', v === 'exterior', this.game?.player);
    this.automaticDoors?.applyVisibility(floor, this.game?.player?.floor);
    this.scene.background =
      v === 'exterior' || (v === 'game' && (floor === 5 || floor === 7 || floor === 14))
        ? new THREE.Color(tod.sky)
        : null;
    if (this.weatherPoints) {
      this.weatherPoints.visible =
        v === 'exterior' ||
        v === 'shaft' ||
        (v === 'game' && (floor === 14 || (this.weather.id !== 'clear' && (floor === 5 || floor === 7))));
    }
    this.scene.fog = v === 'exterior' ? new THREE.Fog(tod.sky, 90, 190) : null;
    if (this.gameRoom) {
      this.gameRoom.visible = v === 'game';
      for (const room of this.gameRoom.children) {
        room.visible = Math.abs(room.userData.floorIndex - floor) <= 1;
      }
    }
    this.car.visible = v !== 'controller';
    this.cabinet.visible = v === 'controller';
    this.weight.visible = v === 'shaft';
    for (const o of this.parts) {
      let underCar = false;
      for (let p = o.parent; p; p = p.parent) {
        if (p === this.car) underCar = true;
      }
      o.visible = underCar ? v !== 'controller' : v === 'shaft';
    }
    for (const o of this.landings) {
      o.visible = v === 'shaft' || ((v === 'lobby' || v === 'game') && Math.abs(o.userData.floorIndex - floor) <= 1);
    }
    // The full shaft view removes solid facade panels so cabin travel is inspectable.
    if (v === 'shaft') {
      for (const o of this.landings) {
        if (/Landing_wall|Landing_header/.test(o.name)) o.visible = false;
      }
    }
    this.lastFloor = floor;
    this.rebuildOcclusionCache();
  }

  update(c) {
    if (!this.ready) return;
    const visibleFloor = this.game?.active ? this.game.player.floor : c.floor;
    const inMainLobby =
      this.view === 'game' &&
      visibleFloor === 5 &&
      this.game?.player?.zone === 'lobby' &&
      (this.game?.player?.x ?? 0) < 10.5 &&
      (this.game?.player?.z ?? 12) < 25;
    if (visibleFloor !== this.lastFloor || inMainLobby !== this.lastInMainLobby) {
      this.lastInMainLobby = inMainLobby;
      this.applyVisibility(c);
    }

    this.guestRoomView?.update();
    this.rooftopPoolView?.update(c.time);
    this.escalatorView?.update(c.time, c.paused, this.game?.escalators?.stopped);
    this.stairwellView?.update();
    this.hotelScene?.update(c.time, this.game?.player);
    this.npcView?.update(c.time, visibleFloor, this.view);
    this.robotView?.update(c.time, visibleFloor, this.view);
    this.automaticDoors?.update(0.016, this.game?.player);

    const y = c.position - 17.5;
    this.car.position.y = this.carBase.y + y;
    this.weight.position.y = this.weightBase.y - y;
    this.cabinLight.position.y = y + 2.1;

    const lightMode = c.cabinLightMode;
    if (lightMode && this.lastCabinLightId !== lightMode.id) {
      this.lastCabinLightId = lightMode.id;
      this.cabinLight.color.setHex(lightMode.color);
      this.cabinLight.intensity = lightMode.intensity;
      for (const led of this.cabinLeds ?? []) {
        led.material.color?.setHex(lightMode.led);
        led.material.emissive?.setHex(lightMode.led);
      }
    }

    const fanMode = c.cabinFanMode;
    if (this.cabinFanRotor && fanMode) {
      if (!c.paused && fanMode.speed > 0) {
        this.cabinFanRotor.rotation.y += 0.06 * fanMode.speed;
      }
      if (this.cabinFanLedMat) {
        this.cabinFanLedMat.emissiveIntensity = fanMode.speed > 0 ? 0.65 : 0.08;
      }
    }

    if (this.cabinAmenityButtons) {
      const states = {
        cabinLight: c.cabinLightIndex > 0,
        cabinFan: (c.cabinFanMode?.speed ?? 1) > 0,
        cabinMusic: Boolean(c.cabinMusicTrack?.playing),
        cabinIntercom: c.time < (c.intercomActiveUntil || 0),
        cabinVip: Boolean(c.vipMode),
      };
      for (const [key, btn] of Object.entries(this.cabinAmenityButtons)) {
        const on = Boolean(states[key]);
        btn.material.emissiveIntensity = on ? 0.55 : 0.12;
      }
    }

    if (this.accessibleToggleButtons) {
      for (const btn of this.accessibleToggleButtons) {
        btn.material.emissiveIntensity = c.accessibleMode ? 0.75 : 0.22;
      }
    }

    // Multi-beam optical safety curtain sensor indicator
    if (this.safetySensorMat) {
      const obstructed = c.obstruction || Boolean(this.game?.player?.inDoorway?.());
      if (obstructed) {
        const pulse = 0.5 + Math.sin((c.time || 0) * 14) * 0.5;
        this.safetySensorMat.color.setHex(0xff3322);
        this.safetySensorMat.emissive.setHex(0xdd1100);
        this.safetySensorMat.emissiveIntensity = 0.4 + pulse * 1.2;
      } else {
        this.safetySensorMat.color.setHex(0x33ee66);
        this.safetySensorMat.emissive.setHex(0x22cc55);
        this.safetySensorMat.emissiveIntensity = 0.4;
      }
    }

    for (const o of this.doors) {
      const open =
        o.userData.simRole === 'carDoor' || (o.userData.floorIndex === c.floor && c.aligned()) ? c.door : 0;
      o.position.x = o.userData.side * (0.228 + 0.46 * open);
    }

    // Door mechanical movement and latch sound triggers
    if (this.sfx) {
      if (c.state !== this.lastDoorState) {
        if (c.state === 'opening' || c.state === 'closing') {
          this.sfx.playDoorMove();
        }
        this.lastDoorState = c.state;
      }
      if (c.door === 0 && (this.lastDoorPos ?? 0) > 0.01) {
        this.sfx.playDoorLatch();
      } else if (c.door >= 0.99 && (this.lastDoorPos ?? 0) < 0.98) {
        this.sfx.playDoorLatch();
      }
      this.lastDoorPos = c.door;
    }

    for (const r of this.ropes) {
      const len = r.car ? 32.05 - y : 19.15 + y;
      const bottom = r.car ? 2.85 + y : 15.75 - y;
      r.o.position.y = (34.9 + bottom) / 2;
      r.o.scale.y = (r.baseScale.y * len) / (r.car ? 32.05 : 19.15);
    }

    if (this.view === 'lobby' || this.view === 'cabin') {
      const d = y - this.followY;
      this.camera.position.y += d;
      this.controls.target.y += d;
      this.followY = y;
    }

    const displayKey = `${c.floor}/${c.state}/${c.direction}/${c.alarm}/${c.vipMode}/${c.accessibleMode}/${c.target}/${c.cabinLightIndex}/${c.cabinFanIndex}/${c.cabinMusicIndex}/${c.tenKeyBuffer}/${c.tenKeyDisplay}/${Math.round(c.velocity * 10)}`;
    if (displayKey !== this.displayKey) {
      this.displayKey = displayKey;
      const ctx = this.lcdctx;
      ctx.fillStyle = '#071f19';
      ctx.fillRect(0, 0, 768, 180);
      ctx.fillStyle = c.alarm ? '#ff9d81' : '#aaffdc';
      ctx.font = 'bold 64px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${FLOORS[c.floor]}F  ${c.alarm ? 'ALARM' : c.vipMode ? 'VIP EXPRESS' : c.accessibleMode ? '♿ ACCESSIBLE' : c.state.toUpperCase()}`,
        24,
        76
      );
      ctx.font = '34px monospace';
      ctx.fillStyle = '#7fae9c';
      ctx.fillText(`V ${Math.abs(c.velocity).toFixed(2)} m/s   ${c.door === 0 ? 'LOCKED' : 'DOOR OPEN'}`, 24, 141);
      this.lcdtex.needsUpdate = true;

      const f = this.floorCtx;
      f.fillStyle = '#081816';
      f.fillRect(0, 0, 512, 128);
      f.fillStyle = c.vipMode ? '#f7d27c' : '#baf5e0';
      f.font = 'bold 74px monospace';
      f.textAlign = 'center';
      const arrow = c.direction === 1 ? '↑' : c.direction === -1 ? '↓' : '–';
      const targetStr = c.target !== null && c.target !== c.floor ? ` ▸${FLOORS[c.target]}` : c.vipMode ? ' ★' : c.accessibleMode ? ' ♿' : '';
      f.fillText(`${FLOORS[c.floor]} ${arrow}${targetStr}`, 256, 91);
      this.floorTex.needsUpdate = true;

      if (this.copInfoCtx?.fillRect) {
        const ic = this.copInfoCtx;
        ic.fillStyle = '#09161d';
        ic.fillRect(0, 0, 384, 192);
        ic.strokeStyle = '#2e5563';
        ic.lineWidth = 4;
        ic.strokeRect(4, 4, 376, 184);
        ic.fillStyle = '#8deee0';
        ic.font = 'bold 26px sans-serif';
        ic.textAlign = 'left';
        ic.fillText(`GRAND HOTEL · ${FLOORS[c.floor]}F${c.accessibleMode ? ' ♿' : ''}`, 20, 42);
        ic.fillStyle = '#e5f2ee';
        ic.font = '21px sans-serif';
        ic.fillText(`💡 ${c.cabinLightMode?.label || ''}`, 20, 84);
        ic.fillText(`🌀 ${c.cabinFanMode?.label || ''}`, 20, 120);
        ic.fillStyle = '#f3ce95';
        ic.fillText(`🎵 ${c.cabinMusicTrack?.label || ''}`, 20, 158);
        this.copInfoTex.needsUpdate = true;
      }

      if (this.tenKeyCtx?.fillRect) {
        const tk = this.tenKeyCtx;
        tk.fillStyle = '#08151b';
        tk.fillRect(0, 0, 256, 112);
        tk.strokeStyle = '#c8a968';
        tk.lineWidth = 3;
        tk.strokeRect(3, 3, 250, 106);
        tk.fillStyle = '#f0d28c';
        tk.font = 'bold 15px sans-serif';
        tk.textAlign = 'left';
        tk.fillText('10-KEY CONTROL PAD', 14, 24);
        tk.fillStyle = c.tenKeyBuffer ? '#ffdf7e' : '#7ef7e1';
        tk.font = 'bold 34px monospace';
        tk.textAlign = 'center';
        const readout = c.tenKeyBuffer
          ? `입력: ${c.tenKeyBuffer}_`
          : c.tenKeyDisplay && c.tenKeyDisplay !== 'READY'
            ? c.tenKeyDisplay
            : `${FLOORS[c.floor]}F READY`;
        tk.fillText(readout, 128, 66);
        tk.fillStyle = '#92aebc';
        tk.font = '13px sans-serif';
        tk.fillText('B+1~5 지하 · 1~9층 · 1+0=10층', 128, 94);
        this.tenKeyTex.needsUpdate = true;
      }
    }

    for (const btn of this.tenKeyButtons ?? []) {
      const k = btn.userData.key;
      const lit =
        (k === 'B' && c.tenKeyBuffer === 'B') ||
        (k === '1' && (c.tenKeyBuffer === '1' || c.car.has(5))) ||
        (k === '0' && c.car.has(14)) ||
        (/^[2-9]$/.test(k) && c.car.has(Number(k) + 4));
      if (btn.userData.lastLit !== lit && btn.material?.emissive) {
        btn.userData.lastLit = lit;
        btn.material.color.setHex(lit ? 0xe6b36b : 0x8e9aa3);
        btn.material.emissive.setHex(lit ? 0xffb04d : 0x000000);
        btn.material.emissiveIntensity = lit ? 0.45 : 0;
      }
    }

    for (const o of this.buttonPickables ?? this.pickables) {
      const action = o.userData.action;
      if (!o.isMesh || !o.material?.color || !o.material?.emissive || !['car', 'hall', 'alarm'].includes(action)) {
        continue;
      }
      const selected =
        action === 'car'
          ? c.car.has(o.userData.floorIndex)
          : action === 'hall'
            ? (o.userData.direction === 1 ? c.up : c.down).has(o.userData.floorIndex)
            : c.alarm;
      if (o.userData.lastSelected === selected) continue;
      o.userData.lastSelected = selected;
      if (!o.userData.ownMaterial) {
        o.material = o.material.clone();
        o.userData.ownMaterial = true;
      }
      o.material.color.setHex(
        action === 'car' ? (selected ? 0xe6b36b : 0x8e9aa3) : action === 'hall' ? 0x243440 : 0xa83025
      );
      o.material.emissive.setHex(selected ? (action === 'hall' ? 0x76cfbf : 0xffb04d) : 0x000000);
      o.material.emissiveIntensity = selected ? 0.45 : 0;
    }

    this.updateViewmodel(c.time);
    this.updateWeatherParticles(c.time);
  }

  render() {
    if (this.controls.enabled) this.controls.update();
    if (this.postProcessingEnabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
