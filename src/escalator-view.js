import * as THREE from 'three';
import { FLOORS } from './controller.js';
import { escalatorLayout } from './escalator.js';
import { hotelSignTexture } from './hotel-sign.js';

export class EscalatorView {
  constructor(scene, pickables = null) {
    this.root = new THREE.Group();
    this.root.name = 'Hotel_escalators';
    scene.add(this.root);
    this.flights = [];
    this.signs = [];
    this.pickables = pickables;

    const steel = new THREE.MeshStandardMaterial({ color: 0x879594, metalness: 0.8, roughness: 0.28 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1d272b, roughness: 0.6 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xbdb8a9, roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x99bcb6,
      transparent: true,
      opacity: 0.5,
      roughness: 0.2,
    });
    const tread = new THREE.MeshStandardMaterial({ color: 0x647276, metalness: 0.7, roughness: 0.35 });
    const yellow = new THREE.MeshBasicMaterial({ color: 0xe9cb72 });
    const emeraldLed = new THREE.MeshStandardMaterial({
      color: 0x55ffaa,
      emissive: 0x22cc77,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    const redHousing = new THREE.MeshStandardMaterial({ color: 0xe0c030, roughness: 0.5 });
    const redMushroom = new THREE.MeshStandardMaterial({
      color: 0xee2222,
      emissive: 0xaa1111,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    });
    const geo = new THREE.BoxGeometry(1, 1, 1);

    const box = (g, n, size, pos, m) => {
      const o = new THREE.Mesh(geo, m);
      o.name = n;
      o.scale.set(...size);
      o.position.set(...pos);
      g.add(o);
      return o;
    };

    const sign = (g, lines, pos, rot) => {
      const tex = hotelSignTexture(lines);
      const o = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.36),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })
      );
      o.name = 'Escalator_floor_sign';
      o.position.set(...pos);
      o.rotation.y = rot;
      g.add(o);
      this.signs.push(o);
    };

    const stepGeometry = new THREE.BoxGeometry(0.27, 0.17, 1.4);
    const edgeGeometry = new THREE.BoxGeometry(0.00675, 0.0102, 1.4);

    for (let f = 0; f < 15; f++) {
      const g = new THREE.Group();
      g.userData.floorIndex = f;
      g.position.y = (f - 5) * 3.5;
      this.root.add(g);

      box(g, 'Entry_platform', [1.2, 0.14, 6.6], [-3.4, -0.07, 4.65], stone);
      box(g, 'Entry_bridge', [0.52, 0.14, 0.7], [-2.54, -0.07, 2.35], stone);
      box(g, 'Exit_platform', [0.8, 0.14, 6.6], [-10.4, -0.07, 4.65], stone);
      box(g, 'Return_corridor', [6.8, 0.14, 2.65], [-7.4, -0.07, 6.625], stone);
      box(g, 'Escalator_back_wall', [8.6, 3.56, 0.2], [-6.54, 1.75, 8.0], stone);
      box(g, 'Escalator_front_wall', [8.6, 3.56, 0.16], [-6.54, 1.75, 1.32], stone);
      box(g, 'Escalator_outer_wall', [0.16, 3.56, 6.88], [-10.88, 1.75, 4.66], stone);

      for (const [z, d] of [
        [1.625, 0.75],
        [5.35, 5.3],
      ]) {
        box(g, 'Escalator_inner_wall', [0.3, 3.56, d], [-2.65, 1.75, z], stone);
      }
      box(g, 'Escalator_door_lintel', [0.3, 1.1, 0.7], [-2.65, 2.95, 2.35], stone);

      if (f === 0) box(g, 'Escalator_shaft_bottom_cap', [8.4, 0.2, 6.9], [-6.7, -0.2, 4.65], stone);
      if (f === 14) box(g, 'Escalator_shaft_top_cap', [8.4, 0.2, 6.9], [-6.7, 3.4, 4.65], stone);

      sign(g, [`${FLOORS[f]}층 · 에스컬레이터`, 'ESCALATORS  ·  ↑ UP / ↓ DOWN'], [-2.46, 2.65, 2.35], Math.PI / 2);
      sign(g, [`${FLOORS[f]}층 · 복도 →`, 'ELEVATOR & HOTEL →'], [-10.78, 1.85, 6.35], Math.PI / 2);

      // Direction information belongs on the fixed landing walls, clear of the moving flights.
      for (const [x, rot, east] of [
        [-2.81, -Math.PI / 2, true],
        [-10.78, Math.PI / 2, false],
      ]) {
        const up = escalatorLayout(f);
        const upLane =
          up.start === (east ? -4 : -10) ? (up.upZ < 3 ? '앞쪽 입구' : '뒤쪽 입구') : '반대편 입구';
        const lower = f > 0 ? escalatorLayout(f - 1) : null;
        const downLane = lower
          ? lower.start === (east ? -4 : -10)
            ? lower.downZ < 3
              ? '앞쪽 입구'
              : '뒤쪽 입구'
            : '반대편 입구'
          : null;
        const routes = [
          f < 14 ? `↑ ${FLOORS[f + 1]} · ${upLane}` : '최상층 · TOP FLOOR',
          f > 0 ? `↓ ${FLOORS[f - 1]} · ${downLane}` : '최하층 · LOWEST FLOOR',
        ];
        sign(g, routes, [x, 1.85, 3.4], rot);
      }

      const floorLayout = escalatorLayout(f);
      for (const [z, direction] of [
        [floorLayout.upZ, 1],
        [floorLayout.downZ, -1],
      ]) {
        const layout = direction === 1 ? floorLayout : { start: floorLayout.end, end: floorLayout.start };
        if (f === 14) {
          box(g, 'Top_terminal_barrier', [0.12, 0.95, 1.65], [layout.start, 0.5, z], steel);
          continue;
        }
        const slope = Math.sign(layout.start - layout.end) * Math.atan2(3.5, 6);
        const length = Math.hypot(3.5, 6);
        const base = box(g, 'Escalator_truss', [length, 0.24, 1.6], [-7, 1.6, z], steel);
        base.rotation.z = -slope;

        for (const side of [-0.85, 0.85]) {
          const bal = box(g, 'Escalator_glass_balustrade', [length, 0.78, 0.08], [-7, 2.15, z + side], glass);
          bal.rotation.z = -slope;
          const rail = box(g, 'Escalator_handrail', [length, 0.1, 0.13], [-7, 2.6, z + side], black);
          rail.rotation.z = -slope;
          const skirtLed = box(g, 'Escalator_skirt_led', [length, 0.024, 0.02], [-7, 1.76, z + side * 0.96], emeraldLed);
          skirtLed.rotation.z = -slope;
        }
        for (const x of [-4, -10]) {
          box(g, 'Escalator_comb_plate', [0.36, 0.035, 1.48], [x, x === layout.start ? 0.016 : 3.516, z], yellow);
          box(g, 'Escalator_comb_light', [0.38, 0.014, 1.44], [x, (x === layout.start ? 0.016 : 3.516) - 0.014, z], emeraldLed);
        }

        // Emergency Stop Switch on newel post
        const stopX = layout.start + Math.sign(layout.end - layout.start) * 0.18;
        const eStop = box(g, 'Escalator_e_stop', [0.08, 0.12, 0.08], [stopX, 0.88, z + 0.88], redHousing);
        eStop.userData = { action: 'escalatorStop', floorIndex: f, dynamic: true };
        const eStopBtn = box(g, 'Escalator_e_stop_button', [0.05, 0.05, 0.04], [stopX, 0.88, z + 0.93], redMushroom);
        eStopBtn.userData = { action: 'escalatorStop', floorIndex: f, dynamic: true };
        if (this.pickables) this.pickables.push(eStop, eStopBtn);

        const stepMesh = new THREE.InstancedMesh(stepGeometry, tread, 24);
        const edgeMesh = new THREE.InstancedMesh(edgeGeometry, yellow, 24);
        stepMesh.name = 'Moving_escalator_steps';
        edgeMesh.name = 'Step_safety_edges';
        for (const mesh of [stepMesh, edgeMesh]) {
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(-7, 1.75, z), 4.5);
          g.add(mesh);
        }
        this.flights.push({ floor: f, z, direction, group: g, stepMesh, edgeMesh, layout });
      }
    }
  }

  update(time, paused, stopped = false) {
    if (!paused && !stopped) this.time = time;
    const matrix = (this.stepMatrix ??= new THREE.Matrix4());
    for (const flight of this.flights) {
      if (!this.root.visible || !flight.group.visible) continue;
      for (let i = 0; i < 24; i++) {
        const t = (((i / 24 + ((this.time || 0) * 0.45) / 6 * flight.direction) % 1) + 1) % 1;
        const x = flight.layout.start + t * (flight.layout.end - flight.layout.start);
        const y = t * 3.5 - 0.085;
        matrix.makeTranslation(x, y, flight.z);
        flight.stepMesh.setMatrixAt(i, matrix);
        matrix.makeTranslation(x + 0.1242, y + 0.0782, flight.z);
        flight.edgeMesh.setMatrixAt(i, matrix);
      }
      flight.stepMesh.instanceMatrix.needsUpdate = true;
      flight.edgeMesh.instanceMatrix.needsUpdate = true;
    }
  }

  updateVisibility(floor, active) {
    this.root.visible = active;
    for (const g of this.root.children) {
      g.visible = Math.abs(g.userData.floorIndex - floor) <= 1;
    }
  }
}
