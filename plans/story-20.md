# Story 20 — Suppressions fiables sur toutes les entités

Constat (audit 10 juil. 2026) : trois familles de bugs sur les suppressions.
(a) **Mappings faux dans `FormModal.deleteActionMap`** : `event: deleteSubject` (supprimer un événement supprime la MATIÈRE de même id !), `assignment: deleteSubject`, `attestation: deleteQuiz`.
(b) **Contraintes FK silencieuses** : `StudentAnswer`, `QuizResult`, `Complaint`, `Quiz` (teacher/class/subject), `Question`, `ExamCorrection` n'ont PAS d'`onDelete` (= Restrict). Supprimer un parent (cascade élèves), un élève, un enseignant, une classe ou une matière touchés par un quiz échoue en base — et le catch retourne quand même `success:true` + toast « supprimé ».
(c) **Erreurs avalées** : les delete actions loggent puis retournent un booléen sans message ; la carte de confirmation ne peut rien afficher d'utile.

## Étapes

1. **Corriger le mapping** : créer `deleteEvent` (eventAction), `deleteAttestation` ; retirer `assignment`/`attestation` du map s'ils n'ont pas d'UI de suppression réelle (vérifier les pages) plutôt que de mapper au hasard.
2. **Migration additive `onDelete`** (aucune perte : on ne fait qu'autoriser la cascade) :
   - `StudentAnswer.student`, `QuizResult.student`, `Complaint.student`, `Attestation.student` (déjà Cascade ? vérifier) → `Cascade` ;
   - `StudentAnswer.quiz/question`, `QuizResult.quiz`, `Question.quiz`, `ExamCorrection.quiz` → `Cascade` (supprimer un quiz emporte ses questions/réponses) ;
   - `Quiz.teacher`, `Question.createdBy`, `ExamCorrection.teacher` → **Restrict conservé** : un enseignant avec des quiz ne se supprime pas ; message clair « Supprimez ou réaffectez d'abord ses quiz ».
   - `Quiz.class`, `Quiz.subject` → Restrict conservé + message.
   `prisma migrate dev` sur la base Docker 5433 (jamais de reset).
3. **Messages remontés** : toutes les delete actions retournent `{success, error, message}` ; sur erreur Prisma P2003 (FK), message FR ciblé (« Impossible : des quiz référencent cet enseignant »), sinon message générique. La carte delete de `FormModal` affiche déjà `state.message`.
4. **Plus de faux succès** : chaque delete action ne retourne `success:true` que si le delete prisma a réellement eu lieu (pattern S19 pour les entités à compte).
5. **Matrice de vérification E2E (build prod)** : pour CHAQUE table du map (subject, class, teacher, student, parent, exam, lesson, average, result, event, announcement, attendance, quiz, attestation, semester, makeupSession, schoolYear, fee, invoice, expense, employee) : créer une entité jetable → la supprimer → vérifier ligne disparue + toast ; pour les cas Restrict, vérifier le message d'erreur affiché. Consigner le tableau dans la PR/ledger.

## Fichiers touchés
`prisma/schema.prisma` + migration, `src/components/FormModal.tsx` (map), `src/lib/actions/*.ts` (retours message), `src/lib/actions/eventAction.ts` (nouveau ou complété).

## Échecs probables → parade
- **Cascade trop large** : relire chaque `onDelete` ajouté — ne JAMAIS cascader vers Teacher/Class/Subject (seulement depuis eux vers leurs données enfants de quiz).
- **`deleteMakeupSession`/`deleteSchoolYear`** : vérifier les gardes métier existantes (année active ?) avant de standardiser le retour.
- **Suppression d'élève = pertes de notes** : c'est déjà la sémantique (Cascade) — confirmé H14 (soft-delete hors scope).

## Done
Matrice complète verte, aucun « supprimé » mensonger, `pnpm build` vert, ledger H45 documenté.

## Quand s'arrêter
Pas de soft-delete (story dédiée au ledger), pas de corbeille/restauration.
