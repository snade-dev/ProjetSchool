"use client";

import { useState, useTransition } from "react";
import { setNotificationPreference } from "@/lib/actions/notificationAction";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_HINTS,
  NOTIFICATION_TYPE_LABELS,
  isEmailCriticalType,
  type NotificationType,
} from "@/lib/notificationTypes";

/**
 * W12 — préférences de notification (section « Notifications » de /account) :
 * un toggle in-app par type. Absence de ligne en base = activé ; le toggle
 * upserte la préférence du compte (optimiste, avec retour arrière si l'action
 * échoue). W13 — les types critiques (ABSENCE, REPORT_CARD, PAYMENT) gagnent
 * une colonne « Email » indépendante (canal SMTP).
 */

type Channel = "inapp" | "email";

const Toggle = ({
  enabled,
  onClick,
  label,
}: {
  enabled: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onClick}
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
);

const NotificationPreferences = ({
  initial,
  initialEmail,
}: {
  /** type → in-app activé (types absents = activés). */
  initial: Partial<Record<NotificationType, boolean>>;
  /** type → email activé (types absents = activés) — types critiques W13. */
  initialEmail: Partial<Record<NotificationType, boolean>>;
}) => {
  const [prefs, setPrefs] = useState<
    Record<Channel, Record<NotificationType, boolean>>
  >(() => {
    const inapp = {} as Record<NotificationType, boolean>;
    const email = {} as Record<NotificationType, boolean>;
    for (const t of NOTIFICATION_TYPES) {
      inapp[t] = initial[t] ?? true;
      email[t] = initialEmail[t] ?? true;
    }
    return { inapp, email };
  });
  const [, startTransition] = useTransition();

  const toggle = (type: NotificationType, channel: Channel) => {
    const next = !prefs[channel][type];
    setPrefs((p) => ({
      ...p,
      [channel]: { ...p[channel], [type]: next },
    })); // optimiste
    startTransition(async () => {
      const res = await setNotificationPreference(type, next, channel);
      if (!res.success)
        setPrefs((p) => ({
          ...p,
          [channel]: { ...p[channel], [type]: !next },
        })); // rollback
    });
  };

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {/* En-têtes de colonnes */}
      <div className="flex items-center gap-4 pb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        <div className="min-w-0 flex-1" />
        <span className="w-11 flex-none text-center">In-app</span>
        <span className="w-11 flex-none text-center">Email</span>
      </div>
      {NOTIFICATION_TYPES.map((type) => (
        <div key={type} className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800">
              {NOTIFICATION_TYPE_LABELS[type]}
            </p>
            <p className="text-xs text-gray-500">
              {NOTIFICATION_TYPE_HINTS[type]}
            </p>
          </div>
          <Toggle
            enabled={prefs.inapp[type]}
            onClick={() => toggle(type, "inapp")}
            label={`Notifications in-app — ${NOTIFICATION_TYPE_LABELS[type]}`}
          />
          {/* W13 — le canal email n'existe que pour les types critiques */}
          {isEmailCriticalType(type) ? (
            <Toggle
              enabled={prefs.email[type]}
              onClick={() => toggle(type, "email")}
              label={`Emails — ${NOTIFICATION_TYPE_LABELS[type]}`}
            />
          ) : (
            <span
              className="w-11 flex-none text-center text-xs text-gray-300"
              title="Ce type n'est pas envoyé par email"
            >
              —
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationPreferences;
