import * as THREE from 'three';
import { mallFloorMeta, MALL_VALID_FLOORS } from './building.js';
import { FLOORS, PITCH } from './controller.js';
import { MALL_LIFT_X, MALL_LIFT_Z } from './hotel-world.js';
import { hotelSignTexture } from './hotel-sign.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const unitSphere = new THREE.SphereGeometry(1, 12, 10);
const unitCapsule = new THREE.CapsuleGeometry(1, 1, 4, 8);
const up = new THREE.Vector3(0, 1, 0);

export const MALL_STORY_H = PITCH * 2; // 7.0m per double-height Mall story (2 Hotel floors)
export const MALL_ROOF_Y = 5 * MALL_STORY_H; // 35.0m above ground (= Hotel 10F height)

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

    this.crowdGroup = new THREE.Group();
    this.crowdGroup.name = 'Mall_visitors_crowd';
    this.crowdGroup.userData.dynamic = true;
    scene.add(this.crowdGroup);

    this.floors = [];
    this.signs = [];
    this.dmxStrips = [];
    this.waterfallSheets = [];
    this.entranceDoors = [];
    this.mallLandingDoors = {};
    this.mallLandingDisplays = {};
    this.mallHallButtons = [];
    this.mallCarButtons = [];
    this.mallPeople = [];
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
      metal: mat(0x869496, 0.28, 0.78),
      vermilion: mat(0xc93b2b, 0.45, 0.32),
      cinemaRed: mat(0x911d24, 0.68, 0.06),
      concrete: mat(0x8b918e, 0.93, 0.02),
      asphalt: mat(0x3c4544, 0.94, 0.02),
      white: mat(0xf2efe9, 0.65, 0.04),
      turf: mat(0x447548, 0.92, 0.0),
      leaf: mat(0x36643c, 0.88, 0.0),
      moss: mat(0x52824c, 0.94, 0.0),
      red: mat(0xad3d30, 0.65),
      bookColors: [mat(0xb8493c, 0.72), mat(0x2f5e78, 0.72), mat(0xd39e48, 0.7), mat(0x467359, 0.72)],
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xa5cad2,
        metalness: 0.14,
        roughness: 0.08,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      skylightGlass: new THREE.MeshPhysicalMaterial({
        color: 0xdaf1f7,
        metalness: 0.08,
        roughness: 0.06,
        transparent: true,
        opacity: 0.25,
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
        emissiveIntensity: 0.48,
      }),
      cyanLed: new THREE.MeshStandardMaterial({
        color: 0x89f2e6,
        emissive: 0x39c9bb,
        emissiveIntensity: 0.58,
      }),
      yellow: new THREE.MeshBasicMaterial({ color: 0xdfc25c }),
      black: mat(0x1c2226, 0.85, 0.1),
      skin: mat(0xd7ae8e, 0.78, 0),
    };

    this.textureMallMaterials();

    for (const f of MALL_VALID_FLOORS) {
      const g = new THREE.Group();
      const meta = mallFloorMeta(f, FLOORS[f]);
      g.name = f < 5 ? `Mall_parking_${FLOORS[f]}` : `Mall_${meta.mallCode}`;
      g.userData.floorIndex = f;
      g.position.y = (f - 5) * PITCH;
      this.root.add(g);
      this.floors.push(g);

      this.buildEscalatorLink(g, f);
      if (f < 5) this.buildParking(g, f);
      else if (f === 5) this.buildAtriumM1F(g);
      else if (f < 13) this.buildGalleryFloor(g, f);
      else this.buildTopCinemaM5F(g);
    }

    this.buildAtriumLibrarySpine();
    this.buildWaterfallTower();
    this.buildExterior();
    this.buildPanoramicElevator();
    this.buildMallCrowd();

    this.root.visible = false;
    this.exterior.visible = false;
    this.elevatorGroup.visible = false;
    this.crowdGroup.visible = false;
  }

  textureMallMaterials() {
    let seed = 109;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (const [key, base] of [
      ['terrazzo', 226],
      ['concrete', 145],
      ['asphalt', 61],
    ]) {
      const res = safeCanvasTexture(256, 256, (c, w, h) => {
        c.fillStyle = `rgb(${base},${base},${base - 4})`;
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          const shade = base - 20 + Math.floor(rnd() * 40);
          c.fillStyle = `rgba(${shade},${shade},${shade},0.16)`;
          c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 1 + rnd() * 3);
        }
      });
      if (res) {
        res.tex.wrapS = res.tex.wrapT = THREE.RepeatWrapping;
        res.tex.repeat.set(key === 'terrazzo' ? 14 : 12, key === 'terrazzo' ? 14 : 12);
        this.m[key].map = res.tex;
      }
    }
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
      emissiveIntensity: 0.32,
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
    const bridgeH = isParking ? 3.36 : 3.45;
    const tag = isParking ? `${FLOORS[f]} 주차장` : mallFloorMeta(f, FLOORS[f]).mallCode;
    this.box(g, 'Mall_escalator_bridge_floor', [3.7, 0.16, 2.5], [-12.6, -0.08, 6.4], floorMat);
    this.box(g, 'Mall_escalator_bridge_ceiling', [3.7, 0.14, 2.5], [-12.6, bridgeH, 6.4], floorMat);
    this.box(g, 'Mall_bridge_glass_front', [3.5, 2.75, 0.06], [-12.6, 1.4, 5.18], this.m.glass);
    this.box(g, 'Mall_bridge_glass_back', [3.5, 2.75, 0.06], [-12.6, 1.4, 7.62], this.m.glass);
    this.box(g, 'Mall_bridge_led_soffit', [3.4, 0.04, 0.12], [-12.6, bridgeH - 0.12, 6.4], this.m.warmLed);
    this.box(g, 'Mall_bridge_frame_front', [3.6, 0.12, 0.14], [-12.6, 2.8, 5.18], trimMat);
    this.box(g, 'Mall_bridge_frame_back', [3.6, 0.12, 0.14], [-12.6, 2.8, 7.62], trimMat);
    this.sign(
      g,
      `Mall_link_sign_${FLOORS[f]}`,
      [`${tag} · 그랜드 몰 연결 브리지`, 'MALL ATRIUM  ↔  HOTEL ESCALATOR'],
      [-14.1, 2.75, 6.4],
      [2.1, 0.44],
      Math.PI / 2
    );
  }

  car(group, x, z, color, f, modelName = '몰 방문객 차량') {
    const c = new THREE.Group();
    c.name = 'Mall_parked_car';
    c.position.set(x, 0, z);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 });
    const carData = {
      action: 'parkingCar',
      mall: true,
      floorIndex: f,
      carModel: modelName,
      bayLabel: `${FLOORS[f]} 몰 주차장`,
      carId: `mall-${f}-${Math.round(x)}-${Math.round(z)}`,
    };
    const body = new THREE.Mesh(unitBox, bodyMat);
    body.scale.set(1.75, 0.56, 4.15);
    body.position.set(0, 0.5, 0);
    this.markInteractive(body, carData);
    c.add(body);

    const cabin = new THREE.Mesh(unitBox, this.m.glass);
    cabin.scale.set(1.48, 0.5, 2.15);
    cabin.position.set(0, 1.0, -0.1);
    this.markInteractive(cabin, carData);
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
    this.world.addObstacle(f, x - 0.92, x + 0.92, z - 2.15, z + 2.15);
  }

  buildParking(g, f) {
    // Unified B5-B1 underground garage matching HotelScene's z ∈ [8, 36] grid, columns (z=10,18,26,34),
    // red sprinkler pipes (z=11,19,27,34), and unbroken East-West cross-aisle at z = 21.8!
    const m = this.m;
    this.box(g, 'Mall_garage_floor', [36, 0.18, 28], [-32, -0.09, 22], m.concrete);
    this.box(g, 'Mall_garage_ceiling', [36, 0.16, 28], [-32, 3.34, 22], m.concrete);
    // North lift/escalator vestibule alcove (x ∈ [-32, -14], z ∈ [4, 8])
    this.box(g, 'Mall_garage_lift_vest_floor', [18, 0.18, 4], [-23, -0.09, 6], m.concrete);
    this.box(g, 'Mall_garage_lift_vest_ceil', [18, 0.16, 4], [-23, 3.34, 6], m.concrete);
    this.box(g, 'Mall_garage_vest_west', [0.2, 3.4, 4], [-32, 1.7, 6], m.concrete);
    this.box(g, 'Mall_garage_vest_north', [18, 3.4, 0.2], [-23, 1.7, 4], m.concrete);

    // Outer perimeter walls (West x=-50, South z=36, North z=8 left of vestibule)
    this.box(g, 'Mall_garage_west_wall', [0.22, 3.4, 28], [-50, 1.7, 22], m.concrete);
    this.box(g, 'Mall_garage_south_wall', [36, 3.4, 0.2], [-32, 1.7, 36], m.concrete);
    this.box(g, 'Mall_garage_north_wall_w', [18, 3.4, 0.2], [-41, 1.7, 8], m.concrete);

    // East wall segments along x = -14.08 leaving escalator bridge (z=5.2..7.6) & BOTH Hotel portals open cleanly
    for (const [z, d] of [
      [4.6, 1.2],
      [11.05, 6.9],
      [18.25, 1.5],
      [30.7, 10.6],
    ]) {
      this.box(g, 'Mall_garage_east_wall', [0.2, 3.4, d], [-14.08, 1.7, z], m.concrete);
    }
    for (const [z, d] of [
      [16.0, 3.0],
      [22.2, 6.4],
    ]) {
      this.box(g, 'Mall_hotel_portal_arch', [0.28, 0.12, d], [-14.08, 2.7, z], m.cyanLed);
    }

    // Continuous Asphalt Drive Aisles matching Hotel z=21.8 and z=16.0 + West/East North-South loops
    this.box(g, 'Mall_main_drive_aisle', [33, 0.012, 5.2], [-30.5, 0.015, 21.8], m.asphalt);
    this.box(g, 'Mall_north_drive_aisle', [33, 0.012, 3.0], [-30.5, 0.015, 16.0], m.asphalt);
    this.box(g, 'Mall_west_loop_aisle', [4.8, 0.012, 23], [-45.5, 0.015, 22], m.asphalt);
    this.box(g, 'Mall_lift_bay_aisle', [5.0, 0.012, 14], [-28.0, 0.015, 14.5], m.asphalt);
    for (let x = -45; x <= -15; x += 2.8) {
      this.box(g, 'Mall_aisle_dash', [1.4, 0.009, 0.09], [x, 0.026, 21.8], m.yellow);
      this.box(g, 'Mall_aisle_dash_n', [1.4, 0.009, 0.08], [x, 0.026, 16.0], m.yellow);
    }
    for (const x of [-25.3, -30.7]) {
      this.box(g, 'Mall_ped_marking', [0.055, 0.009, 13], [x, 0.028, 15.0], m.yellow);
    }

    // Standard Parking Stall Grids aligned cleanly clear of drive aisles
    for (let x = -42.5; x <= -16.5; x += 2.8) {
      this.box(g, 'Mall_stall_mark_S', [0.05, 0.008, 4.9], [x, 0.023, 28.4], m.white);
      if (x < -31.5 || x > -24.5) {
        this.box(g, 'Mall_stall_mark_N', [0.05, 0.008, 4.8], [x, 0.023, 11.4], m.white);
      }
    }
    this.box(g, 'Mall_stall_end_S', [26.5, 0.009, 0.05], [-29.5, 0.023, 30.9], m.white);

    // Consistent Column Grid matching Hotel Parking (z = 10, 18, 26, 34)
    for (const x of [-42, -33, -24, -16.5]) {
      for (const z of [10, 18, 26, 34]) {
        this.box(g, 'Mall_column', [0.52, 3.3, 0.52], [x, 1.65, z], m.concrete, f);
        this.box(g, 'Mall_col_wrap', [0.56, 0.55, 0.56], [x, 0.35, z], m.yellow);
        this.box(g, 'Mall_col_band', [0.57, 0.13, 0.57], [x, 0.35, z], m.black);
      }
    }

    // Consistent Ceiling Sprinkler Mains, Conduits, & LED Luminaires matching Hotel Parking
    for (const z of [11, 19, 27, 34]) {
      for (const x of [-43, -34, -25, -18]) {
        this.box(g, 'Mall_garage_LED', [2.3, 0.04, 0.14], [x, 3.2, z], m.warmLed);
      }
      this.rail(g, [-49, 2.98, z], [-14.2, 2.98, z], m.red, 0.045);
      this.rail(g, [-49, 3.1, z + 0.22], [-14.2, 3.1, z + 0.22], m.metal, 0.025);
    }

    // EV Superchargers cleanly mounted along West concrete wall outside west loop aisle
    for (const z of [12.0, 29.0]) {
      const evBox = this.box(g, 'Mall_EV_supercharger', [0.55, 1.65, 0.45], [-49.1, 0.85, z], m.white, f, {
        action: 'mallParking',
        floorIndex: f,
        label: `${FLOORS[f]} 350kW EV 초급속 충전소`,
      });
      evBox.userData.ev = true;
      this.box(g, 'Mall_EV_glow', [0.12, 1.3, 0.48], [-48.8, 0.9, z], m.cyanLed);
    }

    const palette = [0xe9ecef, 0x1d4d5e, 0x3b4d40, 0x8e3b36, 0x262d33, 0xc9b47c];
    const models = ['그랜드 EV SUV', '제네시스 G90', '포르쉐 타이칸', '메르세데스 S580', '아이오닉 6', 'BMW i7'];
    for (const [i, [x, z]] of [
      [-41.1, 28.4],
      [-35.5, 28.4],
      [-24.3, 28.4],
      [-18.7, 28.4],
      [-41.1, 11.4],
      [-18.7, 11.4],
    ].entries()) {
      this.car(g, x, z, palette[(i + f) % palette.length], f, models[(i + f) % models.length]);
    }

    this.sign(
      g,
      `Mall_parking_hotel_sign_${f}`,
      [`${FLOORS[f]} · 호텔 지하주차장 연결통로 →`, 'HOTEL PARKING GARAGE & VALET'],
      [-14.25, 2.85, 21.8],
      [3.8, 0.6],
      -Math.PI / 2
    );
    this.sign(
      g,
      `Mall_parking_lift_sign_${f}`,
      [`${FLOORS[f]} · 몰 전망 엘리베이터`, 'MALL PANORAMIC ELEVATOR  M1F~M5F'],
      [MALL_LIFT_X, 2.75, 8.6],
      [3.6, 0.58],
      0
    );
  }

  buildStorefront(g, f, spec) {
    // Rich walk-in retail storefront with glazed vitrine, brand fascia marquee, open doorway, counter, and products
    const {
      x,
      z,
      w = 6.6,
      d = 4.0,
      rotY = 0,
      brandKo,
      brandEn,
      action = 'mallShop',
      accentMat = this.m.champagne,
      wallMat = this.m.travertine,
      productColor = 0xd6b575,
    } = spec;
    const shop = new THREE.Group();
    shop.name = `Mall_store_${brandEn.replace(/\s+/g, '_')}`;
    shop.position.set(x, 0, z);
    shop.rotation.y = rotY;
    g.add(shop);

    const doorW = 2.4;
    const wingW = (w - doorW) / 2;
    // Back & Side enclosure walls (5.6m tall inside 7.0m double-height floor!)
    const wallH = 5.4;
    this.box(shop, 'Store_back_wall', [w, wallH, 0.18], [0, wallH / 2, -d / 2], wallMat);
    this.box(shop, 'Store_side_L', [0.18, wallH, d], [-w / 2, wallH / 2, 0], wallMat);
    this.box(shop, 'Store_side_R', [0.18, wallH, d], [w / 2, wallH / 2, 0], wallMat);
    this.box(shop, 'Store_soffit', [w + 0.2, 0.2, d + 0.2], [0, wallH, 0], wallMat);
    this.box(shop, 'Store_interior_led', [w - 0.8, 0.05, d - 0.8], [0, wallH - 0.14, 0], this.m.warmLed);

    // Front Glazed Display Windows flanking wide open entrance doorway (z = +d/2)
    for (const side of [-1, 1]) {
      const wx = side * (doorW / 2 + wingW / 2);
      this.box(shop, 'Store_display_base', [wingW, 0.55, 0.22], [wx, 0.275, d / 2], accentMat);
      this.box(shop, 'Store_window_glass', [wingW, 3.3, 0.06], [wx, 2.2, d / 2], this.m.glass);
      // Display mannequin/product cube inside front showcase
      const prodMat = new THREE.MeshStandardMaterial({ color: productColor, roughness: 0.35, metalness: 0.45 });
      const disp = this.box(shop, 'Store_showcase_item', [0.55, 1.05, 0.45], [wx, 1.08, d / 2 - 0.5], prodMat, null, {
        action,
        floorIndex: f,
        label: `${brandKo} (${brandEn})`,
      });
      disp.userData.storeName = brandKo;
    }

    // Glowing Storefront Marquee Header (y = 4.2m) & Brand Signboard
    this.box(shop, 'Store_marquee', [w, 1.55, 0.24], [0, 4.6, d / 2], this.m.charcoal);
    this.box(shop, 'Store_marquee_trim', [w + 0.08, 0.08, 0.28], [0, 3.84, d / 2], accentMat);
    this.sign(shop, `Store_sign_${brandEn}`, [brandEn, brandKo], [0, 4.55, d / 2 + 0.14], [Math.min(w - 0.5, 5.2), 1.05], 0);

    // Walk-in Checkout Counter & Interactive Merchandise Table
    const interactiveInfo = { action, floorIndex: f, label: `${brandKo} · ${brandEn}` };
    this.box(shop, 'Store_counter', [Math.min(w - 2.4, 3.2), 1.02, 0.85], [0, 0.51, -d / 2 + 1.0], accentMat, null, interactiveInfo);
    this.box(shop, 'Store_counter_top', [Math.min(w - 2.3, 3.3), 0.07, 0.94], [0, 1.06, -d / 2 + 1.0], this.m.terrazzo);

    const kiosk = this.box(shop, 'Store_feature_display', [1.4, 0.88, 0.95], [0, 0.44, 0.2], accentMat, null, interactiveInfo);
    kiosk.userData.storeName = brandKo;
    const glowProd = new THREE.MeshStandardMaterial({
      color: productColor,
      emissive: productColor,
      emissiveIntensity: 0.22,
      roughness: 0.3,
    });
    this.box(shop, 'Store_hero_product', [0.8, 0.38, 0.5], [0, 1.08, 0.2], glowProd, null, interactiveInfo);

    // Register compact physical obstacle ONLY on rear half / counter of store & side glass wings so player walks up cleanly
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const rotPt = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const [cx, cz] = rotPt(0, -d / 2 + 0.55);
    const halfX = Math.abs(c) * (w / 2 - 0.1) + Math.abs(s) * 0.7;
    const halfZ = Math.abs(s) * (w / 2 - 0.1) + Math.abs(c) * 0.7;
    this.world.addObstacle(f, cx - halfX, cx + halfX, cz - halfZ, cz + halfZ);
  }

  buildAtriumM1F(g) {
    // M1F (floor 5, 7.0m high: y = 0..7.0m) - Luxury Boutiques + Waterfall Garden + Direct Open Hotel Lobby Connection
    const m = this.m;
    this.box(g, 'Mall_M1F_floor', [35.8, 0.18, 32], [-32.1, -0.09, 20], m.terrazzo);
    this.box(g, 'Mall_M1F_north_wall', [36, MALL_STORY_H, 0.24], [-32, MALL_STORY_H / 2, 4], m.travertine);
    this.box(g, 'Mall_M1F_west_wall', [0.24, MALL_STORY_H, 32], [-50, MALL_STORY_H / 2, 20], m.travertine);

    // East boundary along x = -14.1:
    // - Open Escalator Link (z=5.2..7.6)
    // - Wide-open 12m Hotel Lobby Portal (z=10.0..22.0, y=0..4.2m -> overhead arch 4.2..7.0m)
    this.box(g, 'Mall_M1F_east_wall_nw', [0.24, MALL_STORY_H, 1.2], [-14.1, MALL_STORY_H / 2, 4.6], m.travertine);
    this.box(g, 'Mall_M1F_east_wall_mid', [0.24, MALL_STORY_H, 2.4], [-14.1, MALL_STORY_H / 2, 8.8], m.travertine);
    this.box(g, 'Mall_M1F_east_wall_s', [0.24, MALL_STORY_H, 14.0], [-14.1, MALL_STORY_H / 2, 29.0], m.travertine);
    this.box(g, 'Mall_M1F_lobby_arch', [0.28, 3.6, 12.0], [-14.1, 5.2, 16.0], m.travertine);
    this.box(g, 'Mall_M1F_lobby_arch_trim', [0.34, 0.14, 12.0], [-14.1, 3.42, 16.0], m.champagne);

    // Floor Slab Ceiling Rings (y = 7.0m = M2F floor!) leaving giant atrium void x ∈ [-41,-21], z ∈ [12,28]
    this.box(g, 'Mall_M1F_ceil_N', [36, 0.22, 8], [-32, MALL_STORY_H - 0.11, 8], m.white);
    this.box(g, 'Mall_M1F_ceil_S', [36, 0.22, 8], [-32, MALL_STORY_H - 0.11, 32], m.white);
    this.box(g, 'Mall_M1F_ceil_W', [9, 0.22, 16], [-45.5, MALL_STORY_H - 0.11, 20], m.white);
    this.box(g, 'Mall_M1F_ceil_E', [7, 0.22, 16], [-17.5, MALL_STORY_H - 0.11, 20], m.white);

    // 4 M1F Flagship Luxury Stores & Roastery Cafe
    this.buildStorefront(g, 5, {
      x: -44.2,
      z: 7.0,
      w: 8.4,
      d: 4.0,
      rotY: 0,
      brandEn: 'MAISON CHANEL',
      brandKo: 'M1F 샤넬 하이엔드 부티크',
      action: 'mallShop',
      accentMat: m.charcoal,
      productColor: 0xe6c87a,
    });
    this.buildStorefront(g, 5, {
      x: -18.5,
      z: 7.4,
      w: 6.4,
      d: 3.8,
      rotY: 0,
      brandEn: 'HERMÈS PARIS',
      brandKo: 'M1F 에르메스 플래그십',
      action: 'mallShop',
      accentMat: m.warmWood,
      productColor: 0xd97336,
    });
    this.buildStorefront(g, 5, {
      x: -43.5,
      z: 32.8,
      w: 9.0,
      d: 4.0,
      rotY: Math.PI,
      brandEn: 'ROLEX & CARTIER',
      brandKo: 'M1F 하이주얼리 워치 살롱',
      action: 'mallShop',
      accentMat: m.champagne,
      productColor: 0x70c7b4,
    });

    // Roastery Cafe Island (moved south/east of central lobby portal so walkway stays wide open)
    this.cyl(g, 'Mall_roastery_island', 2.2, 2.4, 1.05, [-18.2, 0.525, 25.0], m.champagne, 5, {
      action: 'mallCafe',
      floorIndex: 5,
      label: '더 현대 로스터리 · 시그니처 카페',
    });
    this.cyl(g, 'Mall_roastery_top', 2.45, 2.45, 0.1, [-18.2, 1.08, 25.0], m.terrazzo);
    this.box(g, 'Mall_roastery_canopy', [3.8, 0.14, 3.8], [-18.2, 3.2, 25.0], m.warmWood);
    this.box(g, 'Mall_roastery_light', [3.4, 0.05, 3.4], [-18.2, 3.1, 25.0], m.warmLed);
    this.sign(g, 'Mall_roastery_sign', ['THE HYUNDAI ROASTERY', 'M1F 시그니처 카페'], [-18.2, 3.55, 23.08], [3.4, 0.65], Math.PI);

    // 14m Waterfall Garden & Reflecting Pool (South-East Quadrant, z = 31.8)
    this.box(g, 'Mall_waterfall_pool_rim', [8.0, 0.28, 3.8], [-19.0, 0.14, 32.2], m.travertine, 5, {
      action: 'mallWaterfall',
      floorIndex: 5,
      label: '14m 워터폴 가든 & 미디어 폭포',
    });
    const poolWater = this.box(g, 'Mall_waterfall_pool', [7.4, 0.12, 3.2], [-19.0, 0.24, 32.2], m.water);
    poolWater.userData.dynamic = true;
    for (let s = 0; s < 3; s++) {
      this.box(g, `Mall_waterfall_step_${s}`, [5.2, 0.28 * (s + 1), 0.65], [-24.6, 0.14 * (s + 1), 30.8 - s * 0.7], m.warmWood, 5, {
        action: 'mallWaterfall',
        floorIndex: 5,
        label: '워터폴 가든 계단 라운지',
      });
    }

    // Central Court Indoor Trees (5m tall under 7m ceiling)
    for (const [px, pz] of [
      [-26.0, 20.0],
      [-34.0, 23.5],
    ]) {
      this.cyl(g, 'Mall_M1F_planter', 1.3, 1.15, 0.45, [px, 0.225, pz], m.travertine, 5);
      this.cyl(g, 'Mall_M1F_turf', 1.2, 1.2, 0.12, [px, 0.44, pz], m.turf);
      this.rail(g, [px, 0.45, pz], [px, 4.4, pz], m.warmWood, 0.11);
      this.sph(g, 'Mall_M1F_tree', 1.7, [px, 5.0, pz], m.leaf, [1.15, 1.1, 1.15]);
    }

    // Concierge Welcome Desk
    this.box(g, 'Mall_concierge_desk', [3.6, 1.02, 1.0], [-32.5, 0.51, 10.6], m.champagne, 5, {
      action: 'mallConcierge',
      floorIndex: 5,
      label: '그랜드 아트리움 몰 컨시어지 데스크',
    });
    this.box(g, 'Mall_concierge_top', [3.75, 0.08, 1.12], [-32.5, 1.05, 10.6], m.terrazzo);

    this.sign(
      g,
      'Mall_M1F_directory_sign',
      ['THE GRAND ATRIUM MALL · M1F (7M)', '명품관 · 14m 워터폴 가든 · M5F 그랜드 시네마 직행'],
      [-28.0, 5.4, 11.8],
      [6.0, 0.92],
      0
    );
  }

  buildGalleryFloor(g, f) {
    // M2F (floor 7), M3F (floor 9), M4F (floor 11) - each 7.0m tall (y + 0..7.0m)
    const m = this.m;
    const meta = mallFloorMeta(f, FLOORS[f]);

    // Four perimeter slabs around Central Atrium Void (x ∈ [-41, -21], z ∈ [12, 28])
    this.box(g, 'Mall_gallery_N', [36, 0.2, 8], [-32, -0.1, 8], m.terrazzo);
    this.box(g, 'Mall_gallery_S', [36, 0.2, 8], [-32, -0.1, 32], m.terrazzo);
    this.box(g, 'Mall_gallery_W', [9, 0.2, 16], [-45.5, -0.1, 20], m.terrazzo);
    this.box(g, 'Mall_gallery_E', [7, 0.2, 16], [-17.5, -0.1, 20], m.terrazzo);

    // 7.0m perimeter walls
    this.box(g, 'Mall_gallery_north_wall', [36, MALL_STORY_H, 0.22], [-32, MALL_STORY_H / 2, 4], m.travertine);
    this.box(g, 'Mall_gallery_west_wall', [0.22, MALL_STORY_H, 32], [-50, MALL_STORY_H / 2, 20], m.travertine);
    this.box(g, 'Mall_gallery_east_wall_n', [0.22, MALL_STORY_H, 1.2], [-14.1, MALL_STORY_H / 2, 4.6], m.travertine);
    this.box(g, 'Mall_gallery_east_wall_s', [0.22, MALL_STORY_H, 28.4], [-14.1, MALL_STORY_H / 2, 21.8], m.travertine);

    // Inner atrium glass balustrades + glowing cove fascia
    this.box(g, 'Mall_void_rail_N', [20, 1.15, 0.08], [-31, 0.575, 12.02], m.glass);
    this.box(g, 'Mall_void_fascia_N', [20.2, 0.34, 0.2], [-31, -0.08, 12.04], m.warmWood);
    this.box(g, 'Mall_void_led_N', [20.0, 0.06, 0.1], [-31, -0.26, 12.08], m.warmLed);

    this.box(g, 'Mall_void_rail_S', [20, 1.15, 0.08], [-31, 0.575, 27.98], m.glass);
    this.box(g, 'Mall_void_fascia_S', [20.2, 0.34, 0.2], [-31, -0.08, 27.96], m.warmWood);
    this.box(g, 'Mall_void_led_S', [20.0, 0.06, 0.1], [-31, -0.26, 27.92], m.warmLed);

    this.box(g, 'Mall_void_rail_W', [0.08, 1.15, 16], [-41.02, 0.575, 20], m.glass);
    this.box(g, 'Mall_void_fascia_W', [0.2, 0.34, 16], [-41.04, -0.08, 20], m.warmWood);
    this.box(g, 'Mall_void_rail_E', [0.08, 1.15, 16], [-20.98, 0.575, 20], m.glass);
    this.box(g, 'Mall_void_fascia_E', [0.2, 0.34, 16], [-20.96, -0.08, 20], m.warmWood);

    // Walkable Floating Atrium Skybridges on M3F (floor 9) & M4F (floor 11)
    if (f === 9 || f === 11) {
      this.box(g, `Mall_${meta.mallCode}_skybridge_deck`, [20.4, 0.22, 2.8], [-31, -0.11, 20], m.terrazzo, null, {
        action: 'mallSkybridge',
        floorIndex: f,
        label: `${meta.mallCode} 플로팅 아트리움 스카이브리지`,
      });
      this.box(g, `Mall_${meta.mallCode}_skybridge_soffit`, [20.2, 0.08, 2.6], [-31, -0.24, 20], m.warmLed);
      this.box(g, `Mall_${meta.mallCode}_skybridge_rail_N`, [20.2, 1.15, 0.06], [-31, 0.575, 18.62], m.glass);
      this.box(g, `Mall_${meta.mallCode}_skybridge_rail_S`, [20.2, 1.15, 0.06], [-31, 0.575, 21.38], m.glass);
      this.rail(g, [-41.1, 1.15, 18.62], [-20.9, 1.15, 18.62], m.champagne, 0.035);
      this.rail(g, [-41.1, 1.15, 21.38], [-20.9, 1.15, 21.38], m.champagne, 0.035);
    }

    // Themed Flagship Stores per Double-Height Floor (4 Stores on every floor)
    const storesByFloor = {
      7: [
        { x: -18.2, z: 16.5, w: 7.2, d: 3.4, rotY: -Math.PI / 2, brandEn: 'GENTLE MONSTER', brandKo: 'M2F 젠틀몬스터 아트 쇼룸', action: 'mallShop', accentMat: m.charcoal, productColor: 0xe69f54 },
        { x: -18.2, z: 25.0, w: 6.4, d: 3.4, rotY: -Math.PI / 2, brandEn: 'NIKE RISE SEOUL', brandKo: 'M2F 나이키 서울 플래그십', action: 'mallShop', accentMat: m.darkOak, productColor: 0xd9483b },
        { x: -38.5, z: 6.6, w: 7.6, d: 3.6, rotY: 0, brandEn: 'ADER ERROR', brandKo: 'M2F 아더에러 컨템포러리', action: 'mallShop', accentMat: m.steel, productColor: 0x3b6fd9 },
        { x: -36.5, z: 33.0, w: 8.6, d: 3.8, rotY: Math.PI, brandEn: 'OLIVE YOUNG LUXE', brandKo: 'M2F 프리미엄 뷰티 라운지', action: 'mallShop', accentMat: m.champagne, productColor: 0x73c97b },
      ],
      9: [
        { x: -18.2, z: 15.5, w: 7.2, d: 3.4, rotY: -Math.PI / 2, brandEn: 'APPLE GRAND ATRIUM', brandKo: 'M3F 애플 플래그십 스토어', action: 'mallShop', accentMat: m.warmWood, productColor: 0xc2ccd6 },
        { x: -18.2, z: 25.2, w: 6.4, d: 3.4, rotY: -Math.PI / 2, brandEn: 'GALAXY AI STUDIO', brandKo: 'M3F 삼성 갤럭시 스튜디오', action: 'mallShop', accentMat: m.charcoal, productColor: 0x4fb8ff },
        { x: -46.8, z: 20.0, w: 8.4, d: 3.6, rotY: Math.PI / 2, brandEn: 'SONY PLAYSTATION', brandKo: 'M3F 소니 & 플레이스테이션 존', action: 'mallShop', accentMat: m.charcoal, productColor: 0x5c7cfa },
        { x: -36.5, z: 33.0, w: 8.6, d: 3.8, rotY: Math.PI, brandEn: 'LEGO & ART TOY', brandKo: 'M3F 레고 브랜드 스토어', action: 'mallShop', accentMat: m.vermilion, productColor: 0xf2c94c },
      ],
      11: [
        { x: -18.2, z: 15.5, w: 7.2, d: 3.4, rotY: -Math.PI / 2, brandEn: 'GORDON RAMSAY BURGER', brandKo: 'M4F 고든램지 시그니처 다이닝', action: 'mallFood', accentMat: m.darkOak, productColor: 0xe6843c },
        { x: -18.2, z: 25.2, w: 6.4, d: 3.4, rotY: -Math.PI / 2, brandEn: 'SUSHI SORA OMAKASE', brandKo: 'M4F 스시 소라 오마카세', action: 'mallFood', accentMat: m.warmWood, productColor: 0xf2b591 },
        { x: -46.8, z: 20.0, w: 8.4, d: 3.6, rotY: Math.PI / 2, brandEn: 'OSTERIA TRUFFLE', brandKo: 'M4F 오스테리아 이탈리안', action: 'mallFood', accentMat: m.champagne, productColor: 0xc44b4b },
        { x: -36.5, z: 33.0, w: 8.6, d: 3.8, rotY: Math.PI, brandEn: 'KYOTO MATCHA LAB', brandKo: 'M4F 교토 말차 디저트 랩', action: 'mallFood', accentMat: m.leaf, productColor: 0x62b56c },
      ],
    };
    for (const storeSpec of storesByFloor[f] || []) {
      this.buildStorefront(g, f, storeSpec);
    }

    // On M4F (floor 11), add indoor biophilic dining planter groves along the South/North promenade
    if (f === 11) {
      for (const [tx, tz] of [
        [-25.5, 31.2],
        [-29.5, 31.2],
        [-44.0, 10.2],
      ]) {
        this.cyl(g, 'Mall_M4F_planter', 0.95, 0.85, 0.45, [tx, 0.225, tz], m.travertine, f, {
          action: 'mallForest',
          floorIndex: f,
          label: 'M4F 사운즈 가든 실내 정원',
        });
        this.rail(g, [tx, 0.4, tz], [tx, 3.6, tz], m.warmWood, 0.08);
        this.sph(g, 'Mall_M4F_canopy', 1.35, [tx, 4.1, tz], m.leaf, [1.1, 1.0, 1.1]);
      }
    }

    this.sign(
      g,
      `Mall_${meta.mallCode}_sign`,
      [meta.ko, meta.en],
      [-28.0, 5.4, 11.8],
      [5.4, 0.85],
      0
    );
  }

  buildTopCinemaM5F(g) {
    // M5F (floorIndex = 13, y = 28.0..35.0m, 7m height) - Top-Floor GRAND CINEMA MULTIPLEX (IMAX) + Sounds Forest Observatory
    const m = this.m;
    const f = 13;
    // Full deck minus twin atrium lightwells: [-38.5, -31.5] x [16, 24] & [-24.5, -18.5] x [16, 24]
    this.box(g, 'Mall_M5F_north', [36, 0.2, 12], [-32, -0.1, 10], m.terrazzo);
    this.box(g, 'Mall_M5F_south', [36, 0.2, 12], [-32, -0.1, 30], m.terrazzo);
    this.box(g, 'Mall_M5F_west_strip', [11.5, 0.2, 8], [-44.25, -0.1, 20], m.darkOak);
    this.box(g, 'Mall_M5F_center_strip', [7.0, 0.2, 8], [-28.0, -0.1, 20], m.terrazzo);
    this.box(g, 'Mall_M5F_east_strip', [4.5, 0.2, 8], [-16.25, -0.1, 20], m.terrazzo);

    // Outer walls (7m tall up to skylights at y=35m)
    this.box(g, 'Mall_M5F_north_wall', [36, MALL_STORY_H, 0.22], [-32, MALL_STORY_H / 2, 4], m.travertine);
    this.box(g, 'Mall_M5F_west_wall', [0.22, MALL_STORY_H, 32], [-50, MALL_STORY_H / 2, 20], m.charcoal);
    this.box(g, 'Mall_M5F_east_wall_n', [0.22, MALL_STORY_H, 1.2], [-14.1, MALL_STORY_H / 2, 4.6], m.travertine);
    this.box(g, 'Mall_M5F_east_wall_s', [0.22, MALL_STORY_H, 28.4], [-14.1, MALL_STORY_H / 2, 21.8], m.glass);

    // Twin Atrium Lightwell Railings
    for (const [cx, w, cz, d] of [
      [-35.0, 7.0, 20.0, 8.0],
      [-21.5, 6.0, 20.0, 8.0],
    ]) {
      this.box(g, 'Mall_lightwell_rail_N', [w, 1.15, 0.08], [cx, 0.575, cz - d / 2], m.glass);
      this.box(g, 'Mall_lightwell_rail_S', [w, 1.15, 0.08], [cx, 0.575, cz + d / 2], m.glass);
      this.box(g, 'Mall_lightwell_rail_W', [0.08, 1.15, d], [cx - w / 2, 0.575, cz], m.glass);
      this.box(g, 'Mall_lightwell_rail_E', [0.08, 1.15, d], [cx + w / 2, 0.575, cz], m.glass);
    }

    // 1. Walk-in IMAX Auditorium 1 in West Cinema Wing (x ∈ [-49.8, -39.5], z ∈ [13.5, 35.0])
    // Acoustic partition separating Auditorium from Atrium Lightwell (open front entrance at z = 14.5..17.5)
    this.box(g, 'Cinema_east_wall_s', [0.25, 6.4, 15.0], [-39.6, 3.2, 27.5], m.charcoal);
    this.box(g, 'Cinema_east_lintel', [0.25, 3.2, 4.5], [-39.6, 4.8, 15.75], m.charcoal);
    this.box(g, 'Cinema_ceiling', [10.4, 0.25, 22.0], [-44.8, 6.4, 24.5], m.charcoal);
    this.box(g, 'Cinema_marquee_strip', [9.0, 0.1, 0.14], [-44.5, 5.9, 13.8], m.cyanLed);
    this.sign(g, 'Cinema_auditorium_sign', ['IMAX LASER · HALL 1', 'NOW PLAYING · THE GRAND HORIZON'], [-44.5, 5.3, 13.7], [4.8, 0.85], 0);

    // Giant 9.4m × 5.2m Glowing Animated IMAX Cinema Screen at z = 34.2 facing North (-Z)
    const screenRes = safeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#081326';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1b4973';
      ctx.fillRect(40, 40, w - 80, h - 80);
      ctx.fillStyle = '#f5cb75';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IMAX · THE GRAND HORIZON', w / 2, h / 2 - 20);
      ctx.fillStyle = '#79f2e1';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('4K LASER DOLBY ATMOS EXPERIENCE', w / 2, h / 2 + 46);
    });
    if (screenRes) {
      const sMat = new THREE.MeshStandardMaterial({
        map: screenRes.tex,
        emissiveMap: screenRes.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
        roughness: 0.18,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 5.0), sMat);
      screen.name = 'Mall_IMAX_screen';
      screen.position.set(-44.6, 3.4, 34.4);
      screen.rotation.y = Math.PI;
      screen.userData.dynamic = true;
      this.markInteractive(screen, {
        action: 'mallCinemaScreen',
        floorIndex: f,
        label: 'M5F IMAX 레이저 스크린 · 영화 관람하기',
      });
      g.add(screen);
      this.cinemaScreen = screenRes;
    }

    // 3 Rows of Plush Crimson Velvet Cinema Seats (Rows C, B, A facing z = +34.4)
    for (const [rowIdx, sz] of [23.0, 25.4, 27.8].entries()) {
      for (let col = 0; col < 5; col++) {
        const sx = -47.4 + col * 1.4;
        const seatInfo = {
          action: 'mallCinemaSeat',
          floorIndex: f,
          seatX: sx,
          seatZ: sz - 0.15,
          seatYaw: Math.PI,
          label: `IMAX VIP ${['C', 'B', 'A'][rowIdx]}열 ${col + 1}번 좌석 착석`,
        };
        this.box(g, 'Cinema_seat_base', [0.78, 0.45, 0.72], [sx, 0.25 + (2 - rowIdx) * 0.22, sz], m.cinemaRed, null, seatInfo);
        this.box(g, 'Cinema_seat_back', [0.78, 0.85, 0.18], [sx, 0.72 + (2 - rowIdx) * 0.22, sz - 0.3], m.cinemaRed, null, seatInfo);
      }
      this.box(g, 'Cinema_riser', [8.4, (2 - rowIdx) * 0.22 + 0.05, 1.8], [-44.6, ((2 - rowIdx) * 0.22) / 2, sz], m.charcoal);
    }

    // 2. Ticket Box Office & Popcorn Concession Bar along North-East & North-West Promenade
    this.buildStorefront(g, f, {
      x: -18.5,
      z: 9.2,
      w: 6.4,
      d: 3.4,
      rotY: 0,
      brandEn: 'GRAND CINEMA TICKETS',
      brandKo: 'M5F 그랜드 시네마 매표소',
      action: 'mallCinemaTicket',
      accentMat: m.charcoal,
      productColor: 0xf4c45c,
    });
    this.buildStorefront(g, f, {
      x: -38.5,
      z: 8.6,
      w: 7.4,
      d: 3.4,
      rotY: 0,
      brandEn: 'GOURMET POPCORN BAR',
      brandKo: 'M5F 카라멜 팝콘 & 나초 스낵바',
      action: 'mallCinemaSnack',
      accentMat: m.vermilion,
      productColor: 0xffe075,
    });

    // Illuminated Movie Poster Lightboxes along North Corridor
    for (const [px, title] of [
      [-45.0, 'DUNE: ATRIUM'],
      [-32.0, 'SEOUL SKYLINE'],
      [-23.5, 'STARLIGHT 4K'],
    ]) {
      this.box(g, 'Cinema_poster_box', [1.8, 2.5, 0.14], [px, 1.85, 4.25], m.warmLed, null, {
        action: 'mallCinemaTicket',
        floorIndex: f,
        label: `${title} 예매 키오스크`,
      });
    }

    // 3. Rooftop Sounds Forest Botanical Conservatory in M5F South-East Wing (x ∈ [-32, -16], z ∈ [26, 34])
    this.box(g, 'Mall_forest_lawn', [13.5, 0.32, 6.2], [-25.0, 0.16, 30.2], m.turf, f, {
      action: 'mallForest',
      floorIndex: f,
      label: 'M5F 사운즈 포레스트 Sky 정원',
    });
    for (const [tx, tz, h] of [
      [-29.5, 29.0, 3.4],
      [-25.0, 31.2, 3.8],
      [-20.5, 29.0, 3.2],
      [-17.2, 31.0, 3.0],
    ]) {
      this.cyl(g, 'Mall_tree_trunk', 0.14, 0.19, h * 0.72, [tx, h * 0.36, tz], m.warmWood, f);
      this.sph(g, 'Mall_tree_canopy', 1.65, [tx, h * 0.85 + 0.9, tz], m.leaf, [1.15, 0.9, 1.15], {
        action: 'mallForest',
        floorIndex: f,
        label: '사운즈 포레스트 하늘 수목원',
      });
    }

    this.sign(
      g,
      'Mall_M5F_banner',
      ['M5F GRAND CINEMA · IMAX MULTIPLEX & SOUNDS FOREST', '시네마 매표소 · IMAX 상영관 · 사운즈 포레스트 천창 정원'],
      [-28.0, 5.4, 11.8],
      [6.4, 0.92],
      0
    );
  }

  buildAtriumLibrarySpine() {
    // 14m Towering Starfield Atrium Library spanning M1F (y=0) to M3F floor slab (y=14.0m) along x = -47.8, z ∈ [13.5, 26.5]
    const lib = new THREE.Group();
    lib.name = 'Mall_Starfield_Atrium_Library';
    const m = this.m;

    this.box(lib, 'Mall_library_backdrop', [0.35, 14.0, 12.6], [-47.8, 7.0, 20.0], m.darkOak);
    this.box(lib, 'Mall_library_reading_plinth', [1.8, 0.52, 10.6], [-46.7, 0.26, 20.0], m.warmWood, 5, {
      action: 'mallLibrary',
      label: '14m 별마당 아트리움 서가 · 북라운지',
    });

    for (let tier = 0; tier < 16; tier++) {
      const y = 0.85 + tier * 0.82;
      this.box(lib, 'Mall_library_shelf', [0.85, 0.06, 12.0], [-47.35, y, 20.0], m.warmWood);
      this.box(lib, 'Mall_library_led', [0.12, 0.04, 11.8], [-46.96, y + 0.05, 20.0], m.warmLed);
      for (let slot = 0; slot < 8; slot++) {
        const z = 14.8 + slot * 1.48;
        const bMat = m.bookColors[(tier + slot) % m.bookColors.length];
        this.box(lib, 'Mall_library_books', [0.52, 0.56, 1.18], [-47.35, y + 0.31, z], bMat, null, {
          action: 'mallLibrary',
          label: '별마당 아트리움 컬처 서가',
        });
      }
    }

    for (const z of [13.7, 17.8, 22.2, 26.3]) {
      this.box(lib, 'Mall_library_rib', [0.95, 14.0, 0.24], [-47.3, 7.0, z], m.champagne);
    }

    this.sign(lib, 'Mall_library_emblem', ['STARFIELD ATRIUM LIBRARY · 14M', 'CULTURE BOOK LOUNGE (M1F - M2F)'], [-46.8, 10.8, 20.0], [4.6, 0.8], Math.PI / 2);
    this.root.add(lib);
  }

  buildWaterfallTower() {
    // 14m Waterfall Garden cascade falling across double-height M1F-M2F into M1F Reflecting Pool
    const wf = new THREE.Group();
    wf.name = 'Mall_12m_Waterfall_Garden';
    const m = this.m;

    this.box(wf, 'Mall_waterfall_backdrop', [5.8, 14.0, 0.45], [-19.0, 7.0, 34.0], m.travertine, null, {
      action: 'mallWaterfall',
      label: '14m 워터폴 가든 · 수직 폭포 정원',
    });

    for (let k = 0; k < 5; k++) {
      this.box(wf, 'Mall_waterfall_planter_ledge', [4.8, 0.45, 0.65], [-19.0, 2.2 + k * 2.5, 33.5], m.moss);
    }

    for (let i = 0; i < 2; i++) {
      const sheet = this.box(
        wf,
        `Mall_waterfall_flow_${i}`,
        [2.2, 13.0, 0.08],
        [-20.1 + i * 2.2, 6.7, 33.15],
        m.water,
        null,
        { action: 'mallWaterfall', label: '14m 워터폴 가든' }
      );
      sheet.userData.dynamic = true;
      sheet.userData.baseY = 6.7;
      sheet.userData.phase = i * 1.4;
      this.waterfallSheets.push(sheet);
    }

    this.box(wf, 'Mall_waterfall_crest_led', [5.6, 0.14, 0.4], [-19.0, 13.6, 33.4], m.cyanLed);
    this.root.add(wf);
  }

  buildExterior() {
    const ext = this.exterior;
    const m = this.m;
    const roofY = MALL_ROOF_Y; // 35.0m (matches 10F Grand Hotel roof height!)

    // 1. Diagrid Glass Skylight Roof & RSHP-inspired Vermilion Red Steel Trusses at y = 35.0m
    this.box(ext, 'Mall_skylight_glass_roof', [36.4, 0.1, 32.4], [-32, roofY + 0.35, 20], m.skylightGlass);

    for (let x = -48; x <= -16; x += 6.4) {
      this.rail(ext, [x, roofY + 0.3, 4], [x, roofY + 0.3, 36], m.white, 0.1);
    }
    for (let z = 6; z <= 34; z += 5.6) {
      this.rail(ext, [-50, roofY + 0.3, z], [-14, roofY + 0.3, z], m.white, 0.1);
    }
    for (let k = -3; k <= 3; k++) {
      this.rail(ext, [-50, roofY + 0.32, Math.max(4, Math.min(36, 20 + k * 5))], [-14, roofY + 0.32, Math.max(4, Math.min(36, 20 - k * 5))], m.champagne, 0.06);
    }

    for (const x of [-42, -32, -22]) {
      this.rail(ext, [x, roofY, 4.2], [x, roofY + 5.2, 11.5], m.vermilion, 0.18);
      this.rail(ext, [x, roofY + 5.2, 11.5], [x, roofY + 0.6, 20.0], m.vermilion, 0.13);
      this.rail(ext, [x, roofY + 5.2, 11.5], [x, roofY + 0.6, 35.5], m.steel, 0.055);
      this.rail(ext, [x, roofY, 35.8], [x, roofY + 5.2, 28.5], m.vermilion, 0.18);
      this.rail(ext, [x, roofY + 5.2, 28.5], [x, roofY + 0.6, 20.0], m.vermilion, 0.13);
    }
    this.rail(ext, [-44, roofY + 5.2, 11.5], [-20, roofY + 5.2, 11.5], m.vermilion, 0.15);
    this.rail(ext, [-44, roofY + 5.2, 28.5], [-20, roofY + 5.2, 28.5], m.vermilion, 0.15);

    // 2. Full 35m Double-Height South Glass Curtain Wall (z = 36) with Entrance Gap at x ∈ [-34, -30], y ∈ [0, 3.6]
    const totalH = roofY;
    this.box(ext, 'Mall_curtain_wall_SW', [16.0, totalH, 0.12], [-42.0, totalH / 2, 36.0], m.glass);
    this.box(ext, 'Mall_curtain_wall_SE', [16.0, totalH, 0.12], [-22.0, totalH / 2, 36.0], m.glass);
    this.box(ext, 'Mall_curtain_wall_header', [4.0, totalH - 3.6, 0.12], [-32.0, 3.6 + (totalH - 3.6) / 2, 36.0], m.glass);
    this.box(ext, 'Mall_west_curtain_skin', [0.1, totalH, 32.0], [-50.1, totalH / 2, 20.0], m.glass);

    // 3. Parametric Wave Fins + Vertical DMX RGBW LED Facade Strips
    for (let i = 0; i <= 18; i++) {
      const x = -49.5 + i * 1.95;
      if (Math.abs(x + 32.0) < 2.2) continue;
      const wave = 0.6 + Math.sin(i * 0.45) * 0.4;
      this.box(ext, `Mall_wave_fin_${i}`, [0.12, totalH + 0.6, wave], [x, totalH / 2 + 0.2, 36.25 + wave * 0.5], m.white);
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

    // Horizontal double-height express floor bands (every 7.0m: M1F..M5F)
    for (let s = 0; s <= 5; s++) {
      this.box(ext, `Mall_spandrel_S_${s}`, [36.2, 0.34, 0.3], [-32.0, s * MALL_STORY_H, 36.1], m.charcoal);
    }

    // 4. Anamorphic 3D Digital Media Facade Wall (y = 14m..23m)
    const mediaCanvas = safeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#0c1626';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#173854';
      ctx.fillRect(24, 24, w - 48, h - 48);
      ctx.fillStyle = '#d9b46c';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE GRAND ATRIUM MALL', w / 2, h / 2 - 22);
      ctx.fillStyle = '#6fe7db';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('LUXURY · STARFIELD LIBRARY · IMAX CINEMA', w / 2, h / 2 + 44);
    });
    if (mediaCanvas) {
      const mediaMat = new THREE.MeshStandardMaterial({
        map: mediaCanvas.tex,
        emissiveMap: mediaCanvas.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.65,
        roughness: 0.22,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 7.6), mediaMat);
      screen.name = 'Mall_anamorphic_media_facade';
      screen.position.set(-41.0, 17.5, 36.78);
      screen.userData.dynamic = true;
      this.markInteractive(screen, { action: 'mallMediaWall', label: '아나모픽 3D LED 미디어 파사드' });
      ext.add(screen);
      this.mediaWall = { ...mediaCanvas, mesh: screen };
    }

    // 5. Entrance Canopy & Automated Sliding Glass Doors at x = -32.0, z = 36.0
    this.box(ext, 'Mall_entrance_canopy', [9.2, 0.28, 4.6], [-32.0, 3.85, 38.3], m.charcoal);
    this.box(ext, 'Mall_entrance_canopy_trim', [9.3, 0.14, 4.7], [-32.0, 4.02, 38.3], m.champagne);
    this.box(ext, 'Mall_entrance_soffit_led', [8.4, 0.05, 3.8], [-32.0, 3.69, 38.3], m.warmLed);
    this.sign(
      ext,
      'Mall_facade_brand_sign',
      ['THE GRAND ATRIUM MALL', 'LUXURY · LIBRARY · GRAND CINEMA'],
      [-32.0, 4.55, 40.55],
      [6.8, 0.9],
      0
    );

    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(unitBox, m.glass);
      panel.name = side < 0 ? 'Mall_entrance_door_L' : 'Mall_entrance_door_R';
      panel.scale.set(1.95, 3.45, 0.08);
      panel.position.set(-32.0 + side * 0.98, 1.725, 35.95);
      panel.userData = { dynamic: true, closedX: -32.0 + side * 0.98, openOffset: side * 1.75 };
      ext.add(panel);
      this.entranceDoors.push(panel);
    }

    // 6. West Outdoor Plaza (x ∈ [-50, -14], z ∈ [36, 47.5]) connecting to Hotel Entry Plaza
    this.box(ext, 'Mall_outdoor_plaza', [36.2, 0.16, 11.8], [-32.0, -0.08, 41.9], m.terrazzo);
    for (const [px, pz] of [
      [-45.5, 41.0],
      [-21.0, 41.0],
    ]) {
      this.cyl(ext, 'Mall_plaza_planter', 0.8, 0.75, 0.45, [px, 0.225, pz], m.concrete, 5);
      this.rail(ext, [px, 0.4, pz], [px, 2.7, pz], m.warmWood, 0.075);
      this.sph(ext, 'Mall_plaza_tree', 1.15, [px, 3.1, pz], m.leaf, [1.05, 1.15, 1.05]);
    }
    const sculpture = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.14, 14, 36), m.champagne);
    sculpture.name = 'Mall_plaza_kinetic_sculpture';
    sculpture.position.set(-22.0, 1.85, 43.2);
    sculpture.userData.dynamic = true;
    this.markInteractive(sculpture, { action: 'mallMediaWall', label: '몰 플라자 키네틱 아트 오브제' });
    ext.add(sculpture);
    this.box(ext, 'Mall_sculpture_plinth', [2.2, 0.55, 2.2], [-22.0, 0.275, 43.2], m.travertine, 5);
    this.plazaSculpture = sculpture;
  }

  buildPanoramicElevator() {
    // Independent Mall Panoramic Glass Elevator at (MALL_LIFT_X = -28.0, MALL_LIFT_Z = 6.2)
    // Serves B5..B1 (0..4) + double-height M1F..M5F (5, 7, 9, 11, 13) up to 35m height!
    const g = this.elevatorGroup;
    const m = this.m;
    const bx = MALL_LIFT_X;
    const bz = MALL_LIFT_Z;
    const shaftBot = -5 * PITCH - 0.5; // -18.0
    const shaftTop = MALL_ROOF_Y + 0.6; // 35.6
    const shaftH = shaftTop - shaftBot;
    const shaftMidY = (shaftTop + shaftBot) / 2;

    for (const [ox, oz] of [
      [-1.25, -1.1],
      [1.25, -1.1],
      [-1.25, 1.15],
      [1.25, 1.15],
    ]) {
      this.box(g, 'Mall_shaft_mullion', [0.1, shaftH, 0.1], [bx + ox, shaftMidY, bz + oz], m.charcoal);
    }
    this.box(g, 'Mall_shaft_glass_N', [2.5, shaftH, 0.05], [bx, shaftMidY, bz - 1.1], m.glass);
    this.box(g, 'Mall_shaft_glass_W', [0.05, shaftH, 2.25], [bx - 1.25, shaftMidY, bz], m.glass);
    this.box(g, 'Mall_shaft_glass_E', [0.05, shaftH, 2.25], [bx + 1.25, shaftMidY, bz], m.glass);

    // Front shaft upper glass curtain on double-height mall stories (y = 3.5..7.0 above each portal)
    for (const f of MALL_VALID_FLOORS) {
      const fy = (f - 5) * PITCH;
      const meta = mallFloorMeta(f, FLOORS[f]);
      const pierH = f < 5 ? PITCH : MALL_STORY_H;

      this.box(g, 'Mall_landing_pier_L', [0.68, pierH, 0.12], [bx - 0.91, fy + pierH / 2, bz + 1.15], m.champagne);
      this.box(g, 'Mall_landing_pier_R', [0.68, pierH, 0.12], [bx + 0.91, pierH, bz + 1.15].map((v, i) => (i === 1 ? fy + pierH / 2 : v)), m.champagne);
      this.box(g, 'Mall_landing_header', [1.14, 1.05, 0.14], [bx, fy + 3.0, bz + 1.15], m.champagne);
      if (f >= 5) {
        this.box(g, 'Mall_landing_upper_glass', [1.14, MALL_STORY_H - PITCH, 0.05], [bx, fy + 5.25, bz + 1.15], m.glass);
      }

      // Center-parting landing doors
      const doorGroup = new THREE.Group();
      doorGroup.name = `Mall_landing_door_${meta.mallCode}`;
      doorGroup.position.set(bx, fy, bz + 1.12);
      const lDoor = new THREE.Mesh(unitBox, m.glass);
      lDoor.scale.set(0.57, 2.45, 0.045);
      lDoor.position.set(-0.285, 1.225, 0);
      lDoor.userData.dynamic = true;
      const rDoor = new THREE.Mesh(unitBox, m.glass);
      rDoor.scale.set(0.57, 2.45, 0.045);
      rDoor.position.set(0.285, 1.225, 0);
      rDoor.userData.dynamic = true;
      doorGroup.add(lDoor, rDoor);
      g.add(doorGroup);
      this.mallLandingDoors[f] = { left: lDoor, right: rDoor };

      // Live landing floor indicator above doorway
      const disp = safeCanvasTexture(256, 96, (ctx, w, h) => {
        ctx.fillStyle = '#0e1720';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f2c879';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('M1F', w / 2, 60);
      });
      if (disp) {
        const dMat = new THREE.MeshStandardMaterial({
          map: disp.tex,
          emissiveMap: disp.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.72,
        });
        const dMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.34), dMat);
        dMesh.name = `Mall_landing_display_${meta.mallCode}`;
        dMesh.position.set(bx, fy + 2.82, bz + 1.24);
        dMesh.userData.dynamic = true;
        g.add(dMesh);
        this.mallLandingDisplays[f] = { ...disp, lastKey: '' };
      }

      // Large, effortless-to-click Hall Call Plate on front-right jamb (x = bx + 0.88, z = bz + 1.26)
      const plate = this.box(g, `Mall_hall_plate_${meta.mallCode}`, [0.3, 0.56, 0.06], [bx + 0.88, fy + 1.18, bz + 1.22], m.charcoal);
      plate.userData.dynamic = true;
      if (f < 13) {
        const upBtn = this.makeCopButton(
          g,
          [bx + 0.88, fy + 1.32, bz + 1.27],
          [0.16, 0.16, 0.05],
          {
            action: 'mallHall',
            floorIndex: f,
            direction: 1,
            label: `${meta.mallCode} 상행 호출`,
          },
          '▲'
        );
        this.mallHallButtons.push(upBtn);
      }
      if (f > 0) {
        const dnBtn = this.makeCopButton(
          g,
          [bx + 0.88, fy + 1.06, bz + 1.27],
          [0.16, 0.16, 0.05],
          {
            action: 'mallHall',
            floorIndex: f,
            direction: -1,
            label: `${meta.mallCode} 하행 호출`,
          },
          '▼'
        );
        this.mallHallButtons.push(dnBtn);
      }
    }

    // Counterweight + 2 Hoist Ropes
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

    this.box(car, 'Mall_car_jamb_L', [0.54, 2.44, 0.08], [-0.78, 1.22, 0.92], m.champagne);
    this.box(car, 'Mall_car_jamb_R', [0.54, 2.44, 0.08], [0.78, 1.22, 0.92], m.champagne);

    // Interior COP Panel on Right Jamb AND Side-Wall Handrail Console (so buttons are effortless to click from any direction!)
    const copPlateR = this.box(car, 'Mall_car_cop_plate_R', [0.42, 1.38, 0.05], [0.78, 1.28, 0.86], m.charcoal);
    copPlateR.userData.dynamic = true;
    const copPlateSide = this.box(car, 'Mall_car_cop_plate_side', [0.05, 1.38, 0.44], [0.99, 1.28, 0.18], m.charcoal);
    copPlateSide.userData.dynamic = true;
    for (const [idx, f] of MALL_VALID_FLOORS.entries()) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bxOff = 0.69 + col * 0.17;
      const byOff = 0.92 + row * 0.15;
      const code = f < 5 ? FLOORS[f] : mallFloorMeta(f).mallCode;
      const btn = this.makeCopButton(
        car,
        [bxOff, byOff, 0.82],
        [0.13, 0.105, 0.04],
        {
          action: 'mallCar',
          floorIndex: f,
          label: `몰 ${code}층 선택`,
        },
        code
      );
      this.mallCarButtons.push(btn);

      // Accessible side-wall mirrored COP button facing inward (-X)
      const sideBtn = this.makeCopButton(
        car,
        [0.95, byOff, 0.09 + col * 0.18],
        [0.04, 0.105, 0.14],
        {
          action: 'mallCar',
          floorIndex: f,
          label: `몰 ${code}층 선택`,
        },
        code
      );
      this.mallCarButtons.push(sideBtn);
    }
    for (const [bxOff, action, keyLabel, title] of [
      [0.64, 'mallOpen', '◀▶', '문 열림'],
      [0.78, 'mallClose', '▶◀', '문 닫힘'],
      [0.92, 'mallAlarm', '🚨', '비상 호출'],
    ]) {
      const b = this.makeCopButton(car, [bxOff, 0.74, 0.82], [0.11, 0.095, 0.04], { action, label: title }, keyLabel);
      this.mallCarButtons.push(b);
    }

    const copDisp = safeCanvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#0f1722';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f2c879';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M1F', w / 2, 72);
    });
    if (copDisp) {
      const sMat = new THREE.MeshStandardMaterial({
        map: copDisp.tex,
        emissiveMap: copDisp.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.75,
      });
      const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), sMat);
      sMesh.name = 'Mall_car_cop_screen';
      sMesh.position.set(0.78, 1.82, 0.82);
      sMesh.rotation.y = Math.PI;
      sMesh.userData.dynamic = true;
      car.add(sMesh);
      this.mallCopDisplay = { ...copDisp, lastKey: '' };
    }

    g.add(car);
    this.mallCar = car;
  }

  makeCopButton(group, pos, size, userData, textLabel = '') {
    let mat;
    if (textLabel) {
      const lbl = safeCanvasTexture(128, 96, (ctx, w, h) => {
        ctx.fillStyle = '#24303a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f5e8c8';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(textLabel, w / 2, 62);
      });
      mat = new THREE.MeshStandardMaterial({
        color: 0xd0d8de,
        map: lbl?.tex ?? null,
        roughness: 0.32,
        metalness: 0.35,
        emissive: 0x000000,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: 0x9aa6af,
        roughness: 0.35,
        metalness: 0.45,
        emissive: 0x000000,
      });
    }
    const m = new THREE.Mesh(unitBox, mat);
    m.name = `Mall_btn_${userData.action}_${userData.floorIndex ?? ''}`;
    m.scale.set(...size);
    m.position.set(...pos);
    m.userData = { ...userData, dynamic: true, ownMaterial: true };
    group.add(m);
    if (this.pickables) this.pickables.push(m);
    return m;
  }

  buildMallCrowd() {
    // 32 articulated visitors, shoppers, baristas, ushers & families populating all Mall stories & hotel connection
    const specs = [
      // M1F (floor 5) — Bustling open Hotel↔Mall promenade, luxury stores, waterfall & concierge
      { id: 'crowd-1', name: '쇼핑객 지우', role: 'VIP 쇼퍼', floor: 5, x: -13.0, z: 14.5, toX: -20.5, toZ: 14.5, coat: 0xd4a46a, bag: 0x9e3229, quote: '호텔 1층 로비에서 바로 쇼핑몰 명품관으로 이어지니 동선이 정말 쾌적해요!' },
      { id: 'crowd-2', name: '방문객 민석', role: '건축 사진가', floor: 5, x: -24.0, z: 24.5, toX: -24.0, toZ: 13.0, coat: 0x2c4251, bag: null, quote: '7m 층고로 뚫린 5개 층 보이드와 워터폴 가든 스케일이 압도적이네요.' },
      { id: 'crowd-3', name: '커플 유진', role: '몰 방문객', floor: 5, x: -29.0, z: 19.0, toX: -39.5, toZ: 19.0, coat: 0x733a4b, bag: 0xe6c87a, quote: '방금 샤넬이랑 에르메스 구경하고 별마당 서가 보러 가는 중이에요!' },
      { id: 'crowd-4', name: '컨시어지 하은', role: '몰 컨시어지 매니저', floor: 5, x: -32.5, z: 9.7, toX: -32.5, toZ: 9.7, coat: 0xc4ab82, bag: null, quote: '어떠신가요? M1F 명품관부터 꼭대기 M5F IMAX 영화관까지 전망 엘리베이터로 연결됩니다.' },
      { id: 'crowd-5', name: '쇼퍼 태현', role: '트렌드 헌터', floor: 5, x: -42.5, z: 16.0, toX: -42.5, toZ: 28.5, coat: 0x3b594a, bag: 0x243440, quote: '1층 로비와 에스컬레이터 측면 브리지 양쪽 다 편하게 넘어올 수 있어요.' },
      { id: 'crowd-6', name: '바리스타 도윤', role: '로스터리 헤드 바리스타', floor: 5, x: -16.8, z: 23.0, toX: -20.0, toZ: 26.8, coat: 0x45352b, bag: null, quote: '워터폴 가든 앞에서 스페셜티 콜드브루 한 잔 즐겨보세요!' },
      { id: 'crowd-7', name: '방문객 서아', role: '호텔 투숙객', floor: 5, x: -12.0, z: 18.0, toX: -16.5, toZ: 18.0, coat: 0x4a7382, bag: 0xd9a05b, quote: '호텔 체크인하고 바로 1층 연결 로비로 쇼핑하러 나왔어요.' },
      { id: 'crowd-8', name: '가족 방문객 수진', role: '야외 광장 방문객', floor: 5, x: -31.8, z: 38.0, toX: -31.8, toZ: 31.0, coat: 0xa64d64, bag: 0xf2e3c2, quote: '미디어 파사드 영상이 멋져서 사진 찍고 자동문으로 들어가는 길이에요.' },

      // M2F (floor 7) — Fashion, Gentle Monster, Nike, Starfield Library
      { id: 'crowd-9', name: '패셔니스타 나연', role: '젠틀몬스터 방문객', floor: 7, x: -20.5, z: 14.0, toX: -20.5, toZ: 26.5, coat: 0x1e242b, bag: 0xebe6dc, quote: 'M2F 젠틀몬스터랑 아더에러 매장이 7m 층고라 미술관 같아요!' },
      { id: 'crowd-10', name: '북러버 준호', role: '도서관 독서가', floor: 7, x: -43.5, z: 16.5, toX: -43.5, toZ: 24.5, coat: 0x5c4b3b, bag: null, quote: '14m 별마당 아트리움 서가를 2층 난간에서 내려다보니 정말 웅장해요.' },
      { id: 'crowd-11', name: '쇼퍼 다은', role: '스니커즈 마니아', floor: 7, x: -37.0, z: 10.2, toX: -24.5, toZ: 10.2, coat: 0xd15849, bag: 0xe6843c, quote: '나이키 서울 한정판 득템했어요! 이제 3층 애플스토어 가려고요.' },
      { id: 'crowd-12', name: '뷰티 크리에이터 리나', role: '뷰티 에디터', floor: 7, x: -38.5, z: 29.8, toX: -25.0, toZ: 29.8, coat: 0x91678f, bag: 0x73c97b, quote: '올리브영 럭스 쇼룸 체험 코너가 정말 잘 돼 있네요.' },
      { id: 'crowd-13', name: '산책객 성민', role: '몰 방문객', floor: 7, x: -16.5, z: 6.4, toX: -25.5, toZ: 10.0, coat: 0x3b4d5e, bag: null, quote: '호텔 3층 에스컬레이터에서 브리지를 건너면 바로 M2F예요!' },

      // M3F (floor 9) — Apple Store, Samsung, Sony, Lego + Floating Skybridge
      { id: 'crowd-14', name: '스카이워커 현우', role: 'IT 리뷰어', floor: 9, x: -39.5, z: 20.0, toX: -22.5, toZ: 20.0, coat: 0x2f5e78, bag: 0xc2ccd6, quote: 'M3F 플로팅 스카이브리지 위에서 보는 중정 아트리움 뷰가 최고예요!' },
      { id: 'crowd-15', name: '게이머 지훈', role: '플레이스테이션 팬', floor: 9, x: -43.0, z: 17.5, toX: -43.0, toZ: 26.0, coat: 0x2b3240, bag: 0x5c7cfa, quote: '소니 라운지랑 애플 스토어 체험 부스가 한 층에 모여있어서 최고예요.' },
      { id: 'crowd-16', name: '테키 유나', role: '디자이너', floor: 9, x: -20.2, z: 12.5, toX: -20.2, toZ: 27.5, coat: 0x7d8a72, bag: null, quote: '삼성 갤럭시 AI 스튜디오에서 신제품 구경하고 왔어요.' },
      { id: 'crowd-17', name: '쇼퍼 민재', role: '레고 컬렉터', floor: 9, x: -39.0, z: 29.5, toX: -24.0, toZ: 29.5, coat: 0xd99e43, bag: 0xf2c94c, quote: '레고 스토어 대형 디오라마가 7m 천장까지 닿을 기세네요!' },
      { id: 'crowd-18', name: '스카이워커 소희', role: '포토그래퍼', floor: 9, x: -24.0, z: 20.0, toX: -38.0, toZ: 20.0, coat: 0xa14f66, bag: 0xf0eee4, quote: '스카이브리지 정중앙에서 아래 1층 워터폴이랑 위쪽 IMAX 천창까지 다 보여요!' },

      // M4F (floor 11) — Gourmet Street dining & Skybridge
      { id: 'crowd-19', name: '미식가 정우', role: '고든램지 다이너', floor: 11, x: -20.2, z: 14.0, toX: -20.2, toZ: 27.0, coat: 0x52392e, bag: null, quote: 'M4F 고메 스트리트에서 식사하고 위층 영화관 가는 코스가 완벽하네요.' },
      { id: 'crowd-20', name: '셰프 켄지', role: '오마카세 다이너', floor: 11, x: -42.5, z: 16.0, toX: -42.5, toZ: 25.5, coat: 0x2d4a43, bag: 0x62b56c, quote: '오스테리아 트러플 파스타랑 말차 라떼 디저트 조합이 환상적이에요.' },
      { id: 'crowd-21', name: '산책객 보라', role: '스카이워크 이용객', floor: 11, x: -37.0, z: 20.0, toX: -25.0, toZ: 20.0, coat: 0x785b8a, bag: 0xd6b575, quote: '4층 스카이워크 건너면서 아래층 구경하는 재미가 있네요.' },
      { id: 'crowd-22', name: '브런치객 하나', role: '방문객', floor: 11, x: -33.5, z: 10.0, toX: -23.0, toZ: 10.0, coat: 0xb87654, bag: null, quote: '여기 전망 엘리베이터 타고 한 층만 더 올라가면 M5F IMAX 영화관이에요!' },

      // M5F (floor 13) — Top-Floor Grand Cinema Multiplex (IMAX) & Sounds Forest
      { id: 'crowd-23', name: '씨네필 예린', role: 'IMAX 예매객', floor: 13, x: -23.5, z: 11.8, toX: -36.0, toZ: 11.8, coat: 0x8f2934, bag: 0xf4c45c, quote: '꼭대기층 M5F 전체가 IMAX 멀티플렉스랑 하늘정원이라 규모가 어마어마해요!' },
      { id: 'crowd-24', name: '관객 승호', role: '팝콘 대기중', floor: 13, x: -39.0, z: 12.2, toX: -43.5, toZ: 18.0, coat: 0x263847, bag: 0xffe075, quote: '카라멜 팝콘 사서 바로 IMAX Laser 상영관으로 들어가고 있어요!' },
      { id: 'crowd-25', name: '관객 다혜', role: '영화 관람객', floor: 13, x: -46.0, z: 25.25, toX: -46.0, toZ: 25.25, coat: 0x3b4d59, bag: null, seat: true, quote: '대형 IMAX 스크린 화질이 진짜 선명하네요! 빈 좌석 클릭하면 같이 앉을 수 있어요.' },
      { id: 'crowd-26', name: '관객 준영', role: '영화 관람객', floor: 13, x: -43.2, z: 27.65, toX: -43.2, toZ: 27.65, coat: 0x5c363e, bag: null, seat: true, quote: '돌비 애트모스 사운드가 웅장하게 울리네요.' },
      { id: 'crowd-27', name: '어셔 미소', role: '시네마 스태프', floor: 13, x: -40.8, z: 15.0, toX: -39.0, toZ: 15.0, coat: 0x911d24, bag: null, quote: 'GRAND CINEMA HALL 1 상영 중입니다. 앞쪽 매표소와 스낵바도 이용해 주세요!' },
      { id: 'crowd-28', name: '자연애호가 유리', role: '사운즈 포레스트 방문객', floor: 13, x: -29.0, z: 25.5, toX: -17.5, toZ: 25.5, coat: 0x457352, bag: null, quote: '영화 보고 나와서 주홍빛 트러스 천창 아래 사운즈 포레스트 나무 사이를 산책 중이에요.' },
      { id: 'crowd-29', name: '관광객 알렉스', role: '루프탑 가든 관람객', floor: 13, x: -28.0, z: 13.0, toX: -28.0, toZ: 24.5, coat: 0x334756, bag: 0x9fc2cf, quote: 'The glass skylight trusses 35 meters above look incredible!' },

      // B1 (floor 4) — Unified Basement Parking EV Zone & Hotel Tunnel
      { id: 'crowd-30', name: '운전자 태오', role: 'EV 충전 고객', floor: 4, x: -46.5, z: 13.5, toX: -46.5, toZ: 26.5, coat: 0x2e4a59, bag: null, quote: '지하주차장이 호텔이랑 그대로 통하고 초급속 EV 충전기까지 있어서 너무 편해요!' },
      { id: 'crowd-31', name: '주차안내원 철수', role: '발레 매니저', floor: 4, x: -16.0, z: 21.8, toX: -25.0, toZ: 21.8, coat: 0x222a30, bag: null, quote: '호텔 지하주차장 B1~B5 동선과 동일하게 이어져 차로 이동하기 수월합니다.' },
      { id: 'crowd-32', name: '쇼핑객 수빈', role: '주차장 방문객', floor: 4, x: -28.0, z: 10.5, toX: -28.0, toZ: 19.5, coat: 0x734959, bag: 0xe6c87a, quote: '쇼핑 잔뜩 하고 B1에서 바로 몰 엘리베이터 타고 차 세워둔 곳으로 내려왔어요.' },
    ];

    for (const s of specs) {
      const person = new THREE.Group();
      person.name = `Mall_person_${s.id}`;
      const baseY = (s.floor - 5) * PITCH;
      person.position.set(s.x, baseY, s.z);
      person.userData.dynamic = true;

      const coatMat = new THREE.MeshStandardMaterial({ color: s.coat, roughness: 0.78 });
      const legMat = new THREE.MeshStandardMaterial({ color: 0x22292f, roughness: 0.85 });
      const info = {
        action: 'mallPerson',
        floorIndex: s.floor,
        personId: s.id,
        personName: s.name,
        roleLabel: s.role,
        quote: s.quote,
        label: `${s.name} (${s.role})`,
      };

      const torso = new THREE.Mesh(unitCapsule, coatMat);
      torso.scale.set(0.21, 0.36, 0.14);
      torso.position.y = 1.08;
      this.markInteractive(torso, info);
      person.add(torso);

      const head = new THREE.Mesh(unitSphere, this.m.skin);
      head.scale.setScalar(0.13);
      head.position.y = 1.56;
      this.markInteractive(head, info);
      person.add(head);

      const hair = new THREE.Mesh(unitSphere, this.m.black);
      hair.scale.set(0.138, 0.125, 0.14);
      hair.position.set(0, 1.61, 0.01);
      person.add(hair);

      const legs = [];
      for (const side of [-1, 1]) {
        const legPivot = new THREE.Group();
        legPivot.position.set(side * 0.095, 0.76, 0);
        const legMesh = new THREE.Mesh(unitCapsule, legMat);
        legMesh.scale.set(0.072, 0.42, 0.072);
        legMesh.position.y = -0.32;
        this.markInteractive(legMesh, info);
        legPivot.add(legMesh);
        person.add(legPivot);
        legs.push(legPivot);
      }

      const arms = [];
      for (const side of [-1, 1]) {
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.25, 1.28, 0);
        const armMesh = new THREE.Mesh(unitCapsule, coatMat);
        armMesh.scale.set(0.06, 0.34, 0.06);
        armMesh.position.y = -0.24;
        this.markInteractive(armMesh, info);
        armPivot.add(armMesh);
        if (side > 0 && s.bag) {
          const bagMat = new THREE.MeshStandardMaterial({ color: s.bag, roughness: 0.45 });
          const bag = new THREE.Mesh(unitBox, bagMat);
          bag.scale.set(0.18, 0.22, 0.12);
          bag.position.set(0.04, -0.46, 0);
          armPivot.add(bag);
        }
        person.add(armPivot);
        arms.push(armPivot);
      }

      if (s.seat) {
        // Adjust height & leg bend cleanly for seated IMAX moviegoers
        person.position.y = baseY + 0.16;
        person.rotation.y = Math.PI;
        for (const l of legs) l.rotation.x = Math.PI / 2.2;
      }

      this.crowdGroup.add(person);
      this.mallPeople.push({
        id: s.id,
        name: s.name,
        role: s.role,
        floor: s.floor,
        root: person,
        legs,
        arms,
        ax: s.x,
        az: s.z,
        bx: s.toX,
        bz: s.toZ,
        baseY,
        seat: !!s.seat,
        speed: 0.72 + (this.mallPeople.length % 5) * 0.09,
        phase: this.mallPeople.length * 1.15,
        get x() {
          return this.root.position.x;
        },
        get z() {
          return this.root.position.z;
        },
      });
    }
  }

  makeCopButtonLegacyCheck() {
    return true;
  }

  redrawIndicator(disp, mc, floorCode) {
    if (!disp?.ctx) return;
    const arrow = mc.direction > 0 ? '▲' : mc.direction < 0 ? '▼' : '●';
    const key = `${floorCode}:${arrow}:${mc.alarm ? 'A' : ''}`;
    if (disp.lastKey === key) return;
    disp.lastKey = key;
    const { ctx, canvas, tex } = disp;
    ctx.fillStyle = mc.alarm ? '#3b1214' : '#0d1621';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = mc.alarm ? '#ff7c70' : '#f4cf82';
    ctx.font = `bold ${Math.round(canvas.height * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${arrow} ${floorCode}`, canvas.width / 2, Math.round(canvas.height * 0.66));
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
      this.crowdGroup.visible = false;
      return;
    }
    this.root.visible = true;
    this.elevatorGroup.visible = true;
    this.exterior.visible = showAll;
    this.crowdGroup.visible = isGame || inMall;

    for (const fg of this.floors) {
      if (showAll) {
        fg.visible = true;
      } else if (mode === 'controller' || mode === 'shaft') {
        fg.visible = Math.abs(fg.userData.floorIndex - focusFloor) <= 3 || fg.userData.floorIndex >= 5;
      } else {
        fg.visible = Math.abs(fg.userData.floorIndex - focusFloor) <= 1 || fg.userData.floorIndex >= 5;
      }
    }
  }

  update(mc, time = 0, player = null) {
    if (!mc) return;
    const carY = mc.position - 5 * PITCH; // floor 5 (M1F) -> y = 0, floor 13 (M5F) -> y = 28.0m
    if (this.mallCar) this.mallCar.position.y = carY;
    if (this.mallWeight) this.mallWeight.position.y = 14.0 - carY * 0.5;

    const carRoofY = carY + 2.55;
    const ropeLen = Math.max(0.4, (this.shaftTopY ?? 35.2) - carRoofY);
    for (const r of this.ropeMeshes) {
      r.mesh.scale.set(0.014, ropeLen, 0.014);
      r.mesh.position.set(r.x, carRoofY + ropeLen / 2, r.z);
    }

    const openShift = (mc.door ?? 0) * 0.52;
    if (this.mallCarDoors) {
      this.mallCarDoors.left.position.x = -0.275 - openShift;
      this.mallCarDoors.right.position.x = 0.275 + openShift;
    }

    const floorCode = mc.floor < 5 ? FLOORS[mc.floor] : mallFloorMeta(mc.floor).mallCode;
    for (const f of MALL_VALID_FLOORS) {
      const ld = this.mallLandingDoors[f];
      const fOpen = mc.aligned() && mc.floor === f ? openShift : 0;
      if (ld) {
        ld.left.position.x = -0.285 - fOpen;
        ld.right.position.x = 0.285 + fOpen;
      }
      if (this.mallLandingDisplays[f]) {
        this.redrawIndicator(this.mallLandingDisplays[f], mc, floorCode);
      }
    }

    if (this.mallCopDisplay) {
      this.redrawIndicator(this.mallCopDisplay, mc, floorCode);
    }

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
        btn.material.color.setHex(lit ? (action === 'mallHall' ? 0x62d9cc : 0xe8b566) : 0xc8d2d9);
        btn.material.emissive.setHex(lit ? (action === 'mallHall' ? 0x3ecfb9 : 0xffaa3b) : 0x000000);
        btn.material.emissiveIntensity = lit ? 0.65 : 0;
      }
    }

    for (const sheet of this.waterfallSheets) {
      const pulse = Math.sin(time * 2.8 + sheet.userData.phase);
      sheet.position.y = sheet.userData.baseY + pulse * 0.08;
      sheet.material.opacity = 0.58 + pulse * 0.08;
    }

    for (const strip of this.dmxStrips) {
      const hue = (((time * 0.045 + strip.userData.phase * 0.12) % 1) + 1) % 1;
      strip.material.emissive.setHSL(hue, 0.72, 0.56);
    }

    if (this.plazaSculpture) {
      this.plazaSculpture.rotation.y = time * 0.32;
      this.plazaSculpture.rotation.x = Math.sin(time * 0.5) * 0.18;
    }

    // Animate 32 Mall Visitors walking smoothly along patrol segments & swinging limbs
    for (const person of this.mallPeople) {
      if (person.seat) continue;
      const dist = Math.hypot(person.bx - person.ax, person.bz - person.az);
      if (dist < 0.05) {
        person.arms[0].rotation.x = Math.sin(time * 1.4 + person.phase) * 0.08;
        person.arms[1].rotation.x = -Math.sin(time * 1.4 + person.phase) * 0.08;
        continue;
      }
      const cycle = (time * person.speed) / dist + person.phase * 0.35;
      const pingpong = Math.abs((cycle % 2) - 1); // 0 -> 1 -> 0 smoothly
      const dir = cycle % 2 < 1 ? 1 : -1;
      person.root.position.x = person.ax + (person.bx - person.ax) * pingpong;
      person.root.position.z = person.az + (person.bz - person.az) * pingpong;
      person.root.rotation.y = Math.atan2(
        (person.bx - person.ax) * dir,
        (person.bz - person.az) * dir
      );
      const stride = Math.sin(time * 5.2 * person.speed + person.phase);
      person.legs[0].rotation.x = stride * 0.45;
      person.legs[1].rotation.x = -stride * 0.45;
      person.arms[0].rotation.x = -stride * 0.32;
      person.arms[1].rotation.x = stride * 0.25;
    }

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
