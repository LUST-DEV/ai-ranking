import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, validateCriteria, publishProblems, isPublishable, rankingFor, filterTools, sortTools, paginate, searchTools, normalize, isSafeHttpUrl, canonicalUrl, computeStats, topEntries, MAX_SCORE } from "../site/js/lib.js";

const tool = (id, name, cat, extra = {}) => ({ id, name, provider: "P" + id, aliases: [], categories: { primary: cat, secondary: [] }, access: "unknown", description: { en: `${name} desc`, fr: `${name} déscription` }, verification: { status: "pending_review" }, ...extra });
const goodEval = (toolId, c, over = {}) => {
  const criteria = { outputQuality: 24, categoryCapability: 20, usability: 12, freeAccess: 10, value: 9, ...c };
  return { id: "e-" + toolId, toolId, categoryId: "coding", basis: "independent_testing", reviewStatus: "reviewed", protocolVersion: "1.0", evaluationDate: "2026-10-01", evaluator: "alice", reviewer: "bob", evidenceUrls: ["https://example.com/e"], limitations: "limits", criteria, score: computeScore(criteria), ...over };
};

test("rubric weights add up to 100", () => assert.equal(MAX_SCORE, 100));
test("computeScore sums valid criteria", () => assert.equal(computeScore({ outputQuality: 30, categoryCapability: 25, usability: 15, freeAccess: 15, value: 15 }), 100));
test("computeScore rejects out-of-range, missing and unknown criteria", () => {
  assert.throws(() => computeScore({ outputQuality: 31, categoryCapability: 0, usability: 0, freeAccess: 0, value: 0 }));
  assert.throws(() => computeScore({ outputQuality: 1 }));
  assert.ok(validateCriteria({ outputQuality: 1, categoryCapability: 1, usability: 1, freeAccess: 1, value: 1, bonus: 5 }).some((m) => m.includes("unknown")));
  assert.throws(() => computeScore({ outputQuality: NaN, categoryCapability: 0, usability: 0, freeAccess: 0, value: 0 }));
});
test("publish gates: second reviewer, evidence, protocol, date, matching score", () => {
  assert.ok(isPublishable(goodEval("a")));
  assert.ok(publishProblems(goodEval("a", {}, { reviewer: "alice" })).some((m) => m.includes("differ")));
  assert.ok(publishProblems(goodEval("a", {}, { evidenceUrls: [] })).length);
  assert.ok(publishProblems(goodEval("a", {}, { evidenceUrls: ["http://insecure.test"] })).length);
  assert.ok(publishProblems(goodEval("a", {}, { reviewStatus: "draft" })).length);
  assert.ok(publishProblems(goodEval("a", {}, { protocolVersion: "" })).length);
  assert.ok(publishProblems(goodEval("a", {}, { evaluationDate: "yesterday" })).length);
  assert.ok(publishProblems(goodEval("a", {}, { score: 99 })).some((m) => m.includes("match")));
});
test("ranking: sorted, ties share a rank, unevaluated listed apart, bases never mixed", () => {
  const tools = [tool("a", "Alpha", "coding"), tool("b", "Beta", "coding"), tool("c", "Gamma", "coding"), tool("d", "Delta", "coding"), tool("z", "Other", "image")];
  const evals = [goodEval("a", { outputQuality: 30 }), goodEval("b", { outputQuality: 30 }), goodEval("c", { outputQuality: 5 }), goodEval("d", {}, { basis: "community" })];
  const { ranked, notEvaluated } = rankingFor("coding", tools, evals);
  assert.deepEqual(ranked.map((r) => [r.tool.id, r.rank]), [["a", 1], ["b", 1], ["c", 3]]);
  assert.deepEqual(notEvaluated.map((t) => t.id), ["d"]);
  assert.equal(rankingFor("image", tools, evals).ranked.length, 0);
});
test("ranking ignores unreviewed evaluations and picks the latest date", () => {
  const tools = [tool("a", "Alpha", "coding")];
  const old = goodEval("a", { outputQuality: 5 }, { id: "old", evaluationDate: "2026-01-01" });
  const recent = goodEval("a", { outputQuality: 28 }, { id: "new", evaluationDate: "2026-09-01" });
  const draft = goodEval("a", { outputQuality: 30 }, { id: "draft", evaluationDate: "2026-10-10", reviewStatus: "draft" });
  assert.equal(rankingFor("coding", tools, [old, recent, draft]).ranked[0].evaluation.id, "new");
});
test("search is accent/case insensitive and multi-term", () => {
  const tools = [tool("a", "Café Bot", "coding"), tool("b", "Other", "coding")];
  assert.deepEqual(searchTools(tools, "CAFE").map((t) => t.id), ["a"]);
  assert.deepEqual(searchTools(tools, "bot café").map((t) => t.id), ["a"]);
  assert.deepEqual(searchTools(tools, "déscription", "fr").length, 2);
  assert.equal(searchTools(tools, "").length, 2);
  assert.equal(searchTools(tools, "zzz").length, 0);
  assert.equal(normalize("  É  À "), "e a");
});
test("filter by category and access, sort and paginate", () => {
  const tools = [tool("a", "Bravo", "coding", { access: "free" }), tool("b", "Alpha", "image"), tool("c", "Charlie", "coding")];
  assert.equal(filterTools(tools, { category: "coding" }).length, 2);
  assert.equal(filterTools(tools, { category: "coding", access: "free" }).length, 1);
  assert.deepEqual(sortTools(tools, "name").map((t) => t.id), ["b", "a", "c"]);
  assert.deepEqual(sortTools(tools, "unknown-key").map((t) => t.id), ["b", "a", "c"]);
  const many = Array.from({ length: 25 }, (_, i) => i);
  assert.deepEqual(paginate(many, 1, 12).items.length, 12);
  assert.equal(paginate(many, 3, 12).items.length, 1);
  assert.equal(paginate(many, 99, 12).page, 3);
  assert.equal(paginate(many, -4, 12).page, 1);
  assert.deepEqual(paginate([], 1, 12), { items: [], page: 1, totalPages: 1, total: 0 });
});
test("URL helpers", () => {
  assert.ok(isSafeHttpUrl("https://example.com/a"));
  for (const bad of ["http://example.com", "javascript:alert(1)", "data:text/html,x", "https://localhost", "", null, undefined, "//x.com"]) assert.equal(isSafeHttpUrl(bad), false, String(bad));
  assert.equal(canonicalUrl("https://www.Example.com/a/"), "example.com/a");
});
test("stats are computed from data only", () => {
  const tools = [tool("a", "A", "coding"), tool("b", "B", "image", { verification: { status: "verified" } })];
  const s = computeStats(tools, [{ id: "coding" }, { id: "image" }, { id: "audio" }], [goodEval("a")]);
  assert.deepEqual(s, { tools: 2, categories: 3, categoriesWithTools: 2, evaluated: 1, verified: 1 });
});

test("free-offer filter and topEntries", () => {
  const tools = [tool("a", "A", "coding", { freeOfferMentioned: true }), tool("b", "B", "coding", { freeOfferMentioned: null })];
  assert.deepEqual(filterTools(tools, { free: true }).map((t) => t.id), ["a"]);
  assert.equal(filterTools(tools, { free: false }).length, 2);
  const board = { entries: [{ rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }] };
  assert.equal(topEntries(board, 3).length, 3);
  assert.equal(topEntries(undefined, 3).length, 0);
  assert.equal(topEntries(board, -1).length, 0);
});
