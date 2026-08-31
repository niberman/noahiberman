import * as THREE from "three";
import { PALETTE, type FlyoverAssets } from "../types";
import { EXAG, FOG_DENSITY, hexToRgb } from "./frame";

const VERT = /* glsl */ `
uniform sampler2D uHeight;
uniform vec2 uTexel;
uniform vec2 uCell;
uniform float uKapaElev;
uniform float uExag;
varying vec2 vUv;
varying float vElev;
varying vec3 vNormal;
varying float vDist;

void main() {
  vUv = uv;
  // heightmap row 0 = north; plane uv.y = 1 at the north edge
  vec2 hUv = vec2(uv.x, 1.0 - uv.y);
  float hC = texture2D(uHeight, hUv).r;
  float hL = texture2D(uHeight, hUv - vec2(uTexel.x, 0.0)).r;
  float hR = texture2D(uHeight, hUv + vec2(uTexel.x, 0.0)).r;
  float hN = texture2D(uHeight, hUv - vec2(0.0, uTexel.y)).r;
  float hS = texture2D(uHeight, hUv + vec2(0.0, uTexel.y)).r;
  vElev = hC;
  vec3 p = position;
  p.y = (hC - uKapaElev) * uExag;
  // central differences; +v in the height texture is south = +z in scene space
  float dhdx = (hR - hL) / (2.0 * uCell.x);
  float dhdz = (hS - hN) / (2.0 * uCell.y);
  vNormal = normalize(vec3(-uExag * dhdx, 1.0, -uExag * dhdz));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uPeak;
uniform vec3 uWire;
uniform vec3 uFogColor;
uniform float uMinElev;
uniform float uMaxElev;
uniform float uFogDensity;
uniform float uSolid;
uniform float uGrid;
varying vec2 vUv;
varying float vElev;
varying vec3 vNormal;
varying float vDist;

void main() {
  float e = clamp((vElev - uMinElev) / (uMaxElev - uMinElev), 0.0, 1.0);
  vec3 ramp = mix(uLow, uMid, smoothstep(0.0, 0.4, e));
  ramp = mix(ramp, uHigh, smoothstep(0.4, 0.75, e));
  ramp = mix(ramp, uPeak, smoothstep(0.75, 1.0, e));
  vec3 L = normalize(vec3(-0.55, 0.7, -0.45)); // NW-high
  vec3 N = normalize(vNormal);
  // ambient floor + diffuse + up-facing sky fill — slopes away from the sun
  // must still read on a near-black page, not vanish into it
  float light = 0.38 + 0.5 * max(dot(N, L), 0.0) + 0.25 * max(N.y, 0.0);
  vec3 solid = ramp * light;

  // intro wireframe look: fwidth-antialiased grid lines, brighter with elevation
  vec2 g = vUv * uGrid;
  vec2 d = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(d.x, d.y), 1.0);
  vec3 wire = uLow + uWire * line * (0.35 + 0.65 * e);

  vec3 col = mix(wire, solid, uSolid);
  float fog = 1.0 - exp(-pow(vDist * uFogDensity, 2.0));
  gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
}
`;

export interface TerrainLayer {
  mesh: THREE.Mesh;
  setSolid(v: number): void;
  dispose(): void;
}

export function buildTerrain(
  renderer: THREE.WebGLRenderer,
  assets: FlyoverAssets,
  mobile: boolean,
): TerrainLayer {
  const { terrain, height } = assets;
  const [w, h] = terrain.size;
  const [dx, dy] = terrain.cell;
  const W = w * dx;
  const H = h * dy;
  const seg = mobile ? 256 : 512;

  let tex: THREE.DataTexture;
  if (renderer.extensions.has("OES_texture_float_linear")) {
    tex = new THREE.DataTexture(height, w, h, THREE.RedFormat, THREE.FloatType);
  } else {
    // half-float linear filtering is core WebGL2; ~2 m quantization at peak elevations is invisible
    const half = new Uint16Array(height.length);
    for (let i = 0; i < height.length; i++) half[i] = THREE.DataUtils.toHalfFloat(height[i]);
    tex = new THREE.DataTexture(half, w, h, THREE.RedFormat, THREE.HalfFloatType);
  }
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(W, H, seg, seg);
  geo.rotateX(-Math.PI / 2); // XY plane -> XZ, +uv.y = north = -z

  const rgb = (hex: string) => new THREE.Vector3(...hexToRgb(hex));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    // insurance for camera dips below ridge lines: backfaces render as ground
    // instead of a see-through hole
    side: THREE.DoubleSide,
    uniforms: {
      uHeight: { value: tex },
      uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      uCell: { value: new THREE.Vector2(dx, dy) },
      uKapaElev: { value: terrain.kapaElev },
      uExag: { value: EXAG },
      uMinElev: { value: terrain.minElev },
      uMaxElev: { value: terrain.maxElev },
      uLow: { value: rgb(PALETTE.terrainLow) },
      uMid: { value: rgb(PALETTE.terrainMid) },
      uHigh: { value: rgb(PALETTE.terrainHigh) },
      uPeak: { value: rgb(PALETTE.terrainPeak) },
      uWire: { value: rgb(PALETTE.airplane) },
      uFogColor: { value: rgb(PALETTE.fog) },
      uFogDensity: { value: FOG_DENSITY },
      uSolid: { value: 0 },
      // ponytail: grid every 4th segment — full density dissolves into haze from the intro vantage
      uGrid: { value: seg / 4 },
    },
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(terrain.sw[0] + W / 2, 0, -(terrain.sw[1] + H / 2));
  mesh.frustumCulled = false; // GPU displacement invalidates the flat bounding box

  return {
    mesh,
    setSolid(v: number) {
      material.uniforms.uSolid.value = v;
    },
    dispose() {
      geo.dispose();
      material.dispose();
      tex.dispose();
    },
  };
}
