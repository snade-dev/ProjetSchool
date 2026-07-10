import { redirect } from "next/navigation";

// Fusion examens/résultats : l'ancienne page résultats vit désormais dans
// l'onglet « Résultats & bulletins » de /list/exams. On redirige en
// préservant les filtres (classe, semestre, élève, examen, recherche, page).
export default async function ResultsRedirect(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams({ tab: "results" });
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && key !== "tab") params.set(key, value);
  }
  redirect(`/list/exams?${params.toString()}`);
}
