// CYBER MINI PACK — polish + twist tuning (Slice B+).
export const GAME_ID = 'cyber-mini-pack';

// ---- RPS Fake Tell / Lock-in / Glitch Hand
export const TELL_FLASH = 0.55;          // seconds tell sigil stays visible at choose start
export const WAGER_HOLD_MS = 350;        // hold move button to lock-in wager
export const GLITCH_FROM_ENDLESS = true; // arm one glitch throw on endless rivals
export const GLITCH_ON_MILESTONE = true; // also arm on milestone rivals (every 5)

// ---- XO stage mods / virus / overclock undo
export const XO_MOD_FROM = 3;            // stage index 3 = Stage 4 (first endless)
export const XO_MOD_CYCLE = ['fog', 'warp', 'hazard', 'echo'];
export const xoModifier = (stageIdx) => (stageIdx < XO_MOD_FROM ? null : XO_MOD_CYCLE[(stageIdx - XO_MOD_FROM) % XO_MOD_CYCLE.length]);
export const VIRUS_CHANCE = 0.22;        // endless AI: chance to place virus instead of O
export const VIRUS_SPREAD_DELAY = 1;     // player moves before virus spreads (1 = after your next move)
export const OVERCLOCK_UNDO_HOLD_MS = 420;
export const OVERCLOCK_UNDO_PLIES = 2;   // pairs of (X+O) removed for one charge

// ---- Reaction go/no-go / tri-lane / charge
export const NOGO_CHANCE = 0.30;         // chance a try starts with a magenta decoy flash
export const NOGO_FLASH = [0.35, 0.85];  // decoy duration range (s)
export const LANE_FROM_ROUND = 2;        // 0-based: round 3+
export const CHARGE_ODD_ROUNDS = true;   // odd rounds (1,3,5…) use hold-to-release
export const REACT_LANES = 3;

// ---- Feel
export const STREAK_AURA_FROM = 2;
export const ADS = {
  interstitialCooldownSec: 180, breaksBetweenInterstitials: 3, graceSec: 150,
  units: { android: {} },
};
