import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Class, Prisma, Student, TuitionPayment } from "@/app/generated/prisma";
import { Download, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ClassFilter from "./components/classFilter";
import dynamic from "next/dynamic";
import ReceiptButton from "./components/ReceiptButton";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

// const ReceiptButton = dynamic(() => import("./components/ReceiptButton"), {
//   ssr: false,
// });

type TuitionPaymentList = Student & { class: Class } & {
  TuitionPayment: TuitionPayment[];
};

const TuitionListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (!userId) {
    notFound();
  }

  const columns = [
    { header: "Nom", accessor: "name", className: "hidden md:table-cell" },
    {
      header: "Prénom",
      accessor: "surname",
      className: "hidden md:table-cell",
    },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    {
      header: "Total payé",
      accessor: "totalPaid",
      className: "hidden md:table-cell",
    },
    // Colonne Actions uniquement pour l'admin
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  // Génération des lignes
  const renderRow = (item: TuitionPaymentList) => {
    const totalPaid = item.TuitionPayment
      ? item.TuitionPayment.reduce((total, p) => total + p.amount, 0)
      : 0;

    const hasPayments = item.TuitionPayment && item.TuitionPayment.length > 0;

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className=" hidden md:table-cell">{item.name || "N/A"}</td>
        <td className=" hidden md:table-cell">{item.surname || "N/A"}</td>
        <td className=" hidden md:table-cell">{item.class.name || "N/A"}</td>
        <td className=" hidden md:table-cell">{totalPaid}</td>
        <td className=" hidden md:table-cell">
          <div className="flex items-center gap-2">
            <Link href={`/list/tuitionPayment/${item.id}`}>
              <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
                <Eye className="w-4 h-4 text-white" />
              </button>
            </Link>
            {hasPayments && (
              <ReceiptButton
                student={{
                  name: item.name,
                  surname: item.surname,
                  className: item.class.name,
                }}
                payments={item.TuitionPayment}
                year={2025} // À remplacer par une variable si nécessaire
              />
            )}
          </div>
        </td>
        {/* {role === "admin" && (
          <td>
            <div className="flex items-center gap-2">
              <FormContainer table="attendance" type="update" data={item} />
              <FormContainer table="attendance" type="delete" id={item.id} />
            </div>
          </td>
        )} */}
      </tr>
    );
  };

  // Gestion des paramètres de recherche
  const { page, classId, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.StudentWhereInput = {};

  // Ajout de filtres basés sur la recherche
  if (queryParams.search) {
    query.OR = [
      {
        name: { contains: queryParams.search, mode: "insensitive" },
      },
      {
        class: { name: { contains: queryParams.search, mode: "insensitive" } },
      },
    ];
  }

  if (role === "parent") {
    query.parentId = userId;
  }

  // Ajouter filtre par classe si spécifié
  if (classId) {
    query.classId = parseInt(classId);
  }

  // Récupérer toutes les classes pour le filtre
  const classes = await prisma.class.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Requête vers la base de données
  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      select: {
        id: true,
        name: true,
        surname: true,
        class: { select: { name: true } },
        // Récupérer les paiements de scolarité pour l'année donnée
        TuitionPayment: {
          where: { year: Number(2025) },
          select: { month: true, amount: true, paymentDate: true },
        },
      },
    }),
    prisma.student.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Liste des Scolarités
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <ClassFilter classId={parseInt(classId || "")} classes={classes} />
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {/* {role === "admin" && (
              <FormContainer table="attendance" type="create" />
            )} */}
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

export default TuitionListPage;
