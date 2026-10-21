import { CONFIG } from "../config.js";
import { t } from "./i18n.js";
import { PAGES } from "./pages.js";
import { computeStats, filterTools, sortTools, paginate, rankingFor, isSafeHttpUrl, isPublishable, topEntries } from "./lib.js";

const PAGE_SIZE = 12;
const MAX_COMPARE = 4;
const state = { lang: "en", tools: [], categories: [], evaluations: [], benchmarks: [], compare: [], filters: { q: "", category: "", free: false, sort: "name", page: 1 } };
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

function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } }
function load(key, fallback) { try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; } }

/* ---------- theme (light / dark) ---------- */
const currentTheme = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f2ff" : "#0d0b1a");
  const btn = document.getElementById("theme");
  if (btn) { btn.setAttribute("aria-checked", String(theme === "dark")); btn.setAttribute("aria-label", tr(theme === "dark" ? "theme.toLight" : "theme.toDark")); }
}

/* ---------- small components ---------- */
function extLink(url, label) {
  if (!isSafeHttpUrl(url)) return h("span", { class: "muted" }, tr("notProvided"));
  return h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, label, h("span", { class: "sr-only" }, " " + tr("external")));
}
const badge = (text, kind = "") => h("span", { class: `badge ${kind}` }, text);
const verifiedBadge = (tool) => (tool.verification.status === "verified" ? badge("✓ " + tr("verifiedLabel"), "ok") : null);
const freeBadge = (tool) => (tool.freeOfferMentioned ? badge(tr("freeOffer"), "free") : null);

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

/* ---------- routing ---------- */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(query) };
}
const DEFAULT_DESC = { en: "AI RANKING: an AI tools directory with official links and public model rankings. Our own scores appear only after a reviewed test.", fr: "AI RANKING : un annuaire d'outils d'IA avec liens officiels et classements publics de modèles. Nos propres scores n'apparaissent qu'après un test relu." };
function setTitle(text, description) {
  document.title = text ? `${text} · ${tr("brand")}` : `${tr("brand")} · ${tr("hero.eyebrow")}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", (description || DEFAULT_DESC[state.lang]).slice(0, 300));
}
function crumbs(...items) {
  const all = [[tr("brand"), "#/"], ...items];
  return h("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, h("ol", {}, all.map(([label, href], i) => h("li", {}, i === all.length - 1 ? h("span", { "aria-current": "page" }, label) : h("a", { href }, label)))));
}

function render() {
  document.documentElement.lang = state.lang;
  renderChrome();
  const { parts, params } = parseHash();
  const [view, arg] = parts;
  root.replaceChildren();
  let node;
  if (!view) node = homeView();
  else if (view === "directory") node = directoryView(params);
  else if (view === "rankings") node = rankingsView(arg);
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
  const { parts } = parseHash();
  const current = parts[0] ?? "";
  document.getElementById("nav").replaceChildren(
    ...["directory", "rankings", "compare", "methodology", "sources", "about"].map((k) =>
      h("a", { href: "#/" + k, "aria-current": k === current ? "page" : null }, tr("nav." + k) + (k === "compare" && state.compare.length ? ` (${state.compare.length})` : "")),
    ),
  );
  const sel = document.getElementById("lang");
  sel.setAttribute("aria-label", tr("lang"));
  sel.value = state.lang;
  document.getElementById("skip").textContent = tr("skip");
  document.getElementById("brand-text").textContent = tr("brand");
  applyTheme(currentTheme());
  const f = document.getElementById("footer-links");
  f.replaceChildren(...["privacy", "terms", "cookies", "contact", "contribute"].map((p) => h("a", { href: "#/" + p }, tr("footerLinks." + p))));
  if (isSafeHttpUrl(CONFIG.repoUrl)) f.append(extLink(CONFIG.repoUrl, tr("footerLinks.repo")));
  document.getElementById("disclaimer").textContent = tr("footerDisclaimer");
  document.getElementById("powered").textContent = tr("powered");
}

/* ---------- benchmark table ---------- */
function benchmarkView(b) {
  const related = (r) => {
    const tool = state.tools.find((x) => x.id === r.relatedToolId);
    return tool ? h("a", { href: "#/tool/" + tool.id }, tool.name) : "";
  };
  return h("section", { class: "glass bench", "aria-label": b.title },
    h("div", { class: "bench-head" },
      h("h3", {}, b.title),
      h("p", { class: "muted" }, `${tr("benchmark.note")} ${tr("benchmark.source")}: `, extLink(b.source.finalUrl, b.source.name), ` · ${tr("benchmark.updated")}: ${b.boardUpdated} · ${tr("benchmark.retrieved")}: ${b.retrieved}`)),
    h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": b.title },
      h("table", {}, h("thead", {}, h("tr", {}, [tr("benchmark.rank"), tr("benchmark.model"), tr("benchmark.org"), tr("benchmark.score"), tr("benchmark.related")].map((c) => h("th", { scope: "col" }, c)))),
        h("tbody", {}, b.entries.map((r) => h("tr", {}, h("td", { class: "rank" }, String(r.rank)), h("th", { scope: "row" }, r.model), h("td", {}, r.organization), h("td", {}, String(r.score) + (r.preliminary ? ` (${tr("benchmark.preliminary")})` : "")), h("td", {}, related(r))))))),
    b.omitted ? h("p", { class: "muted small" }, `${tr("benchmark.omitted")}: ${b.omitted}`) : null);
}

/* ---------- views ---------- */
function homeView() {
  setTitle("");
  const s = computeStats(state.tools, state.categories, state.evaluations);
  const stats = [["tools", s.tools], ["categories", s.categories], ["verified", s.verified], ["benchmarks", state.benchmarks.length]];
  return h("div", {},
    h("section", { class: "hero wrap" },
      h("p", { class: "eyebrow" }, tr("hero.eyebrow")),
      h("h1", {}, tr("hero.title")),
      h("p", { class: "lead" }, tr("hero.text")),
      h("div", { class: "actions" }, h("a", { class: "btn primary", href: "#/directory" }, tr("hero.browse")), h("a", { class: "btn", href: "#/rankings" }, tr("hero.rankings"))),
      h("dl", { class: "stats" }, stats.map(([k, v]) => h("div", { class: "stat glass" }, h("dt", {}, tr("stat." + k)), h("dd", {}, String(v))))),
    ),
    h("section", { class: "wrap", "aria-labelledby": "snap" },
      h("h2", { id: "snap" }, tr("snapshot.title")), h("p", { class: "muted" }, tr("snapshot.text")),
      h("div", { class: "grid wide" }, state.benchmarks.map((b) => h("article", { class: "glass snap" },
        h("p", { class: "eyebrow" }, catName(b.categoryId)),
        h("h3", {}, b.title),
        h("ol", { class: "top3" }, topEntries(b, 3).map((r) => h("li", {}, h("span", {}, r.model), h("small", { class: "muted" }, r.organization), h("strong", {}, String(r.score))))),
        h("p", { class: "small" }, h("a", { href: "#/rankings/" + b.categoryId }, tr("snapshot.full")), ` · ${b.boardUpdated}`))))),
    h("section", { class: "wrap", "aria-labelledby": "cats" },
      h("h2", { id: "cats" }, tr("browseCategories")),
      h("ul", { class: "grid" }, state.categories.map((c) => {
        const n = state.tools.filter((x) => x.categories.primary === c.id).length;
        return h("li", {}, h("a", { class: "card glass", href: "#/category/" + c.id }, h("strong", {}, loc(c.name)), h("span", { class: "muted" }, loc(c.description)), h("span", { class: "count" }, tr("toolsCount", { n }))));
      })),
    ),
  );
}

function rankingsView(arg) {
  const withBoards = state.categories.filter((c) => state.benchmarks.some((b) => b.categoryId === c.id));
  const id = withBoards.some((c) => c.id === arg) ? arg : withBoards[0]?.id;
  setTitle(`${tr("rankings.title")}: ${catName(id)}`, tr("rankings.text"));
  const wrap = h("section", { class: "wrap" },
    h("h1", {}, tr("rankings.title")), h("p", { class: "lead" }, tr("rankings.text")),
    h("nav", { class: "tabs", "aria-label": tr("rankings.pick") }, withBoards.map((c) => h("a", { href: "#/rankings/" + c.id, "aria-current": c.id === id ? "page" : null }, loc(c.name)))));
  for (const b of state.benchmarks.filter((x) => x.categoryId === id)) wrap.append(benchmarkView(b));
  if (id) wrap.append(h("p", {}, h("a", { class: "btn", href: "#/category/" + id }, catName(id))));
  return wrap;
}

function toggleCompare(tid) {
  const i = state.compare.indexOf(tid);
  if (i >= 0) state.compare.splice(i, 1);
  else if (state.compare.length >= MAX_COMPARE) { announce(tr("compareFull")); return; }
  else state.compare.push(tid);
  store("compare", state.compare);
  render();
}
function announce(msg) { const el = document.getElementById("live"); el.textContent = ""; setTimeout(() => (el.textContent = msg), 20); }

function toolRow(tool) {
  const inCompare = state.compare.includes(tool.id);
  return h("li", { class: "tool glass" },
    logo(tool),
    h("div", { class: "grow" },
      h("h3", {}, h("a", { href: "#/tool/" + tool.id }, tool.name)),
      h("p", { class: "muted" }, `${tool.provider} · ${catName(tool.categories.primary)}`),
      h("p", {}, loc(tool.description)),
      h("p", { class: "badges" }, verifiedBadge(tool), freeBadge(tool)),
    ),
    h("button", { type: "button", class: "btn small", "aria-pressed": String(inCompare), onclick: () => toggleCompare(tool.id) }, inCompare ? tr("removeCompare") : tr("addCompare"), h("span", { class: "sr-only" }, ": " + tool.name)),
  );
}

function directoryView(params) {
  setTitle(tr("directory"));
  const f = state.filters;
  if (params.has("cat")) f.category = params.get("cat");
  const wrap = h("section", { class: "wrap" }, h("h1", {}, tr("directory")));
  const results = h("div", { "aria-live": "polite" });
  const field = (label, control) => h("label", { class: "field" }, h("span", {}, label), control);
  const input = h("input", { type: "search", value: f.q, placeholder: tr("searchPlaceholder"), oninput: (e) => { f.q = e.target.value; f.page = 1; draw(); } });
  const selCat = h("select", { onchange: (e) => { f.category = e.target.value; f.page = 1; draw(); } }, h("option", { value: "" }, tr("allCategories")), state.categories.map((c) => h("option", { value: c.id, selected: c.id === f.category }, loc(c.name))));
  const selFree = h("select", { onchange: (e) => { f.free = e.target.value === "free"; f.page = 1; draw(); } }, h("option", { value: "" }, tr("anyOffer")), h("option", { value: "free", selected: f.free }, tr("freeOnly")));
  const selSort = h("select", { onchange: (e) => { f.sort = e.target.value; draw(); } }, [["name", "sortName"], ["provider", "sortProvider"], ["category", "sortCategory"]].map(([v, k]) => h("option", { value: v, selected: v === f.sort }, tr(k))));
  wrap.append(h("div", { class: "filters glass", role: "search" }, field(tr("search"), input), field(tr("category"), selCat), field(tr("freeFilter"), selFree), field(tr("sort"), selSort)), results);
  function draw() {
    const list = sortTools(filterTools(state.tools, { category: f.category, free: f.free, query: f.q, lang: state.lang }), f.sort);
    const pg = paginate(list, f.page, PAGE_SIZE);
    f.page = pg.page;
    results.replaceChildren();
    results.append(h("p", { class: "muted" }, tr("results", { n: pg.total })));
    if (!pg.total) {
      results.append(h("div", { class: "empty glass" }, h("p", {}, tr("emptyResults")), h("button", { type: "button", class: "btn", onclick: () => { Object.assign(f, { q: "", category: "", free: false, page: 1 }); render(); } }, tr("reset"))));
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

function categoryView(id) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return h("section", { class: "wrap" }, h("h1", {}, tr("notFound")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")));
  setTitle(loc(cat.name), loc(cat.description));
  const { ranked, notEvaluated } = rankingFor(id, state.tools, state.evaluations);
  const wrap = h("section", { class: "wrap" },
    crumbs([tr("nav.directory"), "#/directory"], [loc(cat.name), "#/category/" + id]),
    h("nav", { class: "tabs", "aria-label": tr("category") }, state.categories.map((c) => h("a", { href: "#/category/" + c.id, "aria-current": c.id === id ? "page" : null }, loc(c.name)))),
    h("h1", {}, loc(cat.name)), h("p", { class: "lead" }, loc(cat.description)));
  const boards = state.benchmarks.filter((b) => b.categoryId === id);
  for (const b of boards) wrap.append(benchmarkView(b));
  if (!boards.length) wrap.append(h("p", { class: "muted" }, tr("benchmark.none")));
  wrap.append(h("h2", {}, tr("ownRanking")));
  if (ranked.length) {
    wrap.append(h("p", { class: "muted" }, tr("ownRankingBasis")), h("ol", { class: "list" }, ranked.map((r) => h("li", { class: "tool glass" }, logo(r.tool), h("div", { class: "grow" }, h("h3", {}, `${r.rank}. `, h("a", { href: "#/tool/" + r.tool.id }, r.tool.name)), h("p", { class: "muted" }, r.tool.provider)), h("strong", { class: "score" }, `${r.evaluation.score}/100`)))));
  } else wrap.append(h("p", { class: "muted" }, tr("ownRankingNone")));
  const unranked = ranked.length ? notEvaluated : [...notEvaluated];
  if (!unranked.length && !ranked.length) wrap.append(h("div", { class: "empty glass" }, h("p", {}, tr("emptyCategory")), h("a", { class: "btn", href: "#/contribute" }, tr("footerLinks.contribute"))));
  else if (unranked.length) wrap.append(h("h2", {}, tr("directory")), h("ul", { class: "list" }, unranked.map(toolRow)));
  return wrap;
}

function toolView(id) {
  const tool = state.tools.find((x) => x.id === id);
  if (!tool) return h("section", { class: "wrap" }, h("h1", {}, tr("notFound")), h("p", {}, tr("toolNotFound")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")));
  setTitle(tool.name, `${tool.name} (${tool.provider}): ${loc(tool.description)}`);
  const evals = state.evaluations.filter((e) => e.toolId === id && isPublishable(e)).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate));
  const row = (k, v) => (v == null ? null : h("div", { class: "kv" }, h("dt", {}, k), h("dd", {}, v)));
  const u = tool.urls;
  const inCompare = state.compare.includes(id);
  return h("section", { class: "wrap narrow" },
    crumbs([tr("nav.directory"), "#/directory"], [catName(tool.categories.primary), "#/category/" + tool.categories.primary], [tool.name, "#/tool/" + id]),
    h("div", { class: "title-row" }, logo(tool, "big"), h("div", {}, h("h1", {}, tool.name), h("p", { class: "muted" }, `${tool.provider} · ${catName(tool.categories.primary)}`))),
    h("p", { class: "lead" }, loc(tool.description)),
    tool.notes ? h("p", { class: "notice", role: "note" }, h("strong", {}, tr("notes") + ": "), loc(tool.notes)) : null,
    h("p", { class: "badges" }, verifiedBadge(tool), freeBadge(tool)),
    tool.freeOfferMentioned ? h("p", { class: "muted small" }, tr("freeOfferHelp")) : null,
    h("p", {}, h("button", { type: "button", class: "btn small", "aria-pressed": String(inCompare), onclick: () => toggleCompare(id) }, inCompare ? tr("removeCompare") : tr("addCompare"))),
    h("div", { class: "glass panel" }, h("h2", {}, tr("officialLinks")),
      h("dl", {}, row(tr("product"), extLink(u.product, u.product)), u.docs ? row(tr("docs"), extLink(u.docs, u.docs)) : null, u.repository ? row(tr("repository"), extLink(u.repository, u.repository)) : null, u.pricing ? row(tr("pricing"), extLink(u.pricing, u.pricing)) : null)),
    tool.verification.status === "verified" ? h("div", { class: "glass panel" }, h("h2", {}, tr("verification")),
      h("p", {}, "✓ " + tr("verifiedOn", { d: tool.verification.lastVerified })),
      h("dl", {}, row(tr("evidenceUrl"), extLink(tool.verification.evidenceUrl, tool.verification.evidenceUrl)))) : null,
    h("div", { class: "glass panel" }, h("h2", {}, tr("limitations")), h("p", {}, loc(tool.limitations))),
    h("div", { class: "glass panel" }, h("h2", {}, tr("evalHistory")),
      evals.length ? h("ul", { class: "list" }, evals.map((e) => h("li", {}, h("strong", {}, `${e.score}/100`), h("p", { class: "muted" }, `${e.evaluationDate} · ${e.basis} · v${e.protocolVersion}`), h("p", {}, e.limitations)))) : h("p", { class: "muted" }, tr("noEval"))),
  );
}

function compareView() {
  setTitle(tr("compare"));
  const wrap = h("section", { class: "wrap" }, h("h1", {}, tr("compare")), h("p", { class: "muted" }, tr("compareHelp")));
  const picked = state.compare.map((tid) => state.tools.find((x) => x.id === tid)).filter(Boolean);
  if (!picked.length) { wrap.append(h("div", { class: "empty glass" }, h("p", {}, tr("compareEmpty")), h("a", { class: "btn", href: "#/directory" }, tr("nav.directory")))); return wrap; }
  const rows = [
    [tr("provider"), (x) => x.provider], [tr("category"), (x) => catName(x.categories.primary)],
    [tr("freeOffer"), (x) => (x.freeOfferMentioned ? tr("yes") : tr("notProvided"))],
    [tr("product"), (x) => extLink(x.urls.product, x.urls.product)], [tr("pricing"), (x) => extLink(x.urls.pricing, x.urls.pricing)],
    [tr("score"), (x) => { const e = state.evaluations.filter((v) => v.toolId === x.id && isPublishable(v)).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate))[0]; return e ? `${e.score}/100` : tr("notProvided"); }],
    [tr("verification"), (x) => (x.verification.status === "verified" ? tr("verifiedOn", { d: x.verification.lastVerified }) : tr("notProvided"))],
  ];
  wrap.append(h("p", {}, tr("compareCount", { n: picked.length })),
    h("div", { class: "table-wrap glass", tabindex: "0", role: "region", "aria-label": tr("compare") },
      h("table", {}, h("thead", {}, h("tr", {}, h("th", { scope: "col" }, tr("field")), picked.map((x) => h("th", { scope: "col" }, logo(x, "small"), " ", h("a", { href: "#/tool/" + x.id }, x.name))))),
        h("tbody", {}, rows.map(([label, fn]) => h("tr", {}, h("th", { scope: "row" }, label), picked.map((x) => h("td", {}, fn(x)))))))),
    h("button", { type: "button", class: "btn", onclick: () => { state.compare = []; store("compare", []); render(); } }, tr("clearCompare")));
  return wrap;
}

function pageView(key) {
  const entry = PAGES[key];
  const page = entry[state.lang] ?? entry.en;
  setTitle(page.title);
  const wrap = h("article", { class: "wrap narrow glass panel prose" }, h("h1", {}, page.title));
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
  document.getElementById("theme").addEventListener("click", () => { const next = currentTheme() === "dark" ? "light" : "dark"; store("theme", next); applyTheme(next); });
  window.addEventListener("hashchange", render);
  root.replaceChildren(h("p", { class: "wrap", role: "status" }, tr("loading")));
  renderChrome();
  try {
    const [tools, cats, evals, bench] = await Promise.all([fetchJson("data/tools.json"), fetchJson("data/categories.json"), fetchJson("data/evaluations.json"), fetchJson("data/benchmarks.json")]);
    state.tools = tools.tools; state.categories = cats.categories; state.evaluations = evals.evaluations; state.benchmarks = bench.benchmarks;
    state.compare = Array.isArray(stored) ? stored.filter((tid) => state.tools.some((x) => x.id === tid)).slice(0, MAX_COMPARE) : [];
    render();
  } catch (err) {
    console.error(err);
    root.replaceChildren(h("section", { class: "wrap" }, h("h1", {}, tr("loadError")), h("button", { type: "button", class: "btn", onclick: () => location.reload() }, tr("retry"))));
  }
}
boot();
