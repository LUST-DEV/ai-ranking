import { CONFIG } from "../config.js";
import { t } from "./i18n.js";
import { PAGES } from "./pages.js";
import { computeStats, filterTools, sortTools, paginate, rankingFor, isSafeHttpUrl, isPublishable } from "./lib.js";

const PAGE_SIZE = 12;
const MAX_COMPARE = 4;
const state = { lang: "en", tools: [], categories: [], evaluations: [], benchmarks: [], lastResearch: null, compare: [], filters: { q: "", category: "", access: "", sort: "name", page: 1 } };
const root = document.getElementById("app");

/* ---------- safe DOM helpers: data is always inserted as text ---------- */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const tr = (key, vars) => t(state.lang, key, vars);
const loc = (obj) => (obj ? obj[state.lang] ?? obj.en ?? "" : "");
const catName = (id) => loc(state.categories.find((c) => c.id === id)?.name) || id;

function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: keep in memory */ }
}
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; }
}

function extLink(url, label) {
  if (!isSafeHttpUrl(url)) return h("span", { class: "muted" }, tr("notProvided"));
  return h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, label, h("span", { class: "sr-only" }, " " + tr("external")));
}
const ICON_PATH = /^icons\/[a-z0-9-]+\.(png|svg|ico|webp|jpg)$/;
function initials(tool) {
  const words = tool.name.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
/** Official icon when a local file exists; otherwise (or if it fails to load) the initials. */
function logo(tool, size = "") {
  const fallback = () => h("span", { class: `logo initials ${size}`, "aria-hidden": "true" }, initials(tool));
  const file = tool.icon?.file;
  if (!file || !ICON_PATH.test(file)) return fallback();
  const img = h("img", { class: `logo ${size}`, src: file, alt: "", width: "40", height: "40", loading: "lazy", decoding: "async" });
  img.addEventListener("error", () => img.replaceWith(fallback()), { once: true });
  return img;
}
function freeBadge(tool) { return tool.freeOfferMentioned ? badge(tr("freeOffer"), "ok") : null; }
function badge(text, kind = "") { return h("span", { class: `badge ${kind}` }, text); }
function statusBadge(tool) {
  return tool.verification.status === "verified" ? badge(tr("verifiedLabel"), "ok") : badge(tr("pendingReview"), "warn");
}
function evalBadge(tool) {
  const has = state.evaluations.some((e) => e.toolId === tool.id && isPublishable(e));
  return has ? badge(tr("score"), "ok") : badge(tr("notEvaluated"));
}

/* ---------- routing ---------- */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(query) };
}
function go(path) { location.hash = path; }

function setTitle(text) { document.title = text ? `${text} · ${tr("brand")}` : tr("brand"); }

function render() {
  document.documentElement.lang = state.lang;
  renderChrome();
  const { parts, params } = parseHash();
  const [view, arg] = parts;
  root.replaceChildren();
  let node;
  if (!view) node = homeView();
  else if (view === "directory") node = directoryView(params);
  else if (view === "category" && arg) node = categoryView(arg);
  else if (view === "tool" && arg) node = toolView(arg);
  else if (view === "compare") node = compareView();
  else if (PAGES[view]) node = pageView(view);
  else node = h("section", { class: "wrap" }, h("h1", {}, tr("notFound")), h("p", {}, tr("notFoundText")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")));
  root.append(node);
  root.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function renderChrome() {
  const nav = document.getElementById("nav");
  nav.replaceChildren(
    ...["directory", "categories", "compare", "methodology", "sources", "about"].map((k) =>
      h("a", { href: k === "categories" ? "#/category/" + (state.categories[0]?.id ?? "") : "#/" + k }, tr("nav." + k) + (k === "compare" && state.compare.length ? ` (${state.compare.length})` : "")),
    ),
  );
  const sel = document.getElementById("lang");
  sel.setAttribute("aria-label", tr("lang"));
  sel.value = state.lang;
  document.getElementById("skip").textContent = tr("skip");
  document.getElementById("brand-text").textContent = tr("brand");
  const f = document.getElementById("footer-links");
  const links = [["privacy", "privacy"], ["terms", "terms"], ["cookies", "cookies"], ["contact", "contact"], ["contribute", "contribute"]];
  f.replaceChildren(...links.map(([k, p]) => h("a", { href: "#/" + p }, tr("footerLinks." + k))));
  if (isSafeHttpUrl(CONFIG.repoUrl)) f.append(extLink(CONFIG.repoUrl, tr("footerLinks.repo")));
  document.getElementById("disclaimer").textContent = tr("footerDisclaimer");
}

/* ---------- views ---------- */
function homeView() {
  setTitle("");
  const s = computeStats(state.tools, state.categories, state.evaluations);
  const stats = [["benchmarks", state.benchmarks.length], ["tools", s.tools], ["categories", s.categories], ["withTools", s.categoriesWithTools], ["verified", s.verified], ["evaluated", s.evaluated]];
  return h("div", {},
    h("section", { class: "hero wrap" },
      h("h1", {}, tr("heroTitle")),
      h("p", { class: "lead" }, tr("heroText")),
      h("div", { class: "actions" }, h("a", { class: "btn primary", href: "#/directory" }, tr("cta.browse")), h("a", { class: "btn", href: "#/methodology" }, tr("cta.method"))),
    ),
    h("section", { class: "wrap coverage", "aria-labelledby": "cov" },
      h("h2", { id: "cov" }, tr("coverage")),
      h("dl", { class: "stats" }, stats.map(([k, v]) => h("div", { class: "stat" }, h("dt", {}, tr("stat." + k)), h("dd", {}, String(v))))),
      h("div", { class: "meter", role: "img", "aria-label": `${s.evaluated} / ${s.tools}` }, h("span", { class: "meter-fill", id: "meter-fill" })),
      h("p", { class: "muted" }, `${tr("lastResearch")}: ${state.lastResearch ?? tr("never")}. ${tr("coverageNote")}`),
    ),
    h("section", { class: "wrap", "aria-labelledby": "cats" },
      h("h2", { id: "cats" }, tr("browseCategories")),
      h("ul", { class: "grid" }, state.categories.map((c) => {
        const n = state.tools.filter((x) => x.categories.primary === c.id).length;
        return h("li", {}, h("a", { class: "card", href: "#/category/" + c.id }, h("strong", {}, loc(c.name)), h("span", { class: "muted" }, loc(c.description)), h("span", { class: "count" }, tr("toolsCount", { n }))));
      })),
    ),
  );
}

function toolRow(tool) {
  const inCompare = state.compare.includes(tool.id);
  return h("li", { class: "tool" },
    logo(tool),
    h("div", { class: "grow" },
      h("h3", {}, h("a", { href: "#/tool/" + tool.id }, tool.name)),
      h("p", { class: "muted" }, `${tool.provider} · ${catName(tool.categories.primary)}`),
      h("p", {}, loc(tool.description)),
      h("p", { class: "badges" }, statusBadge(tool), freeBadge(tool), evalBadge(tool), badge(tr("accessValues." + tool.access))),
    ),
    h("button", { type: "button", class: "btn small", "aria-pressed": String(inCompare), onclick: () => toggleCompare(tool.id) }, inCompare ? tr("removeCompare") : tr("addCompare"), h("span", { class: "sr-only" }, ": " + tool.name)),
  );
}

function toggleCompare(id) {
  const i = state.compare.indexOf(id);
  if (i >= 0) state.compare.splice(i, 1);
  else if (state.compare.length >= MAX_COMPARE) { announce(tr("compareFull")); return; }
  else state.compare.push(id);
  store("compare", state.compare);
  render();
}
function announce(msg) { const el = document.getElementById("live"); el.textContent = ""; setTimeout(() => (el.textContent = msg), 20); }

function directoryView(params) {
  setTitle(tr("directory"));
  const f = state.filters;
  if (params.has("cat")) f.category = params.get("cat");
  const wrap = h("section", { class: "wrap" }, h("h1", {}, tr("directory")));
  const results = h("div", { "aria-live": "polite" });
  const field = (label, control) => h("label", { class: "field" }, h("span", {}, label), control);
  const input = h("input", { type: "search", value: f.q, placeholder: tr("searchPlaceholder"), oninput: (e) => { f.q = e.target.value; f.page = 1; draw(); } });
  const selCat = h("select", { onchange: (e) => { f.category = e.target.value; f.page = 1; draw(); } }, h("option", { value: "" }, tr("allCategories")), state.categories.map((c) => h("option", { value: c.id, selected: c.id === f.category }, loc(c.name))));
  const selAcc = h("select", { onchange: (e) => { f.access = e.target.value; f.page = 1; draw(); } }, h("option", { value: "" }, tr("allAccess")), Object.keys(STRINGS_ACCESS).map((k) => h("option", { value: k, selected: k === f.access }, tr("accessValues." + k))));
  const selSort = h("select", { onchange: (e) => { f.sort = e.target.value; draw(); } }, [["name", "sortName"], ["provider", "sortProvider"], ["category", "sortCategory"]].map(([v, k]) => h("option", { value: v, selected: v === f.sort }, tr(k))));
  wrap.append(h("div", { class: "filters", role: "search" }, field(tr("search"), input), field(tr("category"), selCat), field(tr("access"), selAcc), field(tr("sort"), selSort)), results);
  function draw() {
    const list = sortTools(filterTools(state.tools, { category: f.category, access: f.access, query: f.q, lang: state.lang }), f.sort);
    const pg = paginate(list, f.page, PAGE_SIZE);
    f.page = pg.page;
    results.replaceChildren();
    results.append(h("p", { class: "muted" }, tr("results", { n: pg.total })));
    if (!pg.total) {
      results.append(h("div", { class: "empty" }, h("p", {}, tr("emptyResults")), h("button", { type: "button", class: "btn", onclick: () => { Object.assign(f, { q: "", category: "", access: "", page: 1 }); render(); } }, tr("reset"))));
      return;
    }
    results.append(h("ul", { class: "list" }, pg.items.map(toolRow)));
    results.append(h("nav", { class: "pager", "aria-label": tr("page", { p: pg.page, t: pg.totalPages }) },
      h("button", { type: "button", class: "btn small", disabled: pg.page <= 1, onclick: () => { f.page--; draw(); } }, tr("prev")),
      h("span", {}, tr("page", { p: pg.page, t: pg.totalPages })),
      h("button", { type: "button", class: "btn small", disabled: pg.page >= pg.totalPages, onclick: () => { f.page++; draw(); } }, tr("next"))));
  }
  draw();
  return wrap;
}
const STRINGS_ACCESS = { unknown: 1, free: 1, freemium: 1, paid: 1, open_source: 1 };

function categoryView(id) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return h("section", { class: "wrap" }, h("h1", {}, tr("notFound")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")));
  setTitle(loc(cat.name));
  const { ranked, notEvaluated } = rankingFor(id, state.tools, state.evaluations);
  const wrap = h("section", { class: "wrap" },
    h("nav", { class: "tabs", "aria-label": tr("nav.categories") }, state.categories.map((c) => h("a", { href: "#/category/" + c.id, "aria-current": c.id === id ? "page" : null }, loc(c.name)))),
    h("h1", {}, loc(cat.name)), h("p", { class: "lead" }, loc(cat.description)));
  if (!ranked.length && !notEvaluated.length) { wrap.append(h("div", { class: "empty" }, h("p", {}, tr("emptyCategory")), h("a", { class: "btn", href: "#/contribute" }, tr("contribute")))); return wrap; }
  wrap.append(h("h2", {}, tr("ranking")));
  if (ranked.length) {
    wrap.append(h("p", { class: "muted" }, tr("rankingBasis")), h("ol", { class: "list" }, ranked.map((r) => h("li", { class: "tool" }, h("div", {}, h("h3", {}, `${r.rank}. `, h("a", { href: "#/tool/" + r.tool.id }, r.tool.name)), h("p", { class: "muted" }, r.tool.provider)), h("strong", { class: "score" }, `${r.evaluation.score}/100`)))));
  } else wrap.append(h("div", { class: "empty" }, h("p", {}, tr("rankingNone"))));
  const boards = state.benchmarks.filter((b) => b.categoryId === id);
  for (const b of boards) wrap.append(benchmarkView(b));
  if (!boards.length) wrap.append(h("h2", {}, tr("benchmark.title")), h("p", { class: "muted" }, tr("benchmark.none")));
  if (notEvaluated.length) wrap.append(h("h2", {}, tr("unrankedTools")), h("ul", { class: "list" }, notEvaluated.map(toolRow)));
  return wrap;
}

function benchmarkView(b) {
  const related = (r) => {
    const tool = state.tools.find((x) => x.id === r.relatedToolId);
    return tool ? h("a", { href: "#/tool/" + tool.id }, tool.name) : "";
  };
  return h("section", { class: "bench", "aria-label": tr("benchmark.title") },
    h("h2", {}, tr("benchmark.title")),
    h("p", { class: "notice", role: "note" }, tr("benchmark.note")),
    h("p", {}, h("strong", {}, b.title), ` · ${tr("benchmark.source")}: `, extLink(b.source.finalUrl, b.source.name)),
    h("p", { class: "muted" }, `${tr("benchmark.updated")}: ${b.boardUpdated} · ${tr("benchmark.retrieved")}: ${b.retrieved} · ${loc(b.scope)}`),
    h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": b.title },
      h("table", {}, h("thead", {}, h("tr", {}, [tr("benchmark.rank"), tr("benchmark.model"), tr("benchmark.org"), tr("benchmark.score"), tr("benchmark.related")].map((c) => h("th", { scope: "col" }, c)))),
        h("tbody", {}, b.entries.map((r) => h("tr", {}, h("td", {}, String(r.rank)), h("th", { scope: "row" }, r.model), h("td", {}, r.organization), h("td", {}, String(r.score) + (r.preliminary ? ` (${tr("benchmark.preliminary")})` : "")), h("td", {}, related(r))))))),
    b.omitted ? h("p", { class: "muted" }, `${tr("benchmark.omitted")}: ${b.omitted}`) : null);
}

function toolView(id) {
  const tool = state.tools.find((x) => x.id === id);
  if (!tool) return h("section", { class: "wrap" }, h("h1", {}, tr("notFound")), h("p", {}, tr("toolNotFound")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")));
  setTitle(tool.name);
  const evals = state.evaluations.filter((e) => e.toolId === id && isPublishable(e)).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate));
  const row = (k, v) => h("div", { class: "kv" }, h("dt", {}, k), h("dd", {}, v));
  const urls = tool.urls;
  const inCompare = state.compare.includes(id);
  return h("section", { class: "wrap narrow" },
    h("a", { href: "#/directory" }, tr("nav.directory")),
    h("div", { class: "title-row" }, logo(tool, "big"), h("h1", {}, tool.name)), h("p", { class: "lead" }, loc(tool.description)),
    tool.notes ? h("p", { class: "notice", role: "note" }, h("strong", {}, tr("notes") + ": "), loc(tool.notes)) : null,
    h("p", { class: "badges" }, statusBadge(tool), freeBadge(tool), evalBadge(tool), badge(tr("accessValues." + tool.access))),
    tool.freeOfferMentioned ? h("p", { class: "muted" }, tr("freeOfferHelp")) : null,
    h("button", { type: "button", class: "btn small", "aria-pressed": String(inCompare), onclick: () => toggleCompare(id) }, inCompare ? tr("removeCompare") : tr("addCompare")),
    h("h2", {}, tr("officialLinks")),
    h("dl", {}, row(tr("provider"), tool.provider), row(tr("category"), catName(tool.categories.primary)), row(tr("product"), extLink(urls.product, urls.product)), row(tr("docs"), extLink(urls.docs, urls.docs)), row(tr("repository"), extLink(urls.repository, urls.repository)), row(tr("pricing"), extLink(urls.pricing, urls.pricing))),
    h("h2", {}, tr("evidence")),
    h("dl", {}, row(tr("discoverySource"), tool.discovery.source), row(tr("discoveredOn"), tool.discovery.date), row(tr("lastVerified"), tool.verification.lastVerified ?? tr("never")),
      tool.verification.evidenceUrl ? row(tr("evidenceUrl"), extLink(tool.verification.evidenceUrl, tool.verification.evidenceUrl)) : null,
      tool.verification.method ? row(tr("method"), tool.verification.method) : null,
      tool.verification.status === "verified" ? row(tr("providerOnPage"), tr(tool.verification.providerConfirmedOnPage ? "yes" : "no")) : null),
    h("h2", {}, tr("limitations")), h("p", {}, loc(tool.limitations) || tr("notProvided")),
    h("h2", {}, tr("evalHistory")),
    evals.length ? h("ul", { class: "list" }, evals.map((e) => h("li", { class: "tool" }, h("div", {}, h("strong", {}, `${e.score}/100`), h("p", { class: "muted" }, `${e.evaluationDate} · ${e.basis} · v${e.protocolVersion}`), h("p", {}, e.limitations))))) : h("p", { class: "empty" }, tr("noEval")),
  );
}

function compareView() {
  setTitle(tr("compare"));
  const wrap = h("section", { class: "wrap" }, h("h1", {}, tr("compare")), h("p", { class: "muted" }, tr("compareHelp")));
  const picked = state.compare.map((id) => state.tools.find((x) => x.id === id)).filter(Boolean);
  if (!picked.length) { wrap.append(h("div", { class: "empty" }, h("p", {}, tr("compareEmpty")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")))); return wrap; }
  const rows = [
    [tr("provider"), (x) => x.provider], [tr("category"), (x) => catName(x.categories.primary)],
    [tr("access"), (x) => tr("accessValues." + x.access)], [tr("freeOffer"), (x) => (x.freeOfferMentioned ? tr("yes") : tr("notProvided"))], [tr("product"), (x) => extLink(x.urls.product, x.urls.product)],
    [tr("pricing"), (x) => extLink(x.urls.pricing, x.urls.pricing)], [tr("ranking"), (x) => { const e = state.evaluations.filter((v) => v.toolId === x.id && isPublishable(v)).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate))[0]; return e ? `${e.score}/100` : tr("notEvaluated"); }],
    [tr("evidence"), (x) => (x.verification.status === "verified" ? tr("verifiedLabel") : tr("pendingReview"))],
  ];
  wrap.append(h("p", {}, tr("compareCount", { n: picked.length })),
    h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": tr("compare") },
      h("table", {}, h("thead", {}, h("tr", {}, h("th", { scope: "col" }, tr("field")), picked.map((x) => h("th", { scope: "col" }, logo(x, "small"), " ", h("a", { href: "#/tool/" + x.id }, x.name))))),
        h("tbody", {}, rows.map(([label, fn]) => h("tr", {}, h("th", { scope: "row" }, label), picked.map((x) => h("td", {}, fn(x)))))))),
    h("button", { type: "button", class: "btn", onclick: () => { state.compare = []; store("compare", []); render(); } }, tr("clearCompare")));
  return wrap;
}

function pageView(key) {
  const entry = PAGES[key];
  const page = entry[state.lang] ?? entry.en;
  setTitle(page.title);
  const wrap = h("article", { class: "wrap narrow" }, h("h1", {}, page.title));
  if (entry.legal) wrap.append(h("p", { class: "notice", role: "note" }, tr("draft")));
  for (const s of page.sections) wrap.append(h("h2", {}, s.h), ...s.p.map((p) => h("p", {}, p)));
  if (key === "contact") {
    wrap.append(h("h2", {}, "GitHub"), h("p", {}, extLink(CONFIG.repoUrl, CONFIG.repoUrl)));
    if (CONFIG.contactEmail) wrap.append(h("p", {}, h("a", { href: "mailto:" + CONFIG.contactEmail }, CONFIG.contactEmail)));
  }
  return wrap;
}

/* ---------- boot ---------- */
async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}
async function boot() {
  const saved = load("lang", null);
  state.lang = saved === "fr" || saved === "en" ? saved : navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
  const stored = load("compare", []);
  document.getElementById("lang").addEventListener("change", (e) => { state.lang = e.target.value === "fr" ? "fr" : "en"; store("lang", state.lang); render(); });
  window.addEventListener("hashchange", render);
  root.replaceChildren(h("p", { class: "wrap", role: "status" }, tr("loading")));
  renderChrome();
  try {
    const [tools, cats, evals, bench] = await Promise.all([fetchJson("data/tools.json"), fetchJson("data/categories.json"), fetchJson("data/evaluations.json"), fetchJson("data/benchmarks.json")]);
    state.tools = tools.tools; state.lastResearch = tools.lastResearchDate; state.categories = cats.categories; state.evaluations = evals.evaluations; state.benchmarks = bench.benchmarks;
    state.compare = Array.isArray(stored) ? stored.filter((id) => state.tools.some((x) => x.id === id)).slice(0, MAX_COMPARE) : [];
    render();
    requestAnimationFrame(() => { const m = document.getElementById("meter-fill"); if (m) m.style.setProperty("--p", String(state.tools.length ? computeStats(state.tools, state.categories, state.evaluations).evaluated / state.tools.length : 0)); });
  } catch (err) {
    console.error(err);
    root.replaceChildren(h("section", { class: "wrap" }, h("h1", {}, tr("loadError")), h("button", { type: "button", class: "btn", onclick: () => location.reload() }, tr("retry"))));
  }
}
boot();
