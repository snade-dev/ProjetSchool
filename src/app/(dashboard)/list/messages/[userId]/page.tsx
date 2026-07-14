import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, Paperclip } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sessionSchoolId } from "@/lib/authGuard";
import {
  canMessage,
  isMessagingRole,
  markThreadRead,
} from "@/lib/messaging";
import { SPACE_ROLE_LABELS } from "@/lib/membership";
import MessageComposer from "./MessageComposer";
import ReportThreadButton from "./ReportThreadButton";

/**
 * W16 — Fil 1-à-1 (§2.6.5) : ordre chronologique, mes messages à droite,
 * marquage lu automatique à l'ouverture, pagination simple (les 50 derniers,
 * lien « voir plus »). Garde souple : un fil EXISTANT reste lisible même si
 * la règle ne permet plus d'écrire (toggle élève coupé…) — l'envoi, lui,
 * repasse toujours par canMessage côté serveur.
 */

const PAGE_SIZE = 50;

const fmtAt = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);

const Attachment = ({ url }: { url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-1 flex items-center gap-1.5 text-xs underline opacity-80 hover:opacity-100"
  >
    <Paperclip size={12} />
    {url.endsWith(".pdf") ? "Document PDF" : "Image jointe"}
  </a>
);

const MessageThreadPage = async (props: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { userId: otherId } = await props.params;
  const searchParams = await props.searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const role = session.user.role ?? "";
  const meId = session.user.id;
  const schoolId = sessionSchoolId(session);

  if (!isMessagingRole(role) || schoolId === -1) return notFound();
  if (!otherId || otherId === meId) return notFound();

  // L'interlocuteur : compte + rôle dans MON école (affichage).
  const [other, otherMembership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, name: true },
    }),
    prisma.userSchoolMembership.findFirst({
      where: { userId: otherId, schoolId, active: true },
      select: { role: true },
    }),
  ]);
  if (!other) return notFound();

  const threadWhere = {
    OR: [
      { senderId: meId, receiverId: otherId },
      { senderId: otherId, receiverId: meId },
    ],
  };

  // Règle de mise en relation (envoi) + existence du fil (lecture).
  const [allowed, total] = await Promise.all([
    canMessage({ id: meId, role, schoolId }, otherId),
    prisma.message.count({ where: threadWhere }),
  ]);

  // Ni autorisé à écrire, ni d'historique → le fil n'existe pas pour ce compte.
  if (!allowed && total === 0) return notFound();

  // Marquage lu automatique à l'ouverture du fil (messages reçus de l'autre).
  await markThreadRead(meId, otherId);

  // Pagination simple : les `take` derniers, « voir plus » recharge plus haut.
  const takeParam = searchParams.take ? parseInt(searchParams.take) : NaN;
  const take = Number.isFinite(takeParam)
    ? Math.min(Math.max(takeParam, PAGE_SIZE), 1000)
    : PAGE_SIZE;

  const latest = await prisma.message.findMany({
    where: threadWhere,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      senderId: true,
      content: true,
      fileUrl: true,
      createdAt: true,
    },
  });
  const messages = latest.reverse(); // affichage chronologique

  const roleLabel = otherMembership
    ? SPACE_ROLE_LABELS[otherMembership.role] ?? otherMembership.role
    : null;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col">
      {/* EN-TÊTE DU FIL */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <Link
          href="/list/messages"
          className="text-gray-400 transition hover:text-gray-600"
          aria-label="Retour à la messagerie"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lamaSky text-sm font-semibold text-white">
          {other.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{other.name}</h1>
          {roleLabel && <p className="text-xs text-gray-400">{roleLabel}</p>}
        </div>
        {total > 0 && <ReportThreadButton otherUserId={otherId} />}
      </div>

      {/* MESSAGES (chronologique, les miens à droite) */}
      <div className="flex-1 overflow-y-auto py-4">
        {total > take && (
          <div className="mb-3 text-center">
            <Link
              href={`/list/messages/${otherId}?take=${take + PAGE_SIZE}`}
              className="rounded-full bg-gray-100 px-4 py-1.5 text-xs text-gray-600 transition hover:bg-gray-200"
            >
              Voir plus ({total - take} message{total - take > 1 ? "s" : ""}{" "}
              plus ancien{total - take > 1 ? "s" : ""})
            </Link>
          </div>
        )}

        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            Aucun message pour le moment — écrivez le premier ci-dessous.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.senderId === meId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "rounded-br-md bg-lamaSky text-white"
                        : "rounded-bl-md bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                    {m.fileUrl && <Attachment url={m.fileUrl} />}
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        mine ? "text-white/70" : "text-gray-400"
                      }`}
                    >
                      {fmtAt(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ZONE D'ENVOI — reflète canMessage (le serveur revérifie à l'envoi) */}
      {allowed ? (
        <MessageComposer receiverId={otherId} />
      ) : (
        <p className="border-t border-gray-100 pt-3 text-center text-xs text-gray-400">
          Vous ne pouvez plus écrire à ce destinataire (règles de mise en
          relation de l&apos;établissement). L&apos;historique reste consultable.
        </p>
      )}
    </div>
  );
};

export default MessageThreadPage;
