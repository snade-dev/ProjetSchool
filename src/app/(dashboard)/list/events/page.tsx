import FormContainer from "@/components/FormContainer";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Class, Event, Prisma } from "@/app/generated/prisma";
import { headers } from "next/headers";
import Link from "next/link";

import { sessionSchoolId } from "@/lib/authGuard";
// X06 — la liste porte l'état du registre de cotisation (montant + encaissé)
type EventList = Event & {
  class: Class;
  contribution:
    | { id: number; amount: number; closedAt: Date | null; collected: number }
    | null;
};

const EventListPage = async (props: {
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

  // X06 — le registre de cotisation est une donnée financière : direction et
  // comptable seulement (la fiche /list/events/[id] applique la même règle).
  const canSeeContribution = ["admin", "director", "accountant"].includes(
    role ?? ""
  );

  const columns = [
    {
      header: "Nom",
      accessor: "title",
    },
    {
      header: "Classe",
      accessor: "class",
    },
    ...(canSeeContribution
      ? [
          {
            header: "Cotisation",
            accessor: "contribution",
            className: "hidden md:table-cell",
          },
        ]
      : []),
    {
      header: "Date de l'evenement",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Date de Début",
      accessor: "startTime",
      className: "hidden md:table-cell",
    },
    {
      header: "Date de Fin",
      accessor: "endTime",
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

  const renderRow = (item: EventList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        {canSeeContribution ? (
          <Link
            href={`/list/events/${item.id}`}
            className="font-medium hover:underline"
          >
            {item.title}
          </Link>
        ) : (
          item.title
        )}
      </td>
      <td>{item.class?.name || "-"}</td>
      {canSeeContribution && (
        <td className="hidden md:table-cell">
          {item.contribution ? (
            <Link
              href={`/list/events/${item.id}`}
              className="flex items-center gap-1.5 text-xs"
            >
              <span className="rounded-full bg-lamaSky px-2 py-1 text-sky-900 whitespace-nowrap">
                {item.contribution.amount.toLocaleString("fr-FR")} FCFA
              </span>
              <span className="text-gray-400 whitespace-nowrap">
                {item.contribution.collected.toLocaleString("fr-FR")} encaissés
              </span>
              {item.contribution.closedAt && (
                <span className="text-gray-300">· clôturé</span>
              )}
            </Link>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
      )}
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.startTime)}
      </td>
      <td className="hidden md:table-cell">
        {item.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td className="hidden md:table-cell">
        {item.endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "director") && (
            <>
              <FormContainer table="event" type="update" data={item} />
              <FormContainer table="event" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.EventWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
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

  // Role condition — W03 : l'appartenance à la classe passe par l'Enrollment
  const roleConditions = {
    teacher: { lessons: { some: { teacherId: currentUserId! } } },
    student: { enrollments: { some: { studentId: currentUserId! } } },
    // W05 — le lien parent-enfant passe par StudentGuardian
    parent: {
      enrollments: {
        some: {
          student: { guardians: { some: { parentId: currentUserId! } } },
        },
      },
    },
  };

  if ((role === "admin" || role === "director")) {
    // L'admin peut tout voir, pas besoin de filtrer par classe
  } else {
    // Pour les autres rôles, appliquer des conditions spécifiques
    query.OR = [
      { classId: null },
      { class: roleConditions[role as keyof typeof roleConditions] || {} },
    ];
  }

  // Requete vers la base de donnéés
  // X06 — le barème et ses versements sont chargés avec l'événement (une seule
  // requête, pas de N+1) ; le cumul encaissé est calculé en mémoire.
  const [rows, count] = await prisma.$transaction([
    prisma.event.findMany({
      where: { AND: [{ schoolId }, query] },
      include: {
        class: true,
        contribution: canSeeContribution
          ? {
              select: {
                id: true,
                amount: true,
                closedAt: true,
                payments: { select: { amount: true } },
              },
            }
          : false,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.event.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  const data: EventList[] = rows.map((e) => {
    const contribution = (e as typeof e & {
      contribution?: {
        id: number;
        amount: number;
        closedAt: Date | null;
        payments: { amount: number }[];
      } | null;
    }).contribution;
    return {
      ...e,
      contribution: contribution
        ? {
            id: contribution.id,
            amount: contribution.amount,
            closedAt: contribution.closedAt,
            collected: contribution.payments.reduce(
              (sum, p) => sum + p.amount,
              0
            ),
          }
        : null,
    } as EventList;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Tous les evènements
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "director") && <FormContainer table="event" type="create" />}
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

export default EventListPage;
