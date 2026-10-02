"""Headless smoke test for CYBER MINI PACK.
Usage:  python tests/smoke.py [base_url] [out_dir]
  base_url defaults to http://127.0.0.1:18940/cyber-mini-pack/  (serve the repo parent dir with `python3 -m http.server`)
Checks, on a 412x915 touch viewport and a 1280x800 desktop: zero console errors; mode select; RPS via buttons + keys
plays a full best-of-3 to the result screen; XO via tapping cells on the 3D board (raycast) + undo + result;
reaction test (false start detection + timed taps) to the result screen with an average; pause/back; demo autoplays.
Headless Chrome runs at a few FPS, so everything polls game state instead of trusting wall time.
"""
import sys, os, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18940/cyber-mini-pack/'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'docs/shots'
os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
fails = []

def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def wait_for(pg, js, timeout=40):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.evaluate(js): return True
        pg.wait_for_timeout(150)
    return False

def run(p, name, w, h, mobile):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    tap = (lambda sel: pg.tap(sel)) if mobile else (lambda sel: pg.click(sel))
    pg.goto(BASE + '?reset=1'); pg.wait_for_timeout(4500)
    pg.screenshot(path=f'{OUT}/{name}-start.png')
    check(pg.evaluate('__mini.state') == 'menu', f'{name}: mode select shown')

    # ---- RPS
    tap('#mode-rps'); pg.wait_for_timeout(500)
    check(pg.evaluate('__mini.mode') == 'rps', f'{name}: RPS mode entered')
    rounds = 0
    while pg.evaluate('__mini.state') == 'play' and rounds < 12:
        if not wait_for(pg, "__mini.rps.phase==='choose' || __mini.state!=='play'"): break
        if pg.evaluate('__mini.state') != 'play': break
        if rounds % 2 == 0: tap('.rps-btn[data-move="%s"]' % ['rock', 'paper', 'scissors'][rounds % 3])
        else: pg.keyboard.press(str(rounds % 3 + 1))
        rounds += 1
        wait_for(pg, "__mini.rps.phase!=='choose' || __mini.state!=='play'", 5)
        if rounds == 1:
            wait_for(pg, "__mini.rps.history.length>=1", 20); pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/{name}-rps.png')
    wait_for(pg, "__mini.state==='result'")
    s = pg.evaluate('({st:__mini.state, p:__mini.rps.p, a:__mini.rps.a, h:__mini.rps.history.length})')
    check(s['st'] == 'result' and max(s['p'], s['a']) == 2, f'{name}: RPS best-of-3 reaches result ({s})')
    pg.screenshot(path=f'{OUT}/{name}-rps-result.png')
    tap('#btn-res-modes'); wait_for(pg, "__mini.state==='menu'", 10)
    check(pg.evaluate('__mini.state') == 'menu', f'{name}: result -> modes')

    # ---- XO
    tap('#mode-xo'); pg.wait_for_timeout(400)
    check(pg.evaluate('__mini.mode') == 'xo', f'{name}: XO mode entered')
    placed = 0; undone = False
    for _ in range(14):
        if not wait_for(pg, "(__mini.xo.turn==='X' && !__mini.xo.over) || __mini.state!=='play'"): break
        if pg.evaluate('__mini.state') != 'play' or pg.evaluate('__mini.xo.over'): break
        free = pg.evaluate("__mini.xo.board.map((v,i)=>v?-1:i).filter(i=>i>=0)")
        cell = 4 if 4 in free else free[0]
        pt = pg.evaluate(f'__mini.api.cellScreen({cell})')
        n0 = pg.evaluate("__mini.xo.board.filter(v=>v==='X').length")
        if mobile: pg.touchscreen.tap(pt['x'], pt['y'])
        else: pg.mouse.click(pt['x'], pt['y'])
        ok = wait_for(pg, f"__mini.xo.board.filter(v=>v==='X').length>{n0} || __mini.xo.over", 6)
        if ok: placed += 1
        if placed == 1: pg.wait_for_timeout(200)
        if placed == 2 and not undone:
            wait_for(pg, "__mini.xo.turn==='X' || __mini.xo.over", 20)
            if not pg.evaluate('__mini.xo.over'):
                m0 = pg.evaluate('__mini.xo.moves.length'); tap('#btn-undo')
                undone = wait_for(pg, f'__mini.xo.moves.length==={m0}-2', 6)
                check(undone, f'{name}: XO undo removes a move pair')
                pg.screenshot(path=f'{OUT}/{name}-xo.png')
    check(placed >= 2, f'{name}: XO taps on 3D cells place X ({placed})')
    wait_for(pg, "__mini.state==='result'")
    check(pg.evaluate('__mini.state') == 'result', f'{name}: XO game reaches result')
    pg.screenshot(path=f'{OUT}/{name}-xo-result.png')
    tap('#btn-res-modes'); wait_for(pg, "__mini.state==='menu'", 10)

    # ---- Reaction
    tap('#mode-react'); pg.wait_for_timeout(300)
    check(pg.evaluate('__mini.mode') == 'react', f'{name}: reaction mode entered')
    wait_for(pg, "__mini.react.phase==='wait'")
    cx, cy = w // 2, int(h * 0.45)
    def press():
        if mobile: pg.touchscreen.tap(cx, cy)
        else: pg.mouse.click(cx, cy)
    press()  # deliberate false start
    check(wait_for(pg, '__mini.react.tries[0]===-1', 6), f'{name}: false start detected')
    shot = False
    for _ in range(4):
        if not wait_for(pg, "__mini.react.phase==='go' || __mini.state!=='play'", 40): break
        if pg.evaluate('__mini.state') != 'play': break
        if not shot: pg.screenshot(path=f'{OUT}/{name}-react.png'); shot = True
        n = pg.evaluate('__mini.react.tries.length'); press()
        wait_for(pg, f'__mini.react.tries.length>{n}', 6)
    tries = pg.evaluate('__mini.react.tries')
    check(len([t for t in tries if t > 0]) >= 3, f'{name}: timed taps recorded {tries}')
    wait_for(pg, "__mini.state==='result'")
    check(pg.evaluate('__mini.state') == 'result', f'{name}: reaction result screen')
    pg.screenshot(path=f'{OUT}/{name}-react-result.png')

    # ---- pause / back
    tap('#btn-res-main'); wait_for(pg, "__mini.state==='play'", 10)
    pg.keyboard.press('p'); pg.wait_for_timeout(300); check(pg.evaluate('__mini.state') == 'paused', f'{name}: pause')
    tap('#btn-resume'); pg.wait_for_timeout(300); check(pg.evaluate('__mini.state') == 'play', f'{name}: resume')
    tap('#btn-back'); pg.wait_for_timeout(300); check(pg.evaluate('__mini.state') == 'menu', f'{name}: back to modes')
    pg.goto(BASE); pg.wait_for_timeout(3000)
    pg.screenshot(path=f'{OUT}/{name}-menu-stats.png')

    # ---- language toggle + English
    l0 = pg.evaluate('document.documentElement.lang'); tap('#btn-lang'); pg.wait_for_timeout(300)
    check(pg.evaluate('document.documentElement.lang') != l0 and pg.evaluate("localStorage.getItem('cyber.lang')") in ('en', 'zh-HK'), f'{name}: language toggle switches + persists')
    pg.goto(BASE + '?lang=en'); pg.wait_for_timeout(3000)
    check(pg.evaluate("document.getElementById('title').textContent") == 'MINI PACK' and 'Best streak' in pg.evaluate("document.getElementById('mc-rps').textContent"), f'{name}: English mode select')
    pg.screenshot(path=f'{OUT}/{name}-start-en.png')
    # ---- endless: past every authored ladder
    pg.evaluate('__mini.rps.opp = 3'); tap('#mode-rps'); pg.wait_for_timeout(500)
    opp = pg.evaluate("document.getElementById('hud-opp').textContent")
    check('#1' in opp and pg.evaluate('__mini.rps.need') >= 2, f'{name}: RPS rival 4 is an endless rival ({opp})')
    pg.screenshot(path=f'{OUT}/{name}-rps-endless-en.png')
    tap('#btn-back'); pg.wait_for_timeout(300)
    pg.evaluate('__mini.xo.opp = 12'); tap('#mode-xo'); pg.wait_for_timeout(500)
    opp = pg.evaluate("document.getElementById('hud-opp').textContent")
    check('OVERCLOCK CORE' in opp and pg.evaluate("document.getElementById('hud-stat').textContent") == '13', f'{name}: XO stage 13 is endless ({opp})')
    pg.screenshot(path=f'{OUT}/{name}-xo-endless-en.png')
    tap('#btn-back'); pg.wait_for_timeout(300)
    pg.evaluate('__mini.react.round = 6'); tap('#mode-react'); pg.wait_for_timeout(500)
    check(pg.evaluate("document.getElementById('hud-stat').textContent") == '7', f'{name}: reaction gauntlet round 7')
    tap('#btn-back'); pg.wait_for_timeout(300)
    pg.goto(BASE + '?lang=zh'); pg.wait_for_timeout(2500)
    check(pg.evaluate("document.getElementById('title').textContent") == '賽博小遊戲', f'{name}: ?lang=zh back to Chinese')
    pg.screenshot(path=f'{OUT}/{name}-start-zh.png')
    # ---- demo
    pg.goto(BASE + '?demo=1')
    ok = wait_for(pg, "__mini.mode==='xo' || __mini.mode==='react'", 90)
    check(ok, f'{name}: demo autoplays and advances modes (mode={pg.evaluate("__mini.mode")})')
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/{name}-demo.png')
    check(not errs, f'{name}: zero console errors {errs[:3]}')
    b.close()

with sync_playwright() as p:
    run(p, 'mobile', 412, 915, True)
    run(p, 'desktop', 1280, 800, False)
print('ALL PASSED' if not fails else f'{len(fails)} FAILED')
sys.exit(1 if fails else 0)
