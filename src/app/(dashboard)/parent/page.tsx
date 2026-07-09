import Annoucement from "@/components/Annoucement"
import BigCalendar from "@/components/BigCalendar"

const ParentPage = () => {
  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row flex-1">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
      <div className=" h-full bg-white p-4 rounded-md">
        <h1 className=" text-xl font-semibold">Programme (Jhon Doe)</h1>
        {/* <BigCalendar /> */}
      </div>
      </div>
      {/* RIGHT */}
      <div className=" w-f$ xl:w-1/3 flex flex-col gap-8">
        <Annoucement />
      </div>
    </div>
  )
}
export default ParentPage