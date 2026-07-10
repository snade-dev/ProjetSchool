# DESIGN BRIEFS — un prompt prêt à l'emploi par écran

## Préambule commun (à COLLER en tête de chaque prompt Claude Design)

> Tu conçois un écran d'un logiciel de gestion scolaire (Next.js + Tailwind CSS 3, desktop-first, responsive md/lg).
> Design system EXISTANT à respecter strictement :
> - Couleurs : `lamaSky #C3EBFA`, `lamaSkyLight #EDF9FD`, `lamaPurple #CFCEFF`, `lamaPurpleLight #F1F0FF`, `lamaYellow #FAE27C`, `lamaYellowLight #FEFCE8` ; fond de page `#F7F8FA` ; cartes blanches `rounded-md`/`rounded-2xl`, padding `p-4`.
> - Typo : text-sm par défaut, titres `text-lg font-semibold`, labels gris `text-gray-400/500`.
> - Listes : carte blanche pleine largeur → header (titre + `TableSearch` + boutons ronds filtre/tri jaunes 8×8 + bouton "+" création) → `<Table>` (lignes `border-b even:bg-slate-50 hover:bg-lamaPurpleLight text-sm`) → `<Pagination>`.
> - Formulaires : modal centré (overlay noir 60%), `InputField` empilés 2 colonnes, bouton principal `bg-blue-400 text-white rounded-md p-2`.
> - Badges statut : pill `text-xs px-2 py-1 rounded-full` (vert=ok, jaune=en attente, rouge=retard/rejeté, gris=annulé).
> - Icônes lucide-react. Langue de l'UI : FRANÇAIS. Monnaie : FCFA formatée `1 250 000 FCFA`.
> - Pas de dark mode. Pas de librairie UI supplémentaire.

---

### E04 — Dashboard admin (refonte)
Écran d'accueil admin. En haut : 4 `UserCard` (Élèves, Enseignants, Parents, Employés) avec valeur + année scolaire active en badge. Dessous, grille 2/3–1/3 : à gauche CountChart (répartition filles/garçons) + AttendanceChart (présence de la semaine) ; à droite EventCalendar + annonces. Bandeau financier pleine largeur : 3 stat-tiles (CA encaissé du mois, Dépenses du mois, Impayés cumulés — rouge si > 0) avec sparkline discrète et lien « Voir stats finance ». Ton : dense mais aéré, tout doit se lire sans scroll sur 1440px.

### E17 — Saisie de notes en masse (`/list/gradeEntry`)
Outil de productivité pour enseignant. Barre de contexte sticky en haut : 3 selects (Classe, Matière, Semestre) + compteur « 24/32 notes saisies ». Dessous, tableau plein écran : Élève (avatar + nom, figé à gauche), Note d'examen /20 (input numérique), Note de classe /20 (input), Moyenne calculée (lecture seule, colorée : rouge <10, jaune 10–12, vert >12). Navigation clavier Tab/Entrée entre cellules. Footer sticky : bouton « Enregistrer tout » + état « modifications non enregistrées » (point orange). États vides et erreurs par cellule (bordure rouge + tooltip).

### E29 — Grille des frais (`/list/fees`)
Page admin de paramétrage. Header : titre « Grille des frais », select Année scolaire, bouton « + Ajouter un frais ». Corps : une carte par classe (accordéon), contenant un mini-tableau Label / Périodicité (badge : Mensuel bleu, Annuel violet, Unique gris) / Montant FCFA aligné à droite / actions éditer-supprimer. Pied de carte : « Total mensuel : X FCFA » + bouton secondaire « Dupliquer vers une autre classe ». État vide par classe : illustration légère + CTA.

### E30/E31/E33 — Liste factures (`/list/invoices`)
Vue caissier. Au-dessus du tableau : 4 stat-tiles cliquables qui filtrent (Toutes / Payées / Partielles / En retard — la dernière en rouge avec montant total impayé). Filtres : mois, classe, recherche élève. Tableau : Référence (mono), Élève (avatar+nom+classe), Mois, Total, Payé (barre de progression fine), Statut (badge), Échéance (rouge si dépassée), Actions (voir, encaisser). Bouton principal « Générer les factures du mois » ouvrant un modal : mois/année, aperçu « 128 élèves facturables, 12 déjà facturés (ignorés) », confirmation. Vue student/parent : même tableau sans stat-tiles admin ni actions, avec bandeau « Solde restant : X FCFA ».

### E32 — Détail facture (`/list/invoices/[id]`)
Layout 2 colonnes. Gauche (2/3) : carte « facture papier » — en-tête établissement (logo, nom, adresse depuis SchoolSettings), référence + badge statut, bloc élève/parent, tableau des lignes (Libellé, Qté, PU, Total), total en gras, échéance. Droite (1/3) : carte « Paiements » — timeline des paiements (montant, méthode avec icône, date, caissier, bouton reçu PDF), solde restant en grand (vert si 0), bouton principal « Encaisser un paiement » (modal : montant prérempli du solde, méthode, référence, date). Boutons secondaires : « Facture PDF », « Annuler la facture » (désactivé si paiement existe, tooltip explicatif).

### E34 — Dépenses (`/list/expenses`)
Header : titre, select mois, select catégorie, total de la période en stat-tile, bouton « + Dépense ». Tableau : Date, Libellé, Catégorie (badge coloré par catégorie), Fournisseur, Méthode, Montant (droite), Justificatif (miniature cliquable ou « — »), Actions. Modal création : 2 colonnes, zone d'upload Cloudinary en drag-and-drop avec aperçu. Lien discret « Gérer les catégories » ouvrant un petit modal liste+ajout.

### E35 — Employés (`/list/employees`)
Tableau : Employé (avatar initiales + nom), Poste, Lié à (badge « Enseignant » avec lien vers fiche, ou « Staff »), Embauche, Salaire de base (droite), Statut (Actif vert / Inactif gris), Actions. Modal création : toggle en tête « Lier à un enseignant existant » → select des Teachers sans Employee, qui préremplit et verrouille nom/prénom/email ; sinon champs libres.

### E36 — Paie du mois (`/list/payroll`)
Barre de contexte : mois/année (navigation ← →), 3 stat-tiles (Masse salariale, Payé en vert, Restant en jaune), bouton « Générer la paie du mois » (désactivé + tooltip si déjà générée). Tableau : Employé, Poste, Base, Primes (input inline si PENDING), Retenues (input inline), Net (gras, recalculé live), Statut, Actions (Marquer payé → modal méthode+date ; Bulletin PDF si PAID). Lignes PAID légèrement grisées et verrouillées.

### E37 — Stats élèves (`/stats/students`)
Dashboard analytique. Filtres en tête : Classe, Semestre. Rangée de stat-tiles : Moyenne de classe, Taux de réussite (≥10), Taux de présence, Effectif. Grille 2×2 : LineChart « Évolution de la moyenne de classe par semestre » ; BarChart horizontal « Moyenne par matière » ; deux listes côte à côte « Top 5 » (fond vert clair) / « À suivre » flop 5 (fond rouge clair) avec avatar, moyenne, lien fiche ; Heatmap ou BarChart présence par jour de semaine. Charts recharts, couleurs lama*, tooltips en français.

### E38 — Stats enseignants (`/stats/teachers`)
Filtres : Semestre, Matière. Tableau-classement principal : Enseignant (avatar+nom), Matières, Classes, Élèves notés, Moyenne obtenue (barre de progression /20 colorée), Taux de réussite, Leçons/semaine. Au-dessus, BarChart comparatif des moyennes par enseignant (une couleur neutre, l'enseignant survolé en lamaPurple). Encadré méthodologique discret : « Moyenne des Result des élèves dans les matières enseignées ». Tri par colonne.

### E39 — Stats financières (`/stats/finance`)
Le cockpit du directeur. Select Année scolaire. Rangée : CA encaissé, Total facturé, Taux de recouvrement (jauge), Dépenses, Masse salariale, Résultat (vert/rouge). Chart principal pleine largeur : ComposedChart mensuel Sept→Juin — barres CA encaissé (lamaSky), barres Dépenses+Salaires empilées (lamaPurple), ligne Résultat (jaune). Dessous 2 colonnes : PieChart dépenses par catégorie ; tableau « Impayés par classe » (classe, nb factures, montant, % du total) trié décroissant. Bouton « Exporter CSV » en header.

### E40 — Paramètres (`/settings`)
Deux cartes empilées. Carte 1 « Établissement » : upload logo (rond, Cloudinary), champs nom/adresse/téléphone/email/pied de page légal, bouton Enregistrer. Carte 2 « Années scolaires » : tableau Nom, Période (dates), Statut (badge « Active » vert, une seule), actions Activer (avec confirm « ceci désactivera 2024-2025 »)/Éditer/Supprimer (désactivé si données liées), bouton « + Nouvelle année ».

### E20 — Bulletin scolaire PDF (durci)
Document A4 @react-pdf/renderer. En-tête : logo + nom établissement + « BULLETIN DU {semestre} — {année} ». Bloc identité élève (nom, classe, effectif). Tableau : Matière, Note classe, Note examen, Moyenne /20, Moyenne de la classe, Rang dans la matière, Appréciation auto (Excellent ≥16, Bien ≥14, Assez bien ≥12, Passable ≥10, Insuffisant <10). Pied : Moyenne générale en gras, Rang général « 3e / 32 », mention, ligne signatures (Directeur / Parent). Sobre, noir + un filet lamaSky, lisible en impression N&B.

### Écrans existants (E01–E16, E18–E28) — brief de retouche uniquement
Ne PAS redessiner. Si une story les touche : conserver strictement la structure actuelle (header carte blanche + Table + Pagination) ; seuls ajouts autorisés : badges statut harmonisés, formatage FCFA, liens croisés (ex. fiche élève → « Voir ses factures »), et bouton PDF au style des existants.
