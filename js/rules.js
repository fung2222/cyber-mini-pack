// Pure rules + AIs for the three modes (no DOM / three). Unit-tested in tests/rules.test.mjs.
export const GAME_ID = 'cyber-mini-pack';

// ---------------------------------------------------------------- 包剪揼 rock-paper-scissors
export const RPS = ['rock', 'paper', 'scissors'];
export const RPS_ZH = { rock: '揼', paper: '包', scissors: '剪' };
export const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
export const counter = (m) => RPS.find(x => beats[x] === m);
export const rpsResult = (a, b) => a === b ? 0 : beats[a] === b ? 1 : -1;   // from a's view
export const RPS_WINS_NEEDED = 2;                                          // best of 3

/** opponent ladder: each has a personality */
export const RPS_OPPONENTS = [
  { id: 'rando', zh: '亂嚟仔', en: 'RANDO', desc: '完全隨機', descEn: 'Pure chaos' },
  { id: 'hunter', zh: '模式獵人', en: 'PATTERN HUNTER', desc: '睇穿你嘅慣性', descEn: 'Learns your habits' },
  { id: 'oracle', zh: '讀心神算', en: 'MIND ORACLE', desc: '預測你下一步', descEn: 'Predicts your next move' },
];
export function rpsAI(id, history, rng = Math.random) {
  // history: [{p, a, r}] player move, ai move, result(from player view)
  const rnd = () => RPS[Math.floor(rng() * 3)];
  if (id === 'rando' || history.length < 2) return rnd();
  if (id === 'hunter') {
    // order-1 Markov on the player's moves: what does the player play after their last move?
    const last = history[history.length - 1].p; const cnt = { rock: 0, paper: 0, scissors: 0 };
    for (let i = 1; i < history.length; i++) if (history[i - 1].p === last) cnt[history[i].p]++;
    const total = cnt.rock + cnt.paper + cnt.scissors;
    if (!total || rng() < 0.2) return rnd();
    const pred = RPS.reduce((a, b) => cnt[a] >= cnt[b] ? a : b);
    return counter(pred);
  }
  // oracle: order-2 then order-1 pattern memory, then win-stay / lose-shift detection, then recency-weighted frequency
  const P = history.map(x => x.p), L = P.length;
  for (const k of [2, 1]) {
    if (L <= k) continue;
    const key = P.slice(L - k).join(); const cnt = { rock: 0, paper: 0, scissors: 0 }; let tot = 0;
    for (let i = k; i < L; i++) if (P.slice(i - k, i).join() === key) { cnt[P[i]] += 1 + i / L; tot++; }
    if (tot >= 2 && rng() > 0.1) return counter(RPS.reduce((a, b) => cnt[a] >= cnt[b] ? a : b));
  }
  const h = history[L - 1];
  let stayRate = 0, n = 0;
  for (let i = 1; i < L; i++) if (history[i - 1].r === h.r) { n++; if (history[i].p === history[i - 1].p) stayRate++; }
  if (n >= 2) { const stay = stayRate / n; if (stay > 0.6) return counter(h.p); if (stay < 0.25) return counter(h.r < 0 ? counter(h.a) : beats[h.p]); }
  const w = { rock: 0, paper: 0, scissors: 0 }; history.forEach((x, i) => w[x.p] += 1 + i * 0.3);
  return counter(RPS.reduce((a, b) => w[a] >= w[b] ? a : b));
}

// ---------------------------------------------------------------- 過三關 tic-tac-toe
export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function xoWinner(b) {
  for (const L of LINES) { const [x, y, z] = L; if (b[x] && b[x] === b[y] && b[x] === b[z]) return { w: b[x], line: L }; }
  return b.every(Boolean) ? { w: 'draw', line: null } : null;
}
function minimax(b, me, turn, depth) {
  const r = xoWinner(b);
  if (r) return r.w === 'draw' ? 0 : r.w === me ? 10 - depth : depth - 10;
  const other = turn === 'X' ? 'O' : 'X'; let best = turn === me ? -99 : 99;
  for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = turn; const s = minimax(b, me, other, depth + 1); b[i] = null; best = turn === me ? Math.max(best, s) : Math.min(best, s); }
  return best;
}
export function bestMove(b, me, rng = Math.random) {
  const other = me === 'X' ? 'O' : 'X'; let best = -99, moves = [];
  for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = me; const s = minimax(b, me, other, 1); b[i] = null; if (s > best) { best = s; moves = [i]; } else if (s === best) moves.push(i); }
  return moves[Math.floor(rng() * moves.length)];
}
function findWin(b, who) { for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = who; const w = xoWinner(b); b[i] = null; if (w && w.w === who) return i; } return -1; }
export const XO_OPPONENTS = [
  { id: 'rookie', zh: '新手機械人', en: 'ROOKIE BOT', desc: '識贏唔識守', descEn: 'Takes wins, never blocks' },
  { id: 'guard', zh: '保安系統', en: 'GUARD SYSTEM', desc: '會擋你', descEn: 'Blocks your lines' },
  { id: 'core', zh: '主機核心', en: 'MAINFRAME CORE', drawClears: true, desc: '完美演算 · 打和即過關', descEn: 'Perfect play · a draw clears' },
];
export function xoAI(id, b, me, rng = Math.random, blunder = 0) {
  const other = me === 'X' ? 'O' : 'X';
  if (id === 'endless') { const empty = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); return rng() < blunder ? empty[Math.floor(rng() * empty.length)] : bestMove(b, me, rng); }
  const empty = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  const rnd = () => empty[Math.floor(rng() * empty.length)];
  if (id === 'core') return bestMove(b, me, rng);
  const win = findWin(b, me); if (win >= 0) return win;
  if (id === 'rookie') return rng() < 0.5 && !b[4] ? 4 : rnd();
  const block = findWin(b, other); if (block >= 0) return block;
  return rng() < 0.65 ? bestMove(b, me, rng) : rnd();   // guard: decent but beatable
}

// ---------------------------------------------------------------- 神經反射 reaction test
export const REACT_TRIES = 5;
export const REACT_DELAY = [1.4, 4.2];        // random wait before GO (s)
export const REACT_TIERS = [
  [180, '神經超頻', 'OVERCLOCKED'], [230, '賽博反射', 'CYBER REFLEX'], [280, '快過的士', 'FASTER THAN A TAXI'],
  [350, '正常人類', 'HUMAN'], [9999, '要飲杯咖啡', 'NEEDS COFFEE'],
];
export const reactTier = (ms) => REACT_TIERS.find(t => ms <= t[0]);
/** average of valid tries (false starts excluded) */
export const reactAverage = (tries) => { const v = tries.filter(t => t > 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };

// ---------------------------------------------------------------- endless (beyond the authored ladders)
const lerpCap = (n, a, b, tau) => a + (b - a) * (1 - Math.exp(-Math.max(0, n) / tau));
const RPS_TAGS = [['霓虹', 'NEON'], ['量子', 'QUANTUM'], ['鉻鋼', 'CHROME'], ['幻象', 'PHANTOM'], ['等離子', 'PLASMA'], ['虛空', 'VOID']];
/** RPS opponent for ladder index i (unbounded). Endless rivals alternate hunter/oracle brains and need more wins (capped at best of 7). */
export function rpsOpponent(i) {
  if (i < RPS_OPPONENTS.length) return { ...RPS_OPPONENTS[i], need: RPS_WINS_NEEDED, idx: i };
  const e = i - RPS_OPPONENTS.length, base = RPS_OPPONENTS[1 + (e % 2)], tag = RPS_TAGS[Math.floor(e / 2) % RPS_TAGS.length];
  return { ...base, idx: i, endless: true, zh: `${tag[0]}${base.zh} #${e + 1}`, en: `${tag[1]} ${base.en} #${e + 1}`, need: Math.min(4, 2 + Math.floor(e / 4)) };
}
/** XO opponent for stage index i (unbounded). Endless stages = perfect AI that blunders less and less (capped at 4 %); a draw clears. */
export function xoOpponent(i) {
  if (i < XO_OPPONENTS.length) return { ...XO_OPPONENTS[i], idx: i };
  const e = i - XO_OPPONENTS.length;
  return { id: 'endless', idx: i, endless: true, drawClears: true, zh: `超頻核心 Lv.${e + 1}`, en: `OVERCLOCK CORE Lv.${e + 1}`,
    desc: '打和過關 · 贏有額外分', descEn: 'Draw clears · wins score extra', blunder: lerpCap(e, 0.22, 0.04, 8) };
}
/** reaction gauntlet: target average (ms) for round r (0-based) — tightens from 450 ms and saturates at 300 ms */
export const reactTarget = (r) => Math.round(lerpCap(r, 450, 300, 6));
export const isMilestone = (n, every = 5) => n > 0 && n % every === 0;
