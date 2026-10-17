import * as THREE from 'three';
import { ROOM } from './guest-room.js';
import { hotelSignTexture } from './hotel-sign.js';

export class GuestRoomView {
  constructor(scene, room, pickables) {
    this.room = room;
    this.root = new THREE.Group();
    this.root.name = 'Guest_room_301';
    this.root.position.y = 7;
    scene.add(this.root);

    const g = this.root;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.m = {
      wall: new THREE.MeshStandardMaterial({ color: 0xe3dfd2, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x886c51, roughness: 0.7 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x283a35, roughness: 0.6 }),
      linen: new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 1 }),
      fabric: new THREE.MeshStandardMaterial({ color: 0x9fa58e, roughness: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xb9a379, metalness: 0.7, roughness: 0.28 }),
      silver: new THREE.MeshStandardMaterial({ color: 0xd8e0e3, metalness: 0.78, roughness: 0.22 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xd2ccbc, roughness: 0.35 }),
      black: new THREE.MeshStandardMaterial({ color: 0x171f20, roughness: 0.35 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xbfd4d6, transparent: true, opacity: 0.25, roughness: 0.1 }),
      water: new THREE.MeshBasicMaterial({ color: 0x9be4ff, transparent: true, opacity: 0.55 }),
      ceilingLight: new THREE.MeshBasicMaterial({ color: 0xffebcc }),
      lampLight: new THREE.MeshBasicMaterial({ color: 0xffe4b5 }),
    };
    const m = this.m;

    this.roomPointLight = new THREE.PointLight(0xffe6c2, 6, 12, 1.8);
    this.roomPointLight.position.set(0, 2.8, 9.2);
    g.add(this.roomPointLight);

    const makePickable = (mesh, data) => {
      mesh.userData = { ...data };
      pickables.push(mesh);
      return mesh;
    };

    const box = (parent, name, size, pos, mat, solid = false) => {
      const o = new THREE.Mesh(geo, mat);
      o.name = name;
      o.scale.set(...size);
      o.position.set(...pos);
      parent.add(o);
      if (solid) {
        room.addObstacle(pos[0] - size[0] / 2, pos[0] + size[0] / 2, pos[2] - size[2] / 2, pos[2] + size[2] / 2);
      }
      return o;
    };

    const cylinder = (name, r, h, pos, mat, parent = g) => {
      const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat);
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

    box(g, 'Guest_room_wood_floor', [4.8, 0.14, 9.8], [0, -0.07, 8.9], m.wood);
    for (let x = -2.1; x < 2.3; x += 0.4) {
      box(g, 'Floor_board_seam', [0.008, 0.004, 9.65], [x, 0.003, 8.9], m.dark);
    }
    box(g, 'Guest_room_ceiling', [4.8, 0.12, 9.8], [0, 3.3, 8.9], m.wall);
    for (const x of [-2.4, 2.4]) {
      box(g, 'Guest_room_side_wall', [0.18, 3.3, 9.8], [x, 1.65, 8.9], m.wall);
      box(g, 'Room_baseboard', [0.045, 0.1, 9.7], [x < 0 ? -2.29 : 2.29, 0.05, 8.9], m.wood);
    }

    for (const [x, w] of [
      [-2.17, 0.46],
      [0.875, 3.45],
    ]) {
      box(g, 'Room_entry_wall', [w, 3.3, 0.15], [x, 1.65, 4.02], m.wall);
    }
    box(g, 'Room_entry_header', [1.06, 1.0, 0.15], [-1.38, 2.8, 4.02], m.wall);

    for (const x of [-2.02, 2.02]) {
      box(g, 'Window_side_pier', [0.76, 3.3, 0.16], [x, 1.65, 13.8], m.wall);
    }
    box(g, 'Window_sill_wall', [3.3, 0.65, 0.16], [0, 0.325, 13.8], m.wall);
    box(g, 'Window_header', [3.3, 0.4, 0.16], [0, 3.1, 13.8], m.wall);
    const windowGlass = box(g, 'Panoramic_room_window', [3.3, 2.25, 0.025], [0, 1.775, 13.78], m.glass);
    makePickable(windowGlass, { action: 'roomCurtain', floorIndex: 7 });
    for (const x of [-1.65, 0, 1.65]) {
      box(g, 'Window_frame', [0.035, 2.3, 0.05], [x, 1.8, 13.75], m.gold);
    }

    const skyline = document.createElement('canvas');
    skyline.width = 512;
    skyline.height = 384;
    const ctx = skyline.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 384);
    gradient.addColorStop(0, '#a9c4d0');
    gradient.addColorStop(0.65, '#e4d5b9');
    gradient.addColorStop(1, '#8c999b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 22; i++) {
      const h = (90 + ((i * 83) % 230)) * 0.5;
      const x = i * 25.5;
      ctx.fillStyle = i % 2 ? '#a4adb0' : '#929eaa';
      ctx.fillRect(x, 384 - h, 20, h);
      ctx.fillStyle = '#d9d4bb';
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(x + 2.5 + col * 5, 387 - h + row * 15.5, 2, 4.5);
        }
      }
    }
    const tex = new THREE.CanvasTexture(skyline);
    tex.colorSpace = THREE.SRGBColorSpace;
    const view = new THREE.Mesh(
      new THREE.PlaneGeometry(3.35, 2.35),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    view.name = 'Window_city_view';
    view.position.set(0, 1.8, 13.87);
    view.rotation.y = Math.PI;
    g.add(view);

    this.curtains = [];
    for (const side of [-1, 1]) {
      const cMesh = box(g, 'Soft_window_curtain', [0.44, 2.65, 0.15], [side * 1.92, 1.75, 13.5], m.linen);
      cMesh.userData.dynamic = true;
      makePickable(cMesh, { action: 'roomCurtain', floorIndex: 7, dynamic: true });
      this.curtains.push({ mesh: cMesh, side });
    }

    // Interactive King Bed
    const bedData = { action: 'roomBed', floorIndex: 7 };
    box(g, 'Bed_base', [1.9, 0.32, 2.4], [-1.08, 0.16, 11.3], m.wood, true);
    makePickable(box(g, 'King_mattress', [1.92, 0.24, 2.4], [-1.08, 0.44, 11.3], m.linen), bedData);
    makePickable(box(g, 'Bed_duvet', [1.94, 0.1, 1.65], [-1.08, 0.6, 10.95], m.linen), bedData);
    makePickable(box(g, 'Bed_runner', [1.95, 0.025, 0.45], [-1.08, 0.665, 10.36], m.fabric), bedData);
    box(g, 'Upholstered_headboard', [2.0, 1.18, 0.12], [-1.08, 0.78, 12.56], m.fabric);
    for (const x of [-1.53, -0.64]) {
      const pillow = box(g, 'Bed_pillow', [0.72, 0.15, 0.42], [x, 0.63, 12.16], m.linen);
      pillow.rotation.x = -0.12;
      makePickable(pillow, bedData);
    }

    // Bedside tables & Interactive Lamps
    const lightData = { action: 'roomLight', floorIndex: 7 };
    box(g, 'Bedroom_rug', [3.1, 0.012, 3.25], [-0.6, 0.011, 10.95], m.stone);
    for (const x of [-2.06, 0.18]) {
      box(g, 'Bedside_table', [0.4, 0.52, 0.5], [x, 0.26, 12.23], m.wood, true);
      makePickable(cylinder('Bedside_lamp_stem', 0.035, 0.38, [x, 0.75, 12.23], m.gold), lightData);
      makePickable(cylinder('Bedside_lamp_shade', 0.17, 0.26, [x, 0.99, 12.23], m.lampLight), lightData);
    }

    // Wall Light Switch inside room near entry door
    const wallSwitch = box(g, 'Room_light_switch', [0.11, 0.16, 0.03], [-0.67, 1.18, 4.11], m.gold);
    makePickable(wallSwitch, lightData);

    // Writing Desk + Smart Room Service Tablet
    box(g, 'Writing_desk', [0.6, 0.08, 1.65], [1.95, 0.76, 8.75], m.wood, true);
    for (const z of [8.1, 9.4]) {
      box(g, 'Desk_leg', [0.045, 0.7, 0.045], [1.9, 0.35, z], m.gold);
    }
    box(g, 'Desk_chair', [0.55, 0.1, 0.5], [1.2, 0.45, 8.6], m.fabric, true);
    box(g, 'Desk_chair_back', [0.1, 0.5, 0.5], [0.94, 0.72, 8.6], m.fabric);

    const orderData = { action: 'roomServiceOrder', floorIndex: 7 };
    const book = box(g, 'Welcome_book', [0.27, 0.025, 0.21], [1.91, 0.815, 8.95], m.dark);
    makePickable(book, orderData);

    // Smart Tablet for Room Service on the desk
    const tabletStand = box(g, 'Room_service_tablet_stand', [0.12, 0.14, 0.24], [1.84, 0.87, 8.48], m.black);
    tabletStand.rotation.z = 0.35;
    makePickable(tabletStand, orderData);
    const tabletScreen = sign(
      g,
      'Room_service_tablet_screen',
      ['ROOM SERVICE', '클릭해 룸서비스 주문 🤖'],
      [1.77, 0.89, 8.48],
      0.22,
      0.13,
      -Math.PI / 2
    );
    makePickable(tabletScreen, orderData);

    cylinder('Desk_glass', 0.055, 0.1, [1.95, 0.86, 8.15], m.glass);

    // Delivered Room Service Tray on the desk (hidden until delivered by robot)
    this.foodTray = new THREE.Group();
    this.foodTray.name = 'Room_service_food_tray';
    this.foodTray.position.set(1.85, 0.81, 9.25);
    this.foodTray.userData.dynamic = true;
    this.foodTray.visible = false;
    g.add(this.foodTray);

    const foodData = { action: 'roomFood', floorIndex: 7, dynamic: true };
    makePickable(box(this.foodTray, 'Tray_base', [0.36, 0.02, 0.46], [0, 0, 0], m.silver), foodData);
    const cloche = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      m.silver
    );
    cloche.position.set(0, 0.01, -0.06);
    this.foodTray.add(cloche);
    makePickable(cloche, foodData);
    makePickable(cylinder('Tray_coffee_cup', 0.045, 0.085, [0.04, 0.05, 0.13], m.linen, this.foodTray), foodData);

    box(g, 'Window_armchair', [0.78, 0.42, 0.8], [1.45, 0.35, 11.75], m.fabric, true);
    box(g, 'Armchair_back', [0.78, 0.58, 0.15], [1.45, 0.77, 12.14], m.fabric);
    for (const x of [1.06, 1.84]) {
      box(g, 'Armchair_arm', [0.12, 0.38, 0.8], [x, 0.56, 11.75], m.fabric);
    }
    cylinder('Window_side_table', 0.24, 0.055, [1.3, 0.6, 10.8], m.wood);
    cylinder('Side_table_pedestal', 0.04, 0.58, [1.3, 0.29, 10.8], m.gold);
    room.addObstacle(1.04, 1.56, 10.54, 11.06);

    // Interactive Smart Wall TV
    const tvData = { action: 'roomTV', floorIndex: 7 };
    makePickable(box(g, 'Wall_TV', [0.045, 0.85, 1.35], [-2.28, 1.65, 8.6], m.black), tvData);
    this.tvMaterials = {
      welcome: new THREE.MeshBasicMaterial({ map: hotelSignTexture(['GRAND HOTEL', 'Welcome · Room 301']) }),
      cinema: new THREE.MeshBasicMaterial({
        map: hotelSignTexture(['HOTEL CINEMA', '★ Grand Budapest Night']),
        color: 0xffe4b8,
      }),
      lounge: new THREE.MeshBasicMaterial({
        map: hotelSignTexture(['JAZZ LOUNGE ♬', 'Chill Night Ambience']),
        color: 0xb6f0e2,
      }),
      off: new THREE.MeshBasicMaterial({ color: 0x0c1113 }),
    };
    this.tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.73), this.tvMaterials.welcome);
    this.tvScreen.name = 'TV_welcome';
    this.tvScreen.position.set(-2.247, 1.65, 8.6);
    this.tvScreen.rotation.y = Math.PI / 2;
    g.add(this.tvScreen);
    makePickable(this.tvScreen, tvData);

    // Bathroom with an open doorway, vanity, mirror, shower and toilet.
    box(g, 'Bathroom_tile_floor', [1.85, 0.012, 3.05], [1.37, 0.012, 5.6], m.stone);
    for (const [z, len] of [
      [4.57, 1.05],
      [6.64, 1.16],
    ]) {
      box(g, 'Bathroom_partition', [0.14, 2.9, len], [0.42, 1.45, z], m.wall, true);
    }
    box(g, 'Bathroom_door_header', [0.14, 0.6, 1.05], [0.42, 2.6, 5.58], m.wall);
    box(g, 'Bathroom_rear_partition', [1.9, 2.9, 0.12], [1.35, 1.45, 7.25], m.wall, true);
    box(g, 'Vanity_cabinet', [0.64, 0.78, 0.68], [1.94, 0.39, 6.72], m.wood, true);
    box(g, 'Vanity_counter', [0.69, 0.06, 0.72], [1.94, 0.83, 6.72], m.stone);

    const showerData = { action: 'roomShower', floorIndex: 7 };
    makePickable(cylinder('Bathroom_sink', 0.2, 0.07, [1.94, 0.89, 6.72], m.linen), showerData);
    box(g, 'Bathroom_mirror', [0.025, 0.95, 0.64], [2.29, 1.55, 6.72], m.glass);
    cylinder('Toilet_bowl', 0.18, 0.4, [0.95, 0.2, 6.74], m.linen);
    box(g, 'Toilet_cistern', [0.34, 0.64, 0.2], [0.95, 0.32, 7.1], m.linen);
    room.addObstacle(0.73, 1.17, 6.5, 7.2);

    box(g, 'Shower_tray', [1.25, 0.08, 1.5], [1.58, 0.04, 4.86], m.stone);
    makePickable(box(g, 'Shower_glass', [1.24, 2.1, 0.018], [1.58, 1.1, 5.63], m.glass), showerData);
    makePickable(box(g, 'Shower_door_handle', [0.28, 0.03, 0.04], [1.5, 1.1, 5.59], m.gold), showerData);
    room.addObstacle(0.96, 2.2, 5.6, 5.65);
    makePickable(box(g, 'Shower_pipe', [0.04, 1.1, 0.04], [2.28, 1.55, 4.75], m.gold), showerData);
    makePickable(box(g, 'Rain_shower_head', [0.3, 0.04, 0.3], [2.1, 2.1, 4.75], m.gold), showerData);

    // Animated Rain Shower Water Streams
    this.showerGroup = new THREE.Group();
    this.showerGroup.name = 'Rain_shower_water';
    this.showerGroup.userData.dynamic = true;
    this.showerGroup.visible = false;
    g.add(this.showerGroup);
    for (const dx of [-0.07, 0, 0.07]) {
      for (const dz of [-0.07, 0, 0.07]) {
        cylinder('Water_stream', 0.008, 1.95, [2.1 + dx, 1.08, 4.75 + dz], m.water, this.showerGroup);
      }
    }

    for (const z of [5.5, 8.0, 11.5]) {
      cylinder('Room_downlight', 0.09, 0.025, [0, 3.23, z], m.ceilingLight);
    }

    // Hinged guest door and card reader, both available from either side.
    const pivot = (this.door = new THREE.Group());
    pivot.position.set(-1.9, 0, 3.57);
    g.add(pivot);

    const data = { action: 'roomDoor', room: '301', floorIndex: 7 };
    const panel = box(pivot, 'Guest_room_door_301', [1.04, 2.18, 0.06], [0.52, 1.09, 0], m.wood);
    panel.userData = data;
    pickables.push(panel);

    for (const z of [-0.055, 0.055]) {
      const handle = box(pivot, 'Room_301_handle', [0.17, 0.055, 0.07], [0.8, 1.02, z], m.gold);
      handle.userData = data;
      pickables.push(handle);
    }

    sign(pivot, 'Room_301_number', ['301', 'GUEST ROOM'], [0.52, 1.7, -0.035], 0.32, 0.18, Math.PI);
    for (const x of [-1.95, -0.81]) {
      box(g, 'Room_301_door_frame', [0.06, 2.26, 0.11], [x, 1.13, 3.57], m.gold);
    }
    box(g, 'Room_301_frame_header', [1.2, 0.06, 0.11], [-1.38, 2.26, 3.57], m.gold);

    const reader = box(g, 'Keycard_reader_301', [0.12, 0.2, 0.045], [-0.67, 1.12, 3.57], m.dark);
    reader.userData = data;
    pickables.push(reader);

    this.led = box(
      g,
      'Keycard_reader_LED',
      [0.06, 0.018, 0.005],
      [-0.67, 1.17, 3.543],
      new THREE.MeshBasicMaterial({ color: 0xb4775e })
    );
    this.led.userData = data;
    pickables.push(this.led);
  }

  update() {
    this.door.rotation.y = (-this.room.open * Math.PI) / 2;
    this.led.material.color.setHex(this.room.target ? 0x8ca78c : 0xb4775e);

    // Update TV Screen Channel
    const tvMat = this.tvMaterials[this.room.tvMode] || this.tvMaterials.welcome;
    if (this.tvScreen.material !== tvMat) {
      this.tvScreen.material = tvMat;
    }

    // Update Room Lighting Mode
    if (this.lastLightMode !== this.room.lightMode) {
      this.lastLightMode = this.room.lightMode;
      if (this.room.lightMode === 'bright') {
        this.m.ceilingLight.color.setHex(0xffebcc);
        this.m.lampLight.color.setHex(0xffe4b5);
        this.roomPointLight.intensity = 6;
        this.roomPointLight.color.setHex(0xffe6c2);
      } else if (this.room.lightMode === 'warm') {
        this.m.ceilingLight.color.setHex(0xdba264);
        this.m.lampLight.color.setHex(0xffb86c);
        this.roomPointLight.intensity = 3.2;
        this.roomPointLight.color.setHex(0xffb46b);
      } else {
        this.m.ceilingLight.color.setHex(0x222a2e);
        this.m.lampLight.color.setHex(0x9e7244);
        this.roomPointLight.intensity = 0.7;
        this.roomPointLight.color.setHex(0xff9e54);
      }
    }

    // Update Motorized Curtains
    const open = this.room.curtainOpen ?? 1;
    const width = 0.44 + (1 - open) * 1.24;
    const offset = 1.92 - (1 - open) * 1.08;
    for (const { mesh, side } of this.curtains) {
      mesh.scale.x = width;
      mesh.position.x = side * offset;
    }

    // Update Rain Shower & Room Service Food Tray
    this.showerGroup.visible = Boolean(this.room.showerOn);
    this.foodTray.visible = Boolean(this.room.foodItem);
  }

  updateVisibility(floor, active) {
    this.root.visible = active && floor === ROOM.floor;
  }
}
