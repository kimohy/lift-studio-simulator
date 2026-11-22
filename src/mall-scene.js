import * as THREE from 'three';
import { mallFloorMeta, MALL_VALID_FLOORS } from './building.js';
import { buildStylizedHuman } from './character-builder.js';
import { FLOORS, PITCH } from './controller.js';
import { MALL_CINEMA_MOVIES } from './hotel-stay.js';
import { MALL_LIFT_2_X, MALL_LIFT_X, MALL_LIFT_Z } from './hotel-world.js';
import { hotelSignTexture } from './hotel-sign.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const unitSphere = new THREE.SphereGeometry(1, 12, 10);
const up = new THREE.Vector3(0, 1, 0);

const SHAFT_CUTOUT = { minX: -31.0, maxX: -25.0, minZ: 8.85, maxZ: 11.15 };

export const MALL_STORY_H = PITCH * 2; // 7.0m per double-height Mall story (2 Hotel floors)
export const MALL_ROOF_Y = 5 * MALL_STORY_H; // 35.0m above ground (= Hotel 10F height)
export const CINEMA_ROW_ZS = [23.0, 25.4, 27.8]; // C열(0), B열(1), A열(2)
export const CINEMA_COL_XS = [-47.4, -46.0, -44.6, -43.2, -41.8];

export function cinemaRowMetrics(rowIdx) {
  const sz = CINEMA_ROW_ZS[rowIdx];
  const riserStep = (2 - rowIdx) * 0.22;
  const riserH = riserStep + 0.05;
  const riserCenterY = riserStep / 2;
  const riserTop = riserCenterY + riserH / 2; // C: 0.465, B: 0.245, A: 0.025
  const seatTop = riserTop + 0.45; // C: 0.915, B: 0.695, A: 0.475
  return { sz, riserStep, riserH, riserCenterY, riserTop, seatTop };
}

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
    this.hotelLinkDoors = [];
    this.mallLandingDoors = {};
    this.mallLandingDisplays = {};
    this.mallHallButtons = [];
    this.mallCarButtons = [];
    this.mallAccessibleButtons = [];
    this.mallCarUnits = [];
    this.mallPeople = [];
    this.mallCars = [];
    this.ropeMeshes = [];
    this.kineticOrbs = [];
    this.fountainJets = [];
    this.ledStepTiles = [];
    this.djPlatters = [];
    this.djEqBars = [];
    this.bowlingPins = [];
    this.bowlingBall = null;
    this.bowlingStrikeUntil = -1;
    this.rhythmTiles = [];
    this.teamLabPillars = [];
    this.sushiPlates = [];
    this.teppanFlames = [];
    this.teppanFlareUntil = -1;
    this.fountainShowUntil = -1;
    this.kineticShowUntil = -1;
    this.robotDogTrickUntil = -1;
    this.campfireFlame = null;
    this.cinemaMovieIndex = 0;
    this.cinemaGateDoors = null;
    this.cinemaGateDisplay = null;
    this.cinemaGateScannerLeds = [];
    this.cinemaGateOpen = false;

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
      crystalGlass: new THREE.MeshPhysicalMaterial({
        color: 0xd9f4fa,
        metalness: 0.04,
        roughness: 0.04,
        transparent: true,
        opacity: 0.16,
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

      if (f < 5) this.buildParking(g, f);
      else if (f === 5) this.buildAtriumM1F(g);
      else if (f < 13) this.buildGalleryFloor(g, f);
      else this.buildTopCinemaM5F(g);
    }

    this.buildAtriumLibrarySpine();
    this.buildWaterfallTower();
    this.buildSpiralSlide();
    this.buildKineticAurora();
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

  sign(group, name, lines, pos, size = [3.2, 0.55], rotY = 0, opts = {}) {
    const tex = hotelSignTexture(lines, { width: 640, height: 180 });
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x3b2d18,
      emissiveMap: tex,
      emissiveIntensity: 0.32,
      side: THREE.FrontSide,
    });
    const [w, h] = size;
    const sg = new THREE.Group();
    sg.name = name;
    sg.position.set(...pos);
    sg.rotation.y = rotY;

    const frameMat = this.m?.charcoal || mat;
    const postMat = this.m?.champagne || frameMat;
    const rodMat = this.m?.steel || postMat;

    const backing = new THREE.Mesh(unitBox, frameMat);
    backing.name = `${name}_frame`;
    backing.scale.set(w + 0.08, h + 0.08, 0.05);
    backing.position.set(0, 0, -0.028);
    sg.add(backing);

    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    front.name = `${name}_face`;
    front.position.set(0, 0, 0.002);
    sg.add(front);

    if (opts.doubleSided) {
      const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      back.name = `${name}_back`;
      back.position.set(0, 0, -0.058);
      back.rotation.y = Math.PI;
      sg.add(back);
    }

    if (opts.ceilingY != null && opts.ceilingY > pos[1] + h / 2) {
      const rodH = opts.ceilingY - (pos[1] + h / 2);
      for (const rx of [-w * 0.38, w * 0.38]) {
        const rod = new THREE.Mesh(unitBox, rodMat);
        rod.name = `${name}_hanger`;
        rod.scale.set(0.035, rodH, 0.035);
        rod.position.set(rx, h / 2 + rodH / 2, -0.028);
        sg.add(rod);
      }
    }

    if (opts.floorY != null && opts.floorY < pos[1] - h / 2) {
      const colH = pos[1] - h / 2 - opts.floorY;
      for (const cx of [-w * 0.42, w * 0.42]) {
        const col = new THREE.Mesh(unitBox, postMat);
        col.name = `${name}_post`;
        col.scale.set(0.05, colH, 0.05);
        col.position.set(cx, -(h / 2 + colH / 2), -0.028);
        sg.add(col);
      }
    }

    group.add(sg);
    this.signs.push(sg);
    return sg;
  }

  markInteractive(mesh, info) {
    const data = typeof info === 'string' ? { action: info } : info;
    Object.assign(mesh.userData, data);
    if (this.pickables && !this.pickables.includes(mesh)) {
      this.pickables.push(mesh);
    }
    return mesh;
  }

  slabWithCutouts(group, name, minX, maxX, minZ, maxZ, y, thickness, material, cutouts = [SHAFT_CUTOUT]) {
    let rects = [{ minX, maxX, minZ, maxZ }];
    for (const c of cutouts) {
      const next = [];
      for (const r of rects) {
        if (r.maxX <= c.minX || r.minX >= c.maxX || r.maxZ <= c.minZ || r.minZ >= c.maxZ) {
          next.push(r);
          continue;
        }
        if (r.minX < c.minX) next.push({ minX: r.minX, maxX: c.minX, minZ: r.minZ, maxZ: r.maxZ });
        if (r.maxX > c.maxX) next.push({ minX: c.maxX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ });
        const ix0 = Math.max(r.minX, c.minX);
        const ix1 = Math.min(r.maxX, c.maxX);
        if (ix1 - ix0 > 0.01) {
          if (r.minZ < c.minZ) next.push({ minX: ix0, maxX: ix1, minZ: r.minZ, maxZ: c.minZ });
          if (r.maxZ > c.maxZ) next.push({ minX: ix0, maxX: ix1, minZ: c.maxZ, maxZ: r.maxZ });
        }
      }
      rects = next;
    }
    for (const r of rects) {
      const w = r.maxX - r.minX;
      const d = r.maxZ - r.minZ;
      if (w > 0.01 && d > 0.01) {
        this.box(group, name, [w, thickness, d], [(r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2], material);
      }
    }
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
    // Unified B5-B1 underground garage matching HotelScene's z ∈ [8, 36] grid, columns,
    // unbroken East-West cross-aisle at z = 21.8, and clean cutouts for Dual Elevators & Central Escalator!
    const m = this.m;
    const ESC_CUTOUT = { minX: -40.0, maxX: -22.0, minZ: 17.2, maxZ: 24.6 };
    const garageCutouts = [SHAFT_CUTOUT, ESC_CUTOUT];
    this.slabWithCutouts(g, 'Mall_garage_floor', -50, -14, 8, 36, -0.09, 0.18, m.concrete, garageCutouts);
    this.slabWithCutouts(g, 'Mall_garage_ceiling', -50, -14, 8, 36, 3.34, 0.16, m.concrete, garageCutouts);
    // North lift promenade behind Dual Elevators (x ∈ [-34, -14], z ∈ [4, 8])
    this.slabWithCutouts(g, 'Mall_garage_lift_vest_floor', -34, -14, 4, 8, -0.09, 0.18, m.concrete, [SHAFT_CUTOUT]);
    this.slabWithCutouts(g, 'Mall_garage_lift_vest_ceil', -34, -14, 4, 8, 3.34, 0.16, m.concrete, [SHAFT_CUTOUT]);
    this.box(g, 'Mall_garage_vest_west', [0.2, 3.4, 4], [-34, 1.7, 6], m.concrete);
    this.box(g, 'Mall_garage_vest_north', [20, 3.4, 0.2], [-24, 1.7, 4], m.concrete);

    // Outer perimeter walls (West x=-50, South z=36, North z=8 left of vestibule)
    this.box(g, 'Mall_garage_west_wall', [0.22, 3.4, 28], [-50, 1.7, 22], m.concrete);
    this.box(g, 'Mall_garage_south_wall', [36, 3.4, 0.2], [-32, 1.7, 36], m.concrete);
    this.box(g, 'Mall_garage_north_wall_w', [16, 3.4, 0.2], [-42, 1.7, 8], m.concrete);

    // East wall segments along x = -14.08 leaving BOTH Hotel portals (z=16 & z=22.2) open cleanly
    for (const [z, d] of [
      [9.25, 10.5],
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

    // Continuous Asphalt Drive Aisles matching Hotel z=21.8 and z=16.0 + West/East loops
    this.box(g, 'Mall_main_drive_aisle_E', [8.0, 0.012, 5.2], [-18.0, 0.015, 21.8], m.asphalt);
    this.box(g, 'Mall_main_drive_aisle_W', [9.5, 0.012, 5.2], [-44.75, 0.015, 21.8], m.asphalt);
    this.box(g, 'Mall_north_drive_aisle', [33, 0.012, 3.0], [-30.5, 0.015, 15.4], m.asphalt);
    this.box(g, 'Mall_west_loop_aisle', [4.8, 0.012, 23], [-45.5, 0.015, 22], m.asphalt);
    this.box(g, 'Mall_lift_bay_aisle', [6.8, 0.012, 6.2], [-28.0, 0.015, 14.2], m.asphalt);
    for (let x = -45; x <= -15; x += 2.8) {
      if (x < -40.5 || x > -21.5) {
        this.box(g, 'Mall_aisle_dash', [1.4, 0.009, 0.09], [x, 0.026, 21.8], m.yellow);
      }
      this.box(g, 'Mall_aisle_dash_n', [1.4, 0.009, 0.08], [x, 0.026, 15.4], m.yellow);
    }
    for (const x of [-24.5, -31.5]) {
      this.box(g, 'Mall_ped_marking', [0.055, 0.009, 5.5], [x, 0.028, 14.2], m.yellow);
    }

    // Standard Parking Stall Grids aligned cleanly clear of drive aisles
    for (let x = -42.5; x <= -16.5; x += 2.8) {
      this.box(g, 'Mall_stall_mark_S', [0.05, 0.008, 4.9], [x, 0.023, 28.4], m.white);
      if (x < -31.5 || x > -24.5) {
        this.box(g, 'Mall_stall_mark_N', [0.05, 0.008, 3.8], [x, 0.023, 11.0], m.white);
      }
    }
    this.box(g, 'Mall_stall_end_S', [26.5, 0.009, 0.05], [-29.5, 0.023, 30.9], m.white);

    // Consistent Column Grid matching Hotel Parking (skipping central escalator bay)
    for (const x of [-42, -33, -24, -16.5]) {
      for (const z of [10, 18, 26, 34]) {
        if ((x === -33 || x === -24) && z === 18) continue;
        this.box(g, 'Mall_column', [0.52, 3.3, 0.52], [x, 1.65, z], m.concrete, f);
        this.box(g, 'Mall_col_wrap', [0.56, 0.55, 0.56], [x, 0.35, z], m.yellow);
        this.box(g, 'Mall_col_band', [0.57, 0.13, 0.57], [x, 0.35, z], m.black);
      }
    }

    // Consistent Ceiling Sprinkler Mains, Conduits, & LED Luminaires (kept clear of shafts & escalators)
    for (const z of [8.2, 27, 34]) {
      for (const x of [-43, -34, -25, -18]) {
        if (z < 9 && x < -34) continue;
        this.box(g, 'Mall_garage_LED', [2.3, 0.04, 0.14], [x, 3.2, z], m.warmLed);
      }
      const xStart = z < 9 ? -33.5 : -49;
      this.rail(g, [xStart, 2.98, z], [-14.2, 2.98, z], m.red, 0.045);
      this.rail(g, [xStart, 3.1, z + 0.22], [-14.2, 3.1, z + 0.22], m.metal, 0.025);
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
      [-41.1, 11.0],
      [-18.7, 11.0],
    ].entries()) {
      this.car(g, x, z, palette[(i + f) % palette.length], f, models[(i + f) % models.length]);
    }

    this.sign(
      g,
      `Mall_parking_hotel_sign_${f}`,
      [`${FLOORS[f]} · 호텔 지하주차장 연결통로 →`, 'HOTEL PARKING GARAGE & VALET'],
      [-14.25, 2.85, 21.8],
      [3.8, 0.6],
      -Math.PI / 2,
      { ceilingY: 3.34, doubleSided: true }
    );
    this.sign(
      g,
      `Mall_parking_lift_sign_${f}`,
      [`${FLOORS[f]} · 몰 듀얼 전망 엘리베이터`, 'MALL DUAL PANORAMIC ELEVATORS  M1F~M5F'],
      [-28.0, 2.75, 11.55],
      [4.2, 0.58],
      0,
      { ceilingY: 3.34, doubleSided: true }
    );

    if (f === 4) {
      // B1 Hypercar Showroom & Test-Drive Cockpit Pod (clear north-west bay)
      const podMat = new THREE.MeshStandardMaterial({ color: 0xd93829, roughness: 0.22, metalness: 0.65 });
      const info = { action: 'mallSupercarDrive', floorIndex: 4, label: 'B1 하이퍼카 시승 체험존' };
      const plinth = this.box(g, 'Mall_supercar_testdrive', [2.8, 0.14, 5.0], [-36.2, 0.07, 11.4], m.charcoal, f, info);
      plinth.userData.dynamic = true;
      this.box(g, 'Mall_supercar_rim', [2.9, 0.04, 5.1], [-36.2, 0.15, 11.4], m.cyanLed);
      this.box(g, 'Mall_supercar_body', [1.85, 0.44, 4.2], [-36.2, 0.44, 11.4], podMat, null, info);
      this.box(g, 'Mall_supercar_cockpit', [1.42, 0.38, 1.85], [-36.2, 0.82, 11.5], m.glass, null, info);
      this.sign(
        g,
        'Mall_supercar_sign',
        ['B1 HYPERCAR DRIVE EXPERIENCE', '클릭 시 운전석 시승 체험 🏎️'],
        [-36.2, 2.4, 8.16],
        [3.6, 0.62],
        0,
        { ceilingY: 3.34 }
      );
    }
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
    // M1F (floor 5, 7.0m high: y = 0..7.0m) - Flush Luxury Boutiques + Wide Corridors + Waterfall Garden + Direct Open Hotel Lobby Connection
    const m = this.m;
    const ESC_CUTOUT = { minX: -40.0, maxX: -22.0, minZ: 17.2, maxZ: 24.6 };
    this.slabWithCutouts(g, 'Mall_M1F_floor', -50, -14.2, 4, 36, -0.09, 0.18, m.terrazzo, [SHAFT_CUTOUT, ESC_CUTOUT]);
    this.box(g, 'Mall_M1F_north_wall', [36, MALL_STORY_H, 0.24], [-32, MALL_STORY_H / 2, 4], m.travertine);
    this.box(g, 'Mall_M1F_west_wall', [0.24, MALL_STORY_H, 32], [-50, MALL_STORY_H / 2, 20], m.travertine);

    // East boundary along x = -14.1: closed north (z=4..14.2) & south (z=17.8..36), framed 3.6m Glass Connecting Portal (z=14.2..17.8)
    this.box(g, 'Mall_M1F_east_wall_n', [0.24, MALL_STORY_H, 10.2], [-14.1, MALL_STORY_H / 2, 9.1], m.travertine);
    this.box(g, 'Mall_M1F_east_wall_s', [0.24, MALL_STORY_H, 18.2], [-14.1, MALL_STORY_H / 2, 26.9], m.travertine);
    this.box(g, 'Mall_M1F_lobby_arch', [0.28, 3.6, 3.6], [-14.1, 5.2, 16.0], m.travertine);
    this.box(g, 'Mall_M1F_lobby_arch_trim', [0.34, 0.14, 3.6], [-14.1, 3.42, 16.0], m.champagne);
    // Center-parting Automated Glass Sliding Doors separating Mall Atrium & Hotel Vestibule
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(unitBox, m.crystalGlass);
      door.name = side < 0 ? 'Mall_hotel_link_door_L' : 'Mall_hotel_link_door_R';
      door.scale.set(0.06, 3.35, 1.74);
      door.position.set(-14.04, 1.675, 16.0 + side * 0.87);
      door.userData = {
        dynamic: true,
        closedZ: 16.0 + side * 0.87,
        openOffset: side * 1.55,
        action: 'automaticDoor',
        floorIndex: 5,
        label: '호텔 ↔ 몰 자동 슬라이딩 글래스 게이트',
      };
      this.markInteractive(door, door.userData);
      g.add(door);
      this.hotelLinkDoors.push(door);
    }

    // Floor Slab Ceiling Rings (y = 7.0m = M2F floor!) leaving giant atrium void x ∈ [-40,-22], z ∈ [12.8,27.2] & Dual Lift shaft cutout
    this.slabWithCutouts(g, 'Mall_M1F_ceil_N', -50, -14, 4, 12.8, MALL_STORY_H - 0.11, 0.22, m.white, [SHAFT_CUTOUT]);
    this.box(g, 'Mall_M1F_ceil_S', [36, 0.22, 8.8], [-32, MALL_STORY_H - 0.11, 31.6], m.white);
    this.box(g, 'Mall_M1F_ceil_W', [10, 0.22, 14.4], [-45, MALL_STORY_H - 0.11, 20], m.white);
    this.box(g, 'Mall_M1F_ceil_E', [8, 0.22, 14.4], [-18, MALL_STORY_H - 0.11, 20], m.white);

    // 3 M1F Flagship Luxury Stores (flush to outer walls with zero rear dead space) & Roastery Cafe
    this.buildStorefront(g, 5, {
      x: -44.2,
      z: 6.12,
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
      z: 6.02,
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
      z: 33.88,
      w: 9.0,
      d: 4.0,
      rotY: Math.PI,
      brandEn: 'ROLEX & CARTIER',
      brandKo: 'M1F 하이주얼리 워치 살롱',
      action: 'mallShop',
      accentMat: m.champagne,
      productColor: 0x70c7b4,
    });

    // Roastery Cafe Island (south/east of central lobby portal so walkway stays wide open)
    this.cyl(g, 'Mall_roastery_island', 2.2, 2.4, 1.05, [-18.4, 0.525, 25.0], m.champagne, 5, {
      action: 'mallCafe',
      floorIndex: 5,
      label: '더 현대 로스터리 · 시그니처 카페',
    });
    this.cyl(g, 'Mall_roastery_top', 2.45, 2.45, 0.1, [-18.4, 1.08, 25.0], m.terrazzo);
    this.box(g, 'Mall_roastery_canopy', [3.8, 0.14, 3.8], [-18.4, 3.2, 25.0], m.warmWood);
    this.box(g, 'Mall_roastery_light', [3.4, 0.05, 3.4], [-18.4, 3.1, 25.0], m.warmLed);
    for (const px of [-18.4 - 1.68, -18.4 + 1.68]) {
      for (const pz of [25.0 - 1.68, 25.0 + 1.68]) {
        this.box(g, 'Mall_roastery_post', [0.11, 3.16, 0.11], [px, 1.58, pz], m.champagne);
      }
    }
    this.sign(
      g,
      'Mall_roastery_sign',
      ['THE HYUNDAI ROASTERY', 'M1F 시그니처 카페'],
      [-18.4, 3.22, 23.06],
      [3.4, 0.65],
      Math.PI,
      { doubleSided: true }
    );

    // 14m Waterfall Garden & Reflecting Pool (South-East Quadrant, z = 32.2)
    this.box(g, 'Mall_waterfall_pool_rim', [8.0, 0.28, 3.8], [-19.0, 0.14, 32.2], m.travertine, 5, {
      action: 'mallWaterfall',
      floorIndex: 5,
      label: '14m 워터폴 가든 & 미디어 폭포',
    });
    const poolWater = this.box(g, 'Mall_waterfall_pool', [7.4, 0.12, 3.2], [-19.0, 0.24, 32.2], m.water);
    poolWater.userData.dynamic = true;
    for (let j = 0; j < 6; j++) {
      const jet = new THREE.Mesh(unitCyl, m.cyanLed);
      jet.name = `Mall_fountain_jet_${j}`;
      jet.scale.set(0.09, 0.4, 0.09);
      jet.position.set(-21.8 + j * 1.12, 0.35, 32.2);
      jet.userData = { dynamic: true, baseX: -21.8 + j * 1.12, phase: j * 0.65 };
      this.markInteractive(jet, { action: 'mallFountainShow', floorIndex: 5, label: '워터폴 뮤지컬 분수쇼 시작' });
      g.add(jet);
      this.fountainJets.push(jet);
    }
    this.box(g, 'Mall_fountain_console', [0.8, 1.05, 0.6], [-23.4, 0.525, 29.6], m.champagne, 5, {
      action: 'mallFountainShow',
      floorIndex: 5,
      label: '워터폴 뮤지컬 레이저 분수쇼 ⛲',
    });

    // Atrium Grand Piano Live Busking Stage (open M1F South Atrium Court, clear of Central Escalators)
    const pianoGroup = new THREE.Group();
    pianoGroup.name = 'Mall_grand_piano';
    pianoGroup.position.set(-31.0, 0, 28.5);
    g.add(pianoGroup);
    const pianoInfo = { action: 'mallPiano', floorIndex: 5, label: '아트리움 그랜드 피아노 연주 🎹' };
    this.box(pianoGroup, 'Piano_body', [1.8, 0.32, 1.4], [0, 0.86, 0], m.black, 5, pianoInfo);
    const pianoLid = this.box(pianoGroup, 'Piano_lid', [1.7, 0.06, 1.2], [0, 1.22, -0.15], m.black, null, pianoInfo);
    pianoLid.rotation.x = 0.38;
    this.box(pianoGroup, 'Piano_keys', [1.5, 0.08, 0.34], [0, 0.82, 0.68], m.white, null, pianoInfo);
    this.box(pianoGroup, 'Piano_bench', [1.0, 0.48, 0.42], [0, 0.24, 1.3], m.black, null, pianoInfo);
    for (const [lx, lz] of [
      [-0.75, -0.5],
      [0.75, -0.5],
      [0, 0.5],
    ]) {
      this.rail(pianoGroup, [lx, 0, lz], [lx, 0.72, lz], m.champagne, 0.045);
    }
    this.world.addObstacle(5, -32.0, -30.0, 27.5, 30.0);

    // Kinetic Light Show Console on M1F (clear of Dual Elevators & Central Escalators)
    this.box(g, 'Mall_kinetic_console_1F', [0.75, 1.05, 0.55], [-24.2, 0.525, 15.6], m.charcoal, 5, {
      action: 'mallKineticShow',
      floorIndex: 5,
      label: '오픈 아트리움 키네틱 고래 라이트쇼 🐋',
    });
    this.box(g, 'Mall_kinetic_gem_1F', [0.42, 0.16, 0.42], [-24.2, 1.12, 15.6], m.cyanLed, null, {
      action: 'mallKineticShow',
      floorIndex: 5,
      label: '키네틱 라이트쇼 트리거',
    });
    for (let s = 0; s < 3; s++) {
      this.box(g, `Mall_waterfall_step_${s}`, [5.2, 0.28 * (s + 1), 0.65], [-24.6, 0.14 * (s + 1), 30.8 - s * 0.7], m.warmWood, 5, {
        action: 'mallWaterfall',
        floorIndex: 5,
        label: '워터폴 가든 계단 라운지',
      });
    }

    // Central Court Indoor Trees (framing South Atrium Court clear of escalators)
    for (const [px, pz] of [
      [-23.5, 26.8],
      [-38.5, 26.8],
    ]) {
      this.cyl(g, 'Mall_M1F_planter', 1.3, 1.15, 0.45, [px, 0.225, pz], m.travertine, 5);
      this.cyl(g, 'Mall_M1F_turf', 1.2, 1.2, 0.12, [px, 0.44, pz], m.turf);
      this.rail(g, [px, 0.45, pz], [px, 4.4, pz], m.warmWood, 0.11);
      this.sph(g, 'Mall_M1F_tree', 1.7, [px, 5.0, pz], m.leaf, [1.15, 1.1, 1.15]);
    }

    // Concierge Welcome Desk (positioned West of Dual Elevators along North Atrium Promenade)
    this.box(g, 'Mall_concierge_desk', [3.2, 1.02, 1.0], [-34.2, 0.51, 10.2], m.champagne, 5, {
      action: 'mallConcierge',
      floorIndex: 5,
      label: '그랜드 아트리움 몰 컨시어지 데스크',
    });
    this.box(g, 'Mall_concierge_top', [3.35, 0.08, 1.12], [-34.2, 1.05, 10.2], m.terrazzo);

    this.sign(
      g,
      'Mall_M1F_directory_sign',
      ['THE GRAND ATRIUM MALL · M1F (7M)', '명품관 · 중앙 에스컬레이터 · 듀얼 전망 엘리베이터'],
      [-28.0, 5.4, 12.6],
      [6.0, 0.92],
      0,
      { ceilingY: MALL_STORY_H - 0.1, doubleSided: true }
    );
  }

  buildGalleryFloor(g, f) {
    // M2F (floor 7), M3F (floor 9), M4F (floor 11) - each 7.0m tall (y + 0..7.0m)
    const m = this.m;
    const meta = mallFloorMeta(f, FLOORS[f]);

    // Four wide perimeter slabs around Central Atrium Void (x ∈ [-40, -22], z ∈ [12.8, 27.2]) + Dual Lift shaft cutout
    this.slabWithCutouts(g, 'Mall_gallery_N', -50, -14, 4, 12.8, -0.1, 0.2, m.terrazzo, [SHAFT_CUTOUT]);
    this.box(g, 'Mall_gallery_S', [36, 0.2, 8.8], [-32, -0.1, 31.6], m.terrazzo);
    this.box(g, 'Mall_gallery_W', [10, 0.2, 14.4], [-45, -0.1, 20], m.terrazzo);
    this.box(g, 'Mall_gallery_E', [8, 0.2, 14.4], [-18, -0.1, 20], m.terrazzo);

    // 7.0m perimeter walls (East wall fully closed since escalators relocated to Mall Center)
    this.box(g, 'Mall_gallery_north_wall', [36, MALL_STORY_H, 0.22], [-32, MALL_STORY_H / 2, 4], m.travertine);
    this.box(g, 'Mall_gallery_west_wall', [0.22, MALL_STORY_H, 32], [-50, MALL_STORY_H / 2, 20], m.travertine);
    this.box(g, 'Mall_gallery_east_wall', [0.22, MALL_STORY_H, 32], [-14.1, MALL_STORY_H / 2, 20], m.travertine);

    // Inner atrium glass balustrades + glowing cove fascia (leaving East/West escalator bridge entries z∈[17.2,24.6] open)
    this.box(g, 'Mall_void_rail_N', [18, 1.15, 0.08], [-31, 0.575, 12.82], m.glass);
    this.box(g, 'Mall_void_fascia_N', [18.2, 0.34, 0.2], [-31, -0.08, 12.84], m.warmWood);
    this.box(g, 'Mall_void_led_N', [18.0, 0.06, 0.1], [-31, -0.26, 12.88], m.warmLed);

    this.box(g, 'Mall_void_rail_S', [18, 1.15, 0.08], [-31, 0.575, 27.18], m.glass);
    this.box(g, 'Mall_void_fascia_S', [18.2, 0.34, 0.2], [-31, -0.08, 27.16], m.warmWood);
    this.box(g, 'Mall_void_led_S', [18.0, 0.06, 0.1], [-31, -0.26, 27.12], m.warmLed);

    for (const [cz, d] of [
      [15.0, 4.4],
      [25.9, 2.6],
    ]) {
      this.box(g, 'Mall_void_rail_W', [0.08, 1.15, d], [-40.02, 0.575, cz], m.glass);
      this.box(g, 'Mall_void_fascia_W', [0.2, 0.34, d], [-40.04, -0.08, cz], m.warmWood);
      this.box(g, 'Mall_void_rail_E', [0.08, 1.15, d], [-21.98, 0.575, cz], m.glass);
      this.box(g, 'Mall_void_fascia_E', [0.2, 0.34, d], [-21.96, -0.08, cz], m.warmWood);
    }

    // Interactive Skybridge marker pads on M3F (9) & M4F (11) Central Escalator Landings
    if (f === 9 || f === 11) {
      this.box(g, `Mall_${meta.mallCode}_skybridge_marker_E`, [2.6, 0.04, 2.0], [-23.5, 0.02, 23.4], m.warmLed, null, {
        action: 'mallSkybridge',
        floorIndex: f,
        label: `${meta.mallCode} 플로팅 아트리움 스카이브리지`,
      });
      this.box(g, `Mall_${meta.mallCode}_skybridge_marker_W`, [2.6, 0.04, 2.0], [-38.5, 0.02, 23.4], m.warmLed, null, {
        action: 'mallSkybridge',
        floorIndex: f,
        label: `${meta.mallCode} 플로팅 아트리움 스카이브리지`,
      });
    }

    // Themed Flagship Stores per Double-Height Floor — all pushed flush against outer walls for wide walkways!
    const storesByFloor = {
      7: [
        { x: -15.92, z: 16.5, w: 7.2, d: 3.4, rotY: -Math.PI / 2, brandEn: 'GENTLE MONSTER', brandKo: 'M2F 젠틀몬스터 아트 쇼룸', action: 'mallShop', accentMat: m.charcoal, productColor: 0xe69f54 },
        { x: -15.92, z: 25.0, w: 6.4, d: 3.4, rotY: -Math.PI / 2, brandEn: 'NIKE RISE SEOUL', brandKo: 'M2F 나이키 서울 플래그십', action: 'mallShop', accentMat: m.darkOak, productColor: 0xd9483b },
        { x: -38.5, z: 5.92, w: 7.6, d: 3.6, rotY: 0, brandEn: 'ADER ERROR', brandKo: 'M2F 아더에러 컨템포러리', action: 'mallShop', accentMat: m.steel, productColor: 0x3b6fd9 },
        { x: -36.5, z: 33.98, w: 8.6, d: 3.8, rotY: Math.PI, brandEn: 'OLIVE YOUNG LUXE', brandKo: 'M2F 프리미엄 뷰티 라운지', action: 'mallShop', accentMat: m.champagne, productColor: 0x73c97b },
      ],
      9: [
        { x: -15.92, z: 15.5, w: 7.2, d: 3.4, rotY: -Math.PI / 2, brandEn: 'APPLE GRAND ATRIUM', brandKo: 'M3F 애플 플래그십 스토어', action: 'mallShop', accentMat: m.warmWood, productColor: 0xc2ccd6 },
        { x: -15.92, z: 25.2, w: 6.4, d: 3.4, rotY: -Math.PI / 2, brandEn: 'GALAXY AI STUDIO', brandKo: 'M3F 삼성 갤럭시 스튜디오', action: 'mallShop', accentMat: m.charcoal, productColor: 0x4fb8ff },
        { x: -48.08, z: 20.0, w: 8.4, d: 3.6, rotY: Math.PI / 2, brandEn: 'SONY PLAYSTATION', brandKo: 'M3F 소니 & 플레이스테이션 존', action: 'mallShop', accentMat: m.charcoal, productColor: 0x5c7cfa },
        { x: -36.5, z: 33.98, w: 8.6, d: 3.8, rotY: Math.PI, brandEn: 'LEGO & ART TOY', brandKo: 'M3F 레고 브랜드 스토어', action: 'mallShop', accentMat: m.vermilion, productColor: 0xf2c94c },
      ],
      11: [
        { x: -15.92, z: 15.5, w: 7.2, d: 3.4, rotY: -Math.PI / 2, brandEn: 'GORDON RAMSAY BURGER', brandKo: 'M4F 고든램지 시그니처 다이닝', action: 'mallFood', accentMat: m.darkOak, productColor: 0xe6843c },
        { x: -15.92, z: 25.2, w: 6.4, d: 3.4, rotY: -Math.PI / 2, brandEn: 'SUSHI SORA OMAKASE', brandKo: 'M4F 스시 소라 오마카세', action: 'mallFood', accentMat: m.warmWood, productColor: 0xf2b591 },
        { x: -48.08, z: 20.0, w: 8.4, d: 3.6, rotY: Math.PI / 2, brandEn: 'OSTERIA TRUFFLE', brandKo: 'M4F 오스테리아 이탈리안', action: 'mallFood', accentMat: m.champagne, productColor: 0xc44b4b },
        { x: -36.5, z: 33.98, w: 8.6, d: 3.8, rotY: Math.PI, brandEn: 'KYOTO MATCHA LAB', brandKo: 'M4F 교토 말차 디저트 랩', action: 'mallFood', accentMat: m.leaf, productColor: 0x62b56c },
      ],
    };
    for (const storeSpec of storesByFloor[f] || []) {
      this.buildStorefront(g, f, storeSpec);
    }

    // On M2F (floor 7): 4-Cut Photo Booth, LP Vinyl DJ Booth, and Starfield Reading Desk
    if (f === 7) {
      const pbInfo = { action: 'mallPhotoBooth', floorIndex: f, label: '인생네컷 셀프 포토부스 촬영 📸' };
      this.box(g, 'Mall_photo_booth', [2.2, 2.6, 1.7], [-22.2, 1.3, 5.0], m.vermilion, f, pbInfo);
      this.box(g, 'Mall_photo_ring', [0.9, 0.9, 0.12], [-22.2, 1.65, 5.88], m.warmLed, null, pbInfo);
      this.sign(g, 'Mall_photo_sign', ['PHOTO 4-CUT STUDIO', '클릭 시 플래시 촬영 📸'], [-22.2, 2.74, 5.88], [2.2, 0.45], 0);

      const djInfo = { action: 'mallDjBooth', floorIndex: f, label: 'LP 바이닐 DJ 턴테이블 🎧' };
      this.box(g, 'Mall_dj_booth', [3.2, 1.08, 1.2], [-29.5, 0.54, 30.8], m.darkOak, f, djInfo);
      for (const ox of [-0.7, 0.7]) {
        const vinyl = new THREE.Mesh(unitCyl, m.black);
        vinyl.scale.set(0.36, 0.03, 0.36);
        vinyl.position.set(-29.5 + ox, 1.11, 30.8);
        vinyl.userData.dynamic = true;
        this.markInteractive(vinyl, djInfo);
        g.add(vinyl);
        this.djPlatters.push(vinyl);
      }
      for (let b = 0; b < 7; b++) {
        const eq = new THREE.Mesh(unitBox, m.cyanLed);
        eq.scale.set(0.22, 0.45, 0.08);
        eq.position.set(-30.4 + b * 0.3, 1.3, 30.15);
        eq.userData = { dynamic: true, phase: b * 0.7 };
        g.add(eq);
        this.djEqBars.push(eq);
      }

      const libDeskInfo = { action: 'mallLibrarySeat', floorIndex: f, seatX: -43.5, seatZ: 20.0, seatYaw: Math.PI / 2, label: '별마당 도서관 열람석 착석 📖' };
      this.box(g, 'Mall_library_desk', [1.2, 0.76, 3.6], [-43.5, 0.38, 20.0], m.warmWood, f, libDeskInfo);
      this.box(g, 'Mall_library_lamp', [0.35, 0.35, 0.35], [-43.5, 0.94, 20.0], m.warmLed, null, libDeskInfo);
    }

    // On M3F (floor 9): Neon Bowling, Claw/Gacha Arcade, Rhythm Stage, teamLab Light Room & AI Robot Dog
    if (f === 9) {
      const bowlInfo = { action: 'mallBowling', floorIndex: f, label: '네온 미니 볼링 스트라이크 도전 🎳' };
      this.box(g, 'Mall_bowling_lane', [9.0, 0.14, 1.8], [-42.0, 0.07, 6.2], m.warmWood, null, bowlInfo);
      this.box(g, 'Mall_bowling_neon_L', [9.0, 0.08, 0.1], [-42.0, 0.15, 5.3], m.cyanLed, null, bowlInfo);
      this.box(g, 'Mall_bowling_neon_R', [9.0, 0.08, 0.1], [-42.0, 0.15, 7.1], m.cyanLed, null, bowlInfo);
      const ball = new THREE.Mesh(unitSphere, m.vermilion);
      ball.scale.setScalar(0.2);
      ball.position.set(-38.0, 0.32, 6.2);
      ball.userData.dynamic = true;
      this.markInteractive(ball, bowlInfo);
      g.add(ball);
      this.bowlingBall = ball;
      for (const [px, pz] of [
        [-45.6, 6.2],
        [-46.0, 5.95],
        [-46.0, 6.45],
        [-46.4, 5.75],
        [-46.4, 6.2],
        [-46.4, 6.65],
      ]) {
        const pin = new THREE.Mesh(unitCyl, m.white);
        pin.scale.set(0.08, 0.48, 0.08);
        pin.position.set(px, 0.38, pz);
        pin.userData = { dynamic: true, basePos: [px, 0.38, pz] };
        this.markInteractive(pin, bowlInfo);
        g.add(pin);
        this.bowlingPins.push(pin);
      }
      this.box(g, 'Mall_bowling_backstop', [0.5, 2.2, 2.1], [-46.8, 1.1, 6.2], m.charcoal, f, bowlInfo);

      const arcInfo = { action: 'mallArcade', floorIndex: f, label: '인형뽑기 & 캡슐 가챠폰 뽑기 🕹️' };
      this.box(g, 'Mall_arcade_claw', [3.0, 2.2, 1.1], [-21.2, 1.1, 4.9], m.charcoal, f, arcInfo);
      this.box(g, 'Mall_arcade_glass', [2.6, 1.1, 1.15], [-21.2, 1.45, 4.9], m.glass, null, arcInfo);
      for (const [cx, clr] of [
        [-21.9, 0xf28b82],
        [-21.2, 0xfbbc04],
        [-20.5, 0x81c995],
      ]) {
        const capMat = new THREE.MeshStandardMaterial({ color: clr, roughness: 0.25 });
        this.sph(g, 'Mall_gacha_capsule', 0.22, [cx, 1.15, 4.9], capMat, [1, 1, 1], arcInfo);
      }

      const rhythmInfo = { action: 'mallRhythmFloor', floorIndex: f, label: '네온 리듬 댄스 스테이지 밟기 💃' };
      for (let rx = 0; rx < 3; rx++) {
        for (let rz = 0; rz < 3; rz++) {
          const tileMat = new THREE.MeshStandardMaterial({
            color: 0x1b2b36,
            emissive: 0x3b8eff,
            emissiveIntensity: 0.45,
            roughness: 0.25,
          });
          const tile = new THREE.Mesh(unitBox, tileMat);
          tile.name = `Mall_rhythm_tile_${rx}_${rz}`;
          tile.scale.set(1.05, 0.04, 1.05);
          tile.position.set(-28.6 + rx * 1.15, 0.02, 29.8 + rz * 1.15);
          tile.userData = { dynamic: true, phase: rx * 0.9 + rz * 1.3 };
          this.markInteractive(tile, rhythmInfo);
          g.add(tile);
          this.rhythmTiles.push(tile);
        }
      }

      const tlInfo = { action: 'mallTeamLab', floorIndex: f, label: '인피니티 라이트 미디어아트 룸 체험 🌌' };
      this.box(g, 'Mall_teamlab_room', [7.2, 4.6, 5.4], [-46.2, 2.3, 30.2], m.black);
      this.sign(g, 'Mall_teamlab_sign', ['INFINITE LIGHT GARDEN · teamLab', '디지털 미디어아트 체험관'], [-42.55, 3.6, 30.2], [3.6, 0.72], Math.PI / 2);
      for (let i = 0; i < 6; i++) {
        const px = -48.2 + (i % 3) * 2.0;
        const pz = 28.8 + Math.floor(i / 3) * 2.6;
        const pMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x4fb8ff,
          emissiveIntensity: 0.85,
          transparent: true,
          opacity: 0.88,
        });
        const pil = new THREE.Mesh(unitCyl, pMat);
        pil.name = `Mall_teamlab_pillar_${i}`;
        pil.scale.set(0.18, 4.2, 0.18);
        pil.position.set(px, 2.1, pz);
        pil.userData = { dynamic: true, phase: i * 0.85 };
        this.markInteractive(pil, tlInfo);
        g.add(pil);
        this.teamLabPillars.push(pil);
      }

      this.box(g, 'Mall_kinetic_console_3F', [0.7, 1.05, 0.55], [-23.2, 0.525, 18.0], m.charcoal, f, {
        action: 'mallKineticShow',
        floorIndex: f,
        label: '아트리움 공중 키네틱 쇼 제어 🐋',
      });

      const dog = new THREE.Group();
      dog.name = 'Mall_robot_dog';
      dog.position.set(-31.0, 0, 12.0);
      dog.userData.dynamic = true;
      const dogInfo = { action: 'mallRobotDog', floorIndex: f, label: 'AI 로봇강아지 SPOT-M 하이파이브 🐕' };
      const dogBody = new THREE.Mesh(unitBox, m.yellow);
      dogBody.scale.set(0.34, 0.24, 0.68);
      dogBody.position.y = 0.42;
      this.markInteractive(dogBody, dogInfo);
      const dogHead = new THREE.Mesh(unitBox, m.charcoal);
      dogHead.scale.set(0.24, 0.2, 0.28);
      dogHead.position.set(0, 0.56, 0.38);
      this.markInteractive(dogHead, dogInfo);
      const dogVisor = new THREE.Mesh(unitBox, m.cyanLed);
      dogVisor.scale.set(0.22, 0.08, 0.04);
      dogVisor.position.set(0, 0.57, 0.52);
      dog.add(dogBody, dogHead, dogVisor);
      for (const [lx, lz] of [
        [-0.14, 0.24],
        [0.14, 0.24],
        [-0.14, -0.24],
        [0.14, -0.24],
      ]) {
        const leg = new THREE.Mesh(unitCyl, m.black);
        leg.scale.set(0.05, 0.36, 0.05);
        leg.position.set(lx, 0.18, lz);
        dog.add(leg);
      }
      g.add(dog);
      this.robotDog = dog;
    }

    // On M4F (floor 11): Rotating Conveyor Belt Sushi, Live Teppanyaki Flames, Matcha Bar, & Slide Portal
    if (f === 11) {
      const sushiInfo = { action: 'mallSushiBelt', floorIndex: f, label: '회전초밥 오마카세 한 접시 맛보기 🍣' };
      this.box(g, 'Mall_sushi_belt', [5.2, 0.85, 2.0], [-21.2, 0.425, 5.8], m.darkOak, f, sushiInfo);
      this.box(g, 'Mall_sushi_track', [4.8, 0.06, 1.5], [-21.2, 0.88, 5.8], m.charcoal, null, sushiInfo);
      for (let i = 0; i < 8; i++) {
        const plateMat = new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe6843c : 0x57b887, roughness: 0.3 });
        const plate = new THREE.Mesh(unitCyl, plateMat);
        plate.name = `Mall_sushi_plate_${i}`;
        plate.scale.set(0.24, 0.06, 0.24);
        plate.userData = { dynamic: true, idx: i, cx: -21.2, cz: 5.8 };
        this.markInteractive(plate, sushiInfo);
        g.add(plate);
        this.sushiPlates.push(plate);
      }

      const teppInfo = { action: 'mallTeppanyaki', floorIndex: f, label: '테판야키 라이브 플람베 불꽃쇼 🔥' };
      this.box(g, 'Mall_teppanyaki_grill', [3.8, 0.92, 1.4], [-37.5, 0.46, 5.4], m.steel, f, teppInfo);
      for (let k = 0; k < 3; k++) {
        const fMat = new THREE.MeshStandardMaterial({
          color: 0xff7b29,
          emissive: 0xff4500,
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.85,
        });
        const flame = new THREE.Mesh(unitSphere, fMat);
        flame.name = `Mall_teppanyaki_flame_${k}`;
        flame.scale.set(0.22, 0.38, 0.22);
        flame.position.set(-38.4 + k * 0.9, 1.15, 5.4);
        flame.userData = { dynamic: true, baseY: 1.15, phase: k * 1.1 };
        this.markInteractive(flame, teppInfo);
        g.add(flame);
        this.teppanFlames.push(flame);
      }

      this.box(g, 'Mall_matcha_bar', [2.6, 1.0, 1.0], [-46.2, 0.5, 31.0], m.leaf, f, {
        action: 'mallMatchaCone',
        floorIndex: f,
        label: '교토 프리미엄 말차 젤라또 수령 🍵',
      });
      this.cyl(g, 'Mall_dining_table_terrace', 0.85, 0.85, 0.78, [-31.0, 0.39, 12.0], m.terrazzo, f, {
        action: 'mallDiningSeat',
        floorIndex: f,
        seatX: -31.0,
        seatZ: 11.4,
        seatYaw: Math.PI,
        label: 'M4F 아트리움 테라스 테이블 착석 🍽️',
      });

      this.box(g, 'Mall_slide_gate_M4F', [1.4, 1.6, 0.9], [-37.2, 0.8, 12.2], m.cyanLed, null, {
        action: 'mallSpiralSlide',
        floorIndex: f,
        label: '35m 투명 나선형 슬라이드 탑승 (M4F→M1F) 🛝',
      });

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
      [-28.0, 5.4, 12.6],
      [5.4, 0.85],
      0,
      { ceilingY: MALL_STORY_H - 0.1, doubleSided: true }
    );
  }

  buildTopCinemaM5F(g) {
    // M5F (floorIndex = 13, y = 28.0..35.0m, 7m height) - Top-Floor GRAND CINEMA MULTIPLEX (IMAX) + Sounds Forest Observatory
    const m = this.m;
    const f = 13;
    // Full deck minus twin atrium lightwells north of escalators ([-34.6,-31.2]x[13.2,16.2], [-25.6,-22.2]x[13.2,16.2]), Dual Lift shaft, & Central Escalators
    const LW_W = { minX: -34.6, maxX: -31.2, minZ: 13.2, maxZ: 16.2 };
    const LW_E = { minX: -25.6, maxX: -22.2, minZ: 13.2, maxZ: 16.2 };
    this.slabWithCutouts(g, 'Mall_M5F_north', -50, -14, 4, 17.2, -0.1, 0.2, m.terrazzo, [SHAFT_CUTOUT, LW_W, LW_E]);
    this.box(g, 'Mall_M5F_south', [36, 0.2, 11.4], [-32, -0.1, 30.3], m.terrazzo);
    this.box(g, 'Mall_M5F_west_strip', [10.5, 0.2, 7.4], [-44.75, -0.1, 20.9], m.darkOak);
    this.box(g, 'Mall_M5F_east_strip', [7.9, 0.2, 7.4], [-18.05, -0.1, 20.9], m.terrazzo);

    // Outer walls (East wall fully closed cleanly)
    this.box(g, 'Mall_M5F_north_wall', [36, MALL_STORY_H, 0.22], [-32, MALL_STORY_H / 2, 4], m.travertine);
    this.box(g, 'Mall_M5F_west_wall', [0.22, MALL_STORY_H, 32], [-50, MALL_STORY_H / 2, 20], m.charcoal);
    this.box(g, 'Mall_M5F_east_wall', [0.22, MALL_STORY_H, 32], [-14.1, MALL_STORY_H / 2, 20], m.glass);

    // Twin Atrium Lightwell Railings (North of direct escalators)
    for (const [cx, w, cz, d] of [
      [-32.9, 3.4, 14.7, 3.0],
      [-23.9, 3.4, 14.7, 3.0],
    ]) {
      this.box(g, 'Mall_lightwell_rail_N', [w, 1.15, 0.08], [cx, 0.575, cz - d / 2], m.glass);
      this.box(g, 'Mall_lightwell_rail_S', [w, 1.15, 0.08], [cx, 0.575, cz + d / 2], m.glass);
      this.box(g, 'Mall_lightwell_rail_W', [0.08, 1.15, d], [cx - w / 2, 0.575, cz], m.glass);
      this.box(g, 'Mall_lightwell_rail_E', [0.08, 1.15, d], [cx + w / 2, 0.575, cz], m.glass);
    }

    // 1. Enclosed Walk-in IMAX Auditorium 1 in West Cinema Wing (x ∈ [-49.8, -39.6], z ∈ [13.6, 35.0])
    // Full acoustic partition walls enclosing East side & North foyer except the 2.2m QR Ticket Gate portal (x ∈ [-43.0, -40.8])
    this.box(g, 'Cinema_east_wall_full', [0.25, 6.4, 21.8], [-39.6, 3.2, 24.6], m.charcoal);
    this.box(g, 'Cinema_north_wall_W', [6.8, 6.4, 0.25], [-46.4, 3.2, 13.6], m.charcoal);
    this.box(g, 'Cinema_north_wall_E', [1.2, 6.4, 0.25], [-40.2, 3.2, 13.6], m.charcoal);
    this.box(g, 'Cinema_north_lintel', [2.2, 3.4, 0.25], [-41.9, 4.7, 13.6], m.charcoal);
    this.box(g, 'Cinema_ceiling', [10.4, 0.25, 22.0], [-44.8, 6.4, 24.5], m.charcoal);
    this.box(g, 'Cinema_marquee_strip', [9.0, 0.1, 0.14], [-44.5, 5.9, 13.45], m.cyanLed);
    this.sign(g, 'Cinema_auditorium_sign', ['IMAX LASER · HALL 1', 'NOW PLAYING · THE GRAND HORIZON'], [-44.5, 5.3, 13.42], [4.8, 0.85], 0);

    // Acoustic wall ribs & warm theater sconces along both interior side walls
    for (const [idx, az] of [17.0, 21.0, 25.0, 29.0, 32.5].entries()) {
      this.box(g, `Cinema_acoustic_panel_W_${idx}`, [0.16, 4.8, 1.8], [-49.75, 2.8, az], m.cinemaRed);
      this.box(g, `Cinema_acoustic_panel_E_${idx}`, [0.16, 4.8, 1.8], [-39.8, 2.8, az], m.cinemaRed);
      this.box(g, `Cinema_wall_sconce_W_${idx}`, [0.08, 0.45, 0.14], [-49.64, 2.6, az], m.warmLed);
      this.box(g, `Cinema_wall_sconce_E_${idx}`, [0.08, 0.45, 0.14], [-39.91, 2.6, az], m.warmLed);
    }

    // Rear Laser Projection Booth Window overlooking auditorium
    this.box(g, 'Cinema_projection_window', [2.6, 0.9, 0.14], [-45.2, 4.8, 13.78], m.glass);
    this.cyl(g, 'Cinema_projection_lens', 0.22, 0.22, 0.18, [-45.2, 4.8, 13.86], m.cyanLed, null, null);

    // Proscenium stage deck & Dolby Atmos speaker arrays flanking the IMAX screen
    this.box(g, 'Cinema_stage_deck', [9.6, 0.42, 1.4], [-44.6, 0.21, 33.8], m.darkOak);
    this.box(g, 'Cinema_speaker_L', [0.55, 2.2, 0.45], [-49.3, 3.2, 33.6], m.black);
    this.box(g, 'Cinema_speaker_R', [0.55, 2.2, 0.45], [-40.1, 3.2, 33.6], m.black);

    // Smart Ticket Inspection Flap Gate at (x = -41.9, z = 13.55)
    const gateGroup = new THREE.Group();
    gateGroup.name = 'Cinema_ticket_gate';
    g.add(gateGroup);
    const gateInfo = {
      action: 'mallCinemaGate',
      floorIndex: f,
      label: 'IMAX 상영관 스마트 티켓 검표 게이트 (QR 티켓 스캔) 🎟️',
    };
    const pedL = this.box(gateGroup, 'Cinema_gate_pedestal_L', [0.32, 1.08, 0.68], [-43.0, 0.54, 13.35], m.champagne, f, gateInfo);
    const pedR = this.box(gateGroup, 'Cinema_gate_pedestal_R', [0.32, 1.08, 0.68], [-40.8, 0.54, 13.35], m.champagne, f, gateInfo);
    pedL.userData.dynamic = true;
    pedR.userData.dynamic = true;

    this.cinemaGateScannerLeds = [];
    for (const [idx, gx] of [-43.0, -40.8].entries()) {
      const scanPad = this.box(
        gateGroup,
        `Cinema_qr_scanner_${idx === 0 ? 'L' : 'R'}`,
        [0.24, 0.08, 0.26],
        [gx, 1.1, 13.18],
        m.charcoal,
        null,
        gateInfo
      );
      scanPad.userData.dynamic = true;
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xffaa3b,
        emissive: 0xff7a1a,
        emissiveIntensity: 0.9,
        roughness: 0.25,
      });
      const ledMesh = new THREE.Mesh(unitBox, ledMat);
      ledMesh.name = `Cinema_gate_led_${idx === 0 ? 'L' : 'R'}`;
      ledMesh.scale.set(0.2, 0.05, 0.16);
      ledMesh.position.set(gx, 1.14, 13.18);
      ledMesh.userData.dynamic = true;
      this.markInteractive(ledMesh, gateInfo);
      gateGroup.add(ledMesh);
      this.cinemaGateScannerLeds.push(ledMesh);
    }

    const gateDoorL = new THREE.Mesh(unitBox, m.glass);
    gateDoorL.name = 'Cinema_gate_door_L';
    gateDoorL.scale.set(0.92, 0.88, 0.05);
    gateDoorL.position.set(-42.38, 0.52, 13.55);
    gateDoorL.userData.dynamic = true;
    this.markInteractive(gateDoorL, gateInfo);
    const gateDoorR = new THREE.Mesh(unitBox, m.glass);
    gateDoorR.name = 'Cinema_gate_door_R';
    gateDoorR.scale.set(0.92, 0.88, 0.05);
    gateDoorR.position.set(-41.42, 0.52, 13.55);
    gateDoorR.userData.dynamic = true;
    this.markInteractive(gateDoorR, gateInfo);
    gateGroup.add(gateDoorL, gateDoorR);
    this.cinemaGateDoors = { left: gateDoorL, right: gateDoorR };

    const gateDispRes = safeCanvasTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#141a24';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff9d3b';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TICKET REQUIRED', w / 2, 54);
      ctx.fillStyle = '#d9e5f0';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('북측 무인 키오스크 발권 후 QR 스캔', w / 2, 98);
    });
    if (gateDispRes) {
      const gMat = new THREE.MeshStandardMaterial({
        map: gateDispRes.tex,
        emissiveMap: gateDispRes.tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.78,
        roughness: 0.25,
      });
      const gScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.52), gMat);
      gScreen.name = 'Cinema_gate_status_screen';
      gScreen.position.set(-41.9, 3.35, 13.44);
      gScreen.rotation.y = Math.PI;
      gScreen.userData.dynamic = true;
      this.markInteractive(gScreen, gateInfo);
      gateGroup.add(gScreen);
      this.cinemaGateDisplay = { ...gateDispRes, lastKey: '' };
    }

    // Giant 9.2m × 5.0m Glowing Animated IMAX Cinema Screen at z = 34.4 facing North (-Z)
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

    // 3 Rows of Plush Crimson Velvet VIP Recliner Seats with Armrests & Illuminated Aisle Steps
    for (let rowIdx = 0; rowIdx < CINEMA_ROW_ZS.length; rowIdx++) {
      const { sz, riserH, riserCenterY, riserTop, seatTop } = cinemaRowMetrics(rowIdx);
      this.box(g, `Cinema_aisle_led_${rowIdx}`, [0.22, 0.04, 1.55], [-41.6, riserTop + 0.02, sz], m.warmLed);
      for (let col = 0; col < CINEMA_COL_XS.length; col++) {
        const sx = CINEMA_COL_XS[col];
        const seatInfo = {
          action: 'mallCinemaSeat',
          floorIndex: f,
          seatX: sx,
          seatZ: sz - 0.07,
          seatYaw: Math.PI,
          label: `IMAX VIP ${['C', 'B', 'A'][rowIdx]}열 ${col + 1}번 좌석 착석`,
        };
        this.box(g, 'Cinema_seat_pedestal', [0.56, 0.27, 0.36], [sx, riserTop + 0.135, sz - 0.08], m.charcoal, null, seatInfo);
        this.box(g, 'Cinema_seat_base', [0.78, 0.18, 0.54], [sx, riserTop + 0.36, sz - 0.04], m.cinemaRed, null, seatInfo);
        this.box(g, 'Cinema_seat_back', [0.78, 0.85, 0.18], [sx, seatTop + 0.245, sz - 0.3], m.cinemaRed, null, seatInfo);
        this.box(g, 'Cinema_seat_arm_L', [0.12, 0.34, 0.54], [sx - 0.42, riserTop + 0.44, sz - 0.04], m.charcoal, null, seatInfo);
        this.box(g, 'Cinema_seat_arm_R', [0.12, 0.34, 0.54], [sx + 0.42, riserTop + 0.44, sz - 0.04], m.charcoal, null, seatInfo);
      }
      this.box(g, 'Cinema_riser', [8.4, riserH, 1.8], [-44.6, riserCenterY, sz], m.charcoal);
    }

    // 2. Self-Ticketing Touchscreen Kiosks & Gourmet Popcorn Concession Zone (North Foyer)
    this.buildStorefront(g, f, {
      x: -18.5,
      z: 5.82,
      w: 6.4,
      d: 3.4,
      rotY: 0,
      brandEn: 'GRAND CINEMA TICKETS',
      brandKo: 'M5F 시네마 티켓팅 라운지',
      action: 'mallCinemaTicket',
      accentMat: m.charcoal,
      productColor: 0xf4c45c,
    });
    // 4 Freestanding Touchscreen Ticket Kiosks at z = 7.85 facing South (+Z)
    const kioskUiTex = safeCanvasTexture(256, 384, (ctx, w, h) => {
      ctx.fillStyle = '#0e1928';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f4c45c';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SELF TICKETING', w / 2, 54);
      ctx.fillStyle = '#6fe7db';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('IMAX 4K 예매 · 발권', w / 2, 92);
      ctx.fillStyle = '#1f3b58';
      ctx.fillRect(28, 130, w - 56, 130);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('QR 티켓 즉석 발권', w / 2, 205);
      ctx.fillStyle = '#f4c45c';
      ctx.fillRect(48, 290, w - 96, 52);
      ctx.fillStyle = '#0e1928';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('TOUCH TO BUY', w / 2, 324);
    });
    const kioskScreenMat = kioskUiTex
      ? new THREE.MeshStandardMaterial({
          map: kioskUiTex.tex,
          emissiveMap: kioskUiTex.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.72,
          roughness: 0.2,
        })
      : m.cyanLed;
    for (const [kIdx, kx] of [-21.2, -19.4, -17.6, -15.8].entries()) {
      const tKioskInfo = {
        action: 'mallCinemaTicket',
        floorIndex: f,
        label: `영화 예매 무인 발권 키오스크 #${kIdx + 1} (QR 티켓 즉시 발권) 🎟️`,
      };
      this.box(g, `Cinema_ticket_kiosk_${kIdx}`, [0.68, 1.92, 0.42], [kx, 0.96, 7.85], m.charcoal, f, tKioskInfo);
      const tScr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.86), kioskScreenMat);
      tScr.name = `Cinema_ticket_kiosk_screen_${kIdx}`;
      tScr.position.set(kx, 1.38, 8.07);
      this.markInteractive(tScr, tKioskInfo);
      g.add(tScr);
      this.box(g, `Cinema_ticket_kiosk_nfc_${kIdx}`, [0.22, 0.08, 0.14], [kx, 0.82, 8.11], m.cyanLed, null, tKioskInfo);
    }

    this.buildStorefront(g, f, {
      x: -36.8,
      z: 5.82,
      w: 7.4,
      d: 3.4,
      rotY: 0,
      brandEn: 'GOURMET POPCORN BAR',
      brandKo: 'M5F 카라멜 팝콘 & 나초 매점',
      action: 'mallCinemaSnack',
      accentMat: m.vermilion,
      productColor: 0xffe075,
    });
    // Popcorn Warmer Showcase, Soda Dispenser, & Overhead Combo Menu Board at Concession Pickup Counter
    const snackPickupInfo = {
      action: 'mallCinemaSnack',
      floorIndex: f,
      label: '시네마 매점 픽업 바 · 카라멜 팝콘 & 음료 수령 🍿',
    };
    this.box(g, 'Cinema_popcorn_warmer', [0.95, 0.82, 0.62], [-37.6, 1.5, 6.95], m.glass, null, snackPickupInfo);
    this.box(g, 'Cinema_popcorn_gold', [0.72, 0.56, 0.42], [-37.6, 1.4, 6.95], m.warmLed, null, snackPickupInfo);
    this.box(g, 'Cinema_soda_fountain', [0.85, 0.78, 0.56], [-36.0, 1.48, 6.95], m.steel, null, snackPickupInfo);
    this.sign(
      g,
      'Cinema_menu_board',
      ['COMBO MENU · POPCORN & DRINK', '1. 카라멜 팝콘 콤보  2. 치즈 나초  3. 오징어 콤보'],
      [-36.8, 3.2, 6.85],
      [4.2, 0.68],
      0,
      { floorY: 1.05 }
    );

    // 3 Freestanding Concession Self-Order Kiosks at x = -43.2, -41.8, -40.4, z = 7.85
    const snackKioskTex = safeCanvasTexture(256, 384, (ctx, w, h) => {
      ctx.fillStyle = '#241118';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffe075';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SNACK KIOSK', w / 2, 54);
      ctx.fillStyle = '#ff8a65';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('매점 셀프 주문 키오스크', w / 2, 92);
      ctx.fillStyle = '#471f28';
      ctx.fillRect(28, 130, w - 56, 130);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('팝콘 · 나초 · 에이드', w / 2, 205);
      ctx.fillStyle = '#ffe075';
      ctx.fillRect(48, 290, w - 96, 52);
      ctx.fillStyle = '#241118';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('ORDER COMBO', w / 2, 324);
    });
    const snackScreenMat = snackKioskTex
      ? new THREE.MeshStandardMaterial({
          map: snackKioskTex.tex,
          emissiveMap: snackKioskTex.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.72,
          roughness: 0.2,
        })
      : m.warmLed;
    for (const [sIdx, sx] of [-43.2, -41.8, -40.4].entries()) {
      const sKioskInfo = {
        action: 'mallCinemaSnack',
        floorIndex: f,
        label: `매점 셀프 오더 키오스크 #${sIdx + 1} (팝콘 & 음료 주문) 🍿`,
      };
      this.box(g, `Cinema_snack_kiosk_${sIdx}`, [0.68, 1.92, 0.42], [sx, 0.96, 7.85], m.vermilion, f, sKioskInfo);
      const sScr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.86), snackScreenMat);
      sScr.name = `Cinema_snack_kiosk_screen_${sIdx}`;
      sScr.position.set(sx, 1.38, 8.07);
      this.markInteractive(sScr, sKioskInfo);
      g.add(sScr);
      this.box(g, `Cinema_snack_kiosk_nfc_${sIdx}`, [0.22, 0.08, 0.14], [sx, 0.82, 8.11], m.warmLed, null, sKioskInfo);
    }

    // Illuminated Movie Poster Lightboxes along North Corridor
    for (const [px, title] of [
      [-46.5, 'DUNE: ATRIUM'],
      [-31.8, 'SEOUL SKYLINE'],
      [-23.8, 'STARLIGHT 4K'],
    ]) {
      this.box(g, 'Cinema_poster_box', [1.8, 2.5, 0.14], [px, 1.85, 4.25], m.warmLed, null, {
        action: 'mallCinemaTicket',
        floorIndex: f,
        label: `${title} 상영 안내 · 키오스크 예매`,
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

    // 4. M5F 4DX Program Switcher Console (Lobby beside Gate), Top Spiral Slide Portal, Glamping Campfire, & Wishing Fountain
    this.box(g, 'Mall_cinema_switcher', [0.75, 1.12, 0.55], [-44.2, 0.56, 12.6], m.charcoal, f, {
      action: 'mallCinemaSwitch',
      floorIndex: f,
      label: 'IMAX 4DX 상영 영화 실시간 변경 🎬',
    });
    this.box(g, 'Mall_cinema_switcher_led', [0.46, 0.16, 0.36], [-44.2, 1.18, 12.6], m.cyanLed, null, {
      action: 'mallCinemaSwitch',
      floorIndex: f,
      label: '상영작 전환',
    });

    this.box(g, 'Mall_slide_gate_M5F', [1.4, 1.6, 0.9], [-37.2, 0.8, 12.2], m.cyanLed, null, {
      action: 'mallSpiralSlide',
      floorIndex: f,
      label: '35m 투명 나선형 슬라이드 탑승 (M5F→M1F 활강) 🛝',
    });

    // Glamping Campfire & Marshmallow Lounge
    const fireInfo = { action: 'mallCampfire', floorIndex: f, label: '사운즈 포레스트 모닥불 불멍 & 마시멜로 🔥' };
    this.cyl(g, 'Mall_glamping_campfire', 1.1, 1.25, 0.32, [-21.5, 0.32, 31.5], m.travertine, f, fireInfo);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff8a2b,
      emissive: 0xff4d00,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.88,
    });
    const campFlame = new THREE.Mesh(unitSphere, flameMat);
    campFlame.name = 'Mall_campfire_flame';
    campFlame.scale.set(0.38, 0.72, 0.38);
    campFlame.position.set(-21.5, 0.88, 31.5);
    campFlame.userData.dynamic = true;
    this.markInteractive(campFlame, fireInfo);
    g.add(campFlame);
    this.campfireFlame = campFlame;

    // Central Wishing Fountain (North-Central Promenade at -28, 14.5)
    const wishInfo = { action: 'mallWishingWell', floorIndex: f, label: '행운의 소원 분수 동전 던지기 🪙' };
    this.cyl(g, 'Mall_wishing_fountain', 1.45, 1.55, 0.56, [-28.0, 0.28, 14.5], m.travertine, f, wishInfo);
    const wishWater = this.cyl(g, 'Mall_wishing_water', 1.28, 1.28, 0.1, [-28.0, 0.56, 14.5], m.water, null, wishInfo);
    wishWater.userData.dynamic = true;

    this.sign(
      g,
      'Mall_M5F_banner',
      ['M5F GRAND CINEMA · IMAX MULTIPLEX & SOUNDS FOREST', '시네마 매표소 · 4DX 상영관 · 모닥불 정원 · 35m 슬라이드'],
      [-28.0, 5.4, 12.6],
      [6.4, 0.92],
      0,
      { ceilingY: MALL_STORY_H + 0.3, doubleSided: true }
    );
  }

  buildSpiralSlide() {
    // 35m Giant Transparent Glass Spiral Slide descending from M5F (28m) & M4F (21m) to M1F (0.2m)
    const slide = new THREE.Group();
    slide.name = 'Mall_spiral_slide';
    const cx = -37.2;
    const cz = 14.9;
    const r = 1.8;
    const turns = 3.2;
    const totalSegs = 28;
    const topY = 28.0;
    for (let i = 0; i < totalSegs; i++) {
      const t0 = i / totalSegs;
      const t1 = (i + 1) / totalSegs;
      const a0 = t0 * Math.PI * 2 * turns;
      const a1 = t1 * Math.PI * 2 * turns;
      const p0 = [cx + Math.cos(a0) * r, topY * (1 - t0) + 0.35, cz + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, topY * (1 - t1) + 0.35, cz + Math.sin(a1) * r];
      this.rail(slide, p0, p1, this.m.glass, 0.52);
      if (i % 4 === 0) {
        this.rail(slide, p0, p1, this.m.champagne, 0.08);
      }
    }
    this.box(slide, 'Mall_slide_finish_pad', [2.6, 0.25, 2.2], [-35.2, 0.125, 14.9], this.m.cyanLed, null, {
      action: 'mallKineticShow',
      floorIndex: 5,
      label: '35m 스파이럴 슬라이드 도착 패드',
    });
    this.root.add(slide);
  }

  buildKineticAurora() {
    // Inspire-style Aerial Kinetic Whale & Drone Wave Lights under the 35m Glass Skylight
    const group = new THREE.Group();
    group.name = 'Mall_kinetic_aurora_show';
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const ox = -37.0 + t * 12.0;
      const oz = 20.0 + Math.sin(t * Math.PI * 2) * 3.8;
      const oy = 25.5 + Math.sin(t * Math.PI) * 3.2;
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0x9cf7ec,
        emissive: 0x3ecfb9,
        emissiveIntensity: 0.9,
        roughness: 0.18,
      });
      const orb = new THREE.Mesh(unitSphere, orbMat);
      orb.name = `Mall_kinetic_orb_${i}`;
      orb.scale.setScalar(i % 4 === 0 ? 0.45 : 0.28);
      orb.position.set(ox, oy, oz);
      orb.userData = { dynamic: true, baseX: ox, baseY: oy, baseZ: oz, phase: i * 0.42 };
      this.markInteractive(orb, { action: 'mallKineticShow', label: '공중 키네틱 고래 라이트쇼 🐋' });
      group.add(orb);
      this.kineticOrbs.push(orb);
    }
    this.root.add(group);
  }

  buildAtriumLibrarySpine() {
    // 14m Towering Starfield Atrium Library spanning M1F (y=0) to M3F floor slab (y=14.0m) flush against West wall x = -50.0
    const lib = new THREE.Group();
    lib.name = 'Mall_Starfield_Atrium_Library';
    const m = this.m;

    this.box(lib, 'Mall_library_backdrop', [0.35, 14.0, 12.6], [-49.75, 7.0, 20.0], m.darkOak);
    this.box(lib, 'Mall_library_reading_plinth', [1.8, 0.52, 10.6], [-48.6, 0.26, 20.0], m.warmWood, 5, {
      action: 'mallLibrary',
      label: '14m 별마당 아트리움 서가 · 북라운지',
    });

    for (let tier = 0; tier < 16; tier++) {
      const y = 0.85 + tier * 0.82;
      this.box(lib, 'Mall_library_shelf', [0.85, 0.06, 12.0], [-49.3, y, 20.0], m.warmWood);
      this.box(lib, 'Mall_library_led', [0.12, 0.04, 11.8], [-48.91, y + 0.05, 20.0], m.warmLed);
      for (let slot = 0; slot < 8; slot++) {
        const z = 14.8 + slot * 1.48;
        const bMat = m.bookColors[(tier + slot) % m.bookColors.length];
        this.box(lib, 'Mall_library_books', [0.52, 0.56, 1.18], [-49.3, y + 0.31, z], bMat, null, {
          action: 'mallLibrary',
          label: '별마당 아트리움 컬처 서가',
        });
      }
    }

    for (const z of [13.7, 17.8, 22.2, 26.3]) {
      this.box(lib, 'Mall_library_rib', [0.95, 14.0, 0.24], [-49.25, 7.0, z], m.champagne);
    }

    this.sign(lib, 'Mall_library_emblem', ['STARFIELD ATRIUM LIBRARY · 14M', 'CULTURE BOOK LOUNGE (M1F - M2F)'], [-48.7, 10.8, 20.0], [4.6, 0.8], Math.PI / 2);
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
    this.box(ext, 'Mall_outdoor_plaza', [36.1, 0.16, 11.8], [-32.05, -0.08, 41.9], m.terrazzo);
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

    // Outdoor Interactive LED Step Tiles in Plaza walkway (x ∈ [-35, -29], z ∈ [37.5, 41.5])
    for (let sx = 0; sx < 4; sx++) {
      for (let sz = 0; sz < 3; sz++) {
        const stepMat = new THREE.MeshStandardMaterial({
          color: 0x203542,
          emissive: 0x4fb8ff,
          emissiveIntensity: 0.45,
          roughness: 0.3,
        });
        const tile = new THREE.Mesh(unitBox, stepMat);
        tile.name = `Mall_plaza_led_step_${sx}_${sz}`;
        tile.scale.set(1.2, 0.03, 1.1);
        tile.position.set(-34.2 + sx * 1.45, 0.015, 37.8 + sz * 1.35);
        tile.userData = { dynamic: true, phase: sx * 0.7 + sz * 1.1 };
        this.markInteractive(tile, { action: 'mallLedStep', floorIndex: 5, label: '야외 광장 LED 라이트 스텝 ✨' });
        ext.add(tile);
        this.ledStepTiles.push(tile);
      }
    }
  }

  buildPanoramicElevator() {
    // Open-Concept Dual Transparent Panoramic Glass Elevators in North-Central Atrium Promenade
    // Car A (East, x = MALL_LIFT_X = -26.4) & Car B (West, x = MALL_LIFT_2_X = -29.6), both at z = MALL_LIFT_Z = 10.0
    // Surrounded by 360-degree walkable promenade & crystal-clear glass shafts across B5..B1 and M1F..M5F.
    const g = this.elevatorGroup;
    const m = this.m;
    const bz = MALL_LIFT_Z;
    const shaftBot = -5 * PITCH - 0.5; // -18.0
    const shaftTop = MALL_ROOF_Y + 0.6; // 35.6
    const shaftH = shaftTop - shaftBot;
    const shaftMidY = (shaftTop + shaftBot) / 2;
    this.shaftTopY = shaftTop - 0.4;

    // Sleek steel perimeter trim collars around the floor slab cutout ([-31.0, -25.0] x [8.85, 11.15])
    for (const f of MALL_VALID_FLOORS) {
      const fy = (f - 5) * PITCH;
      this.box(g, 'Mall_shaft_collar_N', [6.04, 0.14, 0.06], [-28.0, fy - 0.07, 8.85], m.champagne);
      this.box(g, 'Mall_shaft_collar_S', [6.04, 0.14, 0.06], [-28.0, fy - 0.07, 11.15], m.champagne);
      this.box(g, 'Mall_shaft_collar_W', [0.06, 0.14, 2.34], [-31.0, fy - 0.07, bz], m.champagne);
      this.box(g, 'Mall_shaft_collar_E', [0.06, 0.14, 2.34], [-25.0, fy - 0.07, bz], m.champagne);
    }

    const carXs = [MALL_LIFT_X, MALL_LIFT_2_X];
    this.mallCarUnits = [];
    this.mallCars = [];
    this.ropeMeshes = [];

    for (const [carIdx, bx] of carXs.entries()) {
      const unitTag = carIdx === 0 ? '' : '_2';

      // Slim panoramic structural steel mullions + 360° crystal-clear shaft glazing
      for (const [ox, oz] of [
        [-1.18, -1.06],
        [1.18, -1.06],
        [-1.18, 1.12],
        [1.18, 1.12],
      ]) {
        this.box(g, `Mall_shaft_mullion${unitTag}`, [0.075, shaftH, 0.075], [bx + ox, shaftMidY, bz + oz], m.charcoal);
      }
      this.box(g, `Mall_shaft_glass_N${unitTag}`, [2.36, shaftH, 0.035], [bx, shaftMidY, bz - 1.06], m.crystalGlass);
      this.box(g, `Mall_shaft_glass_W${unitTag}`, [0.035, shaftH, 2.18], [bx - 1.18, shaftMidY, bz + 0.03], m.crystalGlass);
      this.box(g, `Mall_shaft_glass_E${unitTag}`, [0.035, shaftH, 2.18], [bx + 1.18, shaftMidY, bz + 0.03], m.crystalGlass);

      const landingDoors = {};
      const landingDisplays = {};

      for (const f of MALL_VALID_FLOORS) {
        const fy = (f - 5) * PITCH;
        const meta = mallFloorMeta(f, FLOORS[f]);
        const pierH = f < 5 ? PITCH : MALL_STORY_H;

        // Compact lower portal piers + transparent upper glass curtain for open panoramic views
        this.box(g, `Mall_landing_pier_L${unitTag}`, [0.56, 2.56, 0.09], [bx - 0.85, fy + 1.28, bz + 1.12], m.champagne);
        this.box(g, `Mall_landing_pier_R${unitTag}`, [0.56, 2.56, 0.09], [bx + 0.85, fy + 1.28, bz + 1.12], m.champagne);
        this.box(g, `Mall_landing_header${unitTag}`, [2.26, 0.42, 0.11], [bx, fy + 2.75, bz + 1.12], m.champagne);
        if (pierH > 3.1) {
          this.box(g, `Mall_landing_upper_glass${unitTag}`, [2.32, pierH - 3.0, 0.035], [bx, fy + 3.0 + (pierH - 3.0) / 2, bz + 1.12], m.crystalGlass);
        }

        // Center-parting transparent landing doors
        const doorGroup = new THREE.Group();
        doorGroup.name = `Mall_landing_door_${meta.mallCode}${unitTag}`;
        doorGroup.position.set(bx, fy, bz + 1.1);
        const lDoor = new THREE.Mesh(unitBox, m.crystalGlass);
        lDoor.scale.set(0.57, 2.45, 0.04);
        lDoor.position.set(-0.285, 1.225, 0);
        lDoor.userData.dynamic = true;
        const rDoor = new THREE.Mesh(unitBox, m.crystalGlass);
        rDoor.scale.set(0.57, 2.45, 0.04);
        rDoor.position.set(0.285, 1.225, 0);
        rDoor.userData.dynamic = true;
        doorGroup.add(lDoor, rDoor);
        g.add(doorGroup);
        landingDoors[f] = { left: lDoor, right: rDoor };

        // Live landing floor indicator above doorway
        const disp = safeCanvasTexture(256, 96, (ctx, w, h) => {
          ctx.fillStyle = '#0e1720';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#f2c879';
          ctx.font = 'bold 42px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(carIdx === 0 ? 'A · M1F' : 'B · M1F', w / 2, 60);
        });
        if (disp) {
          const dMat = new THREE.MeshStandardMaterial({
            map: disp.tex,
            emissiveMap: disp.tex,
            emissive: 0xffffff,
            emissiveIntensity: 0.72,
          });
          const dMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.34), dMat);
          dMesh.name = `Mall_landing_display_${meta.mallCode}${unitTag}`;
          dMesh.position.set(bx, fy + 2.74, bz + 1.21);
          dMesh.userData.dynamic = true;
          g.add(dMesh);
          landingDisplays[f] = { ...disp, lastKey: '', carTag: carIdx === 0 ? 'A' : 'B' };
        }

        // Effortless Hall Call Plate on front-right jamb
        const plate = this.box(
          g,
          `Mall_hall_plate_${meta.mallCode}${unitTag}`,
          [0.3, 0.56, 0.06],
          [bx + 0.88, fy + 1.18, bz + 1.22],
          m.charcoal
        );
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
              carIndex: carIdx,
              label: `${meta.mallCode} 상행 호출 (${carIdx === 0 ? 'A호기' : 'B호기'})`,
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
              carIndex: carIdx,
              label: `${meta.mallCode} 하행 호출 (${carIdx === 0 ? 'A호기' : 'B호기'})`,
            },
            '▼'
          );
          this.mallHallButtons.push(dnBtn);
        }
      }

      // Slim rear Counterweight + Twin Hoist Ropes
      const cw = new THREE.Group();
      cw.name = `Mall_counterweight${unitTag}`;
      cw.position.set(bx, 0, bz - 0.94);
      cw.userData.dynamic = true;
      const cwBody = new THREE.Mesh(unitBox, m.charcoal);
      cwBody.scale.set(0.92, 2.0, 0.11);
      cw.add(cwBody);
      g.add(cw);

      const ropes = [];
      for (const rx of [bx - 0.25, bx + 0.25]) {
        const rope = new THREE.Mesh(unitCyl, m.steel);
        rope.name = `Mall_hoist_rope${unitTag}`;
        rope.userData.dynamic = true;
        g.add(rope);
        const rObj = { mesh: rope, x: rx, z: bz, carIdx };
        ropes.push(rObj);
        this.ropeMeshes.push(rObj);
      }

      // Ultra-Transparent Panoramic Glass Cabin
      const car = new THREE.Group();
      car.name = `Mall_panoramic_cabin${unitTag}`;
      car.position.set(bx, 0, bz);
      car.userData.dynamic = true;

      this.box(car, `Mall_car_floor${unitTag}`, [2.12, 0.12, 1.84], [0, -0.06, 0], m.terrazzo);
      // Skylight glass ceiling frame so upper atrium view shines straight into the cabin
      this.box(car, `Mall_car_ceiling_frame_N${unitTag}`, [2.12, 0.12, 0.24], [0, 2.52, -0.8], m.champagne);
      this.box(car, `Mall_car_ceiling_frame_S${unitTag}`, [2.12, 0.12, 0.24], [0, 2.52, 0.8], m.champagne);
      this.box(car, `Mall_car_ceiling_frame_W${unitTag}`, [0.24, 0.12, 1.36], [-0.94, 2.52, 0], m.champagne);
      this.box(car, `Mall_car_ceiling_frame_E${unitTag}`, [0.24, 0.12, 1.36], [0.94, 2.52, 0], m.champagne);
      this.box(car, `Mall_car_ceiling_glass${unitTag}`, [1.64, 0.04, 1.36], [0, 2.52, 0], m.crystalGlass);
      this.box(car, `Mall_car_ceiling_led${unitTag}`, [1.72, 0.03, 0.05], [0, 2.45, -0.66], m.warmLed);
      this.box(car, `Mall_car_ceiling_led_S${unitTag}`, [1.72, 0.03, 0.05], [0, 2.45, 0.66], m.warmLed);

      this.box(car, `Mall_car_glass_back${unitTag}`, [2.08, 2.44, 0.035], [0, 1.22, -0.9], m.crystalGlass);
      this.box(car, `Mall_car_glass_L${unitTag}`, [0.035, 2.44, 1.8], [-1.04, 1.22, 0], m.crystalGlass);
      this.box(car, `Mall_car_glass_R${unitTag}`, [0.035, 2.44, 1.8], [1.04, 1.22, 0], m.crystalGlass);
      this.rail(car, [-0.95, 0.92, -0.78], [0.95, 0.92, -0.78], m.champagne, 0.024);
      this.rail(car, [-0.95, 0.92, -0.78], [-0.95, 0.92, 0.78], m.champagne, 0.024);

      const carDoorL = new THREE.Mesh(unitBox, m.crystalGlass);
      carDoorL.scale.set(0.55, 2.4, 0.035);
      carDoorL.position.set(-0.275, 1.2, 0.91);
      carDoorL.userData.dynamic = true;
      const carDoorR = new THREE.Mesh(unitBox, m.crystalGlass);
      carDoorR.scale.set(0.55, 2.4, 0.035);
      carDoorR.position.set(0.275, 1.2, 0.91);
      carDoorR.userData.dynamic = true;
      car.add(carDoorL, carDoorR);

      this.box(car, `Mall_car_jamb_L${unitTag}`, [0.5, 2.44, 0.07], [-0.79, 1.22, 0.91], m.champagne);
      this.box(car, `Mall_car_jamb_R${unitTag}`, [0.5, 2.44, 0.07], [0.79, 1.22, 0.91], m.champagne);

      // 1) Main Front-Right Jamb Vertical COP
      const copPlateR = this.box(car, `Mall_car_cop_plate_R${unitTag}`, [0.42, 1.38, 0.05], [0.78, 1.28, 0.86], m.charcoal);
      copPlateR.userData.dynamic = true;
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
            carIndex: carIdx,
            label: `몰 ${code}층 선택`,
          },
          code
        );
        this.mallCarButtons.push(btn);
      }
      for (const [bxOff, action, keyLabel, title] of [
        [0.64, 'mallOpen', '◀▶', '문 열림'],
        [0.78, 'mallClose', '▶◀', '문 닫힘'],
        [0.92, 'mallAlarm', '🚨', '비상 호출'],
      ]) {
        const b = this.makeCopButton(
          car,
          [bxOff, 0.74, 0.82],
          [0.11, 0.095, 0.04],
          { action, carIndex: carIdx, label: title },
          keyLabel
        );
        this.mallCarButtons.push(b);
      }

      // 2) Right Side-Wall Horizontal Wheelchair-Accessible COP (장애인용 가로형 조작반, y = 0.94m)
      const accBlueMat = new THREE.MeshStandardMaterial({
        color: 0x1e5aa8,
        emissive: 0x0a2548,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.45,
      });
      this.box(car, `Mall_car_cop_accessible_frame${unitTag}`, [0.032, 0.25, 1.36], [1.015, 0.94, -0.10], accBlueMat);
      const copPlateAcc = this.box(
        car,
        `Mall_car_cop_plate_accessible${unitTag}`,
        [0.04, 0.20, 1.28],
        [1.005, 0.94, -0.10],
        m.charcoal
      );
      copPlateAcc.userData.dynamic = true;

      const accToggleBtn = this.makeCopButton(
        car,
        [0.975, 0.94, 0.43],
        [0.045, 0.14, 0.14],
        {
          action: 'cabinAccessible',
          mall: true,
          carIndex: carIdx,
          label: '장애인용 가로형 조작반 · 문 열림 연장 전환',
        },
        '♿'
      );
      this.mallAccessibleButtons.push(accToggleBtn);

      for (const [idx, f] of MALL_VALID_FLOORS.entries()) {
        // B5..B1 on lower row (idx < 5), M1F..M5F on upper row (idx >= 5)
        const isUpper = idx >= 5;
        const colIdx = idx % 5;
        const bzOff = 0.26 - colIdx * 0.14;
        const byOff = isUpper ? 0.99 : 0.89;
        const code = f < 5 ? FLOORS[f] : mallFloorMeta(f).mallCode;
        const accBtn = this.makeCopButton(
          car,
          [0.975, byOff, bzOff],
          [0.042, 0.082, 0.115],
          {
            action: 'mallCar',
            floorIndex: f,
            carIndex: carIdx,
            accessible: true,
            label: `장애인 조작반 · 몰 ${code}층 선택`,
          },
          code
        );
        this.mallCarButtons.push(accBtn);
      }

      for (const [bzOff, action, keyLabel, title] of [
        [-0.45, 'mallOpen', '◀▶', '장애인 조작반 · 문 열림'],
        [-0.57, 'mallClose', '▶◀', '장애인 조작반 · 문 닫힘'],
        [-0.69, 'mallAlarm', '🚨', '장애인 조작반 · 비상 호출'],
      ]) {
        const b = this.makeCopButton(
          car,
          [0.975, 0.94, bzOff],
          [0.042, 0.12, 0.095],
          { action, carIndex: carIdx, accessible: true, label: title },
          keyLabel
        );
        this.mallCarButtons.push(b);
      }

      const copDisp = safeCanvasTexture(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#0f1722';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f2c879';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(carIdx === 0 ? 'A · M1F' : 'B · M1F', w / 2, 72);
      });
      let copDisplayObj = null;
      if (copDisp) {
        const sMat = new THREE.MeshStandardMaterial({
          map: copDisp.tex,
          emissiveMap: copDisp.tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.75,
        });
        const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), sMat);
        sMesh.name = `Mall_car_cop_screen${unitTag}`;
        sMesh.position.set(0.78, 1.82, 0.82);
        sMesh.rotation.y = Math.PI;
        sMesh.userData.dynamic = true;
        car.add(sMesh);
        copDisplayObj = { ...copDisp, lastKey: '', carTag: carIdx === 0 ? 'A' : 'B' };
      }

      g.add(car);
      this.mallCars.push(car);
      this.mallCarUnits.push({
        idx: carIdx,
        bx,
        bz,
        car,
        carDoors: { left: carDoorL, right: carDoorR },
        landingDoors,
        landingDisplays,
        copDisplay: copDisplayObj,
        weight: cw,
        ropes,
      });
    }

    // Legacy single-car aliases bound to Car A for compatibility
    const primary = this.mallCarUnits[0];
    this.mallCar = primary.car;
    this.mallCarDoors = primary.carDoors;
    this.mallLandingDoors = primary.landingDoors;
    this.mallLandingDisplays = primary.landingDisplays;
    this.mallCopDisplay = primary.copDisplay;
    this.mallWeight = primary.weight;
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
      { id: 'crowd-1', name: '쇼핑객 지우', role: 'VIP 쇼퍼', floor: 5, x: -13.0, z: 15.2, toX: -20.5, toZ: 15.2, coat: 0xd4a46a, bag: 0x9e3229, quote: '호텔 1층 연결 베스티뷸 자동 유리문을 지나 바로 쇼핑몰 명품관으로 이어지니 동선이 정말 고급스럽네요!' },
      { id: 'crowd-2', name: '방문객 민석', role: '건축 사진가', floor: 5, x: -20.6, z: 24.8, toX: -20.6, toZ: 13.0, coat: 0x2c4251, bag: null, quote: '7m 층고로 뚫린 5개 층 보이드와 워터폴 가든 스케일이 압도적이네요.' },
      { id: 'crowd-3', name: '커플 유진', role: '몰 방문객', floor: 5, x: -24.5, z: 26.8, toX: -39.5, toZ: 26.8, coat: 0x733a4b, bag: 0xe6c87a, quote: '방금 샤넬이랑 에르메스 구경하고 별마당 서가 보러 가는 중이에요!' },
      { id: 'crowd-4', name: '컨시어지 하은', role: '몰 컨시어지 매니저', floor: 5, x: -32.2, z: 12.2, toX: -32.2, toZ: 12.2, coat: 0xc4ab82, bag: null, quote: '어떠신가요? M1F 명품관부터 꼭대기 M5F IMAX 영화관까지 듀얼 투명 전망 엘리베이터로 연결됩니다.' },
      { id: 'crowd-5', name: '쇼퍼 태현', role: '트렌드 헌터', floor: 5, x: -42.5, z: 16.0, toX: -42.5, toZ: 28.5, coat: 0x3b594a, bag: 0x243440, quote: '매장 앞 복도가 탁 트이고 넓어져서 아이쇼핑하기 정말 좋네요.' },
      { id: 'crowd-6', name: '바리스타 도윤', role: '로스터리 헤드 바리스타', floor: 5, x: -19.2, z: 23.0, toX: -20.8, toZ: 27.5, coat: 0x45352b, bag: null, quote: '워터폴 가든 앞에서 스페셜티 콜드브루 한 잔 즐겨보세요!' },
      { id: 'crowd-7', name: '방문객 서아', role: '호텔 투숙객', floor: 5, x: -12.0, z: 16.6, toX: -19.2, toZ: 16.6, coat: 0x4a7382, bag: 0xd9a05b, quote: '호텔 체크인하고 연결 유리 게이트를 지나 명품관으로 쇼핑하러 나왔어요.' },
      { id: 'crowd-8', name: '가족 방문객 수진', role: '야외 광장 방문객', floor: 5, x: -31.8, z: 38.0, toX: -31.8, toZ: 31.0, coat: 0xa64d64, bag: 0xf2e3c2, quote: '미디어 파사드 영상이 멋져서 사진 찍고 자동문으로 들어가는 길이에요.' },

      // M2F (floor 7) — Fashion, Gentle Monster, Nike, Starfield Library
      { id: 'crowd-9', name: '패셔니스타 나연', role: '젠틀몬스터 방문객', floor: 7, x: -20.5, z: 14.0, toX: -20.5, toZ: 26.5, coat: 0x1e242b, bag: 0xebe6dc, quote: 'M2F 젠틀몬스터랑 아더에러 매장이 7m 층고라 미술관 같아요!' },
      { id: 'crowd-10', name: '북러버 준호', role: '도서관 독서가', floor: 7, x: -43.5, z: 16.5, toX: -43.5, toZ: 24.5, coat: 0x5c4b3b, bag: null, quote: '14m 별마당 아트리움 서가를 2층 난간에서 내려다보니 정말 웅장해요.' },
      { id: 'crowd-11', name: '쇼퍼 다은', role: '스니커즈 마니아', floor: 7, x: -37.5, z: 12.0, toX: -23.5, toZ: 12.0, coat: 0xd15849, bag: 0xe6843c, quote: '나이키 서울 한정판 득템했어요! 이제 중앙 에스컬레이터 타고 3층 올라가려고요.' },
      { id: 'crowd-12', name: '뷰티 크리에이터 리나', role: '뷰티 에디터', floor: 7, x: -38.5, z: 29.8, toX: -25.0, toZ: 29.8, coat: 0x91678f, bag: 0x73c97b, quote: '올리브영 럭스 쇼룸 체험 코너가 정말 잘 돼 있네요.' },
      { id: 'crowd-13', name: '산책객 성민', role: '몰 방문객', floor: 7, x: -19.8, z: 8.2, toX: -24.0, toZ: 11.8, coat: 0x3b4d5e, bag: null, quote: '북측 산책로를 돌아 듀얼 전망 엘리베이터 타기 정말 편하네요!' },

      // M3F (floor 9) — Apple Store, Samsung, Sony, Lego + Skybridges beside Central Escalators
      { id: 'crowd-14', name: '스카이워커 현우', role: 'IT 리뷰어', floor: 9, x: -41.5, z: 17.8, toX: -41.5, toZ: 24.5, coat: 0x2f5e78, bag: 0xc2ccd6, quote: '중앙 아트리움 에스컬레이터 옆 서측 브리지에서 보는 탁 트인 시야가 최고예요!' },
      { id: 'crowd-15', name: '게이머 지훈', role: '플레이스테이션 팬', floor: 9, x: -43.0, z: 17.5, toX: -43.0, toZ: 26.0, coat: 0x2b3240, bag: 0x5c7cfa, quote: '소니 라운지랑 애플 스토어 체험 부스가 한 층에 모여있어서 최고예요.' },
      { id: 'crowd-16', name: '테키 유나', role: '디자이너', floor: 9, x: -20.2, z: 12.5, toX: -20.2, toZ: 27.5, coat: 0x7d8a72, bag: null, quote: '삼성 갤럭시 AI 스튜디오에서 신제품 구경하고 왔어요.' },
      { id: 'crowd-17', name: '쇼퍼 민재', role: '레고 컬렉터', floor: 9, x: -39.0, z: 29.5, toX: -24.0, toZ: 29.5, coat: 0xd99e43, bag: 0xf2c94c, quote: '레고 스토어 대형 디오라마가 7m 천장까지 닿을 기세네요!' },
      { id: 'crowd-18', name: '스카이워커 소희', role: '포토그래퍼', floor: 9, x: -20.8, z: 18.0, toX: -20.8, toZ: 25.5, coat: 0xa14f66, bag: 0xf0eee4, quote: '중앙 에스컬레이터랑 투명 듀얼 엘리베이터가 한눈에 들어와서 사진이 정말 잘 나와요!' },

      // M4F (floor 11) — Gourmet Street dining & Skybridge
      { id: 'crowd-19', name: '미식가 정우', role: '고든램지 다이너', floor: 11, x: -20.2, z: 14.0, toX: -20.2, toZ: 27.0, coat: 0x52392e, bag: null, quote: 'M4F 고메 스트리트에서 식사하고 위층 영화관 가는 코스가 완벽하네요.' },
      { id: 'crowd-20', name: '셰프 켄지', role: '오마카세 다이너', floor: 11, x: -42.5, z: 16.0, toX: -42.5, toZ: 25.5, coat: 0x2d4a43, bag: 0x62b56c, quote: '오스테리아 트러플 파스타랑 말차 라떼 디저트 조합이 환상적이에요.' },
      { id: 'crowd-21', name: '산책객 보라', role: '스카이워크 이용객', floor: 11, x: -38.8, z: 18.2, toX: -38.8, toZ: 23.8, coat: 0x785b8a, bag: 0xd6b575, quote: '4층 에스컬레이터 랜딩에서 아래 1층 보이드 내려다보는 재미가 쏠쏠하네요.' },
      { id: 'crowd-22', name: '브런치객 하나', role: '방문객', floor: 11, x: -33.5, z: 12.0, toX: -23.0, toZ: 12.0, coat: 0xb87654, bag: null, quote: '여기 투명 듀얼 엘리베이터 타고 한 층만 더 올라가면 M5F IMAX 영화관이에요!' },

      // M5F (floor 13) — Top-Floor Grand Cinema Multiplex (IMAX) & Sounds Forest
      { id: 'crowd-23', name: '씨네필 예린', role: 'IMAX 예매객', floor: 13, x: -23.5, z: 11.8, toX: -36.0, toZ: 11.8, coat: 0x8f2934, bag: 0xf4c45c, quote: '꼭대기층 M5F 전체가 IMAX 멀티플렉스랑 하늘정원이라 규모가 어마어마해요!' },
      { id: 'crowd-24', name: '관객 승호', role: '팝콘 키오스크 주문', floor: 13, x: -38.8, z: 9.8, toX: -42.0, toZ: 11.4, coat: 0x263847, bag: 0xffe075, quote: '매점 셀프 오더 키오스크에서 카라멜 팝콘 콤보 주문하고 이제 검표 게이트로 들어가요!' },
      { id: 'crowd-25', name: '관객 다혜', role: '영화 관람객', floor: 13, seatRow: 1, seatCol: 1, coat: 0x3b4d59, bag: null, seat: true, quote: '대형 IMAX 스크린 화질이 진짜 선명하네요! 빈 좌석 클릭하면 같이 앉을 수 있어요.' },
      { id: 'crowd-26', name: '관객 준영', role: '영화 관람객', floor: 13, seatRow: 2, seatCol: 3, coat: 0x5c363e, bag: null, seat: true, quote: '돌비 애트모스 사운드가 웅장하게 울리네요.' },
      { id: 'crowd-33', name: '관객 서연', role: 'VIP C열 관객', floor: 13, seatRow: 0, seatCol: 0, coat: 0x32524c, bag: null, seat: true, quote: '계단식 C열 좌석이라 앞사람 가림 없이 대형 스크린이 한눈에 들어오네요!' },
      { id: 'crowd-27', name: '어셔 미소', role: '티켓 검표 매니저', floor: 13, x: -40.1, z: 12.6, toX: -40.1, toZ: 12.6, coat: 0x911d24, bag: null, quote: '북측 무인 키오스크에서 영화 티켓 발권과 매점 주문 후, 여기 게이트에 QR 티켓을 스캔하시면 입장 가능합니다!' },
      { id: 'crowd-28', name: '자연애호가 유리', role: '사운즈 포레스트 방문객', floor: 13, x: -29.0, z: 25.5, toX: -17.5, toZ: 25.5, coat: 0x457352, bag: null, quote: '영화 보고 나와서 주홍빛 트러스 천창 아래 사운즈 포레스트 나무 사이를 산책 중이에요.' },
      { id: 'crowd-29', name: '관광객 알렉스', role: '루프탑 가든 관람객', floor: 13, x: -21.2, z: 14.0, toX: -21.2, toZ: 24.0, coat: 0x334756, bag: 0x9fc2cf, quote: 'The glass skylight trusses 35 meters above look incredible!' },

      // B1 (floor 4) — Unified Basement Parking EV Zone & Hotel Tunnel
      { id: 'crowd-30', name: '운전자 태오', role: 'EV 충전 고객', floor: 4, x: -46.5, z: 13.5, toX: -46.5, toZ: 26.5, coat: 0x2e4a59, bag: null, quote: '지하주차장이 호텔이랑 그대로 통하고 초급속 EV 충전기까지 있어서 너무 편해요!' },
      { id: 'crowd-31', name: '주차안내원 철수', role: '발레 매니저', floor: 4, x: -18.5, z: 21.8, toX: -21.2, toZ: 21.8, coat: 0x222a30, bag: null, quote: '호텔 지하주차장 B1~B5 동선과 동일하게 이어져 차로 이동하기 수월합니다.' },
      { id: 'crowd-32', name: '쇼핑객 수빈', role: '주차장 방문객', floor: 4, x: -28.0, z: 12.2, toX: -22.5, toZ: 14.5, coat: 0x734959, bag: 0xe6c87a, quote: '쇼핑 잔뜩 하고 B1에서 바로 중앙 에스컬레이터나 듀얼 엘리베이터로 주차장 내려왔어요.' },
    ];

    for (const s of specs) {
      const baseY = (s.floor - 5) * PITCH;
      const hasSeatIdx = Number.isInteger(s.seatRow) && Number.isInteger(s.seatCol);
      const seatRowInfo = hasSeatIdx ? cinemaRowMetrics(s.seatRow) : null;
      const px = hasSeatIdx ? CINEMA_COL_XS[s.seatCol] : s.x;
      const pz = seatRowInfo ? seatRowInfo.sz - 0.07 : s.z;
      const py = seatRowInfo ? baseY + seatRowInfo.riserTop : baseY;
      const info = {
        action: 'mallPerson',
        floorIndex: s.floor,
        personId: s.id,
        personName: s.name,
        roleLabel: s.role,
        quote: s.quote,
        label: `${s.name} (${s.role})`,
      };

      const { root: person, legs, arms } = buildStylizedHuman({
        name: `Mall_person_${s.id}`,
        coatColor: s.coat,
        trouserColor: 0x22292f,
        skinColor: 0xd7ae8e,
        hairColor: 0x1c2226,
        longHair: Boolean(s.bag),
        bagColor: s.bag,
        facingDir: 1,
        seated: !!s.seat,
        pickableData: info,
        pickables: this.pickables,
      });
      person.userData.dynamic = true;
      person.position.set(px, py, pz);
      if (s.seat) person.rotation.y = 0;

      this.crowdGroup.add(person);
      this.mallPeople.push({
        id: s.id,
        name: s.name,
        role: s.role,
        floor: s.floor,
        root: person,
        legs,
        arms,
        ax: px,
        az: pz,
        bx: hasSeatIdx ? px : s.toX,
        bz: hasSeatIdx ? pz : s.toZ,
        baseY,
        seat: !!s.seat,
        seatRow: s.seatRow ?? null,
        seatCol: s.seatCol ?? null,
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
    const prefix = disp.carTag ? `${disp.carTag} ` : '';
    const key = `${prefix}${floorCode}:${arrow}:${mc.alarm ? 'A' : ''}`;
    if (disp.lastKey === key) return;
    disp.lastKey = key;
    const { ctx, canvas, tex } = disp;
    ctx.fillStyle = mc.alarm ? '#3b1214' : '#0d1621';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = mc.alarm ? '#ff7c70' : '#f4cf82';
    ctx.font = `bold ${Math.round(canvas.height * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${prefix}${arrow} ${floorCode}`, canvas.width / 2, Math.round(canvas.height * 0.66));
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
      const f = fg.userData.floorIndex;
      if (isGame) {
        fg.visible = f >= 5 || (focusFloor >= 5 ? f === 4 : Math.abs(f - focusFloor) <= 1);
      } else if (showAll) {
        fg.visible = true;
      } else if (mode === 'controller' || mode === 'shaft') {
        fg.visible = Math.abs(f - focusFloor) <= 3 || f >= 5;
      } else {
        fg.visible = Math.abs(f - focusFloor) <= 1 || f >= 5;
      }
    }
  }

  triggerFountainShow(time = 0) {
    this.fountainShowUntil = time + 12.0;
  }

  triggerKineticShow(time = 0) {
    this.kineticShowUntil = time + 12.0;
  }

  triggerBowlingStrike(time = 0) {
    this.bowlingStrikeUntil = time + 3.2;
  }

  triggerTeppanyakiFlame(time = 0) {
    this.teppanFlareUntil = time + 4.5;
  }

  triggerRobotDogTrick(time = 0) {
    this.robotDogTrickUntil = time + 3.0;
  }

  setCinemaMovie(movieIndex = 0) {
    this.cinemaMovieIndex = movieIndex % MALL_CINEMA_MOVIES.length;
    const disp = this.cinemaScreen;
    if (!disp?.ctx) return;
    const movie = MALL_CINEMA_MOVIES[this.cinemaMovieIndex];
    const { ctx, canvas, tex } = disp;
    ctx.fillStyle = movie.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = movie.accent;
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(movie.title, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#f2efe9';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(movie.sub, canvas.width / 2, canvas.height / 2 + 44);
    tex.needsUpdate = true;
  }

  setCinemaGateState(open = false, ticket = null) {
    this.cinemaGateOpen = Boolean(open);
    for (const led of this.cinemaGateScannerLeds) {
      led.material.color.setHex(open ? 0x39e596 : 0xffaa3b);
      led.material.emissive.setHex(open ? 0x19c97b : 0xff7a1a);
    }
    const disp = this.cinemaGateDisplay;
    if (!disp?.ctx) return;
    const key = `${open ? 'OPEN' : ticket ? 'READY' : 'LOCK'}:${ticket?.seat || ''}`;
    if (disp.lastKey === key) return;
    disp.lastKey = key;
    const { ctx, canvas, tex } = disp;
    ctx.fillStyle = open ? '#0d261c' : ticket ? '#132236' : '#141a24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = open ? '#55ffaa' : ticket ? '#6fe7db' : '#ff9d3b';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'WELCOME · HALL 1 입장 허가' : ticket ? 'QR TICKET READY · 스캔하세요' : 'TICKET REQUIRED', canvas.width / 2, 54);
    ctx.fillStyle = '#d9e5f0';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      open
        ? `${ticket?.title || 'IMAX'} · ${ticket?.seat || 'VIP'}`
        : ticket
          ? `예매 좌석 ${ticket.seat} · 검표 리더기 클릭`
          : '북측 무인 키오스크 발권 후 QR 스캔',
      canvas.width / 2,
      98
    );
    tex.needsUpdate = true;
  }

  update(mc, time = 0, player = null, mcB = null) {
    if (!mc) return;
    if (this.cinemaGateDoors) {
      const targetShift = this.cinemaGateOpen ? 0.82 : 0;
      const curShift = Math.abs(this.cinemaGateDoors.right.position.x - -41.42);
      const nextShift = time === 0 ? targetShift : curShift + (targetShift - curShift) * 0.2;
      this.cinemaGateDoors.left.position.x = -42.38 - nextShift;
      this.cinemaGateDoors.right.position.x = -41.42 + nextShift;
    }
    const ctrlA = mc;
    const ctrlB = mcB || {
      floor: 9,
      position: 9 * PITCH,
      direction: 0,
      door: 0,
      alarm: false,
      accessibleMode: false,
      car: new Set(),
      up: new Set(),
      down: new Set(),
      aligned: () => true,
    };

    for (const unit of this.mallCarUnits) {
      const ctrl = unit.idx === 0 ? ctrlA : ctrlB;
      const unitY = ctrl.position - 5 * PITCH; // floor 5 (M1F) -> y = 0, floor 13 (M5F) -> y = 28.0m
      const unitCode = ctrl.floor < 5 ? FLOORS[ctrl.floor] : mallFloorMeta(ctrl.floor).mallCode;
      const openShift = (ctrl.door ?? 0) * 0.52;
      const activeFloor = ctrl.floor;
      const isAligned = Boolean(ctrl.aligned?.());

      if (unit.car) unit.car.position.y = unitY;
      if (unit.weight) unit.weight.position.y = 14.0 - unitY * 0.5;

      const carRoofY = unitY + 2.55;
      const ropeLen = Math.max(0.4, (this.shaftTopY ?? 35.2) - carRoofY);
      for (const r of unit.ropes) {
        r.mesh.scale.set(0.014, ropeLen, 0.014);
        r.mesh.position.set(r.x, carRoofY + ropeLen / 2, r.z);
      }

      if (unit.carDoors) {
        unit.carDoors.left.position.x = -0.275 - openShift;
        unit.carDoors.right.position.x = 0.275 + openShift;
      }

      for (const f of MALL_VALID_FLOORS) {
        const ld = unit.landingDoors[f];
        const fOpen = isAligned && activeFloor === f ? openShift : 0;
        if (ld) {
          ld.left.position.x = -0.285 - fOpen;
          ld.right.position.x = 0.285 + fOpen;
        }
        if (unit.landingDisplays[f]) {
          this.redrawIndicator(unit.landingDisplays[f], ctrl, unitCode);
        }
      }

      if (unit.copDisplay) {
        this.redrawIndicator(unit.copDisplay, ctrl, unitCode);
      }
    }

    for (const btn of [...this.mallCarButtons, ...this.mallHallButtons]) {
      const { action, floorIndex, direction, carIndex } = btn.userData;
      const ctrl = carIndex === 1 ? ctrlB : ctrlA;
      const lit =
        action === 'mallCar'
          ? ctrl.car.has(floorIndex)
          : action === 'mallHall'
            ? (direction === 1 ? ctrl.up : ctrl.down).has(floorIndex)
            : action === 'mallAlarm'
              ? ctrl.alarm
              : false;
      if (btn.userData.lastLit !== lit) {
        btn.userData.lastLit = lit;
        btn.material.color.setHex(lit ? (action === 'mallHall' ? 0x62d9cc : 0xe8b566) : 0xc8d2d9);
        btn.material.emissive.setHex(lit ? (action === 'mallHall' ? 0x3ecfb9 : 0xffaa3b) : 0x000000);
        btn.material.emissiveIntensity = lit ? 0.65 : 0;
      }
    }

    for (const btn of this.mallAccessibleButtons) {
      const ctrl = btn.userData.carIndex === 1 ? ctrlB : ctrlA;
      const accActive = Boolean(ctrl.accessibleMode);
      if (btn.userData.lastAcc !== accActive) {
        btn.userData.lastAcc = accActive;
        btn.material.color.setHex(accActive ? 0x2b8cff : 0x1e5aa8);
        btn.material.emissive.setHex(accActive ? 0x1b6fe0 : 0x091d36);
        btn.material.emissiveIntensity = accActive ? 0.85 : 0.35;
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

    // Animate Kinetic Whale & Drone Show
    const kinBoost = time < (this.kineticShowUntil ?? -1) ? 2.4 : 1.0;
    for (const orb of this.kineticOrbs) {
      const ph = time * 1.4 * kinBoost + orb.userData.phase;
      orb.position.y = orb.userData.baseY + Math.sin(ph) * (kinBoost > 1 ? 2.2 : 0.9);
      orb.position.z = orb.userData.baseZ + Math.cos(ph * 0.7) * 0.65;
      const hue = (((time * 0.08 * kinBoost + orb.userData.phase * 0.1) % 1) + 1) % 1;
      orb.material.emissive.setHSL(hue, 0.85, 0.56);
    }

    // Animate Musical Fountain Jets
    const fountainBoost = time < (this.fountainShowUntil ?? -1);
    for (const jet of this.fountainJets) {
      const h = fountainBoost
        ? 2.2 + Math.abs(Math.sin(time * 5.2 + jet.userData.phase)) * 4.8
        : 0.45 + Math.abs(Math.sin(time * 2.2 + jet.userData.phase)) * 0.6;
      jet.scale.y = h;
      jet.position.y = 0.25 + h / 2;
      if (fountainBoost) {
        jet.material.emissive.setHSL(((time * 0.35 + jet.userData.phase) % 1 + 1) % 1, 0.9, 0.6);
      } else {
        jet.material.emissive.setHex(0x39c9bb);
      }
    }

    // Animate Plaza Interactive LED Step Tiles
    for (const tile of this.ledStepTiles) {
      const dist =
        player && player.floor === 5 ? Math.hypot(player.x - tile.position.x, player.z - tile.position.z) : 99;
      if (dist < 1.5) {
        tile.material.emissive.setHex(0xffd269);
        tile.material.emissiveIntensity = 1.25;
      } else {
        tile.material.emissive.setHSL(((time * 0.1 + tile.userData.phase * 0.2) % 1 + 1) % 1, 0.7, 0.5);
        tile.material.emissiveIntensity = 0.42;
      }
    }

    // Animate M2F DJ Platters & Equalizer
    for (const p of this.djPlatters) p.rotation.y = time * 3.2;
    for (const eq of this.djEqBars) {
      const h = 0.18 + Math.abs(Math.sin(time * 7.5 + eq.userData.phase)) * 0.68;
      eq.scale.y = h;
      eq.position.y = 1.08 + h / 2;
    }

    // Animate M3F Neon Mini Bowling Strike & Reset
    if (this.bowlingBall) {
      const strikeAge = time - ((this.bowlingStrikeUntil ?? -1) - 3.2);
      if (time < (this.bowlingStrikeUntil ?? -1) && strikeAge >= 0) {
        const p = Math.min(1, strikeAge / 1.1);
        this.bowlingBall.position.x = -38.0 - p * 8.0;
        for (const [idx, pin] of this.bowlingPins.entries()) {
          if (p > 0.85) {
            pin.rotation.z = (idx % 2 ? 1 : -1) * 1.25;
            pin.position.y = 0.22;
          }
        }
      } else {
        this.bowlingBall.position.x = -38.0;
        for (const pin of this.bowlingPins) {
          pin.rotation.z = 0;
          pin.position.set(...pin.userData.basePos);
        }
      }
    }

    // Animate M3F Rhythm Floor, teamLab Pillars, & Robot Dog
    for (const tile of this.rhythmTiles) {
      const dist = player && player.floor === 9 ? Math.hypot(player.x - tile.position.x, player.z - tile.position.z) : 99;
      tile.material.emissive.setHSL(((time * 0.18 + tile.userData.phase * 0.15) % 1 + 1) % 1, 0.85, dist < 1.2 ? 0.65 : 0.45);
      tile.material.emissiveIntensity = dist < 1.2 ? 1.4 : 0.52;
    }
    for (const pil of this.teamLabPillars) {
      pil.material.emissive.setHSL(((time * 0.12 + pil.userData.phase * 0.18) % 1 + 1) % 1, 0.85, 0.55);
    }
    if (this.robotDog) {
      const dx = Math.sin(time * 0.45) * 6.0;
      this.robotDog.position.set(
        -30.5 + dx,
        time < (this.robotDogTrickUntil ?? -1) ? Math.abs(Math.sin(time * 10)) * 0.35 : 0,
        12.0
      );
      this.robotDog.rotation.y = Math.cos(time * 0.45) >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // Animate M4F Conveyor Belt Sushi Plates & Teppanyaki Flames
    for (const plate of this.sushiPlates) {
      const a = time * 0.45 + (plate.userData.idx * Math.PI * 2) / this.sushiPlates.length;
      plate.position.set(plate.userData.cx + Math.cos(a) * 1.9, 0.94, plate.userData.cz + Math.sin(a) * 0.48);
    }
    const flare = time < (this.teppanFlareUntil ?? -1);
    for (const fl of this.teppanFlames) {
      const s = flare ? 0.8 + Math.abs(Math.sin(time * 14 + fl.userData.phase)) * 0.95 : 0.25 + Math.sin(time * 6 + fl.userData.phase) * 0.08;
      fl.scale.set(0.24, s, 0.24);
      fl.position.y = 0.96 + s * 0.5;
    }

    // Animate M5F Glamping Campfire
    if (this.campfireFlame) {
      const cs = 0.58 + Math.sin(time * 9.5) * 0.18;
      this.campfireFlame.scale.set(0.38, cs, 0.38);
      this.campfireFlame.position.y = 0.52 + cs * 0.5;
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
      const u = ((cycle % 2) + 2) % 2;
      const pingpong = u < 1 ? u : 2 - u; // 0 -> 1 -> 0 smoothly
      const dir = u < 1 ? 1 : -1;
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

    let linkTarget = 0;
    if (player && player.floor === 5) {
      const dist = Math.hypot(player.x - -13.5, player.z - 16.0);
      if (dist < 5.2) linkTarget = 1;
    } else if (!player) {
      linkTarget = 0.85;
    }
    this._hotelLinkOpen = (this._hotelLinkOpen ?? 0) + (linkTarget - (this._hotelLinkOpen ?? 0)) * 0.2;
    for (const d of this.hotelLinkDoors) {
      d.position.z = d.userData.closedZ + d.userData.openOffset * this._hotelLinkOpen;
    }
  }
}
