"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notificationAction";

export type BellNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  unread: boolean;
  /** ISO string (sérialisable RSC → client). */
  createdAt: string;
};

/** Temps relatif FR à granularité minute (stable entre SSR et hydratation). */
export const relativeTimeFr = (iso: string, now: Date = new Date()): string => {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
};

/**
 * W12 — Cloche de la navbar : compteur de non-lus + dropdown des 8 dernières
 * notifications. Clic sur une notification = marquée lue + navigation vers
 * son lien. Même pattern de dropdown que SpaceSwitcher (W06).
 */
const NotificationBell = ({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: BellNotification[];
}) => {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (item: BellNotification) => {
    setOpen(false);
    startTransition(async () => {
      if (item.unread) await markNotificationRead(item.id);
      router.push(item.link || "/list/notifications");
    });
  };

  const markAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Notifications"
        className="bg-white rounded-full w-8 h-8 flex items-center justify-center relative text-xs hover:bg-lamaSkyLight transition"
      >
        <Bell size={16} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-900/10"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-800 disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCheck size={12} />
                )}
                Tout marquer lu
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">
              Aucune notification pour le moment.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => openItem(item)}
                  className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-gray-50 disabled:opacity-60 ${
                    item.unread ? "bg-lamaSkyLight/40" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                      item.unread ? "bg-purple-500" : "bg-gray-200"
                    }`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate text-xs ${
                        item.unread
                          ? "font-semibold text-gray-800"
                          : "font-medium text-gray-600"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="line-clamp-2 text-[11px] text-gray-500">
                      {item.body}
                    </span>
                    <span
                      suppressHydrationWarning
                      className="mt-0.5 text-[10px] text-gray-400"
                    >
                      {relativeTimeFr(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <a
            href="/list/notifications"
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-purple-600 transition hover:bg-gray-50"
          >
            Tout voir
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
