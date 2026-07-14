"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Search, X } from "lucide-react";

/**
 * W16 — « Nouveau message » : sélecteur de destinataires AUTORISÉS.
 * La liste est construite SERVER-SIDE (allowedCorrespondents) selon les règles
 * §2.6.5 — ce composant ne fait que l'afficher (filtre texte local) ; le
 * serveur revérifie de toute façon à l'envoi (canMessage).
 */

export type Recipient = { id: string; name: string; roleLabel: string };

const NewMessageButton = ({ recipients }: { recipients: Recipient[] }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? recipients.filter((r) => r.name.toLowerCase().includes(q))
      : recipients;
  }, [recipients, query]);

  // Regroupement par rôle (l'ordre vient du tri server-side).
  const groups = useMemo(() => {
    const map = new Map<string, Recipient[]>();
    for (const r of filtered) {
      const list = map.get(r.roleLabel) ?? [];
      list.push(r);
      map.set(r.roleLabel, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-lamaSky px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
      >
        <MessageSquarePlus size={14} />
        Nouveau message
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Écrire à…</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Seuls les destinataires autorisés par les règles de
              l&apos;établissement sont proposés.
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un nom…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="mt-3 flex-1 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">
                  Aucun destinataire ne correspond.
                </p>
              ) : (
                groups.map(([label, list]) => (
                  <div key={label} className="mb-2">
                    <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    {list.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          router.push(`/list/messages/${r.id}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-lamaSkyLight/60"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lamaPurple text-xs font-semibold text-white">
                          {r.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-sm">{r.name}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewMessageButton;
