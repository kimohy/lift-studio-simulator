import * as THREE from 'three';
import { floorMeta, floorUsage } from './building.js';
import { FLOORS } from './controller.js';
import { hotelSignTexture } from './hotel-sign.js';

const geometry = new THREE.BoxGeometry(1, 1, 1);

const materials = {
  parking: new THREE.MeshStandardMaterial({ color: 0x747d7c, roughness: 0.95 }),
  lobby: new THREE.MeshStandardMaterial({ color: 0xdfd9c9, roughness: 0.3 }),
  guest: new THREE.MeshStandardMaterial({ color: 0x344a51, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x745341, roughness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc7aa70, metalness: 0.6, roughness: 0.35 }),
  yellow: new THREE.MeshBasicMaterial({ color: 0xe5c457 }),
  black: new THREE.MeshStandardMaterial({ color: 0x28302d, roughness: 0.85 }),
};

export function decorateFloor(room, floor, { expanded = false, pickables = null } = {}) {
  const usage = floorUsage(floor);
  const meta = floorMeta(floor, FLOORS[floor]);
  room.userData.floorUsage = usage.ko;
  room.userData.floorKind = usage.kind;

  const box = (name, size, pos, mat) => {
    const m = new THREE.Mesh(geometry, mat);
    m.name = name;
    m.scale.set(...size);
    m.position.set(...pos);
    room.add(m);
    return m;
  };

  const sign = (name, lines, pos, width, height, rotation = Math.PI) => {
    const isRoomNum = name.startsWith('Room_number');
    const texture = hotelSignTexture(
      lines,
      isRoomNum ? { width: 256, height: 128 } : { width: 512, height: 192 }
    );
    const scale = isRoomNum ? 1 : 0.65;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(width * scale, height * scale),
      new THREE.MeshBasicMaterial({
        map: texture,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    m.name = name;
    m.userData.signLines = lines;
    m.position.set(...pos);
    m.rotation.y = rotation;
    room.add(m);
    return m;
  };

  box(`Floor_finish_${FLOORS[floor]}`, [4.9, 0.018, 2.23], [0, 0.008, 2.485], materials[usage.kind]);
  sign(
    `Floor_purpose_sign_${FLOORS[floor]}`,
    [meta.signKo, meta.signEn],
    [0, floor === 14 ? 2.86 : 2.67, 3.607],
    1.8,
    0.6
  );
  sign(
    `Floor_side_sign_${FLOORS[floor]}`,
    [meta.sideKo, meta.sideEn],
    [-2.468, 2.72, 2.3],
    1.0,
    0.48,
    Math.PI / 2
  );

  if (expanded) return;

  if (usage.kind === 'guest') {
    const doorPositions = floor === 14 ? [-1.68, 1.68] : [-1.38, 1.38];
    for (const [i, x] of doorPositions.entries()) {
      const number = (floor - 4) * 100 + i + 1;
      if (number === 301) continue;

      const doorData = {
        action: 'otherRoomDoor',
        room: String(number),
        floorIndex: floor,
      };

      const doorPanel = box(`Guest_room_door_${number}`, [0.86, 2.18, 0.06], [x, 1.09, 3.565], materials.wood);
      doorPanel.userData = doorData;

      for (const side of [-1, 1]) {
        box(`Room_frame_${number}_${side}`, [0.045, 2.25, 0.075], [x + side * 0.46, 1.125, 3.56], materials.gold);
      }
      box(`Room_frame_top_${number}`, [0.965, 0.045, 0.075], [x, 2.25, 3.56], materials.gold);

      const handle = box(`Room_handle_${number}`, [0.14, 0.055, 0.07], [x + 0.26, 1.02, 3.5], materials.gold);
      handle.userData = doorData;

      if (pickables) {
        pickables.push(doorPanel, handle);
      }

      sign(`Room_number_${number}`, [String(number), 'ROOM'], [x, 1.67, 3.53], 0.34, 0.21);
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
