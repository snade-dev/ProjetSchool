# V3 — SaaS multi-établissements, abonnements & régimes d'évaluation

Décisions validées par le user (12 juil. 2026, AskUserQuestion) :
- **Abonnement = les écoles paient** pour utiliser la plateforme (SaaS multi-tenant),
  avec un **super-admin plateforme** qui gère écoles et abonnements.
- **Régime d'évaluation choisi PAR CLASSE** : « Trimestres » (3 périodes/an) ou
  « Compositions mensuelles » (une période par mois). Notes, moyennes, rangs et
  bulletins suivent le régime de la classe.
- **Encaissement manuel** des abonnements (espèces, Orange Money, virement…) :
  le super-admin enregistre les paiements ; pas d'intégration bancaire pour l'instant.

Règles d'exécution (identiques au build v2) :
- Une story = une branche `v3/NN-slug`. On n'entame pas une story tant que ses
  dépendances ne sont pas mergées. Tout échec est corrigé avant la story suivante.
- Chaque story livre un incrément UTILISABLE (schéma + action + écran + accès + menu).
- Critères d'acceptation = tests manuels (`pnpm dev`) + `pnpm build` sans erreur.
- Base dev : Docker `school-db` localhost:5433. Prod : Neon (port 5432 bloqué depuis
  le réseau local → toute opération DB prod passe par l'API HTTPS de Neon, cf. mémoire).

## Architecture cible

### 1. Régimes d'évaluation (indépendant du multi-tenant)

```prisma
enum EvaluationSystem { TRIMESTER  MONTHLY }   // trimestre / composition mensuelle

model Semester {            // devient « période d'évaluation » (nom de table conservé :
  ...                       // 41 fichiers y réfèrent — on étend, on ne renomme pas)
  system  EvaluationSystem @default(TRIMESTER)
  order   Int              @default(1)     // 1..3 (trimestres) ou 1..10 (compositions)
  label   String?                          // « 1er trimestre », « Composition de novembre »
}

model Class {
  ...
  evaluationSystem EvaluationSystem @default(TRIMESTER)
}
```

- Les périodes existantes (`semestre1..3`) sont marquées TRIMESTER order 1..3 à la migration.
- Partout où l'on choisit une période pour UNE classe (saisie de notes, bulletins,
  résultats, examens, stats élèves), le sélecteur ne propose que les périodes du
  régime de la classe. Les écrans transverses (stats globales) gardent toutes les périodes.
- Écran admin « Périodes » : génération en un clic des périodes d'une année
  (3 trimestres ou N compositions nommées par mois).
- Bulletins : libellé dynamique selon le régime (« Bulletin du 1er trimestre » /
  « Bulletin de composition — novembre »).

### 2. Multi-tenant (socle)

```prisma
model School {              // extension de SchoolSettings (perd son statut de singleton)
  id Int @id @default(autoincrement())
  name, logo, address, phone, email, couleurs thème (existants)
  slug      String  @unique          // identifiant lisible
  active    Boolean @default(true)   // coupure super-admin
  createdAt DateTime @default(now())
  subscription SchoolSubscription?
}
```

- `user.schoolId Int?` (null = superadmin). `schoolId` ajouté aux entités RACINES :
  Class, Subject, Teacher, Student, Parent, SchoolYear, Semester, Announcement,
  Event, Employee, ExpenseCategory, FeeStructure, Quiz. Les entités filles
  (Result, Lesson, Invoice, Attendance…) restent scopées via leurs relations.
- Migration : toutes les données existantes rattachées à l'école #1 (backfill).
- Garde : `getSessionInfo()` retourne aussi `schoolId` ; helper `requireSchool()`
  utilisé par toutes les listes/actions ; un utilisateur ne voit QUE son école.
- Le singleton `schoolSettings.findUnique({id:1})` (11 fichiers) devient
  « l'école de la session ».

### 3. Abonnements

```prisma
model SubscriptionPlan {
  id, name, priceMonthly Int /* FCFA */, maxStudents Int?, active Boolean
}
enum SubscriptionStatus { TRIAL  ACTIVE  PAST_DUE  SUSPENDED }
model SchoolSubscription {
  id, schoolId @unique, planId, status SubscriptionStatus,
  trialEndsAt DateTime?, paidUntil DateTime?, createdAt
}
model SubscriptionPayment {
  id, subscriptionId, amount Int, months Int, method String,
  reference String?, paidAt DateTime, note String?
}
```

- Enregistrement d'un paiement → `paidUntil += months`, statut recalculé.
- Statuts dérivés : paidUntil dépassé → PAST_DUE (grâce 15 j) puis SUSPENDED.
- Enforcement dans `proxy.ts` : école inactive ou SUSPENDED → page « Établissement
  suspendu » (l'admin d'école voit les instructions de paiement) ; PAST_DUE →
  bandeau d'alerte sur le dashboard ; superadmin jamais bloqué.

### 4. Espace plateforme (`/platform`, rôle `superadmin`)

- Écoles : liste + création (école + son premier compte admin), activation/coupure.
- Plans : CRUD. Abonnements : attribution d'un plan, enregistrement des paiements
  manuels, historique.
- KPIs : écoles actives/en essai/suspendues, MRR (somme des plans actifs),
  échéances à venir, derniers paiements.
- `routeAccessMap` : `/platform(.*)` → superadmin uniquement. Le superadmin est
  créé par seed/script (pas d'inscription publique).

## Stories

```
V01 (indépendante)
V02 ─ V03 ─┬─ V04 ─ V05 ─┬─ V06
           │             ├─ V07
           │             └─ V08
```

| # | Titre | Dépend de |
|---|---|---|
| V01 | Régimes d'évaluation par classe : schéma, migration, sélecteurs filtrés, écran Périodes, bulletins dynamiques | — |
| V02 | Modèle School (ex-SchoolSettings) + `schoolId` sur les entités racines + backfill école #1 | — |
| V03 | Scoping systématique : `requireSchool()` dans toutes les listes, stats et server actions ; fin du singleton id=1 | V02 |
| V04 | Rôle `superadmin` + espace `/platform` : CRUD écoles, création de l'admin d'école, activation/coupure | V03 |
| V05 | Plans & abonnements : modèles, CRUD plans, souscription, paiements manuels, recalcul des statuts | V04 |
| V06 | Enforcement : proxy (suspendu → page dédiée), bandeau PAST_DUE, page instructions de paiement | V05 |
| V07 | Inscription self-service d'une école (essai gratuit 30 j : formulaire → école + admin + TRIAL) + landing plateforme adaptée | V05 |
| V08 | KPIs plateforme : MRR, répartition des statuts, échéances, derniers encaissements | V05 |

## Points de vigilance

- **V03 est la story risquée** : passer en revue TOUTES les requêtes Prisma des listes,
  stats et actions (grep systématique par modèle) ; oublier un scope = fuite de données
  entre écoles. Ajouter la matrice de vérification en critère d'acceptation.
- Landing actuelle : lit SchoolSettings id=1 → en V07 elle devient la vitrine de la
  PLATEFORME (les écoles n'ont plus de landing individuelle pour l'instant).
- Le seed et les scripts (`prisma/seed.ts`, scripts/migrate-tuition.ts) doivent être
  mis à jour avec `schoolId`.
- better-auth : ajouter `schoolId` au user via `additionalFields` (comme `role`).
- Prod Neon : chaque migration se déploie via l'API HTTPS (pas de `migrate deploy`
  direct depuis ce réseau) — rejouer le SQL de migration + insérer la ligne
  `_prisma_migrations` correspondante.
