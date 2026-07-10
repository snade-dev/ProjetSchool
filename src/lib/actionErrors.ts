// S20 — Message FR exploitable pour les échecs de suppression.
// La carte de confirmation de FormModal affiche `state.message` : sans lui,
// un échec (contrainte FK…) passait pour un succès silencieux.
export function deleteErrorMessage(err: any): string {
  if (err?.code === "P2003") {
    return "Suppression impossible : d'autres données référencent encore cet élément.";
  }
  if (err?.code === "P2025") {
    return "Élément introuvable (déjà supprimé ?).";
  }
  return `${err?.message ?? err}`;
}
