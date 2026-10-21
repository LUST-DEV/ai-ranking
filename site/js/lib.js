// Pure, dependency-free helpers shared by the website, the validators and the tests.

export const CRITERIA = Object.freeze({
  outputQuality: 30,
  categoryCapability: 25,
  usability: 15,
  freeAccess: 15,
  value: 15,
});
export const MAX_SCORE = Object.values(CRITERIA).reduce((a, b) => a + b, 0); // 100
export const BASES = Object.freeze(["independent_testing", "editorial", "community"]);

/** Lowercase, strip accents, collapse whitespace. */
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Only absolute https URLs are rendered as links. */
export function isSafeHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Canonical form used for duplicate detection. */
export function canonicalUrl(value) {
  const u = new URL(value);
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  return `${host}${path}`;
}

/** Returns a list of problems; an empty list means the criteria are valid. */
export function validateCriteria(criteria) {
  const problems = [];
  if (!criteria || typeof criteria !== "object") return ["criteria missing"];
  for (const [key, max] of Object.entries(CRITERIA)) {
    const v = criteria[key];
    if (typeof v !== "number" || !Number.isFinite(v)) problems.push(`${key} must be a number`);
    else if (v < 0 || v > max) problems.push(`${key} must be between 0 and ${max}`);
  }
  for (const key of Object.keys(criteria)) {
    if (!(key in CRITERIA)) problems.push(`unknown criterion ${key}`);
  }
  return problems;
}

/** Total score out of 100. Throws on invalid criteria: never guess a score. */
export function computeScore(criteria) {
  const problems = validateCriteria(criteria);
  if (problems.length) throw new Error(`Invalid criteria: ${problems.join("; ")}`);
  const total = Object.keys(CRITERIA).reduce((sum, k) => sum + criteria[k], 0);
  return Math.round(total * 100) / 100;
}

/** An evaluation may be published only if it satisfies every review gate. */
export function publishProblems(ev) {
  const p = [];
  if (!ev || typeof ev !== "object") return ["evaluation missing"];
  if (ev.reviewStatus !== "reviewed") p.push("reviewStatus must be 'reviewed'");
  if (!BASES.includes(ev.basis)) p.push("basis must be one of " + BASES.join(", "));
  if (!ev.protocolVersion) p.push("protocolVersion required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.evaluationDate ?? "")) p.push("evaluationDate must be YYYY-MM-DD");
  if (!ev.evaluator) p.push("evaluator required");
  if (!ev.reviewer) p.push("reviewer required");
  if (ev.evaluator && ev.reviewer && ev.evaluator === ev.reviewer) p.push("reviewer must differ from evaluator");
  if (!Array.isArray(ev.evidenceUrls) || ev.evidenceUrls.length === 0) p.push("at least one evidence URL required");
  else if (!ev.evidenceUrls.every(isSafeHttpUrl)) p.push("evidence URLs must be https URLs");
  if (!ev.limitations) p.push("limitations required");
  p.push(...validateCriteria(ev.criteria));
  if (!p.length && computeScore(ev.criteria) !== ev.score) p.push("score does not match criteria");
  return p;
}

export const isPublishable = (ev) => publishProblems(ev).length === 0;

/** Latest publishable evaluation of a tool for a basis, or null. */
export function latestEvaluation(toolId, evaluations, basis = "independent_testing") {
  const list = evaluations
    .filter((e) => e.toolId === toolId && e.basis === basis && isPublishable(e))
    .sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate));
  return list[0] ?? null;
}

/**
 * Category ranking. Sources are never mixed: one basis per ranking.
 * Tools without a publishable evaluation are returned separately, unranked.
 */
export function rankingFor(categoryId, tools, evaluations, basis = "independent_testing") {
  const inCategory = tools.filter((t) => t.categories.primary === categoryId);
  const ranked = [];
  const notEvaluated = [];
  for (const tool of inCategory) {
    const ev = latestEvaluation(tool.id, evaluations, basis);
    if (ev) ranked.push({ tool, evaluation: ev });
    else notEvaluated.push(tool);
  }
  ranked.sort((a, b) => b.evaluation.score - a.evaluation.score || a.tool.name.localeCompare(b.tool.name));
  notEvaluated.sort((a, b) => a.name.localeCompare(b.name));
  let rank = 0;
  let prev = null;
  ranked.forEach((r, i) => {
    if (r.evaluation.score !== prev) rank = i + 1; // ties share a rank
    r.rank = rank;
    prev = r.evaluation.score;
  });
  return { ranked, notEvaluated };
}

/** Search over name, provider, aliases and the description in the given language. */
export function searchTools(tools, query, lang = "en") {
  const q = normalize(query);
  if (!q) return tools.slice();
  const terms = q.split(" ");
  return tools.filter((t) => {
    const hay = normalize([t.name, t.provider, ...(t.aliases ?? []), t.description?.[lang], t.description?.en].join(" "));
    return terms.every((term) => hay.includes(term));
  });
}

export function filterTools(tools, { category = "", access = "", free = false, query = "", lang = "en" } = {}) {
  let out = searchTools(tools, query, lang);
  if (category) out = out.filter((t) => t.categories.primary === category || t.categories.secondary.includes(category));
  if (access) out = out.filter((t) => t.access === access);
  if (free) out = out.filter((t) => t.freeOfferMentioned === true);
  return out;
}

export function sortTools(tools, key = "name") {
  const copy = tools.slice();
  const by = {
    name: (a, b) => a.name.localeCompare(b.name),
    provider: (a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name),
    category: (a, b) => a.categories.primary.localeCompare(b.categories.primary) || a.name.localeCompare(b.name),
  };
  return copy.sort(by[key] ?? by.name);
}

export function paginate(items, page = 1, pageSize = 12) {
  const size = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, totalPages, total: items.length };
}

/** Coverage statistics computed only from the data. */
export function computeStats(tools, categories, evaluations) {
  const evaluated = new Set(evaluations.filter(isPublishable).map((e) => e.toolId));
  return {
    tools: tools.length,
    categories: categories.length,
    categoriesWithTools: new Set(tools.map((t) => t.categories.primary)).size,
    evaluated: tools.filter((t) => evaluated.has(t.id)).length,
    verified: tools.filter((t) => t.verification.status === "verified").length,
  };
}

/** First n rows of a public benchmark board (rows are stored in rank order). */
export function topEntries(board, n = 3) {
  return (board?.entries ?? []).slice(0, Math.max(0, n));
}
