import * as THREE from 'three';
import { hotelSignTexture } from './hotel-sign.js';
import { POOL_FLOOR } from './rooftop-pool.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);

function createWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#189ab4';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(212, 248, 255, 0.38)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const y = (i * 16) % 256;
      ctx.beginPath?.();
      ctx.moveTo?.(0, y);
      ctx.bezierCurveTo?.(80, y + 12, 170, y - 12, 256, y);
      ctx.stroke?.();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

export class RooftopPoolView {
  constructor(scene, pool, pickables = []) {
    this.pool = pool;
    this.pickables = pickables;

    this.root = new THREE.Group();
    this.root.name = 'Rooftop_swimming_pool_10F';
    this.root.position.y = (POOL_FLOOR - 5) * 3.5;
    scene.add(this.root);

    const g = this.root;
    const waterTex = createWaterTexture();
    this.waterTex = waterTex;

    this.m = {
      teak: new THREE.MeshStandardMaterial({ color: 0x7a563b, roughness: 0.68 }),
      teakDark: new THREE.MeshStandardMaterial({ color: 0x4b3322, roughness: 0.75 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xd9d3c5, roughness: 0.42 }),
      marble: new THREE.MeshStandardMaterial({ color: 0xebe6da, roughness: 0.25 }),
      tile: new THREE.MeshStandardMaterial({ color: 0x157a8c, roughness: 0.28, metalness: 0.1 }),
      tileLight: new THREE.MeshStandardMaterial({ color: 0x47bfd1, roughness: 0.22 }),
      water: new THREE.MeshStandardMaterial({
        color: 0x38d2eb,
        map: waterTex,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.78,
        emissive: 0x126b7a,
        emissiveIntensity: 0.35,
      }),
      jacuzziWater: new THREE.MeshStandardMaterial({
        color: 0x5ce6f7,
        roughness: 0.15,
        transparent: true,
        opacity: 0.82,
        emissive: 0x1ca3b8,
        emissiveIntensity: 0.45,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xbfe8f2,
        transparent: true,
        opacity: 0.38,
        roughness: 0.08,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc8ab73, metalness: 0.72, roughness: 0.26 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xdce4e8, metalness: 0.86, roughness: 0.18 }),
      linen: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.88 }),
      towel: new THREE.MeshStandardMaterial({ color: 0x289bb0, roughness: 0.85 }),
      coral: new THREE.MeshStandardMaterial({ color: 0xe06d53, roughness: 0.75 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x3b6e45, roughness: 0.85 }),
      black: new THREE.MeshStandardMaterial({ color: 0x1d2528, roughness: 0.4 }),
      led: new THREE.MeshBasicMaterial({ color: 0x5ff2ff }),
      warmLight: new THREE.MeshBasicMaterial({ color: 0xffe4b5 }),
      foam: new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.72 }),
    };
    const m = this.m;

    this.poolPointLight = new THREE.PointLight(0x2fd9f7, 8, 18, 1.6);
    this.poolPointLight.position.set(0, 1.4, 18.8);
    g.add(this.poolPointLight);

    const makePickable = (mesh, data) => {
      mesh.userData = { ...mesh.userData, ...data };
      this.pickables.push(mesh);
      return mesh;
    };

    const box = (parent, name, size, pos, mat, solid = false) => {
      const o = new THREE.Mesh(unitBox, mat);
      o.name = name;
      o.scale.set(...size);
      o.position.set(...pos);
      parent.add(o);
      if (solid) {
        this.pool.addObstacle(
          pos[0] - size[0] / 2,
          pos[0] + size[0] / 2,
          pos[2] - size[2] / 2,
          pos[2] + size[2] / 2
        );
      }
      return o;
    };

    const cylinder = (parent, name, r1, r2, h, pos, mat, segments = 20) => {
      const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), mat);
      o.name = name;
      o.position.set(...pos);
      parent.add(o);
      return o;
    };

    const sign = (parent, name, lines, pos, w, h, rotation = Math.PI) => {
      const o = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: hotelSignTexture(lines) })
      );
      o.name = name;
      o.position.set(...pos);
      o.rotation.y = rotation;
      parent.add(o);
      return o;
    };

    // 1. Connecting Promenade Corridor from 10F Elevator Vestibule (z: 3.65 -> 8.0)
    box(g, 'Pool_corridor_floor', [4.8, 0.14, 4.6], [0, -0.07, 5.9], m.teak);
    for (const x of [-2.38, 2.38]) {
      box(g, 'Pool_corridor_wall', [0.14, 3.2, 4.4], [x, 1.6, 5.85], m.stone);
    }
    box(g, 'Pool_corridor_ceiling', [4.9, 0.12, 4.5], [0, 3.22, 5.85], m.stone);
    for (const z of [4.6, 6.8]) {
      box(g, 'Pool_corridor_light', [1.5, 0.03, 0.22], [0, 3.14, z], m.warmLight);
    }
    sign(
      g,
      'Rooftop_entry_sign',
      ['10F · 루프탑 인피니티 풀', 'ROOFTOP INFINITY POOL & SKY BAR ↑'],
      [0, 2.68, 3.58],
      1.75,
      0.44,
      0
    );
    sign(
      g,
      'Rooftop_exit_sign',
      ['엘리베이터 · 계단 · 에스컬레이터', 'ELEVATORS & STAIRS ↓'],
      [0, 2.68, 7.95],
      2.1,
      0.48,
      Math.PI
    );

    // 2. Main Open-Air Rooftop Deck (x: -11.5..11.3, z: 8.0..25.5)
    box(g, 'Rooftop_main_deck', [23.2, 0.18, 17.8], [-0.1, -0.09, 16.8], m.stone);
    // Raised Teak Wood Sun Deck around the Infinity Pool
    box(g, 'Poolside_teak_deck', [19.4, 0.03, 15.2], [0, 0.015, 16.9], m.teak);
    for (let z = 9.8; z <= 24.0; z += 0.65) {
      box(g, 'Teak_deck_seam', [19.2, 0.005, 0.015], [0, 0.032, z], m.teakDark);
    }

    // Back wall separating rooftop deck from escalator/stairwell shafts at z = 8.0
    for (const [x, w] of [
      [-6.95, 9.1],
      [6.75, 9.1],
    ]) {
      box(g, 'Rooftop_rear_wall', [w, 3.2, 0.18], [x, 1.6, 8.0], m.stone, true);
    }
    // Architectural Pergola Canopy over the Bar & Lounge zone (z: 8.0..13.2)
    for (const x of [-9.5, -4.5, 4.5, 9.5]) {
      box(g, 'Pergola_column', [0.22, 3.1, 0.22], [x, 1.55, 12.8], m.teakDark, true);
    }
    box(g, 'Pergola_main_beam', [21.0, 0.18, 0.26], [0, 3.05, 12.8], m.teakDark);
    for (let x = -10.0; x <= 10.0; x += 1.25) {
      box(g, 'Pergola_rafter', [0.1, 0.14, 5.0], [x, 3.16, 10.4], m.teak);
    }

    // Frameless Glass Safety Balustrade around the Rooftop Perimeter
    box(g, 'Rooftop_front_glass_rail', [22.8, 1.2, 0.05], [-0.1, 0.6, 25.45], m.glass);
    box(g, 'Rooftop_front_handrail', [22.8, 0.05, 0.08], [-0.1, 1.22, 25.45], m.gold);
    for (const x of [-11.4, 11.2]) {
      box(g, 'Rooftop_side_glass_rail', [0.05, 1.2, 17.5], [x, 0.6, 16.75], m.glass);
      box(g, 'Rooftop_side_handrail', [0.08, 0.05, 17.5], [x, 1.22, 16.75], m.gold);
    }
    for (const x of [-11.4, -7.6, -3.8, 0, 3.8, 7.6, 11.2]) {
      box(g, 'Balustrade_post', [0.06, 1.24, 0.06], [x, 0.62, 25.45], m.gold);
    }

    // 3. Heated Infinity Pool (x: [-6.1, 6.1], z: [14.6, 23.1])
    const poolCopingMat = m.marble;
    box(g, 'Pool_south_coping', [12.8, 0.26, 0.45], [0, 0.13, 14.45], poolCopingMat);
    box(g, 'Pool_west_coping', [0.45, 0.26, 9.0], [-6.18, 0.13, 18.85], poolCopingMat);
    box(g, 'Pool_east_coping', [0.45, 0.26, 9.0], [6.18, 0.13, 18.85], poolCopingMat);
    // Infinity Glass Weir Edge at the North/Skyline edge (z = 23.25)
    box(g, 'Infinity_glass_weir', [12.4, 0.36, 0.08], [0, 0.12, 23.25], m.glass);
    box(g, 'Infinity_catch_basin', [12.8, 0.08, 0.55], [0, 0.02, 23.58], m.tile);

    // Pool Basin Floor & Underwater Tile Lining
    box(g, 'Pool_basin_floor', [11.9, 0.04, 8.5], [0, 0.03, 18.85], m.tile);
    for (const x of [-3.8, -1.3, 1.3, 3.8]) {
      box(g, 'Pool_lane_mosaic', [0.16, 0.045, 7.6], [x, 0.035, 18.85], m.tileLight);
    }

    // Underwater LED Strips (dynamic color)
    this.ledStrips = [];
    for (const z of [14.72, 23.02]) {
      const strip = box(g, 'Pool_underwater_led', [11.6, 0.05, 0.04], [0, 0.18, z], m.led);
      strip.userData.dynamic = true;
      this.ledStrips.push(strip);
    }

    // Animated Water Surface (Interactive: click to swim or exit)
    const swimData = { action: 'poolSwim', floorIndex: POOL_FLOOR, dynamic: true };
    this.waterMesh = box(g, 'Infinity_pool_water', [11.9, 0.18, 8.5], [0, 0.14, 18.85], m.water);
    this.waterMesh.userData.dynamic = true;
    makePickable(this.waterMesh, swimData);

    // Roman Pool Steps & Chrome Ladders at z = 14.7
    for (let s = 0; s < 3; s++) {
      const stepMesh = box(
        g,
        'Pool_roman_step',
        [2.2, 0.07, 0.35],
        [0, 0.21 - s * 0.06, 14.8 + s * 0.32],
        m.marble
      );
      makePickable(stepMesh, swimData);
    }
    for (const lx of [-3.4, 3.4]) {
      for (const side of [-0.22, 0.22]) {
        makePickable(
          cylinder(g, 'Pool_ladder_rail', 0.022, 0.022, 0.95, [lx + side, 0.48, 14.55], m.chrome, 12),
          swimData
        );
      }
      for (const ry of [0.35, 0.6, 0.82]) {
        makePickable(box(g, 'Pool_ladder_rung', [0.44, 0.025, 0.04], [lx, ry, 14.55], m.chrome), swimData);
      }
    }

    // Animated Arching Water Fountain Jets on West & East Pool Sides
    this.fountainGroup = new THREE.Group();
    this.fountainGroup.name = 'Pool_fountain_jets';
    this.fountainGroup.userData.dynamic = true;
    g.add(this.fountainGroup);
    this.fountainArcs = [];
    for (const z of [16.5, 18.8, 21.1]) {
      for (const side of [-1, 1]) {
        cylinder(g, 'Fountain_nozzle', 0.06, 0.08, 0.12, [side * 6.15, 0.3, z], m.chrome, 12);
        for (let k = 0; k < 5; k++) {
          const drop = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m.foam);
          drop.userData.dynamic = true;
          this.fountainGroup.add(drop);
          this.fountainArcs.push({ mesh: drop, side, z, offset: k / 5 });
        }
      }
    }

    // Pool Light & Fountain Touch Control Pedestal
    const lightCtrlData = { action: 'poolLight', floorIndex: POOL_FLOOR };
    makePickable(
      box(g, 'Pool_light_pedestal', [0.32, 1.05, 0.28], [-6.45, 0.52, 14.1], m.black, true),
      lightCtrlData
    );
    makePickable(
      sign(
        g,
        'Pool_light_screen',
        ['POOL LED & FOUNTAIN', '수중 조명 · 분수 전환 ✨'],
        [-6.45, 0.92, 13.94],
        0.38,
        0.22,
        Math.PI
      ),
      lightCtrlData
    );

    // 4. Heated Whirlpool Jacuzzi Spa on the East Deck (x = 8.5, z = 17.5)
    const jacuzziData = { action: 'poolJacuzzi', floorIndex: POOL_FLOOR, dynamic: true };
    makePickable(cylinder(g, 'Jacuzzi_outer_tub', 1.72, 1.65, 0.52, [8.5, 0.26, 17.5], m.marble, 28), jacuzziData);
    makePickable(cylinder(g, 'Jacuzzi_inner_rim', 1.48, 1.42, 0.54, [8.5, 0.27, 17.5], m.tile, 28), jacuzziData);
    this.jacuzziWater = cylinder(
      g,
      'Jacuzzi_warm_water',
      1.42,
      1.4,
      0.46,
      [8.5, 0.28, 17.5],
      m.jacuzziWater,
      28
    );
    this.jacuzziWater.userData.dynamic = true;
    makePickable(this.jacuzziWater, jacuzziData);

    sign(
      g,
      'Jacuzzi_spa_sign',
      ['WHIRLPOOL SPA ♨️', '온수 자쿠지 · 클릭해 입수/버블'],
      [8.5, 1.15, 19.35],
      1.1,
      0.34,
      Math.PI
    );

    this.jacuzziBubbles = [];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const rad = 0.35 + (i % 3) * 0.32;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), m.foam);
      bubble.position.set(8.5 + Math.cos(angle) * rad, 0.52, 17.5 + Math.sin(angle) * rad);
      bubble.userData.dynamic = true;
      g.add(bubble);
      this.jacuzziBubbles.push({
        mesh: bubble,
        baseX: 8.5 + Math.cos(angle) * rad,
        baseZ: 17.5 + Math.sin(angle) * rad,
        phase: i * 0.7,
      });
    }

    // 5. Poolside Sun Loungers, Resort Umbrellas & Luxury Cabana (action: 'poolSunbed')
    const sunbedPositions = [
      { x: -4.2, z: 11.6, restX: -4.2, restZ: 12.85 },
      { x: -2.0, z: 11.6, restX: -2.0, restZ: 12.85 },
      { x: 2.0, z: 11.6, restX: 2.0, restZ: 12.85 },
      { x: 4.2, z: 11.6, restX: 4.2, restZ: 12.85 },
    ];
    for (const b of sunbedPositions) {
      const bedData = { action: 'poolSunbed', floorIndex: POOL_FLOOR, restX: b.restX, restZ: b.restZ };
      box(g, 'Sunbed_frame', [0.82, 0.24, 1.95], [b.x, 0.14, b.z], m.teak, true);
      makePickable(box(g, 'Sunbed_mattress', [0.76, 0.1, 1.85], [b.x, 0.3, b.z], m.linen), bedData);
      const headrest = box(g, 'Sunbed_headrest', [0.74, 0.12, 0.52], [b.x, 0.45, b.z - 0.65], m.linen);
      headrest.rotation.x = 0.38;
      makePickable(headrest, bedData);
      makePickable(box(g, 'Sunbed_towel', [0.62, 0.03, 0.75], [b.x, 0.36, b.z + 0.35], m.towel), bedData);
    }

    // Resort Parasols between sunbeds
    for (const ux of [-3.1, 3.1]) {
      cylinder(g, 'Parasol_pole', 0.035, 0.035, 2.35, [ux, 1.18, 11.6], m.teakDark, 12);
      cylinder(g, 'Parasol_canopy', 0.08, 1.45, 0.42, [ux, 2.32, 11.6], m.linen, 16);
      this.pool.addObstacle(ux - 0.2, ux + 0.2, 11.4, 11.8);
    }

    // Luxury Private Cabana on East Lounge (x = 8.4, z = 11.4)
    const cabanaData = { action: 'poolSunbed', floorIndex: POOL_FLOOR, restX: 8.4, restZ: 13.0 };
    box(g, 'Cabana_platform', [2.8, 0.22, 2.6], [8.4, 0.11, 11.4], m.teak, true);
    makePickable(box(g, 'Cabana_daybed', [2.3, 0.26, 2.2], [8.4, 0.35, 11.4], m.linen), cabanaData);
    makePickable(box(g, 'Cabana_accent_pillow', [1.8, 0.18, 0.4], [8.4, 0.55, 10.6], m.coral), cabanaData);
    for (const dx of [-1.28, 1.28]) {
      for (const dz of [-1.18, 1.18]) {
        box(g, 'Cabana_post', [0.1, 2.3, 0.1], [8.4 + dx, 1.25, 11.4 + dz], m.teakDark);
      }
    }
    box(g, 'Cabana_roof', [2.8, 0.1, 2.6], [8.4, 2.42, 11.4], m.linen);

    // 6. Rooftop Sky Bar on West Deck (x = -8.6, z = 11.4, action: 'poolBar')
    const barData = { action: 'poolBar', floorIndex: POOL_FLOOR };
    makePickable(box(g, 'Pool_bar_counter', [3.4, 1.05, 0.85], [-8.4, 0.52, 11.5], m.teak, true), barData);
    makePickable(box(g, 'Pool_bar_marble_top', [3.55, 0.08, 0.96], [-8.4, 1.08, 11.5], m.marble), barData);
    box(g, 'Pool_bar_back_wall', [3.5, 2.3, 0.18], [-8.4, 1.15, 9.4], m.teakDark, true);
    for (const sy of [1.1, 1.65]) {
      box(g, 'Pool_bar_shelf', [2.8, 0.05, 0.28], [-8.4, sy, 9.58], m.gold);
    }
    makePickable(
      sign(
        g,
        'Pool_bar_sign',
        ['SKY POOL BAR 🍹', '클릭해 트로피컬 음료 주문'],
        [-8.4, 2.15, 9.52],
        1.65,
        0.42,
        0
      ),
      barData
    );

    // Bar stools in front of the Sky Bar
    for (const sx of [-9.4, -8.4, -7.4]) {
      cylinder(g, 'Bar_stool_stem', 0.04, 0.04, 0.72, [sx, 0.36, 12.35], m.gold, 12);
      makePickable(cylinder(g, 'Bar_stool_seat', 0.22, 0.22, 0.08, [sx, 0.74, 12.35], m.coral, 16), barData);
    }

    // Bartender Leo behind the Pool Bar
    this.bartender = this.buildBartender(g, [-8.4, 0, 10.45], barData);

    // 7. Tropical Palm Planters around the Rooftop Deck
    for (const [px, pz] of [
      [-10.2, 15.2],
      [-10.2, 22.8],
      [10.2, 22.8],
      [-4.8, 8.8],
      [4.8, 8.8],
    ]) {
      cylinder(g, 'Rooftop_planter', 0.42, 0.34, 0.56, [px, 0.28, pz], m.marble, 16);
      cylinder(g, 'Palm_trunk', 0.06, 0.09, 1.75, [px, 1.12, pz], m.teak, 10);
      for (let f = 0; f < 6; f++) {
        const a = (f * Math.PI) / 3;
        const frond = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), m.leaf);
        frond.scale.set(0.65, 0.25, 1.85);
        frond.position.set(px + Math.cos(a) * 0.38, 1.98, pz + Math.sin(a) * 0.38);
        frond.rotation.y = -a + Math.PI / 2;
        frond.rotation.x = 0.25;
        g.add(frond);
      }
      this.pool.addObstacle(px - 0.45, px + 0.45, pz - 0.45, pz + 0.45);
    }

    // 8. Rooftop Panorama Skyline Observatory Telescope (x = 7.4, z = 25.1)
    const telescopeData = { action: 'poolTelescope', floorIndex: POOL_FLOOR };
    const telescopeGroup = new THREE.Group();
    telescopeGroup.name = 'Rooftop_telescope';
    telescopeGroup.position.set(7.4, 0.0, 25.1);

    const scopeBase = cylinder(telescopeGroup, 'Telescope_base', 0.22, 0.26, 0.08, [0, 0.04, 0], m.black);
    const scopePillar = cylinder(telescopeGroup, 'Telescope_pillar', 0.05, 0.065, 1.15, [0, 0.62, 0], m.chrome);
    const scopeSwivel = box(telescopeGroup, 'Telescope_swivel', [0.12, 0.1, 0.12], [0, 1.22, 0], m.gold);
    const scopeBarrel = cylinder(telescopeGroup, 'Telescope_barrel', 0.065, 0.09, 0.42, [0, 1.25, -0.06], m.chrome);
    scopeBarrel.rotation.x = Math.PI / 2 - 0.18;
    const scopeEye = cylinder(telescopeGroup, 'Telescope_eyepiece', 0.032, 0.038, 0.12, [0, 1.21, 0.14], m.black);
    scopeEye.rotation.x = Math.PI / 2 - 0.18;
    g.add(telescopeGroup);

    makePickable(scopeBase, telescopeData);
    makePickable(scopePillar, telescopeData);
    makePickable(scopeBarrel, telescopeData);
    makePickable(scopeEye, telescopeData);

    this.root.visible = false;
  }

  buildBartender(parent, pos, barData) {
    const root = new THREE.Group();
    root.name = 'Pool_bartender_leo';
    root.position.set(...pos);
    root.userData = { ...barData, dynamic: true };
    parent.add(root);

    const skin = new THREE.MeshStandardMaterial({ color: 0xd8ad8e, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x1e6b7b, roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x20282c, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), shirt);
    torso.position.y = 1.12;
    torso.userData = { ...barData, dynamic: true };
    root.add(torso);
    this.pickables.push(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skin);
    head.position.y = 1.58;
    head.userData = { ...barData, dynamic: true };
    root.add(head);
    this.pickables.push(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 16, 12), dark);
    hair.position.set(0, 1.63, -0.02);
    hair.scale.set(1, 0.75, 1.05);
    root.add(hair);

    return { root, head };
  }

  updateVisibility(floor, game, exterior = false) {
    this.root.visible = exterior || (game && Math.abs(floor - POOL_FLOOR) <= 1);
  }

  update(time = 0) {
    if (!this.root.visible) return;

    const mode = this.pool.lightMode;
    this.poolPointLight.color.setHex(mode.color);
    this.m.led.color.setHex(mode.color);
    this.m.water.emissive.setHex(mode.color);
    this.m.water.emissiveIntensity = 0.22 + 0.08 * Math.sin(time * 2.2);

    // Shimmering water surface motion
    if (this.waterTex) {
      this.waterTex.offset.x = (time * 0.035) % 1;
      this.waterTex.offset.y = Math.sin(time * 0.8) * 0.04;
    }
    this.waterMesh.position.y = 0.14 + Math.sin(time * 2.0) * 0.008;
    this.waterMesh.scale.x = 1.0 + Math.sin(time * 1.6) * 0.005;
    this.waterMesh.scale.z = 1.0 + Math.cos(time * 1.4) * 0.004;
    if (this.jacuzziWater) {
      this.jacuzziWater.position.y = 0.28 + Math.sin(time * 3.2) * 0.01;
    }

    // Arching fountain jets
    const showFountain = this.pool.fountainOn;
    this.fountainGroup.visible = showFountain;
    if (showFountain) {
      for (const arc of this.fountainArcs) {
        const p = (time * 1.15 + arc.offset) % 1;
        const xDist = p * 1.55;
        arc.mesh.position.set(
          arc.side * (6.05 - xDist),
          0.26 + Math.sin(p * Math.PI) * 0.78,
          arc.z
        );
        const s = 0.7 + Math.sin(p * Math.PI) * 0.5;
        arc.mesh.scale.set(s, s, s);
      }
    }

    // Whirlpool Jacuzzi bubbles
    const jacuzziActive = this.pool.jacuzziOn;
    for (const b of this.jacuzziBubbles) {
      b.mesh.visible = jacuzziActive;
      if (jacuzziActive) {
        const cycle = (time * 1.8 + b.phase) % 1;
        b.mesh.position.y = 0.44 + cycle * 0.16;
        b.mesh.position.x = b.baseX + Math.sin(time * 5 + b.phase) * 0.04;
        b.mesh.position.z = b.baseZ + Math.cos(time * 5 + b.phase) * 0.04;
      }
    }

    if (this.bartender) {
      this.bartender.head.rotation.y = Math.sin(time * 1.1) * 0.18;
    }
  }
}
