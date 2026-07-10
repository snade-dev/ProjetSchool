# Story 21 — Refonte TOTALE du design des formulaires

Demande du propriétaire (10 juil. 2026) : au-delà de l'harmonisation CSS déjà faite (H44d), une vraie refonte visuelle des ~22 formulaires — une identité propre, pas des défauts de template. S'appuyer sur le skill `frontend-design` (`.agents/skills/frontend-design/SKILL.md`) : direction artistique délibérée, typographie, palette (respecter le thème dynamique `--lama-*` de SchoolSettings).

## Étapes

1. **Direction artistique** (1 maquette avant code) : proposer au propriétaire 2 pistes sur le formulaire Enseignant (le plus riche) — p.ex. (A) panneau latéral plein-hauteur (drawer) avec en-tête coloré thème + sections à ancres, (B) modal large en 2 colonnes : colonne identité (avatar/upload en tête) + colonne formulaire par étapes. Valider AVANT de décliner.
2. **Système de composants** `src/components/form/` : `FormShell` (en-tête : icône entité, titre, sous-titre, bouton fermer), `FormSection` (intitulé + trait), `Field` (input/select/textarea/date unifiés, focus thème, erreurs inline animées), `AvatarUpload` (aperçu rond, drag & drop, progression), `FormFooter` (annuler + submit avec spinner et état succès), `Stepper` (formulaires longs : Enseignant, Élève = 2-3 étapes Identité → Compte → Scolarité).
3. **Déclinaison** : migrer les 22 formulaires sur ces composants (logique react-hook-form/useActionState INCHANGÉE — S19/S20 d'abord pour ne pas redesigner du cassé). Ordre : teacher/student/parent (vitrine), puis finance (fee/invoice/payment/expense/employee), puis vie scolaire, puis les courts (subject/class/semester…).
4. **Modal/Drawer** : animation d'entrée (translate + fade), fond flouté (`backdrop-blur`), fermeture Échap + clic fond, focus trap, scroll interne propre.
5. **Vérifs** : chaque formulaire testé en création ET édition sur build prod ; contraste AA sur les 3 couleurs du thème par défaut ET un thème sombre custom ; mobile (les formulaires passent en 1 colonne) ; captures avant/après dans la PR.

## Fichiers touchés
`src/components/form/*` (nouveaux), les 22 `src/components/forms/*.tsx`, `src/components/FormModal.tsx` (shell), éventuellement `globals.css` (animations).

## Échecs probables → parade
- **Régression fonctionnelle** : ne toucher NI aux `register()` ni aux payloads — uniquement l'enveloppe visuelle ; retester la fermeture-après-succès (bug H43 corrigé, ne pas le réintroduire : les composants restent définis au niveau module).
- **Thème dynamique** : ne jamais coder de hex en dur — utiliser les classes `lama*` (variables CSS).
- **Selects multiples (matières)** : remplacer le `<select multiple>` natif par des chips cochables (accessibles au clavier).

## Done
Direction validée par le propriétaire, 22 formulaires migrés, E2E vert, captures avant/après, ledger mis à jour.

## Quand s'arrêter
Pas de refonte des PAGES listes ni du dashboard (chantier séparé), pas de mode sombre global.
