"use server";

import { Schemas } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { revalidatePath } from "next/cache";

export const updateTuition = async ( curentState: {success: boolean, error: boolean, message: string}, data: {amont: number, id: string, studentId: string, month: number}) => {
    try {
        await requireRole(["admin", "accountant"]);

        await prisma.tuitionPayment.upsert({
            where: {
                id: data.id || ''
            },
            update: {
                amount: data.amont
            },
            create: {
                amount: data.amont,
                studentId: data.studentId,
                paymentDate: new Date(),
                month: data.month,
                year: new Date().getFullYear()
            }
        });

        revalidatePath("/list/tuitionPayment");
        return {
            success: true,
            error: false,
            message: "Paiement modifié avec succès"
        }

    } catch (error) {
        console.log("TextInputAction",error);
        
        return {
            success: false,
            error: true,
            message: "Une erreur est survenue lors de la modification du paiement"
        }
    }
}