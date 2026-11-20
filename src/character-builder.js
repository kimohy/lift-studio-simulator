import * as THREE from 'three';

const SHARED_GEO = {
  pelvis: new THREE.CylinderGeometry(0.158, 0.145, 0.15, 16),
  belt: new THREE.CylinderGeometry(0.162, 0.162, 0.038, 16),
  torso: new THREE.CylinderGeometry(0.186, 0.15, 0.44, 18),
  chestCap: new THREE.SphereGeometry(0.184, 16, 12),
  neck: new THREE.CylinderGeometry(0.05, 0.058, 0.13, 14),
  head: new THREE.SphereGeometry(0.114, 18, 14),
  jaw: new THREE.SphereGeometry(0.082, 14, 10),
  ear: new THREE.SphereGeometry(0.022, 10, 8),
  hairCrown: new THREE.SphereGeometry(0.121, 18, 14),
  hairBack: new THREE.SphereGeometry(0.116, 16, 12),
  hairBun: new THREE.SphereGeometry(0.056, 12, 10),
  eye: new THREE.SphereGeometry(0.013, 10, 8),
  iris: new THREE.SphereGeometry(0.008, 10, 8),
  nose: new THREE.SphereGeometry(0.015, 10, 8),
  thigh: new THREE.CylinderGeometry(0.08, 0.064, 0.37, 14),
  knee: new THREE.SphereGeometry(0.063, 12, 10),
  calf: new THREE.CylinderGeometry(0.063, 0.048, 0.36, 14),
  shoulderCap: new THREE.SphereGeometry(0.055, 12, 10),
  upperArm: new THREE.CylinderGeometry(0.05, 0.042, 0.22, 12),
  elbow: new THREE.SphereGeometry(0.042, 10, 8),
  forearm: new THREE.CylinderGeometry(0.041, 0.032, 0.21, 12),
  hand: new THREE.SphereGeometry(0.033, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};

const SHARED_MAT = {
  sclera: new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.35 }),
  iris: new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.16, metalness: 0.05 }),
  lip: new THREE.MeshStandardMaterial({ color: 0xb97166, roughness: 0.55 }),
  shoe: new THREE.MeshStandardMaterial({ color: 0x1e2328, roughness: 0.42, metalness: 0.08 }),
  sole: new THREE.MeshStandardMaterial({ color: 0x111518, roughness: 0.82 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.62 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9ab6e, roughness: 0.3, metalness: 0.75 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x5c3c29, roughness: 0.55 }),
  cup: new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.45 }),
  cupLid: new THREE.MeshStandardMaterial({ color: 0x20272c, roughness: 0.35 }),
};

function addPart(parent, name, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(...pos);
  m.scale.set(...scale);
  if (rot[0] || rot[1] || rot[2]) m.rotation.set(...rot);
  parent.add(m);
  return m;
}

export function buildStylizedHuman({
  name = 'Person',
  coatColor = 0x3b4d59,
  trouserColor = 0x242c33,
  skinColor = 0xd7ac8b,
  hairColor = 0x241f1f,
  accentColor = 0xc2a36b,
  shirtColor = null,
  longHair = false,
  hat = null,
  apron = false,
  apronColor = 0x364d52,
  prop = null,
  bagColor = null,
  facingDir = -1,
  seated = false,
  pickableData = null,
  pickables = null,
} = {}) {
  const f = facingDir >= 0 ? 1 : -1;
  const root = new THREE.Group();
  root.name = name;
  root.userData.dynamic = true;

  const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.72, metalness: 0.04 });
  const trouserMat = new THREE.MeshStandardMaterial({ color: trouserColor, roughness: 0.78, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.62, metalness: 0.02 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.78, metalness: 0.04 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.38, metalness: 0.35 });
  const shirtMat = shirtColor ? new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.62 }) : SHARED_MAT.shirt;

  // Pelvis + Belt bridging torso and hip joints cleanly
  addPart(root, 'Char_pelvis', SHARED_GEO.pelvis, trouserMat, [0, 0.82, 0], [1.06, 1, 0.72]);
  addPart(root, 'Char_belt', SHARED_GEO.belt, SHARED_MAT.shoe, [0, 0.9, 0], [1.07, 1, 0.73]);
  addPart(root, 'Char_belt_buckle', SHARED_GEO.box, SHARED_MAT.gold, [0, 0.9, f * 0.122], [0.045, 0.032, 0.015]);

  // Tailored Torso & Rounded Shoulders
  addPart(root, 'Char_torso', SHARED_GEO.torso, coatMat, [0, 1.13, 0], [1.08, 1, 0.68]);
  addPart(root, 'Char_shoulders', SHARED_GEO.chestCap, coatMat, [0, 1.31, 0], [1.14, 0.44, 0.7]);

  // Front Shirt Collar, Jacket Lapels & Tie/Plastron/Apron
  addPart(root, 'Char_shirt', SHARED_GEO.box, shirtMat, [0, 1.24, f * 0.118], [0.11, 0.25, 0.025]);
  for (const side of [-1, 1]) {
    addPart(
      root,
      'Char_lapel',
      SHARED_GEO.box,
      coatMat,
      [side * 0.056, 1.24, f * 0.126],
      [0.036, 0.24, 0.022],
      [0, 0, side * 0.16]
    );
  }
  if (hat === 'bellhop') {
    addPart(root, 'Bellhop_plastron', SHARED_GEO.box, SHARED_MAT.gold, [0, 1.16, f * 0.128], [0.16, 0.32, 0.02]);
  } else {
    addPart(root, 'Char_tie', SHARED_GEO.box, accentMat, [0, 1.2, f * 0.132], [0.028, 0.2, 0.016]);
  }
  if (apron) {
    const apronMat = new THREE.MeshStandardMaterial({ color: apronColor, roughness: 0.76 });
    addPart(root, 'Char_apron', SHARED_GEO.box, apronMat, [0, 0.98, f * 0.14], [0.3, 0.54, 0.03]);
  }

  // Articulated Legs + Contoured Dress Shoes
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.092, 0.78, 0);
    root.add(hip);

    addPart(hip, 'Char_thigh', SHARED_GEO.thigh, trouserMat, [0, -0.18, 0]);
    addPart(hip, 'Char_knee', SHARED_GEO.knee, trouserMat, [0, -0.37, 0]);
    addPart(hip, 'Char_calf', SHARED_GEO.calf, trouserMat, [0, -0.55, 0]);
    // Contoured shoe resting cleanly at y = 0.0
    addPart(hip, 'Char_shoe_sole', SHARED_GEO.box, SHARED_MAT.sole, [0, -0.768, f * 0.024], [0.092, 0.024, 0.21]);
    addPart(hip, 'Char_shoe_upper', SHARED_GEO.box, SHARED_MAT.shoe, [0, -0.738, f * 0.014], [0.088, 0.052, 0.175]);
    addPart(hip, 'Char_shoe_toe', SHARED_GEO.hand, SHARED_MAT.shoe, [0, -0.742, f * 0.09], [1.3, 0.78, 1.5]);

    legs.push(hip);
  }

  // Neck
  addPart(root, 'Char_neck', SHARED_GEO.neck, skinMat, [0, 1.42, 0]);

  // Expressive Head Group
  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  root.add(head);

  addPart(head, 'Char_face', SHARED_GEO.head, skinMat, [0, 0, 0], [0.92, 1.08, 0.96]);
  addPart(head, 'Char_jaw', SHARED_GEO.jaw, skinMat, [0, -0.044, f * 0.022], [0.88, 0.78, 0.88]);
  for (const side of [-1, 1]) {
    addPart(head, 'Char_ear', SHARED_GEO.ear, skinMat, [side * 0.104, -0.008, -f * 0.008], [0.46, 1.15, 0.72]);
  }

  // Multi-part Sculpted Hair
  addPart(head, 'Char_hair_crown', SHARED_GEO.hairCrown, hairMat, [0, 0.048, -f * 0.012], [0.96, 0.76, 1.02]);
  addPart(head, 'Char_hair_back', SHARED_GEO.hairBack, hairMat, [0, -0.005, -f * 0.036], [0.94, 0.95, 0.75]);
  for (const side of [-1, 1]) {
    addPart(head, 'Char_hair_side', SHARED_GEO.hairBun, hairMat, [side * 0.09, 0.025, -f * 0.004], [0.46, 0.95, 0.9]);
  }
  addPart(head, 'Char_hair_fringe', SHARED_GEO.hairBun, hairMat, [0, 0.088, f * 0.045], [1.62, 0.56, 0.92]);

  if (longHair) {
    addPart(head, 'Char_hair_bun', SHARED_GEO.hairBun, hairMat, [0, 0.042, -f * 0.118], [1.0, 0.95, 0.9]);
    addPart(head, 'Char_hair_tail', SHARED_GEO.hairBack, hairMat, [0, -0.095, -f * 0.072], [0.86, 1.25, 0.56]);
  }
  if (hat === 'bellhop') {
    addPart(head, 'Bellhop_hat', SHARED_GEO.cyl, coatMat, [0, 0.128, -f * 0.005], [0.105, 0.095, 0.105]);
    addPart(head, 'Bellhop_hat_trim', SHARED_GEO.cyl, SHARED_MAT.gold, [0, 0.088, -f * 0.005], [0.109, 0.02, 0.109]);
  }

  // Facial Features (Sclera, Irises, Eyebrows, Nose, Lips)
  for (const side of [-1, 1]) {
    addPart(head, 'Char_eye_white', SHARED_GEO.eye, SHARED_MAT.sclera, [side * 0.038, 0.015, f * 0.096], [1.1, 0.72, 0.5]);
    addPart(head, 'Char_eye_iris', SHARED_GEO.iris, SHARED_MAT.iris, [side * 0.038, 0.015, f * 0.102], [1.0, 0.95, 0.55]);
    addPart(
      head,
      'Char_brow',
      SHARED_GEO.box,
      hairMat,
      [side * 0.039, 0.039, f * 0.1],
      [0.032, 0.007, 0.01],
      [0, 0, -side * 0.08]
    );
  }
  addPart(head, 'Char_nose', SHARED_GEO.nose, skinMat, [0, -0.012, f * 0.111], [0.75, 1.05, 0.9]);
  addPart(head, 'Char_lips', SHARED_GEO.box, SHARED_MAT.lip, [0, -0.052, f * 0.101], [0.038, 0.009, 0.01]);

  // Articulated Arms + Elbows + Proportional Hands
  const arms = [];
  const elbows = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.22, 1.32, 0);
    root.add(shoulder);

    addPart(shoulder, 'Char_shoulder_cap', SHARED_GEO.shoulderCap, coatMat, [0, -0.01, 0]);
    addPart(shoulder, 'Char_upper_arm', SHARED_GEO.upperArm, coatMat, [0, -0.115, 0]);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.23, 0);
    shoulder.add(elbow);

    addPart(elbow, 'Char_elbow', SHARED_GEO.elbow, coatMat, [0, 0, 0]);
    addPart(elbow, 'Char_forearm', SHARED_GEO.forearm, coatMat, [0, -0.105, 0]);
    addPart(elbow, 'Char_cuff', SHARED_GEO.cyl, shirtMat, [0, -0.21, 0], [0.034, 0.018, 0.034]);
    addPart(elbow, 'Char_hand', SHARED_GEO.hand, skinMat, [0, -0.245, 0], [0.72, 1.15, 0.55]);

    if (side === -1 && prop === 'briefcase') {
      addPart(elbow, 'Char_briefcase', SHARED_GEO.box, SHARED_MAT.leather, [-0.035, -0.37, 0], [0.075, 0.25, 0.35]);
      addPart(elbow, 'Char_briefcase_handle', SHARED_GEO.box, SHARED_MAT.gold, [-0.035, -0.235, 0], [0.025, 0.045, 0.1]);
    } else if (side === -1 && prop === 'suitcase') {
      addPart(elbow, 'Char_suitcase', SHARED_GEO.box, SHARED_MAT.leather, [-0.05, -0.39, 0], [0.13, 0.31, 0.25]);
    } else if (side === -1 && prop === 'cup') {
      elbow.rotation.x = f < 0 ? 0.55 : -0.55;
      addPart(elbow, 'Char_coffee_cup', SHARED_GEO.cyl, SHARED_MAT.cup, [0, -0.25, f * 0.045], [0.034, 0.088, 0.034]);
      addPart(elbow, 'Char_coffee_lid', SHARED_GEO.cyl, SHARED_MAT.cupLid, [0, -0.205, f * 0.045], [0.036, 0.012, 0.036]);
    }
    if (side === 1 && bagColor) {
      const bagMat = new THREE.MeshStandardMaterial({ color: bagColor, roughness: 0.42 });
      addPart(elbow, 'Char_shopping_bag', SHARED_GEO.box, bagMat, [0.04, -0.35, 0], [0.09, 0.21, 0.16]);
      addPart(elbow, 'Char_bag_handle', SHARED_GEO.box, SHARED_MAT.gold, [0.04, -0.235, 0], [0.02, 0.04, 0.08]);
    }

    shoulder.rotation.z = side * 0.07;
    arms.push(shoulder);
    elbows.push(elbow);
  }

  if (seated) {
    for (const l of legs) {
      l.rotation.x = f > 0 ? -Math.PI / 2.2 : Math.PI / 2.2;
    }
  }

  if (pickableData) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.userData = { ...o.userData, ...pickableData };
        if (pickables) pickables.push(o);
      }
    });
  }

  return { root, head, arms, elbows, legs };
}
