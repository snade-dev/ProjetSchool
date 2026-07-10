"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useActionState,
} from "react";
import {
  makeupExamSchema,
  MakeupExamSchema,
  makeupSessionSchema,
  MakeupSessionSchema,
} from "@/lib/formsValidationSchema";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputField";
import {
  createMakeupExam,
  updateMakeupExam,
} from "@/lib/actions/makeupExamAction";
import { Subject } from "@/app/generated/prisma";

const MakeupExamForm = ({
  subjects,
  userId,
  sessionId,
  data,
  semesterId,
}: {
  subjects: Subject[];
  userId: string;
  sessionId: string;
  semesterId: number;
  data: MakeupExamSchema;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MakeupExamSchema>({
    resolver: zodResolver(makeupExamSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"
  const [img, setImg] = useState<any>();

  const [state, formAction] = useActionState(createMakeupExam, {
    success: false,
    error: false,
    message: "",
  });

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    // console.log(data);
    formAction({
      ...data,
      userId: userId,
      sessionId: sessionId,
      semesterId: semesterId,
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Professeur ${"créer"}`);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router]);

  return (
    <form className=" flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className=" text-xl font-semibold">
        {"Créer une nouvelle session de récupération"}
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

        <div className=" flex flex-col gap-2 w-full md:w-1/4">
          <label className=" text-xs text-gray-500">Matière</label>
          <select
            className=" ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("subjectId")}
            defaultValue={data?.subjectId}
          >
            {subjects.map((subject: { id: number; name: string }) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjectId?.message && (
            <p className=" text-red-400 text-xs">
              {errors.subjectId?.message.toString()}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <span className=" text-red-400 font-bold">
          {state.message ? state.message : "Une erreur c&apos;est produite"}
        </span>
      )}

      <button
        disabled={loading}
        className=" bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-400"
        type="submit"
      >
        {"Créer"}
      </button>
    </form>
  );
};
export default MakeupExamForm;
