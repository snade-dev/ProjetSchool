"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState, useActionState, startTransition } from "react";
import { parentSchema, ParentSchema } from "@/lib/formsValidationSchema";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createParent, updateParent } from "@/lib//actions/parentAction";

const ParentForms = ({
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
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"
  const [img, setImg] = useState<any>();

  const [state, formAction] = useActionState(
    type === "create" ? createParent : updateParent,
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

      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Parent ${type === "create" ? "créer" : "modifier"}`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false)
    }
  }, [state, type, router, setOpen]);

  return (
    <form className=" flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className=" text-xl font-semibold">
        {type === "create"
          ? "Créer un nouveau Parent"
          : "Modifier un Parent"}
      </h1>
      <span className=" text-xs text-gray-400 font-medium">
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
      <span className=" text-xs text-gray-400 font-medium">
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

      </div>

      {state.error && (
        <span className=" text-red-400 font-bold">
          {state.message ? state.message : "Une erreur c&apos;est produite"}
        </span>
      )}

      <button disabled={loading} className=" bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-400" type="submit">
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};
export default ParentForms;
