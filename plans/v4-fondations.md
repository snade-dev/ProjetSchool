# V4 — Conformité au cahier des charges : fondations + modules web clés

Source : `plans/cahier-des-charges-v1.txt` (extrait du docx « Cahier des charges ERP
scolaire », juillet 2026). Audit d'écart réalisé le 14 juil. 2026.

Décisions validées par le user (14 juil. 2026, AskUserQuestion) :
- **Modèle économique : on garde les abonnements** (SubscriptionPlan/SchoolSubscription
  de la v3). Le modèle « gratuité + commission sur paiements + partenaires territoriaux »
  du cahier des charges (§2.10) est ÉCARTÉ pour l'instant — le cahier des charges devra
  être amendé sur ce point. Aucun démontage, aucune préparation « hybride ».
- **Périmètre v4 : fondations + modules web clés.** Fondations = tout ce qui touche le
  modèle de données et bloque le reste (isolation multi-tenant, coefficients, régimes
  d'évaluation, inscriptions par année, multi-tuteurs, compte multi-écoles, rôles,
  audit, dette finance). Modules web clés = notifications in-app + email, devoirs,
  observations/discipline, messagerie interne simple.

Hors périmètre v4 (repoussé v5+) : site vitrine (§2.8), app mobile (§2.9), vie
scolaire — infirmerie/cantine/transport/bibliothèque (§2.5), SMS (§2.6.2), évaluation
par compétences (système 4) et modulaire (système 5), emploi du temps visuel avec
détection de conflits, salles, programmes scolaires, caisses multiples et journal
comptable (§2.4.13-14), fournisseurs (§2.4.10), intégrations mobile money réelles,
partenaires (§2.10), groupes scolaires (§2.1.2), anciens élèves (§2.2.2).

Règles d'exécution (identiques aux builds v2/v3) :
- Une story = une branche `v4/NN-slug`. On n'entame pas une story tant que ses
  dépendances ne sont pas mergées. Tout échec est corrigé avant la story suivante.
- Chaque story livre un incrément UTILISABLE (schéma + action + écran + accès + menu).
- Critères d'acceptation = tests manuels (`pnpm dev`) + `pnpm build` sans erreur.
- Base dev : Docker `school-db` localhost:5433. Prod : Neon (migrations via l'API
  HTTPS de Neon, cf. mémoire — pas de `migrate deploy` direct depuis ce réseau).

## Architecture cible

### 1. Isolation multi-tenant réelle (correction de bugs v3)

Deux défauts hérités du backfill V02 :

```prisma
// AVANT (bug) : unicité GLOBALE → l'école 2 ne peut pas créer « 6ème A »
model Class   { name String @unique ... }
// APRÈS : unicité PAR ÉCOLE
model Class   { name String ... @@unique([schoolId, name]) }
// Idem : Subject.name, Semester.name, Quiz.title, ExpenseCategory.name,
// SchoolYear.name, FeeStructure (@@unique passe à [schoolId, classId, schoolYearId, label])
```

- Supprimer `@default(1)` sur TOUS les `schoolId` (Student, Teacher, Parent, Class,
  Subject, Semester, Event, Announcement, Quiz, SchoolYear, FeeStructure,
  ExpenseCategory, Employee). Le fallback silencieux vers l'école #1 est un risque
  de fuite inter-tenant : toute écriture doit passer un `schoolId` explicite.
- Revue systématique des `create`/`upsert` (grep par modèle) pour vérifier que le
  `schoolId` vient bien de `requireSchool()` et jamais d'un défaut.

### 2. Structure éducative : niveaux, années, inscriptions (§2.1.3-2.1.5)

```prisma
model Level {                       // §2.1.4 — créé librement par l'école
  id      Int    @id @default(autoincrement())
  name    String                    // « CP », « 6ème », « Terminale »…
  order   Int                       // ordre hiérarchique (passage d'année)
  cycle   String?                   // préscolaire / primaire / collège / lycée (libre)
  schoolId Int
  school  School @relation(...)
  classes Class[]
  @@unique([schoolId, name])
}

model Class {
  ...
  levelId      Int?                 // null toléré à la migration, puis obligatoire
  level        Level?  @relation(...)
  schoolYearId Int                  // une classe appartient à UNE année (§2.1.5)
  schoolYear   SchoolYear @relation(...)
  @@unique([schoolId, schoolYearId, name])   // « 6ème A » réutilisable chaque année
}

model Semester {
  ...
  schoolYearId Int                  // une période appartient à une année
  schoolYear   SchoolYear @relation(...)
}

model Enrollment {                  // §2.1.3 — l'inscription remplace Student.classId
  id           Int      @id @default(autoincrement())
  studentId    String
  student      Student  @relation(...)
  classId      Int
  class        Class    @relation(...)
  schoolYearId Int
  schoolYear   SchoolYear @relation(...)
  status       EnrollmentStatus @default(ACTIVE)  // ACTIVE, TRANSFERRED, LEFT, GRADUATED, REPEATED
  enrolledAt   DateTime @default(now())
  @@unique([studentId, schoolYearId])             // une inscription par an
}
```

- Migration : pour chaque Student, créer un Enrollment (classe actuelle × année
  active). `Student.classId` reste en lecture dérivée pendant la transition
  (helper `currentClass(studentId)`), puis est supprimé en fin de story W03.
- Assistant de passage d'année (§2.1.3, story dédiée W04) : clôture de l'année
  active → reconduction des classes sur la nouvelle année, passage au niveau
  supérieur (via `Level.order`) avec redoublement au cas par cas, réinscription
  en masse, report des factures impayées (nouvelle Invoice « arriérés N-1 »),
  archivage (SchoolYear.isActive=false, données intactes).

### 3. Tuteurs multiples (§2.2.3)

```prisma
model StudentGuardian {             // remplace Student.parentId (1-N → N-N + droits)
  id          Int     @id @default(autoincrement())
  studentId   String
  parentId    String
  relationship String              // père, mère, tuteur légal, tuteur de fait
  isLegal     Boolean @default(true)
  canPay      Boolean @default(true)   // droits différenciés (§2.2.3)
  canViewGrades Boolean @default(true)
  canPickup   Boolean @default(false)
  @@unique([studentId, parentId])
}
```

- Migration : chaque `Student.parentId` devient une ligne StudentGuardian
  (relationship « tuteur », tous droits). `parentId` supprimé ensuite.
- L'espace parent liste les enfants via StudentGuardian ; les vues notes/finance
  respectent `canViewGrades`/`canPay`.

### 4. Compte multi-établissements + rôles élargis (§2.2.7, 2.2.8, 2.7.10)

```prisma
model UserSchoolMembership {        // remplace User.schoolId (1 compte, N écoles)
  id       Int    @id @default(autoincrement())
  userId   String
  schoolId Int
  role     String                   // admin, director, teacher, accountant,
                                    // supervisor, parent, student
  active   Boolean @default(true)
  @@unique([userId, schoolId, role])
}
```

- `User.schoolId`/`User.role` restent le « contexte actif » (école + rôle courants),
  alimentés par le sélecteur d'espace ; la vérité des rattachements est la table
  de membership. Superadmin : role global, aucune membership requise.
- Sélecteur d'espace à la connexion (§2.7.10) : si plusieurs memberships, écran de
  choix ; bascule rapide depuis le header sans se reconnecter.
- Rôles ajoutés à `routeAccessMap` + `permission.ts` : `director` (validation
  bulletins/dépenses, tout sauf paramètres structurants), `accountant`
  (finance uniquement), `supervisor` (présences/discipline uniquement).
  Le système de rôles ENTIÈREMENT configurable par école (§2.2.7) est repoussé :
  v4 livre des rôles prédéfinis supplémentaires, pas un moteur de permissions.

### 5. Moteur d'évaluation : coefficients + régime combiné + calendrier (§2.1.6, 2.3.1)

```prisma
model ClassSubject {                // matière ENSEIGNÉE dans une classe, avec coefficient
  id          Int   @id @default(autoincrement())
  classId     Int
  subjectId   Int
  coefficient Int   @default(1)     // fixe pour l'année (§2.1.6)
  @@unique([classId, subjectId])
}

enum EvaluationSystem { TRIMESTER  MONTHLY  COMBINED }  // + composition ET trimestre (§2.3.1 système 3)

model Class {
  ...
  homeworkWeight Int @default(50)   // pondération devoirs vs composition, en % (régimes TRIMESTER/COMBINED)
}

model ResultAverage {
  ...
  stale Boolean @default(false)     // bulletin périmé après correction de coefficient (§2.1.6)
}
```

- `reportCard.ts` : moyenne générale = Σ(moyenne matière × coefficient) ÷ Σ coefficients
  (remplace la moyenne simple H17). Les classes MONTHLY gardent coefficient=1 partout
  (comportement §2.3.1 système 1 : pas de pondération).
- Correction d'un coefficient en cours d'année (règle critique §2.1.6) : alerte
  explicite listant les bulletins impactés → confirmation → marquage `stale` →
  bouton « Régénérer » (recalcul ResultAverage + rangs). Historisation via le
  journal d'audit (story W10).
- COMBINED : la classe voit à la fois les périodes TRIMESTER et MONTHLY de l'année ;
  le générateur de périodes sait produire le calendrier combiné (les mois de
  trimestre n'ont pas de composition). Deux types de bulletins coexistent.
- Calendrier d'évaluation configurable (§2.3.1) : l'écran Périodes (v3) est étendu —
  nombre de compositions/trimestres libre par année ET par classe via le régime,
  pondération devoirs/composition réglable par classe.

### 6. Journal d'audit (§2.11)

```prisma
model AuditLog {
  id        BigInt   @id @default(autoincrement())
  at        DateTime @default(now())
  userId    String?                 // qui
  role      String?                 // rôle actif au moment de l'action
  schoolId  Int?                    // null = action plateforme
  action    String                  // "note.update", "payment.create", "coefficient.update"…
  entity    String                  // modèle + id concerné
  before    Json?                   // ancienne valeur (modifications)
  after     Json?                   // nouvelle valeur
  reason    String?                 // motif (obligatoire pour actions sensibles)
  ip        String?
}
```

- Table SANS update/delete applicatif (append-only ; pas de server action de
  modification — l'immuabilité « même en DB » viendra plus tard).
- Helper `audit(action, entity, {before, after, reason})` appelé par les server
  actions sensibles : notes (saisie/modif), paiements, coefficients, changements
  de rôle, validation de bulletins, suspension d'école.
- Écran « Journal » (admin/director : son école ; superadmin : tout) avec filtres
  utilisateur/action/période + export CSV. Les accès superadmin aux données d'une
  école sont eux-mêmes journalisés (§2.11.5).

### 7. Finance : dette TuitionPayment + échéanciers configurables (§2.4.2)

- **Migration finale TuitionPayment → Invoice/Payment** : le script
  `scripts/migrate-tuition.ts` devient définitif ; les écrans
  `/list/tuitionPayment` sont supprimés du menu et remplacés par les factures ;
  le modèle `TuitionPayment` est retiré du schéma.
- **Échéanciers** : `FeePeriod.MONTHLY` ne suffit pas (§2.4.2 : « 7, 8, 9 ou 10
  mensualités, montants non forcément égaux, mois exclus »).

```prisma
model FeeInstallment {              // échéancier détaillé d'une FeeStructure
  id             Int @id @default(autoincrement())
  feeStructureId Int
  month          Int                // 1-12 (mois payable choisi par l'école)
  amount         Int                // FCFA — les mensualités peuvent différer
  @@unique([feeStructureId, month])
}
```

- Le batch de génération des factures mensuelles suit FeeInstallment quand il
  existe ; sinon comportement actuel (montant uniforme) — rétrocompatible.

### 8. Notifications & communication (§2.6, allégé)

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    String                  // destinataire
  schoolId  Int
  type      String                  // ABSENCE, GRADE, REPORT_CARD, PAYMENT, ANNOUNCEMENT, HOMEWORK, MESSAGE
  title     String
  body      String
  link      String?                 // route interne
  readAt    DateTime?
  createdAt DateTime @default(now())
}

model Homework {                    // §2.3.8
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  dueDate   DateTime
  classId   Int
  subjectId Int
  teacherId String
  fileUrl   String?                 // pièce jointe (upload existant)
  createdAt DateTime @default(now())
}

model Observation {                 // §2.3.7 — discipline et observations
  id         Int      @id @default(autoincrement())
  studentId  String
  authorId   String                 // User.id (enseignant ou direction)
  kind       String                 // POSITIVE, NEUTRAL, NEGATIVE
  content    String
  sharedWithParents Boolean @default(true)
  createdAt  DateTime @default(now())
}

model AbsenceJustification {        // §2.3.6 — le parent justifie, la direction valide
  id           Int      @id @default(autoincrement())
  attendanceId Int
  parentId     String
  reason       String
  fileUrl      String?
  status       RequestStatus @default(PENDING)   // enum existante
  decidedById  String?
  createdAt    DateTime @default(now())
}

model Message {                     // §2.6.5 — messagerie 1-à-1, sans groupes
  id         Int      @id @default(autoincrement())
  schoolId   Int
  senderId   String
  receiverId String
  content    String
  fileUrl    String?
  readAt     DateTime?
  createdAt  DateTime @default(now())
}
```

- Notifications : helper `notify(users, type, …)` appelé par les actions
  existantes (présence absente → tuteurs, note validée, bulletin généré,
  paiement enregistré, annonce publiée, devoir publié). Cloche dans le header
  (compteur non-lus), page « Notifications », préférences par type.
- Email : envoi SMTP (nodemailer, variables d'env) pour les types critiques
  (absence, bulletin, reçu de paiement avec PDF joint). L'école sans SMTP
  configuré = notifications in-app seulement ; jamais bloquant.
- Messagerie : règles §2.6.5 codées en dur — parent↔enseignants de ses enfants,
  parent↔direction, enseignant↔enseignant (même école), direction↔personnel ;
  parent↔parent interdit. La direction peut consulter les fils de son école.

## Stories

```
W01 ─┬─ W02 ─ W03 ─ W04
     ├─ W05
     ├─ W06 ─ W07
     ├─ W08 ─ W09
     ├─ W10
     ├─ W11
     └─ W12 ─┬─ W13
             ├─ W14
             ├─ W15
             └─ W16   (W16 dépend aussi de W07)
```

| # | Titre | Dépend de |
|---|---|---|
| W01 | Isolation multi-tenant : `@@unique([schoolId, …])`, suppression des `@default(1)`, revue de toutes les écritures | — |
| W02 | Niveaux (Level) + classes rattachées à l'année scolaire + Semester↔SchoolYear | W01 |
| W03 | Enrollment : inscriptions par année, migration depuis Student.classId, historique des classes sur la fiche élève | W02 |
| W04 | Assistant de passage d'année : clôture, reconduction des classes, passage/redoublement, réinscription, report des impayés | W03 |
| W05 | Tuteurs multiples : StudentGuardian + droits différenciés, migration depuis parentId, espace parent adapté | W01 |
| W06 | Compte multi-écoles : UserSchoolMembership, sélecteur d'espace à la connexion, bascule depuis le header | W01 |
| W07 | Rôles élargis : director, accountant, supervisor — routeAccessMap, permission.ts, menus par rôle | W06 |
| W08 | Coefficients : ClassSubject, moyennes pondérées dans reportCard, correction avec bulletins marqués périmés + régénération | W01 |
| W09 | Régime COMBINED + pondération devoirs/composition par classe + générateur de périodes combiné + deux types de bulletins | W08 |
| W10 | Journal d'audit : AuditLog append-only, helper audit(), instrumentation des actions sensibles, écran Journal + export | W01 |
| W11 | Finance : migration définitive TuitionPayment → Invoice/Payment, FeeInstallment (mensualités configurables), batch adapté | W01 |
| W12 | Notifications in-app : modèle, helper notify(), cloche header, page + préférences, déclencheurs (absence, note, bulletin, paiement, annonce) | W01 |
| W13 | Email SMTP : envoi des notifications critiques, reçus et bulletins PDF en pièce jointe, config par école | W12 |
| W14 | Devoirs à faire : publication enseignant, vue élève/parent avec calendrier, notification | W12 |
| W15 | Observations & discipline + justifications d'absence (parent soumet, direction valide) + section bulletin | W12 |
| W16 | Messagerie interne 1-à-1 avec règles de mise en relation, consultation direction | W07, W12 |

## Points de vigilance

- **W01 est risquée comme V03 l'était** : retirer les `@default(1)` casse toute
  écriture qui comptait dessus. Grep systématique `prisma.<modèle>.create|upsert`
  modèle par modèle AVANT la migration ; matrice de vérification en critère
  d'acceptation. Vérifier aussi le seed et les scripts.
- **W03 touche ~tout le code élève** : `Student.classId` est lu partout (listes,
  stats, bulletins, factures, quiz). Procéder en deux temps dans la même story :
  (1) Enrollment + helper + double écriture, (2) bascule des lectures, suppression
  du champ. Ne pas merger l'état intermédiaire.
- **W05/W06 et better-auth** : `User.role`/`User.schoolId` sont des
  `additionalFields` better-auth ; le sélecteur d'espace les met à jour — vérifier
  l'invalidation de session/cookies à la bascule. L'inscription self-service (V07)
  crée une membership, plus un simple schoolId.
- **W08** : `Result`/`Lesson` relient déjà classe et matière implicitement ;
  ClassSubject doit être backfillé depuis les Lessons existantes pour ne pas
  perdre les moyennes actuelles (coefficient 1 par défaut = comportement inchangé).
- **W09** : les mois « de trimestre » ne portent pas de composition — le
  générateur doit l'imposer, sinon doubles bulletins le même mois.
- **Migrations prod Neon** : v4 comporte BEAUCOUP de migrations de schéma ; chaque
  déploiement prod passe par l'API HTTPS de Neon (SQL + ligne `_prisma_migrations`),
  comme documenté en mémoire. Prévoir un ordre de rejeu et des backups avant W01,
  W03, W05, W11 (migrations destructives : suppression de colonnes).
- **Le cahier des charges reste plus large que v4** : ne pas laisser une story
  déborder sur le périmètre v5 (compétences, SMS, vitrine…). En cas de doute,
  la liste « Hors périmètre v4 » en tête de ce document fait foi.
