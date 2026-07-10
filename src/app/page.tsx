import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Users,
  Wallet,
} from "lucide-react";

// Landing publique : identité de l'établissement (nom, logo, thème, contact)
// lue dans SchoolSettings ; un visiteur connecté est renvoyé vers son espace.

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Notes & bulletins",
    text: "Saisie des notes par classe, moyennes automatiques et bulletins PDF prêts à imprimer.",
  },
  {
    icon: CalendarCheck,
    title: "Présence & appel",
    text: "L'appel se fait en un écran ; l'historique par élève, classe et jour reste consultable.",
  },
  {
    icon: Wallet,
    title: "Finance en FCFA",
    text: "Frais de scolarité, factures, encaissements, dépenses et paie — avec exports CSV.",
  },
  {
    icon: Users,
    title: "Un espace par rôle",
    text: "Direction, enseignants, élèves et parents voient chacun ce qui les concerne.",
  },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role ?? null;
  const dashboardHref = role ? ROLE_HOME[role] ?? "/sign-in" : null;

  let school: {
    name: string;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null = null;
  try {
    school = await prisma.schoolSettings.findUnique({
      where: { id: 1 },
      select: { name: true, logo: true, address: true, phone: true, email: true },
    });
  } catch {
    school = null;
  }
  const schoolName = school?.name || "LS_School";

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-800">
      {/* ---------- barre de navigation ---------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Image
            src={school?.logo || "/logo.png"}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="text-lg font-bold">{schoolName}</span>
        </div>
        <nav className="flex items-center gap-3">
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className="drawer-hero-bg flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Mon tableau de bord
              <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white"
              >
                Se connecter
              </Link>
              <Link
                href="/sign-up"
                className="drawer-hero-bg rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ---------- héros ---------- */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-20 pt-12">
        {/* décor : cercles doux du design system */}
        <div
          aria-hidden
          className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-lamaSkyLight opacity-60 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lamaPurpleLight opacity-60 blur-3xl"
        />

        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-7">
            <span className="text-theme-deep w-max rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] shadow-sm">
              Gestion scolaire · {schoolName}
            </span>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
              La gestion de votre école,
              <br />
              simple et complète.
            </h1>
            <p className="max-w-lg text-lg text-gray-500">
              Élèves, enseignants, notes, bulletins, présence et finance — tout
              votre établissement dans un seul tableau de bord, aux couleurs de
              votre école.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {dashboardHref ? (
                <Link
                  href={dashboardHref}
                  className="drawer-hero-bg flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                >
                  Ouvrir mon tableau de bord
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="drawer-hero-bg flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Se connecter
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-xl border-[1.5px] border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                  >
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* aperçu stylisé du tableau de bord */}
          <div className="relative rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl shadow-gray-200/80">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Aperçu du tableau de bord
              </span>
              <BarChart3 size={16} className="text-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-lamaPurpleLight p-4">
                <div className="text-2xl font-bold text-gray-800">7</div>
                <div className="text-xs text-gray-600">Élèves</div>
              </div>
              <div className="rounded-2xl bg-lamaYellowLight p-4">
                <div className="text-2xl font-bold text-gray-800">4</div>
                <div className="text-xs text-gray-600">Enseignants</div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-gray-50 p-4">
              <div className="mb-1 text-xs text-gray-500">CA encaissé (ce mois)</div>
              <div className="text-xl font-bold text-gray-800">
                50 000 <span className="text-sm font-semibold text-gray-500">FCFA</span>
              </div>
              <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden>
                {[35, 55, 40, 70, 52, 85, 62, 90, 48, 66].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`flex-1 rounded-t ${i % 2 ? "bg-lamaSkyLight" : "drawer-hero-bg opacity-80"}`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-100 p-3.5">
              <FileText size={18} className="text-theme-deep flex-none" />
              <div className="text-xs text-gray-600">
                Bulletin du 1<sup>er</sup> semestre —{" "}
                <span className="font-semibold text-gray-800">prêt à imprimer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- fonctionnalités ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <span className="drawer-hero-bg mb-4 grid h-10 w-10 place-items-center rounded-xl text-white">
                <Icon size={19} />
              </span>
              <h2 className="mb-1.5 text-sm font-bold text-gray-800">{title}</h2>
              <p className="text-[13px] leading-relaxed text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- pied de page ---------- */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Image
              src={school?.logo || "/logo.png"}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="text-sm font-bold">{schoolName}</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
            {school?.address && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {school.address}
              </span>
            )}
            {school?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {school.phone}
              </span>
            )}
            {school?.email && (
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {school.email}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {schoolName}
          </p>
        </div>
      </footer>
    </main>
  );
}
