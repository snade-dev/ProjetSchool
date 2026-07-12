"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { upsertPlan, type PlatformState } from "@/lib/actions/platformAction";

const INITIAL: PlatformState = { success: false, error: false, message: "" };

type Plan = {
  id: number;
  name: string;
  priceMonthly: number;
  maxStudents: number | null;
  active: boolean;
};

/** V05 — création/édition d'un plan (panneau latéral). */
export default function PlanForm({ plan }: { plan?: Plan }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(upsertPlan, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(state.message);
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const field =
    "w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 placeholder:text-gray-300 outline-none transition focus:ring-2 focus:ring-lamaSky";

  return (
    <>
      {plan ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          <Pencil size={12} />
          Modifier
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="drawer-hero-bg flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Plus size={15} />
          Nouveau plan
        </button>
      )}

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
              <div className="text-lg font-bold">
                {plan ? `Modifier « ${plan.name} »` : "Nouveau plan"}
              </div>
              <div className="text-xs text-white/75">
                Tarif mensuel facturé aux établissements
              </div>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              {plan && <input type="hidden" name="id" value={plan.id} />}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Nom du plan</label>
                <input name="name" required defaultValue={plan?.name} className={field} placeholder="Essentiel" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Prix mensuel (FCFA)
                </label>
                <input name="priceMonthly" type="number" min={0} required defaultValue={plan?.priceMonthly} className={field} placeholder="25000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Plafond d&apos;élèves (vide = illimité)
                </label>
                <input name="maxStudents" type="number" min={1} defaultValue={plan?.maxStudents ?? ""} className={field} placeholder="200" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={plan?.active ?? true}
                  className="h-4 w-4 accent-sky-600"
                />
                Plan proposable aux écoles
              </label>

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
                  {pending ? "Enregistrement…" : plan ? "Enregistrer" : "Créer le plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
