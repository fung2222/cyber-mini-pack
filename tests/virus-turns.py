"""XO turn-ownership guards: virus spread must consume the AI turn, not add one.

Reproduces a stale timer after a virus spread (two O moves) and a spread that
fires after undo (O move while it is the player's turn).

Usage: python tests/virus-turns.py [url]
"""
from __future__ import annotations
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18940/cyber-mini-pack/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
fails = []
def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)

SETUP = """(turn) => {
  __mini.timers = []; __mini.state = 'play'; __mini.mode = 'xo';
  const X = __mini.xo;
  X.mod = 'virus'; X.board = ['X',null,null,null,null,null,null,null,null]; X.moves = [0];
  X.over = false; X.undo = 1; X.echo = -1; X.echoUsed = false; X.echoHolding = false;
  X.virus = 4; X.virusAge = 0; X.hazard = -1; X.forcePerfect = false; X.warpNeed = 0;
  X.turn = turn;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = c.new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(URL + '?lang=zh&reset=1', wait_until='domcontentloaded')
    pg.wait_for_function("() => document.getElementById('loading')?.classList.contains('done')", timeout=60000)
    pg.wait_for_timeout(300)
    pg.evaluate("() => __mini.api.enter('xo')")
    pg.wait_for_timeout(300)

    # Virus spread uses the AI's turn. The scheduled xoAITurn must not move again.
    pg.evaluate(SETUP, 'O')
    pg.evaluate("() => __mini.api.xoDoVirusSpread()")
    board = pg.evaluate("() => __mini.xo.board")
    o_after_spread = board.count('O')
    pg.evaluate("() => __mini.api.xoAITurn()")
    board = pg.evaluate("() => __mini.xo.board")
    check(o_after_spread == 1, 'virus spread places exactly one O')
    check(board.count('O') == 1, 'AI does not get a second O after virus spread')

    # If the player undoes back to their turn, a pending spread must not fire.
    pg.evaluate(SETUP, 'X')
    pg.evaluate("() => __mini.api.xoDoVirusSpread()")
    board = pg.evaluate("() => __mini.xo.board")
    check(board.count('O') == 0, 'virus does not spread on the player turn (undo-safe)')
    check(len(errors) == 0, 'zero console errors')
    c.close(); b.close()

print(f'\n{len(fails)} FAILED' if fails else '\nALL PASSED')
raise SystemExit(1 if fails else 0)
