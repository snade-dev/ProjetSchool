import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import CategoryManager from "./components/CategoryManager";
import ExpenseFilters from "./components/ExpenseFilters";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { sessionSchoolId } from "@/lib/authGuard";
import { formatFCFA, paymentMethodLabel } from "@/lib/finance";
import { buildExpenseWhere } from "@/lib/queryBuilders";
import ExportCsvButton from "@/components/ExportCsvButton";
import { Expense, ExpenseCategory, Prisma } from "@/app/generated/prisma";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ExpenseList = Expense & { category: ExpenseCategory };

// Palette de badges par catégorie (couleur stable dérivée de l'id).
const CATEGORY_BADGES = [
  "bg-lamaSkyLight text-sky-700",
  "bg-lamaPurpleLight text-purple-700",
  "bg-lamaYellowLight text-yellow-700",
  "bg-green-50 text-green-700",
  "bg-red-50 text-red-700",
  "bg-orange-50 text-orange-700",
];

const ExpensesListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  // W07 — écriture : admin + comptable ; la direction consulte (lecture).
  const canManage = role === "admin" || role === "accountant";

  const { page, month, year, categoryId, search } = searchParams;
  const p = page ? parseInt(page) : 1;

  const now = new Date();

  // --- Filtres (builder partagé avec l'export CSV S18) ---
  // V03 — cloisonnement : dépenses de l'école de la session uniquement
  const schoolId = sessionSchoolId(session);
  const query: Prisma.ExpenseWhereInput = {
    AND: [
      { schoolYear: { schoolId } },
      buildExpenseWhere({ month, year, categoryId, search, now }),
    ],
  };

  const [data, count, totalAgg, firstExpense, categories] = await Promise.all([
    prisma.expense.findMany({
      where: query,
      include: { category: true },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.expense.count({ where: query }),
    // Total de la période = Σ amount sur les MÊMES filtres (pas seulement la page).
    prisma.expense.aggregate({
      where: query,
      _sum: { amount: true },
    }),
    prisma.expense.findFirst({
      where: { schoolYear: { schoolId } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.expenseCategory.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const periodTotal = totalAgg._sum.amount ?? 0;

  // Années disponibles pour le select (de la plus ancienne dépense à l'année courante).
  const firstYear = firstExpense
    ? firstExpense.date.getFullYear()
    : now.getFullYear();
  const years: number[] = [];
  for (let yr = now.getFullYear(); yr >= firstYear; yr--) years.push(yr);

  const columns = [
    { header: "Date", accessor: "date" },
    { header: "Libellé", accessor: "label" },
    { header: "Catégorie", accessor: "category" },
    {
      header: "Fournisseur",
      accessor: "supplier",
      className: "hidden md:table-cell",
    },
    {
      header: "Méthode",
      accessor: "method",
      className: "hidden lg:table-cell",
    },
    { header: "Montant", accessor: "amount" },
    { header: "Justificatif", accessor: "receipt" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: ExpenseList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4 whitespace-nowrap">
        {new Intl.DateTimeFormat("fr-FR").format(item.date)}
      </td>
      <td>{item.label}</td>
      <td>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            CATEGORY_BADGES[item.categoryId % CATEGORY_BADGES.length]
          }`}
        >
          {item.category?.name ?? "-"}
        </span>
      </td>
      <td className="hidden md:table-cell">{item.supplier || "—"}</td>
      <td className="hidden lg:table-cell">
        {paymentMethodLabel(item.method)}
      </td>
      <td className="whitespace-nowrap">{formatFCFA(item.amount)}</td>
      <td>
        {item.receiptImg ? (
          <Link href={item.receiptImg} target="_blank" rel="noopener noreferrer">
            <Image
              src={item.receiptImg}
              alt="Justificatif"
              width={36}
              height={36}
              className="rounded-md object-cover w-9 h-9 cursor-pointer"
            />
          </Link>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td>
        {canManage && (
          <div className="flex items-center gap-2">
            <FormContainer table="expense" type="update" data={item} />
            <FormContainer table="expense" type="delete" id={item.id} />
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="hidden md:block text-lg font-semibold">Dépenses</h1>
          <CategoryManager categories={categories} />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {["admin", "director", "accountant"].includes(role ?? "") && (
              <ExportCsvButton endpoint="expenses" filename="depenses" />
            )}
            {canManage && <FormContainer table="expense" type="create" />}
          </div>
        </div>
      </div>

      {/* FILTRES + STAT-TILE */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mt-4">
        <ExpenseFilters
          month={month}
          year={year}
          categoryId={categoryId}
          years={years}
          categories={categories}
        />
        <div className="rounded-md p-3 bg-lamaSkyLight flex flex-col gap-1 min-w-[200px]">
          <span className="text-xs text-gray-500">Total de la période</span>
          <span className="text-xl font-semibold">
            {formatFCFA(periodTotal)}
          </span>
          <span className="text-xs text-gray-400">
            {count} dépense{count > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ExpensesListPage;
