import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BellRing, CalendarDays, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import ChangePasswordForm from "./ChangePasswordForm";
import NotificationPreferences from "./NotificationPreferences";
import {
  isNotificationType,
  type NotificationType,
} from "@/lib/notificationTypes";

// Page « Mon compte » : identité du compte connecté + changement de mot de passe.
// Accessible à tous les rôles ; les infos d'état civil viennent de la fiche
// métier correspondante (enseignant / élève / parent) quand elle existe.

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  director: "Direction", // W07
  teacher: "Enseignant",
  accountant: "Comptable", // W07
  supervisor: "Surveillant général", // W07
  student: "Élève",
  parent: "Parent",
  user: "Compte en attente de rôle",
};

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { user } = session;
  const role = user.role ?? "user";

  // Fiche métier liée (même id que le compte) : photo, téléphone, adresse…
  let profile: {
    name?: string;
    surname?: string;
    phone?: string | null;
    address?: string | null;
    img?: string | null;
  } | null = null;
  try {
    if (role === "teacher") {
      profile = await prisma.teacher.findUnique({
        where: { id: user.id },
        select: { name: true, surname: true, phone: true, address: true, img: true },
      });
    } else if (role === "student") {
      profile = await prisma.student.findUnique({
        where: { id: user.id },
        select: { name: true, surname: true, phone: true, address: true, img: true },
      });
    } else if (role === "parent") {
      profile = await prisma.parent.findUnique({
        where: { id: user.id },
        select: { name: true, surname: true, phone: true, address: true },
      });
    }
  } catch {
    profile = null;
  }

  const displayName = profile
    ? `${profile.name ?? ""} ${profile.surname ?? ""}`.trim() || user.name
    : user.name;
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // W12 — préférences de notification du compte (absence de ligne = activé)
  let notificationPrefs: Partial<Record<NotificationType, boolean>> = {};
  try {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
      select: { type: true, enabled: true },
    });
    for (const row of rows) {
      if (isNotificationType(row.type)) notificationPrefs[row.type] = row.enabled;
    }
  } catch {
    notificationPrefs = {};
  }

  return (
    <div className="m-4 mt-0 flex flex-1 flex-col gap-4">
      {/* Carte identité */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="drawer-hero-bg relative px-6 py-6 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-2 top-1/2 grid h-24 w-24 -translate-y-1/2 rotate-[-14deg] place-items-center rounded-full border-2 border-dashed border-white/25 p-2 text-center text-[8px] uppercase leading-relaxed tracking-[0.18em] text-white/40"
          >
            LS School · compte
          </div>
          <div className="flex items-center gap-4">
            {"img" in (profile ?? {}) && profile?.img ? (
              <Image
                src={profile.img}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border-2 border-white/60 object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 flex-none place-items-center rounded-full border-2 border-dashed border-white/50 bg-white/15 text-lg font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-snug">{displayName}</h1>
              <span className="mt-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Mail size={16} className="mt-0.5 flex-none text-gray-400" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Adresse e-mail (identifiant de connexion)
              </div>
              <div className="text-sm text-gray-800">{user.email}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays size={16} className="mt-0.5 flex-none text-gray-400" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Compte créé le
              </div>
              <div className="text-sm text-gray-800">{memberSince}</div>
            </div>
          </div>
          {profile?.phone && (
            <div className="flex items-start gap-3">
              <Phone size={16} className="mt-0.5 flex-none text-gray-400" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Téléphone
                </div>
                <div className="text-sm text-gray-800">{profile.phone}</div>
              </div>
            </div>
          )}
          {profile?.address && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 flex-none text-gray-400" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Adresse
                </div>
                <div className="text-sm text-gray-800">{profile.address}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* W12 — Préférences de notification */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <BellRing size={18} className="text-theme-deep" />
          <h2 className="text-base font-semibold text-gray-800">Notifications</h2>
        </div>
        <p className="mb-2 max-w-xl text-sm text-gray-500">
          Choisissez les types de notifications que vous souhaitez recevoir
          dans l&apos;application. Tout est activé par défaut.
        </p>
        <NotificationPreferences initial={notificationPrefs} />
      </div>

      {/* Sécurité */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-theme-deep" />
          <h2 className="text-base font-semibold text-gray-800">Sécurité</h2>
        </div>
        <p className="mb-5 max-w-xl text-sm text-gray-500">
          Changez votre mot de passe ici. Après le changement, vos sessions sur
          les autres appareils seront déconnectées.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
