# Plan de build — index (pour l'exécutant)

Ordre de lecture obligatoire avant la première story :
1. `architecture.md` — stack, modèle de données, routes, conventions, invariants. Source de vérité.
2. `ecrans.md` — les écrans (E01–E40), rôles, données, actions.
3. `design-briefs.md` — le prompt design de chaque écran (préambule commun + brief).
4. `stories.md` — les 18 stories, graphe de dépendances, critères d'acceptation = tests.
5. `story-NN.md` — la fiche d'exécution de la story en cours (étapes, fichiers, parades, done, stop).
6. `ledger.md` — hypothèses H01–H18. Tu ne poses JAMAIS de question : tu appliques l'hypothèse, ou tu en ajoutes une et tu continues.

Règles non négociables :
- 1 story = 1 branche `story/NN-slug` = 1 PR. Respecter le graphe de dépendances.
- Suivre les conventions du boilerplate décrites dans `architecture.md §4` (pages liste, forms, actions, PDF, charts, menu).
- Chaque PR : critères d'acceptation vérifiés un à un + `pnpm build` vert + captures.
- Interdit de livrer un squelette : chaque story est utilisable de bout en bout (schéma + action sécurisée + écran + accès + menu).
