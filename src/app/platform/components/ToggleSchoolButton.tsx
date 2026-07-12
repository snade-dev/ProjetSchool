"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Power } from "lucide-react";
import { toggleSchoolActive } from "@/lib/actions/platformAction";

/** V04 — coupe/réactive une école (confirmation avant coupure). */
export default function ToggleSchoolButton({
  schoolId,
  active,
}: {
  schoolId: number;
  active: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    setConfirming(false);
    startTransition(async () => {
      const res = await toggleSchoolActive(schoolId, !active);
      if (res.success) {
        toast(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  if (active && !confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
      >
        <Power size={12} />
        Couper
      </button>
    );
  }
  if (active && confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Confirmer la coupure
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Annuler
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-green-200 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50"
    >
      <Power size={12} />
      {isPending ? "…" : "Réactiver"}
    </button>
  );
}
