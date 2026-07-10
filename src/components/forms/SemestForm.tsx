"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useActionState,
  useTransition,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { semesterSchema, SemesterSchema } from "@/lib/formsValidationSchema";
import { createSemester, updateSemester } from "@/lib/actions/semesterActions";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

const SemesterForm = ({
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
  } = useForm<SemesterSchema>({
    resolver: zodResolver(semesterSchema),
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createSemester : updateSemester,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit(async (data) => {
    console.log("🟡 Données envoyées par React Hook Form :", data);

    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    console.log("🔍 State après formAction :", state);

    if (state.success) {
      toast(`Le semestre a été ${type === "create" ? "créé" : "mis à jour"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { semesters, subjects } = relatedData;
  // console.log(JSON.stringify(subjects));

  // console.log(semesters); // Vérification des données liées aux classes

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={type === "create"
          ? "Créer un nouveau semestre"
          : "Modifier le semestre"}
        entity="Semestre"
        onClose={() => setOpen(false)}
      />

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom du semestre"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        {data && (
          <InputField
            label="Identifiant"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
      </div>
      <div className="flex flex-col gap-2 w-full md:w-4/4">
        <label className="text-xs font-medium text-gray-500">Matières</label>
        <select
          className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
          {...register("subjects", {
            required: "Les matières sont requises",
          })}
          multiple
        >
          {subjects.map((subject: { id: string; name: string }) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>

        {errors.subjects && (
          <p className="text-red-400 text-xs">{errors.subjects.message}</p>
        )}

        {errors.subjects && (
          <p className="text-red-400 text-xs">{errors.subjects.message}</p>
        )}
      </div>
      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {state.message ? state.message : "Une erreur c&apos;est produite!"}
        </span>
      )}

      <FormFooter
        loading={isPending}
        label={type === "create" ? "Créer" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default SemesterForm;
