import prisma from "@/lib/prisma";
import FormContainer from "@/components/FormContainer";
import { EyeOff } from "lucide-react";
import {
  observationKindBadge,
  observationKindLabel,
} from "@/lib/observation";

/**
 * W15 — dossier « Observations » de la fiche élève (§2.3.7).
 * Server component (la fiche élève a déjà vérifié l'accès à CET élève) :
 * - admin / director / supervisor / teacher : TOUTES les observations
 *   (y compris confidentielles, marquées d'un œil barré) + saisie ;
 * - parent / student : UNIQUEMENT les observations partagées (§2.7.8) —
 *   les confidentielles n'existent pas pour eux (filtre requête, pas CSS).
 * Modification/suppression : auteur de l'observation, ou admin/director
 * (revérifié côté serveur dans observationAction).
 */
const ObservationSection = async ({
  studentId,
  role,
  userId,
}: {
  studentId: string;
  role: string;
  userId: string;
}) => {
  const isStaff = ["admin", "director", "supervisor", "teacher"].includes(role);

  const observations = await prisma.observation.findMany({
    where: {
      studentId,
      // §2.7.8 — parent/élève : les observations confidentielles sont
      // EXCLUES de la requête (jamais envoyées au client).
      ...(isStaff ? {} : { sharedWithParents: true }),
    },
    orderBy: { createdAt: "desc" },
  });

  // Auteur (User.id sans FK) : noms résolus en une requête.
  const authorIds = [...new Set(observations.map((o) => o.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const authorName = new Map(authors.map((a) => [a.id, a.name]));

  return (
    <div className="mt-4 bg-white rounded-md p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Observations</h1>
        {/* saisie : enseignants (leurs classes) + supervisor/director/admin */}
        {isStaff && (
          <FormContainer table="observation" type="create" data={{ studentId }} />
        )}
      </div>
      {observations.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">
          Aucune observation enregistrée.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {observations.map((o) => {
            const editable =
              isStaff &&
              (role === "admin" || role === "director" || o.authorId === userId);
            return (
              <li
                key={o.id}
                className="rounded-md border border-gray-100 bg-slate-50/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${observationKindBadge(o.kind)}`}
                    >
                      {observationKindLabel(o.kind)}
                    </span>
                    {isStaff && !o.sharedWithParents && (
                      <span
                        title="Confidentielle — non partagée avec les parents"
                        className="flex items-center gap-1 text-[11px] text-gray-400"
                      >
                        <EyeOff size={12} /> confidentielle
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                      }).format(o.createdAt)}
                      {" · "}
                      {authorName.get(o.authorId) ?? "—"}
                    </span>
                  </div>
                  {editable && (
                    <div className="flex items-center gap-2">
                      <FormContainer table="observation" type="update" data={o} />
                      <FormContainer table="observation" type="delete" id={o.id} />
                    </div>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                  {o.content}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ObservationSection;
