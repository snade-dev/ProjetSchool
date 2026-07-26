# V5 — Cantine, cotisations d'événements, documents officiels

Demande du user (25 juil. 2026) : ajouter un module **cantine**, enrichir le module
**événements** pour gérer les **cotisations** avec **récapitulatif**, et rendre l'app
capable de produire deux **documents officiels** dont il a fourni les modèles
(`~/Downloads/certificat de transfer.jpeg`, `~/Downloads/bulletin.jpeg` — École Privée
Daouda Mariko, Bamako).

Suite de [`v4-fondations.md`](v4-fondations.md). La cantine était explicitement
repoussée « v5+ » dans le hors-périmètre v4 (§2.5 vie scolaire) : cette itération la
sort du placard.

## Décisions validées par le user (25 juil. 2026, AskUserQuestion)

1. **Cantine = forfait + pointage.** Chaque élève est inscrit à une *formule*
   (forfait mensuel/annuel) facturée via les factures existantes, ET le réfectoire
   pointe les présences chaque jour (suivi des repas servis, effectifs). Les
   non-abonnés peuvent prendre un repas à l'unité, facturé au prix unitaire.
2. **Cotisations = registre propre à l'événement.** Un événement porte un montant
   attendu par élève ; les versements vivent dans un registre dédié (reçu PDF), pas
   dans des factures. Les montants remontent en recettes dans les stats finance.
3. **Certificat de transfert = fiche élève + demandes.** Bouton sur la fiche élève
   (formulaire motif/décision/conduite → PDF), et le module « Demandes » existant
   (`Attestation`) peut déclencher la même génération.

## Règles d'exécution

Identiques aux builds v2/v3/v4 :
- Une story = une branche `v5/NN-slug`, mergée dans `main` avant la suivante. Tout
  échec est corrigé avant de lancer la story suivante.
- Chaque story livre un incrément UTILISABLE (schéma + migration + action + écran +
  contrôle d'accès + entrée de menu).
- Critères d'acceptation = tests manuels (`npm run dev`) + `npm run build` sans erreur.
- Base dev : Docker `school-db` localhost:5433. Prod Neon : migrations sur l'endpoint
  DIRECT (sans `-pooler`), backup `pg_dump` avant tout rejeu.
- Toute action sensible appelle `auditWithSession(session, "module.verbe", entity, …)`
  (convention W10). Toute notification passe par `notify()` (W12), jamais bloquante.
- Isolation multi-tenant W01 : `schoolId` explicite partout, jamais de `@default`.
  Les écrans filtrent sur `sessionSchoolId(session)` / `requireSchool()`.

---

## Architecture cible

### 1. Cantine (§2.5)

```prisma
// Formule de restauration proposée par l'école pour une année scolaire.
model MealPlan {
  id           Int        @id @default(autoincrement())
  name         String                       // « Demi-pension », « Repas + goûter »
  description  String?
  period       FeePeriod  @default(MONTHLY) // forfait mensuel / annuel / ponctuel
  amount       Int                          // FCFA — montant du forfait
  unitPrice    Int?                         // FCFA — prix d'UN repas (non-abonné / extra)
  active       Boolean    @default(true)
  schoolYearId Int
  schoolId     Int
  @@unique([schoolId, schoolYearId, name])
}

enum CanteenSubscriptionStatus { ACTIVE SUSPENDED ENDED }

// UNE inscription cantine par élève et par année (comme Enrollment).
model CanteenSubscription {
  id           Int      @id @default(autoincrement())
  studentId    String
  mealPlanId   Int
  schoolYearId Int
  startDate    DateTime                     // début de prise en charge
  endDate      DateTime?                    // résiliation
  status       CanteenSubscriptionStatus @default(ACTIVE)
  @@unique([studentId, schoolYearId])
}

enum MealAttendanceKind {
  SUBSCRIBED   // abonné servi (inclus dans le forfait, montant 0)
  EXTRA        // repas à l'unité (facturé unitPrice)
  ABSENT       // abonné non servi ce jour (suivi, aucune incidence financière)
}

model MealAttendance {
  id           Int      @id @default(autoincrement())
  date         DateTime                     // jour normalisé à 00:00
  studentId    String
  kind         MealAttendanceKind
  mealPlanId   Int?
  amount       Int      @default(0)         // FCFA facturé (EXTRA uniquement)
  recordedById String
  schoolId     Int
  @@unique([studentId, date])               // un pointage par élève et par jour
  @@index([schoolId, date])
}
```

**Facturation** — `generateMonthlyInvoices` (S05/W11) gagne les lignes cantine :
- forfait MONTHLY : une ligne « Cantine — <formule> » au montant du forfait sur la
  facture du mois, pour tout abonné ACTIVE dont la période couvre le mois ;
- forfait YEARLY / ONE_TIME : facturé une seule fois (clé d'idempotence dédiée) ;
- repas EXTRA : agrégés en une ligne « Cantine — repas à l'unité (N) » du mois.
L'idempotence reste portée par `Invoice.generationKey` (le batch est rejouable).

**Récapitulatif** — `/list/canteen/recap` : repas servis par jour/semaine/mois,
effectif moyen, abonnés par classe et par formule, montant facturé vs encaissé,
impayés cantine. Export CSV (`/api/export/canteen`, convention W10/`csv.ts`).

### 2. Cotisations d'événements (§2.4)

L'événement cible déjà une classe (`Event.classId`, null = toute l'école) : ce champ
sert de périmètre de la cotisation, rien à ajouter côté ciblage.

```prisma
// Barème de cotisation d'un événement (au plus UN par événement).
model EventContribution {
  id          Int       @id @default(autoincrement())
  eventId     Int       @unique
  amount      Int                            // FCFA attendus PAR ÉLÈVE
  dueDate     DateTime?
  note        String?
  closedAt    DateTime?                      // registre clôturé (plus de versement)
  createdById String
  schoolId    Int
}

// Versement d'un élève au registre d'un événement.
model EventContributionPayment {
  id             String        @id @default(uuid())
  contributionId Int
  studentId      String
  amount         Int
  method         PaymentMethod @default(CASH)  // réutilise l'enum finance
  paidAt         DateTime      @default(now())
  reference      String        @unique         // « COT-2026-00042 » (compteur, invoiceRef.ts)
  note           String?
  receivedById   String
  @@index([contributionId, studentId])
}
```

Versements PARTIELS autorisés (somme des versements d'un élève comparée au barème).
Reçu PDF par versement (`EventContributionReceiptPdf`, calqué sur `PaymentReceiptPdf`).

**Récapitulatif** — écran `/list/events/[id]` : barème, cible, avancement global
(payé / attendu / reste), tableau par classe puis par élève (statut : soldé, partiel,
non payé), export CSV. Les recettes de cotisation entrent dans `/stats/finance`.

### 3. Bulletin annuel (modèle fourni)

Agrégation ANNUELLE des périodes d'évaluation d'une année, `src/lib/annualReport.ts` :

| Élément du modèle | Source |
|---|---|
| Lignes « 1ère Composition / Octobre / 8,36 / Très Bien » | `Semester` (order, label) + `ResultAverage.average` + `getMention()` |
| TOTAL, Nbr de Comp. | somme et compte des périodes notées |
| Moyenne annuelle | Σ moyennes de période ÷ nombre de périodes notées |
| Classement général (« 1er Sur 8 ») | rang « standard competition » sur la moyenne annuelle, dénominateur = élèves notés |
| MOY. Plus forte / Plus faible / de la Classe | extrema et moyenne des moyennes annuelles de la classe |
| Décision (« Passe en CP2 ») | `Enrollment.annualDecision` |
| Conduite (cases à cocher) | `Enrollment.conduct` |
| Observations | `Enrollment.annualObservation` |
| Absences / Retards | `Attendance` de l'année |
| Le Maître / La Directrice / Le Parent | `Class.supervisor` + `School.directorName` |

Fonctionne pour les DEUX régimes : compositions mensuelles (le modèle fourni) comme
trimestres — le tableau liste les périodes de l'année quel que soit `Semester.system`.

```prisma
model Enrollment {
  ...
  // V5 — bilan de fin d'année (bulletin annuel + certificat de transfert)
  conduct           String?   // « Très bonne », « Bonne », « Assez bonne », « À améliorer », « Avertissement »
  workAppreciation  String?   // « Excellent », « Bien »… (certificat de transfert)
  annualDecision    String?   // « Passe en CP2 », « Redouble »…
  annualObservation String?
}
```

`annualDecision` pré-remplit l'assistant de passage d'année (W04) et le certificat de
transfert : une seule saisie sert les trois documents.

### 4. Certificat de transfert (modèle fourni)

Champs manquants à ajouter :

```prisma
model School {
  ...
  // V5 — en-tête des documents officiels (modèle fourni : Ministère / CAP / République)
  ministry     String?   // « MINISTERE DE L'EDUCATION NATIONALE »
  academy      String?   // « CAP DE BAGUINEDA »
  countryLine1 String?   // « REPUBLIQUE DU MALI »
  countryLine2 String?   // « Un Peuple – Un But – Une Foi »
  city         String?   // « Dougourakoro-sema » (mention « Fait à … »)
  directorName String?   // « MARIKO Aminata »
  directorTitle String?  // « La Directrice » / « Le Directeur »
}

model Student {
  ...
  birthPlace String?     // « Bamako » (« Né(e) le … à … »)
}

// Trace des certificats délivrés — valeurs FIGÉES (document officiel).
model TransferCertificate {
  id               String   @id @default(uuid())
  reference        String   @unique          // « CT-2026-00003 »
  studentId        String
  schoolYearId     Int
  className        String                    // figé au moment de l'émission
  attendedFrom     DateTime                  // « A fréquenté mon établissement du … »
  attendedTo       DateTime                  // « … au … »
  yearsAttended    Int                       // nombre d'années de scolarité (Enrollment)
  annualAverage    Float?
  annualRank       Int?
  conduct          String?
  workAppreciation String?
  decision         String?                   // décision du conseil des maîtres
  reason           String                    // motif de transfert
  attestationId    String?                   // demande d'origine (module Demandes)
  issuedById       String
  issuedAt         DateTime @default(now())
  schoolId         Int
}
```

Émettre un certificat marque l'inscription de l'année en `TRANSFERRED` (W03) et
journalise `document.transfer_certificate` (W10).

---

## Stories

| # | Story | Dépend de | Livrable |
|---|---|---|---|
| **X01** | Cantine — socle | — | `MealPlan`, `CanteenSubscription`, `MealAttendance` + migration ; écrans `/list/canteen` (formules) et `/list/canteen/subscriptions` (abonnés) ; menu « Vie scolaire » |
| **X02** | Cantine — pointage du jour | X01 | Écran `/list/canteen/pointage` (appel du réfectoire, une ligne par abonné + ajout d'un repas à l'unité), rôles admin/director/supervisor |
| **X03** | Cantine — facturation | X01, X02 | Lignes cantine dans `generateMonthlyInvoices` (forfait + extras), idempotence, reprise sur facture existante |
| **X04** | Cantine — récapitulatif | X02, X03 | `/list/canteen/recap` (repas servis, effectifs, facturé/encaissé, impayés) + export CSV |
| **X05** | Événements — cotisations | — | `EventContribution` + `EventContributionPayment` + migration ; barème dans le formulaire d'événement ; saisie des versements ; reçu PDF |
| **X06** | Événements — récapitulatif | X05 | `/list/events/[id]` : avancement, tableau par classe/élève, export CSV, recettes dans `/stats/finance` |
| **X07** | Bulletin annuel | — | `src/lib/annualReport.ts` + `AnnualBulletinPDF` conforme au modèle ; champs `Enrollment` (conduite/décision/observation) ; génération par classe et par élève |
| **X08** | Certificat de transfert | X07 | Champs `School`/`Student` + `TransferCertificate` ; formulaire fiche élève ; PDF conforme ; branchement module « Demandes » |

X01→X04 (cantine), X05→X06 (événements) et X07→X08 (documents) sont trois chaînes
INDÉPENDANTES : elles ne se bloquent pas mutuellement. X07 réutilise `reportCard.ts`
sans le modifier ; X08 réutilise l'agrégat annuel de X07 (moyenne + rang).

## Hors périmètre v5

Infirmerie, transport, bibliothèque (§2.5 restant), SMS (§2.6.2), site vitrine,
app mobile, menus de la cantine (planification des plats), gestion de stock des
denrées, plusieurs services de restauration par jour (cantine + goûter séparés).
