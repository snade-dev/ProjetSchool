import Annoucement from "@/components/Annoucement";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, Edit } from "lucide-react";

/** Espace enseignant : SON emploi du temps + raccourcis appel / saisie de notes. */
const TeacherPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (role !== "teacher" || !userId) {
    return notFound();
  }

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row flex-1">
      {/* LEFT — emploi du temps de l'enseignant */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">Mon emploi du temps</h1>
            <div className="flex gap-2">
              <Link
                href="/list/attendances/appel"
                className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 text-white text-xs font-semibold rounded-md px-3 py-2 transition"
              >
                <ClipboardCheck size={14} />
                Faire l&apos;appel
              </Link>
              <Link
                href="/list/gradeEntry"
                className="flex items-center gap-2 bg-lamaPurple hover:opacity-80 text-gray-800 text-xs font-semibold rounded-md px-3 py-2 transition"
              >
                <Edit size={14} />
                Saisir des notes
              </Link>
            </div>
          </div>
          <div className="h-[700px]">
            <BigCalandarContainer type="teacherId" id={userId} />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Annoucement />
      </div>
    </div>
  );
};
export default TeacherPage;
