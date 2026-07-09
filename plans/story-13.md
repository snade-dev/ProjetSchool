# Story 13 — Bulletin scolaire complet (rang, moyenne de classe, appréciations)

Écran : E20 (PDF) · Dépend de : S12 · Branche : `story/13-report-card`

## Étapes

1. **Constantes** : dans `src/lib/setting.ts`, `GRADE_SCALE = { max: 20, pass: 10, mentions: [{min:16,label:"Excellent"},{min:14,label:"Bien"},{min:12,label:"Assez bien"},{min:10,label:"Passable"},{min:0,label:"Insuffisant"}] }` (H03).
2. **Service de calcul** : `src/lib/reportCard.ts` → `buildReportCard(studentId, semesterId)` (server-only) :
   - charger l'élève + sa classe ; TOUS les Results du (classId, semesterId) en UNE requête (`where:{semesterId, student:{classId}}, include:{subject, student}`).
   - par matière : moyenne élève = H17 ((classScore+score)/2 si les deux, sinon la présente) ; moyenne de classe = moyenne des moyennes élèves de la matière ; rang matière = position (tri desc, ex æquo = même rang, `1,2,2,4`).
   - moyenne générale élève = moyenne simple de ses moyennes matière ; rang général sur l'effectif noté ; mention via GRADE_SCALE ; appréciation par matière via GRADE_SCALE.
   - retourner une structure typée `ReportCardData` (aucun accès DB dans le composant PDF).
   - upsert `ResultAverage` de TOUS les élèves de la classe calculés au passage (cohérence `/list/average`).
3. **PDF** : réécrire/compléter `src/components/BulletinPDF.tsx` selon le brief E20, alimenté par `ReportCardData` + SchoolSettings (logo/nom). Garder le composant PUR (props → rendu).
4. **Déclenchement** : `BulletinButton.tsx` existant : le brancher sur un flux où le RSC parent (fiche élève `/list/students/[id]` + page results) précharge `ReportCardData` pour le semestre sélectionné et le passe au bouton (PDFDownloadLink). Sélecteur de semestre à côté du bouton.
5. **Contrôle d'accès** : dans les pages qui préparent les données : student → seulement lui-même ; parent → seulement ses enfants ; sinon notFound(). (Le calcul étant côté page, pas d'action à protéger.)
6. **Vérifs** : jeu contrôlé (3 élèves, 2 matières, notes fixées via gradeEntry) → rangs et moyennes vérifiés à la main ; élève sans note dans une matière → « — » ; classe entière sans note → bulletin avec message, pas de NaN ; test URL forgée.

## Fichiers touchés
`src/lib/setting.ts`, `src/lib/reportCard.ts` (nouveau), `src/components/BulletinPDF.tsx`, `src/components/BulletinButton.tsx`, `src/app/(dashboard)/list/students/[id]/page.tsx`, page results (emplacement du bouton existant — localiser via grep `BulletinButton`).

## Échecs probables → parade
- **Perf naïve N+1** (une requête par élève) : la requête unique de l'étape 2 charge tout le nécessaire ; les calculs se font en mémoire (une classe ≈ 40×10 lignes, trivial).
- **Ex æquo** : implémenter le rang « standard competition » (1,2,2,4) et le TESTER explicitement.
- **PDFDownloadLink + gros props** : sérialiser `ReportCardData` en objets simples (pas de Date brutes — formater en string avant).
- **ResultAverage divergent de l'existant** (`averageAction.ts` calcule peut-être autrement) : lire `averageAction.ts` AVANT, aligner la formule sur H17, et noter dans ledger si l'ancienne formule différait.

## Done
Critères S13 de `stories.md` + bulletin PDF d'un élève du jeu de test joint à la PR + tableau de vérification manuelle des rangs dans la description.

## Quand s'arrêter
Pas de coefficients (H17), pas d'appréciations manuelles saisies par les profs (auto uniquement — ledger), pas d'envoi aux parents, pas de bulletin annuel multi-semestres.
