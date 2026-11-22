import * as THREE from 'three';
import { floorMeta, floorUsage } from './building.js';
import { FLOORS } from './controller.js';
import { hotelSignTexture } from './hotel-sign.js';
import { FLOOR_AMENITY_SPECS } from './hotel-stay.js';

const geometry = new THREE.BoxGeometry(1, 1, 1);

const materials = {
  parking: new THREE.MeshStandardMaterial({ color: 0x747d7c, roughness: 0.95 }),
  lobby: new THREE.MeshStandardMaterial({ color: 0xc2bbb0, roughness: 0.48 }),
  guest: new THREE.MeshStandardMaterial({ color: 0x344a51, roughness: 1 }),
  wallWarm: new THREE.MeshStandardMaterial({ color: 0xe3dfd2, roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x745341, roughness: 0.58 }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x4b3324, roughness: 0.52 }),
  marbleFloor: new THREE.MeshStandardMaterial({ color: 0xdfd8c9, roughness: 0.34, metalness: 0.04 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xd2ccbc, roughness: 0.38 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc7aa70, metalness: 0.68, roughness: 0.32 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd6dde0, metalness: 0.78, roughness: 0.24 }),
  yellow: new THREE.MeshBasicMaterial({ color: 0xe5c457 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1c2325, roughness: 0.45 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xf3f0e6, roughness: 0.9 }),
  velvetNavy: new THREE.MeshStandardMaterial({ color: 0x263c54, roughness: 0.78 }),
  velvetBurgundy: new THREE.MeshStandardMaterial({ color: 0x782936, roughness: 0.78 }),
  velvetEmerald: new THREE.MeshStandardMaterial({ color: 0x235244, roughness: 0.78 }),
  kioskGlow: new THREE.MeshBasicMaterial({ color: 0x76e8c7 }),
  warmGlow: new THREE.MeshBasicMaterial({ color: 0xffe4b8 }),
  emberGlow: new THREE.MeshBasicMaterial({ color: 0xff9248 }),
  skyGlass: new THREE.MeshPhysicalMaterial({
    color: 0xc3e2ec,
    transparent: true,
    opacity: 0.26,
    roughness: 0.08,
    metalness: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  spaWater: new THREE.MeshPhysicalMaterial({
    color: 0x67d8e6,
    transparent: true,
    opacity: 0.68,
    roughness: 0.08,
    depthWrite: false,
  }),
};

let cachedSkylineMat = null;
function getSkylineMaterial() {
  if (cachedSkylineMat) return cachedSkylineMat;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (ctx.createLinearGradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, 384);
      grad.addColorStop?.(0, '#9dc0cf');
      grad.addColorStop?.(0.65, '#e5d4b6');
      grad.addColorStop?.(1, '#849196');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#a9c4d0';
    }
    ctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 20; i++) {
      const h = (80 + ((i * 79) % 210)) * 0.52;
      const x = i * 26;
      ctx.fillStyle = i % 2 ? '#9ca6aa' : '#8593a1';
      ctx.fillRect(x, 384 - h, 21, h);
      ctx.fillStyle = '#efe1bc';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillRect(x + 3 + c * 5, 390 - h + r * 16, 2, 4);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSkylineMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  return cachedSkylineMat;
}

function makeMesh(parent, name, size, pos, mat, pickable = null, pickables = null) {
  const m = new THREE.Mesh(geometry, mat);
  m.name = name;
  m.scale.set(...size);
  m.position.set(...pos);
  if (pickable) {
    m.userData = { ...m.userData, ...pickable };
    if (pickables) pickables.push(m);
  }
  parent.add(m);
  return m;
}

function makeSign(parent, name, lines, pos, width, height, rotation = Math.PI) {
  const isRoomNum = name.startsWith('Room_number');
  const tex = hotelSignTexture(
    lines,
    isRoomNum ? { width: 256, height: 128 } : { width: 512, height: 192 }
  );
  const scale = isRoomNum ? 1 : 0.65;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width * scale, height * scale),
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  m.name = name;
  m.userData.signLines = lines;
  m.position.set(...pos);
  m.rotation.y = rotation;
  parent.add(m);
  return m;
}

export function suiteTierForRoom(floor, roomNumber) {
  const num = Number(roomNumber);
  if (floor === 13) return num % 2 === 1 ? 'presidential' : 'royal';
  if (floor >= 11) return 'sky';
  if (floor >= 9) return 'junior';
  return num % 2 === 0 ? 'twin' : 'deluxe';
}

function buildExecutiveClubLounge(parent, floor, pickables) {
  const tag = FLOORS[floor];
  const lounge = new THREE.Group();
  lounge.name = `Executive_lounge_${tag}`;
  parent.add(lounge);

  // Expanded West Wing Club Lounge spanning x ∈ [-9.6, -2.54], z ∈ [1.35, 7.8]
  makeMesh(lounge, `West_lounge_floor_${tag}`, [7.06, 0.12, 6.45], [-6.07, -0.06, 4.575], materials.marbleFloor);
  makeMesh(lounge, `West_lounge_carpet_${tag}`, [4.6, 0.014, 3.8], [-6.6, 0.01, 4.5], materials.velvetNavy);
  makeMesh(lounge, `West_lounge_ceiling_${tag}`, [7.06, 0.12, 6.45], [-6.07, 3.16, 4.575], materials.wallWarm);
  makeMesh(lounge, `West_lounge_light_${tag}`, [4.8, 0.028, 0.28], [-6.2, 3.08, 4.55], materials.warmGlow);

  // Perimeter Enclosure Walls (closing East x = -2.54 along z ∈ [3.68, 7.8], leaving Vestibule doorway z ∈ [1.8, 2.9] open)
  makeMesh(lounge, `West_lounge_north_${tag}`, [7.06, 3.2, 0.14], [-6.07, 1.6, 1.35], materials.walnut);
  makeMesh(lounge, `West_lounge_south_${tag}`, [7.06, 3.2, 0.14], [-6.07, 1.6, 7.8], materials.walnut);
  makeMesh(lounge, `West_lounge_east_div_${tag}`, [0.14, 3.2, 4.12], [-2.54, 1.6, 5.74], materials.wallWarm);
  makeMesh(lounge, `West_lounge_west_sill_${tag}`, [0.16, 0.65, 6.45], [-9.6, 0.325, 4.575], materials.walnut);
  makeMesh(lounge, `West_lounge_west_hdr_${tag}`, [0.16, 0.45, 6.45], [-9.6, 2.98, 4.575], materials.walnut);
  makeMesh(lounge, `West_lounge_window_${tag}`, [0.04, 2.15, 6.2], [-9.58, 1.72, 4.575], materials.skyGlass);
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.2), getSkylineMaterial());
  skyline.name = `West_lounge_skyline_${tag}`;
  skyline.position.set(-9.68, 1.72, 4.575);
  skyline.rotation.y = Math.PI / 2;
  lounge.add(skyline);

  // Library Art Wall & Bookshelf Credenza along North Wall (x = -6.8, z = 1.56)
  makeMesh(lounge, `West_lounge_shelf_${tag}`, [2.8, 2.1, 0.32], [-7.2, 1.05, 1.56], materials.walnut);
  makeMesh(lounge, `West_lounge_art_${tag}`, [1.6, 1.0, 0.06], [-4.5, 1.85, 1.46], materials.gold);

  // Club Sofa, Armchairs & Coffee Table (Interactive Seating)
  const sofaData = {
    action: 'hotelLounge',
    floorIndex: floor,
    loungeType: 'sofa',
    seatX: -6.9,
    seatZ: 4.5,
    seatYaw: -Math.PI / 2,
    label: `${tag}F 이그제큐티브 라운지 클럽 소파 착석 🛋️`,
  };
  makeMesh(lounge, `West_lounge_sofa_base_${tag}`, [0.88, 0.44, 2.3], [-7.8, 0.22, 4.5], materials.velvetNavy, sofaData, pickables);
  makeMesh(lounge, `West_lounge_sofa_back_${tag}`, [0.2, 0.88, 2.3], [-8.15, 0.44, 4.5], materials.velvetNavy, sofaData, pickables);
  makeMesh(lounge, `West_lounge_table_${tag}`, [0.9, 0.08, 1.4], [-6.3, 0.46, 4.5], materials.marbleFloor, sofaData, pickables);
  makeMesh(lounge, `West_lounge_chair_${tag}`, [0.76, 0.44, 0.8], [-5.2, 0.22, 5.5], materials.velvetEmerald, sofaData, pickables);

  // Executive Bar & Espresso Counter along South Wall (x = -6.2, z = 7.05)
  const barData = {
    action: 'hotelLounge',
    floorIndex: floor,
    loungeType: 'bar',
    seatX: -6.2,
    seatZ: 6.1,
    seatYaw: 0,
    label: `${tag}F 이그제큐티브 라운지 바 · 샴페인 & 에스프레소 🥂`,
  };
  makeMesh(lounge, `West_lounge_bench_${tag}`, [3.4, 0.98, 0.72], [-6.2, 0.49, 7.05], materials.walnut, barData, pickables);
  makeMesh(lounge, `West_lounge_bar_top_${tag}`, [3.5, 0.07, 0.84], [-6.2, 1.01, 7.05], materials.marbleFloor, barData, pickables);
  makeMesh(lounge, `West_lounge_bar_shelf_${tag}`, [3.1, 1.3, 0.2], [-6.2, 1.9, 7.62], materials.gold, barData, pickables);
  makeMesh(lounge, `West_lounge_espresso_${tag}`, [0.55, 0.42, 0.42], [-7.2, 1.25, 7.05], materials.chrome, barData, pickables);
  makeMesh(lounge, `West_lounge_wine_${tag}`, [0.16, 0.36, 0.16], [-5.5, 1.22, 7.05], materials.velvetBurgundy, barData, pickables);

  const tierTitle =
    floor >= 12 ? 'ROYAL CHAMPAGNE & SKY CLUB LOUNGE' : floor >= 9 ? 'SKY WINE & LIBRARY LOUNGE' : 'EXECUTIVE ESPRESSO CLUB LOUNGE';
  makeSign(
    lounge,
    `West_lounge_sign_${tag}`,
    [`${tag}F · 이그제큐티브 클럽 라운지`, tierTitle],
    [-9.46, 2.28, 3.0],
    2.4,
    0.58,
    Math.PI / 2
  );
}

function buildFurnishedSuite(parent, { floor, number, side, pickables }) {
  const tier = suiteTierForRoom(floor, number);
  const suite = new THREE.Group();
  suite.name = `Suite_interior_${number}`;
  parent.add(suite);

  const is302 = number === '302';
  const foyerXMin = side < 0 ? -2.42 : 0.06;
  const foyerXMax = side < 0 ? -0.06 : 2.42;
  const mainXMin = is302 ? 7.6 : side < 0 ? -9.4 : 0.06;
  const mainXMax = is302 ? 13.0 : side < 0 ? -0.06 : 8.8;
  const mainZMin = is302 ? 3.68 : side < 0 ? 8.2 : 8.6;
  const mainZMax = is302 ? 12.6 : 15.0;
  const mainW = mainXMax - mainXMin;
  const mainD = mainZMax - mainZMin;
  const mainCx = (mainXMin + mainXMax) / 2;
  const mainCz = (mainZMin + mainZMax) / 2;

  const floorMat = tier === 'presidential' || tier === 'royal' ? materials.marbleFloor : materials.wood;

  // 1) Entry Foyer (for rooms connected directly to 2F, 4F-9F elevator vestibule)
  if (!is302) {
    const fCx = (foyerXMin + foyerXMax) / 2;
    const fW = foyerXMax - foyerXMin;
    const fD = mainZMin - 3.68;
    const fCz = 3.68 + fD / 2;
    makeMesh(suite, `Suite_foyer_floor_${number}`, [fW, 0.12, fD], [fCx, -0.06, fCz], floorMat);
    makeMesh(suite, `Suite_foyer_ceil_${number}`, [fW, 0.12, fD], [fCx, 3.16, fCz], materials.wallWarm);
    makeMesh(suite, `Suite_foyer_light_${number}`, [0.42, 0.025, 1.8], [fCx, 3.09, fCz], materials.warmGlow);
    // Side walls isolating foyer cleanly from West Lounge (x=-2.42), Stairwell (x=+2.42), and Center Demising Wall (x=0)
    makeMesh(suite, `Suite_foyer_outer_wall_${number}`, [0.12, 3.2, fD], [side < 0 ? -2.42 : 2.42, 1.6, fCz], materials.wallWarm);
    makeMesh(suite, `Suite_foyer_demise_${number}`, [0.12, 3.2, mainZMax - 3.68], [side < 0 ? -0.06 : 0.06, 1.6, 3.68 + (mainZMax - 3.68) / 2], materials.wallWarm);
    makeMesh(suite, `Suite_foyer_art_${number}`, [0.05, 1.15, 1.4], [side < 0 ? -0.14 : 0.14, 1.72, fCz], materials.gold);
  } else {
    // 302 Isolated East Wing Walls (east of Stairwell at x ∈ [7.6, 13.0], z ∈ [3.68, 12.6])
    makeMesh(suite, 'Suite_west_wall_302', [0.16, 3.2, mainD], [mainXMin, 1.6, mainCz], materials.wallWarm);
    makeMesh(suite, 'Suite_north_wall_302', [mainW, 3.2, 0.16], [mainCx, 1.6, mainZMin], materials.wallWarm);
    const exitData = { action: 'suiteExit', room: '302', floorIndex: floor, label: '302호 객실 밖(3층 로비 복도)으로 나가기 🚪' };
    makeMesh(suite, 'Suite_exit_302', [0.14, 2.2, 0.92], [mainXMin + 0.08, 1.1, 5.0], materials.wood, exitData, pickables);
    makeMesh(suite, 'Suite_exit_handle_302', [0.16, 0.06, 0.14], [mainXMin + 0.14, 1.05, 4.72], materials.gold, exitData, pickables);
  }

  // 2) Main Bedroom & Parlor Hall Envelope
  makeMesh(suite, `Suite_floor_${number}`, [mainW, 0.12, mainD], [mainCx, -0.06, mainCz], floorMat);
  makeMesh(suite, `Suite_ceil_${number}`, [mainW, 0.12, mainD], [mainCx, 3.16, mainCz], materials.wallWarm);
  makeMesh(suite, `Suite_cove_led_${number}`, [mainW - 1.4, 0.03, 0.25], [mainCx, 3.08, mainCz], materials.warmGlow);

  // Outer wing walls & North partition
  const wingNorthW = is302 ? 0 : Math.abs((side < 0 ? mainXMin - foyerXMin : mainXMax - foyerXMax));
  if (!is302) {
    const northCx = side < 0 ? (mainXMin + foyerXMin) / 2 : (foyerXMax + mainXMax) / 2;
    makeMesh(suite, `Suite_north_wall_${number}`, [wingNorthW, 3.2, 0.14], [northCx, 1.6, mainZMin], materials.wallWarm);
  }
  const outerWallX = side < 0 ? mainXMin : mainXMax;
  makeMesh(suite, `Suite_outer_wall_${number}`, [0.14, 3.2, mainD], [outerWallX, 1.6, mainCz], materials.wallWarm);

  // Panoramic South Skyline Window along z = mainZMax
  makeMesh(suite, `Suite_win_sill_${number}`, [mainW, 0.6, 0.16], [mainCx, 0.3, mainZMax], materials.wallWarm);
  makeMesh(suite, `Suite_win_hdr_${number}`, [mainW, 0.42, 0.16], [mainCx, 2.98, mainZMax], materials.wallWarm);
  makeMesh(suite, `Suite_window_${number}`, [mainW - 0.8, 2.2, 0.03], [mainCx, 1.72, mainZMax - 0.04], materials.skyGlass);
  const viewPlane = new THREE.Mesh(new THREE.PlaneGeometry(mainW - 0.6, 2.25), getSkylineMaterial());
  viewPlane.name = `Suite_skyline_${number}`;
  viewPlane.position.set(mainCx, 1.72, mainZMax + 0.06);
  viewPlane.rotation.y = Math.PI;
  suite.add(viewPlane);

  // 3) Furnished Suite Zones (scaled cleanly to Suite Tier without blocking entry path)
  const bedX = is302 ? 10.6 : side < 0 ? -7.2 : 6.6;
  const bedZ = mainCz - 0.4;
  const rugMat = tier === 'presidential' || tier === 'royal' ? materials.velvetBurgundy : tier === 'sky' ? materials.velvetEmerald : materials.velvetNavy;
  makeMesh(suite, `Suite_rug_${number}`, [3.4, 0.012, 3.1], [bedX, 0.01, bedZ], rugMat);

  const bedInfo = {
    action: 'suiteAmenity',
    room: String(number),
    floorIndex: floor,
    tier,
    amenityType: 'bed',
    seatX: bedX + (side < 0 ? 1.15 : -1.15),
    seatZ: bedZ,
    seatYaw: side < 0 ? 0.6 : -0.6,
    label: `${number}호 베드 휴식 (${tier.toUpperCase()}) 🛏️`,
  };

  if (tier === 'twin') {
    for (const dx of [-0.95, 0.95]) {
      makeMesh(suite, `Suite_twin_base_${number}`, [1.15, 0.3, 2.15], [bedX + dx, 0.15, bedZ], materials.walnut, bedInfo, pickables);
      makeMesh(suite, `Suite_twin_mat_${number}`, [1.12, 0.2, 2.1], [bedX + dx, 0.4, bedZ], materials.linen, bedInfo, pickables);
    }
    makeMesh(suite, `Suite_twin_hdr_${number}`, [3.2, 1.1, 0.12], [bedX, 0.72, bedZ - 1.15], materials.velvetNavy);
  } else {
    // King or Canopy Royal Bed
    makeMesh(suite, `Suite_bed_base_${number}`, [2.15, 0.34, 2.28], [bedX, 0.17, bedZ], materials.walnut, bedInfo, pickables);
    makeMesh(suite, `Suite_bed_mattress_${number}`, [2.05, 0.24, 2.22], [bedX, 0.46, bedZ], materials.linen, bedInfo, pickables);
    makeMesh(suite, `Suite_bed_runner_${number}`, [2.06, 0.03, 0.52], [bedX, 0.59, bedZ + 0.55], rugMat, bedInfo, pickables);
    makeMesh(suite, `Suite_bed_headboard_${number}`, [2.45, 1.28, 0.14], [bedX, 0.8, bedZ - 1.16], materials.walnut);
    for (const px of [-0.52, 0.52]) {
      makeMesh(suite, `Suite_pillow_${number}`, [0.68, 0.16, 0.4], [bedX + px, 0.64, bedZ - 0.85], materials.linen, bedInfo, pickables);
    }
    if (tier === 'sky' || tier === 'presidential' || tier === 'royal') {
      for (const cx of [bedX - 1.05, bedX + 1.05]) {
        for (const cz of [bedZ - 1.1, bedZ + 1.1]) {
          makeMesh(suite, `Suite_canopy_post_${number}`, [0.08, 2.35, 0.08], [cx, 1.25, cz], materials.gold);
        }
      }
      makeMesh(suite, `Suite_canopy_frame_${number}`, [2.2, 0.08, 2.3], [bedX, 2.42, bedZ], materials.gold);
    }
  }
  for (const lx of [bedX - 1.5, bedX + 1.5]) {
    makeMesh(suite, `Suite_nightstand_${number}`, [0.44, 0.5, 0.44], [lx, 0.25, bedZ - 0.92], materials.walnut);
    makeMesh(suite, `Suite_lamp_${number}`, [0.22, 0.34, 0.22], [lx, 0.68, bedZ - 0.92], materials.warmGlow);
  }

  // Wall-mounted Smart TV facing the Bed / Lounge
  const tvWallX = is302 ? mainXMax - 0.12 : outerWallX + (side < 0 ? 0.14 : -0.14);
  makeMesh(suite, `Suite_tv_console_${number}`, [0.42, 0.6, 2.2], [tvWallX + (side < 0 ? 0.24 : -0.24), 0.3, bedZ], materials.walnut);
  makeMesh(suite, `Suite_tv_screen_${number}`, [0.06, 1.05, 1.85], [tvWallX + (side < 0 ? 0.04 : -0.04), 1.55, bedZ], materials.black);

  // Parlor Sofa & Marble Coffee Table (all rooms & suites)
  const parlorX = is302 ? 9.1 : side < 0 ? -3.0 : 2.9;
  const sofaInfo = {
    action: 'suiteAmenity',
    room: String(number),
    floorIndex: floor,
    tier,
    amenityType: 'sofa',
    seatX: parlorX,
    seatZ: mainCz - 0.3,
    seatYaw: Math.PI,
    label: `${number}호 응접 라운지 소파 휴식 🛋️`,
  };
  makeMesh(suite, `Suite_sofa_base_${number}`, [2.1, 0.42, 0.85], [parlorX, 0.21, mainCz - 1.2], rugMat, sofaInfo, pickables);
  makeMesh(suite, `Suite_sofa_back_${number}`, [2.1, 0.46, 0.2], [parlorX, 0.62, mainCz - 1.55], rugMat, sofaInfo, pickables);
  makeMesh(suite, `Suite_coffee_table_${number}`, [1.25, 0.42, 0.68], [parlorX, 0.21, mainCz - 0.15], materials.marbleFloor, sofaInfo, pickables);

  // Private Espresso / Champagne Bar (Junior Suites & above)
  if (tier !== 'deluxe' && tier !== 'twin') {
    const barZ = mainZMin + 0.72;
    const barX = side < 0 ? -4.8 : 4.8;
    const barInfo = {
      action: 'suiteAmenity',
      room: String(number),
      floorIndex: floor,
      tier,
      amenityType: 'bar',
      seatX: barX,
      seatZ: barZ + 1.0,
      seatYaw: 0,
      label: `${number}호 프라이빗 샴페인 · 에스프레소 바 🥂`,
    };
    makeMesh(suite, `Suite_bar_body_${number}`, [2.4, 0.96, 0.75], [barX, 0.48, barZ], materials.walnut, barInfo, pickables);
    makeMesh(suite, `Suite_bar_top_${number}`, [2.5, 0.06, 0.85], [barX, 0.99, barZ], materials.marbleFloor, barInfo, pickables);
    makeMesh(suite, `Suite_bar_bottles_${number}`, [0.9, 0.36, 0.28], [barX, 1.2, barZ], materials.gold, barInfo, pickables);
  }

  // Marble Soaking Spa / Jacuzzi Tub overlooking the skyline (7F Sky Suites & 9F Presidential/Royal Suites)
  if (tier === 'sky' || tier === 'presidential' || tier === 'royal') {
    const spaX = side < 0 ? -7.6 : 7.0;
    const spaZ = mainZMax - 1.25;
    const spaInfo = {
      action: 'suiteAmenity',
      room: String(number),
      floorIndex: floor,
      tier,
      amenityType: 'spa',
      seatX: spaX + (side < 0 ? 1.55 : -1.55),
      seatZ: spaZ,
      seatYaw: Math.PI,
      label: `${number}호 마블 스카이 스파 자쿠지 🛁`,
    };
    makeMesh(suite, `Suite_spa_deck_${number}`, [2.15, 0.52, 1.35], [spaX, 0.26, spaZ], materials.stone, spaInfo, pickables);
    makeMesh(suite, `Suite_spa_tub_${number}`, [1.75, 0.14, 0.98], [spaX, 0.5, spaZ], materials.spaWater, spaInfo, pickables);
  }

  // 9F Presidential Penthouse (901) & Royal Executive (902) Showpieces: VIP Dining + Piano/Fireplace + Ring Chandelier
  if (tier === 'presidential' || tier === 'royal') {
    const showX = parlorX;
    const showZ = mainZMax - 1.65;
    // VIP Dining / Lounge Table
    makeMesh(suite, `Suite_dining_table_${number}`, [2.4, 0.08, 1.15], [showX, 0.76, showZ], materials.marbleFloor);
    makeMesh(suite, `Suite_dining_base_${number}`, [0.9, 0.72, 0.55], [showX, 0.36, showZ], materials.gold);
    // Gold Ring Chandelier over Suite Lounge
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.025, 8, 36), materials.gold);
    ring.name = `Suite_chandelier_${number}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.set(mainCx, 2.75, mainCz);
    suite.add(ring);

    if (tier === 'presidential') {
      // Grand Piano in 901 Presidential Suite
      const pianoX = -4.8;
      const pianoZ = mainZMax - 1.8;
      makeMesh(suite, 'Suite_grand_piano_901', [1.55, 0.28, 1.85], [pianoX, 0.76, pianoZ], materials.black);
      makeMesh(suite, 'Suite_piano_keys_901', [1.35, 0.06, 0.28], [pianoX, 0.74, pianoZ - 0.88], materials.linen);
      makeMesh(suite, 'Suite_piano_leg_901', [0.1, 0.65, 0.1], [pianoX, 0.325, pianoZ], materials.black);
    } else {
      // Illuminated Marble Fireplace Hearth in 902 Royal Executive Suite
      makeMesh(suite, 'Suite_fireplace_902', [2.1, 1.65, 0.45], [8.55, 0.825, mainCz], materials.stone);
      makeMesh(suite, 'Suite_hearth_fire_902', [0.12, 0.52, 1.15], [8.32, 0.46, mainCz], materials.emberGlow);
    }
  }
}

export function decorateFloor(room, floor, { expanded = false, pickables = null } = {}) {
  const usage = floorUsage(floor);
  const meta = floorMeta(floor, FLOORS[floor]);
  room.userData.floorUsage = usage.ko;
  room.userData.floorKind = usage.kind;

  const box = (name, size, pos, mat, parent = room) => makeMesh(parent, name, size, pos, mat);
  const sign = (name, lines, pos, width, height, rotation = Math.PI) =>
    makeSign(room, name, lines, pos, width, height, rotation);

  box(`Floor_finish_${FLOORS[floor]}`, [4.9, 0.018, 2.23], [0, 0.008, 2.485], materials[usage.kind]);
  sign(
    `Floor_purpose_sign_${FLOORS[floor]}`,
    [meta.signKo, meta.signEn],
    [0, expanded || floor === 14 ? 2.96 : 2.67, 3.59],
    1.8,
    0.52
  );

  // Build interactive floor-specific concierge / amenity station on every floor
  const amenitySpec = FLOOR_AMENITY_SPECS[floor];
  if (amenitySpec) {
    const amenityData = {
      action: 'floorAmenity',
      floorIndex: floor,
      amenityName: amenitySpec.name,
      amenityBadge: amenitySpec.badge,
    };

    if (floor >= 6 && floor <= 13) {
      // Guest floor central concierge credenza & digital touch bar (between the two guest room doors at x = 0)
      const base = box(`Floor_amenity_credenza_${FLOORS[floor]}`, [0.92, 0.92, 0.24], [0, 0.46, 3.48], materials.wood);
      const top = box(`Floor_amenity_top_${FLOORS[floor]}`, [0.98, 0.045, 0.28], [0, 0.94, 3.48], materials.gold);
      const disp = box(`Floor_amenity_kiosk_${FLOORS[floor]}`, [0.48, 0.34, 0.04], [0, 1.34, 3.56], materials.black);
      const led = box(`Floor_amenity_led_${FLOORS[floor]}`, [0.84, 0.02, 0.02], [0, 0.98, 3.36], materials.kioskGlow);
      const screen = sign(
        `Floor_amenity_screen_${FLOORS[floor]}`,
        [amenitySpec.name, amenitySpec.badge],
        [0, 1.34, 3.53],
        0.66,
        0.44,
        Math.PI
      );
      for (const part of [base, top, disp, led, screen]) {
        part.userData = { ...part.userData, ...amenityData };
        if (pickables) pickables.push(part);
      }
    } else {
      // Wall-mounted smart concierge / EV terminal on left vestibule wall (x = -2.45, z = 1.42)
      const frame = box(
        `Floor_amenity_kiosk_${FLOORS[floor]}`,
        [0.05, 0.48, 0.58],
        [-2.45, 1.38, 1.42],
        materials.black
      );
      const trim = box(
        `Floor_amenity_trim_${FLOORS[floor]}`,
        [0.06, 0.035, 0.62],
        [-2.445, 1.64, 1.42],
        materials.gold
      );
      const screen = sign(
        `Floor_amenity_screen_${FLOORS[floor]}`,
        [amenitySpec.name, amenitySpec.badge],
        [-2.418, 1.38, 1.42],
        0.8,
        0.64,
        Math.PI / 2
      );
      for (const part of [frame, trim, screen]) {
        part.userData = { ...part.userData, ...amenityData };
        if (pickables) pickables.push(part);
      }
    }
  }

  if (expanded) return;

  // Guest floor lounges (2F–10F) and Walk-In Rooms / Suites (2F–9F)
  if (usage.kind === 'guest') {
    buildExecutiveClubLounge(room, floor, pickables);
    if (floor === 14) return;

    const doorPositions = [-1.38, 1.38];
    for (const [i, x] of doorPositions.entries()) {
      const number = (floor - 4) * 100 + i + 1;
      if (number === 301) continue;

      const doorData = {
        action: 'otherRoomDoor',
        room: String(number),
        floorIndex: floor,
      };

      const doorPivot = new THREE.Group();
      doorPivot.name = `Door_pivot_${number}`;
      doorPivot.position.set(x - 0.43, 0, 3.565);
      doorPivot.userData.dynamic = true;
      room.add(doorPivot);

      const doorPanel = makeMesh(doorPivot, `Guest_room_door_${number}`, [0.86, 2.18, 0.06], [0.43, 1.09, 0], materials.wood, doorData, pickables);
      doorPanel.userData.dynamic = true;

      const handle = makeMesh(doorPivot, `Room_handle_${number}`, [0.14, 0.055, 0.07], [0.69, 1.02, -0.065], materials.gold, doorData, pickables);
      handle.userData.dynamic = true;

      for (const side of [-1, 1]) {
        box(`Room_frame_${number}_${side}`, [0.045, 2.25, 0.075], [x + side * 0.46, 1.125, 3.56], materials.gold);
      }
      box(`Room_frame_top_${number}`, [0.965, 0.045, 0.075], [x, 2.25, 3.56], materials.gold);

      const tierTag =
        floor === 13 ? (i === 0 ? 'PRESIDENTIAL' : 'ROYAL SUITE') : floor >= 11 ? 'SKY SUITE' : floor >= 9 ? 'JUNIOR SUITE' : 'ROOM';
      sign(`Room_number_${number}`, [String(number), tierTag], [x, 1.67, 3.53], 0.34, 0.21);

      // Build complete walk-in 3D room / suite behind the hinged door
      buildFurnishedSuite(room, {
        floor,
        number: String(number),
        side: i === 0 ? -1 : 1,
        pickables,
      });
    }
  } else if (usage.kind === 'parking') {
    for (const x of [-1.56, 1.56]) {
      box('Parking_bay_line', [0.05, 0.007, 1.75], [x, 0.023, 2.47], materials.yellow);
    }
    box('Parking_wall_stripe', [4.94, 0.09, 0.012], [0, 0.72, 3.607], materials.yellow);
    box('Parking_side_stripe', [0.012, 0.09, 2.35], [-2.468, 0.72, 2.37], materials.yellow);
    for (const x of [-1.85, 1.85]) {
      box('Parking_wall_bumper', [0.08, 0.76, 0.035], [x, 0.4, 3.58], materials.black);
    }
  } else {
    box('Lobby_reception_desk', [1.65, 0.92, 0.22], [0, 0.46, 3.625], materials.wood);
    box('Lobby_reception_top', [1.74, 0.045, 0.26], [0, 0.935, 3.625], materials.gold);
    sign('Lobby_reception_sign', ['안내 데스크', 'RECEPTION'], [0, 0.6, 3.5], 0.87, 0.23);
    for (const x of [-1.65, 1.65]) {
      box('Lobby_floor_inlay', [0.025, 0.006, 2.1], [x, 0.021, 2.47], materials.gold);
    }
  }
}
