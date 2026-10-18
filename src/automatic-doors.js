import * as THREE from 'three';

const unitBox = new THREE.BoxGeometry(1, 1, 1);

export class AutomaticDoorSystem {
  constructor(scene, sfx, pickables = []) {
    this.scene = scene;
    this.sfx = sfx;
    this.pickables = pickables;

    this.root = new THREE.Group();
    this.root.name = 'Automatic_sliding_doors_system';
    scene.add(this.root);

    this.doors = [];

    // Materials
    this.m = {
      gold: new THREE.MeshStandardMaterial({
        color: 0xc8aa6e,
        metalness: 0.82,
        roughness: 0.22,
      }),
      frame: new THREE.MeshStandardMaterial({
        color: 0x3d4b53,
        metalness: 0.65,
        roughness: 0.35,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x98cfd8,
        metalness: 0.15,
        roughness: 0.08,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      frostStripe: new THREE.MeshBasicMaterial({
        color: 0xdff5fa,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      sensorActive: new THREE.MeshBasicMaterial({ color: 0x00ffff }),
      sensorIdle: new THREE.MeshBasicMaterial({ color: 0x22cc77 }),
      sensorHousing: new THREE.MeshStandardMaterial({ color: 0x1a2126, roughness: 0.5 }),
    };

    // 1. 10F Rooftop Pool Entrance Automatic Sliding Glass Door
    // Located at x = 0, y = (14 - 5) * 3.5 = 31.5, z = 8.0, opening width = 2.8m, height = 2.8m
    this.createSlidingDoor({
      id: 'rooftop_pool_door',
      name: 'Rooftop_pool_sliding_door',
      floorIndex: 14,
      x: 0,
      y: (14 - 5) * 3.5,
      z: 8.0,
      width: 2.8,
      height: 2.8,
      detectRadiusZ: 2.8,
      detectRadiusX: 2.2,
      slideDistance: 1.15,
    });

    // 2. 1F Grand Lobby Main Entrance Automatic Sliding Glass Door
    // Located at x = 0, y = 0, z = 26.0, opening width = 2.8m, height = 3.0m
    this.createSlidingDoor({
      id: 'lobby_main_entrance_door',
      name: 'Lobby_main_sliding_door',
      floorIndex: 5,
      x: 0,
      y: 0,
      z: 26.0,
      width: 2.8,
      height: 3.0,
      detectRadiusZ: 3.2,
      detectRadiusX: 2.2,
      slideDistance: 1.18,
    });
  }

  box(parent, name, size, pos, mat, dynamic = false) {
    const m = new THREE.Mesh(unitBox, mat);
    m.name = name;
    m.scale.set(...size);
    m.position.set(...pos);
    if (dynamic) m.userData.dynamic = true;
    parent.add(m);
    return m;
  }

  createSlidingDoor(spec) {
    const g = new THREE.Group();
    g.name = spec.name;
    g.position.set(spec.x, spec.y, spec.z);
    g.userData.floorIndex = spec.floorIndex;
    this.root.add(g);

    const m = this.m;
    const w = spec.width;
    const h = spec.height;
    const leafWidth = w / 2 + 0.12;
    const leafHeight = h - 0.18;

    // 1. Top Header Box & Sliding Track
    this.box(g, 'Door_header_box', [w + 0.5, 0.16, 0.22], [0, h - 0.08, 0], m.frame);
    this.box(g, 'Door_header_gold_trim', [w + 0.52, 0.02, 0.24], [0, h - 0.16, 0], m.gold);

    // 2. Infrared Motion Sensor Domes (Front and Back)
    const sensorFront = this.box(g, 'Sensor_housing_f', [0.32, 0.07, 0.08], [0, h - 0.08, 0.12], m.sensorHousing);
    const sensorBack = this.box(g, 'Sensor_housing_b', [0.32, 0.07, 0.08], [0, h - 0.08, -0.12], m.sensorHousing);
    const ledFront = this.box(g, 'Sensor_led_f', [0.18, 0.022, 0.025], [0, h - 0.09, 0.155], m.sensorIdle, true);
    const ledBack = this.box(g, 'Sensor_led_b', [0.18, 0.022, 0.025], [0, h - 0.09, -0.155], m.sensorIdle, true);

    // 3. Side Jambs
    for (const sx of [-w / 2 - 0.06, w / 2 + 0.06]) {
      this.box(g, 'Door_jamb', [0.12, h, 0.18], [sx, h / 2, 0], m.frame);
      this.box(g, 'Door_jamb_gold', [0.03, h, 0.2], [sx < 0 ? sx + 0.05 : sx - 0.05, h / 2, 0], m.gold);
    }

    // 4. Floor Brass Guide Track
    this.box(g, 'Door_floor_track', [w + 0.6, 0.008, 0.16], [0, 0.004, 0], m.gold);

    const makePickable = (mesh) => {
      mesh.userData = {
        action: 'automaticDoor',
        label: '호텔 센서형 자동 슬라이딩 유리문',
        floorIndex: spec.floorIndex,
        dynamic: true,
      };
      this.pickables?.push(mesh);
      return mesh;
    };

    // 5. Left Sliding Glass Leaf Group
    const leftLeaf = new THREE.Group();
    leftLeaf.name = `${spec.name}_leaf_left`;
    leftLeaf.userData.dynamic = true;
    leftLeaf.position.set(-leafWidth / 2 + 0.03, 0, 0);
    g.add(leftLeaf);

    const leftGlass = makePickable(
      this.box(leftLeaf, 'Leaf_left_glass', [leafWidth - 0.06, leafHeight - 0.1, 0.024], [0, leafHeight / 2 + 0.03, 0], m.glass, true)
    );
    // Frosted Safety Stripe Decals
    for (const fy of [1.0, 1.45]) {
      this.box(leftLeaf, 'Frost_stripe', [leafWidth - 0.08, 0.045, 0.028], [0, fy, 0], m.frostStripe, true);
    }
    // Perimeter Gold Frame
    this.box(leftLeaf, 'Frame_top', [leafWidth, 0.04, 0.04], [0, leafHeight - 0.02, 0], m.gold, true);
    this.box(leftLeaf, 'Frame_bottom', [leafWidth, 0.07, 0.04], [0, 0.035, 0], m.gold, true);
    this.box(leftLeaf, 'Frame_stile_l', [0.04, leafHeight, 0.04], [-leafWidth / 2 + 0.02, leafHeight / 2, 0], m.gold, true);
    this.box(leftLeaf, 'Frame_stile_r', [0.04, leafHeight, 0.04], [leafWidth / 2 - 0.02, leafHeight / 2, 0], m.gold, true);
    // Vertical Handles
    for (const hz of [-0.038, 0.038]) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.85, 12), m.gold);
      handle.position.set(leafWidth / 2 - 0.12, 1.05, hz);
      handle.userData.dynamic = true;
      leftLeaf.add(handle);
    }

    // 6. Right Sliding Glass Leaf Group
    const rightLeaf = new THREE.Group();
    rightLeaf.name = `${spec.name}_leaf_right`;
    rightLeaf.userData.dynamic = true;
    rightLeaf.position.set(leafWidth / 2 - 0.03, 0, 0);
    g.add(rightLeaf);

    const rightGlass = makePickable(
      this.box(rightLeaf, 'Leaf_right_glass', [leafWidth - 0.06, leafHeight - 0.1, 0.024], [0, leafHeight / 2 + 0.03, 0], m.glass, true)
    );
    for (const fy of [1.0, 1.45]) {
      this.box(rightLeaf, 'Frost_stripe', [leafWidth - 0.08, 0.045, 0.028], [0, fy, 0], m.frostStripe, true);
    }
    this.box(rightLeaf, 'Frame_top', [leafWidth, 0.04, 0.04], [0, leafHeight - 0.02, 0], m.gold, true);
    this.box(rightLeaf, 'Frame_bottom', [leafWidth, 0.07, 0.04], [0, 0.035, 0], m.gold, true);
    this.box(rightLeaf, 'Frame_stile_l', [0.04, leafHeight, 0.04], [-leafWidth / 2 + 0.02, leafHeight / 2, 0], m.gold, true);
    this.box(rightLeaf, 'Frame_stile_r', [0.04, leafHeight, 0.04], [leafWidth / 2 - 0.02, leafHeight / 2, 0], m.gold, true);
    for (const hz of [-0.038, 0.038]) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.85, 12), m.gold);
      handle.position.set(-leafWidth / 2 + 0.12, 1.05, hz);
      handle.userData.dynamic = true;
      rightLeaf.add(handle);
    }

    this.doors.push({
      ...spec,
      group: g,
      leftLeaf,
      rightLeaf,
      leftBaseX: leftLeaf.position.x,
      rightBaseX: rightLeaf.position.x,
      ledFront,
      ledBack,
      currentOpen: 0,
      targetOpen: 0,
    });
  }

  update(dt, player) {
    for (const door of this.doors) {
      const sameFloor = player && player.floor === door.floorIndex && player.zone !== 'cabin';
      let inRange = false;
      if (sameFloor) {
        const dx = player.x - door.x;
        const dz = player.z - door.z;
        inRange = Math.abs(dx) <= door.detectRadiusX && Math.abs(dz) <= door.detectRadiusZ;
      }

      door.targetOpen = inRange ? 1.0 : 0.0;

      const prevOpen = door.currentOpen;
      const speed = 2.4; // smooth gliding open/close in ~0.42s
      if (door.currentOpen < door.targetOpen) {
        door.currentOpen = Math.min(door.targetOpen, door.currentOpen + dt * speed);
        if (prevOpen <= 0.02 && door.currentOpen > 0.02) {
          this.sfx?.playDoorMove?.();
        }
      } else if (door.currentOpen > door.targetOpen) {
        door.currentOpen = Math.max(door.targetOpen, door.currentOpen - dt * speed);
        if (prevOpen >= 0.98 && door.currentOpen < 0.98) {
          this.sfx?.playDoorMove?.();
        }
      }

      const openAmount = door.currentOpen;
      door.leftLeaf.position.x = door.leftBaseX - openAmount * door.slideDistance;
      door.rightLeaf.position.x = door.rightBaseX + openAmount * door.slideDistance;

      const active = openAmount > 0.05 || inRange;
      door.ledFront.material = active ? this.m.sensorActive : this.m.sensorIdle;
      door.ledBack.material = active ? this.m.sensorActive : this.m.sensorIdle;
    }
  }

  applyVisibility(currentFloor, playerFloor) {
    const visibleFloor = playerFloor ?? currentFloor ?? 5;
    for (const door of this.doors) {
      door.group.visible = Math.abs(door.floorIndex - visibleFloor) <= 1;
    }
  }
}
