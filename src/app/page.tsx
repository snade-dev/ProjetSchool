import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-indigo-400/40 bg-indigo-400/10 px-4 py-1 text-sm font-semibold text-indigo-100">
              LS School Dashboard
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Gérez votre école avec une vue claire et rapide.
              </h1>
              <p className="max-w-2xl text-lg text-slate-200 md:text-xl">
                Une page d’accueil moderne pour présenter le tableau de bord,
                accompagner les utilisateurs vers la connexion et faciliter
                l’accès à l’inscription.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/sign-up"
                className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
              >
                Créer un compte
              </Link>
              <Link
                href="/sign-in"
                className="rounded-xl border border-slate-700 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Se connecter
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/8 p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-indigo-200">
                Aperçu
              </p>
              <div className="mt-6 space-y-4">
                {[
                  "Suivi des classes et des résultats",
                  "Gestion des enseignants et des élèves",
                  "Accès rapide à la connexion et à l’inscription",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
