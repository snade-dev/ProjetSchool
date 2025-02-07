import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinKed } from "./LinKed";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Acceuil",
        href: "/",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/teacher.png",
        label: "Enseignants",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/student.png",
        label: "Etudiants",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/subject.png",
        label: "Matières",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/class.png",
        label: "Semestres",
        href: "/list/semester",
        visible: ["admin", "teacher","student","parent"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/lesson.png",
        label: "cours en ligne",
        href: "https://meet.google.com/landing",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/exam.png",
        label: " Examens",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/exam.png",
        label: "Examens en Ligne",
        href: "/list/onlineExam",
        visible: ["admin", "teacher", "student"],
      },
      {
        icon: "/exam.png",
        label: "Examen Resultat",
        href: "/list/resultExam",
        visible: ["admin", "teacher", "student"],
      },
      {
        icon: "/assignment.png",
        label: "Quiz",
        href: "/quiz",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/result.png",
        label: "Resultats",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/attendance.png",
        label: "Presence",
        href: "/list/attendances",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/calendar.png",
        label: "Evènements",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Annonces",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
  {
    title: "Autres",
    items: [
      {
        icon: "/profile.png",
        label: "Profil",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/setting.png",
        label: "Paramètre",
        href: "/settings",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];

const Menu = async () => {

  const user = await currentUser() ;
  const role  = user?.publicMetadata.role as string;


 
  return (
    <div className=" mt-4 text-sm">
      {menuItems.map((i) => (
        <div className=" flex flex-col gap-2" key={i.title}>
          <span className=" hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              
              return (
                <LinKed item={item} key={item.label} />
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};
export default Menu;
