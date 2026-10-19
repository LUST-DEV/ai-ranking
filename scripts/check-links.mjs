// Link checker with timeouts and a JSON report. Never edits data.
// Run: node scripts/check-links.mjs [--out report.json]   (needs network access)
import { writeFile } from "node:fs/promises";
import { loadData } from "./validate-data.mjs";

const TIMEOUT_MS = 10_000;
const CONCURRENCY = 4;
const RETRIES = 1;
const UA = "LustDevAIRankingHub-LinkCheck/1.0 (+https://github.com/LUST-DEV/ai-ranking)";

async function probe(url) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA } });
      if (res.status === 405 || res.status === 403) res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA } });
      return { status: res.status, finalUrl: res.url, ok: res.ok };
    } catch (e) {
      if (attempt === RETRIES) return { status: null, ok: false, error: e.name === "AbortError" ? "timeout" : e.message };
    } finally { clearTimeout(timer); }
  }
}

const { tools } = await loadData();
const jobs = tools.flatMap((t) => Object.entries(t.urls).filter(([, v]) => v).map(([kind, url]) => ({ id: t.id, kind, url })));
const results = [];
let next = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < jobs.length) { const job = jobs[next++]; results.push({ ...job, ...(await probe(job.url)) }); }
}));
results.sort((a, b) => a.id.localeCompare(b.id));
const failed = results.filter((r) => !r.ok);
const report = { checkedAt: new Date().toISOString(), total: results.length, failed: failed.length, note: "A failure can be a false positive (bot blocking, geo restrictions). Review manually before editing data.", results };
const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
if (out) await writeFile(out, JSON.stringify(report, null, 2));
console.log(`Checked ${results.length} links, ${failed.length} need review.`);
for (const f of failed) console.log(` - ${f.id} ${f.kind}: ${f.status ?? f.error} ${f.url}`);
