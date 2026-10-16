// CYBER MINI PACK sounds (synthesised) — Slice B+ layers for tell / wager / virus / react cues.
import { SynthAudio, mtof } from 'cyber-kit/audio/synth.js';
export class MiniAudio extends SynthAudio {
  constructor(store) { super({ store, music: 'chill', sfxTrimDb: -2.6 }); this._amb = null; }
  beat(i) { this.osc({ type: 'square', f: mtof(64 + i * 5), dur: 0.08, vol: 0.06, lp: 3000, send: 0.2 }); this.noiseHit({ dur: 0.05, vol: 0.05, f: 4000 }); }
  reveal() { this.noiseHit({ dur: 0.2, vol: 0.08, type: 'bandpass', f: 600, f2: 3000, q: 1.5, a: 0.01 }); this.osc({ type: 'sine', f: 120, f2: 60, dur: 0.25, vol: 0.2 }); }
  win() { [0, 4, 7, 12].forEach((n, i) => this.osc({ type: 'triangle', f: mtof(72 + n), t: i * 0.07, dur: 0.3, vol: 0.08, send: 0.4 })); }
  lose() { [0, -3, -7].forEach((n, i) => this.osc({ type: 'sawtooth', f: mtof(60 + n), t: i * 0.1, dur: 0.25, vol: 0.05, lp: 1500 })); }
  draw() { this.osc({ type: 'sine', f: mtof(67), dur: 0.2, vol: 0.06 }); this.osc({ type: 'sine', f: mtof(67), t: 0.15, dur: 0.2, vol: 0.05 }); }
  place(o) { this.osc({ type: o ? 'sine' : 'square', f: o ? 520 : 880, f2: o ? 700 : 660, dur: 0.1, vol: 0.06, lp: 4000, send: 0.2 }); }
  go() { this.osc({ type: 'square', f: 1320, dur: 0.12, vol: 0.08, lp: 6000 }); }
  foul() { this.osc({ type: 'sawtooth', f: 200, f2: 120, dur: 0.3, vol: 0.09, lp: 1200 }); }
  champion() { this.levelUp(); [0, 4, 7, 11, 14, 19].forEach((n, i) => this.osc({ type: 'sine', f: mtof(72 + n), t: 0.3 + i * 0.08, dur: 0.6, vol: 0.06, send: 0.5 })); }

  tell() { this.osc({ type: 'triangle', f: mtof(78), dur: 0.12, vol: 0.05, send: 0.35 }); this.noiseHit({ dur: 0.08, vol: 0.03, type: 'bandpass', f: 1800, q: 2 }); }
  wagerLock() { this.osc({ type: 'square', f: mtof(60), f2: mtof(72), dur: 0.18, vol: 0.06, lp: 2500 }); }
  wagerWin() { [0, 7, 12].forEach((n, i) => this.osc({ type: 'sine', f: mtof(76 + n), t: i * 0.05, dur: 0.22, vol: 0.055, send: 0.4 })); }
  wagerLose() { this.osc({ type: 'sawtooth', f: mtof(52), f2: mtof(40), dur: 0.28, vol: 0.06, lp: 900 }); }
  glitch() { this.noiseHit({ dur: 0.18, vol: 0.1, type: 'bandpass', f: 900, f2: 4000, q: 0.8 }); this.osc({ type: 'square', f: 180, f2: 90, dur: 0.2, vol: 0.07, lp: 2000 }); }
  perfect() { [0, 4, 7, 12, 16].forEach((n, i) => this.osc({ type: 'triangle', f: mtof(74 + n), t: i * 0.06, dur: 0.35, vol: 0.07, send: 0.5 })); }

  virus() { this.osc({ type: 'sawtooth', f: 140, f2: 280, dur: 0.25, vol: 0.07, lp: 1600 }); this.noiseHit({ dur: 0.15, vol: 0.05, f: 600 }); }
  virusSpread() { this.osc({ type: 'square', f: 90, f2: 60, dur: 0.3, vol: 0.08, lp: 800 }); }
  warp() { this.osc({ type: 'sine', f: 400, f2: 200, dur: 0.28, vol: 0.06, send: 0.4 }); this.noiseHit({ dur: 0.12, vol: 0.04, type: 'bandpass', f: 1200, q: 1.2 }); }
  overclock() { this.osc({ type: 'triangle', f: mtof(70), f2: mtof(82), dur: 0.22, vol: 0.07, send: 0.35 }); }

  nogo() { this.osc({ type: 'sawtooth', f: 320, f2: 180, dur: 0.16, vol: 0.07, lp: 1400 }); }
  laneGo() { this.osc({ type: 'square', f: 1480, dur: 0.1, vol: 0.075, lp: 7000 }); this.osc({ type: 'sine', f: 740, t: 0.04, dur: 0.12, vol: 0.04 }); }
  chargeArmed() { this.osc({ type: 'sine', f: 220, f2: 440, dur: 0.2, vol: 0.04, send: 0.3 }); }
  reactFast() { this.go(); [0, 5].forEach((n, i) => this.osc({ type: 'triangle', f: mtof(84 + n), t: 0.05 + i * 0.04, dur: 0.15, vol: 0.045 })); }

  startAmbient() {
    if (this._amb || this.muted) return;
    try {
      const ctx = this.ctx; if (!ctx) return;
      const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
      const src = ctx.createBufferSource(); src.buffer = n; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
      const g = ctx.createGain(); g.gain.value = 0.012;
      src.connect(f); f.connect(g); g.connect(this.master || ctx.destination);
      src.start(); this._amb = { src, g };
    } catch (e) { /* ignore */ }
  }
  stopAmbient() {
    if (!this._amb) return;
    try { this._amb.src.stop(); } catch (e) { /* ignore */ }
    this._amb = null;
  }
}
