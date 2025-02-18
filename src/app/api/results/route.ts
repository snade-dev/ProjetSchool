import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const studentId = searchParams.get("studentId");
  const semesterId = searchParams.get("semesterId");

  if (!studentId || !semesterId) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const results = await prisma.result.findMany({
    where: {
      studentId: studentId,
      semesterId: parseInt(semesterId),
    },
    include: {
      subject: true,
      exam: true,
    },
  });

  return NextResponse.json(results);
} 