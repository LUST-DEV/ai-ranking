// Assembles dist/: site + data + one pre-rendered HTML shell per route + llms.txt + robots.txt (+ sitemap.xml with SITE_URL).
// Each route gets its own title, description, heading and (with SITE_URL) canonical/Open Graph/JSON-LD tags,
// so clean URLs such as /tool/claude work for crawlers and for visitors before JavaScript runs.
import { cp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { loadData, validateData } from "./validate-data.mjs";
import { PAGES } from "../site/js/pages.js";
import { STRINGS } from "../site/js/i18n.js";

const root = new URL("../", import.meta.url);
const data = await loadData();
const errors = validateData(data);
if (errors.length) { console.error("Refusing to build invalid data:\n - " + errors.join("\n - ")); process.exit(1); }

const dist = new URL("dist/", root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL("site/", root), dist, { recursive: true });
await cp(new URL("data/", root), new URL("data/", dist), { recursive: true });

const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
if (site && !/^https:\/\/[^/\s]+(\/[^\s]*)?$/.test(site)) { console.error("SITE_URL must be an https URL"); process.exit(1); }

const en = STRINGS.en;
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const catName = Object.fromEntries(data.categories.map((c) => [c.id, c.name.en]));
const BRAND = en.brand;

// ---- route table ----
const routes = [{ path: "/", title: `${BRAND} · ${en.hero.eyebrow}`, desc: "AI RANKING: an AI tools directory with official links and public model rankings. Our own scores appear only after a reviewed test.", h1: en.hero.title, home: true }];
const add = (path, title, desc, extra = {}) => routes.push({ path, title: `${title} · ${BRAND}`, desc, h1: title, ...extra });
add("/directory", en.directory, `Search and filter ${data.tools.length} AI tools with official links.`);
add("/rankings", en.rankings.title, en.rankings.text);
for (const c of data.categories) if (data.benchmarks.some((b) => b.categoryId === c.id)) add(`/rankings/${c.id}`, `${en.rankings.title}: ${c.name.en}`, en.rankings.text);
for (const c of data.categories) add(`/category/${c.id}`, c.name.en, c.description.en);
for (const t of data.tools) add(`/tool/${t.id}`, t.name, `${t.name} (${t.provider}): ${t.description.en}`, { official: t.urls.product });
add("/compare", en.compare, en.compareHelp);
for (const [key, entry] of Object.entries(PAGES)) add(`/${key}`, entry.en.title, entry.en.sections[0].p[0] ?? entry.en.title);

// ---- render each route from the site template ----
const template = await readFile(new URL("index.html", dist), "utf8");
const ld = (url) => JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: url + "/", inLanguage: ["en", "fr"], description: "AI tools directory with official links and public model rankings." }).replace(/</g, "\\u003c");
function render(r) {
  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(r.desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(r.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(r.desc)}$2`);
  const body = `<section class="wrap"><h1>${esc(r.h1)}</h1><p>${esc(r.desc)}</p>${r.official ? `<p><a href="${esc(r.official)}" rel="noopener noreferrer">${esc(r.official)}</a></p>` : ""}</section>`;
  html = html.replace('<main id="app" tabindex="-1"></main>', `<main id="app" tabindex="-1">${body}</main>`);
  if (site) {
    const url = site + (r.path === "/" ? "/" : r.path);
    const tags = [`<link rel="canonical" href="${esc(url)}">`, `<meta property="og:url" content="${esc(url)}">`, `<meta property="og:image" content="${site}/og.png">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`, `<meta name="twitter:image" content="${site}/og.png">`];
    if (r.home) tags.push(`<script type="application/ld+json">${ld(site)}</script>`);
    html = html.replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">\n  ' + tags.join("\n  "));
  }
  return html;
}
for (const r of routes) {
  const dir = r.path === "/" ? dist : new URL(`.${r.path}/`, dist);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL("index.html", dir), render(r));
}

// ---- llms.txt, robots.txt, sitemap.xml ----
const base = site ? site : "";
const llms = [
  "# AI RANKING", "",
  "> Directory of AI tools with official links and public model rankings. Our own scores are published only after a documented test reviewed by a second person.", "",
  "## Data",
  `- [Tools](${base}/data/tools.json): catalogue with official URLs and verification dates`,
  `- [Categories](${base}/data/categories.json)`,
  `- [Public benchmarks](${base}/data/benchmarks.json): third-party leaderboards with source, board date and retrieval date`,
  `- [Evaluations](${base}/data/evaluations.json): our own reviewed evaluations`, "",
  "## Public benchmarks",
  ...data.benchmarks.map((b) => `- ${b.title} (${catName[b.categoryId]}): ${b.source.finalUrl}, board updated ${b.boardUpdated}`), "",
  "## Tools",
  ...data.tools.map((t) => `- [${t.name}](${t.urls.product}): ${t.description.en} (${t.provider}; ${catName[t.categories.primary]})`), "",
].join("\n");
await writeFile(new URL("llms.txt", dist), llms);
await writeFile(new URL("robots.txt", dist), ["User-agent: *", "Allow: /", site ? `Sitemap: ${site}/sitemap.xml` : "# Sitemap omitted: SITE_URL not set"].join("\n") + "\n");
if (site) {
  const urls = routes.map((r) => `  <url><loc>${esc(site + (r.path === "/" ? "/" : r.path))}</loc></url>`).join("\n");
  await writeFile(new URL("sitemap.xml", dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
console.log(`Built dist/ (${data.tools.length} tools, ${routes.length} pre-rendered routes).${site ? "" : " No canonical/sitemap: set SITE_URL after the deployment is confirmed."}`);
