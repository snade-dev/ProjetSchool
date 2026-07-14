import { redirect } from "next/navigation";
import { Building2, ChevronRight } from "lucide-react";
import { getSessionInfo } from "@/lib/authGuard";
import {
  getSelectableMemberships,
  SPACE_ROLE_LABELS,
} from "@/lib/membership";
import { switchSpace } from "@/lib/actions/membershipAction";
import { AuthShell } from "@/components/auth/AuthUi";

/**
 * W06 — Sélecteur d'espace (§2.7.10) : après connexion, un compte rattaché à
 * plusieurs écoles (ou plusieurs rôles) choisit son espace de travail. La
 * sélection met à jour le contexte actif (User.schoolId + User.role) puis
 * redirige vers le tableau de bord du rôle choisi.
 */
export default async function SelectSpacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const info = await getSessionInfo();
  if (!info) redirect("/sign-in");
  if (info.role === "superadmin") redirect("/platform");

  const spaces = await getSelectableMemberships(info.userId);
  if (spaces.length === 0) redirect("/sign-in?error=no-role");

  const { error } = await searchParams;
  const current = spaces.find(
    (s) => s.schoolId === info.schoolId && s.role === info.role
  );

  return (
    <AuthShell
      title="Choisissez votre espace"
      subtitle="Votre compte est rattaché à plusieurs espaces — sélectionnez celui dans lequel travailler."
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100"
        >
          Cet espace n&apos;est plus disponible (rattachement désactivé ou
          école coupée). Choisissez un autre espace.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {spaces.map((space) => (
          <li key={space.id}>
            <form action={switchSpace.bind(null, space.id)}>
              <button
                type="submit"
                className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left ring-[1.5px] ring-gray-200 transition hover:bg-lamaSkyLight hover:ring-lamaSky"
              >
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-lamaPurpleLight">
                  <Building2 size={18} className="text-gray-700" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-gray-800">
                    {space.schoolName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {SPACE_ROLE_LABELS[space.role] ?? space.role}
                    {current?.id === space.id && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        espace actuel
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className="flex-none text-gray-300 transition group-hover:text-gray-500"
                />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
