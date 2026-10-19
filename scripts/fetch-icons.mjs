// Downloads each tool's official icon (icon.sourceUrl) into site/icons/ and records icon.file.
// Needs network access. Run: node scripts/fetch-icons.mjs   then review the images and commit them.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { isSafeHttpUrl } from "../site/js/lib.js";

const MAX_BYTES = 300 * 1024;
const TIMEOUT_MS = 10_000;
const TYPES = { "image/png": "png", "image/svg+xml": "svg", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "image/webp": "webp", "image/jpeg": "jpg" };
const path = new URL("../data/tools.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
await mkdir(new URL("../site/icons/", import.meta.url), { recursive: true });
let ok = 0, failed = 0;
for (const tool of data.tools) {
  const src = tool.icon?.sourceUrl;
  if (!isSafeHttpUrl(src)) continue;
  try {
    const res = await fetch(src, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "LustDevAIRankingHub-IconFetch/1.0" } });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = TYPES[type];
    if (!res.ok || !ext) throw new Error(`HTTP ${res.status}, type ${type || "none"}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) throw new Error(`size ${buf.length}`);
    if (ext === "svg" && /<script|onload\s*=|javascript:/i.test(buf.toString("utf8"))) throw new Error("svg contains active content");
    const file = `icons/${tool.id}.${ext}`;
    await writeFile(new URL(`../site/${file}`, import.meta.url), buf);
    tool.icon.file = file;
    ok++;
  } catch (e) {
    failed++;
    console.log(` - ${tool.id}: ${e.message} (initials fallback stays)`);
  }
}
await writeFile(path, JSON.stringify(data, null, 2) + "\n");
console.log(`Icons saved: ${ok}, failed: ${failed}. Review the files in site/icons/ before committing.`);
