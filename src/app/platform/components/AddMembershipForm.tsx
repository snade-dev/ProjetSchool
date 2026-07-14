"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Link2, Loader2, X } from "lucide-react";
import {
  addSchoolMembership,
  type PlatformState,
} from "@/lib/actions/platformAction";

const INITIAL: PlatformState = { success: false, error: false, message: "" };

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrateur" },
  { value: "teacher", label: "Enseignant" },
  { value: "student", label: "Élève" },
  { value: "parent", label: "Parent" },
];

/**
 * W06 — rattacher un compte EXISTANT (par e-mail) à l'école avec un rôle,
 * dans un panneau latéral (style CreateSchoolForm).
 */
export default function AddMembershipForm({
  schoolId,
  schoolName,
}: {
  schoolId: number;
  schoolName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addSchoolMembership,
    INITIAL
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(state.message);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const field =
    "w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 placeholder:text-gray-300 outline-none transition focus:ring-2 focus:ring-lamaSky";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="drawer-hero-bg flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        <Link2 size={15} />
        Rattacher un compte
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-drawer-in h-full w-full max-w-md overflow-y-auto bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-hero-bg relative -mx-6 -mt-6 mb-5 px-6 py-5 text-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="absolute right-4 top-4 text-white/70 transition hover:text-white"
              >
                <X size={17} />
              </button>
              <div className="text-lg font-bold">Rattacher un compte</div>
              <div className="text-xs text-white/75">
                Un compte existant rejoint « {schoolName} » avec un rôle
              </div>
            </div>

            <form ref={formRef} action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="schoolId" value={schoolId} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Adresse e-mail du compte
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className={field}
                  placeholder="compte@exemple.ml"
                />
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Le compte doit déjà exister (créé par une école ou par la
                  plateforme). Le nouvel espace apparaîtra à sa prochaine
                  connexion ou via la bascule du header.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Rôle</label>
                <select name="role" required className={field} defaultValue="admin">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {state.error && (
                <p className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
                  {state.message}
                </p>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border-[1.5px] border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-500 transition hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="drawer-hero-bg flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {pending && <Loader2 size={15} className="animate-spin" />}
                  {pending ? "Rattachement…" : "Rattacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
