import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { Eye, MessageSquare } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sessionSchoolId } from "@/lib/authGuard";
import {
  allowedCorrespondents,
  isMessagingRole,
  studentMessagingEnabled,
  threadsFor,
} from "@/lib/messaging";
import { SPACE_ROLE_LABELS } from "@/lib/membership";
import NewMessageButton from "./NewMessageButton";

/**
 * W16 — Boîte de réception (§2.6.5) : un fil par correspondant, dernier
 * message, badge non-lus, tri par dernier échange. « Nouveau message » ouvre
 * un sélecteur de destinataires AUTORISÉS (liste construite server-side par
 * allowedCorrespondents — l'UI ne fait que refléter les règles).
 */

const fmtLastAt = (d: Date) => {
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(d)
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(d);
};

const MessagesPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const role = session.user.role ?? "";
  const userId = session.user.id;
  const schoolId = sessionSchoolId(session);

  // Défense en profondeur : la messagerie est intra-école (pas superadmin).
  if (!isMessagingRole(role) || schoolId === -1) return notFound();

  const me = { id: userId, role, schoolId };
  const [threads, correspondents, studentToggle] = await Promise.all([
    threadsFor(userId),
    allowedCorrespondents(me),
    studentMessagingEnabled(schoolId),
  ]);

  // Noms + rôle (dans MON école) des correspondants existants.
  const otherIds = threads.map((t) => t.otherId);
  const [others, otherMemberships] = await Promise.all([
    otherIds.length
      ? prisma.user.findMany({
          where: { id: { in: otherIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    otherIds.length
      ? prisma.userSchoolMembership.findMany({
          where: { userId: { in: otherIds }, schoolId, active: true },
          select: { userId: true, role: true },
        })
      : Promise.resolve([]),
  ]);
  const nameOf = new Map(others.map((u) => [u.id, u.name]));
  const roleOf = new Map<string, string>();
  for (const m of otherMemberships) {
    if (!roleOf.has(m.userId)) roleOf.set(m.userId, m.role);
  }

  const isDirection = role === "admin" || role === "director";
  const studentBlocked =
    role === "student" && !studentToggle && threads.length === 0;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold">Messagerie</h1>
        <div className="flex items-center gap-3">
          {/* §2.6.5 — consultation par la direction (accès tracé) */}
          {isDirection && (
            <Link
              href="/list/messages/supervision"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
              title="Consultation des fils de l'école (chaque consultation est journalisée)"
            >
              <Eye size={14} />
              Supervision
            </Link>
          )}
          {correspondents.length > 0 && (
            <NewMessageButton
              recipients={correspondents.map((c) => ({
                id: c.id,
                name: c.name,
                roleLabel: SPACE_ROLE_LABELS[c.role] ?? c.role,
              }))}
            />
          )}
        </div>
      </div>

      {/* LISTE DES FILS */}
      {studentBlocked ? (
        <div className="mt-10 flex flex-col items-center gap-2 py-10 text-gray-400">
          <MessageSquare size={32} />
          <p className="text-sm text-center max-w-md">
            La messagerie élève ↔ enseignant n&apos;est pas activée par votre
            établissement. Rapprochez-vous de l&apos;administration si vous
            avez besoin de contacter un enseignant.
          </p>
        </div>
      ) : threads.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 py-10 text-gray-400">
          <MessageSquare size={32} />
          <p className="text-sm">
            Aucune conversation pour le moment.
            {correspondents.length > 0 &&
              " Utilisez « Nouveau message » pour en démarrer une."}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col">
          {threads.map((t) => (
            <Link
              key={t.otherId}
              href={`/list/messages/${t.otherId}`}
              className={`flex items-center gap-3 border-b border-gray-100 px-2 py-3 transition hover:bg-lamaSkyLight/40 ${
                t.unread > 0 ? "bg-lamaPurpleLight/30" : ""
              }`}
            >
              {/* Avatar initiale */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lamaSky text-sm font-semibold text-white">
                {(nameOf.get(t.otherId) ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`truncate text-sm ${
                      t.unread > 0 ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {nameOf.get(t.otherId) ?? "Utilisateur"}
                  </span>
                  {roleOf.has(t.otherId) && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      {SPACE_ROLE_LABELS[roleOf.get(t.otherId)!] ??
                        roleOf.get(t.otherId)}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {t.lastFromMe ? "Vous : " : ""}
                  {t.lastContent}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-gray-400">
                  {fmtLastAt(t.lastAt)}
                </span>
                {t.unread > 0 && (
                  <span className="rounded-full bg-lamaPurple px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t.unread}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
