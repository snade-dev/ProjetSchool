import Image from "next/image";
import EventCalandar from "./EventCalandar";
import EventList from "./EventList";

const EventCalandarContainer = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { date } = searchParams;

  return (
    <div className=" bg-white rounded-md p-4">
        <EventCalandar />
      <div className=" flex items-center justify-between">
        <h1 className=" font-semibold text-xl my-4">Evenements</h1>
        <Image src={"/moreDark.png"} alt="" width={20} height={20} />
      </div>
      <div className=" flex flex-col gap-4">
        <EventList dateParam={date} />
      </div>
    </div>
  );
};
export default EventCalandarContainer;
