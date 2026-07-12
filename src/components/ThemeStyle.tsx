import { connection } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";

/**
 * Thème d'établissement : lit les couleurs de SchoolSettings et surcharge les
 * variables CSS de la palette (tailwind lit `--lama-*`, cf. globals.css).
 * Les variantes claires sont dérivées automatiquement (mélange avec du blanc).
 * Sans personnalisation : ne rend rien, la palette par défaut s'applique.
 */

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = HEX_RE.exec(hex.trim());
  if (!m) return null;
  const h = m[1];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Variante claire : mélange à 62 % avec du blanc (cohérent avec la palette d'origine). */
const lighten = ([r, g, b]: [number, number, number]): [number, number, number] => [
  Math.round(r + (255 - r) * 0.62),
  Math.round(g + (255 - g) * 0.62),
  Math.round(b + (255 - b) * 0.62),
];

const triplet = (rgb: [number, number, number]) => rgb.join(" ");

const ThemeStyle = async () => {
  // Rendu à la requête (pas de valeurs figées au build) + tolérance aux pannes DB.
  await connection();
  let settings: {
    themePrimary: string | null;
    themeSecondary: string | null;
    themeAccent: string | null;
  } | null = null;
  try {
    // V07 — thème de l'école de la session ; visiteur anonyme → palette par
    // défaut (la landing est la vitrine de la PLATEFORME, pas d'une école)
    const info = await getSessionInfo().catch(() => null);
    settings = await prisma.school.findUnique({
      where: { id: info?.schoolId ?? -1 },
      select: {
        themePrimary: true,
        themeSecondary: true,
        themeAccent: true,
      },
    });
  } catch {
    return null; // palette par défaut si la base est indisponible
  }

  const vars: string[] = [];
  const apply = (hex: string | null | undefined, base: string, light: string) => {
    const rgb = hex ? hexToRgb(hex) : null;
    if (!rgb) return;
    vars.push(`${base}: ${triplet(rgb)};`);
    vars.push(`${light}: ${triplet(lighten(rgb))};`);
  };

  apply(settings?.themePrimary, "--lama-sky", "--lama-sky-light");
  apply(settings?.themeSecondary, "--lama-purple", "--lama-purple-light");
  apply(settings?.themeAccent, "--lama-yellow", "--lama-yellow-light");

  if (vars.length === 0) return null;

  return <style>{`:root{${vars.join("")}}`}</style>;
};

export default ThemeStyle;
