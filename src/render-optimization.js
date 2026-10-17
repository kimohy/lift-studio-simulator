import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Batch within one storey so floor visibility and moving doors remain independent.
export function batchStaticMeshes(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map();

  root.traverse((o) => {
    if (
      !o.isMesh ||
      o.isInstancedMesh ||
      !o.visible ||
      Array.isArray(o.material) ||
      o.material.transparent ||
      o.userData.action
    ) {
      return;
    }
    for (let p = o; p && p !== root; p = p.parent) {
      if (p.userData.dynamic) return;
    }
    const key = o.material;
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(o);
  });

  for (const [material, list] of groups) {
    if (list.length < 3) continue;
    const geometries = list.map((o) => {
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
      return geo;
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!geometry) continue;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Static_surface_batch';
    mesh.userData.sourceNames = list.map((o) => o.name);
    geometry.computeBoundingSphere();
    root.add(mesh);
    for (const o of list) o.removeFromParent();
  }
}
