"use server";

import { ClassSchema, ExamSchema, StudentSchema, SubjectSchema, TeacherSchema } from './formsValidationSchema';
import { createAuthUser, removeAuthUser, setAuthUserPassword } from './authAdmin';
import prisma from './prisma';
import { requireRole, requireSchool } from './authGuard';
import { getActiveSchoolYear } from './schoolYear';
import { upsertEnrollment } from './enrollment';
import { impactedTrimesterAverages, markStale } from './staleBulletins';
import { revalidatePath } from 'next/cache';
import { deleteErrorMessage } from './actionErrors';

type CurrentState = {
    success: boolean,
    error: boolean
}
type CurrentState2 = {
    success: boolean,
    error: boolean,
    message: string
}


// SUBJECT
export const createSubject = async (currentState: CurrentState ,data: SubjectSchema) => {
    try {
        // V03 — création rattachée à l'école de la session
        const { schoolId } = await requireSchool(["admin", "director"]);
        await prisma.subject.create({
          data: {
            schoolId,
            name: data.name,
            teachers: {
              connect: data.teachers.map((teacherId) => ({ id: teacherId}))
            }
          },

        });

        revalidatePath("/list/subjects");
        return {success: true, error: false};
    } catch (error) {
        console.log(error);
        return {success: false, error: true};
    }
    
}

export const updateSubject = async (currentState: CurrentState ,data: SubjectSchema) => {
    try {
        const { schoolId } = await requireSchool(["admin", "director"]);
        // V03 — la matière doit appartenir à l'école de la session
        const owned = await prisma.subject.findFirst({
          where: { id: data.id, schoolId }, select: { id: true },
        });
        if (!owned) return { success: false, error: true };
        await prisma.subject.update({
          where: {
            id: data.id
          },
          data: {
            name: data.name,
            teachers: {
              set: data.teachers.map((teacherId) => ({id: teacherId}))
            }
          }
        });

        revalidatePath("/list/subjects");
        return {success: true, error: false};
    } catch (error) {
        console.log(error);
        return {success: false, error: true};
    }
    
}

export const deleteSubject = async (currentState: CurrentState ,data: FormData) => {
    const id =data.get("id") as string;
    try {
        const { schoolId } = await requireSchool(["admin", "director"]);
        // V03 — cloisonnement
        const ownedS = await prisma.subject.findFirst({
          where: { id: parseInt(id), schoolId }, select: { id: true },
        });
        if (!ownedS) return { success: false, error: true };
        await prisma.subject.delete({
          where: {
            id: parseInt(id)
          }
        });

        revalidatePath("/list/subjects");
        return {success: true, error: false};
    } catch (error: any) {
        console.log(error);
        return { success: false, error: true, message: deleteErrorMessage(error) };
    }
    
}



// CLASS
export const createClass = async (currentState: CurrentState2 ,data: ClassSchema) => {
    try {
        // V03 — création rattachée à l'école de la session
        const { schoolId } = await requireSchool(["admin", "director"]);

        // W02 — une classe appartient à UNE année scolaire : la création cible
        // toujours l'année ACTIVE de l'école.
        const activeYear = await getActiveSchoolYear(schoolId);

        // W02 — le niveau choisi doit appartenir à l'école de la session
        const level = await prisma.level.findFirst({
          where: { id: data.levelId, schoolId }, select: { id: true },
        });
        if (!level) {
          return { success: false, error: true, message: "Niveau introuvable dans votre établissement." };
        }

        // W02 — le contrôle de doublon est scopé à l'école ET à l'année
        // (« 6ème A » est réutilisable chaque année)
        const existingClass = await prisma.class.findFirst({
          where: {
            name: data.name,
            schoolId,
            schoolYearId: activeYear.id,
          }
        })

        if (existingClass) {
          return {success: false, error: true, message: "La classe existe déjà pour cette année scolaire"};
        }

        await prisma.class.create({
          data: { ...data, schoolId, schoolYearId: activeYear.id }
        });

        revalidatePath("/list/classes");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }

}

export const updateClass = async (currentState: CurrentState2 ,data: ClassSchema) => {
    try {
        const { schoolId } = await requireSchool(["admin", "director"]);
        // V03 — la classe doit appartenir à l'école de la session
        // W09 — homeworkWeight/année chargés pour détecter un changement de pondération
        const owned = await prisma.class.findFirst({
          where: { id: data.id, schoolId },
          select: { id: true, homeworkWeight: true, schoolYearId: true },
        });
        if (!owned) return { success: false, error: true, message: "" };

        // W02 — le niveau choisi doit appartenir à l'école de la session
        const level = await prisma.level.findFirst({
          where: { id: data.levelId, schoolId }, select: { id: true },
        });
        if (!level) {
          return { success: false, error: true, message: "Niveau introuvable dans votre établissement." };
        }

        // W02 — l'année de rattachement n'est PAS modifiable ici (assistant de
        // passage d'année en W04) : on ne touche qu'aux champs du formulaire.
        await prisma.class.update({
          where: {
            id: data.id
          },
          data
        });

        // W09 — même règle que les coefficients (§2.1.6) : changer la
        // pondération devoirs/composition alors que des bulletins TRIMESTER
        // existent les périme (stale=true → badge « À régénérer » + bouton de
        // régénération sur l'écran Matières & coefficients). Les bulletins de
        // composition (MONTHLY) ne dépendent pas de cette pondération.
        let staleMessage = "";
        if (data.homeworkWeight !== owned.homeworkWeight) {
          const { ids } = await impactedTrimesterAverages(owned.id, owned.schoolYearId);
          const { count } = await markStale(ids);
          if (count > 0) {
            staleMessage = `Pondération modifiée : ${count} bulletin(s) marqués « À régénérer » (écran Matières & coefficients).`;
            console.log(
              `[W09] homeworkWeight.update (ClassForm) classe ${owned.id} : ${owned.homeworkWeight} → ${data.homeworkWeight} — ${count} bulletin(s) périmés`
            );
          }
        }

        revalidatePath("/list/classes");
        return {success: true, error: false, message: staleMessage};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }

}

export const deleteClass = async (currentState: CurrentState ,data: FormData) => {
    const id =data.get("id") as string;
    try {
        const { schoolId } = await requireSchool(["admin", "director"]);
        // V03 — cloisonnement
        const ownedC = await prisma.class.findFirst({
          where: { id: parseInt(id), schoolId }, select: { id: true },
        });
        if (!ownedC) return { success: false, error: true };
        await prisma.class.delete({
          where: {
            id: parseInt(id)
          }
        });

        revalidatePath("/list/classes");
        return {success: true, error: false};
    } catch (error: any) {
        console.log(error);
        return { success: false, error: true, message: deleteErrorMessage(error) };
    }
    
}



// TEACHER
export const createTeacher = async (currentState: CurrentState2 ,data: TeacherSchema) => {

    try {
        await requireRole(["admin"]);

        // S19 : e-mail = identifiant de connexion, mot de passe requis
        if (!data.email) {
          return { success: false, error: true, message: "L'adresse e-mail est requise (identifiant de connexion)." };
        }
        if (!data.password || data.password.length < 8) {
          return { success: false, error: true, message: "Le mot de passe est requis (8 caractères minimum)." };
        }

        const existingTeacher = await prisma.teacher.findFirst({
          where: {
            OR: [
              { username: data.username},
              { phone: data.phone },
              { email: data.email }
            ]
          }
        });

        // Déterminer le champ dupliqué pour un message d'erreur spécifique
    if (existingTeacher) {
      if (existingTeacher.phone === data.phone) {
        return { success: false, error: true, message: "Le numéro de téléphone existe déjà." };
      }
      if (existingTeacher.email === data.email) {
        return { success: false, error: true, message: "L'adresse e-mail existe déjà." };
      }
      if (existingTeacher.username === data.username) {
        return { success: false, error: true, message: "L'identifiant existe déjà." };
      }
    }

        let userId: string;
        try {
          userId = await createAuthUser({
            email: data.email,
            password: data.password,
            name: data.username,
            role: "teacher",
          });
        } catch (err: any) {
          return { success: false, error: true, message: err.message };
        }

        try {
        const { schoolId } = await requireSchool(["admin"]); // V03
        await prisma.teacher.create({
          data: {
            schoolId,
            id: userId,
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
            subjects: {
              connect: data.subjects?.map((subjectId: string) => ({
                id: parseInt(subjectId),
              })),
            },
          },
        });
        } catch (err) {
          // compensation : ne pas laisser un compte de connexion orphelin
          await removeAuthUser(userId);
          throw err;
        }

        revalidatePath("/list/teachers");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const updateTeacher = async (currentState: CurrentState2 ,data: TeacherSchema) => {
    try {
      const { schoolId } = await requireSchool(["admin"]);

      if (!data.id) {
        return {success: false, error: true, message: ""}
      }
      // V03 — l'enseignant doit appartenir à l'école de la session
      const ownedT = await prisma.teacher.findFirst({
        where: { id: data.id, schoolId }, select: { id: true },
      });
      if (!ownedT) return { success: false, error: true, message: "Enseignant introuvable dans votre établissement." };

      // Compte de connexion : nom/email dans User, mot de passe via l'API
      // admin (S19). Toléré si l'enseignant (seedé) n'a pas de compte.
      try {
        await prisma.user.update({
          where: { id: data.id },
          data: {
            name: data.username,
            ...(data.email && { email: data.email }),
          },
        });
        if (data.password && data.password !== "") {
          await setAuthUserPassword(data.id, data.password);
        }
       } catch (err) {
        console.warn(`Compte better-auth ${data.id} non mis à jour (probablement inexistant) : ${err}`);
       }


      await prisma.teacher.update({
        where: {
          id: data.id
        },
        data: {
          // Bug corrigé : le modèle Teacher n'a PAS de colonne password
          // (mot de passe géré par better-auth plus haut).
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
          img: data.img || null,
          bloodType: data.bloodType,
          sex: data.sex,
          birthday: data.birthday,
          subjects: {
            set: data.subjects?.map((subjectId: string) => ({
              id: parseInt(subjectId),
            })),
          },
        },
      });

        revalidatePath("/list/teachers");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const deleteTeacher = async (currentState: CurrentState ,data: FormData) => {
    const id = data.get("id") as string;
    try {
      const { schoolId } = await requireSchool(["admin"]);
      // V03 — cloisonnement
      const ownedDT = await prisma.teacher.findFirst({
        where: { id, schoolId }, select: { id: true },
      });
      if (!ownedDT) return { success: false, error: true, message: "Enseignant introuvable dans votre établissement." };

    // Transaction : si la suppression de l'enseignant échoue (contrainte FK
    // quiz/questions…), ses leçons ne doivent pas avoir été supprimées.
    await prisma.$transaction([
      prisma.lesson.deleteMany({
        where: {
          teacherId: id,
        },
      }),
      prisma.teacher.delete({
        where: {
          id: id,
        },
      }),
    ]);

    // Compte de connexion en dernier (S19)
    await removeAuthUser(id);

        revalidatePath("/list/teachers");
        return {success: true, error: false};
    } catch (error: any) {
        console.log(error);
        const message =
          error?.code === "P2003"
            ? "Impossible : des quiz, questions ou corrections référencent encore cet enseignant."
            : `${error?.message ?? error}`;
        return {success: false, error: true, message};
    }

}




//Student
export const createStudent = async (currentState: CurrentState2 ,data: StudentSchema) => {
    try {
      await requireRole(["admin"]);

      // S19 : e-mail = identifiant de connexion, mot de passe requis
      if (!data.email) {
        return { success: false, error: true, message: "L'adresse e-mail est requise (identifiant de connexion)." };
      }
      if (!data.password || data.password.length < 8) {
        return { success: false, error: true, message: "Le mot de passe est requis (8 caractères minimum)." };
      }

      const existingStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { username: data.username},
            { phone: data.phone },
            { email: data.email }
          ]
        }
      });

      // Déterminer le champ dupliqué pour un message d'erreur spécifique
  if (existingStudent) {
    if (existingStudent.phone === data.phone) {
      return { success: false, error: true, message: "Le numéro de téléphone existe déjà." };
    }
    if (existingStudent.email === data.email) {
      return { success: false, error: true, message: "L'adresse e-mail existe déjà." };
    }
    if (existingStudent.username === data.username) {
      return { success: false, error: true, message: "L'identifiant existe déjà." };
    }
  }


      // Verifier si il y a de la place dans la classe
      // W03 — l'effectif d'une classe = ses inscriptions ACTIVE (Enrollment)
       const classItem = await prisma.class.findUnique({
        where: {id: data.classId},
        include:  {_count: {select: {enrollments: {where: {status: "ACTIVE"}}}}}
       })

       if (!classItem) {
         return {success: false, error: true, message: "La classe choisie n'existe pas"}
       }
       if (classItem.capacity === classItem._count.enrollments) {
         return {success: false, error: true, message: "La classe à déja ateint sa capacité maximale"}
       }
        // W05 — tuteur principal requis à la création (devient une ligne StudentGuardian)
      if (!data.parentUsername) {
        return { success: false, error: true, message: "L'identifiant du tuteur principal est requis !" };
      }
       const parent = await prisma.parent.findUnique({
        where: { username: data.parentUsername },
        });

      if (!parent) {
         return { success: false, error: true, message: "Parent n'existe pas" };
      }

         let userId: string;
         try {
           userId = await createAuthUser({
             email: data.email,
             password: data.password,
             name: data.username,
             role: "student",
           });
         } catch (err: any) {
           return { success: false, error: true, message: err.message };
         }

        try {
        const { schoolId } = await requireSchool(["admin"]); // V03
        // W03 — la classe choisie doit appartenir à l'école de la session
        if (classItem.schoolId !== schoolId) {
          await removeAuthUser(userId);
          return { success: false, error: true, message: "Classe introuvable dans votre établissement." };
        }
        // W05 — le tuteur principal doit appartenir à l'école de la session
        if (parent.schoolId !== schoolId) {
          await removeAuthUser(userId);
          return { success: false, error: true, message: "Parent introuvable dans votre établissement." };
        }
        // W03/W05 — l'élève, son inscription (Enrollment) et son tuteur
        // principal (StudentGuardian) dans la même transaction
        await prisma.$transaction(async (tx) => {
          await tx.student.create({
            data: {
              schoolId,
              id: userId,
              username: data.username,
              name: data.name,
              surname: data.surname,
              email: data.email || null,
              phone: data.phone || null,
              address: data.address,
              img: data.img || null,
              bloodType: data.bloodType,
              sex: data.sex,
              birthday: data.birthday,
            },
          });
          await upsertEnrollment(userId, classItem.id, classItem.schoolYearId, tx);
          // W05 — tuteur principal : tous les droits (comme le backfill)
          await tx.studentGuardian.create({
            data: {
              studentId: userId,
              parentId: parent.id,
              relationship: "tuteur",
              isLegal: true,
              canPay: true,
              canViewGrades: true,
              canPickup: true,
            },
          });
        });
        } catch (err) {
          // compensation : ne pas laisser un compte de connexion orphelin
          await removeAuthUser(userId);
          throw err;
        }

        revalidatePath("/list/students");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const updateStudent = async (currentState: CurrentState2 ,data: StudentSchema) => {
    try {
      const { schoolId } = await requireSchool(["admin"]);
      if (!data.id) {
        return {success: false, error: true, message: "l'etudiant n'existe pas"}
      }
      // V03 — l'élève doit appartenir à l'école de la session
      const ownedE = await prisma.student.findFirst({
        where: { id: data.id, schoolId }, select: { id: true },
      });
      if (!ownedE) return { success: false, error: true, message: "Élève introuvable dans votre établissement." };

      // W05 — les tuteurs se gèrent depuis la fiche élève (StudentGuardian) :
      // la modification d'un élève ne touche plus au parent.

      try {
        // Mettre à jour le nom et l'email dans la table User de Better Auth
        await prisma.user.update({
          where: { id: data.id },
          data: {
            name: data.username,
            ...(data.email && { email: data.email }),
          },
        });
        
        // Mot de passe via l'API admin AVEC la session de la requête (S19 :
        // l'ancien appel sans headers échouait silencieusement)
        if (data.password && data.password !== "") {
          await setAuthUserPassword(data.id, data.password);
        }
      } catch (authError) {
        console.warn(`Erreur lors de la mise à jour de l'utilisateur dans Better Auth: ${authError}`);
      }

      // W03 — la classe choisie pilote l'Enrollment de son année scolaire
      const targetClass = await prisma.class.findFirst({
        where: { id: data.classId, schoolId },
        select: { id: true, schoolYearId: true },
      });
      if (!targetClass) {
        return { success: false, error: true, message: "Classe introuvable dans votre établissement." };
      }

      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: {
            id: data.id!
          },
          data: {
            // Bug corrigé : le modèle Student n'a PAS de colonne password
            // (mot de passe géré par better-auth plus haut).
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
          },
        });
        await upsertEnrollment(data.id!, targetClass.id, targetClass.schoolYearId, tx);
      });

        revalidatePath("/list/students");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }

}

export const deleteStudent = async (currentState: CurrentState, data: FormData) => {
  const id = data.get("id") as string;

  try {
      const { schoolId } = await requireSchool(["admin"]);
      // V03 — cloisonnement
      const ownedDel = await prisma.student.findFirst({
        where: { id, schoolId }, select: { id: true },
      });
      if (!ownedDel) return { success: false, error: true };

      // Prisma d'abord : si la suppression échoue (contrainte FK…), on ne
      // touche pas au compte et on remonte une vraie erreur (S19).
      await prisma.student.delete({
          where: {
              id: id,
          },
      });

      await removeAuthUser(id);

      revalidatePath("/list/students");
      return { success: true, error: false };

  } catch (error: any) {
      console.error("Erreur lors de la suppression :", error);
      const message =
        error?.code === "P2003"
          ? "Impossible : des réponses de quiz ou réclamations référencent encore cet élève."
          : `${error?.message ?? error}`;
      return { success: false, error: true, message };
  }
};


export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const { userId, role } = await requireRole(["admin", "director", "teacher"]);

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
        semesterId: data.semesterId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const { userId, role } = await requireRole(["admin", "director", "teacher"]);

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await requireRole(["admin", "director"]);
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};