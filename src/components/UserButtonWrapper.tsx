"use client";

import Link from "next/link";

const UserButtonWrapper = () => {
  return (
    <div className="flex items-center">
      <Link href="/sign-in" className="text-sm font-medium">
        Se connecter
      </Link>
    </div>
  );
};

export default UserButtonWrapper;
