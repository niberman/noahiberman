import * as THREE from "three";
import { PALETTE, type FlyoverAssets } from "../types";
import { EXAG, FOG_DENSITY, hexToRgb } from "./frame";

const VERT = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute float aReveal;
attribute float aClass;
uniform float uReveal;
uniform float uWidthPx;
uniform float uAlpha;
uniform vec2 uResolution;
uniform float uFogDensity;
varying float vSide;
varying float vClass;
varying float vAlpha;

void main() {
  vSide = uv.y;
  vClass = aClass;
  vec4 clipA = projectionMatrix * modelViewMatrix * vec4(aStart, 1.0);
  vec4 clipB = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
  // ponytail: also collapses segments touching the camera plane — screen-space
  // extrusion misprojects across w<=0 and proper clip-space clipping isn't worth it here
  if (aReveal > uReveal || clipA.w < 0.1 || clipB.w < 0.1) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    vAlpha = 0.0;
    return;
  }
  vec2 ndcA = clipA.xy / clipA.w;
  vec2 ndcB = clipB.xy / clipB.w;
  vec2 dir = (ndcB - ndcA) * uResolution;
  float len = length(dir);
  dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 clip = mix(clipA, clipB, uv.x);
  // half-width uWidthPx/2 per side; px -> ndc is 2/resolution
  clip.xy += nrm * (uWidthPx / uResolution) * clip.w * uv.y;
  vec3 mid = mix(aStart, aEnd, uv.x);
  float dist = length((modelViewMatrix * vec4(mid, 1.0)).xyz);
  float fog = exp(-pow(dist * uFogDensity, 2.0));
  // drawing tip glows: segments at the reveal head render full-bright, body at uAlpha
  float head = smoothstep(uReveal - 0.004, uReveal, aReveal);
  vAlpha = mix(uAlpha, 1.0, head) * fog;
  gl_Position = clip;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColorAirplane;
uniform vec3 uColorHeli;
varying float vSide;
varying float vClass;
varying float vAlpha;

void main() {
  float lat = pow(1.0 - abs(vSide), 2.0);
  gl_FragColor = vec4(mix(uColorAirplane, uColorHeli, vClass), vAlpha * lat);
}
`;

export interface TrackLayer {
  group: THREE.Group;
  setReveal(v: number): void;
  setResolution(w: number, h: number): void;
  dispose(): void;
}

export function buildTracks(assets: FlyoverAssets, mobile: boolean): TrackLayer {
  const { tracks: pts, tracksIndex, terrain } = assets;
  const kapa = terrain.kapaElev;

  let total = 0;
  for (const t of tracksIndex.tracks) total += Math.max(t.n - 1, 0);
  const denom = Math.max(total, 1);

  const starts = new Float32Array(total * 3);
  const ends = new Float32Array(total * 3);
  const reveal = new Float32Array(total);
  const cls = new Float32Array(total);
  let k = 0;
  for (const t of tracksIndex.tracks) {
    for (let i = 0; i < t.n - 1; i++, k++) {
      const a = (t.o + i) * 3;
      const b = a + 3;
      const o = k * 3;
      starts[o] = pts[a];
      starts[o + 1] = (pts[a + 2] - kapa) * EXAG;
      starts[o + 2] = -pts[a + 1];
      ends[o] = pts[b];
      ends[o + 1] = (pts[b + 2] - kapa) * EXAG;
      ends[o + 2] = -pts[b + 1];
      // global chronological draw order: 0 shows nothing, 1 shows everything
      reveal[k] = (k + 1) / denom;
      cls[k] = t.c;
    }
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.instanceCount = total;
  // base quad: uv.x picks start/end, uv.y = extrusion side in {-1, 1}
  geo.setIndex([0, 2, 1, 2, 3, 1]);
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  geo.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), 2),
  );
  geo.setAttribute("aStart", new THREE.InstancedBufferAttribute(starts, 3));
  geo.setAttribute("aEnd", new THREE.InstancedBufferAttribute(ends, 3));
  geo.setAttribute("aReveal", new THREE.InstancedBufferAttribute(reveal, 1));
  geo.setAttribute("aClass", new THREE.InstancedBufferAttribute(cls, 1));

  const shared = {
    uReveal: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  };
  const mkMat = (widthPx: number, alpha: number) =>
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uReveal: shared.uReveal,
        uResolution: shared.uResolution,
        uWidthPx: { value: widthPx },
        uAlpha: { value: alpha },
        uFogDensity: { value: FOG_DENSITY },
        uColorAirplane: { value: new THREE.Vector3(...hexToRgb(PALETTE.airplane)) },
        uColorHeli: { value: new THREE.Vector3(...hexToRgb(PALETTE.helicopter)) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, // screen-space extrusion flips winding with view direction
    });

  const group = new THREE.Group();
  const coreMat = mkMat(1.6, 0.85);
  const core = new THREE.Mesh(geo, coreMat);
  core.frustumCulled = false;
  group.add(core);

  let glowMat: THREE.ShaderMaterial | null = null;
  if (!mobile) {
    glowMat = mkMat(8, 0.18);
    const glow = new THREE.Mesh(geo, glowMat);
    glow.frustumCulled = false;
    group.add(glow);
  }

  return {
    group,
    setReveal(v: number) {
      shared.uReveal.value = v;
    },
    setResolution(w: number, h: number) {
      shared.uResolution.value.set(w, h);
    },
    dispose() {
      geo.dispose();
      coreMat.dispose();
      glowMat?.dispose();
    },
  };
}
