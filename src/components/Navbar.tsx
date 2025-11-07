
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Image from "next/image";

const Navbar = async () => {

const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
})

  return (
    <header className=" flex items-center justify-between p-4">
      {/* Search bar */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2  ">
        <Image src="/search.png" alt="search" width={14} height={14} />
        <input
          type="text"
          placeholder="Recherche"
          className=" w-[200px] p-2 bg-transparent outline-none"
        />
      </div>
      {/* Icons and User profile */}
      <div className=" flex items-center gap-6 justify-end w-full">
        <div className=" bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
          <Image src="/message.png" alt="bell" width={20} height={20} />
        </div>
        <div className=" bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative text-xs">
          <Image src="/announcement.png" alt="bell" width={20} height={20} />
          <div className=" absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full">
            1
          </div>
        </div>
        <div className=" flex flex-col">
          <span className=" text-xs leading-3 font-medium">
            {session?.user.name || "Lamine"}
          </span>
          <span className=" text-[10px] text-gray-500 text-right">
            {session?.user.role === "student"
              ? "étudiant"
              : session?.user?.role === "teacher"
              ? "enseignant"
              : session?.user?.role === "admin"
              ? "administrateur"
              : ""}
          </span>
        </div>

      </div>
    </header>
  );
};
export default Navbar;
