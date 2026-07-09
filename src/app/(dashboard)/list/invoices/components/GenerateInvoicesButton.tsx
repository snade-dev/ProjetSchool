"use client";

import {
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CalendarPlus } from "lucide-react";
import { generateMonthlyInvoices } from "@/lib/actions/invoiceAction";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type Preview = { facturables: number; dejaGeneres: number } | null;

/**
 * Bouton admin « Générer les factures du mois » + modal (style FormModal).
 * L'aperçu (facturables / déjà générés) est calculé par la PAGE et passé en
 * props ; les selects mois/année pilotent l'URL (`?generate=1&gm=&gy=`) pour
 * rafraîchir cet aperçu côté serveur avant confirmation.
 */
const GenerateInvoicesButton = ({
  month,
  year,
  preview,
}: {
  month: number;
  year: number;
  preview: Preview;
}) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(generateMonthlyInvoices, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || "Erreur lors de la génération.");
    }
  }, [state, router]);

  // Met à jour l'URL pour recalculer l'aperçu serveur (mois/année courants).
  const syncPreview = (m: number, y: number) => {
    startTransition(() => {
      router.replace(`${pathname}?generate=1&gm=${m}&gy=${y}`, {
        scroll: false,
      });
    });
  };

  const openModal = () => {
    setOpen(true);
    syncPreview(month, year);
  };

  const closeModal = () => {
    setOpen(false);
  };

  const onConfirm = () => {
    startTransition(() => {
      formAction({ month, year });
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => year - 2 + i);

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 bg-blue-400 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-500"
      >
        <CalendarPlus size={16} />
        <span className="hidden md:inline">Générer les factures du mois</span>
        <span className="md:hidden">Générer</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[60%] lg:w-[45%] xl:w-[35%] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-md flex flex-col gap-6">
            <div
              className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={closeModal}
            >
              ✕
            </div>

            <h1 className="text-xl font-semibold">
              Générer les factures du mois
            </h1>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2 w-full md:w-[45%]">
                <label className="text-xs text-gray-500">Mois</label>
                <select
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                  value={month}
                  onChange={(e) =>
                    syncPreview(parseInt(e.target.value), year)
                  }
                >
                  {MONTHS.map((label, i) => (
                    <option key={i} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-[45%]">
                <label className="text-xs text-gray-500">Année</label>
                <select
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                  value={year}
                  onChange={(e) =>
                    syncPreview(month, parseInt(e.target.value))
                  }
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-lamaSkyLight text-sm text-gray-700 p-3 rounded-md">
              {preview ? (
                <>
                  <span className="font-semibold">{preview.facturables}</span>{" "}
                  élève(s) facturable(s),{" "}
                  <span className="font-semibold">{preview.dejaGeneres}</span>{" "}
                  déjà facturé(s) (ignorés).
                </>
              ) : (
                <span className="text-gray-400">Chargement de l’aperçu…</span>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Une facture par élève dont la classe possède au moins un frais
              mensuel. Échéance : le 5 du mois. L’opération est sûre à relancer
              (aucun doublon).
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="text-sm px-4 py-2 rounded-md ring-[1.5px] ring-gray-300 text-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={isPending}
                className="bg-blue-400 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-500 disabled:bg-slate-400"
              >
                {isPending ? "Génération…" : "Générer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GenerateInvoicesButton;
