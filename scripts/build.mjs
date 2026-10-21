// Assembles dist/: site + data + robots.txt (+ sitemap.xml when SITE_URL is set).
import { cp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { loadData, validateData } from "./validate-data.mjs";

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
// Absolute metadata is only emitted when the real site URL is known (never a guessed one).
if (site) {
  const indexUrl = new URL("index.html", dist);
  let html = await readFile(indexUrl, "utf8");
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "AI RANKING", url: site + "/", inLanguage: ["en", "fr"], description: "AI tools directory with official links and public model rankings." }).replace(/</g, "\\u003c");
  const tags = [
    `<link rel="canonical" href="${site}/">`,
    `<meta property="og:url" content="${site}/">`,
    `<meta property="og:image" content="${site}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:image" content="${site}/og.png">`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join("\n  ");
  html = html.replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">\n  ' + tags);
  await writeFile(indexUrl, html);
}

// llms.txt: a plain-text map of the site for language-model crawlers, generated from the data.
const base = site ? site + "/" : "";
const catName = Object.fromEntries(data.categories.map((c) => [c.id, c.name.en]));
const llms = [
  "# AI RANKING",
  "",
  "> Directory of AI tools with official links and public model rankings. Our own scores are published only after a documented test reviewed by a second person.",
  "",
  "## Data",
  `- [Tools](${base}data/tools.json): catalogue with official URLs and verification dates`,
  `- [Categories](${base}data/categories.json)`,
  `- [Public benchmarks](${base}data/benchmarks.json): third-party leaderboards with source, board date and retrieval date`,
  `- [Evaluations](${base}data/evaluations.json): our own reviewed evaluations`,
  "",
  "## Public benchmarks",
  ...data.benchmarks.map((b) => `- ${b.title} (${catName[b.categoryId]}): ${b.source.finalUrl}, board updated ${b.boardUpdated}`),
  "",
  "## Tools",
  ...data.tools.map((t) => `- [${t.name}](${t.urls.product}): ${t.description.en} (${t.provider}; ${catName[t.categories.primary]})`),
  "",
].join("\n");
await writeFile(new URL("llms.txt", dist), llms);

const robots = ["User-agent: *", "Allow: /", site ? `Sitemap: ${site}/sitemap.xml` : "# Sitemap omitted: SITE_URL not set"].join("\n") + "\n";
await writeFile(new URL("robots.txt", dist), robots);
if (site) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n</urlset>\n`;
  await writeFile(new URL("sitemap.xml", dist), xml);
}
console.log(`Built dist/ (${data.tools.length} tools).${site ? "" : " No canonical/sitemap: set SITE_URL after the deployment is confirmed."}`);
