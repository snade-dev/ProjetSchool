"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";


export const LinKed = ({href, label, icon:Icon}  :{href: string, label: string, icon: LucideIcon} ) => {

  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      key={label}
      className={clsx(
        "flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 rounded-md hover:bg-lamaSkyLight md:px-2 transition-colors",
        {
          "bg-lamaSkyLight font-bold": isActive,
        }
      )}
    >


     <Icon size={20} className="shrink-0" />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
};
