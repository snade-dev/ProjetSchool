"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { auditDiff, auditWithSession } from "../audit";
import {
  appBaseUrl,
  escapeHtml,
  renderEmail,
  resolveEmailConfig,
  sendWithConfig,
} from "../email";
import { buildReportCard } from "../reportCard";
import { renderBulletinPdfBuffer } from "../pdfBuffers";
import {
  smtpSettingsSchema,
  type SmtpSettingsSchema,
} from "../formsValidationSchema";

/**
 * W13 — actions du canal email : config SMTP de l'école (/settings),
 * email de test, envoi du bulletin PDF aux tuteurs (fiche élève).
 * Toutes scopées école (requireSchool) ; le mot de passe SMTP est WRITE-ONLY
 * (jamais relu par le client, jamais journalisé).
 */

type ActionState = { success: boolean; error: boolean; message?: string };

// ---- Config SMTP de l'école -------------------------------------------------

export const updateSmtpSettings = async (
  _currentState: ActionState,
  data: SmtpSettingsSchema
): Promise<ActionState> => {
  try {
    const session = await requireSchool(["admin"]);
    const parsed = smtpSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }
    const d = parsed.data;

    const before = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: {
        emailEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpFrom: true,
        smtpPass: true,
      },
    });
    if (!before) {
      return { success: false, error: true, message: "École introuvable." };
    }

    const next = {
      emailEnabled: !!d.emailEnabled,
      smtpHost: d.smtpHost || null,
      smtpPort:
        d.smtpPort === "" || d.smtpPort === undefined ? null : d.smtpPort,
      smtpUser: d.smtpUser || null,
      smtpFrom: d.smtpFrom || null,
    };
    // WRITE-ONLY : champ vide = mot de passe INCHANGÉ.
    const passwordChanged = !!d.smtpPass;

    await prisma.school.update({
      where: { id: session.schoolId },
      data: { ...next, ...(passwordChanged ? { smtpPass: d.smtpPass } : {}) },
    });

    // W10 — audit SANS le mot de passe (ni avant, ni après) : seul un drapeau
    // signale qu'il a été remplacé.
    const diff = auditDiff(
      {
        emailEnabled: before.emailEnabled,
        smtpHost: before.smtpHost,
        smtpPort: before.smtpPort,
        smtpUser: before.smtpUser,
        smtpFrom: before.smtpFrom,
      },
      next
    );
    if (diff.changed || passwordChanged) {
      await auditWithSession(
        session,
        "school.smtp.update",
        `School#${session.schoolId}`,
        {
          before: diff.before,
          after: { ...diff.after, ...(passwordChanged ? { passwordChanged: true } : {}) },
        }
      );
    }

    revalidatePath("/settings");
    return { success: true, error: false, message: "Configuration email enregistrée." };
  } catch (err) {
    console.error("updateSmtpSettings:", err);
    return { success: false, error: true, message: "Erreur lors de l'enregistrement." };
  }
};

// ---- Email de test ----------------------------------------------------------

/**
 * Envoie un email de test à l'adresse de l'ADMIN CONNECTÉ avec la config
 * effective (école → plateforme). Retourne un message affichable.
 */
export const sendTestEmail = async (): Promise<ActionState> => {
  try {
    const session = await requireSchool(["admin"]);

    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (!me?.email) {
      return {
        success: false,
        error: true,
        message: "Votre compte n'a pas d'adresse email.",
      };
    }

    const config = await resolveEmailConfig(session.schoolId);
    if (!config) {
      return {
        success: false,
        error: true,
        message:
          "Aucune configuration SMTP : ni l'école ni la plateforme n'ont de serveur email. Les notifications restent in-app.",
      };
    }

    const res = await sendWithConfig(session.schoolId, config, {
      to: me.email,
      subject: "Email de test — configuration SMTP",
      html: renderEmail(
        "Email de test",
        `<p>Cet email confirme que la configuration SMTP ${
          config.source === "school"
            ? "de votre établissement"
            : "de la plateforme (utilisée par défaut)"
        } fonctionne.</p><p>Serveur : ${escapeHtml(config.host)}:${config.port}</p>`,
        { name: config.schoolName }
      ),
    });

    return res.sent
      ? {
          success: true,
          error: false,
          message: `Email de test envoyé à ${me.email} (serveur ${
            config.source === "school" ? "de l'école" : "de la plateforme"
          }).`,
        }
      : {
          success: false,
          error: true,
          message: `Échec de l'envoi : ${res.error ?? "erreur inconnue"}`,
        };
  } catch (err) {
    console.error("sendTestEmail:", err);
    return { success: false, error: true, message: "Erreur lors de l'envoi du test." };
  }
};

// ---- Bulletin PDF par email aux tuteurs --------------------------------------

/**
 * Envoie LE bulletin PDF d'UN élève (période choisie) aux tuteurs
 * canViewGrades ayant un email et le canal email actif pour REPORT_CARD.
 * Action EXPLICITE (bouton fiche élève, admin/director) — c'est le seul envoi
 * de bulletin en pièce jointe (la régénération de masse n'envoie qu'un lien).
 */
export const emailReportCardToGuardians = async (
  _currentState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const session = await requireSchool(["admin", "director"]);
    const studentId = formData.get("studentId") as string;
    const semesterId = parseInt(formData.get("semesterId") as string);
    if (!studentId || Number.isNaN(semesterId)) {
      return { success: false, error: true, message: "Données invalides." };
    }

    // Propriété : l'élève appartient à l'école de la session.
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      select: {
        id: true,
        name: true,
        surname: true,
        guardians: {
          where: { canViewGrades: true },
          select: { parentId: true },
        },
      },
    });
    if (!student) {
      return {
        success: false,
        error: true,
        message: "Élève introuvable dans votre établissement.",
      };
    }

    const config = await resolveEmailConfig(session.schoolId);
    if (!config) {
      return {
        success: false,
        error: true,
        message:
          "Aucune configuration SMTP (école ou plateforme) : configurez l'email dans Paramètres.",
      };
    }

    const reportCard = await buildReportCard(studentId, semesterId);
    if (!reportCard) {
      return {
        success: false,
        error: true,
        message: "Bulletin indisponible pour cette période.",
      };
    }

    // Destinataires : tuteurs canViewGrades + email sur le compte + canal
    // email actif pour REPORT_CARD (absence de ligne = actif).
    const parentIds = [...new Set(student.guardians.map((g) => g.parentId))];
    if (parentIds.length === 0) {
      return { success: false, error: true, message: "Aucun tuteur autorisé (droit « notes »)." };
    }
    const [users, disabled] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, email: true },
      }),
      prisma.notificationPreference.findMany({
        where: {
          userId: { in: parentIds },
          type: "REPORT_CARD",
          emailEnabled: false,
        },
        select: { userId: true },
      }),
    ]);
    const off = new Set(disabled.map((d) => d.userId));
    const recipients = users.filter((u) => u.email && !off.has(u.id));
    if (recipients.length === 0) {
      return {
        success: false,
        error: true,
        message:
          "Aucun destinataire : les tuteurs n'ont pas d'email ou ont désactivé le canal email.",
      };
    }

    const pdf = await renderBulletinPdfBuffer(reportCard);
    const sanitize = (s: string) => s.replace(/\s+/g, "_");
    const attachment = {
      filename: `bulletin_${sanitize(student.surname)}_${sanitize(student.name)}_${sanitize(
        reportCard.semester.name
      )}.pdf`,
      content: pdf,
      contentType: "application/pdf",
    };
    const html = renderEmail(
      reportCard.semester.title,
      `<p>Veuillez trouver en pièce jointe le bulletin de ${escapeHtml(
        `${student.name} ${student.surname}`
      )} — ${escapeHtml(reportCard.semester.name)} (classe ${escapeHtml(
        reportCard.className
      )}).</p><p><a href="${appBaseUrl()}/list/students/${student.id}?semesterId=${semesterId}" style="display:inline-block;background:#C3EBFA;color:#111;padding:8px 16px;border-radius:6px;text-decoration:none">Consulter dans l'application</a></p>`,
      { name: config.schoolName }
    );

    let sent = 0;
    for (const r of recipients) {
      const res = await sendWithConfig(session.schoolId, config, {
        to: r.email,
        subject: `${reportCard.semester.title} — ${student.name} ${student.surname}`,
        html,
        attachments: [attachment],
      });
      if (res.sent) sent++;
    }

    await auditWithSession(session, "reportCard.email", `Student#${student.id}`, {
      after: {
        periode: reportCard.semester.name,
        destinataires: recipients.length,
        envoyes: sent,
      },
    });

    if (sent === 0) {
      return {
        success: false,
        error: true,
        message: "Aucun email n'a pu être envoyé (voir le journal).",
      };
    }
    return {
      success: true,
      error: false,
      message: `Bulletin envoyé par email à ${sent} tuteur(s) sur ${recipients.length}.`,
    };
  } catch (err) {
    console.error("emailReportCardToGuardians:", err);
    return { success: false, error: true, message: "Erreur lors de l'envoi du bulletin." };
  }
};
