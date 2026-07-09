"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "../InputField";
import Image from "next/image";
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
import { CldUploadWidget } from "next-cloudinary";
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
  const [img, setImg] = useState<any>();

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
        // secure_url du justificatif Cloudinary ; conserve l'ancienne valeur en édition
        receiptImg: img?.secure_url ?? data?.receiptImg ?? "",
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
      <h1 className="text-xl font-semibold">
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Catégorie</label>
          <select
            className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Méthode</label>
          <select
            className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Notes (facultatif)</label>
          <input
            type="text"
            className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("notes")}
            defaultValue={data?.notes}
          />
        </div>

        {/* Justificatif — bloc CldUploadWidget copié à l'identique de TeacherForms
            (même preset "school") ; secure_url stocké dans receiptImg. */}
        <CldUploadWidget
          uploadPreset="school"
          onSuccess={(result, { widget }) => {
            setImg(result.info);
            widget.close();
          }}
        >
          {({ open }) => {
            return (
              <div
                className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                onClick={() => open()}
              >
                <Image src="/upload.png" alt="" width={28} height={28} />
                <span>Téléverser un justificatif</span>
              </div>
            );
          }}
        </CldUploadWidget>

        {(img?.secure_url || data?.receiptImg) && (
          <span className="text-xs text-green-500 self-center">
            Justificatif joint ✓
          </span>
        )}
      </div>

      {state.error && (
        <span className="text-red-400 font-bold">
          Une erreur s&apos;est produite
        </span>
      )}

      <button
        disabled={loading}
        className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-400"
        type="submit"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default ExpenseForm;
