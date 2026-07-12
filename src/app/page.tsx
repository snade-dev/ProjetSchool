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
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

// V07 — Landing : vitrine de la PLATEFORME multi-établissements (design
// « Produit » conservé). Chaque école inscrite a son espace cloisonné, ses
// couleurs et son essai gratuit de 30 jours.

const PLATFORM = "LS_School";

const ROLE_HOME: Record<string, string> = {
  superadmin: "/platform",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

// wide = carte double largeur du bento ; tint = fond pastel du thème
const FEATURES = [
  {
    icon: GraduationCap,
    title: "Notes & bulletins",
    text: "Saisie des notes par classe, moyennes et rangs automatiques, bulletins PDF prêts à imprimer — trimestres ou compositions mensuelles, au choix de chaque classe.",
    wide: true,
    tint: "bg-lamaSkyLight",
  },
  {
    icon: Wallet,
    title: "Finance en FCFA",
    text: "Frais de scolarité, factures, encaissements, dépenses et paie du personnel — avec exports CSV.",
    wide: true,
    tint: "",
  },
  {
    icon: CalendarCheck,
    title: "Présence & appel",
    text: "L'appel se fait en un écran ; l'historique par élève, classe et jour reste consultable à tout moment.",
    wide: false,
    tint: "",
  },
  {
    icon: BookOpenCheck,
    title: "Quiz & examens en ligne",
    text: "Évaluations chronométrées, correction assistée et résultats publiés directement aux élèves.",
    wide: false,
    tint: "bg-lamaYellowLight",
  },
  {
    icon: BellRing,
    title: "Annonces & événements",
    text: "Toute l'école ou une classe précise : chacun voit les annonces qui le concernent.",
    wide: false,
    tint: "",
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    text: "Tableaux de bord finance, élèves et enseignants pour piloter l'établissement avec des chiffres à jour.",
    wide: true,
    tint: "bg-lamaPurpleLight",
  },
  {
    icon: MessageSquareWarning,
    title: "Réclamations & demandes",
    text: "Contestations de notes, demandes administratives et séances de rattrapage suivies de bout en bout.",
    wide: true,
    tint: "",
  },
  {
    icon: CalendarDays,
    title: "Emplois du temps",
    text: "Cours, examens et événements planifiés sur un calendrier clair, visible par chaque classe.",
    wide: false,
    tint: "",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    name: "Direction",
    tagline: "Pilote tout l'établissement.",
    tint: "bg-lamaSkyLight text-sky-900",
    points: [
      "Comptes, classes et matières",
      "Finance, paie et exports",
      "Statistiques globales",
    ],
  },
  {
    icon: Users,
    name: "Enseignants",
    tagline: "Gèrent leurs classes au quotidien.",
    tint: "bg-lamaYellowLight text-yellow-900",
    points: [
      "Appel et présence",
      "Saisie des notes et quiz",
      "Emploi du temps personnel",
    ],
  },
  {
    icon: GraduationCap,
    name: "Élèves",
    tagline: "Suivent leur scolarité en direct.",
    tint: "bg-lamaPurpleLight text-purple-900",
    points: [
      "Notes, moyennes et bulletins",
      "Examens en ligne",
      "Annonces de la classe",
    ],
  },
  {
    icon: LayoutDashboard,
    name: "Parents",
    tagline: "Gardent un œil sur leurs enfants.",
    tint: "bg-gray-100 text-gray-700",
    points: [
      "Résultats et présence",
      "Frais et paiements",
      "Événements de l'école",
    ],
  },
];

const STEPS = [
  {
    title: "Créez votre école",
    text: "Deux minutes suffisent : votre établissement et votre compte direction sont prêts, avec 30 jours d'essai gratuit.",
  },
  {
    title: "Organisez l'année",
    text: "Classes, matières, régimes d'évaluation, emplois du temps et frais de scolarité se configurent en quelques écrans.",
  },
  {
    title: "Travaillez au quotidien",
    text: "Appel, notes, paiements et annonces : toute l'école travaille sur les mêmes données, à jour.",
  },
];

const FAQ = [
  {
    q: "Comment créer mon établissement ?",
    a: "Cliquez sur « Créer mon école », renseignez le nom de l'établissement et votre compte direction : votre espace est prêt immédiatement, avec 30 jours d'essai gratuit et sans carte bancaire. Vous créez ensuite vous-même les comptes de vos enseignants, élèves et parents.",
  },
  {
    q: "Comment se paie l'abonnement ?",
    a: "En FCFA, par les moyens locaux : espèces, Orange Money ou virement, directement auprès de la plateforme. Votre couverture est prolongée dès l'encaissement — aucun prélèvement automatique, aucune carte bancaire requise.",
  },
  {
    q: "Mes données sont-elles séparées des autres écoles ?",
    a: "Oui, strictement. Chaque établissement est cloisonné : ses élèves, notes, finances et documents ne sont visibles que par ses propres comptes. Vos données restent votre propriété.",
  },
  {
    q: "Peut-on personnaliser les couleurs de l'école ?",
    a: "Oui. Le nom, le logo et le thème de couleurs de votre établissement se règlent dans les paramètres et s'appliquent à tout votre espace : tableau de bord, bulletins et documents PDF.",
  },
];

// hauteurs du graphique décoratif de l'aperçu
const CHART_BARS = [35, 55, 40, 70, 52, 85, 62, 90, 48, 66, 78, 58];

const fmtFCFA = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role ?? null;
  const dashboardHref = role ? ROLE_HOME[role] ?? "/sign-in" : null;

  // Chiffres de la plateforme + tarifs publics (zéro crash sur base vide)
  let counts: { schools: number; students: number; teachers: number } | null =
    null;
  let plans: {
    id: number;
    name: string;
    priceMonthly: number;
    maxStudents: number | null;
  }[] = [];
  try {
    const [schools, students, teachers, activePlans] = await Promise.all([
      prisma.school.count({ where: { active: true } }),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: { priceMonthly: "asc" },
        select: { id: true, name: true, priceMonthly: true, maxStudents: true },
      }),
    ]);
    counts = { schools, students, teachers };
    plans = activePlans;
  } catch {
    counts = null;
  }
  const year = new Date().getFullYear();

  const primaryCta = dashboardHref ? (
    <Link
      href={dashboardHref}
      className="drawer-hero-bg flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-300/60 transition hover:brightness-110"
    >
      Ouvrir mon tableau de bord
      <ArrowRight size={16} />
    </Link>
  ) : (
    <>
      <Link
        href="/register-school"
        className="drawer-hero-bg flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-300/60 transition hover:brightness-110"
      >
        Créer mon école — essai 30 jours
        <ArrowRight size={16} />
      </Link>
      <Link
        href="/sign-in"
        className="rounded-xl border-[1.5px] border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
      >
        Se connecter
      </Link>
    </>
  );

  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* ---------- barre de navigation ---------- */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="text-lg font-bold">{PLATFORM}</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
            <a href="#fonctionnalites" className="transition hover:text-gray-900">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="transition hover:text-gray-900">
              Tarifs
            </a>
            <a href="#espaces" className="transition hover:text-gray-900">
              Espaces
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
                  className="rounded-lg border-[1.5px] border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register-school"
                  className="drawer-hero-bg rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Créer mon école
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------- héros centré ---------- */}
      <section className="mx-auto max-w-4xl px-6 pb-6 pt-20 text-center">
        <span className="text-theme-deep mx-auto flex w-max items-center gap-1.5 rounded-full bg-lamaSkyLight px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
          <Sparkles size={13} />
          La plateforme de gestion scolaire
        </span>
        <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight text-gray-900 md:text-6xl">
          La gestion de votre école,{" "}
          <span className="text-theme-gradient">simple et complète.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
          Élèves, enseignants, notes, bulletins, présence et finance — chaque
          établissement a son espace cloisonné, à ses couleurs. Créez le vôtre
          en deux minutes.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          {primaryCta}
        </div>
        <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          {[
            "Essai gratuit 30 jours",
            "FCFA — sans carte bancaire",
            "Données cloisonnées par école",
          ].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check size={15} className="text-theme-deep" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- vitrine : aperçu du tableau de bord ---------- */}
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-10">
        <div className="rounded-3xl border border-gray-100 bg-gradient-to-b from-[#f2f7fb] to-white p-4 shadow-2xl shadow-gray-200/70 sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
              <span className="ml-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-300">
                Le tableau de bord de votre école
              </span>
            </div>
            <div className="grid sm:grid-cols-[160px_1fr]">
              <div
                aria-hidden
                className="hidden border-r border-gray-100 p-3 text-xs text-gray-500 sm:block"
              >
                {[
                  { icon: Home, label: "Accueil", on: true },
                  { icon: GraduationCap, label: "Élèves", on: false },
                  { icon: Users, label: "Enseignants", on: false },
                  { icon: CalendarCheck, label: "Présence", on: false },
                  { icon: Wallet, label: "Finance", on: false },
                  { icon: BarChart3, label: "Statistiques", on: false },
                ].map(({ icon: Icon, label, on }) => (
                  <div
                    key={label}
                    className={`mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                      on ? "bg-lamaSkyLight font-semibold text-gray-800" : ""
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-lamaSkyLight p-3.5">
                    <div className="text-2xl font-bold text-gray-800">248</div>
                    <div className="text-xs text-gray-600">Élèves</div>
                  </div>
                  <div className="rounded-xl bg-lamaYellowLight p-3.5">
                    <div className="text-2xl font-bold text-gray-800">17</div>
                    <div className="text-xs text-gray-600">Enseignants</div>
                  </div>
                  <div className="rounded-xl bg-lamaPurpleLight p-3.5">
                    <div className="text-2xl font-bold text-gray-800">12</div>
                    <div className="text-xs text-gray-600">Classes</div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-3.5">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-xs text-gray-500">
                      CA encaissé (ce mois)
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      1 250 000{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        FCFA
                      </span>
                    </span>
                  </div>
                  <div className="flex h-24 items-end gap-1.5" aria-hidden>
                    {CHART_BARS.map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`flex-1 rounded-t ${
                          i % 2 ? "bg-lamaSky" : "drawer-hero-bg opacity-80"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- chiffres de la plateforme ---------- */}
      {counts && counts.schools > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="grid grid-cols-3 gap-4 rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
            {[
              { value: counts.schools, label: "Établissements" },
              { value: counts.students, label: "Élèves gérés" },
              { value: counts.teachers, label: "Enseignants" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-1 py-2">
                <span className="text-theme-deep text-3xl font-bold">
                  {value}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- fonctionnalités en bento ---------- */}
      <section
        id="fonctionnalites"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-20"
      >
        <div className="mb-10 max-w-2xl">
          <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
            Fonctionnalités
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Tout l&apos;établissement, un seul outil
          </h2>
          <p className="mt-3 text-gray-500">
            De la salle de classe à la comptabilité, chaque tâche du quotidien a
            son écran — sans classeurs ni fichiers éparpillés.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map(({ icon: Icon, title, text, wide, tint }) => (
            <div
              key={title}
              className={`rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/70 ${
                tint || "border border-gray-100 bg-white shadow-sm"
              } ${wide ? "lg:col-span-3" : "lg:col-span-2"}`}
            >
              <span className="drawer-hero-bg mb-4 grid h-10 w-10 place-items-center rounded-xl text-white">
                <Icon size={19} />
              </span>
              <h3 className="mb-1.5 text-sm font-bold text-gray-800">{title}</h3>
              <p className="text-[13px] leading-relaxed text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- tarifs ---------- */}
      <section
        id="tarifs"
        className="scroll-mt-24 border-y border-gray-100 bg-[#f6f9fb]"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
              Tarifs
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Un abonnement simple, en FCFA
            </h2>
            <p className="mt-3 text-gray-500">
              30 jours d&apos;essai gratuit pour chaque établissement, puis un
              tarif mensuel réglé par les moyens locaux : espèces, Orange Money
              ou virement.
            </p>
          </div>
          {plans.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 rounded-2xl p-6 ${
                    i === 0
                      ? "drawer-hero-bg text-white shadow-xl"
                      : "border border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{p.name}</h3>
                    {i === 0 && (
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                        Populaire
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold">
                      {fmtFCFA(p.priceMonthly)}
                    </span>
                    <span
                      className={`text-sm ${i === 0 ? "text-white/70" : "text-gray-400"}`}
                    >
                      {" "}
                      / mois
                    </span>
                  </div>
                  <ul
                    className={`flex flex-col gap-2 text-sm ${
                      i === 0 ? "text-white/85" : "text-gray-600"
                    }`}
                  >
                    <li className="flex items-center gap-1.5">
                      <Check size={14} className="flex-none" />
                      {p.maxStudents
                        ? `Jusqu'à ${p.maxStudents} élèves`
                        : "Élèves illimités"}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={14} className="flex-none" />
                      Toutes les fonctionnalités
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={14} className="flex-none" />
                      Essai gratuit 30 jours
                    </li>
                  </ul>
                  <Link
                    href="/register-school"
                    className={`mt-auto rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                      i === 0
                        ? "bg-white text-gray-800 hover:brightness-95"
                        : "drawer-hero-bg text-white hover:brightness-110"
                    }`}
                  >
                    Commencer l&apos;essai
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <Building2 className="text-theme-deep mx-auto mb-3" size={28} />
              <p className="mx-auto max-w-md text-sm text-gray-500">
                Commencez votre essai gratuit de 30 jours dès maintenant — les
                tarifs vous sont communiqués pendant l&apos;essai, et le
                paiement se fait en FCFA par les moyens locaux.
              </p>
              <Link
                href="/register-school"
                className="drawer-hero-bg mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Créer mon école
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------- un espace par rôle ---------- */}
      <section
        id="espaces"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20"
      >
        <div className="mb-10 max-w-2xl">
          <span className="text-theme-deep text-xs font-semibold uppercase tracking-[0.14em]">
            Espaces
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Chacun voit ce qui le concerne
          </h2>
          <p className="mt-3 text-gray-500">
            Quatre espaces distincts, un seul compte par personne : les données
            sont partagées dans l&apos;école, jamais au-delà.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(({ icon: Icon, name, tagline, tint, points }) => (
            <div
              key={name}
              className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6"
            >
              <span
                className={`mb-4 flex w-max items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${tint}`}
              >
                <Icon size={13} />
                {name}
              </span>
              <p className="mb-4 text-[13px] text-gray-500">{tagline}</p>
              <ul className="mt-auto flex flex-col gap-2">
                {points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-1.5 text-[13px] text-gray-600"
                  >
                    <Check
                      size={14}
                      className="text-theme-deep mt-0.5 flex-none"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- comment démarrer ---------- */}
      <section
        id="demarrer"
        className="scroll-mt-24 border-y border-gray-100 bg-[#f6f9fb]"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
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
                <h3 className="mb-1.5 text-sm font-bold text-gray-800">
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed text-gray-500">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-20">
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
              className="group rounded-2xl border border-gray-100 bg-[#f6f9fb] px-6 py-4 open:bg-white open:shadow-sm"
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
      </section>

      {/* ---------- appel à l'action ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
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
            Prêt à moderniser votre établissement ?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm text-white/80">
            Créez votre école en deux minutes — 30 jours d&apos;essai gratuit,
            sans engagement ni carte bancaire.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={dashboardHref ?? "/register-school"}
              className="text-theme-deep flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold shadow-lg transition hover:brightness-95"
            >
              {dashboardHref ? "Ouvrir mon tableau de bord" : "Créer mon école"}
              <ArrowRight size={16} />
            </Link>
            {!dashboardHref && (
              <Link
                href="/sign-in"
                className="rounded-xl border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Se connecter
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
                src="/logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="text-sm font-bold">{PLATFORM}</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-gray-500">
              La plateforme de gestion scolaire des établissements
              d&apos;Afrique de l&apos;Ouest : notes, présence, finance en FCFA
              et communication réunies au même endroit.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Plateforme
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <a
                  href="#fonctionnalites"
                  className="transition hover:text-gray-900"
                >
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#tarifs" className="transition hover:text-gray-900">
                  Tarifs
                </a>
              </li>
              <li>
                <a href="#faq" className="transition hover:text-gray-900">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Commencer
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <Link
                  href="/register-school"
                  className="transition hover:text-gray-900"
                >
                  Créer mon école
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="transition hover:text-gray-900">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100">
          <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-gray-400">
            © {year} {PLATFORM} — Tous droits réservés.
          </p>
        </div>
      </footer>
    </main>
  );
}
