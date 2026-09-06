import * as THREE from "three";
import {
  PALETTE,
  type FlyoverAssets,
  type FlyoverScene,
  type FlyoverSceneOpts,
} from "../types";
import { FOG_DENSITY } from "./frame";
import { buildTerrain } from "./terrain";
import { buildTracks } from "./tracks";
import { buildAircraft } from "./aircraft";
import { ChaseRig } from "./camera";

// intro vantage: high above and SE of KAPA, looking WSW over the terrain toward the mountains
const VANTAGE_POS = new THREE.Vector3(20000, 16000, 24000);
const VANTAGE_TARGET = new THREE.Vector3(-80000, 0, 40000);
const SOLID_DUR = 1.25;
const REVEAL_DUR = 7.2;
const BLEND_DUR = 1.35;
// past 1 so the smoothstep draw-tip glow is fully retired once the intro ends
const REVEAL_DONE = 1.02;

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

type Phase = "solid" | "reveal" | "blend" | "done";

export function createFlyoverScene(
  canvas: HTMLCanvasElement,
  assets: FlyoverAssets,
  opts: FlyoverSceneOpts,
): FlyoverScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(new THREE.Color(PALETTE.fog));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.fog, FOG_DENSITY);
  const camera = new THREE.PerspectiveCamera(55, 1, 20, 450000);

  const terrain = buildTerrain(renderer, assets, opts.mobile);
  const tracks = buildTracks(assets, opts.mobile);
  const aircraft = buildAircraft();
  scene.add(terrain.mesh, tracks.group, aircraft.group);

  const sun = new THREE.DirectionalLight(0xd8ccff, 1.8);
  sun.position.set(-0.55, 0.7, -0.45); // direction only, matches the terrain shader light
  scene.add(sun, new THREE.AmbientLight(0x40365a, 0.8));

  const rig = new ChaseRig(assets, aircraft.group);

  // Constructs fully drawn (FlyoverBackground contract): the first rendered
  // frame — what the poster crossfades into, and all an intro-seen or
  // reduced-motion visitor ever gets — is the finished scene. startIntro()
  // rewinds, then plays.
  terrain.setSolid(1);
  tracks.setReveal(REVEAL_DONE);
  rig.snapTo(opts.reducedMotion ? 0.4 : 0);

  let phase: Phase = "done";
  let elapsed = 0;
  let introPromise: Promise<void> | null = null;
  let introResolve: (() => void) | null = null;
  let running = false;
  let rafId = 0;
  let last = 0;
  let tTarget = 0;
  let tRendered = -1;
  const blendFromPos = new THREE.Vector3();
  const blendFromTgt = new THREE.Vector3();
  const mixPos = new THREE.Vector3();
  const mixTgt = new THREE.Vector3();

  function step(dt: number, force = false) {
    if (phase === "solid") {
      elapsed += dt;
      terrain.setSolid(easeInOutCubic(Math.min(elapsed / SOLID_DUR, 1)));
      if (elapsed >= SOLID_DUR) {
        phase = "reveal";
        elapsed = 0;
      }
    } else if (phase === "reveal") {
      elapsed += dt;
      tracks.setReveal(easeInOutQuad(Math.min(elapsed / REVEAL_DUR, 1)));
      if (elapsed >= REVEAL_DUR) {
        phase = "blend";
        elapsed = 0;
        rig.snapTo(tTarget); // seed the chase springs so the blend lands seamlessly
        blendFromPos.copy(VANTAGE_POS);
        blendFromTgt.copy(VANTAGE_TARGET);
      }
    } else if (phase === "blend") {
      elapsed += dt;
    }

    rig.update(dt);

    if (phase === "blend") {
      const k = easeInOutCubic(Math.min(elapsed / BLEND_DUR, 1));
      tracks.setReveal(1 + (REVEAL_DONE - 1) * k);
      camera.position.copy(mixPos.lerpVectors(blendFromPos, rig.camPos.value, k));
      camera.lookAt(mixTgt.lerpVectors(blendFromTgt, rig.camTgt.value, k));
      if (elapsed >= BLEND_DUR) {
        phase = "done";
        introResolve?.();
        introResolve = null;
      }
    } else if (phase === "done") {
      rig.applyCamera(camera);
    } else {
      camera.position.copy(VANTAGE_POS);
      camera.lookAt(VANTAGE_TARGET);
    }

    const introActive = phase === "solid" || phase === "reveal" || phase === "blend";
    const skip =
      !force && !introActive && rig.settled() && Math.abs(tTarget - tRendered) < 1e-4;
    if (!skip) {
      renderer.render(scene, camera);
      tRendered = tTarget;
    }
  }

  function tick(now: number) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
  }

  const api: FlyoverScene = {
    async compile() {
      const r = renderer as THREE.WebGLRenderer & {
        compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown>;
      };
      if (typeof r.compileAsync === "function") await r.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    },
    renderOnce() {
      step(0, true);
    },
    startIntro() {
      if (opts.reducedMotion) {
        terrain.setSolid(1);
        tracks.setReveal(REVEAL_DONE);
        rig.snapTo(0.4);
        phase = "done";
        step(0, true);
        return Promise.resolve();
      }
      if (introPromise) return introPromise;
      terrain.setSolid(0);
      tracks.setReveal(0);
      phase = "solid";
      elapsed = 0;
      introPromise = new Promise<void>((res) => {
        introResolve = res;
      });
      return introPromise;
    },
    setT(t: number) {
      if (opts.reducedMotion) return;
      tTarget = Math.min(Math.max(t, 0), 1);
      rig.setT(tTarget);
    },
    setRunning(run: boolean) {
      if (run === running) return;
      running = run;
      if (run) {
        last = performance.now();
        rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
      }
    },
    resize() {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      tracks.setResolution(w * dpr, h * dpr);
      tRendered = -1; // force a redraw even if settled
    },
    dispose() {
      api.setRunning(false);
      terrain.dispose();
      tracks.dispose();
      aircraft.dispose();
      renderer.dispose();
    },
  };

  api.resize();
  return api;
}
