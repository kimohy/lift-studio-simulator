import * as THREE from 'three';
import { buildStylizedHuman } from './character-builder.js';

export class NPCView {
  constructor(scene, npcSystem, pickables) {
    this.npcSystem = npcSystem;
    this.pickables = pickables;
    this.root = new THREE.Group();
    this.root.name = 'Hotel_NPCs';
    this.root.userData.dynamic = true;
    scene.add(this.root);

    this.rigs = this.npcSystem.npcs.map((npc) => this.buildCharacter(npc));
  }

  buildCharacter(npc) {
    const rig = buildStylizedHuman({
      name: `NPC_${npc.id}`,
      coatColor: npc.coatColor ?? 0x3b4d59,
      trouserColor: npc.trouserColor ?? 0x22292d,
      skinColor: npc.skinColor ?? 0xd2a889,
      hairColor: npc.hairColor ?? 0x241f1f,
      longHair: Boolean(npc.longHair),
      hat: npc.role === 'bellhop' ? 'bellhop' : null,
      prop: npc.prop ?? null,
      facingDir: -1,
      pickableData: {
        action: 'npc',
        npcId: npc.id,
        npcName: npc.name,
      },
      pickables: this.pickables,
    });
    rig.root.position.set(npc.x, npc.y, npc.z);
    this.root.add(rig.root);
    return { npc, ...rig };
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
