"use server";

import { authClient } from './auth-client';
import { auth } from './auth';
import { ClassSchema, ExamSchema, StudentSchema, SubjectSchema, TeacherSchema } from './formsValidationSchema';
import prisma from './prisma';
import { requireRole } from './authGuard';
import { revalidatePath } from 'next/cache';

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
    } catch (error) {
        console.log(error);
        return {success: false, error: true};
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
    } catch (error) {
        console.log(error);
        return {success: false, error: true};
    }
    
}



// TEACHER
export const createTeacher = async (currentState: CurrentState2 ,data: TeacherSchema) => {

    try {
        await requireRole(["admin"]);

        const existingTeacher = await prisma.teacher.findFirst({
          where: {
            OR: [
              { username: data.username},
              { phone: data.phone },
              { id: data.id },
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

        let user: any = {}

        try {
          user = await authClient.admin.createUser({
            name: data.username,
            email: data.email ?? "",
            password: data?.password  ?? "<PASSWORD>",
            role: "teacher",
            // firstName: data.name,
            // lastName: data.surname,x
            // publicMetadata: {role: "teacher"}
          });


        } catch (clerkError) {
          console.warn(`Une erreur c'est prouite Clerk. ${clerkError}`);
          return {success: false, error: true, message: "Une erreur c'est produite"};
        }

        
        await prisma.teacher.create({
          data: {
            id: user.id,
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

      try {
        const user = await authClient.updateUser({
          name: data.username,
          ...(data.password !== "" && {password: data.password}),
        
        })
       } catch (clerkError) {
        console.warn(`Utilisateur avec l'id ${data.id} introuvable dans Clerk. Suppression ignorée dans Clerk.`);
       }


      await prisma.teacher.update({
        where: {
          id: data.id
        },
        data: {
          ...(data.password !== "" && {password: data.password}),
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
      try {
        await (authClient.admin as any).deleteUser({ userId: id });
      } catch (err) {
        console.warn(`Utilisateur avec l'id ${id} introuvable dans better-auth. Suppression ignorée.`);
      }

    await prisma.lesson.deleteMany({
      where: {
        teacherId: id, // Replace teacherId with the actual teacher's ID
      },
    });
    
    await prisma.teacher.delete({
      where: {
        id: id, // Replace with the actual teacher's ID
      },
    });


        revalidatePath("/list/teachers");
        return {success: true, error: false};
    } catch (error) {
        console.log(error);
        return {success: false, error: true};
    }

}




//Student
export const createStudent = async (currentState: CurrentState2 ,data: StudentSchema) => {
    try {
      await requireRole(["admin"]);
      const existingStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { username: data.username},
            { phone: data.phone },
            { id: data.id },
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

         let user: any = {}

         try {
           user = await authClient.admin.createUser({
             name: data.username,
             email: data.email ?? "",
             password: data.password ?? "<PASSWORD>",
             role: "student",
             data: {
               firstName: data.name,
               lastName: data.surname,
             }
           });
 
 
 
         } catch (clerkError) {
           console.warn(`L'un des utilisateurs existe déjà dans Clerk. Creation ignorée dans Clerk. ${clerkError}`);
           return {success: false, error: true, message: "Le nom d'utilisateur existe déjà"};
         }

        await prisma.student.create({
          data: {
            id: user.id,
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
        
        // Mettre à jour le mot de passe si fourni
        // Utiliser l'API admin Better Auth pour mettre à jour le mot de passe
        if (data.password !== "") {
          // Utiliser auth.api pour appeler l'endpoint admin set-user-password
          // L'endpoint nécessite une session admin active
          try {
            await (auth.api as any).setUserPassword({
              body: {
                userId: data.id,
                newPassword: data.password,
              },
            });
          } catch (passwordError: any) {
            // Si l'API n'est pas disponible, essayer via fetch avec les cookies
            console.warn(`Impossible de mettre à jour le mot de passe via l'API: ${passwordError?.message || passwordError}`);
          }
        }
      } catch (authError) {
        console.warn(`Erreur lors de la mise à jour de l'utilisateur dans Better Auth: ${authError}`);
      }

      await prisma.student.update({
        where: {
          id: data.id
        },
        data: {
          ...(data.password !== "" && {password: data.password}),
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
    try {
      await (authClient.admin as any).deleteUser({ userId: id });
    } catch (err) {
      console.warn(`Utilisateur avec l'id ${id} introuvable dans better-auth. Suppression ignorée.`);
    }

      // Supprimer l'utilisateur dans Prisma
      await prisma.student.delete({
          where: {
              id: id,
          },
      });

      revalidatePath("/list/students");
      return { success: true, error: false };

  } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      return { success: false, error: true };
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
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};