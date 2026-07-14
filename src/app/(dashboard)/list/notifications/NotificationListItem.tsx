"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/lib/actions/notificationAction";
import { relativeTimeFr } from "@/components/NotificationBell";

export type NotificationItem = {
  id: number;
  type: string;
  typeLabel: string;
  title: string;
  body: string;
  link: string | null;
  unread: boolean;
  createdAt: string; // ISO
};

/**
 * W12 — ligne de la page Notifications : le clic marque lue puis navigue
 * vers le lien de la notification (ou reste sur place s'il n'y en a pas).
 */
const NotificationListItem = ({ item }: { item: NotificationItem }) => {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const open = () => {
    startTransition(async () => {
      if (item.unread) await markNotificationRead(item.id);
      if (item.link) router.push(item.link);
      else router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition hover:bg-gray-50 disabled:opacity-60 ${
        item.unread
          ? "border-purple-100 bg-lamaSkyLight/40"
          : "border-gray-100 bg-white"
      }`}
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${
          item.unread ? "bg-purple-500" : "bg-gray-200"
        }`}
        title={item.unread ? "Non lue" : "Lue"}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm ${
              item.unread ? "font-semibold text-gray-800" : "font-medium text-gray-600"
            }`}
          >
            {item.title}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {item.typeLabel}
          </span>
        </span>
        <span className="text-xs text-gray-500">{item.body}</span>
        <span suppressHydrationWarning className="text-[10px] text-gray-400">
          {relativeTimeFr(item.createdAt)}
        </span>
      </span>
    </button>
  );
};

export default NotificationListItem;
