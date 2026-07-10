"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "../InputField";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useActionState,
  useTransition,
} from "react";
import { expenseSchema, ExpenseSchema } from "@/lib/formsValidationSchema";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createExpense, updateExpense } from "@/lib/actions/expenseAction";
import UploadField from "../UploadField";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance";

const METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"] as const;

const ExpenseForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseSchema>({
    resolver: zodResolver(expenseSchema),
  });

  const [loading, setLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | undefined>(data?.receiptImg);

  const [state, formAction] = useActionState(
    type === "create" ? createExpense : updateExpense,
    { success: false, error: false }
  );

  const [, startTransition] = useTransition();

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction({
        ...formData,
        // URL locale /uploads/… ; conserve l'ancienne valeur en édition
        receiptImg: imgUrl ?? "",
      });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Dépense ${type === "create" ? "créée" : "modifiée"}`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, type, router, setOpen]);

  const { categories } = relatedData ?? { categories: [] };

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold text-gray-800">
        {type === "create"
          ? "Enregistrer une dépense"
          : "Modifier une dépense"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors.id}
            hidden
          />
        )}

        <InputField
          label="Libellé"
          name="label"
          defaultValue={data?.label}
          register={register}
          error={errors.label}
        />

        <InputField
          label="Montant (FCFA)"
          name="amount"
          type="number"
          defaultValue={data?.amount}
          register={register}
          error={errors.amount}
        />

        <InputField
          label="Date"
          name="date"
          type="date"
          defaultValue={
            data?.date
              ? new Date(data.date).toISOString().split("T")[0]
              : undefined
          }
          register={register}
          error={errors.date}
        />

        <InputField
          label="Fournisseur (facultatif)"
          name="supplier"
          defaultValue={data?.supplier}
          register={register}
          error={errors.supplier}
        />

        {/* Catégorie */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Catégorie</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("categoryId")}
            defaultValue={data?.categoryId}
          >
            <option value="">-- Choisir --</option>
            {categories?.map((cat: { id: number; name: string }) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId?.message && (
            <p className="text-red-400 text-xs">
              {errors.categoryId?.message.toString()}
            </p>
          )}
        </div>

        {/* Méthode */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Méthode</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("method")}
            defaultValue={data?.method ?? "CASH"}
          >
            {METHODS.map((m) => (
              <option value={m} key={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {errors.method?.message && (
            <p className="text-red-400 text-xs">
              {errors.method?.message.toString()}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Notes (facultatif)</label>
          <input
            type="text"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("notes")}
            defaultValue={data?.notes}
          />
        </div>

        {/* Justificatif — stocké en local via /api/upload, URL dans receiptImg */}
        <UploadField
          label="Téléverser un justificatif"
          value={imgUrl}
          onChange={setImgUrl}
        />
      </div>

      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          Une erreur s&apos;est produite
        </span>
      )}

      <button
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md p-2.5 transition"
        type="submit"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default ExpenseForm;
