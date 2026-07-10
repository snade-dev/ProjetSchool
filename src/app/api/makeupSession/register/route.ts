import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { makeupSessionId, studentId, subjectId } = await request.json();

    // Vérifier que tous les champs requis sont présents
    if (!makeupSessionId || !studentId || !subjectId) {
      return NextResponse.json(
        { success: false, error: "makeupSessionId, studentId et subjectId sont requis" },
        { status: 400 }
      );
    }

    const registration = await prisma.makeupExam.create({
      data: {
        studentId,
        sessionId: makeupSessionId,
        subjectId: parseInt(subjectId),
      },
    });

    return NextResponse.json({ success: true, data: registration });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
} 