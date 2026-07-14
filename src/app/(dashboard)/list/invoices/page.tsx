import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import InvoiceStatusBadge from "@/components/InvoiceStatusBadge";
import GenerateInvoicesButton from "./components/GenerateInvoicesButton";
import RemindButton from "./components/RemindButton";
import { getGenerationPreview, syncOverdueInvoices } from "@/lib/actions/invoiceAction";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { formatFCFA, invoiceBalance } from "@/lib/finance";
import { buildInvoiceWhere } from "@/lib/queryBuilders";
import ExportCsvButton from "@/components/ExportCsvButton";
import {
  Invoice,
  Payment,
  Student,
  Class,
  Parent,
  Prisma,
  InvoiceStatus,
} from "@/app/generated/prisma";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Eye } from "lucide-react";

import { sessionSchoolId } from "@/lib/authGuard";
// W03 — la classe de l'élève vient de son inscription sur l'année de la facture
type InvoiceList = Invoice & {
  student: Student & {
    enrollments: { schoolYearId: number; class: Pick<Class, "name"> }[];
    parent: Parent;
  };
  payments: Payment[];
};

const InvoicesListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const isAdmin = role === "admin";

  // Synchro des impayés (story-08) : idempotent, admin uniquement, avant les
  // agrégats pour que les stat-tiles reflètent les factures échues du jour.
  if (isAdmin) await syncOverdueInvoices();

  const { page, status, month, search } = searchParams;
  const isOverdueView = status === "OVERDUE";
  const p = page ? parseInt(page) : 1;

  // --- Périmètre par rôle (défense en profondeur) ---
  const scopeWhere: Prisma.InvoiceWhereInput = {};
  if (role === "student") {
    scopeWhere.studentId = currentUserId!;
  } else if (role === "parent") {
    scopeWhere.student = { parentId: currentUserId! };
  }

  // --- Filtres de la liste (builder partagé avec l'export CSV S18) ---
  const query: Prisma.InvoiceWhereInput = {
    ...scopeWhere,
    ...buildInvoiceWhere({ status, month, search }),
  };

  const [data, count, grouped] = await prisma.$transaction([
    prisma.invoice.findMany({
      where: { AND: [{ student: { schoolId } }, query] },
      include: {
        student: {
          include: {
            // W03 — inscriptions (année → classe) pour retrouver la classe de la facture
            enrollments: {
              select: {
                schoolYearId: true,
                class: { select: { name: true } },
              },
            },
            parent: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.invoice.count({ where: { AND: [{ student: { schoolId } }, query] } }),
    // Stat-tiles : counts + montants par statut, sur le périmètre du rôle
    prisma.invoice.groupBy({
      by: ["status"],
      where: scopeWhere,
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { status: "asc" },
    }),
  ]);

  // Agrégats pour les tiles / bandeau solde
  type StatRow = {
    status: InvoiceStatus;
    _count: { _all: number };
    _sum: { total: number | null };
  };
  const rows = grouped as unknown as StatRow[];
  const statOf = (s: InvoiceStatus) => rows.find((g) => g.status === s);
  const totalCount = rows.reduce((sum, g) => sum + g._count._all, 0);
  const paidCount = statOf("PAID")?._count._all ?? 0;
  const partialCount = statOf("PARTIALLY_PAID")?._count._all ?? 0;
  const overdueCount = statOf("OVERDUE")?._count._all ?? 0;

  // Total impayés = Σ SOLDES des OVERDUE (total − Σ paiements), pas Σ total.
  // Sans N+1 : ids OVERDUE → aggregate _sum.total + payment.groupBy _sum.amount,
  // assemblage en JS (parade story-08).
  let overdueAmount = 0;
  if (isAdmin && overdueCount > 0) {
    const overdueIds = (
      await prisma.invoice.findMany({
        where: { ...scopeWhere, status: "OVERDUE" },
        select: { id: true },
      })
    ).map((i) => i.id);

    const [totalAgg, payGroups] = await Promise.all([
      prisma.invoice.aggregate({
        where: { id: { in: overdueIds } },
        _sum: { total: true },
      }),
      prisma.payment.groupBy({
        by: ["invoiceId"],
        where: { invoiceId: { in: overdueIds } },
        _sum: { amount: true },
      }),
    ]);

    const paidOnOverdue = payGroups.reduce(
      (s, g) => s + (g._sum.amount ?? 0),
      0
    );
    overdueAmount = (totalAgg._sum.total ?? 0) - paidOnOverdue;
  }

  // --- Aperçu de génération (E31) : params dédiés gm/gy pour ne pas interférer
  //     avec le filtre `month` de la liste. L'aperçu est calculé côté serveur. ---
  const nowGen = new Date();
  const genMonth = searchParams.gm
    ? parseInt(searchParams.gm)
    : nowGen.getMonth() + 1;
  const genYear = searchParams.gy
    ? parseInt(searchParams.gy)
    : nowGen.getFullYear();
  const generationPreview =
    isAdmin && searchParams.generate === "1"
      ? await getGenerationPreview(genMonth, genYear)
      : null;

  const columns = [
    { header: "Référence", accessor: "reference" },
    { header: "Élève", accessor: "student" },
    { header: "Mois", accessor: "month", className: "hidden md:table-cell" },
    { header: "Total", accessor: "total" },
    { header: "Payé", accessor: "paid", className: "hidden lg:table-cell" },
    { header: "Statut", accessor: "status" },
    {
      header: "Échéance",
      accessor: "dueDate",
      className: "hidden md:table-cell",
    },
    // Vue recouvrement (E33) : colonnes supplémentaires quand ?status=OVERDUE
    ...(isOverdueView
      ? [
          { header: "Retard (j)", accessor: "overdueDays" },
          {
            header: "Parent",
            accessor: "parent",
            className: "hidden lg:table-cell",
          },
        ]
      : []),
    { header: "Actions", accessor: "action" },
  ];

  const now = new Date();

  const renderRow = (item: InvoiceList) => {
    const paid = item.payments.reduce((s, pm) => s + pm.amount, 0);
    const percent =
      item.total > 0 ? Math.min(100, Math.round((paid / item.total) * 100)) : 0;
    const overdue =
      item.dueDate < now &&
      item.status !== "PAID" &&
      item.status !== "CANCELLED";
    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4 font-mono text-xs">{item.reference}</td>
        <td>
          <div className="flex flex-col">
            <span className="font-medium">
              {item.student.name} {item.student.surname}
            </span>
            <span className="text-xs text-gray-400">
              {item.student.enrollments.find(
                (e) => e.schoolYearId === item.schoolYearId
              )?.class.name ?? "-"}
            </span>
          </div>
        </td>
        <td className="hidden md:table-cell">{item.month ?? "-"}</td>
        <td className="whitespace-nowrap">{formatFCFA(item.total)}</td>
        <td className="hidden lg:table-cell">
          <div className="flex flex-col gap-1 min-w-[90px]">
            <span className="text-xs text-gray-500">{formatFCFA(paid)}</span>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </td>
        <td>
          <InvoiceStatusBadge status={item.status} />
        </td>
        <td
          className={`hidden md:table-cell ${
            overdue ? "text-red-600 font-medium" : ""
          }`}
        >
          {new Intl.DateTimeFormat("fr-FR").format(item.dueDate)}
        </td>
        {isOverdueView && (
          <>
            <td className="text-red-600 font-medium">
              {Math.floor(
                (now.getTime() - item.dueDate.getTime()) / 86400000
              )}
            </td>
            <td className="hidden lg:table-cell">
              <div className="flex flex-col">
                <span>
                  {item.student.parent.name} {item.student.parent.surname}
                </span>
                <span className="text-xs text-gray-400">
                  {item.student.parent.phone ?? "—"}
                </span>
              </div>
            </td>
          </>
        )}
        <td>
          <div className="flex items-center gap-2">
            <Link
              href={`/list/invoices/${item.id}`}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
              title="Voir"
            >
              <Eye size={16} />
            </Link>
            {isAdmin && item.status === "OVERDUE" && (
              <RemindButton
                invoiceId={item.id}
                student={`${item.student.name} ${item.student.surname}`}
                remindedAt={
                  item.remindedAt ? item.remindedAt.toISOString() : null
                }
                reminderNote={item.reminderNote}
              />
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {isAdmin ? "Factures" : "Mes factures"}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {isAdmin && <ExportCsvButton endpoint="invoices" filename="factures" />}
            {isAdmin && (
              <GenerateInvoicesButton
                month={genMonth}
                year={genYear}
                preview={generationPreview}
              />
            )}
            {isAdmin && <FormContainer table="invoice" type="create" />}
          </div>
        </div>
      </div>

      {/* STAT-TILES (admin) */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatTile
            label="Toutes"
            value={totalCount}
            href="/list/invoices"
            active={!status}
            className="bg-lamaSkyLight"
          />
          <StatTile
            label="Payées"
            value={paidCount}
            href="/list/invoices?status=PAID"
            active={status === "PAID"}
            className="bg-green-50"
          />
          <StatTile
            label="Partielles"
            value={partialCount}
            href="/list/invoices?status=PARTIALLY_PAID"
            active={status === "PARTIALLY_PAID"}
            className="bg-lamaYellowLight"
          />
          <StatTile
            label="En retard"
            value={overdueCount}
            sub={formatFCFA(overdueAmount)}
            href="/list/invoices?status=OVERDUE"
            active={status === "OVERDUE"}
            className="bg-red-50 text-red-700"
          />
        </div>
      )}

      {/* Bandeau solde (student/parent) */}
      {!isAdmin && (
        <div className="mt-4 bg-lamaPurpleLight text-gray-700 text-sm p-3 rounded-md">
          Solde restant affiché :{" "}
          <span className="font-semibold">
            {formatFCFA(
              data
                .filter((i) => i.status !== "CANCELLED")
                .reduce((s, i) => s + invoiceBalance(i), 0)
            )}
          </span>{" "}
          <span className="text-xs text-gray-400">(page courante)</span>
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

const StatTile = ({
  label,
  value,
  sub,
  href,
  active,
  className,
}: {
  label: string;
  value: number;
  sub?: string;
  href: string;
  active?: boolean;
  className?: string;
}) => (
  <Link
    href={href}
    className={`rounded-md p-3 flex flex-col gap-1 transition ${className} ${
      active ? "ring-2 ring-blue-400" : "hover:opacity-90"
    }`}
  >
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-xl font-semibold">{value}</span>
    {sub && <span className="text-xs">{sub}</span>}
  </Link>
);

export default InvoicesListPage;
