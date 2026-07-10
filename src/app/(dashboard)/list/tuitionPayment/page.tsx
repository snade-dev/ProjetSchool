import { redirect } from "next/navigation";

// Écran déprécié (story-07) : la scolarité est désormais gérée via les factures.
// Les sous-fichiers sont conservés mais l'écran redirige vers /list/invoices.
const TuitionPaymentPage = () => {
  redirect("/list/invoices");
};

export default TuitionPaymentPage;
