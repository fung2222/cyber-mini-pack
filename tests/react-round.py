"""Reaction result must report the round just played, not the historical best."""
from __future__ import annotations
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18940/cyber-mini-pack/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
fails = []
def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = c.new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(URL + '?lang=zh&reset=1', wait_until='domcontentloaded')
    pg.wait_for_function("() => (() => {const l=document.getElementById('loading'); return !l || l.classList.contains('done') || l.classList.contains('hidden');})()", timeout=60000)
    pg.wait_for_timeout(300)
    pg.evaluate("() => __mini.api.enter('react')")
    pg.wait_for_timeout(300)
    result = pg.evaluate("""() => {
      __mini.timers = []; __mini.state = 'play'; __mini.mode = 'react';
      const Rx = __mini.react;
      Rx.round = 2; Rx.tries = [500, 500, 500, 500, 500];
      __mini.api.reactEnd();
      const vals = [...document.querySelectorAll('#res-stats b')].map(e => e.textContent.trim());
      return {state: __mini.state, vals};
    }""")
    print(result)
    check(result['state'] == 'result', 'result screen opens')
    check(result['vals'][-1] == '3', f'round reached is current round 3 (got {result["vals"][-1]})')
    check(len(errors) == 0, 'zero console errors')
    c.close(); b.close()

print(f'\n{len(fails)} FAILED' if fails else '\nALL PASSED')
raise SystemExit(1 if fails else 0)
