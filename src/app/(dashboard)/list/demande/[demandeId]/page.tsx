// app/reclamations/[id]/page.tsx
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Attestation, Student } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import UpdateDate  from "./components/UpdateDate";

type AttestationDetail = Attestation & { student: Student };

export default async function DemandeDetailsPage({
  params,
}: {
  params: { demandeId: string };
}) {
  const { demandeId } = params;
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Fetch complaint details
  const attestation = await prisma.attestation.findUnique({
    where: { id: demandeId },
    include: {
      student: true,
    },
  });

  if (!attestation) notFound();

  if (!role) {
    notFound();
  }
  // Check if current user is a teacher
  // const isTeacher = userId
  //   ? !!(await prisma.teacher.findUnique({ where: { userId } }))
  //   : false;

  const isTeacher = true;

  return (
    <div className="min-h-screen bg-gray-50 py-8 space-y-8">
      {/* Détails de la réclamation */}
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">
            Détails de la demande
          </h1>
          <p className="mt-2 text-gray-500">ID: {demandeId}</p>
        </div>

        <div className="space-y-8">
          {/* Section Principale */}
          <div className="space-y-6">
            {/* ... Les sections existantes restent inchangées ... */}
            <div>
              <div>
                {/* L'objet de la reclamation */}
                <div className="pb-6 border-b border-gray-100">
                  <h2 className="text-sm font-medium uppercase text-gray-600">
                    Objet de la reclamation
                  </h2>
                  <p className="mt-2 text-lg text-gray-900 font-medium">
                    {attestation.title}
                  </p>
                </div>

                {/* La description de la reclamation */}
                <div className="pb-6 border-b border-gray-100">
                  <h2 className="text-sm font-medium uppercase text-gray-600">
                    Description
                  </h2>
                  <p className="mt-2 text-gray-900 whitespace-pre-line">
                    {attestation.description}
                  </p>
                </div>

                {/* Le nom de l'etudiant */}
                {attestation.student && (
                  <div className="pb-6 border-b border-gray-100">
                    <h2 className="text-sm font-medium uppercase text-gray-600">
                      Étudiant
                    </h2>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">
                        <span className="font-medium">
                          {attestation.student.name}
                        </span>{" "}
                        ({attestation.student.username})
                      </p>
                    </div>
                  </div>
                )}

                {/* La date de creation */}
                <div>
                  <h2 className="text-sm font-medium uppercase text-gray-600">
                    Date de création
                  </h2>
                  <p className="mt-2 text-gray-500">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "full",
                      timeStyle: "short",
                    }).format(new Date(attestation.requestDate))}
                  </p>
                </div>
              </div>
            </div>

            {/* Section Statut */}
            <div className="pb-6 border-b border-gray-100">
              <h2 className="text-sm font-medium uppercase text-gray-600">
                Statut
              </h2>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                    attestation.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : attestation.status === "PROCESSING"
                      ? "bg-blue-100 text-blue-800"
                      : attestation.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {attestation.status === "PENDING"
                    ? "En attente"
                    : attestation.status === "PROCESSING"
                    ? "En cours d'examen"
                    : attestation.status === "COMPLETED"
                    ? "Résolu"
                    : "Rejeté"}
                </span>

                {/* Boutons d'action pour les enseignants */}
                {isTeacher && (
                  <div className="flex gap-4">
                    <form
                      action={async () => {
                        "use server";
                        await prisma.attestation.update({
                          where: { id: demandeId },
                          data: { status: "COMPLETED" },
                        });
                        console.log("reclamation modifier avec success");
                        redirect(`/app/reclamations/${demandeId}`);
                      }}
                    >
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        disabled={
                          !["PENDING", "UNDER_REVIEW"].includes(
                            attestation.status
                          )
                        }
                      >
                        Valider
                      </button>
                    </form>

                    <form
                      action={async () => {
                        "use server";

                        await prisma.attestation.update({
                          where: { id: demandeId },
                          data: { status: "REJECTED" },
                        });
                        redirect(`/app/reclamations/${demandeId}`);
                      }}
                    >
                      <button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        disabled={
                          !["PENDING", "UNDER_REVIEW"].includes(
                            attestation.status
                          )
                        }
                      >
                        Rejeter
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* ... Le reste des sections existantes ... */}

            {/* Copie de l'étudiant */}
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
              {/* <Result questions={questionsWithAnswers} score={result.totalScore} /> */}
              {attestation.status === "REJECTED" ? (
                <p>Cette reclamation à été rejetéé </p>
              ) : (
                <UpdateDate attestationId={demandeId} role={role} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
