import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

export const TIME_OF_DAY_MODES = [
  {
    id: 'day',
    label: '☀️ 주간',
    sky: 0xb7cbd6,
    hemiSky: 0xe1efff,
    hemiGround: 0x3a4144,
    hemiIntensity: 1.4,
    keyColor: 0xffedcc,
    keyIntensity: 2.0,
    fillColor: 0xb4dbff,
    fillIntensity: 1.0,
    exposure: 1.05,
  },
  {
    id: 'sunset',
    label: '🌅 노을',
    sky: 0xd48c6f,
    hemiSky: 0xffcda2,
    hemiGround: 0x3b2b2d,
    hemiIntensity: 1.15,
    keyColor: 0xff934f,
    keyIntensity: 1.7,
    fillColor: 0xd499b9,
    fillIntensity: 0.85,
    exposure: 0.98,
  },
  {
    id: 'night',
    label: '🌙 야간',
    sky: 0x0d1824,
    hemiSky: 0x4f729c,
    hemiGround: 0x161f29,
    hemiIntensity: 0.72,
    keyColor: 0x82b0ff,
    keyIntensity: 0.65,
    fillColor: 0x416788,
    fillIntensity: 0.55,
    exposure: 0.9,
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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.03, 250);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x111b23, 0);

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
    this.scene.environmentIntensity = 1.2;

    this.hemiLight = new THREE.HemisphereLight(0xe1efff, 0x3a4144, 1.4);
    this.scene.add(this.hemiLight);
    this.keyLight = new THREE.DirectionalLight(0xffedcc, 2);
    this.keyLight.position.set(4, 10, 7);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xb4dbff, 1);
    this.fillLight.position.set(-5, 3, -5);
    this.scene.add(this.fillLight);

    this.cabinLight = new THREE.PointLight(0xffe8c5, 16, 5, 2);
    this.cabinLight.position.set(0, 2, 0);
    this.scene.add(this.cabinLight);

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
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25, Math.sqrt(2100000 / (r.width * r.height))));
    this.renderer.setSize(r.width, r.height, false);
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
            m.envMapIntensity = 1.1;
            if (m.name.includes('Rear mirror')) m.roughness = 0.12;
            if (m.emissiveIntensity > 1) m.emissiveIntensity = 1.1;
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
      this.hotelScene?.root,
      this.hotelScene?.exterior,
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
      (o) => this.isVisible(o) && (!this.game?.active || this.game.accepts(o.userData))
    );
    if (!candidates.length) return null;

    this.scene.updateMatrixWorld();
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
    const meshes = [...this.cachedStaticOcclusionMeshes];
    for (const root of [this.npcView?.root, this.robotView?.root]) {
      root?.traverseVisible((o) => {
        if (o.isMesh) meshes.push(o);
      });
    }

    const surfaces = this.ray.intersectObjects(meshes, false);
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
      } else if (floor === 14 && this.game?.pool) {
        const back = lobby.getObjectByName('Vestibule_back_wall');
        lobby.remove(back);
        for (const [x, width] of [
          [-1.77, 1.66],
          [1.77, 1.66],
        ]) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(width, 3.2, 0.12), wallMaterials.guest);
          m.position.set(x, 1.6, 3.68);
          lobby.add(m);
        }
        const header = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.85, 0.12), wallMaterials.guest);
        header.position.set(0, 2.775, 3.68);
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
    if (this.game?.escalators) this.escalatorView = new EscalatorView(this.scene);
    if (this.game?.world) this.hotelScene = new HotelScene(this.scene, this.game.world, this.pickables);
    if (this.game?.stairs) this.stairwellView = new StairwellView(this.scene, this.game.stairs, this.pickables);
    if (this.game?.npcs) this.npcView = new NPCView(this.scene, this.game.npcs, this.pickables);
    if (this.game?.robot) this.robotView = new ServiceRobotView(this.scene, this.game.robot, this.pickables);
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
  }

  buildAccessibleHorizontalCOP() {
    if (!this.car) return;
    // Right side wall when looking inside from the doorway is x = +0.878 (facing -X toward cabin center),
    // and we also mirror a companion unit on x = -0.878 so whichever side the passenger considers "right"
    // (standing inside facing the door vs facing into the cabin), the horizontal wheelchair COP is right there!
    this.accessibleToggleButtons = [];
    for (const side of [1, -1]) {
      const panelGroup = new THREE.Group();
      panelGroup.name = side === 1 ? 'Accessible_horizontal_COP_R' : 'Accessible_horizontal_COP_L';
      panelGroup.position.set(side * 0.874, 1.03, 0.04);
      panelGroup.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

      // Brushed stainless horizontal faceplate (wide horizontal format: 0.92m wide × 0.165m high)
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.165, 0.014),
        new THREE.MeshStandardMaterial({
          color: 0x2a3944,
          roughness: 0.26,
          metalness: 0.82,
        })
      );
      plate.name = `Accessible_COP_faceplate_${side > 0 ? 'R' : 'L'}`;
      panelGroup.add(plate);

      // Blue wheelchair accessibility emblem badge & braille header strip on the left of the horizontal panel
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 256;
      badgeCanvas.height = 256;
      const bctx = badgeCanvas.getContext('2d');
      if (bctx?.fillRect) {
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
      const badgeMat = new THREE.MeshStandardMaterial({
        map: bctx?.fillRect ? badgeTex : null,
        color: 0x1b75d0,
        emissive: 0x1b75d0,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      });
      const badgeBtn = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.115, 0.022), badgeMat);
      badgeBtn.name = `Accessible_mode_button_${side > 0 ? 'R' : 'L'}`;
      badgeBtn.position.set(-0.38, 0, 0.008);
      badgeBtn.userData = { action: 'cabinAccessible', dynamic: true };
      panelGroup.add(badgeBtn);
      this.pickables.push(badgeBtn);
      this.accessibleToggleButtons.push(badgeBtn);

      // 15 Horizontal Floor Buttons arranged in 2 accessible rows (Row 1: 1F~8F, Row 2: B5~B1 + 9F~10F)
      const topRowFloors = [5, 6, 7, 8, 9, 10, 11, 12]; // 1F .. 8F
      const bottomRowFloors = [0, 1, 2, 3, 4, 13, 14]; // B5 .. B1, 9F, 10F
      const btnGeo = new THREE.BoxGeometry(0.056, 0.046, 0.02);

      const addFloorBtn = (floorIndex, col, rowY) => {
        const x = -0.265 + col * 0.066;
        const btnMat = new THREE.MeshStandardMaterial({
          color: 0x8e9aa3,
          roughness: 0.32,
          metalness: 0.55,
        });
        const btn = new THREE.Mesh(btnGeo, btnMat);
        btn.name = `Accessible_Button_${FLOORS[floorIndex]}_${side > 0 ? 'R' : 'L'}`;
        btn.position.set(x, rowY, 0.008);
        btn.userData = {
          action: 'car',
          floorIndex,
          accessible: true,
          ownMaterial: true,
          dynamic: true,
        };
        panelGroup.add(btn);
        this.pickables.push(btn);

        // Tactile label face on each horizontal button
        const lblCanvas = document.createElement('canvas');
        lblCanvas.width = 96;
        lblCanvas.height = 80;
        const lctx = lblCanvas.getContext('2d');
        if (lctx?.fillRect) {
          lctx.fillStyle = '#18242c';
          lctx.fillRect(0, 0, 96, 80);
          lctx.strokeStyle = floorIndex === 5 ? '#56d8c4' : '#536878';
          lctx.lineWidth = 4;
          lctx.strokeRect(3, 3, 90, 74);
          lctx.fillStyle = floorIndex === 5 ? '#7ef7e1' : '#eef5f9';
          lctx.font = 'bold 34px sans-serif';
          lctx.textAlign = 'center';
          lctx.fillText(FLOORS[floorIndex], 48, 46);
          lctx.fillStyle = '#8fa6b5';
          lctx.font = '14px monospace';
          lctx.fillText('⠇⠋', 48, 68);
          const lTex = new THREE.CanvasTexture(lblCanvas);
          lTex.colorSpace = THREE.SRGBColorSpace;
          const cap = new THREE.Mesh(
            new THREE.PlaneGeometry(0.05, 0.04),
            new THREE.MeshBasicMaterial({ map: lTex })
          );
          cap.position.set(0, 0, 0.011);
          cap.userData = { action: 'car', floorIndex, accessible: true, dynamic: true };
          btn.add(cap);
          this.pickables.push(cap);
        }
      };

      topRowFloors.forEach((floorIndex, idx) => addFloorBtn(floorIndex, idx, 0.036));
      bottomRowFloors.forEach((floorIndex, idx) => addFloorBtn(floorIndex, idx, -0.036));

      // Right side of the horizontal panel: Open (◀▶), Close (▶◀), SOS (🔔), Intercom (🎙️)
      const auxSpecs = [
        { action: 'open', label: '◀│▶', sub: '열림연장', x: 0.305, y: 0.036, color: 0x26483f },
        { action: 'close', label: '▶│◀', sub: '닫힘', x: 0.385, y: 0.036, color: 0x293844 },
        { action: 'alarm', label: 'SOS', sub: '비상', x: 0.305, y: -0.036, color: 0xa83025 },
        { action: 'cabinIntercom', label: '🎙️', sub: '통화', x: 0.385, y: -0.036, color: 0x3b2c44 },
      ];
      for (const spec of auxSpecs) {
        const mat = new THREE.MeshStandardMaterial({
          color: spec.color,
          roughness: 0.32,
          metalness: 0.5,
        });
        const abtn = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.046, 0.02), mat);
        abtn.name = `Accessible_Aux_${spec.action}_${side > 0 ? 'R' : 'L'}`;
        abtn.position.set(spec.x, spec.y, 0.008);
        abtn.userData = { action: spec.action, accessible: true, ownMaterial: true, dynamic: true };
        panelGroup.add(abtn);
        this.pickables.push(abtn);
      }

      this.car.add(panelGroup);
    }
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
    this.guestRoomView?.setTimeOfDay?.(mode.id);
    if (this.ready) this.applyVisibility(c);
    return mode;
  }

  cycleTimeOfDay(c = null) {
    return this.setTimeOfDay((this.timeOfDayIndex ?? 0) + 1, c);
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
    this.hotelScene?.updateVisibility(floor, v === 'game', v === 'exterior');
    this.scene.background =
      v === 'exterior' || (v === 'game' && (floor === 5 || floor === 14)) ? new THREE.Color(tod.sky) : null;
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
    if (visibleFloor !== this.lastFloor) this.applyVisibility(c);

    this.guestRoomView?.update();
    this.rooftopPoolView?.update(c.time);
    this.escalatorView?.update(c.time, c.paused);
    this.stairwellView?.update();
    this.hotelScene?.update(c.time, this.game?.player);
    this.npcView?.update(c.time, visibleFloor, this.view);
    this.robotView?.update(c.time, visibleFloor, this.view);

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

    for (const o of this.doors) {
      const open =
        o.userData.simRole === 'carDoor' || (o.userData.floorIndex === c.floor && c.aligned()) ? c.door : 0;
      o.position.x = o.userData.side * (0.228 + 0.46 * open);
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

    const displayKey = `${c.floor}/${c.state}/${c.direction}/${c.alarm}/${c.vipMode}/${c.accessibleMode}/${c.target}/${c.cabinLightIndex}/${c.cabinFanIndex}/${c.cabinMusicIndex}/${Math.round(c.velocity * 10)}`;
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
    }

    for (const o of this.pickables) {
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
  }

  render() {
    if (this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
