import Link from "next/link";
import { Award, FileText } from "lucide-react";
import ExamsSection from "./ExamsSection";
import ResultsSection from "./ResultsSection";

// Page fusionnée examens/résultats : un onglet « Examens » et un onglet
// « Résultats & bulletins » (?tab=results). L'ancienne route /list/results
// redirige ici en préservant ses paramètres.

const TABS = [
  { key: "exams", label: "Examens", href: "/list/exams", icon: FileText },
  {
    key: "results",
    label: "Résultats & bulletins",
    href: "/list/exams?tab=results",
    icon: Award,
  },
] as const;

const ExamsAndResultsPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "results" ? "results" : "exams";

  return (
    <div className="flex-1 flex flex-col">
      {/* Onglets */}
      <div className="mx-4 mb-2 flex items-center gap-2">
        {TABS.map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === key
                ? "bg-lamaSky text-white"
                : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>

      {tab === "results" ? (
        <ResultsSection searchParams={searchParams} />
      ) : (
        <ExamsSection searchParams={searchParams} />
      )}
    </div>
  );
};

export default ExamsAndResultsPage;
