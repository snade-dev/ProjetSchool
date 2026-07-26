import "server-only";
import prisma from "./prisma";
import { Prisma } from "@/app/generated/prisma";

/**
 * X08 — Certificat de transfert (§2.1.3), calqué sur le modèle fourni par
 * l'école (juillet 2026).
 *
 * Principe : le certificat est un DOCUMENT OFFICIEL remis à la famille. Les
 * valeurs (moyenne annuelle, rang, classe, dates de fréquentation, nombre
 * d'années) sont donc FIGÉES dans TransferCertificate au moment de l'émission —
 * un recalcul ultérieur rendrait incohérent un certificat déjà remis.
 * Ce module ne fait que (1) préparer les valeurs à figer et (2) recomposer les
 * données d'affichage d'un certificat déjà émis.
 */

/** Référence d'un certificat : « CT-2026-00003 ». */
export async function nextCertificateReference(
  tx: Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CT-${year}-`;
  // Max NUMÉRIQUE et non un count : les trous ne doivent pas collisionner.
  const lastRefs = await tx.transferCertificate.findMany({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
    take: 25,
  });
  const base = lastRefs.reduce((max, r) => {
    const n = parseInt(r.reference.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(base + 1).padStart(5, "0")}`;
}

export type TransferCertificateData = {
  reference: string;
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    ministry: string | null;
    academy: string | null;
    countryLine1: string | null;
    countryLine2: string | null;
    city: string | null;
    directorName: string | null;
    directorTitle: string | null;
  } | null;
  student: {
    name: string;
    surname: string;
    /** Date de naissance déjà formatée (« 3 décembre 2017 »). */
    birthday: string;
    birthPlace: string | null;
    sex: string;
  };
  /** Père et mère (StudentGuardian.relationship), null si non renseignés. */
  father: string | null;
  mother: string | null;
  /** « du 02 Octobre 2025 » — déjà formatée. */
  attendedFrom: string;
  /** « au 30 Juin 2026 » — déjà formatée. */
  attendedTo: string;
  className: string;
  annualAverage: number | null;
  annualRank: number | null;
  classSize: number | null;
  yearsAttended: number;
  conduct: string | null;
  workAppreciation: string | null;
  decision: string | null;
  reason: string;
  /** Date d'émission déjà formatée. */
  issuedAt: string;
};

const fmtLong = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);

/**
 * Recompose les données d'affichage d'un certificat DÉJÀ ÉMIS.
 * Les chiffres viennent du certificat (figés) ; seules l'identité de l'élève,
 * sa filiation et l'en-tête de l'école sont relus (ils décrivent des faits
 * stables et bénéficient d'une correction de saisie).
 */
export async function getTransferCertificateData(
  certificateId: string,
  schoolId: number
): Promise<TransferCertificateData | null> {
  const cert = await prisma.transferCertificate.findFirst({
    where: { id: certificateId, schoolId },
    select: {
      reference: true,
      className: true,
      attendedFrom: true,
      attendedTo: true,
      yearsAttended: true,
      annualAverage: true,
      annualRank: true,
      classSize: true,
      conduct: true,
      workAppreciation: true,
      decision: true,
      reason: true,
      issuedAt: true,
      student: {
        select: {
          name: true,
          surname: true,
          birthday: true,
          birthPlace: true,
          sex: true,
          guardians: {
            select: {
              relationship: true,
              parent: { select: { name: true, surname: true } },
            },
          },
        },
      },
    },
  });
  if (!cert) return null;

  const school = await prisma.school.findUnique({ where: { id: schoolId } });

  // Filiation : on retient le premier tuteur dont la relation dit « père » /
  // « mère » (le référentiel est libre — cf. StudentGuardian.relationship).
  const findGuardian = (needle: string) =>
    cert.student.guardians.find((g) =>
      g.relationship.toLowerCase().includes(needle)
    );
  const father = findGuardian("père") ?? findGuardian("pere");
  const mother = findGuardian("mère") ?? findGuardian("mere");
  const fullName = (g?: { parent: { name: string; surname: string } }) =>
    g ? `${g.parent.surname} ${g.parent.name}`.trim() : null;

  return {
    reference: cert.reference,
    school: school
      ? {
          name: school.name,
          address: school.address ?? null,
          phone: school.phone ?? null,
          email: school.email ?? null,
          logo: school.logo ?? null,
          ministry: school.ministry ?? null,
          academy: school.academy ?? null,
          countryLine1: school.countryLine1 ?? null,
          countryLine2: school.countryLine2 ?? null,
          city: school.city ?? null,
          directorName: school.directorName ?? null,
          directorTitle: school.directorTitle ?? null,
        }
      : null,
    student: {
      name: cert.student.name,
      surname: cert.student.surname,
      birthday: fmtLong(cert.student.birthday),
      birthPlace: cert.student.birthPlace,
      sex: cert.student.sex,
    },
    father: fullName(father),
    mother: fullName(mother),
    attendedFrom: fmtLong(cert.attendedFrom),
    attendedTo: fmtLong(cert.attendedTo),
    className: cert.className,
    annualAverage: cert.annualAverage,
    annualRank: cert.annualRank,
    classSize: cert.classSize,
    yearsAttended: cert.yearsAttended,
    conduct: cert.conduct,
    workAppreciation: cert.workAppreciation,
    decision: cert.decision,
    reason: cert.reason,
    issuedAt: fmtLong(cert.issuedAt),
  };
}
