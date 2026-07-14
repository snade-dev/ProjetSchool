import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sessionSchoolId } from "@/lib/authGuard";
import { formatDueDate, homeworkDueBadge } from "@/lib/homework";
import FormContainer from "@/components/FormContainer";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Download, User } from "lucide-react";

/**
 * W14 — détail d'un devoir : consignes complètes + lien de téléchargement de
 * la pièce jointe. Mêmes règles de visibilité que la liste :
 * élève → SA classe (année active) ; parent → classes de ses enfants ;
 * teacher/admin/director/supervisor → l'école de la session.
 */
const HomeworkDetailPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const homeworkId = parseInt(id);
  if (Number.isNaN(homeworkId)) return notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;
  if (!role || !currentUserId) return notFound();

  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, schoolId },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { name: true } },
    },
  });
  if (!homework) return notFound();

  // Restriction élève/parent : le devoir doit concerner sa classe / celle
  // d'un de ses enfants (inscription de l'année active).
  if (role === "student") {
    const enrolled = await prisma.enrollment.findFirst({
      where: {
        classId: homework.classId,
        studentId: currentUserId,
        schoolYear: { isActive: true },
      },
      select: { id: true },
    });
    if (!enrolled) return notFound();
  } else if (role === "parent") {
    const childEnrolled = await prisma.enrollment.findFirst({
      where: {
        classId: homework.classId,
        schoolYear: { isActive: true },
        student: { guardians: { some: { parentId: currentUserId } } },
      },
      select: { id: true },
    });
    if (!childEnrolled) return notFound();
  }

  const author = await prisma.user.findUnique({
    where: { id: homework.teacherId },
    select: { name: true },
  });

  const badge = homeworkDueBadge(homework.dueDate);
  const own = homework.teacherId === currentUserId;
  const editable =
    role === "admin" || role === "director" || (role === "teacher" && own);

  return (
    <div className="bg-white p-6 rounded-md flex-1 m-4 mt-0">
      <Link
        href="/list/homeworks"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} />
        Retour aux devoirs
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{homework.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {homework.subject.name} — {homework.class.name}
          </p>
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            <FormContainer table="homework" type="update" data={homework} />
            <FormContainer table="homework" type="delete" id={homework.id} />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lamaSkyLight px-3 py-1">
          <CalendarDays size={14} />À rendre le {formatDueDate(homework.dueDate)}
        </span>
        {badge && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1">
          <User size={14} />
          {author?.name ?? "—"} · publié le{" "}
          {new Intl.DateTimeFormat("fr-FR").format(homework.createdAt)}
        </span>
      </div>

      {/* Consignes complètes */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-600">Consignes</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
          {homework.content}
        </p>
      </div>

      {/* Pièce jointe */}
      {homework.fileUrl && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-600">Document joint</h2>
          <a
            href={homework.fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-lamaYellow px-4 py-2 text-sm font-medium hover:opacity-80 transition"
          >
            <Download size={16} />
            Télécharger la pièce jointe
          </a>
        </div>
      )}
    </div>
  );
};

export default HomeworkDetailPage;
