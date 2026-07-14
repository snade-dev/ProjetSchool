import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CheckCheck, Inbox } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ITEM_PER_PAGE } from "@/lib/setting";
import Pagination from "@/components/Pagination";
import { markAllNotificationsRead } from "@/lib/actions/notificationAction";
import {
  NOTIFICATION_RETENTION_DAYS,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  isNotificationType,
} from "@/lib/notificationTypes";
import NotificationListItem, {
  type NotificationItem,
} from "./NotificationListItem";

/**
 * W12 — MES notifications (tous rôles connectés) : liste paginée, non-lues en
 * évidence, filtre par type, « tout marquer lu ». Rétention opportuniste :
 * les notifications LUES de plus de 90 jours du compte sont purgées ici
 * (pas de cron).
 */
const NotificationsListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const userId = session.user.id;

  // Rétention simple (§ W12) : purge des lues > 90 jours pour CE user.
  try {
    await prisma.notification.deleteMany({
      where: {
        userId,
        readAt: {
          lt: new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 3600 * 1000),
        },
      },
    });
  } catch {
    // La purge est opportuniste : un échec n'empêche pas l'affichage.
  }

  const p = searchParams.page ? parseInt(searchParams.page) : 1;
  const typeFilter =
    searchParams.type && isNotificationType(searchParams.type)
      ? searchParams.type
      : null;

  const where = { userId, ...(typeFilter ? { type: typeFilter } : {}) };

  const [data, count, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  const items: NotificationItem[] = data.map((n) => ({
    id: n.id,
    type: n.type,
    typeLabel: isNotificationType(n.type)
      ? NOTIFICATION_TYPE_LABELS[n.type]
      : n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    unread: n.readAt === null,
    createdAt: n.createdAt.toISOString(),
  }));

  // « Tout marquer lu » en form action (progressive enhancement, pas de JS requis)
  const markAllAction = async () => {
    "use server";
    await markAllNotificationsRead();
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold">
          Mes notifications
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <form action={markAllAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full bg-lamaSky px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              <CheckCheck size={14} />
              Tout marquer lu
            </button>
          </form>
        )}
      </div>

      {/* Filtre par type (chips) */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/list/notifications"
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            typeFilter === null
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Toutes
        </Link>
        {NOTIFICATION_TYPES.map((t) => (
          <Link
            key={t}
            href={`/list/notifications?type=${t}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              typeFilter === t
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {NOTIFICATION_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {/* LIST */}
      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 py-10 text-gray-400">
          <Inbox size={32} />
          <p className="text-sm">
            {typeFilter
              ? "Aucune notification de ce type."
              : "Aucune notification pour le moment."}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <NotificationListItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default NotificationsListPage;
