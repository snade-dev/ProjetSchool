import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tableau de Bord de Gestion de l'École LS_School",
  description: "Système de Gestion Scolaire",
};

export default function DasboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // le layout de la dashboard
    // mettre h-screen
    <div className="flex">
      {/* Sidebar LEFT */}
      <div className=" w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4">
        <Link href="/" className=" flex items-center justify-center lg:justify-start gap-2">
          <Image src="/logo.png" alt="logo" width={32} height={32} />
          <span className=" hidden lg:block font-bold">LS_School</span>
        </Link>
        <Menu />
      </div>
      {/* MAIN  RIGHT*/}
      <div className=" w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F8F7FA] overflow-y-scroll flex flex-col">
        <Navbar />
        {children}
      </div>
    </div>
  );
}
