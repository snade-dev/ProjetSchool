// pages/scolarite/[studentId].tsx

import prisma from "@/lib/prisma";
import { TuitionPayment } from "@/app/generated/prisma";
import { Edit } from "lucide-react";
import { notFound } from "next/navigation";
import React from "react";
import { EditButton } from "./components/EditButton";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const Tuition = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const year = new Date().getFullYear();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;

  const student = await prisma.student.findUnique({
    where: {
      id: params.id,
    },
    include: {
      TuitionPayment: true,
    },
  });

  if (!student) {
    return notFound();
  }

  const payments: TuitionPayment[] = student.TuitionPayment;

  // On transforme la liste des paiements en un objet indexé par mois (clé = numéro du mois)
  const paymentsByMonth: Record<number, TuitionPayment> = {};
  payments.forEach((payment) => {
    paymentsByMonth[payment.month] = payment;
  });

  // Génère un tableau contenant les mois de 1 à 12
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Calcule le montant total payé sur l'année
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Scolarité de {student.name} {student.surname} pour l&apos;année {year}
      </h1>
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-200 p-2">Mois</th>
            <th className="border border-gray-200 p-2">Montant</th>
            <th className="border border-gray-200 p-2">Date de paiement</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => {
            const payment = paymentsByMonth[month];
            console.log(payment);
            return (
              <tr key={month} className="text-center">
                <td className="border border-gray-200 p-2">
                  {new Date(0, month - 1).toLocaleString("fr-FR", {
                    month: "long",
                  })}
                </td>
                <td className="border border-gray-200 p-2 flex items-center justify-center gap-2">
                  {payment ? `${payment.amount} FCFA` : "Non payé"}
                  {(role === "teacher" || role === "admin" || role === "accountant") && (
                    <EditButton
                      TuitionId={payment?.id}
                      studentId={student.id}
                      month={month}
                    />
                  )}
                </td>
                <td className="border border-gray-200 p-2">
                  {payment
                    ? new Date(payment.paymentDate).toLocaleDateString("fr-FR")
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="border border-gray-200 p-2">Total</td>
            <td className="border border-gray-200 p-2" colSpan={2}>
              {totalPaid} FCFA
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default Tuition;
