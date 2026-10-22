# AI RANKING

[English](README.md)

Un annuaire bilingue (EN/FR) d'outils d'IA avec liens officiels et classements publics de modèles, en interface rapide à ombres et dégradés, avec thèmes clair et sombre. Par LUST DEV. **Un score n'est affiché qu'après un test documenté relu par un second mainteneur.** D'ici là, l'outil est marqué « Pas encore évalué ».

> **État : v0.4.** 35 outils dans 13 catégories. **35 pages officielles contrôlées** (définition ci-dessous), **0 outil évalué** par nos propres tests, et **5 classements publics** d'Arena (anciennement LMArena) : texte, développement web (code), recherche, image et vidéo. Le catalogue ne prétend pas lister tous les outils d'IA. Site en ligne : pas encore déployé.

**« Vérifiée » signifie :** le 2026-10-18, la page officielle de l'entrée a été ouverte (via Firecrawl, éventuellement une copie en cache de quelques jours), a répondu normalement et nomme le produit. Cela ne veut **pas** dire testé, et tarifs, modèle d'accès, API et licences restent vides sauf si la page les indique. La vérification a révélé des changements réels, signalés en notes sur les fiches (par exemple Le Chat devient « Vibe by Mistral », NotebookLM devient « Gemini Notebook », Continue indique avoir été acquis par Cursor).

## Fonctionnalités
- Annuaire : recherche (insensible aux accents), filtres catégorie et accès, tri, pagination
- Pages de catégorie avec classements issus uniquement d'évaluations relues
- Fiches : liens officiels, source de découverte, statut de vérification, limites, historique
- Comparaison de jusqu'à quatre outils
- Thèmes clair et sombre (suit le système, mémorisé, interrupteur dans l'en-tête). Ombres en couches et dégradés radiaux, sans flou, sans animation, sans zoom au survol
- URL propres (`/tool/claude`, `/rankings/coding`), chacune pré-générée au build avec son titre, sa description et son titre de page ; navigation sans rechargement (22 Ko de JS et CSS compressés)
- Interface FR/EN, fil d'Ariane, titres et descriptions par page, navigation clavier, focus visible, respect de « réduire les animations »
- Méthodologie, sources, confidentialité, conditions et cookies (pages légales en brouillon)
- Aucune mesure d'audience, aucun cookie, aucune requête tierce

## Technique
Sans dépendances : HTML/CSS statiques et modules ES, données JSON, Node.js >= 20 pour les scripts et tests (`node:test`). Aucun `npm install` nécessaire.

## Lancer en local
```bash
npm run validate   # schéma, doublons, sources, règles de relecture
npm test           # tests unitaires, données, localisation, accessibilité, build
npm run build      # écrit dist/ (SITE_URL=https://... pour générer sitemap.xml)
npm start          # build puis aperçu sur http://127.0.0.1:4173
npm run check-links  # nécessite le réseau ; écrit link-report.json
```

## Modèle de données
Voir la version anglaise. Les valeurs inconnues restent `null`/`"unknown"`. Les scores ne sont jamais stockés sur l'outil : ils sont dans `data/evaluations.json` et doivent respecter [METHODOLOGY.md](METHODOLOGY.md).

## Automatisation
Intégration continue (validation, tests, build), contrôle hebdomadaire des liens (rapport et issue, sans modification des données) et rapport mensuel des entrées anciennes. Les nouveaux outils passent par des pull requests relues.

## Icônes
Chaque outil enregistre `icon.sourceUrl`, le favicon déclaré par son site officiel. Lancez `npm run fetch-icons` avec un accès réseau : il télécharge les types d'image autorisés (moins de 300 Ko, sans contenu actif), les range dans `site/icons/` et renseigne `icon.file`. Relisez les images puis commitez-les. D'ici là, le site affiche des initiales, et y revient aussi si une image ne charge pas. Les icônes sont des marques de leurs propriétaires, affichées uniquement pour identifier le produit.

## Avant la mise en ligne
1. Créer le projet Vercel depuis le dépôt, puis renseigner `SITE_URL` et `siteUrl` (`site/config.js`) seulement après confirmation du premier déploiement.
2. Renseigner `contactEmail` avec une adresse surveillée.
3. Faire relire confidentialité et conditions. Questions ouvertes : entité juridique, juridiction, hébergeur et durée de conservation, droit applicable, limites de responsabilité.
4. Lancer `npm run fetch-icons` et `npm run check-links`, relire, commiter les icônes.
5. Option : domaine personnalisé. Rendre le dépôt public et activer la protection de branche.

## Limites connues
Icônes non incluses (pas de réseau dans l'environnement de build) ; métadonnées pré-générées en anglais seulement ; benchmarks d'une seule source (Arena), rien pour l'audio ou la 3D.
Routes à base de hash (seule l'accueil figure au sitemap) ; pas encore d'audit d'accessibilité automatisé dans un navigateur ; pages légales en brouillon ; le contrôle des liens peut produire des faux positifs.

## Contribuer, licence, marques
Voir [CONTRIBUTING.md](CONTRIBUTING.md). Code : [MIT](LICENSE). Les noms de produits et logos appartiennent à leurs propriétaires ; être listé ne vaut pas recommandation.
