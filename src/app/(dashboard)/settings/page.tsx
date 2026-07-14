import Link from "next/link";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SchoolSettingsForm from "@/components/forms/SchoolSettingsForm";
import SmtpSettingsForm from "@/components/forms/SmtpSettingsForm";
import ActivateYearButton from "@/components/forms/ActivateYearButton";
import FormContainer from "@/components/FormContainer";

const SettingsPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;

  // Défense en profondeur : seul l'admin accède aux paramètres
  if (role !== "admin") {
    redirect(`/${role ?? "sign-in"}`);
  }

  // V03 — l'école et les années de la session
  const info = await getSessionInfo();
  const schoolId = info?.schoolId ?? -1;
  const [settings, years] = await prisma.$transaction([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.schoolYear.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6">
      {/* CARTE 1 : Établissement — W13 : on ne passe JAMAIS les champs SMTP
          (surtout smtpPass) à un composant client. */}
      <div className="bg-white p-4 rounded-md">
        <h1 className="text-lg font-semibold mb-4">
          Paramètres de l&apos;établissement
        </h1>
        <SchoolSettingsForm
          data={
            settings && {
              name: settings.name,
              address: settings.address,
              phone: settings.phone,
              email: settings.email,
              logo: settings.logo,
              currency: settings.currency,
              legalFooter: settings.legalFooter,
              themePrimary: settings.themePrimary,
              themeSecondary: settings.themeSecondary,
              themeAccent: settings.themeAccent,
            }
          }
        />
      </div>

      {/* CARTE 2 : Email (SMTP) — W13. Le mot de passe ne QUITTE JAMAIS le
          serveur : seul hasPassword (booléen) est transmis au client. */}
      <div className="bg-white p-4 rounded-md">
        <h1 className="text-lg font-semibold mb-4">Email (SMTP)</h1>
        <SmtpSettingsForm
          data={{
            emailEnabled: settings?.emailEnabled ?? false,
            smtpHost: settings?.smtpHost ?? null,
            smtpPort: settings?.smtpPort ?? null,
            smtpUser: settings?.smtpUser ?? null,
            smtpFrom: settings?.smtpFrom ?? null,
          }}
          hasPassword={!!settings?.smtpPass}
        />
      </div>

      {/* CARTE 3 : Années scolaires */}
      <div className="bg-white p-4 rounded-md">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Années scolaires</h1>
          <div className="flex items-center gap-3">
            {/* W04 — assistant de passage d'année (clôture + réinscriptions) */}
            <Link
              href="/settings/rollover"
              className="text-xs bg-lamaPurpleLight text-gray-700 py-2 px-3 rounded-md hover:bg-lamaPurple"
            >
              Passage d&apos;année →
            </Link>
            <FormContainer table="schoolYear" type="create" />
          </div>
        </div>

        {years.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aucune année scolaire. Créez-en une pour commencer.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="p-2">Année</th>
                <th className="p-2 hidden md:table-cell">Début</th>
                <th className="p-2 hidden md:table-cell">Fin</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <tr
                  key={year.id}
                  className="border-b border-gray-200 even:bg-slate-50"
                >
                  <td className="p-2 font-medium">{year.name}</td>
                  <td className="p-2 hidden md:table-cell">
                    {new Intl.DateTimeFormat("fr-FR").format(year.startDate)}
                  </td>
                  <td className="p-2 hidden md:table-cell">
                    {new Intl.DateTimeFormat("fr-FR").format(year.endDate)}
                  </td>
                  <td className="p-2">
                    {year.isActive ? (
                      <span className="text-xs bg-green-100 text-green-700 py-1 px-2 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 py-1 px-2 rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {!year.isActive && <ActivateYearButton id={year.id} />}
                      <FormContainer
                        table="schoolYear"
                        type="update"
                        data={year}
                      />
                      <FormContainer
                        table="schoolYear"
                        type="delete"
                        id={year.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
