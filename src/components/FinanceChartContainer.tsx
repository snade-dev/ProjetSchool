import FinanceChart, { FinanceChartPoint } from "./FinanceChart";
import { getFinanceStats } from "@/lib/stats/financeStats";
import { getActiveSchoolYear } from "@/lib/schoolYear";

/**
 * S17 — Container RSC du graphique finance du dashboard admin.
 * Alimente `FinanceChart` avec la série mensuelle réelle de l'année active
 * (S16 `getFinanceStats`). Aucune année active / aucune donnée → série vide
 * (le graphique se rend sans crash).
 */
const FinanceChartContainer = async () => {
  let data: FinanceChartPoint[] = [];

  try {
    const year = await getActiveSchoolYear();
    const stats = await getFinanceStats(year.id);
    if (stats) {
      data = stats.months.map((m) => ({
        name: m.label,
        income: m.encaisse,
        expense: m.depenses + m.salaires,
      }));
    }
  } catch {
    // Pas d'année active configurée → série vide (dashboard = première page vue).
    data = [];
  }

  return <FinanceChart data={data} />;
};
export default FinanceChartContainer;
