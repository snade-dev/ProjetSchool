"use client";

import { updateTuition } from "@/lib/actions/textAction";
import { schemas, Schemas } from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormState } from "react-dom";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useEffect } from "react";

const EditInput = ({
  TuitionId,
  studentId,
  month,
  onClose,
}: {
  TuitionId: string;
  studentId: string;
  month: number;
  onClose: () => void;
}) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Schemas>({
    resolver: zodResolver(schemas),
  });

  const [state, formAction] = useFormState(updateTuition, {
    success: false,
    error: false,
    message: "",
  });

  const onSubmit = handleSubmit(async (data: Schemas) => {
    // console.log(data);
    formAction({
      ...data,
      id: TuitionId,
      studentId: studentId,
      amont: Number(data.amont),
      month: month,
    });

    console.log(state);
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Montant mis à jour avec succès");
      router.refresh();
      onClose();
    } else if (state.error) {
      toast.error(state.message || "Une erreur est survenue");
    }
  }, [state.success, state.error, state.message, router, onClose]);

  return (
    <form onSubmit={onSubmit}>
      <input
        type="number"
        {...register("amont", {
          valueAsNumber: true,
        })}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Entrez le montant"
      />
      {errors.amont && (
        <p className="text-red-500 text-sm">{errors.amont.message}</p>
      )}
      <button
        className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        type="submit"
      >
        Envoyer
      </button>
    </form>
  );
};
export default EditInput;
