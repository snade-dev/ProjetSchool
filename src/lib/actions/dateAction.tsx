"use server";
import { redirect } from "next/navigation";
import prisma from "../prisma";
import { requireRole } from "../authGuard";

// Cette fonction s'exécute côté serveur
export default async function updateAttestationDate(formData: FormData) {

    await requireRole(["admin", "director", "teacher"]);

    // Récupération des valeurs depuis le formulaire
    const attestationId = formData.get("attestationId")?.toString();
    const dateValue = formData.get("Rdate")?.toString();

    if (!attestationId) {
      throw new Error("L'identifiant de l'attestation est manquant");
    }
    if (!dateValue) {
      throw new Error("La date est requise");
    }
  
    // Mise à jour de l'attestation dans la base de données
    await prisma.attestation.update({
      where: { id: attestationId },
      data: { resolvedDate: new Date(dateValue) },
    });
  
    // Redirection vers la page de résultats
    redirect("/list/resultExam");
  }
  