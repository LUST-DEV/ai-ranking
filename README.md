# LUST DEV AI RANKING HUB

[Français](README.fr.md)

A bilingual (EN/FR), source-backed directory of AI tools with category-specific rankings. **A score is shown only after a documented test that a second maintainer has reviewed.** Until then a tool is marked "Not yet evaluated".

> **Status: v0.2.** 35 entries across 13 categories. **35 are verified** (definition below), **0 are evaluated** by our own tests, and **3 public benchmarks** from Arena (formerly LMArena) are shown separately. The catalogue does not claim to list every AI tool. Live site: not deployed yet.

**"Verified" means:** on 2026-10-18 the entry's official page was opened (through Firecrawl, possibly a copy cached up to a few days old), answered normally, and names the product. It does **not** mean tested, and prices, access model, API and licences stay empty unless the page states them. Checking found real changes, shown as notes on tool pages (for example Le Chat is now "Vibe by Mistral", NotebookLM is now "Gemini Notebook", Continue states it was acquired by Cursor).

## Features
- Directory with search (accent-insensitive), category and access filters, sorting and pagination
- Category pages: rankings built only from reviewed evaluations, plus separate public benchmark tables (source link, board date, retrieval date)
- Tool pages: official links, discovery source, verification status, limitations, evaluation history
- Side-by-side comparison of up to four tools
- English/French interface, keyboard accessible, visible focus, reduced-motion support
- Methodology, sources, privacy, terms and cookie pages (legal pages are drafts)
- No analytics, no cookies, no third-party requests

## Stack
Dependency-free: static HTML/CSS and ES modules, JSON data, Node.js >= 20 for scripts and tests (`node:test`). No `npm install` is needed.

```
site/     website (index.html, css/, js/)
data/     tools.json, categories.json, evaluations.json
scripts/  validate-data, build, check-links, stale-report, serve
tests/    node:test suites
.github/  CI, scheduled link check, issue and PR templates
```

## Run locally
```bash
npm run validate   # schema, duplicates, source and review-gate checks
npm test           # unit, data, localisation, accessibility and build tests
npm run build      # writes dist/ (set SITE_URL=https://... to also emit sitemap.xml)
npm start          # build, then preview on http://127.0.0.1:4173
npm run check-links  # needs network; writes link-report.json
npm run fetch-icons  # needs network; downloads official icons into site/icons/ (see Icons)
```

## Data model
`data/tools.json` entries hold: `id`, `name`, `provider`, `aliases`, `categories`, bilingual `description`, `urls` (product, docs, repository, pricing), `access`, `platforms`, `version`, `api`, `openSource`, `verification`, `discovery` and bilingual `limitations`. Unknown values stay `null`/`"unknown"`. Scores are never stored on a tool; they live in `data/evaluations.json` and must pass the gates in [METHODOLOGY.md](METHODOLOGY.md).

## Automation
- **CI** (`ci.yml`): validate, test, build on every push and pull request.
- **Link check** (`link-check.yml`): weekly and on demand; uploads a report and opens or updates an issue. It never edits data.
- **Stale check** (`stale-report`): monthly report of unverified or old entries.
Discovery of new tools is done through reviewed pull requests, not automatically published.

## Icons
Each tool records `icon.sourceUrl`, the favicon its official site declares. Run `npm run fetch-icons` with network access: it downloads allowed image types (PNG, SVG, ICO, WebP, JPEG, under 300 KB, no active SVG content), saves them in `site/icons/`, and sets `icon.file`. Review the images, then commit them. Until a file exists the site shows an initials badge, and it also falls back to initials if an image fails to load. Icons are trademarks of their owners and are shown only to identify the product. GitHub's generic mark is not used for Copilot or Whisper, and no icon was found for Aider, n8n or Hugging Face.

## Security and privacy
Strict Content-Security-Policy and security headers in `vercel.json`; the app inserts data as text only; only https links are rendered. See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

## Deploy
`vercel.json` is configured for a static deployment (build `npm run build`, output `dist`). Set `SITE_URL` and `site/config.js` values after the first verified deployment.

## Known limitations
- Hash-based routes: only the home page can appear in the sitemap.
- Icons are not bundled yet: the build environment had no network access (run `npm run fetch-icons`).
- Public benchmarks cover text, image and video only. The coding leaderboard page showed no table when retrieved, so no coding benchmark is included.
- No browser-based accessibility audit (axe/Lighthouse) is included yet.
- Legal pages are drafts and need review for the operator's jurisdiction.
- Link checking requires network access and may report false positives.

## Contributing, license, trademarks
See [CONTRIBUTING.md](CONTRIBUTING.md). Code: [MIT](LICENSE). Product names and logos belong to their owners; listing is not an endorsement.

Suggested GitHub topics: `ai-tools`, `ai-directory`, `llm`, `generative-ai`, `bilingual`, `open-data`.
