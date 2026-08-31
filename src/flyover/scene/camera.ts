import * as THREE from "three";
import type { FlyoverAssets } from "../types";
import { EXAG } from "./frame";

const UP = new THREE.Vector3(0, 1, 0);
const EPS = 1e-3; // hero-parameter step for tangents
const V = 75; // assumed airspeed m/s for the bank estimate
const MAX_BANK = (35 * Math.PI) / 180;
const CHASE_BACK = 650;
const CHASE_UP = 200;
const CHASE_AHEAD = 900;
// aim below the flight path: puts the aircraft ~4° under the view axis —
// above the centered waypoint cards — and the horizon in the upper third
const CHASE_AIM_DOWN = 160;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

class Spring {
  value = 0;
  vel = 0;
  target = 0;
  constructor(
    private omega: number,
    private eps: number,
  ) {}
  snap(v: number) {
    this.value = this.target = v;
    this.vel = 0;
  }
  // critically damped, semi-implicit Euler (stable for omega*dt well under 2)
  step(dt: number) {
    const a = this.omega * this.omega * (this.target - this.value) - 2 * this.omega * this.vel;
    this.vel += a * dt;
    this.value += this.vel * dt;
  }
  settled() {
    return (
      Math.abs(this.target - this.value) < this.eps && Math.abs(this.vel) < this.eps * this.omega
    );
  }
}

const _sv = new THREE.Vector3();

class SpringV3 {
  readonly value = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  readonly target = new THREE.Vector3();
  constructor(
    private omega: number,
    private eps: number,
  ) {}
  snap(v: THREE.Vector3) {
    this.value.copy(v);
    this.target.copy(v);
    this.vel.set(0, 0, 0);
  }
  step(dt: number) {
    const w = this.omega;
    _sv.subVectors(this.target, this.value).multiplyScalar(w * w).addScaledVector(this.vel, -2 * w);
    this.vel.addScaledVector(_sv, dt);
    this.value.addScaledVector(this.vel, dt);
  }
  settled() {
    const w = this.omega;
    return (
      this.value.distanceToSquared(this.target) < this.eps * this.eps &&
      this.vel.lengthSq() < this.eps * this.eps * w * w
    );
  }
}

const _pos = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _back = new THREE.Vector3();
const _ta = new THREE.Vector3();
const _tb = new THREE.Vector3();
const _mtx = new THREE.Matrix4();

/** Hero-track sampling, aircraft pose (yaw/pitch/bank), and the sprung chase camera. */
export class ChaseRig {
  readonly camPos = new SpringV3(9.5, 0.5); // ~0.7 s settle
  readonly camTgt = new SpringV3(9.5, 0.5);
  private tSpring = new Spring(12, 1e-5);
  private bankSpring = new Spring(4, 1e-3);
  private pts: Float32Array;
  private n: number;
  private totalLen: number;

  constructor(
    assets: FlyoverAssets,
    private aircraft: THREE.Object3D,
  ) {
    const { hero, heroMeta, terrain } = assets;
    this.n = heroMeta.points;
    this.totalLen = Math.max(heroMeta.totalLen, 1);
    this.pts = new Float32Array(this.n * 3);
    for (let i = 0; i < this.n; i++) {
      const s = i * 3;
      this.pts[s] = hero[s];
      this.pts[s + 1] = (hero[s + 2] - terrain.kapaElev) * EXAG;
      this.pts[s + 2] = -hero[s + 1];
    }
    this.snapTo(0);
  }

  samplePos(t: number, out: THREE.Vector3) {
    const f = clamp01(t) * (this.n - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(i0 + 1, this.n - 1);
    const a = f - i0;
    const p = this.pts;
    const s0 = i0 * 3;
    const s1 = i1 * 3;
    out.set(
      p[s0] + (p[s1] - p[s0]) * a,
      p[s0 + 1] + (p[s1 + 1] - p[s0 + 1]) * a,
      p[s0 + 2] + (p[s1 + 2] - p[s0 + 2]) * a,
    );
    return out;
  }

  setT(t: number) {
    this.tSpring.target = clamp01(t);
  }

  update(dt: number) {
    this.tSpring.step(dt);
    const t = this.tSpring.value;
    const kappa = this.curvature(t);
    this.bankSpring.target = THREE.MathUtils.clamp(
      Math.atan2(V * V * kappa, 9.81) * 0.9,
      -MAX_BANK,
      MAX_BANK,
    );
    this.bankSpring.step(dt);
    this.pose(t, this.bankSpring.value);
    this.camPos.step(dt);
    this.camTgt.step(dt);
  }

  /** Jump every spring straight to its state at t (intro handoff, reduced motion). */
  snapTo(t: number) {
    this.tSpring.snap(clamp01(t));
    const kappa = this.curvature(this.tSpring.value);
    this.bankSpring.snap(
      THREE.MathUtils.clamp(Math.atan2(V * V * kappa, 9.81) * 0.9, -MAX_BANK, MAX_BANK),
    );
    this.pose(this.tSpring.value, this.bankSpring.value);
    this.camPos.snap(this.camPos.target);
    this.camTgt.snap(this.camTgt.target);
  }

  applyCamera(cam: THREE.Camera) {
    cam.position.copy(this.camPos.value);
    cam.lookAt(this.camTgt.value);
  }

  settled() {
    return (
      this.tSpring.settled() &&
      this.bankSpring.settled() &&
      this.camPos.settled() &&
      this.camTgt.settled()
    );
  }

  private tangent(t: number, out: THREE.Vector3) {
    const t0 = Math.min(clamp01(t), 1 - EPS);
    this.samplePos(t0, _ta);
    this.samplePos(t0 + EPS, out);
    out.sub(_ta);
    return out.lengthSq() > 1e-12 ? out.normalize() : out.set(0, 0, -1);
  }

  /** Compass-style heading in scene space: 0 = north (-z), increasing clockwise. */
  private heading(t: number) {
    this.tangent(t, _tb);
    return Math.atan2(_tb.x, -_tb.z);
  }

  /** Signed horizontal curvature (1/m) from heading rate over arc length; >0 = right turn. */
  private curvature(t: number) {
    const lo = Math.max(t - EPS, 0);
    const hi = Math.min(t + EPS, 1);
    let d = this.heading(hi) - this.heading(lo);
    if (d > Math.PI) d -= 2 * Math.PI;
    else if (d < -Math.PI) d += 2 * Math.PI;
    const ds = (hi - lo) * this.totalLen;
    return ds > 0 ? d / ds : 0;
  }

  private pose(t: number, bank: number) {
    this.samplePos(t, _pos);
    const fwd = this.tangent(t, _fwd);
    _right.crossVectors(fwd, UP);
    if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
    _right.normalize();
    // positive rotation about fwd tips the top toward the right wing = right roll
    _up.crossVectors(_right, fwd).applyAxisAngle(fwd, bank);
    _right.crossVectors(fwd, _up);
    _back.copy(fwd).negate();
    _mtx.makeBasis(_right, _up, _back); // model nose is -Z
    this.aircraft.quaternion.setFromRotationMatrix(_mtx);
    this.aircraft.position.copy(_pos);
    this.camPos.target.copy(_pos).addScaledVector(fwd, -CHASE_BACK).addScaledVector(UP, CHASE_UP);
    this.camTgt.target.copy(_pos).addScaledVector(fwd, CHASE_AHEAD).addScaledVector(UP, -CHASE_AIM_DOWN);
  }
}
