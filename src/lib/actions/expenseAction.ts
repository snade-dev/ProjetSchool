"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { getActiveSchoolYear } from "../schoolYear";
import {
  ExpenseSchema,
  ExpenseCategorySchema,
} from "../formsValidationSchema";
import { deleteErrorMessage } from "../actionErrors";

type CurrentState = {
  success: boolean;
  error: boolean;
};

// ---------------------------------------------------------------------------
// CRUD Dépense
// ---------------------------------------------------------------------------

export const createExpense = async (
  currentState: CurrentState,
  data: ExpenseSchema
) => {
  try {
    const { userId } = await requireRole(["admin"]);
    // Année scolaire active rattachée automatiquement (critère S09.4).
    const activeYear = await getActiveSchoolYear();

    await prisma.expense.create({
      data: {
        label: data.label,
        amount: data.amount,
        date: data.date,
        supplier: data.supplier || null,
        receiptImg: data.receiptImg || null,
        method: data.method,
        notes: data.notes || null,
        categoryId: data.categoryId,
        schoolYearId: activeYear.id,
        createdById: userId,
      },
    });

    revalidatePath("/list/expenses");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExpense = async (
  currentState: CurrentState,
  data: ExpenseSchema
) => {
  try {
    await requireRole(["admin"]);

    await prisma.expense.update({
      where: { id: data.id },
      data: {
        label: data.label,
        amount: data.amount,
        date: data.date,
        supplier: data.supplier || null,
        receiptImg: data.receiptImg || null,
        method: data.method,
        notes: data.notes || null,
        categoryId: data.categoryId,
      },
    });

    revalidatePath("/list/expenses");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExpense = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole(["admin"]);

    await prisma.expense.delete({
      where: { id },
    });

    revalidatePath("/list/expenses");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

// ---------------------------------------------------------------------------
// CRUD Catégorie de dépense
// ---------------------------------------------------------------------------

type CategoryState = {
  success: boolean;
  error: boolean;
  message?: string;
};

export const createExpenseCategory = async (
  currentState: CategoryState,
  data: ExpenseCategorySchema
): Promise<CategoryState> => {
  try {
    await requireRole(["admin"]);

    await prisma.expenseCategory.create({
      data: { name: data.name },
    });

    revalidatePath("/list/expenses");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    // P2002 : nom déjà pris (name @unique)
    if (err?.code === "P2002") {
      return {
        success: false,
        error: true,
        message: "Une catégorie porte déjà ce nom",
      };
    }
    return { success: false, error: true, message: "Une erreur est survenue" };
  }
};

export const updateExpenseCategory = async (
  currentState: CategoryState,
  data: ExpenseCategorySchema
): Promise<CategoryState> => {
  try {
    await requireRole(["admin"]);

    await prisma.expenseCategory.update({
      where: { id: data.id },
      data: { name: data.name },
    });

    revalidatePath("/list/expenses");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    if (err?.code === "P2002") {
      return {
        success: false,
        error: true,
        message: "Une catégorie porte déjà ce nom",
      };
    }
    return { success: false, error: true, message: "Une erreur est survenue" };
  }
};

export const deleteExpenseCategory = async (
  currentState: CategoryState,
  data: FormData
): Promise<CategoryState> => {
  const id = data.get("id") as string;
  try {
    await requireRole(["admin"]);

    await prisma.expenseCategory.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/expenses");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    // P2003 : violation de contrainte de clé étrangère → catégorie référencée par des dépenses.
    if (err?.code === "P2003") {
      return {
        success: false,
        error: true,
        message: "Catégorie utilisée par des dépenses",
      };
    }
    return { success: false, error: true, message: "Une erreur est survenue" };
  }
};
