// S18 — Helper d'export CSV compatible Excel FR.
//
// Choix imposés par la fiche story-18 :
// - séparateur `;` (Excel FR utilise le point-virgule comme séparateur de liste),
// - BOM UTF-8 (﻿) en tête → sinon Excel casse les accents,
// - fins de ligne CRLF (\r\n) attendues par les tableurs Windows,
// - échappement RFC-4180 : un champ contenant `"`, `;`, `\n` ou `\r` est
//   entouré de guillemets et ses `"` internes sont doublés.

const BOM = "﻿";

/** Échappe une cellule : null → "", nombres bruts, texte protégé si besoin. */
function escapeCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "number" ? String(value) : value;
  if (/[";\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Sérialise un tableau (en-têtes + lignes) en CSV `;` avec BOM et CRLF.
 * Les montants doivent être passés en nombres BRUTS (25000, pas "25 000 FCFA")
 * pour rester sommables dans Excel.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null)[][]
): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(";")
  );
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Date au format FR JJ/MM/AAAA pour les cellules d'export ("" si absente). */
export function formatDateFr(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR").format(d);
}
