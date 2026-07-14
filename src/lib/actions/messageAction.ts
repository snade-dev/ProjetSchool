"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { messageSchema, MessageSchema } from "../formsValidationSchema";
import {
  canMessage,
  DIRECTION_ROLES,
  MESSAGING_ROLES,
} from "../messaging";
import { notify } from "../notify";
import { auditWithSession } from "../audit";

/**
 * W16 — actions de la messagerie interne (§2.6.5).
 * TOUTES les vérifications de mise en relation sont côté serveur via
 * canMessage() — l'UI ne fait que refléter. Rôles école uniquement (le
 * superadmin n'a pas de messagerie : elle est intra-école).
 */

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

/** Envoi d'un message 1-à-1 (+ notification MESSAGE au destinataire, W12). */
export const sendMessage = async (
  currentState: CurrentState,
  data: MessageSchema
): Promise<CurrentState> => {
  try {
    const session = await requireSchool([...MESSAGING_ROLES]);

    const parsed = messageSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Message invalide." };
    }
    const { receiverId, content, fileUrl } = parsed.data;

    // Règles de mise en relation §2.6.5 — codées en dur, côté serveur.
    const allowed = await canMessage(
      { id: session.userId, role: session.role, schoolId: session.schoolId },
      receiverId
    );
    if (!allowed) {
      return {
        success: false,
        error: true,
        message:
          "Vous n'êtes pas autorisé à écrire à ce destinataire (règles de mise en relation de l'établissement).",
      };
    }

    await prisma.message.create({
      data: {
        schoolId: session.schoolId,
        senderId: session.userId,
        receiverId,
        content,
        fileUrl: fileUrl || null,
      },
    });

    // W12 — cloche du destinataire : lien direct vers le fil avec l'expéditeur.
    const sender = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    await notify([receiverId], {
      schoolId: session.schoolId,
      type: "MESSAGE",
      title: `Nouveau message de ${sender?.name ?? "un membre de l'école"}`,
      body: content.length > 140 ? `${content.slice(0, 140)}…` : content,
      link: `/list/messages/${session.userId}`,
    });

    revalidatePath("/list/messages");
    revalidatePath(`/list/messages/${receiverId}`);
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur sendMessage:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'envoi du message.",
    };
  }
};

/**
 * Signalement d'un fil (§2.6.5 « signalement possible du harcèlement ») :
 * notifie les admin/director de l'école (titre explicite) + entrée d'audit
 * `message.report`. Pas d'autre workflow en V1.
 */
export const reportThread = async (
  otherUserId: string,
  reason: string
): Promise<CurrentState> => {
  try {
    const session = await requireSchool([...MESSAGING_ROLES]);
    const otherId = String(otherUserId ?? "").trim();
    if (!otherId || otherId === session.userId) {
      return { success: false, error: true, message: "Fil invalide." };
    }

    // Le fil doit exister (on signale une conversation, pas un compte).
    const exists = await prisma.message.findFirst({
      where: {
        schoolId: session.schoolId,
        OR: [
          { senderId: session.userId, receiverId: otherId },
          { senderId: otherId, receiverId: session.userId },
        ],
      },
      select: { id: true },
    });
    if (!exists) {
      return { success: false, error: true, message: "Fil introuvable." };
    }

    const [me, other, direction] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true },
      }),
      prisma.user.findUnique({ where: { id: otherId }, select: { name: true } }),
      prisma.userSchoolMembership.findMany({
        where: {
          schoolId: session.schoolId,
          active: true,
          role: { in: [...DIRECTION_ROLES] },
        },
        select: { userId: true },
      }),
    ]);

    const trimmedReason = reason?.trim() ? reason.trim().slice(0, 1000) : null;

    // W10 — trace du signalement (entité = le couple d'utilisateurs).
    await auditWithSession(
      session,
      "message.report",
      `Message:${session.userId}<->${otherId}`,
      {
        after: {
          reportedBy: me?.name ?? session.userId,
          conversationWith: other?.name ?? otherId,
        },
        reason: trimmedReason,
      }
    );

    // Notification explicite à la direction, lien vers la supervision du fil.
    await notify(
      direction.map((d) => d.userId).filter((id) => id !== session.userId),
      {
        schoolId: session.schoolId,
        type: "MESSAGE",
        title: "Signalement d'une conversation (messagerie)",
        body: `${me?.name ?? "Un utilisateur"} signale sa conversation avec ${
          other?.name ?? "un autre utilisateur"
        }.${trimmedReason ? ` Motif : ${trimmedReason}` : ""}`,
        link: `/list/messages/supervision?a=${session.userId}&b=${otherId}`,
      }
    );

    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur reportThread:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors du signalement.",
    };
  }
};

/**
 * Toggle /settings (admin) : messagerie élève↔enseignant (§2.6.5 « optionnel,
 * désactivable par l'école »). Changement de paramètre audité.
 */
export const updateStudentMessaging = async (
  enabled: boolean
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(["admin"]);
    const next = !!enabled;

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { studentMessagingEnabled: true },
    });
    if (!school) {
      return { success: false, error: true, message: "École introuvable." };
    }
    if (school.studentMessagingEnabled === next) {
      return { success: true, error: false };
    }

    await prisma.school.update({
      where: { id: session.schoolId },
      data: { studentMessagingEnabled: next },
    });

    await auditWithSession(
      session,
      "school.studentMessaging",
      `School#${session.schoolId}`,
      {
        before: { studentMessagingEnabled: school.studentMessagingEnabled },
        after: { studentMessagingEnabled: next },
      }
    );

    revalidatePath("/settings");
    revalidatePath("/list/messages");
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur updateStudentMessaging:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la mise à jour du paramètre.",
    };
  }
};
