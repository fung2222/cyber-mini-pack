"""390px layout guard for CYBER MINI PACK.
Usage: python tests/layout.py [base_url]
Checks: the three mode cards have equal height; RPS labels fit inside their buttons; zero console errors.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18940/cyber-mini-pack/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '?reset=1&quality=low')
    pg.wait_for_selector('#mode-rps', timeout=30000)
    heights = pg.evaluate("[...document.querySelectorAll('.mode-card')].map(e => Math.round(e.getBoundingClientRect().height))")
    check(len(set(heights)) == 1, f'mode cards equal height ({heights})')
    pg.click('#mode-rps'); pg.wait_for_timeout(800)
    labels = pg.evaluate("""[...document.querySelectorAll('.rps-btn')].map(b => {
        const t = b.querySelector('b'), r = b.getBoundingClientRect(), tr = t.getBoundingClientRect();
        return {move: b.dataset.move, text: t.textContent, textW: Math.round(tr.width), boxW: Math.round(r.width)};
    })""")
    check(all(x['textW'] <= x['boxW'] for x in labels), f'RPS labels fit buttons ({labels})')
    check(not errs, f'zero console errors {errs[:3]}')
    b.close()
print('ALL PASSED' if not fails else f'{len(fails)} FAILED')
sys.exit(1 if fails else 0)
