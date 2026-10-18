// CYBER MINI PACK — RPS / XO / Reaction. Slice B+: Fake Tell + wager + glitch; XO mods + virus + OC undo; react go/no-go + lanes + charge.
import * as THREE from 'three';
import { i18n, t, flags, createStore, createStage, ThemeController, U, Particles, Shockwaves, FxState, NeonCity, createInput, CyberUI, Platform, createAds, readHub, returnToHub, shouldShowArcadeMenu,
  ViewInput, defaultView, clampView, dampView
} from 'cyber-kit';
import {
  GAME_ID, RPS, rpsResult, rpsAI, rpsTell, rpsGlitchMove, xoWinner, xoAI, xoWarpBoard, xoWarpIndex, xoPickHazard, xoVirusSpread, xoShouldVirus,
  REACT_TRIES, REACT_DELAY, REACT_TIERS, reactTier, reactAverage, reactPlan, reactLaneFromX,
  rpsOpponent, xoOpponent, reactTarget, isMilestone,
} from './rules.js';
import {
  WAGER_HOLD_MS, GLITCH_FROM_ENDLESS, GLITCH_ON_MILESTONE, xoModifier, VIRUS_CHANCE, OVERCLOCK_UNDO_HOLD_MS, OVERCLOCK_UNDO_PLIES,
  NOGO_CHANCE, NOGO_FLASH, LANE_FROM_ROUND, CHARGE_ODD_ROUNDS, STREAK_AURA_FROM, ADS,
} from './config.js';
import './strings.js';
import { Arena, PLAT_Y } from './arena.js';
import { MiniAudio } from './audio.js';
import { StreakAura, placeTrail, shatterBurst } from './polish.js';

const $ = (id) => document.getElementById(id);
const store = createStore(GAME_ID);
if (flags.reset) store.clear();
const ui = new CyberUI({ screens: ['start', 'pause', 'result'] });
const stage = createStage({ canvas: $('scene'), bloom: 0.85, bloomRadius: 0.5, bloomThreshold: 0.8, fov: 46, exposure: 1.05, onFatal: (m) => ui.fatal(m) });
ui.glowToggle(stage);
const { scene, camera } = stage;
const theme = new ThemeController(); theme.set(1, true);
const city = new NeonCity(stage, { floor: 'reflect', innerRadius: 20, buildings: 260, billboard: { zh: '賽博小遊戲', en: 'M I N I   P A C K', pos: [0, 22, -46], width: 30 }, dustArea: 30, dustHeight: 12 });
const arena = new Arena(scene);
const particles = new Particles(scene, 2000, { floorY: PLAT_Y + 0.05 });
stage.onResize((w, h, pr) => particles.resize(h, pr));
const waves = new Shockwaves(scene, 8);
const fx = new FxState();
const aura = new StreakAura(scene);
const audio = new MiniAudio(store); ui.setMuted(audio.muted);
const ads = createAds({ gameId: GAME_ID, ...ADS, onAdOpen: (on) => audio.duckAll(on) });
const MODE_THEME = { attract: 1, rps: 2, xo: 3, react: 4 };
const MODE_KEY = { rps: 'm.rps', xo: 'm.xo', react: 'm.react' };
const oName = (o) => i18n.lang === 'en' ? o.en : o.zh, oDesc = (o) => i18n.lang === 'en' ? o.descEn : o.desc;
const mv = (m) => t(m);
const tierName = (tier) => t('tier.' + REACT_TIERS.indexOf(tier));

const S = { state: 'menu', mode: 'attract', demo: !!flags.demo, timers: [], t: 0,
  rps: { opp: 0, p: 0, a: 0, history: [], phase: 'choose', streak: store.getNum('rpsStreak', 0), aiMove: null, tell: null, wager: null, glitchArmed: false, glitchUsed: false, wagerWins: 0, clean: true },
  xo: { opp: store.getNum('xoStage', 0), board: Array(9).fill(null), turn: 'X', first: 'X', moves: [], over: false, undo: 1, streak: 0, mod: null, hazard: -1, echo: -1, echoUsed: false, echoHolding: false, virus: -1, virusAge: 0, forcePerfect: false, warpNeed: 0 },
  react: { tries: [], phase: 'idle', goAt: 0, waitT: 0, round: 0, plan: null, holding: false, holdFrom: 0 } };
S.rps.opp = store.getNum('rpsRival', 0);
window.__mini = S;
const later = (t, fn) => S.timers.push({ t, fn });
const msg = (txt, big = false, cls = '') => { const e = $('mp-msg'); e.textContent = txt; e.classList.toggle('big', big); e.classList.toggle('wager', cls === 'wager'); e.classList.toggle('glitch', cls === 'glitch'); };
const setScore = (txt) => ui.setText('mp-score', txt);

function setState(s) { S.state = s; ui.show({ menu: 'start', paused: 'pause', result: 'result' }[s] || null); ui.hud(s === 'play' || s === 'paused' || s === 'result'); $('demo-tag').classList.toggle('hidden', !S.demo); }
function updateModChip() {
  const chip = $('hud-mod'), name = $('hud-mod-name'), sub = $('hud-mod-sub');
  if (!chip) return;
  const mod = S.mode === 'xo' ? S.xo.mod : null;
  if (!mod || S.state === 'menu') { chip.classList.add('hidden'); return; }
  chip.classList.remove('hidden', 'fog', 'warp', 'hazard', 'echo');
  chip.classList.add(mod);
  name.textContent = t('mod.' + mod);
  sub.textContent = t('mod.' + mod + 'S');
}
function hudRefresh() {
  if (S.mode === 'rps') { ui.setText('hud-opp', t('vs', { name: oName(rpsOpponent(S.rps.opp)) })); ui.setText('hud-stat-label', t('streak')); ui.setText('hud-stat', S.rps.streak); }
  else if (S.mode === 'xo') { ui.setText('hud-opp', t('vs', { name: oName(xoOpponent(S.xo.opp)) })); ui.setText('hud-stat-label', t('stage')); ui.setText('hud-stat', S.xo.opp + 1); }
  else if (S.mode === 'react') { ui.setText('hud-opp', t('ready')); ui.setText('hud-stat-label', t('round')); ui.setText('hud-stat', S.react.round + 1); }
  if (S.mode !== 'attract') ui.setText('hud-mode', t(MODE_KEY[S.mode]));
  updateModChip();
}
function refreshMenu() {
  ui.setText('mc-rps', t('mc.rps', { n: store.getNum('rpsBest', 0) }));
  ui.setText('mc-xo', t('mc.xo', { n: Math.max(1, store.getNum('xoBest', store.getNum('xoBeaten', 0) + 1)) }));
  const rb = store.getNum('reactBest', 0); ui.setText('mc-react', rb ? t('mc.react', { ms: rb, r: store.getNum('reactBestRound', 1) }) : t('mc.reactNew'));
}
function showMenu() { resetPlayView(true); S.timers = []; S.mode = 'attract'; arena.setMode('attract'); theme.set(1); refreshMenu(); setState('menu'); updateModChip(); audio.stopAmbient(); }
function enterMode(m) { resetPlayView(true);
  audio.init(); audio.startMusic(); audio.startAmbient(); audio.click();
  S.timers = []; S.mode = m; arena.setMode(m); theme.set(MODE_THEME[m]);
  ui.setText('hud-mode', t(MODE_KEY[m]));
  $('rps-bar').classList.toggle('hidden', m !== 'rps'); $('btn-undo').classList.toggle('hidden', m !== 'xo' || S.demo);
  setState('play'); msg(''); setScore('');
  if (m === 'rps') rpsStartMatch(); else if (m === 'xo') xoStartGame(); else reactStart();
}

// ================================================================ 包剪揼
function rpsArmTell() {
  const R = S.rps, o = rpsOpponent(R.opp);
  R.aiMove = rpsAI(o.id, R.history);
  R.tell = rpsTell(o.id, R.aiMove);
  arena.showTell(R.tell); audio.tell(); arena.headTilt = 1;
  msg(t('tell'), false); later(0.7, () => { if (R.phase === 'choose') msg(t('again')); });
}
function rpsStartMatch() {
  const R = S.rps; R.p = 0; R.a = 0; R.history = []; R.phase = 'choose'; R.wager = null; R.wagerWins = 0; R.clean = true; R.glitchUsed = false;
  const o = rpsOpponent(R.opp); R.need = o.need;
  R.glitchArmed = (!!o.endless && GLITCH_FROM_ENDLESS) || (GLITCH_ON_MILESTONE && isMilestone(R.opp + 1));
  arena.setHeadColor([0xff2bd6, 0xffc22b, 0xa66bff, 0x00e5ff, 0x3bff8a][R.opp % 5]); arena.clearSigils();
  hudRefresh(); setScore(`0 : 0`); msg(`${oName(o)} · ${oDesc(o)}`); rpsButtons(true);
  ui.banner(t('oppN', { n: R.opp + 1 }), oName(o) + (o.endless ? ' · ' + t('endlessOn') : ''), t('bestOf', { n: o.need * 2 - 1, w: o.need }));
  later(0.45, rpsArmTell);
}
function rpsButtons(on, picked) {
  document.querySelectorAll('.rps-btn').forEach(b => {
    b.disabled = !on; b.classList.toggle('picked', b.dataset.move === picked);
    b.classList.remove('wagering', 'locked');
  });
}
function rpsSetWager(move) {
  const R = S.rps; if (R.phase !== 'choose' || R.wager === move) return;
  R.wager = move; audio.wagerLock();
  document.querySelectorAll('.rps-btn').forEach(b => b.classList.toggle('locked', b.dataset.move === move));
  msg(t('wagerLocked'), false, 'wager');
}
function rpsPick(move) {
  const R = S.rps; if (S.state !== 'play' || S.mode !== 'rps' || R.phase !== 'choose') return;
  R.phase = 'count'; rpsButtons(false, move); arena.clearSigils(); arena.clearTell();
  let playMove = move;
  if (R.glitchArmed && !R.glitchUsed) {
    const g = rpsGlitchMove(move, true);
    if (g.glitched) { playMove = g.move; R.glitchUsed = true; R.glitchArmed = false; msg(t('glitchHand', { m: mv(playMove) }), true, 'glitch'); audio.glitch(); fx.kick({ glitch: 0.7, aberr: 0.9 }); }
  }
  const ai = R.aiMove || rpsAI(rpsOpponent(R.opp).id, R.history);
  R.aiMove = null; R.pending = { p: playMove, a: ai, wager: R.wager === move };
  R.wager = null;
  [t('beats1'), t('beats2'), t('beats3')].forEach((w, i) => later(i * 0.32, () => { msg(w, true); audio.beat(i); arena.pulse(0, 0, 0.6); fx.kick({ trauma: 0.04 }); }));
  later(1.0, () => rpsReveal(R.pending.p, R.pending.a, R.pending.wager));
}
function rpsReveal(p, a, wagered) {
  const R = S.rps; const r = rpsResult(p, a); R.history.push({ p, a, r, wagered: !!wagered });
  arena.showSigils(p, a); audio.reveal();
  const pp = arena.sigilPos(0), ap = arena.sigilPos(1);
  later(0.4, () => {
    if (r === 0) { msg(t('draw', { p: mv(p), a: mv(a) })); audio.draw(); if (wagered) R.clean = false; }
    else {
      const winP = r > 0 ? pp : ap, loseI = r > 0 ? 1 : 0; arena.shatter(loseI);
      const c = new THREE.Color(r > 0 ? 0x00e5ff : 0xff2bd6);
      const tier = Math.min(2, Math.floor(R.streak / STREAK_AURA_FROM));
      shatterBurst(particles, waves, r > 0 ? ap : pp, c, tier);
      if (r > 0) {
        R.p++; msg(t('point', { p: mv(p), a: mv(a) })); audio.win(); Platform.haptic('medium');
        if (wagered) { R.wagerWins++; audio.wagerWin(); aura.pulse(0, 2.3, 1.4); later(0.35, () => msg(t('wagerWin'), false, 'wager')); }
        else if (R.streak + (R.p >= R.need ? 1 : 0) >= STREAK_AURA_FROM) aura.pulse(0, 0, 1 + tier * 0.4);
      } else {
        R.a++; R.clean = false; msg(t('aiPoint', { p: mv(p), a: mv(a) })); audio.lose(); arena.headMood = 1; Platform.haptic('warning');
        if (wagered) { audio.wagerLose(); later(0.35, () => msg(t('wagerLose'), false, 'wager')); }
      }
      fx.kick({ trauma: 0.15 + (wagered ? 0.08 : 0), aberr: 0.6 });
    }
    setScore(`${R.p} : ${R.a}`);
    if (R.p >= R.need || R.a >= R.need) later(1.0, rpsMatchEnd);
    else later(0.9, () => { R.phase = 'choose'; rpsButtons(true); msg(t('again')); later(0.2, rpsArmTell); });
  });
}
function rpsMatchEnd() {
  const R = S.rps, won = R.p > R.a, o = rpsOpponent(R.opp);
  let record = false;
  if (won) { R.streak++; if (R.streak > store.getNum('rpsBest', 0)) { store.setNum('rpsBest', R.streak); record = true; } R.lastLost = false; }
  else { R.lostStreak = R.streak; R.lastLost = true; R.streak = 0; }
  store.setNum('rpsStreak', R.streak);
  const ms = won && isMilestone(R.opp + 1);
  const perfect = won && R.clean && R.a === 0;
  showResult({
    kicker: `${oName(o)} · ${R.p} : ${R.a}`, title: perfect ? t('perfectMatch') : (won ? t('win') : t('lose')),
    en: ms ? t('milestone') + ' ' + t('milestoneRps', { n: R.opp + 1 }) : '', record, danger: !won,
    stats: [[t('score'), `${R.p}:${R.a}`], [t('streak'), R.streak], [t('bestStreak'), store.getNum('rpsBest', 0)], [t('wagers'), R.wagerWins]],
    main: won ? [t('nextRival'), 'ENTER'] : [t('rematch'), 'ENTER'],
    reward: !won && R.lostStreak > 0 ? t('keepStreakN', { n: R.lostStreak }) : null,
  });
  if (won) { R.opp++; store.setNum('rpsRival', R.opp); if (ms) { audio.champion(); theme.set(2 + (R.opp / 5) % 4); } else if (perfect) audio.perfect(); else audio.win(); }
  else audio.lose();
}

// ================================================================ 過三關
function xoStartGame() {
  const X = S.xo; X.board = Array(9).fill(null); X.moves = []; X.over = false; X.undo = 1; X.echo = -1; X.echoUsed = false; X.echoHolding = false; X.virus = -1; X.virusAge = 0; X.forcePerfect = false; X.warpNeed = 0;
  arena.xoClear();
  const o = xoOpponent(X.opp); X.mod = xoModifier(X.opp);
  arena.setHeadColor([0x3bff8a, 0xffc22b, 0xff3b5c, 0xa66bff, 0x00e5ff][X.opp % 5]);
  arena.setFog(X.mod === 'fog');
  X.hazard = X.mod === 'hazard' ? xoPickHazard(X.board) : -1;
  if (X.hazard >= 0) arena.setHazard(X.hazard);
  hudRefresh(); setScore(t('youO')); xoUndoBadge();
  const sub = X.mod ? t('mod.' + X.mod) + ' · ' + oDesc(o) : oDesc(o);
  ui.banner(t('stageN', { n: X.opp + 1 }), oName(o), sub);
  if (X.mod === 'hazard' && X.hazard >= 0) later(0.6, () => ui.toast(t('hazardCell')));
  X.turn = X.first; if (X.turn === 'O') { msg(t('aiFirst')); later(0.9, xoAITurn); } else msg(t('youFirst'));
}
function xoUndoBadge() {
  const b = $('undo-badge');
  if (S.xo.undo > 0) { b.textContent = S.xo.undo; b.classList.remove('ad'); } else { b.textContent = ads.isNative ? 'AD' : '+1'; b.classList.add('ad'); }
  const fill = $('oc-fill'); if (fill) fill.style.width = '0%';
  $('btn-undo')?.classList.remove('charging', 'overclock');
}
function xoPlay(i, who) {
  const X = S.xo; if (X.over) return false;
  // Echo: tap your last X once to pick it up, then place on an empty cell (same turn).
  if (who === 'X' && X.mod === 'echo' && i === X.echo && X.board[i] === 'X' && !X.echoUsed && !X.echoHolding) {
    X.echoHolding = true; X.echoUsed = true; X.board[i] = null; arena.xoUnplace(i);
    const idx = X.moves.lastIndexOf(i); if (idx >= 0) X.moves.splice(idx, 1);
    arena.setEcho(-1); X.echo = -1; audio.back(); msg(t('mod.echo')); return true;
  }
  if (X.board[i] || (who === 'X' && i === X.hazard)) return false;
  if (who === 'X' && X.virus >= 0 && i !== X.virus && X.echoHolding) { /* ok */ }
  X.board[i] = who; X.moves.push(i); arena.xoPlace(i, who); audio.place(who === 'O');
  const p = arena.cellPos(i); const col = new THREE.Color(who === 'X' ? 0x00e5ff : 0xff2bd6);
  particles.burst(p, col, 18, { speed: 3, up: 2, life: 0.5, size: 0.7 }); placeTrail(particles, p, col); arena.pulse(p.x, p.z, 0.6);
  if (who === 'X' && X.mod === 'echo') { if (X.echoHolding) { X.echoHolding = false; X.echo = -1; arena.setEcho(-1); } else { X.echo = i; arena.setEcho(i); } }
  // virus clear if player lands on it
  if (who === 'X' && X.virus === i) { X.virus = -1; arena.setVirus(-1); ui.toast(t('virusCleared')); }
  const w = xoWinner(X.board);
  if (w) { X.over = true; later(0.25, () => xoEnd(w)); return true; }
  X.turn = who === 'X' ? 'O' : 'X';
  if (who === 'O' && X.mod === 'warp') {
    X.warpNeed++;
    if (X.warpNeed >= 1) { X.warpNeed = 0; xoDoWarp(); }
  }
  if (X.turn === 'O') { msg(t('thinking')); later(0.55, xoAITurn); }
  else {
    msg(t('yourMove'));
    if (X.virus >= 0) { X.virusAge++; if (X.virusAge >= 1) later(0.35, xoDoVirusSpread); }
  }
  return true;
}
function xoDoWarp() {
  const X = S.xo;
  X.board = xoWarpBoard(X.board);
  if (X.hazard >= 0) X.hazard = xoWarpIndex(X.hazard);
  if (X.echo >= 0) X.echo = xoWarpIndex(X.echo);
  if (X.virus >= 0) X.virus = xoWarpIndex(X.virus);
  X.moves = X.moves.map(xoWarpIndex);
  arena.xoClear();
  for (let i = 0; i < 9; i++) if (X.board[i] === 'X' || X.board[i] === 'O') arena.xoPlace(i, X.board[i]);
  if (X.hazard >= 0) arena.setHazard(X.hazard);
  if (X.echo >= 0) arena.setEcho(X.echo);
  if (X.virus >= 0) arena.setVirus(X.virus);
  arena.setFog(X.mod === 'fog');
  audio.warp(); fx.kick({ aberr: 0.7, glitch: 0.4 }); ui.toast(t('mod.warp'));
}
function xoDoVirusSpread() {
  const X = S.xo; if (X.over || X.virus < 0 || S.mode !== 'xo') return;
  const cell = xoVirusSpread(X.board, X.virus);
  arena.setVirus(-1); const from = X.virus; X.virus = -1; X.virusAge = 0;
  if (cell < 0 || X.board[cell]) return;
  audio.virusSpread(); msg(t('virusSpread'), true); fx.kick({ trauma: 0.12, glitch: 0.5 });
  xoPlay(cell, 'O');
}
function xoAITurn() {
  const X = S.xo; if (X.over || S.mode !== 'xo' || S.state !== 'play') return;
  const o = xoOpponent(X.opp);
  let blunder = X.forcePerfect ? 0 : (o.blunder || 0);
  X.forcePerfect = false;
  // Virus attempt (endless)
  if (xoShouldVirus(!!o.endless && X.virus < 0, X.board, Math.random, VIRUS_CHANCE)) {
    const empty = X.board.map((v, i) => (v || i === X.hazard) ? -1 : i).filter(i => i >= 0);
    if (empty.length) {
      const cell = empty[Math.floor(Math.random() * empty.length)];
      X.virus = cell; X.virusAge = 0; arena.setVirus(cell); audio.virus(); msg(t('virusPlaced'), true);
      // virus occupies the cell visually but board stays empty until spread — mark as blocked for placement
      // Use a soft lock: treat as hazard-like for humans, AI won't play there
      X.turn = 'X'; msg(t('yourMove'));
      return;
    }
  }
  const boardView = X.board.map((v, i) => (i === X.hazard || i === X.virus) ? '·' : v);
  // Pass real board to AI but mask hazard/virus as occupied with a sentinel — use 'O' ghost? Better: copy and fill hazard
  const b = X.board.slice();
  if (X.hazard >= 0 && !b[X.hazard]) b[X.hazard] = 'O'; // pretend blocked
  if (X.virus >= 0 && !b[X.virus]) b[X.virus] = 'X'; // don't sit on virus
  let i = xoAI(o.id, b, 'O', Math.random, blunder);
  if (i === X.hazard || i === X.virus || X.board[i]) {
    const free = X.board.map((v, k) => (v || k === X.hazard || k === X.virus) ? -1 : k).filter(k => k >= 0);
    if (!free.length) { X.over = true; later(0.25, () => xoEnd({ w: 'draw', line: null })); return; }
    i = free[Math.floor(Math.random() * free.length)];
  }
  xoPlay(i, 'O');
}
function xoHuman(i) {
  const X = S.xo; if (S.state !== 'play' || S.mode !== 'xo' || X.turn !== 'X' || X.over || i < 0) return;
  if (S.demo) return;
  if (i === X.hazard) { audio.denied(); return; }
  if (i === X.virus) { /* landing on virus clears it via xoPlay */ }
  if (X.board[i] && !(X.mod === 'echo' && i === X.echo && X.board[i] === 'X' && !X.echoUsed && !X.echoHolding)) return;
  xoPlay(i, 'X'); Platform.haptic('light');
}
async function xoUndo({ overclock = false } = {}) {
  const X = S.xo; if (S.mode !== 'xo' || S.state !== 'play' || X.over || X.turn !== 'X' || ui.modalOpen) return;
  const plies = overclock ? OVERCLOCK_UNDO_PLIES : 1;
  const needMoves = plies * 2;
  if (X.moves.length < needMoves) { audio.denied(); ui.toast(t('noUndo')); return; }
  if (X.undo <= 0) {
    const ok = await ui.confirm(ads.isNative ? { kicker: t('undo'), title: t('undoAdT'), text: t('undoAdTxt'), ok: t('watchAd'), okSmall: '', cancel: t('kit.noThanks'), cancelSmall: '' } : { kicker: t('undo'), title: t('undoWebT'), text: t('undoWebTxt'), ok: t('claim'), okSmall: '', cancel: t('kit.noThanks'), cancelSmall: '' });
    if (!ok) return; const r = await ads.rewarded('xo-undo'); if (!r.rewarded) return; X.undo++;
  }
  X.undo--;
  for (let p = 0; p < plies; p++) {
    for (let k = 0; k < 2; k++) { const i = X.moves.pop(); if (i == null) break; X.board[i] = null; arena.xoUnplace(i); }
  }
  if (overclock) { X.forcePerfect = true; audio.overclock(); ui.toast(t('ocUndo')); later(0.4, () => ui.toast(t('ocArmed'))); $('btn-undo')?.classList.add('overclock'); }
  else audio.back();
  fx.kick({ aberr: 0.5 }); xoUndoBadge(); msg(t('undone'));
  // reset echo to last X if any
  X.echo = -1; X.echoUsed = false; arena.setEcho(-1);
  for (let i = X.moves.length - 1; i >= 0; i--) { if (X.board[X.moves[i]] === 'X') { X.echo = X.moves[i]; if (X.mod === 'echo') arena.setEcho(X.echo); break; } }
}
function xoEnd(w) {
  const X = S.xo, o = xoOpponent(X.opp);
  if (w.line) { arena.xoLine(w.line, w.w === 'X' ? 0x00e5ff : 0xff2bd6); for (const i of w.line) particles.burst(arena.cellPos(i), new THREE.Color(w.w === 'X' ? 0x00e5ff : 0xff2bd6), 30, { speed: 4, up: 4, life: 0.8 }); fx.kick({ trauma: 0.2, aberr: 0.8 }); aura.pulse(0, 0, 1.6); }
  const held = w.w === 'draw' && !!o.drawClears, won = w.w === 'X' || held, draw = w.w === 'draw' && !held;
  X.first = X.first === 'X' ? 'O' : 'X';
  let record = false;
  if (won) { X.streak++; const reached = X.opp + 2; if (reached > store.getNum('xoBest', 1)) { store.setNum('xoBest', reached); record = true; } }
  const champ = won && isMilestone(X.opp + 1); const realWin = w.w === 'X';
  if (won) { champ ? audio.champion() : audio.win(); Platform.haptic('success'); } else if (draw) audio.draw(); else { audio.lose(); arena.headMood = 1; }
  if (realWin && o.endless) store.setNum('xoCoreWins', store.getNum('xoCoreWins', 0) + 1);
  later(1.1, () => showResult({
    kicker: `${t('stageN', { n: X.opp + 1 })} · ${oName(o)}${X.mod ? ' · ' + t('mod.' + X.mod) : ''}`,
    title: held ? t('held') : won ? t('cleared') : draw ? t('xoDraw') : t('lose'), en: champ ? t('milestone') : '', record, danger: !won && !draw,
    stats: [[t('result'), realWin ? t('rWin') : (draw || held) ? t('rDraw') : t('rLoss')], [t('moves'), X.moves.length], [t('bestStage'), store.getNum('xoBest', 1)], [t('winBonus'), store.getNum('xoCoreWins', 0)]],
    main: won ? [t('nextStage'), 'ENTER'] : [t('replay'), 'ENTER'], reward: null,
  }));
  if (won) { X.opp++; store.setNum('xoStage', X.opp); if (champ) theme.set(3 + (X.opp / 5) % 3); }
}

// ================================================================ 神經反射
function reactStart() {
  const Rx = S.react; Rx.tries = []; Rx.holding = false; hudRefresh();
  ui.banner(t('roundN', { n: Rx.round + 1 }), t('m.react'), t('target', { ms: reactTarget(Rx.round) })); reactArm(1.6);
}
function reactArm(extra = 0) {
  const Rx = S.react;
  Rx.plan = reactPlan(Rx.round, Math.random, { nogoChance: NOGO_CHANCE, laneFrom: LANE_FROM_ROUND, chargeOdd: CHARGE_ODD_ROUNDS });
  arena.setLanes(Rx.plan.lanes);
  Rx.phase = 'wait'; Rx.waitT = extra + REACT_DELAY[0] + Math.random() * (REACT_DELAY[1] - REACT_DELAY[0]);
  Rx.holding = false;
  arena.setOrb('wait'); arena.armShrink(Rx.waitT);
  const tip = Rx.plan.charge ? t('chargeHold') : (Rx.plan.lanes > 1 ? t('laneGo') : t('wait'));
  msg(tip, true); setScore(`${Rx.tries.length + 1} / ${REACT_TRIES}`); ui.setText('hud-opp', t('tryN', { n: Rx.tries.length + 1 }));
  if (Rx.plan.charge) audio.chargeArmed();
  if (Rx.plan.nogo) {
    // schedule decoy flash mid-wait
    const flash = NOGO_FLASH[0] + Math.random() * (NOGO_FLASH[1] - NOGO_FLASH[0]);
    const at = Math.min(Rx.waitT * 0.45, Math.max(0.5, Rx.waitT - flash - 0.4));
    later(at, () => {
      if (S.mode !== 'react' || S.state !== 'play' || Rx.phase !== 'wait') return;
      Rx.phase = 'nogo'; arena.setOrb('nogo', Rx.plan.lane); audio.nogo(); msg(t('nogo'), true);
      later(flash, () => {
        if (S.mode !== 'react' || Rx.phase !== 'nogo') return;
        Rx.phase = 'wait'; arena.setOrb('wait'); msg(t('nogoClear'));
      });
    });
  }
}
function reactFoul(kind = 'false') {
  const Rx = S.react; Rx.tries.push(-1); Rx.phase = 'foul'; arena.setOrb('foul'); audio.foul();
  fx.kick({ glitch: 0.6, aberr: 1 }); ui.flash('rgba(255,194,43,0.3)', 300); Platform.haptic('error');
  msg(kind === 'lane' ? t('wrongLane') : kind === 'charge' ? t('chargeFoul') : t('falseStart'), true);
  later(1.3, reactNext);
}
function reactSuccess(ms) {
  const Rx = S.react; Rx.tries.push(ms); Rx.phase = 'shown'; arena.setOrb('idle');
  const tier = reactTier(ms); msg(`${ms} ms · ${tierName(tier)}`, true);
  if (ms <= 180) audio.reactFast(); else audio.win(); Platform.haptic('light');
  const sp = stage.toScreen(arena.orbs[Rx.plan?.lane ?? 1].mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  ui.popup(sp.x, sp.y, ms + 'ms', tierName(tier), ms < 250 ? 'big' : '');
  const c = new THREE.Color(0x3bff8a);
  particles.burst(arena.orbs[Rx.plan?.lane ?? 1].mesh.position, c, 50, { speed: 5, up: 3, life: 0.7 });
  waves.spawn(new THREE.Vector3(0, PLAT_Y + 0.05, 0), c, { r0: 1, r1: 6, h: 0.8, dur: 0.6 });
  aura.pulse(arena.orbs[Rx.plan?.lane ?? 1].x, 0, ms < 200 ? 1.8 : 1);
  later(1.2, reactNext);
}
function reactTap(laneHint = -1) {
  const Rx = S.react; if (S.state !== 'play' || S.mode !== 'react') return;
  if (Rx.phase === 'wait' || Rx.phase === 'nogo') { reactFoul('false'); return; }
  if (Rx.phase === 'go') {
    // Charge mode prefers release, but tap-on-green still counts (a11y + smoke).
    let lane = laneHint;
    if (lane < 0 && Rx.plan.lanes > 1) lane = Rx.plan.lane; // keyboard: accept correct lane
    if (Rx.plan.lanes > 1 && lane >= 0 && lane !== Rx.plan.lane) { reactFoul('lane'); return; }
    const ms = Math.max(1, Math.round(performance.now() - Rx.goAt));
    reactSuccess(ms);
  }
}
function reactHoldStart() {
  const Rx = S.react; if (S.state !== 'play' || S.mode !== 'react' || !Rx.plan?.charge) return;
  if (Rx.phase === 'wait' || Rx.phase === 'nogo') { Rx.holding = true; Rx.holdFrom = performance.now(); }
  else if (Rx.phase === 'go') { /* already green — holding late is ok, release will score */ Rx.holding = true; Rx.holdFrom = Rx.goAt; }
}
function reactHoldEnd() {
  const Rx = S.react; if (S.state !== 'play' || S.mode !== 'react' || !Rx.plan?.charge) return;
  if (!Rx.holding) return; Rx.holding = false;
  if (Rx.phase === 'wait' || Rx.phase === 'nogo') { reactFoul('charge'); return; }
  if (Rx.phase === 'go') {
    const ms = Math.max(1, Math.round(performance.now() - Rx.goAt));
    reactSuccess(ms);
  }
}
function reactNext() { const Rx = S.react; if (Rx.tries.length >= REACT_TRIES) reactEnd(); else reactArm(); }
function reactEnd() {
  const Rx = S.react, avg = reactAverage(Rx.tries), valid = Rx.tries.filter(x => x > 0), best1 = valid.length ? Math.min(...valid) : 0, fouls = Rx.tries.filter(t => t < 0).length;
  let record = false; const prev = store.getNum('reactBest', 0);
  if (avg && (!prev || avg < prev)) { store.setNum('reactBest', avg); record = true; }
  const target = reactTarget(Rx.round), passed = avg > 0 && avg < target, round = Rx.round + 1;
  if (passed && round > store.getNum('reactBestRound', 0)) { store.setNum('reactBestRound', round); record = true; }
  const tier = avg ? reactTier(avg) : null;
  if (passed) audio.champion(); else audio.lose();
  showResult({ kicker: `${t('roundN', { n: round })} · ${t('target', { ms: target })}`, title: passed ? t('passed') : t('gauntletOver'), en: tier ? `${avg} ms · ${tierName(tier)}` : t('needCoffee'), record, danger: !passed,
    stats: [[t('avg'), avg ? avg + 'ms' : '—'], [t('fastest'), best1 ? best1 + 'ms' : '—'], [t('fouls'), fouls], [t('roundReached'), Math.max(1, store.getNum('reactBestRound', 0))]],
    main: passed ? [t('nextRound'), 'ENTER'] : [t('tryAgain'), 'ENTER'], reward: null });
  Rx.round = passed ? Rx.round + 1 : 0;
}

// ================================================================ result screen
function showResult(o) {
  ui.setText('res-kicker', o.kicker); const te = $('res-title'); te.textContent = o.title; te.dataset.text = o.title; te.classList.toggle('danger', !!o.danger);
  ui.setText('res-en', o.en); $('res-record').classList.toggle('hidden', !o.record);
  $('res-stats').innerHTML = o.stats.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  ui.setText('res-main-zh', o.main[0]); ui.setText('res-main-en', o.main[1]);
  const rw = $('btn-res-reward'); rw.classList.toggle('hidden', !o.reward || !ads.rewardedAvailable()); if (o.reward) { ui.setText('res-reward-main', o.reward); ui.setText('res-reward-sub', ads.isNative ? t('viaAd') : t('free')); }
  setState('result'); msg(''); updateModChip();
  if (S.demo) later(2.4, () => demoNext());
}
async function resultMain() { if (S.state !== 'result') return; audio.click(); await ads.naturalBreak('match'); enterMode(S.mode); }
async function resultModes() { if (S.state !== 'result') return; audio.back(); await ads.naturalBreak('match'); showMenu(); }
async function resultReward() {
  if (S.state !== 'result' || S.mode !== 'rps' || !S.rps.lastLost) return; const r = await ads.rewarded('rps-streak'); if (!r.rewarded) return;
  S.rps.streak = S.rps.lostStreak; S.rps.lastLost = false; store.setNum('rpsStreak', S.rps.streak); ui.toast(t('streakSaved', { n: S.rps.streak })); $('btn-res-reward').classList.add('hidden');
}
function pause() { if (S.state !== 'play') return; setState('paused'); audio.duckMusic(); }
function resume() { if (S.state !== 'paused') return; setState('play'); audio.unduckMusic(); if (S.mode === 'react' && (S.react.phase === 'go' || S.react.phase === 'nogo')) reactArm(); }

// ================================================================ demo autoplay
const DEMO_SEQ = ['rps', 'xo', 'react'];
function demoNext() { const i = (DEMO_SEQ.indexOf(S.mode) + (S.state === 'result' ? 1 : 0)) % 3; if (S.state === 'result' && S.mode === 'rps' && Math.max(S.rps.p, S.rps.a) < (S.rps.need || 2)) return; enterMode(DEMO_SEQ[i]); }
function demoTick(dt) {
  if (!S.demo || S.state !== 'play') return;
  S.demoT = (S.demoT || 0) + dt;
  if (S.mode === 'rps' && S.rps.phase === 'choose' && S.demoT > 1.1) { S.demoT = 0; rpsPick(RPS[Math.floor(Math.random() * 3)]); }
  if (S.mode === 'xo' && S.xo.turn === 'X' && !S.xo.over && S.demoT > 0.8) {
    S.demoT = 0; const b = S.xo.board.slice();
    if (S.xo.hazard >= 0) b[S.xo.hazard] = 'O';
    let i = xoAI('guard', b, 'X');
    if (i === S.xo.hazard || i === S.xo.virus) i = b.map((v, k) => v || k === S.xo.hazard || k === S.xo.virus ? -1 : k).filter(k => k >= 0)[0];
    if (i >= 0) xoPlay(i, 'X');
  }
  if (S.mode === 'react' && S.react.phase === 'go' && performance.now() - S.react.goAt > 200 + Math.random() * 140) {
    if (S.react.plan?.charge) { S.react.holding = true; reactHoldEnd(); }
    else reactTapDemo();
  }
}
function reactTapDemo() { S.demo = false; reactTap(S.react.plan?.lane ?? 1); S.demo = true; }

// ================================================================ input
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickCell(x, y) { ndc.set(x / stage.width * 2 - 1, -(y / stage.height) * 2 + 1); ray.setFromCamera(ndc, camera); return arena.pickCell(ray); }
function pickLane(x, y) { ndc.set(x / stage.width * 2 - 1, -(y / stage.height) * 2 + 1); ray.setFromCamera(ndc, camera); let i = arena.pickLane(ray); if (i < 0) i = reactLaneFromX(x / stage.width, S.react.plan?.lanes || 1); return i; }
let xoCursor = 4;
createInput({
  anyGesture() { audio.init(); audio.startMusic(); audio.startAmbient(); },
  tap(p) {
    if (ui.modalOpen || S.state !== 'play' || S.demo) return;
    if (S.mode === 'xo') xoHuman(pickCell(p.x, p.y));
    else if (S.mode === 'react') {
      reactTap(pickLane(p.x, p.y));
    }
  },
  holdStart(p) {
    if (ui.modalOpen || S.state !== 'play' || S.demo) return;
    if (S.mode === 'react') reactHoldStart();
  },
  holdEnd(p) {
    if (S.mode === 'react') reactHoldEnd();
  },
  dir(d) { if (S.mode !== 'xo' || S.state !== 'play') return; const c = xoCursor % 3, r = Math.floor(xoCursor / 3); xoCursor = d === 'left' ? r * 3 + (c + 2) % 3 : d === 'right' ? r * 3 + (c + 1) % 3 : d === 'up' ? ((r + 2) % 3) * 3 + c : ((r + 1) % 3) * 3 + c; arena.setHoverCell(xoCursor); audio.tick(); },
  action(a) {
    if (ui.modalOpen) { if (a === 'pause') ui.closeModal(); return; }
    if (a === 'primary') { if (S.state === 'result') resultMain(); else if (S.state === 'paused') resume(); else if (S.state === 'play') { if (S.mode === 'react') { if (S.react.plan?.charge) { /* space = hold sim via keydown path */ } else reactTap(S.react.plan?.lane ?? 1); } else if (S.mode === 'xo') xoHuman(xoCursor); } else if (S.state === 'menu') enterMode('rps'); }
    else if (a === 'pause') { if (S.state === 'play') pause(); else if (S.state === 'paused') resume(); else if (S.state === 'result') resultModes(); }
    else if (a === 'mute') { audio.init(); ui.setMuted(audio.toggleMute()); }
    else if (a === 'undo') xoUndo();
    else if (a === 'fps') $('fps').classList.toggle('hidden');
    else if (['m1', 'm2', 'm3'].includes(a)) { const m = { m1: 'rock', m2: 'paper', m3: 'scissors' }[a]; if (S.state === 'menu') enterMode(DEMO_SEQ[+a[1] - 1]); else if (S.mode === 'rps') rpsPick(m); }
  },
}, { swipe: 'once', threshold: 60, holdMs: 280, actions: { Digit1: 'm1', Digit2: 'm2', Digit3: 'm3', Numpad1: 'm1', Numpad2: 'm2', Numpad3: 'm3' } });

// RPS wager: hold move button to lock; click/tap always throws
document.querySelectorAll('.rps-btn').forEach(b => {
  let t0 = 0, timer = 0, locked = false;
  const clear = () => { clearInterval(timer); timer = 0; b.classList.remove('wagering'); };
  b.addEventListener('pointerdown', () => {
    if (S.demo || S.mode !== 'rps' || S.rps.phase !== 'choose') return;
    locked = false; t0 = performance.now(); b.classList.add('wagering');
    timer = setInterval(() => {
      const k = (performance.now() - t0) / WAGER_HOLD_MS;
      if (k >= 1 && !locked) { locked = true; clear(); rpsSetWager(b.dataset.move); }
    }, 30);
  });
  b.addEventListener('pointerup', () => clear());
  b.addEventListener('pointerleave', () => { if (!locked) clear(); });
  b.addEventListener('pointercancel', () => clear());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    clear();
    if (S.demo || S.mode !== 'rps') return;
    if (S.rps.phase === 'choose') rpsPick(b.dataset.move);
    b.blur();
  });
});

// XO overclock undo hold (tap = normal undo; hold = overclock)
(() => {
  const btn = $('btn-undo'); if (!btn) return;
  let t0 = 0, timer = 0, fired = false;
  const fill = () => $('oc-fill');
  const clear = () => { clearInterval(timer); timer = 0; btn.classList.remove('charging'); if (fill()) fill().style.width = '0%'; };
  btn.addEventListener('pointerdown', () => {
    if (S.demo || S.mode !== 'xo' || S.state !== 'play') return;
    fired = false; t0 = performance.now(); btn.classList.add('charging');
    timer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / OVERCLOCK_UNDO_HOLD_MS);
      if (fill()) fill().style.width = (k * 100) + '%';
      if (k >= 1 && !fired) { fired = true; clear(); xoUndo({ overclock: true }); }
    }, 30);
  });
  btn.addEventListener('pointerup', () => clear());
  btn.addEventListener('pointerleave', () => { if (!fired) clear(); });
  btn.addEventListener('pointercancel', () => clear());
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const was = fired; clear();
    if (!was && S.mode === 'xo' && S.state === 'play') xoUndo();
  });
})();

$('scene').addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && S.mode === 'xo' && S.state === 'play') { const i = pickCell(e.clientX, e.clientY); arena.setHoverCell(i); if (i >= 0) xoCursor = i; } });
// charge mode: pointer on scene
$('scene').addEventListener('pointerdown', (e) => {
  if (S.state !== 'play' || S.mode !== 'react' || S.demo || !S.react.plan?.charge) return;
  reactHoldStart();
});
$('scene').addEventListener('pointerup', (e) => {
  if (S.mode !== 'react' || !S.react.plan?.charge) return;
  reactHoldEnd();
});

document.querySelectorAll('.mode-card').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); enterMode(b.dataset.mode); b.blur(); }));
ui.on('btn-back', () => { audio.back(); showMenu(); }); ui.on('btn-mute', () => { audio.init(); ui.setMuted(audio.toggleMute()); });
const __hub = readHub();
if (shouldShowArcadeMenu(__hub)) { const b = document.getElementById('btn-arcade-menu'); if (b) b.classList.remove('hidden'); }
ui.on('btn-arcade-menu', () => { try { audio.back(); } catch {} returnToHub({ gameId: 'cyber-mini-pack', openStore: false }); });

ui.on('btn-resume', resume); ui.on('btn-quit', showMenu);
ui.on('btn-res-main', resultMain); ui.on('btn-res-modes', resultModes); ui.on('btn-res-reward', resultReward);
Platform.onBack(() => { if (ui.closeModal()) return true; if (S.state === 'play') { pause(); return true; } if (S.state === 'paused') { resume(); return true; } if (S.state === 'result') { resultModes(); return true; } return false; });
Platform.onPause(() => { if (!S.demo) pause(); });
S.api = { enter: enterMode, rpsPick, xoHuman, reactTap, cellScreen: (i) => stage.toScreen(arena.cellPos(i)), xoUndo, rpsSetWager };

// ================================================================ camera + loop
const camPos = new THREE.Vector3(0, 14, 14), camLook = new THREE.Vector3(0, PLAT_Y, 0), tP = new THREE.Vector3(), tL = new THREE.Vector3();
const pView = defaultView(), pViewC = defaultView(), VIEW_EXT = [5.5, 5.5];
let viewPitch = 1.0;
const inMatch = () => (S.state === 'play' || S.state === 'paused') && !S.demo;
const gesturesOn = () => inMatch() && !ui.modalOpen;
function resetPlayView(instant = true) { Object.assign(pView, defaultView()); if (instant) Object.assign(pViewC, defaultView()); }
new ViewInput($('scene'), {
  enabled: gesturesOn,
  zoom: (f) => { pView.zoom *= f; clampView(pView, viewPitch, VIEW_EXT); },
  twist: (d) => { pView.az += d; clampView(pView, viewPitch, VIEW_EXT); },
  pan: (x0, y0, x1, y1) => { const k = 0.01; pView.px += (x0 - x1) * k; pView.pz += (y0 - y1) * k; clampView(pView, viewPitch, VIEW_EXT); },
  orbit: (dAz, dEl) => { pView.az += dAz; pView.el += dEl; clampView(pView, viewPitch, VIEW_EXT); },
}, { oneFingerOrbit: false });

function frameCamera(dt, now, instant = false) {
  const aspect = stage.width / stage.height, portrait = aspect < 0.9, menu = S.state === 'menu';
  const useView = inMatch();
  if (menu) resetPlayView(true);
  const vfov = portrait ? 52 : 42; camera.fov = vfov + fx.fovKick * 3; camera.updateProjectionMatrix();
  let pitch = THREE.MathUtils.degToRad(menu ? 32 : S.mode === 'xo' ? (portrait ? 64 : 56) : (portrait ? 46 : 38));
  viewPitch = pitch;
  const R = 5.7, tanV = Math.tan(THREE.MathUtils.degToRad(vfov / 2)), tanH = tanV * aspect;
  let d = Math.max(R / (tanH * 0.95), (R * Math.sin(pitch) + 2.5 * Math.cos(pitch)) / (tanV * (portrait ? 0.6 : 0.8))) + R * 0.5;
  let yaw = Math.sin(now * 0.13) * 0.05, lx = 0, ly = PLAT_Y + (S.mode === 'xo' ? 0.2 : 1.2), lz = portrait && !menu ? 0.6 : 0;
  if (menu) { yaw = now * 0.12; d *= portrait ? 1.0 : 0.85; d = Math.min(d, 16.5); if (!portrait) lx = 0; ly = PLAT_Y + (portrait ? -4.2 : 1.5); }
  if (useView) {
    clampView(pView, viewPitch, VIEW_EXT);
    if (!instant) dampView(pViewC, pView, Math.max(dt, 1 / 120)); else Object.assign(pViewC, pView);
    yaw += pViewC.az; pitch = viewPitch + pViewC.el; d *= pViewC.zoom; lx += pViewC.px; lz += pViewC.pz;
  }
  tL.set(lx, ly, lz); tP.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d).add(tL);
  if (menu && !portrait) { const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); tL.addScaledVector(right, -5.5); tP.addScaledVector(right, -5.5); }
  const k = instant ? 1 : 1 - Math.exp(-dt * 3); camPos.lerp(tP, k); camLook.lerp(tL, k); camera.position.copy(camPos); camera.lookAt(camLook); fx.shake(camera, now, 0.6);
}
function tick(dt, now) {
  S.t += dt; U.uTime.value = now; theme.update(dt); fx.update(dt); aura.update(dt, U.uC1.value);
  if (S.state !== 'paused') {
    for (const tm of S.timers.slice()) { tm.t -= dt; if (tm.t <= 0) { const i = S.timers.indexOf(tm); if (i >= 0) S.timers.splice(i, 1); tm.fn(); } }
    const Rx = S.react;
    if (S.mode === 'react' && S.state === 'play' && Rx.phase === 'wait') {
      Rx.waitT -= dt;
      if (Rx.waitT <= 0) {
        Rx.phase = 'go'; Rx.goAt = performance.now();
        arena.setOrb('go', Rx.plan?.lane ?? 1);
        if (Rx.plan?.lanes > 1) audio.laneGo(); else audio.go();
        msg(Rx.plan?.charge ? t('chargeGo') : (Rx.plan?.lanes > 1 ? t('laneGo') : t('go')), true);
        ui.flash('rgba(59,255,138,0.25)', 200); fx.kick({ trauma: 0.06 });
      }
    }
    demoTick(dt);
  }
  arena.update(dt, now); particles.update(dt); waves.update(dt);
  city.update(now, dt, camera); frameCamera(dt, now); fx.applyPost(stage, now); ui.tick(dt); stage.render(dt);
}
i18n.bindToggle($('btn-lang')); i18n.bindToggle($('btn-lang2'));

ui.mountHowto({
  privacyUrl: './privacy.html',
  onOpen: () => { try { audio.click(); } catch (_) {} },
  getContent: () => ({
    kicker: 'CYBER MINI PACK',
    title: t('kit.howto'),
    sections: [
      { heading: t('kit.rules'), body: t('help.rules') },
      { heading: t('kit.controls'), body: t('help.controls') },
    ],
  }),
});
ui.mountSettings({
  audio, stage,
  onOpen: () => { try { audio.click(); } catch (_) {} },
});


i18n.onChange(() => { refreshMenu(); hudRefresh(); });
async function boot() {
  if (document.fonts) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  showMenu(); if (S.demo) enterMode('rps');
  frameCamera(0, 0, true); ui.loaded();
  stage.loop(tick, { isActive: () => S.state !== 'paused', fpsEl: $('fps') });
  if (flags.fps) $('fps').classList.remove('hidden');
  ads.init().catch(() => {});
}
boot().catch((e) => { console.error(e); ui.fatal(t('fatal') + ': ' + e.message); });
