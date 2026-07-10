import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquareWarning,
  Phone,
  ShieldCheck,
  Sparkles,
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
    text: "Saisie des notes par classe, moyennes et rangs automatiques, bulletins PDF prêts à imprimer par semestre.",
  },
  {
    icon: CalendarCheck,
    title: "Présence & appel",
    text: "L'appel se fait en un écran ; l'historique par élève, classe et jour reste consultable à tout moment.",
  },
  {
    icon: Wallet,
    title: "Finance en FCFA",
    text: "Frais de scolarité, factures, encaissements, dépenses et paie du personnel — avec exports CSV.",
  },
  {
    icon: CalendarDays,
    title: "Emplois du temps",
    text: "Cours, examens et événements planifiés sur un calendrier clair, visible par chaque classe.",
  },
  {
    icon: BookOpenCheck,
    title: "Quiz & examens en ligne",
    text: "Évaluations en ligne chronométrées, correction assistée et résultats publiés directement aux élèves.",
  },
  {
    icon: BellRing,
    title: "Annonces & événements",
    text: "Communiquez avec toute l'école ou une classe précise : chacun voit les annonces qui le concernent.",
  },
  {
    icon: MessageSquareWarning,
    title: "Réclamations & demandes",
    text: "Contestations de notes, demandes administratives et séances de rattrapage suivies de bout en bout.",
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    text: "Tableaux de bord finance, élèves et enseignants pour piloter l'établissement avec des chiffres à jour.",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    name: "Direction",
    text: "Pilote tout l'établissement.",
    points: [
      "Comptes, classes et matières",
      "Finance, paie et exports",
      "Statistiques globales",
    ],
  },
  {
    icon: Users,
    name: "Enseignants",
    text: "Gèrent leurs classes au quotidien.",
    points: [
      "Appel et présence",
      "Saisie des notes et quiz",
      "Emploi du temps personnel",
    ],
  },
  {
    icon: GraduationCap,
    name: "Élèves",
    text: "Suivent leur scolarité en direct.",
    points: [
      "Notes, moyennes et bulletins",
      "Examens en ligne",
      "Annonces de la classe",
    ],
  },
  {
    icon: LayoutDashboard,
    name: "Parents",
    text: "Gardent un œil sur leurs enfants.",
    points: [
      "Résultats et présence",
      "Frais et paiements",
      "Événements de l'école",
    ],
  },
];

const STEPS = [
  {
    title: "Créez vos comptes",
    text: "La direction ajoute enseignants, élèves et parents ; chacun reçoit son accès personnel.",
  },
  {
    title: "Organisez l'année",
    text: "Classes, matières, emplois du temps et frais de scolarité sont configurés en quelques écrans.",
  },
  {
    title: "Travaillez au quotidien",
    text: "Appel, notes, paiements et annonces : tout le monde travaille sur les mêmes données, à jour.",
  },
];

const FAQ = [
  {
    q: "Qui peut créer un compte ?",
    a: "Les comptes élèves, parents et enseignants sont créés par la direction de l'établissement. Chaque personne reçoit ensuite son identifiant pour se connecter à son espace.",
  },
  {
    q: "Les bulletins sont-ils imprimables ?",
    a: "Oui. Les moyennes et rangs sont calculés automatiquement et chaque bulletin de semestre est généré en PDF, prêt à imprimer ou à partager.",
  },
  {
    q: "La partie finance gère-t-elle le FCFA ?",
    a: "Oui, tous les montants (frais de scolarité, factures, dépenses, paie) sont gérés en FCFA, avec des exports CSV pour votre comptabilité.",
  },
  {
    q: "Peut-on personnaliser les couleurs de l'école ?",
    a: "Oui. Le nom, le logo et le thème de couleurs de l'établissement se règlent dans les paramètres et s'appliquent à toute l'application, y compris cette page.",
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
  let counts: { students: number; teachers: number; classes: number; subjects: number } | null =
    null;
  try {
    school = await prisma.schoolSettings.findUnique({
      where: { id: 1 },
      select: { name: true, logo: true, address: true, phone: true, email: true },
    });
    const [students, teachers, classes, subjects] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.subject.count(),
    ]);
    counts = { students, teachers, classes, subjects };
  } catch {
    counts = null;
  }
  const schoolName = school?.name || "LS_School";
  const year = new Date().getFullYear();

  const STATS = counts
    ? [
        { value: counts.students, label: "Élèves" },
        { value: counts.teachers, label: "Enseignants" },
        { value: counts.classes, label: "Classes" },
        { value: counts.subjects, label: "Matières" },
      ]
    : null;

  const primaryCta = dashboardHref ? (
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
  );

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-800">
      {/* ---------- barre de navigation ---------- */}
      <header className="sticky top-0 z-20 border-b border-gray-100/80 bg-[#F7F8FA]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
            <a href="#fonctionnalites" className="transition hover:text-gray-900">
              Fonctionnalités
            </a>
            <a href="#espaces" className="transition hover:text-gray-900">
              Espaces
            </a>
            <a href="#demarrer" className="transition hover:text-gray-900">
              Démarrer
            </a>
            <a href="#faq" className="transition hover:text-gray-900">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>

      {/* ---------- héros ---------- */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-16 pt-14">
        {/* décor : cercles doux du design system */}
        <div
          aria-hidden
          className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-lamaSkyLight opacity-60 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lamaPurpleLight opacity-60 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-lamaYellowLight opacity-40 blur-3xl"
        />

        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-7">
            <span className="text-theme-deep flex w-max items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] shadow-sm">
              <Sparkles size={13} />
              Gestion scolaire · {schoolName}
            </span>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
              La gestion de votre école,
              <br />
              <span className="text-theme-deep">simple et complète.</span>
            </h1>
            <p className="max-w-lg text-lg text-gray-500">
              Élèves, enseignants, notes, bulletins, présence et finance — tout
              votre établissement dans un seul tableau de bord, aux couleurs de
              votre école.
            </p>
            <div className="flex flex-wrap items-center gap-4">{primaryCta}</div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
              {["Bulletins PDF", "Finance en FCFA", "4 espaces par rôle"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check size={15} className="text-theme-deep" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* aperçu stylisé du tableau de bord */}
          <div className="relative">
            <div
              aria-hidden
              className="drawer-hero-bg absolute -inset-2 rounded-[28px] opacity-15 blur-xl"
            />
            <div className="relative rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl shadow-gray-200/80">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Aperçu du tableau de bord
                </span>
                <BarChart3 size={16} className="text-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-lamaPurpleLight p-4">
                  <div className="text-2xl font-bold text-gray-800">
                    {counts?.students ?? 7}
                  </div>
                  <div className="text-xs text-gray-600">Élèves</div>
                </div>
                <div className="rounded-2xl bg-lamaYellowLight p-4">
                  <div className="text-2xl font-bold text-gray-800">
                    {counts?.teachers ?? 4}
                  </div>
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
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-100 p-3.5">
                <CalendarCheck size={18} className="text-theme-deep flex-none" />
                <div className="text-xs text-gray-600">
                  Appel de la 6<sup>e</sup> A —{" "}
                  <span className="font-semibold text-gray-800">fait ce matin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- chiffres de l'établissement ---------- */}
      {STATS && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-2">
                <span className="text-theme-deep text-3xl font-bold">{value}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- fonctionnalités ---------- */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-20">
        <div className="mb-10 max-w-2xl">
          <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
            Fonctionnalités
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Tout l'établissement, un seul outil
          </h2>
          <p className="mt-3 text-gray-500">
            De la salle de classe à la comptabilité, chaque tâche du quotidien a
            son écran — sans classeurs ni fichiers éparpillés.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="drawer-hero-bg mb-4 grid h-10 w-10 place-items-center rounded-xl text-white">
                <Icon size={19} />
              </span>
              <h3 className="mb-1.5 text-sm font-bold text-gray-800">{title}</h3>
              <p className="text-[13px] leading-relaxed text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- un espace par rôle ---------- */}
      <section id="espaces" className="scroll-mt-24 border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
              Espaces
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Chacun voit ce qui le concerne
            </h2>
            <p className="mt-3 text-gray-500">
              Quatre espaces distincts, un seul compte par personne : les données
              sont partagées, les accès ne le sont pas.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map(({ icon: Icon, name, text, points }) => (
              <div
                key={name}
                className="flex flex-col rounded-2xl border border-gray-100 bg-[#F7F8FA] p-6"
              >
                <span className="text-theme-deep mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
                  <Icon size={19} />
                </span>
                <h3 className="text-sm font-bold text-gray-800">{name}</h3>
                <p className="mb-4 mt-1 text-[13px] text-gray-500">{text}</p>
                <ul className="mt-auto flex flex-col gap-2">
                  {points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-1.5 text-[13px] text-gray-600"
                    >
                      <Check size={14} className="text-theme-deep mt-0.5 flex-none" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- comment démarrer ---------- */}
      <section id="demarrer" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
            Démarrer
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Votre école en ligne en trois étapes
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ title, text }, i) => (
            <div
              key={title}
              className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <span className="drawer-hero-bg mb-4 grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mb-1.5 text-sm font-bold text-gray-800">{title}</h3>
              <p className="text-[13px] leading-relaxed text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl scroll-mt-24 px-6 py-20">
          <div className="mb-10 text-center">
            <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
              FAQ
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Questions fréquentes
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-gray-100 bg-[#F7F8FA] px-6 py-4 open:bg-white open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-theme-deep flex-none transition group-open:rotate-90">
                    <ArrowRight size={16} />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- appel à l'action ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="drawer-hero-bg relative overflow-hidden rounded-3xl px-8 py-14 text-center text-white shadow-xl">
          <div
            aria-hidden
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <h2 className="relative mx-auto max-w-xl text-3xl font-bold tracking-tight">
            Prêt à simplifier la gestion de {schoolName} ?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm text-white/80">
            Connectez-vous à votre espace ou demandez votre accès à la direction
            de l'établissement.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={dashboardHref ?? "/sign-in"}
              className="text-theme-deep flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold shadow-lg transition hover:brightness-95"
            >
              {dashboardHref ? "Ouvrir mon tableau de bord" : "Se connecter"}
              <ArrowRight size={16} />
            </Link>
            {!dashboardHref && (
              <Link
                href="/sign-up"
                className="rounded-xl border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Créer un compte
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- pied de page ---------- */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
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
            <p className="max-w-xs text-xs leading-relaxed text-gray-500">
              La plateforme de gestion scolaire de {schoolName} : notes,
              présence, finance et communication réunies au même endroit.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Navigation
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <a href="#fonctionnalites" className="transition hover:text-gray-900">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#espaces" className="transition hover:text-gray-900">
                  Espaces par rôle
                </a>
              </li>
              <li>
                <a href="#faq" className="transition hover:text-gray-900">
                  FAQ
                </a>
              </li>
              <li>
                <Link href="/sign-in" className="transition hover:text-gray-900">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Contact
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              {school?.address && (
                <li className="flex items-center gap-2">
                  <MapPin size={14} className="text-theme-deep flex-none" />
                  {school.address}
                </li>
              )}
              {school?.phone && (
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-theme-deep flex-none" />
                  {school.phone}
                </li>
              )}
              {school?.email && (
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-theme-deep flex-none" />
                  {school.email}
                </li>
              )}
              {!school?.address && !school?.phone && !school?.email && (
                <li className="text-gray-400">
                  Coordonnées à renseigner dans les paramètres.
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100">
          <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-gray-400">
            © {year} {schoolName} — Tous droits réservés.
          </p>
        </div>
      </footer>
    </main>
  );
}
