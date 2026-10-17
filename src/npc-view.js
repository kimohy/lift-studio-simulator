import * as THREE from 'three';

const unitBox = new THREE.BoxGeometry(1, 1, 1);

export class NPCView {
  constructor(scene, npcSystem, pickables) {
    this.npcSystem = npcSystem;
    this.pickables = pickables;
    this.root = new THREE.Group();
    this.root.name = 'Hotel_NPCs';
    this.root.userData.dynamic = true;
    scene.add(this.root);

    this.sharedMaterials = {
      black: new THREE.MeshStandardMaterial({ color: 0x1f2628, roughness: 0.88 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf0eee4, roughness: 0.65 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.32, metalness: 0.75 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x543828, roughness: 0.62 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x8d999c, roughness: 0.28, metalness: 0.8 }),
    };

    this.rigs = this.npcSystem.npcs.map((npc) => this.buildCharacter(npc));
  }

  box(parent, name, size, pos, material) {
    const m = new THREE.Mesh(unitBox, material);
    m.name = name;
    m.scale.set(...size);
    m.position.set(...pos);
    parent.add(m);
    return m;
  }

  sphere(parent, name, radius, pos, material, scale = [1, 1, 1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material);
    m.name = name;
    m.position.set(...pos);
    m.scale.set(...scale);
    parent.add(m);
    return m;
  }

  cylinder(parent, name, r1, r2, height, pos, material, segments = 12) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, height, segments), material);
    m.name = name;
    m.position.set(...pos);
    parent.add(m);
    return m;
  }

  capsule(parent, name, r, len, y, material) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), material);
    m.name = name;
    m.position.y = y;
    parent.add(m);
    return m;
  }

  buildCharacter(npc) {
    const root = new THREE.Group();
    root.name = `NPC_${npc.id}`;
    root.userData.dynamic = true;
    root.position.set(npc.x, npc.y, npc.z);
    this.root.add(root);

    const coat = new THREE.MeshStandardMaterial({ color: npc.coatColor ?? 0x3b4d59, roughness: 0.78 });
    const trouser = new THREE.MeshStandardMaterial({ color: npc.trouserColor ?? 0x22292d, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: npc.skinColor ?? 0xd2a889, roughness: 0.82 });
    const hair = new THREE.MeshStandardMaterial({ color: npc.hairColor ?? 0x241f1f, roughness: 0.92 });
    const sm = this.sharedMaterials;

    const torso = this.capsule(root, 'NPC_torso', 0.215, 0.37, 1.08, coat);
    torso.scale.z = 0.66;

    this.box(root, 'NPC_shirt', [0.14, 0.34, 0.018], [0, 1.16, -0.146], sm.white);
    if (npc.role === 'bellhop') {
      this.box(root, 'Bellhop_plastron', [0.22, 0.36, 0.02], [0, 1.12, -0.148], sm.gold);
    }

    const legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.1, 0.74, 0);
      root.add(hip);
      this.capsule(hip, 'NPC_leg', 0.074, 0.46, -0.31, trouser);
      this.box(hip, 'NPC_shoe', [0.14, 0.1, 0.27], [0, -0.66, -0.04], sm.black);
      legs.push(hip);
    }

    this.cylinder(root, 'NPC_neck', 0.062, 0.062, 0.13, [0, 1.46, 0], skin);

    const head = new THREE.Group();
    head.position.y = 1.62;
    root.add(head);
    this.sphere(head, 'NPC_face', 0.152, [0, 0, 0], skin, [0.92, 1.12, 0.91]);
    this.sphere(head, 'NPC_hair', 0.158, [0, 0.095, 0.03], hair, [1, 0.57, 1]);

    if (npc.longHair) {
      this.sphere(head, 'NPC_hair_bun', 0.082, [0, 0.045, 0.142], hair);
      this.sphere(head, 'NPC_hair_back', 0.125, [0, -0.05, 0.09], hair, [1, 1.2, 0.5]);
    }
    if (npc.role === 'bellhop') {
      this.cylinder(head, 'Bellhop_hat', 0.135, 0.135, 0.11, [0, 0.17, 0], coat, 14);
      this.cylinder(head, 'Bellhop_hat_trim', 0.138, 0.138, 0.022, [0, 0.125, 0], sm.gold, 14);
    }

    for (const x of [-0.052, 0.052]) {
      this.sphere(head, 'NPC_eye', 0.011, [x, 0.026, -0.136], sm.black, [1, 0.7, 0.5]);
    }
    this.sphere(head, 'NPC_nose', 0.02, [0, -0.015, -0.145], skin, [0.7, 1, 0.8]);
    this.box(head, 'NPC_smile', [0.052, 0.007, 0.005], [0, -0.064, -0.136], hair);

    const arms = [];
    const elbows = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.255, 1.36, 0);
      root.add(shoulder);
      this.capsule(shoulder, 'NPC_sleeve', 0.054, 0.22, -0.17, coat);

      const elbow = new THREE.Group();
      elbow.position.y = -0.34;
      shoulder.add(elbow);
      this.capsule(elbow, 'NPC_forearm', 0.046, 0.2, -0.14, coat);
      this.sphere(elbow, 'NPC_hand', 0.058, [0, -0.31, 0], skin, [0.85, 1, 0.65]);

      if (side === -1 && npc.prop === 'briefcase') {
        this.box(elbow, 'NPC_briefcase', [0.08, 0.28, 0.38], [-0.04, -0.44, 0], sm.leather);
        this.box(elbow, 'NPC_briefcase_handle', [0.03, 0.06, 0.12], [-0.04, -0.28, 0], sm.gold);
      } else if (side === -1 && npc.prop === 'suitcase') {
        this.box(elbow, 'NPC_bag', [0.14, 0.34, 0.28], [-0.06, -0.45, 0], sm.leather);
      } else if (side === -1 && npc.prop === 'cup') {
        elbow.rotation.x = 0.55;
        this.cylinder(elbow, 'NPC_coffee_cup', 0.038, 0.03, 0.095, [0, -0.31, -0.05], sm.white, 10);
      }

      shoulder.rotation.z = side * 0.08;
      arms.push(shoulder);
      elbows.push(elbow);
    }

    const data = {
      action: 'npc',
      npcId: npc.id,
      npcName: npc.name,
    };

    root.traverse((o) => {
      if (o.isMesh) {
        o.userData = { ...data };
        this.pickables.push(o);
      }
    });

    return { npc, root, head, arms, elbows, legs };
  }

  update(time, visibleFloor, viewMode) {
    if (viewMode === 'controller') {
      this.root.visible = false;
      return;
    }
    this.root.visible = true;

    for (const rig of this.rigs) {
      const { npc, root, head, arms, elbows, legs } = rig;

      // Determine visibility based on camera view and floor
      let visible = false;
      if (npc.zone === 'cabin') {
        visible = viewMode !== 'controller';
      } else if (viewMode === 'shaft') {
        visible = npc.z <= 4.0;
      } else if (viewMode === 'exterior') {
        visible = npc.floor === 5 && npc.z >= 16;
      } else {
        visible = Math.abs(npc.floor - visibleFloor) <= 1;
      }
      root.visible = visible;
      if (!visible) continue;

      const walkAmp = npc.moving ? 1 : 0;
      const swing = Math.sin(npc.walkPhase) * 0.46 * walkAmp;
      const bob = Math.abs(Math.cos(npc.walkPhase)) * 0.022 * walkAmp;

      root.position.set(npc.x, npc.y + bob, npc.z);
      root.rotation.y = npc.yaw;

      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;

      const holdingCup = npc.prop === 'cup';
      arms[0].rotation.x = holdingCup ? 0.25 + swing * 0.15 : -swing * 0.65;
      arms[0].rotation.z = -0.08 + Math.sin(time + npc.index) * 0.02;

      const age = time - (npc.waveStart ?? -100);
      const remaining = (npc.waveUntil ?? 0) - time;
      const wave = remaining > 0 ? Math.max(0, Math.min(1, age / 0.35, remaining / 0.5)) : 0;

      if (wave > 0) {
        arms[1].rotation.x = -0.3 * wave;
        arms[1].rotation.z = 0.08 + wave * 0.88;
        elbows[1].rotation.z = wave * (1.75 + Math.sin(age * 6.5) * 0.12);
        elbows[1].rotation.x = 0.25 * wave;
        head.rotation.x = -0.06 * wave;
      } else {
        arms[1].rotation.x = swing * 0.65;
        arms[1].rotation.z = 0.08 - Math.sin(time + npc.index) * 0.02;
        elbows[1].rotation.z = 0;
        elbows[1].rotation.x = Math.max(0, -swing * 0.25);
        head.rotation.x = 0;
      }

      head.rotation.z = Math.sin(time * 0.85 + npc.index * 1.4) * 0.022;
    }
  }
}
