import * as THREE from 'three';
import { FLOORS } from './controller.js';
import { escalatorLayout } from './escalator.js';
import { hotelSignTexture } from './hotel-sign.js';

export class EscalatorView {
  constructor(scene, pickables = null) {
    this.root = new THREE.Group();
    this.root.name = 'Mall_atrium_escalators';
    scene.add(this.root);
    this.flights = [];
    this.signs = [];
    this.pickables = pickables;

    const steel = new THREE.MeshStandardMaterial({ color: 0x8d9ca0, metalness: 0.82, roughness: 0.26 });
    const champagne = new THREE.MeshStandardMaterial({ color: 0xc4ab82, metalness: 0.76, roughness: 0.3 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1d272b, roughness: 0.55 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.4 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8b918e, roughness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xbfe8f2,
      transparent: true,
      opacity: 0.34,
      roughness: 0.08,
      metalness: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const tread = new THREE.MeshStandardMaterial({ color: 0x5c6a70, metalness: 0.72, roughness: 0.35 });
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
        new THREE.PlaneGeometry(1.25, 0.38),
        new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
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

      const isParking = f < 5;
      const deckMat = isParking ? concrete : stone;
      const barrierMat = isParking ? concrete : glass;
      const wallH = isParking ? 3.56 : 1.85;
      const wallY = wallH / 2;

      // Central Mall Atrium Escalator Landings (East x∈[-28,-26.2], West x∈[-35.8,-34], South crossover z∈[22.25,24.6])
      box(g, 'Entry_platform', [1.8, 0.16, 7.4], [-27.1, -0.08, 20.9], deckMat);
      box(g, 'Exit_platform', [1.8, 0.16, 7.4], [-34.9, -0.08, 20.9], deckMat);
      box(g, 'Return_corridor', [6.0, 0.16, 2.35], [-31.0, -0.08, 23.425], deckMat);

      if (!isParking) {
        box(g, 'Escalator_soffit_led_E', [1.6, 0.05, 7.0], [-27.1, -0.18, 20.9], emeraldLed);
        box(g, 'Escalator_soffit_led_W', [1.6, 0.05, 7.0], [-34.9, -0.18, 20.9], emeraldLed);
      }

      // North & South side balustrades (open panoramic glass in Atrium, full concrete in basement)
      box(g, 'Escalator_back_wall', [9.6, wallH, 0.12], [-31.0, wallY, 24.66], barrierMat);
      box(g, 'Escalator_front_wall', [9.6, wallH, 0.12], [-31.0, wallY, 17.14], barrierMat);
      if (!isParking) {
        box(g, 'Escalator_rail_top_S', [9.6, 0.06, 0.14], [-31.0, wallH, 24.66], champagne);
        box(g, 'Escalator_rail_top_N', [9.6, 0.06, 0.14], [-31.0, wallH, 17.14], champagne);
      }

      const hasMallFloor = f <= 4 || (f >= 5 && f <= 13 && f % 2 === 1);
      if (hasMallFloor) {
        // Connect East & West Gallery Wings on M2F (7), M3F (9), M4F (11) straight to the central escalators
        if (f === 7 || f === 9 || f === 11) {
          box(g, 'Escalator_gallery_bridge_E', [4.2, 0.2, 7.4], [-24.1, -0.1, 20.9], stone);
          box(g, 'Escalator_gallery_bridge_W', [4.2, 0.2, 7.4], [-37.9, -0.1, 20.9], stone);
          for (const bx of [-24.1, -37.9]) {
            box(g, 'Escalator_bridge_rail_N', [4.2, 1.15, 0.08], [bx, 0.575, 17.24], glass);
            box(g, 'Escalator_bridge_rail_S', [4.2, 1.15, 0.08], [bx, 0.575, 24.56], glass);
            box(g, 'Escalator_bridge_handrail_N', [4.2, 0.05, 0.1], [bx, 1.16, 17.24], champagne);
            box(g, 'Escalator_bridge_handrail_S', [4.2, 0.05, 0.1], [bx, 1.16, 24.56], champagne);
          }
        }
      } else {
        // Mezzanine transfer floors (6, 8, 10, 12, 14): enclose East & West ends safely with glass barriers
        box(g, 'Escalator_outer_wall', [0.14, 2.2, 7.4], [-35.88, 1.1, 20.9], barrierMat);
        box(g, 'Escalator_inner_wall', [0.14, 2.2, 7.4], [-26.12, 1.1, 20.9], barrierMat);
        box(g, 'Escalator_outer_rail', [0.16, 0.06, 7.4], [-35.88, 2.2, 20.9], champagne);
        box(g, 'Escalator_inner_rail', [0.16, 0.06, 7.4], [-26.12, 2.2, 20.9], champagne);
      }

      if (f === 0) box(g, 'Escalator_shaft_bottom_cap', [9.8, 0.2, 7.6], [-31.0, -0.2, 20.9], concrete);
      if (f === 14) box(g, 'Escalator_shaft_top_cap', [9.8, 0.16, 7.6], [-31.0, 3.4, 20.9], glass);

      // Floor & Direction Signage on Landing Posts
      const floorTag = f < 5 ? `${FLOORS[f]} 주차장` : hasMallFloor ? `M${(f - 3) / 2}F` : `${FLOORS[f]}F 메자닌`;
      sign(g, [`${floorTag} · 중앙 에스컬레이터`, 'CENTRAL ATRIUM ESCALATOR'], [-26.46, 2.35, 17.55], 0);
      sign(g, [`${floorTag} · 중앙 에스컬레이터`, 'CENTRAL ATRIUM ESCALATOR'], [-35.78, 2.35, 24.25], Math.PI);

      for (const [x, rot, east] of [
        [-26.81, -Math.PI / 2, true],
        [-35.19, Math.PI / 2, false],
      ]) {
        const up = escalatorLayout(f);
        const upLane =
          up.start === (east ? -28 : -34) ? (up.upZ < 20 ? '북측' : '남측') : '맞은편';
        const lower = f > 0 ? escalatorLayout(f - 1) : null;
        const downLane = lower
          ? lower.start === (east ? -28 : -34)
            ? lower.downZ < 20
              ? '북측'
              : '남측'
            : '맞은편'
          : null;
        const routes = [
          f < 14 ? `↑ ${FLOORS[f + 1]}F (${upLane})` : '최상층 · 전망대',
          f > 0 ? `↓ ${FLOORS[f - 1]}F (${downLane})` : '최하층 · B5',
        ];
        sign(g, routes, [x, 1.95, 23.15], rot);
      }

      const floorLayout = escalatorLayout(f);
      for (const [z, direction] of [
        [floorLayout.upZ, 1],
        [floorLayout.downZ, -1],
      ]) {
        const layout = direction === 1 ? floorLayout : { start: floorLayout.end, end: floorLayout.start };
        if (f === 14) {
          box(g, 'Top_terminal_barrier', [0.12, 1.05, 1.65], [layout.start, 0.525, z], champagne);
          continue;
        }
        const slope = Math.sign(layout.start - layout.end) * Math.atan2(3.5, 6);
        const length = Math.hypot(3.5, 6);
        const base = box(g, 'Escalator_truss', [length, 0.24, 1.6], [-31.0, 1.6, z], steel);
        base.rotation.z = -slope;

        for (const side of [-0.85, 0.85]) {
          const bal = box(g, 'Escalator_glass_balustrade', [length, 0.78, 0.08], [-31.0, 2.15, z + side], glass);
          bal.rotation.z = -slope;
          const rail = box(g, 'Escalator_handrail', [length, 0.1, 0.13], [-31.0, 2.6, z + side], black);
          rail.rotation.z = -slope;
          const skirtLed = box(g, 'Escalator_skirt_led', [length, 0.024, 0.02], [-31.0, 1.76, z + side * 0.96], emeraldLed);
          skirtLed.rotation.z = -slope;
        }
        for (const x of [-28, -34]) {
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
          mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(-31.0, 1.75, z), 4.5);
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
      const f = g.userData.floorIndex;
      g.visible = floor >= 5 ? f >= 5 : Math.abs(f - floor) <= 1;
    }
  }
}
