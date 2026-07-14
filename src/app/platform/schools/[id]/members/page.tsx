import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import { SPACE_ROLE_LABELS } from "@/lib/membership";
import AddMembershipForm from "../../../components/AddMembershipForm";
import ToggleMembershipButton from "../../../components/ToggleMembershipButton";

/**
 * W06 — Rattachements d'une école (superadmin) : liste des comptes rattachés
 * (memberships) avec leurs AUTRES rattachements éventuels, et formulaire pour
 * rattacher un compte existant avec un rôle.
 */
export default async function SchoolMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const schoolId = Number(id);
  if (!Number.isInteger(schoolId)) return notFound();

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, slug: true, active: true },
  });
  if (!school) return notFound();

  const memberships = await prisma.userSchoolMembership.findMany({
    where: { schoolId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          schoolId: true,
          role: true,
          // les AUTRES rattachements du compte (vision multi-écoles)
          memberships: {
            where: { schoolId: { not: schoolId } },
            include: { school: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ active: "desc" }, { role: "asc" }, { id: "asc" }],
  });

  const roleLabel = (r: string) => SPACE_ROLE_LABELS[r] ?? r;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/platform"
            className="mb-1 inline-flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-gray-600"
          >
            <ArrowLeft size={13} />
            Écoles
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Users size={18} className="text-theme-deep" />
            Rattachements — {school.name}
            {!school.active && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                École coupée
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400">
            {memberships.length} compte{memberships.length > 1 ? "s" : ""}{" "}
            rattaché{memberships.length > 1 ? "s" : ""} · slug{" "}
            <span className="font-mono">{school.slug}</span>
          </p>
        </div>
        <AddMembershipForm schoolId={school.id} schoolName={school.name} />
      </div>

      <div className="overflow-x-auto rounded-md bg-white p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400">
              <th className="p-3">Compte</th>
              <th className="p-3">Rôle</th>
              <th className="hidden p-3 md:table-cell">Autres rattachements</th>
              <th className="p-3">Contexte actif</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => {
              const isActiveContext =
                m.user.schoolId === schoolId && m.user.role === m.role;
              return (
                <tr
                  key={m.id}
                  className="border-t border-gray-100 hover:bg-lamaSkyLight/30 transition-colors"
                >
                  <td className="p-3">
                    <span className="font-semibold">{m.user.name}</span>
                    <span className="block text-xs text-gray-400">
                      {m.user.email}
                    </span>
                  </td>
                  <td className="p-3">{roleLabel(m.role)}</td>
                  <td className="hidden p-3 md:table-cell">
                    {m.user.memberships.length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <span className="flex flex-col gap-0.5 text-xs text-gray-500">
                        {m.user.memberships.map((o) => (
                          <span key={o.id}>
                            {o.school.name} · {roleLabel(o.role)}
                            {!o.active && (
                              <span className="ml-1 text-[10px] text-red-500">
                                (désactivé)
                              </span>
                            )}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {isActiveContext ? (
                      <span className="rounded-full bg-lamaSkyLight px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                        cet espace
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">autre espace</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        m.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {m.active ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="p-3">
                    <ToggleMembershipButton
                      membershipId={m.id}
                      active={m.active}
                    />
                  </td>
                </tr>
              );
            })}
            {memberships.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Aucun compte rattaché — rattachez un compte existant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
