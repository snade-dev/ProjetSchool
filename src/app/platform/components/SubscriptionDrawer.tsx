"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { BadgeDollarSign, Loader2, X } from "lucide-react";
import {
  assignPlan,
  recordSubscriptionPayment,
  type PlatformState,
} from "@/lib/actions/platformAction";

const INITIAL: PlatformState = { success: false, error: false, message: "" };

export type DrawerPlan = { id: number; name: string; priceMonthly: number };
export type DrawerSubscription = {
  id: number;
  planId: number;
  planName: string;
  priceMonthly: number;
  status: string;
  trialEndsAt: string | null;
  paidUntil: string | null;
  payments: {
    id: number;
    amount: number;
    months: number;
    method: string;
    reference: string | null;
    paidAt: string;
  }[];
} | null;

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  TRIAL: { label: "Essai", cls: "bg-lamaSkyLight text-sky-800" },
  ACTIVE: { label: "À jour", cls: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "En retard", cls: "bg-lamaYellowLight text-yellow-800" },
  SUSPENDED: { label: "Suspendu", cls: "bg-red-100 text-red-600" },
};

const fmtF = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const fmtD = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(iso)) : "—";

/** V05 — gestion de l'abonnement d'une école : plan, encaissement, historique. */
export default function SubscriptionDrawer({
  schoolId,
  schoolName,
  subscription,
  plans,
}: {
  schoolId: number;
  schoolName: string;
  subscription: DrawerSubscription;
  plans: DrawerPlan[];
}) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<number>(subscription?.planId ?? plans[0]?.id ?? 0);
  const [months, setMonths] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [payState, payAction, payPending] = useActionState(
    recordSubscriptionPayment,
    INITIAL
  );
  const router = useRouter();

  useEffect(() => {
    if (payState.success) {
      toast(payState.message);
      setOpen(false);
      router.refresh();
    }
  }, [payState, router]);

  const doAssign = () => {
    startTransition(async () => {
      const res = await assignPlan(schoolId, planId);
      if (res.success) {
        toast(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const price = plans.find((p) => p.id === (subscription?.planId ?? planId))?.priceMonthly
    ?? subscription?.priceMonthly ?? 0;
  const field =
    "w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky";
  const st = subscription ? STATUS_LABEL[subscription.status] : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-lamaSkyLight/50"
      >
        <BadgeDollarSign size={12} />
        Abonnement
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
              <div className="text-lg font-bold">{schoolName}</div>
              <div className="text-xs text-white/75">Abonnement de l&apos;établissement</div>
            </div>

            {/* État courant */}
            {subscription && st ? (
              <div className="mb-5 rounded-xl border border-gray-100 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{subscription.planName}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                  <span>Fin d&apos;essai : {fmtD(subscription.trialEndsAt)}</span>
                  <span>Couvert jusqu&apos;au : {fmtD(subscription.paidUntil)}</span>
                </div>
              </div>
            ) : (
              <p className="mb-5 rounded-md bg-lamaYellowLight p-3 text-xs text-yellow-800">
                Aucun abonnement — attribuez un plan pour démarrer l&apos;essai
                gratuit de 30 jours.
              </p>
            )}

            {/* Attribution / changement de plan */}
            <div className="mb-6 flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500">
                {subscription ? "Changer de plan" : "Attribuer un plan"}
              </label>
              <div className="flex gap-2">
                <select
                  className={field}
                  value={planId}
                  onChange={(e) => setPlanId(parseInt(e.target.value))}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {fmtF(p.priceMonthly)}/mois
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={doAssign}
                  disabled={isPending || plans.length === 0}
                  className="drawer-hero-bg whitespace-nowrap rounded-md px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {isPending ? "…" : "OK"}
                </button>
              </div>
              {plans.length === 0 && (
                <p className="text-xs text-red-500">
                  Créez d&apos;abord un plan dans l&apos;onglet Plans.
                </p>
              )}
            </div>

            {/* Encaissement manuel */}
            {subscription && (
              <form action={payAction} className="flex flex-col gap-3">
                <div className="text-theme-deep text-[10.5px] font-bold uppercase tracking-[0.16em]">
                  Enregistrer un paiement
                </div>
                <input type="hidden" name="subscriptionId" value={subscription.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500">Mois couverts</label>
                    <input
                      name="months"
                      type="number"
                      min={1}
                      max={24}
                      value={months}
                      onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                      className={field}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500">Montant (FCFA)</label>
                    <input
                      name="amount"
                      type="number"
                      min={0}
                      key={months * price}
                      defaultValue={months * price}
                      className={field}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500">Méthode</label>
                    <select name="method" className={field} defaultValue="ORANGE_MONEY">
                      <option value="CASH">Espèces</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="BANK_TRANSFER">Virement</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500">Référence</label>
                    <input name="reference" className={field} placeholder="N° transaction" />
                  </div>
                </div>
                {payState.error && (
                  <p className="rounded-md bg-red-50 p-3 text-xs text-red-600 ring-1 ring-red-100">
                    {payState.message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={payPending}
                  className="drawer-hero-bg flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {payPending && <Loader2 size={15} className="animate-spin" />}
                  {payPending ? "Enregistrement…" : "Encaisser"}
                </button>
              </form>
            )}

            {/* Historique */}
            {subscription && subscription.payments.length > 0 && (
              <div className="mt-6">
                <div className="text-theme-deep mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em]">
                  Derniers paiements
                </div>
                <ul className="flex flex-col gap-1.5 text-xs text-gray-600">
                  {subscription.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                    >
                      <span>
                        {fmtD(p.paidAt)} · {p.months} mois · {p.method}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span className="font-semibold">{fmtF(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
