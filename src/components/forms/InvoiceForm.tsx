"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useActionState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Plus, Trash2 } from "lucide-react";
import {
  invoiceSchema,
  InvoiceSchema,
} from "@/lib/formsValidationSchema";
import { createInvoice } from "@/lib/actions/invoiceAction";
import { formatFCFA } from "@/lib/finance";

type StudentOption = {
  id: string;
  name: string;
  surname: string;
  class?: { name: string } | null;
};

const InvoiceForm = ({
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
    control,
    watch,
    formState: { errors },
  } = useForm<InvoiceSchema>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      lines: [{ label: "", quantity: 1, unitAmount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(createInvoice, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction(formData);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast("La facture a été créée !");
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur lors de la création de la facture (vérifiez qu'une année scolaire est active)."
      );
    }
  }, [state, router, setOpen]);

  const { students = [] } = (relatedData ?? {}) as {
    students: StudentOption[];
  };

  // Total live = Σ (quantité × prix unitaire)
  const watchedLines = watch("lines");
  const liveTotal = (watchedLines ?? []).reduce(
    (sum, l) =>
      sum + (Number(l?.quantity) || 0) * (Number(l?.unitAmount) || 0),
    0
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold text-gray-800">Nouvelle facture</h1>

      <div className="flex flex-wrap gap-4">
        {/* Élève */}
        <div className="flex flex-col gap-2 w-full md:w-2/5">
          <label className="text-xs font-medium text-gray-500">Élève</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("studentId")}
            defaultValue=""
          >
            <option value="" disabled>
              — Choisir un élève —
            </option>
            {students.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name} {s.surname}
                {s.class ? ` — ${s.class.name}` : ""}
              </option>
            ))}
          </select>
          {errors.studentId?.message && (
            <p className="text-xs text-red-400">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        {/* Échéance */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Échéance</label>
          <input
            type="date"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("dueDate")}
          />
          {errors.dueDate?.message && (
            <p className="text-xs text-red-400">
              {errors.dueDate.message.toString()}
            </p>
          )}
        </div>
      </div>

      {/* Lignes dynamiques */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Lignes de la facture
          </span>
          <button
            type="button"
            onClick={() => append({ label: "", quantity: 1, unitAmount: 0 })}
            className="flex items-center gap-1 text-xs bg-lamaPurpleLight text-gray-700 py-1 px-3 rounded-md hover:bg-lamaPurple"
          >
            <Plus size={14} /> Ajouter une ligne
          </button>
        </div>

        {errors.lines?.message && (
          <p className="text-xs text-red-400">
            {errors.lines.message.toString()}
          </p>
        )}

        {fields.map((field, index) => {
          const lineErr = errors.lines?.[index];
          const q = Number(watchedLines?.[index]?.quantity) || 0;
          const u = Number(watchedLines?.[index]?.unitAmount) || 0;
          return (
            <div
              key={field.id}
              className="flex flex-wrap items-end gap-2 border-b border-gray-100 pb-2"
            >
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-[11px] text-gray-500">Libellé</label>
                <input
                  className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
                  {...register(`lines.${index}.label` as const)}
                />
                {lineErr?.label?.message && (
                  <p className="text-[11px] text-red-400">
                    {lineErr.label.message.toString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 w-16">
                <label className="text-[11px] text-gray-500">Qté</label>
                <input
                  type="number"
                  className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
                  {...register(`lines.${index}.quantity` as const)}
                />
                {lineErr?.quantity?.message && (
                  <p className="text-[11px] text-red-400">
                    {lineErr.quantity.message.toString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-[11px] text-gray-500">PU (FCFA)</label>
                <input
                  type="number"
                  className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
                  {...register(`lines.${index}.unitAmount` as const)}
                />
                {lineErr?.unitAmount?.message && (
                  <p className="text-[11px] text-red-400">
                    {lineErr.unitAmount.message.toString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className="text-[11px] text-gray-500">Total</label>
                <span className="p-2 text-sm font-medium whitespace-nowrap">
                  {formatFCFA(q * u)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                className="p-2 text-red-500 disabled:text-gray-300"
                title="Supprimer la ligne"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        <div className="flex items-center justify-end gap-2 pt-2">
          <span className="text-sm text-gray-500">Total facture :</span>
          <span className="text-lg font-semibold">
            {formatFCFA(liveTotal)}
          </span>
        </div>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md p-2.5 transition"
      >
        Créer la facture
      </button>
    </form>
  );
};

export default InvoiceForm;
