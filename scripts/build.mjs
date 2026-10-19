// Assembles dist/: site + data + robots.txt (+ sitemap.xml when SITE_URL is set).
import { cp, rm, mkdir, writeFile } from "node:fs/promises";
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
const robots = ["User-agent: *", "Allow: /", site ? `Sitemap: ${site}/sitemap.xml` : "# Sitemap omitted: SITE_URL not set"].join("\n") + "\n";
await writeFile(new URL("robots.txt", dist), robots);
if (site) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n</urlset>\n`;
  await writeFile(new URL("sitemap.xml", dist), xml);
}
console.log(`Built dist/ (${data.tools.length} tools).${site ? "" : " No canonical/sitemap: set SITE_URL after the deployment is confirmed."}`);
