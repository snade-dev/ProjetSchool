import Annoucement from "@/components/Annoucement";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Award, CheckSquare, FileText, GraduationCap } from "lucide-react";

/**
 * Espace parent (refonte) : un bloc par enfant — identité, raccourcis
 * (bulletin, résultats, présences, factures) et emploi du temps de sa classe.
 */
const ParentPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (role !== "parent" || !userId) {
    return notFound();
  }

  const children = await prisma.student.findMany({
    where: { parentId: userId },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      classId: true,
      class: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const links = (childId: string) => [
    {
      href: `/list/students/${childId}`,
      label: "Bulletin & fiche",
      icon: Award,
      bg: "bg-lamaSkyLight",
    },
    {
      href: `/list/results?studentId=${childId}`,
      label: "Résultats",
      icon: GraduationCap,
      bg: "bg-lamaPurpleLight",
    },
    {
      href: `/list/attendances`,
      label: "Présences",
      icon: CheckSquare,
      bg: "bg-lamaYellowLight",
    },
    {
      href: `/list/invoices`,
      label: "Factures",
      icon: FileText,
      bg: "bg-pink-50",
    },
  ];

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row flex-1">
      {/* LEFT — un bloc par enfant */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {children.length === 0 ? (
          <div className="bg-white p-8 rounded-md text-center text-sm text-gray-400">
            Aucun enfant n&apos;est rattaché à votre compte. Contactez
            l&apos;administration.
          </div>
        ) : (
          children.map((child) => (
            <div key={child.id} className="bg-white p-4 rounded-md">
              {/* Identité + raccourcis */}
              <div className="flex flex-wrap items-center gap-4">
                <Image
                  src={child.img || "/noAvatar.png"}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="mr-auto">
                  <h2 className="text-lg font-semibold">
                    {child.name} {child.surname}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Classe : {child.class.name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {links(child.id).map(({ href, label, icon: Icon, bg }) => (
                    <Link
                      key={label}
                      href={href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${bg} hover:opacity-80 transition`}
                    >
                      <Icon size={14} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Emploi du temps de la classe de l'enfant */}
              <div className="mt-4 h-[560px]">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  Emploi du temps — {child.class.name}
                </h3>
                <div className="h-[520px]">
                  <BigCalandarContainer type="classId" id={child.classId} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Annoucement />
      </div>
    </div>
  );
};
export default ParentPage;
