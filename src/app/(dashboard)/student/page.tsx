// import Annoucement from "@/components/Annoucement"
// import BigCalandarContainer from "@/components/BigCalandarContainer"
// import EventCalandar from "@/components/EventCalandar"
// import prisma from "@/lib/prisma"
// import { auth } from "@clerk/nextjs/server"

// const Studentpage = async () => {
//   const {userId} = await auth();

//   const classItem = await prisma.class.findMany({
//     where: {
//       students: {some: { id: userId! }},
//     }
//   });

//   // console.log(classItem);
  

//   return (
//     <div className="p-4 flex gap-4 flex-col md:flex-row">
//       {/* LEFT */}
//       <div className="w-full md:w-2/3">
//       <div className=" h-full bg-white p-4 rounded-md">
//         <h1 className=" text-xl font-semibold">Programme (4A)</h1>
//         {/* <BigCalandarContainer id={classItem[0].id} type="classId" /> */}
//       </div>
//       </div>
//       {/* RIGHT */}
//       <div className=" w-full md:w-1/3 flex flex-col gap-8">
//         <EventCalandar />
//         <Annoucement />
//       </div>
//     </div>
//   )
// }
// export default Studentpage


// import Annoucement from "@/components/Annoucement";
// import AttendanceChartConainer from "@/components/AttendanceChartConainer";
// import CountChartContainer from "@/components/CountChartContainer";
// import EventCalandar from "@/components/EventCalandar";
// import EventCalandarContainer from "@/components/EventCalandarContainer";
// import FinanceChart from "@/components/FinanceChart";
// import UserCard from "@/components/UserCard";

// const Adminpage = ({
//   searchParams,
// }: {
//   searchParams: { [keys: string]: string | undefined };
// }) => {
//   return (
//     <div className=" p-4 flex gap-4 flex-col md:flex-row">
//       {/* Left side */}
//       <div className=" w-full lg:w-2/3 flex flex-col gap-8">
//         {/* User card */}
//         <div className=" flex gap-4 justify-between flex-wrap">
//           <UserCard type="admin" />
//           <UserCard type="enseignant" />
//           <UserCard type="élève" />
//           <UserCard type="parent" />
//         </div>
//         {/* MIDDLE CHART */}
//         <div className=" flex gap-4 flex-col lg:flex-row">
//           {/* COUNY CHART */}
//           <div className=" w-full lg:w-1/3 h-[400px]">
//             <CountChartContainer />
//           </div>
//           {/* ATTENDANCE CHART */}
//           <div className="w-full lg:w-2/3 h-[400px]">
//             <AttendanceChartConainer />
//           </div>
//         </div>
//         {/* BOTTOM CHART */}
//         <div className=" w-full h-[500px]">
//           <FinanceChart />
//         </div>
//       </div>
//       {/* Right side */}
//       <div className=" w-full lg:w-1/3 flex flex-col gap-8">
//         <EventCalandarContainer searchParams={searchParams} />
//         <Annoucement />
//       </div>
//     </div>
//   );
// };
// export default Adminpage;


import { auth } from "@clerk/nextjs/server";
import {
  BookOpen,
  GraduationCap,
  Users,
  FileText,
  ClipboardList,
  Bell,
  School,
  BookCheck,
} from "lucide-react";
import Link from "next/link";
import UserCard from "@/components/UserCard";

const Adminpage = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  return (
    <div className="p-6 space-y-8">
      {/* En-tête avec statistiques */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UserCard type="admin" />
        <UserCard type="enseignant" />
        <UserCard type="élève" />
        <UserCard type="parent" />
      </div> */}

      {/* Sections principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gestion des bulletins */}
        <div className=" p-6 rounded-xl shadow-sm bg-white">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold">Gestion des bulletins</h2>
          </div>
          <div className="space-y-4">
            <Link
              href="/list/results"
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <span>Bulletins scolaires</span>
              <BookCheck className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              href="/list/results"
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <span>Moyennes</span>
              <ClipboardList className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Gestion des utilisateurs */}
        {/* <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
          </div>
          <div className="space-y-4">
            <Link
              href="/list/students"
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <span>Étudiants</span>
              <GraduationCap className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              href="/list/teachers"
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <span>Enseignants</span>
              <School className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div> */}

        {/* Autres fonctionnalités */}
        {/* <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-semibold">Autres fonctionnalités</h2>
          </div>
          <div className="space-y-4">
            <Link
              href="/list/classes"
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <span>Classes</span>
              <BookOpen className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              href="/list/subjects"
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <span>Matières</span>
              <ClipboardList className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Adminpage;