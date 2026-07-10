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
import {
  makeupSessionSchema,
  MakeupSessionSchema,
} from "@/lib/formsValidationSchema";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  createMakeupSession,
  updateMakeupSession,
} from "@/lib/actions/makeupSessionAction";

const MakeupSessionForm = ({
  type,
  setOpen,
  data,
  relatedData,
}: {
  type: "create" | "update";
  setOpen: Dispatch<SetStateAction<boolean>>;
  data?: any;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MakeupSessionSchema>({
    resolver: zodResolver(makeupSessionSchema),
  });

  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"
  const [img, setImg] = useState<any>();

  const [state, formAction] = useActionState(
    type === "create" ? createMakeupSession : updateMakeupSession,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    // console.log(data);
    startTransition(() => {
      formAction({ ...data, userId: userId });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Professeur ${type === "create" ? "créer" : "modifier"}`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, type, router, setOpen]);
  const { semesters, userId } = relatedData;

  return (
    <form className=" flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold text-gray-800">
        {type === "create"
          ? "Créer une nouvelle session de récupération"
          : "Modifier une session de récupération"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors.title}
        />

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
          label="Date de début"
          name="startTime"
          defaultValue={data?.startTime.toISOString().split("T")[0]}
          register={register}
          error={errors.startTime}
          type="date"
        />
        <InputField
          label="Date de fin"
          name="endTime"
          defaultValue={data?.endTime.toISOString().split("T")[0]}
          register={register}
          error={errors.endTime}
          type="date"
        />

        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Semestre</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("semesterId")}
            defaultValue={data?.semesterId}
          >
            {semesters.map((semester: { id: string; name: string }) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
          {errors.semesterId?.message && (
            <p className=" text-red-400 text-xs">
              {errors.semesterId?.message.toString()}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {state.message ? state.message : "Une erreur c&apos;est produite"}
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
export default MakeupSessionForm;
