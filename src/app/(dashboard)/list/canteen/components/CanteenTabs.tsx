import Link from "next/link";
import { UtensilsCrossed, Users, ClipboardCheck, BarChart2 } from "lucide-react";

/** X01 — navigation partagée par les écrans du module cantine (§2.5). */
const TABS = [
  { href: "/list/canteen", label: "Formules", icon: UtensilsCrossed },
  { href: "/list/canteen/subscriptions", label: "Abonnés", icon: Users },
  { href: "/list/canteen/pointage", label: "Pointage", icon: ClipboardCheck },
  { href: "/list/canteen/recap", label: "Récapitulatif", icon: BarChart2 },
];

const CanteenTabs = ({ current }: { current: string }) => (
  <div className="flex flex-wrap items-center gap-2">
    {TABS.map((t) => {
      const Icon = t.icon;
      const active = t.href === current;
      return (
        <Link
          key={t.href}
          href={t.href}
          className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            active
              ? "bg-lamaSky text-sky-900"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <Icon size={14} className="shrink-0" />
          {t.label}
        </Link>
      );
    })}
  </div>
);

export default CanteenTabs;
