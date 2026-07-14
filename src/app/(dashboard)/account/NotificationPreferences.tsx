"use client";

import { useState, useTransition } from "react";
import { setNotificationPreference } from "@/lib/actions/notificationAction";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_HINTS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/lib/notificationTypes";

/**
 * W12 — préférences de notification (section « Notifications » de /account) :
 * un toggle par type. Absence de ligne en base = activé ; le toggle upserte
 * la préférence du compte (optimiste, avec retour arrière si l'action échoue).
 */
const NotificationPreferences = ({
  initial,
}: {
  /** type → enabled (types absents = activés). */
  initial: Partial<Record<NotificationType, boolean>>;
}) => {
  const [prefs, setPrefs] = useState<Record<NotificationType, boolean>>(() => {
    const state = {} as Record<NotificationType, boolean>;
    for (const t of NOTIFICATION_TYPES) state[t] = initial[t] ?? true;
    return state;
  });
  const [, startTransition] = useTransition();

  const toggle = (type: NotificationType) => {
    const next = !prefs[type];
    setPrefs((p) => ({ ...p, [type]: next })); // optimiste
    startTransition(async () => {
      const res = await setNotificationPreference(type, next);
      if (!res.success) setPrefs((p) => ({ ...p, [type]: !next })); // rollback
    });
  };

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {NOTIFICATION_TYPES.map((type) => {
        const enabled = prefs[type];
        return (
          <div key={type} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800">
                {NOTIFICATION_TYPE_LABELS[type]}
              </p>
              <p className="text-xs text-gray-500">
                {NOTIFICATION_TYPE_HINTS[type]}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => toggle(type)}
              className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
                enabled ? "bg-lamaSky" : "bg-gray-200"
              }`}
              title={enabled ? "Désactiver" : "Activer"}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationPreferences;
