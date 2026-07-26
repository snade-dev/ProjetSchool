import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Attestation, Prisma, Quiz } from "@/app/generated/prisma";
import { Eye } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

import { sessionSchoolId } from "@/lib/authGuard";

// X08 — la demande porte l'élève et son bilan annuel : la direction peut
// émettre le certificat de transfert directement depuis la demande.
type AttestationList = Attestation & {
  student: {
    id: string;
    name: string;
    surname: string;
    username: string;
    enrollments: {
      conduct: string | null;
      workAppreciation: string | null;
      annualDecision: string | null;
      class: { name: string };
    }[];
  };
};

/**
 * X08 — Une demande concerne-t-elle un certificat de transfert ? Le module
 * « Demandes » a un titre LIBRE : on reconnaît la demande sur son intitulé
 * plutôt que d'imposer un type au formulaire existant.
 */
const isTransferRequest = (title: string) =>
  /transfert|transfer/i.test(title);

const ReclamationListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "status",
      accessor: "status",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "voir les details",
      accessor: "details",
      className: "hidden md:table-cell",
    },
    ...((role === "admin" || role === "director")
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: AttestationList) => {
    // Traduction des statuts
    const statusTranslations = {
      PENDING: "En attente",
      IN_PROGRESS: "En cours",
      RESOLVED: "Résolu",
      REJECTED: "Rejeté",
    };

    // Fonction de traduction
    const translateStatus = (status: string) => {
      return (
        statusTranslations[
          status.toUpperCase() as keyof typeof statusTranslations
        ] || status
      );
    };

    // Fonction pour déterminer le style en fonction du statut
    const getStatusStyle = (status: string) => {
      switch (status.toUpperCase()) {
        case "PENDING":
          return "bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs";
        case "IN_PROGRESS":
          return "bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs";
        case "RESOLVED":
          return "bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs";
        case "REJECTED":
          return "bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs";
        default:
          return "bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs";
      }
    };

    // Formater le statut pour l'affichage
    const formatStatus = (status: string) => {
      return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
      >
        <td className="flex items-center gap-4 p-4">
          <Link href={`/demande/${item.id}`} className="hover:underline">
            {item.title}
          </Link>
        </td>
        <td className="hidden md:table-cell">
          <span className={getStatusStyle(item.status)}>
            {translateStatus(item.status)}
          </span>
        </td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(item.requestDate))}
        </td>
        <td>
          <Link href={`/list/demande/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Eye className="w-4 h-4 text-white" />
            </button>
          </Link>
        </td>
        {(role === "admin" || role === "director") && (
          <td>
            <div className="flex items-center gap-2">
              {/* X08 — la demande d'un certificat de transfert se traite ici :
                  le formulaire est pré-rempli par le bilan annuel de l'élève et
                  l'émission clôt automatiquement la demande. */}
              {isTransferRequest(item.title) &&
                item.status !== "COMPLETED" &&
                item.student.enrollments.length > 0 && (
                  <FormContainer
                    table="transferCertificate"
                    type="create"
                    data={{
                      studentId: item.student.id,
                      studentName: `${item.student.name} ${item.student.surname}`,
                      username: item.student.username,
                      className: item.student.enrollments[0].class.name,
                      conduct: item.student.enrollments[0].conduct,
                      workAppreciation:
                        item.student.enrollments[0].workAppreciation,
                      annualDecision:
                        item.student.enrollments[0].annualDecision,
                      attestationId: item.id,
                    }}
                  />
                )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.AttestationWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "admin":
            break;
          case "search":
            query.title = {
              contains: value,
              mode: "insensitive",
            };
            break;
          default:
            break;
        }
      }
    }
  }

  // Role condition
  const roleConditions = {
    student: { enrollments: { some: { studentId: currentUserId! } } }, // W03
  };

  if ((role === "admin" || role === "director")) {
    // L'admin peut tout voir, pas besoin de filtrer par classe
  } else {
    // Pour les autres rôles, appliquer des conditions spécifiques
    // query.OR = [
    //   { classId: undefined },
    //   { class: roleConditions[role as keyof typeof roleConditions] || {} },
    // ];
  }

  // Requete vers la base de donnéés
  const [data, count] = await prisma.$transaction([
    prisma.attestation.findMany({
      where: { AND: [{ student: { schoolId } }, query] },
      // X08 — élève + inscription de l'année active (pré-remplissage du
      // certificat de transfert émis depuis la demande)
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            username: true,
            enrollments: {
              where: { schoolYear: { isActive: true } },
              select: {
                conduct: true,
                workAppreciation: true,
                annualDecision: true,
                class: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        title: "asc",
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attestation.count({ where: { AND: [{ student: { schoolId } }, query] } }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Touts les demandes effectuer
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* seul les etudiant doive pouvoir créer une demande */}
            {((role === "admin" || role === "director") || role === "student") && (
              <FormContainer table="attestation" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ReclamationListPage;
