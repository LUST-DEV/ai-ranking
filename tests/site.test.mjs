import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { STRINGS, flatKeys, t } from "../site/js/i18n.js";
import { PAGES } from "../site/js/pages.js";

const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");

test("English and French UI strings have identical keys and no empty values", () => {
  const en = flatKeys(STRINGS.en).sort(), fr = flatKeys(STRINGS.fr).sort();
  assert.deepEqual(fr, en);
  for (const k of en) { assert.ok(t("en", k) && t("en", k) !== k, "en " + k); assert.ok(t("fr", k) && t("fr", k) !== k, "fr " + k); }
});
test("i18n interpolation and fallback", () => {
  assert.equal(t("fr", "page", { p: 2, t: 5 }), "Page 2 sur 5");
  assert.equal(t("en", "does.not.exist"), "does.not.exist");
});
test("every long page exists in both languages with content", () => {
  for (const [key, page] of Object.entries(PAGES)) for (const l of ["en", "fr"]) {
    assert.ok(page[l]?.title, `${key}.${l}.title`);
    assert.ok(page[l].sections.length >= 1 && page[l].sections.every((s) => s.h && s.p.length), `${key}.${l} sections`);
  }
  for (const k of ["privacy", "terms", "cookies"]) assert.equal(PAGES[k].legal, true, k + " must be flagged as a draft");
});
test("legal pages invent no company data", () => {
  const text = JSON.stringify([PAGES.privacy, PAGES.terms, PAGES.about]).toLowerCase();
  for (const bad of ["siret", "siren", "registered office", "capital social", "vat number", "we never collect", "fully compliant", "100% compliant", "entièrement conforme"]) assert.ok(!text.includes(bad), bad);
});
test("HTML basics: lang, viewport, skip link, main landmark, labelled controls", async () => {
  const html = await read("site/index.html");
  assert.match(html, /<html lang="en"/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /class="skip"/);
  assert.match(html, /<main id="app"/);
  assert.match(html, /<select id="lang" aria-label=/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i, "no inline scripts (CSP)");
  assert.doesNotMatch(html, /\sstyle=/i, "no inline styles (CSP)");
});
test("CSS honours reduced motion, visible focus, both themes and a glass fallback", async () => {
  const css = await read("site/css/styles.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /data-theme="light"/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /@supports not/);
  assert.match(css, /backdrop-filter/);
});
test("theme switch is an accessible button and its script runs from a file (CSP)", async () => {
  const html = await read("site/index.html");
  assert.match(html, /<button id="theme"[^>]*role="switch"[^>]*aria-checked/);
  assert.match(html, /<script src="js\/theme\.js"><\/script>/);
  const js = await read("site/js/theme.js");
  assert.match(js, /prefers-color-scheme: light/);
});
test("brand is AI RANKING with the Lust Dev footer line", async () => {
  assert.equal(STRINGS.en.brand, "AI RANKING"); assert.equal(STRINGS.fr.brand, "AI RANKING");
  assert.equal(STRINGS.en.powered, "⚡ Powered By Lust Dev ⚡");
  assert.match(await read("site/index.html"), /<title>AI RANKING/);
});
test("app never injects data as HTML and has no third-party requests", async () => {
  const dir = new URL("../site/js/", import.meta.url);
  for (const f of await readdir(dir)) {
    const src = await read("site/js/" + f);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/, f);
    const external = [...src.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)]*/gi)].map((m) => m[0]);
    assert.deepEqual(external, [], `${f} must not reference external hosts: ${external}`);
  }
  const html = await read("site/index.html");
  assert.doesNotMatch(html, /<(script|link)[^>]+(?:src|href)="https?:/i, "no external scripts or stylesheets");
});
test("no secrets, tracking or analytics in the source", async () => {
  const files = ["site/index.html", "site/config.js", "site/js/app.js", "package.json"];
  for (const f of files) { const s = await read(f); assert.doesNotMatch(s, /(api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{8,}/i, f); assert.doesNotMatch(s, /google-analytics|gtag\(|googletagmanager|plausible|hotjar|facebook\.net/i, f); }
  assert.equal((await read(".gitignore")).includes(".env"), true);
});
test("build produces dist with data, robots, and refuses a bad SITE_URL", async () => {
  const ok = spawnSync("node", ["scripts/build.mjs"], { cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env, SITE_URL: "https://example.org" } });
  assert.equal(ok.status, 0, ok.stderr);
  for (const f of ["dist/index.html", "dist/data/tools.json", "dist/robots.txt", "dist/sitemap.xml"]) assert.ok((await stat(new URL("../" + f, import.meta.url))).isFile(), f);
  assert.match(await read("dist/sitemap.xml"), /https:\/\/example\.org\//);
  const html = await read("dist/index.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.org\/">/);
  assert.match(html, /og:image" content="https:\/\/example\.org\/og\.png"/);
  assert.match(html, /summary_large_image/);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld.name, "AI RANKING");
  const llms = await read("dist/llms.txt");
  assert.match(llms, /^# AI RANKING/);
  assert.match(llms, /\[Tools\]\(https:\/\/example\.org\/data\/tools\.json\)/);
  assert.ok((await stat(new URL("../dist/404.html", import.meta.url))).isFile());
  assert.match(await read("dist/404.html"), /noindex/);
  const bad = spawnSync("node", ["scripts/build.mjs"], { cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env, SITE_URL: "javascript:alert(1)" } });
  assert.notEqual(bad.status, 0);
  const plain = spawnSync("node", ["scripts/build.mjs"], { cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env, SITE_URL: "" } });
  assert.equal(plain.status, 0, plain.stderr);
  const noUrl = await read("dist/index.html");
  assert.doesNotMatch(noUrl, /rel="canonical"|ld\+json|og:image"/, "no absolute metadata without a real SITE_URL");
  assert.doesNotMatch(await read("dist/robots.txt"), /Sitemap: http/);
});
test("no placeholder text ships in the site source", async () => {
  for (const f of ["site/index.html", "site/js/app.js", "site/js/pages.js", "site/js/i18n.js"]) {
    const src = await read(f);
    assert.doesNotMatch(src, /lorem ipsum|TODO|FIXME|placeholder text|coming soon|example\.com/i, f);
  }
});
