// Feel helpers: streak aura, place trails, tell flash helpers.
import * as THREE from 'three';
import { PLAT_Y } from './arena.js';

/** Expanding glow disc under a point (RPS streak / react GO / XO win). */
export class StreakAura {
  constructor(scene) {
    const geo = new THREE.RingGeometry(0.55, 1.05, 48);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.t = 0; this.power = 0;
  }
  pulse(x, z, power = 1, y = PLAT_Y + 0.04) {
    this.mesh.position.set(x, y, z);
    this.power = Math.max(this.power, power);
    this.t = 0; this.mesh.visible = true;
  }
  update(dt, color) {
    if (this.power <= 0) { this.mesh.visible = false; return; }
    this.t += dt;
    const k = Math.min(1, this.t / 0.55);
    this.mesh.scale.setScalar(1 + k * (0.9 + this.power * 0.4));
    if (color) this.mat.color.copy(color);
    this.mat.opacity = (1 - k) * (0.38 + this.power * 0.18);
    if (k >= 1) { this.power *= 0.35; this.t = 0; if (this.power < 0.15) { this.power = 0; this.mesh.visible = false; } }
  }
}

/** Short additive streak upward from a placement / flip. */
export function placeTrail(particles, pos, color, count = 12) {
  const v = new THREE.Vector3(), p = new THREE.Vector3();
  for (let n = 0; n < count; n++) {
    const t = n / count;
    p.set(pos.x + (Math.random() - 0.5) * 0.2, pos.y + 0.05 + t * 0.3, pos.z + (Math.random() - 0.5) * 0.2);
    v.set((Math.random() - 0.5) * 1.2, 2.2 + Math.random() * 2.2, (Math.random() - 0.5) * 1.2);
    particles.emit(p, v, color, { life: 0.2 + Math.random() * 0.18, size: 0.45 + Math.random() * 0.35, grav: -2, drag: 2.2, bright: 3.2 });
  }
}

/** Dense shatter burst for RPS loser (tiered by streak). */
export function shatterBurst(particles, waves, pos, color, tier = 0) {
  const n = 40 + tier * 25;
  particles.burst(pos, color, n, { speed: 5 + tier * 2, up: 3 + tier, life: 0.7 + tier * 0.15, size: 0.9 + tier * 0.2 });
  waves.spawn(pos.clone().setY(PLAT_Y + 0.05), color, { r0: 0.3, r1: 3.5 + tier, h: 0.55 + tier * 0.15, dur: 0.55 + tier * 0.1 });
}
