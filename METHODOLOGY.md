# Methodology / Méthodologie

**Status:** no tool has been scored. This is a proposed method, not a claim that any product was tested.

## Rubric (100 points)
| Criterion | Max |
|---|---|
| Output quality | 30 |
| Category-specific capability | 25 |
| Usability and accessibility | 15 |
| Free access and availability | 15 |
| Value for money | 15 |

## Gates enforced by `npm run validate` and the site
An evaluation is shown only if it has: `reviewStatus: "reviewed"`, a `basis`, `protocolVersion`, `evaluationDate` (YYYY-MM-DD), `evaluator`, a different `reviewer`, at least one https evidence URL, `limitations`, valid criteria within their maximum, and a `score` equal to the sum. Product version and test conditions should be recorded when known.

## Verification of catalogue entries
An entry is `verified` when its official page was opened, returned HTTP 200 and names the product. The record keeps `lastVerified`, `evidenceUrl` (final URL after redirects), `method` and `providerConfirmedOnPage`. This is not an evaluation. Pricing, access model, API availability, platforms and licences remain empty unless an official page states them. `freeOfferMentioned` only records that the official page mentions a free plan, trial or credits; terms are not verified.

## Public benchmarks
`data/benchmarks.json` stores boards published by third parties (currently Arena, formerly LMArena), with source URL, final URL, the board's own update date, our retrieval date and the scope. They rank **models, not apps**, are shown apart from our evaluations, never summed with them, and are linked to a product only when the model comes from that product's provider. Rows that were not legible in the retrieved copy are omitted and the omission is stated.

## Rankings
Per category. One basis per ranking: the site ranks **independent testing** only. Editorial assessment and community feedback are never blended with it. Ties share a rank. Unscored tools appear as "Not yet evaluated".

## Evaluation record (data/evaluations.json)
`id, toolId, categoryId, basis (independent_testing|editorial|community), reviewStatus, protocolVersion, evaluationDate, evaluator, reviewer, toolVersion, conditions, evidenceUrls[], criteria{outputQuality, categoryCapability, usability, freeAccess, value}, score, limitations, confidence`.

## FR
Aucun outil n'est noté. Un score n'est affiché que si l'évaluation respecte les conditions ci-dessus : protocole versionné, preuves https, évaluateur différent du relecteur, critères dans leurs bornes et total exact. Un classement par catégorie, sur tests indépendants uniquement ; les autres sources ne sont jamais mélangées.
