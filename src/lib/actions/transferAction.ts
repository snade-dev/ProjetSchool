"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireSchool, requireRole } from "../authGuard";
import { auditWithSession } from "../audit";
import { getActiveSchoolYear } from "../schoolYear";
import { deleteErrorMessage } from "../actionErrors";
import { nextCertificateReference } from "../transferCertificate";
import { buildAnnualReport } from "../annualReport";
import { Prisma } from "@/app/generated/prisma";
import { TransferCertificateSchema } from "../formsValidationSchema";

/**
 * X08 — Émission d'un certificat de transfert (§2.1.3).
 *
 * L'émission :
 *  1. FIGE les valeurs du document (classe, dates de fréquentation, moyenne
 *     annuelle, rang, nombre d'années) — un certificat déjà remis ne doit pas
 *     bouger si une note est corrigée ensuite ;
 *  2. marque l'inscription de l'année en TRANSFERRED (W03) ;
 *  3. journalise `document.transfer_certificate` (W10) ;
 *  4. clôt éventuellement la demande d'origine du module « Demandes ».
 *
 * Émetteurs : direction uniquement (document signé par le chef d'établissement).
 */

type CurrentState = { success: boolean; error: boolean };
type DeleteState = { success: boolean; error: boolean; message?: string };

export const issueTransferCertificate = async (
  currentState: CurrentState,
  data: TransferCertificateSchema
) => {
  try {
    const session = await requireSchool(["admin", "director"]);
    const { schoolId } = session;
    const activeYear = await getActiveSchoolYear(schoolId);

    // Inscription de l'année active : elle porte la classe et le bilan annuel.
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_schoolYearId: {
          studentId: data.studentId,
          schoolYearId: activeYear.id,
        },
      },
      select: {
        id: true,
        conduct: true,
        workAppreciation: true,
        annualDecision: true,
        class: { select: { name: true, schoolId: true } },
      },
    });
    if (!enrollment || enrollment.class.schoolId !== schoolId) {
      return { success: false, error: true };
    }

    // Ancienneté : toutes les inscriptions de l'élève, la plus ancienne donne
    // le début de fréquentation (début de SON année scolaire).
    const allEnrollments = await prisma.enrollment.findMany({
      where: { studentId: data.studentId },
      select: { schoolYear: { select: { startDate: true, endDate: true } } },
      orderBy: { schoolYear: { startDate: "asc" } },
    });
    const attendedFrom =
      allEnrollments[0]?.schoolYear.startDate ?? activeYear.startDate;
    const attendedTo = data.attendedTo ?? activeYear.endDate;

    // Moyenne annuelle + rang figés (null si les bulletins ne sont pas générés).
    const annual = await buildAnnualReport(data.studentId, activeYear.id);

    const writeCertificate = async () =>
      prisma.$transaction(async (tx) => {
        const reference = await nextCertificateReference(tx);
        const created = await tx.transferCertificate.create({
          data: {
            schoolId,
            reference,
            studentId: data.studentId,
            schoolYearId: activeYear.id,
            className: enrollment.class.name,
            attendedFrom,
            attendedTo,
            yearsAttended: allEnrollments.length,
            annualAverage: annual?.annualAverage ?? null,
            annualRank: annual?.rank ?? null,
            classSize: annual?.gradedStudentCount ?? null,
            // Le bilan annuel sert de valeur par défaut : le formulaire peut
            // l'écraser au moment d'éditer le certificat.
            conduct: data.conduct ?? enrollment.conduct,
            workAppreciation:
              data.workAppreciation ?? enrollment.workAppreciation,
            decision: data.decision || enrollment.annualDecision,
            reason: data.reason,
            attestationId: data.attestationId || null,
            issuedById: session.userId,
          },
        });

        // W03 — l'inscription de l'année reflète l'ISSUE de l'année pour l'élève.
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: { status: "TRANSFERRED" },
        });

        // Le certificat clôt la demande d'origine (module « Demandes »).
        if (data.attestationId) {
          await tx.attestation.updateMany({
            where: { id: data.attestationId, student: { schoolId } },
            data: { status: "COMPLETED", resolvedDate: new Date() },
          });
        }

        return created;
      });

    let certificate;
    try {
      certificate = await writeCertificate();
    } catch (err) {
      // Collision de référence sous concurrence → une relance suffit.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        certificate = await writeCertificate();
      } else {
        throw err;
      }
    }

    await auditWithSession(
      session,
      "document.transfer_certificate",
      `TransferCertificate#${certificate.id}`,
      {
        after: {
          reference: certificate.reference,
          studentId: data.studentId,
          className: enrollment.class.name,
          reason: data.reason,
          annualAverage: certificate.annualAverage,
        },
        reason: data.reason,
      }
    );

    revalidatePath(`/list/students/${data.studentId}`);
    revalidatePath("/list/demande");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/**
 * Annulation d'un certificat émis par erreur. L'inscription repasse ACTIVE
 * (l'élève n'a finalement pas été transféré) ; l'audit garde la trace.
 */
export const deleteTransferCertificate = async (
  currentState: DeleteState,
  data: FormData
): Promise<DeleteState> => {
  const id = data.get("id") as string;
  try {
    const session = await requireRole(["admin", "director"]);

    const before = await prisma.transferCertificate.findUnique({
      where: { id },
      select: {
        reference: true,
        studentId: true,
        schoolYearId: true,
        schoolId: true,
      },
    });
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true, message: "Certificat introuvable." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.transferCertificate.delete({ where: { id } });
      await tx.enrollment.updateMany({
        where: {
          studentId: before.studentId,
          schoolYearId: before.schoolYearId,
          status: "TRANSFERRED",
        },
        data: { status: "ACTIVE" },
      });
    });

    await auditWithSession(
      session,
      "document.transfer_certificate_delete",
      `TransferCertificate#${id}`,
      {
        before: {
          reference: before.reference,
          studentId: before.studentId,
        },
      }
    );

    revalidatePath(`/list/students/${before.studentId}`);
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
