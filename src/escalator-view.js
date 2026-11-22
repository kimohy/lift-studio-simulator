import * as THREE from 'three';
import { FLOORS } from './controller.js';
import { ESCALATOR, ESCALATOR_STOPS, escalatorLayout } from './escalator.js';
import { hotelSignTexture } from './hotel-sign.js';

const STEP_COUNT = 48;

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
    const basementWall = new THREE.MeshStandardMaterial({ color: 0xc9c6be, roughness: 0.72 });
    const pitFloor = new THREE.MeshStandardMaterial({ color: 0x353c42, roughness: 0.88 });
    const warmLed = new THREE.MeshStandardMaterial({
      color: 0xfff0d4,
      emissive: 0xffd28a,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
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

    const sign = (g, lines, pos, rot, totem = false) => {
      const tex = hotelSignTexture(lines);
      const sg = new THREE.Group();
      sg.name = 'Escalator_floor_sign';
      sg.position.set(...pos);
      sg.rotation.y = rot;
      const py = pos[1];

      box(sg, 'Escalator_sign_frame', [1.32, 0.44, 0.05], [0, 0, 0], champagne);
      box(sg, 'Escalator_sign_body', [1.27, 0.4, 0.056], [0, 0, 0], black);

      const faceMat = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const front = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.38), faceMat);
      front.name = 'Escalator_sign_face_front';
      front.position.set(0, 0, 0.032);
      sg.add(front);

      const back = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.38), faceMat);
      back.name = 'Escalator_sign_face_back';
      back.position.set(0, 0, -0.032);
      back.rotation.y = Math.PI;
      sg.add(back);

      const postH = Math.max(0.2, py - 0.22);
      for (const sx of [-0.5, 0.5]) {
        box(sg, 'Escalator_sign_post', [0.045, postH, 0.045], [sx, -0.22 - postH / 2, 0], champagne);
        if (!totem) {
          box(sg, 'Escalator_sign_flange', [0.11, 0.04, 0.11], [sx, -py + 0.02, 0], champagne);
        }
      }
      if (totem) {
        box(sg, 'Escalator_sign_base', [1.14, 0.04, 0.18], [0, -py + 0.02, 0], champagne);
      }

      g.add(sg);
      this.signs.push(sg);
    };

    const stepGeometry = new THREE.BoxGeometry(0.28, 0.18, 1.4);
    const edgeGeometry = new THREE.BoxGeometry(0.008, 0.011, 1.4);

    for (let idx = 0; idx < ESCALATOR_STOPS.length; idx++) {
      const f = ESCALATOR_STOPS[idx];
      const g = new THREE.Group();
      g.userData.floorIndex = f;
      g.position.y = (f - 5) * 3.5;
      this.root.add(g);

      const isParking = f < 5;
      const deckMat = isParking ? concrete : stone;
      const barrierMat = isParking ? basementWall : glass;
      const wallH = isParking ? 3.5 : 1.85;
      const wallY = wallH / 2;

      // Long Direct Floor-to-Floor Escalator Landings (East x∈[-25,-22], West x∈[-40,-37] or [-39.45,-37] on M5F, South crossover z∈[22.25,24.6])
      box(g, 'Entry_platform', [3.0, 0.16, 7.4], [-23.5, -0.08, 20.9], deckMat);
      if (f === 13) {
        box(g, 'Exit_platform', [2.45, 0.16, 7.4], [-38.225, -0.08, 20.9], deckMat);
      } else {
        box(g, 'Exit_platform', [3.0, 0.16, 7.4], [-38.5, -0.08, 20.9], deckMat);
      }
      box(g, 'Return_corridor', [12.0, 0.16, 2.35], [-31.0, -0.08, 23.425], deckMat);
      if (f <= 5) {
        box(g, 'Escalator_center_deck', [12.0, 0.16, 1.1], [-31.0, -0.08, 20.0], deckMat);
        box(g, 'Escalator_north_deck', [12.0, 0.16, 0.48], [-31.0, -0.08, 17.44], deckMat);
      }

      if (!isParking) {
        box(g, 'Escalator_soffit_led_E', [2.6, 0.05, 7.0], [-23.5, -0.18, 20.9], emeraldLed);
        box(g, 'Escalator_soffit_led_W', [f === 13 ? 2.1 : 2.6, 0.05, 7.0], [f === 13 ? -38.225 : -38.5, -0.18, 20.9], emeraldLed);
      }

      // North & South side balustrades (open panoramic glass in Atrium, finished bright cove walls in basement)
      if (f === 13) {
        box(g, 'Escalator_back_wall', [17.45, wallH, 0.12], [-30.725, wallY, 24.66], barrierMat);
        box(g, 'Escalator_front_wall', [15.0, wallH, 0.12], [-29.5, wallY, 17.14], barrierMat);
        box(g, 'Escalator_rail_top_S', [17.45, 0.06, 0.14], [-30.725, wallH, 24.66], champagne);
        box(g, 'Escalator_rail_top_N', [15.0, 0.06, 0.14], [-29.5, wallH, 17.14], champagne);
      } else {
        box(g, 'Escalator_back_wall', [18.0, wallH, 0.12], [-31.0, wallY, 24.66], barrierMat);
        box(g, 'Escalator_front_wall', [18.0, wallH, 0.12], [-31.0, wallY, 17.14], barrierMat);
        if (isParking) {
          box(g, 'Escalator_basement_led_S', [17.4, 0.06, 0.08], [-31.0, 3.32, 24.56], warmLed);
          box(g, 'Escalator_basement_led_N', [17.4, 0.06, 0.08], [-31.0, 3.32, 17.24], warmLed);
          box(g, 'Escalator_portal_header_E', [0.16, 0.85, 7.4], [-22.05, 3.075, 20.9], basementWall);
          box(g, 'Escalator_portal_header_W', [0.16, 0.85, 7.4], [-39.95, 3.075, 20.9], basementWall);
          for (const px of [-22.05, -39.95]) {
            box(g, 'Escalator_portal_jamb_N', [0.16, 2.65, 0.9], [px, 1.325, 17.65], basementWall);
            box(g, 'Escalator_portal_jamb_S', [0.16, 2.65, 0.9], [px, 1.325, 24.15], basementWall);
          }
          if (f > 0) {
            const pitLiner = box(g, 'Escalator_pit_liner', [18.2, 0.16, 7.6], [-31.0, -0.22, 20.9], pitFloor);
            pitLiner.visible = false;
            g.userData.pitLiner = pitLiner;
          }
        } else {
          box(g, 'Escalator_rail_top_S', [18.0, 0.06, 0.14], [-31.0, wallH, 24.66], champagne);
          box(g, 'Escalator_rail_top_N', [18.0, 0.06, 0.14], [-31.0, wallH, 17.14], champagne);
        }
      }

      if (f === 0) box(g, 'Escalator_shaft_bottom_cap', [18.2, 0.2, 7.6], [-31.0, -0.2, 20.9], concrete);
      if (f === 13) box(g, 'Escalator_shaft_top_cap', [17.6, 0.16, 7.6], [-30.8, 6.85, 20.9], glass);

      // Floor & Direction Signage on Grounded Stanchion Totems
      const fmtStop = (sf) => (sf < 5 ? FLOORS[sf] : `M${(sf - 3) / 2}F`);
      const floorTag = f < 5 ? `${FLOORS[f]} 주차장` : fmtStop(f);
      sign(g, [`${floorTag} · 직통 에스컬레이터`, 'DIRECT EXPRESS ESCALATOR'], [-22.46, 2.15, 17.22], 0, false);
      sign(g, [`${floorTag} · 직통 에스컬레이터`, 'DIRECT EXPRESS ESCALATOR'], [-39.32, 2.15, 24.58], Math.PI, false);

      const upStop = idx < ESCALATOR_STOPS.length - 1 ? ESCALATOR_STOPS[idx + 1] : null;
      const downStop = idx > 0 ? ESCALATOR_STOPS[idx - 1] : null;
      const floorLayout = escalatorLayout(f);
      const lower = downStop !== null ? escalatorLayout(downStop) : null;

      for (const [x, rot, east] of [
        [-22.81, -Math.PI / 2, true],
        [-39.19, Math.PI / 2, false],
      ]) {
        const upLane =
          floorLayout.start === (east ? -25 : -37) ? (floorLayout.upZ < 20 ? '북측' : '남측') : '맞은편';
        const downLane = lower
          ? lower.start === (east ? -25 : -37)
            ? lower.downZ < 20
              ? '북측'
              : '남측'
            : '맞은편'
          : null;
        const routes = [
          upStop !== null ? `↑ ${fmtStop(upStop)} (${upLane})` : '최상층 · IMAX·하늘정원',
          downStop !== null ? `↓ ${fmtStop(downStop)} (${downLane})` : '최하층 · B5 주차장',
        ];
        sign(g, routes, [x, 1.88, 23.15], rot, true);
      }

      if (f === 13) {
        for (const [z, direction] of [
          [floorLayout.upZ, 1],
          [floorLayout.downZ, -1],
        ]) {
          const layout = direction === 1 ? floorLayout : { start: floorLayout.end, end: floorLayout.start };
          box(g, 'Top_terminal_barrier', [0.12, 1.05, 1.65], [layout.start, 0.525, z], champagne);
        }
        continue;
      }

      const h = floorLayout.height;
      const run = ESCALATOR.run;
      for (const [z, direction] of [
        [floorLayout.upZ, 1],
        [floorLayout.downZ, -1],
      ]) {
        const layout = direction === 1 ? floorLayout : { start: floorLayout.end, end: floorLayout.start };
        const slope = Math.sign(layout.start - layout.end) * Math.atan2(h, run);
        const length = Math.hypot(h, run);
        const midY = h / 2;
        const base = box(g, 'Escalator_truss', [length, 0.32, 1.66], [-31.0, midY - 0.19, z], steel);
        base.rotation.z = -slope;

        for (const side of [-0.85, 0.85]) {
          const bal = box(g, 'Escalator_glass_balustrade', [length, 0.78, 0.08], [-31.0, midY + 0.4, z + side], glass);
          bal.rotation.z = -slope;
          const rail = box(g, 'Escalator_handrail', [length, 0.1, 0.13], [-31.0, midY + 0.85, z + side], black);
          rail.rotation.z = -slope;
          const skirtLed = box(g, 'Escalator_skirt_led', [length, 0.024, 0.02], [-31.0, midY + 0.01, z + side * 0.96], emeraldLed);
          skirtLed.rotation.z = -slope;
        }
        for (const x of [-25, -37]) {
          const cy = x === layout.start ? 0.016 : h + 0.016;
          box(g, 'Escalator_comb_plate', [0.36, 0.035, 1.48], [x, cy, z], yellow);
          box(g, 'Escalator_comb_light', [0.38, 0.014, 1.44], [x, cy - 0.014, z], emeraldLed);
        }

        // Emergency Stop Switch on newel post
        const stopX = layout.start + Math.sign(layout.end - layout.start) * 0.18;
        const eStop = box(g, 'Escalator_e_stop', [0.08, 0.12, 0.08], [stopX, 0.88, z + 0.88], redHousing);
        eStop.userData = { action: 'escalatorStop', floorIndex: f, dynamic: true };
        const eStopBtn = box(g, 'Escalator_e_stop_button', [0.05, 0.05, 0.04], [stopX, 0.88, z + 0.93], redMushroom);
        eStopBtn.userData = { action: 'escalatorStop', floorIndex: f, dynamic: true };
        if (this.pickables) this.pickables.push(eStop, eStopBtn);

        const stepMesh = new THREE.InstancedMesh(stepGeometry, tread, STEP_COUNT);
        const edgeMesh = new THREE.InstancedMesh(edgeGeometry, yellow, STEP_COUNT);
        stepMesh.name = 'Moving_escalator_steps';
        edgeMesh.name = 'Step_safety_edges';
        for (const mesh of [stepMesh, edgeMesh]) {
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(-31.0, midY, z), Math.max(7.2, length * 0.55));
          g.add(mesh);
        }
        this.flights.push({
          floor: f,
          z,
          direction,
          height: h,
          run,
          stepCount: STEP_COUNT,
          group: g,
          stepMesh,
          edgeMesh,
          layout,
        });
      }
    }
  }

  update(time, paused, stopped = false) {
    if (!paused && !stopped) this.time = time;
    const matrix = (this.stepMatrix ??= new THREE.Matrix4());
    for (const flight of this.flights) {
      if (!this.root.visible || !flight.group.visible) continue;
      const edgeSign = Math.sign(flight.layout.start - flight.layout.end) || 1;
      for (let i = 0; i < flight.stepCount; i++) {
        const t = (((i / flight.stepCount + ((this.time || 0) * ESCALATOR.speed) / flight.run * flight.direction) % 1) + 1) % 1;
        const x = flight.layout.start + t * (flight.layout.end - flight.layout.start);
        const y = t * flight.height - 0.085;
        matrix.makeTranslation(x, y, flight.z);
        flight.stepMesh.setMatrixAt(i, matrix);
        matrix.makeTranslation(x + edgeSign * 0.1242, y + 0.0782, flight.z);
        flight.edgeMesh.setMatrixAt(i, matrix);
      }
      flight.stepMesh.instanceMatrix.needsUpdate = true;
      flight.edgeMesh.instanceMatrix.needsUpdate = true;
    }
  }

  updateVisibility(floor, active) {
    this.root.visible = active;
    let minVisible = Infinity;
    for (const g of this.root.children) {
      const f = g.userData.floorIndex;
      const visible =
        floor >= 5
          ? f >= 4
          : floor === 4
            ? f >= 3
            : Math.abs(f - floor) <= 1;
      g.visible = visible;
      if (visible && f < minVisible) minVisible = f;
    }
    for (const g of this.root.children) {
      if (g.userData.pitLiner) {
        const f = g.userData.floorIndex;
        g.userData.pitLiner.visible = active && f === minVisible && f > 0;
      }
    }
  }
}
