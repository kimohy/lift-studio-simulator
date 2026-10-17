import * as THREE from 'three';
import { hotelSignTexture } from './hotel-sign.js';

export class ServiceRobotView {
  constructor(scene, robot, pickables) {
    this.robot = robot;
    this.pickables = pickables;
    this.root = new THREE.Group();
    this.root.name = 'Hotel_Service_Robot';
    this.root.userData.dynamic = true;
    scene.add(this.root);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xecf1f4, roughness: 0.25, metalness: 0.15 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e282d, roughness: 0.35, metalness: 0.3 });
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x2c3b42, roughness: 0.45 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xd9e1e4, roughness: 0.2, metalness: 0.8 });
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x76cfbf });

    const addMesh = (parent, geo, mat, pos, name) => {
      const m = new THREE.Mesh(geo, mat);
      m.name = name;
      m.position.set(...pos);
      parent.add(m);
      return m;
    };

    // Base chassis & LED ring
    addMesh(this.root, new THREE.CylinderGeometry(0.28, 0.31, 0.16, 24), darkMat, [0, 0.09, 0], 'Robot_base');
    this.ledRing = addMesh(
      this.root,
      new THREE.CylinderGeometry(0.295, 0.295, 0.025, 24),
      this.ringMat,
      [0, 0.16, 0],
      'Robot_led_ring'
    );

    // Side pillars & back spine supporting the serving shelves
    for (const side of [-1, 1]) {
      const pillar = addMesh(
        this.root,
        new THREE.BoxGeometry(0.05, 0.82, 0.24),
        bodyMat,
        [side * 0.22, 0.56, 0.04],
        'Robot_side_pillar'
      );
      pillar.rotation.x = 0.04;
    }
    addMesh(this.root, new THREE.BoxGeometry(0.38, 0.82, 0.06), bodyMat, [0, 0.56, 0.18], 'Robot_spine');

    // Two serving shelves
    for (const y of [0.46, 0.76]) {
      addMesh(this.root, new THREE.CylinderGeometry(0.23, 0.23, 0.03, 20), trayMat, [0, y, -0.01], 'Robot_shelf');
    }

    // Upper head / display housing
    addMesh(
      this.root,
      new THREE.CylinderGeometry(0.21, 0.25, 0.24, 24),
      bodyMat,
      [0, 1.05, 0.01],
      'Robot_head_housing'
    );
    addMesh(
      this.root,
      new THREE.SphereGeometry(0.21, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      bodyMat,
      [0, 1.17, 0.01],
      'Robot_head_dome'
    );

    // Cute Robot Ears / Antennas
    for (const side of [-1, 1]) {
      addMesh(
        this.root,
        new THREE.CylinderGeometry(0.018, 0.024, 0.09, 10),
        darkMat,
        [side * 0.14, 1.32, 0.01],
        'Robot_antenna'
      );
      addMesh(this.root, new THREE.SphereGeometry(0.03, 10, 10), this.ringMat, [side * 0.14, 1.37, 0.01], 'Robot_ear_tip');
    }

    // Digital Face Screen on front (-Z side)
    this.faceMaterials = {
      normal: new THREE.MeshBasicMaterial({ map: hotelSignTexture(['^  ‿  ^', 'DELI · BUTLER BOT']) }),
      delivering: new THREE.MeshBasicMaterial({
        map: hotelSignTexture(['●  ‿  ●', 'ROOM SERVICE 301']),
        color: 0xffe8b5,
      }),
      happy: new THREE.MeshBasicMaterial({
        map: hotelSignTexture(['♥  ‿  ♥', 'ENJOY YOUR MEAL!']),
        color: 0xb9f3d3,
      }),
    };

    this.faceScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.15), this.faceMaterials.normal);
    this.faceScreen.name = 'Robot_face_screen';
    this.faceScreen.position.set(0, 1.06, -0.225);
    this.faceScreen.rotation.x = -0.12;
    this.root.add(this.faceScreen);

    // Cargo Cloche & Cup on the upper tray (visible when carrying an order or on café patrol)
    this.cargoTray = new THREE.Group();
    this.cargoTray.name = 'Robot_cargo_tray';
    this.cargoTray.position.set(0, 0.78, -0.01);
    this.root.add(this.cargoTray);

    addMesh(
      this.cargoTray,
      new THREE.SphereGeometry(0.115, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      silverMat,
      [-0.04, 0, 0],
      'Cargo_cloche'
    );
    addMesh(this.cargoTray, new THREE.SphereGeometry(0.02, 10, 10), silverMat, [-0.04, 0.12, 0], 'Cargo_cloche_knob');
    addMesh(this.cargoTray, new THREE.CylinderGeometry(0.04, 0.032, 0.085, 14), bodyMat, [0.1, 0.042, 0.02], 'Cargo_cup');

    const data = {
      action: 'robot',
      robotId: robot.id,
      robotName: robot.name,
    };
    this.root.traverse((o) => {
      if (o.isMesh) {
        o.userData = { ...data };
        this.pickables.push(o);
      }
    });
  }

  update(time, visibleFloor, viewMode) {
    if (viewMode === 'controller') {
      this.root.visible = false;
      return;
    }

    const r = this.robot;
    let visible = false;
    if (r.zone === 'cabin') {
      visible = viewMode !== 'controller';
    } else if (viewMode === 'shaft') {
      visible = r.z <= 4.0;
    } else if (viewMode === 'exterior') {
      visible = r.floor === 5 && r.z >= 16;
    } else {
      visible = Math.abs(r.floor - visibleFloor) <= 1;
    }
    this.root.visible = visible;
    if (!visible) return;

    const hover = Math.sin(time * 4.2) * 0.006;
    this.root.position.set(r.x, r.y + hover, r.z);
    this.root.rotation.y = r.yaw;

    this.cargoTray.visible = r.carryingOrder || r.orderState === 'none';
    this.ringMat.color.setHex(r.carryingOrder ? 0xf3ce95 : 0x76cfbf);

    const faceKey = time < r.happyUntil ? 'happy' : r.carryingOrder ? 'delivering' : 'normal';
    const nextFace = this.faceMaterials[faceKey];
    if (this.faceScreen.material !== nextFace) {
      this.faceScreen.material = nextFace;
    }
  }
}
