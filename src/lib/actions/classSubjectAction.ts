"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { classSubjectSchema, ClassSubjectSchema } from "../formsValidationSchema";
import { buildClassReportCards } from "../reportCard";

/**
 * W08 — Gestion des matières & coefficients d'une classe (ClassSubject, §2.1.6).
 * Toutes les actions sont scopées école (requireSchool(["admin","director"])) :
 * la classe ET la matière doivent appartenir à l'école de la session.
 *
 * Règle critique (§2.1.6) — correction d'un coefficient en cours d'année :
 * si des ResultAverage existent pour la classe (n'importe quelle période de
 * l'année de la classe), l'action retourne d'abord la liste des bulletins
 * impactés (requiresConfirmation) ; à la confirmation explicite, le coefficient
 * est mis à jour et les ResultAverage impactés passent stale=true. Le bouton
 * « Régénérer » (regenerateClassBulletins) relance le calcul et remet stale=false.
 */

type ActionResult = { success: boolean; error: boolean; message: string };

/** Une période impactée par un changement de coefficient. */
export type ImpactedPeriod = {
  semesterId: number;
  semesterName: string;
  bulletins: number; // nb de ResultAverage (= bulletins persistés) de la classe
};

export type CoefficientUpdateResult = ActionResult & {
  /** true : rien n'a été écrit, l'UI doit demander une confirmation explicite. */
  requiresConfirmation?: boolean;
  impactedPeriods?: ImpactedPeriod[];
  totalBulletins?: number;
};

/** Classe de l'école de la session (null si étrangère/inexistante). */
const ownedClass = async (schoolId: number, classId: number) =>
  prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: {
      id: true,
      name: true,
      schoolYearId: true,
      evaluationSystem: true,
    },
  });

/**
 * ResultAverage impactés par un changement de coefficient dans la classe :
 * ceux des élèves inscrits dans la classe, sur TOUTES les périodes de l'année
 * de la classe (la classe appartient à UNE année, W02). Groupés par période.
 */
const impactedAverages = async (classId: number, schoolYearId: number) => {
  const rows = await prisma.resultAverage.findMany({
    where: {
      semester: { schoolYearId },
      student: { enrollments: { some: { classId } } },
    },
    select: {
      id: true,
      semesterId: true,
      semester: { select: { name: true, label: true } },
    },
  });
  const byPeriod = new Map<number, ImpactedPeriod>();
  for (const r of rows) {
    const entry = byPeriod.get(r.semesterId);
    if (entry) entry.bulletins += 1;
    else
      byPeriod.set(r.semesterId, {
        semesterId: r.semesterId,
        semesterName: r.semester.label ?? r.semester.name,
        bulletins: 1,
      });
  }
  return {
    ids: rows.map((r) => r.id),
    periods: [...byPeriod.values()].sort((a, b) => a.semesterId - b.semesterId),
  };
};

/** Marque stale=true les ResultAverage impactés (ids déjà scopés classe/année). */
const markStale = (ids: number[]) =>
  ids.length > 0
    ? prisma.resultAverage.updateMany({
        where: { id: { in: ids } },
        data: { stale: true },
      })
    : Promise.resolve({ count: 0 });

/** Ajoute une matière à la classe (avec son coefficient). */
export const addClassSubject = async (
  currentState: ActionResult,
  data: ClassSubjectSchema
): Promise<ActionResult> => {
  try {
    const { schoolId, userId } = await requireSchool(["admin", "director"]);
    const parsed = classSubjectSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const [klass, subject] = await Promise.all([
      ownedClass(schoolId, parsed.data.classId),
      prisma.subject.findFirst({
        where: { id: parsed.data.subjectId, schoolId },
        select: { id: true, name: true },
      }),
    ]);
    if (!klass)
      return { success: false, error: true, message: "Classe introuvable dans votre établissement." };
    if (!subject)
      return { success: false, error: true, message: "Matière introuvable dans votre établissement." };

    const existing = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: klass.id,
          subjectId: subject.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return {
        success: false,
        error: true,
        message: "Cette matière est déjà rattachée à la classe.",
      };
    }

    await prisma.classSubject.create({
      data: {
        classId: klass.id,
        subjectId: subject.id,
        coefficient: parsed.data.coefficient,
      },
    });

    // Un ajout à coefficient ≠ 1 change la pondération de matières déjà notées
    // (une matière SANS ligne comptait pour 1) → bulletins existants périmés.
    if (parsed.data.coefficient !== 1 && klass.evaluationSystem !== "MONTHLY") {
      const { ids } = await impactedAverages(klass.id, klass.schoolYearId);
      const { count } = await markStale(ids);
      if (count > 0) {
        // TODO W10 — journal d'audit : coefficient.create (before/after, userId)
        console.log(
          `[W08] coefficient.create ${klass.name}/${subject.name}=${parsed.data.coefficient} par ${userId} — ${count} bulletin(s) marqués à régénérer`
        );
      }
    }

    revalidatePath(`/list/classes/${klass.id}/subjects`);
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};

/**
 * Modifie le coefficient d'une matière de la classe — règle critique §2.1.6.
 * 1er temps (confirmed=false) : si des bulletins existent, retourne la liste
 * des périodes impactées SANS rien écrire (requiresConfirmation=true).
 * 2e temps (confirmed=true) : met à jour le coefficient + stale=true.
 */
export const updateCoefficient = async (
  currentState: ActionResult,
  data: ClassSubjectSchema & { confirmed?: boolean }
): Promise<CoefficientUpdateResult> => {
  try {
    const { schoolId, userId, role } = await requireSchool(["admin", "director"]);
    const parsed = classSubjectSchema.safeParse(data);
    if (!parsed.success || !parsed.data.id) {
      return { success: false, error: true, message: "Données invalides." };
    }

    // La ligne doit exister ET appartenir à une classe de l'école de la session
    const line = await prisma.classSubject.findFirst({
      where: { id: parsed.data.id, class: { schoolId } },
      select: {
        id: true,
        coefficient: true,
        subject: { select: { name: true } },
        class: {
          select: {
            id: true,
            name: true,
            schoolYearId: true,
            evaluationSystem: true,
          },
        },
      },
    });
    if (!line) {
      return {
        success: false,
        error: true,
        message: "Matière introuvable dans votre établissement.",
      };
    }

    if (line.coefficient === parsed.data.coefficient) {
      return { success: true, error: false, message: "" };
    }

    // Bulletins impactés : uniquement en régime pondéré (MONTHLY ne pondère
    // pas, §2.3.1 système 1 — le coefficient n'affecte aucun bulletin).
    const weighted = line.class.evaluationSystem !== "MONTHLY";
    const impact = weighted
      ? await impactedAverages(line.class.id, line.class.schoolYearId)
      : { ids: [], periods: [] };

    // 1er temps : bulletins existants + pas encore confirmé → preview seulement.
    if (impact.ids.length > 0 && !data.confirmed) {
      return {
        success: false,
        error: false,
        message: "",
        requiresConfirmation: true,
        impactedPeriods: impact.periods,
        totalBulletins: impact.ids.length,
      };
    }

    // 2e temps (ou aucun bulletin existant) : écriture + marquage stale.
    await prisma.$transaction(async (tx) => {
      await tx.classSubject.update({
        where: { id: line.id },
        data: { coefficient: parsed.data.coefficient },
      });
      if (impact.ids.length > 0) {
        await tx.resultAverage.updateMany({
          where: { id: { in: impact.ids } },
          data: { stale: true },
        });
      }
    });

    // TODO W10 — journal d'audit : coefficient.update (before/after, reason)
    console.log(
      `[W08] coefficient.update ${line.class.name}/${line.subject.name} : ${line.coefficient} → ${parsed.data.coefficient} par ${userId} (${role}) — ${impact.ids.length} bulletin(s) marqués à régénérer`
    );

    revalidatePath(`/list/classes/${line.class.id}/subjects`);
    return {
      success: true,
      error: false,
      message:
        impact.ids.length > 0
          ? `Coefficient mis à jour — ${impact.ids.length} bulletin(s) à régénérer.`
          : "",
    };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};

/** Retire une matière de la classe (la matière retombe à coefficient 1). */
export const removeClassSubject = async (
  currentState: ActionResult,
  data: FormData
): Promise<ActionResult> => {
  const id = parseInt(data.get("id") as string);
  try {
    const { schoolId, userId } = await requireSchool(["admin", "director"]);
    if (Number.isNaN(id)) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const line = await prisma.classSubject.findFirst({
      where: { id, class: { schoolId } },
      select: {
        id: true,
        coefficient: true,
        subject: { select: { name: true } },
        class: {
          select: {
            id: true,
            name: true,
            schoolYearId: true,
            evaluationSystem: true,
          },
        },
      },
    });
    if (!line) {
      return {
        success: false,
        error: true,
        message: "Matière introuvable dans votre établissement.",
      };
    }

    await prisma.classSubject.delete({ where: { id: line.id } });

    // Retirer une ligne à coefficient ≠ 1 ramène la matière à 1 (fallback) →
    // les bulletins existants d'un régime pondéré sont périmés.
    if (line.coefficient !== 1 && line.class.evaluationSystem !== "MONTHLY") {
      const { ids } = await impactedAverages(
        line.class.id,
        line.class.schoolYearId
      );
      const { count } = await markStale(ids);
      if (count > 0) {
        // TODO W10 — journal d'audit : coefficient.delete
        console.log(
          `[W08] coefficient.delete ${line.class.name}/${line.subject.name} (coef ${line.coefficient}) par ${userId} — ${count} bulletin(s) marqués à régénérer`
        );
      }
    }

    revalidatePath(`/list/classes/${line.class.id}/subjects`);
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};

/**
 * Régénère les bulletins périmés de la classe : pour chaque période de l'année
 * de la classe ayant au moins un ResultAverage stale, relance le calcul complet
 * (buildClassReportCards — moyennes pondérées + rangs persistés) puis remet
 * stale=false pour les élèves de la classe.
 */
export const regenerateClassBulletins = async (
  currentState: ActionResult,
  data: FormData
): Promise<ActionResult> => {
  const classId = parseInt(data.get("classId") as string);
  try {
    const { schoolId, userId } = await requireSchool(["admin", "director"]);
    if (Number.isNaN(classId)) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const klass = await ownedClass(schoolId, classId);
    if (!klass) {
      return {
        success: false,
        error: true,
        message: "Classe introuvable dans votre établissement.",
      };
    }

    // Périodes de l'année de la classe avec des bulletins périmés
    const staleRows = await prisma.resultAverage.findMany({
      where: {
        stale: true,
        semester: { schoolYearId: klass.schoolYearId },
        student: { enrollments: { some: { classId: klass.id } } },
      },
      select: { semesterId: true },
      distinct: ["semesterId"],
    });
    if (staleRows.length === 0) {
      return {
        success: true,
        error: false,
        message: "Aucun bulletin à régénérer pour cette classe.",
      };
    }

    let regenerated = 0;
    for (const { semesterId } of staleRows) {
      // Recalcul complet (moyennes pondérées avec les coefficients ACTUELS)
      const cards = await buildClassReportCards(klass.id, semesterId);
      regenerated += cards.size;
      // Le recalcul a réécrit les averages : les bulletins ne sont plus périmés
      await prisma.resultAverage.updateMany({
        where: {
          semesterId,
          student: { enrollments: { some: { classId: klass.id } } },
        },
        data: { stale: false },
      });
    }

    // TODO W10 — journal d'audit : reportCard.regenerate
    console.log(
      `[W08] reportCard.regenerate ${klass.name} par ${userId} — ${staleRows.length} période(s) recalculée(s)`
    );

    revalidatePath(`/list/classes/${klass.id}/subjects`);
    revalidatePath("/list/exams");
    return {
      success: true,
      error: false,
      message: `Bulletins régénérés : ${regenerated} bulletin(s) sur ${staleRows.length} période(s).`,
    };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};
