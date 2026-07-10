# Story 18 — Exports CSV & finitions

Écrans : E30, E34, E36, E39 (boutons) · Dépend de : S16 · Branche : `story/18-csv-exports`

## Étapes

1. **Helper CSV** : `src/lib/csv.ts` → `toCsv(headers: string[], rows: (string|number|null)[][])` : séparateur `;`, échappement des `"` et `;`, préfixe BOM `﻿`, lignes `\r\n`.
2. **Route handlers** (GET) — `src/app/api/export/invoices/route.ts`, `expenses/route.ts`, `payroll/route.ts` :
   - garde : `const session = await auth.api.getSession({headers: request.headers})` ; non-admin → `new Response("Forbidden", {status:403})`.
   - lire les filtres depuis `request.nextUrl.searchParams` (mêmes clés que les pages : status/month/year/categoryId…), réutiliser la MÊME construction de `where` (extraire les builders de query des pages vers `src/lib/queryBuilders.ts` si duplication ; sinon dupliquer proprement — au choix le plus simple).
   - `findMany` SANS pagination (take: 10000 max), map vers lignes FR : factures (Référence;Élève;Classe;Mois;Total;Payé;Solde;Statut;Échéance), dépenses (Date;Libellé;Catégorie;Fournisseur;Méthode;Montant), paie (Employé;Poste;Mois;Année;Base;Primes;Retenues;Net;Statut;Payé le).
   - réponse : `new Response(csv, {headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="factures-2026-01.csv"`}})`.
3. **Boutons** : composant `src/components/ExportCsvButton.tsx` (client) : `<a href={"/api/export/…?" + currentSearchParams}>` stylé bouton secondaire — l'ajouter aux 4 écrans (E39 pointe vers invoices avec l'année).
4. **Vérifs** : ouverture dans Excel FR (accents corrects grâce au BOM, colonnes bien séparées) ; filtres respectés (exporter « OVERDUE » ne contient que les retards) ; accès student → 403 ; 1 000 lignes < 5 s.

## Fichiers touchés
`src/lib/csv.ts` (nouveau), `src/app/api/export/{invoices,expenses,payroll}/route.ts` (nouveaux), `src/components/ExportCsvButton.tsx` (nouveau), pages E30/E34/E36/E39 (bouton).

## Échecs probables → parade
- **Le proxy exclut `/api`** (matcher actuel) : la garde de session DANS chaque route handler n'est donc PAS optionnelle — c'est la seule protection.
- **Excel et l'UTF-8** : sans BOM, les accents cassent — le BOM est obligatoire, tester réellement en ouvrant le fichier.
- **Montants formatés** : exporter les nombres BRUTS (25000, pas « 25 000 FCFA ») pour permettre les sommes dans Excel.
- **searchParams côté bouton** : `useSearchParams()` nécessite un composant client sous `<Suspense>` en Next 16 si la page est statique — nos pages sont dynamiques (session), OK, mais si erreur de build : envelopper.

## Done
Critères S18 de `stories.md` + un CSV réel joint à la PR + capture Excel.

## Quand s'arrêter
Pas d'export Excel natif (.xlsx), pas de PDF de listes, pas d'import CSV. Le plan v2 s'achève ici : faire un tour final de `plans/ledger.md` et le remettre au propriétaire avec la liste des hypothèses à valider.
