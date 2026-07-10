import Annoucement from "@/components/Annoucement";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, CheckSquare, FileText, GraduationCap } from "lucide-react";

/** Espace élève : l'emploi du temps de SA classe + raccourcis. */
const StudentPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (role !== "student" || !userId) {
    return notFound();
  }

  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: { id: true, classId: true, class: { select: { name: true } } },
  });

  if (!student) {
    return notFound();
  }

  const shortcuts = [
    {
      href: `/list/students/${student.id}`,
      label: "Mon bulletin",
      icon: Award,
      bg: "bg-lamaSkyLight",
    },
    {
      href: `/list/results?studentId=${student.id}`,
      label: "Mes résultats",
      icon: GraduationCap,
      bg: "bg-lamaPurpleLight",
    },
    {
      href: `/list/attendances`,
      label: "Mes présences",
      icon: CheckSquare,
      bg: "bg-lamaYellowLight",
    },
    {
      href: `/list/invoices`,
      label: "Mes factures",
      icon: FileText,
      bg: "bg-pink-50",
    },
  ];

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row flex-1">
      {/* LEFT — emploi du temps de la classe */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-2">
            Emploi du temps — {student.class.name}
          </h1>
          <div className="h-[700px]">
            <BigCalandarContainer type="classId" id={student.classId} />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h2 className="text-lg font-semibold">Raccourcis</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
            {shortcuts.map(({ href, label, icon: Icon, bg }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-2 px-3 py-3 rounded-md ${bg} hover:opacity-80 transition`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </div>
        </div>
        <Annoucement />
      </div>
    </div>
  );
};
export default StudentPage;
