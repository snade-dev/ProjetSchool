# USER STORIES — verticales (1 story = 1 PR), ordonnées par dépendance

Règles d'exécution (pour Opus) :
- Une story = une branche `story/NN-slug` = une PR. On n'entame pas une story tant que ses dépendances ne sont pas mergées.
- Chaque story livre un incrément UTILISABLE (schéma + action + écran + accès + menu), jamais « juste le schéma ».
- Les critères d'acceptation SONT les tests : vérifier chacun manuellement (`pnpm dev`) + `pnpm build` sans erreur avant de conclure.
- Détail d'exécution de chaque story : `plans/story-NN.md`.

## Graphe de dépendances

```
S01 ─┬─ S03 ─┬─ S04 ─ S05 ─┬─ S06 ─ S08
     │       │             └─ S07 ─ S16 ─ S17 ─ S18
     │       ├─ S09 ────────────────┘
     │       └─ S10 ─ S11 ──────────┘
S02 (transverse, juste après S01)
S12 ─ S13 ─ S14 ─ S15 ─(alimentent S17)
```

| # | Titre | Écrans | Dépend de |
|---|---|---|---|
| S01 | Année scolaire & paramètres établissement | E40 | — |
| S02 | Garde d'accès `requireRole` + sécurisation des server actions | transverse | S01 |
| S03 | Schéma Prisma Finance/RH + migration + seed | — | S01 |
| S04 | Grille des frais de scolarité | E29 | S03 |
| S05 | Factures : liste, détail, création manuelle | E30, E32 | S04 |
| S06 | Génération automatique des factures mensuelles | E31 | S05 |
| S07 | Encaissement : paiements, reçus PDF, migration TuitionPayment | E32 | S05 |
| S08 | Impayés & recouvrement | E33 | S06, S07 |
| S09 | Dépenses & catégories | E34 | S03 |
| S10 | Employés (enseignants + staff) | E35 | S03 |
| S11 | Paie mensuelle & bulletins de paie PDF | E36 | S10 |
| S12 | Saisie de notes en masse + durcissement examens | E17, E16 | S02 |
| S13 | Bulletin scolaire complet (rang, moyenne de classe, appréciations) | E20 | S12 |
| S14 | Statistiques élèves | E37 | S13 |
| S15 | Statistiques enseignants | E38 | S12 |
| S16 | Statistiques financières | E39 | S07, S09, S11 |
| S17 | Dashboard admin refondu (KPIs réels) | E04 | S16 |
| S18 | Exports CSV & finitions de clôture | E30, E39 | S16 |

---

## S01 — Année scolaire & paramètres établissement
**En tant qu'**admin, **je veux** définir mon établissement et mes années scolaires **afin que** factures, paie et stats soient rattachées à la bonne période.
Critères d'acceptation (= tests) :
1. `/settings` (admin uniquement ; teacher redirigé vers `/teacher` par le proxy).
2. Je peux éditer nom/adresse/téléphone/email/logo/pied de page ; rechargement → valeurs persistées.
3. Je peux créer « 2025-2026 » (dates début/fin) ; l'activer désactive toute autre année (vérifié en base : un seul `isActive=true`).
4. Supprimer une année sans données liées : OK ; helper `getActiveSchoolYear()` disponible et utilisé par le seed.
5. `pnpm build` passe.

## S02 — Garde d'accès `requireRole` + sécurisation des actions
**En tant que** propriétaire du produit, **je veux** que chaque server action vérifie le rôle côté serveur **afin qu'**aucune mutation ne soit possible en forgeant une requête.
Critères :
1. `src/lib/authGuard.ts` exporte `requireRole(roles: string[])` → retourne `{userId, role}` ou throw ; et `getSessionInfo()`.
2. Toutes les actions existantes de `src/lib/actions.ts` et `src/lib/actions/*.ts` commencent par `requireRole([...])` selon la matrice de `architecture.md §5` (les commentaires Clerk morts sont supprimés).
3. Chaque action de mutation appelle `revalidatePath` de la liste concernée (les listes se rafraîchissent sans F5).
4. Test négatif : action appelée avec une session student sur une ressource admin → `{success:false,error:true}`, rien en base.
5. `pnpm build` passe.

## S03 — Schéma Prisma Finance/RH + migration + seed
**En tant que** développeur, **je veux** les tables Finance/RH migrées et seedées **afin que** les stories S04–S11 aient leurs fondations.
Critères :
1. Modèles ajoutés EXACTEMENT comme `architecture.md §2.2` ; `prisma migrate dev` passe sans perte de données existantes.
2. `pnpm prisma generate` OK ; le client sort bien dans `src/app/generated/prisma`.
3. Seed étendu : 1 SchoolYear active, SchoolSettings, 4 ExpenseCategory, FeeStructure pour chaque classe seedée, 3 Employees (dont 2 liés à des Teachers), 0 factures (générées via S06).
4. `pnpm prisma db seed` idempotent (upsert) — relançable sans erreur d'unicité.
5. Aucun changement d'UI ; `pnpm build` passe.

## S04 — Grille des frais
**En tant qu'**admin, **je veux** définir les frais par classe et par année **afin de** facturer automatiquement.
Critères :
1. `/list/fees` (admin only) liste les FeeStructure groupées par classe pour l'année active ; total mensuel affiché par classe.
2. Créer « Scolarité mensuelle / MONTHLY / 25 000 FCFA / 6e A » via modal → apparaît sans reload ; doublon (même classe+année+label) → erreur toast, pas de crash.
3. Modifier / supprimer fonctionnent ; « Dupliquer vers une autre classe » copie tous les frais (labels déjà présents ignorés).
4. Montant ≤ 0 rejeté par zod avant l'action.
5. Menu admin affiche la section FINANCE ; `pnpm build` passe.

## S05 — Factures : liste, détail, création manuelle
**En tant qu'**admin, **je veux** créer et consulter des factures détaillées **afin de** tracer ce que chaque élève doit.
Critères :
1. `/list/invoices` (admin) : tableau paginé + recherche par nom d'élève + filtre statut ; stat-tiles Toutes/Payées/Partielles/En retard.
2. Création manuelle : choisir élève, échéance, lignes (label/qté/PU) → facture `ISSUED`, référence unique `FAC-{année}-{n°:5 chiffres}` ; `total` en base = somme des lignes.
3. `/list/invoices/[id]` affiche en-tête établissement, lignes, total, solde ; ajout/suppression de ligne recalcule `total`.
4. Annulation possible seulement si 0 paiement (bouton désactivé sinon) → statut `CANCELLED`.
5. Student/parent voient UNIQUEMENT leurs factures (test : URL directe d'une facture d'un autre élève → notFound()).
6. `pnpm build` passe.

## S06 — Génération automatique des factures mensuelles
**En tant qu'**admin, **je veux** générer en un clic les factures du mois pour tous les élèves **afin de** ne pas les saisir une à une.
Critères :
1. Modal « Générer les factures du mois » : mois/année + aperçu (nb élèves ayant une grille MONTHLY, nb déjà facturés).
2. Exécution : une facture par élève dont la classe a ≥1 FeeStructure MONTHLY (une ligne par frais), `generationKey` posée, échéance = 5 du mois.
3. Relancer la même génération → 0 doublon (contrainte unique + skipDuplicates), message « X créées, Y ignorées ».
4. 100+ élèves : la génération tient en une transaction/batch < 30 s, pas de N+1 par élève.
5. `pnpm build` passe.

## S07 — Encaissement : paiements, reçus PDF, migration TuitionPayment
**En tant qu'**admin (caissier), **je veux** encaisser des paiements partiels ou totaux avec reçu **afin de** suivre le recouvrement réel.
Critères :
1. Sur E32 : « Encaisser » (montant prérempli = solde, méthode, référence, date) → paiement listé, solde décrémenté.
2. Statut recalculé serveur : partiel → `PARTIALLY_PAID`, soldé → `PAID` ; sur-paiement rejeté (`somme > total` impossible, testé).
3. Reçu PDF par paiement (n° reçu, établissement, élève, facture, montant en chiffres, méthode) ; facture PDF complète aussi.
4. Script one-shot `scripts/migrate-tuition.ts` : chaque TuitionPayment → Invoice PAID (1 ligne « Scolarité {mois}/{année} ») + Payment lié ; relançable sans doublon ; `/list/tuitionPayment` redirige vers `/list/invoices`.
5. Student/parent voient leurs paiements et téléchargent leurs reçus, mais n'ont PAS le bouton Encaisser.
6. `pnpm build` passe.

## S08 — Impayés & recouvrement
**En tant qu'**admin, **je veux** voir qui est en retard et de combien **afin de** relancer les parents.
Critères :
1. Action `syncOverdueInvoices()` : toute facture ISSUED/PARTIALLY_PAID avec dueDate < aujourd'hui → OVERDUE ; déclenchée au chargement de `/list/invoices` (admin).
2. Filtre/stat-tile « En retard » : liste avec jours de retard, solde restant, téléphone du parent.
3. Total des impayés (Σ soldes OVERDUE) affiché et exact (vérifié sur un jeu de données connu).
4. Un paiement soldant une facture OVERDUE la passe bien à PAID.
5. `pnpm build` passe.

## S09 — Dépenses & catégories
**En tant qu'**admin, **je veux** enregistrer chaque dépense avec justificatif **afin de** connaître mes charges réelles.
Critères :
1. `/list/expenses` (admin only) : tableau paginé, filtres mois + catégorie, total de la période affiché et exact.
2. CRUD dépense complet via modal ; upload justificatif Cloudinary (comme la photo dans TeacherForms) ; miniature cliquable dans la liste.
3. CRUD catégories (suppression bloquée si dépenses liées → message clair).
4. Montant ≤ 0 rejeté ; dépense rattachée à l'année scolaire active automatiquement.
5. `pnpm build` passe.

## S10 — Employés
**En tant qu'**admin, **je veux** un registre des employés (enseignants et staff) avec salaire de base **afin de** préparer la paie.
Critères :
1. `/list/employees` (admin only) : liste paginée, badge « Enseignant » (lien fiche teacher) ou « Staff », statut actif/inactif.
2. Création avec « lier à un enseignant » : select limité aux Teachers SANS Employee ; nom/prénom/email préremplis ; un teacher ne peut avoir 2 Employee (contrainte unique testée).
3. Création staff libre (poste, embauche, salaire base > 0).
4. Désactiver (active=false) plutôt que supprimer si des SalaryPayment existent (suppression bloquée avec message).
5. `pnpm build` passe.

## S11 — Paie mensuelle & bulletins de paie
**En tant qu'**admin, **je veux** générer la paie du mois, l'ajuster et marquer les salaires payés **afin de** suivre la masse salariale.
Critères :
1. `/list/payroll?month=&year=` : « Générer la paie » crée un SalaryPayment PENDING par employé actif (base = baseSalary copié) ; relance → 0 doublon.
2. Primes/retenues éditables tant que PENDING ; `net = base + primes − retenues` recalculé serveur, jamais négatif (rejet testé).
3. « Marquer payé » (méthode, date) → PAID, ligne verrouillée ; totaux (masse salariale, payé, restant) exacts.
4. Bulletin de paie PDF (établissement, employé, mois, base/primes/retenues/net) disponible si PAID.
5. `pnpm build` passe.

## S12 — Saisie de notes en masse + durcissement examens
**En tant qu'**enseignant, **je veux** saisir toutes les notes d'une classe sur un seul écran **afin de** gagner du temps.
Critères :
1. `/list/gradeEntry` (admin, teacher) : selects classe/matière/semestre → tableau de TOUS les élèves de la classe, notes existantes préremplies.
2. Teacher : ses classes/matières uniquement (via ses Lessons) ; admin : tout.
3. « Enregistrer tout » : une seule action, transaction d'upserts sur `@@unique(semesterId, studentId, subjectId)` ; toast succès ; rechargement → valeurs persistées.
4. Notes hors [0;20] rejetées cellule par cellule (bordure rouge), l'enregistrement n'écrit rien de partiel.
5. ExamForm : un teacher ne peut créer un Exam que sur SES lessons (test négatif serveur).
6. `pnpm build` passe.

## S13 — Bulletin scolaire complet
**En tant que** parent, **je veux** un bulletin PDF avec rang et moyenne de classe **afin de** situer mon enfant.
Critères :
1. Depuis fiche élève / résultats : bulletin PDF du semestre choisi conforme au brief E20 (rang par matière, moyenne de classe par matière, moyenne générale, rang général /effectif, mention, appréciations auto).
2. Rangs corrects sur un jeu de test contrôlé (3 élèves, notes connues → rangs 1/2/3), ex æquo partagent le rang.
3. Élève sans note dans une matière : ligne « — », pas de division par zéro.
4. La génération recalcule/upserte ResultAverage pour la classe (cohérent avec `/list/average`).
5. Student/parent ne peuvent générer que LEUR bulletin (test URL forgée).
6. `pnpm build` passe.

## S14 — Statistiques élèves
**En tant qu'**admin/enseignant, **je veux** visualiser la performance des élèves par classe **afin d'**identifier qui aider.
Critères :
1. `/stats/students?classId=&semesterId=` : stat-tiles (moyenne classe, taux réussite ≥10, taux présence, effectif) exacts sur données de seed.
2. LineChart évolution par semestre, BarChart moyenne par matière, Top5/Flop5 cliquables vers la fiche élève.
3. Teacher : ne voit que les classes où il a une Lesson (select restreint + garde serveur).
4. Classe sans notes : état vide propre, pas de NaN.
5. Toutes les agrégations en Prisma `groupBy/aggregate` (pas de calcul en boucle JS sur toutes les lignes) ; `pnpm build` passe.

## S15 — Statistiques enseignants
**En tant qu'**admin, **je veux** comparer les résultats obtenus par chaque enseignant **afin d'**évaluer et accompagner l'équipe.
Critères :
1. `/stats/teachers?semesterId=` (admin only) : tableau par enseignant — matières, classes, nb élèves notés, moyenne des Result de ses (matière, classe) via ses Lessons, taux de réussite, leçons/semaine.
2. BarChart comparatif des moyennes ; tri par colonne (moyenne, taux) via searchParams.
3. Enseignant sans note : « — », exclu du chart, pas de division par zéro.
4. Chiffres recoupés à la main sur le seed (au moins 1 enseignant vérifié ligne à ligne).
5. `pnpm build` passe.

## S16 — Statistiques financières
**En tant que** directeur, **je veux** CA, dépenses, salaires et résultat mois par mois **afin de** piloter l'établissement.
Critères :
1. `/stats/finance?schoolYearId=` (admin only) : tiles CA encaissé, facturé, taux de recouvrement, dépenses, masse salariale, résultat — exacts sur un scénario de test documenté dans la PR.
2. ComposedChart mensuel Sept→Juin : encaissé, dépenses+salaires, ligne résultat ; mois sans données = 0 (pas de trous).
3. PieChart dépenses par catégorie ; tableau impayés par classe trié décroissant.
4. CA = Σ `Payment.paidAt` dans le mois (PAS Σ factures) ; recouvrement = encaissé/facturé de l'année.
5. `pnpm build` passe.

## S17 — Dashboard admin refondu
**En tant qu'**admin, **je veux** un accueil avec les vrais chiffres **afin de** voir l'état de l'école en un coup d'œil.
Critères :
1. `/admin` : UserCards branchées sur `prisma.count` (plus aucune donnée de `lib/data.ts` sur cette page).
2. Bandeau finance : CA du mois, dépenses du mois, impayés cumulés (cliquables vers `/stats/finance` et `/list/invoices?status=OVERDUE`).
3. `FinanceChart` alimenté par les données réelles de S16 (composant Container RSC), plus de tableau statique.
4. Présence du jour (Attendance d'aujourd'hui) affichée ; page < 1 s en dev sur le seed (requêtes en `Promise.all`).
5. `pnpm build` passe.

## S18 — Exports CSV & finitions
**En tant qu'**admin, **je veux** exporter factures/impayés/dépenses/paie en CSV **afin de** partager avec le comptable.
Critères :
1. Route handlers `src/app/api/export/{invoices,expenses,payroll}/route.ts` (GET, garde admin, respectent les filtres searchParams).
2. CSV : séparateur `;`, UTF-8 BOM (Excel FR), en-têtes français, montants numériques bruts.
3. Boutons « Exporter CSV » sur E30, E34, E36, E39.
4. Export de 1 000 lignes < 5 s ; accès non-admin → 403.
5. `pnpm build` passe.
