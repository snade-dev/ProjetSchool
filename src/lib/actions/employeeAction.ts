"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { auditWithSession, auditDiff } from "../audit";
import { EmployeeSchema } from "../formsValidationSchema";

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

// ---------------------------------------------------------------------------
// CRUD Employé (S10)
// ---------------------------------------------------------------------------

export const createEmployee = async (
  currentState: CurrentState,
  data: EmployeeSchema
): Promise<CurrentState> => {
  try {
    await requireRole(["admin", "director"]);

    const teacherId = data.teacherId ? data.teacherId : null;

    // Identité : par défaut les champs libres du formulaire (staff).
    let name = data.name;
    let surname = data.surname;
    let email: string | null = data.email ? data.email : null;
    let phone: string | null = data.phone ? data.phone : null;

    // Si l'employé est lié à un enseignant, le Teacher est la source de vérité :
    // on écrase name/surname/email/phone côté serveur (les inputs readOnly ne
    // sont pas dignes de confiance).
    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
      });
      if (!teacher) {
        return {
          success: false,
          error: true,
          message: "Enseignant introuvable",
        };
      }
      name = teacher.name;
      surname = teacher.surname;
      email = teacher.email ?? null;
      phone = teacher.phone ?? null;
    }

    const session = await requireSchool(["admin", "director"]); // V03
    const { schoolId } = session;
    const created = await prisma.employee.create({
      data: {
        schoolId,
        teacherId,
        name,
        surname,
        position: data.position,
        phone,
        email,
        hireDate: data.hireDate,
        baseSalary: data.baseSalary,
        active: data.active ?? true,
      },
    });

    // W10 — journal d'audit : création d'un employé (§2.11.2)
    await auditWithSession(session, "employee.create", `Employee#${created.id}`, {
      after: {
        name,
        surname,
        position: data.position,
        baseSalary: data.baseSalary,
        teacherId,
      },
    });

    revalidatePath("/list/employees");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    // P2002 sur teacherId @unique : cet enseignant a déjà une fiche employé.
    if (err?.code === "P2002") {
      return {
        success: false,
        error: true,
        message: "Cet enseignant a déjà une fiche employé",
      };
    }
    return { success: false, error: true, message: "Une erreur est survenue" };
  }
};

export const updateEmployee = async (
  currentState: CurrentState,
  data: EmployeeSchema
): Promise<CurrentState> => {
  try {
    const session = await requireRole(["admin", "director"]);

    if (!data.id) {
      return { success: false, error: true, message: "Identifiant manquant" };
    }

    // W10 — valeurs avant modification (before/after du journal d'audit)
    const before = await prisma.employee.findUnique({
      where: { id: data.id },
      select: { position: true, phone: true, email: true, baseSalary: true, active: true, schoolId: true },
    });

    // On ne modifie que les champs éditables : salaire, poste, contacts, statut.
    // Le lien à l'enseignant et l'identité liée ne se remodifient pas ici.
    await prisma.employee.update({
      where: { id: data.id },
      data: {
        position: data.position,
        phone: data.phone ? data.phone : null,
        email: data.email ? data.email : null,
        baseSalary: data.baseSalary,
        active: data.active ?? true,
      },
    });

    // W10 — journal d'audit : champs modifiés seulement (dont baseSalary,
    // §2.11.2 « modification d'un salaire »)
    if (before) {
      const diff = auditDiff(before as unknown as Record<string, unknown>, {
        position: data.position,
        phone: data.phone ? data.phone : null,
        email: data.email ? data.email : null,
        baseSalary: data.baseSalary,
        active: data.active ?? true,
      });
      if (diff.changed) {
        await auditWithSession(session, "employee.update", `Employee#${data.id}`, {
          before: diff.before,
          after: diff.after,
          schoolId: before.schoolId,
        });
      }
    }

    revalidatePath("/list/employees");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: "Une erreur est survenue" };
  }
};

export const deleteEmployee = async (
  currentState: CurrentState,
  formData: FormData
): Promise<CurrentState> => {
  const id = formData.get("id") as string;
  try {
    const session = await requireRole(["admin", "director"]);

    // Refus de suppression si des bulletins de paie existent → désactiver plutôt.
    const salaryCount = await prisma.salaryPayment.count({
      where: { employeeId: id },
    });
    if (salaryCount > 0) {
      return {
        success: false,
        error: true,
        message: "Désactivez plutôt cet employé",
      };
    }

    // W10 — identité conservée pour le journal d'audit
    const before = await prisma.employee.findUnique({
      where: { id },
      select: { name: true, surname: true, position: true, schoolId: true },
    });

    await prisma.employee.delete({ where: { id } });

    // W10 — journal d'audit : suppression d'un employé (§2.11.2)
    await auditWithSession(session, "employee.delete", `Employee#${id}`, {
      before: before
        ? { name: before.name, surname: before.surname, position: before.position }
        : undefined,
      schoolId: before?.schoolId,
    });

    revalidatePath("/list/employees");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: "Une erreur est survenue" };
  }
};
