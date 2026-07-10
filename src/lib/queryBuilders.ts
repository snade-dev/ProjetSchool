// S18 — Constructeurs de `where` Prisma partagés entre les pages de liste et les
// route handlers d'export CSV. Extraits ici pour que l'export applique EXACTEMENT
// les mêmes filtres que la page correspondante (pas de divergence silencieuse).

import { Prisma, InvoiceStatus } from "@/app/generated/prisma";

/** Filtres de la liste des factures (E30) : status / month / search.
 *  `schoolYearId` est un ajout utilisé par le bouton d'export de /stats/finance
 *  (E39) — sans effet sur la page liste qui ne le passe pas. */
export function buildInvoiceWhere(params: {
  status?: string;
  month?: string;
  search?: string;
  schoolYearId?: string;
}): Prisma.InvoiceWhereInput {
  const andFilters: Prisma.InvoiceWhereInput[] = [];

  if (params.status && params.status in InvoiceStatus) {
    andFilters.push({ status: params.status as InvoiceStatus });
  }
  if (params.month) {
    const m = parseInt(params.month);
    if (!Number.isNaN(m)) andFilters.push({ month: m });
  }
  if (params.search) {
    andFilters.push({
      student: {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { surname: { contains: params.search, mode: "insensitive" } },
        ],
      },
    });
  }
  if (params.schoolYearId) {
    const y = parseInt(params.schoolYearId);
    if (!Number.isNaN(y)) andFilters.push({ schoolYearId: y });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}

/** Filtres de la liste des dépenses (E34) : month / year / categoryId / search.
 *  Le filtre mois/année se fait par bornes de dates (gte/lt), jamais sur des
 *  strings. `now` injectable pour tester ; défaut = date courante. */
export function buildExpenseWhere(params: {
  month?: string;
  year?: string;
  categoryId?: string;
  search?: string;
  now?: Date;
}): Prisma.ExpenseWhereInput {
  const andFilters: Prisma.ExpenseWhereInput[] = [];
  const now = params.now ?? new Date();
  const m = params.month ? parseInt(params.month) : undefined; // 1..12
  const y = params.year ? parseInt(params.year) : undefined;

  if (m && !Number.isNaN(m)) {
    const yy = y && !Number.isNaN(y) ? y : now.getFullYear();
    andFilters.push({
      date: { gte: new Date(yy, m - 1, 1), lt: new Date(yy, m, 1) },
    });
  } else if (y && !Number.isNaN(y)) {
    andFilters.push({
      date: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) },
    });
  }

  if (params.categoryId) {
    const cid = parseInt(params.categoryId);
    if (!Number.isNaN(cid)) andFilters.push({ categoryId: cid });
  }

  if (params.search) {
    andFilters.push({
      OR: [
        { label: { contains: params.search, mode: "insensitive" } },
        { supplier: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}

/** Clamp du paramètre mois : 1-12, sinon `fallback` (défaut = mois courant). */
export function clampMonth(raw?: string, fallback?: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n) || n < 1 || n > 12)
    return fallback ?? new Date().getMonth() + 1;
  return n;
}

/** Clamp du paramètre année : 2020-2100, sinon `fallback` (défaut = année courante). */
export function clampYear(raw?: string, fallback?: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n) || n < 2020 || n > 2100)
    return fallback ?? new Date().getFullYear();
  return n;
}
