# CYBER MINI PACK 賽博小遊戲 — Handoff

Status: **web build v1.2 — polish + signature twists** · live https://fung2222.github.io/cyber-mini-pack/ · not yet packaged for Android.
Series rules: `fung2222/cyber-arcade/docs/ARCADE-HANDOFF.md`. Replaces SONO's separate RPS / XO / reaction pages with ONE app; concept only, all code is new.

## 1. Design
- One floating neon platform in the NeonCity backdrop. Each mode re-dresses it (theme colour changes per mode): RPS = two pedestals + AI "head" orb; XO = 3×3 glowing cell grid; reaction = signal orb(s) with rings. The menu shows a rotating showcase of all three.
- **包剪揼 RPS** (also written 包剪揞): best of 3 (`RPS_WINS_NEEDED = 2`); countdown 包 / 剪 / 揼 then 3D sigils reveal and the loser shatters. Ladder of 3 opponent personalities (`RPS_OPPONENTS`): rando (random) → hunter (counters your most frequent / repeated move) → oracle (Markov-style next-move prediction). Endless rivals after that. Streak = consecutive match wins (saved `rpsStreak`, best `rpsBest`). After a loss a rewarded **保住連勝 keep streak** is offered.
- **過三關 XO**: player is ✕, first move alternates each game; AI thinks ~0.55 s. Ladder `XO_OPPONENTS`: rookie → guard → core (perfect minimax; `drawClears`). Endless Overclock Core with falling blunder rate. Undo removes your move + the AI reply; 1 free per game, more via rewarded. Win line = beam. Saves `xoStage`, `xoBest`, `xoCoreWins`.
- **神經反射 Reaction**: 5 tries (`REACT_TRIES`), random delay 1.4–4.2 s, timed with `performance.now()`. False start / decoy foul excluded from average. Gauntlet target 450 → 300 ms. Saves `reactBest`, `reactBestRound`.
- Result screen is shared. `?demo=1` cycles modes with auto-play.

### v1.1 — endless + bilingual
- `rpsOpponent(i)` / `xoOpponent(i)` / `reactTarget(r)` endless curves; i18n via `js/strings.js`.

### v1.2 — feel polish + signature twists (2026-10-17)
Enhancement pass parallel to neon-recall polish. Keeps endless + hub Arcade Menu. Author commits as 嘉豐. Shots: `/workspace/shots/minipack-polish/`.

#### RPS
| Twist | Behaviour |
|---|---|
| **FAKE TELL** | Before each throw the AI head flashes a gesture: **rando = truthful** (tell = AI move), **hunter = inverted** (tell = counter(AI)), **oracle/endless = random**. |
| **LOCK-IN WAGER** | Hold a move button ~350 ms to lock a wager; win that throw → wager toast + aura; lose → burn toast. Match stats show wager wins. |
| **GLITCH HAND** | Endless (and milestone) rivals arm **one** corrupt throw: after you pick, your move randomly becomes another with glitch SFX/banner. |

Feel: tiered shatter by streak, streak aura, head tilt on tell, perfect-match result title when you take the match  without dropping a point, ambient noise bed.

#### XO
| Twist | Behaviour |
|---|---|
| **Stage mods** (from Stage 4 / index 3, cycle) | **FOG** only hovered cell is clear · **WARP** board rotates 90° CW after each full X+O turn · **HAZARD** one locked cell · **ECHO** tap your last ✕ once to pick it up and relocate. |
| **VIRUS O** | Endless AI (~22%): plants a virus octahedron; after your next move it spreads into one empty neighbour as O unless you step on it to clear. |
| **OVERCLOCK UNDO** | Tap Undo = normal 1 ply; **hold ~420 ms** = remove **2** plies for one charge and force the next AI move to perfect (blunder 0). Meter on the button. |

Feel: ghost-X hover, place trails, win aura, mod chip in HUD.

#### Reaction
| Twist | Behaviour |
|---|---|
| **GO / NO-GO** | ~30% of tries flash a **magenta decoy** mid-wait; tapping it = false start. |
| **TRI-LANE** | From round 3 (index ≥ 2): three orbs; only one goes green — tap that lane (raycast or screen thirds). |
| **CHARGE RELEASE** | Odd rounds: hold during wait, **release on green** (tap-on-green still counts for a11y). |

Feel: ring shrink toward GO, stronger GO punch, ms popup tiers, lane SFX.

## 2. Controls
Mode cards / 1-2-3 · RPS buttons (hold = wager) / 1–3 · XO tap cell, hover, arrows + Enter · Z undo (hold = overclock) · reaction: tap / Space (hold+release on charge rounds) · ‹ back · P pause · M mute · Esc on result = modes.

## 3. File map
```
index.html       HUD + mod chip + OC undo meter, start/pause/result
css/game.css     layout + mod-chip / oc-meter / wager button states
js/config.js     polish + twist constants
js/rules.js      pure logic + tell/glitch/warp/virus/reactPlan (unit-tested)
js/arena.js      platform, sigils, tell flash, XO fog/hazard/echo/virus, multi-lane orbs
js/polish.js     StreakAura, placeTrail, shatterBurst
js/audio.js      MiniAudio (+ tell/wager/glitch/virus/nogo/lane/charge/ambient)
js/strings.js    zh-HK / en (incl. mod.* / twist copy)
js/main.js       state machine + twists + input
vendor/cyber-kit v0.3.7
tests/           rules.test.mjs (18), smoke.py
```
Test hook: `window.__mini` (`api.enter/rpsPick/rpsSetWager/xoHuman/xoUndo/reactTap/cellScreen`).

## 4. Tests
`node tests/rules.test.mjs` (18 tests incl. tell/glitch/mods/warp/virus/reactPlan) · `python tests/smoke.py` — mobile + desktop: modes, RPS, XO+undo, reaction foul+taps, pause, i18n, endless rivals/stages/rounds, demo, zero console errors.
Last run 2026-10-17: rules 18/18, smoke ALL PASSED.

## 5. Android packaging
As DATA FUSE (Capacitor 8 + `@capacitor-community/admob` v8; app id suggestion `hk.fung2222.cyberminipack`).

## 6. Ad placements
| Placement | Type | Code | Rule |
|---|---|---|---|
| `match` | interstitial | `resultMain()` / `resultModes()` → `ads.naturalBreak('match')` | after result button; cooldown 180 s, every 3rd break, 150 s grace |
| `rps-streak` | rewarded | `resultReward()` | opt-in after RPS loss that ended a streak |
| `xo-undo` | rewarded | `xoUndo()` | opt-in once free undo is used |

## 7. Known issues / ideas
- Headless SwiftShader ≈ 3 FPS so reaction times in tests are inflated; on phones timing is frame-accurate (±16 ms).
- Ideas: 2-player pass-and-play, daily reaction seed, more RPS personalities.

## Audio loudness + glow (cyber-kit v0.3.7)
- Music 'chill', sfxTrimDb -2.6. Glow LOW default + pause GLOW toggle (`cyber.glow`).
