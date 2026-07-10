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
  schoolYearSchema,
  SchoolYearSchema,
} from "@/lib/formsValidationSchema";
import {
  createSchoolYear,
  updateSchoolYear,
} from "@/lib/actions/settingsAction";

// Formatage d'une date ISO -> "YYYY-MM-DD" pour <input type="date">
const toDateInput = (value?: Date | string) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split("T")[0];
};

const SchoolYearForm = ({
  type,
  data,
  setOpen,
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
  } = useForm<SchoolYearSchema>({
    resolver: zodResolver(schoolYearSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createSchoolYear : updateSchoolYear,
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
      toast(
        `L'année scolaire a été ${type === "create" ? "créée" : "modifiée"} !`
      );
      setOpen(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold text-gray-800">
        {type === "create"
          ? "Créer une année scolaire"
          : "Modifier l'année scolaire"}
      </h1>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom (ex : 2025-2026)"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Date de début"
          name="startDate"
          defaultValue={toDateInput(data?.startDate)}
          register={register}
          error={errors?.startDate}
          type="date"
        />
        <InputField
          label="Date de fin"
          name="endDate"
          defaultValue={toDateInput(data?.endDate)}
          register={register}
          error={errors?.endDate}
          type="date"
        />
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

      {state.error && (
        <span className="text-red-500 text-sm">
          Une erreur est survenue. Le nom d&apos;année est peut-être déjà pris.
        </span>
      )}

      <button
        disabled={loading}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md p-2.5 transition"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default SchoolYearForm;
