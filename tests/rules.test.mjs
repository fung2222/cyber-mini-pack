import * as R from '../js/rules.js';
import { rpsResult, rpsAI, rpsTell, rpsGlitchMove, RPS, xoWinner, bestMove, xoAI, xoWarpBoard, xoWarpIndex, xoPickHazard, xoVirusSpread, xoNeighbors, xoShouldVirus, reactAverage, reactTier, reactPlan, reactLaneFromX, counter, beats } from '../js/rules.js';
import { xoModifier, XO_MOD_FROM } from '../js/config.js';
import assert from 'node:assert/strict';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
let s = 3; const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
t('rps results', () => { assert.equal(rpsResult('rock', 'scissors'), 1); assert.equal(rpsResult('rock', 'paper'), -1); assert.equal(rpsResult('paper', 'paper'), 0); assert.equal(beats[counter('rock')], 'rock'); });
t('hunter exploits a repeating player', () => { const h = []; let wins = 0; for (let i = 0; i < 60; i++) { const p = 'rock'; const a = rpsAI('hunter', h, rng); const r = rpsResult(p, a); h.push({ p, a, r }); if (i >= 10 && r < 0) wins++; } assert.ok(wins > 30, 'hunter wins ' + wins); });
t('oracle beats a cycling player', () => { const h = []; let ai = 0; for (let i = 0; i < 90; i++) { const p = RPS[i % 3]; const a = rpsAI('oracle', h, rng); const r = rpsResult(p, a); h.push({ p, a, r }); if (i > 20 && r < 0) ai++; } assert.ok(ai > 25, 'oracle wins ' + ai); });
t('rando is valid', () => { for (let i = 0; i < 30; i++) assert.ok(RPS.includes(rpsAI('rando', [], rng))); });
t('xo winner + draw', () => { assert.deepEqual(xoWinner(['X', 'X', 'X', null, null, null, null, null, null]).line, [0, 1, 2]); assert.equal(xoWinner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']).w, 'draw'); assert.equal(xoWinner(Array(9).fill(null)), null); });
t('minimax blocks and wins', () => { assert.equal(bestMove(['X', 'X', null, 'O', null, null, null, null, null], 'O', rng), 2); assert.equal(bestMove(['O', 'O', null, 'X', 'X', null, null, null, null], 'O', rng), 2); });
t('core never loses vs random', () => { for (let g = 0; g < 40; g++) { const b = Array(9).fill(null); let turn = g % 2 ? 'X' : 'O'; let r; while (!(r = xoWinner(b))) { const i = turn === 'O' ? xoAI('core', b, 'O', rng) : b.map((v, k) => v ? -1 : k).filter(k => k >= 0)[Math.floor(rng() * b.filter(v => !v).length)]; b[i] = turn; turn = turn === 'X' ? 'O' : 'X'; } assert.notEqual(r.w, 'X'); } });
t('rookie is beatable', () => { let pw = 0; for (let g = 0; g < 40; g++) { const b = Array(9).fill(null); let turn = 'X'; let r; while (!(r = xoWinner(b))) { const i = turn === 'O' ? xoAI('rookie', b, 'O', rng) : bestMove(b, 'X', rng); b[i] = turn; turn = turn === 'X' ? 'O' : 'X'; } if (r.w === 'X') pw++; } assert.ok(pw > 15, 'player wins ' + pw); });
t('reaction helpers', () => { assert.equal(reactAverage([200, -1, 300]), 250); assert.equal(reactAverage([-1]), 0); assert.equal(reactTier(170)[1], '神經超頻'); assert.equal(reactTier(5000)[2], 'NEEDS COFFEE'); });
t('endless RPS opponents keep coming, capped best-of-7', () => { const { rpsOpponent } = R; const a = rpsOpponent(2), b = rpsOpponent(3), c = rpsOpponent(500); assert.equal(a.id, 'oracle'); assert.ok(b.endless && b.zh && b.en); assert.ok(c.need <= 4 && c.need >= 2); assert.ok(['hunter', 'oracle'].includes(c.id)); });
t('endless XO stages: blunder decreases but stays >= 4%, draw clears', () => { const { xoOpponent, xoAI } = R; const o1 = xoOpponent(3), o9 = xoOpponent(60); assert.ok(o1.blunder > o9.blunder && o9.blunder >= 0.04 && o9.drawClears); const b = Array(9).fill(null); const i = xoAI('endless', b, 'O', Math.random, 0); assert.ok(i >= 0 && i < 9); });
t('reaction gauntlet target tightens and saturates at 300 ms', () => { const { reactTarget } = R; assert.equal(reactTarget(0), 450); assert.ok(reactTarget(5) < 400 && reactTarget(1000) >= 300); });

// ---- Slice B+
t('rps tell: rando truthful, hunter inverted', () => {
  assert.equal(rpsTell('rando', 'rock'), 'rock');
  assert.equal(rpsTell('hunter', 'rock'), counter('rock'));
  const sees = new Set(); for (let i = 0; i < 40; i++) sees.add(rpsTell('oracle', 'rock', rng));
  assert.ok(sees.size >= 2, 'oracle tell varies');
});
t('rps glitch changes move when armed', () => {
  const g = rpsGlitchMove('rock', true, () => 0); assert.ok(g.glitched && g.move !== 'rock' && RPS.includes(g.move));
  const n = rpsGlitchMove('paper', false); assert.equal(n.move, 'paper'); assert.equal(n.glitched, false);
});
t('xo modifiers cycle from stage 4', () => {
  assert.equal(xoModifier(0), null); assert.equal(xoModifier(XO_MOD_FROM - 1), null);
  assert.equal(xoModifier(3), 'fog'); assert.equal(xoModifier(4), 'warp'); assert.equal(xoModifier(5), 'hazard'); assert.equal(xoModifier(6), 'echo'); assert.equal(xoModifier(7), 'fog');
});
t('xo warp rotates board 90° CW', () => {
  assert.equal(xoWarpIndex(0), 2); assert.equal(xoWarpIndex(2), 8); assert.equal(xoWarpIndex(8), 6); assert.equal(xoWarpIndex(6), 0); assert.equal(xoWarpIndex(4), 4);
  const b = ['X', null, 'O', null, 'X', null, null, null, null];
  const w = xoWarpBoard(b); assert.equal(w[2], 'X'); assert.equal(w[8], 'O'); assert.equal(w[4], 'X');
});
t('xo hazard + virus helpers', () => {
  const h = xoPickHazard(Array(9).fill(null), () => 0); assert.ok(h >= 0 && h !== 4);
  assert.ok(xoNeighbors(4).length === 8); assert.ok(xoNeighbors(0).includes(1) && xoNeighbors(0).includes(3));
  const b = Array(9).fill(null); b[0] = 'V';
  const sp = xoVirusSpread(b, 0, () => 0); assert.ok(sp >= 0 && !b[sp]);
  assert.equal(xoShouldVirus(false, b, () => 0), false);
  assert.equal(xoShouldVirus(true, b, () => 0.01, 0.5), true);
});
t('react plan: lanes from round 2, charge on odd, nogo flag', () => {
  const p0 = reactPlan(0, () => 0.99, { nogoChance: 0, laneFrom: 2, chargeOdd: true });
  assert.equal(p0.lanes, 1); assert.equal(p0.charge, false); assert.equal(p0.nogo, false);
  const p1 = reactPlan(1, () => 0.99, { nogoChance: 0, laneFrom: 2, chargeOdd: true });
  assert.equal(p1.charge, true);
  const p2 = reactPlan(2, () => 0.5, { nogoChance: 0, laneFrom: 2, chargeOdd: true });
  assert.equal(p2.lanes, 3); assert.ok(p2.lane >= 0 && p2.lane <= 2);
  const ng = reactPlan(0, () => 0.0, { nogoChance: 1, laneFrom: 2, chargeOdd: true });
  assert.equal(ng.nogo, true);
  assert.equal(reactLaneFromX(0.1, 3), 0); assert.equal(reactLaneFromX(0.5, 3), 1); assert.equal(reactLaneFromX(0.9, 3), 2); assert.equal(reactLaneFromX(0.1, 1), 1);
});
console.log(`ALL PASSED (${n})`);
