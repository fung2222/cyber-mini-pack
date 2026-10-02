// CYBER MINI PACK — one app, three modes: 包剪揼 (RPS AI ladder), 過三關 (XO AI ladder), 神經反射 (reaction test).
import * as THREE from 'three';
import { flags, createStore, createStage, ThemeController, U, Particles, Shockwaves, FxState, NeonCity, createInput, CyberUI, Platform, createAds } from 'cyber-kit';
import { GAME_ID, RPS, RPS_ZH, rpsResult, rpsAI, RPS_OPPONENTS, RPS_WINS_NEEDED, xoWinner, xoAI, XO_OPPONENTS, REACT_TRIES, REACT_DELAY, reactTier, reactAverage } from './rules.js';
import { Arena, PLAT_Y } from './arena.js';
import { MiniAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const store = createStore(GAME_ID);
if (flags.reset) store.clear();
const ui = new CyberUI({ screens: ['start', 'pause', 'result'] });
const stage = createStage({ canvas: $('scene'), bloom: 0.85, bloomRadius: 0.5, bloomThreshold: 0.8, fov: 46, exposure: 1.05, onFatal: (m) => ui.fatal(m) });
const { scene, camera } = stage;
const theme = new ThemeController(); theme.set(1, true);
const city = new NeonCity(stage, { floor: 'reflect', innerRadius: 20, buildings: 260, billboard: { zh: '賽博小遊戲', en: 'M I N I   P A C K', pos: [0, 22, -46], width: 30 }, dustArea: 30, dustHeight: 12 });
const arena = new Arena(scene);
const particles = new Particles(scene, 1800, { floorY: PLAT_Y + 0.05 });
stage.onResize((w, h, pr) => particles.resize(h, pr));
const waves = new Shockwaves(scene, 8);
const fx = new FxState();
const audio = new MiniAudio(store); ui.setMuted(audio.muted);
const ads = createAds({ gameId: GAME_ID, interstitialCooldownSec: 180, breaksBetweenInterstitials: 3, graceSec: 150, units: { android: {} }, onAdOpen: (on) => audio.duckAll(on) });
const MODE_THEME = { attract: 1, rps: 2, xo: 3, react: 4 };
const MODE_NAME = { rps: ['包剪揼', 'RPS'], xo: ['過三關', 'TIC-TAC-TOE'], react: ['神經反射', 'REACTION'] };

const S = { state: 'menu', mode: 'attract', demo: !!flags.demo, timers: [], t: 0,
  rps: { opp: 0, p: 0, a: 0, history: [], phase: 'choose', streak: store.getNum('rpsStreak', 0) },
  xo: { opp: 0, board: Array(9).fill(null), turn: 'X', first: 'X', moves: [], over: false, undo: 1, streak: 0 },
  react: { tries: [], phase: 'idle', goAt: 0, waitT: 0 } };
window.__mini = S;  // test hook
const later = (t, fn) => S.timers.push({ t, fn });
const msg = (txt, big = false) => { const e = $('mp-msg'); e.textContent = txt; e.classList.toggle('big', big); };
const setScore = (txt) => ui.setText('mp-score', txt);

function setState(s) { S.state = s; ui.show({ menu: 'start', paused: 'pause', result: 'result' }[s] || null); ui.hud(s === 'play' || s === 'paused' || s === 'result'); $('demo-tag').classList.toggle('hidden', !S.demo); }
function refreshMenu() {
  ui.setText('mc-rps', `最佳連勝 BEST STREAK ${store.getNum('rpsBest', 0)} · 3 個 AI 性格`);
  ui.setText('mc-xo', `已擊敗 ${store.getNum('xoBeaten', 0)}/3 · 冠軍 ×${store.getNum('xoChamp', 0)}`);
  const rb = store.getNum('reactBest', 0); ui.setText('mc-react', rb ? `最佳平均 BEST ${rb} ms` : '綠燈一著即撳 · 偷步會被捉');
}
function showMenu() { S.timers = []; S.mode = 'attract'; arena.setMode('attract'); theme.set(1); refreshMenu(); setState('menu'); }
function enterMode(m) {
  audio.init(); audio.startMusic(); audio.click();
  S.timers = []; S.mode = m; arena.setMode(m); theme.set(MODE_THEME[m]);
  ui.setText('hud-mode', MODE_NAME[m][0]); $('hud-mode').insertAdjacentHTML('beforeend', ` <span>${MODE_NAME[m][1]}</span>`);
  $('rps-bar').classList.toggle('hidden', m !== 'rps'); $('btn-undo').classList.toggle('hidden', m !== 'xo' || S.demo);
  setState('play'); msg(''); setScore('');
  if (m === 'rps') rpsStartMatch(); else if (m === 'xo') xoStartGame(); else reactStart();
}

// ================================================================ 包剪揼
function rpsStartMatch() {
  const R = S.rps; R.p = 0; R.a = 0; R.history = []; R.phase = 'choose';
  const o = RPS_OPPONENTS[R.opp]; arena.setHeadColor([0xff2bd6, 0xffc22b, 0xa66bff][R.opp]); arena.clearSigils();
  ui.setText('hud-opp', `VS ${o.zh}`); ui.setText('hud-stat-label', '連勝 '); $('hud-stat-label').insertAdjacentHTML('beforeend', '<span>STREAK</span>'); ui.setText('hud-stat', R.streak);
  setScore(`0 : 0`); msg(`${o.zh} · ${o.desc}`); rpsButtons(true);
  ui.banner(`對手 ${R.opp + 1}/3`, `${o.en}`, '三局兩勝 · BEST OF 3');
}
function rpsButtons(on, picked) { document.querySelectorAll('.rps-btn').forEach(b => { b.disabled = !on; b.classList.toggle('picked', b.dataset.move === picked); }); }
function rpsPick(move) {
  const R = S.rps; if (S.state !== 'play' || S.mode !== 'rps' || R.phase !== 'choose') return;
  R.phase = 'count'; rpsButtons(false, move); arena.clearSigils();
  const ai = rpsAI(RPS_OPPONENTS[R.opp].id, R.history);
  ['包', '剪', '揼！'].forEach((w, i) => later(i * 0.32, () => { msg(w, true); audio.beat(i); arena.pulse(0, 0, 0.6); fx.kick({ trauma: 0.04 }); }));
  later(1.0, () => rpsReveal(move, ai));
}
function rpsReveal(p, a) {
  const R = S.rps; const r = rpsResult(p, a); R.history.push({ p, a, r });
  arena.showSigils(p, a); audio.reveal();
  const pp = arena.sigilPos(0), ap = arena.sigilPos(1);
  later(0.4, () => {
    if (r === 0) { msg(`和！ ${RPS_ZH[p]} vs ${RPS_ZH[a]} · DRAW`); audio.draw(); }
    else {
      const winP = r > 0 ? pp : ap, loseI = r > 0 ? 1 : 0; arena.shatter(loseI);
      const c = new THREE.Color(r > 0 ? 0x00e5ff : 0xff2bd6);
      particles.burst(r > 0 ? ap : pp, c, 60, { speed: 6, up: 3, life: 0.8, size: 1 }); waves.spawn(winP.clone().setY(PLAT_Y + 0.05), c, { r0: 0.3, r1: 4, h: 0.6, dur: 0.6 });
      if (r > 0) { R.p++; msg(`${RPS_ZH[p]} 贏 ${RPS_ZH[a]}！ · POINT`); audio.win(); Platform.haptic('medium'); } else { R.a++; msg(`${RPS_ZH[a]} 贏 ${RPS_ZH[p]}… · AI POINT`); audio.lose(); arena.headMood = 1; Platform.haptic('warning'); }
      fx.kick({ trauma: 0.15, aberr: 0.6 });
    }
    setScore(`${R.p} : ${R.a}`);
    if (R.p >= RPS_WINS_NEEDED || R.a >= RPS_WINS_NEEDED) later(1.0, rpsMatchEnd);
    else later(0.9, () => { R.phase = 'choose'; rpsButtons(true); msg('再嚟！揀一樣 · CHOOSE'); });
  });
}
function rpsMatchEnd() {
  const R = S.rps, won = R.p > R.a, o = RPS_OPPONENTS[R.opp];
  let record = false;
  if (won) { R.streak++; if (R.streak > store.getNum('rpsBest', 0)) { store.setNum('rpsBest', R.streak); record = true; } R.lastLost = false; }
  else { R.lostStreak = R.streak; R.lastLost = true; R.streak = 0; }
  store.setNum('rpsStreak', R.streak);
  const champ = won && R.opp === RPS_OPPONENTS.length - 1;
  showResult({
    kicker: `${o.en} · ${R.p} : ${R.a}`, title: champ ? '包剪揼之王！' : won ? '你贏咗！' : '輸咗…', en: champ ? 'RPS CHAMPION' : won ? 'YOU WIN' : 'YOU LOSE', record, danger: !won,
    stats: [['比分', `${R.p}:${R.a}`], ['連勝', R.streak], ['最佳連勝', store.getNum('rpsBest', 0)], ['對手', `${R.opp + 1}/3`]],
    main: won ? (champ ? ['由頭再嚟', 'NEW LADDER · ENTER'] : ['下一位對手', 'NEXT OPPONENT · ENTER']) : ['再挑戰', 'REMATCH · ENTER'],
    reward: !won && R.lostStreak > 0 ? `保住 ${R.lostStreak} 連勝` : null,
  });
  if (won) { R.opp = champ ? 0 : R.opp + 1; if (champ) audio.champion(); else audio.win(); } else audio.lose();
}

// ================================================================ 過三關
function xoStartGame() {
  const X = S.xo; X.board = Array(9).fill(null); X.moves = []; X.over = false; X.undo = 1; arena.xoClear();
  const o = XO_OPPONENTS[X.opp]; arena.setHeadColor([0x3bff8a, 0xffc22b, 0xff3b5c][X.opp]);
  ui.setText('hud-opp', `VS ${o.zh}`); ui.setText('hud-stat-label', '關卡 '); $('hud-stat-label').insertAdjacentHTML('beforeend', '<span>STAGE</span>'); ui.setText('hud-stat', `${X.opp + 1}/3`);
  setScore('✕ 你 · ◯ AI'); xoUndoBadge();
  ui.banner(`第 ${X.opp + 1} 關`, o.en, o.desc);
  X.turn = X.first; if (X.turn === 'O') { msg('對手先行… · AI FIRST'); later(0.9, xoAITurn); } else msg('你先行 · YOUR MOVE');
}
function xoUndoBadge() { const b = $('undo-badge'); if (S.xo.undo > 0) { b.textContent = S.xo.undo; b.classList.remove('ad'); } else { b.textContent = ads.isNative ? 'AD' : '+1'; b.classList.add('ad'); } }
function xoPlay(i, who) {
  const X = S.xo; if (X.board[i] || X.over) return false;
  X.board[i] = who; X.moves.push(i); arena.xoPlace(i, who); audio.place(who === 'O');
  const p = arena.cellPos(i); particles.burst(p, new THREE.Color(who === 'X' ? 0x00e5ff : 0xff2bd6), 18, { speed: 3, up: 2, life: 0.5, size: 0.7 }); arena.pulse(p.x, p.z, 0.6);
  const w = xoWinner(X.board);
  if (w) { X.over = true; later(0.25, () => xoEnd(w)); return true; }
  X.turn = who === 'X' ? 'O' : 'X';
  if (X.turn === 'O') { msg('對手諗緊… · THINKING'); later(0.55, xoAITurn); } else msg('到你 · YOUR MOVE');
  return true;
}
function xoAITurn() { const X = S.xo; if (X.over || S.mode !== 'xo' || S.state !== 'play') return; xoPlay(xoAI(XO_OPPONENTS[X.opp].id, X.board.slice(), 'O'), 'O'); }
function xoHuman(i) {
  const X = S.xo; if (S.state !== 'play' || S.mode !== 'xo' || X.turn !== 'X' || X.over || i < 0) return;
  if (S.demo) return; xoPlay(i, 'X'); Platform.haptic('light');
}
async function xoUndo() {
  const X = S.xo; if (S.mode !== 'xo' || S.state !== 'play' || X.over || X.turn !== 'X' || ui.modalOpen) return;
  if (X.moves.length < 2) { audio.denied(); ui.toast('未有得悔棋 · NOTHING TO UNDO'); return; }
  if (X.undo <= 0) {
    const ok = await ui.confirm(ads.isNative ? { kicker: 'UNDO', title: '悔多一步？', text: '睇一段自願觀看嘅獎勵廣告。', ok: '睇廣告', okSmall: 'WATCH AD', cancel: '唔使喇', cancelSmall: 'NO THANKS' } : { kicker: 'UNDO', title: '悔多一步', text: '網頁版免費。(App 版會用自願觀看嘅獎勵廣告。)', ok: '領取', okSmall: 'CLAIM', cancel: '唔使喇', cancelSmall: 'NO THANKS' });
    if (!ok) return; const r = await ads.rewarded('xo-undo'); if (!r.rewarded) return; X.undo++;
  }
  X.undo--; for (let k = 0; k < 2; k++) { const i = X.moves.pop(); X.board[i] = null; arena.xoUnplace(i); }
  audio.back(); fx.kick({ aberr: 0.5 }); xoUndoBadge(); msg('已悔棋 · UNDONE');
}
function xoEnd(w) {
  const X = S.xo, o = XO_OPPONENTS[X.opp];
  if (w.line) { arena.xoLine(w.line, w.w === 'X' ? 0x00e5ff : 0xff2bd6); for (const i of w.line) particles.burst(arena.cellPos(i), new THREE.Color(w.w === 'X' ? 0x00e5ff : 0xff2bd6), 30, { speed: 4, up: 4, life: 0.8 }); fx.kick({ trauma: 0.2, aberr: 0.8 }); }
  const held = w.w === 'draw' && !!o.drawClears, won = w.w === 'X' || held, draw = w.w === 'draw' && !held;
  X.first = X.first === 'X' ? 'O' : 'X';
  let record = false;
  if (won) { X.streak++; const beaten = Math.max(store.getNum('xoBeaten', 0), X.opp + 1); if (beaten > store.getNum('xoBeaten', 0)) { store.setNum('xoBeaten', beaten); record = true; } }
  const champ = won && X.opp === XO_OPPONENTS.length - 1; if (champ) store.setNum('xoChamp', store.getNum('xoChamp', 0) + 1);
  if (won) { champ ? audio.champion() : audio.win(); Platform.haptic('success'); } else if (draw) audio.draw(); else { audio.lose(); arena.headMood = 1; }
  later(1.1, () => showResult({
    kicker: `STAGE ${X.opp + 1} · ${o.en}`, title: held ? '頂住主機！' : champ ? '過晒三關！' : won ? '過關！' : draw ? '和局' : '輸咗…', en: champ ? 'LADDER CLEARED' : won ? 'STAGE CLEAR' : draw ? 'DRAW' : 'YOU LOSE', record, danger: !won && !draw,
    stats: [['結果', won ? '勝 WIN' : draw ? '和 DRAW' : '負 LOSS'], ['步數', X.moves.length], ['已擊敗', `${store.getNum('xoBeaten', 0)}/3`], ['冠軍次數', store.getNum('xoChamp', 0)]],
    main: won ? (champ ? ['由第一關再嚟', 'NEW LADDER · ENTER'] : ['下一關', 'NEXT STAGE · ENTER']) : ['再嚟一局', 'REMATCH · ENTER'], reward: null,
  }));
  if (won) X.opp = champ ? 0 : X.opp + 1;
}

// ================================================================ 神經反射
function reactStart() {
  const Rx = S.react; Rx.tries = []; ui.setText('hud-opp', '準備好未？'); ui.setText('hud-stat-label', '最佳 '); $('hud-stat-label').insertAdjacentHTML('beforeend', '<span>BEST</span>');
  ui.setText('hud-stat', store.getNum('reactBest', 0) ? store.getNum('reactBest', 0) + 'ms' : '—');
  ui.banner('神經反射', 'REACTION TEST', `${REACT_TRIES} 次 · 綠燈先好撳`); reactArm(1.6);
}
function reactArm(extra = 0) {
  const Rx = S.react; Rx.phase = 'wait'; Rx.waitT = extra + REACT_DELAY[0] + Math.random() * (REACT_DELAY[1] - REACT_DELAY[0]);
  arena.setOrb('wait'); msg('等綠燈… · WAIT FOR GREEN', true); setScore(`${Rx.tries.length + 1} / ${REACT_TRIES}`); ui.setText('hud-opp', `第 ${Rx.tries.length + 1} 次`);
}
function reactTap() {
  const Rx = S.react; if (S.state !== 'play' || S.mode !== 'react') return;
  if (Rx.phase === 'wait') {
    Rx.tries.push(-1); Rx.phase = 'foul'; arena.setOrb('foul'); audio.foul(); fx.kick({ glitch: 0.6, aberr: 1 }); ui.flash('rgba(255,194,43,0.3)', 300); Platform.haptic('error');
    msg('偷步！ FALSE START', true); later(1.3, reactNext);
  } else if (Rx.phase === 'go') {
    const ms = Math.max(1, Math.round(performance.now() - Rx.goAt)); Rx.tries.push(ms); Rx.phase = 'shown'; arena.setOrb('idle');
    const tier = reactTier(ms); msg(`${ms} ms · ${tier[1]}`, true); audio.win(); Platform.haptic('light');
    const sp = stage.toScreen(arena.orb.position.clone().add(new THREE.Vector3(0, 1.8, 0))); ui.popup(sp.x, sp.y, ms + 'ms', tier[2], ms < 250 ? 'big' : '');
    particles.burst(arena.orb.position, new THREE.Color(0x3bff8a), 50, { speed: 5, up: 3, life: 0.7 }); waves.spawn(new THREE.Vector3(0, PLAT_Y + 0.05, 0), new THREE.Color(0x3bff8a), { r0: 1, r1: 6, h: 0.8, dur: 0.6 });
    later(1.2, reactNext);
  }
}
function reactNext() { const Rx = S.react; if (Rx.tries.length >= REACT_TRIES) reactEnd(); else reactArm(); }
function reactEnd() {
  const Rx = S.react, avg = reactAverage(Rx.tries), valid = Rx.tries.filter(t => t > 0), best1 = valid.length ? Math.min(...valid) : 0, fouls = Rx.tries.filter(t => t < 0).length;
  let record = false; const prev = store.getNum('reactBest', 0);
  if (avg && (!prev || avg < prev)) { store.setNum('reactBest', avg); record = true; }
  const tier = avg ? reactTier(avg) : [0, '要再試過', 'TRY AGAIN'];
  audio.champion();
  showResult({ kicker: `AVERAGE ${avg || '—'} ms`, title: tier[1], en: tier[2], record, danger: !avg,
    stats: [['平均', avg ? avg + 'ms' : '—'], ['最快', best1 ? best1 + 'ms' : '—'], ['偷步', fouls], ['最佳紀錄', store.getNum('reactBest', 0) ? store.getNum('reactBest', 0) + 'ms' : '—']],
    main: ['再測一次', 'AGAIN · ENTER'], reward: null });
}

// ================================================================ result screen
function showResult(o) {
  ui.setText('res-kicker', o.kicker); const t = $('res-title'); t.textContent = o.title; t.dataset.text = o.title; t.classList.toggle('danger', !!o.danger);
  ui.setText('res-en', o.en); $('res-record').classList.toggle('hidden', !o.record);
  $('res-stats').innerHTML = o.stats.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  ui.setText('res-main-zh', o.main[0]); ui.setText('res-main-en', o.main[1]);
  const rw = $('btn-res-reward'); rw.classList.toggle('hidden', !o.reward || !ads.rewardedAvailable()); if (o.reward) { rw.querySelector('span').textContent = o.reward; ui.setText('res-reward-sub', ads.isNative ? 'KEEP STREAK · 睇段廣告' : 'KEEP STREAK · 免費 FREE'); }
  setState('result'); msg('');
  if (S.demo) later(2.4, () => demoNext());
}
async function resultMain() { if (S.state !== 'result') return; audio.click(); await ads.naturalBreak('match'); enterMode(S.mode); }
async function resultModes() { if (S.state !== 'result') return; audio.back(); await ads.naturalBreak('match'); showMenu(); }
async function resultReward() {
  if (S.state !== 'result' || S.mode !== 'rps' || !S.rps.lastLost) return; const r = await ads.rewarded('rps-streak'); if (!r.rewarded) return;
  S.rps.streak = S.rps.lostStreak; S.rps.lastLost = false; store.setNum('rpsStreak', S.rps.streak); ui.toast(`連勝保住咗：${S.rps.streak} · STREAK SAVED`); $('btn-res-reward').classList.add('hidden');
}
function pause() { if (S.state !== 'play') return; setState('paused'); audio.duckMusic(); }
function resume() { if (S.state !== 'paused') return; setState('play'); audio.unduckMusic(); if (S.mode === 'react' && S.react.phase === 'go') reactArm(); }

// ================================================================ demo autoplay
const DEMO_SEQ = ['rps', 'xo', 'react'];
function demoNext() { const i = (DEMO_SEQ.indexOf(S.mode) + (S.state === 'result' ? 1 : 0)) % 3; if (S.state === 'result' && S.mode === 'rps' && Math.max(S.rps.p, S.rps.a) < 2) return; enterMode(DEMO_SEQ[i]); }
function demoTick(dt) {
  if (!S.demo || S.state !== 'play') return;
  S.demoT = (S.demoT || 0) + dt;
  if (S.mode === 'rps' && S.rps.phase === 'choose' && S.demoT > 1.1) { S.demoT = 0; rpsPick(RPS[Math.floor(Math.random() * 3)]); }
  if (S.mode === 'xo' && S.xo.turn === 'X' && !S.xo.over && S.demoT > 0.8) { S.demoT = 0; const b = S.xo.board.slice(); xoPlay(xoAI('guard', b, 'X'), 'X'); }
  if (S.mode === 'react' && S.react.phase === 'go' && performance.now() - S.react.goAt > 200 + Math.random() * 140) reactTapDemo();
}
function reactTapDemo() { S.demo = false; reactTap(); S.demo = true; }

// ================================================================ input
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickCell(x, y) { ndc.set(x / stage.width * 2 - 1, -(y / stage.height) * 2 + 1); ray.setFromCamera(ndc, camera); return arena.pickCell(ray); }
let xoCursor = 4;
createInput({
  anyGesture() { audio.init(); audio.startMusic(); },
  tap(p) { if (ui.modalOpen || S.state !== 'play' || S.demo) return; if (S.mode === 'xo') xoHuman(pickCell(p.x, p.y)); else if (S.mode === 'react') reactTap(); },
  dir(d) { if (S.mode !== 'xo' || S.state !== 'play') return; const c = xoCursor % 3, r = Math.floor(xoCursor / 3); xoCursor = d === 'left' ? r * 3 + (c + 2) % 3 : d === 'right' ? r * 3 + (c + 1) % 3 : d === 'up' ? ((r + 2) % 3) * 3 + c : ((r + 1) % 3) * 3 + c; arena.setHoverCell(xoCursor); audio.tick(); },
  action(a) {
    if (ui.modalOpen) { if (a === 'pause') ui.closeModal(); return; }
    if (a === 'primary') { if (S.state === 'result') resultMain(); else if (S.state === 'paused') resume(); else if (S.state === 'play') { if (S.mode === 'react') reactTap(); else if (S.mode === 'xo') xoHuman(xoCursor); } else if (S.state === 'menu') enterMode('rps'); }
    else if (a === 'pause') { if (S.state === 'play') pause(); else if (S.state === 'paused') resume(); else if (S.state === 'result') resultModes(); }
    else if (a === 'mute') { audio.init(); ui.setMuted(audio.toggleMute()); }
    else if (a === 'undo') xoUndo();
    else if (a === 'fps') $('fps').classList.toggle('hidden');
    else if (['m1', 'm2', 'm3'].includes(a)) { const m = { m1: 'rock', m2: 'paper', m3: 'scissors' }[a]; if (S.state === 'menu') enterMode(DEMO_SEQ[+a[1] - 1]); else if (S.mode === 'rps') rpsPick(m); }
  },
}, { swipe: 'once', threshold: 60, actions: { Digit1: 'm1', Digit2: 'm2', Digit3: 'm3', Numpad1: 'm1', Numpad2: 'm2', Numpad3: 'm3' } });
$('scene').addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && S.mode === 'xo' && S.state === 'play') { const i = pickCell(e.clientX, e.clientY); arena.setHoverCell(i); if (i >= 0) xoCursor = i; } });
document.querySelectorAll('.mode-card').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); enterMode(b.dataset.mode); b.blur(); }));
document.querySelectorAll('.rps-btn').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); if (!S.demo) rpsPick(b.dataset.move); b.blur(); }));
ui.on('btn-back', () => { audio.back(); showMenu(); }); ui.on('btn-mute', () => { audio.init(); ui.setMuted(audio.toggleMute()); });
ui.on('btn-undo', xoUndo); ui.on('btn-resume', resume); ui.on('btn-quit', showMenu);
ui.on('btn-res-main', resultMain); ui.on('btn-res-modes', resultModes); ui.on('btn-res-reward', resultReward);
Platform.onBack(() => { if (ui.closeModal()) return true; if (S.state === 'play') { pause(); return true; } if (S.state === 'paused') { resume(); return true; } if (S.state === 'result') { resultModes(); return true; } return false; });
Platform.onPause(() => { if (!S.demo) pause(); });
S.api = { enter: enterMode, rpsPick, xoHuman, reactTap, cellScreen: (i) => stage.toScreen(arena.cellPos(i)) };

// ================================================================ camera + loop
const camPos = new THREE.Vector3(0, 14, 14), camLook = new THREE.Vector3(0, PLAT_Y, 0), tP = new THREE.Vector3(), tL = new THREE.Vector3();
function frameCamera(dt, t, instant = false) {
  const aspect = stage.width / stage.height, portrait = aspect < 0.9, menu = S.state === 'menu';
  const vfov = portrait ? 52 : 42; camera.fov = vfov + fx.fovKick * 3; camera.updateProjectionMatrix();
  const pitch = THREE.MathUtils.degToRad(menu ? 32 : S.mode === 'xo' ? (portrait ? 64 : 56) : (portrait ? 46 : 38));
  const R = 5.7, tanV = Math.tan(THREE.MathUtils.degToRad(vfov / 2)), tanH = tanV * aspect;
  let d = Math.max(R / (tanH * 0.95), (R * Math.sin(pitch) + 2.5 * Math.cos(pitch)) / (tanV * (portrait ? 0.6 : 0.8))) + R * 0.5;
  let yaw = Math.sin(t * 0.13) * 0.05, lx = 0, ly = PLAT_Y + (S.mode === 'xo' ? 0.2 : 1.2), lz = portrait && !menu ? 0.6 : 0;
  if (menu) { yaw = t * 0.12; d *= portrait ? 1.0 : 0.85; if (!portrait) lx = 0; ly = PLAT_Y + (portrait ? -4.2 : 1.5); }
  tL.set(lx, ly, lz); tP.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d).add(tL);
  if (menu && !portrait) { const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); tL.addScaledVector(right, -5.5); tP.addScaledVector(right, -5.5); }
  const k = instant ? 1 : 1 - Math.exp(-dt * 3); camPos.lerp(tP, k); camLook.lerp(tL, k); camera.position.copy(camPos); camera.lookAt(camLook); fx.shake(camera, t, 0.6);
}
function tick(dt, t) {
  S.t += dt; U.uTime.value = t; theme.update(dt); fx.update(dt);
  if (S.state !== 'paused') {
    for (const tm of S.timers.slice()) { tm.t -= dt; if (tm.t <= 0) { const i = S.timers.indexOf(tm); if (i >= 0) S.timers.splice(i, 1); tm.fn(); } }
    const Rx = S.react;
    if (S.mode === 'react' && S.state === 'play' && Rx.phase === 'wait') { Rx.waitT -= dt; if (Rx.waitT <= 0) { Rx.phase = 'go'; Rx.goAt = performance.now(); arena.setOrb('go'); audio.go(); msg('撳！ TAP!', true); ui.flash('rgba(59,255,138,0.25)', 200); } }
    demoTick(dt);
  }
  arena.update(dt, t); particles.update(dt); waves.update(dt);
  city.update(t, dt, camera); frameCamera(dt, t); fx.applyPost(stage, t); ui.tick(dt); stage.render(dt);
}
async function boot() {
  if (document.fonts) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  showMenu(); if (S.demo) enterMode('rps');
  frameCamera(0, 0, true); ui.loaded();
  stage.loop(tick, { isActive: () => S.state !== 'paused', fpsEl: $('fps') });
  if (flags.fps) $('fps').classList.remove('hidden');
  ads.init().catch(() => {});
}
boot().catch((e) => { console.error(e); ui.fatal('載入失敗 Failed to start: ' + e.message); });
