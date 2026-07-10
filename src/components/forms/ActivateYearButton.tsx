"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { activateSchoolYear } from "@/lib/actions/settingsAction";

const ActivateYearButton = ({ id }: { id: number }) => {
  const [state, formAction] = useActionState(activateSchoolYear, {
    success: false,
    error: false,
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("Année scolaire activée !");
      router.refresh();
    } else if (state.error) {
      toast("Erreur lors de l'activation.");
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs bg-lamaPurple text-white py-1 px-3 rounded-md"
      >
        Activer
      </button>
    </form>
  );
};

export default ActivateYearButton;
