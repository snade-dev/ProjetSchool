import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Prisma, Subject, Class, Quiz } from "@/app/generated/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

type QuizList = Quiz & { subject: Subject } & { class: Class } & {
  StudentAnswer: { id: string; score: number | null }[];
};

const QuizListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const currentUserId = session?.user.id;
  const role = session?.user.role;
  const { page, ...queryParams } = searchParams;

  if (!currentUserId) {
    return notFound();
  }

  const p = page ? parseInt(page) : 1;

  const columns = [
    {
      header: "Examen",
      accessor: "name",
    },
    {
      header: "Matiere",
      accessor: "subject",
      className: "hidden md:table-cell",
    },
    {
      header: "Classes",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Date de l'examen",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Note de l'examen",
      accessor: "scoreExam",
    },
  ];

  const RenderRow = (item: QuizList) => {
    const hasAnswered = item.StudentAnswer?.length > 0;
    const hasCorrection = item.StudentAnswer.some(
      (answer) => answer.score !== null
    );

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
      >
        <td className="flex items-center gap-4 p-4">{item.title}</td>
        <td className="hidden md:table-cell">{item.subject.name}</td>
        <td className="hidden md:table-cell">{item.class.name}</td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("en-US").format(item.date)}
        </td>

        <td className="">
          {hasCorrection ? (
            <Link
              href={`/quiz/${item.id}/resultat`}
              className="inline-block px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Voir les resultats
            </Link>
          ) : (
            <span className="text-gray-500">En attente de correction</span>
          )}
        </td>
      </tr>
    );
  };

  // Initialisation de la condition de requête
  const query: Prisma.QuizWhereInput = {
    StudentAnswer: {
      some: {
        score: {
          not: null, // Filtrer les quiz où au moins une réponse a un score non nul
        },
      },
    },
  };

  // Si l'utilisateur est étudiant, filtrer uniquement par sa classe
  if (role === "student") {
    const studentClass = await prisma.class.findFirst({
      where: {
        students: {
          some: {
            id: currentUserId!,
          },
        },
      },
      select: { id: true },
    });

    if (studentClass) {
      query.classId = studentClass.id;
    }
  }

  // Filtrage basé sur les paramètres de recherche
  if (queryParams.search) {
    query.OR = [
      {
        subject: {
          name: { contains: queryParams.search, mode: "insensitive" },
        },
      },
    ];
  }

  // Requête vers la base de données Prisma avec filtrage conditionnel
  const [data, count] = await prisma.$transaction([
    prisma.quiz.findMany({
      where: query,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        StudentAnswer: {
          where: {
            score: {
              not: null, // Inclure uniquement les réponses corrigées
            },
          },
          select: {
            id: true,
            score: true,
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.quiz.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Tous les résultats aux examens en ligne corrigés
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src={"/filter.png"} alt="Filter" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src={"/sort.png"} alt="Sort" width={14} height={14} />
            </button>
          </div>
        </div>
      </div>
      {/* LIST */}
      <div>
        <Table columns={columns} renderRow={RenderRow} data={data} />
      </div>
      {/* PAGINATION */}
      <div>
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default QuizListPage;
