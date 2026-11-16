import * as THREE from 'three';
import { FLOORS, PITCH } from './controller.js';
import { MALL_LIFT_X, MALL_LIFT_Z, MALL_MAX_FLOOR } from './hotel-world.js';
import { hotelSignTexture } from './hotel-sign.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const unitSphere = new THREE.SphereGeometry(1, 12, 10);
const up = new THREE.Vector3(0, 1, 0);

function safeCanvasTexture(width, height, draw) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext?.('2d');
  if (ctx && typeof ctx.fillRect === 'function') {
    draw(ctx, width, height, canvas);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return { tex, canvas, ctx };
}

export class MallScene {
  constructor(scene, world, pickables) {
    this.world = world;
    this.pickables = pickables;

    this.root = new THREE.Group();
    this.root.name = 'Grand_Atrium_Mall';
    scene.add(this.root);

    this.exterior = new THREE.Group();
    this.exterior.name = 'Mall_exterior';
    scene.add(this.exterior);

    this.elevatorGroup = new THREE.Group();
    this.elevatorGroup.name = 'Mall_panoramic_elevator';
    scene.add(this.elevatorGroup);

    this.floors = [];
    this.signs = [];
    this.dmxStrips = [];
    this.waterfallSheets = [];
    this.entranceDoors = [];
    this.mallLandingDoors = Array.from({ length: MALL_MAX_FLOOR + 1 }, () => null);
    this.mallLandingDisplays = Array.from({ length: MALL_MAX_FLOOR + 1 }, () => null);
    this.mallHallButtons = [];
    this.mallCarButtons = [];
    this.mallButtonLights = new Map();
    this.mallStaff = [];
    this.mallCars = [];
    this.ropeMeshes = [];

    const mat = (color, roughness = 0.68, metalness = 0.05) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    this.m = {
      terrazzo: mat(0xe6dfd3, 0.36, 0.06),
      travertine: mat(0xd5c9b8, 0.55, 0.04),
      warmWood: mat(0x7c5438, 0.52, 0.04),
      darkOak: mat(0x4b3324, 0.58, 0.04),
      champagne: mat(0xc4ab82, 0.32, 0.78),
      charcoal: mat(0x283038, 0.44, 0.65),
      steel: mat(0x93a0aa, 0.3, 0.8),
      vermilion: mat(0xc93b2b, 0.45, 0.32),
      concrete: mat(0x7d8487, 0.9, 0.02),
      asphalt: mat(0x343d3e, 0.94, 0.02),
      white: mat(0xf2efe9, 0.65, 0.04),
      turf: mat(0x447548, 0.92, 0.0),
      leaf: mat(0x36643c, 0.88, 0.0),
      moss: mat(0x52824c, 0.94, 0.0),
      bookColors: [mat(0xb8493c, 0.72), mat(0x2f5e78, 0.72), mat(0xd39e48, 0.7), mat(0x467359, 0.72)],
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xa5cad2,
        metalness: 0.14,
        roughness: 0.08,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      skylightGlass: new THREE.MeshPhysicalMaterial({
        color: 0xdaf1f7,
        metalness: 0.08,
        roughness: 0.06,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      water: new THREE.MeshPhysicalMaterial({
        color: 0x6ac7db,
        metalness: 0.12,
        roughness: 0.08,
        transparent: true,
        opacity: 0.66,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      warmLed: new THREE.MeshStandardMaterial({
        color: 0xf7dca9,
        emissive: 0xe6ad5c,
        emissiveIntensity: 0.46,
      }),
      cyanLed: new THREE.MeshStandardMaterial({
        color: 0x89f2e6,
        emissive: 0x39c9bb,
        emissiveIntensity: 0.55,
      }),
      yellow: new THREE.MeshBasicMaterial({ color: 0xe8cb61 }),
      black: mat(0x1c2226, 0.85, 0.1),
    };

    for (let f = 0; f <= MALL_MAX_FLOOR; f++) {
      const g = new THREE.Group();
      g.name = f < 5 ? `Mall_parking_${FLOORS[f]}` : `Mall_${FLOORS[f]}F`;
      g.userData.floorIndex = f;
      g.position.y = (f - 5) * PITCH;
      this.root.add(g);
      this.floors.push(g);

      this.buildEscalatorLink(g, f);
      if (f < 5) this.buildParking(g, f);
      else if (f === 5) this.buildAtrium1F(g);
      else if (f < MALL_MAX_FLOOR) this.buildGalleryFloor(g, f);
      else this.buildSoundsForest6F(g);
    }

    this.buildAtriumLibrarySpine();
    this.buildWaterfallTower();
    this.buildExterior();
    this.buildPanoramicElevator();

    this.root.visible = false;
    this.exterior.visible = false;
    this.elevatorGroup.visible = false;
  }

  box(group, name, size, pos, material, solidFloor = null, action = null) {
    const m = new THREE.Mesh(unitBox, material);
    m.name = name;
    m.scale.set(...size);
    m.position.set(...pos);
    if (action) this.markInteractive(m, action);
    group.add(m);
    if (solidFloor !== null) {
      this.world.addObstacle(
        solidFloor,
        pos[0] - size[0] / 2,
        pos[0] + size[0] / 2,
        pos[2] - size[2] / 2,
        pos[2] + size[2] / 2
      );
    }
    return m;
  }

  cyl(group, name, rTop, rBot, h, pos, material, solidFloor = null, action = null) {
    const m = new THREE.Mesh(unitCyl, material);
    m.name = name;
    m.scale.set((rTop + rBot) * 0.5, h, (rTop + rBot) * 0.5);
    m.position.set(...pos);
    if (action) this.markInteractive(m, action);
    group.add(m);
    if (solidFloor !== null) {
      const r = Math.max(rTop, rBot);
      this.world.addObstacle(solidFloor, pos[0] - r, pos[0] + r, pos[2] - r, pos[2] + r);
    }
    return m;
  }

  sph(group, name, r, pos, material, scale = [1, 1, 1], action = null) {
    const m = new THREE.Mesh(unitSphere, material);
    m.name = name;
    m.scale.set(r * scale[0], r * scale[1], r * scale[2]);
    m.position.set(...pos);
    if (action) this.markInteractive(m, action);
    group.add(m);
    return m;
  }

  rail(group, a, b, material, radius = 0.03) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    if (len < 1e-4) return null;
    const m = new THREE.Mesh(unitCyl, material);
    m.name = 'Mall_structural_member';
    m.scale.set(radius, len, radius);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, dir.normalize());
    group.add(m);
    return m;
  }

  sign(group, name, lines, pos, size = [3.2, 0.55], rotY = 0) {
    const tex = hotelSignTexture(lines, { width: 640, height: 180 });
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x3b2d18,
      emissiveMap: tex,
      emissiveIntensity: 0.3,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), mat);
    m.name = name;
    m.position.set(...pos);
    m.rotation.y = rotY;
    group.add(m);
    this.signs.push(m);
    return m;
  }

  markInteractive(mesh, info) {
    const data = typeof info === 'string' ? { action: info } : info;
    Object.assign(mesh.userData, data);
    if (this.pickables && !this.pickables.includes(mesh)) {
      this.pickables.push(mesh);
    }
    return mesh;
  }

  buildEscalatorLink(g, f) {
    const isParking = f < 5;
    const floorMat = isParking ? this.m.concrete : this.m.terrazzo;
    const trimMat = isParking ? this.m.charcoal : this.m.champagne;
    this.box(g, 'Mall_escalator_bridge_floor', [3.7, 0.16, 2.5], [-12.6, -0.08, 6.4], floorMat);
    this.box(g, 'Mall_escalator_bridge_ceiling', [3.7, 0.14, 2.5], [-12.6, 3.36, 6.4], floorMat);
    this.box(g, 'Mall_bridge_glass_front', [3.5, 2.6, 0.06], [-12.6, 1.35, 5.18], this.m.glass);
    this.box(g, 'Mall_bridge_glass_back', [3.5, 2.6, 0.06], [-12.6, 1.35, 7.62], this.m.glass);
    this.box(g, 'Mall_bridge_led_soffit', [3.4, 0.04, 0.12], [-12.6, 3.24, 6.4], this.m.warmLed);
    this.box(g, 'Mall_bridge_frame_front', [3.6, 0.12, 0.14], [-12.6, 2.7, 5.18], trimMat);
    this.box(g, 'Mall_bridge_frame_back', [3.6, 0.12, 0.14], [-12.6, 2.7, 7.62], trimMat);
    this.sign(
      g,
      `Mall_link_sign_${FLOORS[f]}`,
      [`${FLOORS[f]}F · 그랜드 몰 연결 브리지`, 'MALL ATRIUM  ↔  HOTEL ESCALATOR'],
      [-14.1, 2.75, 6.4],
      [2.1, 0.44],
      Math.PI / 2
    );
  }

  car(group, x, z, color, f) {
    const c = new THREE.Group();
    c.name = 'Mall_parked_car';
    c.position.set(x, 0, z);
    c.rotation.y = Math.PI / 2;
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 });
    const body = new THREE.Mesh(unitBox, bodyMat);
    body.scale.set(1.75, 0.56, 4.15);
    body.position.set(0, 0.5, 0);
    body.userData = { action: 'car', mall: true, floorIndex: f };
    if (this.pickables) this.pickables.push(body);
    c.add(body);

    const cabin = new THREE.Mesh(unitBox, this.m.glass);
    cabin.scale.set(1.48, 0.5, 2.15);
    cabin.position.set(0, 1.0, -0.1);
    cabin.userData = { action: 'car', mall: true, floorIndex: f };
    if (this.pickables) this.pickables.push(cabin);
    c.add(cabin);

    for (const [wx, wz] of [
      [-0.86, 1.25],
      [0.86, 1.25],
      [-0.86, -1.25],
      [0.86, -1.25],
    ]) {
      const wheel = new THREE.Mesh(unitCyl, this.m.black);
      wheel.rotation.z = Math.PI / 2;
      wheel.scale.set(0.32, 0.22, 0.32);
      wheel.position.set(wx, 0.32, wz);
      c.add(wheel);
    }
    group.add(c);
    this.mallCars.push(c);
    this.world.addObstacle(f, x - 2.15, x + 2.15, z - 0.92, z + 0.92);
  }

  buildParking(g, f) {
    const m = this.m;
    this.box(g, 'Mall_garage_floor', [36, 0.18, 32], [-32, -0.09, 20], m.concrete);
    this.box(g, 'Mall_garage_ceiling', [36, 0.16, 32], [-32, 3.34, 20], m.concrete);
    // Outer Perimeter Walls (West x=-50, North z=4, South z=36)
    this.box(g, 'Mall_garage_west_wall', [0.22, 3.4, 32], [-50, 1.7, 20], m.concrete);
    this.box(g, 'Mall_garage_north_wall', [36, 3.4, 0.2], [-32, 1.7, 4], m.concrete);
    this.box(g, 'Mall_garage_south_wall', [36, 3.4, 0.2], [-32, 1.7, 36], m.concrete);

    // East wall segments along x = -14.1 leaving escalator link (z=5.2..7.6) & 2 parking portals open
    for (const [z, d] of [
      [4.6, 1.2],
      [11.05, 6.9],
      [18.25, 1.9],
      [30.7, 10.6],
    ]) {
      this.box(g, 'Mall_garage_east_wall', [0.2, 3.4, d], [-14.1, 1.7, z], m.concrete);
    }
    // Glowing portal arches connecting to Hotel Parking
    for (const [z, d] of [
      [15.9, 2.8],
      [22.3, 6.2],
    ]) {
      this.box(g, 'Mall_hotel_portal_arch', [0.3, 0.14, d], [-14.1, 2.68, z], m.cyanLed);
    }

    // Drive aisle & stall lines
    this.box(g, 'Mall_garage_drive_aisle', [34, 0.012, 4.4], [-32, 0.014, 16.0], m.asphalt);
    this.box(g, 'Mall_garage_drive_aisle_2', [34, 0.012, 4.4], [-32, 0.014, 22.3], m.asphalt);
    for (let x = -46; x <= -16; x += 4) {
      this.box(g, 'Mall_aisle_dash', [2.0, 0.009, 0.09], [x, 0.025, 16.0], m.yellow);
      this.box(g, 'Mall_aisle_dash_2', [2.0, 0.009, 0.09], [x, 0.025, 22.3], m.yellow);
    }
    for (let x = -47.5; x <= -17.5; x += 3) {
      this.box(g, 'Mall_stall_mark', [0.06, 0.008, 4.5], [x, 0.02, 29.0], m.white);
      this.box(g, 'Mall_stall_mark_n', [0.06, 0.008, 4.2], [x, 0.02, 11.2], m.white);
    }

    // Structural columns
    for (const x of [-43, -34, -22, -16.5]) {
      for (const z of [13.5, 25.5, 34.0]) {
        this.box(g, 'Mall_column', [0.56, 3.3, 0.56], [x, 1.65, z], m.concrete, f);
        this.box(g, 'Mall_col_band', [0.6, 0.45, 0.6], [x, 0.4, z], m.yellow);
      }
    }

    // EV Supercharger Zone along west side
    for (const z of [11.5, 29.0]) {
      const evBox = this.box(
        g,
        'Mall_EV_supercharger',
        [0.55, 1.65, 0.45],
        [-48.8, 0.85, z],
        m.white,
        f,
        { action: 'mallParking', floorIndex: f, label: `${FLOORS[f]} EV 초급속 충전소` }
      );
      evBox.userData.ev = true;
      this.box(g, 'Mall_EV_glow', [0.12, 1.3, 0.48], [-48.55, 0.9, z], m.cyanLed);
    }

    const palette = [0xe9ecef, 0x1d4d5e, 0x3b4d40, 0x8e3b36, 0x262d33, 0xd4a44e];
    for (const [i, [x, z]] of [
      [-45.0, 29.0],
      [-39.0, 29.0],
      [-30.5, 29.0],
      [-24.5, 29.0],
      [-41.5, 11.2],
      [-20.5, 11.2],
    ].entries()) {
      this.car(g, x, z, palette[(i + f) % palette.length], f);
    }

    // Ceiling LED lights
    for (const z of [10, 16, 22.3, 30]) {
      for (const x of [-42, -28, -18]) {
        this.box(g, 'Mall_garage_LED', [3.2, 0.05, 0.16], [x, 3.22, z], m.warmLed);
      }
    }

    this.sign(
      g,
      `Mall_parking_hotel_sign_${f}`,
      [`${FLOORS[f]} · 호텔 지하주차장 연결통로 →`, 'HOTEL PARKING & SHUTTLE LINK'],
      [-14.3, 2.85, 22.3],
      [3.6, 0.58],
      -Math.PI / 2
    );
    this.sign(
      g,
      `Mall_parking_lift_sign_${f}`,
      [`${FLOORS[f]} · 몰 전망 엘리베이터`, 'MALL PANORAMIC ELEVATOR ↑'],
      [MALL_LIFT_X, 2.72, MALL_LIFT_Z + 2.3],
      [3.2, 0.56],
      0
    );
  }

  buildAtrium1F(g) {
    const m = this.m;
    // Main grand terrazzo floorplate
    this.box(g, 'Mall_1F_floor', [36, 0.18, 32], [-32, -0.09, 20], m.terrazzo);
    // Warm architectural perimeter walls
    this.box(g, 'Mall_1F_north_wall', [36, 3.5, 0.24], [-32, 1.75, 4], m.travertine);
    this.box(g, 'Mall_1F_west_wall', [0.24, 3.5, 32], [-50, 1.75, 20], m.travertine);
    // East wall leaving escalator link (z=5.2..7.6) open
    this.box(g, 'Mall_1F_east_wall_n', [0.24, 3.5, 1.2], [-14.1, 1.75, 4.6], m.travertine);
    this.box(g, 'Mall_1F_east_wall_s', [0.24, 3.5, 28.4], [-14.1, 1.75, 21.8], m.travertine);

    // 1F Ceiling Ring around Central Atrium Void (x ∈ [-41, -21], z ∈ [12, 28])
    this.box(g, 'Mall_1F_ceiling_N', [36, 0.18, 8], [-32, 3.41, 8], m.white);
    this.box(g, 'Mall_1F_ceiling_S', [36, 0.18, 8], [-32, 3.41, 32], m.white);
    this.box(g, 'Mall_1F_ceiling_W', [9, 0.18, 16], [-45.5, 3.41, 20], m.white);
    this.box(g, 'Mall_1F_ceiling_E', [7, 0.18, 16], [-17.5, 3.41, 20], m.white);

    // Reflecting Pool & Spectator Steps under the 12m Waterfall Garden (South-East Quadrant)
    this.box(
      g,
      'Mall_waterfall_pool_rim',
      [8.2, 0.28, 4.2],
      [-18.8, 0.14, 31.2],
      m.travertine,
      5,
      { action: 'mallWaterfall', label: '12m 워터폴 가든 & 미디어 폭포' }
    );
    const poolWater = this.box(g, 'Mall_waterfall_pool', [7.6, 0.12, 3.6], [-18.8, 0.24, 31.2], m.water);
    poolWater.userData.dynamic = true;
    // Wooden amphitheater seating steps facing the waterfall
    for (let s = 0; s < 3; s++) {
      this.box(
        g,
        `Mall_waterfall_step_${s}`,
        [5.6, 0.28 * (s + 1), 0.7],
        [-24.2, 0.14 * (s + 1), 30.2 - s * 0.72],
        m.warmWood,
        5,
        { action: 'mallWaterfall', label: '워터폴 가든 계단 라운지' }
      );
    }

    // Specialty Flagship Roastery Island Cafe (East Atrium Court)
    this.cyl(g, 'Mall_roastery_island', 2.4, 2.6, 1.05, [-18.2, 0.525, 16.5], m.champagne, 5, {
      action: 'mallCafe',
      label: '더 현대 로스터리 · 시그니처 카페',
    });
    this.cyl(g, 'Mall_roastery_top', 2.65, 2.65, 0.1, [-18.2, 1.08, 16.5], m.terrazzo);
    this.box(g, 'Mall_roastery_canopy', [4.2, 0.14, 4.2], [-18.2, 2.85, 16.5], m.warmWood);
    this.box(g, 'Mall_roastery_light', [3.8, 0.05, 3.8], [-18.2, 2.75, 16.5], m.warmLed);

    // Luxury Maison Boutiques (North-East & North-West wings)
    for (const [bx, bz, title] of [
      [-18.2, 9.8, '메종 르망 · 하이엔드 부티크'],
      [-37.5, 9.8, '아틀리에 노르딕 · 라이프스타일'],
      [-37.5, 31.8, '디지털 팝업 스튜디오'],
    ]) {
      this.box(g, 'Mall_boutique_counter', [3.4, 1.05, 1.2], [bx, 0.525, bz], m.champagne, 5, {
        action: 'mallShop',
        label: title,
      });
      this.box(g, 'Mall_boutique_display', [3.2, 2.2, 0.4], [bx, 1.1, bz - 1.1], m.darkOak);
      this.box(g, 'Mall_boutique_led', [3.0, 0.06, 0.25], [bx, 2.25, bz - 1.1], m.warmLed);
    }

    // Biophilic Planter Islands on 1F Court
    for (const [px, pz] of [
      [-26.0, 20.0],
      [-34.0, 23.5],
      [-25.5, 13.5],
    ]) {
      this.cyl(g, 'Mall_1F_planter', 1.35, 1.2, 0.45, [px, 0.225, pz], m.travertine, 5);
      this.cyl(g, 'Mall_1F_turf', 1.25, 1.25, 0.12, [px, 0.44, pz], m.turf);
      this.rail(g, [px, 0.45, pz], [px, 2.9, pz], m.warmWood, 0.09);
      this.sph(g, 'Mall_1F_tree', 1.35, [px, 3.3, pz], m.leaf, [1.1, 1.05, 1.1]);
    }

    // Mall Concierge Desk + Animated Concierge Staff near Mall Elevator Hall
    this.box(g, 'Mall_concierge_desk', [3.6, 1.02, 1.0], [-32.5, 0.51, 11.2], m.champagne, 5, {
      action: 'mallConcierge',
      label: '그랜드 아트리움 몰 컨시어지 안내데스크',
    });
    this.box(g, 'Mall_concierge_top', [3.75, 0.08, 1.12], [-32.5, 1.05, 11.2], m.terrazzo);
    this.buildConciergeNpc(g, -32.5, 10.1, 0);

    this.sign(
      g,
      'Mall_1F_directory_sign',
      ['THE GRAND ATRIUM MALL · 1F', '별마당 서가 · 워터폴 가든 · 사운즈 포레스트 (6F)'],
      [-28.0, 2.88, 11.8],
      [4.8, 0.72],
      0
    );
  }

  buildConciergeNpc(group, x, z, rotY = 0) {
    const npc = new THREE.Group();
    npc.name = 'Mall_concierge_staff';
    npc.position.set(x, 0, z);
    npc.rotation.y = rotY;
    npc.userData.dynamic = true;
    const legs = new THREE.Mesh(unitBox, this.m.charcoal);
    legs.scale.set(0.34, 0.78, 0.24);
    legs.position.y = 0.39;
    this.markInteractive(legs, { action: 'mallConcierge', label: '몰 컨시어지 매니저' });
    const torso = new THREE.Mesh(unitBox, this.m.champagne);
    torso.scale.set(0.42, 0.56, 0.26);
    torso.position.y = 1.06;
    this.markInteractive(torso, { action: 'mallConcierge', label: '몰 컨시어지 매니저' });
    const head = new THREE.Mesh(unitSphere, this.m.terrazzo);
    head.scale.setScalar(0.14);
    head.position.y = 1.5;
    this.markInteractive(head, { action: 'mallConcierge', label: '몰 컨시어지 매니저' });
    npc.add(legs, torso, head);
    group.add(npc);
    this.mallStaff.push(npc);
  }

  buildGalleryFloor(g, f) {
    const m = this.m;
    // Four perimeter slabs surrounding Central Atrium Void (x ∈ [-41, -21], z ∈ [12, 28])
    this.box(g, 'Mall_gallery_N', [36, 0.18, 8], [-32, -0.09, 8], m.terrazzo);
    this.box(g, 'Mall_gallery_S', [36, 0.18, 8], [-32, -0.09, 32], m.terrazzo);
    this.box(g, 'Mall_gallery_W', [9, 0.18, 16], [-45.5, -0.09, 20], m.terrazzo);
    this.box(g, 'Mall_gallery_E', [7, 0.18, 16], [-17.5, -0.09, 20], m.terrazzo);

    // Outer walls
    this.box(g, 'Mall_gallery_north_wall', [36, 3.5, 0.22], [-32, 1.75, 4], m.travertine);
    this.box(g, 'Mall_gallery_west_wall', [0.22, 3.5, 32], [-50, 1.75, 20], m.travertine);
    this.box(g, 'Mall_gallery_east_wall_n', [0.22, 3.5, 1.2], [-14.1, 1.75, 4.6], m.travertine);
    this.box(g, 'Mall_gallery_east_wall_s', [0.22, 3.5, 28.4], [-14.1, 1.75, 21.8], m.travertine);

    // Inner atrium glass balustrades + glowing LED cove fascia
    this.box(g, 'Mall_void_rail_N', [20, 1.08, 0.08], [-31, 0.54, 12.02], m.glass);
    this.box(g, 'Mall_void_fascia_N', [20.2, 0.24, 0.18], [-31, -0.06, 12.04], m.warmWood);
    this.box(g, 'Mall_void_led_N', [20.0, 0.05, 0.08], [-31, -0.18, 12.08], m.warmLed);

    this.box(g, 'Mall_void_rail_S', [20, 1.08, 0.08], [-31, 0.54, 27.98], m.glass);
    this.box(g, 'Mall_void_fascia_S', [20.2, 0.24, 0.18], [-31, -0.06, 27.96], m.warmWood);
    this.box(g, 'Mall_void_led_S', [20.0, 0.05, 0.08], [-31, -0.18, 27.92], m.warmLed);

    this.box(g, 'Mall_void_rail_W', [0.08, 1.08, 16], [-41.02, 0.54, 20], m.glass);
    this.box(g, 'Mall_void_fascia_W', [0.18, 0.24, 16], [-41.04, -0.06, 20], m.warmWood);
    this.box(g, 'Mall_void_rail_E', [0.08, 1.08, 16], [-20.98, 0.54, 20], m.glass);
    this.box(g, 'Mall_void_fascia_E', [0.18, 0.24, 16], [-20.96, -0.06, 20], m.warmWood);

    // Floating Atrium Skybridges on 3F (floor 7) & 5F (floor 9)
    if (f === 7 || f === 9) {
      const floorNo = f - 4;
      this.box(g, `Mall_${floorNo}F_skybridge_deck`, [20.4, 0.2, 2.8], [-31, -0.1, 20], m.terrazzo, null, {
        action: 'mallSkybridge',
        floorIndex: f,
        label: `${floorNo}F 플로팅 스카이브리지`,
      });
      this.box(g, `Mall_${floorNo}F_skybridge_soffit`, [20.2, 0.08, 2.6], [-31, -0.22, 20], m.warmLed);
      this.box(g, `Mall_${floorNo}F_skybridge_rail_N`, [20.2, 1.08, 0.06], [-31, 0.54, 18.62], m.glass);
      this.box(g, `Mall_${floorNo}F_skybridge_rail_S`, [20.2, 1.08, 0.06], [-31, 0.54, 21.38], m.glass);
      this.rail(g, [-41.1, 1.08, 18.62], [-20.9, 1.08, 18.62], m.champagne, 0.032);
      this.rail(g, [-41.1, 1.08, 21.38], [-20.9, 1.08, 21.38], m.champagne, 0.032);
    }

    // Storefronts & themed lounges per level
    const action = f === 9 ? 'mallFood' : 'mallShop';
    const label =
      f === 6
        ? '2F 글로벌 하이패션 & 라이브러리 발코니'
        : f === 7
          ? '3F 라이프스타일 스튜디오 & 아트 오브제'
          : f === 8
            ? '4F 시네마 & 별마당 북스 라운지'
            : '5F 고메 스트리트 · 미쉐린 셀렉션';

    for (const [bx, bz] of [
      [-17.2, 14.5],
      [-17.2, 25.5],
      [-37.0, 9.6],
    ]) {
      this.box(g, 'Mall_gallery_counter', [2.8, 1.0, 1.1], [bx, 0.5, bz], m.champagne, f, {
        action,
        floorIndex: f,
        label,
      });
      this.box(g, 'Mall_gallery_canopy', [3.1, 0.14, 1.5], [bx, 2.55, bz], m.warmWood);
      this.box(g, 'Mall_gallery_glow', [2.8, 0.04, 0.8], [bx, 2.46, bz], m.warmLed);
    }

    if (f === 9) {
      // 5F Gourmet Street dining tables
      for (const [tx, tz] of [
        [-28.0, 31.5],
        [-34.0, 31.5],
        [-44.5, 29.0],
      ]) {
        this.cyl(g, 'Mall_dining_table', 0.72, 0.72, 0.08, [tx, 0.76, tz], m.terrazzo, f, {
          action: 'mallFood',
          floorIndex: f,
          label: '5F 고메 스트리트 다이닝',
        });
        this.rail(g, [tx, 0, tz], [tx, 0.75, tz], m.charcoal, 0.06);
      }
    }

    this.sign(
      g,
      `Mall_${f}_level_sign`,
      [`${FLOORS[f]}F · GRAND ATRIUM`, f === 9 ? 'GOURMET STREET & SKYBRIDGE' : f === 7 ? 'SKYBRIDGE & LIFESTYLE' : 'BOUTIQUES & CULTURE'],
      [-23.0, 2.7, 4.15],
      [3.6, 0.56],
      0
    );
  }

  buildSoundsForest6F(g) {
    const m = this.m;
    // Full floor deck with twin sculptural atrium lightwells:
    // West Lightwell: x ∈ [-38.5, -31.5], z ∈ [16.0, 24.0]
    // East Lightwell: x ∈ [-24.5, -18.5], z ∈ [16.0, 24.0]
    this.box(g, 'Mall_6F_north', [36, 0.18, 12], [-32, -0.09, 10], m.travertine);
    this.box(g, 'Mall_6F_south', [36, 0.18, 12], [-32, -0.09, 30], m.travertine);
    this.box(g, 'Mall_6F_west_strip', [11.5, 0.18, 8], [-44.25, -0.09, 20], m.travertine);
    this.box(g, 'Mall_6F_center_promenade', [7.0, 0.18, 8], [-28.0, -0.09, 20], m.warmWood);
    this.box(g, 'Mall_6F_east_strip', [4.5, 0.18, 8], [-16.25, -0.09, 20], m.travertine);

    // North/West/East Walls (lowered or glazed above 2.8m)
    this.box(g, 'Mall_6F_north_wall', [36, 3.5, 0.22], [-32, 1.75, 4], m.travertine);
    this.box(g, 'Mall_6F_west_wall', [0.22, 3.5, 32], [-50, 1.75, 20], m.glass);
    this.box(g, 'Mall_6F_east_wall_n', [0.22, 3.5, 1.2], [-14.1, 1.75, 4.6], m.travertine);
    this.box(g, 'Mall_6F_east_wall_s', [0.22, 3.5, 28.4], [-14.1, 1.75, 21.8], m.glass);

    // Glass railings framing the West & East Lightwells
    for (const [cx, w, cz, d] of [
      [-35.0, 7.0, 20.0, 8.0],
      [-21.5, 6.0, 20.0, 8.0],
    ]) {
      this.box(g, 'Mall_lightwell_rail_N', [w, 1.1, 0.08], [cx, 0.55, cz - d / 2], m.glass);
      this.box(g, 'Mall_lightwell_rail_S', [w, 1.1, 0.08], [cx, 0.55, cz + d / 2], m.glass);
      this.box(g, 'Mall_lightwell_rail_W', [0.08, 1.1, d], [cx - w / 2, 0.55, cz], m.glass);
      this.box(g, 'Mall_lightwell_rail_E', [0.08, 1.1, d], [cx + w / 2, 0.55, cz], m.glass);
    }

    // Lush Sounds Forest Green Lawns & Sculpted Tree Groves
    for (const [gx, gz, gw, gd, label] of [
      [-44.5, 28.5, 6.4, 5.2, '6F 사운즈 포레스트 · 그린 힐'],
      [-18.0, 28.5, 5.6, 5.2, '6F 사운즈 포레스트 · 버드나무 가든'],
      [-38.5, 10.5, 7.0, 4.0, '6F 사운즈 포레스트 · 플라워 파빌리온'],
    ]) {
      this.box(g, 'Mall_forest_lawn', [gw, 0.34, gd], [gx, 0.17, gz], m.turf, MALL_MAX_FLOOR, {
        action: 'mallForest',
        floorIndex: MALL_MAX_FLOOR,
        label,
      });
      this.box(g, 'Mall_forest_curb', [gw + 0.2, 0.12, gd + 0.2], [gx, 0.06, gz], m.warmWood);
    }

    // Indoor Mature Trees
    for (const [tx, tz, h] of [
      [-46.2, 27.2, 3.0],
      [-43.2, 29.8, 3.4],
      [-19.2, 27.6, 3.1],
      [-16.8, 29.6, 2.7],
      [-40.0, 10.2, 2.9],
      [-36.5, 11.0, 3.3],
      [-28.0, 31.8, 3.2],
      [-45.0, 18.0, 3.1],
    ]) {
      this.cyl(g, 'Mall_tree_trunk', 0.13, 0.18, h * 0.72, [tx, h * 0.36, tz], m.warmWood, MALL_MAX_FLOOR);
      this.sph(
        g,
        'Mall_tree_canopy',
        1.55,
        [tx, h * 0.85 + 0.8, tz],
        m.leaf,
        [1.15, 0.9, 1.15],
        { action: 'mallForest', floorIndex: MALL_MAX_FLOOR, label: '사운즈 포레스트 실내 수목원' }
      );
      this.sph(g, 'Mall_tree_moss', 1.1, [tx + 0.45, h * 0.75 + 0.7, tz - 0.3], m.moss, [1, 0.8, 1]);
    }

    // Central Botanical Glass Conservatory Pavilion at x=-28, z=20 (leave walkway around rim, place arched ribs overhead)
    for (const sx of [-30.6, -25.4]) {
      for (const sz of [17.4, 22.6]) {
        this.rail(g, [sx, 0, sz], [sx, 3.4, sz], m.champagne, 0.055);
        this.rail(g, [sx, 3.4, sz], [-28.0, 4.4, 20.0], m.champagne, 0.045);
      }
    }
    this.box(g, 'Mall_conservatory_bench', [2.6, 0.46, 0.85], [-28.0, 0.23, 21.8], m.warmWood, MALL_MAX_FLOOR, {
      action: 'mallForest',
      floorIndex: MALL_MAX_FLOOR,
      label: '사운즈 포레스트 보태니컬 컨서버토리',
    });

    this.sign(
      g,
      'Mall_6F_forest_sign',
      ['6F SOUNDS FOREST · 사운즈 포레스트', 'BOTANICAL SKY GARDEN & ATRIUM SKYLIGHT'],
      [-28.0, 2.75, 11.8],
      [4.8, 0.72],
      0
    );
  }

  buildAtriumLibrarySpine() {
    // 14m Towering Starfield Atrium Library spanning 1F (y=0) to 4F ceiling (y=14m) along x ∈ [-47.8, -44.2], z ∈ [13.5, 26.5]
    const lib = new THREE.Group();
    lib.name = 'Mall_Starfield_Atrium_Library';
    const m = this.m;

    // Monumental warm oak monolith core pushed against outer west wall (x = -47.4 .. -45.4) so west walkway x ∈ [-44.8, -41.0] remains open
    this.box(lib, 'Mall_library_backdrop', [0.35, 14.0, 12.6], [-47.8, 7.0, 20.0], m.darkOak);
    // Walkable plinth seats on 1F
    this.box(lib, 'Mall_library_reading_plinth', [1.8, 0.52, 10.6], [-46.7, 0.26, 20.0], m.warmWood, 5, {
      action: 'mallLibrary',
      label: '14m 별마당 아트리움 서가 · 북라운지',
    });

    // Illuminated shelves & colored book rows rising 13.4m across 4 stories
    for (let tier = 0; tier < 16; tier++) {
      const y = 0.85 + tier * 0.82;
      this.box(lib, 'Mall_library_shelf', [0.85, 0.06, 12.0], [-47.35, y, 20.0], m.warmWood);
      this.box(lib, 'Mall_library_led', [0.12, 0.04, 11.8], [-46.96, y + 0.05, 20.0], m.warmLed);
      for (let slot = 0; slot < 8; slot++) {
        const z = 14.8 + slot * 1.48;
        const bMat = m.bookColors[(tier + slot) % m.bookColors.length];
        const book = this.box(
          lib,
          'Mall_library_books',
          [0.52, 0.56, 1.18],
          [-47.35, y + 0.31, z],
          bMat,
          null,
          { action: 'mallLibrary', label: '별마당 아트리움 컬처 서가' }
        );
        book.userData.libraryFloor = Math.min(8, 5 + Math.floor(tier / 4));
      }
    }

    // Sculptural vertical timber ribs framing the Giant Library Wall
    for (const z of [13.7, 17.8, 22.2, 26.3]) {
      this.box(lib, 'Mall_library_rib', [0.95, 14.0, 0.24], [-47.3, 7.0, z], m.champagne);
    }

    this.sign(
      lib,
      'Mall_library_emblem',
      ['STARFIELD ATRIUM LIBRARY · 14M', 'CULTURE BOOK LOUNGE (1F - 4F)'],
      [-46.8, 8.2, 20.0],
      [4.2, 0.72],
      Math.PI / 2
    );

    this.root.add(lib);
  }

  buildWaterfallTower() {
    // 12m Waterfall Garden cascade falling from 3F (y = 10.5m) into the 1F Reflecting Pool (x = -17.6, z = 31.2)
    const wf = new THREE.Group();
    wf.name = 'Mall_12m_Waterfall_Garden';
    const m = this.m;

    this.box(wf, 'Mall_waterfall_backdrop', [5.8, 11.5, 0.45], [-18.8, 5.75, 33.4], m.travertine, null, {
      action: 'mallWaterfall',
      label: '12m 워터폴 가든 · 수직 폭포 정원',
    });

    // Stepped mossy greenery ledges along waterfall face
    for (let k = 0; k < 4; k++) {
      this.box(wf, 'Mall_waterfall_planter_ledge', [4.8, 0.45, 0.65], [-18.8, 2.2 + k * 2.5, 32.9], m.moss);
    }

    // Twin animated luminous water cascade sheets
    for (let i = 0; i < 2; i++) {
      const sheet = this.box(
        wf,
        `Mall_waterfall_flow_${i}`,
        [2.2, 10.6, 0.08],
        [-19.9 + i * 2.2, 5.5, 32.55],
        m.water,
        null,
        { action: 'mallWaterfall', label: '12m 워터폴 가든' }
      );
      sheet.userData.dynamic = true;
      sheet.userData.baseY = 5.5;
      sheet.userData.phase = i * 1.4;
      this.waterfallSheets.push(sheet);
    }

    // Champagne gold rim lighting along waterfall crest
    this.box(wf, 'Mall_waterfall_crest_led', [5.6, 0.12, 0.4], [-18.8, 11.1, 32.8], m.cyanLed);
    this.root.add(wf);
  }

  buildExterior() {
    const ext = this.exterior;
    const m = this.m;

    // 1. Diagrid Glass Skylight Roof & RSHP-inspired Vermilion Red Steel Trusses at 6F top (y = 21.0)
    const roofY = 21.0;
    this.box(ext, 'Mall_skylight_glass_roof', [36.4, 0.1, 32.4], [-32, roofY + 0.35, 20], m.skylightGlass);

    // Diagrid lattice beams
    for (let x = -48; x <= -16; x += 6.4) {
      this.rail(ext, [x, roofY + 0.3, 4], [x, roofY + 0.3, 36], m.white, 0.09);
    }
    for (let z = 6; z <= 34; z += 5.6) {
      this.rail(ext, [-50, roofY + 0.3, z], [-14, roofY + 0.3, z], m.white, 0.09);
    }
    for (let k = -3; k <= 3; k++) {
      this.rail(ext, [-50, roofY + 0.32, Math.max(4, Math.min(36, 20 + k * 5))], [-14, roofY + 0.32, Math.max(4, Math.min(36, 20 - k * 5))], m.champagne, 0.055);
    }

    // Iconic Vermilion Red Crane-Truss Structural Masts & Tension Tie Rods (The Hyundai Seoul inspired)
    for (const x of [-42, -32, -22]) {
      this.rail(ext, [x, roofY, 4.2], [x, roofY + 4.4, 11.5], m.vermilion, 0.16);
      this.rail(ext, [x, roofY + 4.4, 11.5], [x, roofY + 0.6, 20.0], m.vermilion, 0.12);
      this.rail(ext, [x, roofY + 4.4, 11.5], [x, roofY + 0.6, 35.5], m.steel, 0.05);
      this.rail(ext, [x, roofY, 35.8], [x, roofY + 4.4, 28.5], m.vermilion, 0.16);
      this.rail(ext, [x, roofY + 4.4, 28.5], [x, roofY + 0.6, 20.0], m.vermilion, 0.12);
    }
    this.rail(ext, [-44, roofY + 4.4, 11.5], [-20, roofY + 4.4, 11.5], m.vermilion, 0.14);
    this.rail(ext, [-44, roofY + 4.4, 28.5], [-20, roofY + 4.4, 28.5], m.vermilion, 0.14);

    // 2. Double-Skin Glass South Curtain Wall (z = 36) with Entrance Gap at x ∈ [-34, -30], y ∈ [0, 3.2]
    const totalH = (MALL_MAX_FLOOR - 4) * PITCH; // 6 stories * 3.5 = 21m (y = 0 .. 21.0)
    // Left curtain wall wing x ∈ [-50, -34]
    this.box(ext, 'Mall_curtain_wall_SW', [16.0, totalH, 0.12], [-42.0, totalH / 2, 36.0], m.glass);
    // Right curtain wall wing x ∈ [-30, -14]
    this.box(ext, 'Mall_curtain_wall_SE', [16.0, totalH, 0.12], [-22.0, totalH / 2, 36.0], m.glass);
    // Upper curtain wall header above entrance doorway (x ∈ [-34, -30], y ∈ [3.2, 21.0])
    this.box(ext, 'Mall_curtain_wall_header', [4.0, totalH - 3.2, 0.12], [-32.0, 3.2 + (totalH - 3.2) / 2, 36.0], m.glass);
    // Outer West & North Glass/Stone Facade Ribbon
    this.box(ext, 'Mall_west_curtain_skin', [0.1, totalH, 32.0], [-50.1, totalH / 2, 20.0], m.glass);

    // 3. Parametric Wave Fins + Vertical DMX RGBW LED Facade Strips (Starfield Suwon inspired)
    for (let i = 0; i <= 18; i++) {
      const x = -49.5 + i * 1.95;
      if (Math.abs(x + 32.0) < 2.2) continue; // keep entrance bay airy
      const wave = 0.55 + Math.sin(i * 0.45) * 0.35;
      this.box(ext, `Mall_wave_fin_${i}`, [0.11, totalH + 0.6, wave], [x, totalH / 2 + 0.2, 36.25 + wave * 0.5], m.white);
      if (i % 3 === 0) {
        const stripMat = new THREE.MeshStandardMaterial({
          color: 0x76d6ff,
          emissive: 0x4fb8ff,
          emissiveIntensity: 0.72,
          roughness: 0.2,
        });
        const strip = new THREE.Mesh(unitBox, stripMat);
        strip.name = `Mall_DMX_strip_${i}`;
        strip.scale.set(0.06, totalH, 0.08);
        strip.position.set(x, totalH / 2, 36.32 + wave);
        strip.userData = { dynamic: true, phase: i * 0.38 };
        ext.add(strip);
        this.dmxStrips.push(strip);
      }
    }

    // Horizontal architectural slab express bands (dark anodized trim per floor 1F..6F)
    for (let fl = 0; fl <= 6; fl++) {
      this.box(ext, `Mall_spandrel_S_${fl}`, [36.2, 0.28, 0.28], [-32.0, fl * PITCH, 36.1], m.charcoal);
    }

    // 4. Anamorphic 3D Digital Media Facade Wall (x ∈ [-46.5, -35.5], y ∈ [8.5, 16.5], z = 36.5)
    const mediaCanvas = safeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#0c1626';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#173854';
      ctx.fillRect(24, 24, w - 48, h - 48);
      ctx.fillStyle = '#d9b46c';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE GRAND ATRIUM', w / 2, h / 2 - 22);
      ctx.fillStyle = '#6fe7db';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('STARFIELD LIBRARY  ·  SOUNDS FOREST  ·  WATERFALL', w / 2, h / 2 + 44);
    });
    if (mediaCanvas) {
      const mediaMat = new THREE.MeshStandardMaterial({
        map: mediaCanvas.tex,
        emissiveMap: mediaCanvas.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.65,
        roughness: 0.22,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 7.0), mediaMat);
      screen.name = 'Mall_anamorphic_media_facade';
      screen.position.set(-41.0, 12.2, 36.75);
      screen.userData.dynamic = true;
      this.markInteractive(screen, { action: 'mallMediaWall', label: '아나모픽 3D LED 미디어 파사드' });
      ext.add(screen);
      this.mediaWall = { ...mediaCanvas, mesh: screen };
    }

    // 5. Entrance Canopy & Automated Sliding Glass Doors at x = -32.0, z = 36.0
    this.box(ext, 'Mall_entrance_canopy', [9.2, 0.28, 4.6], [-32.0, 3.65, 38.3], m.charcoal);
    this.box(ext, 'Mall_entrance_canopy_trim', [9.3, 0.14, 4.7], [-32.0, 3.82, 38.3], m.champagne);
    this.box(ext, 'Mall_entrance_soffit_led', [8.4, 0.05, 3.8], [-32.0, 3.49, 38.3], m.warmLed);
    this.sign(
      ext,
      'Mall_facade_brand_sign',
      ['THE GRAND ATRIUM MALL', 'LUXURY · LIBRARY · SOUNDS FOREST'],
      [-32.0, 4.35, 40.55],
      [6.4, 0.85],
      0
    );

    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(unitBox, m.glass);
      panel.name = side < 0 ? 'Mall_entrance_door_L' : 'Mall_entrance_door_R';
      panel.scale.set(1.95, 3.05, 0.08);
      panel.position.set(-32.0 + side * 0.98, 1.525, 35.95);
      panel.userData = { dynamic: true, closedX: -32.0 + side * 0.98, openOffset: side * 1.75 };
      ext.add(panel);
      this.entranceDoors.push(panel);
    }

    // 6. West Outdoor Plaza (x ∈ [-50, -14], z ∈ [36, 47.5]) connecting to Hotel Entry Plaza
    this.box(ext, 'Mall_outdoor_plaza', [36.2, 0.16, 11.8], [-32.0, -0.08, 41.9], m.terrazzo);
    // Plaza trees & kinetic chrome ring sculpture
    for (const [px, pz] of [
      [-45.5, 41.0],
      [-21.0, 41.0],
    ]) {
      this.cyl(ext, 'Mall_plaza_planter', 0.8, 0.75, 0.45, [px, 0.225, pz], m.concrete, 5);
      this.rail(ext, [px, 0.4, pz], [px, 2.7, pz], m.warmWood, 0.075);
      this.sph(ext, 'Mall_plaza_tree', 1.15, [px, 3.1, pz], m.leaf, [1.05, 1.15, 1.05]);
    }
    const sculpture = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.14, 14, 36),
      m.champagne
    );
    sculpture.name = 'Mall_plaza_kinetic_sculpture';
    sculpture.position.set(-22.0, 1.85, 43.2);
    sculpture.userData.dynamic = true;
    this.markInteractive(sculpture, { action: 'mallMediaWall', label: '몰 플라자 키네틱 아트 오브제' });
    ext.add(sculpture);
    this.box(ext, 'Mall_sculpture_plinth', [2.2, 0.55, 2.2], [-22.0, 0.275, 43.2], m.travertine, 5);
    this.plazaSculpture = sculpture;
  }

  buildPanoramicElevator() {
    // Dedicated Mall Panoramic Glass Elevator at (MALL_LIFT_X = -28.0, MALL_LIFT_Z = 6.2), B5..6F (floor 0..10)
    const g = this.elevatorGroup;
    const m = this.m;
    const bx = MALL_LIFT_X;
    const bz = MALL_LIFT_Z;
    const shaftBot = -5 * PITCH - 0.5; // -18.0
    const shaftTop = (MALL_MAX_FLOOR - 5 + 1) * PITCH + 0.6; // 6*3.5 + 0.6 = 21.6
    const shaftH = shaftTop - shaftBot;
    const shaftMidY = (shaftTop + shaftBot) / 2;

    // 4 Corner Steel Mullions + Guide Rails
    for (const [ox, oz] of [
      [-1.25, -1.1],
      [1.25, -1.1],
      [-1.25, 1.15],
      [1.25, 1.15],
    ]) {
      this.box(g, 'Mall_shaft_mullion', [0.1, shaftH, 0.1], [bx + ox, shaftMidY, bz + oz], m.charcoal);
    }
    // Panoramic Glass Shaft Back & Sides
    this.box(g, 'Mall_shaft_glass_N', [2.5, shaftH, 0.05], [bx, shaftMidY, bz - 1.1], m.glass);
    this.box(g, 'Mall_shaft_glass_W', [0.05, shaftH, 2.25], [bx - 1.25, shaftMidY, bz], m.glass);
    this.box(g, 'Mall_shaft_glass_E', [0.05, shaftH, 2.25], [bx + 1.25, shaftMidY, bz], m.glass);
    // Front shaft glass above each doorway + framing piers
    for (let f = 0; f <= MALL_MAX_FLOOR; f++) {
      const fy = (f - 5) * PITCH;
      this.box(g, 'Mall_landing_pier_L', [0.68, PITCH, 0.12], [bx - 0.91, fy + PITCH / 2, bz + 1.15], m.champagne);
      this.box(g, 'Mall_landing_pier_R', [0.68, PITCH, 0.12], [bx + 0.91, fy + PITCH / 2, bz + 1.15], m.champagne);
      this.box(g, 'Mall_landing_header', [1.14, 1.05, 0.14], [bx, fy + PITCH - 0.525, bz + 1.15], m.champagne);

      // Center-parting landing doors
      const doorGroup = new THREE.Group();
      doorGroup.name = `Mall_landing_door_${FLOORS[f]}`;
      doorGroup.position.set(bx, fy, bz + 1.12);
      const lDoor = new THREE.Mesh(unitBox, m.glass);
      lDoor.scale.set(0.57, 2.42, 0.045);
      lDoor.position.set(-0.285, 1.21, 0);
      lDoor.userData.dynamic = true;
      const rDoor = new THREE.Mesh(unitBox, m.glass);
      rDoor.scale.set(0.57, 2.42, 0.045);
      rDoor.position.set(0.285, 1.21, 0);
      rDoor.userData.dynamic = true;
      doorGroup.add(lDoor, rDoor);
      g.add(doorGroup);
      this.mallLandingDoors[f] = { left: lDoor, right: rDoor };

      // Live landing floor indicator above doorway
      const disp = safeCanvasTexture(256, 96, (ctx, w, h) => {
        ctx.fillStyle = '#0e1720';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f2c879';
        ctx.font = 'bold 46px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1F', w / 2, 62);
      });
      if (disp) {
        const dMat = new THREE.MeshStandardMaterial({
          map: disp.tex,
          emissiveMap: disp.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.7,
        });
        const dMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.3), dMat);
        dMesh.name = `Mall_landing_display_${FLOORS[f]}`;
        dMesh.position.set(bx, fy + 2.75, bz + 1.24);
        dMesh.userData.dynamic = true;
        g.add(dMesh);
        this.mallLandingDisplays[f] = { ...disp, lastKey: '' };
      }

      // Hall Call Buttons (right jamb at x = bx + 0.85, z = bz + 1.24)
      const plate = this.box(g, `Mall_hall_plate_${FLOORS[f]}`, [0.22, 0.42, 0.04], [bx + 0.85, fy + 1.15, bz + 1.22], m.charcoal);
      plate.userData.dynamic = true;
      if (f < MALL_MAX_FLOOR) {
        const upBtn = this.makeCopButton(g, [bx + 0.85, fy + 1.24, bz + 1.25], [0.09, 0.09, 0.03], {
          action: 'mallHall',
          floorIndex: f,
          direction: 1,
          label: `${FLOORS[f]}층 상행 호출`,
        });
        this.mallHallButtons.push(upBtn);
      }
      if (f > 0) {
        const dnBtn = this.makeCopButton(g, [bx + 0.85, fy + 1.07, bz + 1.25], [0.09, 0.09, 0.03], {
          action: 'mallHall',
          floorIndex: f,
          direction: -1,
          label: `${FLOORS[f]}층 하행 호출`,
        });
        this.mallHallButtons.push(dnBtn);
      }
    }

    // Counterweight (back north channel z = bz - 0.96) + 2 Hoist Ropes
    const cw = new THREE.Group();
    cw.name = 'Mall_counterweight';
    cw.position.set(bx, 0, bz - 0.96);
    cw.userData.dynamic = true;
    const cwBody = new THREE.Mesh(unitBox, m.charcoal);
    cwBody.scale.set(1.1, 2.2, 0.14);
    cw.add(cwBody);
    g.add(cw);
    this.mallWeight = cw;

    for (const rx of [bx - 0.25, bx + 0.25]) {
      const rope = new THREE.Mesh(unitCyl, m.steel);
      rope.name = 'Mall_hoist_rope';
      rope.userData.dynamic = true;
      g.add(rope);
      this.ropeMeshes.push({ mesh: rope, x: rx, z: bz });
    }
    this.shaftTopY = shaftTop - 0.4;

    // Moving Panoramic Glass Cabin
    const car = new THREE.Group();
    car.name = 'Mall_panoramic_cabin';
    car.position.set(bx, 0, bz);
    car.userData.dynamic = true;

    this.box(car, 'Mall_car_floor', [2.15, 0.12, 1.85], [0, -0.06, 0], m.terrazzo);
    this.box(car, 'Mall_car_ceiling', [2.15, 0.14, 1.85], [0, 2.52, 0], m.warmWood);
    this.box(car, 'Mall_car_ceiling_led', [1.7, 0.04, 1.4], [0, 2.43, 0], m.warmLed);
    this.box(car, 'Mall_car_glass_back', [2.1, 2.44, 0.04], [0, 1.22, -0.9], m.glass);
    this.box(car, 'Mall_car_glass_L', [0.04, 2.44, 1.8], [-1.05, 1.22, 0], m.glass);
    this.box(car, 'Mall_car_glass_R', [0.04, 2.44, 1.8], [1.05, 1.22, 0], m.glass);
    this.rail(car, [-0.96, 0.92, -0.78], [0.96, 0.92, -0.78], m.champagne, 0.025);
    this.rail(car, [-0.96, 0.92, -0.78], [-0.96, 0.92, 0.78], m.champagne, 0.025);
    this.rail(car, [0.96, 0.92, -0.78], [0.96, 0.92, 0.78], m.champagne, 0.025);

    // Cabin sliding glass doors
    const carDoorL = new THREE.Mesh(unitBox, m.glass);
    carDoorL.scale.set(0.55, 2.4, 0.04);
    carDoorL.position.set(-0.275, 1.2, 0.92);
    carDoorL.userData.dynamic = true;
    const carDoorR = new THREE.Mesh(unitBox, m.glass);
    carDoorR.scale.set(0.55, 2.4, 0.04);
    carDoorR.position.set(0.275, 1.2, 0.92);
    carDoorR.userData.dynamic = true;
    car.add(carDoorL, carDoorR);
    this.mallCarDoors = { left: carDoorL, right: carDoorR };

    // Cabin Front Side Jamb Panels & Interior COP (right front pillar x = 0.82, z = 0.82, facing inward -Z/-X)
    this.box(car, 'Mall_car_jamb_L', [0.54, 2.44, 0.08], [-0.78, 1.22, 0.92], m.champagne);
    this.box(car, 'Mall_car_jamb_R', [0.54, 2.44, 0.08], [0.78, 1.22, 0.92], m.champagne);
    this.box(car, 'Mall_car_cop_plate', [0.34, 1.22, 0.04], [0.78, 1.28, 0.87], m.charcoal);

    // Interior COP Floor Buttons (B5..6F -> 0..10 in 2 columns)
    for (let f = 0; f <= MALL_MAX_FLOOR; f++) {
      const col = f % 2;
      const row = Math.floor(f / 2);
      const bxOff = 0.71 + col * 0.14;
      const byOff = 0.92 + row * 0.13;
      const btn = this.makeCopButton(car, [bxOff, byOff, 0.84], [0.085, 0.075, 0.025], {
        action: 'mallCar',
        floorIndex: f,
        label: `몰 ${FLOORS[f]}층 버튼`,
      });
      this.mallCarButtons.push(btn);
    }
    // Interior COP Utility Buttons (Open, Close, Alarm)
    for (const [bxOff, action, label] of [
      [0.69, 'mallOpen', '문 열림'],
      [0.78, 'mallClose', '문 닫힘'],
      [0.87, 'mallAlarm', '비상 호출'],
    ]) {
      const b = this.makeCopButton(car, [bxOff, 0.77, 0.84], [0.065, 0.065, 0.025], { action, label });
      this.mallCarButtons.push(b);
    }

    // Cabin LCD Indicator Screen above COP buttons
    const copDisp = safeCanvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#0f1722';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f2c879';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1F', w / 2, 72);
    });
    if (copDisp) {
      const sMat = new THREE.MeshStandardMaterial({
        map: copDisp.tex,
        emissiveMap: copDisp.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.72,
      });
      const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), sMat);
      sMesh.name = 'Mall_car_cop_screen';
      sMesh.position.set(0.78, 1.76, 0.84);
      sMesh.rotation.y = Math.PI;
      sMesh.userData.dynamic = true;
      car.add(sMesh);
      this.mallCopDisplay = { ...copDisp, lastKey: '' };
    }

    g.add(car);
    this.mallCar = car;
  }

  makeCopButton(group, pos, size, userData) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8e9aa3,
      roughness: 0.35,
      metalness: 0.45,
      emissive: 0x000000,
    });
    const m = new THREE.Mesh(unitBox, mat);
    m.name = `Mall_btn_${userData.action}_${userData.floorIndex ?? ''}`;
    m.scale.set(...size);
    m.position.set(...pos);
    m.userData = { ...userData, dynamic: true, ownMaterial: true };
    group.add(m);
    if (this.pickables) this.pickables.push(m);
    return m;
  }

  redrawIndicator(disp, mc, floorLabel) {
    if (!disp?.ctx) return;
    const arrow = mc.direction > 0 ? '▲' : mc.direction < 0 ? '▼' : '●';
    const key = `${floorLabel}:${arrow}:${mc.alarm ? 'A' : ''}`;
    if (disp.lastKey === key) return;
    disp.lastKey = key;
    const { ctx, canvas, tex } = disp;
    ctx.fillStyle = mc.alarm ? '#3b1214' : '#0d1621';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = mc.alarm ? '#ff7c70' : '#f4cf82';
    ctx.font = `bold ${Math.round(canvas.height * 0.48)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${arrow} ${floorLabel}`, canvas.width / 2, Math.round(canvas.height * 0.66));
    tex.needsUpdate = true;
  }

  updateVisibility(mode, focusFloor, isGame) {
    const inExterior = mode === 'exterior';
    const inMall = mode === 'mall';
    const showAll = isGame || inExterior || inMall;
    if (!showAll && mode === 'cabin') {
      this.root.visible = false;
      this.elevatorGroup.visible = false;
      this.exterior.visible = false;
      return;
    }
    this.root.visible = true;
    this.elevatorGroup.visible = true;
    this.exterior.visible = showAll;

    for (const fg of this.floors) {
      if (showAll) {
        fg.visible = true;
      } else if (mode === 'controller' || mode === 'shaft') {
        fg.visible = Math.abs(fg.userData.floorIndex - focusFloor) <= 2 || fg.userData.floorIndex >= 5;
      } else {
        fg.visible = fg.userData.floorIndex === focusFloor || fg.userData.floorIndex >= 5;
      }
    }
  }

  update(mc, time = 0, player = null) {
    if (!mc) return;
    const carY = mc.position - 5 * PITCH; // floor 5 (1F) -> y = 0
    if (this.mallCar) this.mallCar.position.y = carY;
    if (this.mallWeight) this.mallWeight.position.y = 10.5 - carY;

    // Hoist ropes stretch smoothly from cabin roof up to top traction sheave
    const carRoofY = carY + 2.55;
    const ropeLen = Math.max(0.4, (this.shaftTopY ?? 21.2) - carRoofY);
    for (const r of this.ropeMeshes) {
      r.mesh.scale.set(0.014, ropeLen, 0.014);
      r.mesh.position.set(r.x, carRoofY + ropeLen / 2, r.z);
    }

    // Center-parting car doors & aligned landing doors
    const openShift = (mc.door ?? 0) * 0.52;
    if (this.mallCarDoors) {
      this.mallCarDoors.left.position.x = -0.275 - openShift;
      this.mallCarDoors.right.position.x = 0.275 + openShift;
    }
    for (let f = 0; f <= MALL_MAX_FLOOR; f++) {
      const ld = this.mallLandingDoors[f];
      const fOpen = mc.aligned() && mc.floor === f ? openShift : 0;
      if (ld) {
        ld.left.position.x = -0.285 - fOpen;
        ld.right.position.x = 0.285 + fOpen;
      }
      if (this.mallLandingDisplays[f]) {
        this.redrawIndicator(this.mallLandingDisplays[f], mc, FLOORS[mc.floor] ?? '1');
      }
    }

    if (this.mallCopDisplay) {
      this.redrawIndicator(this.mallCopDisplay, mc, FLOORS[mc.floor] ?? '1');
    }

    // Highlight active COP & Hall call buttons
    for (const btn of [...this.mallCarButtons, ...this.mallHallButtons]) {
      const { action, floorIndex, direction } = btn.userData;
      const lit =
        action === 'mallCar'
          ? mc.car.has(floorIndex)
          : action === 'mallHall'
            ? (direction === 1 ? mc.up : mc.down).has(floorIndex)
            : action === 'mallAlarm'
              ? mc.alarm
              : false;
      if (btn.userData.lastLit !== lit) {
        btn.userData.lastLit = lit;
        btn.material.color.setHex(lit ? (action === 'mallHall' ? 0x62d9cc : 0xe8b566) : 0x8e9aa3);
        btn.material.emissive.setHex(lit ? (action === 'mallHall' ? 0x3ecfb9 : 0xffaa3b) : 0x000000);
        btn.material.emissiveIntensity = lit ? 0.55 : 0;
      }
    }

    // Waterfall cascading water ripple
    for (const sheet of this.waterfallSheets) {
      const pulse = Math.sin(time * 2.8 + sheet.userData.phase);
      sheet.position.y = sheet.userData.baseY + pulse * 0.08;
      sheet.material.opacity = 0.58 + pulse * 0.08;
    }

    // DMX LED exterior facade strips gentle color shimmer
    for (const strip of this.dmxStrips) {
      const hue = ((time * 0.045 + strip.userData.phase * 0.12) % 1 + 1) % 1;
      strip.material.emissive.setHSL(hue, 0.72, 0.56);
    }

    // Kinetic Plaza Sculpture slow rotation
    if (this.plazaSculpture) {
      this.plazaSculpture.rotation.y = time * 0.32;
      this.plazaSculpture.rotation.x = Math.sin(time * 0.5) * 0.18;
    }

    // Automated Mall South Entrance Sliding Glass Doors (open when player approaches z=36, x=-32)
    let doorTarget = 0;
    if (player && player.floor === 5) {
      const dist = Math.hypot(player.x - -32.0, player.z - 36.0);
      if (dist < 4.8) doorTarget = 1;
    } else if (!player) {
      doorTarget = 0.85;
    }
    this._entranceOpen = (this._entranceOpen ?? 0) + (doorTarget - (this._entranceOpen ?? 0)) * 0.18;
    for (const p of this.entranceDoors) {
      p.position.x = p.userData.closedX + p.userData.openOffset * this._entranceOpen;
    }
  }
}
