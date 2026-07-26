import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import FormContainer from "@/components/FormContainer";
import CloseRegisterButton from "./components/CloseRegisterButton";
import ContributionReceiptButton from "@/components/pdf/ContributionReceiptButton";
import {
  getContributionRecap,
  CONTRIBUTION_STATUS_LABEL,
} from "@/lib/contribution";
import { paymentMethodLabel } from "@/lib/finance";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  HandCoins,
  Lock,
} from "lucide-react";

/**
 * X06 — Fiche d'un événement + récapitulatif de sa cotisation (§2.4).
 * Le registre est propre à l'événement : barème, avancement, détail par classe
 * puis par élève, reçus PDF. Les recettes remontent dans /stats/finance.
 */

const formatFCFA = (amount: number) =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("fr-FR").format(d) : "—";

const statusBadge: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-lamaYellowLight text-yellow-800",
  UNPAID: "bg-red-100 text-red-700",
};

const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-md bg-white p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 text-xl font-semibold">{value}</p>
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const EventDetailPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const eventId = parseInt(id);
  if (!Number.isFinite(eventId)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const schoolId = sessionSchoolId(session);

  // Le registre est une donnée financière : direction et comptable seulement.
  if (!["admin", "director", "accountant"].includes(role ?? "")) {
    redirect("/list/events");
  }
  const canManageBareme = role === "admin" || role === "director";
  const canCash = ["admin", "director", "accountant"].includes(role ?? "");

  const event = await prisma.event.findFirst({
    where: { id: eventId, schoolId },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      class: { select: { name: true } },
      contribution: { select: { id: true } },
    },
  });
  if (!event) notFound();

  const recap = event.contribution
    ? await getContributionRecap({ eventId, schoolId })
    : null;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
      legalFooter: true,
    },
  });
  const cashier = session?.user.name ?? "—";

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      {/* En-tête de l'événement */}
      <div className="bg-white p-4 rounded-md flex flex-col gap-3">
        <Link
          href="/list/events"
          className="flex w-max items-center gap-1 text-xs text-gray-400 transition hover:text-gray-600"
        >
          <ArrowLeft size={14} />
          Tous les événements
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold">{event.title}</h1>
            <p className="flex items-center gap-2 text-xs text-gray-400">
              <CalendarDays size={13} />
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(event.startTime)}
              {" · "}
              {event.class?.name ?? "Toute l'école"}
            </p>
            {event.description && (
              <p className="mt-2 text-sm text-gray-600">{event.description}</p>
            )}
          </div>
          {!recap && canManageBareme && (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-gray-500 md:block">
                Ouvrir une cotisation
              </span>
              <FormContainer
                table="eventContribution"
                type="create"
                data={{
                  eventId: event.id,
                  eventTitle: event.title,
                  className: event.class?.name ?? null,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {!recap ? (
        <div className="bg-white p-8 rounded-md flex flex-col items-center gap-3 text-center">
          <HandCoins size={32} className="text-gray-200" />
          <p className="text-sm text-gray-400">
            Aucune cotisation ouverte pour cet événement.
            {canManageBareme
              ? " Ouvrez-en une pour suivre les versements des familles."
              : ""}
          </p>
        </div>
      ) : (
        <>
          {/* Barème + avancement */}
          <div className="bg-white p-4 rounded-md flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-md font-semibold">
                  Cotisation — {formatFCFA(recap.contribution.amount)} par élève
                </h2>
                <p className="text-xs text-gray-400">
                  {recap.contribution.dueDate
                    ? `Date limite : ${fmtDate(recap.contribution.dueDate)} · `
                    : ""}
                  {recap.totals.students} élève
                  {recap.totals.students > 1 ? "s" : ""} concerné
                  {recap.totals.students > 1 ? "s" : ""}
                  {recap.contribution.closedAt && " · registre clôturé"}
                </p>
                {recap.contribution.note && (
                  <p className="mt-1 text-sm text-gray-600">
                    {recap.contribution.note}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/export/contributions?eventId=${event.id}`}
                  className="flex items-center gap-2 rounded-md border-[1.5px] border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  <Download size={15} />
                  Export CSV
                </a>
                {canManageBareme && (
                  <>
                    <CloseRegisterButton
                      contributionId={recap.contribution.id}
                      closed={recap.contribution.closedAt != null}
                    />
                    <FormContainer
                      table="eventContribution"
                      type="update"
                      data={{
                        eventId: event.id,
                        eventTitle: event.title,
                        className: event.class?.name ?? null,
                        amount: recap.contribution.amount,
                        dueDate: recap.contribution.dueDate,
                        note: recap.contribution.note,
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Barre d'avancement du recouvrement */}
            <div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, recap.totals.rate)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {recap.totals.rate}% recouvré —{" "}
                {formatFCFA(recap.totals.collected)} sur{" "}
                {formatFCFA(recap.totals.expected)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Encaissé"
              value={formatFCFA(recap.totals.collected)}
              hint={`${recap.totals.rate}% du total attendu`}
            />
            <Stat
              label="Reste à recouvrer"
              value={formatFCFA(recap.totals.remaining)}
              hint={`${recap.totals.unpaidStudents} élève(s) sans versement`}
            />
            <Stat
              label="Soldés"
              value={`${recap.totals.paidStudents} / ${recap.totals.students}`}
              hint={`${recap.totals.partialStudents} versement(s) partiel(s)`}
            />
            <Stat
              label="Attendu par élève"
              value={formatFCFA(recap.contribution.amount)}
              hint={event.class?.name ?? "Toute l'école"}
            />
          </div>

          {/* Récapitulatif par classe (pertinent si l'événement vise l'école) */}
          {recap.byClass.length > 1 && (
            <div className="bg-white p-4 rounded-md flex flex-col gap-3">
              <h2 className="text-md font-semibold">Par classe</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="p-3">Classe</th>
                      <th className="p-3 text-right">Élèves</th>
                      <th className="p-3 text-right">Soldés</th>
                      <th className="p-3 text-right">Encaissé</th>
                      <th className="p-3 text-right">Reste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recap.byClass.map((c) => (
                      <tr
                        key={c.className}
                        className="border-b border-gray-100 even:bg-slate-50"
                      >
                        <td className="p-3 font-medium">{c.className}</td>
                        <td className="p-3 text-right">{c.students}</td>
                        <td className="p-3 text-right">{c.paidStudents}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {formatFCFA(c.collected)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {formatFCFA(c.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Détail par élève */}
          <div className="bg-white p-4 rounded-md flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-md font-semibold">Par élève</h2>
              {recap.contribution.closedAt && (
                <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                  <Lock size={12} />
                  Registre clôturé le {fmtDate(recap.contribution.closedAt)}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="p-3">Élève</th>
                    <th className="p-3 hidden md:table-cell">Classe</th>
                    <th className="p-3 text-right">Versé</th>
                    <th className="p-3 text-right hidden md:table-cell">
                      Reste
                    </th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Reçus</th>
                    {canCash && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {recap.rows.map((r) => (
                    <tr
                      key={r.studentId}
                      className="border-b border-gray-100 even:bg-slate-50"
                    >
                      <td className="p-3">
                        <div className="font-medium">
                          {r.name} {r.surname}
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.username}
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {r.className ?? "—"}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {formatFCFA(r.paid)}
                        {r.overpaid > 0 && (
                          <span className="ml-1 text-xs text-green-600">
                            (+{formatFCFA(r.overpaid)})
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell whitespace-nowrap">
                        {r.remaining > 0 ? formatFCFA(r.remaining) : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            statusBadge[r.status]
                          }`}
                        >
                          {CONTRIBUTION_STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {r.payments.length === 0 && (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                          {r.payments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-gray-500 whitespace-nowrap">
                                {fmtDate(p.paidAt)} ·{" "}
                                {formatFCFA(p.amount)}
                              </span>
                              <ContributionReceiptButton
                                data={{
                                  reference: p.reference,
                                  school: {
                                    name: school?.name ?? "",
                                    address: school?.address,
                                    phone: school?.phone,
                                    email: school?.email,
                                    legalFooter: school?.legalFooter,
                                  },
                                  student: {
                                    name: r.name,
                                    surname: r.surname,
                                    className: r.className,
                                  },
                                  eventTitle: event.title,
                                  expected: r.expected,
                                  amount: p.amount,
                                  totalPaid: r.paid,
                                  methodLabel: paymentMethodLabel(p.method),
                                  date: p.paidAt,
                                  cashier,
                                }}
                              />
                              {canCash && !recap.contribution.closedAt && (
                                <FormContainer
                                  table="contributionPayment"
                                  type="delete"
                                  id={p.id}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      {canCash && (
                        <td className="p-3">
                          <div className="flex items-center justify-end">
                            {!recap.contribution.closedAt && (
                              <FormContainer
                                table="contributionPayment"
                                type="create"
                                data={{
                                  contributionId: recap.contribution.id,
                                  studentId: r.studentId,
                                  studentName: `${r.name} ${r.surname}`,
                                  username: r.username,
                                  expected: r.expected,
                                  paid: r.paid,
                                }}
                              />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="p-3" colSpan={2}>
                      Total
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {formatFCFA(recap.totals.collected)}
                    </td>
                    <td className="p-3 text-right hidden md:table-cell whitespace-nowrap">
                      {formatFCFA(recap.totals.remaining)}
                    </td>
                    <td className="p-3" colSpan={canCash ? 3 : 2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventDetailPage;
