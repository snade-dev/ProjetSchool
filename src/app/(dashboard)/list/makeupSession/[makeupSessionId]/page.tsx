import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterButton } from "./components/RegisterButton";
import { headers } from "next/headers";

export default async function MakeupSessionDetailsPage(props: {
  params: Promise<{ makeupSessionId: string }>;
}) {
  const params = await props.params;
  const { makeupSessionId } = params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const userId = session?.user.id;

  const makeupSession = await prisma.makeupSession.findUnique({
    where: { id: makeupSessionId },
    include: {
      semester: true,
      createdBy: true,
      registrations: {
        include: {
          student: true,
          subject: true,
        },
      },
    },
  });

  if (!userId || !makeupSession || !role) notFound();

  const isRegistered = makeupSession.registrations.some(
    (registration) => registration.studentId === userId
  );

  const isRegisteredSubjects = makeupSession.registrations
    .filter((registration) => registration.studentId === userId)
    .map((registration) => registration.subjectId);

  const subjects = await prisma.subject.findMany();

  // Regrouper les inscriptions par étudiant
  const studentRegistrations = makeupSession.registrations.reduce(
    (acc, registration) => {
      if (!acc[registration.studentId]) {
        acc[registration.studentId] = {
          student: registration.student,
          subjects: [],
        };
      }
      acc[registration.studentId].subjects.push(registration.subject);
      return acc;
    },
    {} as Record<string, { student: any; subjects: any[] }>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">
            Session de rattrapage
          </h1>
        </div>

        <div className="space-y-6">
          {/* Titre */}
          <div className="pb-6 border-b border-gray-100">
            <h2 className="text-sm font-medium uppercase text-gray-600">
              Titre
            </h2>
            <p className="mt-2 text-lg text-gray-900 font-medium">
              {makeupSession.title}
            </p>
          </div>

          {/* Description */}
          {makeupSession.description && (
            <div className="pb-6 border-b border-gray-100">
              <h2 className="text-sm font-medium uppercase text-gray-600">
                Description
              </h2>
              <p className="mt-2 text-gray-900 whitespace-pre-line">
                {makeupSession.description}
              </p>
            </div>
          )}

          {/* Horaires */}
          <div className="pb-6 border-b border-gray-100">
            <h2 className="text-sm font-medium uppercase text-gray-600">
              Horaires
            </h2>
            <div className="mt-2 space-y-2">
              <p className="text-gray-900">
                <span className="font-medium">Début:</span>{" "}
                {new Date(makeupSession.startTime).toLocaleString("fr-FR")}
              </p>
              <p className="text-gray-900">
                <span className="font-medium">Fin:</span>{" "}
                {new Date(makeupSession.endTime).toLocaleString("fr-FR")}
              </p>
            </div>
          </div>

          {/* Semestre */}
          <div className="pb-6 border-b border-gray-100">
            <h2 className="text-sm font-medium uppercase text-gray-600">
              Semestre
            </h2>
            <p className="mt-2 text-gray-900">{makeupSession.semester.name}</p>
          </div>

          {/* Liste des inscrits */}
          <div className="pb-6 border-b border-gray-100">
            <h2 className="text-sm font-medium uppercase text-gray-600">
              Étudiants inscrits ({Object.keys(studentRegistrations).length})
            </h2>
            <div className="mt-4">
              {Object.keys(studentRegistrations).length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {Object.values(studentRegistrations).map((registration) => (
                    <li
                      key={registration.student.id}
                      className="py-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-gray-900 font-medium">
                          {registration.student.name}{" "}
                          {registration.student.surname}
                        </p>
                        <div className="text-gray-600 text-sm mt-1">
                          {registration.subjects.map((subject) => (
                            <span
                              key={subject.id}
                              className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm mr-2 mb-1"
                            >
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">
                  Aucun étudiant inscrit pour le moment
                </p>
              )}
            </div>
          </div>

          {/* Bouton d'inscription */}
          {role === "student" && (
            <div className="flex justify-end mt-6">
              <RegisterButton
                semesterId={makeupSession.semesterId}
                makeupSessionId={makeupSessionId}
                registeredSubjects={isRegisteredSubjects}
                userId={userId}
                subjects={subjects.filter(
                  (subject) => !isRegisteredSubjects.includes(subject.id)
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
