import { headers } from "next/headers";
import MenuComp from "./MenuComp";
import { auth } from "@/lib/auth";



const Menu = async () => {

  const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
})

  const role = session?.user.role

  if (!role) {
    return <p>NO rolz</p>
  }
 
  return (
    <MenuComp role={role} />
  );
};
export default Menu;
