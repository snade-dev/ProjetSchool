import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, Eye, Paperclip, ShieldAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sessionSchoolId } from "@/lib/authGuard";
import { auditWithSession } from "@/lib/audit";
import { SPACE_ROLE_LABELS } from "@/lib/membership";

/**
 * W16 — Consultation par la direction (§2.6.5 : « toute communication
 * archivée par l'école, la direction peut consulter en cas de nécessité »).
 * admin/director uniquement, fils de LEUR école. CHAQUE consultation d'un fil
 * est journalisée (`message.supervise`, entité = le couple d'utilisateurs) —
 * l'accès est tracé, c'est l'esprit du cahier des charges.
 */

const fmtAt = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);

/** Clé de fil stable : le couple trié (indépendant du sens des messages). */
const pairKey = (u1: string, u2: string) => [u1, u2].sort().join("<->");

const SupervisionPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const role = session.user.role ?? "";
  const schoolId = sessionSchoolId(session);

  // Défense en profondeur : direction uniquement (le proxy garde déjà la route).
  if (!["admin", "director"].includes(role) || schoolId === -1) {
    return notFound();
  }

  const { q, a, b } = searchParams;

  // ------------------------------------------------------------------
  // MODE FIL : lecture d'une conversation (a, b) — consultation AUDITÉE.
  // ------------------------------------------------------------------
  if (a && b && a !== b) {
    const threadWhere = {
      schoolId, // isolation : uniquement les fils de MON école
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    };
    const messages = await prisma.message.findMany({
      where: threadWhere,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        content: true,
        fileUrl: true,
        createdAt: true,
      },
    });
    if (messages.length === 0) return notFound();

    const users = await prisma.user.findMany({
      where: { id: { in: [a, b] } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    const [first, second] = [a, b].sort();

    // §2.6.5 / §2.11 — CHAQUE consultation du fil est tracée.
    await auditWithSession(
      {
        userId: session.user.id,
        role,
        schoolId,
      },
      "message.supervise",
      `Message:${first}<->${second}`,
      {
        after: {
          participants: [
            nameOf.get(first) ?? first,
            nameOf.get(second) ?? second,
          ],
          messageCount: messages.length,
        },
      }
    );

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
          <Link
            href="/list/messages/supervision"
            className="text-gray-400 transition hover:text-gray-600"
            aria-label="Retour à la supervision"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">
              {nameOf.get(a) ?? a} ↔ {nameOf.get(b) ?? b}
            </h1>
            <p className="text-xs text-gray-400">
              {messages.length} message{messages.length > 1 ? "s" : ""} —
              lecture seule (consultation journalisée)
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-lamaYellowLight px-3 py-1 text-[10px] font-medium text-yellow-800">
            <ShieldAlert size={12} />
            Accès tracé
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {messages.map((m) => {
            const fromA = m.senderId === a;
            return (
              <div
                key={m.id}
                className={`flex ${fromA ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    fromA
                      ? "rounded-bl-md bg-gray-100 text-gray-800"
                      : "rounded-br-md bg-lamaPurpleLight text-gray-800"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-gray-500">
                    {nameOf.get(m.senderId) ?? m.senderId}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {m.fileUrl && (
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1.5 text-xs underline opacity-80 hover:opacity-100"
                    >
                      <Paperclip size={12} />
                      {m.fileUrl.endsWith(".pdf") ? "Document PDF" : "Image jointe"}
                    </a>
                  )}
                  <p className="mt-1 text-right text-[10px] text-gray-400">
                    {fmtAt(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MODE LISTE : fils de l'école, recherche par participant.
  // ------------------------------------------------------------------
  const search = q?.trim() || "";

  // Recherche par participant : résolution des comptes dont le nom matche.
  let matchedIds: Set<string> | null = null;
  if (search) {
    const matched = await prisma.user.findMany({
      where: { name: { contains: search, mode: "insensitive" } },
      select: { id: true },
      take: 200,
    });
    matchedIds = new Set(matched.map((m) => m.id));
  }

  const messages = await prisma.message.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: {
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
    },
  });

  type ThreadRow = {
    u1: string;
    u2: string;
    lastContent: string;
    lastAt: Date;
    count: number;
  };
  const threads = new Map<string, ThreadRow>();
  for (const m of messages) {
    if (
      matchedIds &&
      !matchedIds.has(m.senderId) &&
      !matchedIds.has(m.receiverId)
    ) {
      continue;
    }
    const key = pairKey(m.senderId, m.receiverId);
    let t = threads.get(key);
    if (!t) {
      const [u1, u2] = [m.senderId, m.receiverId].sort();
      t = { u1, u2, lastContent: m.content, lastAt: m.createdAt, count: 0 };
      threads.set(key, t);
    }
    t.count += 1;
  }
  const rows = [...threads.values()];

  // Noms + rôles des participants (affichage).
  const participantIds = [...new Set(rows.flatMap((r) => [r.u1, r.u2]))];
  const [participants, memberships] = await Promise.all([
    participantIds.length
      ? prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    participantIds.length
      ? prisma.userSchoolMembership.findMany({
          where: { userId: { in: participantIds }, schoolId, active: true },
          select: { userId: true, role: true },
        })
      : Promise.resolve([]),
  ]);
  const nameOf = new Map(participants.map((u) => [u.id, u.name]));
  const roleOf = new Map<string, string>();
  for (const m of memberships) {
    if (!roleOf.has(m.userId)) roleOf.set(m.userId, m.role);
  }
  const label = (id: string) => {
    const r = roleOf.get(id);
    return r ? SPACE_ROLE_LABELS[r] ?? r : null;
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/list/messages"
            className="text-gray-400 transition hover:text-gray-600"
            aria-label="Retour à la messagerie"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-semibold">Supervision de la messagerie</h1>
        </div>
        {/* Recherche par participant (GET — pas de JS requis) */}
        <form className="flex items-center gap-2" action="/list/messages/supervision">
          <input
            name="q"
            defaultValue={search}
            placeholder="Rechercher un participant…"
            className="rounded-full bg-gray-100 px-4 py-2 text-xs outline-none ring-lamaSky transition focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-full bg-lamaSky px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
          >
            Rechercher
          </button>
        </form>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
        <ShieldAlert size={13} />
        Conversations archivées de votre établissement — chaque consultation
        d&apos;un fil est inscrite au journal d&apos;audit.
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 py-10 text-center text-sm text-gray-400">
          {search
            ? "Aucune conversation ne correspond à cette recherche."
            : "Aucune conversation archivée pour le moment."}
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="p-2">Participants</th>
              <th className="hidden p-2 md:table-cell">Dernier message</th>
              <th className="hidden p-2 md:table-cell">Messages</th>
              <th className="p-2">Dernier échange</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.u1}<->${r.u2}`}
                className="border-b border-gray-100 even:bg-slate-50"
              >
                <td className="p-2">
                  <div className="flex flex-col gap-0.5">
                    {[r.u1, r.u2].map((id) => (
                      <span key={id} className="flex items-center gap-2">
                        <span className="font-medium">
                          {nameOf.get(id) ?? id}
                        </span>
                        {label(id) && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                            {label(id)}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="hidden max-w-[280px] truncate p-2 text-gray-500 md:table-cell">
                  {r.lastContent}
                </td>
                <td className="hidden p-2 md:table-cell">{r.count}</td>
                <td className="p-2 text-xs text-gray-500">{fmtAt(r.lastAt)}</td>
                <td className="p-2">
                  <Link
                    href={`/list/messages/supervision?a=${r.u1}&b=${r.u2}`}
                    className="flex w-max items-center gap-1.5 rounded-full bg-lamaSkyLight px-3 py-1.5 text-xs text-sky-800 transition hover:bg-lamaSky hover:text-white"
                  >
                    <Eye size={12} />
                    Consulter
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SupervisionPage;
