// Dependency-free validator for data/*.json. Run: node scripts/validate-data.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { canonicalUrl, isSafeHttpUrl, publishProblems } from "../site/js/lib.js";

const ACCESS = ["unknown", "free", "freemium", "paid", "open_source"];
const VERIFICATION = ["pending_review", "verified"];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateData({ tools, categories, evaluations, benchmarks = [] }) {
  const errors = [];
  const err = (m) => errors.push(m);
  const catIds = new Set();
  for (const c of categories) {
    if (!ID.test(c.id ?? "")) err(`category id invalid: ${c.id}`);
    if (catIds.has(c.id)) err(`duplicate category id: ${c.id}`);
    catIds.add(c.id);
    for (const l of ["en", "fr"]) {
      if (!c.name?.[l]) err(`category ${c.id}: name.${l} missing`);
      if (!c.description?.[l]) err(`category ${c.id}: description.${l} missing`);
    }
  }
  const ids = new Set();
  const urls = new Map();
  for (const t of tools) {
    const at = `tool ${t.id ?? "?"}`;
    if (!ID.test(t.id ?? "")) err(`${at}: id invalid`);
    if (ids.has(t.id)) err(`${at}: duplicate id`);
    ids.add(t.id);
    if (!t.name) err(`${at}: name missing`);
    if (!t.provider) err(`${at}: provider missing`);
    for (const l of ["en", "fr"]) if (!t.description?.[l]) err(`${at}: description.${l} missing`);
    if (!catIds.has(t.categories?.primary)) err(`${at}: unknown primary category ${t.categories?.primary}`);
    for (const s of t.categories?.secondary ?? []) if (!catIds.has(s)) err(`${at}: unknown secondary category ${s}`);
    if (!ACCESS.includes(t.access)) err(`${at}: access must be one of ${ACCESS.join(", ")}`);
    if (!isSafeHttpUrl(t.urls?.product)) err(`${at}: official product URL must be an https URL`);
    else {
      const key = canonicalUrl(t.urls.product);
      if (urls.has(key)) err(`${at}: duplicate canonical URL (also ${urls.get(key)})`);
      urls.set(key, t.id);
    }
    for (const k of ["docs", "repository", "pricing"]) {
      const v = t.urls?.[k];
      if (v != null && !isSafeHttpUrl(v)) err(`${at}: urls.${k} must be null or an https URL`);
    }
    if (!VERIFICATION.includes(t.verification?.status)) err(`${at}: verification.status invalid`);
    if (t.verification?.status === "verified") {
      if (!DATE.test(t.verification.lastVerified ?? "")) err(`${at}: verified entries need lastVerified (YYYY-MM-DD)`);
      if (!isSafeHttpUrl(t.verification.evidenceUrl)) err(`${at}: verified entries need an https evidenceUrl`);
      if (!t.verification.method) err(`${at}: verified entries need a verification.method`);
      if (typeof t.verification.providerConfirmedOnPage !== "boolean") err(`${at}: providerConfirmedOnPage must be true or false`);
    }
    if (t.icon?.sourceUrl != null && !isSafeHttpUrl(t.icon.sourceUrl)) err(`${at}: icon.sourceUrl must be null or an https URL`);
    if (t.icon?.file != null && !/^icons\/[a-z0-9-]+\.(png|svg|ico|webp|jpg)$/.test(t.icon.file)) err(`${at}: icon.file must be null or icons/<id>.<ext>`);
    if (t.freeOfferMentioned != null && t.freeOfferMentioned !== true) err(`${at}: freeOfferMentioned must be true or null`);
    if (t.notes != null && !(t.notes.en && t.notes.fr)) err(`${at}: notes must be null or have en and fr`);
    if (!t.discovery?.source || !DATE.test(t.discovery?.date ?? "")) err(`${at}: discovery.source and discovery.date required`);
    if (t.api != null && typeof t.api !== "boolean") err(`${at}: api must be true, false or null`);
    if (t.openSource?.isOpenSource === true && !t.openSource.license) err(`${at}: open source entries need a license`);
    if ("score" in t || "rank" in t) err(`${at}: scores live in evaluations.json, not on the tool`);
  }
  const evIds = new Set();
  for (const e of evaluations) {
    const at = `evaluation ${e.id ?? "?"}`;
    if (evIds.has(e.id)) err(`${at}: duplicate id`);
    evIds.add(e.id);
    if (!ids.has(e.toolId)) err(`${at}: unknown toolId ${e.toolId}`);
    if (!catIds.has(e.categoryId)) err(`${at}: unknown categoryId ${e.categoryId}`);
    for (const p of publishProblems(e)) err(`${at}: ${p}`);
  }
  const bIds = new Set();
  for (const b of benchmarks) {
    const at = `benchmark ${b.id ?? "?"}`;
    if (bIds.has(b.id)) err(`${at}: duplicate id`);
    bIds.add(b.id);
    if (!catIds.has(b.categoryId)) err(`${at}: unknown categoryId`);
    if (b.basis !== "public_benchmark") err(`${at}: basis must be public_benchmark`);
    if (!isSafeHttpUrl(b.source?.url) || !isSafeHttpUrl(b.source?.finalUrl)) err(`${at}: source.url and source.finalUrl must be https URLs`);
    if (!DATE.test(b.boardUpdated ?? "") || !DATE.test(b.retrieved ?? "")) err(`${at}: boardUpdated and retrieved must be YYYY-MM-DD`);
    if (!b.scope?.en || !b.scope?.fr) err(`${at}: scope en/fr required`);
    if (!Array.isArray(b.entries) || !b.entries.length) { err(`${at}: entries required`); continue; }
    let prevRank = 0, prevScore = Infinity;
    for (const r of b.entries) {
      if (!Number.isInteger(r.rank) || r.rank <= prevRank) err(`${at}: ranks must be increasing integers (rank ${r.rank})`);
      if (!r.model || !r.organization) err(`${at}: rank ${r.rank} needs model and organization`);
      if (!Number.isFinite(r.score)) err(`${at}: rank ${r.rank} score must be a number`);
      else if (r.score > prevScore) err(`${at}: scores must not increase with rank (rank ${r.rank})`);
      if (r.relatedToolId != null && !ids.has(r.relatedToolId)) err(`${at}: unknown relatedToolId ${r.relatedToolId}`);
      prevRank = r.rank; prevScore = Number.isFinite(r.score) ? r.score : prevScore;
    }
  }
  return errors;
}

export async function loadData(dir = new URL("../data/", import.meta.url)) {
  const read = async (f) => JSON.parse(await readFile(new URL(f, dir), "utf8"));
  const [t, c, e, b] = await Promise.all([read("tools.json"), read("categories.json"), read("evaluations.json"), read("benchmarks.json")]);
  return { tools: t.tools, categories: c.categories, evaluations: e.evaluations, benchmarks: b.benchmarks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = await loadData();
  const errors = validateData(data);
  if (errors.length) {
    console.error(`Data validation FAILED (${errors.length} problem${errors.length > 1 ? "s" : ""}):`);
    for (const m of errors) console.error(" - " + m);
    process.exit(1);
  }
  console.log(`Data valid: ${data.tools.length} tools, ${data.categories.length} categories, ${data.evaluations.length} evaluations, ${data.benchmarks.length} public benchmarks.`);
}
