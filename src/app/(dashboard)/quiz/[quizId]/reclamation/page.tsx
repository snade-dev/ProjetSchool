import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@clerk/nextjs/server";
import { Complaint, Prisma, Quiz } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type ComplainList = Complaint & { quiz: Quiz };

const ReclamationListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims, userId } = await auth();
  const currentUserId = userId;
  const role = (sessionClaims?.metadata as { role: string })?.role;

  console.log("role", role);

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Matiere",
      accessor: "subject",
      className: "hidden md:table-cell",
    },
    {
      header: "Enseignant",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Questions",
      accessor: "questions",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];


  const renderRow = (item: ComplainList) => {
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
          <Link href={`/reclamations/${item.id}`} className="hover:underline">
            {item.title}
          </Link>
        </td>
        <td className="hidden md:table-cell">{item.quiz?.title || "-"}</td>
        <td className="hidden md:table-cell">
          <span className={getStatusStyle(item.status)}>
            {translateStatus(item.status)}
          </span>
        </td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(item.createdAt))}
        </td>
        {role === "admin" && (
          <td>
            <div className="flex items-center gap-2">
              {/* <FormContainer table="complaint" type="update" data={item} />
              <FormContainer table="complaint" type="delete" id={item.id} /> */}
            </div>
          </td>
        )}
      </tr>
    );
  };

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.ComplaintWhereInput = {};

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
    student: { students: { some: { id: currentUserId! } } },
  };

  if (role === "admin") {
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
    prisma.complaint.findMany({
      where: query,
      include: {
        quiz: true,
      },
      orderBy: {
        title: "asc",
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.complaint.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Touts les reclamation effectuer
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {(role === "student" || role === "admin") && (
              <FormContainer table="quiz" type="create" />
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
