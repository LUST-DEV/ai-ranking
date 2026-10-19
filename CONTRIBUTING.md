# Contributing

1. Fork, create a branch, change `data/*.json` or the code.
2. Every data claim needs an official source. Leave unknown fields `null`; never guess prices, licences, API access or benchmarks.
3. To mark an entry `verified`, set `lastVerified` (YYYY-MM-DD) and an https `evidenceUrl`.
4. Never add a score to a tool. Add a reviewed record in `data/evaluations.json` (see METHODOLOGY.md); the reviewer must not be the evaluator.
5. Run `npm run validate && npm test`, then open a pull request using the template.
6. Do not commit secrets, tokens or personal data. Report security problems privately (SECURITY.md).

Contributions are licensed under the MIT license. Please follow the Code of Conduct.

## FR
Chaque donnée doit citer une source officielle ; laissez `null` ce qui est inconnu ; ne mettez jamais de score sur un outil (utilisez `evaluations.json`, relu par une autre personne) ; lancez `npm run validate && npm test` avant la pull request.
