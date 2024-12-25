"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export const LinKed = ({
  item,
}: {
  item: { href: string; label: string; icon: string };
}) => {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      key={item.label}
      className={clsx(
        "flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 rounded-md hover:bg-lamaSkyLight md:px-2 transition-colors",
        {
          "bg-lamaSkyLight font-bold": isActive,
        }
      )}
    >
      <Image src={item.icon} alt="" width={20} height={20} />
      <span className="hidden lg:block">{item.label}</span>
    </Link>
  );
};
