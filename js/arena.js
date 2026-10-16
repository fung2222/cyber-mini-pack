// 3D arena: floating platform + per-mode props (RPS sigils, XO board, reaction orb) + holo opponent head.
// Slice B+: tell flash, multi-lane orbs, fog/hazard/echo/virus marks, ring shrink toward GO.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { U } from 'cyber-kit/core/theme.js';

export const PLAT_Y = 3.2;
const edges = (geo, color, m = 2.4) => new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(m) }));
const glass = (color, o = 0.35) => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.25), emissive: new THREE.Color(color).multiplyScalar(0.35), metalness: 0.4, roughness: 0.25, transparent: true, opacity: o + 0.4 });
const easeOutBack = k => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

export function makeSigil(kind, color) {
  const g = new THREE.Group();
  if (kind === 'rock') { const geo = new THREE.DodecahedronGeometry(0.62, 0); g.add(new THREE.Mesh(geo, glass(color)), edges(geo, color)); }
  else if (kind === 'paper') { const geo = new THREE.BoxGeometry(1.0, 0.06, 1.3); const m = new THREE.Mesh(geo, glass(color, 0.2)); m.rotation.x = -0.9; const e = edges(geo, color); e.rotation.x = -0.9; g.add(m, e); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.01, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2) })); l.position.set(0, 0.04, -0.4 + i * 0.25); const w = new THREE.Group(); w.rotation.x = -0.9; w.add(l); g.add(w); } }
  else { for (const s of [-1, 1]) { const arm = new THREE.Group(); const bl = new THREE.BoxGeometry(0.12, 0.06, 1.2); const b = new THREE.Mesh(bl, glass(color)); b.position.z = -0.35; arm.add(b); const e = edges(bl, color); e.position.z = -0.35; arm.add(e); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2) })); ring.rotation.x = Math.PI / 2; ring.position.set(s * 0.18, 0, 0.42); arm.add(ring); arm.rotation.y = s * 0.32; g.add(arm); } g.rotation.x = -0.6; }
  return g;
}

export class Arena {
  constructor(scene) {
    this.scene = scene; this.root = new THREE.Group(); scene.add(this.root);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0x07060f, metalness: 0.9, roughness: 0.3 }));
    disc.position.y = PLAT_Y - 0.25; this.root.add(disc);
    this.topU = { uTime: U.uTime, uC1: U.uC1, uC2: U.uC2, uPulse: { value: new THREE.Vector4(0, 0, -99, 0) } };
    const top = new THREE.Mesh(new THREE.CircleGeometry(5.15, 64), new THREE.ShaderMaterial({ uniforms: this.topU,
      vertexShader: /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`uniform float uTime; uniform vec3 uC1, uC2; uniform vec4 uPulse; varying vec2 vP;
        void main(){ float r = length(vP); vec3 col = vec3(0.01, 0.008, 0.025);
          col += uC1 * exp(-abs(r - 5.0) * 14.0) * 0.9 + uC2 * exp(-abs(r - 4.4) * 30.0) * 0.35;
          float a = atan(vP.y, vP.x); col += uC1 * step(0.97, fract(a * 6.0 / 3.14159 + uTime * 0.05)) * smoothstep(4.9, 3.0, r) * 0.08;
          vec2 g = abs(fract(vP * 1.2) - 0.5); col += uC2 * smoothstep(0.03, 0.0, min(g.x, g.y)) * 0.05 * smoothstep(5.0, 2.0, r);
          float age = uTime - uPulse.z; if (age > 0.0 && age < 1.4) col += uC2 * exp(-pow((length(vP - uPulse.xy) - age * 6.0) * 3.0, 2.0)) * (1.0 - age / 1.4) * uPulse.w;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }` }));
    top.rotation.x = -Math.PI / 2; top.position.y = PLAT_Y + 0.001; this.root.add(top);
    this.rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(5.25, 0.035, 8, 96), this.rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = PLAT_Y; this.root.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(5.62, 0.025, 8, 96), this.rimMat); rim2.rotation.x = Math.PI / 2; rim2.position.y = PLAT_Y - 0.5; this.root.add(rim2);
    this.head = new THREE.Group(); this.head.position.set(0, PLAT_Y + 2.6, -4.2); this.root.add(this.head);
    const hg = new THREE.IcosahedronGeometry(0.9, 1); this.headMat = glass(0xff2bd6, 0.1); this.headEdge = edges(hg, 0xff2bd6, 2);
    this.head.add(new THREE.Mesh(hg, this.headMat), this.headEdge);
    this.visor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.visor.position.set(0, 0.1, 0.78); this.head.add(this.visor);
    this.headColor = new THREE.Color(0xff2bd6); this.headMood = 0; this.headTilt = 0;
    this.tellSigil = null; this.tellT = 0;
    this.buildRPS(); this.buildXO(); this.buildReact(); this.buildAttract();
    this.setMode('attract');
  }
  setHeadColor(hex) { this.headColor.set(hex); this.headEdge.material.color.set(hex).multiplyScalar(2); this.headMat.emissive.set(hex).multiplyScalar(0.35); }
  pulse(x, z, s = 1) { this.topU.uPulse.value.set(x, -z, U.uTime.value, s); }
  setMode(m) {
    this.mode = m; this.rps.visible = m === 'rps'; this.xo.visible = m === 'xo'; this.react.visible = m === 'react'; this.attract.visible = m === 'attract';
    this.head.visible = m === 'rps' || m === 'xo'; this.clearTell();
    if (m !== 'xo') this.setFog(false);
  }

  // ---------------- RPS
  buildRPS() {
    this.rps = new THREE.Group(); this.root.add(this.rps);
    this.pads = [];
    for (const [z, c] of [[2.3, 0x00e5ff], [-2.3, 0xff2bd6]]) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0x0b0818, metalness: 0.8, roughness: 0.3 }));
      pad.position.set(0, PLAT_Y + 0.1, z); this.rps.add(pad); const e = edges(pad.geometry, c, 2.2); e.position.copy(pad.position); this.rps.add(e);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2) })); orb.position.set(0, PLAT_Y + 1.4, z); this.rps.add(orb);
      this.pads.push({ z, c, orb, sigil: null, anim: 1 });
    }
  }
  showTell(kind) {
    this.clearTell();
    const g = makeSigil(kind, 0xffc22b);
    g.position.set(0, PLAT_Y + 3.6, -4.2); g.scale.setScalar(0.55);
    this.head.add(g); this.tellSigil = g; this.tellT = 0.7;
  }
  clearTell() { if (this.tellSigil) { this.head.remove(this.tellSigil); this.tellSigil = null; } this.tellT = 0; }
  showSigils(p, a) {
    this.clearTell();
    this.pads.forEach((pd, i) => { if (pd.sigil) this.rps.remove(pd.sigil); pd.sigil = makeSigil(i ? a : p, pd.c); pd.sigil.position.set(0, PLAT_Y + 1.3, pd.z); pd.sigil.scale.setScalar(0.01); this.rps.add(pd.sigil); pd.anim = 0; pd.orb.visible = false; });
  }
  clearSigils() { for (const pd of this.pads) { if (pd.sigil) this.rps.remove(pd.sigil); pd.sigil = null; pd.orb.visible = true; } }
  sigilPos(i) { return this.pads[i].sigil ? this.pads[i].sigil.position.clone() : new THREE.Vector3(0, PLAT_Y + 1.3, this.pads[i].z); }
  shatter(i) { const pd = this.pads[i]; if (pd.sigil) pd.dead = 0; }

  // ---------------- XO
  buildXO() {
    this.xo = new THREE.Group(); this.root.add(this.xo); this.cells = []; this.marks = [];
    const geo = new RoundedBoxGeometry(1.5, 0.14, 1.5, 2, 0.05);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0c0920, metalness: 0.7, roughness: 0.35, emissive: new THREE.Color(0), transparent: true, opacity: 1 }));
      const x = (i % 3 - 1) * 1.7, z = (Math.floor(i / 3) - 1) * 1.7; m.position.set(x, PLAT_Y + 0.07, z); m.userData.cell = i; this.xo.add(m);
      const e = edges(geo, 0x00e5ff, 1.2); e.position.copy(m.position); this.xo.add(e);
      this.cells.push({ m, e, x, z, baseY: PLAT_Y + 0.07 });
    }
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.beam.visible = false; this.xo.add(this.beam);
    this.hazardMesh = null; this.echoMesh = null; this.virusMesh = null; this.fogOn = false; this.hoverCell = -1;
    this.ghostX = new THREE.Group(); this.ghostX.visible = false;
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e5ff).multiplyScalar(1.4), transparent: true, opacity: 0.35 })); b.rotation.y = s * Math.PI / 4; this.ghostX.add(b); }
    this.xo.add(this.ghostX);
  }
  setFog(on) { this.fogOn = !!on; this._applyFog(); }
  _applyFog() {
    this.cells.forEach((c, k) => {
      const hot = k === this.hoverCell;
      if (this.fogOn) { c.m.material.opacity = hot ? 1 : 0.22; c.m.material.emissive.setScalar(hot ? 0.14 : 0.02); c.e.visible = hot; }
      else { c.m.material.opacity = 1; c.e.visible = true; }
    });
  }
  setHazard(i) {
    if (this.hazardMesh) { this.xo.remove(this.hazardMesh); this.hazardMesh = null; }
    if (i < 0) return;
    const c = this.cells[i];
    const g = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3b5c).multiplyScalar(1.8), transparent: true, opacity: 0.55 }));
    g.position.set(c.x, PLAT_Y + 0.2, c.z); this.xo.add(g); this.hazardMesh = g;
  }
  setEcho(i) {
    if (this.echoMesh) { this.xo.remove(this.echoMesh); this.echoMesh = null; }
    if (i < 0) return;
    const c = this.cells[i];
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e5ff).multiplyScalar(2), transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(c.x, PLAT_Y + 0.25, c.z); this.xo.add(ring); this.echoMesh = ring;
  }
  setVirus(i) {
    if (this.virusMesh) { this.xo.remove(this.virusMesh); this.virusMesh = null; }
    if (i < 0) return;
    const c = this.cells[i];
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3bff8a).multiplyScalar(2.2) }));
    g.add(core); g.position.set(c.x, PLAT_Y + 0.55, c.z); this.xo.add(g); this.virusMesh = g;
  }
  xoClear() {
    for (const m of this.marks) this.xo.remove(m.g); this.marks = []; this.beam.visible = false;
    this.setHazard(-1); this.setEcho(-1); this.setVirus(-1); this.ghostX.visible = false;
    this.xo.rotation.y = 0;
  }
  xoPlace(i, who) {
    const c = this.cells[i]; const g = new THREE.Group(); g.position.set(c.x, PLAT_Y + 0.5, c.z);
    if (who === 'X') { for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e5ff).multiplyScalar(2.2) })); b.rotation.y = s * Math.PI / 4; g.add(b); } }
    else if (who === 'V') { /* virus handled via setVirus */ return; }
    else { const t = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.11, 12, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2bd6).multiplyScalar(2.2) })); t.rotation.x = Math.PI / 2; g.add(t); }
    g.scale.setScalar(0.01); this.xo.add(g); this.marks.push({ g, i, t: 0 });
  }
  xoUnplace(i) { const k = this.marks.findIndex(m => m.i === i); if (k >= 0) { this.xo.remove(this.marks[k].g); this.marks.splice(k, 1); } }
  xoLine(line, color) {
    const a = this.cells[line[0]], b = this.cells[line[2]]; const pa = new THREE.Vector3(a.x, PLAT_Y + 0.55, a.z), pb = new THREE.Vector3(b.x, PLAT_Y + 0.55, b.z);
    const len = pa.distanceTo(pb) + 1.4; this.beam.position.copy(pa).add(pb).multiplyScalar(0.5); this.beam.scale.set(1, len, 1);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize()); this.beam.material.color.set(color).multiplyScalar(3); this.beam.visible = true; this.beamT = 0;
  }
  setHoverCell(i) {
    this.hoverCell = i;
    if (this.fogOn) this._applyFog();
    else this.cells.forEach((c, k) => c.m.material.emissive.setScalar(k === i ? 0.12 : 0));
    if (i >= 0 && this.mode === 'xo') {
      const c = this.cells[i]; this.ghostX.position.set(c.x, PLAT_Y + 0.5, c.z); this.ghostX.visible = true;
    } else this.ghostX.visible = false;
  }
  pickCell(ray) { const h = ray.intersectObjects(this.cells.map(c => c.m), false)[0]; return h ? h.object.userData.cell : -1; }
  cellPos(i) { const c = this.cells[i]; return new THREE.Vector3(c.x, PLAT_Y + 0.5, c.z); }
  animateWarp(dt) { /* rotation handled in main via xo.rotation */ }

  // ---------------- reaction (1 or 3 lanes)
  buildReact() {
    this.react = new THREE.Group(); this.root.add(this.react);
    this.orbs = []; this.ringSets = [];
    for (let lane = 0; lane < 3; lane++) {
      const x = (lane - 1) * 2.4;
      const orbU = { uTime: U.uTime, uCol: { value: new THREE.Color(0xff2040) }, uPow: { value: 0.6 } };
      const orb = new THREE.Mesh(new THREE.SphereGeometry(lane === 1 ? 1.5 : 1.05, 40, 28), new THREE.ShaderMaterial({ uniforms: orbU,
        vertexShader: /* glsl */`varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */`uniform float uTime, uPow; uniform vec3 uCol; varying vec3 vN; varying vec3 vP;
          void main(){ float f = pow(1.0 - abs(vN.z), 2.0); float bands = 0.5 + 0.5 * sin(vP.y * 8.0 - uTime * 4.0); vec3 col = uCol * (0.15 + f * 1.4 + bands * 0.15) * (0.6 + uPow); gl_FragColor = vec4(col, 1.0); }` }));
      orb.position.set(x, PLAT_Y + 2.0, 0); this.react.add(orb);
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry((lane === 1 ? 2.0 : 1.4) + i * 0.4, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        r.position.copy(orb.position); this.react.add(r); rings.push(r);
      }
      this.orbs.push({ mesh: orb, u: orbU, col: new THREE.Color(0xff2040), state: 'idle', x });
      this.ringSets.push(rings);
    }
    this.orb = this.orbs[1].mesh; // legacy alias (mid)
    this.laneCount = 1; this.shrinkT = 0; this.shrinkDur = 0;
  }
  setLanes(n) {
    this.laneCount = n;
    this.orbs.forEach((o, i) => {
      const on = n === 1 ? i === 1 : true;
      o.mesh.visible = on; this.ringSets[i].forEach(r => { r.visible = on; });
    });
  }
  setOrb(state, lane = -1) {
    const apply = (o, st) => {
      o.state = st;
      o.col.set(st === 'go' ? 0x3bff8a : st === 'idle' ? 0x00e5ff : st === 'foul' ? 0xffc22b : st === 'nogo' ? 0xff2bd6 : 0xff2040);
    };
    if (lane < 0) this.orbs.forEach(o => { if (o.mesh.visible) apply(o, state); });
    else if (this.orbs[lane]) {
      this.orbs.forEach((o, i) => apply(o, i === lane ? state : (state === 'go' || state === 'nogo' ? 'wait' : state)));
    }
  }
  armShrink(dur) { this.shrinkT = 0; this.shrinkDur = Math.max(0.4, dur); }
  pickLane(ray) {
    const objs = this.orbs.filter(o => o.mesh.visible).map(o => o.mesh);
    const h = ray.intersectObjects(objs, false)[0];
    if (!h) return -1;
    return this.orbs.findIndex(o => o.mesh === h.object);
  }

  // ---------------- attract showcase
  buildAttract() {
    this.attract = new THREE.Group(); this.root.add(this.attract);
    const items = [makeSigil('rock', 0x00e5ff), makeSigil('scissors', 0xff2bd6), makeSigil('paper', 0xfff35c)];
    const o = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.11, 12, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2bd6).multiplyScalar(2) }));
    const x = new THREE.Group(); for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00e5ff).multiplyScalar(2) })); b.rotation.y = s * Math.PI / 4; x.add(b); }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3bff8a).multiplyScalar(1.6) }));
    this.showcase = [...items, o, x, orb];
    this.showcase.forEach((m) => this.attract.add(m));
  }

  update(dt, t) {
    this.rimMat.color.copy(U.uC1.value).multiplyScalar(1.6);
    this.head.position.y = PLAT_Y + 2.6 + Math.sin(t * 1.3) * 0.12;
    this.head.rotation.y = Math.sin(t * 0.7) * 0.3 + this.headTilt * 0.4;
    this.headMood = Math.max(0, this.headMood - dt);
    this.headTilt = Math.max(0, this.headTilt - dt * 0.8);
    this.visor.material.color.copy(this.headColor).multiplyScalar(2 + Math.sin(t * 6) * 0.5 + this.headMood * 2);
    if (this.tellSigil) {
      this.tellT -= dt; this.tellSigil.rotation.y += dt * 2.5; this.tellSigil.scale.setScalar(0.55 + Math.sin(t * 8) * 0.05);
      if (this.tellT <= 0) this.clearTell();
    }
    if (this.rps.visible) for (const pd of this.pads) {
      pd.orb.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
      if (pd.sigil) {
        if (pd.anim < 1) { pd.anim = Math.min(1, pd.anim + dt / 0.35); pd.sigil.scale.setScalar(Math.max(0.01, easeOutBack(pd.anim)) * 1.25); }
        pd.sigil.rotation.y += dt * (pd.dead !== undefined ? 8 : 0.8); pd.sigil.position.y = PLAT_Y + 1.3 + Math.sin(t * 2) * 0.08;
        if (pd.dead !== undefined) { pd.dead += dt; pd.sigil.scale.multiplyScalar(Math.max(0, 1 - dt * 5)); if (pd.dead > 0.5) { this.rps.remove(pd.sigil); pd.sigil = null; pd.dead = undefined; } }
      }
    }
    if (this.xo.visible) {
      for (const m of this.marks) { if (m.t < 1) { m.t = Math.min(1, m.t + dt / 0.3); m.g.scale.setScalar(Math.max(0.01, easeOutBack(m.t))); } m.g.position.y = PLAT_Y + 0.5 + Math.sin(t * 2 + m.i) * 0.05; }
      if (this.beam.visible) { this.beamT += dt; this.beam.scale.x = this.beam.scale.z = 1 + Math.sin(this.beamT * 12) * 0.3; }
      this.cells.forEach(c => c.e.material.color.copy(U.uC1.value).multiplyScalar(1.1));
      if (this.virusMesh) this.virusMesh.rotation.y += dt * 3;
      if (this.echoMesh) this.echoMesh.material.opacity = 0.45 + Math.sin(t * 4) * 0.25;
      if (this.hazardMesh) this.hazardMesh.material.opacity = 0.4 + Math.sin(t * 5) * 0.15;
      if (this.ghostX.visible) this.ghostX.rotation.y = Math.sin(t * 2) * 0.05;
    }
    if (this.react.visible) {
      let shrinkK = 1;
      if (this.shrinkDur > 0) { this.shrinkT += dt; shrinkK = Math.max(0.35, 1 - this.shrinkT / this.shrinkDur * 0.55); }
      this.orbs.forEach((o, li) => {
        if (!o.mesh.visible) return;
        o.u.uCol.value.lerp(o.col, Math.min(1, dt * 20));
        const go = o.state === 'go';
        o.mesh.scale.setScalar((1 + (go ? 0.08 : Math.sin(t * 2) * 0.03)) * (this.laneCount === 1 || li === 1 ? 1 : 0.85));
        this.ringSets[li].forEach((r, i) => {
          r.material.color.copy(o.u.uCol.value).multiplyScalar(1.5);
          const base = (this.laneCount === 1 || li === 1 ? 2.0 : 1.4) + i * 0.4;
          r.scale.setScalar(shrinkK * (go ? 1.05 : 1));
          r.rotation.x = Math.PI / 2 + Math.sin(t * (0.6 + i * 0.3)) * 0.4;
          r.rotation.y = t * (0.3 + i * 0.2) * (go ? 4 : 1);
        });
      });
    }
    if (this.attract.visible) this.showcase.forEach((m, i) => { const a = t * 0.35 + i / this.showcase.length * Math.PI * 2; m.position.set(Math.cos(a) * 3, PLAT_Y + 1.4 + Math.sin(t * 1.5 + i) * 0.3, Math.sin(a) * 3); m.rotation.y = t + i; });
  }
}
