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
} from "react";
import { teacherSchema, TeacherSchema } from "@/lib/formsValidationSchema";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createTeacher, updateTeacher } from "@/lib/actions";
import UploadField from "../UploadField";
import { useTransition } from "react";

const TeacherForms = ({
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
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"
  const [imgUrl, setImgUrl] = useState<string | undefined>(data?.img);

  const [state, formAction] = useActionState(
    type === "create" ? createTeacher : updateTeacher,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const [isPending, startTransition] = useTransition(); // add transition

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    startTransition(() => {
      formAction({ ...data, img: imgUrl });
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
  const { subjects } = relatedData;

  return (
    <form className=" flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold text-gray-800">
        {type === "create"
          ? "Créer un nouveau Professeur"
          : "Modifier un Professeur"}
      </h1>
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Information d&apos;authentification
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="nom d'utlisateur"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors.username}
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          defaultValue={data?.email}
          register={register}
          error={errors.email}
        />
        <InputField
          label="Mot de passe"
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors.password}
        />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Information personnel
      </span>
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
          label="Nom"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Prenom"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Téléphone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <InputField
          label="Groupe sanguin"
          name="bloodType"
          defaultValue={data?.bloodType}
          register={register}
          error={errors.bloodType}
        />
        <InputField
          label="Date de naissance"
          name="birthday"
          defaultValue={data?.birthday.toISOString().split("T")[0]}
          register={register}
          error={errors.birthday}
          type="date"
        />
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Sujet</label>
          <select
            multiple
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("subjects")}
            defaultValue={data?.subjects}
          >
            {subjects.map((subject: { id: string; name: string }) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjects?.message && (
            <p className=" text-red-400 text-xs">
              {errors.subjects?.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Sex</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">Homme</option>
            <option value="FEMALE">Femme</option>
          </select>
          {errors.sex?.message && (
            <p className=" text-red-400 text-xs">
              {errors.sex?.message.toString()}
            </p>
          )}
        </div>

        <UploadField
          label="Téléverser une photo"
          value={imgUrl}
          onChange={setImgUrl}
        />
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
export default TeacherForms;
