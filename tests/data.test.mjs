import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData, validateData } from "../scripts/validate-data.mjs";

const fresh = async () => structuredClone(await loadData());

test("shipped data is valid", async () => assert.deepEqual(validateData(await loadData()), []));
test("no unreviewed or invented scores ship", async () => {
  const d = await loadData();
  assert.equal(d.evaluations.length, 0);
  for (const t of d.tools.filter((x) => x.verification.status === "verified")) {
    assert.match(t.verification.lastVerified, /^\d{4}-\d{2}-\d{2}$/, t.id);
    assert.ok(t.verification.evidenceUrl.startsWith("https://"), t.id);
    assert.ok(t.verification.method, t.id);
  }
  assert.equal(d.tools.filter((x) => "score" in x).length, 0);
});
test("detects duplicate ids and canonical URLs", async () => {
  const d = await fresh();
  d.tools.push({ ...d.tools[0] });
  const errs = validateData(d);
  assert.ok(errs.some((e) => e.includes("duplicate id")));
  assert.ok(errs.some((e) => e.includes("duplicate canonical URL")));
});
test("detects www/trailing-slash duplicates", async () => {
  const d = await fresh();
  d.tools.push({ ...structuredClone(d.tools[0]), id: "copy", urls: { ...d.tools[0].urls, product: d.tools[0].urls.product.replace("https://", "https://www.") + "/" } });
  assert.ok(validateData(d).some((e) => e.includes("canonical")));
});
test("rejects bad official URLs, unknown category and missing French text", async () => {
  const d = await fresh();
  d.tools[0].urls.product = "http://insecure.example";
  d.tools[1].categories.primary = "nope";
  d.tools[2].description.fr = "";
  const errs = validateData(d);
  assert.ok(errs.some((e) => e.includes("https")));
  assert.ok(errs.some((e) => e.includes("unknown primary category")));
  assert.ok(errs.some((e) => e.includes("description.fr")));
});
test("verified entries need evidence and a date; open source needs a license", async () => {
  const d = await fresh();
  d.tools[0].verification = { status: "verified" };
  d.tools[1].openSource = { isOpenSource: true, license: null };
  const errs = validateData(d);
  assert.ok(errs.some((e) => e.includes("lastVerified")));
  assert.ok(errs.some((e) => e.includes("evidenceUrl")));
  assert.ok(errs.some((e) => e.includes("verification.method")));
  assert.ok(errs.some((e) => e.includes("license")));
});
test("scores cannot live on tools; evaluations must reference real tools and pass the gates", async () => {
  const d = await fresh();
  d.tools[0].score = 90;
  d.evaluations.push({ id: "x", toolId: "ghost", categoryId: "coding", reviewStatus: "draft" });
  const errs = validateData(d);
  assert.ok(errs.some((e) => e.includes("not on the tool")));
  assert.ok(errs.some((e) => e.includes("unknown toolId")));
  assert.ok(errs.some((e) => e.includes("reviewStatus")));
});
test("access vocabulary is enforced", async () => {
  const d = await fresh();
  d.tools[0].access = "cheap";
  assert.ok(validateData(d).some((e) => e.includes("access")));
});

test("shipped benchmarks are valid, public, dated and never mixed with evaluations", async () => {
  const d = await loadData();
  assert.ok(d.benchmarks.length >= 1);
  for (const b of d.benchmarks) {
    assert.equal(b.basis, "public_benchmark");
    assert.match(b.source.finalUrl, /^https:\/\//);
    assert.match(b.boardUpdated, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.equal(d.evaluations.filter((e) => e.basis === "public_benchmark").length, 0);
});
test("benchmark validation catches bad ranks, scores, URLs and unknown tools", async () => {
  const d = await fresh();
  const b = structuredClone(d.benchmarks[0]);
  b.entries[1].rank = b.entries[0].rank;
  b.entries[2].score = b.entries[1].score + 50;
  b.entries[3].relatedToolId = "ghost";
  b.source.finalUrl = "http://insecure.example";
  b.categoryId = "nope";
  b.basis = "editorial";
  const errs = validateData({ ...d, benchmarks: [b] });
  for (const k of ["increasing", "must not increase", "unknown relatedToolId", "https", "unknown categoryId", "basis"]) assert.ok(errs.some((e) => e.includes(k)), k);
});
test("icon fields are constrained", async () => {
  const d = await fresh();
  d.tools[0].icon = { sourceUrl: "http://x.example/a.png", file: "../../etc/passwd" };
  d.tools[1].icon = { sourceUrl: null, file: "icons/ok.png" };
  const errs = validateData(d);
  assert.ok(errs.some((e) => e.includes("icon.sourceUrl")));
  assert.ok(errs.some((e) => e.includes("icon.file")));
  assert.equal(errs.filter((e) => e.includes(d.tools[1].id)).length, 0);
});
test("unverified claims stay empty: no pricing, license or API invented", async () => {
  const d = await loadData();
  for (const t of d.tools) {
    if (t.id !== "whisper") { assert.equal(t.openSource.isOpenSource, null, t.id); assert.equal(t.access, "unknown", t.id); }
    assert.equal(t.api, null, t.id);
  }
});
