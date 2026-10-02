# CYBER MINI PACK 賽博小遊戲 — Handoff

Status: **web build done (v1.0)** · live https://fung2222.github.io/cyber-mini-pack/ · not yet packaged for Android.
Series rules: `fung2222/cyber-arcade/docs/ARCADE-HANDOFF.md`. Replaces SONO's separate RPS / XO / reaction pages with ONE app; concept only, all code is new.

## 1. Design
- One floating neon platform in the NeonCity backdrop. Each mode re-dresses it (theme colour changes per mode): RPS = two pedestals + AI "head" orb; XO = 3×3 glowing cell grid; reaction = big signal orb with rings. The menu shows a rotating showcase of all three.
- **包剪揼 RPS** (also written 包剪揞): best of 3 (`RPS_WINS_NEEDED = 2`); countdown 包 / 剪 / 揼 then 3D sigils reveal and the loser shatters. Ladder of 3 opponent personalities (`RPS_OPPONENTS`): rando (random) → hunter (counters your most frequent / repeated move) → oracle (Markov-style next-move prediction). Beating all 3 = champion and the ladder restarts. Streak = consecutive match wins (saved `rpsStreak`, best `rpsBest`). After a loss a rewarded **保住連勝 keep streak** is offered.
- **過三關 XO**: player is ✕, first move alternates each game; AI thinks ~0.55 s. Ladder `XO_OPPONENTS`: rookie (takes wins, never blocks) → guard (blocks, 65 % minimax) → core (perfect minimax; `drawClears` = a draw clears the stage, since it can't be beaten). Win/clear → next stage, draw/loss → rematch. Undo removes your move + the AI reply; 1 free per game, more via rewarded. Win line = beam. Saves `xoBeaten`, `xoChamp`.
- **神經反射 Reaction**: 5 tries (`REACT_TRIES`), random delay 1.4–4.2 s (`REACT_DELAY`), timed with `performance.now()` from the frame GO is shown. Tapping during the wait = false start (try counts as −1, excluded from the average). Tiers in `REACT_TIERS` (≤180 神經超頻 … >350 要飲杯咖啡). Saves best average `reactBest` (lower is better).
- Result screen is shared: kicker, title, 4 stats, main (next/rematch/again), reward (RPS only), mode select.
- `?demo=1` cycles RPS → XO → React with auto-play and auto-advance (undo button hidden in demo).

## 2. Controls
Mode cards / 1-2-3 · RPS buttons / 1 rock 2 paper 3 scissors · XO tap cell (raycast on the 3D board), mouse hover, arrows + Enter · Z undo · reaction: tap anywhere / Space · ‹ back to modes · P pause · M mute · Esc on result = modes. Android back: dialog → pause → resume; result → modes.

## 3. File map
```
index.html       HUD (mode, opponent, stat, score line, message, RPS bar, undo), start (mode select) / pause / result screens
css/game.css     layout incl. portrait rules
js/rules.js      pure logic: RPS results + 3 AIs, XO winner/minimax + 3 AIs, reaction tiers/average (unit-tested)
js/arena.js      platform, sigils (rock/paper/scissors original geometry), XO grid + marks + line beam, reaction orb, attract showcase
js/audio.js      MiniAudio (cyber-kit SynthAudio, 'chill' music)
js/main.js       state machine, the three modes, result screen, ads hooks, demo, input, camera framing
vendor/cyber-kit cyber-kit v0.1.0
tests/           rules.test.mjs, smoke.py
```
Test hook: `window.__mini` (state, mode, rps, xo, react, `api.enter/rpsPick/xoHuman/reactTap/cellScreen`).

## 4. Tests
`node tests/rules.test.mjs` (9 tests) · `python tests/smoke.py [url] [out]` — 412×915 touch + 1280×800: mode select, RPS full best-of-3 via buttons + keys, XO taps on 3D cells + undo + result, reaction false start + timed taps + result, pause/resume/back, demo advances modes, zero console errors. Also verified: a draw vs MAINFRAME CORE shows 頂住主機！ and resets the ladder. Last run 2026-10-02: ALL PASSED.

## 5. Android packaging
As DATA FUSE (Capacitor 8 + `@capacitor-community/admob` v8; app id suggestion `hk.fung2222.cyberminipack`; portrait + landscape both fine).

## 6. Ad placements
| Placement | Type | Code | Rule |
|---|---|---|---|
| `match` | interstitial | `resultMain()` / `resultModes()` → `ads.naturalBreak('match')` | only after the player taps next/modes on a result; cooldown 180 s, every 3rd break, 150 s grace |
| `rps-streak` | rewarded | `resultReward()` | opt-in after an RPS loss that ended a streak |
| `xo-undo` | rewarded | `xoUndo()` | opt-in confirm dialog once the free undo is used |

## 7. Known issues / ideas
- Headless SwiftShader ≈ 3 FPS so reaction times in tests are inflated; on phones timing is frame-accurate (±16 ms).
- Ideas: 2-player pass-and-play for RPS/XO, daily reaction leaderboard, more RPS personalities.
