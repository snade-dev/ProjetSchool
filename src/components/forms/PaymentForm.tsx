"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  paymentSchema,
  PaymentSchema,
} from "@/lib/formsValidationSchema";
import { createPayment } from "@/lib/actions/paymentAction";
import { formatFCFA, PAYMENT_METHOD_LABELS } from "@/lib/finance";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

const METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

const PaymentForm = ({
  data,
  setOpen,
}: {
  type?: "create" | "update";
  // `any` volontaire : aligné sur la convention FormModal (l'ordre des params du
  // map `forms` diffère des noms — cf. les autres forms). `data` porte { invoiceId, balance }.
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const invoiceId: string = data?.invoiceId ?? "";
  const balance: number = data?.balance ?? 0;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PaymentSchema>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId,
      amount: balance, // montant prérempli = solde restant
      method: "CASH",
      paidAt: todayISO() as unknown as Date,
      reference: "",
    },
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createPayment(
        { success: false, error: false, message: "" },
        formData
      );
      setLoading(false);
      if (res.success) {
        toast("Paiement enregistré !");
        setOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.message);
        toast.error(res.message);
      }
    });
  });

  const watchedAmount = Number(watch("amount")) || 0;

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <DrawerHeader
        title="Encaisser un paiement"
        entity="Paiement"
        onClose={() => setOpen(false)}
      />

      <input type="hidden" {...register("invoiceId")} />

      <div className="flex items-center justify-between text-sm bg-lamaPurpleLight rounded-md p-3">
        <span className="text-gray-500">Solde restant</span>
        <span className="font-semibold">{formatFCFA(balance)}</span>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Montant */}
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs font-medium text-gray-500">Montant (FCFA)</label>
          <input
            type="number"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("amount")}
          />
          {errors.amount?.message && (
            <p className="text-xs text-red-400">
              {errors.amount.message.toString()}
            </p>
          )}
        </div>

        {/* Méthode */}
        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs font-medium text-gray-500">Méthode</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("method")}
          >
            {METHODS.map((m) => (
              <option value={m} key={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {errors.method?.message && (
            <p className="text-xs text-red-400">
              {errors.method.message.toString()}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs font-medium text-gray-500">Date du paiement</label>
          <input
            type="date"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("paidAt")}
          />
          {errors.paidAt?.message && (
            <p className="text-xs text-red-400">
              {errors.paidAt.message.toString()}
            </p>
          )}
        </div>

        {/* Référence (optionnelle) */}
        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs font-medium text-gray-500">
            Référence (facultatif)
          </label>
          <input
            type="text"
            placeholder="N° transaction / chèque"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("reference")}
          />
        </div>
      </div>

      {watchedAmount > balance && (
        <p className="text-xs text-red-400">
          Le montant dépasse le solde restant ({formatFCFA(balance)}).
        </p>
      )}

      {errorMsg && (
        <p className="text-sm font-medium text-red-500">{errorMsg}</p>
      )}

      <FormFooter
        loading={loading}
        label={loading ? "Enregistrement…" : "Enregistrer le paiement"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default PaymentForm;
