"use client";

import updateAttestationDate from "@/lib/actions/dateAction";

type UpdateDateProps = {
  attestationId: string;
  role: string;
};

export default function UpdateDate({ attestationId, role }: UpdateDateProps) {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Répondez aux questions :</h2>
      <form action={updateAttestationDate} className="space-y-6">
        {/* On passe l'attestationId via un champ caché */}
        <input type="hidden" name="attestationId" value={attestationId} />
        
        <label htmlFor="Rdate" className="block font-medium">
          Date de résolution :
        </label>
        <input type="date" name="Rdate" id="Rdate" required className="border rounded px-2 py-1" />

        {role === "student" && (
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
          >
            Envoyer les réponses
          </button>
        )}
      </form>
    </div>
  );
}
