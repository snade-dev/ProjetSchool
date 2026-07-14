import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const classId = searchParams.get("classId");
  const semesterId = searchParams.get("semesterId");

  if (!studentId || !classId || !semesterId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    console.log("Fetching data for:", { studentId, classId, semesterId }); // Pour déboguer

    // Récupérer la classe
    const currentClass = await prisma.class.findUnique({
      where: {
        id: parseInt(classId),
      },
    });

    // Récupérer toutes les matières du semestre
    const subjects = await prisma.subject.findMany({
      where: {
        semesters: {
          some: {
            id: parseInt(semesterId),
          },
        },
      },
    });

    // Récupérer les résultats existants
    const results = await prisma.result.findMany({
      where: {
        studentId,
        // W03 — l'appartenance à la classe passe par l'Enrollment
        student: {
          enrollments: { some: { classId: parseInt(classId) } },
        },
        semesterId: parseInt(semesterId),
      },
      include: {
        subject: true,
      },
    });

    console.log("Found results:", results); // Pour déboguer

    // Combiner les matières et les résultats
    const combinedResults = subjects.map(subject => {
      const existingResult = results.find(r => r.subjectId === subject.id);
      console.log('Mapping subject:', subject.name, 'Result:', existingResult); // Debug
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        score: existingResult ? existingResult.score : null,
      };
    });

    console.log('Combined Results:', combinedResults); // Debug

    return NextResponse.json({
      results: combinedResults,
      subjects,
      className: currentClass?.name,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 