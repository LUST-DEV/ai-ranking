// Long-form pages. Each page: { title, sections: [{ h, p: [paragraphs] }] }.
// Legal pages are DRAFTS: they describe only what this static site actually does.
const methodologyEn = {
  title: "Methodology and scoring",
  sections: [
    { h: "Status", p: ["No tool has been scored yet. The rubric below is a proposed method, not a claim that any product has been tested."] },
    { h: "Rubric (100 points)", p: ["Output quality: 30. Category-specific capability: 25. Usability and accessibility: 15. Free access and availability: 15. Value for money: 15."] },
    { h: "Review gates", p: ["A score is published only if it has a documented test protocol and version, reproducible tasks, evidence links, the product version when known, an evaluation date, stated limitations, and a review by a second maintainer who is not the evaluator.", "The site rejects any evaluation that does not meet these gates. Unscored tools are shown as “Not yet evaluated”."] },
    { h: "Separate rankings", p: ["Rankings are per category. Independent testing, editorial assessment and community feedback are never blended: the ranking shown uses independent testing only."] },
    { h: "Public benchmarks", p: ["Some category pages also show a public benchmark from a third-party leaderboard, with its source link, the date the board was updated and the date we retrieved it. These boards rank models, not apps, and they are displayed apart from our own evaluations. They are not our scores and are never added to them."] },
  ],
};
const methodologyFr = {
  title: "Méthodologie et notation",
  sections: [
    { h: "État actuel", p: ["Aucun outil n'a encore été noté. La grille ci-dessous est une méthode proposée, pas l'affirmation qu'un produit a été testé."] },
    { h: "Grille (100 points)", p: ["Qualité du résultat : 30. Capacité propre à la catégorie : 25. Facilité d'usage et accessibilité : 15. Accès gratuit et disponibilité : 15. Rapport qualité-prix : 15."] },
    { h: "Étapes de validation", p: ["Un score n'est publié que s'il repose sur un protocole de test documenté et versionné, des tâches reproductibles, des liens de preuve, la version du produit si connue, une date d'évaluation, des limites explicites et la relecture d'un second mainteneur différent de l'évaluateur.", "Le site rejette toute évaluation qui ne respecte pas ces conditions. Les outils sans score sont affichés « Pas encore évalué »."] },
    { h: "Classements séparés", p: ["Les classements sont propres à chaque catégorie. Tests indépendants, évaluation éditoriale et avis de la communauté ne sont jamais mélangés : le classement affiché repose uniquement sur des tests indépendants."] },
    { h: "Benchmarks publics", p: ["Certaines pages de catégorie affichent aussi un benchmark public issu d'un classement tiers, avec le lien source, la date de mise à jour du classement et la date de notre consultation. Ces classements évaluent des modèles, pas des applications, et sont affichés à part de nos évaluations. Ce ne sont pas nos scores et ils ne s'y ajoutent jamais."] },
  ],
};
const sourcesEn = {
  title: "Research sources and verification",
  sections: [
    { h: "Where entries come from", p: ["The first catalogue is a seed list compiled by the maintainer assistant from general knowledge. On 2026-10-18 each entry's official page was opened and checked."] },
    { h: "How verification works", p: ["An entry is “Verified” when its official page was opened, returned a normal response and names the product. The evidence page, date and method are recorded on each tool page, along with whether the page also names the provider. Verified does not mean tested: a page being reachable does not prove that a product works well or is available in your country. Changes found during checking (renames, redirects, acquisitions) are shown as notes."] },
    { h: "Limits", p: ["This catalogue does not claim to cover every AI tool. Pricing, access model, API availability, platforms and licences stay empty until verified. Official pages were read through a scraping service that may return a copy cached up to a few days old. Benchmark sources: Arena (formerly LMArena). A scheduled link-check reports broken links; it never edits verified data."] },
  ],
};
const sourcesFr = {
  title: "Sources de recherche et vérification",
  sections: [
    { h: "D'où viennent les entrées", p: ["Le premier catalogue est une liste de départ établie par l'assistant du mainteneur à partir de connaissances générales. Le 2026-10-18, la page officielle de chaque entrée a été ouverte et contrôlée."] },
    { h: "Comment fonctionne la vérification", p: ["Une entrée est « Vérifiée » quand sa page officielle a été ouverte, a répondu normalement et nomme le produit. La page de preuve, la date et la méthode figurent sur chaque fiche, avec l'indication que la page nomme aussi le fournisseur. Vérifié ne veut pas dire testé : une page accessible ne prouve pas qu'un produit fonctionne bien ni qu'il est disponible dans votre pays. Les changements constatés (renommages, redirections, rachats) sont affichés sous forme de notes."] },
    { h: "Limites", p: ["Ce catalogue ne prétend pas couvrir tous les outils d'IA. Tarifs, modèle d'accès, API, plateformes et licences restent vides tant qu'ils ne sont pas vérifiés. Les pages officielles ont été lues via un service de collecte qui peut renvoyer une copie en cache de quelques jours. Source des benchmarks : Arena (anciennement LMArena). Un contrôle de liens planifié signale les liens cassés ; il ne modifie jamais les données vérifiées."] },
  ],
};
const aboutEn = {
  title: "About AI RANKING",
  sections: [
    { h: "Mission", p: ["Help people discover, compare and evaluate AI tools with evidence instead of hype."] },
    { h: "Editorial independence", p: ["No sponsorship, affiliate link or paid placement exists today. If one is ever added, it will be disclosed on the tool page and will not affect scores."] },
    { h: "Who runs it", p: ["AI RANKING is published by LUST DEV. No company name, address or registration number is stated because none has been provided."] },
  ],
};
const aboutFr = {
  title: "À propos d'AI RANKING",
  sections: [
    { h: "Mission", p: ["Aider à découvrir, comparer et évaluer les outils d'IA avec des preuves plutôt que du battage."] },
    { h: "Indépendance éditoriale", p: ["Aucun parrainage, lien d'affiliation ou placement payant n'existe aujourd'hui. S'il en est ajouté, il sera signalé sur la fiche de l'outil et n'influencera pas les scores."] },
    { h: "Qui exploite le site", p: ["AI RANKING est publié par LUST DEV. Aucune raison sociale, adresse ou numéro d'immatriculation n'est indiqué car aucun n'a été fourni."] },
  ],
};
const privacyEn = {
  title: "Privacy policy",
  sections: [
    { h: "What this site does", p: ["The site is static. It has no accounts, forms, comments or user uploads, and it uses no analytics, advertising or tracking scripts."] },
    { h: "Data stored in your browser", p: ["Your language choice and your comparison selection are kept in your browser's local storage so the site can remember them. They are never sent to a server and can be erased by clearing site data."] },
    { h: "Data processed by hosting", p: ["Like any website, the hosting provider may process technical data such as IP address and request logs to deliver and secure the site."] },
    { h: "External links", p: ["Links lead to third-party sites that have their own privacy practices. We do not control them."] },
  ],
};
const privacyFr = {
  title: "Politique de confidentialité",
  sections: [
    { h: "Ce que fait ce site", p: ["Le site est statique. Il n'a ni comptes, ni formulaires, ni commentaires, ni envoi de fichiers, et n'utilise ni mesure d'audience, ni publicité, ni script de suivi."] },
    { h: "Données stockées dans votre navigateur", p: ["Votre choix de langue et votre sélection de comparaison sont conservés dans le stockage local de votre navigateur pour que le site s'en souvienne. Ils ne sont jamais envoyés à un serveur et s'effacent en supprimant les données du site."] },
    { h: "Données traitées par l'hébergeur", p: ["Comme tout site, l'hébergeur peut traiter des données techniques (adresse IP, journaux de requêtes) pour servir et sécuriser le site."] },
    { h: "Liens externes", p: ["Les liens mènent à des sites tiers qui ont leurs propres pratiques de confidentialité. Nous ne les contrôlons pas."] },
  ],
};
const termsEn = {
  title: "Terms of use",
  sections: [
    { h: "Information only", p: ["The directory is provided for information. It is not professional advice, and listing a tool is not an endorsement."] },
    { h: "Accuracy", p: ["Entries may be incomplete, outdated or wrong, especially those marked “Pending review”. Check the official site before you pay for a product or share data with it."] },
    { h: "Third parties and trademarks", p: ["Product names, logos and trademarks belong to their owners. This project is not affiliated with the tools it lists."] },
    { h: "Takedown and corrections", p: ["To report an error, a copyright or trademark concern or a removal request, open an issue in the repository or use the contact details on the contact page."] },
  ],
};
const termsFr = {
  title: "Conditions d'utilisation",
  sections: [
    { h: "À titre informatif", p: ["L'annuaire est fourni à titre informatif. Il ne constitue pas un conseil professionnel et lister un outil ne vaut pas recommandation."] },
    { h: "Exactitude", p: ["Les entrées peuvent être incomplètes, périmées ou erronées, surtout celles « En attente de revue ». Vérifiez le site officiel avant de payer un produit ou de lui confier des données."] },
    { h: "Tiers et marques", p: ["Les noms de produits, logos et marques appartiennent à leurs propriétaires. Ce projet n'est affilié à aucun des outils listés."] },
    { h: "Retrait et corrections", p: ["Pour signaler une erreur, une atteinte au droit d'auteur ou aux marques, ou demander un retrait, ouvrez une issue dans le dépôt ou utilisez les coordonnées de la page de contact."] },
  ],
};
const cookiesEn = {
  title: "Cookies",
  sections: [
    { h: "Current behaviour", p: ["This site sets no cookies and loads no analytics or third-party trackers, so there is no consent banner. It uses local storage for two functional items: your language and your comparison selection."] },
    { h: "If this changes", p: ["Any non-essential cookie or tracker will be documented here and added only together with a working consent choice."] },
  ],
};
const cookiesFr = {
  title: "Cookies",
  sections: [
    { h: "Fonctionnement actuel", p: ["Ce site ne dépose aucun cookie et ne charge ni mesure d'audience ni traceur tiers : il n'y a donc pas de bandeau de consentement. Il utilise le stockage local pour deux éléments fonctionnels : votre langue et votre sélection de comparaison."] },
    { h: "En cas d'évolution", p: ["Tout cookie ou traceur non essentiel sera documenté ici et ajouté uniquement avec un choix de consentement fonctionnel."] },
  ],
};
const contactEn = {
  title: "Contact and responsible disclosure",
  sections: [
    { h: "Corrections, takedowns and questions", p: ["Open an issue in the GitHub repository."] },
    { h: "Security issues", p: ["Report vulnerabilities privately through the repository's security advisory feature, not in a public issue. See SECURITY.md for the process."] },
  ],
};
const contactFr = {
  title: "Contact et signalement responsable",
  sections: [
    { h: "Corrections, retraits et questions", p: ["Ouvrez une issue dans le dépôt GitHub."] },
    { h: "Failles de sécurité", p: ["Signalez les vulnérabilités en privé via la fonction d'avis de sécurité du dépôt, pas dans une issue publique. Voir SECURITY.md pour la procédure."] },
  ],
};
const contributeEn = {
  title: "Contribute",
  sections: [
    { h: "Add or fix a tool", p: ["Edit data/tools.json in a pull request. Every claim needs an official source. Leave unknown fields as null. Run npm test before you open the pull request."] },
    { h: "Propose an evaluation", p: ["Add a record to data/evaluations.json with the protocol version, evidence links and your criteria scores. A second maintainer must review it before the score is shown."] },
  ],
};
const contributeFr = {
  title: "Contribuer",
  sections: [
    { h: "Ajouter ou corriger un outil", p: ["Modifiez data/tools.json dans une pull request. Chaque affirmation nécessite une source officielle. Laissez à null les champs inconnus. Lancez npm test avant d'ouvrir la pull request."] },
    { h: "Proposer une évaluation", p: ["Ajoutez une fiche dans data/evaluations.json avec la version du protocole, les liens de preuve et vos notes par critère. Un second mainteneur doit la relire avant que le score soit affiché."] },
  ],
};
export const PAGES = {
  methodology: { en: methodologyEn, fr: methodologyFr },
  sources: { en: sourcesEn, fr: sourcesFr },
  about: { en: aboutEn, fr: aboutFr },
  privacy: { en: privacyEn, fr: privacyFr, legal: true },
  terms: { en: termsEn, fr: termsFr, legal: true },
  cookies: { en: cookiesEn, fr: cookiesFr, legal: true },
  contact: { en: contactEn, fr: contactFr },
  contribute: { en: contributeEn, fr: contributeFr },
};
