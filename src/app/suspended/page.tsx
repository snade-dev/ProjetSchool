import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Wallet } from "lucide-react";
import { getSessionInfo } from "@/lib/authGuard";
import { getSchoolAccessState } from "@/lib/subscription";

/**
 * V06 — Page « établissement suspendu » : affichée quand l'école est coupée
 * ou son abonnement suspendu. L'admin voit les instructions de paiement,
 * les autres rôles un message neutre. Si l'accès est en réalité ouvert
 * (paiement enregistré entre-temps), on renvoie vers l'espace du rôle.
 */
export default async function SuspendedPage() {
  const info = await getSessionInfo();
  if (!info) redirect("/sign-in");
  if (info.role === "superadmin" || info.schoolId == null) redirect("/platform");

  const state = await getSchoolAccessState(info.schoolId);
  if (!state.blocked) {
    redirect(info.role === "admin" ? "/admin" : `/${info.role}`);
  }

  const isAdmin = info.role === "admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/70">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-xl font-bold text-gray-800">
          {state.schoolName ?? "Votre établissement"} est suspendu
        </h1>

        {isAdmin ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {state.reason === "SCHOOL_INACTIVE"
                ? "L'accès de votre établissement a été coupé par la plateforme."
                : "L'abonnement de votre établissement est arrivé à échéance et la période de grâce de 15 jours est dépassée."}{" "}
              Vos données sont intactes : l'accès sera rétabli dès la
              régularisation.
            </p>
            <div className="mt-5 rounded-xl bg-lamaSkyLight/60 p-4 text-sm text-sky-900">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <Wallet size={15} />
                Régulariser l&apos;abonnement
              </div>
              <p className="text-xs leading-relaxed">
                Contactez l&apos;administrateur de la plateforme pour
                enregistrer votre paiement (espèces, Orange Money ou virement).
                L&apos;accès est rétabli immédiatement après l&apos;encaissement.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            L&apos;accès à l&apos;espace de votre établissement est
            temporairement suspendu. Rapprochez-vous de la direction de votre
            école pour plus d&apos;informations.
          </p>
        )}

        <div className="mt-6 flex items-center gap-4 text-sm">
          <Link
            href="/sign-in"
            className="drawer-hero-bg rounded-lg px-4 py-2 font-semibold text-white transition hover:brightness-110"
          >
            Retour à la connexion
          </Link>
          <Link href="/" className="text-gray-500 transition hover:text-gray-700">
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
