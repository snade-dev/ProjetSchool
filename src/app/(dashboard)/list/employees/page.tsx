import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import EmployeeFilters from "./components/EmployeeFilters";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { formatFCFA } from "@/lib/finance";
import { Employee, Teacher, Prisma } from "@/app/generated/prisma";
import Link from "next/link";

type EmployeeList = Employee & { teacher: Teacher | null };

// Initiales pour l'avatar (« Awa Diallo » → « AD »).
const initials = (name: string, surname: string) =>
  `${(name?.[0] ?? "").toUpperCase()}${(surname?.[0] ?? "").toUpperCase()}`;

const EmployeesListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const { page, search, status } = searchParams;
  const p = page ? parseInt(page) : 1;

  // --- Filtres ---
  const query: Prisma.EmployeeWhereInput = {};
  const andFilters: Prisma.EmployeeWhereInput[] = [];

  if (search) {
    andFilters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { surname: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (status === "active") andFilters.push({ active: true });
  else if (status === "inactive") andFilters.push({ active: false });

  if (andFilters.length > 0) query.AND = andFilters;

  const [data, count] = await Promise.all([
    prisma.employee.findMany({
      where: query,
      include: { teacher: true },
      orderBy: [{ active: "desc" }, { name: "asc" }, { surname: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.employee.count({ where: query }),
  ]);

  const columns = [
    { header: "Employé", accessor: "employee" },
    { header: "Poste", accessor: "position" },
    { header: "Lié à", accessor: "linked", className: "hidden md:table-cell" },
    {
      header: "Embauche",
      accessor: "hireDate",
      className: "hidden lg:table-cell",
    },
    { header: "Salaire de base", accessor: "baseSalary" },
    { header: "Statut", accessor: "active" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: EmployeeList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-lamaSky text-xs font-semibold text-gray-700">
          {initials(item.name, item.surname)}
        </div>
        <span className="font-medium">
          {item.name} {item.surname}
        </span>
      </td>
      <td>{item.position}</td>
      <td className="hidden md:table-cell">
        {item.teacherId ? (
          <Link
            href={`/list/teachers/${item.teacherId}`}
            className="text-xs px-2 py-1 rounded-full bg-lamaPurpleLight text-purple-700 hover:underline"
          >
            Enseignant
          </Link>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            Staff
          </span>
        )}
      </td>
      <td className="hidden lg:table-cell whitespace-nowrap">
        {new Intl.DateTimeFormat("fr-FR").format(item.hireDate)}
      </td>
      <td className="whitespace-nowrap">{formatFCFA(item.baseSalary)}</td>
      <td>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            item.active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {item.active ? "Actif" : "Inactif"}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <FormContainer table="employee" type="update" data={item} />
          <FormContainer table="employee" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Employés</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <FormContainer table="employee" type="create" />
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="mt-4">
        <EmployeeFilters status={status} />
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default EmployeesListPage;
