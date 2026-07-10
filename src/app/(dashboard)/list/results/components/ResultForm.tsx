"use client";

import { Prisma } from "@/app/generated/prisma";
import { useForm } from "react-hook-form";
import React, { useEffect, useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ResultFormSchema,
  resultFormSchema,
} from "@/lib/formsValidationSchema";
import { updateResults } from "@/lib/actions/resultAction";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type ResultWithDetails = Prisma.ResultGetPayload<{
  include: {
    exam: { select: { id: true; title: true } };
    semester: { select: { id: true; name: true } };
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

interface FormValues {
  results: {
    id: number;
    score: number;
    classscore: number; // Ajout du classscore
  }[];
}

interface ResultFormProps {
  results: ResultWithDetails[];
}

export const ResultForm = ({ results }: ResultFormProps) => {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResultFormSchema>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      results: results.map((result) => ({
        id: result.id,
        score: result.score,
        classscore: result.classScore ?? undefined, // Initialisation du classscore
      })),
    },
  });

  const [state, formAction] = useActionState(updateResults, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Réponses enregistrées avec succès");
      router.push(`/list/results`);
      router.refresh();
    } else if (state.error) {
      toast.error("Erreur lors de l'enregistrement des réponses");
    }
  }, [state, router]);

  const onSubmit = async (data: ResultFormSchema) => {
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
          {results[0].exam?.title} - {results[0].student.name}
        </h3>
        <p className="text-gray-600 mb-4">
          Semestre : {results[0].semester.name}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Modification de l'en-tête pour ajouter Class Score */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
          <div className="font-semibold text-gray-700">Matière</div>
          <div className="font-semibold text-gray-700">Note d&apos;examen</div>
          <div className="font-semibold text-gray-700">Note de Classe</div>
        </div>

        <div className="divide-y divide-gray-200 flex flex-col">
          {results.map((result: ResultWithDetails, index) => (
            <div
              key={result.id}
              className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
            >
              <input type="hidden" {...register(`results.${index}.id`)} />

              <div className="text-gray-700">{result.subject.name}</div>

              {/* Champ Score */}
              <div>
                <label htmlFor={`results.${index}.score`}>Note de classe</label>
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
                {errors.results?.[index]?.score && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.results[index]?.score?.message}
                  </span>
                )}
              </div>

              {/* Nouveau champ Class Score */}
              <div>
                <label htmlFor={`results.${index}.score`}>Note d'examen</label>

                <input
                  id={`results.${index}.classscore`}
                  type="number"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  {...register(`results.${index}.classscore`, {
                    required: "Le class score est obligatoire",
                    valueAsNumber: true,
                  })}
                />
                {errors.results?.[index]?.classscore && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.results[index]?.classscore?.message}
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
