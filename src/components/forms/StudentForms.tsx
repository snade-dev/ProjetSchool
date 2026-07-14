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
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import UploadField from "../UploadField";
import { studentSchema, StudentSchema } from "@/lib/formsValidationSchema";
import { createStudent, updateStudent } from "@/lib/actions";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

const StudentForm = ({
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
    watch,
    formState: { errors },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const [imgUrl, setImgUrl] = useState<string | undefined>(data?.img);
  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"

  const [state, formAction] = useActionState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    // console.log("hello");
    // console.log(data);
    setLoading(true);
    startTransition(() => {
      formAction({ ...data, img: imgUrl });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`L'étudiant a été ${type === "create" ? "créé" : "modifié"} !`);
      setOpen(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);

  const { classes } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={type === "create"
          ? "Créer un nouvel étudiant"
          : "Modifier un étudiant"}
        name={`${watch("name") ?? data?.name ?? ""} ${watch("surname") ?? data?.surname ?? ""}`}
        code={watch("username") || data?.username}
        entity="Élève"
        onClose={() => setOpen(false)}
      />
      <FormSection>Information d&apos;authentication</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom d'utilisateur"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label="Mot de passe"
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
        />
      </div>
      <FormSection>Personal Information</FormSection>
      <UploadField
        label="Téléverser une photo"
        value={imgUrl}
        onChange={setImgUrl}
      />
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Prénom"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Nom de famille"
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
          label="Adresse"
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
        <InputField
          label="Nom du parent"
          name="parentUsername"
          defaultValue={data?.parentUsername}
          register={register}
          error={errors.parentUsername}
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
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Sexe</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">HOMME</option>
            <option value="FEMALE">FEMME</option>
          </select>
          {errors.sex?.message && (
            <p className="text-xs text-red-400">
              {errors.sex.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Classe</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes.map(
              (classItem: {
                id: number;
                name: string;
                capacity: number;
                _count: { enrollments: number };
              }) => (
                <option value={classItem.id} key={classItem.id}>
                  ({classItem.name} -{" "}
                  {classItem._count.enrollments + "/" + classItem.capacity}{" "}
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
      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {state.message ? state.message : "Une erreur c&apos;est produit"}
        </span>
      )}
      <FormFooter
        loading={loading}
        label={type === "create" ? "Créer" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default StudentForm;
