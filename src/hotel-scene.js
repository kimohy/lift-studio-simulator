import * as THREE from 'three';
import { FLOORS } from './controller.js';
import { hotelSignTexture } from './hotel-sign.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const up = new THREE.Vector3(0, 1, 0);

export class HotelScene {
  constructor(scene, world, pickables) {
    this.world = world;
    this.pickables = pickables;
    this.root = new THREE.Group();
    this.root.name = 'Hotel_and_parking';
    scene.add(this.root);

    this.floors = [];
    this.staff = [];
    this.cars = [];
    this.ramps = [];
    this.signs = [];

    this.exterior = new THREE.Group();
    this.exterior.name = 'Hotel_exterior';
    scene.add(this.exterior);

    const mat = (color, roughness = 0.7, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    this.m = {
      marble: mat(0xded8c9, 0.28),
      wall: mat(0xc6bdab, 0.8),
      wood: mat(0x60422f, 0.55),
      gold: mat(0xbfa16a, 0.3, 0.75),
      metal: mat(0x869496, 0.25, 0.8),
      concrete: mat(0x8b918e, 0.93),
      asphalt: mat(0x3c4544, 0.94),
      black: mat(0x202a2c, 0.9),
      fabric: mat(0x436467, 0.96),
      leaf: mat(0x3f6542, 0.95),
      red: mat(0xad3d30, 0.65),
      white: mat(0xefeee3, 0.65),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x8eafb5,
        metalness: 0.18,
        roughness: 0.12,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      warm: new THREE.MeshStandardMaterial({
        color: 0xffe6b6,
        emissive: 0xffc47b,
        emissiveIntensity: 0.65,
      }),
      yellow: new THREE.MeshBasicMaterial({ color: 0xdfc25c }),
    };

    this.textureMaterials();

    for (let f = 0; f <= 5; f++) {
      const group = new THREE.Group();
      group.name = f === 5 ? 'Grand_hotel_lobby' : `Parking_${FLOORS[f]}`;
      group.userData.floorIndex = f;
      group.position.y = (f - 5) * 3.5;
      this.root.add(group);
      this.floors.push(group);
      this.connector(group, f);
      if (f === 5) this.lobby(group);
      else this.parking(group, f);
    }

    this.makeExterior();
    this.root.visible = false;
    this.exterior.visible = false;
  }

  box(group, name, size, pos, material, solidFloor = null) {
    const m = new THREE.Mesh(unitBox, material);
    m.name = name;
    m.scale.set(...size);
    m.position.set(...pos);
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

  cylinder(group, name, r1, r2, height, pos, material, segments = 16) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, height, segments), material);
    m.name = name;
    m.position.set(...pos);
    group.add(m);
    return m;
  }

  sphere(group, name, radius, pos, material, scale = [1, 1, 1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
    m.name = name;
    m.position.set(...pos);
    m.scale.set(...scale);
    group.add(m);
    return m;
  }

  rail(group, a, b, material = this.m.gold, r = 0.03) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, start.distanceTo(end), 8), material);
    m.position.copy(start).add(end).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, end.sub(start).normalize());
    group.add(m);
    return m;
  }

  sign(group, name, lines, pos, size = [2, 0.55], rotation = Math.PI, color = '#203d39') {
    const tex = hotelSignTexture(lines);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0] * (name === 'Exterior_hotel_name' ? 0.85 : 0.64), size[1] * 0.64),
      new THREE.MeshBasicMaterial({
        map: tex,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    mesh.name = name;
    mesh.position.set(...pos);
    mesh.rotation.y = rotation;
    mesh.userData.signLines = lines;
    group.add(mesh);
    this.signs.push(mesh);
    return mesh;
  }

  textureMaterials() {
    // Subtle stone grain and tile joints rather than flat color surfaces.
    let seed = 73;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (const [key, base] of [
      ['marble', 215],
      ['concrete', 145],
      ['asphalt', 61],
    ]) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d');
      c.fillStyle = `rgb(${base},${base},${base - 4})`;
      c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1100; i++) {
        const shade = base - 20 + Math.floor(random() * 40);
        c.fillStyle = `rgba(${shade},${shade},${shade},.14)`;
        c.fillRect(random() * 256, random() * 256, 2 + random() * 3, 1 + random() * 3);
      }
      if (key === 'marble') {
        c.strokeStyle = '#aaa79e';
        c.lineWidth = 0.5;
        for (let i = 0; i < 8; i++) {
          c.beginPath();
          c.moveTo(random() * 256, 0);
          c.bezierCurveTo(random() * 256, 90, random() * 256, 170, random() * 256, 256);
          c.stroke();
        }
        c.strokeStyle = '#8c897e';
        c.lineWidth = 2;
        c.strokeRect(0, 0, 256, 256);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(key === 'marble' ? 9 : 12, key === 'marble' ? 7 : 12);
      this.m[key].map = tex;
    }
  }

  connector(g, f) {
    this.box(g, 'Connecting_corridor_floor', [5.08, 0.14, 4.9], [0, -0.07, 5.85], f === 5 ? this.m.marble : this.m.concrete);
    for (const x of [-2.54, 2.54]) {
      this.box(g, 'Connecting_corridor_wall', [0.12, 3.3, 4.4], [x, 1.65, 5.9], f === 5 ? this.m.wall : this.m.concrete);
    }
    this.box(g, 'Connecting_corridor_ceiling', [5.2, 0.12, 4.9], [0, 3.28, 5.85], this.m.wall);
    for (const z of [4.5, 6.9]) {
      this.box(g, 'Corridor_ceiling_light', [1.4, 0.025, 0.2], [0, 3.2, z], this.m.warm);
    }
    this.sign(
      g,
      'Wayfinding_to_main_space',
      [f === 5 ? '리셉션 ←  로비  → 카페' : `${FLOORS[f]} · 주차장`, 'ELEVATOR & STAIRS  ↕'],
      [0, 2.63, 7.95],
      [2.35, 0.55]
    );
  }

  plant(g, x, z, floor = 5) {
    this.cylinder(g, 'Planter', 0.26, 0.22, 0.48, [x, 0.24, z], this.m.marble);
    this.rail(g, [x, 0.42, z], [x, 1.25, z], this.m.wood, 0.035);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      this.sphere(
        g,
        'Plant_leaf',
        0.22,
        [x + Math.cos(a) * 0.18, 1.02 + (i % 2) * 0.18, z + Math.sin(a) * 0.18],
        this.m.leaf,
        [0.75, 1.5, 0.5]
      );
    }
    this.world.addObstacle(floor, x - 0.28, x + 0.28, z - 0.28, z + 0.28);
  }

  lobby(g) {
    const m = this.m;
    this.box(g, 'Marble_lobby_floor', [23.6, 0.18, 18], [-0.2, -0.09, 17], m.marble);
    this.box(g, 'Lobby_ceiling', [23.6, 0.12, 18], [-0.2, 3.4, 17], m.wall);
    for (const x of [-12, 11.6]) {
      this.box(g, 'Lobby_side_wall', [0.18, 3.4, 18], [x, 1.7, 17], m.wall);
    }
    for (const x of [-7.3, 7.3]) {
      this.box(g, 'Lobby_service_wall', [9.4, 3.4, 0.18], [x, 1.7, 8], m.wall);
    }
    for (const x of [-6.8, 6.6]) {
      this.box(g, 'Lobby_front_glazing', [x < 0 ? 10.6 : 10.2, 3.3, 0.06], [x, 1.65, 26], m.glass);
    }
    for (const x of [-11.8, -8, -4, -1.3, 1.3, 4, 8, 11.8]) {
      this.box(g, 'Window_mullion', [0.06, 3.35, 0.12], [x, 1.675, 26], m.metal);
    }
    this.box(g, 'Glass_entry_header', [2.6, 0.3, 0.08], [0, 3.15, 26], m.metal);
    this.sign(g, 'Hotel_brand', ['GRAND HOTEL', '로비 · LOBBY'], [0, 2.68, 25.9], [3.4, 0.68]);

    for (const x of [-9, 9]) {
      for (const z of [9, 24]) {
        this.cylinder(g, 'Marble_column', 0.29, 0.29, 3.3, [x, 1.65, z], m.marble);
        this.world.addObstacle(5, x - 0.32, x + 0.32, z - 0.32, z + 0.32);
        this.cylinder(g, 'Column_gold_base', 0.33, 0.33, 0.1, [x, 0.05, z], m.gold);
      }
    }
    for (const x of [-10, -6, 0, 6, 10]) {
      for (const z of [10, 15, 21, 24]) {
        this.cylinder(g, 'Recessed_downlight', 0.09, 0.09, 0.025, [x, 3.315, z], m.warm, 12);
      }
    }

    // A ring chandelier, suspended safely above eye height.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.026, 8, 48), m.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 2.8, 15);
    g.add(ring);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x = Math.cos(a) * 1.12;
      const z = 15 + Math.sin(a) * 1.12;
      this.rail(g, [x, 2.8, z], [x, 3.34, z], m.gold, 0.01);
      this.sphere(g, 'Chandelier_pendant', 0.075, [x, 2.69, z], m.warm);
    }

    // Full reception counter and workstations.
    this.box(g, 'Reception_counter', [6.2, 1.02, 0.85], [-5.6, 0.51, 21.4], m.wood, 5);
    this.box(g, 'Reception_marble_top', [6.35, 0.08, 0.95], [-5.6, 1.06, 21.4], m.marble);
    this.sign(g, 'Reception_front', ['리셉션', 'RECEPTION'], [-5.6, 0.62, 20.965], [2.5, 0.44]);
    this.sign(g, 'Reception_wall', ['GRAND HOTEL', '리셉션 · RECEPTION'], [-5.6, 2.35, 24.9], [4.4, 0.88]);
    this.box(g, 'Reception_back_panel', [7.5, 3, 0.08], [-5.6, 1.5, 25], m.wood);
    for (const x of [-7.2, -4.2]) {
      this.box(g, 'Reception_monitor', [0.55, 0.36, 0.04], [x, 1.39, 21.45], m.black);
      this.box(g, 'Reception_monitor_stand', [0.1, 0.21, 0.12], [x, 1.2, 21.46], m.metal);
      this.box(g, 'Reception_keyboard', [0.43, 0.025, 0.15], [x, 1.12, 21.1], m.black);
    }
    this.makeStaff(
      g,
      'reception-a',
      '프런트 직원 · 지윤',
      [-7.2, 0, 22.25],
      0x23343f,
      '어서 오세요. 카페는 로비 오른쪽, 객실은 2층부터 10층입니다. Welcome to Lift Grand Hotel.',
      true
    );
    this.makeStaff(
      g,
      'reception-b',
      '프런트 직원 · 민호',
      [-4.2, 0, 22.25],
      0x23343f,
      '체크인과 객실 안내를 도와드리겠습니다. How may I assist you?',
      false
    );

    const makePickable = (mesh, data) => {
      if (!mesh) return mesh;
      mesh.userData = { ...mesh.userData, ...data };
      this.pickables?.push(mesh);
      return mesh;
    };

    // Lounge seating, tables, plants, and a luggage trolley.
    const sofa = (x, z, rotation = 0, seatZ = z + 0.95, seatYaw = Math.PI) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      g.add(group);
      const sofaData = { action: 'loungeSit', floorIndex: 5, seatX: x, seatZ, seatYaw };
      makePickable(this.box(group, 'Lounge_sofa_base', [2.6, 0.38, 0.85], [0, 0.3, 0], m.fabric), sofaData);
      makePickable(this.box(group, 'Lounge_sofa_back', [2.6, 0.62, 0.2], [0, 0.76, 0.36], m.fabric), sofaData);
      for (const side of [-1, 1]) {
        makePickable(this.box(group, 'Sofa_arm', [0.18, 0.5, 0.95], [side * 1.25, 0.55, 0], m.fabric), sofaData);
        makePickable(
          this.box(group, 'Sofa_cushion', [1.1, 0.14, 0.65], [side * 0.6, 0.54, -0.05], m.fabric),
          sofaData
        );
      }
      this.world.addObstacle(5, x - 1.5, x + 1.5, z - 0.6, z + 0.6);
    };
    sofa(-7.6, 11.5, 0, 12.45, Math.PI);
    sofa(-7.6, 15.6, Math.PI, 14.65, 0);
    this.box(g, 'Lounge_rug', [5.1, 0.009, 5.3], [-7.6, 0.016, 13.5], m.fabric);
    this.box(g, 'Lounge_coffee_table', [1.6, 0.07, 0.85], [-7.6, 0.57, 13.6], m.marble, 5);
    for (const x of [-8.2, -7]) {
      this.box(g, 'Coffee_table_leg', [0.05, 0.5, 0.05], [x, 0.28, 13.6], m.gold);
    }
    this.cylinder(g, 'Table_vase', 0.09, 0.08, 0.23, [-7.6, 0.72, 13.6], m.gold);
    this.sphere(g, 'Table_flowers', 0.15, [-7.6, 0.93, 13.6], m.leaf, [1, 0.7, 1]);
    for (const pos of [
      [-10.9, 9.2],
      [-10.9, 23],
      [10.8, 9.3],
      [10.8, 24],
      [-3.2, 24.2],
    ]) {
      this.plant(g, ...pos);
    }
    this.makeTrolley(g, -10, 18.5);

    // Cafe bar with equipment and seating.
    const cafeOrderData = { action: 'cafeOrder', floorIndex: 5 };
    makePickable(this.box(g, 'Cafe_counter', [5.1, 1.02, 1.1], [8, 0.51, 17.6], m.wood, 5), cafeOrderData);
    makePickable(this.box(g, 'Cafe_stone_top', [5.2, 0.08, 1.18], [8, 1.06, 17.6], m.marble), cafeOrderData);
    makePickable(this.sign(g, 'Cafe_front', ['그랜드 카페', 'GRAND CAFÉ'], [8, 0.62, 17.04], [2.2, 0.45]), cafeOrderData);
    makePickable(
      this.sign(g, 'Cafe_menu', ['COFFEE  ·  TEA  ·  DESSERT', '카페 · CAFÉ'], [9.2, 2.45, 21.7], [3, 0.85]),
      cafeOrderData
    );
    this.box(g, 'Cafe_back_wall', [5.5, 2.95, 0.12], [8, 1.475, 22], m.wood, 5);
    this.box(g, 'Cafe_back_counter', [5.1, 0.9, 0.6], [8, 0.45, 21.5], m.wood, 5);
    makePickable(this.box(g, 'Espresso_machine', [0.92, 0.48, 0.48], [8.8, 1.34, 17.6], m.metal), cafeOrderData);
    makePickable(this.box(g, 'Espresso_machine_face', [0.84, 0.27, 0.02], [8.8, 1.32, 17.347], m.black), cafeOrderData);
    for (const x of [8.6, 8.98]) {
      this.cylinder(g, 'Espresso_portafilter', 0.035, 0.035, 0.1, [x, 1.15, 17.32], m.metal);
      this.cylinder(g, 'Coffee_cup', 0.065, 0.05, 0.085, [x, 1.14, 17.16], m.white);
    }
    for (const x of [6.0, 6.3, 6.6]) {
      this.cylinder(g, 'Cafe_display_cup', 0.065, 0.05, 0.08, [x, 1.14, 17.4], m.white);
    }
    makePickable(this.box(g, 'Pastry_display_glass', [0.75, 0.38, 0.4], [7.3, 1.29, 17.6], m.glass), cafeOrderData);
    for (const x of [7.08, 7.32, 7.52]) {
      makePickable(this.sphere(g, 'Cafe_pastry', 0.11, [x, 1.16, 17.57], m.gold, [1, 0.5, 0.7]), cafeOrderData);
    }
    this.makeStaff(
      g,
      'barista',
      '카페 직원 · 서연',
      [8, 0, 18.5],
      0xe9e3d6,
      '그랜드 카페에 오신 것을 환영합니다. 커피와 티, 디저트를 준비해 드립니다. Welcome to Grand Café.',
      true,
      true
    );
    this.makeStaff(
      g,
      'concierge',
      '로비 직원 · 안내',
      [-3.2, 0, 10.8],
      0x33474b,
      '엘리베이터와 계단은 뒤쪽 통로에 있습니다. The lifts and stairs are behind you.',
      false
    );
    for (const [x, z] of [
      [5, 11.2],
      [8.8, 11.2],
      [5, 14.1],
      [8.8, 14.1],
    ]) {
      this.cafeTable(g, x, z);
    }
  }

  cafeTable(g, x, z) {
    const m = this.m;
    const seatData = { action: 'cafeSit', floorIndex: 5, seatX: x, seatZ: z - 0.85, seatYaw: Math.PI };
    const top = this.cylinder(g, 'Cafe_table_top', 0.48, 0.48, 0.055, [x, 0.76, z], m.marble);
    top.userData = { ...seatData };
    this.pickables?.push(top);
    this.cylinder(g, 'Cafe_table_pedestal', 0.07, 0.12, 0.7, [x, 0.37, z], m.gold);
    this.cylinder(g, 'Cafe_table_base', 0.28, 0.28, 0.045, [x, 0.03, z], m.black);
    this.world.addObstacle(5, x - 0.5, x + 0.5, z - 0.5, z + 0.5);
    this.cylinder(g, 'Table_cup', 0.06, 0.05, 0.08, [x + 0.15, 0.83, z], m.white);
    for (const direction of [-1, 1]) {
      const cx = x + direction * 0.85;
      const seat = this.box(g, 'Cafe_chair_seat', [0.42, 0.08, 0.44], [cx, 0.45, z], m.wood, 5);
      seat.userData = { ...seatData };
      this.pickables?.push(seat);
      const back = this.box(g, 'Cafe_chair_back', [0.09, 0.43, 0.44], [cx + direction * 0.17, 0.71, z], m.fabric);
      back.userData = { ...seatData };
      this.pickables?.push(back);
      for (const dz of [-0.16, 0.16]) {
        this.box(g, 'Chair_leg', [0.03, 0.42, 0.03], [cx, 0.22, z + dz], m.gold);
      }
    }
  }

  makeTrolley(g, x, z) {
    const m = this.m;
    this.box(g, 'Luggage_cart_base', [1.15, 0.1, 0.65], [x, 0.2, z], m.fabric, 5);
    for (const dx of [-0.52, 0.52]) {
      for (const dz of [-0.24, 0.24]) {
        const w = this.cylinder(g, 'Cart_wheel', 0.08, 0.08, 0.055, [x + dx, 0.1, z + dz], m.black, 12);
        w.rotation.z = Math.PI / 2;
      }
    }
    for (const dx of [-0.5, 0.5]) {
      this.rail(g, [x + dx, 0.25, z], [x + dx, 1.65, z], m.gold, 0.035);
    }
    this.rail(g, [x - 0.5, 1.65, z], [x + 0.5, 1.65, z], m.gold, 0.035);
    for (const dx of [-0.26, 0.26]) {
      this.box(g, 'Guest_suitcase', [0.42, 0.6, 0.34], [x + dx, 0.55, z], dx < 0 ? m.wood : m.fabric);
      this.box(g, 'Suitcase_handle', [0.2, 0.04, 0.05], [x + dx, 0.88, z], m.metal);
    }
  }

  makeStaff(g, id, name, pos, color, dialogue, longHair = false, apron = false) {
    const root = new THREE.Group();
    root.name = `Staff_${id}`;
    root.position.set(...pos);
    g.add(root);

    const uniform = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xcfa687, roughness: 0.83 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x292323, roughness: 0.95 });

    const capsule = (parent, meshName, r, len, y, material) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), material);
      mesh.name = meshName;
      mesh.position.y = y;
      parent.add(mesh);
      return mesh;
    };

    const torso = capsule(root, 'Uniform_jacket', 0.22, 0.37, 1.08, uniform);
    torso.scale.z = 0.66;
    for (const side of [-1, 1]) {
      const leg = capsule(root, 'Uniform_trousers', 0.075, 0.48, 0.43, this.m.black);
      leg.position.x = side * 0.1;
      this.box(root, 'Staff_shoe', [0.14, 0.1, 0.28], [side * 0.1, 0.08, -0.045], this.m.black);
    }
    this.cylinder(root, 'Staff_neck', 0.065, 0.065, 0.13, [0, 1.46, 0], skin);

    const head = new THREE.Group();
    head.position.y = 1.62;
    root.add(head);
    this.sphere(head, 'Staff_face', 0.155, [0, 0, 0], skin, [0.92, 1.12, 0.91]);
    this.sphere(head, 'Staff_hair', 0.16, [0, 0.095, 0.03], hair, [1, 0.57, 1]);
    if (longHair) {
      this.sphere(head, 'Hair_bun', 0.085, [0, 0.055, 0.145], hair);
      this.sphere(head, 'Hair_back', 0.13, [0, -0.045, 0.092], hair, [1, 1.2, 0.5]);
    }
    for (const x of [-0.052, 0.052]) {
      this.sphere(head, 'Staff_eye', 0.011, [x, 0.026, -0.139], this.m.black, [1, 0.7, 0.5]);
    }
    this.sphere(head, 'Staff_nose', 0.021, [0, -0.015, -0.148], skin, [0.7, 1, 0.8]);
    this.box(head, 'Staff_smile', [0.055, 0.007, 0.005], [0, -0.066, -0.138], hair);
    this.box(root, 'Staff_shirt', [0.15, 0.36, 0.018], [0, 1.16, -0.149], this.m.white);
    this.box(root, 'Staff_tie', [0.038, 0.23, 0.023], [0, 1.15, -0.17], apron ? this.m.fabric : this.m.gold);
    if (apron) {
      this.box(root, 'Barista_apron', [0.34, 0.52, 0.04], [0, 0.99, -0.19], this.m.fabric);
    }

    const arms = [];
    const elbows = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.26, 1.36, 0);
      root.add(pivot);
      capsule(pivot, 'Staff_sleeve', 0.056, 0.22, -0.17, uniform);
      const elbow = new THREE.Group();
      elbow.position.y = -0.34;
      pivot.add(elbow);
      capsule(elbow, 'Staff_forearm', 0.047, 0.2, -0.14, uniform);
      this.sphere(elbow, 'Staff_hand', 0.061, [0, -0.32, 0], skin, [0.85, 1, 0.65]);
      pivot.rotation.z = side * 0.08;
      arms.push(pivot);
      elbows.push(elbow);
    }

    const data = { action: 'staff', floorIndex: 5, staffId: id, staffName: name, dialogue };
    root.traverse((o) => {
      if (o.isMesh) {
        o.userData = { ...data };
        this.pickables.push(o);
      }
    });
    this.world.addObstacle(5, pos[0] - 0.3, pos[0] + 0.3, pos[2] - 0.25, pos[2] + 0.25);
    this.staff.push({ root, head, arms, elbows, id, phase: this.staff.length * 1.5, waveUntil: 0 });
  }

  car(g, x, z, color, floor = 0, rotation = 0) {
    const idx = this.cars.length;
    const root = new THREE.Group();
    root.name = `Parked_car_${idx}`;
    root.position.set(x, 0, z);
    root.rotation.y = rotation;
    g.add(root);

    const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.42, roughness: 0.26 });
    const headlampMat =
      floor !== null
        ? new THREE.MeshStandardMaterial({
            color: 0xffe6b6,
            emissive: 0xffc47b,
            emissiveIntensity: 0.65,
          })
        : this.m.warm;
    const m = this.m;

    this.box(root, 'Car_body', [1.82, 0.4, 4.1], [0, 0.59, 0], paint);
    this.box(root, 'Car_lower_trim', [1.88, 0.16, 3.86], [0, 0.37, 0], m.black);
    this.sphere(root, 'Car_hood', 0.8, [0, 0.8, 1.34], paint, [1.12, 0.18, 0.86]);
    this.sphere(root, 'Car_trunk', 0.8, [0, 0.75, -1.5], paint, [1.12, 0.15, 0.58]);
    this.box(root, 'Car_cabin', [1.54, 0.52, 1.9], [0, 1.07, -0.19], m.glass);
    this.sphere(root, 'Car_roof', 0.8, [0, 1.37, -0.24], paint, [0.98, 0.11, 1.2]);

    for (const side of [-1, 1]) {
      for (const dz of [-1.31, 1.27]) {
        const tire = this.cylinder(root, 'Car_tire', 0.31, 0.31, 0.21, [side * 0.91, 0.32, dz], m.black, 20);
        tire.rotation.z = Math.PI / 2;
        const hub = this.cylinder(root, 'Wheel_alloy', 0.2, 0.2, 0.012, [side * 1.025, 0.32, dz], m.metal, 16);
        hub.rotation.z = Math.PI / 2;
      }
      this.box(root, 'Side_mirror', [0.13, 0.1, 0.17], [side * 0.97, 1.03, 0.71], paint);
      this.box(root, 'Door_handle', [0.025, 0.035, 0.15], [side * 0.923, 0.88, -0.35], m.metal);
      const lamp = this.box(root, 'Headlamp', [0.47, 0.14, 0.035], [side * 0.58, 0.64, 2.064], headlampMat);
      lamp.userData.dynamic = true;
      this.box(root, 'Tail_light', [0.42, 0.13, 0.035], [side * 0.59, 0.64, -2.064], m.red);
      this.box(root, 'Window_pillar', [0.055, 0.51, 0.08], [side * 0.782, 1.07, -0.19], paint);
    }
    this.box(root, 'Front_grille', [0.67, 0.18, 0.04], [0, 0.48, 2.065], m.black);
    this.box(root, 'License_plate', [0.44, 0.1, 0.012], [0, 0.34, 2.1], m.white);

    if (floor !== null) {
      this.world.addObstacle(floor, x - 1.02, x + 1.02, z - 2.16, z + 2.16);
      const carModels = [
        '그랜드 리무진 세단',
        '일렉트릭 GT 쿠페',
        '이그제큐티브 SUV',
        '클래식 투어링 세단',
      ];
      const carData = {
        action: 'parkingCar',
        floorIndex: floor,
        carId: root.name,
        carName: carModels[idx % carModels.length],
        floorLabel: `${FLOORS[floor]}층`,
        carX: x,
        carZ: z,
        carYaw: rotation,
      };
      root.userData = { ...root.userData, ...carData, headlampMat, flashUntil: 0 };
      root.traverse((o) => {
        if (o.isMesh) {
          o.userData = { ...o.userData, ...carData };
          this.pickables?.push(o);
        }
      });
    }
    this.cars.push(root);
    return root;
  }

  parking(g, f) {
    const m = this.m;
    this.box(g, 'Garage_floor', [24.8, 0.18, 28], [-1.6, -0.09, 22], m.concrete);
    this.box(g, 'Garage_ceiling', [24.8, 0.16, 28], [-1.6, 3.34, 22], m.concrete);
    for (const x of [-14, 10.8]) {
      this.box(g, 'Garage_outer_wall', [0.18, 3.4, 28], [x, 1.7, 22], m.concrete);
    }
    for (const [x, width] of [
      [-8.27, 11.46],
      [6.67, 8.26],
    ]) {
      this.box(g, 'Garage_front_wall', [width, 3.4, 0.14], [x, 1.7, 8], m.concrete);
    }
    this.box(g, 'Garage_back_wall', [24.8, 3.4, 0.14], [-1.6, 1.7, 36], m.concrete);

    // Break openings in the side wall at both turning bays.
    // Main side wall spans only the ramp's enclosed middle section.
    const side = g.children.find((o) => o.name === 'Garage_outer_wall' && o.position.x > 0);
    side.scale.z = 24;
    side.position.z = 22;

    const front = g.children.find((o) => o.name === 'Garage_front_wall' && o.position.x > 0);
    front.position.z = 2;
    front.scale.x = 3.3;
    front.position.x = 9.15;

    this.box(g, 'Garage_front_infill', [4.96, 3.4, 0.14], [5.02, 1.7, 8], m.concrete);

    const back = g.children.find((o) => o.name === 'Garage_back_wall');
    back.scale.x = 16.4;
    back.position.x = -5.8;

    for (const z of [5, 39]) {
      const width = z === 5 ? 3.3 : 8.4;
      const x = z === 5 ? 9.15 : 6.6;
      const left = z === 5 ? 7.5 : 2.4;
      this.box(g, 'Vehicle_cross_aisle', [width, 0.18, 6], [x, -0.09, z], m.asphalt);
      this.box(g, 'Cross_aisle_ceiling', [width, 0.16, 6], [x, 3.34, z], m.concrete);
      this.box(g, 'Cross_aisle_left_wall', [0.16, 3.4, 6], [left, 1.7, z], m.concrete);
    }
    this.box(g, 'Rear_cross_aisle_end', [8.4, 3.4, 0.16], [6.6, 1.7, 41.9], m.concrete);

    for (const z of [6, 38]) {
      this.box(g, 'Vehicle_turning_bay', [13.4, 0.18, 8], [17.2, -0.09, z], m.asphalt);
      this.box(g, 'Turning_bay_outer_wall', [0.18, 3.4, 8], [23.9, 1.7, z], m.concrete);
      this.box(g, 'Turning_bay_ceiling', [13.4, 0.16, 8], [17.2, 3.34, z], m.concrete);
    }
    this.box(g, 'Drive_aisle', [5.3, 0.01, 27], [0.5, 0.014, 22], m.asphalt);
    for (let z = 9; z < 36; z += 3) {
      this.box(g, 'Aisle_center_dash', [0.09, 0.009, 1.5], [0.5, 0.026, z], m.yellow);
    }
    for (const x of [-12, -3.5, 9]) {
      for (const z of [10, 18, 26, 34]) {
        if (x === 9 && (z === 10 || z === 34)) continue;
        this.box(g, 'Concrete_column', [0.52, 3.3, 0.52], [x, 1.65, z], m.concrete, f);
        this.box(g, 'Column_safety_wrap', [0.56, 0.55, 0.56], [x, 0.35, z], m.yellow);
        this.box(g, 'Column_black_band', [0.57, 0.13, 0.57], [x, 0.35, z], m.black);
      }
    }
    for (const x of [-11.6, -8.9, -6.2, 5.8, 8.5]) {
      for (const z of [12.4, 20.4, 28.4]) {
        this.box(g, 'Parking_stall_line', [0.05, 0.008, 4.9], [x, 0.023, z], m.white);
      }
    }
    for (const z of [15, 23, 31]) {
      this.box(g, 'Parking_stall_end', [10, 0.009, 0.05], [-9, 0.023, z], m.white);
      this.box(g, 'Parking_stall_end', [5.4, 0.009, 0.05], [7.15, 0.023, z], m.white);
    }

    const colors = [0xe7e5dd, 0x29495b, 0x8c3431, 0x242a2f, 0x80938b, 0xc1c0b6];
    for (const [i, [x, z]] of [
      [-10.25, 12.5],
      [7.1, 12.5],
      [-7.5, 20.5],
      [7.1, 20.5],
      [-10.25, 28.5],
      [-7.5, 28.5],
    ].entries()) {
      this.car(g, x, z, colors[(i + f) % colors.length], f);
    }

    for (const z of [11, 19, 27, 34]) {
      for (const x of [-8, 1, 7]) {
        this.box(g, 'Garage_LED_fixture', [2.3, 0.04, 0.14], [x, 3.2, z], m.warm);
      }
      this.rail(g, [-13, 2.98, z], [10, 2.98, z], m.red, 0.045);
      this.rail(g, [-13, 3.1, z + 0.22], [10, 3.1, z + 0.22], m.metal, 0.025);
    }
    this.sign(
      g,
      `Parking_level_${FLOORS[f]}`,
      [`${FLOORS[f]} · 주차장`, 'PARKING  ·  엘리베이터 / 계단 ↑'],
      [0, 2.35, 35.9],
      [4.3, 0.82]
    );
    this.sign(
      g,
      'Parking_to_elevators',
      ['엘리베이터 · 계단', 'ELEVATORS & STAIRS  ↑'],
      [0, 2.7, 8.13],
      [2.7, 0.58],
      0
    );
    this.box(g, 'Ramp_annex_outer_wall', [0.18, 3.5, 24], [23.9, 1.75, 22], m.concrete);
    for (const z of [2.1, 41.9]) {
      this.box(g, 'Turning_bay_end_wall', [13.4, 3.4, 0.16], [17.2, 1.7, z], m.concrete);
    }

    this.ramp(g, f);

    // Enclose service voids while preserving the connected vehicle portals.
    for (const [x, w] of [
      [11.3, 1],
      [17.3, 1],
      [23.35, 1.1],
    ]) {
      this.box(g, 'Ramp_service_partition', [w, 3.5, 24], [x, 1.75, 22], m.concrete);
    }
    // Each level needs only the bay shared by its incoming and outgoing ramps.
    const unusedFront = f % 2 === 1;
    const unusedZ = unusedFront ? 6 : 38;
    this.box(g, 'Unused_turning_bay_wall', [0.18, 3.5, 8], [10.8, 1.75, unusedZ], m.concrete);
    this.box(
      g,
      'Unused_cross_aisle_wall',
      [unusedFront ? 3.3 : 8.4, 3.5, 0.18],
      [unusedFront ? 9.15 : 6.6, 1.75, unusedFront ? 8 : 36],
      m.concrete,
      f
    );
    this.sign(
      g,
      'Vehicle_ramp_wayfinding',
      [`${FLOORS[f]} · 차량 경사로`, 'VEHICLE RAMP'],
      [10.7, 2.45, unusedFront ? 35 : 9],
      [2.1, 0.42],
      -Math.PI / 2
    );

    const mouth = f % 2 === 0 ? 10 : 34;
    const closed = f % 2 === 0 ? 34 : 10;
    this.box(g, 'Closed_ramp_end_wall', [13.1, 3.5, 0.18], [17.35, 1.75, closed], m.concrete);
    for (const [x, w] of [
      [11.3, 1],
      [17.3, 1],
      [23.35, 1.1],
    ]) {
      this.box(g, 'Ramp_portal_pier', [w, 3.5, 0.18], [x, 1.75, mouth], m.concrete);
    }
    for (const x of [14.3, 20.3]) {
      this.box(g, 'Ramp_portal_header', [5, 0.65, 0.18], [x, 3.175, mouth], m.concrete);
    }
    if (f === 0) {
      this.box(g, 'Unused_ramp_lane_wall', [5, 3.5, 0.18], [20.3, 1.75, mouth], m.concrete);
    }
    for (const x of [-1.9, 2.9]) {
      this.box(g, 'Pedestrian_marking', [0.055, 0.008, 26], [x, 0.029, 22], m.yellow);
    }
  }

  ramp(g, f) {
    const x = f % 2 === 0 ? 14.3 : 20.3;
    const slope = (f % 2 === 0 ? 1 : -1) * Math.atan2(3.5, 24);
    const length = Math.hypot(3.5, 24);
    const m = this.m;

    const deck = this.box(g, 'Vehicle_ramp_deck', [5, 0.2, length], [x, 1.65, 22], m.asphalt);
    deck.rotation.x = -slope;
    deck.userData = { lowerFloor: f, upperFloor: f + 1 };
    this.ramps.push(deck);

    for (const dx of [-2.5, 2.5]) {
      const wall = this.box(g, 'Ramp_concrete_guard', [0.14, 0.74, length], [x + dx, 2.1, 22], m.concrete);
      wall.rotation.x = -slope;
    }
    const roof = this.box(g, 'Ramp_tunnel_ceiling', [5, 0.12, length], [x, 4.6, 22], m.concrete);
    roof.rotation.x = -slope;

    for (const dx of [-2.53, 2.53]) {
      const shape = new THREE.Shape();
      const a = f % 2 === 0 ? 0 : 3.5;
      const b = f % 2 === 0 ? 3.5 : 0;
      shape.moveTo(10, a - 0.15);
      shape.lineTo(34, b - 0.15);
      shape.lineTo(34, b + 2.85);
      shape.lineTo(10, a + 2.85);
      shape.closePath();
      const side = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false }),
        m.concrete
      );
      side.name = 'Ramp_tunnel_wall';
      side.rotation.y = -Math.PI / 2;
      side.position.x = x + dx + 0.07;
      g.add(side);
    }
    for (const z of [12, 18, 24, 30]) {
      const y = ((f % 2 === 0 ? z - 10 : 34 - z) * 3.5) / 24;
      const lamp = this.box(g, 'Ramp_tunnel_light', [1.7, 0.025, 0.15], [x, y + 2.72, z], m.warm);
      lamp.rotation.x = -slope;
    }
    for (let i = 0; i < 8; i++) {
      const z = 11 + i * 3;
      const y = ((f % 2 === 0 ? z - 10 : 34 - z) * 3.5) / 24;
      const line = this.box(g, 'Ramp_lane_divider', [0.065, 0.012, 1.5], [x, y + 0.022, z], m.yellow);
      line.rotation.x = -slope;
    }
    this.sign(
      g,
      `Ramp_level_sign_${FLOORS[f]}`,
      [`${FLOORS[f]} ↔ ${f === 4 ? '1F' : FLOORS[f + 1]}`, '차량 경사로 · TWO-WAY RAMP'],
      [x, f % 2 === 0 ? 2.65 : 6.15, 9.9],
      [3.8, 0.65],
      0
    );
  }

  makeExterior() {
    const g = this.exterior;
    const m = this.m;
    this.shaftClearSlab(g, 'Hotel_foundation_plinth', 25.8, 0.35, 28, -1.1, -0.2, 13, m.concrete);

    // Eight stories of enclosed guest rooms (2F–9F); 10F is the open-air Rooftop Infinity Pool & Sky Lounge.
    const stone = new THREE.MeshStandardMaterial({ color: 0xc4bdaf, roughness: 0.7 });
    for (let floor = 2; floor <= 10; floor++) {
      const y = (floor - 1) * 3.5 + 1.65;
      this.shaftClearSlab(g, 'Guest_floor_spandrel', 28, 0.66, 27, 0, y - 1.35, 12.5, stone);
      if (floor === 10) continue;
      for (const x of [-11.9, -8.5, -5.1, -1.7, 1.7, 5.1, 8.5, 11.9]) {
        this.box(g, 'Guest_room_window', [2.45, 2.2, 0.08], [x, y, 26.07], m.glass);
        this.box(g, 'Facade_vertical_pier', [0.3, 2.86, 0.3], [x + 1.6, y, 26], stone);
        this.box(g, 'Window_transom', [2.55, 0.06, 0.12], [x, y + 0.45, 26.13], m.metal);
      }
      for (const x of [-14, 14]) {
        for (const z of [2.2, 6.8, 11.4, 16, 20.6, 24.5]) {
          this.box(g, 'Side_guest_window', [0.06, 2.2, 3.5], [x, y, z], m.glass);
          this.box(g, 'Facade_side_pier', [0.28, 2.86, 0.28], [x, y, z + 2.1], stone);
        }
      }
    }
    this.box(g, 'Hotel_back_wall', [28, 35, 0.2], [0, 17.5, -0.95], stone);
    // Mechanical penthouse roof over the rear elevator/stair/escalator core (z: -1..8.1), leaving the 10F rooftop pool deck open to the sky.
    this.box(g, 'Roof_slab', [28.8, 0.25, 9.2], [0, 35.15, 3.5], stone);
    for (const x of [-14, 14]) {
      this.box(g, 'Roof_parapet', [0.25, 0.85, 9.2], [x, 35.6, 3.5], stone);
    }
    this.box(g, 'Roof_front_parapet', [28, 0.85, 0.25], [0, 35.6, 8.0], stone);
    for (const x of [-7, 6]) {
      this.box(g, 'Roof_HVAC_unit', [3, 1.1, 2], [x, 35.9, 3.5], m.metal);
      for (let y = 35.5; y < 36.4; y += 0.14) {
        this.box(g, 'HVAC_louver', [2.8, 0.04, 0.02], [x, y, 4.51], m.black);
      }
    }
    this.sign(
      g,
      'Exterior_hotel_name',
      ['GRAND HOTEL', 'HOTEL · ROOFTOP POOL · CAFÉ'],
      [0, 30.1, 26.35],
      [10.5, 1.5],
      0,
      '#263b3a'
    );
    this.box(g, 'Entrance_canopy', [10, 0.18, 3.4], [0, 3.25, 27.5], m.metal);
    for (const x of [-4.7, 4.7]) {
      this.cylinder(g, 'Canopy_column', 0.07, 0.07, 3.15, [x, 1.57, 28.4], m.gold);
    }
    // Leave a real opening above the B1 → ground ramp, not a painted entrance.
    this.box(g, 'Entrance_plaza_left', [25.8, 0.18, 22], [-1.1, -0.09, 37], m.marble);
    this.box(g, 'Entrance_plaza_right', [7.2, 0.18, 22], [20.4, -0.09, 37], m.marble);
    this.box(g, 'Entrance_plaza_exit', [5, 0.18, 14], [14.3, -0.09, 41], m.marble);
    this.box(g, 'Car_entry_road', [5, 0.02, 14], [14.3, 0.015, 41], m.asphalt);
    for (const x of [11.77, 16.83]) {
      this.box(g, 'Driveway_curb', [0.12, 0.12, 14], [x, 0.065, 41], m.concrete);
    }
    for (let z = 35; z < 48; z += 3) {
      this.box(g, 'Entry_lane_dash', [0.09, 0.01, 1.6], [14.3, 0.031, z], m.yellow);
    }
    for (const x of [11.7, 16.9]) {
      this.box(g, 'Ground_ramp_retaining_wall', [0.2, 4.5, 24], [x, -1.25, 22], m.concrete);
    }
    this.box(g, 'Parking_portal_header', [5.4, 0.35, 0.35], [14.3, 2.85, 34], m.concrete);
    for (const x of [11.7, 16.9]) {
      this.box(g, 'Parking_portal_pier', [0.25, 2.7, 0.4], [x, 1.35, 34], m.concrete);
    }
    this.box(g, 'City_street', [70, 0.12, 10], [4, -0.06, 53], m.asphalt);
    for (const [x, width] of [
      [-9.6, 42.8],
      [27.9, 22.2],
    ]) {
      this.box(g, 'Street_sidewalk', [width, 0.18, 2], [x, 0.03, 47.9], m.concrete);
    }
    for (let x = -28; x < 39; x += 5) {
      this.box(g, 'Street_lane_dash', [2.6, 0.012, 0.08], [x, 0.012, 53], m.white);
    }
    for (const [x, z] of [
      [-11, 29],
      [-11, 40],
      [7, 28],
      [7, 43],
    ]) {
      this.cylinder(g, 'Outdoor_planter', 0.65, 0.6, 0.45, [x, 0.225, z], m.concrete);
      this.rail(g, [x, 0.35, z], [x, 2.5, z], m.wood, 0.07);
      this.sphere(g, 'Landscape_tree', 0.95, [x, 2.7, z], m.leaf, [1, 1.2, 1]);
      this.world.addObstacle(5, x - 0.7, x + 0.7, z - 0.7, z + 0.7);
    }
    for (const x of [-9, 5]) {
      this.box(g, 'Outdoor_bench', [2.1, 0.12, 0.48], [x, 0.5, 39], m.wood, 5);
      for (const dx of [-0.8, 0.8]) {
        this.box(g, 'Bench_leg', [0.07, 0.44, 0.38], [x + dx, 0.26, 39], m.metal);
      }
    }
    this.car(g, -10, 50, 0x435459, null, Math.PI / 2);
    this.car(g, 21, 54, 0xddd8ce, null, -Math.PI / 2);
    this.sign(g, 'Parking_exit_ground', ['주차장 출입구 · PARKING', 'B5 — B1  ↕'], [18, 2.2, 39], [3.5, 0.7], 0);
  }

  shaftClearSlab(g, name, width, height, depth, cx, y, cz, material) {
    const left = cx - width / 2;
    const right = cx + width / 2;
    const front = cz - depth / 2;
    const back = cz + depth / 2;
    const edge = 1.3;
    const shaftBack = 1.4;

    this.box(g, name + '_west', [Math.max(0.01, -11 - left), height, depth], [(left - 11) / 2, y, cz], material);
    this.box(g, name + '_front', [-edge + 11, height, 1.2 - front], [(-11 - edge) / 2, y, (front + 1.2) / 2], material);
    this.box(
      g,
      name + '_left_rear',
      [-edge + 11, height, back - 7.4],
      [(-11 - edge) / 2, y, (back + 7.4) / 2],
      material
    );
    this.box(g, name + '_inner', [2.4 - edge, height, 6.2], [(-2.4 - edge) / 2, y, 4.3], material);
    // The stairwell is a vertical opening, just like the elevator and escalators.
    this.box(g, name + '_right_inner', [2.4 - edge, height, depth], [(2.4 + edge) / 2, y, cz], material);
    this.box(g, name + '_east', [right - 7.6, height, depth], [(right + 7.6) / 2, y, cz], material);
    this.box(g, name + '_stair_front', [5.2, height, 1.1 - front], [5, y, (front + 1.1) / 2], material);
    this.box(g, name + '_stair_rear', [5.2, height, back - 7.7], [5, y, (back + 7.7) / 2], material);
    this.box(g, name + '_rear', [edge * 2, height, back - shaftBack], [0, y, (back + shaftBack) / 2], material);
  }

  waveStaff(id, time) {
    const staff = this.staff.find((s) => s.id === id);
    if (staff) {
      staff.waveStart = time;
      staff.waveUntil = time + 3;
    }
  }

  flashCarLights(carId, time) {
    const car = this.cars.find((c) => c.name === carId);
    if (car) {
      car.userData.flashStart = time;
      car.userData.flashUntil = time + 2.6;
    }
  }

  update(time, player) {
    for (const s of this.staff) {
      s.head.rotation.z = Math.sin(time * 0.8 + s.phase) * 0.025;
      s.arms[0].rotation.z = -0.08 + Math.sin(time + s.phase) * 0.025;
      const age = time - (s.waveStart ?? -100);
      const remaining = s.waveUntil - time;
      const wave = remaining > 0 ? Math.max(0, Math.min(1, age / 0.45, remaining / 0.6)) : 0;
      s.arms[1].rotation.z = 0.08 + wave * 0.87;
      s.elbows[1].rotation.z = wave * (1.8 + Math.sin(age * 6) * 0.1);
      s.elbows[1].rotation.x = 0.2 * wave;
      s.head.rotation.x = -0.07 * wave;
    }
    for (const c of this.cars) {
      const mat = c.userData?.headlampMat;
      if (!mat) continue;
      if (time < (c.userData.flashUntil ?? 0)) {
        const pulse = Math.sin((time - (c.userData.flashStart ?? 0)) * 12) > 0 ? 2.4 : 0.2;
        mat.emissiveIntensity = pulse;
      } else if (mat.emissiveIntensity !== 0.65) {
        mat.emissiveIntensity = 0.65;
      }
    }
  }

  updateVisibility(floor, game, exterior) {
    this.root.visible = game || exterior;
    for (const g of this.floors) {
      g.visible = exterior ? g.userData.floorIndex >= 4 : Math.abs(g.userData.floorIndex - floor) <= 1;
    }
    this.exterior.visible = exterior || (game && floor === 5);
  }
}
