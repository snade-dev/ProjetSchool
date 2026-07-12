# Rapport de projet — LS_School

**Plateforme SaaS multi-établissements de gestion scolaire**
Next.js 16 · React 19 · Prisma 6 · PostgreSQL · better-auth · Tailwind CSS
Production : https://projet-school.vercel.app (Vercel + Neon Postgres)

*Dernière mise à jour : 12 juillet 2026*

---

## 1. Vue d'ensemble

LS_School est parti d'un tableau de bord de gestion pour **une** école (notes,
présence, emplois du temps, examens en ligne) et a évolué en trois chantiers
successifs vers une **plateforme SaaS multi-établissements** : chaque école
s'inscrit, dispose de son espace cloisonné à ses couleurs, et paie un
abonnement mensuel en FCFA géré manuellement par l'administrateur de la
plateforme (espèces, Orange Money, virement).

| Rôle | Espace | Capacités principales |
|---|---|---|
| **Super-admin** (plateforme) | `/platform` | Écoles, plans, abonnements, encaissements, KPIs |
| **Admin** (direction d'école) | `/admin` | Comptes, classes, notes, finance, paie, statistiques |
| **Enseignant** | `/teacher` | Ses classes, appel, saisie de notes, quiz |
| **Élève** | `/student` | Notes, bulletins, examens en ligne, annonces |
| **Parent** | `/parent` | Suivi des enfants, progression, conseils, factures |

---

## 2. Historique des chantiers

### v2 — Finance & statistiques (juillet 2026, 18 stories + 3 lots)

- **Finance complète en FCFA** : grille des frais, factures (génération
  mensuelle automatique, PDF), encaissements et reçus, impayés et relances,
  dépenses par catégories, employés et paie (bulletins PDF), exports CSV.
- **Notes durcies** : saisie en masse par classe, bulletins PDF avec moyennes,
  rangs et appréciations, statistiques élèves / enseignants / finance.
- **Couche comptes fiabilisée (S19–S21)** : création/suppression des comptes
  par la direction via l'API serveur better-auth, suppressions fiables
  (mapping + règles `onDelete`), refonte des 21 formulaires en panneau
  latéral « Registre ».
- **Divers** : upload local d'images, thème de couleurs par établissement,
  page Mon compte, déconnexion.

### v2.5 — Landing, dashboards enrichis, déploiement

- **Landing « Produit »** choisie parmi 3 maquettes (héros centré, aperçu du
  tableau de bord, bento grid).
- **Dashboard parent enrichi** : par enfant — moyenne, rang, progression
  entre périodes, comparaison par matière avec la classe, **conseils
  générés par règles** (matières faibles, baisse, assiduité, points forts).
- **Dashboard enseignant enrichi** : cartes « Mes classes » (moyenne,
  réussite, présence, tendance, matières).
- **Déploiement production** : Vercel + base Neon Postgres (copie complète
  de la base locale), correctifs build (`prisma generate`), mise à jour
  Next.js 16.2.10 (alerte de sécurité).

### v3 — SaaS multi-établissements (12 juillet 2026, 8 stories)

Détail en section 3.

---

## 3. Le chantier v3 en détail

### V01 — Régimes d'évaluation par classe

Toutes les classes ne sont pas évaluées pareil : certaines fonctionnent en
**trimestres** (3 périodes/an), d'autres en **compositions mensuelles**
(octobre → juin).

- Chaque classe porte un régime (`Class.evaluationSystem`).
- L'écran **Périodes d'évaluation** remplace « Semestres » : régime, ordre,
  libellé, et un **générateur en un clic** (3 trimestres ou 9 compositions),
  idempotent.
- Tous les sélecteurs de période (fiche élève, saisie de notes, statistiques,
  résultats, création d'examen) ne proposent que les périodes du régime de la
  classe concernée.
- Bulletins à titre dynamique : « Bulletin du 1ᵉʳ trimestre » /
  « Bulletin — Composition de novembre ».

*Vérifié : 7/7 tests (génération idempotente, filtrage croisé, titres).*

### V02 — Socle multi-tenant

- `SchoolSettings` (singleton) devient le modèle **School** : slug unique,
  statut actif, date de création.
- `schoolId` sur 13 modèles racines (classes, matières, enseignants, élèves,
  parents, années, périodes, annonces, événements, employés, catégories de
  dépenses, grilles de frais, quiz) ; les modèles enfants (notes, factures,
  présences…) sont rattachés via leurs relations.
- Chaque compte utilisateur porte son école (champ better-auth exposé dans la
  session) ; un compte créé par un admin hérite de son école.
- Toutes les données historiques rattachées à l'école #1.

*Vérifié : session E2E porte `schoolId`, migration appliquée en dev et en
production.*

### V03 — Cloisonnement systématique (59 fichiers)

- **27 pages de listes**, 4 dashboards, tous les widgets et les 3 écrans de
  statistiques ne lisent que l'école de la session.
- **Formulaires** : les listes proposées (classes, matières, périodes…) sont
  celles de l'école uniquement.
- **Actions serveur** : toute création est rattachée à l'école de la session ;
  modifier/supprimer une entité d'une autre école est refusé même en
  forgeant la requête (contrôles d'appartenance).
- Une **année scolaire active par école** ; thème, paramètres, bulletins et
  factures PDF suivent l'école concernée.

*Vérifié : matrice d'étanchéité **12/12** — école fictive créée avec données,
aucune fuite dans les deux sens, puis suppression propre.*

### V04 — Espace plateforme `/platform` (super-admin)

- Nouveau rôle `superadmin` (jamais rattaché à une école), espace dédié hors
  du dashboard scolaire.
- Liste des établissements (effectifs, comptes, statut), **création d'une
  école avec son premier compte admin** (aucun orphelin en cas d'échec),
  coupure/réactivation avec confirmation.
- Un autre rôle qui visite `/platform` est renvoyé vers son espace.

*Vérifié : accès 200 superadmin, refus 307 des autres rôles, création de
compte par l'API admin, en dev et en production.*

### V05 — Plans & abonnements (encaissement manuel)

- Modèles `SubscriptionPlan` (prix FCFA/mois, plafond d'élèves),
  `SchoolSubscription` (1-1 avec l'école), `SubscriptionPayment`.
- **Statut dérivé des dates** (le champ stocké n'est qu'un cache) :
  payé → **À jour** ; essai en cours → **Essai** ; échu ≤ 15 j →
  **En retard** (grâce) ; au-delà → **Suspendu**.
- Page `/platform/plans` (cartes CRUD) ; sur chaque école : attribution d'un
  plan (essai 30 j), **encaissement manuel** (mois couverts, montant
  pré-calculé, méthode, référence) — la couverture s'empile après la
  couverture existante — et historique des paiements.

*Vérifié : 12/12 tests (6 branches de statut, cycle attribution → paiement →
couverture ~90 j, empilement).*

### V06 — Blocage des impayés

- École coupée ou abonnement suspendu → **tous ses utilisateurs sont
  redirigés vers la page « Établissement suspendu »** (instructions de
  régularisation pour l'admin, message neutre pour les autres). L'accès
  rouvre dès l'encaissement.
- En période de grâce : bandeau d'alerte pour l'admin de l'école.
- Une école **sans abonnement n'est jamais bloquée** (parc historique) ; le
  superadmin n'est jamais bloqué.

*Vérifié : scénarios à dates simulées (échu 20 j → bloqué, 5 j → accès +
alerte, régularisation → rouvert).*

### V07 — Inscription self-service & landing plateforme

- **`/register-school`** (public) : nom de l'établissement + compte direction
  → école créée avec slug unique, créateur promu admin, **essai gratuit
  30 jours** sur le plan actif le moins cher.
- La **landing devient la vitrine de la plateforme** : CTA « Créer mon
  école », **section Tarifs alimentée par les plans**, chiffres de la
  plateforme, FAQ SaaS (essai, paiement local, cloisonnement).
- **Plus d'inscription publique de comptes individuels** : `/sign-up`
  redirige vers la création d'école ; les comptes à rôle sont créés par
  l'admin de chaque école, les admins d'école par le superadmin ou
  l'inscription d'établissement.

*Vérifié : soumission réelle du formulaire → école + admin + essai en base,
connexion du nouvel admin sur un espace vide (isolation), erreurs propres.*

### V08 — KPIs plateforme

En tête de `/platform` : **Revenu mensuel récurrent** (plans des écoles à
jour uniquement), **Encaissé ce mois**, répartition **À jour / Essai /
En retard / Suspendues / sans abonnement**, **5 prochaines échéances**
(la plus urgente en tête, échue en rouge) et **5 derniers encaissements**.

*Vérifié : 7/7 tests (périmètre du MRR, tri des échéances, comptages).*

---

## 4. Architecture technique

```
├─ Next.js 16 (App Router, Turbopack) — RSC + server actions
├─ better-auth (email/mot de passe, rôles, additionalField schoolId)
├─ Prisma 6 → PostgreSQL (dev : Docker localhost:5433 ; prod : Neon)
├─ proxy.ts : sessions + routeAccessMap par rôle
├─ Cloisonnement : sessionSchoolId()/requireSchool() (authGuard) +
│  filtres where systématiques (racines par schoolId, enfants par relation)
├─ Abonnements : statut dérivé des dates (lib/subscription.ts), blocage
│  dans le layout du dashboard
└─ PDF : react-pdf (bulletins, factures, reçus, bulletins de paie)
```

**Particularités de déploiement**

- Build Vercel : `prisma generate && next build` (cache de dépendances).
- Les migrations de production sont appliquées via l'**API HTTPS de Neon**
  (le port Postgres 5432 est bloqué depuis le réseau de développement),
  avec insertion manuelle de la ligne `_prisma_migrations` (checksum sha256).
- En local : ne jamais mélanger build de prod et `next dev` dans le même
  `.next` (purger le dossier entre les deux), et vérifier qu'aucun serveur
  orphelin n'occupe le port 3000.

---

## 5. Modèle économique

1. Le directeur crée son école sur la landing → **essai gratuit 30 jours**.
2. À l'échéance : 15 jours de grâce (« En retard », bandeau d'alerte).
3. Au-delà : **suspension automatique** — les données sont conservées,
   l'accès est coupé jusqu'à régularisation.
4. Paiement **manuel en FCFA** (espèces, Orange Money, virement) enregistré
   par le superadmin ; la couverture est prolongée du nombre de mois payés,
   l'accès rouvre immédiatement.

---

## 6. Limites connues et suites possibles

- **Exports CSV** (`/api/export/*`) : à re-cloisonner explicitement par école
  (partiellement couverts via l'année scolaire active).
- **Actions secondaires** (présences, rattrapages, questions de quiz,
  réclamations) : pas encore de contrôle d'appartenance systématique.
- **`/api/auth/sign-up/email`** reste techniquement appelable (les comptes
  créés ainsi n'ont ni rôle ni école : inertes) — à fermer si besoin.
- **Uploads d'images** : stockage local incompatible avec le serverless
  Vercel → prévoir un stockage externe (Vercel Blob, S3).
- **Dépendances** : alertes Dependabot à traiter (mises à jour majeures
  Prisma 7, zod 4…).
- Pistes produit : paiement en ligne (CinetPay/Orange Money API), reçus PDF
  d'abonnement, notifications (e-mail/SMS) d'échéance, sous-domaines par
  école, application mobile.

---

## 7. Vérification et qualité

Chaque story a été livrée avec : TypeScript strict sans erreur, build de
production validé en local avant push, et des **tests de bout en bout
scriptés contre la base de développement** (création de données de test,
assertions, nettoyage complet vérifié par comptage). Au total sur v3 :
**50+ assertions automatisées**, dont la matrice d'étanchéité multi-écoles
(12 cas) et le cycle complet d'abonnement.
