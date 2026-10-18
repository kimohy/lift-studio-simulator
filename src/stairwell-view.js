import * as THREE from 'three';
import { floorUsage } from './building.js';
import { FLOORS } from './controller.js';
import { hotelSignTexture } from './hotel-sign.js';
import { STAIRS as S } from './stairs.js';

const floorName = (f) => (f < 5 ? `지하 ${5 - f}층` : `${f - 4}층`);

export class StairwellView {
  constructor(scene, stairs, pickables) {
    this.stairs = stairs;
    this.root = new THREE.Group();
    this.root.name = 'Walkable_stairwell';
    scene.add(this.root);
    this.doors = [];
    this.signs = [];

    const stone = new THREE.MeshStandardMaterial({ color: 0xaaa59b, roughness: 0.87 });
    const wall = new THREE.MeshStandardMaterial({ color: 0x657476, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xb5c4c5, metalness: 0.75, roughness: 0.3 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x294e47, roughness: 0.6 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
    const treadGeo = new THREE.BoxGeometry(1.65, 0.175, (S.end - S.start) / S.stepCount);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const box = (group, size, pos, mat) => {
      const m = new THREE.Mesh(boxGeo, mat);
      m.scale.set(...size);
      m.position.set(...pos);
      group.add(m);
      return m;
    };

    const rail = (group, a, b) => {
      const start = new THREE.Vector3(...a);
      const end = new THREE.Vector3(...b);
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, start.distanceTo(end), 8),
        metal
      );
      m.position.copy(start).add(end).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
      group.add(m);
    };

    const glassDoorMat = new THREE.MeshPhysicalMaterial({
      color: 0xa9dfea,
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc8aa6e, metalness: 0.8, roughness: 0.22 });

    const sign = (group, name, lines, pos, rotation, width = 1.2, height = 0.7) => {
      const texture = hotelSignTexture(lines);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.68, height * 0.68),
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
      group.add(m);
      this.signs.push(m);
      return m;
    };

    for (let f = 0; f < S.floors; f++) {
      const usage = floorUsage(f);
      const group = new THREE.Group();
      group.name = `Stair_floor_${FLOORS[f]}`;
      group.userData.floorIndex = f;
      group.position.y = (f - 5) * S.floorHeight;
      this.root.add(group);

      box(group, [4.91, 0.12, 2.4], [4.995, -0.06, 2.4], stone);
      box(group, [0.14, 3.5, 6.55], [7.46, 1.75, 4.4], wall);
      box(group, [4.91, 3.5, 0.14], [4.995, 1.75, 1.16], wall);
      box(group, [4.91, 3.5, 0.14], [4.995, 1.75, 7.6], wall);
      box(group, [0.14, 3.5, 3.86], [2.56, 1.75, 5.65], wall);

      // Side doorway aligned with the opening in the existing lobby wall.
      for (const z of [1.76, 2.94]) {
        box(group, [0.16, 2.3, 0.12], [2.54, 1.15, z], metal);
      }
      box(group, [0.16, 0.12, 1.3], [2.54, 2.3, 2.35], metal);

      const pivot = new THREE.Group();
      pivot.name = `Stair_door_${FLOORS[f]}`;
      pivot.position.set(2.54, 0, 1.82);
      group.add(pivot);

      const panelMat = f === 14 ? glassDoorMat : doorMat;
      const handleMat = f === 14 ? goldMat : metal;
      const panel = box(pivot, [0.06, 2.18, 1.06], [0, 1.09, 0.53], panelMat);
      panel.userData = { action: 'stairDoor', floorIndex: f };
      pickables.push(panel);

      for (const x of [-0.054, 0.054]) {
        const handle = box(pivot, [0.045, 0.07, 0.22], [x, 1.04, 0.83], handleMat);
        handle.userData = { action: 'stairDoor', floorIndex: f };
        pickables.push(handle);
      }
      this.doors.push(pivot);

      sign(
        group,
        `Stair_entry_sign_${FLOORS[f]}`,
        f === 14
          ? ['10F · 루프탑 자동 유리문', 'ROOFTOP AUTO GLASS DOOR ↑']
          : ['계단 · STAIRS', `${floorName(f)} · ${usage.ko}`],
        [2.45, 2.72, 2.35],
        -Math.PI / 2,
        1.05,
        0.54
      );
      sign(
        group,
        `Stair_floor_sign_${FLOORS[f]}`,
        [
          `${FLOORS[f]} · ${usage.ko}`,
          f < 14 ? `↑ ${FLOORS[f + 1]} · ${floorUsage(f + 1).ko}` : '10층 · 계단 끝',
          f > 0 ? `↓ ${FLOORS[f - 1]} · ${floorUsage(f - 1).ko}` : 'B5 · 최하층',
        ],
        [7.37, 1.75, 2.48],
        -Math.PI / 2,
        1.45,
        0.85
      );
      sign(
        group,
        `Stair_exit_sign_${FLOORS[f]}`,
        [usage.ko, `${FLOORS[f]} · ${usage.en}`],
        [2.64, 2.72, 2.35],
        Math.PI / 2,
        1.05,
        0.54
      );

      box(group, [1.6, 0.045, 0.32], [5.0, 3.25, 2.2], lightMat);

      if (f === 0) rail(group, [5.39, 0.95, 3.59], [7.06, 0.95, 3.59]);
      if (f === 14) {
        rail(group, [3.44, 0.95, 3.59], [5.11, 0.95, 3.59]);
        box(group, [4.91, 0.12, 6.4], [4.995, 3.44, 4.35], wall);
        continue;
      }

      box(group, [3.65, 0.12, 1.13], [5.275, 1.69, 7.065], stone);
      const steps = new THREE.InstancedMesh(treadGeo, stone, S.stepCount * 2);
      const dummy = new THREE.Object3D();
      steps.name = `Stair_treads_${FLOORS[f]}`;
      for (let i = 0; i < S.stepCount; i++) {
        const rise = 1.75 / S.stepCount;
        const run = (S.end - S.start) / S.stepCount;
        dummy.position.set(4.275, (i + 1) * rise - rise / 2, S.start + (i + 0.5) * run);
        dummy.updateMatrix();
        steps.setMatrixAt(i, dummy.matrix);
        dummy.position.set(6.225, 1.75 + (i + 1) * rise - rise / 2, S.end - (i + 0.5) * run);
        dummy.updateMatrix();
        steps.setMatrixAt(i + S.stepCount, dummy.matrix);
      }
      group.add(steps);

      // Concrete stair slabs support the treads on both flights.
      const slope = Math.atan2(1.75, S.end - S.start);
      const slabLength = Math.hypot(1.75, S.end - S.start);
      const lowerSlab = box(group, [1.65, 0.18, slabLength], [4.275, 0.705, (S.start + S.end) / 2], stone);
      lowerSlab.rotation.x = -slope;
      const upperSlab = box(group, [1.65, 0.18, slabLength], [6.225, 2.455, (S.start + S.end) / 2], stone);
      upperSlab.rotation.x = slope;

      for (const x of [3.44, 5.11]) {
        rail(group, [x, 0.95, S.start], [x, 2.7, S.end]);
        for (const t of [0, 0.33, 0.66, 1]) {
          rail(
            group,
            [x, 1.75 * t, S.start + (S.end - S.start) * t],
            [x, 1.75 * t + 0.95, S.start + (S.end - S.start) * t]
          );
        }
      }
      for (const x of [5.39, 7.06]) {
        rail(group, [x, 2.7, S.end], [x, 4.45, S.start]);
        for (const t of [0, 0.33, 0.66, 1]) {
          rail(
            group,
            [x, 1.75 + 1.75 * t, S.end - (S.end - S.start) * t],
            [x, 2.7 + 1.75 * t, S.end - (S.end - S.start) * t]
          );
        }
      }
      sign(
        group,
        `Stair_mid_sign_${FLOORS[f]}`,
        [`${FLOORS[f]} ↔ ${FLOORS[f + 1]}`, '계단 쉼터 · LANDING', `↑ ${FLOORS[f + 1]}   /   ↓ ${FLOORS[f]}`],
        [5.27, 2.9, 7.51],
        Math.PI,
        1.65,
        0.78
      );
    }
    this.root.visible = false;
  }

  updateVisibility(floor, active) {
    this.root.visible = active;
    for (const group of this.root.children) {
      group.visible = Math.abs(group.userData.floorIndex - floor) <= 1;
    }
  }

  update() {
    this.doors.forEach((pivot, i) => {
      pivot.rotation.y = (this.stairs.doors[i].open * Math.PI) / 2;
    });
  }
}
