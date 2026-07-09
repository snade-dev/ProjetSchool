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
import { employeeSchema, EmployeeSchema } from "@/lib/formsValidationSchema";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  createEmployee,
  updateEmployee,
} from "@/lib/actions/employeeAction";

type TeacherOption = {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
};

const EmployeeForm = ({
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
    setValue,
    formState: { errors },
  } = useForm<EmployeeSchema>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: data?.name ?? "",
      surname: data?.surname ?? "",
      email: data?.email ?? "",
      phone: data?.phone ?? "",
      position: data?.position ?? "",
      teacherId: data?.teacherId ?? "",
      active: data?.active ?? true,
    },
  });

  const { teachers = [] } = (relatedData ?? {}) as {
    teachers?: TeacherOption[];
  };

  // Un employé lié à un enseignant garde ce lien : le toggle n'est modifiable
  // qu'à la création (en édition, on ne re-relie pas).
  const [linked, setLinked] = useState<boolean>(!!data?.teacherId);

  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createEmployee : updateEmployee,
    { success: false, error: false }
  );

  const [, startTransition] = useTransition();

  const router = useRouter();

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction({
        ...formData,
        // Si non lié, on force teacherId vide (le staff n'a pas d'enseignant).
        teacherId: linked ? formData.teacherId : "",
      });
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(`Employé ${type === "create" ? "créé" : "modifié"}`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, type, router, setOpen]);

  // Sélection d'un enseignant → préremplit l'identité (verrouillée ensuite).
  const onSelectTeacher = (teacherId: string) => {
    setValue("teacherId", teacherId);
    const t = teachers.find((x) => x.id === teacherId);
    if (t) {
      setValue("name", t.name);
      setValue("surname", t.surname);
      setValue("email", t.email ?? "");
      setValue("phone", t.phone ?? "");
    }
  };

  const toggleLinked = (value: boolean) => {
    setLinked(value);
    if (!value) {
      // Repasse en champs libres (staff) : on vide le lien.
      setValue("teacherId", "");
    }
  };

  // InputField spread écrase sa className de base : on la ré-inclut ici.
  const baseInputClass = "ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full";
  const identityClass = linked
    ? `${baseInputClass} bg-gray-100 text-gray-500`
    : baseInputClass;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Enregistrer un employé"
          : "Modifier un employé"}
      </h1>

      {/* Toggle : lier à un enseignant existant (création uniquement) */}
      {type === "create" && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={linked}
            onChange={(e) => toggleLinked(e.target.checked)}
          />
          Lier à un enseignant existant
        </label>
      )}

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

        {/* Select des enseignants sans fiche employé */}
        {linked && (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Enseignant</label>
            <select
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              {...register("teacherId")}
              defaultValue={data?.teacherId ?? ""}
              disabled={type === "update"}
              onChange={(e) => onSelectTeacher(e.target.value)}
            >
              <option value="">-- Choisir --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.surname}
                </option>
              ))}
            </select>
            {errors.teacherId?.message && (
              <p className="text-red-400 text-xs">
                {errors.teacherId?.message.toString()}
              </p>
            )}
          </div>
        )}

        {/* Identité — readOnly grisé quand lié (l'action recopie depuis le Teacher) */}
        <InputField
          label="Prénom"
          name="name"
          register={register}
          error={errors.name}
          inputProps={{ readOnly: linked, className: identityClass }}
        />
        <InputField
          label="Nom"
          name="surname"
          register={register}
          error={errors.surname}
          inputProps={{ readOnly: linked, className: identityClass }}
        />
        <InputField
          label="E-mail (facultatif)"
          name="email"
          register={register}
          error={errors.email}
          inputProps={{ readOnly: linked, className: identityClass }}
        />
        <InputField
          label="Téléphone (facultatif)"
          name="phone"
          register={register}
          error={errors.phone}
          inputProps={{ readOnly: linked, className: identityClass }}
        />

        <InputField
          label="Poste"
          name="position"
          defaultValue={data?.position}
          register={register}
          error={errors.position}
        />

        <InputField
          label="Date d'embauche"
          name="hireDate"
          type="date"
          defaultValue={
            data?.hireDate
              ? new Date(data.hireDate).toISOString().split("T")[0]
              : undefined
          }
          register={register}
          error={errors.hireDate}
        />

        <InputField
          label="Salaire de base (FCFA)"
          name="baseSalary"
          type="number"
          defaultValue={data?.baseSalary}
          register={register}
          error={errors.baseSalary}
        />

        {/* Statut actif / inactif */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Statut</label>
          <select
            className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("active")}
            defaultValue={data?.active === false ? "false" : "true"}
          >
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
      </div>

      {state.error && (
        <span className="text-red-400 font-bold">
          {(state as any).message || "Une erreur s'est produite"}
        </span>
      )}

      <button
        disabled={loading}
        className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-400"
        type="submit"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default EmployeeForm;
