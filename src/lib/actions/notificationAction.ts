"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getSessionInfo } from "../authGuard";
import { isNotificationType } from "../notificationTypes";

/**
 * W12 — actions sur MES notifications : tout est scopé sur le user de la
 * session (le where inclut toujours userId — impossible de marquer lue la
 * notification d'un autre compte, même avec un id forgé).
 */

type ActionState = { success: boolean; error: boolean };

const revalidateNotificationViews = () => {
  revalidatePath("/list/notifications");
  // La cloche (Navbar) vit dans les layouts dashboard et plateforme.
  revalidatePath("/", "layout");
};

/** Marque UNE de mes notifications comme lue (idempotent). */
export const markNotificationRead = async (
  id: number
): Promise<ActionState> => {
  try {
    const info = await getSessionInfo();
    if (!info) return { success: false, error: true };

    await prisma.notification.updateMany({
      where: { id: Number(id), userId: info.userId, readAt: null },
      data: { readAt: new Date() },
    });

    revalidateNotificationViews();
    return { success: true, error: false };
  } catch (err) {
    console.error("markNotificationRead:", err);
    return { success: false, error: true };
  }
};

/** Marque TOUTES mes notifications comme lues. */
export const markAllNotificationsRead = async (): Promise<ActionState> => {
  try {
    const info = await getSessionInfo();
    if (!info) return { success: false, error: true };

    await prisma.notification.updateMany({
      where: { userId: info.userId, readAt: null },
      data: { readAt: new Date() },
    });

    revalidateNotificationViews();
    return { success: true, error: false };
  } catch (err) {
    console.error("markAllNotificationsRead:", err);
    return { success: false, error: true };
  }
};

/**
 * Active/désactive UN type de notification pour MON compte.
 * Absence de ligne = activé : on upserte la ligne avec la valeur choisie
 * (garder la ligne enabled=true est inoffensif et évite les deletes).
 * W13 — `channel` : "inapp" (colonne enabled) ou "email" (colonne
 * emailEnabled) ; les deux canaux sont indépendants.
 */
export const setNotificationPreference = async (
  type: string,
  enabled: boolean,
  channel: "inapp" | "email" = "inapp"
): Promise<ActionState> => {
  try {
    const info = await getSessionInfo();
    if (!info) return { success: false, error: true };
    if (!isNotificationType(type)) return { success: false, error: true };

    const column =
      channel === "email" ? { emailEnabled: !!enabled } : { enabled: !!enabled };
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: info.userId, type } },
      update: column,
      // Ligne absente = les deux canaux actifs : la création ne fixe que la
      // colonne touchée, l'autre garde son défaut (true).
      create: { userId: info.userId, type, ...column },
    });

    revalidatePath("/account");
    return { success: true, error: false };
  } catch (err) {
    console.error("setNotificationPreference:", err);
    return { success: false, error: true };
  }
};
