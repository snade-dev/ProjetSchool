"use client";

import { Prisma } from "@/app/generated/prisma";
import { useForm, useFieldArray } from "react-hook-form";
import React, { useEffect, useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MakeupExamFormSchema,
  makeupExamFormSchema,
  makeupExamSchema,
  MakeupExamSchema,
  ResultFormSchema,
  resultFormSchema,
} from "@/lib/formsValidationSchema";
import { updateResults } from "@/lib/actions/resultAction";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { updateMakeupExam } from "@/lib/actions/makeupExamAction";
// On récupère le type des résultats étendus généré par Prisma
type ResultWithDetails = Prisma.MakeupExamGetPayload<{
  include: {
    subject: { select: { id: true; name: true } };
    student: {
      select: {
        id: true;
        name: true;
        classId: true;
        class: { select: { name: true } };
      };
    };
  };
}>;

// Les valeurs du formulaire ne contiennent que les champs à modifier (ici l'id et le score)
interface FormValues {
  results: {
    id: number;
    score: number;
  }[];
}

interface ResultFormProps {
  results: ResultWithDetails[];
}

export const ResultForm = ({ results }: ResultFormProps) => {
  console.log(results);

  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MakeupExamFormSchema>({
    resolver: zodResolver(makeupExamFormSchema),
    defaultValues: {
      // On initialise le formulaire avec l'id et le score de chaque résultat
      results: results.map((result) => ({
        id: result.id,
        score: result.score ?? 0,
      })),
    },
  });

  const [state, formAction] = useActionState(updateMakeupExam, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Reponses enregistrer avec success");
      router.push(`/list/results`);
      router.refresh();
    } else if (state.error) {
      toast.error("Erreur lors de l'enregistrement des réponses");
    }
  }, [state, router]);

  // Fonction de soumission du formulaire
  const onSubmit = async (data: MakeupExamFormSchema) => {
    try {
      formAction(data);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Échec de la mise à jour des résultats");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-3xl mx-auto p-6 space-y-6"
    >
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-2">
          {results[0].student.name}
        </h3>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* En-tête du tableau */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b">
          <div className="font-semibold text-gray-700">Matière</div>
          <div className="font-semibold text-gray-700">Score</div>
        </div>

        {/* Corps du tableau */}
        <div className="divide-y divide-gray-200">
          {results.map((result: ResultWithDetails, index) => (
            <div
              key={result.id}
              className="grid grid-cols-2 gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
            >
              <input type="hidden" {...register(`results.${index}.id`)} />

              <div className="text-gray-700">{result.subject.name}</div>

              <div>
                <input
                  id={`results.${index}.score`}
                  type="number"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  {...register(`results.${index}.score`, {
                    required: "Le score est obligatoire",
                    valueAsNumber: true,
                  })}
                />
                {errors.results && errors.results[index]?.score && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.results[index]?.score?.message as string}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
      >
        Mettre à jour les résultats
      </button>
    </form>
  );
};
