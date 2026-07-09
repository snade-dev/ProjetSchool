# LEDGER — hypothèses prises faute d'information (à valider par le propriétaire)

Règle : l'exécutant ne s'arrête JAMAIS pour poser une de ces questions. Il applique l'hypothèse et note ici tout nouvel écart rencontré (ajouter une ligne, continuer).

| # | Sujet | Hypothèse appliquée | Impact si faux |
|---|---|---|---|
| H01 | Monnaie | FCFA, montants entiers (`Int`), format `1 250 000 FCFA` | Champs à passer en Decimal + formatage |
| H02 | Année scolaire | Septembre → Juin (l'axe des charts finance suit cet ordre) | Réordonner l'axe mensuel |
| H03 | Notation | /20, seuil de réussite = 10, mentions : ≥16 Excellent, ≥14 Bien, ≥12 Assez bien, ≥10 Passable | Constantes dans `src/lib/setting.ts` (GRADE_SCALE) — un seul endroit à changer |
| H04 | Multi-établissement | NON multi-tenant : une seule école par déploiement (`SchoolSettings` singleton id=1) | Refonte majeure (tenantId partout) — hors scope v2 |
| H05 | Rôle « comptable » | Pas de rôle dédié : l'admin gère la finance. `requireRole(["admin"])` partout en M4/M5 | Ajouter "accountant" dans routeAccessMap + guards (prévu par la conception, 1 story) |
| H06 | TVA / taxes | Aucune taxe sur les factures (écoles non assujetties) | Ajouter champ taux/ligne de taxe sur InvoiceLine |
| H07 | Échéance factures auto | Le 5 du mois facturé | Constante dans l'action `generateMonthlyInvoices` |
| H08 | Numérotation factures | `FAC-{année}-{compteur 5 chiffres}` global (max existant + 1, en transaction) | Changer le générateur de référence (isolé dans une fonction) |
| H09 | Salaires | Mensuels fixes (baseSalary), pas de paiement à l'heure ni de charges sociales calculées | Ajouter champs cotisations sur SalaryPayment |
| H10 | TuitionPayment existant | Données réelles présentes → migrées vers Invoice/Payment (S07), table conservée puis dépréciée ; montants Float arrondis à l'Int | Si table vide en prod : sauter le script, tout le reste inchangé |
| H11 | Devise des Float existants | `TuitionPayment.amount`, `Result.classScore` etc. restent tels quels ; seuls les NOUVEAUX modèles sont en Int | — |
| H12 | Présence | Le taux de présence = présents / pointages enregistrés (pas / jours ouvrés théoriques) | Ajuster la formule dans stats |
| H13 | Langue | UI 100 % français (le code, les identifiants et les commits restent en anglais) | i18n hors scope |
| H14 | Suppression d'élève | Cascade existante conservée : supprimer un élève supprime ses factures/paiements (Prisma `onDelete: Cascade`) — préférer la non-suppression en pratique | Passer en soft-delete (1 story dédiée) |
| H15 | Tests | Pas de framework de test installé → critères d'acceptation vérifiés manuellement + `pnpm build`. Aucune story n'installe vitest/jest sans demande explicite | Ajouter une story « harnais de tests » |
| H16 | proxy.ts (Next 16) | Le fichier `src/proxy.ts` remplace `middleware.ts` et est supposé fonctionnel ; S02 ajoute la défense en profondeur DANS les pages/actions sans dépendre du proxy | Si le proxy ne s'exécute pas, la sécurité reste assurée par les guards serveur |
| H17 | Bulletin — pondération | Moyenne matière = (classScore + score)/2 si les deux existent, sinon la note présente ; moyenne générale = moyenne simple des matières (pas de coefficients) | Ajouter `coefficient` sur Subject (1 story) |
| H18 | Employés ↔ Users | Les employés « staff » n'ont PAS de compte User (pas de connexion) | Créer des comptes staff (hors scope) |
