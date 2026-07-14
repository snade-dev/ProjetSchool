import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Class, Prisma, Student } from "@/app/generated/prisma";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { sessionSchoolId } from "@/lib/authGuard";
// W03 — la classe vient de l'inscription de l'année active
// W05 — les tuteurs viennent de StudentGuardian
type StudentList = Student & {
  enrollments: { class: Class }[];
  guardians: { parent: { name: string; surname: string } }[];
};

const StudentListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const columns = [
    {
      header: "Informations",
      accessor: "info",
    },
    {
      header: "Nom d'utilisateur",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Classes",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Tuteurs",
      accessor: "guardians",
      className: "hidden md:table-cell",
    },
    {
      header: "Téléphones",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
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

  const RenderRow = (item: StudentList) => (
    <tr
      key={item.id}
      className=" border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
    >
      <td className=" flex items-center gap-4 p-4">
        <Image
          src={item.img || "/noAvatar.png"}
          width={40}
          height={40}
          alt=""
          className=" md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className=" flex flex-col">
          <h3 className=" font-semibold">{item.name}</h3>
          <p className=" text-xs text-gray-500">
            {item.enrollments[0]?.class.name ?? "Non inscrit"}
          </p>
        </div>
      </td>
      <td className=" hidden md:table-cell">{item.username}</td>
      <td className=" hidden md:table-cell">
        {item.enrollments[0]?.class.name[0] ?? "-"}
      </td>
      <td className=" hidden md:table-cell">
        {item.guardians.map((g) => g.parent.name).join(", ") || "-"}
      </td>
      <td className=" hidden lg:table-cell">{item.phone}</td>
      <td className=" hidden lg:table-cell">{item.address}</td>
      <td>
        <div className=" flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Eye className="w-4 h-4 text-white" />
            </button>
          </Link>
          {role === "admin" && (
            // <button className=" w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
            //   {/* <Image src={"/delete.png"} alt="" width={16} height={16} /> */}

            // </button>
            <FormContainer table="student" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
  );

  // URL params condition
  const query: Prisma.StudentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "teacherId":
            // W03 — l'appartenance à une classe passe par l'Enrollment
            query.enrollments = {
              some: {
                class: {
                  lessons: {
                    some: {
                      teacherId: value,
                    },
                  },
                },
              },
            };
            break;
          case "search":
            query.name = {
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

  // Requete vers la base de donnéés
  // W03 — la classe affichée = inscription de l'année scolaire ACTIVE de l'école
  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: { AND: [{ schoolId }, query] },
      include: {
        enrollments: {
          where: { schoolYear: { isActive: true } },
          include: { class: true },
          take: 1,
        },
        // W05 — tuteurs de l'élève (colonne « Tuteurs »)
        guardians: {
          select: { parent: { select: { name: true, surname: true } } },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.student.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  return (
    <div className=" bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className=" flex items-center justify-between">
        <h1 className=" hidden md:block text-lg font-semibold">
          Tous les étudiants
        </h1>
        <div className=" flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className=" flex items-center self-end gap-4">
            {role === "admin" && (
              <FormContainer table="student" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <div className="">
        <Table columns={columns} renderRow={RenderRow} data={data} />
      </div>
      {/* PAGINATION */}
      <div className="">
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};
export default StudentListPage;
