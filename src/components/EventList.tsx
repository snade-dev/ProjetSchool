import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";

const EventList = async ({ dateParam }: { dateParam: string | undefined }) => {
  const date = dateParam ? new Date(dateParam) : new Date();

  // V03 — cloisonnement : événements de l'école de la session
  const info = await getSessionInfo();
  const data = await prisma.event.findMany({
    where: {
      schoolId: info?.schoolId ?? -1,
      startTime: {
        gte: new Date(date.setHours(0, 0, 0, 0)), // Après 00:00 de la date actuelle
        lt: new Date(date.setHours(23, 0, 0, 0)), // Avant 23:00 de la date actuelle
      },
    },
  });

// console.log(data);


  return data.map((event) => (
    <div
      className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
      key={event.id}
    >
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-600">{event.title}</h1>
        <span className="text-gray-300 text-xs">
          {event.startTime.toLocaleTimeString("en-UK", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
      <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
    </div>
  ));
};

export default EventList;