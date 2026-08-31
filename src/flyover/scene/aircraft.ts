import * as THREE from "three";

// Low-poly twin, nose along -Z, origin at the c.g., ~120-unit wingspan.
export function buildAircraft(): { group: THREE.Group; dispose(): void } {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a4066,
    emissive: 0x40307a,
    emissiveIntensity: 0.9, // must read against black terrain at chase distance
    flatShading: true,
    roughness: 0.85,
    metalness: 0.1,
  });

  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
  };

  const fuselage = new THREE.CylinderGeometry(5, 5, 64, 8);
  fuselage.rotateX(Math.PI / 2);
  add(fuselage, 0, 0, 0);

  const nose = new THREE.ConeGeometry(5, 18, 8);
  nose.rotateX(-Math.PI / 2); // apex toward -Z
  add(nose, 0, 0, -41);

  // low wing
  add(new THREE.BoxGeometry(120, 2.5, 16), 0, -4.5, 2);

  for (const s of [-1, 1]) {
    const nacelle = new THREE.CylinderGeometry(3.5, 3.5, 18, 8);
    nacelle.rotateX(Math.PI / 2);
    add(nacelle, s * 24, -3, -2);
  }

  // conventional tail
  add(new THREE.BoxGeometry(2, 20, 14), 0, 9, 28); // vertical fin
  add(new THREE.BoxGeometry(44, 2, 11), 0, 2, 30); // horizontal stab

  return {
    group,
    dispose() {
      for (const g of geos) g.dispose();
      mat.dispose();
    },
  };
}
