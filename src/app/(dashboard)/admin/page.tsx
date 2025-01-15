import Annoucement from "@/components/Annoucement";
import AttendanceChartConainer from "@/components/AttendanceChartConainer";
import CountChartContainer from "@/components/CountChartContainer";
import EventCalandar from "@/components/EventCalandar";
import EventCalandarContainer from "@/components/EventCalandarContainer";
import FinanceChart from "@/components/FinanceChart";
import UserCard from "@/components/UserCard";

const Adminpage = ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  return (
    <div className=" p-4 flex gap-4 flex-col md:flex-row">
      {/* Left side */}
      <div className=" w-full lg:w-2/3 flex flex-col gap-8">
        {/* User card */}
        <div className=" flex gap-4 justify-between flex-wrap">
          <UserCard type="admin" />
          <UserCard type="enseignant" />
          <UserCard type="élève" />
          <UserCard type="parent" />
        </div>
        {/* MIDDLE CHART */}
        <div className=" flex gap-4 flex-col lg:flex-row">
          {/* COUNY CHART */}
          <div className=" w-full lg:w-1/3 h-[400px]">
            <CountChartContainer />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[400px]">
            <AttendanceChartConainer />
          </div>
        </div>
        {/* BOTTOM CHART */}
        <div className=" w-full h-[500px]">
          <FinanceChart />
        </div>
      </div>
      {/* Right side */}
      <div className=" w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalandarContainer searchParams={searchParams} />
        <Annoucement />
      </div>
    </div>
  );
};
export default Adminpage;
