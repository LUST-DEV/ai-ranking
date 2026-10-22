"""Optional browser smoke test (not run by CI). Needs: pip install playwright && playwright install chromium.
Usage: node scripts/build.mjs && python3 tests/e2e/smoke.py
Checks every route (clean URLs) for: exactly one <h1>, a unique <title>, a meta description, no console errors,
no horizontal overflow at 390px, in both themes and both languages."""
import subprocess, sys, time, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parents[2]
srv = subprocess.Popen(["node", "scripts/serve.mjs"], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={"PORT": "4199", "PATH": "/usr/bin:/usr/local/bin:/bin"})
B = "http://127.0.0.1:4199/"
routes = ["", "directory", "rankings", "rankings/coding", "category/coding", "category/3d", "tool/claude", "tool/le-chat", "compare", "methodology", "sources", "about", "privacy", "terms", "cookies", "contact", "contribute"]
failures = []
try:
    time.sleep(1.5)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for lang in ["en", "fr"]:
            for theme in ["light", "dark"]:
                ctx = b.new_context(viewport={"width": 390, "height": 844}, locale=lang)
                ctx.add_init_script(f"localStorage.setItem('theme','\"{theme}\"');localStorage.setItem('lang','\"{lang}\"')")
                pg = ctx.new_page(); errs = []
                pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: errs.append(str(e)))
                titles = {}
                for r in routes:
                    pg.goto(B + r); pg.wait_for_selector("main h1"); pg.wait_for_timeout(120)
                    n = pg.locator("main h1").count(); t = pg.title(); d = pg.get_attribute('meta[name="description"]', "content")
                    ov = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
                    if n != 1: failures.append(f"{lang}/{theme} #{r}: {n} h1")
                    if not d: failures.append(f"{lang}/{theme} #{r}: no meta description")
                    if r == "tool/claude" and "2026-10-18" not in pg.inner_text("main"): failures.append(f"{lang}/{theme}: verified date missing on tool page")
                    if ov: failures.append(f"{lang}/{theme} #{r}: horizontal overflow")
                    if t in titles and r not in ("tool/nope", "nothing-here") and titles[t] not in ("tool/nope", "nothing-here"): failures.append(f"{lang}/{theme} #{r}: duplicate title with #{titles[t]}")
                    titles[t] = r
                # clean URLs: a missing page is a real 404, and in-app navigation does not reload the page
                resp = ctx.request.get(B + "nothing-here")
                if resp.status != 404: failures.append(f"{lang}/{theme}: unknown path returned {resp.status}")
                pg.goto(B); pg.wait_for_selector(".stat"); pg.evaluate("window.__marker = 1")
                pg.click('#nav a[href="/rankings"]'); pg.wait_for_selector(".bench")
                if pg.evaluate("location.pathname") != "/rankings" or pg.evaluate("window.__marker") != 1: failures.append(f"{lang}/{theme}: in-app navigation reloaded or wrong URL")
                pg.go_back(); pg.wait_for_selector(".stat")
                if pg.evaluate("location.pathname") != "/": failures.append(f"{lang}/{theme}: back button broken")
                pg.evaluate("history.pushState(null,'','/tool/nope'); dispatchEvent(new PopStateEvent('popstate'))"); pg.wait_for_selector("main h1")
                if "found" not in pg.inner_text("main").lower() and "introuvable" not in pg.inner_text("main").lower(): failures.append(f"{lang}/{theme}: in-app not-found view missing")
                if errs: failures.append(f"{lang}/{theme}: console errors {errs}")
                ctx.close()
        b.close()
finally:
    srv.kill()
print("E2E FAILED:\n - " + "\n - ".join(failures) if failures else f"E2E OK: {len(routes)} routes x 2 languages x 2 themes")
sys.exit(1 if failures else 0)
