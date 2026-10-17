import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { EscalatorView } from '../src/escalator-view.js';
import { clearSignTextureCache, hotelSignTexture } from '../src/hotel-sign.js';
import { batchStaticMeshes } from '../src/render-optimization.js';

test('static repeated geometry batches preserve world shape and leave animated and interactive objects intact', () => {
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry();
  const mat = new THREE.MeshBasicMaterial();
  root.position.y = 7;

  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.position.x = i * 2;
    m.name = `wall${i}`;
    root.add(m);
  }

  const door = new THREE.Group();
  const panel = new THREE.Mesh(geo, mat);
  panel.userData.action = 'door';
  door.add(panel);
  root.add(door);

  const moving = new THREE.Mesh(geo, mat);
  moving.userData.dynamic = true;
  root.add(moving);

  batchStaticMeshes(root);
  assert.equal(root.children.filter((o) => o.userData.sourceNames).length, 1);
  assert.ok(panel.parent === door && moving.parent === root);

  root.updateMatrixWorld(true);
  const h = new THREE.Raycaster(new THREE.Vector3(4, 7, 3), new THREE.Vector3(0, 0, -1)).intersectObjects(
    root.children,
    true
  )[0];
  assert.ok(h.object.userData.sourceNames.includes('wall2'));
  assert.equal(h.point.z, 0.5);
});

test('instanced escalator treads stay on their lanes and update only visible storeys', () => {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect() {},
        strokeRect() {},
        fillText() {},
      }),
    }),
  };
  try {
    const e = new EscalatorView(new THREE.Scene());
    e.updateVisibility(5, true);
    e.update(2, false);
    const m = new THREE.Matrix4();
    const f = e.flights.find((flight) => flight.floor === 5);
    assert.equal(f.stepMesh.count, 24);
    f.stepMesh.getMatrixAt(0, m);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    assert.ok(p.x >= -10 && p.x <= -4);
    assert.ok(Math.abs(p.z - f.z) < 1e-6);
    assert.ok(p.y >= -0.085 && p.y <= 3.5);
    const frozen = m.clone();
    e.update(9, true);
    f.stepMesh.getMatrixAt(0, m);
    assert.ok(m.equals(frozen));
    const hidden = e.flights.find((flight) => flight.floor === 0);
    assert.equal(hidden.stepMesh.instanceMatrix.version, 0);
  } finally {
    globalThis.document = previous;
  }
});

test('hotelSignTexture memoizes identical sign textures and supports custom dimensions', () => {
  const previous = globalThis.document;
  let canvasCount = 0;
  globalThis.document = {
    createElement: () => {
      canvasCount++;
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          fillRect() {},
          strokeRect() {},
          fillText() {},
        }),
      };
    },
  };
  try {
    clearSignTextureCache();
    const texA = hotelSignTexture(['계단 · STAIRS', '1층 · 로비']);
    const texB = hotelSignTexture(['계단 · STAIRS', '1층 · 로비']);
    assert.equal(texA, texB);
    assert.equal(canvasCount, 1);

    const texSmall = hotelSignTexture(['302', 'ROOM'], { width: 256, height: 128 });
    assert.notEqual(texA, texSmall);
    assert.equal(texSmall.image.width, 256);
    assert.equal(texSmall.image.height, 128);
    assert.equal(canvasCount, 2);
  } finally {
    clearSignTextureCache();
    globalThis.document = previous;
  }
});
