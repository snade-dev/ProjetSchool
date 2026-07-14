import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { getSessionInfo } from "@/lib/authGuard";
import UserMenu from "@/components/UserMenu";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * V04 — Espace plateforme (superadmin) : layout dédié, volontairement
 * séparé du dashboard d'école (pas de Menu/Navbar scolaires).
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const info = await getSessionInfo();
  if (!info || info.role !== "superadmin") {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/platform" className="flex items-center gap-2.5">
            <span className="drawer-hero-bg grid h-9 w-9 place-items-center rounded-lg text-white">
              <Building2 size={18} />
            </span>
            <span className="text-base font-bold">
              Plateforme
              <span className="ml-2 rounded-full bg-lamaSkyLight px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                super-admin
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
            <Link href="/platform" className="transition hover:text-gray-900">
              Écoles
            </Link>
            <Link href="/platform/plans" className="transition hover:text-gray-900">
              Plans
            </Link>
            {/* W10 — journal d'audit : superadmin = tout + filtre école */}
            <Link href="/list/audit" className="transition hover:text-gray-900">
              Journal
            </Link>
          </nav>
          <div className="ml-auto">
            <UserMenu name="Plateforme" roleLabel="super-admin" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}
