// Minimal static server for local preview of dist/. Not for production.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const security = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value])); // mirror production headers locally
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, path === "/" || path === "." ? "index.html" : path);
  if (!file.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }
  try { const body = await readFile(file); res.writeHead(200, { ...security, "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body); }
  catch { res.writeHead(404, { "content-type": "text/plain" }).end("Not found"); }
}).listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () => console.log("Preview on http://127.0.0.1:" + (process.env.PORT ?? 4173)));
