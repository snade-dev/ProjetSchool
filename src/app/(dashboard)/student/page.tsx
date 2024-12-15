import Annoucement from "@/components/Annoucement"
import BigCalandarContainer from "@/components/BigCalandarContainer"
import EventCalandar from "@/components/EventCalandar"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

const Studentpage = async () => {
  const {userId} = await auth();

  const classItem = await prisma.class.findMany({
    where: {
      students: {some: { id: userId! }},
    }
  });

  // console.log(classItem);
  

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
      <div className=" h-full bg-white p-4 rounded-md">
        <h1 className=" text-xl font-semibold">Programme (4A)</h1>
        <BigCalandarContainer id={classItem[0].id} type="classId" />
      </div>
      </div>
      {/* RIGHT */}
      <div className=" w-f$ xl:w-1/3 flex flex-col gap-8">
        <EventCalandar />
        <Annoucement />
      </div>
    </div>
  )
}
export default Studentpage