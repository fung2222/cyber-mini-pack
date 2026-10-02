// CYBER MINI PACK sounds (synthesised).
import { SynthAudio, mtof } from 'cyber-kit/audio/synth.js';
export class MiniAudio extends SynthAudio {
  constructor(store) { super({ store, music: 'chill' }); }
  beat(i) { this.osc({ type: 'square', f: mtof(64 + i * 5), dur: 0.08, vol: 0.06, lp: 3000, send: 0.2 }); this.noiseHit({ dur: 0.05, vol: 0.05, f: 4000 }); }
  reveal() { this.noiseHit({ dur: 0.2, vol: 0.08, type: 'bandpass', f: 600, f2: 3000, q: 1.5, a: 0.01 }); this.osc({ type: 'sine', f: 120, f2: 60, dur: 0.25, vol: 0.2 }); }
  win() { [0, 4, 7, 12].forEach((n, i) => this.osc({ type: 'triangle', f: mtof(72 + n), t: i * 0.07, dur: 0.3, vol: 0.08, send: 0.4 })); }
  lose() { [0, -3, -7].forEach((n, i) => this.osc({ type: 'sawtooth', f: mtof(60 + n), t: i * 0.1, dur: 0.25, vol: 0.05, lp: 1500 })); }
  draw() { this.osc({ type: 'sine', f: mtof(67), dur: 0.2, vol: 0.06 }); this.osc({ type: 'sine', f: mtof(67), t: 0.15, dur: 0.2, vol: 0.05 }); }
  place(o) { this.osc({ type: o ? 'sine' : 'square', f: o ? 520 : 880, f2: o ? 700 : 660, dur: 0.1, vol: 0.06, lp: 4000, send: 0.2 }); }
  go() { this.osc({ type: 'square', f: 1320, dur: 0.12, vol: 0.08, lp: 6000 }); }
  foul() { this.osc({ type: 'sawtooth', f: 200, f2: 120, dur: 0.3, vol: 0.09, lp: 1200 }); }
  champion() { this.levelUp(); [0, 4, 7, 11, 14, 19].forEach((n, i) => this.osc({ type: 'sine', f: mtof(72 + n), t: 0.3 + i * 0.08, dur: 0.6, vol: 0.06, send: 0.5 })); }
}
