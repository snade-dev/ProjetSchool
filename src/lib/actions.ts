"use server";

import { ClassSchema, ExamSchema, StudentSchema, SubjectSchema, TeacherSchema } from './formsValidationSchema';
import { createAuthUser, removeAuthUser, setAuthUserPassword } from './authAdmin';
import prisma from './prisma';
import { requireRole } from './authGuard';
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
        await requireRole(["admin"]);
        await prisma.subject.create({
          data: {
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
        await requireRole(["admin"]);
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
        await requireRole(["admin"]);
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
        await requireRole(["admin"]);

        const existingClass = await prisma.class.findFirst({
          where: {
            name: data.name
          }
        })

        if (existingClass) {
          return {success: false, error: true, message: "La class existe déjà"};
        }

        await prisma.class.create({
          data
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
        await requireRole(["admin"]);
        await prisma.class.update({
          where: {
            id: data.id
          },
          data
        });

        revalidatePath("/list/classes");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }
    
}

export const deleteClass = async (currentState: CurrentState ,data: FormData) => {
    const id =data.get("id") as string;
    try {
        await requireRole(["admin"]);
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
        await prisma.teacher.create({
          data: {
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
      await requireRole(["admin"]);

      if (!data.id) {
        return {success: false, error: true, message: ""}
      }

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
      await requireRole(["admin"]);

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
       const classItem = await prisma.class.findUnique({
        where: {id: data.classId},
        include:  {_count: {select: {students: true}}}
       })

       if (classItem && classItem.capacity === classItem._count.students) {
         return {success: false, error: true, message: "La classe à déja ateint sa capacité maximale"}
       }
        // Recherchez le parent par son nom
       const parent = await prisma.parent.findUnique({
        where: { username: data.parentUsername }, // Supposez que `parentName` est fourni dans les données
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
        await prisma.student.create({
          data: {
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
            classId: data.classId,
            parentId: parent.id
          },
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
      await requireRole(["admin"]);
      if (!data.id) {
        return {success: false, error: true, message: "l'etudiant n'existe pas"}
      }

      // Recherchez le parent par son nom
    const parent = await prisma.parent.findUnique({
      where: { username: data.parentUsername }, // Supposez que `parentName` est fourni dans les données
    });

    if (!parent) {
      return { success: false, error: true, message: "Parent n'existe pas" };
    }

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

      await prisma.student.update({
        where: {
          id: data.id
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
            classId: data.classId,
            parentId: parent.id
        },
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
      await requireRole(["admin"]);

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
    const { userId, role } = await requireRole(["admin", "teacher"]);

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
    const { userId, role } = await requireRole(["admin", "teacher"]);

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
    await requireRole(["admin"]);
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