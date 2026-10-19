// Lists entries that were never verified or whose verification is older than MAX_DAYS. Report only.
import { loadData } from "./validate-data.mjs";
const MAX_DAYS = Number(process.env.MAX_DAYS ?? 180);
const { tools } = await loadData();
const now = Date.now();
const stale = tools.filter((t) => !t.verification.lastVerified || (now - Date.parse(t.verification.lastVerified)) / 864e5 > MAX_DAYS);
console.log(`${stale.length} of ${tools.length} entries are unverified or older than ${MAX_DAYS} days.`);
for (const t of stale.slice(0, 200)) console.log(` - ${t.id} (${t.verification.lastVerified ?? "never verified"})`);
