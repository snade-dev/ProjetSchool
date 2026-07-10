# ÉCRANS — liste exhaustive

Légende rôles : A=admin, T=teacher, S=student, P=parent. « Données » = ce que la page lit. « Actions » = mutations possibles.
Les écrans marqués ✅ existent déjà (on ne les recode pas, on les durcit si une story le dit). Les 🆕 sont à construire.

## 1. Auth & entrée

| # | Écran | Route | Rôles | Données | Actions | État |
|---|---|---|---|---|---|---|
| E01 | Connexion | `/sign-in` | public | — | signIn (better-auth), redirection selon rôle | ✅ |
| E02 | Inscription | `/sign-up` | public (admin crée les comptes en pratique) | — | signUp | ✅ |
| E03 | Landing/redirect | `/` | public | session | redirect `/{role}` | ✅ |

## 2. Dashboards

| # | Écran | Route | Rôles | Données | Actions | État |
|---|---|---|---|---|---|---|
| E04 | Dashboard admin | `/admin` | A | KPIs réels : effectifs (Student/Teacher/Parent count), présence du jour, CA du mois (Σ Payment), impayés (Σ Invoice non PAID), dépenses du mois, événements, annonces | liens vers modules | ✅ à refondre (S17 : brancher les vraies données, retirer `lib/data.ts` mocké) |
| E05 | Dashboard teacher | `/teacher` | T | emploi du temps (BigCalendar de ses lessons), annonces | — | ✅ |
| E06 | Dashboard student | `/student` | S | emploi du temps de sa classe, calendrier événements, annonces | — | ✅ |
| E07 | Dashboard parent | `/parent` | P | emplois du temps de ses enfants, annonces | — | ✅ |

## 3. Scolarité (M1) — existants

| # | Écran | Route | Rôles | Données | Actions | État |
|---|---|---|---|---|---|---|
| E08 | Liste enseignants | `/list/teachers` | A,T | Teacher + subjects + classes, recherche, pagination | A : create/update/delete (TeacherForm) | ✅ |
| E09 | Fiche enseignant | `/list/teachers/[id]` | A,T | profil, calendrier de ses cours, raccourcis | A : update | ✅ |
| E10 | Liste élèves | `/list/students` | A,T | Student + class, filtre par classe/teacher, recherche | A : create/update/delete (StudentForm) | ✅ |
| E11 | Fiche élève | `/list/students/[id]` | A,T (S,P : la leur via dashboard) | profil, carte assiduité, calendrier classe, raccourcis (results, invoices 🆕 lien S05) | A : update | ✅ |
| E12 | Liste parents | `/list/parents` | A,T | Parent + students | A : CRUD (ParentForm) | ✅ |
| E13 | Liste classes | `/list/classes` | A,T | Class + supervisor, capacité, effectif | A : CRUD (ClassForm) | ✅ |
| E14 | Liste matières | `/list/subjects` | A | Subject + teachers | A : CRUD (SubjectForm) | ✅ |
| E15 | Liste leçons | `/list/lessons` | A,T | Lesson + subject + class + teacher | A : CRUD (LessonForm) | ✅ |

## 4. Évaluations (M2)

| # | Écran | Route | Rôles | Données | Actions | État |
|---|---|---|---|---|---|---|
| E16 | Liste examens | `/list/exams` | A,T,S,P | Exam + lesson(subject,class,teacher) + semester ; filtré par rôle | A,T : CRUD (ExamForm) | ✅ durci S12 |
| E17 | Saisie de notes en masse 🆕 | `/list/gradeEntry` | A,T | sélecteurs classe+matière+semestre → tableau élèves de la classe avec inputs score/classScore préremplis (Result existants) | upsert Result en lot (une action, une transaction) | 🆕 S12 |
| E18 | Liste notes | `/list/results` | A,T,S,P | Result + student + subject + exam + semester, filtres | A,T : CRUD (ResultForm) | ✅ |
| E19 | Moyennes | `/list/average` | A,T,S,P | ResultAverage par semestre | A,T : recalcul | ✅ |
| E20 | Bulletin (PDF) | bouton depuis `/list/results` / fiche élève | A,T,S,P | Results du semestre + moyenne + rang 🆕 + moyenne de classe 🆕 + appréciation | générer/télécharger PDF | ✅ durci S13 |
| E21 | Semestres | `/list/semester` | A (RW), autres R | Semester + subjects | A : CRUD | ✅ |
| E22 | Rattrapage (sessions) | `/list/makeupSession` (+ `[id]`, `[id]/up`) | A,T,S | MakeupSession + inscriptions + notation | A : CRUD + noter ; S : s'inscrire | ✅ |
| E23 | Quiz en ligne (suite) | `/quiz/[quizId]/…`, `/list/onlineExam`… | A,T,S | Quiz/Question/StudentAnswer/QuizResult | T : créer/corriger/publier ; S : composer | ✅ |
| E24 | Réclamations | `/list/reclamation` (+ détail) | A,T,S | Complaint + statut | S : créer ; T/A : traiter | ✅ |

## 5. Vie scolaire (M3) — existants

| # | Écran | Route | Rôles | Données | Actions | État |
|---|---|---|---|---|---|---|
| E25 | Présences | `/list/attendances` | A,T,S,P | Attendance par date/classe/créneau | A,T : pointage (AttendanceForm) | ✅ |
| E26 | Événements | `/list/events` | A,T,S,P | Event ± class | A : CRUD | ✅ |
| E27 | Annonces | `/list/announcements` | A,T,S,P | Announcement ± class | A : CRUD | ✅ |
| E28 | Demandes d'attestation | `/list/demande` (+ `[demandeId]`) | A,T,S | Attestation + statut | S : demander ; A : traiter | ✅ |

## 6. Finance (M4) 🆕

| # | Écran | Route | Rôles | Données | Actions |
|---|---|---|---|---|---|
| E29 | Grille des frais | `/list/fees` | A | FeeStructure + class + schoolYear, groupé par classe | CRUD FeeStructure (FeeForm) ; dupliquer la grille d'une classe vers une autre |
| E30 | Liste factures | `/list/invoices` | A (toutes) ; S (les siennes) ; P (celles de ses enfants) | Invoice + student + Σ payé, filtres statut/mois/classe, recherche élève, badges statut, total impayé en tête | A : créer facture manuelle (InvoiceForm), annuler (si 0 paiement), lancer génération mensuelle (E31), synchro OVERDUE |
| E31 | Génération mensuelle (modal/section de E30) | `/list/invoices` (action) | A | aperçu : nb élèves facturables (grille MONTHLY de leur classe), mois/année cibles, nb déjà générés | `generateMonthlyInvoices(month, year)` idempotent |
| E32 | Détail facture | `/list/invoices/[id]` | A ; S/P propriétaire | Invoice + lines + payments + solde restant ; infos établissement (SchoolSettings) | A : ajouter/supprimer ligne (si non payée), enregistrer paiement (PaymentForm), télécharger facture PDF, télécharger reçu PDF par paiement |
| E33 | Impayés / recouvrement (onglet de E30, `?status=OVERDUE`) | `/list/invoices?status=…` | A | factures OVERDUE + jours de retard + parent (téléphone) | marquer relancé (note), export CSV (S18) |
| E34 | Dépenses | `/list/expenses` | A | Expense + category, filtres mois/catégorie, total de la période en tête | CRUD Expense (ExpenseForm avec upload justificatif Cloudinary) ; CRUD catégories (ExpenseCategoryForm) |

## 7. RH / Paie (M5) 🆕

| # | Écran | Route | Rôles | Données | Actions |
|---|---|---|---|---|---|
| E35 | Employés | `/list/employees` | A | Employee ± teacher lié, statut actif, salaire de base | CRUD Employee (EmployeeForm ; option « lier à un enseignant existant » qui préremplit nom/contacts) |
| E36 | Paie du mois | `/list/payroll` | A | sélecteur mois/année → SalaryPayment du mois : base, primes, retenues, net, statut ; totaux (masse salariale, payé, restant) | `generatePayroll(month, year)` idempotent ; éditer primes/retenues (si PENDING) ; marquer payé (méthode + date) ; bulletin de paie PDF |

## 8. Statistiques (M6) 🆕

| # | Écran | Route | Rôles | Données | Actions |
|---|---|---|---|---|---|
| E37 | Stats élèves | `/stats/students` | A, T (limité à ses classes) | par classe & semestre : moyenne de classe, taux de réussite (moy ≥ 10), top 5 / flop 5 (ResultAverage), évolution des moyennes par semestre (LineChart), taux de présence (Attendance), répartition par matière (BarChart) | filtres classe/semestre ; drill-down vers fiche élève |
| E38 | Stats enseignants | `/stats/teachers` | A | par enseignant : matières & classes, moyenne obtenue par ses élèves dans ses matières, taux de réussite, comparatif entre enseignants (BarChart), nb leçons/semaine | filtres semestre/matière ; tri |
| E39 | Stats financières | `/stats/finance` | A | par mois de l'année scolaire active : CA encaissé (Σ Payment), facturé (Σ Invoice), dépenses (Σ Expense), masse salariale (Σ SalaryPayment PAID), résultat = CA − dépenses − salaires ; taux de recouvrement ; répartition dépenses par catégorie (Pie) ; impayés par classe | filtres année scolaire ; export CSV (S18) |

## 9. Administration (M7) 🆕

| # | Écran | Route | Rôles | Données | Actions |
|---|---|---|---|---|---|
| E40 | Paramètres | `/settings` | A | SchoolSettings (singleton) + liste SchoolYear | éditer infos établissement (logo Cloudinary) ; CRUD SchoolYear ; activer une année (désactive les autres) |

## 10. Navigation (Menu.tsx — items à ajouter)

- Section « FINANCE » (visible admin) : Grille des frais → `/list/fees` ; Factures → `/list/invoices` ; Dépenses → `/list/expenses` ; Employés → `/list/employees` ; Paie → `/list/payroll`.
- « Mes factures » → `/list/invoices` (visible student, parent).
- Section « STATISTIQUES » (admin ; stats élèves aussi teacher) : `/stats/students`, `/stats/teachers`, `/stats/finance`.
- « Paramètres » → `/settings` (admin).
- « Saisie des notes » → `/list/gradeEntry` (admin, teacher).
