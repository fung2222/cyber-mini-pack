# CYBER MINI PACK — deep audit 2026-11-03

Scope: 390px mobile play (menu / RPS / XO Stage 4 FOG / Reaction), plus source review of rules, turn timers and audio. Read-only audit first; fixes tracked below.

## Findings

### 1. BGM still had a continuous noise layer (high)
`js/audio.js` used the cyber-kit `chill` preset, which has `hats: 'soft'` and a noise snare, and `startAmbient()` looped a filtered noise buffer at 0.012 gain. That is the same headphone hiss Roy rejected in data-fuse / neon-recall.

Fix: clone the preset with `hats: false`, silence BGM `noiseHit` calls during `playStep` only (tonal kick/bass/pad/arp retained), and make `startAmbient()` / `stopAmbient()` no-ops. SFX noise stays transient.

### 2. Virus O gave the AI two moves (high)
After a player X move, `xoPlay()` scheduled `xoAITurn` at 0.55s and a virus spread at 0.35s. The spread already placed an O and handed the turn back to X, but the old `xoAITurn()` only checked `over/mode/state`, not whose turn it was. It then placed a second O.

Repro before fix: `tests/virus-turns.py` → `AI does not get a second O after virus spread` FAIL.

Fix: `xoAITurn()` now requires `X.turn === 'O'`; `xoDoVirusSpread()` also requires `X.turn === 'O'`, so a spread cannot fire after undo.

### 3. Virus spread could fire after undo (medium)
The spread timer only checked `over`, `virus` and `mode`; if the player undid back to their turn before it fired, it could still place an O on the player's turn. Same `X.turn === 'O'` guard fixes it.

Repro before fix: `tests/virus-turns.py` → `virus does not spread on the player turn (undo-safe)` FAIL.

### 4. Reaction result showed historical best round (medium)
`reactEnd()` rendered `Math.max(1, store.getNum('reactBestRound', 0))` in the **ROUND REACHED** stat. Failing round 3 after a previous best of round 5 showed `5`, while the result kicker said round 3.

Fix: render the current `round` value. Repro before fix: `tests/react-round.py` → `round reached is current round 3 (got 1)` FAIL.

## UI check
390px menu, RPS choice, XO Stage 4 FOG and Reaction all fit without overflow or console errors. Existing `tests/layout.py` still passes (mode cards 71px; RPS SCISSORS 93px inside 96px).

## Verification
- `node tests/rules.test.mjs` — 18/18
- `tests/virus-turns.py` — PASS
- `tests/react-round.py` — PASS
- `tests/layout.py` — PASS, zero console errors
