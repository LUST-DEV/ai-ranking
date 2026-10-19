# Security policy

## Reporting
Report vulnerabilities **privately** with GitHub's "Report a vulnerability" (Security tab → Advisories). Do not open a public issue. Include steps to reproduce and the impact. Expect an acknowledgement on a best-effort basis; no response time is guaranteed.

## Architecture and controls
This is a static site: no accounts, database, uploads, forms, webhooks or server API, so those controls do not apply.
- Strict CSP (`default-src 'none'`, scripts and styles from `self` only), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS in `vercel.json`.
- Data is rendered as text (no `innerHTML`); only https URLs become links; external links use `rel="noopener noreferrer"`. Tests enforce these rules.
- No runtime dependencies. `.env` files are git-ignored; no secrets are used.
- GitHub Actions use read-only permissions (the link check also has `issues: write`), timeouts and concurrency groups.

## Not yet done
Action SHA pinning, Dependabot for Actions, automated header verification on the live site, branch protection and required reviews (to be enabled in repository settings).
