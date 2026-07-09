import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalendar";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";

const BigCalandarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const dataRes = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      exams: true,
    },
  });

  const data = dataRes.flatMap((lesson) =>
    lesson.exams.map((exam) => ({
      title: `${lesson.name} - ${exam.title}`,
      start: exam.startTime,
      end: exam.endTime,
    })),
  );

  const schedule = adjustScheduleToCurrentWeek(data);
  console.log(schedule);

  return (
    <div>
      <BigCalendar data={schedule} />
    </div>
  );
};
export default BigCalandarContainer;
