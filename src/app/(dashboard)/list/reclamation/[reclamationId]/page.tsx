// app/reclamations/[id]/page.tsx
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Complaint, Quiz } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { UpdateCorrect } from "./components/UpdateCorrect";

type ComplaintDetails = Complaint & {
  quiz: Quiz;
  student?: { name: string; username: string };
  teacher?: { name: string; username: string };
};

export default async function ReclamationDetailsPage({
  params,
}: {
  params: { reclamationId: string };
}) {
  const { reclamationId } = params;
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const complaint = await prisma.complaint.findUnique({
    where: { id: reclamationId },
    include: {
      quiz: true,
      student: { select: { name: true, username: true } },
    },
  });

  if (!complaint || !role) notFound();

  // Check if current user is a teacher
  // const isTeacher = userId
  //   ? !!(await prisma.teacher.findUnique({ where: { userId } }))
  //   : false;

  // Fetch necessary data for result display
  const [questionsWithAnswers, result] = await Promise.all([
    prisma.question.findMany({
      where: { quizId: complaint.quizId },
      include: {
        StudentAnswer: {
          where: { studentId: complaint.studentId },
        },
      },
    }),
    prisma.quizResult.findUnique({
      where: {
        studentId_quizId: {
          studentId: complaint.studentId,
          quizId: complaint.quizId,
        },
      },
    }),
  ]);

  if (!questionsWithAnswers || !result) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-8 space-y-8">
      {/* Détails de la réclamation */}
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">
            Détails de la réclamation
          </h1>
          <p className="mt-2 text-gray-500">ID: {reclamationId}</p>
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
                    {complaint.title}
                  </p>
                </div>

                {/* La description de la reclamation */}
                <div className="pb-6 border-b border-gray-100">
                  <h2 className="text-sm font-medium uppercase text-gray-600">
                    Description
                  </h2>
                  <p className="mt-2 text-gray-900 whitespace-pre-line">
                    {complaint.description}
                  </p>
                </div>

                {/* Lequiz concerner */}
                <div className="pb-6 border-b border-gray-100">
                  <h2 className="text-sm font-medium uppercase text-gray-600">
                    Quiz concerné
                  </h2>
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 font-medium">
                      {complaint.quiz?.title || "Aucun quiz associé"}
                    </p>
                  </div>
                </div>

                {/* Le nom de l'etudiant */}
                {complaint.student && (
                  <div className="pb-6 border-b border-gray-100">
                    <h2 className="text-sm font-medium uppercase text-gray-600">
                      Étudiant
                    </h2>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">
                        <span className="font-medium">
                          {complaint.student.name}
                        </span>{" "}
                        ({complaint.student.username})
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
                    }).format(new Date(complaint.createdAt))}
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
                    complaint.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : complaint.status === "UNDER_REVIEW"
                      ? "bg-blue-100 text-blue-800"
                      : complaint.status === "RESOLVED"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {complaint.status === "PENDING"
                    ? "En attente"
                    : complaint.status === "UNDER_REVIEW"
                    ? "En cours d'examen"
                    : complaint.status === "RESOLVED"
                    ? "Résolu"
                    : "Rejeté"}
                </span>

                {/* Boutons d'action pour les enseignants */}
                {(role === "admin" || role === "teacher") && (
                  <div className="flex gap-4">
                    <form
                      action={async () => {
                        "use server";
                        await prisma.complaint.update({
                          where: { id: reclamationId },
                          data: { status: "RESOLVED" },
                        });
                        console.log("reclamation modifier avec success");
                        redirect(`/app/reclamations/${reclamationId}`);
                      }}
                    >
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        disabled={
                          !["PENDING", "UNDER_REVIEW"].includes(
                            complaint.status
                          )
                        }
                      >
                        Valider
                      </button>
                    </form>

                    <form
                      action={async () => {
                        "use server";

                        await prisma.complaint.update({
                          where: { id: reclamationId },
                          data: { status: "REJECTED" },
                        });
                        redirect(`/app/reclamations/${reclamationId}`);
                      }}
                    >
                      <button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        disabled={
                          !["PENDING", "UNDER_REVIEW"].includes(
                            complaint.status
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
          </div>
        </div>
      </div>

      {/* Copie de l'étudiant */}
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
        {complaint.status === "REJECTED" ? (
          <p>Cette reclamation à été rejetée</p>
        ) : complaint.status === "RESOLVED" ? (
          <UpdateCorrect
            questions={questionsWithAnswers}
            quizId={complaint.quizId}
            studentId={complaint.studentId}
            role={role}
          />
        ) : (
          <p>En attente de traitement</p>
        )}
      </div>
    </div>
  );
}
