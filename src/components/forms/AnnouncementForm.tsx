"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { announceSchema, AnnounceSchema } from "@/lib/formsValidationSchema";
import { createAnnounce, updateAnnounce } from "@/lib/actions/announceAction";

const AnnouncementForm = ({
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
  } = useForm<AnnounceSchema>({
    resolver: zodResolver(announceSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"

  const [state, formAction] = useActionState(
    type === "create" ? createAnnounce : updateAnnounce,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    // console.log("hello");
    // console.log(data);
    setLoading(true);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`l'Exam à été ${type === "create" ? "crée" : "modifier"}!`);
      setOpen(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);
  // console.log("leeosns", lessons);
  
  const {classes} = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Créer un nouvel annonce" : "Modifier un annonce"}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Information d&apos;authentication
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Titre de l'annonce"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <textarea
          placeholder="Titre de l'annonce"
          defaultValue={data?.title}
          {...register("description")}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md w-full"
        />
        {errors.description && (
          <p className="text-xs text-red-400">{errors.description.message}</p>
        )}
        <InputField
          label="Date"
          name="date"
          defaultValue={data?.date}
          register={register}
          error={errors?.date}
          type="dateTime-local"
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Classe</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes.map(
              (classItem: {
                id: number;
                name: string;
                capacity: number;
                _count: { students: number };
              }) => (
                <option value={classItem.id} key={classItem.id}>
                  ({classItem.name} -{" "}
                  {classItem.capacity}{" "}
                  Capacité)
                </option>
              )
            )}
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

export default AnnouncementForm;
