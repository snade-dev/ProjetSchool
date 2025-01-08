// "use server";

// import prisma from "../prisma";



// export const getQuiz = async (subjectId: number) => {
//     try {
//         const quiz = await prisma.quiz.findUnique({
//             where: {
//                 subjectId: subjectId
//             },
//             include: {
//                 questions: {
//                     include: {
//                         answerOptions: true
//                     }
//                 }
//             }
//         })

//         if (!quiz) {
//             throw new Error('Aucun quiz')
//         }
    
//         return quiz;
//     } catch (error) {
//         console.log("GET QUIZ ERROR: ", error);
//         return null;
//     }
// }