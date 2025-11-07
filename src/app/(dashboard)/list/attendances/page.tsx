import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import {
  Attendance,
  Class,
  Prisma,
  Student,
  Subject,
} from "@/app/generated/prisma";
import clsx from "clsx";
import Image from "next/image";
import { headers } from "next/headers";

type AttendanceList = Attendance & { class: Class } & { student: Student } & {
  subject: Subject;
};

const AttendanceListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const userId = session?.user.id;

  // Colonnes du tableau
  const columns = [
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    { header: "Présent", accessor: "present" },
    {
      header: "Session",
      accessor: "session",
      className: "hidden md:table-cell",
    }, // Nouvelle colonne
    {
      header: "Étudiant",
      accessor: "student.name",
      className: "hidden md:table-cell",
    },
    {
      header: "class",
      accessor: "class.name",
      className: "hidden md:table-cell",
    },
    {
      header: "Matiere",
      accessor: "subject.name",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  // Génération des lignes
  const renderRow = (item: AttendanceList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("fr-FR").format(new Date(item.date))}
      </td>
      <td
        className={clsx("flex items-center gap-4 p-4", {
          "text-green-500 font-bold": item.present,
          "font-bold text-red-600": !item.present,
        })}
      >
        {item.present ? "Présent" : "Absent"}
      </td>
      <td className="hidden md:table-cell">
        {item.sessionDay === "MORNING"
          ? "Matin"
          : item.sessionDay === "EVENING"
          ? "Soir"
          : "N/A"}
      </td>
      <td className="hidden md:table-cell">{item.student?.name || "N/A"}</td>
      <td className="hidden md:table-cell">{item.class?.name || "N/A"}</td>
      <td className="hidden md:table-cell">{item.subject?.name || "N/A"}</td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer table="attendance" type="update" data={item} />
            <FormContainer table="attendance" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  // Gestion des paramètres de recherche
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.AttendanceWhereInput = {};

  // Ajout de filtres basés sur la recherche
  if (queryParams.search) {
    query.OR = [
      {
        student: {
          name: { contains: queryParams.search, mode: "insensitive" },
        },
      },
      {
        subject: {
          name: { contains: queryParams.search, mode: "insensitive" },
        },
      },
      {
        class: { name: { contains: queryParams.search, mode: "insensitive" } },
      },
    ];
  }

  // Ajout de restrictions basées sur le rôle
  // if (role !== "admin") {
  //   const roleConditions = {
  //     teacher: { lesson: { teacherId: currentUserId! } },
  //     student: { studentId: currentUserId! },
  //     parent: { student: { parentId: currentUserId! } },
  //   };

  //   query.AND = [roleConditions[role as keyof typeof roleConditions] || {}];
  // }

  // Requête vers la base de données
  const [data, count] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: true, // Inclure les détails de l'étudiant
        subject: true, // Inclure les détails de la leçon
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Liste des présences
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
            {role === "admin" && (
              <FormContainer table="attendance" type="create" />
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

export default AttendanceListPage;
