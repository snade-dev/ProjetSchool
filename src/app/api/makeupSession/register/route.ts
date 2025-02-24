import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { makeupSessionId, studentId } = await request.json();

    const registration = await prisma.makeupExam.create({
      data: {
        studentId,
        sessionId: makeupSessionId,
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