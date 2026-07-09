"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
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
import {
  feeStructureSchema,
  FeeStructureSchema,
} from "@/lib/formsValidationSchema";
import { createFee, updateFee } from "@/lib/actions/feeAction";

const FeeForm = ({
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
  } = useForm<FeeStructureSchema>({
    resolver: zodResolver(feeStructureSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createFee : updateFee,
    {
      success: false,
      error: false,
    }
  );

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
      toast(`Le frais a été ${type === "create" ? "créé" : "modifié"} !`);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur : ce libellé existe déjà pour cette classe cette année, ou une erreur est survenue."
      );
    }
  }, [state, router, type, setOpen]);

  const { classes } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Ajouter un frais" : "Modifier un frais"}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Informations du frais
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Libellé"
          name="label"
          defaultValue={data?.label}
          register={register}
          error={errors?.label}
        />
        <InputField
          label="Montant (FCFA)"
          name="amount"
          type="number"
          defaultValue={data?.amount}
          register={register}
          error={errors?.amount}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Périodicité</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("period")}
            defaultValue={data?.period}
          >
            <option value="MONTHLY">Mensuel</option>
            <option value="YEARLY">Annuel</option>
            <option value="ONE_TIME">Unique</option>
          </select>
          {errors.period?.message && (
            <p className="text-xs text-red-400">
              {errors.period.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Classe</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes?.map((classItem: { id: number; name: string }) => (
              <option value={classItem.id} key={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>
      </div>

      {data && (
        <InputField
          label="Id"
          name="id"
          defaultValue={data?.id}
          register={register}
          error={errors?.id}
          hidden
        />
      )}

      <button
        disabled={loading}
        type="submit"
        className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-500"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default FeeForm;
